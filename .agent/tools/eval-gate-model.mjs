import { createHash } from "node:crypto";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const GIT_SHA_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const RISK_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 });
const RELEASE_GATE_FIELDS = Object.freeze([
  "contract",
  "state",
  "evalResult",
  "ledger",
  "goalId",
  "workspaceHeadGitSha",
  "evalResultDigest",
  "ledgerDigest",
  "assuranceEvidence",
]);
const RELEASE_EVIDENCE_FIELDS = Object.freeze([
  "fingerprint",
  "run_head_digest",
  "eval_result_digest",
  "work_package_digest",
  "work_package_goal_id",
  "finding_set_digest",
  "checker_evidence_digest",
  "workspace_head_git_sha",
]);

function deny(code, message) {
  throw new Error(`${code}: ${message}`);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestJson(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function digestCanonical(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function deriveEvalAttemptDigest(attempt) {
  return digestCanonical(attempt);
}

export function deriveFindingSetDigest(findings) {
  return digestCanonical(findings);
}

function indexAssuranceEvidence(items) {
  if (!Array.isArray(items)) {
    deny("ASSURANCE_EVIDENCE_REQUIRED", "typed assurance evidence must be an array");
  }
  const indexed = new Map();
  for (const item of items) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).length !== 3 ||
      !Object.hasOwn(item, "path") ||
      !Object.hasOwn(item, "digest") ||
      !Object.hasOwn(item, "content") ||
      typeof item.path !== "string" ||
      !DIGEST_PATTERN.test(item.digest ?? "") ||
      !item.content ||
      typeof item.content !== "object" ||
      Array.isArray(item.content) ||
      indexed.has(item.path)
    ) {
      deny("ASSURANCE_EVIDENCE_REQUIRED", "typed assurance evidence is invalid or duplicated");
    }
    indexed.set(item.path, item);
  }
  return indexed;
}

function assertTypedEnvelope(envelope, indexedEvidence, label) {
  const item = indexedEvidence.get(envelope?.evidence_ref);
  if (!item || item.digest !== envelope.evidence_digest) {
    deny("ASSURANCE_EVIDENCE_REQUIRED", `${label} is not bound to a typed artifact`);
  }
  const expected = { ...envelope };
  delete expected.evidence_ref;
  delete expected.evidence_digest;
  if (canonicalJson(item.content) !== canonicalJson(expected)) {
    deny("ASSURANCE_EVIDENCE_REQUIRED", `${label} artifact content does not match its envelope`);
  }
}

export function deriveReleaseFingerprint(evidence) {
  return digestJson({
    run_head_digest: evidence.run_head_digest,
    eval_result_digest: evidence.eval_result_digest,
    work_package_digest: evidence.work_package_digest,
    work_package_goal_id: evidence.work_package_goal_id,
    finding_set_digest: evidence.finding_set_digest,
    checker_evidence_digest: evidence.checker_evidence_digest,
    workspace_head_git_sha: evidence.workspace_head_git_sha,
  });
}

export function assertReleaseEvidenceForHead(evidence, expectedRunHead) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    deny("INVALID_RELEASE_EVIDENCE", "release evidence must be an object");
  }
  const exact = new Set(RELEASE_EVIDENCE_FIELDS);
  if (
    Object.keys(evidence).length !== RELEASE_EVIDENCE_FIELDS.length ||
    Object.keys(evidence).some((field) => !exact.has(field))
  ) {
    deny("INVALID_RELEASE_EVIDENCE", "release evidence fields are not exact");
  }
  for (const field of [
    "fingerprint",
    "run_head_digest",
    "eval_result_digest",
    "work_package_digest",
    "finding_set_digest",
  ]) {
    assertDigest(evidence[field], field);
  }
  if (
    evidence.checker_evidence_digest !== null &&
    !DIGEST_PATTERN.test(evidence.checker_evidence_digest ?? "")
  ) {
    deny("INVALID_RELEASE_EVIDENCE", "checker evidence digest is invalid");
  }
  if (!IDENTIFIER_PATTERN.test(evidence.work_package_goal_id ?? "")) {
    deny("INVALID_RELEASE_EVIDENCE", "work-package goal identity is invalid");
  }
  if (!GIT_SHA_PATTERN.test(evidence.workspace_head_git_sha ?? "")) {
    deny("INVALID_RELEASE_EVIDENCE", "workspace head Git SHA is invalid");
  }
  if (evidence.run_head_digest !== expectedRunHead) {
    deny("STALE_RELEASE_EVIDENCE", "release evidence run head is stale");
  }
  if (evidence.fingerprint !== deriveReleaseFingerprint(evidence)) {
    deny("INVALID_RELEASE_EVIDENCE", "release evidence fingerprint mismatch");
  }
  return evidence;
}

