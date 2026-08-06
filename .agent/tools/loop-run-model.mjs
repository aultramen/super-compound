import { createHash } from "node:crypto";

import { assertReleaseEvidenceForHead } from "./eval-gate-model.mjs";
import {
  applyUsageReceipt,
  redactOperationalText,
} from "./loop-telemetry-model.mjs";
import { parseJsonDocument } from "./schema-validator.mjs";

const BUDGET_FIELDS = Object.freeze([
  "max_iterations",
  "max_runtime_minutes",
  "max_no_progress_iterations",
  "max_tokens",
  "max_cost_micro",
]);
const MAX_RUNTIME_MINUTES = Math.floor(Number.MAX_SAFE_INTEGER / 60_000);

const POLICY_FIELDS = new Set([
  ...BUDGET_FIELDS,
  "allowlisted_operations",
  "credential_scopes",
  "required_gates",
  "approval_ttl_minutes",
  "risk",
  "isolation",
  "expires_at",
  "background_aggregate_policy",
]);
const COMPLETE_POLICY_FIELDS = Object.freeze([
  ...BUDGET_FIELDS,
  "approval_ttl_minutes",
  "allowlisted_operations",
  "credential_scopes",
  "required_gates",
  "risk",
  "isolation",
  "expires_at",
]);

const RISK_ORDER = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const ISOLATION_ORDER = Object.freeze([
  "NONE",
  "WORKTREE",
  "PROCESS",
  "NETWORK",
  "CREDENTIAL",
  "HARDENED",
]);
const COMMAND_FIELDS = Object.freeze({
  BUDGET_CONFIRMED: [
    "type",
    "confirmation_digest",
    "phase",
    "expected_run_version",
    "expires_at",
    "effective_budget",
  ],
  START: ["type", "confirmation_digest", "at"],
  BEGIN_ACTION: [
    "type",
    "confirmation_digest",
    "at",
    "action_id",
    "idempotency_key",
  ],
  OBSERVE_ACTION: ["type", "duration_ms"],
  BEGIN_VERIFICATION: ["type"],
  RECORD_OBSERVATION_DURATION: ["type", "duration_ms"],
  RECORD_VERIFICATION_DURATION: ["type", "duration_ms"],
  RECORD_RESUME_DURATION: ["type", "duration_ms"],
  RECORD_BACKOFF_DURATION: ["type", "duration_ms"],
  RECORD_USAGE: ["type", "receipt"],
  RECORD_OPERATIONAL_METRIC: ["type"],
  RECORD_LEARNING_OUTCOME: ["type"],
  PROMOTE_VERIFIED_PATTERN: ["type"],
  VERIFICATION_PASSED: ["type", "release_evidence"],
  VERIFICATION_FAILED: [
    "type",
    "verification_status",
    "fingerprint",
    "requirement_delta",
    "coverage_delta",
    "meaningful_diff_count",
    "approach_id",
  ],
  MARK_VERIFICATION_STALE: ["type", "reason"],
  PAUSE: ["type"],
  RESUME: ["type", "confirmation_digest", "at"],
  RESUME_COMPLETED: ["type"],
  STOP: ["type", "terminal_status", "reason"],
  CANCEL: ["type"],
  RECONCILE: ["type", "outcome", "evidence_digest"],
});

const RUN_STATE_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "run_id",
  "mode",
  "status",
  "version",
  "sequence",
  "authority_digest",
  "policy_digest",
  "effective_budget",
  "counters",
  "approval",
  "verification",
  "active_action",
  "paused_from",
  "terminal_reason",
  "last_progress_fingerprint",
  "last_approach_id",
  "last_event_hash",
]);
const COUNTER_FIELDS = Object.freeze([
  "iterations",
  "active_runtime_ms",
  "no_progress_iterations",
  "tokens",
  "token_measurement",
  "cost_micro",
  "cost_measurement",
  "usage_iteration",
  "usage_receipt_count",
  "usage_complete",
  "usage_completion_digest",
]);
const APPROVAL_FIELDS = Object.freeze([
  "confirmation_digest",
  "phase",
  "expected_run_version",
  "expires_at",
]);
const VERIFICATION_FIELDS = Object.freeze([
  "status",
  "fresh",
  "gates_satisfied",
  "fingerprint",
]);
const ACTIVE_ACTION_FIELDS = Object.freeze(["action_id", "idempotency_key"]);

function assertPositiveSafeIntegerOrNull(value, label) {
  if (
    value !== null &&
    (!Number.isSafeInteger(value) || value <= 0)
  ) {
    throw new TypeError(`${label} must be null or a positive safe integer.`);
  }
}

function assertStringArray(value, label) {
  if (
    !Array.isArray(value) ||
    value.length > 256 ||
    value.some((entry) => !validIdentifier(entry)) ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError(
      `${label} must contain at most 256 unique bounded identifiers.`,
    );
  }
}

