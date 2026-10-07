import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveEvalAttemptDigest,
  deriveFindingSetDigest,
  evaluateReleaseGate,
} from "./eval-gate-model.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;
const DIGEST_E = `sha256:${"e".repeat(64)}`;
const DIGEST_F = `sha256:${"f".repeat(64)}`;
const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);

function makeAttempt(number, verdict = "PASS") {
  const second = (number - 1) * 2;
  return {
    attempt_number: number,
    reset_id: `clean-reset-${number}`,
    reset_attestation: "HOST_ATTESTED_CLEAN_RESET",
    run_head_digest: DIGEST_C,
    workspace_head_git_sha: HEAD_SHA,
    verifier_digest: DIGEST_F,
    verdict,
    evidence_refs: [`.scratch/evidence/test-009-pass-${number}.json`],
    regression: null,
    started_at: `2026-07-21T00:00:0${second}.000Z`,
    completed_at: `2026-07-21T00:00:0${second + 1}.000Z`,
  };
}

function makeFixture() {
  const contract = {
    schema: "loop_run_contract_v2",
    contract_version: "2.0.0",
    run_id: "LER2-TEST-009",
    goal: {
      ref: "FSD-LER2@1.0.0#GOAL-009",
      digest: DIGEST_A,
      summary: "Gate success on independently verified evidence.",
      acceptance_criteria: ["Fresh evidence is bound to the current run head."],
    },
    authority: {
      brd_digest: DIGEST_B,
      prd_digest: DIGEST_C,
      fsd_digest: DIGEST_D,
      adr_digests: [DIGEST_E],
      operation_inventory_digest: DIGEST_C,
      sources: [
        { role: "GOAL", source_path: "issues/goal-009.md", content_digest: DIGEST_A },
        { role: "BRD", source_path: "docs/brd/brd-loop-runtime-v2.md", content_digest: DIGEST_B },
        { role: "PRD", source_path: "docs/prd/prd-loop-runtime-v2.md", content_digest: DIGEST_C },
        { role: "FSD", source_path: "docs/fsd/fsd-loop-runtime-v2.md", content_digest: DIGEST_D },
        { role: "ADR", source_path: "docs/solutions/adr-loop-runtime-v2.md", content_digest: DIGEST_E },
        { role: "VERIFIER", source_path: "verifiers/test-009.md", content_digest: DIGEST_F },
        { role: "EVAL", source_path: ".agent/evals/loop-runtime-v2.md", content_digest: DIGEST_B },
        { role: "OPERATION_INVENTORY", source_path: ".agent/context/operation-inventory.json", content_digest: DIGEST_C }
      ],
      base_git_sha: BASE_SHA,
    },
    verifier: {
      ref: "TEST-009",
      digest: DIGEST_F,
      eval_definition_digest: DIGEST_B,
      regression_verifier_digest: null,
      eval_class: "CAPABILITY",
      success_threshold: {
        metric: "PASS_AT_K",
        k: 3,
        minimum_basis_points: 9000,
      },
    },
    policy: {
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
    },
    autonomy_profile: "INTERACTIVE",
    risk_profile: "LOW",
  };
  const state = {
    status: "VERIFYING",
    last_event_hash: DIGEST_C,
  };
  const evalResult = {
    schema: "eval_result_v2",
    contract_version: "2.0.0",
    eval_result_id: "eval-result-009-1",
    run_id: contract.run_id,
    goal_ref: contract.goal.ref,
    eval_definition_digest: contract.verifier.eval_definition_digest,
    verifier_digest: contract.verifier.digest,
    base_git_sha: BASE_SHA,
    eval_class: contract.verifier.eval_class,
    success_threshold: structuredClone(contract.verifier.success_threshold),
    evaluation_mode: "DETERMINISTIC",
    risk_profile: "LOW",
    maker_actor_id: "maker-1",
    checker: null,
    findings: [],
    attempts: [makeAttempt(1), makeAttempt(2), makeAttempt(3)],
    pass_metrics: {
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    },
    regression_pass_metrics: null,
    human_gates: [],
    artifact_revision: {
      artifact_type: "ISSUE",
      artifact_id: "GOAL-009",
      artifact_version: "1.0.0",
      artifact_contract_version: "2.0.0",
      digest: contract.goal.digest,
    },
    workspace_revision: {
      base_git_sha: BASE_SHA,
      head_git_sha: HEAD_SHA,
    },
    verdict: "PASS",
    fresh: true,
    run_head_digest: state.last_event_hash,
    recorded_at: "2026-07-21T00:00:08.000Z",
  };
  const finalAttemptDigest = deriveEvalAttemptDigest(evalResult.attempts.at(-1));
  evalResult.finding_inventory = {
    attestation: "HOST_ATTESTED_COMPLETE_FINDING_SET",
    run_id: contract.run_id,
    goal_ref: contract.goal.ref,
    eval_definition_digest: contract.verifier.eval_definition_digest,
    run_head_digest: state.last_event_hash,
    workspace_head_git_sha: HEAD_SHA,
    final_attempt_number: 3,
    final_attempt_digest: finalAttemptDigest,
    source_records: [],
    finding_set_digest: deriveFindingSetDigest([]),
    evidence_ref: ".scratch/evidence/finding-inventory.json",
    evidence_digest: DIGEST_A,
    recorded_at: "2026-07-21T00:00:06.000Z",
  };
  const evidence = {
    authorityDigest: contract.authority.fsd_digest.slice("sha256:".length),
    evalDigest: contract.verifier.eval_definition_digest.slice("sha256:".length),
    reviewerDigest: contract.verifier.digest.slice("sha256:".length),
    evidenceRefs: [
      ".scratch/evidence/test-009-pass-1.json",
      ".scratch/evidence/test-009-pass-2.json",
      ".scratch/evidence/test-009-pass-3.json",
    ],
    evidenceArtifacts: [1, 2, 3].map((number) => ({
      path: `.scratch/evidence/test-009-pass-${number}.json`,
      digest: DIGEST_A.slice("sha256:".length),
    })),
  };
  const ledger = {
    schema: "work_package_ledger_v2",
    runId: contract.run_id,
    ledgerVersion: 4,
    goals: {
      "GOAL-009": {
        status: "verified",
        briefPath: ".scratch/work-packages/LER2-TEST-009/GOAL-009/brief.md",
        reportPath: ".scratch/work-packages/LER2-TEST-009/GOAL-009/report.md",
        pathsPath: ".scratch/work-packages/LER2-TEST-009/GOAL-009/paths.json",
        reviewPackagePath: ".scratch/work-packages/LER2-TEST-009/GOAL-009/review.md",
        scopeDigest: DIGEST_F.slice("sha256:".length),
        baselineDirty: {},
        verification: "Fresh TEST-009 PASS.",
        expectedEvidence: {
          authorityDigest: evidence.authorityDigest,
          evalDigest: evidence.evalDigest,
          reviewerDigest: evidence.reviewerDigest,
        },
        evidence,
      },
    },
  };
  return { contract, state, evalResult, ledger };
}

