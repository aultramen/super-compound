import { createHash } from "node:crypto";

import { rfc3339UtcSortKey } from "./schema-validator.mjs";

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const GIT_SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const ISOLATION_ORDER = Object.freeze([
  "NONE",
  "WORKTREE",
  "PROCESS",
  "NETWORK",
  "CREDENTIAL",
  "HARDENED",
]);
const RESERVATION_HOLDING_STATES = Object.freeze([
  "RESERVED",
  "DISPATCH_INTENDED",
  "DISPATCHED",
  "CANCEL_REQUESTED",
  "UNKNOWN_OUTCOME",
]);
const BACKGROUND_DISPATCH_STATES = Object.freeze([
  ...RESERVATION_HOLDING_STATES,
  "COMPLETED",
  "CANCELLED",
  "RECONCILED",
]);
const BACKGROUND_TRANSITION_COMMANDS = Object.freeze([
  "DISPATCH_INTENDED",
  "OBSERVE_DISPATCH",
  "COMPLETE",
  "CANCEL",
  "LEASE_LOST",
  "RECONCILE",
]);
export const BACKGROUND_REQUIRED_CAPABILITIES = Object.freeze([
  "CREDENTIAL_SCOPE_ENFORCEMENT",
  "DURABLE_AUDIT",
  "DURABLE_LOCAL_STATE",
  "FINITE_NO_PROGRESS_CAP",
  "FINITE_RUNTIME_CAP",
  "HARD_WRITE_INTERCEPTION",
  "ISOLATED_WORKTREE",
  "LEASE_RECOVERY",
  "NETWORK_EGRESS_ENFORCEMENT",
  "PERMISSION_BYPASS_PREVENTION",
  "PROCESS_ISOLATION",
]);

const QUEUE_CLAIM_FIELDS = Object.freeze([
  "queue_item_id",
  "queue_version",
  "queue_state",
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
  "run_head_digest",
  "approval_digest",
  "approval_expires_at",
  "dispatch_commit",
  "lease",
]);
const QUEUE_DISPATCH_COMMIT_FIELDS = Object.freeze([
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
  "lease_id",
  "worker_ref",
  "attempt",
  "committed_at",
]);
const DISPATCH_GATE_FIELDS = Object.freeze([
  "allowed",
  "would_allow",
  "simulation_only",
  "mutation_authorized",
  "operation",
  "queue_item_id",
  "run_id",
  "run_version",
  "confirmation_digest",
  "authority_digest",
  "policy_digest",
  "run_head_digest",
  "verifier_digest",
  "project_config_digest",
  "operation_inventory_digest",
  "confirmed_risk_profile",
  "confirmed_autonomy_profile",
  "confirmed_required_gates",
  "action_id",
  "idempotency_key",
  "controller_intent_digest",
  "background_budget_binding",
]);
const HOST_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "attestation_id",
  "host_ref",
  "run_id",
  "run_head_digest",
  "authority_digest",
  "verifier_digest",
  "project_config_digest",
  "operation_inventory_digest",
  "policy_digest",
  "approval_digest",
  "capabilities",
  "credential_scopes",
  "egress_ids",
  "isolation",
  "issued_at",
  "expires_at",
  "evidence_digest",
]);
const WORKTREE_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "attestation_id",
  "host_ref",
  "run_id",
  "queue_item_id",
  "lease_id",
  "worker_ref",
  "worktree_ref",
  "root_digest",
  "base_git_sha",
  "dedicated",
  "main_workspace",
  "path_confined",
  "symlink_free",
  "issued_at",
  "expires_at",
  "evidence_digest",
]);
const WORKTREE_VERIFICATION_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "verified",
  "attestation_id",
  "run_id",
  "queue_item_id",
  "lease_id",
  "worker_ref",
  "worktree_ref",
  "root_digest",
  "base_git_sha",
  "evidence_digest",
  "verified_at",
]);
const POLICY_VERIFICATION_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "verified",
  "run_id",
  "queue_item_id",
  "confirmation_digest",
  "project_config_digest",
  "policy_digest",
  "operation_inventory_digest",
  "effective_limits_digest",
  "aggregate_epoch_digest",
  "aggregate_policy_digest",
  "issued_at",
  "expires_at",
  "evidence_digest",
]);
const ACTION_AUTHORIZATION_INPUT_FIELDS = Object.freeze([
  "current_queue_claim",
  "action_gate",
  "lineage_verification",
  "now",
]);
const POST_DISPATCH_ACTION_AUTHORIZATION_INPUT_FIELDS = Object.freeze([
  ...ACTION_AUTHORIZATION_INPUT_FIELDS,
  "host_attestation",
]);
const ACTION_AUTHORIZATION_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "dispatch_id",
  "admission_version",
  "operation",
  "run_id",
  "queue_item_id",
  "queue_version",
  "lease_id",
  "worker_ref",
  "lease_attempt",
  "worktree_ref",
  "worktree_root_digest",
  "action_id",
  "idempotency_key",
  "controller_intent_digest",
  "queue_run_head_digest",
  "action_run_head_digest",
  "action_run_version",
  "confirmation_digest",
  "policy_digest",
  "aggregate_epoch_digest",
  "aggregate_policy_digest",
  "budget_binding",
  "reservation",
  "host_binding",
  "lineage_evidence_digest",
  "authorized_at",
  "expires_at",
]);
const TRANSITION_INPUT_FIELDS = Object.freeze([
  "expected_version",
  "command",
  "now",
  "authorization",
  "evidence_digest",
  "outcome",
]);
const LINEAGE_VERIFICATION_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "verified",
  "run_id",
  "queue_item_id",
  "queue_run_head_digest",
  "action_run_head_digest",
  "queue_expected_run_version",
  "action_run_version",
  "operation",
  "action_id",
  "controller_intent_digest",
  "evidence_digest",
  "verified_at",
]);
const RESERVATION_INPUT_FIELDS = Object.freeze([
  "dispatch_id",
  "queue_claim",
  "host_attestation",
  "host_verification",
  "capability_decision",
  "worktree_attestation",
  "worktree_verification",
  "expected_base_git_sha",
  "effective_limits",
  "effective_limits_digest",
  "shared_aggregate_policy",
  "aggregate_epoch_digest",
  "aggregate_policy",
  "aggregate_policy_digest",
  "budget_binding",
  "policy_verification",
  "reservation",
  "now",
]);
const BACKGROUND_RECORD_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "dispatch_id",
  "version",
  "state",
  "run_binding",
  "action_binding",
  "queue_binding",
  "worktree",
  "capability",
  "effective_limits",
  "effective_limits_digest",
  "shared_aggregate_policy",
  "aggregate_epoch_digest",
  "aggregate_policy",
  "aggregate_policy_digest",
  "budget_binding",
  "reservation",
  "reservation_status",
  "dispatch_count",
  "result",
  "cancellation",
  "quarantine",
  "requires_new_approval",
  "created_at",
  "updated_at",
  "last_transition",
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

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stableId(value) {
  return typeof value === "string" && STABLE_ID.test(value);
}

function boundedString(value, maxLength = 64) {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maxLength
  );
}

