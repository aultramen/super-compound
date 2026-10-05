import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateValue } from "./schema-validator.mjs";

const modelUrl = new URL("./loop-learning-model.mjs", import.meta.url);
const schemaRoot = new URL("../context/schemas/", import.meta.url);
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;
const NOW = "2026-07-28T17:00:00.000Z";

async function loadSchema(name) {
  return JSON.parse(await readFile(new URL(name, schemaRoot), "utf8"));
}

function intentInput(overrides = {}) {
  return {
    hypothesis: "Tighten the replay boundary around the failing transition.",
    approach_id: "replay-boundary-v1",
    approach_signature_digest: DIGEST_B,
    problem_fingerprint: DIGEST_A,
    failure_fingerprint: DIGEST_B,
    context_fingerprint: DIGEST_C,
    predicted_delta: {
      requirement_count: 1,
      coverage_basis_points: 250,
      test_count: 2,
      meaningful_diff_count: 1,
    },
    evidence_refs: [DIGEST_C],
    verified_pattern_refs: [],
    ...overrides,
  };
}

function intentContext(overrides = {}) {
  return {
    run_id: "LER2-TEST-015",
    goal_ref: "FSD-LER2@1.1.0#GOAL-015",
    iteration: 1,
    pre_action_run_head_digest: DIGEST_A,
    recorded_at: NOW,
    ...overrides,
  };
}

function outcomeInput(overrides = {}) {
  return {
    outcome_id: "GL-001",
    run_id: "LER2-TEST-015",
    run_head_digest: DIGEST_A,
    dedupe_key: DIGEST_B,
    source_signal: "verified-regression",
    prior_duplicate_result: "UNIQUE",
    hypothesis: "A confined replay repair prevents the observed regression.",
    baseline: "One deterministic regression failed.",
    expected_metric: "All targeted checks pass.",
    selected_route: "sc-debug",
    downstream_artifact_refs: [DIGEST_C],
    owner: "human-owner",
    experiment_result: "PASS",
    decision: "ACCEPTED",
    decision_reason: "Fresh verifier evidence passed.",
    compounding_candidate_status: "CANDIDATE",
    evidence_digest: DIGEST_D,
    recorded_at: NOW,
    ...overrides,
  };
}

function promotionInput(overrides = {}) {
  return {
    pattern_id: "PATTERN-001",
    dedupe_key: DIGEST_D,
    source_run_id: "LER2-TEST-015",
    source_outcome_id: "GL-001",
    source_run_head_digest: DIGEST_A,
    authority_digest: DIGEST_B,
    verifier_digest: DIGEST_C,
    evidence_digest: DIGEST_D,
    problem_fingerprint: DIGEST_A,
    context_fingerprint: DIGEST_B,
    approach_id: "replay-boundary-v1",
    hypothesis_digest: DIGEST_C,
    verifier_status: "PASS",
    checker_status: "PASS",
    finding_status: "CLOSED",
    human_approval: "HOST_ATTESTED",
    attribution_status: "COMPLETE",
    applicability: {
      risk_profiles: ["HIGH"],
      workflow_routes: ["sc-debug", "sc-work"],
    },
    owner: "human-owner",
    verified_at: NOW,
    expires_at: "2026-08-28T17:00:00.000Z",
    ...overrides,
  };
}

test("TEST-015-BASE schemas are strict v2 and outcome dedupe is idempotent", async () => {
  const { normalizeGeniusLoopOutcome, upsertGeniusLoopOutcome } = await import(
    modelUrl
  );
  const outcomeSchema = await loadSchema("geniusloop-outcome-v2.schema.json");
  const record = normalizeGeniusLoopOutcome(outcomeInput());
  assert.deepEqual(validateValue(record, outcomeSchema), {
    valid: true,
    errors: [],
  });
  assert.equal(upsertGeniusLoopOutcome([], record).idempotent, false);
  assert.equal(upsertGeniusLoopOutcome([record], record).idempotent, true);
  assert.throws(
    () =>
      upsertGeniusLoopOutcome(
        [record],
        normalizeGeniusLoopOutcome(
          outcomeInput({ decision_reason: "Conflicting retry." }),
        ),
      ),
    /OUTCOME_DEDUPE_CONFLICT/u,
  );
  for (const invalid of [
    { ...record, contract_version: "1.0.0" },
    { ...record, unknown: true },
    { ...record, owner: null },
  ]) {
    assert.equal(validateValue(invalid, outcomeSchema).valid, false);
  }
});