function evaluate(fixture) {
  syncFinalAttemptDigests(fixture);
  syncFindingInventory(fixture);
  syncAssuranceLedger(fixture);
  return evaluateReleaseGate(releaseInput(fixture));
}

function syncFinalAttemptDigests(fixture) {
  const digest = deriveEvalAttemptDigest(fixture.evalResult.attempts.at(-1));
  fixture.evalResult.finding_inventory.final_attempt_digest = digest;
  if (fixture.evalResult.checker !== null) fixture.evalResult.checker.final_attempt_digest = digest;
  for (const gate of fixture.evalResult.human_gates) gate.final_attempt_digest = digest;
  for (const finding of fixture.evalResult.findings) {
    if (finding.return_gate !== null) finding.return_gate.final_attempt_digest = digest;
  }
}

function syncFindingInventory(fixture) {
  if (fixture.skipFindingInventorySync) return;
  fixture.evalResult.finding_inventory.source_records = fixture.evalResult.findings.map(
    (finding) => ({
      source_finding_id: finding.source_finding_id,
      source_run_id: finding.source_run_id,
      original_verifier_ref: finding.original_verifier.ref,
      original_verifier_digest: finding.original_verifier.digest,
      original_verifier_actor_id: finding.original_verifier.actor_id,
    }),
  );
  fixture.evalResult.finding_inventory.finding_set_digest = deriveFindingSetDigest(
    fixture.evalResult.findings,
  );
}