function assertBackgroundAggregatePolicy(value, label) {
  const fields = [
    "max_workers",
    "max_reserved_tokens",
    "max_reserved_runtime_ms",
    "max_remote_calls",
    "max_reviewers",
  ];
  if (
    !isPlainObject(value) ||
    Object.keys(value).length !== fields.length ||
    !fields.every((field) => Object.hasOwn(value, field)) ||
    !Number.isSafeInteger(value.max_workers) ||
    value.max_workers <= 0 ||
    (value.max_reserved_tokens !== null &&
      (!Number.isSafeInteger(value.max_reserved_tokens) ||
        value.max_reserved_tokens <= 0)) ||
    !Number.isSafeInteger(value.max_reserved_runtime_ms) ||
    value.max_reserved_runtime_ms <= 0 ||
    !Number.isSafeInteger(value.max_remote_calls) ||
    value.max_remote_calls < 0 ||
    !Number.isSafeInteger(value.max_reviewers) ||
    value.max_reviewers <= 0
  ) {
    throw new TypeError(`${label} must be an exact bounded aggregate policy.`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactFields(value, expected) {
  if (!isPlainObject(value)) {
    return false;
  }
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((field) => Object.hasOwn(value, field))
  );
}

function isUtcDateTime(value) {
  if (typeof value !== "string") {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/u.exec(
    value,
  );
  if (match === null) {
    return false;
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    Number(hourText) <= 23 &&
    Number(minuteText) <= 59 &&
    Number(secondText) <= 59
  );
}

function utcDateTimeSortKey(value) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/u.exec(
    value,
  );
  return `${match[1]}.${(match[2] ?? "").padEnd(9, "0")}`;
}

function validSanitizedReason(value) {
  return (
    typeof value === "string" &&
    /^[A-Z0-9][A-Z0-9_.:-]{0,127}$/u.test(value)
  );
}

function commandHasExactFields(command) {
  const expected = COMMAND_FIELDS[command.type];
  if (expected === undefined) {
    return true;
  }
  const actual = Object.keys(command).sort();
  return (
    actual.length === expected.length &&
    expected.every((field) => actual.includes(field))
  );
}

function validatePolicyLayer(name, policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    throw new TypeError(`${name} policy must be an object.`);
  }

  for (const field of Object.keys(policy)) {
    if (!POLICY_FIELDS.has(field)) {
      throw new TypeError(`Unknown policy field \`${field}\` in ${name} policy.`);
    }
  }
  for (const field of BUDGET_FIELDS) {
    if (!Object.hasOwn(policy, field)) {
      throw new TypeError(`${name} policy is missing \`${field}\`.`);
    }
    assertPositiveSafeIntegerOrNull(policy[field], `${name} ${field}`);
  }
  if (
    policy.max_runtime_minutes !== null &&
    policy.max_runtime_minutes > MAX_RUNTIME_MINUTES
  ) {
    throw new TypeError(`${name} max_runtime_minutes exceeds the safe conversion bound.`);
  }
  if (Object.hasOwn(policy, "approval_ttl_minutes")) {
    if (
      !Number.isSafeInteger(policy.approval_ttl_minutes) ||
      policy.approval_ttl_minutes <= 0 ||
      policy.approval_ttl_minutes > 525_600
    ) {
      throw new TypeError(`${name} approval_ttl_minutes must be a bounded positive integer.`);
    }
  }
  if (name === "human" && policy.max_iterations === null) {
    throw new TypeError("Human max_iterations must be a positive safe integer.");
  }
  if (Object.hasOwn(policy, "background_aggregate_policy")) {
    if (name === "human") {
      throw new TypeError("Human policy cannot set background aggregate caps.");
    }
    assertBackgroundAggregatePolicy(
      policy.background_aggregate_policy,
      `${name} background_aggregate_policy`,
    );
  }

  for (const field of [
    "allowlisted_operations",
    "credential_scopes",
    "required_gates",
  ]) {
    if (Object.hasOwn(policy, field)) {
      assertStringArray(policy[field], `${name} ${field}`);
    }
  }
  if (
    Object.hasOwn(policy, "risk") &&
    !RISK_ORDER.includes(policy.risk)
  ) {
    throw new TypeError(`${name} risk is not supported.`);
  }
  if (
    Object.hasOwn(policy, "isolation") &&
    !ISOLATION_ORDER.includes(policy.isolation)
  ) {
    throw new TypeError(`${name} isolation is not supported.`);
  }
  if (
    Object.hasOwn(policy, "expires_at") &&
    !isUtcDateTime(policy.expires_at)
  ) {
    throw new TypeError(`${name} expires_at must be an RFC 3339 UTC date-time.`);
  }
}

function minimumNonNull(policies, field) {
  const values = policies
    .map((policy) => policy[field])
    .filter((value) => value !== null);
  return values.length === 0 ? null : Math.min(...values);
}

function minimumDeclaredNonNull(policies, field) {
  const declared = policies.filter((policy) => Object.hasOwn(policy, field));
  if (declared.length === 0) {
    return undefined;
  }
  const values = declared
    .map((policy) => policy[field])
    .filter((value) => value !== null);
  return values.length === 0 ? null : Math.min(...values);
}

function intersectDeclaredArrays(policies, field) {
  const declared = policies
    .filter((policy) => Object.hasOwn(policy, field))
    .map((policy) => policy[field]);
  if (declared.length === 0) {
    return undefined;
  }
  const [first, ...rest] = declared;
  return [...new Set(first)]
    .filter((value) => rest.every((values) => values.includes(value)))
    .sort();
}

function unionDeclaredArrays(policies, field) {
  const declared = policies.filter((policy) => Object.hasOwn(policy, field));
  if (declared.length === 0) {
    return undefined;
  }
  return [...new Set(declared.flatMap((policy) => policy[field]))].sort();
}

function strongestDeclared(policies, field, order) {
  const values = policies
    .filter((policy) => Object.hasOwn(policy, field))
    .map((policy) => policy[field]);
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((strongest, value) =>
    order.indexOf(value) > order.indexOf(strongest) ? value : strongest,
  );
}

function earliestExpiry(policies) {
  const values = policies
    .filter((policy) => Object.hasOwn(policy, "expires_at"))
    .map((policy) => policy.expires_at);
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((earliest, value) =>
    utcDateTimeSortKey(value) < utcDateTimeSortKey(earliest) ? value : earliest,
  );
}

export function resolveEffectivePolicy({ global, fsd, operation, human } = {}) {
  const namedPolicies = { global, fsd, operation, human };
  for (const [name, policy] of Object.entries(namedPolicies)) {
    validatePolicyLayer(name, policy);
  }
  const policies = Object.values(namedPolicies);

  const effective = Object.fromEntries(
    BUDGET_FIELDS.map((field) => [field, minimumNonNull(policies, field)]),
  );
  if (effective.max_iterations === null) {
    throw new TypeError("Effective max_iterations must be a positive safe integer.");
  }

  const allowlistedOperations = intersectDeclaredArrays(
    policies,
    "allowlisted_operations",
  );
  const credentialScopes = intersectDeclaredArrays(policies, "credential_scopes");
  const requiredGates = unionDeclaredArrays(policies, "required_gates");
  const risk = strongestDeclared(policies, "risk", RISK_ORDER);
  const isolation = strongestDeclared(policies, "isolation", ISOLATION_ORDER);
  const expiresAt = earliestExpiry(policies);
  const approvalTtlMinutes = minimumDeclaredNonNull(
    policies,
    "approval_ttl_minutes",
  );

  if (allowlistedOperations !== undefined) {
    effective.allowlisted_operations = allowlistedOperations;
  }
  if (credentialScopes !== undefined) {
    effective.credential_scopes = credentialScopes;
  }
  if (requiredGates !== undefined) {
    effective.required_gates = requiredGates;
  }
  if (risk !== undefined) {
    effective.risk = risk;
  }
  if (isolation !== undefined) {
    effective.isolation = isolation;
  }
  if (expiresAt !== undefined) {
    effective.expires_at = expiresAt;
  }
  if (approvalTtlMinutes !== undefined) {
    effective.approval_ttl_minutes = approvalTtlMinutes;
  }

  for (const field of COMPLETE_POLICY_FIELDS) {
    if (!Object.hasOwn(effective, field)) {
      throw new TypeError(`Missing mandatory effective policy field \`${field}\`.`);
    }
  }

  return effective;
}

export function loadProjectConfig(text, schema, options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    !new Set([Object.prototype, null]).has(Object.getPrototypeOf(options))
  ) {
    throw new TypeError("Project config load options must be a plain object.");
  }
  const unknownOptions = Object.keys(options).filter(
    (field) => field !== "capabilityAttestationVerified",
  );
  if (unknownOptions.length > 0) {
    throw new TypeError(
      `Unknown project config load option \`${unknownOptions[0]}\`.`,
    );
  }
  const capabilityAttestationVerified =
    options.capabilityAttestationVerified ?? false;
  if (typeof capabilityAttestationVerified !== "boolean") {
    throw new TypeError("capabilityAttestationVerified must be a boolean.");
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return {
      config: null,
      effective_mode: "HALTED",
      errors: ["Project config is missing."],
    };
  }

  let config;
  const configDigest = `sha256:${createHash("sha256").update(text).digest("hex")}`;
  try {
    config = parseJsonDocument(text, schema, "project config");
  } catch (error) {
    return {
      config: null,
      config_digest: configDigest,
      effective_mode: "HALTED",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  const errors = [];
  if (config.telemetry.enabled) {
    const telemetryFields = [
      "purpose",
      "classification",
      "acl",
      "retention_days",
      "max_file_bytes",
      "rotation",
      "redaction_revision",
      "disposition",
      "pricing_revision",
      "pricing_digest",
    ];
    const missingTelemetryFields = telemetryFields.filter(
      (field) => !Object.hasOwn(config.telemetry, field),
    );
    if (missingTelemetryFields.length > 0) {
      errors.push(
        `Telemetry is enabled but missing mandatory configuration: ${missingTelemetryFields.join(", ")}.`,
      );
    }
    if (config.telemetry.persistence_required !== true) {
      errors.push("Telemetry enablement requires fail-closed persistence.");
    }
    for (const aclField of ["read_roles", "write_roles"]) {
      if (
        !Array.isArray(config.telemetry.acl?.[aclField]) ||
        config.telemetry.acl[aclField].length === 0
      ) {
        errors.push(`Telemetry ACL requires at least one ${aclField} entry.`);
      }
    }
  }
  if (
    config.policy.max_cost_micro !== null &&
    (!Object.hasOwn(config.telemetry, "pricing_revision") ||
      !Object.hasOwn(config.telemetry, "pricing_digest"))
  ) {
    errors.push("Finite cost policy requires a pinned telemetry pricing revision and digest.");
  }
  if (config.mode === "ENFORCE") {
    if (
      !Number.isSafeInteger(config.policy.max_runtime_minutes) ||
      config.policy.max_runtime_minutes <= 0
    ) {
      errors.push("ENFORCE requires finite max_runtime_minutes.");
    }
    if (
      !Number.isSafeInteger(config.policy.max_no_progress_iterations) ||
      config.policy.max_no_progress_iterations <= 0
    ) {
      errors.push("ENFORCE requires finite max_no_progress_iterations.");
    }
    if (!capabilityAttestationVerified) {
      errors.push("ENFORCE requires verified host capability attestation.");
    }
  }

  return {
    config,
    config_digest: configDigest,
    effective_mode: errors.length === 0 ? config.mode : "HALTED",
    errors,
  };
}

export const LOOP_RUN_STATES = Object.freeze([
  "READY",
  "RUNNING",
  "OBSERVED",
  "VERIFYING",
  "PAUSED",
  "RESUMING",
  "SUCCESS",
  "BLOCKED",
  "NO_PROGRESS",
  "BUDGET_EXHAUSTED",
  "TIMEOUT",
  "POLICY_STOP",
  "FATAL",
  "UNKNOWN_OUTCOME",
  "CANCELLED",
]);

export const TERMINAL_RUN_STATES = Object.freeze([
  "SUCCESS",
  "BLOCKED",
  "NO_PROGRESS",
  "BUDGET_EXHAUSTED",
  "TIMEOUT",
  "POLICY_STOP",
  "FATAL",
  "UNKNOWN_OUTCOME",
  "CANCELLED",
]);

export const RECONCILIATION_OUTCOMES = Object.freeze([
  "APPLIED",
  "NOT_APPLIED",
  "PARTIALLY_APPLIED",
  "INDETERMINATE",
]);

function cloneState(state) {
  return {
    ...state,
    effective_budget: { ...state.effective_budget },
    counters: { ...state.counters },
    approval: state.approval === null ? null : { ...state.approval },
    verification: { ...state.verification },
    active_action:
      state.active_action === null ? null : { ...state.active_action },
  };
}

function rejectTransition(state, reason) {
  return { accepted: false, state, reason };
}

function acceptTransition(state, changes = {}) {
  if (
    !Number.isSafeInteger(state.version) ||
    state.version < 0 ||
    state.version === Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(state.sequence) ||
    state.sequence < 0 ||
    state.sequence === Number.MAX_SAFE_INTEGER
  ) {
    return rejectTransition(state, "VERSION_OR_SEQUENCE_OVERFLOW");
  }
  const next = cloneState(state);
  Object.assign(next, changes);
  next.version = state.version + 1;
  next.sequence = state.sequence + 1;
  if (!validRunState(next)) {
    return rejectTransition(state, "INVALID_STATE_TRANSITION");
  }
  return { accepted: true, state: next };
}

function validateEffectiveBudget(budget) {
  if (!isPlainObject(budget)) {
    return false;
  }
  const fields = Object.keys(budget);
  if (
    fields.length !== BUDGET_FIELDS.length ||
    fields.some((field) => !BUDGET_FIELDS.includes(field))
  ) {
    return false;
  }
  for (const field of BUDGET_FIELDS) {
    if (!Object.hasOwn(budget, field)) {
      return false;
    }
    try {
      assertPositiveSafeIntegerOrNull(budget[field], field);
    } catch {
      return false;
    }
  }
  return (
    budget.max_iterations !== null &&
    (budget.max_runtime_minutes === null ||
      budget.max_runtime_minutes <= MAX_RUNTIME_MINUTES)
  );
}

function budgetDoesNotLoosen(previous, candidate) {
  return BUDGET_FIELDS.every((field) => {
    const oldValue = previous[field];
    const newValue = candidate[field];
    if (oldValue === null) {
      return true;
    }
    return newValue !== null && newValue <= oldValue;
  });
}

function validateApprovalAt(state, command, phase) {
  if (state.approval === null) {
    return "APPROVAL_REQUIRED";
  }
  if (
    state.approval.phase !== phase ||
    state.approval.confirmation_digest !== command.confirmation_digest
  ) {
    return "APPROVAL_MISMATCH";
  }
  if (
    typeof command.at !== "string" ||
    !isUtcDateTime(command.at)
  ) {
    return "INVALID_OBSERVED_TIME";
  }
  if (
    utcDateTimeSortKey(command.at) >=
    utcDateTimeSortKey(state.approval.expires_at)
  ) {
    return "APPROVAL_EXPIRED";
  }
  return null;
}

function validIdentifier(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)
  );
}

