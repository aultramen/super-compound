import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, opendir } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendFileDurable,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import {
  cancelQueueItem,
  claimQueueItem,
  completeQueueItem,
  consumeQueueDispatchPermit,
  evaluateQueueClaimApproval,
  heartbeatQueueItem,
  prepareQueueItem,
  reconcileQueueItem,
  submitQueueItem,
  transitionQueueClaimApprovalRequired,
} from "./loop-queue-model.mjs";
import { createLoopRunController } from "./loop-run.mjs";
import {
  assertValidValue,
  parseJsonDocument,
  rfc3339UtcSortKey,
  validateSchemaDefinition,
} from "./schema-validator.mjs";

const QUEUE_DIRECTORY = path.join(".scratch", "loop-queue");
const ITEMS_DIRECTORY = path.join(QUEUE_DIRECTORY, "items");
const QUEUE_LOCK = path.join(QUEUE_DIRECTORY, ".queue.lock");
const BACKGROUND_COORDINATORS = new WeakMap();
const SCHEMA_FILE = path.join(
  ".agent",
  "context",
  "schemas",
  "automation-trigger-v2.schema.json",
);

export function assertBackgroundQueueCoordinator(coordinator, root) {
  if (
    coordinator === null ||
    typeof coordinator !== "object" ||
    typeof root !== "string" ||
    root.length === 0
  ) {
    throw new TypeError("QUEUE_BACKGROUND_COORDINATOR_REQUIRED");
  }
  const binding = BACKGROUND_COORDINATORS.get(coordinator);
  if (binding === undefined) {
    throw new TypeError("QUEUE_BACKGROUND_COORDINATOR_UNTRUSTED");
  }
  if (binding.root !== path.resolve(root)) {
    throw new TypeError("QUEUE_BACKGROUND_COORDINATOR_ROOT_MISMATCH");
  }
  return true;
}

export async function coordinateBackgroundQueueClaim(
  coordinator,
  root,
  input,
  operation,
) {
  assertBackgroundQueueCoordinator(coordinator, root);
  const binding = BACKGROUND_COORDINATORS.get(coordinator);
  if (typeof operation !== "function") {
    throw new TypeError("QUEUE_BACKGROUND_OPERATION_REQUIRED");
  }
  return binding.coordinate(input, operation);
}
const MAX_SCHEMA_BYTES = 256 * 1024;
const MAX_EVENT_BYTES = 8 * 1024 * 1024;
const MAX_STATE_BYTES = 512 * 1024;
const MAX_ITEMS = 4096;
const MAX_SCAN_BYTES = 64 * 1024 * 1024;
const STORAGE_KEY = /^[a-f0-9]{64}$/u;
const EVENT_FIELDS = Object.freeze([
  "event_format",
  "sequence",
  "previous_event_digest",
  "event_digest",
  "item",
]);
const DISPATCH_PERMIT_INPUT_FIELDS = Object.freeze([
  "queue_item_id",
  "minimum_version",
  "lease_id",
  "worker_ref",
  "attempt",
  "dispatch_id",
  "operation",
  "action_id",
  "idempotency_key",
  "controller_intent_digest",
  "action_run_head_digest",
  "action_run_version",
  "authorization_expires_at",
  "background_record_version",
  "background_record_digest",
]);

function exactClaimFence(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 5 &&
    ["queue_item_id", "minimum_version", "lease_id", "worker_ref", "attempt"].every(
      (field) => Object.hasOwn(value, field),
    ) &&
    [value.queue_item_id, value.lease_id, value.worker_ref].every(
      (entry) => typeof entry === "string" && entry.length > 0,
    ) &&
    Number.isSafeInteger(value.minimum_version) &&
    value.minimum_version >= 0 &&
    Number.isSafeInteger(value.attempt) &&
    value.attempt > 0
  );
}