function assuranceEnvelopes(fixture) {
  return [
    fixture.evalResult.finding_inventory,
    fixture.evalResult.checker,
    ...fixture.evalResult.human_gates.filter((gate) => gate.status === "PASS"),
    ...fixture.evalResult.findings.map((finding) => finding.return_gate),
  ].filter((envelope) => envelope !== null);
}

function syncAssuranceLedger(fixture) {
  if (fixture.skipAssuranceLedgerSync) return;
  const evidence = fixture.ledger.goals["GOAL-009"].evidence;
  for (const envelope of assuranceEnvelopes(fixture)) {
    if (!evidence.evidenceRefs.includes(envelope.evidence_ref)) {
      evidence.evidenceRefs.push(envelope.evidence_ref);
      evidence.evidenceArtifacts.push({
        path: envelope.evidence_ref,
        digest: envelope.evidence_digest.slice("sha256:".length),
      });
    }
  }
}

function assuranceEvidence(fixture) {
  return assuranceEnvelopes(fixture).map((envelope) => {
    const content = { ...envelope };
    delete content.evidence_ref;
    delete content.evidence_digest;
    return { path: envelope.evidence_ref, digest: envelope.evidence_digest, content };
  });
}

function releaseInput(fixture) {
  return {
    contract: fixture.contract,
    state: fixture.state,
    evalResult: fixture.evalResult,
    ledger: fixture.ledger,
    goalId: "GOAL-009",
    workspaceHeadGitSha: HEAD_SHA,
    evalResultDigest: DIGEST_D,
    ledgerDigest: DIGEST_E,
    assuranceEvidence: assuranceEvidence(fixture),
  };
}

function setReviewerDigest(fixture, digest) {
  const raw = digest.slice("sha256:".length);
  fixture.ledger.goals["GOAL-009"].expectedEvidence.reviewerDigest = raw;
  fixture.ledger.goals["GOAL-009"].evidence.reviewerDigest = raw;
}

function attachChecker(fixture, checker) {
  fixture.evalResult.checker = checker;
  setReviewerDigest(fixture, checker?.evidence_digest ?? fixture.contract.verifier.digest);
}

function bindEvidenceRefs(fixture, refs) {
  const evidence = fixture.ledger.goals["GOAL-009"].evidence;
  for (const ref of refs) {
    if (evidence.evidenceRefs.includes(ref)) continue;
    evidence.evidenceRefs.push(ref);
    evidence.evidenceArtifacts.push({
      path: ref,
      digest: DIGEST_B.slice("sha256:".length),
    });
  }
}

function attachMediumRegression(fixture) {
  fixture.contract.verifier.regression_verifier_digest = DIGEST_E;
  for (const attempt of fixture.evalResult.attempts) {
    const reference = `.scratch/evidence/regression-${attempt.attempt_number}.json`;
    attempt.regression = {
      verifier_digest: DIGEST_E,
      verdict: "PASS",
      evidence_refs: [reference],
    };
    bindEvidenceRefs(fixture, [reference]);
  }
  fixture.evalResult.regression_pass_metrics = {
    attempts_total: 3,
    attempts_passed: 3,
    pass_at_k_basis_points: 10000,
    pass_power_k_basis_points: 10000,
  };
  fixture.evalResult.finding_inventory.final_attempt_digest = deriveEvalAttemptDigest(
    fixture.evalResult.attempts.at(-1),
  );
}

function passingChecker(overrides = {}) {
  return {
    checker_id: "checker-1",
    verdict: "PASS",
    read_only: true,
    attestation: "HOST_ATTESTED_INDEPENDENT_READ_ONLY",
    evidence_digest: DIGEST_A,
    evidence_ref: ".scratch/evidence/checker.json",
    run_id: "LER2-TEST-009",
    goal_ref: "FSD-LER2@1.0.0#GOAL-009",
    eval_definition_digest: DIGEST_B,
    run_head_digest: DIGEST_C,
    workspace_head_git_sha: HEAD_SHA,
    final_attempt_number: 3,
    final_attempt_digest: deriveEvalAttemptDigest(makeAttempt(3)),
    verified_at: "2026-07-21T00:00:06.000Z",
    ...overrides,
  };
}

