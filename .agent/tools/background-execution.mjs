import { createHash } from "node:crypto";
import { lstat, open, readdir } from "node:fs/promises";
import path from "node:path";

import {
  appendFileDurable,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import {
  authorizeBackgroundAction,
  backgroundDispatchDigest,
  isBackgroundDispatchRecord,
  reserveBackgroundClaim,
  transitionBackgroundDispatch,
} from "./background-execution-model.mjs";
import {
  assertBackgroundQueueCoordinator,
  coordinateBackgroundQueueClaim,
} from "./loop-queue.mjs";
import {
  assertCanonicalBackgroundPolicyAuthority,
  withCanonicalBackgroundPolicyAuthority,
} from "./background-policy.mjs";

const DIRECTORY = path.join(
  ".scratch",
  "loop-runtime",
  "background-dispatches",
  "items",
);
const SHARED_QUEUE_LOCK = path.join(".scratch", "loop-queue", ".queue.lock");
const STORAGE_KEY = /^[a-f0-9]{64}$/u;
const MAX_ITEMS = 256;
const MAX_EVENT_BYTES = 8 * 1024 * 1024;
const MAX_STATE_BYTES = 512 * 1024;
const EVENT_FIELDS = Object.freeze([
  "event_format",
  "sequence",
  "previous_event_digest",
  "event_digest",
  "command",
  "record",
]);
const ARM_INPUT_FIELDS = Object.freeze([
  "expected_version",
  "action_gate",
  "evidence_digest",
]);
const AUTHORIZE_INPUT_FIELDS = Object.freeze([
  "action_gate",
  "host_attestation",
]);
const DURABLE_VALIDATOR_INPUT_FIELDS = Object.freeze([
  "dispatchId",
  "request",
  "gate",
  "attestation",
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

function clone(value, code) {
  try {
    return structuredClone(value);
  } catch {
    fail(code);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function storageKey(dispatchId) {
  if (typeof dispatchId !== "string" || dispatchId.length === 0) {
    fail("BACKGROUND_DISPATCH_ID_INVALID");
  }
  return hash(dispatchId);
}

function itemPaths(key) {
  if (!STORAGE_KEY.test(key)) fail("BACKGROUND_STORAGE_KEY_INVALID");
  const directory = path.join(DIRECTORY, key);
  return {
    directory,
    events: path.join(directory, "events.jsonl"),
    state: path.join(directory, "state.json"),
  };
}

async function assertDirectoryDurabilityAvailable(
  root,
  candidate,
  durabilityFault,
) {
  const absolute = await resolveRepositoryPath(root, candidate, {
    label: "background dispatch snapshot",
  });
  let handle;
  try {
    handle = await open(path.dirname(absolute), "r");
    await durabilityFault?.(
      "BEFORE_DIRECTORY_SYNC",
      Object.freeze({ target: path.dirname(absolute) }),
    );
    await handle.sync();
  } catch (error) {
    if (
      error?.code === "EDURABILITYINJECTED" ||
      ["EACCES", "EBADF", "EISDIR", "EINVAL", "ENOTSUP", "EPERM"].includes(
        error?.code,
      )
    ) {
      fail("BACKGROUND_DURABILITY_UNSUPPORTED");
    }
    throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function optionalFile(root, candidate, maxBytes) {
  const absolute = await resolveRepositoryPath(root, candidate, {
    label: "background execution state path",
  });
  const info = await lstat(absolute).catch(() => null);
  if (info === null) return null;
  if (!info.isFile() || info.isSymbolicLink()) {
    fail("BACKGROUND_STATE_CORRUPT");
  }
  return readBoundedFile(root, candidate, {
    encoding: "utf8",
    label: "background execution state",
    maxBytes,
  });
}

function parseJson(value, code) {
  try {
    return JSON.parse(value);
  } catch {
    fail(code);
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function eventEnvelope(record, previous, command) {
  return {
    event_format: "background_dispatch_event_v2",
    sequence: record.version,
    previous_event_digest:
      previous === null ? null : backgroundDispatchDigest(previous),
    event_digest: backgroundDispatchDigest(record),
    command,
    record,
  };
}

function sameReservationAuthority(record, input) {
  return (
    record.dispatch_id === input.dispatch_id &&
    record.run_binding.run_id === input.queue_claim.run_id &&
    record.queue_binding.queue_item_id === input.queue_claim.queue_item_id &&
    record.queue_binding.lease_id === input.queue_claim.lease.lease_id &&
    record.queue_binding.worker_ref === input.queue_claim.lease.worker_ref &&
    record.queue_binding.attempt === input.queue_claim.lease.attempt &&
    record.worktree.worktree_ref === input.worktree_attestation.worktree_ref &&
    record.worktree.root_digest === input.worktree_attestation.root_digest &&
    record.aggregate_policy_digest === input.aggregate_policy_digest &&
    record.effective_limits_digest === input.effective_limits_digest
  );
}

function sameTransitionRetry(record, input) {
  if (!isObject(record.last_transition)) return false;
  if (
    record.last_transition.command !== input.command ||
    record.last_transition.outcome !== input.outcome ||
    record.last_transition.evidence_digest !== input.evidence_digest ||
    input.expected_version !== record.version - 1
  ) {
    return false;
  }
  if (input.command !== "DISPATCH_INTENDED") return input.authorization === null;
  return (
    isObject(input.authorization) &&
    isObject(record.action_binding) &&
    input.authorization.operation === record.action_binding.operation &&
    input.authorization.action_id === record.action_binding.action_id &&
    input.authorization.idempotency_key === record.action_binding.idempotency_key &&
    input.authorization.controller_intent_digest ===
      record.action_binding.controller_intent_digest
  );
}

function queueClaimFence(queueClaim) {
  if (!isObject(queueClaim) || !isObject(queueClaim.lease)) {
    fail("BACKGROUND_QUEUE_CLAIM_INVALID");
  }
  return {
    queue_item_id: queueClaim.queue_item_id,
    minimum_version: queueClaim.queue_version,
    lease_id: queueClaim.lease.lease_id,
    worker_ref: queueClaim.lease.worker_ref,
    attempt: queueClaim.lease.attempt,
  };
}

function queueBindingFence(binding) {
  if (!isObject(binding)) fail("BACKGROUND_QUEUE_BINDING_INVALID");
  return {
    queue_item_id: binding.queue_item_id,
    minimum_version: binding.queue_version,
    lease_id: binding.lease_id,
    worker_ref: binding.worker_ref,
    attempt: binding.attempt,
  };
}

function activeBefore(observedAt, expiresAt) {
  const observed = Date.parse(observedAt);
  const expires = Date.parse(expiresAt);
  return Number.isFinite(observed) && Number.isFinite(expires) && observed < expires;
}

function dispatchCommitProof(record) {
  const binding = record.action_binding;
  if (!isObject(binding) || record.state !== "DISPATCH_INTENDED") {
    fail("BACKGROUND_DISPATCH_COMMIT_INVALID");
  }
  return {
    queue_item_id: record.queue_binding.queue_item_id,
    minimum_version: record.queue_binding.queue_version,
    lease_id: record.queue_binding.lease_id,
    worker_ref: record.queue_binding.worker_ref,
    attempt: record.queue_binding.attempt,
    dispatch_id: record.dispatch_id,
    operation: "work",
    action_id: binding.action_id,
    idempotency_key: binding.idempotency_key,
    controller_intent_digest: binding.controller_intent_digest,
    action_run_head_digest: binding.action_run_head_digest,
    action_run_version: binding.action_run_version,
    authorization_expires_at: binding.authorization_expires_at,
    background_record_version: record.version,
    background_record_digest: backgroundDispatchDigest(record),
  };
}

function dispatchCommitMatchesRecord(commit, record) {
  if (!isObject(commit)) return false;
  const proof = dispatchCommitProof(record);
  return (
    commit.dispatch_id === proof.dispatch_id &&
    commit.operation === proof.operation &&
    commit.lease_id === proof.lease_id &&
    commit.worker_ref === proof.worker_ref &&
    commit.attempt === proof.attempt &&
    commit.action_id === proof.action_id &&
    commit.idempotency_key === proof.idempotency_key &&
    commit.controller_intent_digest === proof.controller_intent_digest &&
    commit.action_run_head_digest === proof.action_run_head_digest &&
    commit.action_run_version === proof.action_run_version &&
    commit.authorization_expires_at === proof.authorization_expires_at &&
    commit.background_record_version === proof.background_record_version &&
    commit.background_record_digest === proof.background_record_digest
  );
}

export function createBackgroundExecutionStore(root, dependencies = {}) {
  if (typeof root !== "string" || root.length === 0) {
    fail("BACKGROUND_ROOT_REQUIRED");
  }
  if (
    Object.hasOwn(dependencies, "loadRunLineageVerification") ||
    Object.hasOwn(dependencies, "verifyRunLineage")
  ) {
    fail("BACKGROUND_LEGACY_LINEAGE_CALLBACK_FORBIDDEN");
  }
  const safeRoot = path.resolve(root);
  const {
    now = () => new Date().toISOString(),
    queueCoordinator,
    backgroundPolicyAuthority,
    verifyHostAttestation,
    verifyWorktreeAttestation,
    afterEventAppend,
    durabilityFault,
    requireDirectorySync = false,
  } = dependencies;
  assertBackgroundQueueCoordinator(queueCoordinator, safeRoot);
  assertCanonicalBackgroundPolicyAuthority(
    backgroundPolicyAuthority,
    safeRoot,
  );
  for (const [name, candidate] of Object.entries({
    now,
    verifyHostAttestation,
    verifyWorktreeAttestation,
  })) {
    if (typeof candidate !== "function") fail(`BACKGROUND_DEPENDENCY_REQUIRED:${name}`);
  }
  if (afterEventAppend !== undefined && typeof afterEventAppend !== "function") {
    fail("BACKGROUND_CRASH_HOOK_INVALID");
  }
  if (durabilityFault !== undefined && typeof durabilityFault !== "function") {
    fail("BACKGROUND_DURABILITY_FAULT_INVALID");
  }

  async function requireDurable(operation) {
    try {
      return await operation();
    } catch (error) {
      if (
        error?.code === "EDURABILITYINJECTED" ||
        /DURABILITY_(?:DIRECTORY_SYNC|FAILURE)/u.test(error?.message ?? "")
      ) {
        fail("BACKGROUND_DURABILITY_UNSUPPORTED");
      }
      throw error;
    }
  }

  const withValidatedQueueClaim = (fence, operation) =>
    coordinateBackgroundQueueClaim(
      queueCoordinator,
      safeRoot,
      fence,
      operation,
    );

  async function replay(key) {
    const paths = itemPaths(key);
    const eventText = await optionalFile(safeRoot, paths.events, MAX_EVENT_BYTES);
    if (eventText === null) return null;
    if (requireDirectorySync) {
      await assertDirectoryDurabilityAvailable(
        safeRoot,
        paths.state,
        durabilityFault,
      );
    }
    if (!eventText.endsWith("\n")) fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
    const lines = eventText.slice(0, -1).split("\n");
    if (lines.length === 0 || lines.length > 4096 || lines.some((line) => !line)) {
      fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
    }
    let previous = null;
    const authorityRecords = [];
    for (let index = 0; index < lines.length; index += 1) {
      const event = parseJson(lines[index], "BACKGROUND_EVENT_CHAIN_CORRUPT");
      if (
        !exactFields(event, EVENT_FIELDS) ||
        event.event_format !== "background_dispatch_event_v2" ||
        event.sequence !== index ||
        event.previous_event_digest !==
          (previous === null ? null : backgroundDispatchDigest(previous)) ||
        event.event_digest !== backgroundDispatchDigest(event.record) ||
        !isBackgroundDispatchRecord(event.record) ||
        event.record.version !== index
      ) {
        fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
      }
      if (previous === null) {
        if (event.command !== null || event.record.state !== "RESERVED") {
          fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
        }
      } else {
        if (!isObject(event.command)) fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
        let expected;
        try {
          expected = transitionBackgroundDispatch(previous, event.command);
        } catch {
          fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
        }
        if (!sameJson(expected, event.record)) fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
      }
      authorityRecords.push(event.record);
      previous = event.record;
    }
    const snapshotText = await optionalFile(safeRoot, paths.state, MAX_STATE_BYTES);
    let snapshotBehind = snapshotText === null;
    if (snapshotText !== null) {
      const snapshot = parseJson(snapshotText, "BACKGROUND_SNAPSHOT_CORRUPT");
      if (!isBackgroundDispatchRecord(snapshot)) fail("BACKGROUND_SNAPSHOT_CORRUPT");
      if (snapshot.version > previous.version) fail("BACKGROUND_SNAPSHOT_AHEAD");
      if (snapshot.version === previous.version && !sameJson(snapshot, previous)) {
        fail("BACKGROUND_SNAPSHOT_DIVERGENT");
      }
      snapshotBehind = snapshot.version < previous.version;
    }
    return {
      record: deepFreeze(previous),
      snapshotBehind,
      authorityRecords: deepFreeze(authorityRecords),
    };
  }

  async function listAuthorities() {
    const absolute = await resolveRepositoryPath(safeRoot, DIRECTORY, {
      label: "background dispatch directory",
    });
    const info = await lstat(absolute).catch(() => null);
    if (info === null) return [];
    if (!info.isDirectory() || info.isSymbolicLink()) {
      fail("BACKGROUND_DIRECTORY_CORRUPT");
    }
    const entries = await readdir(absolute, { withFileTypes: true });
    if (entries.length > MAX_ITEMS) fail("BACKGROUND_ITEM_LIMIT_EXCEEDED");
    const records = [];
    for (const entry of entries) {
      if (!STORAGE_KEY.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) {
        fail("BACKGROUND_DIRECTORY_CORRUPT");
      }
      const replayed = await replay(entry.name);
      if (replayed === null) fail("BACKGROUND_EVENT_CHAIN_CORRUPT");
      records.push(replayed.record);
    }
    return records;
  }

  async function persist(next, previous, command, assertOwnership) {
    if (!isBackgroundDispatchRecord(next)) fail("INVALID_BACKGROUND_RECORD");
    const paths = itemPaths(storageKey(next.dispatch_id));
    await assertOwnership();
    const append = await requireDurable(() =>
      appendFileDurable(
        safeRoot,
        paths.events,
        `${JSON.stringify(eventEnvelope(next, previous, command))}\n`,
        { durabilityFault, maxBytes: MAX_EVENT_BYTES },
      ),
    );
    if (
      append.durability.fileSync !== true ||
      (requireDirectorySync && append.durability.directorySync !== true)
    ) {
      fail("BACKGROUND_DURABILITY_UNSUPPORTED");
    }
    await afterEventAppend?.(deepFreeze(clone(next, "INVALID_BACKGROUND_RECORD")));
    const snapshot = await requireDurable(() =>
      writeFileAtomic(
        safeRoot,
        paths.state,
        `${JSON.stringify(next, null, 2)}\n`,
        {
          assertOwnership,
          durabilityFault,
          label: "background dispatch snapshot",
          maxBytes: MAX_STATE_BYTES,
          mode: 0o600,
        },
      ),
    );
    if (
      snapshot.durability.fileSync !== true ||
      snapshot.durability.atomicReplace !== true ||
      (requireDirectorySync && snapshot.durability.directorySync !== true)
    ) {
      fail("BACKGROUND_DURABILITY_UNSUPPORTED");
    }
    return deepFreeze(clone(next, "INVALID_BACKGROUND_RECORD"));
  }

  async function repair(record, assertOwnership) {
    const result = await requireDurable(() =>
      writeFileAtomic(
        safeRoot,
        itemPaths(storageKey(record.dispatch_id)).state,
        `${JSON.stringify(record, null, 2)}\n`,
        {
          assertOwnership,
          durabilityFault,
          label: "background dispatch snapshot repair",
          maxBytes: MAX_STATE_BYTES,
          mode: 0o600,
        },
      ),
    );
    if (
      result.durability.fileSync !== true ||
      result.durability.atomicReplace !== true ||
      (requireDirectorySync && result.durability.directorySync !== true)
    ) {
      fail("BACKGROUND_DURABILITY_UNSUPPORTED");
    }
    return deepFreeze(clone(record, "INVALID_BACKGROUND_RECORD"));
  }

  async function withControlLock(operation) {
    return withOwnerLock(safeRoot, SHARED_QUEUE_LOCK, operation, {
      staleMs: 60_000,
      heartbeatMs: 10_000,
    });
  }

  async function prepareReservation(input, queueClaim) {
    const captured = clone(input, "INVALID_BACKGROUND_RESERVATION");
    const prepared = { ...captured, queue_claim: queueClaim, now: now() };
    const context = deepFreeze(clone(prepared, "INVALID_BACKGROUND_RESERVATION"));
    const verified = await Promise.all([
      verifyHostAttestation(context),
      verifyWorktreeAttestation(context),
    ]);
    if (verified.some((value) => value !== true)) {
      fail("BACKGROUND_TRUSTED_VERIFICATION_FAILED");
    }
    return { ...prepared, now: now() };
  }

  async function authorizationInput(
    record,
    queueClaim,
    actionGate,
    hostAttestation,
    policyEpoch,
  ) {
    const observedAt = now();
    const budget = policyEpoch?.background_budget_binding;
    if (!isObject(budget)) fail("BACKGROUND_CONTROLLER_BUDGET_BINDING_MISMATCH");
    const lineage = {
      schema: "background_run_lineage_verification_v2",
      contract_version: "2.0.0",
      verified: true,
      run_id: record.run_binding.run_id,
      queue_item_id: record.queue_binding.queue_item_id,
      queue_run_head_digest: record.run_binding.queue_run_head_digest,
      action_run_head_digest: budget.action_run_head_digest,
      queue_expected_run_version: record.run_binding.expected_run_version,
      action_run_version: budget.run_version,
      operation: actionGate.operation,
      action_id: budget.action_id,
      controller_intent_digest: budget.controller_intent_digest,
      evidence_digest: budget.authority_digest,
      verified_at: policyEpoch.observed_at,
    };
    const candidate = {
      current_queue_claim: queueClaim,
      action_gate: actionGate,
      lineage_verification: lineage,
      ...(hostAttestation === undefined
        ? {}
        : { host_attestation: hostAttestation }),
      now: observedAt,
    };
    return { ...candidate, now: now() };
  }

  return Object.freeze({
    async reserve(input) {
      const captured = clone(input, "INVALID_BACKGROUND_RESERVATION");
      return withValidatedQueueClaim(
        queueClaimFence(captured?.queue_claim),
        async (currentClaim, queueLock) => {
            const assertOwnership = queueLock.assertOwnership;
            const prepared = await prepareReservation(captured, currentClaim);
            return withCanonicalBackgroundPolicyAuthority(
              backgroundPolicyAuthority,
              safeRoot,
              { stage: "RESERVE", input: prepared },
              async (policyEpoch, revalidate) => {
                const canonicalPrepared = {
                  ...prepared,
                  effective_limits:
                    policyEpoch.background_budget_binding.effective_limits,
                  effective_limits_digest:
                    policyEpoch.effective_limits_digest,
                  shared_aggregate_policy:
                    policyEpoch.shared_aggregate_policy,
                  aggregate_epoch_digest:
                    policyEpoch.aggregate_epoch_digest,
                  aggregate_policy: policyEpoch.aggregate_policy,
                  aggregate_policy_digest:
                    policyEpoch.aggregate_policy_digest,
                  budget_binding: policyEpoch.background_budget_binding,
                };
                const authorities = await listAuthorities();
                const existing = authorities.find(
                  (record) => record.dispatch_id === canonicalPrepared.dispatch_id,
                );
                if (existing !== undefined) {
                  if (!sameReservationAuthority(existing, canonicalPrepared)) {
                    fail("BACKGROUND_DISPATCH_CONFLICT");
                  }
                  const replayed = await replay(storageKey(existing.dispatch_id));
                  const record = replayed.snapshotBehind
                    ? await repair(existing, assertOwnership)
                    : existing;
                  return Object.freeze({ created: false, record });
                }
                const record = reserveBackgroundClaim(
                  { ...canonicalPrepared, now: now() },
                  authorities,
                );
                await revalidate();
                return Object.freeze({
                  created: true,
                  record: await persist(record, null, null, assertOwnership),
                });
              },
            );
        },
      );
    },

    async apply(dispatchId, input) {
      const captured = clone(input, "INVALID_BACKGROUND_TRANSITION");
      if (captured.command === "DISPATCH_INTENDED") {
        fail("BACKGROUND_ARM_REQUIRED");
      }
      captured.now = now();
      return withControlLock(async ({ assertOwnership }) => {
        const replayed = await replay(storageKey(dispatchId));
        if (replayed === null || replayed.record.dispatch_id !== dispatchId) {
          fail("BACKGROUND_DISPATCH_NOT_FOUND");
        }
        if (sameTransitionRetry(replayed.record, captured)) {
          const record = replayed.snapshotBehind
            ? await repair(replayed.record, assertOwnership)
            : replayed.record;
          return Object.freeze({ applied: false, record });
        }
        const next = transitionBackgroundDispatch(replayed.record, captured);
        return Object.freeze({
          applied: true,
          record: await persist(
            next,
            replayed.record,
            captured,
            assertOwnership,
          ),
        });
      });
    },

    async arm(dispatchId, input) {
      const captured = clone(input, "INVALID_BACKGROUND_ACTION_AUTHORIZATION");
      if (!exactFields(captured, ARM_INPUT_FIELDS)) {
        fail("INVALID_BACKGROUND_ACTION_AUTHORIZATION");
      }
      const initial = await replay(storageKey(dispatchId));
      if (initial === null || initial.record.dispatch_id !== dispatchId) {
        fail("BACKGROUND_DISPATCH_NOT_FOUND");
      }
      return withValidatedQueueClaim(
        queueBindingFence(initial.record.queue_binding),
        async (queueClaim, queueLock) => {
            const { commitDispatch } = queueLock;
            if (typeof commitDispatch !== "function") {
              fail("BACKGROUND_DISPATCH_COMMIT_REQUIRED");
            }
            const assertOwnership = queueLock.assertOwnership;
            const replayed = await replay(storageKey(dispatchId));
            if (replayed === null || replayed.record.dispatch_id !== dispatchId) {
              fail("BACKGROUND_DISPATCH_NOT_FOUND");
            }
            const current = replayed.record;
            if (
              current.state === "DISPATCH_INTENDED" &&
              current.last_transition?.command === "DISPATCH_INTENDED" &&
              current.last_transition.evidence_digest === captured.evidence_digest &&
              captured.expected_version === current.version - 1 &&
              current.action_binding?.operation === captured.action_gate?.operation &&
              current.action_binding?.action_id === captured.action_gate?.action_id &&
              current.action_binding?.idempotency_key ===
                captured.action_gate?.idempotency_key &&
              current.action_binding?.controller_intent_digest ===
                captured.action_gate?.controller_intent_digest &&
              activeBefore(now(), current.action_binding.authorization_expires_at)
            ) {
              const intended = replayed.snapshotBehind
                ? await repair(current, assertOwnership)
                : current;
              let record;
              if (queueClaim.dispatch_commit === null) {
                const recovery = {
                  expected_version: intended.version,
                  command: "OBSERVE_DISPATCH",
                  now: now(),
                  authorization: null,
                  evidence_digest: captured.evidence_digest,
                  outcome: "NOT_DISPATCHED",
                };
                const next = transitionBackgroundDispatch(intended, recovery);
                record = await persist(next, intended, recovery, assertOwnership);
              } else if (
                dispatchCommitMatchesRecord(queueClaim.dispatch_commit, intended)
              ) {
                const recovery = {
                  expected_version: intended.version,
                  command: "OBSERVE_DISPATCH",
                  now: now(),
                  authorization: null,
                  evidence_digest: captured.evidence_digest,
                  outcome: "UNKNOWN",
                };
                const next = transitionBackgroundDispatch(intended, recovery);
                record = await persist(next, intended, recovery, assertOwnership);
              } else {
                fail("BACKGROUND_DISPATCH_COMMIT_MISMATCH");
              }
              return Object.freeze({
                applied: false,
                handoff_granted: false,
                record,
              });
            }
            return withCanonicalBackgroundPolicyAuthority(
              backgroundPolicyAuthority,
              safeRoot,
              {
                stage: "ARM",
                record: current,
                queue_claim: queueClaim,
                action_gate: captured.action_gate,
              },
              async (policyEpoch, revalidate) => {
                const candidate = await authorizationInput(
                  current,
                  queueClaim,
                  captured.action_gate,
                  undefined,
                  policyEpoch,
                );
                const authorization = authorizeBackgroundAction(current, candidate);
                const command = {
                  expected_version: captured.expected_version,
                  command: "DISPATCH_INTENDED",
                  now: candidate.now,
                  authorization,
                  evidence_digest: captured.evidence_digest,
                  outcome: null,
                };
                const next = transitionBackgroundDispatch(current, command);
                const record = await persist(next, current, command, assertOwnership);
                await revalidate();
                const committed = await commitDispatch(dispatchCommitProof(record));
                if (
                  committed?.consumed !== true ||
                  !dispatchCommitMatchesRecord(committed.dispatch_commit, record)
                ) {
                  fail("BACKGROUND_DISPATCH_COMMIT_MISMATCH");
                }
                return Object.freeze({
                  applied: true,
                  handoff_granted: true,
                  record,
                });
              },
            );
        },
      );
    },

    async authorize(dispatchId, input) {
      const captured = clone(input, "INVALID_BACKGROUND_ACTION_AUTHORIZATION");
      if (
        !exactFields(captured, AUTHORIZE_INPUT_FIELDS) ||
        !isObject(captured.host_attestation)
      ) {
        fail("INVALID_BACKGROUND_ACTION_AUTHORIZATION");
      }
      const initial = await replay(storageKey(dispatchId));
      if (initial === null || initial.record.dispatch_id !== dispatchId) {
        fail("BACKGROUND_DISPATCH_NOT_FOUND");
      }
      return withValidatedQueueClaim(
        queueBindingFence(initial.record.queue_binding),
        async (queueClaim) => {
            const replayed = await replay(storageKey(dispatchId));
            if (replayed === null || replayed.record.dispatch_id !== dispatchId) {
              fail("BACKGROUND_DISPATCH_NOT_FOUND");
            }
            const commit = queueClaim.dispatch_commit;
            const committedRecord = Number.isSafeInteger(
              commit?.background_record_version,
            )
              ? replayed.authorityRecords[commit.background_record_version]
              : undefined;
            if (
              committedRecord === undefined ||
              !dispatchCommitMatchesRecord(commit, committedRecord)
            ) {
              fail("BACKGROUND_DISPATCH_COMMIT_MISMATCH");
            }
            return withCanonicalBackgroundPolicyAuthority(
              backgroundPolicyAuthority,
              safeRoot,
              {
                stage: "AUTHORIZE",
                record: replayed.record,
                queue_claim: queueClaim,
                action_gate: captured.action_gate,
              },
              async (policyEpoch, revalidate) => {
                const candidate = await authorizationInput(
                  replayed.record,
                  queueClaim,
                  captured.action_gate,
                  captured.host_attestation,
                  policyEpoch,
                );
                const authorization = authorizeBackgroundAction(
                  replayed.record,
                  candidate,
                );
                await revalidate();
                return authorization;
              },
            );
        },
      );
    },

    async show(dispatchId) {
      const replayed = await replay(storageKey(dispatchId));
      if (replayed === null || replayed.record.dispatch_id !== dispatchId) {
        fail("BACKGROUND_DISPATCH_NOT_FOUND");
      }
      if (replayed.snapshotBehind) fail("BACKGROUND_SNAPSHOT_BEHIND");
      return replayed.record;
    },

    async listForRunQueue(runId, queueItemId) {
      if (
        typeof runId !== "string" ||
        runId.length === 0 ||
        typeof queueItemId !== "string" ||
        queueItemId.length === 0
      ) {
        fail("BACKGROUND_LIST_BINDING_INVALID");
      }
      const records = (await listAuthorities())
        .filter(
          (record) =>
            record.run_binding.run_id === runId &&
            record.queue_binding.queue_item_id === queueItemId,
        )
        .sort((left, right) => left.dispatch_id.localeCompare(right.dispatch_id))
        .map((record) => structuredClone(record));
      return deepFreeze(records);
    },

    async recover(dispatchId) {
      return withControlLock(async ({ assertOwnership }) => {
        const replayed = await replay(storageKey(dispatchId));
        if (replayed === null || replayed.record.dispatch_id !== dispatchId) {
          fail("BACKGROUND_DISPATCH_NOT_FOUND");
        }
        return replayed.snapshotBehind
          ? repair(replayed.record, assertOwnership)
          : replayed.record;
      });
    },
  });
}

export function createDurableBackgroundDispatchValidator(store) {
  if (!isObject(store) || typeof store.authorize !== "function") {
    fail("BACKGROUND_DISPATCH_STORE_REQUIRED");
  }
  return async function validateDurableBackgroundDispatch(input) {
    const captured = clone(input, "INVALID_BACKGROUND_DISPATCH_VALIDATION");
    if (
      !exactFields(captured, DURABLE_VALIDATOR_INPUT_FIELDS) ||
      !isObject(captured.request) ||
      !isObject(captured.gate) ||
      !isObject(captured.attestation) ||
      captured.request.run_id !== captured.gate.run_id ||
      captured.request.operation_id !== captured.gate.operation
    ) {
      fail("BACKGROUND_DISPATCH_BINDING_MISMATCH");
    }
    const authorization = await store.authorize(captured.dispatchId, {
      action_gate: captured.gate,
      host_attestation: captured.attestation,
    });
    if (
      authorization.dispatch_id !== captured.dispatchId ||
      authorization.run_id !== captured.request.run_id ||
      authorization.operation !== captured.request.operation_id
    ) {
      fail("BACKGROUND_DISPATCH_BINDING_MISMATCH");
    }
    return authorization;
  };
}
