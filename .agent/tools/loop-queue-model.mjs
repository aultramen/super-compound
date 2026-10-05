import { rfc3339UtcSortKey } from "./schema-validator.mjs";

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const MAX_QUEUE_ATTEMPTS = 256;
const PREPARATION_FIELDS = Object.freeze([
  "queue_item_id",
  "run_binding",
  "provenance",
  "dedupe_identity_digest",
  "payload_digest",
  "prepared_at",
  "available_at",
  "expires_at",
  "missed_run_policy",
  "lease_policy",
  "retry_policy",
  "concurrency",
  "rate_limit",
  "result_sink_ref",
  "policy_ref",
]);
const PREPARED_RUN_FIELDS = Object.freeze([
  "run_id",
  "phase",
  "expected_run_version",
  "goal_digest",
  "authority_digest",
  "verifier_digest",
  "eval_definition_digest",
  "project_config_digest",
  "policy_digest",
  "operation_inventory_digest",
  "risk_profile",
  "autonomy_profile",
  "required_gates",
]);
const SUBMISSION_FIELDS = Object.freeze([
  "expected_version",
  "confirmation_digest",
  "now",
  "gate",
]);
const APPROVAL_GATE_FIELDS = Object.freeze([
  "allowed",
  "would_allow",
  "simulation_only",
  "mutation_authorized",
  "operation",
  "queue_item_id",
  "run_id",
  "run_version",
  "confirmation_expected_run_version",
  "approval_phase",
  "confirmation_digest",
  "approval_expires_at",
  "confirmed_goal_digest",
  "authority_digest",
  "verifier_digest",
  "confirmed_eval_definition_digest",
  "project_config_digest",
  "policy_digest",
  "operation_inventory_digest",
  "run_head_digest",
  "confirmed_risk_profile",
  "confirmed_autonomy_profile",
  "confirmed_required_gates",
  "approver_actor_type",
  "approver_attestation",
]);
const CLAIM_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "worker_ref",
  "lease_id",
  "gate",
  "active_concurrency_count",
  "recent_claim_count",
]);
const CLAIM_APPROVAL_FIELDS = Object.freeze(["now", "gate"]);
const HEARTBEAT_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "worker_ref",
  "lease_id",
]);
const COMPLETION_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "worker_ref",
  "lease_id",
  "outcome",
  "result_digest",
]);
const CANCELLATION_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "actor_ref",
  "reason_ref",
]);
const RECONCILIATION_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "actor_ref",
  "resolution",
  "result_digest",
]);
const DISPATCH_PERMIT_FIELDS = Object.freeze([
  "expected_version",
  "now",
  "worker_ref",
  "lease_id",
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

function validStableId(value) {
  return typeof value === "string" && STABLE_ID.test(value);
}

function validDigest(value) {
  return typeof value === "string" && DIGEST.test(value);
}

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validStableIdSet(value) {
  return (
    Array.isArray(value) &&
    value.length <= 256 &&
    new Set(value).size === value.length &&
    value.every(validStableId)
  );
}

function sameSet(left, right) {
  return (
    validStableIdSet(left) &&
    validStableIdSet(right) &&
    left.length === right.length &&
    left.every((entry) => right.includes(entry))
  );
}

function validPreparedRunBinding(value) {
  return (
    exactFields(value, PREPARED_RUN_FIELDS) &&
    validStableId(value.run_id) &&
    new Set(["START", "RESUME"]).has(value.phase) &&
    Number.isSafeInteger(value.expected_run_version) &&
    value.expected_run_version >= 0 &&
    [
      "goal_digest",
      "authority_digest",
      "verifier_digest",
      "eval_definition_digest",
      "project_config_digest",
      "policy_digest",
    ].every((field) => validDigest(value[field]))
    && validDigest(value.operation_inventory_digest)
    && new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(value.risk_profile)
    && value.autonomy_profile === "BACKGROUND"
    && validStableIdSet(value.required_gates)
  );
}

function validPreparation(input) {
  const preparedKey = rfc3339UtcSortKey(input?.prepared_at);
  const availableKey = rfc3339UtcSortKey(input?.available_at);
  const expiryKey = rfc3339UtcSortKey(input?.expires_at);
  return (
    exactFields(input, PREPARATION_FIELDS) &&
    validStableId(input.queue_item_id) &&
    validPreparedRunBinding(input.run_binding) &&
    exactFields(input.provenance, ["trigger_id", "actor_ref", "source_ref"]) &&
    Object.values(input.provenance).every(validStableId) &&
    validDigest(input.dedupe_identity_digest) &&
    validDigest(input.payload_digest) &&
    preparedKey !== null &&
    availableKey !== null &&
    expiryKey !== null &&
    preparedKey <= availableKey &&
    availableKey < expiryKey &&
    input.missed_run_policy === "CANCEL" &&
    exactFields(input.lease_policy, ["duration_ms", "heartbeat_interval_ms"]) &&
    positiveSafeInteger(input.lease_policy.duration_ms) &&
    positiveSafeInteger(input.lease_policy.heartbeat_interval_ms) &&
    input.lease_policy.heartbeat_interval_ms < input.lease_policy.duration_ms &&
    exactFields(input.retry_policy, ["max_attempts", "backoff_ms"]) &&
    positiveSafeInteger(input.retry_policy.max_attempts) &&
    input.retry_policy.max_attempts <= MAX_QUEUE_ATTEMPTS &&
    Number.isSafeInteger(input.retry_policy.backoff_ms) &&
    input.retry_policy.backoff_ms >= 0 &&
    exactFields(input.concurrency, ["key", "limit"]) &&
    validStableId(input.concurrency.key) &&
    positiveSafeInteger(input.concurrency.limit) &&
    exactFields(input.rate_limit, ["key", "max_claims", "window_ms"]) &&
    validStableId(input.rate_limit.key) &&
    positiveSafeInteger(input.rate_limit.max_claims) &&
    positiveSafeInteger(input.rate_limit.window_ms) &&
    validStableId(input.result_sink_ref) &&
    validStableId(input.policy_ref)
  );
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}

export function prepareQueueItem(input) {
  let captured;
  try {
    captured = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_PREPARATION");
  }
  if (!validPreparation(captured)) fail("INVALID_QUEUE_PREPARATION");

  return deepFreeze({
    schema: "automation_trigger_v2",
    contract_version: "2.0.0",
    queue_item_id: captured.queue_item_id,
    version: 0,
    state: "PREPARED",
    run_binding: {
      ...captured.run_binding,
      run_head_digest: null,
      approval_digest: null,
      approval_expires_at: null,
    },
    provenance: captured.provenance,
    dedupe_identity_digest: captured.dedupe_identity_digest,
    payload_digest: captured.payload_digest,
    prepared_at: captured.prepared_at,
    available_at: captured.available_at,
    expires_at: captured.expires_at,
    missed_run_policy: captured.missed_run_policy,
    lease_policy: captured.lease_policy,
    retry_policy: captured.retry_policy,
    concurrency: captured.concurrency,
    rate_limit: captured.rate_limit,
    result_sink_ref: captured.result_sink_ref,
    policy_ref: captured.policy_ref,
    attempts: 0,
    claim_history: [],
    retry_not_before: null,
    lease: null,
    dispatch_commit: null,
    cancellation_requested: false,
    cancellation: null,
    result: null,
    reconciliation: null,
    recovery: {
      reason: null,
      previous_lease_id: null,
      requires_new_approval: false,
      reconciled_at: null,
    },
    updated_at: captured.prepared_at,
  });
}

function approvalGateMatches(
  item,
  input,
  {
    expectedPhase = item.run_binding.phase,
    expectedRunVersion = item.run_binding.expected_run_version,
  } = {},
) {
  const gate = input.gate;
  const nowKey = rfc3339UtcSortKey(input.now);
  const itemExpiryKey = rfc3339UtcSortKey(item.expires_at);
  const approvalExpiryKey = rfc3339UtcSortKey(gate?.approval_expires_at);
  const binding = item.run_binding;
  return (
    exactFields(input, SUBMISSION_FIELDS) &&
    exactFields(gate, APPROVAL_GATE_FIELDS) &&
    gate.allowed === true &&
    gate.would_allow === true &&
    gate.simulation_only === false &&
    gate.mutation_authorized === true &&
    gate.operation === "queue-claim" &&
    gate.queue_item_id === item.queue_item_id &&
    gate.run_id === binding.run_id &&
    Number.isSafeInteger(gate.run_version) &&
    gate.run_version >= 0 &&
    gate.confirmation_expected_run_version === expectedRunVersion &&
    gate.approval_phase === expectedPhase &&
    validDigest(input.confirmation_digest) &&
    gate.confirmation_digest === input.confirmation_digest &&
    gate.confirmed_goal_digest === binding.goal_digest &&
    gate.authority_digest === binding.authority_digest &&
    gate.verifier_digest === binding.verifier_digest &&
    gate.confirmed_eval_definition_digest === binding.eval_definition_digest &&
    gate.project_config_digest === binding.project_config_digest &&
    gate.policy_digest === binding.policy_digest &&
    gate.operation_inventory_digest === binding.operation_inventory_digest &&
    validDigest(gate.run_head_digest) &&
    gate.confirmed_risk_profile === binding.risk_profile &&
    gate.confirmed_autonomy_profile === binding.autonomy_profile &&
    sameSet(gate.confirmed_required_gates, binding.required_gates) &&
    gate.approver_actor_type === "HUMAN" &&
    gate.approver_attestation === "HOST_ATTESTED_HUMAN" &&
    nowKey !== null &&
    itemExpiryKey !== null &&
    approvalExpiryKey !== null &&
    nowKey < itemExpiryKey &&
    nowKey < approvalExpiryKey
  );
}

export function submitQueueItem(item, input) {
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("QUEUE_APPROVAL_REQUIRED");
  }
  if (
    capturedItem?.schema !== "automation_trigger_v2" ||
    capturedItem?.contract_version !== "2.0.0" ||
    !new Set(["PREPARED", "APPROVAL_REQUIRED"]).has(capturedItem?.state) ||
    capturedItem?.cancellation_requested !== false ||
    !Number.isSafeInteger(capturedInput?.expected_version) ||
    capturedInput.expected_version !== capturedItem.version
  ) {
    fail("QUEUE_APPROVAL_REQUIRED");
  }

  const recovering = capturedItem.state === "APPROVAL_REQUIRED";
  let expectedPhase = capturedItem.run_binding.phase;
  let expectedRunVersion = capturedItem.run_binding.expected_run_version;
  if (recovering) {
    if (
      !new Set([
        "LEASE_EXPIRED",
        "APPROVAL_EXPIRED",
        "APPROVAL_MISMATCH",
      ]).has(capturedItem.recovery?.reason) ||
      capturedItem.recovery?.requires_new_approval !== true ||
      capturedItem.retry_not_before === null
    ) {
      fail("QUEUE_APPROVAL_REQUIRED");
    }
    const nowKey = rfc3339UtcSortKey(capturedInput.now);
    const retryKey = rfc3339UtcSortKey(capturedItem.retry_not_before);
    if (nowKey === null || retryKey === null) fail("QUEUE_APPROVAL_REQUIRED");
    if (nowKey < retryKey) fail("QUEUE_BACKOFF_ACTIVE");
    if (capturedItem.attempts >= capturedItem.retry_policy.max_attempts) {
      fail("QUEUE_MAX_ATTEMPTS");
    }
    expectedPhase = capturedInput.gate?.approval_phase;
    expectedRunVersion = capturedInput.gate?.confirmation_expected_run_version;
    if (
      !new Set(["START", "RESUME"]).has(expectedPhase) ||
      !Number.isSafeInteger(expectedRunVersion) ||
      expectedRunVersion <= capturedItem.run_binding.expected_run_version
    ) {
      fail("QUEUE_APPROVAL_REQUIRED");
    }
  }
  if (
    !approvalGateMatches(capturedItem, capturedInput, {
      expectedPhase,
      expectedRunVersion,
    })
  ) {
    fail("QUEUE_APPROVAL_REQUIRED");
  }

  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    state: "SUBMITTED",
    run_binding: {
      ...capturedItem.run_binding,
      phase: expectedPhase,
      expected_run_version: expectedRunVersion,
      run_head_digest: capturedInput.gate.run_head_digest,
      approval_digest: capturedInput.confirmation_digest,
      approval_expires_at: capturedInput.gate.approval_expires_at,
    },
    retry_not_before: null,
    recovery: recovering
      ? {
          ...capturedItem.recovery,
          requires_new_approval: false,
        }
      : capturedItem.recovery,
    updated_at: capturedInput.now,
  });
}

function nonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function earliestTimestamp(...values) {
  return values.reduce((earliest, candidate) =>
    rfc3339UtcSortKey(candidate) < rfc3339UtcSortKey(earliest) ? candidate : earliest,
  );
}

function approvalRequiredDisposition(item, now, reason) {
  return deepFreeze({
    decision: "APPROVAL_REQUIRED",
    transition: {
      state: "APPROVAL_REQUIRED",
      reason,
      expected_version: Number.isSafeInteger(item?.version) ? item.version : null,
      observed_at: now,
    },
  });
}

export function evaluateQueueClaimApproval(item, input) {
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    return approvalRequiredDisposition(item, input?.now ?? null, "APPROVAL_MISMATCH");
  }
  const nowKey = rfc3339UtcSortKey(capturedInput?.now);
  const storedExpiryKey = rfc3339UtcSortKey(
    capturedItem?.run_binding?.approval_expires_at,
  );
  const presentedExpiryKey = rfc3339UtcSortKey(
    capturedInput?.gate?.approval_expires_at,
  );
  if (
    nowKey !== null &&
    ((storedExpiryKey !== null && nowKey >= storedExpiryKey) ||
      (presentedExpiryKey !== null && nowKey >= presentedExpiryKey))
  ) {
    return approvalRequiredDisposition(
      capturedItem,
      capturedInput.now,
      "APPROVAL_EXPIRED",
    );
  }
  if (
    capturedItem?.state !== "SUBMITTED" ||
    !exactFields(capturedInput, CLAIM_APPROVAL_FIELDS) ||
    capturedInput.gate?.run_head_digest !== capturedItem.run_binding.run_head_digest ||
    !approvalGateMatches(capturedItem, {
      expected_version: capturedItem.version,
      confirmation_digest: capturedItem.run_binding.approval_digest,
      now: capturedInput.now,
      gate: capturedInput.gate,
    })
  ) {
    return approvalRequiredDisposition(
      capturedItem,
      capturedInput?.now ?? null,
      "APPROVAL_MISMATCH",
    );
  }
  return deepFreeze({ decision: "CLAIMABLE", transition: null });
}

