import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SCENARIOS } from "./token-benchmark.mjs";
import {
  buildWorkflowEvidenceMatrix,
  validateWorkflowEvidence,
} from "./evidence-matrix.mjs";

const WORKFLOW_SCENARIOS = DEFAULT_SCENARIOS.filter(
  ({ semanticContract }) => typeof semanticContract === "string",
);

function matrixFixture(overrides = {}) {
  const benchmarkResult = {
    threshold: 90,
    scenarios: WORKFLOW_SCENARIOS.map(({ name, stage }, index) => {
      const beforeTokens = 1_000 + index;
      const afterTokens = 50;
      return {
        name,
        stage,
        gateType: "reduction",
        before: { tokens: beforeTokens },
        after: { tokens: afterTokens, contentDigest: `${index.toString(16)}`.padStart(64, "0") },
        reductionPercent: ((beforeTokens - afterTokens) / beforeTokens) * 100,
        pass: true,
      };
    }),
  };
  const workflowInvariants = {
    schema: "workflow_invariants_v1",
    routes: Object.fromEntries(
      WORKFLOW_SCENARIOS.map(({ name }) => [
        name,
        {
          authority: `authority:${name}`,
          mutation: "explicit-only",
          evidenceSink: `sink:${name}`,
          nextOwners: ["caller"],
          workflowMarkers: ["workflow marker"],
          contractMarkers: ["contract marker"],
        },
      ]),
    ),
  };
  const outputBudgets = {
    schema: "output_budgets_v1",
    routes: Object.fromEntries(
      WORKFLOW_SCENARIOS.map(({ name }) => [
        name,
        { maxEstimatedTokens: 400, maxCharacters: 1_600 },
      ]),
    ),
  };

  return {
    scenarios: WORKFLOW_SCENARIOS,
    benchmarkResult,
    workflowInvariants,
    outputBudgets,
    sourceDigests: {
      workflowInvariants: "a".repeat(64),
      outputBudgets: "b".repeat(64),
    },
    ...overrides,
  };
}

function attributableTraces() {
  return WORKFLOW_SCENARIOS.map(({ name }, index) => ({
    route: name,
    fixtureId: `fixture:${name}`,
    baseline: {
      attribution: "baseline",
      transcriptDigest: `${(index + 17).toString(16)}`.padStart(64, "0"),
    },
    current: {
      attribution: "current",
      transcriptDigest: `${(index + 34).toString(16)}`.padStart(64, "0"),
    },
  }));
}

test("buildWorkflowEvidenceMatrix covers every workflow with input/process/output static evidence", () => {
  const evidence = buildWorkflowEvidenceMatrix(matrixFixture());

  assert.equal(WORKFLOW_SCENARIOS.length, 17);
  assert.equal(evidence.schema, "workflow_evidence_matrix_v1");
  assert.deepEqual(evidence.claimScope, {
    evidenceClass: "repository-owned-static",
    repositoryOwnedStatic: true,
    runtimeEndToEnd: "not-claimed",
    hostTelemetry: "unknown",
    generatedOutputTokens: "unknown",
  });
  assert.deepEqual(evidence.coverage, {
    expectedRoutes: 17,
    coveredRoutes: 17,
    stagesPerRoute: 3,
    expectedCells: 51,
    coveredCells: 51,
    percent: 100,
  });
  assert.equal(Object.keys(evidence.workflowMatrix).length, 17);
  assert.equal(evidence.workflowMatrix["sc-research"].input.observedRuntimeTokens, null);
  assert.equal(
    evidence.workflowMatrix["sc-research"].process.contractPath,
    ".agent/context/workflows/sc-research.contract.md",
  );
  assert.equal(
    evidence.workflowMatrix["sc-research"].process.workflowPath,
    ".agent/workflows/sc-research.md",
  );
  assert.equal(
    evidence.workflowMatrix["sc-research"].output.observedGeneratedTokens,
    null,
  );
  assert.deepEqual(
    evidence.workflowMatrix["sc-research"].output.nextOwners,
    ["caller"],
  );
  assert.deepEqual(evidence.gates.inputContextReduction, {
    expected: 17,
    passed: 17,
    thresholdExclusive: 90,
    minimumReductionPercent: 95,
    pass: true,
  });
  assert.deepEqual(evidence.gates.processWiring, {
    expected: 17,
    passed: 17,
    pass: true,
  });
  assert.deepEqual(evidence.gates.outputContracts, {
    expected: 17,
    passed: 17,
    pass: true,
  });
  assert.deepEqual(evidence.gates.runtimeEndToEnd, {
    status: "not-evaluated",
    expectedPairedTraceCount: 17,
    pairedTraceCount: 0,
    pass: null,
  });
  assert.match(evidence.evidenceDigests.workflowMatrix, /^[a-f0-9]{64}$/);
  assert.equal(evidence.evidenceDigests.workflowInvariants, "a".repeat(64));
  assert.equal(evidence.evidenceDigests.outputBudgets, "b".repeat(64));
  assert.equal(evidence.runtimePass, null);
  assert.equal(evidence.staticPass, true);
  assert.equal(validateWorkflowEvidence(evidence), evidence);
});

test("buildWorkflowEvidenceMatrix rejects incomplete workflow coverage", () => {
  const fixture = matrixFixture();
  fixture.scenarios = fixture.scenarios.slice(0, -1);

  assert.throws(
    () => buildWorkflowEvidenceMatrix(fixture),
    /exactly 17 workflow routes/i,
  );
});

test("runtimePass cannot be true without 17 paired attributable traces", () => {
  assert.throws(
    () =>
      buildWorkflowEvidenceMatrix(
        matrixFixture({
          runtimeEvidence: {
            status: "comparable",
            runtimePass: true,
            pairedTraces: [],
          },
        }),
      ),
    /runtimePass=true requires 17 paired attributable traces/i,
  );
});

test("runtimePass may be true with one paired attributable trace per workflow", () => {
  const evidence = buildWorkflowEvidenceMatrix(
    matrixFixture({
      runtimeEvidence: {
        status: "comparable",
        runtimePass: true,
        pairedTraces: attributableTraces(),
      },
    }),
  );

  assert.equal(evidence.runtimePass, true);
  assert.equal(evidence.claimScope.runtimeEndToEnd, "paired-attributable-traces");
  assert.deepEqual(evidence.gates.runtimeEndToEnd, {
    status: "evaluated",
    expectedPairedTraceCount: 17,
    pairedTraceCount: 17,
    pass: true,
  });
});
