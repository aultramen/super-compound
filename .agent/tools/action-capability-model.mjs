import { rfc3339UtcSortKey } from "./schema-validator.mjs";

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const ISOLATION_ORDER = Object.freeze([
  "NONE",
  "WORKTREE",
  "PROCESS",
  "NETWORK",
  "CREDENTIAL",
  "HARDENED",
]);
const RISK_ORDER = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const REQUEST_FIELDS = Object.freeze([
  "operation_id",
  "run_id",
  "run_head_digest",
  "authority_digest",
  "verifier_digest",
  "project_config_digest",
  "operation_inventory_digest",
  "policy_digest",
  "approval_digest",
  "write_class",
  "risk_profile",
  "autonomy_profile",
  "required_gates",
  "requested_credential_scopes",
  "requested_egress_ids",
  "requested_isolation",
]);
const INVENTORY_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "inventory_id",
  "project_config_digest",
  "issued_at",
  "expires_at",
  "operations",
]);
const INVENTORY_FIELDS_WITH_BACKGROUND_POLICY = Object.freeze([
  ...INVENTORY_FIELDS,
  "background_aggregate_policy",
]);
const OPERATION_FIELDS = Object.freeze([
  "operation_id",
  "target_ref",
  "write_class",
  "credential_scopes",
  "egress_ids",
  "idempotency",
  "authoritative_readback",
  "compensation",
  "timeout_ms",
  "expires_at",
  "audit_sink_ref",
  "owner_ref",
  "risk",
  "human_gate",
  "required_capabilities",
  "required_isolation",
]);
const ATTESTATION_FIELDS = Object.freeze([
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

export const SUPPORTED_HOST_CAPABILITIES = Object.freeze([
  "AUTHORITATIVE_READBACK",
  "COMPENSATION",
  "COST_METERING",
  "CREDENTIAL_SCOPE_ENFORCEMENT",
  "DURABLE_AUDIT",
  "DURABLE_INTENT",
  "DURABLE_LOCAL_STATE",
  "FINITE_NO_PROGRESS_CAP",
  "FINITE_RUNTIME_CAP",
  "HARD_WRITE_INTERCEPTION",
  "IDEMPOTENCY",
  "ISOLATED_WORKTREE",
  "LEASE_RECOVERY",
  "NETWORK_EGRESS_ENFORCEMENT",
  "PERMISSION_BYPASS_PREVENTION",
  "PROCESS_ISOLATION",
  "TOKEN_METERING",
]);
const SUPPORTED_CAPABILITY_SET = new Set(SUPPORTED_HOST_CAPABILITIES);
const ENFORCE_CAPABILITIES = Object.freeze([
  "DURABLE_LOCAL_STATE",
  "HARD_WRITE_INTERCEPTION",
]);
const BACKGROUND_CAPABILITIES = Object.freeze([
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
const EXTERNAL_WRITE_CAPABILITIES = Object.freeze([
  "AUTHORITATIVE_READBACK",
  "COMPENSATION",
  "CREDENTIAL_SCOPE_ENFORCEMENT",
  "DURABLE_AUDIT",
  "DURABLE_INTENT",
  "IDEMPOTENCY",
  "NETWORK_EGRESS_ENFORCEMENT",
  "PERMISSION_BYPASS_PREVENTION",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deny(code, detail = null) {
  return Object.freeze({ allowed: false, code, detail });
}

function exactFields(value, expected) {
  return (
    isObject(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((field) => Object.hasOwn(value, field))
  );
}

function isStableId(value) {
  return typeof value === "string" && STABLE_ID.test(value);
}

function validStableIdSet(value) {
  return (
    Array.isArray(value) &&
    value.length <= 256 &&
    new Set(value).size === value.length &&
    value.every(isStableId)
  );
}

function validScopes(value) {
  return (
    exactFields(value, ["read", "write"]) &&
    validStableIdSet(value.read) &&
    validStableIdSet(value.write)
  );
}

function isFresh(now, expiresAt) {
  const nowKey = rfc3339UtcSortKey(now);
  const expiryKey = rfc3339UtcSortKey(expiresAt);
  return nowKey !== null && expiryKey !== null && nowKey < expiryKey;
}

function isActive(now, issuedAt, expiresAt) {
  const nowKey = rfc3339UtcSortKey(now);
  const issuedKey = rfc3339UtcSortKey(issuedAt);
  const expiryKey = rfc3339UtcSortKey(expiresAt);
  return (
    nowKey !== null &&
    issuedKey !== null &&
    expiryKey !== null &&
    issuedKey <= nowKey &&
    issuedKey < expiryKey
  );
}

function validSafetyDeclaration(value) {
  return (
    exactFields(value, ["required", "strategy_ref"]) &&
    typeof value.required === "boolean" &&
    isStableId(value.strategy_ref)
  );
}

function validOperation(value) {
  return (
    exactFields(value, OPERATION_FIELDS) &&
    isStableId(value.operation_id) &&
    isStableId(value.target_ref) &&
    new Set(["implementation_write", "external_write"]).has(value.write_class) &&
    validScopes(value.credential_scopes) &&
    validStableIdSet(value.egress_ids) &&
    exactFields(value.idempotency, ["required", "key_scope"]) &&
    typeof value.idempotency.required === "boolean" &&
    new Set(["RUN_OPERATION", "RUN_ACTION"]).has(value.idempotency.key_scope) &&
    validSafetyDeclaration(value.authoritative_readback) &&
    validSafetyDeclaration(value.compensation) &&
    Number.isSafeInteger(value.timeout_ms) &&
    value.timeout_ms > 0 &&
    rfc3339UtcSortKey(value.expires_at) !== null &&
    isStableId(value.audit_sink_ref) &&
    isStableId(value.owner_ref) &&
    RISK_ORDER.includes(value.risk) &&
    value.human_gate === "REQUIRED" &&
    Array.isArray(value.required_capabilities) &&
    new Set(value.required_capabilities).size === value.required_capabilities.length &&
    value.required_capabilities.every((entry) => SUPPORTED_CAPABILITY_SET.has(entry)) &&
    ISOLATION_ORDER.includes(value.required_isolation)
  );
}

function validBackgroundAggregatePolicy(value) {
  return (
    exactFields(value, [
      "max_workers",
      "max_reserved_tokens",
      "max_reserved_runtime_ms",
      "max_remote_calls",
      "max_reviewers",
    ]) &&
    Number.isSafeInteger(value.max_workers) &&
    value.max_workers > 0 &&
    (value.max_reserved_tokens === null ||
      (Number.isSafeInteger(value.max_reserved_tokens) &&
        value.max_reserved_tokens > 0)) &&
    Number.isSafeInteger(value.max_reserved_runtime_ms) &&
    value.max_reserved_runtime_ms > 0 &&
    Number.isSafeInteger(value.max_remote_calls) &&
    value.max_remote_calls >= 0 &&
    Number.isSafeInteger(value.max_reviewers) &&
    value.max_reviewers > 0
  );
}

function validInventory(value, now) {
  if (
    (!exactFields(value, INVENTORY_FIELDS) &&
      !exactFields(value, INVENTORY_FIELDS_WITH_BACKGROUND_POLICY)) ||
    value.schema !== "operation_inventory_v2" ||
    value.contract_version !== "2.0.0" ||
    !isStableId(value.inventory_id) ||
    !DIGEST.test(value.project_config_digest) ||
    !isActive(now, value.issued_at, value.expires_at) ||
    (Object.hasOwn(value, "background_aggregate_policy") &&
      !validBackgroundAggregatePolicy(value.background_aggregate_policy)) ||
    !Array.isArray(value.operations) ||
    value.operations.length > 256 ||
    !value.operations.every(validOperation)
  ) {
    return false;
  }
  const ids = value.operations.map((entry) => entry.operation_id);
  return new Set(ids).size === ids.length;
}

function validAttestation(value, now) {
  if (
    !exactFields(value, ATTESTATION_FIELDS) ||
    value.schema !== "host_capability_v2" ||
    value.contract_version !== "2.0.0" ||
    !isStableId(value.attestation_id) ||
    !isStableId(value.host_ref) ||
    !isStableId(value.run_id) ||
    !validScopes(value.credential_scopes) ||
    !validStableIdSet(value.egress_ids) ||
    !ISOLATION_ORDER.includes(value.isolation) ||
    !isActive(now, value.issued_at, value.expires_at) ||
    !Array.isArray(value.capabilities) ||
    new Set(value.capabilities).size !== value.capabilities.length ||
    value.capabilities.some((entry) => !SUPPORTED_CAPABILITY_SET.has(entry))
  ) {
    return false;
  }
  return [
    "run_head_digest",
    "authority_digest",
    "verifier_digest",
    "project_config_digest",
    "operation_inventory_digest",
    "policy_digest",
    "approval_digest",
    "evidence_digest",
  ].every((field) => DIGEST.test(value[field]));
}

function subset(values, authority) {
  const allowed = new Set(authority);
  return values.every((entry) => allowed.has(entry));
}

function sameSet(left, right) {
  return (
    validStableIdSet(left) &&
    validStableIdSet(right) &&
    left.length === right.length &&
    subset(left, right)
  );
}

function intersection(...sets) {
  if (sets.length === 0) return [];
  return [...new Set(sets[0])].filter((entry) =>
    sets.slice(1).every((set) => new Set(set).has(entry)),
  );
}

function strongest(...levels) {
  let strongestLevel = null;
  let strongestRank = -1;
  for (const level of levels) {
    const rank = ISOLATION_ORDER.indexOf(level);
    if (rank < 0) return null;
    if (rank > strongestRank) {
      strongestRank = rank;
      strongestLevel = level;
    }
  }
  return strongestLevel;
}

function bindingMatches(request, attestation) {
  return [
    ["run_id", "run_id"],
    ["run_head_digest", "run_head_digest"],
    ["authority_digest", "authority_digest"],
    ["verifier_digest", "verifier_digest"],
    ["project_config_digest", "project_config_digest"],
    ["operation_inventory_digest", "operation_inventory_digest"],
    ["policy_digest", "policy_digest"],
    ["approval_digest", "approval_digest"],
  ].every(([requestField, attestationField]) => request[requestField] === attestation[attestationField]);
}

function validRequest(request) {
  if (!exactFields(request, REQUEST_FIELDS)) return false;
  if (!isStableId(request.operation_id) || !isStableId(request.run_id)) return false;
  for (const field of [
    "run_head_digest",
    "authority_digest",
    "verifier_digest",
    "project_config_digest",
    "operation_inventory_digest",
    "policy_digest",
    "approval_digest",
  ]) {
    if (typeof request[field] !== "string" || !DIGEST.test(request[field])) return false;
  }
  return (
    new Set(["implementation_write", "external_write"]).has(request.write_class) &&
    RISK_ORDER.includes(request.risk_profile) &&
    new Set(["READ_ONLY", "INTERACTIVE", "BACKGROUND"]).has(
      request.autonomy_profile,
    ) &&
    validStableIdSet(request.required_gates) &&
    ISOLATION_ORDER.includes(request.requested_isolation) &&
    validScopes(request.requested_credential_scopes) &&
    validStableIdSet(request.requested_egress_ids)
  );
}

function inventoryOperation(inventory, operationId) {
  if (!isObject(inventory) || !Array.isArray(inventory.operations)) return null;
  const ids = inventory.operations.map((entry) => entry?.operation_id);
  if (new Set(ids).size !== ids.length) return null;
  return inventory.operations.find((entry) => entry?.operation_id === operationId) ?? null;
}

function validHostVerification(verification, attestation) {
  return (
    exactFields(verification, ["verified", "evidence_digest"]) &&
    verification.verified === true &&
    DIGEST.test(verification.evidence_digest) &&
    verification.evidence_digest === attestation?.evidence_digest
  );
}

function requiredCapabilities(context, operation) {
  const required = new Set(operation.required_capabilities ?? []);
  if (context.execution_mode === "ENFORCE") {
    for (const entry of ENFORCE_CAPABILITIES) required.add(entry);
    for (const entry of context.capability_requirements?.enforce ?? []) required.add(entry);
  }
  if (context.autonomy_profile === "BACKGROUND") {
    for (const entry of BACKGROUND_CAPABILITIES) required.add(entry);
    for (const entry of context.capability_requirements?.background ?? []) required.add(entry);
  }
  if (operation.write_class === "external_write") {
    for (const entry of EXTERNAL_WRITE_CAPABILITIES) required.add(entry);
    for (const entry of context.capability_requirements?.external_write ?? []) required.add(entry);
  }
  return [...required];
}

export function evaluateActionCapability(context = {}) {
  const {
    inventory,
    attestation,
    request,
    host_verification: hostVerification,
    effective_policy: effectivePolicy,
    execution_mode: executionMode,
    autonomy_profile: autonomyProfile,
    external_write_policy: externalWritePolicy,
    project_egress_ids: projectEgressIds,
    now,
  } = context;

  if (!validRequest(request)) return deny("INVALID_ACTION_REQUEST");
  if (!validInventory(inventory, now)) return deny("INVALID_OPERATION_INVENTORY");
  if (!validAttestation(attestation, now)) return deny("HOST_ATTESTATION_INVALID");
  if (!validHostVerification(hostVerification, attestation)) {
    return deny("HOST_ATTESTATION_UNVERIFIED");
  }
  if (!bindingMatches(request, attestation)) return deny("ATTESTATION_BINDING_MISMATCH");
  if (
    inventory?.project_config_digest !== request.project_config_digest ||
    attestation.project_config_digest !== request.project_config_digest
  ) {
    return deny("ATTESTATION_BINDING_MISMATCH");
  }
  if (
    !isFresh(now, inventory?.expires_at) ||
    !isFresh(now, attestation.expires_at) ||
    !isFresh(now, effectivePolicy?.expires_at)
  ) {
    return deny("AUTHORITY_EXPIRED");
  }

  const operation = inventoryOperation(inventory, request.operation_id);
  if (operation === null) return deny("OPERATION_NOT_IN_INVENTORY");
  if (!isFresh(now, operation.expires_at)) return deny("AUTHORITY_EXPIRED");
  if (operation.write_class !== request.write_class) return deny("WRITE_CLASS_MISMATCH");
  if (!effectivePolicy?.allowlisted_operations?.includes(operation.operation_id)) {
    return deny("OPERATION_NOT_ALLOWLISTED");
  }
  if (executionMode !== "ENFORCE") return deny("MODE_DENIED");
  if (operation.write_class === "external_write" && externalWritePolicy !== "ALLOWLIST_ONLY") {
    return deny("EXTERNAL_WRITE_DENIED");
  }
  if (
    operation.write_class === "external_write" &&
    (operation.idempotency?.required !== true ||
      operation.authoritative_readback?.required !== true ||
      operation.compensation?.required !== true ||
      operation.human_gate !== "REQUIRED")
  ) {
    return deny("UNSAFE_EXTERNAL_OPERATION");
  }
  if (
    !RISK_ORDER.includes(effectivePolicy?.risk) ||
    RISK_ORDER.indexOf(request.risk_profile) <
      Math.max(
        RISK_ORDER.indexOf(operation.risk),
        RISK_ORDER.indexOf(effectivePolicy.risk),
      )
  ) {
    return deny("RISK_DOWNGRADE_DENIED");
  }
  if (request.autonomy_profile !== autonomyProfile) {
    return deny("AUTONOMY_PROFILE_MISMATCH");
  }
  if (!sameSet(request.required_gates, effectivePolicy?.required_gates)) {
    return deny("REQUIRED_GATE_MISMATCH");
  }

  const policyScopes = effectivePolicy?.credential_scopes;
  if (!validScopes(operation.credential_scopes) || !validScopes(attestation.credential_scopes) || !validStableIdSet(policyScopes)) {
    return deny("CREDENTIAL_SCOPE_DENIED");
  }
  const effectiveScopes = {
    read: intersection(operation.credential_scopes.read, attestation.credential_scopes.read, policyScopes),
    write: intersection(operation.credential_scopes.write, attestation.credential_scopes.write, policyScopes),
  };
  if (
    !subset(request.requested_credential_scopes.read, effectiveScopes.read) ||
    !subset(request.requested_credential_scopes.write, effectiveScopes.write) ||
    request.requested_credential_scopes.write.length === 0
  ) {
    return deny("CREDENTIAL_SCOPE_DENIED");
  }

  if (
    !validStableIdSet(projectEgressIds) ||
    !validStableIdSet(operation.egress_ids) ||
    !validStableIdSet(attestation.egress_ids)
  ) {
    return deny("EGRESS_DENIED");
  }
  const effectiveEgress = intersection(
    projectEgressIds,
    operation.egress_ids,
    attestation.egress_ids,
  );
  if (!subset(request.requested_egress_ids, effectiveEgress)) return deny("EGRESS_DENIED");
  if (operation.write_class === "external_write" && request.requested_egress_ids.length === 0) {
    return deny("EGRESS_DENIED");
  }

  const effectiveIsolation = strongest(
    request.requested_isolation,
    operation.required_isolation,
    effectivePolicy?.isolation,
  );
  if (
    effectiveIsolation === null ||
    ISOLATION_ORDER.indexOf(attestation.isolation) < ISOLATION_ORDER.indexOf(effectiveIsolation)
  ) {
    return deny("ISOLATION_INSUFFICIENT");
  }

  const required = requiredCapabilities(context, operation);
  if (
    required.some((entry) => !SUPPORTED_CAPABILITY_SET.has(entry)) ||
    !Array.isArray(attestation.capabilities) ||
    required.some((entry) => !attestation.capabilities.includes(entry))
  ) {
    return deny("CAPABILITY_REQUIRED", required);
  }

  return Object.freeze({
    allowed: true,
    code: "ACTION_CAPABILITY_VERIFIED",
    operation: Object.freeze(structuredClone(operation)),
    effective_credential_scopes: Object.freeze({
      read: Object.freeze(effectiveScopes.read),
      write: Object.freeze(effectiveScopes.write),
    }),
    effective_egress_ids: Object.freeze(effectiveEgress),
    effective_isolation: effectiveIsolation,
    required_capabilities: Object.freeze(required.sort()),
  });
}
