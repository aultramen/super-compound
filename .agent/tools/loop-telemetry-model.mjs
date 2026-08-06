import { createHash } from "node:crypto";

export const LOOP_TELEMETRY_ROUTES = Object.freeze([
  "sc-init",
  "sc-status",
  "sc-geniusloop",
  "sc-explore",
  "sc-research",
  "sc-prd",
  "sc-plan",
  "sc-eval",
  "sc-go",
  "sc-work",
  "sc-debug",
  "sc-review",
  "sc-audit",
  "sc-compound",
  "sc-evolve",
  "sc-pause",
  "sc-launch",
  "sc-ui",
]);

const RECEIPT_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "receipt_id",
  "run_id",
  "bound_run_head_digest",
  "workflow_route",
  "iteration",
  "attempt",
  "autonomy_profile",
  "risk_profile",
  "contributor",
  "token_usage",
  "cost",
  "reservation",
  "coverage",
  "recorded_at",
]);
const BINDING_FIELDS = Object.freeze([
  "run_id",
  "run_head_digest",
  "iteration",
  "autonomy_profile",
  "risk_profile",
  "billing_currency",
  "pricing_revision",
  "pricing_digest",
  "finite_token_cap",
  "finite_cost_cap",
]);
const TOKEN_FIELDS = Object.freeze([
  "input_tokens",
  "output_tokens",
  "reasoning_tokens",
  "cached_input_tokens",
]);
const SAFE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;
const SENSITIVE_KEYS = new Set([
  "authorization",
  "chain_of_thought",
  "credential",
  "credentials",
  "password",
  "private_key",
  "prompt",
  "raw_payload",
  "raw_prompt",
  "raw_response",
  "reasoning_content",
  "secret",
]);
const SENSITIVE_TEXT_PATTERNS = Object.freeze([
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/giu,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu,
  /\bsk-[A-Za-z0-9_-]{16,}\b/gu,
  /\bAKIA[0-9A-Z]{16}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/giu,
  /\b(?:api[_ -]?key|password|private[_ -]?key|secret|token)\s*[:=]\s*\S+/giu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  /(?<!\d)(?:\+?62|0)8\d{8,11}(?!\d)/gu,
  /(?<!\d)\d{16}(?!\d)/gu,
  /\b(?:raw\s+prompt|chain[- ]of[- ]thought|private\s+reasoning|hidden\s+reasoning)\s*:/giu,
  /\braw\s+untrusted\s+payload\s*:/giu,
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactFields(value, fields) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
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

function isOpaqueHash(value) {
  return (
    validDigest(value) ||
    (typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value))
  );
}

export function redactOperationalText(value) {
  if (typeof value !== "string") {
    throw new TypeError("Operational text must be a string.");
  }
  if (isOpaqueHash(value)) return value;
  let redacted = value;
  const replacements = [
    "[REDACTED_PRIVATE_KEY]",
    "[REDACTED_SECRET]",
    "[REDACTED_SECRET]",
    "[REDACTED_SECRET]",
    "[REDACTED_SECRET]",
    "[REDACTED_SECRET]",
    "[REDACTED_EMAIL]",
    "[REDACTED_PHONE]",
    "[REDACTED_NUMBER]",
    "[REDACTED_SENSITIVE_REASONING]",
    "[REDACTED_RAW_PAYLOAD]",
  ];
  SENSITIVE_TEXT_PATTERNS.forEach((pattern, index) => {
    redacted = redacted.replace(pattern, replacements[index]);
  });
  return redacted;
}

export function assertPrivacySafeRuntimeValue(value, label = "runtime value") {
  const active = new Set();
  let visited = 0;
  const visit = (candidate, key, depth) => {
    visited += 1;
    if (visited > 100_000 || depth > 64) {
      throw new TypeError(`PRIVACY_STOP: ${label} exceeds the safe inspection bound.`);
    }
    if (typeof key === "string" && SENSITIVE_KEYS.has(key.toLowerCase())) {
      throw new TypeError(`PRIVACY_STOP: ${label} contains a forbidden sensitive field.`);
    }
    if (typeof candidate === "string") {
      if (!isOpaqueHash(candidate) && redactOperationalText(candidate) !== candidate) {
        throw new TypeError(`PRIVACY_STOP: ${label} contains forbidden sensitive content.`);
      }
      return;
    }
    if (
      candidate === null ||
      typeof candidate === "boolean" ||
      typeof candidate === "number"
    ) {
      return;
    }
    if (typeof candidate !== "object" || active.has(candidate)) {
      throw new TypeError(`PRIVACY_STOP: ${label} is not bounded plain JSON data.`);
    }
    if (!Array.isArray(candidate) && !isPlainObject(candidate)) {
      throw new TypeError(`PRIVACY_STOP: ${label} is not bounded plain JSON data.`);
    }
    active.add(candidate);
    const entries = Array.isArray(candidate)
      ? candidate.map((entry, index) => [String(index), entry])
      : Object.entries(candidate);
    for (const [entryKey, entry] of entries) {
      visit(entry, Array.isArray(candidate) ? null : entryKey, depth + 1);
    }
    active.delete(candidate);
  };
  visit(value, null, 0);
  return value;
}

function validUtcDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function assertBinding(binding) {
  if (!hasExactFields(binding, BINDING_FIELDS)) {
    throw new TypeError("Usage receipt binding must contain the exact v2 fields.");
  }
  if (
    !validIdentifier(binding.run_id) ||
    !validDigest(binding.run_head_digest) ||
    !Number.isSafeInteger(binding.iteration) ||
    binding.iteration < 1 ||
    !new Set(["INTERACTIVE", "BACKGROUND"]).has(binding.autonomy_profile) ||
    !new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(binding.risk_profile) ||
    typeof binding.billing_currency !== "string" ||
    !/^[A-Z]{3}$/u.test(binding.billing_currency) ||
    (binding.pricing_revision !== null && !validIdentifier(binding.pricing_revision)) ||
    (binding.pricing_digest !== null && !validDigest(binding.pricing_digest)) ||
    typeof binding.finite_token_cap !== "boolean" ||
    typeof binding.finite_cost_cap !== "boolean"
  ) {
    throw new TypeError("Usage receipt binding is invalid or unbounded.");
  }
  if (
    binding.finite_cost_cap &&
    (binding.pricing_revision === null || binding.pricing_digest === null)
  ) {
    throw new TypeError("Finite cost accounting requires pinned pricing authority.");
  }
}

function normalizeMeasuredValue(value, label) {
  if (!hasExactFields(value, ["status", "value"])) {
    throw new TypeError(`${label} must contain status and value.`);
  }
  if (value.status === "UNKNOWN") {
    if (value.value !== null) {
      throw new TypeError(`${label} UNKNOWN value must be null.`);
    }
    return { status: "UNKNOWN", value: null };
  }
  if (
    value.status !== "MEASURED" ||
    !Number.isSafeInteger(value.value) ||
    value.value < 0
  ) {
    throw new TypeError(`${label} MEASURED value must be a non-negative safe integer.`);
  }
  return { status: "MEASURED", value: value.value };
}

function addSafe(left, right, label) {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result > SAFE_INTEGER_MAX) {
    throw new RangeError(`${label} exceeds the safe integer bound.`);
  }
  return result;
}

