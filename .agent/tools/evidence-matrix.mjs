import { createHash } from "node:crypto";

const EXPECTED_WORKFLOW_ROUTES = 18;
const STAGES_PER_ROUTE = 3;
const HEX_DIGEST = /^[a-f0-9]{64}$/;
const RUNTIME_STATUSES = new Set([
  "unknown",
  "partial-informational",
  "comparable",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertDigest(value, label) {
  if (!HEX_DIGEST.test(String(value ?? ""))) {
    throw new Error(`${label} must be a 64-character SHA-256 digest`);
  }
}

function roundPercent(value) {
  return Number(value.toFixed(4));
}

function assertExactRouteSet(label, actualRoutes, expectedRoutes) {
  const actual = new Set(actualRoutes);
  const expected = new Set(expectedRoutes);
  const missing = expectedRoutes.filter((route) => !actual.has(route));
  const unexpected = actualRoutes.filter((route) => !expected.has(route));
  if (
    actualRoutes.length !== expectedRoutes.length ||
    actual.size !== actualRoutes.length ||
    missing.length > 0 ||
    unexpected.length > 0
  ) {
    const details = [
      missing.length > 0 ? `missing ${missing.join(", ")}` : null,
      unexpected.length > 0 ? `unexpected ${unexpected.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`${label} must cover the same 18 workflow routes${details ? `: ${details}` : ""}`);
  }
}

function selectWorkflowScenarios(scenarios) {
  if (!Array.isArray(scenarios)) {
    throw new Error("scenarios must be an array");
  }
  const workflows = scenarios.filter(
    ({ semanticContract }) => typeof semanticContract === "string",
  );
  const routeNames = workflows.map(({ name }) => name);
  if (
    workflows.length !== EXPECTED_WORKFLOW_ROUTES ||
    routeNames.some((name) => typeof name !== "string" || !name.startsWith("sc-")) ||
    new Set(routeNames).size !== EXPECTED_WORKFLOW_ROUTES
  ) {
    throw new Error(
      `Evidence matrix requires exactly ${EXPECTED_WORKFLOW_ROUTES} workflow routes`,
    );
  }
  return workflows;
}

function routeMap(value, schema, label, routeNames) {
  if (value?.schema !== schema || !isObject(value.routes)) {
    throw new Error(`${label} must use schema ${schema} with a routes object`);
  }
  assertExactRouteSet(label, Object.keys(value.routes), routeNames);
  return value.routes;
}

function scenarioIncludesWorkflow(scenario, workflowPath) {
  const patterns = Array.isArray(scenario.before) ? scenario.before : [];
  return patterns.some((pattern) => {
    const normalized = String(pattern).replace(/\\/g, "/");
    return (
      normalized === workflowPath ||
      normalized === ".agent/workflows/*.md" ||
      normalized === ".agent/workflows/**" ||
      normalized === ".agent/workflows/**/*.md"
    );
  });
}

function attributableTrace(trace, route) {
  return (
    isObject(trace) &&
    trace.route === route &&
    typeof trace.fixtureId === "string" &&
    trace.fixtureId.trim().length > 0 &&
    trace.baseline?.attribution === "baseline" &&
    HEX_DIGEST.test(String(trace.baseline?.transcriptDigest ?? "")) &&
    trace.current?.attribution === "current" &&
    HEX_DIGEST.test(String(trace.current?.transcriptDigest ?? ""))
  );
}

function normalizeRuntimeEvidence(runtimeEvidence, routeNames) {
  const input = runtimeEvidence ?? {};
  if (!isObject(input)) {
    throw new Error("runtimeEvidence must be an object");
  }
  const status = input.status ?? "unknown";
  if (!RUNTIME_STATUSES.has(status)) {
    throw new Error(`Unsupported runtime evidence status: ${status}`);
  }
  const runtimePass = input.runtimePass ?? null;
  if (runtimePass !== null && typeof runtimePass !== "boolean") {
    throw new Error("runtimePass must be true, false, or null");
  }
  const pairedTraces = input.pairedTraces ?? [];
  if (!Array.isArray(pairedTraces)) {
    throw new Error("runtimeEvidence.pairedTraces must be an array");
  }

  if (runtimePass !== null) {
    const tracesByRoute = new Map(
      pairedTraces.map((trace) => [trace?.route, trace]),
    );
    const hasCompleteAttribution =
      status === "comparable" &&
      pairedTraces.length === EXPECTED_WORKFLOW_ROUTES &&
      tracesByRoute.size === EXPECTED_WORKFLOW_ROUTES &&
      routeNames.every((route) => attributableTrace(tracesByRoute.get(route), route));
    if (!hasCompleteAttribution) {
      throw new Error(
        `runtimePass=${runtimePass} requires ${EXPECTED_WORKFLOW_ROUTES} paired attributable traces`,
      );
    }
  } else if (status === "comparable") {
    throw new Error("Comparable runtime evidence must declare runtimePass");
  }

  const normalized = {
    status,
    expectedPairedTraceCount: EXPECTED_WORKFLOW_ROUTES,
    pairedTraceCount: pairedTraces.length,
    pairedTraces,
  };
  if (Object.hasOwn(input, "observedTotals")) {
    normalized.observedTotals = input.observedTotals;
  }
  return { runtimeEvidence: normalized, runtimePass };
}

function unavailableGate(expected) {
  return { expected, passed: 0, pass: false };
}

export function createUnattachedWorkflowEvidence() {
  return {
    schema: "workflow_evidence_matrix_v1",
    claimScope: {
      evidenceClass: "repository-owned-static",
      repositoryOwnedStatic: false,
      runtimeEndToEnd: "not-claimed",
      hostTelemetry: "unknown",
      generatedOutputTokens: "unknown",
    },
    coverage: {
      expectedRoutes: EXPECTED_WORKFLOW_ROUTES,
      coveredRoutes: 0,
      stagesPerRoute: STAGES_PER_ROUTE,
      expectedCells: EXPECTED_WORKFLOW_ROUTES * STAGES_PER_ROUTE,
      coveredCells: 0,
      percent: 0,
    },
    workflowMatrix: {},
    gates: {
      inputContextReduction: {
        ...unavailableGate(EXPECTED_WORKFLOW_ROUTES),
        minimumReductionPercent: null,
      },
      processWiring: unavailableGate(EXPECTED_WORKFLOW_ROUTES),
      outputContracts: unavailableGate(EXPECTED_WORKFLOW_ROUTES),
      runtimeEndToEnd: {
        status: "not-evaluated",
        expectedPairedTraceCount: EXPECTED_WORKFLOW_ROUTES,
        pairedTraceCount: 0,
        pass: null,
      },
    },
    evidenceDigests: {
      workflowInvariants: "unknown",
      outputBudgets: "unknown",
      workflowMatrix: "unknown",
    },
    runtimeEvidence: {
      status: "unknown",
      expectedPairedTraceCount: EXPECTED_WORKFLOW_ROUTES,
      pairedTraceCount: 0,
      pairedTraces: [],
    },
    runtimePass: null,
    staticPass: false,
  };
}

export function buildWorkflowEvidenceMatrix({
  scenarios,
  benchmarkResult,
  workflowInvariants,
  outputBudgets,
  sourceDigests,
  runtimeEvidence,
}) {
  const workflows = selectWorkflowScenarios(scenarios);
  const routeNames = workflows.map(({ name }) => name);
  const invariants = routeMap(
    workflowInvariants,
    "workflow_invariants_v2",
    "workflow invariants",
    routeNames,
  );
  const budgets = routeMap(
    outputBudgets,
    "output_budgets_v1",
    "output budgets",
    routeNames,
  );
  assertDigest(sourceDigests?.workflowInvariants, "workflow invariants digest");
  assertDigest(sourceDigests?.outputBudgets, "output budgets digest");

  if (!Array.isArray(benchmarkResult?.scenarios)) {
    throw new Error("benchmarkResult.scenarios must be an array");
  }
  if (!Number.isFinite(benchmarkResult.threshold)) {
    throw new Error("benchmarkResult.threshold must be finite");
  }
  const rows = new Map();
  for (const row of benchmarkResult.scenarios) {
    if (!routeNames.includes(row.name)) continue;
    if (rows.has(row.name)) {
      throw new Error(`Duplicate benchmark workflow row: ${row.name}`);
    }
    rows.set(row.name, row);
  }
  const missingRows = routeNames.filter((route) => !rows.has(route));
  if (missingRows.length > 0) {
    throw new Error(`Missing benchmark workflow rows: ${missingRows.join(", ")}`);
  }

  const normalizedRuntime = normalizeRuntimeEvidence(runtimeEvidence, routeNames);
  const workflowMatrix = {};
  for (const scenario of workflows) {
    const route = scenario.name;
    const row = rows.get(route);
    const invariant = invariants[route];
    const budget = budgets[route];
    const workflowPath = `.agent/workflows/${route}.md`;
    const contractPath = `.agent/context/workflows/${route}.contract.md`;
    const expectedSemanticContract = `workflow-invariants-v1/${route}`;
    const reductionPercent = Number(row.reductionPercent);
    const afterDigest = String(row.after?.contentDigest ?? "");
    // Route input gate: an absolute after-token budget. The reduction against
    // the frozen baseline must still be measurable (reported), but it does not
    // gate; a route without a budget fails closed.
    const inputPass =
      row.gateType === "budget" &&
      Number.isSafeInteger(row.maxAfterTokens) &&
      Number.isFinite(row.before?.tokens) &&
      Number.isFinite(row.after?.tokens) &&
      row.after.tokens <= row.maxAfterTokens &&
      Number.isFinite(reductionPercent) &&
      row.pass === true &&
      HEX_DIGEST.test(afterDigest);

    const workflowMarkers = Array.isArray(invariant?.workflowMarkers)
      ? [...invariant.workflowMarkers]
      : [];
    const contractMarkers = Array.isArray(invariant?.contractMarkers)
      ? [...invariant.contractMarkers]
      : [];
    const nextOwners = Array.isArray(invariant?.nextOwners)
      ? [...invariant.nextOwners]
      : [];
    const workflowWired = scenarioIncludesWorkflow(scenario, workflowPath);
    const contractWired =
      Array.isArray(scenario.after) && scenario.after.includes(contractPath);
    const adapterWired =
      Array.isArray(scenario.after) && scenario.after.includes(".codex/SKILL.md");
    const semanticContractWired =
      scenario.semanticContract === expectedSemanticContract;
    const processPass =
      workflowWired &&
      contractWired &&
      adapterWired &&
      semanticContractWired &&
      typeof invariant?.authority === "string" &&
      invariant.authority.length > 0 &&
      typeof invariant?.mutation === "string" &&
      invariant.mutation.length > 0 &&
      typeof invariant?.evidenceSink === "string" &&
      invariant.evidenceSink.length > 0 &&
      nextOwners.length > 0 &&
      workflowMarkers.length > 0 &&
      contractMarkers.length > 0;

    const outputPass =
      Number.isSafeInteger(budget?.maxEstimatedTokens) &&
      budget.maxEstimatedTokens > 0 &&
      Number.isSafeInteger(budget?.maxCharacters) &&
      budget.maxCharacters > 0 &&
      typeof invariant?.evidenceSink === "string" &&
      invariant.evidenceSink.length > 0 &&
      nextOwners.length > 0;

    workflowMatrix[route] = {
      input: {
        evidenceClass: "modeled-static-context-entry",
        scenario: route,
        benchmarkStage: row.stage ?? scenario.stage ?? "process",
        surfacePatterns: [...(scenario.after ?? [])],
        beforeTokens: row.before.tokens,
        afterTokens: row.after.tokens,
        reductionPercent: roundPercent(reductionPercent),
        maxAfterTokens: row.maxAfterTokens ?? null,
        afterDigest,
        observedRuntimeTokens: null,
        pass: inputPass,
      },
      process: {
        evidenceClass: "repository-contract-wiring",
        adapterPath: ".codex/SKILL.md",
        workflowPath,
        contractPath,
        semanticContract: scenario.semanticContract,
        authority: invariant.authority,
        mutationPolicy: invariant.mutation,
        evidenceSink: invariant.evidenceSink,
        nextOwners,
        workflowMarkers,
        contractMarkers,
        workflowWired,
        contractWired,
        adapterWired,
        semanticContractWired,
        observedRuntimeReasoning: null,
        pass: processPass,
      },
      output: {
        evidenceClass: "repository-output-contract",
        evidenceSink: invariant.evidenceSink,
        nextOwners,
        maxEstimatedTokens: budget.maxEstimatedTokens,
        maxCharacters: budget.maxCharacters,
        observedGeneratedTokens: null,
        pass: outputPass,
      },
    };
  }

  const cells = Object.values(workflowMatrix);
  const inputPassed = cells.filter(({ input }) => input.pass).length;
  const processPassed = cells.filter(({ process }) => process.pass).length;
  const outputPassed = cells.filter(({ output }) => output.pass).length;
  const minimumReductionPercent = Math.min(
    ...cells.map(({ input }) => input.reductionPercent),
  );
  const matrixDigest = createHash("sha256")
    .update(JSON.stringify(workflowMatrix))
    .digest("hex");
  const runtimeEvaluated = normalizedRuntime.runtimePass !== null;

  const evidence = {
    schema: "workflow_evidence_matrix_v1",
    claimScope: {
      evidenceClass: "repository-owned-static",
      repositoryOwnedStatic: true,
      runtimeEndToEnd: runtimeEvaluated
        ? "paired-attributable-traces"
        : "not-claimed",
      hostTelemetry:
        normalizedRuntime.runtimeEvidence.status === "partial-informational"
          ? "aggregate-informational"
          : runtimeEvaluated
            ? "paired-attributable-traces"
            : "unknown",
      generatedOutputTokens: "unknown",
    },
    coverage: {
      expectedRoutes: EXPECTED_WORKFLOW_ROUTES,
      coveredRoutes: routeNames.length,
      stagesPerRoute: STAGES_PER_ROUTE,
      expectedCells: EXPECTED_WORKFLOW_ROUTES * STAGES_PER_ROUTE,
      coveredCells: routeNames.length * STAGES_PER_ROUTE,
      percent: 100,
    },
    workflowMatrix,
    gates: {
      inputContextReduction: {
        expected: EXPECTED_WORKFLOW_ROUTES,
        passed: inputPassed,
        minimumReductionPercent,
        pass: inputPassed === EXPECTED_WORKFLOW_ROUTES,
      },
      processWiring: {
        expected: EXPECTED_WORKFLOW_ROUTES,
        passed: processPassed,
        pass: processPassed === EXPECTED_WORKFLOW_ROUTES,
      },
      outputContracts: {
        expected: EXPECTED_WORKFLOW_ROUTES,
        passed: outputPassed,
        pass: outputPassed === EXPECTED_WORKFLOW_ROUTES,
      },
      runtimeEndToEnd: {
        status: runtimeEvaluated ? "evaluated" : "not-evaluated",
        expectedPairedTraceCount: EXPECTED_WORKFLOW_ROUTES,
        pairedTraceCount: normalizedRuntime.runtimeEvidence.pairedTraceCount,
        pass: normalizedRuntime.runtimePass,
      },
    },
    evidenceDigests: {
      workflowInvariants: sourceDigests.workflowInvariants,
      outputBudgets: sourceDigests.outputBudgets,
      workflowMatrix: matrixDigest,
    },
    runtimeEvidence: normalizedRuntime.runtimeEvidence,
    runtimePass: normalizedRuntime.runtimePass,
    staticPass:
      inputPassed === EXPECTED_WORKFLOW_ROUTES &&
      processPassed === EXPECTED_WORKFLOW_ROUTES &&
      outputPassed === EXPECTED_WORKFLOW_ROUTES,
  };
  validateWorkflowEvidence(evidence);
  return evidence;
}

export function validateWorkflowEvidence(evidence) {
  if (!isObject(evidence) || evidence.schema !== "workflow_evidence_matrix_v1") {
    throw new Error("staticEvidence must use schema workflow_evidence_matrix_v1");
  }
  const routeNames = Object.keys(evidence.workflowMatrix ?? {});
  if (
    routeNames.length !== EXPECTED_WORKFLOW_ROUTES ||
    new Set(routeNames).size !== EXPECTED_WORKFLOW_ROUTES ||
    routeNames.some((route) => !route.startsWith("sc-"))
  ) {
    throw new Error(
      `staticEvidence must contain exactly ${EXPECTED_WORKFLOW_ROUTES} workflow routes`,
    );
  }
  for (const route of routeNames) {
    const row = evidence.workflowMatrix[route];
    if (!isObject(row?.input) || !isObject(row?.process) || !isObject(row?.output)) {
      throw new Error(`staticEvidence ${route} must contain input, process, and output cells`);
    }
    if (!Array.isArray(row.output.nextOwners) || row.output.nextOwners.length === 0) {
      throw new Error(`staticEvidence ${route} output must declare next owners`);
    }
  }
  const coverage = evidence.coverage;
  if (
    coverage?.expectedRoutes !== EXPECTED_WORKFLOW_ROUTES ||
    coverage?.coveredRoutes !== EXPECTED_WORKFLOW_ROUTES ||
    coverage?.stagesPerRoute !== STAGES_PER_ROUTE ||
    coverage?.expectedCells !== EXPECTED_WORKFLOW_ROUTES * STAGES_PER_ROUTE ||
    coverage?.coveredCells !== EXPECTED_WORKFLOW_ROUTES * STAGES_PER_ROUTE ||
    coverage?.percent !== 100
  ) {
    throw new Error("staticEvidence coverage must be 18 routes x 3 stages (54/54)");
  }
  if (
    evidence.claimScope?.evidenceClass !== "repository-owned-static" ||
    evidence.claimScope?.repositoryOwnedStatic !== true
  ) {
    throw new Error("staticEvidence claimScope must be repository-owned-static");
  }
  assertDigest(
    evidence.evidenceDigests?.workflowInvariants,
    "staticEvidence workflow invariants digest",
  );
  assertDigest(
    evidence.evidenceDigests?.outputBudgets,
    "staticEvidence output budgets digest",
  );
  assertDigest(
    evidence.evidenceDigests?.workflowMatrix,
    "staticEvidence workflow matrix digest",
  );
  const actualMatrixDigest = createHash("sha256")
    .update(JSON.stringify(evidence.workflowMatrix))
    .digest("hex");
  if (evidence.evidenceDigests.workflowMatrix !== actualMatrixDigest) {
    throw new Error("staticEvidence workflow matrix digest mismatch");
  }
  const normalizedRuntime = normalizeRuntimeEvidence(
    {
      ...evidence.runtimeEvidence,
      runtimePass: evidence.runtimePass,
    },
    routeNames,
  );
  if (
    evidence.runtimeEvidence?.expectedPairedTraceCount !==
      EXPECTED_WORKFLOW_ROUTES ||
    evidence.runtimeEvidence?.pairedTraceCount !==
      normalizedRuntime.runtimeEvidence.pairedTraceCount ||
    evidence.gates?.runtimeEndToEnd?.pass !== evidence.runtimePass
  ) {
    throw new Error("staticEvidence runtime evidence summary is inconsistent");
  }
  const staticGatePass =
    evidence.gates?.inputContextReduction?.pass === true &&
    evidence.gates?.processWiring?.pass === true &&
    evidence.gates?.outputContracts?.pass === true;
  if (evidence.staticPass !== staticGatePass) {
    throw new Error("staticEvidence staticPass does not match its static gates");
  }
  return evidence;
}