function digest(value) {
  return typeof value === "string" && DIGEST.test(value);
}

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function positive(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegative(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function nullablePositive(value) {
  return value === null || positive(value);
}

function stableIdSet(value) {
  return (
    Array.isArray(value) &&
    value.length <= 256 &&
    new Set(value).size === value.length &&
    value.every(stableId)
  );
}

function sameSet(left, right) {
  return (
    stableIdSet(left) &&
    stableIdSet(right) &&
    left.length === right.length &&
    left.every((entry) => right.includes(entry))
  );
}

function containsAll(values, required) {
  return stableIdSet(values) && required.every((entry) => values.includes(entry));
}

function timestamp(value) {
  return rfc3339UtcSortKey(value) !== null;
}

function activeAt(now, issuedAt, expiresAt) {
  const nowKey = rfc3339UtcSortKey(now);
  const issuedKey = rfc3339UtcSortKey(issuedAt);
  const expiryKey = rfc3339UtcSortKey(expiresAt);
  return (
    nowKey !== null &&
    issuedKey !== null &&
    expiryKey !== null &&
    issuedKey <= nowKey &&
    nowKey < expiryKey
  );
}

function clone(value, code) {
  try {
    return structuredClone(value);
  } catch {
    fail(code);
  }
}

function freezeDeep(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) freezeDeep(entry, seen);
  return Object.freeze(value);
}

function validQueueDispatchCommit(value) {
  return (
    exactFields(value, QUEUE_DISPATCH_COMMIT_FIELDS) &&
    stableId(value.dispatch_id) &&
    value.operation === "work" &&
    stableId(value.action_id) &&
    stableId(value.idempotency_key) &&
    digest(value.controller_intent_digest) &&
    digest(value.action_run_head_digest) &&
    nonNegative(value.action_run_version) &&
    timestamp(value.authorization_expires_at) &&
    positive(value.background_record_version) &&
    digest(value.background_record_digest) &&
    stableId(value.lease_id) &&
    stableId(value.worker_ref) &&
    positive(value.attempt) &&
    timestamp(value.committed_at)
  );
}

function validQueueClaim(value, now) {
  const lease = value?.lease;
  return (
    exactFields(value, QUEUE_CLAIM_FIELDS) &&
    stableId(value.queue_item_id) &&
    nonNegative(value.queue_version) &&
    value.queue_state === "CLAIMED" &&
    stableId(value.run_id) &&
    new Set(["START", "RESUME"]).has(value.phase) &&
    nonNegative(value.expected_run_version) &&
    [
      "goal_digest",
      "authority_digest",
      "verifier_digest",
      "eval_definition_digest",
      "project_config_digest",
      "policy_digest",
      "operation_inventory_digest",
      "run_head_digest",
      "approval_digest",
    ].every((field) => digest(value[field])) &&
    new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(value.risk_profile) &&
    value.autonomy_profile === "BACKGROUND" &&
    stableIdSet(value.required_gates) &&
    (value.dispatch_commit === null ||
      validQueueDispatchCommit(value.dispatch_commit)) &&
    timestamp(value.approval_expires_at) &&
    rfc3339UtcSortKey(now) < rfc3339UtcSortKey(value.approval_expires_at) &&
    exactFields(lease, ["lease_id", "worker_ref", "attempt", "expires_at"]) &&
    stableId(lease.lease_id) &&
    stableId(lease.worker_ref) &&
    positive(lease.attempt) &&
    timestamp(lease.expires_at) &&
    rfc3339UtcSortKey(now) < rfc3339UtcSortKey(lease.expires_at)
  );
}

function validHostAttestation(value, input) {
  const queue = input.queue_claim;
  return (
    exactFields(value, HOST_FIELDS) &&
    value.schema === "host_capability_v2" &&
    value.contract_version === "2.0.0" &&
    stableId(value.attestation_id) &&
    stableId(value.host_ref) &&
    value.run_id === queue.run_id &&
    value.run_head_digest === queue.run_head_digest &&
    value.authority_digest === queue.authority_digest &&
    value.verifier_digest === queue.verifier_digest &&
    value.project_config_digest === queue.project_config_digest &&
    value.operation_inventory_digest === queue.operation_inventory_digest &&
    value.policy_digest === queue.policy_digest &&
    value.approval_digest === queue.approval_digest &&
    containsAll(value.capabilities, BACKGROUND_REQUIRED_CAPABILITIES) &&
    exactFields(value.credential_scopes, ["read", "write"]) &&
    stableIdSet(value.credential_scopes.read) &&
    stableIdSet(value.credential_scopes.write) &&
    value.credential_scopes.write.length > 0 &&
    stableIdSet(value.egress_ids) &&
    ISOLATION_ORDER.includes(value.isolation) &&
    ISOLATION_ORDER.indexOf(value.isolation) >= ISOLATION_ORDER.indexOf("WORKTREE") &&
    activeAt(input.now, value.issued_at, value.expires_at) &&
    digest(value.evidence_digest)
  );
}

function validPostDispatchHostAttestation(value, admission, actionGate, now) {
  const run = admission.run_binding;
  const capability = admission.capability;
  if (!isObject(run) || !isObject(capability) || !isObject(actionGate)) {
    return false;
  }
  return (
    validHostAttestation(value, {
      queue_claim: {
        run_id: run.run_id,
        run_head_digest: actionGate.run_head_digest,
        authority_digest: run.authority_digest,
        verifier_digest: run.verifier_digest,
        project_config_digest: run.project_config_digest,
        operation_inventory_digest: run.operation_inventory_digest,
        policy_digest: run.policy_digest,
        approval_digest: run.confirmation_digest,
      },
      now,
    }) &&
    value.attestation_id === capability.attestation_id &&
    value.host_ref === capability.host_ref &&
    value.evidence_digest === capability.evidence_digest &&
    value.expires_at === capability.expires_at &&
    stableIdSet(capability.required_capabilities) &&
    containsAll(value.capabilities, capability.required_capabilities) &&
    ISOLATION_ORDER.includes(capability.effective_isolation) &&
    ISOLATION_ORDER.indexOf(value.isolation) >=
      ISOLATION_ORDER.indexOf(capability.effective_isolation)
  );
}

function validCapabilityDecision(value, host) {
  return (
    exactFields(value, [
      "allowed",
      "code",
      "effective_isolation",
      "required_capabilities",
    ]) &&
    value.allowed === true &&
    value.code === "ACTION_CAPABILITY_VERIFIED" &&
    ISOLATION_ORDER.includes(value.effective_isolation) &&
    ISOLATION_ORDER.indexOf(value.effective_isolation) >=
      ISOLATION_ORDER.indexOf("WORKTREE") &&
    containsAll(value.required_capabilities, BACKGROUND_REQUIRED_CAPABILITIES) &&
    containsAll(host.capabilities, value.required_capabilities)
  );
}

function validWorktreeAttestation(value, input) {
  const queue = input.queue_claim;
  return (
    exactFields(value, WORKTREE_FIELDS) &&
    value.schema === "background_worktree_attestation_v2" &&
    value.contract_version === "2.0.0" &&
    stableId(value.attestation_id) &&
    value.host_ref === input.host_attestation.host_ref &&
    value.run_id === queue.run_id &&
    value.queue_item_id === queue.queue_item_id &&
    value.lease_id === queue.lease.lease_id &&
    value.worker_ref === queue.lease.worker_ref &&
    stableId(value.worktree_ref) &&
    digest(value.root_digest) &&
    GIT_SHA.test(value.base_git_sha) &&
    value.base_git_sha === input.expected_base_git_sha &&
    value.dedicated === true &&
    value.main_workspace === false &&
    value.path_confined === true &&
    value.symlink_free === true &&
    activeAt(input.now, value.issued_at, value.expires_at) &&
    digest(value.evidence_digest)
  );
}

function validWorktreeVerification(value, input) {
  const attestation = input.worktree_attestation;
  return (
    exactFields(value, WORKTREE_VERIFICATION_FIELDS) &&
    value.schema === "background_worktree_verification_v2" &&
    value.contract_version === "2.0.0" &&
    value.verified === true &&
    value.attestation_id === attestation.attestation_id &&
    value.run_id === attestation.run_id &&
    value.queue_item_id === attestation.queue_item_id &&
    value.lease_id === attestation.lease_id &&
    value.worker_ref === attestation.worker_ref &&
    value.worktree_ref === attestation.worktree_ref &&
    value.root_digest === attestation.root_digest &&
    value.base_git_sha === attestation.base_git_sha &&
    value.evidence_digest === attestation.evidence_digest &&
    timestamp(value.verified_at) &&
    rfc3339UtcSortKey(value.verified_at) <= rfc3339UtcSortKey(input.now)
  );
}

function validPolicyVerification(value, input) {
  const queue = input.queue_claim;
  return (
    exactFields(value, POLICY_VERIFICATION_FIELDS) &&
    value.schema === "background_policy_verification_v2" &&
    value.contract_version === "2.0.0" &&
    value.verified === true &&
    value.run_id === queue.run_id &&
    value.queue_item_id === queue.queue_item_id &&
    value.confirmation_digest === queue.approval_digest &&
    value.project_config_digest === queue.project_config_digest &&
    value.policy_digest === queue.policy_digest &&
    value.operation_inventory_digest === queue.operation_inventory_digest &&
    value.effective_limits_digest === input.effective_limits_digest &&
    value.aggregate_epoch_digest === input.aggregate_epoch_digest &&
    value.aggregate_policy_digest === input.aggregate_policy_digest &&
    activeAt(input.now, value.issued_at, value.expires_at) &&
    digest(value.evidence_digest)
  );
}

function validActionGate(gate, admission) {
  const run = admission.run_binding;
  const action = admission.action_binding;
  const preDispatch =
    admission.state === "RESERVED" &&
    action === null &&
    gate?.operation === "work" &&
    gate?.run_version > run.expected_run_version;
  const activeDispatch =
    admission.state === "DISPATCHED" &&
    action !== null &&
    stableId(gate?.operation) &&
    !new Set(["queue-claim", "work"]).has(gate.operation) &&
    gate.run_version >= action.action_run_version &&
    gate.action_id === action.action_id &&
    gate.idempotency_key === action.idempotency_key &&
    gate.controller_intent_digest === action.controller_intent_digest &&
    gate.run_head_digest === action.action_run_head_digest;
  return (
    exactFields(gate, DISPATCH_GATE_FIELDS) &&
    gate.allowed === true &&
    gate.would_allow === true &&
    gate.simulation_only === false &&
    gate.mutation_authorized === true &&
    (preDispatch || activeDispatch) &&
    gate.queue_item_id === null &&
    gate.run_id === run.run_id &&
    nonNegative(gate.run_version) &&
    gate.confirmation_digest === run.confirmation_digest &&
    gate.authority_digest === run.authority_digest &&
    gate.policy_digest === run.policy_digest &&
    gate.run_head_digest !== run.queue_run_head_digest &&
    gate.verifier_digest === run.verifier_digest &&
    gate.project_config_digest === run.project_config_digest &&
    gate.operation_inventory_digest === run.operation_inventory_digest &&
    gate.confirmed_risk_profile === run.risk_profile &&
    gate.confirmed_autonomy_profile === "BACKGROUND" &&
    sameSet(gate.confirmed_required_gates, run.required_gates) &&
    stableId(gate.action_id) &&
    stableId(gate.idempotency_key) &&
    digest(gate.controller_intent_digest) &&
    validBackgroundBudgetBinding(gate.background_budget_binding, gate) &&
    budgetBindingMatchesRun(
      gate.background_budget_binding,
      run,
      admission.effective_limits,
      admission.reservation,
    ) &&
    budgetBindingProgressesFrom(
      gate.background_budget_binding,
      admission.budget_binding,
    )
  );
}

function validBackgroundBudgetBinding(value, gate = null) {
  if (
    !exactFields(value, [
      "schema",
      "run_id",
      "confirmation_digest",
      "approval_phase",
      "approval_expires_at",
      "run_version",
      "current_run_head_digest",
      "action_run_head_digest",
      "action_id",
      "idempotency_key",
      "controller_intent_digest",
      "effective_limits",
      "consumed",
      "remaining",
      "authority_digest",
    ]) ||
    value.schema !== "background_budget_binding_v2" ||
    !stableId(value.run_id) ||
    (gate !== null && value.run_id !== gate.run_id) ||
    !digest(value.confirmation_digest) ||
    (gate !== null && value.confirmation_digest !== gate.confirmation_digest) ||
    !new Set(["START", "RESUME"]).has(value.approval_phase) ||
    !timestamp(value.approval_expires_at) ||
    !positive(value.run_version) ||
    (gate !== null && value.run_version !== gate.run_version) ||
    !digest(value.current_run_head_digest) ||
    !digest(value.action_run_head_digest) ||
    (gate !== null && value.action_run_head_digest !== gate.run_head_digest) ||
    !stableId(value.action_id) ||
    (gate !== null && value.action_id !== gate.action_id) ||
    !stableId(value.idempotency_key) ||
    (gate !== null && value.idempotency_key !== gate.idempotency_key) ||
    !digest(value.controller_intent_digest) ||
    (gate !== null &&
      value.controller_intent_digest !== gate.controller_intent_digest) ||
    !digest(value.authority_digest) ||
    !exactFields(value.effective_limits, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) ||
    !positive(value.effective_limits.max_runtime_ms) ||
    !positive(value.effective_limits.max_no_progress_iterations) ||
    !nullablePositive(value.effective_limits.max_tokens) ||
    !exactFields(value.consumed, [
      "active_runtime_ms",
      "no_progress_iterations",
      "tokens",
    ]) ||
    !nonNegative(value.consumed.active_runtime_ms) ||
    !nonNegative(value.consumed.no_progress_iterations) ||
    !(value.consumed.tokens === null || nonNegative(value.consumed.tokens)) ||
    !exactFields(value.remaining, [
      "runtime_ms",
      "no_progress_iterations",
      "tokens",
    ]) ||
    !positive(value.remaining.runtime_ms) ||
    !positive(value.remaining.no_progress_iterations) ||
    !(value.remaining.tokens === null || positive(value.remaining.tokens)) ||
    value.remaining.runtime_ms !==
      value.effective_limits.max_runtime_ms - value.consumed.active_runtime_ms ||
    value.remaining.no_progress_iterations !==
      value.effective_limits.max_no_progress_iterations -
        value.consumed.no_progress_iterations ||
    (value.effective_limits.max_tokens === null
      ? value.remaining.tokens !== null
      : value.consumed.tokens === null ||
        value.remaining.tokens !==
          value.effective_limits.max_tokens - value.consumed.tokens)
  ) {
    return false;
  }
  const { authority_digest: authorityDigest, ...authority } = value;
  return (
    authorityDigest ===
    digestJson({
      domain: "super-compound.background-budget-binding.v2",
      ...authority,
    })
  );
}

function controllerIntentDigest(binding) {
  return digestJson({
    run_id: binding.run_id,
    action_id: binding.action_id,
    idempotency_key: binding.idempotency_key,
    run_head_digest: binding.action_run_head_digest,
  });
}

function validRunBinding(value) {
  return (
    exactFields(value, [
      "run_id",
      "phase",
      "expected_run_version",
      "queue_run_head_digest",
      "goal_digest",
      "authority_digest",
      "verifier_digest",
      "eval_definition_digest",
      "project_config_digest",
      "policy_digest",
      "operation_inventory_digest",
      "confirmation_digest",
      "approval_expires_at",
      "risk_profile",
      "autonomy_profile",
      "required_gates",
    ]) &&
    stableId(value.run_id) &&
    new Set(["START", "RESUME"]).has(value.phase) &&
    nonNegative(value.expected_run_version) &&
    [
      "queue_run_head_digest",
      "goal_digest",
      "authority_digest",
      "verifier_digest",
      "eval_definition_digest",
      "project_config_digest",
      "policy_digest",
      "operation_inventory_digest",
      "confirmation_digest",
    ].every((field) => digest(value[field])) &&
    timestamp(value.approval_expires_at) &&
    new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(
      value.risk_profile,
    ) &&
    value.autonomy_profile === "BACKGROUND" &&
    stableIdSet(value.required_gates)
  );
}

function budgetBindingMatchesRun(
  binding,
  run,
  effectiveLimits,
  reservation,
) {
  return (
    isObject(effectiveLimits) &&
    isObject(reservation) &&
    validBackgroundBudgetBinding(binding) &&
    validRunBinding(run) &&
    binding.run_id === run.run_id &&
    binding.confirmation_digest === run.confirmation_digest &&
    binding.approval_phase === run.phase &&
    binding.approval_expires_at === run.approval_expires_at &&
    binding.run_version > run.expected_run_version &&
    binding.current_run_head_digest !== run.queue_run_head_digest &&
    binding.action_run_head_digest !== run.queue_run_head_digest &&
    binding.controller_intent_digest === controllerIntentDigest(binding) &&
    sameJson(binding.effective_limits, effectiveLimits) &&
    reservation.runtime_ms <= binding.remaining.runtime_ms &&
    (effectiveLimits.max_tokens === null ||
      reservation.tokens === null ||
      (nonNegative(reservation.tokens) &&
        nonNegative(binding.remaining.tokens) &&
        reservation.tokens <= binding.remaining.tokens))
  );
}

function budgetBindingMatchesQueue(
  binding,
  queue,
  effectiveLimits,
  reservation,
) {
  return (
    isObject(queue) &&
    isObject(effectiveLimits) &&
    isObject(reservation) &&
    validBackgroundBudgetBinding(binding) &&
    binding.run_id === queue.run_id &&
    binding.confirmation_digest === queue.approval_digest &&
    binding.approval_phase === queue.phase &&
    binding.approval_expires_at === queue.approval_expires_at &&
    binding.run_version > queue.expected_run_version &&
    binding.current_run_head_digest !== queue.run_head_digest &&
    binding.action_run_head_digest !== queue.run_head_digest &&
    binding.controller_intent_digest === controllerIntentDigest(binding) &&
    sameJson(binding.effective_limits, effectiveLimits) &&
    reservation.runtime_ms <= binding.remaining.runtime_ms &&
    (effectiveLimits.max_tokens === null ||
      reservation.tokens === null ||
      (nonNegative(reservation.tokens) &&
        nonNegative(binding.remaining.tokens) &&
        reservation.tokens <= binding.remaining.tokens))
  );
}

function budgetBindingProgressesFrom(current, baseline) {
  if (
    !validBackgroundBudgetBinding(current) ||
    !validBackgroundBudgetBinding(baseline)
  ) {
    return false;
  }
  const stableFields = [
    "run_id",
    "confirmation_digest",
    "approval_phase",
    "approval_expires_at",
    "action_run_head_digest",
    "action_id",
    "idempotency_key",
    "controller_intent_digest",
  ];
  return (
    stableFields.every((field) => current[field] === baseline[field]) &&
    current.run_version >= baseline.run_version &&
    (current.current_run_head_digest ===
      baseline.current_run_head_digest ||
      current.run_version > baseline.run_version) &&
    sameJson(current.effective_limits, baseline.effective_limits) &&
    current.consumed.active_runtime_ms >=
      baseline.consumed.active_runtime_ms &&
    current.consumed.no_progress_iterations >=
      baseline.consumed.no_progress_iterations &&
    current.remaining.runtime_ms <= baseline.remaining.runtime_ms &&
    current.remaining.no_progress_iterations <=
      baseline.remaining.no_progress_iterations &&
    (current.effective_limits.max_tokens === null ||
      (nonNegative(current.consumed.tokens) &&
        nonNegative(baseline.consumed.tokens) &&
        current.consumed.tokens >= baseline.consumed.tokens &&
        nonNegative(current.remaining.tokens) &&
        nonNegative(baseline.remaining.tokens) &&
        current.remaining.tokens <= baseline.remaining.tokens))
  );
}

function validLineageVerification(value, admission, gate, now) {
  const run = admission.run_binding;
  return (
    exactFields(value, LINEAGE_VERIFICATION_FIELDS) &&
    value.schema === "background_run_lineage_verification_v2" &&
    value.contract_version === "2.0.0" &&
    value.verified === true &&
    value.run_id === run.run_id &&
    value.queue_item_id === admission.queue_binding.queue_item_id &&
    value.queue_run_head_digest === run.queue_run_head_digest &&
    value.action_run_head_digest === gate.run_head_digest &&
    value.queue_run_head_digest !== value.action_run_head_digest &&
    value.queue_expected_run_version === run.expected_run_version &&
    value.action_run_version === gate.run_version &&
    value.action_run_version > value.queue_expected_run_version &&
    value.operation === gate.operation &&
    value.action_id === gate.action_id &&
    value.controller_intent_digest === gate.controller_intent_digest &&
    digest(value.evidence_digest) &&
    timestamp(value.verified_at) &&
    rfc3339UtcSortKey(value.verified_at) <= rfc3339UtcSortKey(now)
  );
}

function liveQueueMatchesAdmission(queue, admission, now) {
  const binding = admission.queue_binding;
  return (
    validQueueClaim(queue, now) &&
    queue.queue_item_id === binding.queue_item_id &&
    queue.run_id === admission.run_binding.run_id &&
    queue.queue_version >= binding.queue_version &&
    queue.run_head_digest === admission.run_binding.queue_run_head_digest &&
    queue.approval_digest === admission.run_binding.confirmation_digest &&
    queue.lease.lease_id === binding.lease_id &&
    queue.lease.worker_ref === binding.worker_ref &&
    queue.lease.attempt === binding.attempt
  );
}

function queueDispatchCommitMatchesAdmission(queue, admission) {
  const commit = queue.dispatch_commit;
  const binding = admission.action_binding;
  return (
    validQueueDispatchCommit(commit) &&
    isObject(binding) &&
    commit.dispatch_id === admission.dispatch_id &&
    commit.operation === "work" &&
    commit.lease_id === admission.queue_binding.lease_id &&
    commit.worker_ref === admission.queue_binding.worker_ref &&
    commit.attempt === admission.queue_binding.attempt &&
    commit.action_id === binding.action_id &&
    commit.idempotency_key === binding.idempotency_key &&
    commit.controller_intent_digest === binding.controller_intent_digest &&
    commit.action_run_head_digest === binding.action_run_head_digest &&
    commit.action_run_version === binding.action_run_version &&
    commit.authorization_expires_at === binding.authorization_expires_at &&
    commit.background_record_version < admission.version
  );
}

function earliestTimestamp(values) {
  return [...values].sort(
    (left, right) =>
      rfc3339UtcSortKey(left).localeCompare(rfc3339UtcSortKey(right)),
  )[0];
}

export function backgroundDispatchDigest(record) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex")}`;
}

