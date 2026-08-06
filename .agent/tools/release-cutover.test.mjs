import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPairedRouteTraces,
  buildReleaseCutoverReceipt,
  deriveCutoverDecision,
  runReleaseCutoverCli,
  validatePairedRouteTraces,
} from "./release-cutover.mjs";

const ROUTES = [
  "sc-audit",
  "sc-compound",
  "sc-debug",
  "sc-eval",
  "sc-evolve",
  "sc-explore",
  "sc-geniusloop",
  "sc-go",
  "sc-init",
  "sc-launch",
  "sc-pause",
  "sc-plan",
  "sc-prd",
  "sc-research",
  "sc-review",
  "sc-status",
  "sc-ui",
  "sc-work",
];

async function repositoryFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "release-cutover-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent", "context", "workflows"), { recursive: true });
  await mkdir(path.join(root, ".agent", "workflows"), { recursive: true });
  const routes = {};
  for (const route of ROUTES) {
    routes[route] = {
      loopRuntimeRole: route === "sc-work" ? "IMPLEMENTATION" : "READ_ONLY",
      writeClasses: route === "sc-work" ? ["implementation_write"] : [],
      wizardPolicy: route === "sc-work" ? "REQUIRED" : "NEVER",
      requiredOperationGate: route === "sc-work" ? ["work"] : [],
      loopStateAccess: route === "sc-work" ? "READ_WRITE" : "READ_ONLY",
    };
    await writeFile(
      path.join(root, ".agent", "workflows", `${route}.md`),
      `# /${route}\n\nFull ${route} contract.\n`,
    );
    await writeFile(
      path.join(root, ".agent", "context", "workflows", `${route}.contract.md`),
      `# /${route} compact\n\nCompact ${route} contract.\n`,
    );
  }
  await writeFile(
    path.join(root, ".agent", "context", "workflow-invariants.json"),
    `${JSON.stringify({ schema: "workflow_invariants_v2", routes }, null, 2)}\n`,
  );
  return root;
}

test("executes one authority-bound full/compact OBSERVE trace for every exact route", async (t) => {
  const root = await repositoryFixture(t);
  const traces = await buildPairedRouteTraces(root);

  assert.equal(validatePairedRouteTraces(traces), traces);
  assert.deepEqual(
    traces.map(({ route }) => route),
    ROUTES,
  );
  for (const trace of traces) {
    assert.equal(trace.schema, "executed_paired_route_trace_v2");
    assert.equal(trace.parityResult, "PASS");
    assert.equal(trace.baseline.executionMode, "OBSERVE");
    assert.equal(trace.baseline.verifierResult, "PASS");
    assert.equal(trace.baseline.eventCount, 3);
    assert.equal(trace.current.executionMode, "OBSERVE");
    assert.equal(trace.current.verifierResult, "PASS");
    assert.equal(trace.current.eventCount, 3);
    assert.equal(
      trace.baseline.policyProjectionDigest,
      trace.current.policyProjectionDigest,
    );
    assert.match(trace.baseline.eventHeadDigest, /^sha256:[a-f0-9]{64}$/u);
    assert.match(trace.current.eventHeadDigest, /^sha256:[a-f0-9]{64}$/u);
    assert.match(trace.bindingDigest, /^sha256:[a-f0-9]{64}$/u);
  }
});

test("trace validation rejects tampered outcomes, event heads, and parity", async (t) => {
  const root = await repositoryFixture(t);
  const traces = await buildPairedRouteTraces(root);

  for (const mutate of [
    (copy) => {
      copy[0].current.outcome = "FAIL";
    },
    (copy) => {
      copy[0].baseline.eventHeadDigest = `sha256:${"f".repeat(64)}`;
    },
    (copy) => {
      copy[0].parityDigest = `sha256:${"e".repeat(64)}`;
    },
  ]) {
    const copy = structuredClone(traces);
    mutate(copy);
    assert.throws(
      () => validatePairedRouteTraces(copy),
      /invalid executed|parity mismatch|binding digest mismatch/i,
    );
  }
});

test("cutover policy fails closed for incomplete config and holds DISABLED below ENFORCE", () => {
  assert.throws(
    () =>
      deriveCutoverDecision({
        projectConfig: {
          schema: "project_config_v2",
          config_version: 1,
          mode_version: 0,
          mode: "ENFORCE",
        },
        liveCanary: {},
        preCanaryEvidencePass: true,
      }),
    /complete project_config_v2/i,
  );

  const decision = deriveCutoverDecision({
    projectConfig: {
      schema: "project_config_v2",
      config_version: 1,
      mode_version: 0,
      mode: "DISABLED",
      risk: { external_write_policy: "DENY" },
    },
    liveCanary: null,
    preCanaryEvidencePass: true,
  });
  assert.equal(decision.recommendedMode, "OBSERVE");
  assert.equal(decision.modeTransitionPerformed, false);
  assert.equal(decision.fullEnforceEligible, false);
  assert.equal(decision.fullEnforceClaimAllowed, false);
  assert.deepEqual(decision.pendingHumanBoundaries, [
    "LIVE_BOUNDED_ENFORCE_CANARY_REQUIRED",
    "HOST_CAPABILITY_ATTESTATION_REQUIRED",
    "OWNER_MODE_TRANSITION_APPROVAL_REQUIRED",
    "EFFECTIVE_MODE_TRANSITION_REQUIRED",
    "EXTERNAL_WRITE_POLICY_REMAINS_DENY",
    "PRODUCTION_HOST_ATTESTATION_VERIFICATION_REQUIRED",
  ]);
});

test("only the private fresh executable collector may mint a release receipt", async (t) => {
  assert.throws(
    () => buildReleaseCutoverReceipt({ schema: "fresh_release_execution_evidence_v2" }),
    /requires fresh evidence from the executable collector/i,
  );

  const root = await repositoryFixture(t);
  await assert.rejects(
    runReleaseCutoverCli(["--output", "README.md"], { root }),
    /Usage: release-cutover/i,
  );
});
