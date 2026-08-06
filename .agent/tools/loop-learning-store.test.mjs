import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizeGeniusLoopOutcome,
  normalizeLearningIntent,
  promoteVerifiedPattern,
} from "./loop-learning-model.mjs";

const storeUrl = new URL("./loop-learning-store.mjs", import.meta.url);
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;
const NOW = "2026-07-28T17:00:00.000Z";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-learning-store-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { createLoopLearningStore } = await import(storeUrl);
  return {
    root,
    store: createLoopLearningStore({ root, runId: "LER2-TEST-015" }),
  };
}

function learningRecord() {
  return normalizeLearningIntent(
    {
      hypothesis: "Bind the learning cache to the current event head.",
      approach_id: "event-bound-cache",
      approach_signature_digest: DIGEST_B,
      problem_fingerprint: DIGEST_A,
      failure_fingerprint: DIGEST_B,
      context_fingerprint: DIGEST_C,
      predicted_delta: {
        requirement_count: 1,
        coverage_basis_points: 100,
        test_count: 1,
        meaningful_diff_count: 1,
      },
      evidence_refs: [DIGEST_C],
      verified_pattern_refs: [],
    },
    {
      run_id: "LER2-TEST-015",
      goal_ref: "FSD-LER2@1.1.0#GOAL-015",
      iteration: 1,
      pre_action_run_head_digest: DIGEST_A,
      recorded_at: NOW,
    },
  );
}

function outcomeRecord() {
  return normalizeGeniusLoopOutcome({
    outcome_id: "GL-001",
    run_id: "LER2-TEST-015",
    run_head_digest: DIGEST_A,
    dedupe_key: DIGEST_B,
    source_signal: "verified-regression",
    prior_duplicate_result: "UNIQUE",
    hypothesis: "Event-bound cache reconstruction is deterministic.",
    baseline: "No durable outcome projection existed.",
    expected_metric: "Projection replay is byte-equivalent.",
    selected_route: "sc-debug",
    downstream_artifact_refs: [DIGEST_C],
    owner: "human-owner",
    experiment_result: "PASS",
    decision: "ACCEPTED",
    decision_reason: "Fresh evidence passed.",
    compounding_candidate_status: "CANDIDATE",
    evidence_digest: DIGEST_D,
    recorded_at: NOW,
  });
}

function patternRecord() {
  return promoteVerifiedPattern(
    {
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
      approach_id: "event-bound-cache",
      hypothesis_digest: DIGEST_C,
      verifier_status: "PASS",
      checker_status: "PASS",
      finding_status: "CLOSED",
      human_approval: "HOST_ATTESTED",
      attribution_status: "COMPLETE",
      applicability: {
        risk_profiles: ["HIGH"],
        workflow_routes: ["sc-debug"],
      },
      owner: "human-owner",
      verified_at: NOW,
      expires_at: "2026-08-28T17:00:00.000Z",
    },
    { now: NOW },
  );
}

test("TEST-015-BASE learning projection is event-head-bound, CAS-safe, and reconstructible", async (t) => {
  const { root, store } = await fixture(t);
  const record = learningRecord();
  const first = await store.writeLearningProjection({
    expectedVersion: 0,
    runHeadDigest: DIGEST_B,
    sourceEventDigest: DIGEST_C,
    records: [record],
  });
  assert.equal(first.version, 1);
  assert.equal(
    (await store.readLearningProjection({ expectedRunHeadDigest: DIGEST_B }))
      .records[0].intent_digest,
    record.intent_digest,
  );
  await assert.rejects(
    () =>
      store.writeLearningProjection({
        expectedVersion: 0,
        runHeadDigest: DIGEST_C,
        sourceEventDigest: DIGEST_D,
        records: [record],
      }),
    /CAS conflict.*version/iu,
  );

  await unlink(path.join(root, ".scratch", "loop-runs", "LER2-TEST-015", "learning.json"));
  const rebuilt = await store.writeLearningProjection({
    expectedVersion: 0,
    runHeadDigest: DIGEST_B,
    sourceEventDigest: DIGEST_C,
    records: [record],
  });
  assert.equal(rebuilt.projection_digest, first.projection_digest);
});

test("TEST-015-AC09 corrupt or stale projections fail closed", async (t) => {
  const { root, store } = await fixture(t);
  await store.writeLearningProjection({
    expectedVersion: 0,
    runHeadDigest: DIGEST_B,
    sourceEventDigest: DIGEST_C,
    records: [learningRecord()],
  });
  const target = path.join(
    root,
    ".scratch",
    "loop-runs",
    "LER2-TEST-015",
    "learning.json",
  );
  const parsed = JSON.parse(await readFile(target, "utf8"));
  parsed.bound_run_head_digest = DIGEST_D;
  await writeFile(target, `${JSON.stringify(parsed)}\n`, "utf8");
  await assert.rejects(
    () => store.readLearningProjection({ expectedRunHeadDigest: DIGEST_B }),
    /LEARNING_PROJECTION_(CORRUPT|STALE)/u,
  );
});

test("TEST-015 outcome projection is CAS-safe and remains a derived cache", async (t) => {
  const { store } = await fixture(t);
  const written = await store.writeOutcomeProjection({
    expectedVersion: 0,
    runHeadDigest: DIGEST_B,
    sourceEventDigest: DIGEST_C,
    outcomes: [outcomeRecord()],
  });
  assert.equal(written.schema, "geniusloop_outcome_projection_v2");
  assert.equal(
    (
      await store.readOutcomeProjection({
        expectedRunHeadDigest: DIGEST_B,
      })
    ).outcomes.length,
    1,
  );
});

test("TEST-015-AC07 verified pattern publication is create-once and event-bound", async (t) => {
  const { store } = await fixture(t);
  const pattern = patternRecord();
  const first = await store.publishVerifiedPattern({
    pattern,
    promotionEventDigest: DIGEST_C,
  });
  assert.equal(first.idempotent, false);
  const retry = await store.publishVerifiedPattern({
    pattern,
    promotionEventDigest: DIGEST_C,
  });
  assert.equal(retry.idempotent, true);
  await assert.rejects(
    () =>
      store.publishVerifiedPattern({
        pattern: { ...pattern, owner: "other-owner" },
        promotionEventDigest: DIGEST_C,
      }),
    /PATTERN_PUBLICATION_CONFLICT/u,
  );
  assert.equal((await store.listVerifiedPatterns()).length, 1);
});
