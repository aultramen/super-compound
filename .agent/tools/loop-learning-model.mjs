import { createHash } from "node:crypto";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ROUTES = new Set([
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
const INTENT_FIELDS = new Set([
  "hypothesis",
  "approach_id",
  "approach_signature_digest",
  "problem_fingerprint",
  "failure_fingerprint",
  "context_fingerprint",
  "predicted_delta",
  "evidence_refs",
  "verified_pattern_refs",
]);
const CONTEXT_FIELDS = new Set([
  "run_id",
  "goal_ref",
  "iteration",
  "pre_action_run_head_digest",
  "recorded_at",
]);
const DELTA_FIELDS = [
  "requirement_count",
  "coverage_basis_points",
  "test_count",
  "meaningful_diff_count",
];
const OUTCOME_FIELDS = new Set([
  "outcome_id",
  "run_id",
  "run_head_digest",
  "dedupe_key",
  "source_signal",
  "prior_duplicate_result",
  "hypothesis",
  "baseline",
  "expected_metric",
  "selected_route",
  "downstream_artifact_refs",
  "owner",
  "experiment_result",
  "decision",
  "decision_reason",
  "compounding_candidate_status",
  "evidence_digest",
  "recorded_at",
]);
const PATTERN_FIELDS = new Set([
  "pattern_id",
  "dedupe_key",
  "source_run_id",
  "source_outcome_id",
  "source_run_head_digest",
  "authority_digest",
  "verifier_digest",
  "evidence_digest",
  "problem_fingerprint",
  "context_fingerprint",
  "approach_id",
  "hypothesis_digest",
  "verifier_status",
  "checker_status",
  "finding_status",
  "human_approval",
  "attribution_status",
  "applicability",
  "owner",
  "verified_at",
  "expires_at",
]);
const SENSITIVE_TEXT = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b(?:ghp_|github_pat_|sk-[A-Za-z0-9_-])[A-Za-z0-9_-]{16,}\b/u,
  /\b(?:BEGIN [A-Z ]+ PRIVATE KEY)\b/u,
  /\b(?:raw\s+prompt|chain[- ]of[- ]thought|private\s+reasoning|hidden\s+reasoning)\s*:/iu,
  /\braw\s+untrusted\s+payload\s*:/iu,
];

function fail(code, detail = "") {
  throw new Error(detail === "" ? code : `${code}: ${detail}`);
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

function assertExactObject(value, fields, code, label) {
  if (!isPlainObject(value)) {
    fail(code, `${label} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) {
      fail(code, `${label} contains unknown field ${key}`);
    }
  }
}

function assertIdentifier(value, code, label) {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    fail(code, `${label} is invalid`);
  }
  return value;
}

function assertDigest(value, code, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(code, `${label} is invalid`);
  }
  return value;
}

function assertTimestamp(value, code, label) {
  if (
    typeof value !== "string" ||
    !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    fail(code, `${label} is invalid`);
  }
  return value;
}

function normalizeText(value, code, label, maximum = 500) {
  if (typeof value !== "string") {
    fail(code, `${label} must be text`);
  }
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized.length === 0 || normalized.length > maximum) {
    fail(code, `${label} length is invalid`);
  }
  if (SENSITIVE_TEXT.some((pattern) => pattern.test(normalized))) {
    fail("LEARNING_PRIVACY_STOP", `${label} contains forbidden content`);
  }
  return normalized;
}

function normalizeDigests(value, code, label, maximum) {
  if (!Array.isArray(value) || value.length > maximum) {
    fail(code, `${label} is not a bounded array`);
  }
  const normalized = [...new Set(value.map((item) => assertDigest(item, code, label)))];
  if (normalized.length !== value.length) {
    fail(code, `${label} contains duplicates`);
  }
  return normalized.sort();
}

function normalizeDelta(value, code, label) {
  assertExactObject(value, new Set(DELTA_FIELDS), code, label);
  const result = {};
  for (const field of DELTA_FIELDS) {
    const candidate = value[field];
    const limit = field === "coverage_basis_points" ? 10_000 : 1_000_000;
    if (!Number.isSafeInteger(candidate) || candidate < -limit || candidate > limit) {
      fail(code, `${label}.${field} is invalid`);
    }
    result[field] = candidate;
  }
  return result;
}

function intentDigestPayload(record) {
  return {
    schema: record.schema,
    contract_version: record.contract_version,
    status: "INTENDED",
    run_id: record.run_id,
    goal_ref: record.goal_ref,
    iteration: record.iteration,
    pre_action_run_head_digest: record.pre_action_run_head_digest,
    hypothesis: record.hypothesis,
    hypothesis_digest: record.hypothesis_digest,
    approach_id: record.approach_id,
    approach_signature_digest: record.approach_signature_digest,
    problem_fingerprint: record.problem_fingerprint,
    failure_fingerprint: record.failure_fingerprint,
    context_fingerprint: record.context_fingerprint,
    predicted_delta: record.predicted_delta,
    actual_delta: null,
    evidence_refs: record.evidence_refs,
    verified_pattern_refs: record.verified_pattern_refs,
    verifier_status: "NOT_RUN",
    progress_verdict: null,
    completed_run_head_digest: null,
    completion_attestation_digest: null,
    omitted_history_digest: null,
    recorded_at: record.recorded_at,
  };
}

function assertIntentIntegrity(record) {
  if (
    !isPlainObject(record) ||
    record.schema !== "iteration_learning_v2" ||
    record.contract_version !== "2.0.0" ||
    (record.omitted_history_digest !== null &&
      !DIGEST_PATTERN.test(record.omitted_history_digest ?? "")) ||
    digestJson(intentDigestPayload(record)) !== record.intent_digest
  ) {
    fail("LEARNING_REPLAY_MISMATCH");
  }
}

export function normalizeLearningIntent(input, context) {
  const code = "LEARNING_INTENT_INVALID";
  assertExactObject(input, INTENT_FIELDS, code, "learning intent");
  assertExactObject(context, CONTEXT_FIELDS, code, "learning context");
  const hypothesis = normalizeText(input.hypothesis, code, "hypothesis");
  const base = {
    schema: "iteration_learning_v2",
    contract_version: "2.0.0",
    status: "INTENDED",
    run_id: assertIdentifier(context.run_id, code, "run_id"),
    goal_ref: normalizeText(context.goal_ref, code, "goal_ref", 256),
    iteration: context.iteration,
    pre_action_run_head_digest: assertDigest(
      context.pre_action_run_head_digest,
      code,
      "pre_action_run_head_digest",
    ),
    hypothesis,
    hypothesis_digest: digestJson(hypothesis),
    approach_id: assertIdentifier(input.approach_id, code, "approach_id"),
    approach_signature_digest: assertDigest(
      input.approach_signature_digest,
      code,
      "approach_signature_digest",
    ),
    problem_fingerprint: assertDigest(
      input.problem_fingerprint,
      code,
      "problem_fingerprint",
    ),
    failure_fingerprint: assertDigest(
      input.failure_fingerprint,
      code,
      "failure_fingerprint",
    ),
    context_fingerprint: assertDigest(
      input.context_fingerprint,
      code,
      "context_fingerprint",
    ),
    predicted_delta: normalizeDelta(input.predicted_delta, code, "predicted_delta"),
    actual_delta: null,
    evidence_refs: normalizeDigests(input.evidence_refs, code, "evidence_refs", 8),
    verified_pattern_refs: normalizeDigests(
      input.verified_pattern_refs,
      code,
      "verified_pattern_refs",
      3,
    ),
    verifier_status: "NOT_RUN",
    progress_verdict: null,
    completed_run_head_digest: null,
    completion_attestation_digest: null,
    omitted_history_digest: null,
    recorded_at: assertTimestamp(context.recorded_at, code, "recorded_at"),
  };
  if (!Number.isSafeInteger(base.iteration) || base.iteration < 1) {
    fail(code, "iteration is invalid");
  }
  return Object.freeze({ ...base, intent_digest: digestJson(base) });
}

export function assertNovelApproach(records, intent) {
  if (!Array.isArray(records)) {
    fail("LEARNING_REPLAY_MISMATCH");
  }
  assertIntentIntegrity(intent);
  for (const record of records) {
    assertIntentIntegrity(record);
  }
  const comparable = records.filter(
    (record) => record.failure_fingerprint === intent.failure_fingerprint,
  );
  const sameApproach = comparable.filter(
    (record) => record.approach_id === intent.approach_id,
  );
  const attemptCounts = new Map();
  for (const record of comparable) {
    attemptCounts.set(
      record.approach_id,
      (attemptCounts.get(record.approach_id) ?? 0) + 1,
    );
  }
  const hasExhaustedApproach = [...attemptCounts.values()].some(
    (attempts) => attempts >= 2,
  );
  if (!hasExhaustedApproach) {
    return Object.freeze({ allowed: true, prior_attempts: sameApproach.length });
  }
  const reusesAnyDimension = comparable.some(
    (record) =>
      record.approach_id === intent.approach_id ||
      record.hypothesis_digest === intent.hypothesis_digest ||
      record.approach_signature_digest === intent.approach_signature_digest,
  );
  if (reusesAnyDimension) {
    fail("NO_NOVEL_APPROACH");
  }
  return Object.freeze({ allowed: true, prior_attempts: sameApproach.length });
}

function hasPositiveDelta(delta) {
  return DELTA_FIELDS.some((field) => delta[field] > 0);
}

export function deriveLearningCompletion(intent, evidence) {
  assertIntentIntegrity(intent);
  const fields = new Set([
    "verifier_status",
    "final_run_head_digest",
    "failure_fingerprint",
    "actual_delta",
    "attestation_digest",
    "attribution_status",
    "comparable_prior",
    "safety_or_policy_failure",
    "recorded_at",
  ]);
  assertExactObject(
    evidence,
    fields,
    "LEARNING_COMPLETION_INVALID",
    "completion evidence",
  );
  if (evidence.attribution_status !== "COMPLETE") {
    fail("UNKNOWN_ATTRIBUTION");
  }
  if (evidence.safety_or_policy_failure === true) {
    fail("LEARNING_ADMISSION_DENIED", "safety or policy stop");
  }
  if (!new Set(["PASS", "FAIL", "ERROR"]).has(evidence.verifier_status)) {
    fail("LEARNING_COMPLETION_INVALID", "verifier_status is invalid");
  }
  const actualDelta = normalizeDelta(
    evidence.actual_delta,
    "LEARNING_COMPLETION_INVALID",
    "actual_delta",
  );
  const samePrior =
    evidence.comparable_prior !== null &&
    evidence.comparable_prior !== undefined &&
    evidence.comparable_prior.failure_fingerprint ===
      evidence.failure_fingerprint &&
    evidence.comparable_prior.approach_signature_digest ===
      intent.approach_signature_digest;
  const progressVerdict =
    evidence.verifier_status === "PASS" || hasPositiveDelta(actualDelta)
      ? "PROGRESS"
      : samePrior
        ? "NO_PROGRESS"
        : "WEAK_PROGRESS";
  const completionRecordedAt = assertTimestamp(
    evidence.recorded_at,
    "LEARNING_COMPLETION_INVALID",
    "recorded_at",
  );
  if (Date.parse(completionRecordedAt) < Date.parse(intent.recorded_at)) {
    fail("LEARNING_COMPLETION_INVALID", "recorded_at predates intent");
  }
  return Object.freeze({
    ...structuredClone(intent),
    status: "COMPLETED",
    actual_delta: actualDelta,
    verifier_status: evidence.verifier_status,
    progress_verdict: progressVerdict,
    completed_run_head_digest: assertDigest(
      evidence.final_run_head_digest,
      "LEARNING_COMPLETION_INVALID",
      "final_run_head_digest",
    ),
    completion_attestation_digest: assertDigest(
      evidence.attestation_digest,
      "LEARNING_COMPLETION_INVALID",
      "attestation_digest",
    ),
    recorded_at: intent.recorded_at,
  });
}

export function compactLearningRecords(records, options = {}) {
  if (!Array.isArray(records)) {
    fail("LEARNING_REPLAY_MISMATCH");
  }
  const maxActiveRecords = Number.isInteger(options.maxActiveRecords) &&
    options.maxActiveRecords >= 1 &&
    options.maxActiveRecords <= 64
    ? options.maxActiveRecords
    : 8;
  for (const record of records) {
    assertIntentIntegrity(record);
  }
  const ordered = [...records].sort(
    (left, right) =>
      left.iteration - right.iteration ||
      left.intent_digest.localeCompare(right.intent_digest),
  );
  const omitted = ordered.slice(0, Math.max(0, ordered.length - maxActiveRecords));
  const carriedDigests = [
    ...new Set(
      ordered
        .map((record) => record.omitted_history_digest)
        .filter((digest) => digest !== null),
    ),
  ];
  if (omitted.length === 0 && carriedDigests.length > 1) {
    fail("LEARNING_REPLAY_MISMATCH");
  }
  const omittedHistoryDigest =
    omitted.length > 0
      ? digestJson(omitted.map((record) => record.intent_digest))
      : (carriedDigests[0] ?? null);
  return Object.freeze({
    active_records: ordered.slice(-maxActiveRecords).map((record) => ({
      ...structuredClone(record),
      omitted_history_digest: omittedHistoryDigest,
    })),
    omitted_history_digest: omittedHistoryDigest,
  });
}

export function normalizeGeniusLoopOutcome(input) {
  const code = "OUTCOME_INVALID";
  assertExactObject(input, OUTCOME_FIELDS, code, "outcome");
  if (!ROUTES.has(input.selected_route)) {
    fail(code, "selected_route is invalid");
  }
  if (
    !new Set(["UNIQUE", "DUPLICATE"]).has(input.prior_duplicate_result) ||
    !new Set(["PASS", "FAIL", "UNKNOWN"]).has(input.experiment_result) ||
    !new Set(["ACCEPTED", "REJECTED", "PENDING"]).has(input.decision) ||
    !new Set(["CANDIDATE", "VERIFIED", "REJECTED"]).has(
      input.compounding_candidate_status,
    )
  ) {
    fail(code, "outcome enum is invalid");
  }
  return Object.freeze({
    schema: "geniusloop_outcome_v2",
    contract_version: "2.0.0",
    outcome_id: assertIdentifier(input.outcome_id, code, "outcome_id"),
    run_id: assertIdentifier(input.run_id, code, "run_id"),
    run_head_digest: assertDigest(input.run_head_digest, code, "run_head_digest"),
    dedupe_key: assertDigest(input.dedupe_key, code, "dedupe_key"),
    source_signal: normalizeText(input.source_signal, code, "source_signal", 256),
    prior_duplicate_result: input.prior_duplicate_result,
    hypothesis: normalizeText(input.hypothesis, code, "hypothesis"),
    baseline: normalizeText(input.baseline, code, "baseline"),
    expected_metric: normalizeText(
      input.expected_metric,
      code,
      "expected_metric",
      256,
    ),
    selected_route: input.selected_route,
    downstream_artifact_refs: normalizeDigests(
      input.downstream_artifact_refs,
      code,
      "downstream_artifact_refs",
      16,
    ),
    owner: assertIdentifier(input.owner, code, "owner"),
    experiment_result: input.experiment_result,
    decision: input.decision,
    decision_reason: normalizeText(
      input.decision_reason,
      code,
      "decision_reason",
      500,
    ),
    compounding_candidate_status: input.compounding_candidate_status,
    evidence_digest: assertDigest(input.evidence_digest, code, "evidence_digest"),
    recorded_at: assertTimestamp(input.recorded_at, code, "recorded_at"),
  });
}

function upsertByDedupe(records, record, conflictCode) {
  if (!Array.isArray(records)) {
    fail(conflictCode);
  }
  const existing = records.find((candidate) => candidate.dedupe_key === record.dedupe_key);
  if (existing === undefined) {
    return Object.freeze({
      records: [...records.map((item) => structuredClone(item)), record],
      record,
      idempotent: false,
    });
  }
  if (JSON.stringify(canonicalize(existing)) !== JSON.stringify(canonicalize(record))) {
    fail(conflictCode);
  }
  return Object.freeze({ records: records.map((item) => structuredClone(item)), record: existing, idempotent: true });
}

export function upsertGeniusLoopOutcome(records, record) {
  return upsertByDedupe(records, record, "OUTCOME_DEDUPE_CONFLICT");
}

export function promoteVerifiedPattern(input, options = {}) {
  const code = "PATTERN_PROMOTION_DENIED";
  assertExactObject(input, PATTERN_FIELDS, code, "pattern");
  const now = assertTimestamp(options.now ?? input.verified_at, code, "now");
  if (
    input.verifier_status !== "PASS" ||
    input.checker_status !== "PASS" ||
    input.finding_status !== "CLOSED" ||
    input.human_approval !== "HOST_ATTESTED" ||
    input.attribution_status !== "COMPLETE" ||
    Date.parse(input.expires_at) <= Date.parse(now)
  ) {
    fail(code);
  }
  if (
    !isPlainObject(input.applicability) ||
    Object.keys(input.applicability).sort().join(",") !==
      "risk_profiles,workflow_routes"
  ) {
    fail(code, "applicability is invalid");
  }
  const riskProfiles = [...new Set(input.applicability.risk_profiles ?? [])].sort();
  const workflowRoutes = [...new Set(input.applicability.workflow_routes ?? [])].sort();
  if (
    riskProfiles.length === 0 ||
    riskProfiles.length > 4 ||
    riskProfiles.some(
      (value) => !new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(value),
    ) ||
    workflowRoutes.length === 0 ||
    workflowRoutes.length > 17 ||
    workflowRoutes.some((value) => !ROUTES.has(value))
  ) {
    fail(code, "applicability is invalid");
  }
  return Object.freeze({
    schema: "verified_pattern_v2",
    contract_version: "2.0.0",
    status: "VERIFIED",
    pattern_id: assertIdentifier(input.pattern_id, code, "pattern_id"),
    dedupe_key: assertDigest(input.dedupe_key, code, "dedupe_key"),
    source_run_id: assertIdentifier(input.source_run_id, code, "source_run_id"),
    source_outcome_id: assertIdentifier(
      input.source_outcome_id,
      code,
      "source_outcome_id",
    ),
    source_run_head_digest: assertDigest(
      input.source_run_head_digest,
      code,
      "source_run_head_digest",
    ),
    authority_digest: assertDigest(input.authority_digest, code, "authority_digest"),
    verifier_digest: assertDigest(input.verifier_digest, code, "verifier_digest"),
    evidence_digest: assertDigest(input.evidence_digest, code, "evidence_digest"),
    problem_fingerprint: assertDigest(
      input.problem_fingerprint,
      code,
      "problem_fingerprint",
    ),
    context_fingerprint: assertDigest(
      input.context_fingerprint,
      code,
      "context_fingerprint",
    ),
    approach_id: assertIdentifier(input.approach_id, code, "approach_id"),
    hypothesis_digest: assertDigest(
      input.hypothesis_digest,
      code,
      "hypothesis_digest",
    ),
    verifier_status: "PASS",
    checker_status: "PASS",
    finding_status: "CLOSED",
    human_approval: "HOST_ATTESTED",
    attribution_status: "COMPLETE",
    applicability: {
      risk_profiles: riskProfiles,
      workflow_routes: workflowRoutes,
    },
    owner: assertIdentifier(input.owner, code, "owner"),
    verified_at: assertTimestamp(input.verified_at, code, "verified_at"),
    expires_at: assertTimestamp(input.expires_at, code, "expires_at"),
  });
}

export function upsertVerifiedPattern(records, record) {
  return upsertByDedupe(records, record, "PATTERN_DEDUPE_CONFLICT");
}

export function retrieveVerifiedPatterns(records, query, options = {}) {
  const now = assertTimestamp(query.now, "PATTERN_RETRIEVAL_DENIED", "now");
  const maxPatterns = Number.isInteger(options.maxPatterns) &&
    options.maxPatterns >= 1 &&
    options.maxPatterns <= 16
    ? options.maxPatterns
    : 3;
  return records
    .filter(
      (record) =>
        record.schema === "verified_pattern_v2" &&
        record.status === "VERIFIED" &&
        record.verifier_status === "PASS" &&
        record.checker_status === "PASS" &&
        record.finding_status === "CLOSED" &&
        record.human_approval === "HOST_ATTESTED" &&
        record.attribution_status === "COMPLETE" &&
        Date.parse(record.expires_at) > Date.parse(now) &&
        record.applicability.risk_profiles.includes(query.risk_profile) &&
        record.applicability.workflow_routes.includes(query.workflow_route),
    )
    .sort((left, right) => {
      const problemRank =
        Number(right.problem_fingerprint === query.problem_fingerprint) -
        Number(left.problem_fingerprint === query.problem_fingerprint);
      const contextRank =
        Number(right.context_fingerprint === query.context_fingerprint) -
        Number(left.context_fingerprint === query.context_fingerprint);
      return (
        problemRank ||
        contextRank ||
        right.verified_at.localeCompare(left.verified_at) ||
        left.dedupe_key.localeCompare(right.dedupe_key)
      );
    })
    .slice(0, maxPatterns)
    .map((record) => structuredClone(record));
}

export function assertLearningAdmission(input) {
  const exact = new Set([
    "approval_valid",
    "write_gate_valid",
    "capability_valid",
    "budget_remaining",
    "release_gate_unchanged",
    "stop_reason",
  ]);
  assertExactObject(input, exact, "LEARNING_ADMISSION_DENIED", "admission");
  if (
    input.approval_valid !== true ||
    input.write_gate_valid !== true ||
    input.capability_valid !== true ||
    input.budget_remaining !== true ||
    input.release_gate_unchanged !== true ||
    input.stop_reason !== null
  ) {
    fail("LEARNING_ADMISSION_DENIED");
  }
  return true;
}