function validDigest(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function validNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validNullableNonNegativeSafeInteger(value) {
  return value === null || validNonNegativeSafeInteger(value);
}

function validRunState(state) {
  if (
    !hasExactFields(state, RUN_STATE_FIELDS) ||
    state.schema !== "loop_run_state_v2" ||
    state.contract_version !== "2.0.0" ||
    !validIdentifier(state.run_id) ||
    !LOOP_RUNTIME_MODES.includes(state.mode) ||
    !LOOP_RUN_STATES.includes(state.status) ||
    !validNonNegativeSafeInteger(state.version) ||
    !validNonNegativeSafeInteger(state.sequence) ||
    !validDigest(state.authority_digest) ||
    !validDigest(state.policy_digest) ||
    !validateEffectiveBudget(state.effective_budget) ||
    !hasExactFields(state.counters, COUNTER_FIELDS)
  ) {
    return false;
  }

  const counters = state.counters;
  if (
    !validNonNegativeSafeInteger(counters.iterations) ||
    !validNonNegativeSafeInteger(counters.active_runtime_ms) ||
    !validNonNegativeSafeInteger(counters.no_progress_iterations) ||
    !validNullableNonNegativeSafeInteger(counters.tokens) ||
    !validNullableNonNegativeSafeInteger(counters.cost_micro) ||
    !new Set(["MEASURED", "UNMEASURED"]).has(counters.token_measurement) ||
    !new Set(["MEASURED", "UNMEASURED"]).has(counters.cost_measurement) ||
    (counters.token_measurement === "MEASURED" && counters.tokens === null) ||
    (counters.token_measurement === "UNMEASURED" && counters.tokens !== null) ||
    (counters.cost_measurement === "MEASURED" && counters.cost_micro === null) ||
    (counters.cost_measurement === "UNMEASURED" && counters.cost_micro !== null) ||
    !validNonNegativeSafeInteger(counters.usage_iteration) ||
    counters.usage_iteration > counters.iterations ||
    !validNonNegativeSafeInteger(counters.usage_receipt_count) ||
    typeof counters.usage_complete !== "boolean" ||
    (counters.usage_completion_digest !== null &&
      !validDigest(counters.usage_completion_digest)) ||
    (counters.usage_iteration === 0 &&
      (counters.usage_receipt_count !== 0 ||
        counters.usage_complete !== true ||
        counters.usage_completion_digest !== null)) ||
    (counters.usage_iteration > 0 &&
      counters.usage_complete &&
      (counters.usage_receipt_count < 1 ||
        !validDigest(counters.usage_completion_digest))) ||
    (counters.usage_iteration > 0 &&
      !counters.usage_complete &&
      counters.usage_completion_digest !== null)
  ) {
    return false;
  }

  if (state.approval !== null) {
    if (
      !hasExactFields(state.approval, APPROVAL_FIELDS) ||
      !validDigest(state.approval.confirmation_digest) ||
      !new Set(["START", "RESUME"]).has(state.approval.phase) ||
      !validNonNegativeSafeInteger(state.approval.expected_run_version) ||
      !isUtcDateTime(state.approval.expires_at)
    ) {
      return false;
    }
  }

  if (
    !hasExactFields(state.verification, VERIFICATION_FIELDS) ||
    !new Set(["NOT_RUN", "PASS", "FAIL", "ERROR", "STALE"]).has(
      state.verification.status,
    ) ||
    typeof state.verification.fresh !== "boolean" ||
    typeof state.verification.gates_satisfied !== "boolean" ||
    (state.verification.fingerprint !== null &&
      !validDigest(state.verification.fingerprint))
  ) {
    return false;
  }

  if (
    state.active_action !== null &&
    (!hasExactFields(state.active_action, ACTIVE_ACTION_FIELDS) ||
      !validIdentifier(state.active_action.action_id) ||
      !validIdentifier(state.active_action.idempotency_key))
  ) {
    return false;
  }
  if (
    state.active_action !== null &&
    !new Set(["RUNNING", "UNKNOWN_OUTCOME"]).has(state.status)
  ) {
    return false;
  }

  return (
    new Set([null, "RUNNING", "OBSERVED", "VERIFYING"]).has(state.paused_from) &&
    (state.terminal_reason === null || validSanitizedReason(state.terminal_reason)) &&
    (state.last_progress_fingerprint === null ||
      validDigest(state.last_progress_fingerprint)) &&
    (state.last_approach_id === null || validIdentifier(state.last_approach_id)) &&
    (state.last_event_hash === null || validDigest(state.last_event_hash))
  );
}

export function createInitialRunState({
  run_id,
  mode,
  authority_digest,
  policy_digest,
  effective_budget,
} = {}) {
  if (!validIdentifier(run_id)) {
    throw new TypeError("run_id must be a safe non-empty identifier.");
  }
  if (!LOOP_RUNTIME_MODES.includes(mode)) {
    throw new TypeError("mode is not supported.");
  }
  if (!validDigest(authority_digest)) {
    throw new TypeError("authority_digest must be a SHA-256 digest.");
  }
  if (!validDigest(policy_digest)) {
    throw new TypeError("policy_digest must be a SHA-256 digest.");
  }
  if (!validateEffectiveBudget(effective_budget)) {
    throw new TypeError("effective_budget is invalid.");
  }

  return {
    schema: "loop_run_state_v2",
    contract_version: "2.0.0",
    run_id,
    mode,
    status: "READY",
    version: 0,
    sequence: 0,
    authority_digest,
    policy_digest,
    effective_budget: { ...effective_budget },
    counters: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      token_measurement: "UNMEASURED",
      cost_micro: null,
      cost_measurement: "UNMEASURED",
      usage_iteration: 0,
      usage_receipt_count: 0,
      usage_complete: true,
      usage_completion_digest: null,
    },
    approval: null,
    verification: {
      status: "NOT_RUN",
      fresh: false,
      gates_satisfied: false,
      fingerprint: null,
    },
    active_action: null,
    paused_from: null,
    terminal_reason: null,
    last_progress_fingerprint: null,
    last_approach_id: null,
    last_event_hash: null,
  };
}