function conservativeTokenTotal(usage) {
  let total = 0;
  for (const field of TOKEN_FIELDS) {
    if (usage[field].status === "UNKNOWN") return null;
    total = addSafe(total, usage[field].value, "Conservative token total");
  }
  return total;
}

function normalizeCost(cost, binding) {
  if (
    !hasExactFields(cost, [
      "status",
      "micro_units",
      "billing_currency",
      "pricing_revision",
      "pricing_digest",
    ])
  ) {
    throw new TypeError("Usage cost must contain the exact v2 fields.");
  }
  if (
    cost.billing_currency !== binding.billing_currency ||
    cost.pricing_revision !== binding.pricing_revision ||
    cost.pricing_digest !== binding.pricing_digest
  ) {
    throw new TypeError("Usage cost currency or pricing authority is stale.");
  }
  if (cost.status === "UNKNOWN") {
    if (cost.micro_units !== null) {
      throw new TypeError("UNKNOWN cost must use null micro_units.");
    }
    return { ...cost };
  }
  if (
    cost.status !== "MEASURED" ||
    !Number.isSafeInteger(cost.micro_units) ||
    cost.micro_units < 0 ||
    cost.pricing_revision === null ||
    cost.pricing_digest === null
  ) {
    throw new TypeError(
      "MEASURED cost must use non-negative integer micro-units and pinned pricing.",
    );
  }
  return { ...cost };
}