export function isBackgroundDispatchRecord(record) {
  return (
    exactFields(record, BACKGROUND_RECORD_FIELDS) &&
    record.schema === "background_dispatch_v2" &&
    record.contract_version === "2.0.0" &&
    stableId(record.dispatch_id) &&
    nonNegative(record.version) &&
    BACKGROUND_DISPATCH_STATES.includes(record.state) &&
    validRunBinding(record.run_binding) &&
    (record.action_binding === null ||
      (isObject(record.budget_binding) &&
        exactFields(record.action_binding, [
        "operation",
        "action_id",
        "idempotency_key",
        "controller_intent_digest",
        "action_run_head_digest",
        "action_run_version",
        "authorization_expires_at",
      ]) &&
        record.action_binding.operation === "work" &&
        stableId(record.action_binding.action_id) &&
        stableId(record.action_binding.idempotency_key) &&
        digest(record.action_binding.controller_intent_digest) &&
        digest(record.action_binding.action_run_head_digest) &&
        positive(record.action_binding.action_run_version) &&
        timestamp(record.action_binding.authorization_expires_at) &&
        record.action_binding.action_id === record.budget_binding.action_id &&
        record.action_binding.idempotency_key ===
          record.budget_binding.idempotency_key &&
        record.action_binding.controller_intent_digest ===
          record.budget_binding.controller_intent_digest &&
        record.action_binding.action_run_head_digest ===
          record.budget_binding.action_run_head_digest &&
        record.action_binding.action_run_version ===
          record.budget_binding.run_version)) &&
    exactFields(record.queue_binding, [
      "queue_item_id",
      "queue_version",
      "lease_id",
      "worker_ref",
      "attempt",
      "lease_expires_at",
    ]) &&
    stableId(record.queue_binding.queue_item_id) &&
    nonNegative(record.queue_binding.queue_version) &&
    stableId(record.queue_binding.lease_id) &&
    stableId(record.queue_binding.worker_ref) &&
    positive(record.queue_binding.attempt) &&
    timestamp(record.queue_binding.lease_expires_at) &&
    exactFields(record.worktree, [
      "attestation_id",
      "worktree_ref",
      "root_digest",
      "base_git_sha",
      "evidence_digest",
      "verification_digest",
      "expires_at",
      "disposition",
    ]) &&
    stableId(record.worktree.attestation_id) &&
    stableId(record.worktree.worktree_ref) &&
    digest(record.worktree.root_digest) &&
    GIT_SHA.test(record.worktree.base_git_sha ?? "") &&
    digest(record.worktree.evidence_digest) &&
    digest(record.worktree.verification_digest) &&
    timestamp(record.worktree.expires_at) &&
    new Set(["ACTIVE", "RELEASED", "QUARANTINED"]).has(
      record.worktree.disposition,
    ) &&
    exactFields(record.capability, [
      "attestation_id",
      "host_ref",
      "evidence_digest",
      "effective_isolation",
      "required_capabilities",
      "expires_at",
    ]) &&
    stableId(record.capability.attestation_id) &&
    stableId(record.capability.host_ref) &&
    digest(record.capability.evidence_digest) &&
    ISOLATION_ORDER.includes(record.capability.effective_isolation) &&
    stableIdSet(record.capability.required_capabilities) &&
    timestamp(record.capability.expires_at) &&
    digest(record.effective_limits_digest) &&
    digest(record.aggregate_epoch_digest) &&
    digest(record.aggregate_policy_digest) &&
    budgetBindingMatchesRun(
      record.budget_binding,
      record.run_binding,
      record.effective_limits,
      record.reservation,
    ) &&
    exactFields(record.effective_limits, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) &&
    positive(record.effective_limits.max_runtime_ms) &&
    positive(record.effective_limits.max_no_progress_iterations) &&
    nullablePositive(record.effective_limits.max_tokens) &&
    exactFields(record.aggregate_policy, [
      "max_workers",
      "max_reserved_tokens",
      "max_reserved_runtime_ms",
      "max_remote_calls",
      "max_reviewers",
    ]) &&
    positive(record.aggregate_policy.max_workers) &&
    nullablePositive(record.aggregate_policy.max_reserved_tokens) &&
    positive(record.aggregate_policy.max_reserved_runtime_ms) &&
    nonNegative(record.aggregate_policy.max_remote_calls) &&
    positive(record.aggregate_policy.max_reviewers) &&
    exactFields(record.shared_aggregate_policy, [
      "max_workers",
      "max_reserved_tokens",
      "max_reserved_runtime_ms",
      "max_remote_calls",
      "max_reviewers",
    ]) &&
    positive(record.shared_aggregate_policy.max_workers) &&
    nullablePositive(record.shared_aggregate_policy.max_reserved_tokens) &&
    positive(record.shared_aggregate_policy.max_reserved_runtime_ms) &&
    nonNegative(record.shared_aggregate_policy.max_remote_calls) &&
    positive(record.shared_aggregate_policy.max_reviewers) &&
    record.aggregate_policy.max_workers <=
      record.shared_aggregate_policy.max_workers &&
    record.aggregate_policy.max_reserved_runtime_ms <=
      record.shared_aggregate_policy.max_reserved_runtime_ms &&
    record.aggregate_policy.max_remote_calls <=
      record.shared_aggregate_policy.max_remote_calls &&
    record.aggregate_policy.max_reviewers <=
      record.shared_aggregate_policy.max_reviewers &&
    (record.shared_aggregate_policy.max_reserved_tokens === null ||
      (record.aggregate_policy.max_reserved_tokens !== null &&
        record.aggregate_policy.max_reserved_tokens <=
          record.shared_aggregate_policy.max_reserved_tokens)) &&
    exactFields(record.reservation, [
      "workers",
      "tokens",
      "runtime_ms",
      "remote_calls",
      "reviewers",
    ]) &&
    record.reservation.workers === 1 &&
    (record.reservation.tokens === null ||
      nonNegative(record.reservation.tokens)) &&
    positive(record.reservation.runtime_ms) &&
    nonNegative(record.reservation.remote_calls) &&
    positive(record.reservation.reviewers) &&
    new Set(["HELD", "RELEASED"]).has(record.reservation_status) &&
    nonNegative(record.dispatch_count) &&
    record.dispatch_count <= 1 &&
    typeof record.requires_new_approval === "boolean" &&
    timestamp(record.created_at) &&
    timestamp(record.updated_at) &&
    rfc3339UtcSortKey(record.created_at) <=
      rfc3339UtcSortKey(record.updated_at) &&
    (record.result === null ||
      (exactFields(record.result, ["outcome", "evidence_digest"]) &&
        boundedString(record.result.outcome) &&
        digest(record.result.evidence_digest))) &&
    (record.cancellation === null ||
      (exactFields(record.cancellation, ["status", "evidence_digest"]) &&
        new Set([
          "CANCELLED_BEFORE_DISPATCH",
          "OBSERVATION_REQUIRED",
        ]).has(record.cancellation.status) &&
        digest(record.cancellation.evidence_digest))) &&
    (record.quarantine === null ||
      (exactFields(record.quarantine, ["reason", "evidence_digest"]) &&
        new Set([
          "UNKNOWN_DISPATCH_OUTCOME",
          "UNKNOWN_WORKER_OUTCOME",
          "FAILURE",
          "POLICY_STOP",
          "LEASE_LOST_BEFORE_DISPATCH",
          "LEASE_LOST_AFTER_DISPATCH_INTENT",
        ]).has(record.quarantine.reason) &&
        digest(record.quarantine.evidence_digest))) &&
    (record.last_transition === null ||
      (exactFields(record.last_transition, [
        "command",
        "outcome",
        "evidence_digest",
        "at",
      ]) &&
        new Set(BACKGROUND_TRANSITION_COMMANDS).has(
          record.last_transition.command,
        ) &&
        (record.last_transition.outcome === null ||
          boundedString(record.last_transition.outcome)) &&
        digest(record.last_transition.evidence_digest) &&
        timestamp(record.last_transition.at)))
  );
}