function confirmBudget(state, command) {
  if (!new Set(["START", "RESUME"]).has(command.phase)) {
    return rejectTransition(state, "INVALID_APPROVAL_PHASE");
  }
  const expectedStatus = command.phase === "START" ? "READY" : "PAUSED";
  if (state.status !== expectedStatus) {
    return rejectTransition(state, "INVALID_TRANSITION");
  }
  if (command.expected_run_version !== state.version) {
    return rejectTransition(state, "VERSION_MISMATCH");
  }
  if (
    !validDigest(command.confirmation_digest)
  ) {
    return rejectTransition(state, "INVALID_CONFIRMATION_DIGEST");
  }
  if (
    !isUtcDateTime(command.expires_at)
  ) {
    return rejectTransition(state, "INVALID_APPROVAL_EXPIRY");
  }
  if (!validateEffectiveBudget(command.effective_budget)) {
    return rejectTransition(state, "INVALID_EFFECTIVE_BUDGET");
  }
  if (!budgetDoesNotLoosen(state.effective_budget, command.effective_budget)) {
    return rejectTransition(state, "BUDGET_LOOSENING_FORBIDDEN");
  }

  const counters = { ...state.counters };
  for (const [budgetField, valueField, statusField] of [
    ["max_tokens", "tokens", "token_measurement"],
    ["max_cost_micro", "cost_micro", "cost_measurement"],
  ]) {
    if (
      command.effective_budget[budgetField] !== null &&
      counters[statusField] === "UNMEASURED"
    ) {
      if (command.phase === "RESUME" && counters.iterations > 0) {
        return rejectTransition(state, "UNMEASURED_USAGE_CANNOT_GAIN_FINITE_CAP");
      }
      counters[valueField] = 0;
      counters[statusField] = "MEASURED";
    }
  }
  return acceptTransition(state, {
    effective_budget: { ...command.effective_budget },
    counters,
    approval: {
      confirmation_digest: command.confirmation_digest,
      phase: command.phase,
      expected_run_version: command.expected_run_version,
      expires_at: command.expires_at,
    },
  });
}