function assertDigest(value, label) {
  if (!DIGEST_PATTERN.test(value ?? "")) {
    deny("INVALID_RELEASE_EVIDENCE", `${label} must be a SHA-256 digest`);
  }
}

function unprefixed(digest) {
  assertDigest(digest, "authority digest");
  return digest.slice("sha256:".length);
}

function sameBundle(left, right) {
  return ["authorityDigest", "evalDigest", "reviewerDigest"].every(
    (field) => left?.[field] === right?.[field],
  );
}

function parseTimestamp(value, label) {
  const timestamp = Date.parse(value ?? "");
  if (!Number.isFinite(timestamp)) {
    deny("INVALID_RELEASE_EVIDENCE", `${label} timestamp is invalid`);
  }
  return timestamp;
}

function expectedThreshold(evalClass) {
  if (evalClass === "CAPABILITY") {
    return { metric: "PASS_AT_K", k: 3, minimum_basis_points: 9000 };
  }
  if (evalClass === "REGRESSION" || evalClass === "CRITICAL_SAFETY") {
    return { metric: "PASS_POWER_K", k: 3, minimum_basis_points: 10000 };
  }
  deny("EVAL_THRESHOLD_MISMATCH", "eval class is not pinned by policy");
}

function assertAttempts(evalResult, contract, state, workspaceHeadGitSha) {
  const pinned = contract.verifier?.success_threshold;
  const policyThreshold = expectedThreshold(contract.verifier?.eval_class);
  const mediumComposite = contract.risk_profile === "MEDIUM";
  if (
    canonicalJson(pinned) !== canonicalJson(policyThreshold) ||
    evalResult.eval_class !== contract.verifier.eval_class ||
    canonicalJson(evalResult.success_threshold) !== canonicalJson(pinned)
  ) {
    deny("EVAL_THRESHOLD_MISMATCH", "eval class and threshold must match pinned verifier policy");
  }
  if (!Array.isArray(evalResult.attempts) || evalResult.attempts.length !== pinned.k) {
    deny("EVAL_THRESHOLD_MISMATCH", "exactly three clean-reset attempts are required");
  }
  let passed = 0;
  let regressionPassed = 0;
  let lastCompleted = Number.NEGATIVE_INFINITY;
  const resetIds = new Set();
  if (mediumComposite) {
    if (
      contract.verifier.eval_class !== "CAPABILITY" ||
      canonicalJson(pinned) !== canonicalJson(expectedThreshold("CAPABILITY")) ||
      !DIGEST_PATTERN.test(contract.verifier.regression_verifier_digest ?? "") ||
      contract.verifier.regression_verifier_digest === contract.verifier.digest ||
      evalResult.regression_pass_metrics === null
    ) {
      deny(
        "COMPOSITE_EVAL_REQUIRED",
        "MEDIUM release requires distinct targeted capability plus regression evidence",
      );
    }
  } else if (
    contract.verifier.regression_verifier_digest !== null ||
    evalResult.regression_pass_metrics !== null
  ) {
    deny("COMPOSITE_EVAL_FORBIDDEN", "non-MEDIUM release cannot smuggle composite eval evidence");
  }
  for (const [index, attempt] of evalResult.attempts.entries()) {
    if (attempt.attempt_number !== index + 1) {
      deny("ATTEMPT_SEQUENCE_MISMATCH", "attempt sequence must be contiguous from one");
    }
    if (attempt.verifier_digest !== contract.verifier.digest) {
      deny("ATTEMPT_VERIFIER_MISMATCH", "attempt verifier does not match the pinned verifier");
    }
    if (
      !IDENTIFIER_PATTERN.test(attempt.reset_id ?? "") ||
      resetIds.has(attempt.reset_id) ||
      attempt.reset_attestation !== "HOST_ATTESTED_CLEAN_RESET" ||
      attempt.run_head_digest !== state.last_event_hash ||
      attempt.workspace_head_git_sha !== workspaceHeadGitSha
    ) {
      deny("CLEAN_RESET_REQUIRED", "three distinct current-head host-attested clean resets are required");
    }
    resetIds.add(attempt.reset_id);
    const started = parseTimestamp(attempt.started_at, "attempt start");
    const completed = parseTimestamp(attempt.completed_at, "attempt completion");
    if (completed < started || started < lastCompleted) {
      deny("ATTEMPT_TIMESTAMP_MISMATCH", "attempt timestamps are not monotonic");
    }
    lastCompleted = completed;
    if (attempt.verdict === "PASS") passed += 1;
    if (mediumComposite) {
      if (
        !attempt.regression ||
        attempt.regression.verifier_digest !== contract.verifier.regression_verifier_digest
      ) {
        deny(
          "COMPOSITE_EVAL_REQUIRED",
          "MEDIUM release requires targeted capability plus regression evidence in every reset",
        );
      }
      if (attempt.regression.verdict === "PASS") regressionPassed += 1;
    } else if (attempt.regression !== null) {
      deny("COMPOSITE_EVAL_FORBIDDEN", "non-MEDIUM attempt cannot contain regression evidence");
    }
  }
  if (evalResult.attempts.at(-1).verdict !== "PASS") {
    deny("FRESH_VERIFIER_PASS_REQUIRED", "final attempt must be PASS");
  }
  if (parseTimestamp(evalResult.recorded_at, "eval recorded_at") < lastCompleted) {
    deny("ATTEMPT_TIMESTAMP_MISMATCH", "eval was recorded before its final attempt");
  }
  const expectedMetrics = {
    attempts_total: evalResult.attempts.length,
    attempts_passed: passed,
    pass_at_k_basis_points: passed > 0 ? 10000 : 0,
    pass_power_k_basis_points: passed === evalResult.attempts.length ? 10000 : 0,
  };
  if (
    !Object.entries(expectedMetrics).every(
      ([field, expected]) => evalResult.pass_metrics?.[field] === expected,
    )
  ) {
    deny("PASS_METRICS_MISMATCH", "pass metrics must be recomputed from attempts");
  }
  const selectedMetric =
    pinned.metric === "PASS_AT_K"
      ? expectedMetrics.pass_at_k_basis_points
      : expectedMetrics.pass_power_k_basis_points;
  if (selectedMetric < pinned.minimum_basis_points) {
    deny("EVAL_THRESHOLD_NOT_MET", "the pinned eval threshold is not satisfied");
  }
  if (mediumComposite) {
    const expectedRegressionMetrics = {
      attempts_total: evalResult.attempts.length,
      attempts_passed: regressionPassed,
      pass_at_k_basis_points: regressionPassed > 0 ? 10000 : 0,
      pass_power_k_basis_points:
        regressionPassed === evalResult.attempts.length ? 10000 : 0,
    };
    if (
      !Object.entries(expectedRegressionMetrics).every(
        ([field, expected]) => evalResult.regression_pass_metrics?.[field] === expected,
      )
    ) {
      deny("PASS_METRICS_MISMATCH", "regression pass metrics must be recomputed");
    }
    if (expectedRegressionMetrics.pass_power_k_basis_points !== 10000) {
      deny("COMPOSITE_EVAL_NOT_MET", "MEDIUM regression requires pass^3 = 100%");
    }
  }
  const finalAttempt = evalResult.attempts.at(-1);
  return {
    finalAttempt,
    finalAttemptDigest: deriveEvalAttemptDigest(finalAttempt),
    finalCompletedAt: lastCompleted,
  };
}