export function projectClaimedQueueItem(item, fence, observedAt) {
  if (!exactClaimFence(fence)) throw new TypeError("QUEUE_CLAIM_FENCE_INVALID");
  if (
    item?.state !== "CLAIMED" ||
    item.queue_item_id !== fence.queue_item_id ||
    !Number.isSafeInteger(item.version) ||
    item.version < fence.minimum_version ||
    item.lease === null ||
    rfc3339UtcSortKey(observedAt) === null ||
    rfc3339UtcSortKey(item.lease.expires_at) === null ||
    rfc3339UtcSortKey(observedAt) >= rfc3339UtcSortKey(item.lease.expires_at)
  ) {
    throw new TypeError("QUEUE_CLAIM_NOT_ACTIVE");
  }
  if (
    item.lease.lease_id !== fence.lease_id ||
    item.lease.worker_ref !== fence.worker_ref ||
    item.lease.attempt !== fence.attempt
  ) {
    throw new TypeError("QUEUE_CLAIM_FENCE_INVALID");
  }
  const binding = item.run_binding;
  return Object.freeze({
    queue_item_id: item.queue_item_id,
    queue_version: item.version,
    queue_state: item.state,
    run_id: binding.run_id,
    phase: binding.phase,
    expected_run_version: binding.expected_run_version,
    goal_digest: binding.goal_digest,
    authority_digest: binding.authority_digest,
    verifier_digest: binding.verifier_digest,
    eval_definition_digest: binding.eval_definition_digest,
    project_config_digest: binding.project_config_digest,
    policy_digest: binding.policy_digest,
    operation_inventory_digest: binding.operation_inventory_digest,
    risk_profile: binding.risk_profile,
    autonomy_profile: binding.autonomy_profile,
    required_gates: Object.freeze([...binding.required_gates]),
    run_head_digest: binding.run_head_digest,
    approval_digest: binding.approval_digest,
    approval_expires_at: binding.approval_expires_at,
    dispatch_commit:
      item.dispatch_commit === null
        ? null
        : deepFreeze(structuredClone(item.dispatch_commit)),
    lease: Object.freeze({
      lease_id: item.lease.lease_id,
      worker_ref: item.lease.worker_ref,
      attempt: item.lease.attempt,
      expires_at: item.lease.expires_at,
    }),
  });
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}

function storageKey(queueItemId) {
  if (typeof queueItemId !== "string" || queueItemId.length === 0) {
    throw new TypeError("QUEUE_ITEM_ID_REQUIRED");
  }
  return createHash("sha256").update(queueItemId).digest("hex");
}

function digestItem(item) {
  return `sha256:${createHash("sha256").update(JSON.stringify(item)).digest("hex")}`;
}

function eventEnvelope(item, previousItem) {
  return {
    event_format: "loop_queue_event_v2",
    sequence: item.version,
    previous_event_digest: previousItem === null ? null : digestItem(previousItem),
    event_digest: digestItem(item),
    item,
  };
}

function exactEventFields(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join("\u0000") === [...EVENT_FIELDS].sort().join("\u0000")
  );
}

function itemPathsFromKey(key) {
  if (!STORAGE_KEY.test(key)) throw new TypeError("QUEUE_STORAGE_KEY_INVALID");
  const directory = path.join(ITEMS_DIRECTORY, key);
  return {
    directory,
    events: path.join(directory, "events.jsonl"),
    state: path.join(directory, "state.json"),
  };
}

function immutableProjection(item) {
  const runBinding = { ...item.run_binding };
  delete runBinding.run_head_digest;
  delete runBinding.approval_digest;
  delete runBinding.approval_expires_at;
  return {
    run_binding: runBinding,
    provenance: item.provenance,
    dedupe_identity_digest: item.dedupe_identity_digest,
    payload_digest: item.payload_digest,
    prepared_at: item.prepared_at,
    available_at: item.available_at,
    expires_at: item.expires_at,
    missed_run_policy: item.missed_run_policy,
    lease_policy: item.lease_policy,
    retry_policy: item.retry_policy,
    concurrency: item.concurrency,
    rate_limit: item.rate_limit,
    result_sink_ref: item.result_sink_ref,
    policy_ref: item.policy_ref,
  };
}

function lifecycleIdentityProjection(item) {
  const runBinding = { ...item.run_binding };
  delete runBinding.phase;
  delete runBinding.expected_run_version;
  delete runBinding.run_head_digest;
  delete runBinding.approval_digest;
  delete runBinding.approval_expires_at;
  return {
    schema: item.schema,
    contract_version: item.contract_version,
    queue_item_id: item.queue_item_id,
    run_binding: runBinding,
    provenance: item.provenance,
    dedupe_identity_digest: item.dedupe_identity_digest,
    payload_digest: item.payload_digest,
    prepared_at: item.prepared_at,
    available_at: item.available_at,
    expires_at: item.expires_at,
    missed_run_policy: item.missed_run_policy,
    lease_policy: item.lease_policy,
    retry_policy: item.retry_policy,
    concurrency: item.concurrency,
    rate_limit: item.rate_limit,
    result_sink_ref: item.result_sink_ref,
    policy_ref: item.policy_ref,
  };
}