function validLimitsAndReservation(input) {
  const limits = input.effective_limits;
  const policy = input.aggregate_policy;
  const sharedPolicy = input.shared_aggregate_policy;
  const reservation = input.reservation;
  if (
    !exactFields(limits, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) ||
    !positive(limits.max_runtime_ms) ||
    !positive(limits.max_no_progress_iterations) ||
    !nullablePositive(limits.max_tokens) ||
    !exactFields(policy, [
      "max_workers",
      "max_reserved_tokens",
      "max_reserved_runtime_ms",
      "max_remote_calls",
      "max_reviewers",
    ]) ||
    !exactFields(sharedPolicy, [
      "max_workers",
      "max_reserved_tokens",
      "max_reserved_runtime_ms",
      "max_remote_calls",
      "max_reviewers",
    ]) ||
    !positive(policy.max_workers) ||
    !nullablePositive(policy.max_reserved_tokens) ||
    !positive(policy.max_reserved_runtime_ms) ||
    !nonNegative(policy.max_remote_calls) ||
    !positive(policy.max_reviewers) ||
    !positive(sharedPolicy.max_workers) ||
    !nullablePositive(sharedPolicy.max_reserved_tokens) ||
    !positive(sharedPolicy.max_reserved_runtime_ms) ||
    !nonNegative(sharedPolicy.max_remote_calls) ||
    !positive(sharedPolicy.max_reviewers) ||
    policy.max_workers > sharedPolicy.max_workers ||
    policy.max_reserved_runtime_ms > sharedPolicy.max_reserved_runtime_ms ||
    policy.max_remote_calls > sharedPolicy.max_remote_calls ||
    policy.max_reviewers > sharedPolicy.max_reviewers ||
    (sharedPolicy.max_reserved_tokens !== null &&
      (policy.max_reserved_tokens === null ||
        policy.max_reserved_tokens > sharedPolicy.max_reserved_tokens)) ||
    !digest(input.aggregate_epoch_digest) ||
    !digest(input.aggregate_policy_digest) ||
    !exactFields(reservation, [
      "workers",
      "tokens",
      "runtime_ms",
      "remote_calls",
      "reviewers",
    ]) ||
    reservation.workers !== 1 ||
    !(reservation.tokens === null || nonNegative(reservation.tokens)) ||
    !positive(reservation.runtime_ms) ||
    !nonNegative(reservation.remote_calls) ||
    !positive(reservation.reviewers) ||
    reservation.runtime_ms > limits.max_runtime_ms ||
    reservation.runtime_ms > policy.max_reserved_runtime_ms ||
    reservation.runtime_ms > sharedPolicy.max_reserved_runtime_ms ||
    reservation.remote_calls > policy.max_remote_calls ||
    reservation.remote_calls > sharedPolicy.max_remote_calls ||
    reservation.reviewers > policy.max_reviewers ||
    reservation.reviewers > sharedPolicy.max_reviewers
  ) {
    return false;
  }
  const tokenCapFinite =
    limits.max_tokens !== null ||
    policy.max_reserved_tokens !== null ||
    sharedPolicy.max_reserved_tokens !== null;
  if (tokenCapFinite && reservation.tokens === null) {
    fail("BACKGROUND_TOKEN_ACCOUNTING_UNKNOWN");
  }
  if (tokenCapFinite && !nonNegative(reservation.tokens)) return false;
  if (
    limits.max_tokens !== null &&
    reservation.tokens > limits.max_tokens
  ) {
    return false;
  }
  if (
    policy.max_reserved_tokens !== null &&
    reservation.tokens > policy.max_reserved_tokens
  ) {
    return false;
  }
  if (
    sharedPolicy.max_reserved_tokens !== null &&
    reservation.tokens > sharedPolicy.max_reserved_tokens
  ) {
    return false;
  }
  if (
    tokenCapFinite &&
    !input.host_attestation.capabilities.includes("TOKEN_METERING")
  ) {
    return false;
  }
  return true;
}