function assertArtifactRevision(evalResult, contract) {
  const expectedDigests = {
    PRD: contract.authority.prd_digest,
    FSD: contract.authority.fsd_digest,
    ISSUE: contract.goal.digest,
    EVAL: contract.verifier.eval_definition_digest,
  };
  const revision = evalResult.artifact_revision;
  if (!revision || revision.digest !== expectedDigests[revision.artifact_type]) {
    deny("STALE_RELEASE_EVIDENCE", "artifact revision digest is stale");
  }
}

function assertChecker(checker, evalResult, contract, state, workspaceHeadGitSha, attempt, evidence) {
  if (
    checker?.verdict !== "PASS" ||
    checker.read_only !== true ||
    checker.attestation !== "HOST_ATTESTED_INDEPENDENT_READ_ONLY" ||
    !DIGEST_PATTERN.test(checker.evidence_digest ?? "")
  ) {
    deny("CHECKER_PASS_REQUIRED", "a fresh host-attested read-only checker PASS is required");
  }
  if (!IDENTIFIER_PATTERN.test(checker.checker_id ?? "")) {
    deny("CHECKER_PASS_REQUIRED", "checker identity is invalid");
  }
  if (checker.checker_id === evalResult.maker_actor_id) {
    deny("CHECKER_INDEPENDENCE_REQUIRED", "maker and checker must be distinct actors");
  }
  if (
    checker.run_id !== contract.run_id ||
    checker.goal_ref !== contract.goal.ref ||
    checker.eval_definition_digest !== contract.verifier.eval_definition_digest ||
    checker.run_head_digest !== state.last_event_hash ||
    checker.workspace_head_git_sha !== workspaceHeadGitSha ||
    checker.final_attempt_number !== attempt.finalAttempt.attempt_number ||
    checker.final_attempt_digest !== attempt.finalAttemptDigest
  ) {
    deny("CHECKER_BINDING_MISMATCH", "checker binding is stale or belongs to another release");
  }
  const verifiedAt = parseTimestamp(checker.verified_at, "checker verification");
  const recordedAt = parseTimestamp(evalResult.recorded_at, "eval recorded_at");
  if (verifiedAt < attempt.finalCompletedAt || verifiedAt > recordedAt) {
    deny("CHECKER_BINDING_MISMATCH", "checker must verify the final attempt before eval recording");
  }
  assertTypedEnvelope(checker, evidence, "checker evidence");
}