function recordUsage(state, command) {
  if (
    !new Set(["RUNNING", "OBSERVED", "VERIFYING"]).has(state.status) ||
    state.counters.iterations < 1 ||
    !isPlainObject(command.receipt) ||
    command.receipt.run_id !== state.run_id ||
    command.receipt.bound_run_head_digest !== state.last_event_hash ||
    command.receipt.iteration !== state.counters.iterations ||
    state.counters.usage_iteration !== state.counters.iterations ||
    state.counters.usage_complete ||
    !isPlainObject(command.receipt.coverage) ||
    command.receipt.coverage.receipt_count !==
      state.counters.usage_receipt_count + 1 ||
    !new Set(["PARTIAL", "COMPLETE"]).has(command.receipt.coverage.status)
  ) {
    return rejectTransition(state, "INVALID_USAGE_RECEIPT_BOUNDARY");
  }
  let usage;
  try {
    usage = applyUsageReceipt(
      {
        tokens: state.counters.tokens,
        token_measurement: state.counters.token_measurement,
        cost_micro: state.counters.cost_micro,
        cost_measurement: state.counters.cost_measurement,
      },
      command.receipt,
    );
  } catch {
    return rejectTransition(state, "INVALID_USAGE_RECEIPT");
  }
  const counters = {
    ...state.counters,
    ...usage,
    usage_receipt_count: command.receipt.coverage.receipt_count,
    usage_complete: command.receipt.coverage.status === "COMPLETE",
    usage_completion_digest:
      command.receipt.coverage.status === "COMPLETE"
        ? command.receipt.coverage.attestation_digest
        : null,
  };
  const unknownRequiredUsage =
    (state.effective_budget.max_tokens !== null &&
      counters.token_measurement !== "MEASURED") ||
    (state.effective_budget.max_cost_micro !== null &&
      counters.cost_measurement !== "MEASURED");
  return acceptTransition(state, {
    counters,
    ...(unknownRequiredUsage
      ? { status: "POLICY_STOP", terminal_reason: "USAGE_MEASUREMENT_UNKNOWN" }
      : {}),
  });
}

function requiresCompleteUsage(state) {
  return (
    state.effective_budget.max_tokens !== null ||
    state.effective_budget.max_cost_micro !== null
  );
}

function hasCompleteCurrentUsage(state) {
  return (
    state.counters.usage_iteration === state.counters.iterations &&
    state.counters.usage_complete
  );
}

function beginAction(state, command) {
  if (state.status !== "RUNNING") {
    return rejectTransition(state, "INVALID_TRANSITION");
  }
  if (state.active_action !== null) {
    return rejectTransition(state, "ACTION_ALREADY_ACTIVE");
  }
  if (
    state.counters.iterations > 0 &&
    requiresCompleteUsage(state) &&
    !hasCompleteCurrentUsage(state)
  ) {
    return acceptTransition(state, {
      status: "POLICY_STOP",
      terminal_reason: "USAGE_ACCOUNTING_INCOMPLETE",
    });
  }
  const approvalReason = validateApprovalAt(
    state,
    command,
    state.approval?.phase ?? "START",
  );
  if (approvalReason !== null) {
    return rejectTransition(state, approvalReason);
  }
  const stop = evaluateStop(state);
  if (stop !== null) {
    return acceptTransition(state, {
      status: stop.terminal_status,
      terminal_reason: stop.reason,
    });
  }
  if (!validIdentifier(command.action_id) || !validIdentifier(command.idempotency_key)) {
    return rejectTransition(state, "INVALID_ACTION_IDENTITY");
  }

  const counters = {
    ...state.counters,
    iterations: state.counters.iterations + 1,
    usage_iteration: state.counters.iterations + 1,
    usage_receipt_count: 0,
    usage_complete: false,
    usage_completion_digest: null,
  };
  return acceptTransition(state, {
    counters,
    active_action: {
      action_id: command.action_id,
      idempotency_key: command.idempotency_key,
    },
  });
}

function observeAction(state, command) {
  if (state.status !== "RUNNING" || state.active_action === null) {
    return rejectTransition(state, "INVALID_TRANSITION");
  }
  if (!Number.isSafeInteger(command.duration_ms) || command.duration_ms < 0) {
    return rejectTransition(state, "INVALID_ACTIVE_RUNTIME");
  }
  const nextRuntime = state.counters.active_runtime_ms + command.duration_ms;
  if (!Number.isSafeInteger(nextRuntime)) {
    return rejectTransition(state, "ACTIVE_RUNTIME_OVERFLOW");
  }
  return acceptTransition(state, {
    status: "OBSERVED",
    active_action: null,
    counters: { ...state.counters, active_runtime_ms: nextRuntime },
  });
}

function recordActiveDuration(state, command, expectedStatus) {
  if (
    state.status !== expectedStatus ||
    (expectedStatus === "RUNNING" && state.active_action !== null)
  ) {
    return rejectTransition(state, "INVALID_TRANSITION");
  }
  if (!Number.isSafeInteger(command.duration_ms) || command.duration_ms < 0) {
    return rejectTransition(state, "INVALID_ACTIVE_RUNTIME");
  }
  const nextRuntime = state.counters.active_runtime_ms + command.duration_ms;
  if (!Number.isSafeInteger(nextRuntime)) {
    return rejectTransition(state, "ACTIVE_RUNTIME_OVERFLOW");
  }
  return acceptTransition(state, {
    counters: { ...state.counters, active_runtime_ms: nextRuntime },
  });
}