export function createLoopQueue(root, dependencies = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("QUEUE_ROOT_REQUIRED");
  }
  const {
    now,
    randomId,
    validateQueueGate,
    afterEventAppend,
    afterAuthorityScan,
    scanByteLimit = MAX_SCAN_BYTES,
  } = dependencies;
  if (typeof now !== "function") throw new TypeError("TRUSTED_CLOCK_REQUIRED");
  if (typeof randomId !== "function") throw new TypeError("RANDOM_ID_REQUIRED");
  if (typeof validateQueueGate !== "function") {
    throw new TypeError("QUEUE_GATE_VALIDATOR_REQUIRED");
  }
  if (afterEventAppend !== undefined && typeof afterEventAppend !== "function") {
    throw new TypeError("QUEUE_CRASH_HOOK_INVALID");
  }
  if (afterAuthorityScan !== undefined && typeof afterAuthorityScan !== "function") {
    throw new TypeError("QUEUE_SCAN_HOOK_INVALID");
  }
  if (
    !Number.isSafeInteger(scanByteLimit) ||
    scanByteLimit <= 0 ||
    scanByteLimit > MAX_SCAN_BYTES
  ) {
    throw new TypeError("QUEUE_SCAN_BYTE_LIMIT_INVALID");
  }
  const safeRoot = path.resolve(root);
  let schemaPromise;

  async function loadSchema() {
    schemaPromise ??= (async () => {
      const text = await readBoundedFile(safeRoot, SCHEMA_FILE, {
        encoding: "utf8",
        label: "automation trigger schema",
        maxBytes: MAX_SCHEMA_BYTES,
      });
      let schema;
      try {
        schema = JSON.parse(text);
      } catch {
        throw new TypeError("AUTOMATION_TRIGGER_SCHEMA_INVALID");
      }
      const result = validateSchemaDefinition(schema);
      if (!result.valid) throw new TypeError("AUTOMATION_TRIGGER_SCHEMA_INVALID");
      return deepFreeze(schema);
    })();
    return schemaPromise;
  }

  async function readOptional(candidate, maxBytes, scanBudget = null) {
    const absolute = await resolveRepositoryPath(safeRoot, candidate, {
      label: "queue state path",
    });
    const info = await lstat(absolute).catch(() => null);
    if (info === null) return null;
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error("QUEUE_STATE_CORRUPT");
    }
    if (scanBudget !== null) {
      if (info.size > scanBudget.remaining) {
        throw new Error("QUEUE_SCAN_BYTE_LIMIT_EXCEEDED");
      }
      scanBudget.remaining -= info.size;
    }
    const text = await readBoundedFile(safeRoot, candidate, {
      encoding: "utf8",
      label: "queue state",
      maxBytes,
    });
    if (scanBudget !== null && Buffer.byteLength(text, "utf8") > info.size) {
      const growth = Buffer.byteLength(text, "utf8") - info.size;
      if (growth > scanBudget.remaining) {
        throw new Error("QUEUE_SCAN_BYTE_LIMIT_EXCEEDED");
      }
      scanBudget.remaining -= growth;
    }
    return text;
  }

  async function readAuthorityByKey(key, expectedQueueItemId = null, scanBudget = null) {
    const schema = await loadSchema();
    const paths = itemPathsFromKey(key);
    const text = await readOptional(paths.events, MAX_EVENT_BYTES, scanBudget);
    if (text === null) return null;
    const lines = text.split("\n").filter((line) => line.length > 0);
    if (lines.length === 0 || lines.length > 10_000) {
      throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
    }
    let previous = null;
    let previousEventDigest = null;
    for (const [index, line] of lines.entries()) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
      }
      if (
        !exactEventFields(event) ||
        event.event_format !== "loop_queue_event_v2" ||
        event.sequence !== index ||
        event.previous_event_digest !== previousEventDigest
      ) {
        throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
      }
      const item = parseJsonDocument(
        JSON.stringify(event.item),
        schema,
        "queue event snapshot",
      );
      if (
        item.version !== event.sequence ||
        event.event_digest !== digestItem(item) ||
        (previous !== null &&
          !isDeepStrictEqual(
            lifecycleIdentityProjection(item),
            lifecycleIdentityProjection(previous),
          ))
      ) {
        throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
      }
      previous = item;
      previousEventDigest = event.event_digest;
    }
    if (
      previous === null ||
      storageKey(previous.queue_item_id) !== key ||
      (expectedQueueItemId !== null && previous.queue_item_id !== expectedQueueItemId)
    ) {
      throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
    }
    const snapshotText = await readOptional(paths.state, MAX_STATE_BYTES, scanBudget);
    if (snapshotText !== null) {
      const snapshot = parseJsonDocument(snapshotText, schema, "queue snapshot");
      if (
        snapshot.queue_item_id !== previous.queue_item_id ||
        snapshot.version > previous.version ||
        (snapshot.version === previous.version && !isDeepStrictEqual(snapshot, previous))
      ) {
        throw new Error("QUEUE_SNAPSHOT_CORRUPT");
      }
    }
    return deepFreeze(previous);
  }

  async function readAllAuthorities() {
    const directory = await resolveRepositoryPath(safeRoot, ITEMS_DIRECTORY, {
      label: "queue items directory",
    });
    const info = await lstat(directory).catch(() => null);
    if (info === null) return [];
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error("QUEUE_DIRECTORY_CORRUPT");
    }
    const entries = [];
    const handle = await opendir(directory);
    for await (const entry of handle) {
      if (entries.length >= MAX_ITEMS) throw new Error("QUEUE_ITEM_LIMIT_EXCEEDED");
      if (!entry.isDirectory() || entry.isSymbolicLink() || !STORAGE_KEY.test(entry.name)) {
        throw new Error("QUEUE_DIRECTORY_CORRUPT");
      }
      entries.push(entry.name);
    }
    const items = [];
    const scanBudget = { remaining: scanByteLimit };
    for (const key of entries.sort()) {
      const item = await readAuthorityByKey(key, null, scanBudget);
      if (item === null) throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
      items.push(item);
    }
    return items;
  }

  async function persist(item, assertOwnership, previousItem = null) {
    const schema = await loadSchema();
    assertValidValue(item, schema, "automation trigger");
    const paths = itemPathsFromKey(storageKey(item.queue_item_id));
    await assertOwnership();
    if (
      (previousItem === null && item.version !== 0) ||
      (previousItem !== null &&
        (item.queue_item_id !== previousItem.queue_item_id ||
          item.version !== previousItem.version + 1))
    ) {
      throw new Error("QUEUE_EVENT_CHAIN_CORRUPT");
    }
    const event = eventEnvelope(item, previousItem);
    await appendFileDurable(safeRoot, paths.events, `${JSON.stringify(event)}\n`, {
      maxBytes: MAX_EVENT_BYTES,
    });
    await afterEventAppend?.(deepFreeze(structuredClone(item)));
    await writeFileAtomic(safeRoot, paths.state, `${JSON.stringify(item, null, 2)}\n`, {
      assertOwnership,
      label: "queue snapshot",
      maxBytes: MAX_STATE_BYTES,
      mode: 0o600,
    });
    return deepFreeze(structuredClone(item));
  }

  async function repairSnapshot(item, assertOwnership) {
    const schema = await loadSchema();
    assertValidValue(item, schema, "automation trigger");
    const paths = itemPathsFromKey(storageKey(item.queue_item_id));
    await writeFileAtomic(safeRoot, paths.state, `${JSON.stringify(item, null, 2)}\n`, {
      assertOwnership,
      label: "queue snapshot repair",
      maxBytes: MAX_STATE_BYTES,
      mode: 0o600,
    });
    return item;
  }

  async function underQueueLock(operation) {
    return withOwnerLock(safeRoot, QUEUE_LOCK, operation, {
      staleMs: 60_000,
      heartbeatMs: 10_000,
    });
  }

  async function requireItem(queueItemId) {
    const item = await readAuthorityByKey(storageKey(queueItemId), queueItemId);
    if (item === null) throw new Error("QUEUE_ITEM_NOT_FOUND");
    return item;
  }

  async function trustedGate(item) {
    const gate = await validateQueueGate({
      runId: item.run_binding.run_id,
      operation: "queue-claim",
      queueItemId: item.queue_item_id,
    });
    try {
      return deepFreeze(structuredClone(gate));
    } catch {
      throw new TypeError("QUEUE_APPROVAL_REQUIRED");
    }
  }

  async function coordinateValidatedClaim(input, operation) {
    if (typeof operation !== "function") {
      throw new TypeError("QUEUE_CLAIM_OPERATION_REQUIRED");
    }
    let captured;
    try {
      captured = structuredClone(input);
    } catch {
      throw new TypeError("QUEUE_CLAIM_FENCE_INVALID");
    }
    return underQueueLock(async (lock) => {
      const item = await requireItem(captured.queue_item_id);
      const projection = projectClaimedQueueItem(item, captured, now());
      let active = true;
      let invoked = false;
      const commitDispatch = async (proof) => {
        if (!active || invoked) {
          throw new TypeError("QUEUE_DISPATCH_COMMIT_NOT_ACTIVE");
        }
        invoked = true;
        let capturedProof;
        try {
          capturedProof = structuredClone(proof);
        } catch {
          throw new TypeError("INVALID_QUEUE_DISPATCH_COMMIT");
        }
        if (
          capturedProof === null ||
          typeof capturedProof !== "object" ||
          Array.isArray(capturedProof) ||
          Object.keys(capturedProof).length !==
            DISPATCH_PERMIT_INPUT_FIELDS.length ||
          !DISPATCH_PERMIT_INPUT_FIELDS.every((field) =>
            Object.hasOwn(capturedProof, field),
          ) ||
          capturedProof.queue_item_id !== captured.queue_item_id ||
          capturedProof.minimum_version !== captured.minimum_version ||
          capturedProof.lease_id !== captured.lease_id ||
          capturedProof.worker_ref !== captured.worker_ref ||
          capturedProof.attempt !== captured.attempt
        ) {
          throw new TypeError("QUEUE_DISPATCH_FENCE_MISMATCH");
        }
        const next = consumeQueueDispatchPermit(item, {
          expected_version: item.version,
          now: now(),
          worker_ref: capturedProof.worker_ref,
          lease_id: capturedProof.lease_id,
          attempt: capturedProof.attempt,
          dispatch_id: capturedProof.dispatch_id,
          operation: capturedProof.operation,
          action_id: capturedProof.action_id,
          idempotency_key: capturedProof.idempotency_key,
          controller_intent_digest: capturedProof.controller_intent_digest,
          action_run_head_digest: capturedProof.action_run_head_digest,
          action_run_version: capturedProof.action_run_version,
          authorization_expires_at: capturedProof.authorization_expires_at,
          background_record_version: capturedProof.background_record_version,
          background_record_digest: capturedProof.background_record_digest,
        });
        const consumed = next !== item;
        const durable = consumed
          ? await persist(next, lock.assertOwnership, item)
          : await repairSnapshot(item, lock.assertOwnership);
        return deepFreeze({
          consumed,
          item: durable,
          dispatch_commit: structuredClone(durable.dispatch_commit),
        });
      };
      try {
        return await operation(projection, {
          ...lock,
          commitDispatch,
        });
      } finally {
        active = false;
      }
    });
  }

  const backgroundCoordinator = Object.freeze(Object.create(null));
  BACKGROUND_COORDINATORS.set(backgroundCoordinator, {
    root: safeRoot,
    coordinate: coordinateValidatedClaim,
  });

  return Object.freeze({
    backgroundCoordinator,
    async prepare(input) {
      return underQueueLock(async ({ assertOwnership }) => {
        const candidate = prepareQueueItem(input);
        const items = await readAllAuthorities();
        const existing = items.find(
          (item) => item.dedupe_identity_digest === candidate.dedupe_identity_digest,
        );
        if (existing !== undefined) {
          if (!isDeepStrictEqual(immutableProjection(existing), immutableProjection(candidate))) {
            throw new Error("QUEUE_DEDUPE_CONFLICT");
          }
          return existing;
        }
        if (items.some((item) => item.queue_item_id === candidate.queue_item_id)) {
          throw new Error("QUEUE_ITEM_ID_CONFLICT");
        }
        return persist(candidate, assertOwnership, null);
      });
    },

    async submit(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_SUBMISSION");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        const gate = await trustedGate(item);
        const next = submitQueueItem(item, {
          ...captured,
          now: now(),
          gate,
        });
        return persist(next, assertOwnership, item);
      });
    },

    async claim(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_CLAIM");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        if (
          new Set([
            "COMPLETED",
            "CANCELLED",
            "UNKNOWN_OUTCOME",
            "RECONCILED",
            "EXPIRED",
          ]).has(item.state)
        ) {
          await repairSnapshot(item, assertOwnership);
        }
        const items = await readAllAuthorities();
        await afterAuthorityScan?.();
        const accountingTime = now();
        const activeConcurrencyCount = items.filter(
          (candidate) =>
            candidate.queue_item_id !== item.queue_item_id &&
            candidate.concurrency.key === item.concurrency.key &&
            new Set(["CLAIMED", "CANCEL_REQUESTED"]).has(candidate.state) &&
            candidate.lease !== null &&
            Date.parse(candidate.lease.expires_at) > Date.parse(accountingTime),
        ).length;
        const windowStart = Date.parse(accountingTime) - item.rate_limit.window_ms;
        const recentClaimCount = items
          .filter((candidate) => candidate.rate_limit.key === item.rate_limit.key)
          .flatMap((candidate) => candidate.claim_history)
          .filter((claimedAt) => {
            const value = Date.parse(claimedAt);
            return value > windowStart && value <= Date.parse(accountingTime);
          }).length;
        let gate;
        try {
          gate = await trustedGate(item);
        } catch (error) {
          if (item.state !== "SUBMITTED" || error?.code !== "APPROVAL_REQUIRED") {
            throw error;
          }
          const disposition = evaluateQueueClaimApproval(item, {
            now: now(),
            gate: null,
          });
          const blocked = transitionQueueClaimApprovalRequired(item, disposition);
          await persist(blocked, assertOwnership, item);
          const approvalError = new Error("QUEUE_APPROVAL_REQUIRED");
          approvalError.code = "APPROVAL_REQUIRED";
          throw approvalError;
        }
        const claimTime = now();
        if (item.state === "SUBMITTED") {
          const disposition = evaluateQueueClaimApproval(item, {
            now: claimTime,
            gate,
          });
          if (disposition.decision !== "CLAIMABLE") {
            const blocked = transitionQueueClaimApprovalRequired(item, disposition);
            await persist(blocked, assertOwnership, item);
            throw new Error("QUEUE_APPROVAL_REQUIRED");
          }
        }
        const next = claimQueueItem(item, {
          ...captured,
          now: claimTime,
          lease_id: randomId(),
          gate,
          active_concurrency_count: activeConcurrencyCount,
          recent_claim_count: recentClaimCount,
        });
        return persist(next, assertOwnership, item);
      });
    },

    async heartbeat(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_HEARTBEAT");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        const next = heartbeatQueueItem(item, {
          ...captured,
          now: now(),
        });
        return persist(next, assertOwnership, item);
      });
    },

    async complete(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_COMPLETION");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        const next = completeQueueItem(item, { ...captured, now: now() });
        const durable = next === item
          ? await repairSnapshot(item, assertOwnership)
          : await persist(next, assertOwnership, item);
        return deepFreeze({ acknowledged: true, item: durable });
      });
    },

    async cancel(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_CANCELLATION");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        const next = cancelQueueItem(item, { ...captured, now: now() });
        return next === item
          ? repairSnapshot(item, assertOwnership)
          : persist(next, assertOwnership, item);
      });
    },

    async reconcile(queueItemId, input) {
      let captured;
      try {
        captured = structuredClone(input);
      } catch {
        throw new TypeError("INVALID_QUEUE_RECONCILIATION");
      }
      return underQueueLock(async ({ assertOwnership }) => {
        const item = await requireItem(queueItemId);
        const next = reconcileQueueItem(item, { ...captured, now: now() });
        return next === item
          ? repairSnapshot(item, assertOwnership)
          : persist(next, assertOwnership, item);
      });
    },

    async show(queueItemId) {
      return requireItem(queueItemId);
    },

    async validateClaim(input) {
      return coordinateValidatedClaim(input, async (projection) => projection);
    },

    async itemStorageKey(queueItemId) {
      return storageKey(queueItemId);
    },
  });
}