export function transitionQueueClaimApprovalRequired(item, disposition) {
  let capturedItem;
  let capturedDisposition;
  try {
    capturedItem = structuredClone(item);
    capturedDisposition = structuredClone(disposition);
  } catch {
    fail("INVALID_QUEUE_APPROVAL_TRANSITION");
  }
  const transition = capturedDisposition?.transition;
  if (
    capturedItem?.schema !== "automation_trigger_v2" ||
    capturedItem?.contract_version !== "2.0.0" ||
    capturedItem?.state !== "SUBMITTED" ||
    capturedItem?.cancellation_requested !== false ||
    !exactFields(capturedDisposition, ["decision", "transition"]) ||
    capturedDisposition.decision !== "APPROVAL_REQUIRED" ||
    !exactFields(transition, [
      "state",
      "reason",
      "expected_version",
      "observed_at",
    ]) ||
    transition.state !== "APPROVAL_REQUIRED" ||
    !new Set(["APPROVAL_EXPIRED", "APPROVAL_MISMATCH"]).has(
      transition.reason,
    ) ||
    transition.expected_version !== capturedItem.version ||
    rfc3339UtcSortKey(transition.observed_at) === null
  ) {
    fail("INVALID_QUEUE_APPROVAL_TRANSITION");
  }
  const triggerExpired =
    rfc3339UtcSortKey(transition.observed_at) >=
    rfc3339UtcSortKey(capturedItem.expires_at);
  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    state: triggerExpired ? "EXPIRED" : "APPROVAL_REQUIRED",
    run_binding: {
      ...capturedItem.run_binding,
      run_head_digest: null,
      approval_digest: null,
      approval_expires_at: null,
    },
    retry_not_before: triggerExpired ? null : transition.observed_at,
    recovery: {
      reason: triggerExpired ? "TRIGGER_EXPIRED" : transition.reason,
      previous_lease_id: null,
      requires_new_approval: !triggerExpired,
      reconciled_at: transition.observed_at,
    },
    updated_at: transition.observed_at,
  });
}