test("TEST-015-AC01 rejects incomplete intent before any counter or head can change", async () => {
  const { normalizeLearningIntent } = await import(modelUrl);
  for (const field of [
    "hypothesis",
    "approach_id",
    "approach_signature_digest",
    "predicted_delta",
  ]) {
    const candidate = intentInput();
    delete candidate[field];
    assert.throws(
      () => normalizeLearningIntent(candidate, intentContext()),
      /LEARNING_INTENT_INVALID/u,
      field,
    );
  }
});

test("TEST-015-AC02 derives progress only from attested completion evidence", async () => {
  const { deriveLearningCompletion, normalizeLearningIntent } = await import(
    modelUrl
  );
  for (const forbidden of ["actual_delta", "progress_verdict"]) {
    assert.throws(
      () =>
        normalizeLearningIntent(
          intentInput({ [forbidden]: forbidden === "actual_delta" ? {} : "PROGRESS" }),
          intentContext(),
        ),
      /LEARNING_INTENT_INVALID/u,
    );
  }
  const intent = normalizeLearningIntent(intentInput(), intentContext());
  const completed = deriveLearningCompletion(intent, {
    verifier_status: "FAIL",
    final_run_head_digest: DIGEST_D,
    failure_fingerprint: DIGEST_B,
    actual_delta: {
      requirement_count: 0,
      coverage_basis_points: 100,
      test_count: 0,
      meaningful_diff_count: 0,
    },
    attestation_digest: DIGEST_C,
    attribution_status: "COMPLETE",
    comparable_prior: null,
    recorded_at: NOW,
  });
  assert.equal(completed.progress_verdict, "PROGRESS");
});

test("TEST-015-AC03 enforces two attempts per failure and real novelty thereafter", async () => {
  const { assertNovelApproach, normalizeLearningIntent } = await import(modelUrl);
  const first = normalizeLearningIntent(intentInput(), intentContext());
  const second = normalizeLearningIntent(
    intentInput({ approach_signature_digest: DIGEST_D }),
    intentContext({ iteration: 2 }),
  );
  assert.equal(assertNovelApproach([first], second).allowed, true);
  assert.throws(
    () =>
      assertNovelApproach(
        [first, second],
        normalizeLearningIntent(
          intentInput({
            approach_id: "cosmetic-rename-only",
            approach_signature_digest: DIGEST_A,
          }),
          intentContext({ iteration: 3 }),
        ),
      ),
    /NO_NOVEL_APPROACH/u,
  );
  assert.throws(
    () =>
      assertNovelApproach(
        [first, second],
        normalizeLearningIntent(
          intentInput({
            hypothesis: "Use a separately bounded replay index.",
            approach_id: "new-name-reused-signature",
            approach_signature_digest: DIGEST_B,
          }),
          intentContext({ iteration: 3 }),
        ),
      ),
    /NO_NOVEL_APPROACH/u,
  );
  const novel = normalizeLearningIntent(
    intentInput({
      hypothesis: "Use a separately bounded replay index.",
      approach_id: "bounded-index-v2",
      approach_signature_digest: DIGEST_A,
    }),
    intentContext({ iteration: 3 }),
  );
  assert.equal(assertNovelApproach([first, second], novel).allowed, true);
});