function collectHumanGates(evalResult, contract, state, workspaceHeadGitSha, attempt, evidence) {
  if (!Array.isArray(evalResult.human_gates)) {
    deny("HUMAN_GATE_REQUIRED", "human gates must be an array");
  }
  const gates = new Map();
  for (const gate of evalResult.human_gates) {
    if (gates.has(gate.gate_id)) {
      deny("DUPLICATE_HUMAN_GATE", `duplicate human gate ${gate.gate_id}`);
    }
    if (gate.status === "PASS") {
      if (
        !IDENTIFIER_PATTERN.test(gate.approver_id ?? "") ||
        !DIGEST_PATTERN.test(gate.evidence_digest ?? "") ||
        gate.attestation !== "HOST_ATTESTED_HUMAN" ||
        gate.run_id !== contract.run_id ||
        gate.goal_ref !== contract.goal.ref ||
        gate.eval_definition_digest !== contract.verifier.eval_definition_digest ||
        gate.run_head_digest !== state.last_event_hash ||
        gate.workspace_head_git_sha !== workspaceHeadGitSha ||
        gate.risk_profile !== contract.risk_profile ||
        gate.final_attempt_number !== attempt.finalAttempt.attempt_number ||
        gate.final_attempt_digest !== attempt.finalAttemptDigest
      ) {
        deny("HUMAN_ATTESTATION_REQUIRED", `${gate.gate_id} PASS lacks current host attestation`);
      }
      const approvedAt = parseTimestamp(gate.approved_at, `${gate.gate_id} approval`);
      const expiresAt = parseTimestamp(gate.expires_at, `${gate.gate_id} expiry`);
      const recordedAt = parseTimestamp(evalResult.recorded_at, "eval recorded_at");
      if (
        approvedAt < attempt.finalCompletedAt ||
        approvedAt > recordedAt ||
        expiresAt <= recordedAt
      ) {
        deny("HUMAN_ATTESTATION_REQUIRED", `${gate.gate_id} approval is stale or expired`);
      }
      assertTypedEnvelope(gate, evidence, `${gate.gate_id} evidence`);
    } else if (
      gate.status !== "NOT_APPLICABLE" ||
      Object.entries(gate).some(
        ([field, value]) => !new Set(["gate_id", "status"]).has(field) && value !== null,
      )
    ) {
      deny("HUMAN_GATE_REQUIRED", `${gate.gate_id} is not satisfied`);
    }
    gates.set(gate.gate_id, gate);
  }
  return gates;
}