export function claimQueueItem(item, input) {
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("QUEUE_NOT_CLAIMABLE");
  }
  if (
    capturedItem?.schema !== "automation_trigger_v2" ||
    capturedItem?.contract_version !== "2.0.0" ||
    capturedItem?.state !== "SUBMITTED" ||
    capturedItem?.cancellation_requested !== false
  ) {
    fail("QUEUE_NOT_CLAIMABLE");
  }
  if (
    !exactFields(capturedInput, CLAIM_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem.version
  ) {
    fail("QUEUE_CAS_CONFLICT");
  }
  if (
    !validStableId(capturedInput.worker_ref) ||
    !validStableId(capturedInput.lease_id) ||
    !nonNegativeSafeInteger(capturedInput.active_concurrency_count) ||
    !nonNegativeSafeInteger(capturedInput.recent_claim_count)
  ) {
    fail("INVALID_QUEUE_CLAIM");
  }
  const nowKey = rfc3339UtcSortKey(capturedInput.now);
  const availableKey = rfc3339UtcSortKey(capturedItem.available_at);
  const expiryKey = rfc3339UtcSortKey(capturedItem.expires_at);
  if (nowKey === null || availableKey === null || expiryKey === null) {
    fail("INVALID_QUEUE_CLAIM");
  }
  if (nowKey < availableKey) fail("QUEUE_NOT_AVAILABLE");
  if (nowKey >= expiryKey) fail("QUEUE_EXPIRED");
  if (
    capturedItem.attempts >= capturedItem.retry_policy.max_attempts
  ) {
    fail("QUEUE_MAX_ATTEMPTS");
  }
  if (capturedInput.active_concurrency_count >= capturedItem.concurrency.limit) {
    fail("QUEUE_CONCURRENCY_LIMIT");
  }
  if (capturedInput.recent_claim_count >= capturedItem.rate_limit.max_claims) {
    fail("QUEUE_RATE_LIMIT");
  }
  if (
    evaluateQueueClaimApproval(capturedItem, {
      now: capturedInput.now,
      gate: capturedInput.gate,
    }).decision !== "CLAIMABLE"
  ) {
    fail("QUEUE_APPROVAL_REQUIRED");
  }

  const nextAttempt = capturedItem.attempts + 1;
  const candidateLeaseExpiry = new Date(
    Date.parse(capturedInput.now) + capturedItem.lease_policy.duration_ms,
  ).toISOString();
  const leaseExpiry = earliestTimestamp(
    candidateLeaseExpiry,
    capturedItem.expires_at,
  );
  if (rfc3339UtcSortKey(leaseExpiry) <= nowKey) fail("QUEUE_APPROVAL_REQUIRED");

  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    state: "CLAIMED",
    attempts: nextAttempt,
    claim_history: [...capturedItem.claim_history, capturedInput.now],
    lease: {
      lease_id: capturedInput.lease_id,
      worker_ref: capturedInput.worker_ref,
      claimed_at: capturedInput.now,
      heartbeat_at: capturedInput.now,
      expires_at: leaseExpiry,
      attempt: nextAttempt,
    },
    updated_at: capturedInput.now,
  });
}

