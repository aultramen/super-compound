import { createHash } from "node:crypto";
import { lstat } from "node:fs/promises";
import path from "node:path";

import {
  appendFileDurable,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import { rfc3339UtcSortKey } from "./schema-validator.mjs";

const DIRECTORY = path.join(
  ".scratch",
  "loop-runtime",
  "external-actions",
);
const MAX_EVENT_BYTES = 8 * 1024 * 1024;
const MAX_STATE_BYTES = 512 * 1024;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const STORAGE_KEY = /^[a-f0-9]{64}$/u;
const OUTCOMES = new Set([
  "APPLIED",
  "NOT_APPLIED",
  "PARTIALLY_APPLIED",
  "INDETERMINATE",
]);
const INTENT_FIELDS = Object.freeze([
  "run_id",
  "operation_id",
  "action_id",
  "idempotency_key",
  "kind",
  "parent_action_digest",
  "queue_item_id",
  "plan_digest",
  "controller_intent_digest",
  "confirmation_digest",
  "authority_digest",
  "policy_digest",
  "run_head_digest",
  "recorded_at",
]);
const RECORD_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "record_id",
  "storage_key",
  "version",
  "run_id",
  "operation_id",
  "action_id",
  "idempotency_key",
  "kind",
  "parent_action_digest",
  "queue_item_id",
  "plan_digest",
  "controller_intent_digest",
  "confirmation_digest",
  "authority_digest",
  "policy_digest",
  "run_head_digest",
  "state",
  "dispatch_count",
  "provider_receipt_digest",
  "outcome",
  "target_audit_digest",
  "cancellation_reason_ref",
  "created_at",
  "updated_at",
]);
const EVENT_FIELDS = Object.freeze([
  "event_format",
  "sequence",
  "previous_event_digest",
  "event_digest",
  "record",
]);