function requirePassingGate(gates, gateId) {
  const gate = gates.get(gateId);
  if (gate?.status !== "PASS") {
    deny("HUMAN_GATE_REQUIRED", `${gateId} PASS is required`);
  }
  return gate;
}

function assertRiskGates(evalResult, contract, state, workspaceHeadGitSha, attempt, evidence) {
  if (!Object.hasOwn(RISK_ORDER, contract.risk_profile)) {
    deny("RISK_GATE_REQUIRED", "run risk profile is invalid");
  }
  if (!new Set(["DETERMINISTIC", "SUBJECTIVE"]).has(evalResult.evaluation_mode)) {
    deny("RISK_GATE_REQUIRED", "evaluation mode is invalid");
  }
  if (!IDENTIFIER_PATTERN.test(evalResult.maker_actor_id ?? "")) {
    deny("CHECKER_INDEPENDENCE_REQUIRED", "maker actor identity is invalid");
  }
  if (contract.risk_profile === "CRITICAL" && contract.autonomy_profile === "BACKGROUND") {
    deny("RISK_GATE_REQUIRED", "CRITICAL work cannot use autonomous background dispatch");
  }
  const checkerRequired =
    contract.autonomy_profile === "BACKGROUND" ||
    RISK_ORDER[contract.risk_profile] >= RISK_ORDER.HIGH ||
    (contract.risk_profile === "MEDIUM" && evalResult.evaluation_mode === "SUBJECTIVE");
  if (checkerRequired && evalResult.checker === null) {
    deny("CHECKER_PASS_REQUIRED", "an independent checker is required");
  }
  const recordedAt = parseTimestamp(evalResult.recorded_at, "eval recorded_at");
  if (evalResult.checker !== null) {
    assertChecker(
      evalResult.checker,
      evalResult,
      contract,
      state,
      workspaceHeadGitSha,
      attempt,
      evidence,
    );
  }
  const gates = collectHumanGates(
    evalResult,
    contract,
    state,
    workspaceHeadGitSha,
    attempt,
    evidence,
  );
  const highAssuranceRequired =
    contract.autonomy_profile === "BACKGROUND" ||
    RISK_ORDER[contract.risk_profile] >= RISK_ORDER.HIGH;
  if (!highAssuranceRequired) return;

  const technical = requirePassingGate(gates, "technical-approval");
  const security = requirePassingGate(gates, "security-comprehension-approval");
  const protectedActors = new Set([
    evalResult.maker_actor_id,
    evalResult.checker.checker_id,
  ]);
  if (
    technical.approver_id === security.approver_id ||
    protectedActors.has(technical.approver_id) ||
    protectedActors.has(security.approver_id)
  ) {
    deny("HUMAN_GATE_INDEPENDENCE_REQUIRED", "distinct human approvers are required");
  }
  if (contract.risk_profile === "CRITICAL") {
    const recovery = requirePassingGate(gates, "recovery-drill");
    if (protectedActors.has(recovery.approver_id)) {
      deny("HUMAN_GATE_INDEPENDENCE_REQUIRED", "recovery-drill approver is not independent");
    }
  }
}