export function heartbeatQueueItem(item, input) {
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_HEARTBEAT");
  }
  if (
    capturedItem?.state !== "CLAIMED" ||
    capturedItem?.lease === null
  ) {
    fail("QUEUE_LEASE_OWNERSHIP_LOST");
  }
  if (
    !exactFields(capturedInput, HEARTBEAT_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem.version
  ) {
    fail("QUEUE_CAS_CONFLICT");
  }
  if (
    capturedInput.worker_ref !== capturedItem.lease.worker_ref ||
    capturedInput.lease_id !== capturedItem.lease.lease_id
  ) {
    fail("QUEUE_LEASE_OWNERSHIP_LOST");
  }
  const nowKey = rfc3339UtcSortKey(capturedInput.now);
  const leaseExpiryKey = rfc3339UtcSortKey(capturedItem.lease.expires_at);
  if (nowKey === null || leaseExpiryKey === null) fail("INVALID_QUEUE_HEARTBEAT");
  if (nowKey >= leaseExpiryKey) fail("QUEUE_LEASE_EXPIRED");
  const candidateLeaseExpiry = new Date(
    Date.parse(capturedInput.now) + capturedItem.lease_policy.duration_ms,
  ).toISOString();
  const nextExpiry = earliestTimestamp(
    candidateLeaseExpiry,
    capturedItem.expires_at,
  );
  if (rfc3339UtcSortKey(nextExpiry) <= nowKey) fail("QUEUE_EXPIRED");

  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    lease: {
      ...capturedItem.lease,
      heartbeat_at: capturedInput.now,
      expires_at: nextExpiry,
    },
    updated_at: capturedInput.now,
  });
}

function completionMatches(item, input) {
  return (
    exactFields(input, COMPLETION_FIELDS) &&
    item?.result !== null &&
    input.worker_ref === item.result.worker_ref &&
    input.lease_id === item.result.lease_id &&
    input.outcome === item.result.outcome &&
    input.result_digest === item.result.result_digest
  );
}

export function completeQueueItem(item, input) {
  if (new Set(["COMPLETED", "UNKNOWN_OUTCOME"]).has(item?.state)) {
    if (completionMatches(item, input)) return item;
    fail("QUEUE_RESULT_CONFLICT");
  }

  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_COMPLETION");
  }
  if (
    !new Set(["CLAIMED", "CANCEL_REQUESTED"]).has(capturedItem?.state) ||
    capturedItem?.lease === null ||
    !exactFields(capturedInput, COMPLETION_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem.version
  ) {
    fail("QUEUE_CAS_CONFLICT");
  }
  if (
    capturedInput.worker_ref !== capturedItem.lease.worker_ref ||
    capturedInput.lease_id !== capturedItem.lease.lease_id
  ) {
    fail("QUEUE_LEASE_OWNERSHIP_LOST");
  }
  if (
    !new Set(["KNOWN_RESULT", "UNKNOWN_OUTCOME"]).has(capturedInput.outcome) ||
    !validDigest(capturedInput.result_digest)
  ) {
    fail("INVALID_QUEUE_COMPLETION");
  }
  const nowKey = rfc3339UtcSortKey(capturedInput.now);
  const leaseExpiryKey = rfc3339UtcSortKey(capturedItem.lease.expires_at);
  if (nowKey === null || leaseExpiryKey === null) fail("INVALID_QUEUE_COMPLETION");
  if (nowKey >= leaseExpiryKey) fail("QUEUE_LEASE_EXPIRED");

  const unknown = capturedInput.outcome === "UNKNOWN_OUTCOME";
  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    state: unknown ? "UNKNOWN_OUTCOME" : "COMPLETED",
    lease: null,
    result: {
      outcome: capturedInput.outcome,
      result_digest: capturedInput.result_digest,
      worker_ref: capturedInput.worker_ref,
      lease_id: capturedInput.lease_id,
      recorded_at: capturedInput.now,
    },
    recovery: unknown
      ? {
          reason: "UNKNOWN_OUTCOME",
          previous_lease_id: capturedInput.lease_id,
          requires_new_approval: true,
          reconciled_at: null,
        }
      : capturedItem.recovery,
    updated_at: capturedInput.now,
  });
}

function cancellationMatches(item, input) {
  return (
    exactFields(input, CANCELLATION_FIELDS) &&
    nonNegativeSafeInteger(input.expected_version) &&
    validStableId(input.actor_ref) &&
    validStableId(input.reason_ref) &&
    rfc3339UtcSortKey(input.now) !== null &&
    item?.cancellation !== null &&
    item.cancellation.actor_ref === input.actor_ref &&
    item.cancellation.reason_ref === input.reason_ref
  );
}