function normalizeReservation(reservation, binding) {
  if (!hasExactFields(reservation, ["status", "attestation_digest"])) {
    throw new TypeError("Usage reservation must contain the exact v2 fields.");
  }
  const finiteCap = binding.finite_token_cap || binding.finite_cost_cap;
  if (finiteCap) {
    if (
      reservation.status !== "VERIFIED" ||
      !validDigest(reservation.attestation_digest)
    ) {
      throw new TypeError("Finite usage caps require a verified reservation attestation.");
    }
  } else if (
    !new Set(["VERIFIED", "NOT_REQUIRED"]).has(reservation.status) ||
    (reservation.status === "VERIFIED" && !validDigest(reservation.attestation_digest)) ||
    (reservation.status === "NOT_REQUIRED" && reservation.attestation_digest !== null)
  ) {
    throw new TypeError("Usage reservation is invalid.");
  }
  return { ...reservation };
}

function normalizeCoverage(coverage) {
  if (
    !hasExactFields(coverage, ["status", "receipt_count", "attestation_digest"]) ||
    !new Set(["PARTIAL", "COMPLETE"]).has(coverage.status) ||
    !Number.isSafeInteger(coverage.receipt_count) ||
    coverage.receipt_count < 1 ||
    (coverage.status === "COMPLETE" && !validDigest(coverage.attestation_digest)) ||
    (coverage.status === "PARTIAL" && coverage.attestation_digest !== null)
  ) {
    throw new TypeError("Usage coverage must be bounded and host-attested when complete.");
  }
  return { ...coverage };
}

export function normalizeUsageReceipt(receipt, binding) {
  assertBinding(binding);
  if (!hasExactFields(receipt, RECEIPT_FIELDS)) {
    throw new TypeError("Usage receipt must contain the exact v2 fields.");
  }
  if (
    receipt.schema !== "usage_receipt_v2" ||
    receipt.contract_version !== "2.0.0" ||
    !validIdentifier(receipt.receipt_id) ||
    receipt.run_id !== binding.run_id ||
    receipt.bound_run_head_digest !== binding.run_head_digest ||
    !LOOP_TELEMETRY_ROUTES.includes(receipt.workflow_route) ||
    receipt.iteration !== binding.iteration ||
    !Number.isSafeInteger(receipt.attempt) ||
    receipt.attempt < 1 ||
    receipt.autonomy_profile !== binding.autonomy_profile ||
    receipt.risk_profile !== binding.risk_profile ||
    !validUtcDateTime(receipt.recorded_at)
  ) {
    throw new TypeError("Usage receipt identity or authority binding is stale or invalid.");
  }
  if (
    !hasExactFields(receipt.contributor, ["kind", "ref"]) ||
    !new Set(["MAIN_AGENT", "CHILD_AGENT"]).has(receipt.contributor.kind) ||
    !validDigest(receipt.contributor.ref)
  ) {
    throw new TypeError("Usage contributor must be an opaque attributed digest.");
  }
  if (!hasExactFields(receipt.token_usage, TOKEN_FIELDS)) {
    throw new TypeError("Token usage must contain every attributed component.");
  }
  const tokenUsage = Object.fromEntries(
    TOKEN_FIELDS.map((field) => [
      field,
      normalizeMeasuredValue(receipt.token_usage[field], `token_usage.${field}`),
    ]),
  );
  tokenUsage.conservative_total_tokens = conservativeTokenTotal(tokenUsage);
  const normalized = {
    ...receipt,
    contributor: { ...receipt.contributor },
    token_usage: tokenUsage,
    cost: normalizeCost(receipt.cost, binding),
    reservation: normalizeReservation(receipt.reservation, binding),
    coverage: normalizeCoverage(receipt.coverage),
  };
  return freezeDeep(normalized);
}

function assertUsageCounters(counters) {
  if (
    !hasExactFields(counters, [
      "tokens",
      "token_measurement",
      "cost_micro",
      "cost_measurement",
    ]) ||
    !new Set(["MEASURED", "UNMEASURED"]).has(counters.token_measurement) ||
    !new Set(["MEASURED", "UNMEASURED"]).has(counters.cost_measurement) ||
    (counters.token_measurement === "MEASURED" &&
      (!Number.isSafeInteger(counters.tokens) || counters.tokens < 0)) ||
    (counters.token_measurement === "UNMEASURED" && counters.tokens !== null) ||
    (counters.cost_measurement === "MEASURED" &&
      (!Number.isSafeInteger(counters.cost_micro) || counters.cost_micro < 0)) ||
    (counters.cost_measurement === "UNMEASURED" && counters.cost_micro !== null)
  ) {
    throw new TypeError("Usage counters are inconsistent.");
  }
}