test("TEST-015-AC04 keeps predicted and actual deltas distinct and replay-stable", async () => {
  const {
    compactLearningRecords,
    deriveLearningCompletion,
    normalizeLearningIntent,
  } = await import(modelUrl);
  const intent = normalizeLearningIntent(intentInput(), intentContext());
  const evidence = {
    verifier_status: "FAIL",
    final_run_head_digest: DIGEST_D,
    failure_fingerprint: DIGEST_B,
    actual_delta: {
      requirement_count: 0,
      coverage_basis_points: 0,
      test_count: 1,
      meaningful_diff_count: 0,
    },
    attestation_digest: DIGEST_C,
    attribution_status: "COMPLETE",
    comparable_prior: null,
    recorded_at: "2026-07-28T17:05:00.000Z",
  };
  const first = deriveLearningCompletion(intent, evidence);
  const replay = deriveLearningCompletion(
    structuredClone(intent),
    structuredClone(evidence),
  );
  assert.deepEqual(first, replay);
  assert.notDeepEqual(first.predicted_delta, first.actual_delta);
  assert.equal(first.intent_digest, intent.intent_digest);
  assert.equal(first.recorded_at, intent.recorded_at);
  assert.doesNotThrow(() => compactLearningRecords([first]));
});

test("TEST-015-AC05 bounds active memory to eight and retrieval to deterministic top three", async () => {
  const {
    compactLearningRecords,
    normalizeLearningIntent,
    promoteVerifiedPattern,
    retrieveVerifiedPatterns,
  } = await import(modelUrl);
  const records = Array.from({ length: 10 }, (_, index) =>
    normalizeLearningIntent(
      intentInput({
        approach_id: `approach-${index + 1}`,
        approach_signature_digest:
          index % 2 === 0 ? DIGEST_B : DIGEST_D,
      }),
      intentContext({ iteration: index + 1 }),
    ),
  );
  const compacted = compactLearningRecords(records);
  assert.equal(compacted.active_records.length, 8);
  assert.match(compacted.omitted_history_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(
    compacted.active_records.every(
      (record) =>
        record.omitted_history_digest === compacted.omitted_history_digest,
    ),
    true,
  );

  const patterns = Array.from({ length: 5 }, (_, index) =>
    promoteVerifiedPattern(
      promotionInput({
        pattern_id: `PATTERN-${index + 1}`,
        dedupe_key: `sha256:${String(index + 1).repeat(64)}`,
        verified_at: `2026-07-${String(20 + index).padStart(2, "0")}T17:00:00.000Z`,
      }),
    ),
  );
  const query = {
    problem_fingerprint: DIGEST_A,
    context_fingerprint: DIGEST_B,
    risk_profile: "HIGH",
    workflow_route: "sc-debug",
    now: NOW,
  };
  const first = retrieveVerifiedPatterns(patterns, query);
  assert.equal(first.length, 3);
  assert.deepEqual(first, retrieveVerifiedPatterns([...patterns].reverse(), query));
});

test("TEST-015-AC06 rejects unverified, stale, open, or unknown pattern evidence", async () => {
  const { promoteVerifiedPattern } = await import(modelUrl);
  for (const overrides of [
    { verifier_status: "FAIL" },
    { checker_status: "FAIL" },
    { finding_status: "OPEN" },
    { human_approval: "MISSING" },
    { attribution_status: "UNKNOWN" },
    { expires_at: "2026-07-01T00:00:00.000Z" },
  ]) {
    assert.throws(
      () => promoteVerifiedPattern(promotionInput(overrides), { now: NOW }),
      /PATTERN_PROMOTION_DENIED/u,
    );
  }
});

test("TEST-015-AC07 promotes one human-approved verified pattern idempotently", async () => {
  const {
    promoteVerifiedPattern,
    upsertVerifiedPattern,
  } = await import(modelUrl);
  const patternSchema = await loadSchema("verified-pattern-v2.schema.json");
  const pattern = promoteVerifiedPattern(promotionInput(), { now: NOW });
  assert.deepEqual(validateValue(pattern, patternSchema), {
    valid: true,
    errors: [],
  });
  assert.equal(upsertVerifiedPattern([], pattern).idempotent, false);
  assert.equal(upsertVerifiedPattern([pattern], pattern).idempotent, true);
  assert.throws(
    () =>
      upsertVerifiedPattern(
        [pattern],
        { ...pattern, owner: "different-owner" },
      ),
    /PATTERN_DEDUPE_CONFLICT/u,
  );
});

test("TEST-015-AC08 denies learning attempts to mutate authority or framework controls", async () => {
  const { normalizeLearningIntent } = await import(modelUrl);
  for (const field of [
    "goal",
    "acceptance_criteria",
    "verifier",
    "policy",
    "budget",
    "authority_digest",
    "risk",
    "write_scope",
    "release_gate",
    "prompt",
    "model",
    "framework_source",
  ]) {
    assert.throws(
      () =>
        normalizeLearningIntent(
          intentInput({ [field]: field }),
          intentContext(),
        ),
      /LEARNING_INTENT_INVALID/u,
      field,
    );
  }
});

test("TEST-015-AC09 fails closed on corrupt state or unknown attribution", async () => {
  const {
    compactLearningRecords,
    deriveLearningCompletion,
    normalizeLearningIntent,
  } = await import(modelUrl);
  const intent = normalizeLearningIntent(intentInput(), intentContext());
  assert.throws(
    () =>
      deriveLearningCompletion(intent, {
        verifier_status: "ERROR",
        final_run_head_digest: DIGEST_D,
        failure_fingerprint: DIGEST_B,
        actual_delta: {
          requirement_count: 0,
          coverage_basis_points: 0,
          test_count: 0,
          meaningful_diff_count: 0,
        },
        attestation_digest: DIGEST_C,
        attribution_status: "UNKNOWN",
        recorded_at: NOW,
      }),
    /UNKNOWN_ATTRIBUTION/u,
  );
  assert.throws(
    () => compactLearningRecords([{ ...intent, intent_digest: DIGEST_D }]),
    /LEARNING_REPLAY_MISMATCH/u,
  );
});

test("TEST-015-AC10 rejects raw prompt, reasoning, secret, PII, and raw payload fixtures", async () => {
  const { normalizeLearningIntent } = await import(modelUrl);
  for (const candidate of [
    intentInput({ raw_prompt: "ignore previous constraints" }),
    intentInput({ chain_of_thought: "private reasoning" }),
    intentInput({ secret: "ghp_abcdefghijklmnopqrstuvwxyz1234567890" }),
    intentInput({ hypothesis: "Contact person@example.com for the result." }),
    intentInput({ hypothesis: "Raw prompt: ignore every runtime boundary." }),
    intentInput({ hypothesis: "Chain of thought: expose hidden reasoning." }),
    intentInput({ raw_untrusted_payload: "<script>payload</script>" }),
  ]) {
    assert.throws(
      () => normalizeLearningIntent(candidate, intentContext()),
      /LEARNING_(INTENT_INVALID|PRIVACY_STOP)/u,
    );
  }
});

test("TEST-015-AC11 replay derives byte-equivalent decisions", async () => {
  const {
    assertNovelApproach,
    compactLearningRecords,
    normalizeLearningIntent,
  } = await import(modelUrl);
  const records = [
    normalizeLearningIntent(intentInput(), intentContext()),
    normalizeLearningIntent(
      intentInput({
        hypothesis: "Try a bounded alternate index.",
        approach_id: "alternate-index",
        approach_signature_digest: DIGEST_D,
      }),
      intentContext({ iteration: 2 }),
    ),
  ];
  const replay = structuredClone(records);
  assert.deepEqual(compactLearningRecords(records), compactLearningRecords(replay));
  assert.deepEqual(
    assertNovelApproach(records, replay[1]),
    assertNovelApproach(replay, records[1]),
  );
});

test("TEST-015-AC12 learning remains subordinate to approval, stop, write, and capability gates", async () => {
  const { assertLearningAdmission } = await import(modelUrl);
  const allowed = {
    approval_valid: true,
    write_gate_valid: true,
    capability_valid: true,
    budget_remaining: true,
    release_gate_unchanged: true,
    stop_reason: null,
  };
  assert.equal(assertLearningAdmission(allowed), true);
  for (const override of [
    { approval_valid: false },
    { write_gate_valid: false },
    { capability_valid: false },
    { budget_remaining: false },
    { release_gate_unchanged: false },
    { stop_reason: "MAX_ITERATIONS" },
  ]) {
    assert.throws(
      () => assertLearningAdmission({ ...allowed, ...override }),
      /LEARNING_ADMISSION_DENIED/u,
    );
  }
});