function dispatchCommitMatches(item, input) {
  const commit = item?.dispatch_commit;
  return (
    exactFields(input, DISPATCH_PERMIT_FIELDS) &&
    commit !== null &&
    input.worker_ref === commit.worker_ref &&
    input.lease_id === commit.lease_id &&
    input.attempt === commit.attempt &&
    input.dispatch_id === commit.dispatch_id &&
    input.operation === commit.operation &&
    input.action_id === commit.action_id &&
    input.idempotency_key === commit.idempotency_key &&
    input.controller_intent_digest === commit.controller_intent_digest &&
    input.action_run_head_digest === commit.action_run_head_digest &&
    input.action_run_version === commit.action_run_version &&
    input.authorization_expires_at === commit.authorization_expires_at &&
    input.background_record_version === commit.background_record_version &&
    input.background_record_digest === commit.background_record_digest
  );
}

export function consumeQueueDispatchPermit(item, input) {
  if (item?.dispatch_commit !== null && item?.dispatch_commit !== undefined) {
    if (dispatchCommitMatches(item, input)) return item;
    fail("QUEUE_DISPATCH_COMMIT_CONFLICT");
  }
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_DISPATCH_COMMIT");
  }
  if (
    capturedItem?.state !== "CLAIMED" ||
    capturedItem?.cancellation_requested !== false ||
    capturedItem?.lease === null ||
    !exactFields(capturedInput, DISPATCH_PERMIT_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem.version
  ) {
    fail("QUEUE_DISPATCH_NOT_CLAIMABLE");
  }
  if (
    !validStableId(capturedInput.worker_ref) ||
    !validStableId(capturedInput.lease_id) ||
    !positiveSafeInteger(capturedInput.attempt) ||
    !validStableId(capturedInput.dispatch_id) ||
    capturedInput.operation !== "work" ||
    !validStableId(capturedInput.action_id) ||
    !validStableId(capturedInput.idempotency_key) ||
    !validDigest(capturedInput.controller_intent_digest) ||
    !validDigest(capturedInput.action_run_head_digest) ||
    !nonNegativeSafeInteger(capturedInput.action_run_version) ||
    rfc3339UtcSortKey(capturedInput.authorization_expires_at) === null ||
    !positiveSafeInteger(capturedInput.background_record_version) ||
    !validDigest(capturedInput.background_record_digest) ||
    rfc3339UtcSortKey(capturedInput.now) === null ||
    capturedInput.worker_ref !== capturedItem.lease.worker_ref ||
    capturedInput.lease_id !== capturedItem.lease.lease_id ||
    capturedInput.attempt !== capturedItem.lease.attempt ||
    rfc3339UtcSortKey(capturedInput.now) >=
      rfc3339UtcSortKey(capturedItem.lease.expires_at) ||
    rfc3339UtcSortKey(capturedInput.now) >=
      rfc3339UtcSortKey(capturedInput.authorization_expires_at)
  ) {
    fail("QUEUE_DISPATCH_FENCE_MISMATCH");
  }
  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    dispatch_commit: {
      dispatch_id: capturedInput.dispatch_id,
      operation: capturedInput.operation,
      action_id: capturedInput.action_id,
      idempotency_key: capturedInput.idempotency_key,
      controller_intent_digest: capturedInput.controller_intent_digest,
      action_run_head_digest: capturedInput.action_run_head_digest,
      action_run_version: capturedInput.action_run_version,
      authorization_expires_at: capturedInput.authorization_expires_at,
      background_record_version: capturedInput.background_record_version,
      background_record_digest: capturedInput.background_record_digest,
      lease_id: capturedInput.lease_id,
      worker_ref: capturedInput.worker_ref,
      attempt: capturedInput.attempt,
      committed_at: capturedInput.now,
    },
    updated_at: capturedInput.now,
  });
}

export function cancelQueueItem(item, input) {
  if (new Set(["CANCELLED", "CANCEL_REQUESTED"]).has(item?.state)) {
    if (cancellationMatches(item, input)) return item;
    fail("QUEUE_CANCELLATION_CONFLICT");
  }
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_CANCELLATION");
  }
  if (
    !exactFields(capturedInput, CANCELLATION_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem?.version
  ) {
    fail("QUEUE_CAS_CONFLICT");
  }
  if (
    !validStableId(capturedInput.actor_ref) ||
    !validStableId(capturedInput.reason_ref) ||
    rfc3339UtcSortKey(capturedInput.now) === null
  ) {
    fail("INVALID_QUEUE_CANCELLATION");
  }
  if (
    !new Set(["PREPARED", "SUBMITTED", "APPROVAL_REQUIRED", "CLAIMED"]).has(
      capturedItem.state,
    )
  ) {
    fail("QUEUE_NOT_CANCELLABLE");
  }
  const inFlight = capturedItem.state === "CLAIMED";
  return deepFreeze({
    ...capturedItem,
    version: capturedItem.version + 1,
    state: inFlight ? "CANCEL_REQUESTED" : "CANCELLED",
    cancellation_requested: true,
    cancellation: {
      actor_ref: capturedInput.actor_ref,
      reason_ref: capturedInput.reason_ref,
      requested_at: capturedInput.now,
    },
    updated_at: capturedInput.now,
  });
}