function sameAggregatePolicy(left, right) {
  return (
    isObject(left) &&
    isObject(right) &&
    left.max_workers === right.max_workers &&
    left.max_reserved_tokens === right.max_reserved_tokens &&
    left.max_reserved_runtime_ms === right.max_reserved_runtime_ms &&
    left.max_remote_calls === right.max_remote_calls &&
    left.max_reviewers === right.max_reviewers
  );
}

function addReservation(total, value) {
  const next = total + value;
  if (!Number.isSafeInteger(next)) fail("BACKGROUND_RESERVATION_OVERFLOW");
  return next;
}

function accountActiveReservations(activeDispatches, input) {
  const sharedTotals = {
    workers: 0,
    tokens: 0,
    runtime_ms: 0,
    remote_calls: 0,
    reviewers: 0,
  };
  const runTotals = { ...sharedTotals };
  const requestedWorktree = input.worktree_attestation.worktree_ref;
  for (const record of activeDispatches) {
    if (
      !isObject(record) ||
      record.schema !== "background_dispatch_v2" ||
      record.contract_version !== "2.0.0" ||
      !stableId(record.dispatch_id) ||
      !BACKGROUND_DISPATCH_STATES.includes(record.state) ||
      !digest(record.aggregate_epoch_digest) ||
      !digest(record.aggregate_policy_digest) ||
      !new Set(["HELD", "RELEASED"]).has(record.reservation_status) ||
      !isObject(record.reservation) ||
      record.reservation.workers !== 1 ||
      !(record.reservation.tokens === null || nonNegative(record.reservation.tokens)) ||
      !positive(record.reservation.runtime_ms) ||
      !nonNegative(record.reservation.remote_calls) ||
      !positive(record.reservation.reviewers) ||
      !isObject(record.worktree) ||
      !stableId(record.worktree.worktree_ref) ||
      ![undefined, "ACTIVE", "RELEASED", "QUARANTINED"].includes(
        record.worktree.disposition,
      )
    ) {
      fail("INVALID_ACTIVE_BACKGROUND_RESERVATION");
    }
    if (record.dispatch_id === input.dispatch_id) {
      fail("BACKGROUND_DISPATCH_CONFLICT");
    }
    if (record.queue_binding?.queue_item_id === input.queue_claim.queue_item_id) {
      const freshReleasedContinuation =
        record.reservation_status === "RELEASED" &&
        new Set(["COMPLETED", "CANCELLED", "RECONCILED"]).has(record.state) &&
        input.queue_claim.lease.attempt > record.queue_binding.attempt &&
        input.queue_claim.approval_digest !==
          record.run_binding.confirmation_digest;
      if (!freshReleasedContinuation) fail("BACKGROUND_DISPATCH_CONFLICT");
    }
    if (
      record.worktree.worktree_ref === requestedWorktree &&
      record.worktree.disposition !== "RELEASED"
    ) {
      fail("BACKGROUND_WORKTREE_UNAVAILABLE");
    }
    const holdsReservation = record.reservation_status === "HELD";
    if (!holdsReservation) continue;
    if (
      record.aggregate_epoch_digest !== input.aggregate_epoch_digest ||
      !sameAggregatePolicy(
        record.shared_aggregate_policy,
        input.shared_aggregate_policy,
      )
    ) {
      fail("BACKGROUND_AGGREGATE_EPOCH_DRIFT");
    }
    sharedTotals.workers = addReservation(
      sharedTotals.workers,
      record.reservation.workers,
    );
    sharedTotals.runtime_ms = addReservation(
      sharedTotals.runtime_ms,
      record.reservation.runtime_ms,
    );
    sharedTotals.remote_calls = addReservation(
      sharedTotals.remote_calls,
      record.reservation.remote_calls,
    );
    sharedTotals.reviewers = addReservation(
      sharedTotals.reviewers,
      record.reservation.reviewers,
    );
    if (record.reservation.tokens === null) {
      if (input.shared_aggregate_policy.max_reserved_tokens !== null) {
        fail("BACKGROUND_TOKEN_ACCOUNTING_UNKNOWN");
      }
    } else {
      sharedTotals.tokens = addReservation(
        sharedTotals.tokens,
        record.reservation.tokens,
      );
    }
    if (record.run_binding?.run_id !== input.queue_claim.run_id) continue;
    if (
      record.aggregate_policy_digest !== input.aggregate_policy_digest ||
      !sameAggregatePolicy(record.aggregate_policy, input.aggregate_policy)
    ) {
      fail("BACKGROUND_RUN_POLICY_DRIFT");
    }
    runTotals.workers = addReservation(
      runTotals.workers,
      record.reservation.workers,
    );
    runTotals.runtime_ms = addReservation(
      runTotals.runtime_ms,
      record.reservation.runtime_ms,
    );
    runTotals.remote_calls = addReservation(
      runTotals.remote_calls,
      record.reservation.remote_calls,
    );
    runTotals.reviewers = addReservation(
      runTotals.reviewers,
      record.reservation.reviewers,
    );
    if (record.reservation.tokens === null) {
      if (input.aggregate_policy.max_reserved_tokens !== null) {
        fail("BACKGROUND_TOKEN_ACCOUNTING_UNKNOWN");
      }
    } else {
      runTotals.tokens = addReservation(
        runTotals.tokens,
        record.reservation.tokens,
      );
    }
  }
  return { sharedTotals, runTotals };
}