const CLI_COMMANDS = Object.freeze({
  prepare: {
    allowed: ["input-file"],
    required: ["input-file"],
  },
  submit: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  claim: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  heartbeat: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  complete: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  cancel: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  reconcile: {
    allowed: ["item", "expected-version", "input-file"],
    required: ["item", "expected-version", "input-file"],
  },
  show: {
    allowed: ["item"],
    required: ["item"],
  },
});

function parseQueueCli(argv) {
  if (!Array.isArray(argv) || typeof argv[0] !== "string") {
    throw new Error("Loop Queue command is required.");
  }
  const command = argv[0];
  const contract = CLI_COMMANDS[command];
  if (contract === undefined) throw new Error(`Unsupported Loop Queue command: ${command}`);
  const options = {};
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      typeof flag !== "string" ||
      !flag.startsWith("--") ||
      typeof value !== "string" ||
      value.startsWith("--")
    ) {
      throw new Error(`Invalid option for ${command}.`);
    }
    const name = flag.slice(2);
    if (!contract.allowed.includes(name)) {
      throw new Error(`Unknown option for ${command}: --${name}`);
    }
    if (Object.hasOwn(options, name)) {
      throw new Error(`Duplicate option for ${command}: --${name}`);
    }
    options[name] = value;
  }
  for (const required of contract.required) {
    if (!Object.hasOwn(options, required)) {
      throw new Error(`${command} requires --${required}.`);
    }
  }
  return { command, options };
}