export function createProgressFingerprint(observation) {
  if (
    observation === null ||
    typeof observation !== "object" ||
    Array.isArray(observation)
  ) {
    throw new TypeError("progress observation must be an object.");
  }
  const allowed = new Set([
    "verifier_id",
    "verifier_digest",
    "exit_code",
    "normalized_failures",
    "diff_digest",
    "coverage_delta",
    "requirement_delta",
    "approach_id",
  ]);
  for (const field of Object.keys(observation)) {
    if (!allowed.has(field)) {
      throw new TypeError(`Unknown progress field \`${field}\`.`);
    }
  }
  if (
    typeof observation.verifier_id !== "string" ||
    observation.verifier_id.length === 0 ||
    typeof observation.approach_id !== "string" ||
    observation.approach_id.length === 0 ||
    !/^sha256:[a-f0-9]{64}$/u.test(observation.verifier_digest ?? "") ||
    !/^sha256:[a-f0-9]{64}$/u.test(observation.diff_digest ?? "") ||
    !Number.isSafeInteger(observation.exit_code) ||
    observation.exit_code < 0 ||
    !Number.isFinite(observation.coverage_delta) ||
    !Number.isFinite(observation.requirement_delta) ||
    !Array.isArray(observation.normalized_failures) ||
    observation.normalized_failures.length > 100 ||
    observation.normalized_failures.some(
      (failure) => typeof failure !== "string" || failure.length > 1000,
    )
  ) {
    throw new TypeError("progress observation is invalid or unbounded.");
  }

  const normalizedFailures = observation.normalized_failures.map((failure) =>
    redactOperationalText(failure)
      .trim()
      .replace(/\s+/gu, " ")
      .toLowerCase(),
  );
  const normalized = {
    verifier_id: observation.verifier_id,
    verifier_digest: observation.verifier_digest,
    exit_code: observation.exit_code,
    failures: [...new Set(normalizedFailures)].sort(),
  };
  return `sha256:${createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}

export function updateNoProgress(previous, observation) {
  if (
    observation === null ||
    typeof observation !== "object" ||
    Array.isArray(observation)
  ) {
    throw new TypeError("no-progress observation must be an object.");
  }
  const allowedObservationFields = new Set([
    "fingerprint",
    "requirement_delta",
    "coverage_delta",
    "meaningful_diff_count",
    "approach_id",
  ]);
  for (const field of Object.keys(observation)) {
    if (!allowedObservationFields.has(field)) {
      throw new TypeError(`Unknown no-progress field \`${field}\`.`);
    }
  }
  if (
    previous === null ||
    typeof previous !== "object" ||
    Array.isArray(previous) ||
    !Number.isSafeInteger(previous.count) ||
    previous.count < 0 ||
    (previous.fingerprint !== null &&
      !/^sha256:[a-f0-9]{64}$/u.test(previous.fingerprint)) ||
    (previous.approach_id !== null && !validIdentifier(previous.approach_id)) ||
    !/^sha256:[a-f0-9]{64}$/u.test(observation.fingerprint ?? "") ||
    !Number.isSafeInteger(observation.requirement_delta) ||
    !Number.isFinite(observation.coverage_delta) ||
    Math.abs(observation.coverage_delta) > 100 ||
    !Number.isSafeInteger(observation.meaningful_diff_count) ||
    observation.meaningful_diff_count < 0 ||
    !validIdentifier(observation.approach_id)
  ) {
    throw new TypeError("no-progress input is invalid.");
  }

  const hasPositiveDelta =
    observation.requirement_delta > 0 ||
    observation.coverage_delta > 0 ||
    observation.meaningful_diff_count > 0;
  if (hasPositiveDelta) {
    return {
      count: 0,
      fingerprint: observation.fingerprint,
      approach_id: observation.approach_id,
    };
  }
  if (previous.fingerprint === observation.fingerprint) {
    if (previous.count === Number.MAX_SAFE_INTEGER) {
      throw new RangeError("no-progress counter would overflow.");
    }
    return {
      count: previous.count + 1,
      fingerprint: observation.fingerprint,
      approach_id: observation.approach_id,
    };
  }
  return {
    count: previous.count,
    fingerprint: observation.fingerprint,
    approach_id: observation.approach_id,
  };
}

export function evaluateStop(state, { safety_stop = null } = {}) {
  if (safety_stop !== null) {
    if (
      !TERMINAL_RUN_STATES.includes(safety_stop.terminal_status) ||
      safety_stop.terminal_status === "SUCCESS" ||
      typeof safety_stop.reason !== "string" ||
      !validSanitizedReason(safety_stop.reason)
    ) {
      throw new TypeError("safety_stop must name a non-success terminal state and reason.");
    }
    return { ...safety_stop };
  }

  if (
    state.effective_budget.max_runtime_minutes !== null &&
    (!Number.isSafeInteger(state.effective_budget.max_runtime_minutes) ||
      state.effective_budget.max_runtime_minutes <= 0 ||
      state.effective_budget.max_runtime_minutes > MAX_RUNTIME_MINUTES)
  ) {
    return { terminal_status: "POLICY_STOP", reason: "UNSAFE_RUNTIME_LIMIT" };
  }

  if (
    state.verification.status === "PASS" &&
    state.verification.fresh === true &&
    state.verification.gates_satisfied === true
  ) {
    return { terminal_status: "SUCCESS", reason: "GOAL_VERIFIED" };
  }
  if (state.counters.iterations >= state.effective_budget.max_iterations) {
    return { terminal_status: "BUDGET_EXHAUSTED", reason: "MAX_ITERATIONS" };
  }
  if (
    state.effective_budget.max_runtime_minutes !== null &&
    state.counters.active_runtime_ms >=
      state.effective_budget.max_runtime_minutes * 60_000
  ) {
    return { terminal_status: "TIMEOUT", reason: "MAX_RUNTIME_MINUTES" };
  }
  if (
    state.effective_budget.max_no_progress_iterations !== null &&
    state.counters.no_progress_iterations >=
      state.effective_budget.max_no_progress_iterations
  ) {
    return {
      terminal_status: "NO_PROGRESS",
      reason: "MAX_NO_PROGRESS_ITERATIONS",
    };
  }
  if (state.effective_budget.max_tokens !== null) {
    if (state.counters.tokens === null) {
      return {
        terminal_status: "POLICY_STOP",
        reason: "REQUIRED_TOKEN_USAGE_UNMEASURED",
      };
    }
    if (state.counters.tokens >= state.effective_budget.max_tokens) {
      return { terminal_status: "BUDGET_EXHAUSTED", reason: "MAX_TOKENS" };
    }
  }
  if (state.effective_budget.max_cost_micro !== null) {
    if (state.counters.cost_micro === null) {
      return {
        terminal_status: "POLICY_STOP",
        reason: "REQUIRED_COST_USAGE_UNMEASURED",
      };
    }
    if (state.counters.cost_micro >= state.effective_budget.max_cost_micro) {
      return { terminal_status: "BUDGET_EXHAUSTED", reason: "MAX_COST" };
    }
  }
  return null;
}