function passingGate(gateId, approverId, overrides = {}) {
  return {
    gate_id: gateId,
    status: "PASS",
    approver_id: approverId,
    evidence_digest: DIGEST_A,
    evidence_ref: `.scratch/evidence/${gateId}.json`,
    attestation: "HOST_ATTESTED_HUMAN",
    run_id: "LER2-TEST-009",
    goal_ref: "FSD-LER2@1.0.0#GOAL-009",
    eval_definition_digest: DIGEST_B,
    run_head_digest: DIGEST_C,
    workspace_head_git_sha: HEAD_SHA,
    risk_profile: "HIGH",
    final_attempt_number: 3,
    final_attempt_digest: deriveEvalAttemptDigest(makeAttempt(3)),
    approved_at: "2026-07-21T00:00:07.000Z",
    expires_at: "2026-07-21T01:00:00.000Z",
    ...overrides,
  };
}

function closedFinding(overrides = {}) {
  return {
    finding_id: "finding-1",
    source_finding_id: "source-finding-1",
    source_run_id: "source-run-1",
    evidence_refs: [".scratch/evidence/finding-1.json"],
    owner_id: "maker-1",
    original_verifier: {
      ref: "original-verifier-1",
      digest: DIGEST_C,
      actor_id: "verifier-actor-1",
    },
    return_gate: {
      closure_cycle: 1,
      verifier_ref: "original-verifier-1",
      verifier_digest: DIGEST_C,
      verifier_actor_id: "verifier-actor-1",
      verdict: "PASS",
      evidence_refs: [".scratch/evidence/finding-1-return.json"],
      evidence_ref: ".scratch/evidence/finding-1-return.json",
      evidence_digest: DIGEST_B,
      attestation: "HOST_ATTESTED_ORIGINAL_VERIFIER",
      run_id: "LER2-TEST-009",
      goal_ref: "FSD-LER2@1.0.0#GOAL-009",
      eval_definition_digest: DIGEST_B,
      run_head_digest: DIGEST_C,
      workspace_head_git_sha: HEAD_SHA,
      source_finding_id: "source-finding-1",
      source_run_id: "source-run-1",
      final_attempt_number: 3,
      final_attempt_digest: deriveEvalAttemptDigest(makeAttempt(3)),
      verified_at: "2026-07-21T00:00:06.000Z",
    },
    max_closure_cycles: 3,
    outcome: "CLOSED",
    ...overrides,
  };
}