function assertFindings(evalResult, contract, state, workspaceHeadGitSha, attempt, evidence) {
  if (!Array.isArray(evalResult.findings)) {
    deny("OPEN_FINDING", "findings must be an array");
  }
  const inventory = evalResult.finding_inventory;
  const sourceRecords = evalResult.findings.map((finding) => ({
    source_finding_id: finding.source_finding_id,
    source_run_id: finding.source_run_id,
    original_verifier_ref: finding.original_verifier?.ref,
    original_verifier_digest: finding.original_verifier?.digest,
    original_verifier_actor_id: finding.original_verifier?.actor_id,
  }));
  const findingSetDigest = deriveFindingSetDigest(evalResult.findings);
  const inventoryRecordedAt = parseTimestamp(inventory?.recorded_at, "finding inventory");
  const evalRecordedAt = parseTimestamp(evalResult.recorded_at, "eval recorded_at");
  if (
    inventory?.attestation !== "HOST_ATTESTED_COMPLETE_FINDING_SET" ||
    inventory.run_id !== contract.run_id ||
    inventory.goal_ref !== contract.goal.ref ||
    inventory.eval_definition_digest !== contract.verifier.eval_definition_digest ||
    inventory.run_head_digest !== state.last_event_hash ||
    inventory.workspace_head_git_sha !== workspaceHeadGitSha ||
    inventory.final_attempt_number !== attempt.finalAttempt.attempt_number ||
    inventory.final_attempt_digest !== attempt.finalAttemptDigest ||
    inventory.finding_set_digest !== findingSetDigest ||
    canonicalJson(inventory.source_records) !== canonicalJson(sourceRecords) ||
    inventoryRecordedAt < attempt.finalCompletedAt ||
    inventoryRecordedAt > evalRecordedAt
  ) {
    deny("FINDING_INVENTORY_REQUIRED", "finding inventory is incomplete or stale");
  }
  assertTypedEnvelope(inventory, evidence, "finding inventory");
  const findingIds = new Set();
  const sourceIds = new Set();
  for (const finding of evalResult.findings) {
    const sourceKey = `${finding.source_run_id}:${finding.source_finding_id}`;
    if (findingIds.has(finding.finding_id) || sourceIds.has(sourceKey)) {
      deny("INVALID_FINDING", `duplicate finding ${finding.finding_id}`);
    }
    findingIds.add(finding.finding_id);
    sourceIds.add(sourceKey);
    if (finding.outcome !== "CLOSED") {
      deny("OPEN_FINDING", "open finding blocks release");
    }
    const original = finding.original_verifier;
    const returned = finding.return_gate;
    if (
      !returned ||
      returned.verifier_ref !== original?.ref ||
      returned.verifier_digest !== original?.digest ||
      returned.verifier_actor_id !== original?.actor_id ||
      returned.verdict !== "PASS"
    ) {
      deny("ORIGINAL_VERIFIER_REQUIRED", "finding requires a fresh original verifier PASS");
    }
    if (
      returned.verifier_actor_id === finding.owner_id ||
      returned.verifier_actor_id === evalResult.maker_actor_id
    ) {
      deny("SELF_REPORT_FORBIDDEN", "self-report cannot close a finding");
    }
    if (
      !Number.isSafeInteger(finding.max_closure_cycles) ||
      finding.max_closure_cycles <= 0 ||
      !Number.isSafeInteger(returned.closure_cycle) ||
      returned.closure_cycle <= 0 ||
      returned.closure_cycle > finding.max_closure_cycles
    ) {
      deny("CLOSURE_CYCLE_EXCEEDED", "finding closure cycle exceeds its maximum");
    }
    if (
      returned.attestation !== "HOST_ATTESTED_ORIGINAL_VERIFIER" ||
      returned.run_id !== contract.run_id ||
      returned.goal_ref !== contract.goal.ref ||
      returned.eval_definition_digest !== contract.verifier.eval_definition_digest ||
      returned.run_head_digest !== state.last_event_hash ||
      returned.workspace_head_git_sha !== workspaceHeadGitSha ||
      returned.source_finding_id !== finding.source_finding_id ||
      returned.source_run_id !== finding.source_run_id ||
      returned.final_attempt_number !== attempt.finalAttempt.attempt_number ||
      returned.final_attempt_digest !== attempt.finalAttemptDigest
    ) {
      deny("ORIGINAL_VERIFIER_BINDING_MISMATCH", "original verifier return gate binding is stale");
    }
    const verifiedAt = parseTimestamp(returned.verified_at, "original verifier return");
    if (verifiedAt < attempt.finalCompletedAt || verifiedAt > evalRecordedAt) {
      deny("ORIGINAL_VERIFIER_BINDING_MISMATCH", "original verifier return is not fresh");
    }
    assertTypedEnvelope(returned, evidence, "original verifier return");
  }
  return findingSetDigest;
}