function verificationFailed(state, command) {
  if (state.status !== "VERIFYING") {
    return rejectTransition(state, "INVALID_TRANSITION");
  }
  if (
    !new Set(["FAIL", "ERROR"]).has(command.verification_status) ||
    !/^sha256:[a-f0-9]{64}$/u.test(command.fingerprint ?? "") ||
    Object.hasOwn(command, "positive_delta") ||
    !Number.isSafeInteger(command.requirement_delta) ||
    !Number.isFinite(command.coverage_delta) ||
    Math.abs(command.coverage_delta) > 100 ||
    !Number.isSafeInteger(command.meaningful_diff_count) ||
    command.meaningful_diff_count < 0 ||
    !validIdentifier(command.approach_id)
  ) {
    return rejectTransition(state, "INVALID_VERIFICATION_FAILURE");
  }

  let noProgress;
  try {
    noProgress = updateNoProgress(
      {
        count: state.counters.no_progress_iterations,
        fingerprint: state.last_progress_fingerprint,
        approach_id: state.last_approach_id,
      },
      {
        fingerprint: command.fingerprint,
        requirement_delta: command.requirement_delta,
        coverage_delta: command.coverage_delta,
        meaningful_diff_count: command.meaningful_diff_count,
        approach_id: command.approach_id,
      },
    );
  } catch (error) {
    if (error instanceof RangeError) {
      return rejectTransition(state, "NO_PROGRESS_COUNTER_OVERFLOW");
    }
    throw error;
  }
  const candidate = cloneState(state);
  candidate.status = "RUNNING";
  candidate.counters.no_progress_iterations = noProgress.count;
  candidate.last_progress_fingerprint = noProgress.fingerprint;
  candidate.last_approach_id = noProgress.approach_id;
  candidate.verification = {
    status: command.verification_status,
    fresh: true,
    gates_satisfied: false,
    fingerprint: command.fingerprint,
  };
  const stop = evaluateStop(candidate);

  return acceptTransition(state, {
    status: stop?.terminal_status ?? "RUNNING",
    terminal_reason: stop?.reason ?? null,
    counters: candidate.counters,
    last_progress_fingerprint: candidate.last_progress_fingerprint,
    last_approach_id: candidate.last_approach_id,
    verification: candidate.verification,
  });
}

export function reduceRunState(state, command) {
  if (!isPlainObject(state)) {
    throw new TypeError("state must be an object.");
  }
  if (!isPlainObject(command)) {
    throw new TypeError("command must be an object.");
  }
  if (!validRunState(state)) {
    return rejectTransition(state, "INVALID_STATE");
  }
  if (!commandHasExactFields(command)) {
    return rejectTransition(state, "INVALID_COMMAND");
  }
  if (state.mode === "HALTED" && command.type !== "RECONCILE") {
    return rejectTransition(state, "POLICY_STOP");
  }

  switch (command.type) {
    case "BUDGET_CONFIRMED":
      return confirmBudget(state, command);
    case "START": {
      if (state.status !== "READY") {
        return rejectTransition(state, "INVALID_TRANSITION");
      }
      if (!new Set(["OBSERVE", "ENFORCE"]).has(state.mode)) {
        return rejectTransition(state, "POLICY_STOP");
      }
      const reason = validateApprovalAt(state, command, "START");
      return reason === null
        ? acceptTransition(state, { status: "RUNNING" })
        : rejectTransition(state, reason);
    }
    case "BEGIN_ACTION":
      return beginAction(state, command);
    case "OBSERVE_ACTION":
      return observeAction(state, command);
    case "BEGIN_VERIFICATION":
      if (state.status !== "OBSERVED") {
        return rejectTransition(state, "INVALID_TRANSITION");
      }
      return acceptTransition(state, { status: "VERIFYING" });
    case "RECORD_OBSERVATION_DURATION":
      return recordActiveDuration(state, command, "OBSERVED");
    case "RECORD_VERIFICATION_DURATION":
      return recordActiveDuration(state, command, "VERIFYING");
    case "RECORD_RESUME_DURATION":
      return recordActiveDuration(state, command, "RESUMING");
    case "RECORD_BACKOFF_DURATION":
      return recordActiveDuration(state, command, "RUNNING");
    case "RECORD_USAGE":
      return recordUsage(state, command);
    case "RECORD_OPERATIONAL_METRIC":
      return TERMINAL_RUN_STATES.includes(state.status)
        ? rejectTransition(state, "RUN_ALREADY_TERMINAL")
        : acceptTransition(state);
    case "RECORD_LEARNING_OUTCOME":
      return TERMINAL_RUN_STATES.includes(state.status) ||
        state.active_action !== null
        ? rejectTransition(state, "UNSAFE_LEARNING_OUTCOME_BOUNDARY")
        : acceptTransition(state);
    case "PROMOTE_VERIFIED_PATTERN":
      return state.status === "SUCCESS" &&
        state.verification.status === "PASS" &&
        state.verification.fresh === true &&
        state.verification.gates_satisfied === true
        ? acceptTransition(state)
        : rejectTransition(state, "FRESH_VERIFIER_PASS_REQUIRED");
    case "VERIFICATION_PASSED": {
      if (state.status !== "VERIFYING") {
        return rejectTransition(state, "INVALID_TRANSITION");
      }
      if (requiresCompleteUsage(state) && !hasCompleteCurrentUsage(state)) {
        return rejectTransition(state, "USAGE_ACCOUNTING_INCOMPLETE");
      }
      try {
        assertReleaseEvidenceForHead(command.release_evidence, state.last_event_hash);
      } catch {
        return rejectTransition(state, "RELEASE_EVIDENCE_INVALID");
      }
      return acceptTransition(state, {
        status: "SUCCESS",
        terminal_reason: "GOAL_VERIFIED",
        verification: {
          status: "PASS",
          fresh: true,
          gates_satisfied: true,
          fingerprint: command.release_evidence.fingerprint,
        },
      });
    }
    case "VERIFICATION_FAILED":
      if (requiresCompleteUsage(state) && !hasCompleteCurrentUsage(state)) {
        return rejectTransition(state, "USAGE_ACCOUNTING_INCOMPLETE");
      }
      return verificationFailed(state, command);
    case "MARK_VERIFICATION_STALE":
      if (
        TERMINAL_RUN_STATES.includes(state.status) ||
        state.active_action !== null ||
        !new Set(["AUTHORITY_DRIFT", "VERIFIER_DRIFT"]).has(command.reason)
      ) {
        return rejectTransition(state, "INVALID_STALE_TRANSITION");
      }
      return acceptTransition(state, {
        status: "POLICY_STOP",
        verification: {
          status: "STALE",
          fresh: false,
          gates_satisfied: false,
          fingerprint: state.verification.fingerprint,
        },
        terminal_reason: command.reason,
      });
    case "PAUSE":
      return new Set(["RUNNING", "OBSERVED", "VERIFYING"]).has(state.status) &&
        state.active_action === null
        ? acceptTransition(state, {
            status: "PAUSED",
            paused_from: state.status,
          })
        : rejectTransition(state, "UNSAFE_PAUSE_BOUNDARY");
    case "RESUME": {
      if (state.status !== "PAUSED") {
        return rejectTransition(state, "INVALID_TRANSITION");
      }
      const reason = validateApprovalAt(state, command, "RESUME");
      if (reason !== null) {
        return rejectTransition(state, reason);
      }
      return new Set(["RUNNING", "OBSERVED", "VERIFYING"]).has(state.paused_from)
        ? acceptTransition(state, { status: "RESUMING" })
        : rejectTransition(state, "INVALID_PAUSE_ORIGIN");
    }
    case "RESUME_COMPLETED": {
      if (state.status !== "RESUMING") {
        return rejectTransition(state, "INVALID_TRANSITION");
      }
      const candidate = cloneState(state);
      candidate.status = state.paused_from;
      candidate.paused_from = null;
      const stop = evaluateStop(candidate);
      return acceptTransition(state, {
        status: stop?.terminal_status ?? candidate.status,
        paused_from: null,
        terminal_reason: stop?.reason ?? null,
      });
    }
    case "STOP":
      if (command.terminal_status === "SUCCESS") {
        return rejectTransition(state, "VERIFIER_SUCCESS_REQUIRED");
      }
      if (
        TERMINAL_RUN_STATES.includes(state.status) ||
        !TERMINAL_RUN_STATES.includes(command.terminal_status) ||
        !validSanitizedReason(command.reason)
      ) {
        return rejectTransition(state, "INVALID_TERMINAL_STOP");
      }
      return acceptTransition(state, {
        status: command.terminal_status,
        terminal_reason: command.reason,
      });
    case "CANCEL":
      if (TERMINAL_RUN_STATES.includes(state.status)) {
        return rejectTransition(state, "RUN_ALREADY_TERMINAL");
      }
      return state.active_action === null
        ? acceptTransition(state, {
            status: "CANCELLED",
            terminal_reason: "CANCELLED_BEFORE_ACTION_INTENT",
          })
        : acceptTransition(state, {
            status: "UNKNOWN_OUTCOME",
            terminal_reason: "CANCEL_AFTER_ACTION_INTENT",
          });
    case "RECONCILE": {
      if (state.status !== "UNKNOWN_OUTCOME") {
        return rejectTransition(state, "RECONCILIATION_NOT_REQUIRED");
      }
      if (
        !RECONCILIATION_OUTCOMES.includes(command.outcome) ||
        !/^sha256:[a-f0-9]{64}$/u.test(command.evidence_digest ?? "")
      ) {
        return rejectTransition(state, "INVALID_RECONCILIATION_EVIDENCE");
      }
      return {
        ...acceptTransition(state),
        event_data: {
          reconciliation_outcome: command.outcome,
          evidence_digest: command.evidence_digest,
        },
      };
    }
    default:
      return rejectTransition(state, "UNKNOWN_COMMAND");
  }
}