function reconciliationRecord(input, outcome) {
  return {
    outcome,
    actor_ref: input.actor_ref,
    result_digest: input.result_digest,
    recorded_at: input.now,
  };
}

function reconciliationMatches(item, input) {
  const record = item?.reconciliation;
  if (
    !exactFields(input, RECONCILIATION_FIELDS) ||
    !nonNegativeSafeInteger(input.expected_version) ||
    !validStableId(input.actor_ref) ||
    rfc3339UtcSortKey(input.now) === null ||
    record === null ||
    item.updated_at !== record.recorded_at ||
    record.actor_ref !== input.actor_ref
  ) {
    return false;
  }
  if (input.resolution === "RESOLVED") {
    return (
      record.outcome === "RESOLVED" &&
      validDigest(input.result_digest) &&
      record.result_digest === input.result_digest
    );
  }
  return (
    input.resolution === "OBSERVE" &&
    input.result_digest === null &&
    record.result_digest === null &&
    new Set([
      "TRIGGER_EXPIRED",
      "LEASE_EXPIRED",
      "LEASE_EXPIRED_AFTER_DISPATCH_COMMIT",
      "MAX_ATTEMPTS_EXHAUSTED",
    ]).has(record.outcome)
  );
}

export function reconcileQueueItem(item, input) {
  if (
    item?.state === "UNKNOWN_OUTCOME" &&
    item?.reconciliation !== null &&
    item?.updated_at === item?.reconciliation?.recorded_at
  ) {
    if (input?.resolution === "OBSERVE" && reconciliationMatches(item, input)) {
      return item;
    }
    if (input?.resolution !== "RESOLVED") {
      fail("QUEUE_RECONCILIATION_CONFLICT");
    }
  }
  if (
    new Set(["APPROVAL_REQUIRED", "EXPIRED", "CANCELLED", "RECONCILED"]).has(
      item?.state,
    ) &&
    item?.reconciliation !== null &&
    item?.updated_at === item?.reconciliation?.recorded_at
  ) {
    if (reconciliationMatches(item, input)) return item;
    fail("QUEUE_RECONCILIATION_CONFLICT");
  }
  let capturedItem;
  let capturedInput;
  try {
    capturedItem = structuredClone(item);
    capturedInput = structuredClone(input);
  } catch {
    fail("INVALID_QUEUE_RECONCILIATION");
  }
  if (
    !exactFields(capturedInput, RECONCILIATION_FIELDS) ||
    !nonNegativeSafeInteger(capturedInput.expected_version) ||
    capturedInput.expected_version !== capturedItem?.version
  ) {
    fail("QUEUE_CAS_CONFLICT");
  }
  if (
    !validStableId(capturedInput.actor_ref) ||
    !new Set(["OBSERVE", "RESOLVED"]).has(capturedInput.resolution) ||
    rfc3339UtcSortKey(capturedInput.now) === null ||
    (capturedInput.resolution === "OBSERVE" && capturedInput.result_digest !== null) ||
    (capturedInput.resolution === "RESOLVED" && !validDigest(capturedInput.result_digest))
  ) {
    fail("INVALID_QUEUE_RECONCILIATION");
  }
  if (
    capturedInput.resolution === "RESOLVED" &&
    capturedItem?.state !== "UNKNOWN_OUTCOME"
  ) {
    fail("INVALID_QUEUE_RECONCILIATION");
  }
  const nowKey = rfc3339UtcSortKey(capturedInput.now);
  const triggerExpiryKey = rfc3339UtcSortKey(capturedItem.expires_at);

  if (
    new Set(["CLAIMED", "CANCEL_REQUESTED"]).has(capturedItem.state) &&
    capturedItem.dispatch_commit !== null &&
    capturedItem.lease !== null &&
    nowKey >= rfc3339UtcSortKey(capturedItem.lease.expires_at)
  ) {
    const previousLeaseId = capturedItem.lease.lease_id;
    return deepFreeze({
      ...capturedItem,
      version: capturedItem.version + 1,
      state: "UNKNOWN_OUTCOME",
      run_binding: {
        ...capturedItem.run_binding,
        run_head_digest: null,
        approval_digest: null,
        approval_expires_at: null,
      },
      retry_not_before: null,
      lease: null,
      reconciliation: reconciliationRecord(
        capturedInput,
        "LEASE_EXPIRED_AFTER_DISPATCH_COMMIT",
      ),
      recovery: {
        reason: "LEASE_EXPIRED_AFTER_DISPATCH_COMMIT",
        previous_lease_id: previousLeaseId,
        requires_new_approval: true,
        reconciled_at: capturedInput.now,
      },
      updated_at: capturedInput.now,
    });
  }

  if (
    new Set(["PREPARED", "SUBMITTED", "APPROVAL_REQUIRED"]).has(
      capturedItem.state,
    ) &&
    nowKey >= triggerExpiryKey
  ) {
    return deepFreeze({
      ...capturedItem,
      version: capturedItem.version + 1,
      state: "EXPIRED",
      reconciliation: reconciliationRecord(capturedInput, "TRIGGER_EXPIRED"),
      recovery: {
        reason: "TRIGGER_EXPIRED",
        previous_lease_id: null,
        requires_new_approval: false,
        reconciled_at: capturedInput.now,
      },
      updated_at: capturedInput.now,
    });
  }

  // CLAIMED is only a local fencing lease here; this adapter cannot record an
  // ACTION_INTENDED or dispatch. Effect-capable hosts must report an unknown
  // result through completion instead of using lease expiry as effect evidence.
  if (
    capturedItem.state === "CANCEL_REQUESTED" &&
    capturedItem.lease !== null &&
    nowKey >= rfc3339UtcSortKey(capturedItem.lease.expires_at)
  ) {
    const previousLeaseId = capturedItem.lease.lease_id;
    return deepFreeze({
      ...capturedItem,
      version: capturedItem.version + 1,
      state: "CANCELLED",
      run_binding: {
        ...capturedItem.run_binding,
        run_head_digest: null,
        approval_digest: null,
        approval_expires_at: null,
      },
      retry_not_before: null,
      lease: null,
      reconciliation: reconciliationRecord(capturedInput, "LEASE_EXPIRED"),
      recovery: {
        reason: "LEASE_EXPIRED",
        previous_lease_id: previousLeaseId,
        requires_new_approval: false,
        reconciled_at: capturedInput.now,
      },
      updated_at: capturedInput.now,
    });
  }

  if (
    capturedItem.state === "CLAIMED" &&
    capturedItem.lease !== null &&
    nowKey >= rfc3339UtcSortKey(capturedItem.lease.expires_at)
  ) {
    const previousLeaseId = capturedItem.lease.lease_id;
    if (capturedItem.attempts >= capturedItem.retry_policy.max_attempts) {
      return deepFreeze({
        ...capturedItem,
        version: capturedItem.version + 1,
        state: "EXPIRED",
        run_binding: {
          ...capturedItem.run_binding,
          run_head_digest: null,
          approval_digest: null,
          approval_expires_at: null,
        },
        retry_not_before: null,
        lease: null,
        reconciliation: reconciliationRecord(
          capturedInput,
          "MAX_ATTEMPTS_EXHAUSTED",
        ),
        recovery: {
          reason: "MAX_ATTEMPTS_EXHAUSTED",
          previous_lease_id: previousLeaseId,
          requires_new_approval: false,
          reconciled_at: capturedInput.now,
        },
        updated_at: capturedInput.now,
      });
    }
    const retryNotBefore = new Date(
      Date.parse(capturedInput.now) + capturedItem.retry_policy.backoff_ms,
    ).toISOString();
    if (rfc3339UtcSortKey(retryNotBefore) >= triggerExpiryKey) {
      return deepFreeze({
        ...capturedItem,
        version: capturedItem.version + 1,
        state: "EXPIRED",
        run_binding: {
          ...capturedItem.run_binding,
          run_head_digest: null,
          approval_digest: null,
          approval_expires_at: null,
        },
        retry_not_before: null,
        lease: null,
        reconciliation: reconciliationRecord(capturedInput, "TRIGGER_EXPIRED"),
        recovery: {
          reason: "TRIGGER_EXPIRED",
          previous_lease_id: previousLeaseId,
          requires_new_approval: false,
          reconciled_at: capturedInput.now,
        },
        updated_at: capturedInput.now,
      });
    }
    return deepFreeze({
      ...capturedItem,
      version: capturedItem.version + 1,
      state: "APPROVAL_REQUIRED",
      run_binding: {
        ...capturedItem.run_binding,
        run_head_digest: null,
        approval_digest: null,
        approval_expires_at: null,
      },
      retry_not_before: retryNotBefore,
      lease: null,
      reconciliation: reconciliationRecord(capturedInput, "LEASE_EXPIRED"),
      recovery: {
        reason: "LEASE_EXPIRED",
        previous_lease_id: previousLeaseId,
        requires_new_approval: true,
        reconciled_at: capturedInput.now,
      },
      updated_at: capturedInput.now,
    });
  }

  if (
    capturedItem.state === "UNKNOWN_OUTCOME" &&
    capturedInput.resolution === "RESOLVED"
  ) {
    return deepFreeze({
      ...capturedItem,
      version: capturedItem.version + 1,
      state: "RECONCILED",
      reconciliation: reconciliationRecord(capturedInput, "RESOLVED"),
      recovery: {
        ...capturedItem.recovery,
        requires_new_approval: false,
        reconciled_at: capturedInput.now,
      },
      updated_at: capturedInput.now,
    });
  }
  fail("QUEUE_NOT_RECONCILABLE");
}