function assertPrimaryBindings({
  contract,
  state,
  evalResult,
  workspaceHeadGitSha,
  assuranceEvidence,
}) {
  if (state?.status !== "VERIFYING" || !DIGEST_PATTERN.test(state.last_event_hash ?? "")) {
    deny("INVALID_RELEASE_STATE", "release evaluation requires a VERIFYING event head");
  }
  if (evalResult?.verdict !== "PASS" || evalResult.fresh !== true) {
    deny("FRESH_VERIFIER_PASS_REQUIRED", "fresh verifier PASS required");
  }
  const bindings = [
    [evalResult.run_id, contract.run_id, "run"],
    [evalResult.goal_ref, contract.goal.ref, "goal"],
    [
      evalResult.eval_definition_digest,
      contract.verifier.eval_definition_digest,
      "eval definition",
    ],
    [evalResult.verifier_digest, contract.verifier.digest, "verifier"],
    [evalResult.base_git_sha, contract.authority.base_git_sha, "base revision"],
    [evalResult.risk_profile, contract.risk_profile, "risk profile"],
    [evalResult.run_head_digest, state.last_event_hash, "run head"],
    [evalResult.workspace_revision?.base_git_sha, contract.authority.base_git_sha, "workspace base"],
    [evalResult.workspace_revision?.head_git_sha, workspaceHeadGitSha, "workspace head"],
  ];
  for (const [actual, expected, label] of bindings) {
    if (actual !== expected) deny("STALE_RELEASE_EVIDENCE", `${label} binding mismatch`);
  }
  if (!GIT_SHA_PATTERN.test(workspaceHeadGitSha ?? "")) {
    deny("STALE_RELEASE_EVIDENCE", "host-attested workspace head is required");
  }
  if (contract.risk_profile === "LOW" && evalResult.evaluation_mode !== "DETERMINISTIC") {
    deny("RISK_GATE_REQUIRED", "LOW risk release requires a deterministic evaluator");
  }
  const attempt = assertAttempts(evalResult, contract, state, workspaceHeadGitSha);
  assertArtifactRevision(evalResult, contract);
  assertRiskGates(
    evalResult,
    contract,
    state,
    workspaceHeadGitSha,
    attempt,
    assuranceEvidence,
  );
  return assertFindings(
    evalResult,
    contract,
    state,
    workspaceHeadGitSha,
    attempt,
    assuranceEvidence,
  );
}

function contractGoalId(contract) {
  const parts = String(contract.goal?.ref ?? "").split("#");
  const goalId = parts.length === 2 ? parts[1] : "";
  if (!IDENTIFIER_PATTERN.test(goalId)) {
    deny("GOAL_IDENTITY_MISMATCH", "contract goal reference has no canonical goal identity");
  }
  return goalId;
}