export function applyUsageReceipt(counters, receipt) {
  assertUsageCounters(counters);
  if (!isPlainObject(receipt?.token_usage) || !isPlainObject(receipt?.cost)) {
    throw new TypeError("A normalized usage receipt is required.");
  }
  const receiptTokens = receipt.token_usage.conservative_total_tokens;
  const tokens =
    counters.token_measurement === "UNMEASURED" || receiptTokens === null
      ? null
      : addSafe(counters.tokens, receiptTokens, "Attributed token usage");
  const costMicro =
    counters.cost_measurement === "UNMEASURED" || receipt.cost.status === "UNKNOWN"
      ? null
      : addSafe(counters.cost_micro, receipt.cost.micro_units, "Attributed cost usage");
  return {
    tokens,
    token_measurement: tokens === null ? "UNMEASURED" : "MEASURED",
    cost_micro: costMicro,
    cost_measurement: costMicro === null ? "UNMEASURED" : "MEASURED",
  };
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  return value;
}

export function usageReceiptDigest(receipt) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalJsonValue(receipt)))
    .digest("hex")}`;
}

export function operationalMetricDigest(metric) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalJsonValue(metric)))
    .digest("hex")}`;
}

function normalizeOperationalMeasurement(measurement, label) {
  if (
    !hasExactFields(measurement, ["status", "value"]) ||
    !new Set(["MEASURED", "UNKNOWN"]).has(measurement.status) ||
    (measurement.status === "MEASURED" &&
      (!Number.isSafeInteger(measurement.value) || measurement.value < 0)) ||
    (measurement.status === "UNKNOWN" && measurement.value !== null)
  ) {
    throw new TypeError(`${label} review coordination measurement is invalid.`);
  }
  return { ...measurement };
}

function expectedPassMetrics(verdicts) {
  const attemptsPassed = verdicts.filter((verdict) => verdict === "PASS").length;
  return {
    k: verdicts.length,
    attempts_total: verdicts.length,
    attempts_passed: attemptsPassed,
    pass_at_k_basis_points: attemptsPassed > 0 ? 10_000 : 0,
    pass_power_k_basis_points: attemptsPassed === verdicts.length ? 10_000 : 0,
  };
}

function normalizeEvalReleasePayload(payload) {
  if (
    !hasExactFields(payload, [
      "accepted_outcome",
      "acceptance_source",
      "eval_result_digest",
      "release_evidence_digest",
      "attempts",
      "targeted",
      "regression",
    ]) ||
    payload.accepted_outcome !== "ACCEPTED" ||
    payload.acceptance_source !== "FRESH_RELEASE_GATE" ||
    !validDigest(payload.eval_result_digest) ||
    !validDigest(payload.release_evidence_digest) ||
    !Array.isArray(payload.attempts) ||
    payload.attempts.length !== 3
  ) {
    throw new TypeError("Eval release metric is invalid or not release-derived.");
  }
  const attemptDigests = new Set();
  const attempts = payload.attempts.map((attempt, index) => {
    if (
      !hasExactFields(attempt, [
        "attempt_number",
        "targeted_verdict",
        "regression_verdict",
        "attempt_digest",
      ]) ||
      attempt.attempt_number !== index + 1 ||
      !new Set(["PASS", "FAIL", "ERROR"]).has(attempt.targeted_verdict) ||
      !new Set([null, "PASS", "FAIL", "ERROR"]).has(attempt.regression_verdict) ||
      !validDigest(attempt.attempt_digest) ||
      attemptDigests.has(attempt.attempt_digest)
    ) {
      throw new TypeError("Eval release attempt evidence is invalid.");
    }
    attemptDigests.add(attempt.attempt_digest);
    return { ...attempt };
  });
  const targeted = expectedPassMetrics(
    attempts.map((attempt) => attempt.targeted_verdict),
  );
  if (
    !hasExactFields(payload.targeted, Object.keys(targeted)) ||
    JSON.stringify(payload.targeted) !== JSON.stringify(targeted)
  ) {
    throw new TypeError("Eval release targeted pass metrics are inconsistent.");
  }
  const regressionVerdicts = attempts.map((attempt) => attempt.regression_verdict);
  const allWithoutRegression = regressionVerdicts.every((verdict) => verdict === null);
  const allWithRegression = regressionVerdicts.every((verdict) => verdict !== null);
  let regression = null;
  if (allWithRegression) {
    regression = expectedPassMetrics(regressionVerdicts);
    if (
      !hasExactFields(payload.regression, Object.keys(regression)) ||
      JSON.stringify(payload.regression) !== JSON.stringify(regression)
    ) {
      throw new TypeError("Eval release regression pass metrics are inconsistent.");
    }
  } else if (!allWithoutRegression || payload.regression !== null) {
    throw new TypeError("Eval release regression evidence is inconsistent.");
  }
  return {
    ...payload,
    attempts,
    targeted,
    regression,
  };
}