function parseExpectedVersion(value) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? "")) {
    throw new Error("--expected-version must be a non-negative safe integer.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("--expected-version must be a non-negative safe integer.");
  }
  return parsed;
}

async function readCommandInput(root, file) {
  const text = await readBoundedFile(root, file, {
    encoding: "utf8",
    label: "queue command input",
    maxBytes: 256 * 1024,
  });
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new TypeError("QUEUE_COMMAND_INPUT_INVALID_JSON");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("QUEUE_COMMAND_INPUT_INVALID");
  }
  return value;
}

export async function runLoopQueueCli(
  argv,
  { root = process.cwd(), queueDependencies = {} } = {},
) {
  if (
    queueDependencies === null ||
    typeof queueDependencies !== "object" ||
    Array.isArray(queueDependencies) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(queueDependencies))
  ) {
    throw new TypeError("CLI queueDependencies must be a plain object.");
  }
  const { command, options } = parseQueueCli(argv);
  const controller = createLoopRunController(root, {
    now: queueDependencies.now,
  });
  const queue = createLoopQueue(root, {
    now: queueDependencies.now ?? (() => new Date().toISOString()),
    randomId:
      queueDependencies.randomId ?? (() => `lease.${randomUUID()}`),
    validateQueueGate:
      queueDependencies.validateQueueGate ??
      ((request) => controller.validateGate(request)),
    afterEventAppend: queueDependencies.afterEventAppend,
  });
  if (command === "show") return queue.show(options.item);
  const input = await readCommandInput(root, options["input-file"]);
  if (command === "prepare") return queue.prepare(input);
  if (Object.hasOwn(input, "expected_version")) {
    throw new TypeError("QUEUE_COMMAND_EXPECTED_VERSION_INPUT_FORBIDDEN");
  }
  const commandInput = {
    ...input,
    expected_version: parseExpectedVersion(options["expected-version"]),
  };
  switch (command) {
    case "submit":
      return queue.submit(options.item, commandInput);
    case "claim":
      return queue.claim(options.item, commandInput);
    case "heartbeat":
      return queue.heartbeat(options.item, commandInput);
    case "complete":
      return queue.complete(options.item, commandInput);
    case "cancel":
      return queue.cancel(options.item, commandInput);
    case "reconcile":
      return queue.reconcile(options.item, commandInput);
    default:
      throw new Error(`Unsupported Loop Queue command: ${command}`);
  }
}

const isCli =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  runLoopQueueCli(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message.replace(/[\r\n]+/gu, " ")}\n`);
      process.exitCode = 1;
    });
}