function enforceAggregateCaps(input, totals) {
  const reservation = input.reservation;
  const policy = input.shared_aggregate_policy;
  const sharedTotals = totals.sharedTotals;
  if (sharedTotals.workers + reservation.workers > policy.max_workers) {
    fail("BACKGROUND_WORKER_CAP_EXHAUSTED");
  }
  if (
    sharedTotals.runtime_ms + reservation.runtime_ms >
    policy.max_reserved_runtime_ms
  ) {
    fail("BACKGROUND_RUNTIME_CAP_EXHAUSTED");
  }
  if (
    sharedTotals.remote_calls + reservation.remote_calls >
    policy.max_remote_calls
  ) {
    fail("BACKGROUND_REMOTE_CAP_EXHAUSTED");
  }
  if (sharedTotals.reviewers + reservation.reviewers > policy.max_reviewers) {
    fail("BACKGROUND_REVIEWER_CAP_EXHAUSTED");
  }
  if (
    policy.max_reserved_tokens !== null &&
    sharedTotals.tokens + reservation.tokens > policy.max_reserved_tokens
  ) {
    fail("BACKGROUND_TOKEN_CAP_EXHAUSTED");
  }
  const runPolicy = input.aggregate_policy;
  const runTotals = totals.runTotals;
  if (runTotals.workers + reservation.workers > runPolicy.max_workers) {
    fail("BACKGROUND_RUN_WORKER_CAP_EXHAUSTED");
  }
  if (
    runTotals.runtime_ms + reservation.runtime_ms >
    runPolicy.max_reserved_runtime_ms
  ) {
    fail("BACKGROUND_RUN_RUNTIME_CAP_EXHAUSTED");
  }
  if (
    runTotals.remote_calls + reservation.remote_calls >
    runPolicy.max_remote_calls
  ) {
    fail("BACKGROUND_RUN_REMOTE_CAP_EXHAUSTED");
  }
  if (runTotals.reviewers + reservation.reviewers > runPolicy.max_reviewers) {
    fail("BACKGROUND_RUN_REVIEWER_CAP_EXHAUSTED");
  }
  if (
    runPolicy.max_reserved_tokens !== null &&
    runTotals.tokens + reservation.tokens > runPolicy.max_reserved_tokens
  ) {
    fail("BACKGROUND_RUN_TOKEN_CAP_EXHAUSTED");
  }
}

export function reserveBackgroundClaim(input, activeDispatches = []) {
  const captured = clone(input, "INVALID_BACKGROUND_RESERVATION");
  const active = clone(activeDispatches, "INVALID_BACKGROUND_RESERVATION");
  if (
    !exactFields(captured, RESERVATION_INPUT_FIELDS) ||
    !stableId(captured.dispatch_id) ||
    !timestamp(captured.now) ||
    !GIT_SHA.test(captured.expected_base_git_sha) ||
    !Array.isArray(active) ||
    !validQueueClaim(captured.queue_claim, captured.now) ||
    captured.queue_claim.dispatch_commit !== null ||
    !validHostAttestation(captured.host_attestation, captured) ||
    !exactFields(captured.host_verification, ["verified", "evidence_digest"]) ||
    captured.host_verification.verified !== true ||
    captured.host_verification.evidence_digest !==
      captured.host_attestation.evidence_digest ||
    !validCapabilityDecision(
      captured.capability_decision,
      captured.host_attestation,
    ) ||
    !validWorktreeAttestation(captured.worktree_attestation, captured) ||
    !validWorktreeVerification(captured.worktree_verification, captured) ||
    !digest(captured.effective_limits_digest) ||
    !validPolicyVerification(captured.policy_verification, captured) ||
    !budgetBindingMatchesQueue(
      captured.budget_binding,
      captured.queue_claim,
      captured.effective_limits,
      captured.reservation,
    ) ||
    !validLimitsAndReservation(captured)
  ) {
    fail("BACKGROUND_ADMISSION_DENIED");
  }

  enforceAggregateCaps(captured, accountActiveReservations(active, captured));

  const queue = captured.queue_claim;
  const host = captured.host_attestation;
  const worktree = captured.worktree_attestation;
  return freezeDeep({
    schema: "background_dispatch_v2",
    contract_version: "2.0.0",
    dispatch_id: captured.dispatch_id,
    version: 0,
    state: "RESERVED",
    run_binding: {
      run_id: queue.run_id,
      phase: queue.phase,
      expected_run_version: queue.expected_run_version,
      queue_run_head_digest: queue.run_head_digest,
      goal_digest: queue.goal_digest,
      authority_digest: queue.authority_digest,
      verifier_digest: queue.verifier_digest,
      eval_definition_digest: queue.eval_definition_digest,
      project_config_digest: queue.project_config_digest,
      policy_digest: queue.policy_digest,
      operation_inventory_digest: queue.operation_inventory_digest,
      confirmation_digest: queue.approval_digest,
      approval_expires_at: queue.approval_expires_at,
      risk_profile: queue.risk_profile,
      autonomy_profile: queue.autonomy_profile,
      required_gates: [...queue.required_gates],
    },
    action_binding: null,
    queue_binding: {
      queue_item_id: queue.queue_item_id,
      queue_version: queue.queue_version,
      lease_id: queue.lease.lease_id,
      worker_ref: queue.lease.worker_ref,
      attempt: queue.lease.attempt,
      lease_expires_at: queue.lease.expires_at,
    },
    worktree: {
      attestation_id: worktree.attestation_id,
      worktree_ref: worktree.worktree_ref,
      root_digest: worktree.root_digest,
      base_git_sha: worktree.base_git_sha,
      evidence_digest: worktree.evidence_digest,
      verification_digest: captured.worktree_verification.evidence_digest,
      expires_at: worktree.expires_at,
      disposition: "ACTIVE",
    },
    capability: {
      attestation_id: host.attestation_id,
      host_ref: host.host_ref,
      evidence_digest: host.evidence_digest,
      effective_isolation: captured.capability_decision.effective_isolation,
      required_capabilities: [
        ...captured.capability_decision.required_capabilities,
      ].sort(),
      expires_at: host.expires_at,
    },
    effective_limits: captured.effective_limits,
    effective_limits_digest: captured.effective_limits_digest,
    shared_aggregate_policy: captured.shared_aggregate_policy,
    aggregate_epoch_digest: captured.aggregate_epoch_digest,
    aggregate_policy: captured.aggregate_policy,
    aggregate_policy_digest: captured.aggregate_policy_digest,
    budget_binding: captured.budget_binding,
    reservation: captured.reservation,
    reservation_status: "HELD",
    dispatch_count: 0,
    result: null,
    cancellation: null,
    quarantine: null,
    requires_new_approval: false,
    created_at: captured.now,
    updated_at: captured.now,
    last_transition: null,
  });
}