function assertVerifiedLedger({ contract, evalResult, ledger, goalId }) {
  if (ledger?.schema !== "work_package_ledger_v2" || ledger.runId !== contract.run_id) {
    deny("STALE_WORK_PACKAGE", "work-package ledger is not bound to the run");
  }
  if (goalId !== contractGoalId(contract)) {
    deny("GOAL_IDENTITY_MISMATCH", "work-package goal identity differs from the contract goal");
  }
  const goal = ledger.goals?.[goalId];
  if (goal?.status !== "verified" || !goal.expectedEvidence || !goal.evidence) {
    deny("WORK_PACKAGE_NOT_VERIFIED", "verified work-package evidence is required");
  }
  if (!sameBundle(goal.expectedEvidence, goal.evidence)) {
    deny("STALE_WORK_PACKAGE", "work-package evidence does not match its pinned bundle");
  }
  if (
    goal.evidence.authorityDigest !== unprefixed(contract.authority.fsd_digest) ||
    goal.evidence.evalDigest !== unprefixed(contract.verifier.eval_definition_digest)
  ) {
    deny("STALE_WORK_PACKAGE", "work-package authority or eval digest is stale");
  }
  const expectedReviewer = unprefixed(
    evalResult.checker?.evidence_digest ?? contract.verifier.digest,
  );
  if (goal.evidence.reviewerDigest !== expectedReviewer) {
    deny("STALE_WORK_PACKAGE", "work-package reviewer digest is stale");
  }
  const evidenceRefs = goal.evidence.evidenceRefs;
  const artifacts = goal.evidence.evidenceArtifacts;
  if (
    !Array.isArray(evidenceRefs) ||
    !Array.isArray(artifacts) ||
    artifacts.length !== evidenceRefs.length ||
    artifacts.some(
      (artifact, index) =>
        artifact.path !== evidenceRefs[index] ||
        !/^[a-f0-9]{64}$/u.test(artifact.digest ?? ""),
    )
  ) {
    deny("STALE_WORK_PACKAGE", "work-package evidence artifacts are not fully digest-bound");
  }
  const covered = new Set(evidenceRefs);
  const artifactDigests = new Set(
    artifacts.map((artifact) => `sha256:${artifact.digest}`),
  );
  const assuranceDigests = [
    evalResult.checker?.evidence_digest,
    evalResult.finding_inventory?.evidence_digest,
    ...evalResult.human_gates
      .filter((gate) => gate.status === "PASS")
      .map((gate) => gate.evidence_digest),
    ...evalResult.findings
      .filter((finding) => finding.return_gate !== null)
      .map((finding) => finding.return_gate.evidence_digest),
  ].filter((digest) => digest !== undefined && digest !== null);
  if (assuranceDigests.some((digest) => !artifactDigests.has(digest))) {
    deny(
      "ASSURANCE_EVIDENCE_REQUIRED",
      "assurance evidence must bind a hashed work-package artifact",
    );
  }
  const referenced = [
    ...evalResult.attempts.flatMap((attempt) => attempt.evidence_refs),
    ...evalResult.attempts.flatMap((attempt) => attempt.regression?.evidence_refs ?? []),
    evalResult.finding_inventory.evidence_ref,
    ...(evalResult.checker === null ? [] : [evalResult.checker.evidence_ref]),
    ...evalResult.human_gates
      .filter((gate) => gate.status === "PASS")
      .map((gate) => gate.evidence_ref),
    ...evalResult.findings.flatMap((finding) => [
      ...finding.evidence_refs,
      ...(finding.return_gate?.evidence_refs ?? []),
      ...(finding.return_gate === null ? [] : [finding.return_gate.evidence_ref]),
    ]),
  ];
  const uncovered = referenced.find((reference) => !covered.has(reference));
  if (uncovered !== undefined) {
    deny(
      "EVIDENCE_COVERAGE_REQUIRED",
      `eval evidence reference is outside hashed work-package coverage: ${uncovered}`,
    );
  }
  return goal;
}

export function evaluateReleaseGate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    deny("INVALID_RELEASE_EVIDENCE", "release gate input must be an object");
  }
  const allowed = new Set(RELEASE_GATE_FIELDS);
  const unknown = Object.keys(input).find((field) => !allowed.has(field));
  if (unknown !== undefined) {
    deny("INVALID_RELEASE_EVIDENCE", `unsupported release gate field: ${unknown}`);
  }
  const missing = RELEASE_GATE_FIELDS.find((field) => !Object.hasOwn(input, field));
  if (missing !== undefined) {
    deny("INVALID_RELEASE_EVIDENCE", `missing release gate field: ${missing}`);
  }
  const {
    contract,
    state,
    evalResult,
    ledger,
    goalId,
    workspaceHeadGitSha,
    evalResultDigest,
    ledgerDigest,
    assuranceEvidence,
  } = input;
  assertDigest(evalResultDigest, "eval result digest");
  assertDigest(ledgerDigest, "work-package digest");
  const indexedAssuranceEvidence = indexAssuranceEvidence(assuranceEvidence);
  const findingSetDigest = assertPrimaryBindings({
    contract,
    state,
    evalResult,
    workspaceHeadGitSha,
    assuranceEvidence: indexedAssuranceEvidence,
  });
  assertVerifiedLedger({ contract, evalResult, ledger, goalId });

  const checkerEvidenceDigest = evalResult.checker?.evidence_digest ?? null;
  if (checkerEvidenceDigest !== null) assertDigest(checkerEvidenceDigest, "checker evidence digest");
  const evidence = {
    run_head_digest: state.last_event_hash,
    eval_result_digest: evalResultDigest,
    work_package_digest: ledgerDigest,
    work_package_goal_id: goalId,
    finding_set_digest: findingSetDigest,
    checker_evidence_digest: checkerEvidenceDigest,
    workspace_head_git_sha: workspaceHeadGitSha,
  };
  return {
    verdict: "PASS",
    fingerprint: deriveReleaseFingerprint(evidence),
    ...evidence,
  };
}