export function normalizeOperationalMetric(metric, binding) {
  if (
    !hasExactFields(binding, ["run_id", "run_head_digest", "allowed_kinds"]) ||
    !validIdentifier(binding.run_id) ||
    !validDigest(binding.run_head_digest) ||
    !Array.isArray(binding.allowed_kinds) ||
    binding.allowed_kinds.length === 0 ||
    new Set(binding.allowed_kinds).size !== binding.allowed_kinds.length ||
    binding.allowed_kinds.some(
      (kind) =>
        !new Set(["ROUTE_INVOCATION", "EVAL_RELEASE", "REVIEW_COORDINATION"]).has(kind),
    )
  ) {
    throw new TypeError("Operational metric binding is invalid.");
  }
  if (
    !hasExactFields(metric, [
      "schema",
      "contract_version",
      "metric_id",
      "run_id",
      "bound_run_head_digest",
      "kind",
      "provenance",
      "evidence_digest",
      "recorded_at",
      "payload",
    ]) ||
    metric.schema !== "operational_metric_v2" ||
    metric.contract_version !== "2.0.0" ||
    !validDigest(metric.metric_id) ||
    metric.run_id !== binding.run_id ||
    metric.bound_run_head_digest !== binding.run_head_digest ||
    !binding.allowed_kinds.includes(metric.kind) ||
    metric.provenance !== "HOST_ATTESTED" ||
    !validDigest(metric.evidence_digest) ||
    !validUtcDateTime(metric.recorded_at)
  ) {
    throw new TypeError("Operational metric identity is invalid or kind is not allowed.");
  }

  let payload;
  if (metric.kind === "ROUTE_INVOCATION") {
    if (
      !hasExactFields(metric.payload, ["workflow_route", "surface", "invocation_ref"]) ||
      !LOOP_TELEMETRY_ROUTES.includes(metric.payload.workflow_route) ||
      !new Set(["FULL", "COMPACT"]).has(metric.payload.surface) ||
      !validDigest(metric.payload.invocation_ref)
    ) {
      throw new TypeError("Route invocation metric is invalid.");
    }
    payload = { ...metric.payload };
  } else if (metric.kind === "REVIEW_COORDINATION") {
    if (
      !hasExactFields(metric.payload, [
        "review_cycle_ref",
        "queue_wait_ms",
        "fanout_count",
        "integration_wait_ms",
      ]) ||
      !validDigest(metric.payload.review_cycle_ref)
    ) {
      throw new TypeError("Review coordination metric is invalid.");
    }
    payload = {
      review_cycle_ref: metric.payload.review_cycle_ref,
      queue_wait_ms: normalizeOperationalMeasurement(
        metric.payload.queue_wait_ms,
        "Queue wait",
      ),
      fanout_count: normalizeOperationalMeasurement(
        metric.payload.fanout_count,
        "Fanout",
      ),
      integration_wait_ms: normalizeOperationalMeasurement(
        metric.payload.integration_wait_ms,
        "Integration wait",
      ),
    };
  } else if (metric.kind === "EVAL_RELEASE") {
    payload = normalizeEvalReleasePayload(metric.payload);
  } else {
    throw new TypeError("Operational metric kind is not allowed.");
  }
  const normalized = { ...metric, payload };
  assertPrivacySafeRuntimeValue(normalized, "operational metric");
  return freezeDeep(normalized);
}