test("fresh deterministic PASS derives release evidence without caller success booleans", () => {
  const fixture = makeFixture();
  const result = evaluate(fixture);

  assert.equal(result.verdict, "PASS");
  assert.match(result.fingerprint, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(result.run_head_digest, fixture.state.last_event_hash);
  assert.equal(result.eval_result_digest, DIGEST_D);
  assert.equal(result.work_package_digest, DIGEST_E);
  assert.equal(result.checker_evidence_digest, null);

  fixture.evalResult.fresh = false;
  assert.throws(
    () => evaluate(fixture),
    /fresh verifier PASS required/i,
  );
});

test("attempt order, timestamps, verifier, final verdict, and pass metrics are recomputed", () => {
  const fixture = makeFixture();
  fixture.evalResult.attempts[0].attempt_number = 2;
  assert.throws(() => evaluate(fixture), /attempt sequence/i);

  fixture.evalResult.attempts[0].attempt_number = 1;
  fixture.evalResult.pass_metrics.attempts_passed = 0;
  assert.throws(() => evaluate(fixture), /pass metrics/i);

  fixture.evalResult.pass_metrics.attempts_passed = 3;
  fixture.evalResult.attempts[0].completed_at = "2026-07-20T23:59:59.000Z";
  assert.throws(() => evaluate(fixture), /attempt timestamp/i);

  fixture.evalResult.attempts[0].completed_at = "2026-07-21T00:00:01.000Z";
  fixture.evalResult.attempts[0].verifier_digest = DIGEST_A;
  assert.throws(() => evaluate(fixture), /attempt verifier/i);

  fixture.evalResult.attempts[0].verifier_digest = fixture.contract.verifier.digest;
  fixture.evalResult.attempts.at(-1).verdict = "FAIL";
  assert.throws(() => evaluate(fixture), /final attempt.*PASS/i);
});

test("artifact and workspace revisions must bind the current authority and host head", () => {
  const fixture = makeFixture();
  fixture.evalResult.artifact_revision.digest = DIGEST_B;
  assert.throws(() => evaluate(fixture), /artifact revision/i);

  fixture.evalResult.artifact_revision.digest = fixture.contract.goal.digest;
  fixture.evalResult.workspace_revision.head_git_sha = "3".repeat(40);
  assert.throws(() => evaluate(fixture), /workspace head.*mismatch/i);
});

test("subjective or background MEDIUM release requires a fresh independent checker", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "MEDIUM";
  fixture.evalResult.risk_profile = "MEDIUM";
  fixture.evalResult.evaluation_mode = "SUBJECTIVE";
  attachMediumRegression(fixture);
  assert.throws(() => evaluate(fixture), /checker.*required/i);

  attachChecker(fixture, passingChecker({ checker_id: "maker-1" }));
  assert.throws(() => evaluate(fixture), /maker.*checker|checker.*maker/i);

  attachChecker(fixture, passingChecker({ read_only: false }));
  assert.throws(() => evaluate(fixture), /read-only checker/i);

  attachChecker(fixture, passingChecker());
  assert.equal(evaluate(fixture).verdict, "PASS");

  fixture.evalResult.evaluation_mode = "DETERMINISTIC";
  attachChecker(fixture, null);
  fixture.contract.autonomy_profile = "BACKGROUND";
  assert.throws(() => evaluate(fixture), /checker.*required/i);

  attachChecker(fixture, passingChecker());
  assert.throws(() => evaluate(fixture), /technical-approval/i);
  fixture.evalResult.human_gates = [
    passingGate("technical-approval", "approver-1", { risk_profile: "MEDIUM" }),
    passingGate("security-comprehension-approval", "approver-2", {
      risk_profile: "MEDIUM",
    }),
  ];
  assert.equal(evaluate(fixture).verdict, "PASS");
});

test("MEDIUM deterministic release requires targeted capability plus regression evidence", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "MEDIUM";
  fixture.evalResult.risk_profile = "MEDIUM";
  assert.throws(() => evaluate(fixture), /targeted.*regression|composite eval/i);

  attachMediumRegression(fixture);
  assert.equal(evaluate(fixture).verdict, "PASS");

  const collapsed = makeFixture();
  collapsed.contract.risk_profile = "MEDIUM";
  collapsed.evalResult.risk_profile = "MEDIUM";
  attachMediumRegression(collapsed);
  collapsed.contract.verifier.regression_verifier_digest =
    collapsed.contract.verifier.digest;
  for (const attempt of collapsed.evalResult.attempts) {
    attempt.regression.verifier_digest = collapsed.contract.verifier.digest;
  }
  assert.throws(
    () => evaluate(collapsed),
    /distinct.*regression|composite eval/i,
  );

  const uncoveredRegression = makeFixture();
  uncoveredRegression.contract.risk_profile = "MEDIUM";
  uncoveredRegression.evalResult.risk_profile = "MEDIUM";
  attachMediumRegression(uncoveredRegression);
  const uncoveredRef =
    uncoveredRegression.evalResult.attempts[0].regression.evidence_refs[0];
  const uncoveredLedgerEvidence =
    uncoveredRegression.ledger.goals["GOAL-009"].evidence;
  uncoveredLedgerEvidence.evidenceRefs = uncoveredLedgerEvidence.evidenceRefs.filter(
    (reference) => reference !== uncoveredRef,
  );
  uncoveredLedgerEvidence.evidenceArtifacts =
    uncoveredLedgerEvidence.evidenceArtifacts.filter(
      (artifact) => artifact.path !== uncoveredRef,
    );
  assert.throws(
    () => evaluate(uncoveredRegression),
    /evidence.*outside hashed work-package coverage/i,
  );

  fixture.evalResult.attempts[0].regression.verdict = "FAIL";
  fixture.evalResult.regression_pass_metrics.attempts_passed = 2;
  fixture.evalResult.regression_pass_metrics.pass_power_k_basis_points = 0;
  assert.throws(() => evaluate(fixture), /pass\^3|composite eval/i);
});