export const LOOP_RUNTIME_MODES = Object.freeze([
  "DISABLED",
  "OBSERVE",
  "ENFORCE",
  "HALTED",
]);

export function evaluateProjectModeTransition({
  currentMode,
  targetMode,
  ownerAction,
  configurationValid,
  capabilityAttestationVerified = false,
} = {}) {
  if (!LOOP_RUNTIME_MODES.includes(currentMode)) {
    throw new TypeError("Current mode is not supported.");
  }
  if (!LOOP_RUNTIME_MODES.includes(targetMode)) {
    throw new TypeError("Target mode is not supported.");
  }
  if (typeof ownerAction !== "boolean") {
    throw new TypeError("ownerAction must be a boolean.");
  }
  if (typeof configurationValid !== "boolean") {
    throw new TypeError("configurationValid must be a boolean.");
  }
  if (typeof capabilityAttestationVerified !== "boolean") {
    throw new TypeError("capabilityAttestationVerified must be a boolean.");
  }

  if (targetMode === "HALTED") {
    return { allowed: true, effective_mode: "HALTED", reason: "SAFETY_HALT" };
  }
  if (!ownerAction) {
    return {
      allowed: false,
      effective_mode: currentMode,
      reason: "OWNER_ACTION_REQUIRED",
    };
  }
  if (!configurationValid) {
    return {
      allowed: false,
      effective_mode: currentMode,
      reason: "CONFIG_VALIDATION_REQUIRED",
    };
  }
  if (
    currentMode === "HALTED" &&
    !new Set(["DISABLED", "OBSERVE"]).has(targetMode)
  ) {
    return {
      allowed: false,
      effective_mode: "HALTED",
      reason: "HALTED_RECOVERY_TARGET_REQUIRED",
    };
  }
  if (targetMode === "ENFORCE") {
    if (!capabilityAttestationVerified) {
      return {
        allowed: false,
        effective_mode: currentMode,
        reason: "CAPABILITY_ATTESTATION_REQUIRED",
      };
    }
    if (!new Set(["OBSERVE", "ENFORCE"]).has(currentMode)) {
      return {
        allowed: false,
        effective_mode: currentMode,
        reason: "OBSERVE_PROMOTION_REQUIRED",
      };
    }
    return { allowed: true, effective_mode: "ENFORCE", reason: null };
  }

  const allowedTargets = {
    DISABLED: new Set(["DISABLED", "OBSERVE"]),
    OBSERVE: new Set(["DISABLED", "OBSERVE"]),
    ENFORCE: new Set(["DISABLED", "OBSERVE"]),
    HALTED: new Set(["DISABLED", "OBSERVE"]),
  };
  if (!allowedTargets[currentMode].has(targetMode)) {
    return {
      allowed: false,
      effective_mode: currentMode,
      reason: "INVALID_MODE_TRANSITION",
    };
  }
  return { allowed: true, effective_mode: targetMode, reason: null };
}

function normalizeRepositoryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    throw new TypeError("Write path must be a bounded repository-relative path.");
  }
  if (value.includes("\0")) {
    throw new TypeError("Write path contains an invalid NUL byte.");
  }
  const normalized = value.replaceAll("\\", "/");
  if (/^(?:[A-Za-z]:\/|\/)/u.test(normalized)) {
    throw new TypeError("Write path must be repository-relative, not absolute.");
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new TypeError("Write path contains empty or traversal segments.");
  }
  return segments.join("/");
}

export function classifyRepositoryWrite(
  writeClassification,
  intent = {},
  { caseSensitive = true } = {},
) {
  if (
    writeClassification === null ||
    typeof writeClassification !== "object" ||
    Array.isArray(writeClassification)
  ) {
    throw new TypeError("Write classification policy must be an object.");
  }
  if (intent.external === true) {
    return "external_write";
  }
  if (intent.external !== undefined && intent.external !== false) {
    throw new TypeError("external must be a boolean when provided.");
  }
  if (typeof caseSensitive !== "boolean") {
    throw new TypeError("caseSensitive must be a boolean.");
  }

  const candidate = normalizeRepositoryRelativePath(intent.path);
  const identify = (value) => (caseSensitive ? value : value.toLowerCase());
  const identity = identify(candidate);
  const exactAuthority = new Set(
    writeClassification.authority_exact_paths.map(identify),
  );
  const authorityMatch =
    exactAuthority.has(identity) ||
    writeClassification.authority_prefixes.some((prefix) =>
      identity.startsWith(identify(prefix)),
    ) ||
    /^\.scratch\/[^/]+\/issues\/[^/]+\.md$/u.test(identity) ||
    /^docs\/solutions\/adr-[0-9]{4}-[^/]+\.md$/u.test(identity);
  const auditMatch = writeClassification.runtime_audit_prefixes.some((prefix) =>
    identity.startsWith(identify(prefix)),
  );

  if (authorityMatch && auditMatch) {
    return "implementation_write";
  }
  if (authorityMatch) {
    return "authority_write";
  }
  if (auditMatch) {
    return "runtime_audit_write";
  }
  return "implementation_write";
}