export function authorizeBackgroundAction(admission, input) {
  const capturedAdmission = clone(
    admission,
    "INVALID_BACKGROUND_ACTION_AUTHORIZATION",
  );
  const captured = clone(input, "INVALID_BACKGROUND_ACTION_AUTHORIZATION");
  if (
    !isBackgroundDispatchRecord(capturedAdmission) ||
    !new Set(["RESERVED", "DISPATCHED"]).has(capturedAdmission.state) ||
    capturedAdmission.worktree?.disposition !== "ACTIVE"
  ) {
    fail("BACKGROUND_ACTION_BLOCKED");
  }
  const authorizationInputFields =
    capturedAdmission.state === "DISPATCHED"
      ? POST_DISPATCH_ACTION_AUTHORIZATION_INPUT_FIELDS
      : ACTION_AUTHORIZATION_INPUT_FIELDS;
  if (
    !exactFields(captured, authorizationInputFields) ||
    !timestamp(captured.now)
  ) {
    fail("INVALID_BACKGROUND_ACTION_AUTHORIZATION");
  }
  if (
    capturedAdmission.state === "DISPATCHED" &&
    !validPostDispatchHostAttestation(
      captured.host_attestation,
      capturedAdmission,
      captured.action_gate,
      captured.now,
    )
  ) {
    fail("BACKGROUND_HOST_ATTESTATION_MISMATCH");
  }
  if (
    !activeAt(
      captured.now,
      capturedAdmission.created_at,
      capturedAdmission.worktree.expires_at,
    ) ||
    !activeAt(
      captured.now,
      capturedAdmission.created_at,
      capturedAdmission.capability.expires_at,
    )
  ) {
    fail("BACKGROUND_ADMISSION_EXPIRED");
  }
  if (
    !liveQueueMatchesAdmission(
      captured.current_queue_claim,
      capturedAdmission,
      captured.now,
    )
  ) {
    fail("BACKGROUND_LEASE_STALE");
  }
  if (
    (capturedAdmission.state === "RESERVED" &&
      captured.current_queue_claim.dispatch_commit !== null) ||
    (capturedAdmission.state === "DISPATCHED" &&
      !queueDispatchCommitMatchesAdmission(
        captured.current_queue_claim,
        capturedAdmission,
      ))
  ) {
    fail("BACKGROUND_DISPATCH_COMMIT_MISMATCH");
  }
  if (!validActionGate(captured.action_gate, capturedAdmission)) {
    fail("BACKGROUND_ACTION_GATE_DENIED");
  }
  if (
    !validLineageVerification(
      captured.lineage_verification,
      capturedAdmission,
      captured.action_gate,
      captured.now,
    )
  ) {
    fail("BACKGROUND_LINEAGE_UNVERIFIED");
  }

  const gate = captured.action_gate;
  const queue = captured.current_queue_claim;
  return freezeDeep({
    schema: "background_action_authorization_v2",
    contract_version: "2.0.0",
    dispatch_id: capturedAdmission.dispatch_id,
    admission_version: capturedAdmission.version,
    operation: gate.operation,
    run_id: capturedAdmission.run_binding.run_id,
    queue_item_id: capturedAdmission.queue_binding.queue_item_id,
    queue_version: queue.queue_version,
    lease_id: queue.lease.lease_id,
    worker_ref: queue.lease.worker_ref,
    lease_attempt: queue.lease.attempt,
    worktree_ref: capturedAdmission.worktree.worktree_ref,
    worktree_root_digest: capturedAdmission.worktree.root_digest,
    action_id: gate.action_id,
    idempotency_key: gate.idempotency_key,
    controller_intent_digest: gate.controller_intent_digest,
    queue_run_head_digest: capturedAdmission.run_binding.queue_run_head_digest,
    action_run_head_digest: gate.run_head_digest,
    action_run_version: gate.run_version,
    confirmation_digest: capturedAdmission.run_binding.confirmation_digest,
    policy_digest: capturedAdmission.run_binding.policy_digest,
    aggregate_epoch_digest: capturedAdmission.aggregate_epoch_digest,
    aggregate_policy_digest: capturedAdmission.aggregate_policy_digest,
    budget_binding: captured.action_gate.background_budget_binding,
    reservation: capturedAdmission.reservation,
    host_binding: {
      attestation_id: capturedAdmission.capability.attestation_id,
      host_ref: capturedAdmission.capability.host_ref,
      evidence_digest: capturedAdmission.capability.evidence_digest,
      expires_at: capturedAdmission.capability.expires_at,
      effective_isolation: capturedAdmission.capability.effective_isolation,
      required_capabilities: [
        ...capturedAdmission.capability.required_capabilities,
      ],
    },
    lineage_evidence_digest: captured.lineage_verification.evidence_digest,
    authorized_at: captured.now,
    expires_at: earliestTimestamp([
      capturedAdmission.run_binding.approval_expires_at,
      queue.lease.expires_at,
      capturedAdmission.worktree.expires_at,
      capturedAdmission.capability.expires_at,
    ]),
  });
}

function validAuthorizationSnapshot(authorization, record, now) {
  return (
    exactFields(authorization, ACTION_AUTHORIZATION_FIELDS) &&
    authorization.schema === "background_action_authorization_v2" &&
    authorization.contract_version === "2.0.0" &&
    authorization.operation === "work" &&
    authorization.dispatch_id === record.dispatch_id &&
    authorization.admission_version === record.version &&
    authorization.run_id === record.run_binding.run_id &&
    authorization.queue_item_id === record.queue_binding.queue_item_id &&
    nonNegative(authorization.queue_version) &&
    authorization.queue_version >= record.queue_binding.queue_version &&
    authorization.lease_id === record.queue_binding.lease_id &&
    authorization.worker_ref === record.queue_binding.worker_ref &&
    authorization.lease_attempt === record.queue_binding.attempt &&
    authorization.worktree_ref === record.worktree.worktree_ref &&
    authorization.worktree_root_digest === record.worktree.root_digest &&
    authorization.queue_run_head_digest === record.run_binding.queue_run_head_digest &&
    authorization.confirmation_digest === record.run_binding.confirmation_digest &&
    authorization.policy_digest === record.run_binding.policy_digest &&
    authorization.aggregate_epoch_digest === record.aggregate_epoch_digest &&
    authorization.aggregate_policy_digest === record.aggregate_policy_digest &&
    budgetBindingMatchesRun(
      authorization.budget_binding,
      record.run_binding,
      record.effective_limits,
      record.reservation,
    ) &&
    budgetBindingProgressesFrom(
      authorization.budget_binding,
      record.budget_binding,
    ) &&
    authorization.action_id === authorization.budget_binding.action_id &&
    authorization.idempotency_key ===
      authorization.budget_binding.idempotency_key &&
    authorization.controller_intent_digest ===
      authorization.budget_binding.controller_intent_digest &&
    authorization.action_run_head_digest ===
      authorization.budget_binding.action_run_head_digest &&
    authorization.action_run_version ===
      authorization.budget_binding.run_version &&
    sameJson(authorization.reservation, record.reservation) &&
    exactFields(authorization.host_binding, [
      "attestation_id",
      "host_ref",
      "evidence_digest",
      "expires_at",
      "effective_isolation",
      "required_capabilities",
    ]) &&
    authorization.host_binding.attestation_id ===
      record.capability.attestation_id &&
    authorization.host_binding.host_ref === record.capability.host_ref &&
    authorization.host_binding.evidence_digest ===
      record.capability.evidence_digest &&
    authorization.host_binding.expires_at === record.capability.expires_at &&
    authorization.host_binding.effective_isolation ===
      record.capability.effective_isolation &&
    sameSet(
      authorization.host_binding.required_capabilities,
      record.capability.required_capabilities,
    ) &&
    stableId(authorization.action_id) &&
    stableId(authorization.idempotency_key) &&
    digest(authorization.controller_intent_digest) &&
    digest(authorization.action_run_head_digest) &&
    positive(authorization.action_run_version) &&
    digest(authorization.lineage_evidence_digest) &&
    timestamp(authorization.authorized_at) &&
    timestamp(authorization.expires_at) &&
    rfc3339UtcSortKey(record.created_at) <=
      rfc3339UtcSortKey(authorization.authorized_at) &&
    rfc3339UtcSortKey(authorization.authorized_at) <=
      rfc3339UtcSortKey(now) &&
    rfc3339UtcSortKey(authorization.expires_at) <=
      rfc3339UtcSortKey(record.run_binding.approval_expires_at) &&
    rfc3339UtcSortKey(authorization.expires_at) <=
      rfc3339UtcSortKey(record.worktree.expires_at) &&
    rfc3339UtcSortKey(authorization.expires_at) <=
      rfc3339UtcSortKey(record.capability.expires_at) &&
    rfc3339UtcSortKey(now) < rfc3339UtcSortKey(authorization.expires_at)
  );
}