test("HIGH release separates checker, Technical, and Security/Comprehension actors", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "HIGH";
  fixture.evalResult.risk_profile = "HIGH";
  attachChecker(fixture, passingChecker());
  assert.throws(() => evaluate(fixture), /technical-approval/i);

  fixture.evalResult.human_gates = [
    passingGate("technical-approval", "approver-1"),
    passingGate("security-comprehension-approval", "approver-1"),
  ];
  assert.throws(() => evaluate(fixture), /distinct human approvers/i);

  fixture.evalResult.human_gates[1].approver_id = "approver-2";
  assert.equal(evaluate(fixture).verdict, "PASS");

  fixture.evalResult.human_gates.push(
    passingGate("security-comprehension-approval", "approver-3", {
      evidence_ref: ".scratch/evidence/security-comprehension-approval-duplicate.json",
    }),
  );
  assert.throws(() => evaluate(fixture), /duplicate human gate/i);
});

test("CRITICAL release denies background dispatch and requires a recovery drill", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "CRITICAL";
  fixture.contract.autonomy_profile = "BACKGROUND";
  fixture.evalResult.risk_profile = "CRITICAL";
  attachChecker(fixture, passingChecker());
  fixture.evalResult.human_gates = [
    passingGate("technical-approval", "approver-1", { risk_profile: "CRITICAL" }),
    passingGate("security-comprehension-approval", "approver-2", {
      risk_profile: "CRITICAL",
    }),
  ];
  assert.throws(() => evaluate(fixture), /critical.*autonomous|background.*critical/i);

  fixture.contract.autonomy_profile = "INTERACTIVE";
  assert.throws(() => evaluate(fixture), /recovery-drill/i);

  fixture.evalResult.human_gates.push(
    passingGate("recovery-drill", "approver-1", { risk_profile: "CRITICAL" }),
  );
  assert.equal(evaluate(fixture).verdict, "PASS");
});

test("a finding closes only through its original verifier within the cycle limit", () => {
  const fixture = makeFixture();
  fixture.evalResult.findings = [closedFinding()];
  bindEvidenceRefs(fixture, [
    ".scratch/evidence/finding-1.json",
    ".scratch/evidence/finding-1-return.json",
  ]);
  assert.equal(evaluate(fixture).verdict, "PASS");

  fixture.evalResult.findings[0].return_gate.verifier_actor_id = "maker-1";
  assert.throws(() => evaluate(fixture), /self-report|original verifier/i);

  fixture.evalResult.findings[0] = closedFinding({
    return_gate: {
      ...closedFinding().return_gate,
      verifier_ref: "replacement-verifier",
    },
  });
  assert.throws(() => evaluate(fixture), /original verifier/i);

  fixture.evalResult.findings[0] = closedFinding({
    return_gate: {
      ...closedFinding().return_gate,
      closure_cycle: 4,
    },
  });
  assert.throws(() => evaluate(fixture), /closure cycle/i);

  fixture.evalResult.findings[0] = closedFinding({ outcome: "OPEN", return_gate: null });
  assert.throws(() => evaluate(fixture), /open finding/i);
});

test("ledger reviewer and hashed artifact coverage bind every release evidence reference", () => {
  const fixture = makeFixture();
  setReviewerDigest(fixture, DIGEST_E);
  assert.throws(() => evaluate(fixture), /reviewer digest/i);

  setReviewerDigest(fixture, fixture.contract.verifier.digest);
  fixture.evalResult.attempts[0].evidence_refs = [".scratch/evidence/unbound.json"];
  assert.throws(() => evaluate(fixture), /evidence reference.*work-package|coverage/i);

  fixture.evalResult.attempts[0].evidence_refs = [".scratch/evidence/test-009-pass-1.json"];
  attachChecker(fixture, passingChecker());
  setReviewerDigest(fixture, fixture.contract.verifier.digest);
  assert.throws(() => evaluate(fixture), /reviewer digest/i);
});

test("release evaluator rejects caller-injected success fields", () => {
  const fixture = makeFixture();
  const input = releaseInput(fixture);
  input.goal_met = true;
  input.fresh = true;
  input.gates_satisfied = true;
  assert.throws(
    () => evaluateReleaseGate(input),
    /unsupported release gate field.*goal_met|unsupported.*success/i,
  );
});