function freezeDeep(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

function assertTelemetryCounter(value, status, label) {
  if (
    !new Set(["MEASURED", "UNMEASURED"]).has(status) ||
    (status === "MEASURED" &&
      (!Number.isSafeInteger(value) || value < 0)) ||
    (status === "UNMEASURED" && value !== null)
  ) {
    throw new TypeError(`${label} telemetry counter is inconsistent.`);
  }
}

export function assertSanitizedTelemetryRecord(
  record,
  { run_id: runId, expected_sequence: expectedSequence } = {},
) {
  const fields = [
    "schema",
    "contract_version",
    "run_id",
    "event_head_digest",
    "sequence",
    "version",
    "event_type",
    "recorded_at",
    "autonomy_profile",
    "risk_profile",
    "attribution",
    "metrics",
    "verification",
    "outcome",
    "operational_metric",
  ];
  if (
    !hasExactFields(record, fields) ||
    record.schema !== "loop_telemetry_record_v2" ||
    record.contract_version !== "2.0.0" ||
    record.run_id !== runId ||
    !validIdentifier(record.run_id) ||
    !validDigest(record.event_head_digest) ||
    record.sequence !== expectedSequence ||
    !Number.isSafeInteger(record.sequence) ||
    record.sequence < 1 ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1 ||
    !validIdentifier(record.event_type) ||
    !validUtcDateTime(record.recorded_at) ||
    !new Set(["INTERACTIVE", "BACKGROUND"]).has(record.autonomy_profile) ||
    !new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(record.risk_profile)
  ) {
    throw new TypeError("Telemetry record sequence or contract is invalid.");
  }
  if (
    !hasExactFields(record.attribution, [
      "workflow_route",
      "iteration",
      "attempt",
      "contributor_kind",
      "contributor_ref",
    ]) ||
    (record.attribution.workflow_route !== null &&
      !LOOP_TELEMETRY_ROUTES.includes(record.attribution.workflow_route)) ||
    !Number.isSafeInteger(record.attribution.iteration) ||
    record.attribution.iteration < 0 ||
    (record.attribution.attempt !== null &&
      (!Number.isSafeInteger(record.attribution.attempt) ||
        record.attribution.attempt < 1)) ||
    !new Set([null, "MAIN_AGENT", "CHILD_AGENT"]).has(
      record.attribution.contributor_kind,
    ) ||
    (record.attribution.contributor_kind === null) !==
      (record.attribution.contributor_ref === null) ||
    (record.attribution.contributor_ref !== null &&
      !validDigest(record.attribution.contributor_ref))
  ) {
    throw new TypeError("Telemetry record attribution is invalid.");
  }
  if (
    !hasExactFields(record.metrics, [
      "active_runtime_ms",
      "no_progress_iterations",
      "tokens",
      "cost",
    ]) ||
    !Number.isSafeInteger(record.metrics.active_runtime_ms) ||
    record.metrics.active_runtime_ms < 0 ||
    !Number.isSafeInteger(record.metrics.no_progress_iterations) ||
    record.metrics.no_progress_iterations < 0 ||
    !hasExactFields(record.metrics.tokens, ["status", "value"]) ||
    !hasExactFields(record.metrics.cost, [
      "status",
      "micro_units",
      "billing_currency",
      "pricing_revision",
      "pricing_digest",
    ]) ||
    !/^[A-Z]{3}$/u.test(record.metrics.cost.billing_currency ?? "") ||
    (record.metrics.cost.pricing_revision !== null &&
      !validIdentifier(record.metrics.cost.pricing_revision)) ||
    (record.metrics.cost.pricing_digest !== null &&
      !validDigest(record.metrics.cost.pricing_digest)) ||
    (record.metrics.cost.pricing_revision === null) !==
      (record.metrics.cost.pricing_digest === null)
  ) {
    throw new TypeError("Telemetry record nested metrics are invalid.");
  }
  assertTelemetryCounter(
    record.metrics.tokens.value,
    record.metrics.tokens.status,
    "Token",
  );
  assertTelemetryCounter(
    record.metrics.cost.micro_units,
    record.metrics.cost.status,
    "Cost",
  );
  if (
    record.metrics.cost.status === "MEASURED" &&
    record.metrics.cost.pricing_digest === null
  ) {
    throw new TypeError("Measured telemetry cost requires pinned pricing.");
  }
  if (
    !hasExactFields(record.verification, [
      "status",
      "fresh",
      "gates_satisfied",
      "fingerprint",
    ]) ||
    !new Set(["NOT_RUN", "PASS", "FAIL", "ERROR", "STALE"]).has(
      record.verification.status,
    ) ||
    typeof record.verification.fresh !== "boolean" ||
    typeof record.verification.gates_satisfied !== "boolean" ||
    (record.verification.fingerprint !== null &&
      !validDigest(record.verification.fingerprint)) ||
    !hasExactFields(record.outcome, [
      "run_status",
      "terminal_reason",
      "reconciliation_outcome",
    ]) ||
    !validIdentifier(record.outcome.run_status) ||
    (record.outcome.terminal_reason !== null &&
      !/^[A-Z0-9][A-Z0-9_.:-]{0,127}$/u.test(record.outcome.terminal_reason)) ||
    !new Set([
      null,
      "APPLIED",
      "NOT_APPLIED",
      "PARTIALLY_APPLIED",
      "INDETERMINATE",
    ]).has(record.outcome.reconciliation_outcome)
  ) {
    throw new TypeError("Telemetry record verification or outcome is invalid.");
  }
  if (record.operational_metric !== null) {
    normalizeOperationalMetric(record.operational_metric, {
      run_id: runId,
      run_head_digest: record.operational_metric.bound_run_head_digest,
      allowed_kinds: [
        "ROUTE_INVOCATION",
        "EVAL_RELEASE",
        "REVIEW_COORDINATION",
      ],
    });
  }
  assertPrivacySafeRuntimeValue(record, `telemetry record ${expectedSequence}`);
  return record;
}

export function buildSanitizedTelemetryRecord({
  event,
  state,
  contract,
  billing,
} = {}) {
  if (
    !isPlainObject(event) ||
    !isPlainObject(state) ||
    !isPlainObject(state.counters) ||
    !isPlainObject(state.verification) ||
    !isPlainObject(contract) ||
    !isPlainObject(billing) ||
    event.run_id !== contract.run_id ||
    !validIdentifier(event.run_id) ||
    !validDigest(event.event_hash) ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 1 ||
    !Number.isSafeInteger(event.version) ||
    event.version < 1 ||
    !validIdentifier(event.type) ||
    !validUtcDateTime(event.recorded_at) ||
    !new Set(["INTERACTIVE", "BACKGROUND"]).has(contract.autonomy_profile) ||
    !new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(contract.risk_profile) ||
    typeof billing.currency !== "string" ||
    !/^[A-Z]{3}$/u.test(billing.currency) ||
    (billing.pricing_revision !== null && !validIdentifier(billing.pricing_revision)) ||
    (billing.pricing_digest !== null && !validDigest(billing.pricing_digest))
  ) {
    throw new TypeError("Telemetry record authority input is invalid or unbounded.");
  }
  for (const field of [
    "iterations",
    "active_runtime_ms",
    "no_progress_iterations",
  ]) {
    if (!Number.isSafeInteger(state.counters[field]) || state.counters[field] < 0) {
      throw new TypeError(`Telemetry ${field} counter is invalid.`);
    }
  }
  assertTelemetryCounter(
    state.counters.tokens,
    state.counters.token_measurement,
    "Token",
  );
  assertTelemetryCounter(
    state.counters.cost_micro,
    state.counters.cost_measurement,
    "Cost",
  );
  if (
    !new Set(["NOT_RUN", "PASS", "FAIL", "ERROR", "STALE"]).has(
      state.verification.status,
    ) ||
    typeof state.verification.fresh !== "boolean" ||
    typeof state.verification.gates_satisfied !== "boolean" ||
    (state.verification.fingerprint !== null &&
      !validDigest(state.verification.fingerprint)) ||
    !validIdentifier(state.status) ||
    (state.terminal_reason !== null &&
      (typeof state.terminal_reason !== "string" ||
        !/^[A-Z0-9][A-Z0-9_.:-]{0,127}$/u.test(state.terminal_reason)))
  ) {
    throw new TypeError("Telemetry lifecycle state is invalid.");
  }
  const usageReceipt =
    event.type === "USAGE_RECORDED" && isPlainObject(event.data?.receipt)
      ? event.data.receipt
      : null;
  const reconciliationOutcome =
    event.type === "RECONCILED"
      ? event.data?.reconciliation_outcome ?? null
      : null;
  if (
    reconciliationOutcome !== null &&
    !new Set(["APPLIED", "NOT_APPLIED", "PARTIALLY_APPLIED", "INDETERMINATE"]).has(
      reconciliationOutcome,
    )
  ) {
    throw new TypeError("Telemetry reconciliation outcome is invalid.");
  }
  const rawOperationalMetric =
    event.type === "OPERATIONAL_METRIC_RECORDED"
      ? event.data?.metric ?? null
      : event.type === "VERIFICATION_PASSED"
        ? event.data?.operational_metric ?? null
        : null;
  const operationalMetric =
    rawOperationalMetric === null
      ? null
      : normalizeOperationalMetric(rawOperationalMetric, {
          run_id: event.run_id,
          run_head_digest: event.previous_hash,
          allowed_kinds:
            event.type === "VERIFICATION_PASSED"
              ? ["EVAL_RELEASE"]
              : ["ROUTE_INVOCATION", "REVIEW_COORDINATION"],
        });
  const record = {
    schema: "loop_telemetry_record_v2",
    contract_version: "2.0.0",
    run_id: event.run_id,
    event_head_digest: event.event_hash,
    sequence: event.sequence,
    version: event.version,
    event_type: event.type,
    recorded_at: event.recorded_at,
    autonomy_profile: contract.autonomy_profile,
    risk_profile: contract.risk_profile,
    attribution: {
      workflow_route:
        usageReceipt?.workflow_route ??
        (operationalMetric?.kind === "ROUTE_INVOCATION"
          ? operationalMetric.payload.workflow_route
          : null),
      iteration: state.counters.iterations,
      attempt: usageReceipt?.attempt ?? null,
      contributor_kind: usageReceipt?.contributor?.kind ?? null,
      contributor_ref: usageReceipt?.contributor?.ref ?? null,
    },
    metrics: {
      active_runtime_ms: state.counters.active_runtime_ms,
      no_progress_iterations: state.counters.no_progress_iterations,
      tokens: {
        status: state.counters.token_measurement,
        value: state.counters.tokens,
      },
      cost: {
        status: state.counters.cost_measurement,
        micro_units: state.counters.cost_micro,
        billing_currency: billing.currency,
        pricing_revision: billing.pricing_revision,
        pricing_digest: billing.pricing_digest,
      },
    },
    verification: {
      status: state.verification.status,
      fresh: state.verification.fresh,
      gates_satisfied: state.verification.gates_satisfied,
      fingerprint: state.verification.fingerprint,
    },
    outcome: {
      run_status: state.status,
      terminal_reason: state.terminal_reason,
      reconciliation_outcome: reconciliationOutcome,
    },
    operational_metric: operationalMetric,
  };
  assertSanitizedTelemetryRecord(record, {
    run_id: event.run_id,
    expected_sequence: event.sequence,
  });
  return freezeDeep(record);
}

export function buildWholeRunRetentionPlan({
  run_id,
  event_head_digest,
  telemetry_index_digest,
  authority_digest,
  terminal_status,
  terminal_at,
  now,
  retention_days,
  legal_hold,
  quarantined,
  reconciliation_outcome,
  disposition,
} = {}) {
  const terminalStates = new Set([
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
  if (
    !validIdentifier(run_id) ||
    !validDigest(event_head_digest) ||
    !validDigest(telemetry_index_digest) ||
    !validDigest(authority_digest) ||
    !validUtcDateTime(terminal_at) ||
    !validUtcDateTime(now) ||
    !Number.isSafeInteger(retention_days) ||
    retention_days < 1 ||
    retention_days > 3650 ||
    !new Set([true, false, null]).has(legal_hold) ||
    !new Set([true, false, null]).has(quarantined) ||
    !new Set([
      null,
      "APPLIED",
      "NOT_APPLIED",
      "PARTIALLY_APPLIED",
      "INDETERMINATE",
    ]).has(reconciliation_outcome) ||
    disposition !== "DELETE_DERIVED_TELEMETRY"
  ) {
    throw new TypeError("Whole-run retention input is invalid or unbounded.");
  }
  const terminalMilliseconds = Date.parse(terminal_at);
  const eligibleMilliseconds =
    terminalMilliseconds + retention_days * 24 * 60 * 60 * 1000;
  if (!Number.isSafeInteger(eligibleMilliseconds)) {
    throw new RangeError("Whole-run retention expiry exceeds the safe date bound.");
  }
  const eligibleAt = new Date(eligibleMilliseconds).toISOString();
  let reason = "ELIGIBLE";
  if (legal_hold !== false) {
    reason = legal_hold === true ? "LEGAL_HOLD" : "LEGAL_HOLD_UNKNOWN";
  } else if (quarantined !== false) {
    reason = quarantined === true ? "QUARANTINED" : "QUARANTINE_UNKNOWN";
  } else if (!terminalStates.has(terminal_status)) {
    reason = "NONTERMINAL";
  } else if (
    terminal_status === "UNKNOWN_OUTCOME" &&
    !new Set(["APPLIED", "NOT_APPLIED", "PARTIALLY_APPLIED"]).has(
      reconciliation_outcome,
    )
  ) {
    reason = "RECONCILIATION_REQUIRED";
  } else if (Date.parse(now) < eligibleMilliseconds) {
    reason = "NOT_EXPIRED";
  }
  const plan = {
    schema: "telemetry_retention_plan_v2",
    contract_version: "2.0.0",
    run_id,
    event_head_digest,
    telemetry_index_digest,
    authority_digest,
    terminal_status,
    terminal_at,
    evaluated_at: now,
    retention_days,
    eligible_at: eligibleAt,
    legal_hold,
    quarantined,
    reconciliation_outcome,
    disposition,
    apply_allowed: reason === "ELIGIBLE",
    reason,
  };
  assertPrivacySafeRuntimeValue(plan, "telemetry retention plan");
  return freezeDeep(plan);
}