function fail(code) {
  throw new TypeError(code);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields) {
  return (
    isObject(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function stableId(value) {
  return typeof value === "string" && STABLE_ID.test(value);
}

function digest(value) {
  return typeof value === "string" && DIGEST.test(value);
}

function timestamp(value) {
  return rfc3339UtcSortKey(value) !== null;
}

function nullableStableId(value) {
  return value === null || stableId(value);
}

function nullableDigest(value) {
  return value === null || digest(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}

function cloneFrozen(value, code = "INVALID_EXTERNAL_ACTION_VALUE") {
  try {
    return deepFreeze(structuredClone(value));
  } catch {
    fail(code);
  }
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function externalActionDigest(record) {
  return `sha256:${hashText(JSON.stringify(record))}`;
}

function actionStorageKey(input) {
  return hashText(
    `${input.run_id}\u0000${input.operation_id}\u0000${input.idempotency_key}`,
  );
}

function recordId(storageKey) {
  return `external-action-${storageKey}`;
}

function paths(storageKey) {
  if (!STORAGE_KEY.test(storageKey)) fail("EXTERNAL_ACTION_STORAGE_KEY_INVALID");
  const directory = path.join(DIRECTORY, storageKey);
  return {
    directory,
    events: path.join(directory, "events.jsonl"),
    state: path.join(directory, "state.json"),
    lock: path.join(directory, ".record.lock"),
  };
}

function validIntent(input) {
  return (
    exactFields(input, INTENT_FIELDS) &&
    ["run_id", "operation_id", "action_id", "idempotency_key"].every(
      (field) => stableId(input[field]),
    ) &&
    new Set(["EXECUTE", "COMPENSATE"]).has(input.kind) &&
    nullableDigest(input.parent_action_digest) &&
    nullableStableId(input.queue_item_id) &&
    [
      "plan_digest",
      "controller_intent_digest",
      "confirmation_digest",
      "authority_digest",
      "policy_digest",
      "run_head_digest",
    ].every((field) => digest(input[field])) &&
    timestamp(input.recorded_at) &&
    ((input.kind === "EXECUTE" && input.parent_action_digest === null) ||
      (input.kind === "COMPENSATE" && digest(input.parent_action_digest)))
  );
}

function validRecord(record) {
  if (
    !exactFields(record, RECORD_FIELDS) ||
    record.schema !== "external_action_state_v2" ||
    record.contract_version !== "2.0.0" ||
    !stableId(record.record_id) ||
    !STORAGE_KEY.test(record.storage_key) ||
    record.record_id !== recordId(record.storage_key) ||
    !Number.isSafeInteger(record.version) ||
    record.version < 0 ||
    !["run_id", "operation_id", "action_id", "idempotency_key"].every(
      (field) => stableId(record[field]),
    ) ||
    !new Set(["EXECUTE", "COMPENSATE"]).has(record.kind) ||
    !nullableDigest(record.parent_action_digest) ||
    !nullableStableId(record.queue_item_id) ||
    ![
      "plan_digest",
      "controller_intent_digest",
      "confirmation_digest",
      "authority_digest",
      "policy_digest",
      "run_head_digest",
    ].every((field) => digest(record[field])) ||
    !new Set([
      "INTENDED",
      "DISPATCH_MARKED",
      "RESPONSE_RECEIVED",
      "KNOWN_RESULT",
      "UNKNOWN_OUTCOME",
      "CANCELLED",
    ]).has(record.state) ||
    !Number.isSafeInteger(record.dispatch_count) ||
    record.dispatch_count < 0 ||
    record.dispatch_count > 1 ||
    !nullableDigest(record.provider_receipt_digest) ||
    !(record.outcome === null || OUTCOMES.has(record.outcome)) ||
    !nullableDigest(record.target_audit_digest) ||
    !nullableStableId(record.cancellation_reason_ref) ||
    !timestamp(record.created_at) ||
    !timestamp(record.updated_at) ||
    rfc3339UtcSortKey(record.updated_at) < rfc3339UtcSortKey(record.created_at)
  ) {
    return false;
  }
  if (
    (record.kind === "EXECUTE" && record.parent_action_digest !== null) ||
    (record.kind === "COMPENSATE" && !digest(record.parent_action_digest)) ||
    (new Set(["INTENDED", "CANCELLED"]).has(record.state) &&
      record.dispatch_count !== 0) ||
    (!new Set(["INTENDED", "CANCELLED"]).has(record.state) &&
      record.dispatch_count !== 1) ||
    (record.state === "KNOWN_RESULT" &&
      (!new Set(["APPLIED", "NOT_APPLIED", "PARTIALLY_APPLIED"]).has(
        record.outcome,
      ) ||
        !digest(record.target_audit_digest))) ||
    (record.state === "UNKNOWN_OUTCOME" &&
      (record.outcome !== "INDETERMINATE" ||
        !digest(record.target_audit_digest))) ||
    (record.state === "CANCELLED" &&
      (record.outcome !== "NOT_APPLIED" ||
        !digest(record.target_audit_digest) ||
        !stableId(record.cancellation_reason_ref))) ||
    (new Set(["INTENDED", "DISPATCH_MARKED", "RESPONSE_RECEIVED"]).has(
      record.state,
    ) &&
      (record.outcome !== null || record.target_audit_digest !== null))
  ) {
    return false;
  }
  return true;
}

function immutableProjection(value) {
  return {
    run_id: value.run_id,
    operation_id: value.operation_id,
    action_id: value.action_id,
    idempotency_key: value.idempotency_key,
    kind: value.kind,
    parent_action_digest: value.parent_action_digest,
    queue_item_id: value.queue_item_id,
    plan_digest: value.plan_digest,
    controller_intent_digest: value.controller_intent_digest,
    confirmation_digest: value.confirmation_digest,
    authority_digest: value.authority_digest,
    policy_digest: value.policy_digest,
    run_head_digest: value.run_head_digest,
  };
}

function sameImmutable(left, right) {
  return JSON.stringify(immutableProjection(left)) === JSON.stringify(immutableProjection(right));
}

function eventEnvelope(record, previous) {
  return {
    event_format: "external_action_event_v2",
    sequence: record.version,
    previous_event_digest:
      previous === null ? null : externalActionDigest(previous),
    event_digest: externalActionDigest(record),
    record,
  };
}

function exactEvent(value) {
  return exactFields(value, EVENT_FIELDS);
}

async function optionalFile(root, candidate, maxBytes) {
  const absolute = await resolveRepositoryPath(root, candidate, {
    label: "external action state path",
  });
  const info = await lstat(absolute).catch(() => null);
  if (info === null) return null;
  if (!info.isFile() || info.isSymbolicLink()) fail("EXTERNAL_ACTION_STATE_CORRUPT");
  return readBoundedFile(root, candidate, {
    encoding: "utf8",
    label: "external action state",
    maxBytes,
  });
}

function parseJson(text, code) {
  try {
    return JSON.parse(text);
  } catch {
    fail(code);
  }
}

export function createExternalActionStore(root, dependencies = {}) {
  if (typeof root !== "string" || root.length === 0) {
    fail("EXTERNAL_ACTION_ROOT_REQUIRED");
  }
  const safeRoot = path.resolve(root);
  const { afterEventAppend } = dependencies;
  if (afterEventAppend !== undefined && typeof afterEventAppend !== "function") {
    fail("EXTERNAL_ACTION_CRASH_HOOK_INVALID");
  }

  async function replay(storageKey) {
    const itemPaths = paths(storageKey);
    const eventText = await optionalFile(
      safeRoot,
      itemPaths.events,
      MAX_EVENT_BYTES,
    );
    if (eventText === null) return null;
    if (!eventText.endsWith("\n")) fail("EXTERNAL_ACTION_EVENT_CHAIN_CORRUPT");
    const lines = eventText.slice(0, -1).split("\n");
    if (lines.length === 0 || lines.some((line) => line.length === 0)) {
      fail("EXTERNAL_ACTION_EVENT_CHAIN_CORRUPT");
    }
    let previous = null;
    for (let index = 0; index < lines.length; index += 1) {
      const event = parseJson(lines[index], "EXTERNAL_ACTION_EVENT_CHAIN_CORRUPT");
      if (
        !exactEvent(event) ||
        event.event_format !== "external_action_event_v2" ||
        event.sequence !== index ||
        event.previous_event_digest !==
          (previous === null ? null : externalActionDigest(previous)) ||
        !validRecord(event.record) ||
        event.record.storage_key !== storageKey ||
        event.record.version !== index ||
        event.event_digest !== externalActionDigest(event.record) ||
        (previous !== null && !sameImmutable(previous, event.record))
      ) {
        fail("EXTERNAL_ACTION_EVENT_CHAIN_CORRUPT");
      }
      previous = event.record;
    }

    const snapshotText = await optionalFile(
      safeRoot,
      itemPaths.state,
      MAX_STATE_BYTES,
    );
    let snapshotBehind = snapshotText === null;
    if (snapshotText !== null) {
      const snapshot = parseJson(snapshotText, "EXTERNAL_ACTION_SNAPSHOT_CORRUPT");
      if (!validRecord(snapshot) || snapshot.storage_key !== storageKey) {
        fail("EXTERNAL_ACTION_SNAPSHOT_CORRUPT");
      }
      if (snapshot.version > previous.version) {
        fail("EXTERNAL_ACTION_SNAPSHOT_AHEAD");
      }
      if (
        snapshot.version === previous.version &&
        JSON.stringify(snapshot) !== JSON.stringify(previous)
      ) {
        fail("EXTERNAL_ACTION_SNAPSHOT_DIVERGENT");
      }
      snapshotBehind = snapshot.version < previous.version;
    }
    return { record: deepFreeze(previous), snapshotBehind };
  }

  async function persist(next, previous, assertOwnership) {
    if (!validRecord(next)) fail("INVALID_EXTERNAL_ACTION_RECORD");
    if (
      (previous === null && next.version !== 0) ||
      (previous !== null &&
        (next.version !== previous.version + 1 || !sameImmutable(next, previous)))
    ) {
      fail("EXTERNAL_ACTION_EVENT_CHAIN_CORRUPT");
    }
    const itemPaths = paths(next.storage_key);
    await assertOwnership();
    await appendFileDurable(
      safeRoot,
      itemPaths.events,
      `${JSON.stringify(eventEnvelope(next, previous))}\n`,
      { maxBytes: MAX_EVENT_BYTES },
    );
    await afterEventAppend?.(cloneFrozen(next));
    await writeFileAtomic(
      safeRoot,
      itemPaths.state,
      `${JSON.stringify(next, null, 2)}\n`,
      {
        assertOwnership,
        label: "external action snapshot",
        maxBytes: MAX_STATE_BYTES,
        mode: 0o600,
      },
    );
    return cloneFrozen(next);
  }

  async function repair(record, assertOwnership) {
    await writeFileAtomic(
      safeRoot,
      paths(record.storage_key).state,
      `${JSON.stringify(record, null, 2)}\n`,
      {
        assertOwnership,
        label: "external action snapshot repair",
        maxBytes: MAX_STATE_BYTES,
        mode: 0o600,
      },
    );
    return cloneFrozen(record);
  }

  async function underLock(storageKey, operation) {
    return withOwnerLock(safeRoot, paths(storageKey).lock, operation, {
      staleMs: 60_000,
      heartbeatMs: 10_000,
    });
  }

  function resolveReference(reference) {
    if (
      typeof reference === "string" &&
      reference.startsWith("external-action-")
    ) {
      const storageKey = reference.slice("external-action-".length);
      if (STORAGE_KEY.test(storageKey) && reference === recordId(storageKey)) {
        return { record_id: reference, storage_key: storageKey };
      }
    }
    if (validRecord(reference)) {
      return {
        record_id: reference.record_id,
        storage_key: reference.storage_key,
      };
    }
    if (
      !isObject(reference) ||
      !exactFields(reference, ["record_id", "storage_key"]) ||
      !stableId(reference.record_id) ||
      !STORAGE_KEY.test(reference.storage_key) ||
      reference.record_id !== recordId(reference.storage_key)
    ) {
      fail("INVALID_EXTERNAL_ACTION_REFERENCE");
    }
    return reference;
  }

  async function mutate(reference, operation) {
    const resolved = resolveReference(reference);
    return underLock(resolved.storage_key, async ({ assertOwnership }) => {
      const replayed = await replay(resolved.storage_key);
      if (replayed === null || replayed.record.record_id !== resolved.record_id) {
        fail("EXTERNAL_ACTION_NOT_FOUND");
      }
      return operation(replayed, assertOwnership);
    });
  }

  async function reserveDispatch(reference, input) {
    return mutate(reference, async (replayed, assertOwnership) => {
      const captured = cloneFrozen(input);
      const current = replayed.record;
      if (current.state !== "INTENDED") {
        const record = replayed.snapshotBehind
          ? await repair(current, assertOwnership)
          : current;
        return Object.freeze({ record, reserved: false });
      }
      if (
        !exactFields(captured, ["expected_version", "recorded_at"]) ||
        captured.expected_version !== current.version ||
        !timestamp(captured.recorded_at) ||
        rfc3339UtcSortKey(captured.recorded_at) <
          rfc3339UtcSortKey(current.updated_at)
      ) {
        fail("EXTERNAL_ACTION_CAS_CONFLICT");
      }
      const record = await persist(
        {
          ...current,
          version: current.version + 1,
          state: "DISPATCH_MARKED",
          dispatch_count: 1,
          updated_at: captured.recorded_at,
        },
        current,
        assertOwnership,
      );
      return Object.freeze({ record, reserved: true });
    });
  }

  return Object.freeze({
    async intent(input) {
      const captured = cloneFrozen(input, "INVALID_EXTERNAL_ACTION_INTENT");
      if (!validIntent(captured)) fail("INVALID_EXTERNAL_ACTION_INTENT");
      const storageKey = actionStorageKey(captured);
      return underLock(storageKey, async ({ assertOwnership }) => {
        const replayed = await replay(storageKey);
        if (replayed !== null) {
          if (!sameImmutable(replayed.record, captured)) {
            fail("EXTERNAL_ACTION_IDEMPOTENCY_CONFLICT");
          }
          return replayed.snapshotBehind
            ? repair(replayed.record, assertOwnership)
            : replayed.record;
        }
        const created = {
          schema: "external_action_state_v2",
          contract_version: "2.0.0",
          record_id: recordId(storageKey),
          storage_key: storageKey,
          version: 0,
          ...immutableProjection(captured),
          state: "INTENDED",
          dispatch_count: 0,
          provider_receipt_digest: null,
          outcome: null,
          target_audit_digest: null,
          cancellation_reason_ref: null,
          created_at: captured.recorded_at,
          updated_at: captured.recorded_at,
        };
        return persist(created, null, assertOwnership);
      });
    },

    async markDispatch(reference, input) {
      return (await reserveDispatch(reference, input)).record;
    },

    async reserveDispatch(reference, input) {
      return reserveDispatch(reference, input);
    },

    async recordReceipt(reference, input) {
      return mutate(reference, async (replayed, assertOwnership) => {
        const captured = cloneFrozen(input);
        const current = replayed.record;
        if (
          current.provider_receipt_digest !== null ||
          new Set(["KNOWN_RESULT", "UNKNOWN_OUTCOME"]).has(current.state)
        ) {
          if (current.provider_receipt_digest === captured.receipt_digest) {
            return replayed.snapshotBehind
              ? repair(current, assertOwnership)
              : current;
          }
          fail("EXTERNAL_ACTION_RECEIPT_CONFLICT");
        }
        if (
          current.state !== "DISPATCH_MARKED" ||
          !exactFields(captured, [
            "expected_version",
            "recorded_at",
            "receipt_digest",
          ]) ||
          captured.expected_version !== current.version ||
          !timestamp(captured.recorded_at) ||
          !digest(captured.receipt_digest)
        ) {
          fail("INVALID_EXTERNAL_ACTION_RECEIPT");
        }
        return persist(
          {
            ...current,
            version: current.version + 1,
            state: "RESPONSE_RECEIVED",
            provider_receipt_digest: captured.receipt_digest,
            updated_at: captured.recorded_at,
          },
          current,
          assertOwnership,
        );
      });
    },

    async recordOutcome(reference, input) {
      return mutate(reference, async (replayed, assertOwnership) => {
        const captured = cloneFrozen(input);
        const current = replayed.record;
        if (
          !exactFields(captured, [
            "expected_version",
            "recorded_at",
            "outcome",
            "target_audit_digest",
          ]) ||
          !OUTCOMES.has(captured.outcome) ||
          !digest(captured.target_audit_digest) ||
          !timestamp(captured.recorded_at)
        ) {
          fail("INVALID_EXTERNAL_ACTION_OUTCOME");
        }
        if (new Set(["KNOWN_RESULT", "UNKNOWN_OUTCOME"]).has(current.state)) {
          if (
            current.outcome === captured.outcome &&
            current.target_audit_digest === captured.target_audit_digest
          ) {
            return replayed.snapshotBehind
              ? repair(current, assertOwnership)
              : current;
          }
          if (current.state !== "UNKNOWN_OUTCOME") {
            fail("EXTERNAL_ACTION_OUTCOME_CONFLICT");
          }
        }
        if (
          !new Set([
            "DISPATCH_MARKED",
            "RESPONSE_RECEIVED",
            "UNKNOWN_OUTCOME",
          ]).has(current.state) ||
          captured.expected_version !== current.version ||
          rfc3339UtcSortKey(captured.recorded_at) <
            rfc3339UtcSortKey(current.updated_at)
        ) {
          fail("EXTERNAL_ACTION_CAS_CONFLICT");
        }
        return persist(
          {
            ...current,
            version: current.version + 1,
            state:
              captured.outcome === "INDETERMINATE"
                ? "UNKNOWN_OUTCOME"
                : "KNOWN_RESULT",
            outcome: captured.outcome,
            target_audit_digest: captured.target_audit_digest,
            updated_at: captured.recorded_at,
          },
          current,
          assertOwnership,
        );
      });
    },

    async cancel(reference, input) {
      return mutate(reference, async (replayed, assertOwnership) => {
        const captured = cloneFrozen(input);
        const current = replayed.record;
        if (current.state === "KNOWN_RESULT") return current;
        if (
          !exactFields(captured, [
            "expected_version",
            "recorded_at",
            "reason_ref",
            "target_audit_digest",
          ]) ||
          !Number.isSafeInteger(captured.expected_version) ||
          captured.expected_version < 0 ||
          !timestamp(captured.recorded_at) ||
          !stableId(captured.reason_ref) ||
          !digest(captured.target_audit_digest)
        ) {
          fail("INVALID_EXTERNAL_ACTION_CANCELLATION");
        }
        if (new Set(["UNKNOWN_OUTCOME", "CANCELLED"]).has(current.state)) {
          if (
            current.cancellation_reason_ref === captured.reason_ref &&
            current.target_audit_digest === captured.target_audit_digest
          ) {
            return replayed.snapshotBehind
              ? repair(current, assertOwnership)
              : current;
          }
          fail("EXTERNAL_ACTION_CANCELLATION_CONFLICT");
        }
        if (captured.expected_version !== current.version) {
          fail("EXTERNAL_ACTION_CAS_CONFLICT");
        }
        const beforeDispatch = current.state === "INTENDED";
        return persist(
          {
            ...current,
            version: current.version + 1,
            state: beforeDispatch ? "CANCELLED" : "UNKNOWN_OUTCOME",
            dispatch_count: beforeDispatch ? 0 : 1,
            outcome: beforeDispatch ? "NOT_APPLIED" : "INDETERMINATE",
            target_audit_digest: captured.target_audit_digest,
            cancellation_reason_ref: captured.reason_ref,
            updated_at: captured.recorded_at,
          },
          current,
          assertOwnership,
        );
      });
    },

    async show(reference) {
      const resolved = resolveReference(reference);
      const replayed = await replay(resolved.storage_key);
      if (replayed === null || replayed.record.record_id !== resolved.record_id) {
        fail("EXTERNAL_ACTION_NOT_FOUND");
      }
      if (replayed.snapshotBehind) fail("EXTERNAL_ACTION_SNAPSHOT_BEHIND");
      return replayed.record;
    },

    async recover(reference) {
      const resolved = resolveReference(reference);
      return underLock(resolved.storage_key, async ({ assertOwnership }) => {
        const replayed = await replay(resolved.storage_key);
        if (
          replayed === null ||
          replayed.record.record_id !== resolved.record_id
        ) {
          fail("EXTERNAL_ACTION_NOT_FOUND");
        }
        return replayed.snapshotBehind
          ? repair(replayed.record, assertOwnership)
          : replayed.record;
      });
    },
  });
}

export const EXTERNAL_ACTION_OUTCOMES = Object.freeze([...OUTCOMES]);