test("checker and human approval digests must be covered by hashed ledger artifacts", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "HIGH";
  fixture.evalResult.risk_profile = "HIGH";
  attachChecker(fixture, passingChecker({ evidence_digest: DIGEST_E }));
  fixture.evalResult.human_gates = [
    { ...passingGate("technical-approval", "approver-1"), evidence_digest: DIGEST_F },
    {
      ...passingGate("security-comprehension-approval", "approver-2"),
      evidence_digest: DIGEST_F,
    },
  ];
  fixture.skipAssuranceLedgerSync = true;
  assert.throws(() => evaluate(fixture), /assurance evidence.*artifact|artifact.*assurance/i);
});

test("release requires three host-attested clean-reset attempts and class thresholds", () => {
  const fixture = makeFixture();
  fixture.evalResult.attempts = [fixture.evalResult.attempts[0]];
  fixture.evalResult.pass_metrics = {
    attempts_total: 1,
    attempts_passed: 1,
    pass_at_k_basis_points: 10000,
    pass_power_k_basis_points: 10000,
  };
  assert.throws(() => evaluate(fixture), /three clean-reset|eval threshold/i);

  const duplicate = makeFixture();
  duplicate.evalResult.attempts[1].reset_id = duplicate.evalResult.attempts[0].reset_id;
  assert.throws(() => evaluate(duplicate), /clean reset/i);

  const regression = makeFixture();
  regression.contract.verifier.eval_class = "REGRESSION";
  regression.contract.verifier.success_threshold = {
    metric: "PASS_POWER_K",
    k: 3,
    minimum_basis_points: 10000,
  };
  regression.evalResult.eval_class = "REGRESSION";
  regression.evalResult.success_threshold = structuredClone(
    regression.contract.verifier.success_threshold,
  );
  regression.evalResult.attempts[1].verdict = "FAIL";
  regression.evalResult.pass_metrics.attempts_passed = 2;
  regression.evalResult.pass_metrics.pass_power_k_basis_points = 0;
  assert.throws(() => evaluate(regression), /threshold.*not satisfied/i);
});

test("checker and human approvals bind the current run goal eval and run head", () => {
  const fixture = makeFixture();
  fixture.contract.risk_profile = "HIGH";
  fixture.evalResult.risk_profile = "HIGH";
  attachChecker(fixture, passingChecker());
  fixture.evalResult.human_gates = [
    passingGate("technical-approval", "approver-1"),
    passingGate("security-comprehension-approval", "approver-2"),
  ];
  fixture.evalResult.checker.run_head_digest = DIGEST_D;
  assert.throws(() => evaluate(fixture), /checker.*binding|human.*attestation/i);
});

test("release requires a host-attested complete finding inventory", () => {
  const fixture = makeFixture();
  fixture.evalResult.finding_inventory.attestation = "CALLER_ASSERTED";
  assert.throws(() => evaluate(fixture), /finding inventory/i);

  const semanticMismatch = makeFixture();
  syncFindingInventory(semanticMismatch);
  syncAssuranceLedger(semanticMismatch);
  const input = releaseInput(semanticMismatch);
  input.assuranceEvidence[0].content.run_id = "replayed-other-run";
  assert.throws(
    () => evaluateReleaseGate(input),
    /artifact content does not match/i,
  );
});

test("original verifier return binds current run goal eval head and completion time", () => {
  const fixture = makeFixture();
  fixture.evalResult.findings = [closedFinding()];
  bindEvidenceRefs(fixture, [
    ".scratch/evidence/finding-1.json",
    ".scratch/evidence/finding-1-return.json",
  ]);
  fixture.evalResult.findings[0].return_gate.run_head_digest = DIGEST_D;
  assert.throws(() => evaluate(fixture), /original verifier.*binding|return gate.*binding/i);
});

test("work-package goal identity must equal the contract goal", () => {
  const fixture = makeFixture();
  fixture.ledger.goals["GOAL-OTHER"] = structuredClone(fixture.ledger.goals["GOAL-009"]);
  assert.throws(
    () => evaluateReleaseGate({ ...releaseInput(fixture), goalId: "GOAL-OTHER" }),
    /contract goal|goal identity/i,
  );
});