function transitioned(record, input, changes) {
  if (record.version === Number.MAX_SAFE_INTEGER) {
    fail("BACKGROUND_VERSION_OVERFLOW");
  }
  return freezeDeep({
    ...record,
    ...changes,
    version: record.version + 1,
    updated_at: input.now,
    last_transition: {
      command: input.command,
      outcome: input.outcome,
      evidence_digest: input.evidence_digest,
      at: input.now,
    },
  });
}

export function transitionBackgroundDispatch(record, input) {
  const current = clone(record, "INVALID_BACKGROUND_TRANSITION");
  const captured = clone(input, "INVALID_BACKGROUND_TRANSITION");
  if (
    !isBackgroundDispatchRecord(current) ||
    !exactFields(captured, TRANSITION_INPUT_FIELDS) ||
    !nonNegative(captured.expected_version) ||
    !timestamp(captured.now) ||
    !digest(captured.evidence_digest) ||
    rfc3339UtcSortKey(captured.now) < rfc3339UtcSortKey(current.updated_at)
  ) {
    fail("INVALID_BACKGROUND_TRANSITION");
  }
  if (captured.expected_version !== current.version) {
    fail("BACKGROUND_VERSION_CONFLICT");
  }

  if (captured.command === "DISPATCH_INTENDED") {
    if (
      current.state !== "RESERVED" ||
      captured.outcome !== null ||
      !validAuthorizationSnapshot(captured.authorization, current, captured.now)
    ) {
      fail("BACKGROUND_TRANSITION_DENIED");
    }
    return transitioned(current, captured, {
      state: "DISPATCH_INTENDED",
      action_binding: {
        operation: captured.authorization.operation,
        action_id: captured.authorization.action_id,
        idempotency_key: captured.authorization.idempotency_key,
        controller_intent_digest:
          captured.authorization.controller_intent_digest,
        action_run_head_digest: captured.authorization.action_run_head_digest,
        action_run_version: captured.authorization.action_run_version,
        authorization_expires_at: captured.authorization.expires_at,
      },
      budget_binding: captured.authorization.budget_binding,
      dispatch_count: current.dispatch_count + 1,
    });
  }

  if (captured.authorization !== null) {
    fail("BACKGROUND_TRANSITION_DENIED");
  }
  if (captured.command === "CANCEL") {
    if (current.state === "RESERVED" && captured.outcome === null) {
      return transitioned(current, captured, {
        state: "CANCELLED",
        reservation_status: "RELEASED",
        worktree: { ...current.worktree, disposition: "RELEASED" },
        cancellation: {
          status: "CANCELLED_BEFORE_DISPATCH",
          evidence_digest: captured.evidence_digest,
        },
      });
    }
    if (
      new Set(["DISPATCH_INTENDED", "DISPATCHED"]).has(current.state) &&
      captured.outcome === null
    ) {
      return transitioned(current, captured, {
        state: "CANCEL_REQUESTED",
        cancellation: {
          status: "OBSERVATION_REQUIRED",
          evidence_digest: captured.evidence_digest,
        },
      });
    }
    fail("BACKGROUND_TRANSITION_DENIED");
  }

  if (captured.command === "OBSERVE_DISPATCH") {
    if (
      !new Set(["DISPATCH_INTENDED", "CANCEL_REQUESTED"]).has(current.state) ||
      !new Set(["DISPATCHED", "NOT_DISPATCHED", "UNKNOWN"]).has(
        captured.outcome,
      )
    ) {
      fail("BACKGROUND_TRANSITION_DENIED");
    }
    if (captured.outcome === "DISPATCHED") {
      return transitioned(current, captured, {
        state:
          current.state === "CANCEL_REQUESTED"
            ? "CANCEL_REQUESTED"
            : "DISPATCHED",
        result:
          current.state === "CANCEL_REQUESTED"
            ? {
                outcome: "DISPATCHED_CANCEL_PENDING",
                evidence_digest: captured.evidence_digest,
              }
            : current.result,
      });
    }
    if (captured.outcome === "NOT_DISPATCHED") {
      return transitioned(current, captured, {
        state: "CANCELLED",
        reservation_status: "RELEASED",
        worktree: { ...current.worktree, disposition: "RELEASED" },
        result: {
          outcome: "NOT_DISPATCHED",
          evidence_digest: captured.evidence_digest,
        },
      });
    }
    return transitioned(current, captured, {
      state: "UNKNOWN_OUTCOME",
      worktree: { ...current.worktree, disposition: "QUARANTINED" },
      quarantine: {
        reason: "UNKNOWN_DISPATCH_OUTCOME",
        evidence_digest: captured.evidence_digest,
      },
      requires_new_approval: true,
    });
  }

  if (captured.command === "COMPLETE") {
    if (
      !new Set(["DISPATCHED", "CANCEL_REQUESTED"]).has(current.state) ||
      !new Set(["SUCCESS", "FAILURE", "POLICY_STOP", "UNKNOWN"]).has(
        captured.outcome,
      )
    ) {
      fail("BACKGROUND_TRANSITION_DENIED");
    }
    if (captured.outcome === "UNKNOWN") {
      return transitioned(current, captured, {
        state: "UNKNOWN_OUTCOME",
        worktree: { ...current.worktree, disposition: "QUARANTINED" },
        quarantine: {
          reason: "UNKNOWN_WORKER_OUTCOME",
          evidence_digest: captured.evidence_digest,
        },
        requires_new_approval: true,
      });
    }
    const quarantine = new Set(["FAILURE", "POLICY_STOP"]).has(
      captured.outcome,
    );
    return transitioned(current, captured, {
      state: "COMPLETED",
      reservation_status: "RELEASED",
      worktree: {
        ...current.worktree,
        disposition: quarantine ? "QUARANTINED" : "RELEASED",
      },
      result: {
        outcome: captured.outcome,
        evidence_digest: captured.evidence_digest,
      },
      quarantine: quarantine
        ? {
            reason: captured.outcome,
            evidence_digest: captured.evidence_digest,
          }
        : null,
      requires_new_approval: quarantine,
    });
  }

  if (captured.command === "LEASE_LOST") {
    if (captured.outcome !== null) fail("BACKGROUND_TRANSITION_DENIED");
    if (current.state === "RESERVED") {
      return transitioned(current, captured, {
        state: "UNKNOWN_OUTCOME",
        worktree: { ...current.worktree, disposition: "QUARANTINED" },
        quarantine: {
          reason: "LEASE_LOST_BEFORE_DISPATCH",
          evidence_digest: captured.evidence_digest,
        },
        requires_new_approval: true,
      });
    }
    if (
      new Set(["DISPATCH_INTENDED", "DISPATCHED", "CANCEL_REQUESTED"]).has(
        current.state,
      )
    ) {
      return transitioned(current, captured, {
        state: "UNKNOWN_OUTCOME",
        worktree: { ...current.worktree, disposition: "QUARANTINED" },
        quarantine: {
          reason: "LEASE_LOST_AFTER_DISPATCH_INTENT",
          evidence_digest: captured.evidence_digest,
        },
        requires_new_approval: true,
      });
    }
    fail("BACKGROUND_TRANSITION_DENIED");
  }

  if (captured.command === "RECONCILE") {
    if (
      current.state !== "UNKNOWN_OUTCOME" ||
      !new Set(["RELEASED", "QUARANTINED"]).has(captured.outcome)
    ) {
      fail("BACKGROUND_TRANSITION_DENIED");
    }
    return transitioned(current, captured, {
      state: "RECONCILED",
      reservation_status: "RELEASED",
      worktree: { ...current.worktree, disposition: captured.outcome },
      result: {
        outcome: `RECONCILED_${captured.outcome}`,
        evidence_digest: captured.evidence_digest,
      },
    });
  }

  fail("BACKGROUND_TRANSITION_DENIED");
}
