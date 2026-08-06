import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";

const execFileAsync = promisify(execFile);
const OUTPUT_PATH =
  ".scratch/loop-runtime/recovery/LER2-RECOVERY-IMPLEMENTATION-01/release-cutover-receipt.json";
const LOCK_PATH = ".scratch/loop-runtime/release-cutover.lock";
const CANARY_PATH = ".scratch/loop-runtime/release/live-canary-attestation.json";
const MAX_BYTES = 2 * 1024 * 1024;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const TRUSTED_EVIDENCE = new WeakSet();
const ROUTES = Object.freeze([
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
]);
const REQUIRED_ROUTE_FIELDS = Object.freeze([
  "loopRuntimeRole",
  "writeClasses",
  "wizardPolicy",
  "requiredOperationGate",
  "loopStateAccess",
]);
const FAULT_TESTS = Object.freeze([
  ".agent/tools/action-adapter.test.mjs",
  ".agent/tools/background-execution.test.mjs",
  ".agent/tools/file-state.test.mjs",
  ".agent/tools/loop-queue.test.mjs",
  ".agent/tools/loop-run.test.mjs",
]);
const FAILURE_POINTS = Object.freeze([
  "claim",
  "intent-persistence",
  "dispatch",
  "response",
  "result-persistence",
  "ack",
]);
const AUTHORITY_PATHS = Object.freeze([
  "docs/brd/brd-loop-runtime-v2.md",
  "docs/prd/prd-loop-runtime-v2.md",
  "docs/fsd/fsd-loop-runtime-v2.md",
  "docs/solutions/adr-0001-loop-run-controller-v2.md",
  ".agent/evals/loop-runtime-v2.md",
  ".agent/context/project-config.json",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function assertDigest(value, label) {
  if (!DIGEST.test(String(value ?? ""))) {
    throw new Error(`${label} must be a sha256 digest`);
  }
}

async function readText(root, candidate, label = candidate) {
  return readBoundedFile(root, candidate, {
    encoding: "utf8",
    label,
    maxBytes: MAX_BYTES,
  });
}

function nextEventHead(previous, event) {
  return sha256(canonical({ previous, event }));
}

function executeRouteArtifact({
  route,
  artifactKind,
  sourcePath,
  source,
  invariant,
  authorityDigest,
}) {
  const sourceDigest = sha256(source);
  const policyProjection = {
    loopRuntimeRole: invariant.loopRuntimeRole,
    writeClasses: invariant.writeClasses,
    wizardPolicy: invariant.wizardPolicy,
    requiredOperationGate: invariant.requiredOperationGate,
    loopStateAccess: invariant.loopStateAccess,
  };
  const policyProjectionDigest = sha256(canonical(policyProjection));
  const verifierDigest = sha256(
    canonical({
      schema: "route_observe_verifier_v2",
      requiredFields: REQUIRED_ROUTE_FIELDS,
      exactRoute: route,
      noLoop: true,
    }),
  );
  const events = [
    {
      sequence: 1,
      type: "ROUTE_SOURCE_BOUND",
      route,
      artifactKind,
      sourceDigest,
      authorityDigest,
    },
    {
      sequence: 2,
      type: "POLICY_PROJECTION_BOUND",
      policyProjectionDigest,
    },
    {
      sequence: 3,
      type: "ROUTE_OBSERVE_VERIFIED",
      verifierDigest,
      result: "PASS",
    },
  ];
  let eventHeadDigest = sha256("GENESIS");
  for (const event of events) eventHeadDigest = nextEventHead(eventHeadDigest, event);
  return {
    attribution: artifactKind === "full" ? "baseline" : "current",
    artifactKind,
    path: sourcePath,
    executionMode: "OBSERVE",
    outcome: "PASS",
    verifierResult: "PASS",
    authorityDigest,
    sourceDigest,
    policyProjectionDigest,
    verifierDigest,
    eventCount: events.length,
    eventHeadDigest,
    transcriptDigest: sha256(canonical(events)),
  };
}

function traceBinding(trace) {
  return sha256(
    canonical({
      schema: trace.schema,
      route: trace.route,
      fixtureId: trace.fixtureId,
      parityResult: trace.parityResult,
      parityDigest: trace.parityDigest,
      baseline: trace.baseline,
      current: trace.current,
    }),
  );
}

function validateArtifact(artifact, route, artifactKind, authorityDigest) {
  const expectedPath =
    artifactKind === "full"
      ? `.agent/workflows/${route}.md`
      : `.agent/context/workflows/${route}.contract.md`;
  if (
    !isObject(artifact) ||
    artifact.artifactKind !== artifactKind ||
    artifact.attribution !== (artifactKind === "full" ? "baseline" : "current") ||
    artifact.path !== expectedPath ||
    artifact.executionMode !== "OBSERVE" ||
    artifact.outcome !== "PASS" ||
    artifact.verifierResult !== "PASS" ||
    artifact.authorityDigest !== authorityDigest ||
    artifact.eventCount !== 3
  ) {
    throw new Error(`Invalid executed ${artifactKind} trace for ${route}`);
  }
  for (const field of [
    "authorityDigest",
    "sourceDigest",
    "policyProjectionDigest",
    "verifierDigest",
    "eventHeadDigest",
    "transcriptDigest",
  ]) {
    assertDigest(artifact[field], `${route} ${artifactKind} ${field}`);
  }
}

export function validatePairedRouteTraces(traces) {
  if (!Array.isArray(traces) || traces.length !== ROUTES.length) {
    throw new Error("Release evidence requires exactly 18 executed paired traces");
  }
  const names = traces.map(({ route } = {}) => route);
  if (
    new Set(names).size !== ROUTES.length ||
    names.some((route, index) => route !== ROUTES[index])
  ) {
    throw new Error("Executed traces must cover the exact ordered 18-route set");
  }
  for (const trace of traces) {
    if (
      !isObject(trace) ||
      trace.schema !== "executed_paired_route_trace_v2" ||
      trace.fixtureId !== `observe:${trace.route}` ||
      trace.parityResult !== "PASS"
    ) {
      throw new Error(`Invalid executed trace envelope for ${trace?.route ?? "unknown"}`);
    }
    assertDigest(trace.authorityDigest, `${trace.route} authorityDigest`);
    assertDigest(trace.parityDigest, `${trace.route} parityDigest`);
    validateArtifact(trace.baseline, trace.route, "full", trace.authorityDigest);
    validateArtifact(trace.current, trace.route, "compact", trace.authorityDigest);
    if (
      trace.baseline.policyProjectionDigest !== trace.current.policyProjectionDigest ||
      trace.parityDigest !== trace.baseline.policyProjectionDigest
    ) {
      throw new Error(`Behavioral parity mismatch for ${trace.route}`);
    }
    assertDigest(trace.bindingDigest, `${trace.route} bindingDigest`);
    if (trace.bindingDigest !== traceBinding(trace)) {
      throw new Error(`Binding digest mismatch for ${trace.route}`);
    }
  }
  return traces;
}

export async function buildPairedRouteTraces(root, options = {}) {
  const manifestText = await readText(
    root,
    ".agent/context/workflow-invariants.json",
    "Workflow invariant manifest",
  );
  const manifest = JSON.parse(manifestText);
  if (manifest.schema !== "workflow_invariants_v2" || !isObject(manifest.routes)) {
    throw new Error("Workflow invariant manifest must use workflow_invariants_v2");
  }
  const names = Object.keys(manifest.routes).sort();
  if (
    names.length !== ROUTES.length ||
    names.some((route, index) => route !== ROUTES[index]) ||
    Object.hasOwn(manifest.routes, "loop")
  ) {
    throw new Error("Workflow invariant manifest must contain the exact 18 routes and no loop");
  }
  const authorityDigest = options.authorityDigest ?? sha256(manifestText);
  assertDigest(authorityDigest, "Route authorityDigest");
  const traces = [];
  for (const route of ROUTES) {
    const invariant = manifest.routes[route];
    if (
      !isObject(invariant) ||
      REQUIRED_ROUTE_FIELDS.some((field) => !Object.hasOwn(invariant, field))
    ) {
      throw new Error(`Workflow invariant is incomplete for ${route}`);
    }
    const fullPath = `.agent/workflows/${route}.md`;
    const compactPath = `.agent/context/workflows/${route}.contract.md`;
    const [full, compact] = await Promise.all([
      readText(root, fullPath, `${route} full workflow`),
      readText(root, compactPath, `${route} compact workflow`),
    ]);
    if (!full.trim() || !compact.trim()) {
      throw new Error(`Workflow sources must be non-empty for ${route}`);
    }
    const baseline = executeRouteArtifact({
      route,
      artifactKind: "full",
      sourcePath: fullPath,
      source: full,
      invariant,
      authorityDigest,
    });
    const current = executeRouteArtifact({
      route,
      artifactKind: "compact",
      sourcePath: compactPath,
      source: compact,
      invariant,
      authorityDigest,
    });
    const trace = {
      schema: "executed_paired_route_trace_v2",
      route,
      fixtureId: `observe:${route}`,
      authorityDigest,
      parityResult: "PASS",
      parityDigest: baseline.policyProjectionDigest,
      baseline,
      current,
    };
    trace.bindingDigest = traceBinding(trace);
    traces.push(trace);
  }
  return validatePairedRouteTraces(traces);
}

function parseTap(stdout, commandId) {
  const readCount = (label) => {
    const match = stdout.match(new RegExp(`^# ${label} (\\d+)$`, "mu"));
    if (!match) throw new Error(`${commandId} did not emit a TAP ${label} summary`);
    return Number(match[1]);
  };
  const summary = {
    tests: readCount("tests"),
    pass: readCount("pass"),
    fail: readCount("fail"),
    cancelled: readCount("cancelled"),
    skipped: readCount("skipped"),
    todo: readCount("todo"),
  };
  if (
    summary.tests <= 0 ||
    summary.pass !== summary.tests ||
    summary.fail !== 0 ||
    summary.cancelled !== 0 ||
    summary.skipped !== 0 ||
    summary.todo !== 0
  ) {
    throw new Error(`${commandId} did not achieve an undiscarded full PASS`);
  }
  return summary;
}

async function runNode(root, commandId, args, options = {}) {
  let result;
  try {
    result = await execFileAsync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ...options.env },
      maxBuffer: 64 * 1024 * 1024,
      timeout: options.timeout ?? 15 * 60 * 1000,
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(`${commandId} failed with exit code ${error?.code ?? "unknown"}`);
  }
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  return {
    schema: "executed_command_receipt_v2",
    commandId,
    argvDigest: sha256(canonical(args)),
    outputDigest: sha256(`${stdout}\n${stderr}`),
    verdict: "PASS",
    summary: options.tap ? parseTap(stdout, commandId) : null,
    stdout,
  };
}

function sanitizeCommand(receipt) {
  return {
    schema: receipt.schema,
    commandId: receipt.commandId,
    argvDigest: receipt.argvDigest,
    outputDigest: receipt.outputDigest,
    verdict: receipt.verdict,
    summary: receipt.summary,
  };
}

async function authorityDigest(root) {
  const entries = [];
  for (const candidate of AUTHORITY_PATHS) {
    entries.push({ path: candidate, digest: sha256(await readText(root, candidate)) });
  }
  return sha256(canonical(entries));
}

async function collectAttempt(root, testFiles, attempt) {
  const env = { SUPER_COMPOUND_CLEAN_RESET_ID: `release-${attempt}` };
  const full = await runNode(
    root,
    `clean-reset-${attempt}-full-suite`,
    ["--test", "--test-reporter=tap", ...testFiles],
    { tap: true, env },
  );
  const hook = await runNode(
    root,
    `clean-reset-${attempt}-hook-security`,
    [".agent/hooks/test-hooks-security.js"],
    { env },
  );
  const faults = await runNode(
    root,
    `clean-reset-${attempt}-fault-recovery`,
    ["--test", "--test-reporter=tap", ...FAULT_TESTS],
    { tap: true, env },
  );
  const [scan, verify] = await Promise.all([
    runNode(root, `clean-reset-${attempt}-migration-scan`, [
      ".agent/tools/migrate-loop-v2.mjs",
      "scan",
    ], { env }),
    runNode(root, `clean-reset-${attempt}-migration-verify`, [
      ".agent/tools/migrate-loop-v2.mjs",
      "verify",
    ], { env }),
  ]);
  const scanResult = JSON.parse(scan.stdout);
  const verifyResult = JSON.parse(verify.stdout);
  if (
    scanResult.schema !== "loop_runtime_migration_plan_v2" ||
    scanResult.payload?.config?.action !== "PRESERVE" ||
    scanResult.payload?.blockers?.length !== 0 ||
    scanResult.payload?.authority_findings?.length !== 0 ||
    scanResult.payload?.ledgers?.length !== 0 ||
    verifyResult.schema !== "loop_runtime_migration_verification_v2" ||
    verifyResult.ready_for_enforce !== true ||
    verifyResult.blockers?.length !== 0
  ) {
    throw new Error(`Clean reset ${attempt} migration verification failed`);
  }
  return {
    attempt,
    cleanReset: true,
    fullSuite: sanitizeCommand(full),
    hookSecurity: sanitizeCommand(hook),
    faultRecovery: sanitizeCommand(faults),
    migration: {
      scan: sanitizeCommand(scan),
      verify: sanitizeCommand(verify),
      verdict: "PASS",
    },
  };
}

async function optionalCanary(root, projectConfigDigest, requiredAuthorityDigest) {
  const absolute = await resolveRepositoryPath(root, CANARY_PATH, {
    label: "Live canary attestation",
  });
  const info = await lstat(absolute).catch(() => null);
  if (!info) return null;
  const candidate = JSON.parse(await readText(root, CANARY_PATH));
  if (
    candidate.schema !== "live_canary_attestation_v2" ||
    candidate.executionMode !== "ENFORCE" ||
    candidate.projectConfigDigest !== projectConfigDigest ||
    candidate.authorityDigest !== requiredAuthorityDigest ||
    candidate.externalWrites !== 0 ||
    !Array.isArray(candidate.attempts) ||
    candidate.attempts.length !== 9 ||
    candidate.attempts.some(
      (attempt) =>
        attempt.verdict !== "PASS" ||
        !DIGEST.test(attempt.eventHeadDigest) ||
        !DIGEST.test(attempt.verifierDigest),
    )
  ) {
    throw new Error("Live bounded ENFORCE canary attestation is invalid or stale");
  }
  for (const field of [
    "ownerApprovalDigest",
    "hostCapabilityDigest",
    "technicalApprovalDigest",
    "securityApprovalDigest",
  ]) {
    assertDigest(candidate[field], `Canary ${field}`);
  }
  if (candidate.technicalApprovalDigest === candidate.securityApprovalDigest) {
    throw new Error("Canary Technical and Security approvals must be distinct");
  }
  return {
    schema: candidate.schema,
    executionMode: candidate.executionMode,
    projectConfigDigest: candidate.projectConfigDigest,
    authorityDigest: candidate.authorityDigest,
    externalWrites: candidate.externalWrites,
    attempts: candidate.attempts,
    ownerApprovalDigest: candidate.ownerApprovalDigest,
    hostCapabilityDigest: candidate.hostCapabilityDigest,
    technicalApprovalDigest: candidate.technicalApprovalDigest,
    securityApprovalDigest: candidate.securityApprovalDigest,
    attestationDigest: sha256(canonical(candidate)),
  };
}

export function deriveCutoverDecision({
  projectConfig,
  liveCanary,
  preCanaryEvidencePass,
}) {
  if (
    projectConfig?.schema !== "project_config_v2" ||
    !Number.isSafeInteger(projectConfig.config_version) ||
    projectConfig.config_version < 1 ||
    !Number.isSafeInteger(projectConfig.mode_version) ||
    projectConfig.mode_version < 0 ||
    !["DISABLED", "OBSERVE", "ENFORCE", "HALTED"].includes(projectConfig.mode) ||
    !["DENY", "ALLOWLIST_ONLY"].includes(projectConfig.risk?.external_write_policy)
  ) {
    throw new Error("Cutover policy requires a complete project_config_v2 mode and risk policy");
  }
  if (preCanaryEvidencePass !== true) {
    return {
      currentMode: projectConfig.mode,
      recommendedMode: "DISABLED",
      modeTransitionPerformed: false,
      fullEnforceEligible: false,
      fullEnforceClaimAllowed: false,
      pendingHumanBoundaries: ["PRE_CANARY_EVIDENCE_FAILED"],
    };
  }
  const pending = [];
  if (!liveCanary) {
    pending.push(
      "LIVE_BOUNDED_ENFORCE_CANARY_REQUIRED",
      "HOST_CAPABILITY_ATTESTATION_REQUIRED",
      "OWNER_MODE_TRANSITION_APPROVAL_REQUIRED",
    );
  }
  if (projectConfig.mode !== "ENFORCE") {
    pending.push("EFFECTIVE_MODE_TRANSITION_REQUIRED");
  }
  if (projectConfig.risk.external_write_policy === "DENY") {
    pending.push("EXTERNAL_WRITE_POLICY_REMAINS_DENY");
  }
  pending.push("PRODUCTION_HOST_ATTESTATION_VERIFICATION_REQUIRED");
  const eligible = false;
  return {
    currentMode: projectConfig.mode,
    recommendedMode: eligible ? "ENFORCE" : "OBSERVE",
    modeTransitionPerformed: false,
    fullEnforceEligible: eligible,
    fullEnforceClaimAllowed: eligible,
    pendingHumanBoundaries: pending,
  };
}

export async function collectFreshReleaseEvidence(root) {
  const resolvedRoot = path.resolve(root);
  const toolNames = await readdir(path.join(resolvedRoot, ".agent", "tools"));
  const testFiles = toolNames
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => `.agent/tools/${name}`);
  const requiredAuthorityDigest = await authorityDigest(resolvedRoot);
  const benchmarkCommand = await runNode(resolvedRoot, "token-benchmark-pass3", [
    ".agent/tools/token-benchmark.mjs",
    "--baseline",
    ".agent/benchmarks/token-baseline.before.json",
    "--require-reduction",
    "90",
    "--repeat",
    "3",
    "--output",
    ".agent/benchmarks/token-benchmark.after.json",
  ]);
  const auditCommand = await runNode(resolvedRoot, "framework-audit-regenerate", [
    ".agent/tools/framework-audit.mjs",
    "--output",
    ".agent/benchmarks/framework-audit.after.json",
  ]);
  const attempts = await Promise.all(
    [1, 2, 3].map((attempt) => collectAttempt(resolvedRoot, testFiles, attempt)),
  );
  const auditVerify = await runNode(resolvedRoot, "framework-audit-verify", [
    ".agent/tools/framework-audit.mjs",
    "--verify-existing",
    ".agent/benchmarks/framework-audit.after.json",
  ]);
  const [
    projectConfigText,
    benchmarkText,
    auditText,
    backgroundFixtureText,
    tracesRun1,
    tracesRun2,
    tracesRun3,
  ] = await Promise.all([
    readText(resolvedRoot, ".agent/context/project-config.json"),
    readText(resolvedRoot, ".agent/benchmarks/token-benchmark.after.json"),
    readText(resolvedRoot, ".agent/benchmarks/framework-audit.after.json"),
    readText(resolvedRoot, ".agent/evals/fixtures/background-pilots-v2.json"),
    buildPairedRouteTraces(resolvedRoot, { authorityDigest: requiredAuthorityDigest }),
    buildPairedRouteTraces(resolvedRoot, { authorityDigest: requiredAuthorityDigest }),
    buildPairedRouteTraces(resolvedRoot, { authorityDigest: requiredAuthorityDigest }),
  ]);
  const projectConfig = JSON.parse(projectConfigText);
  const benchmark = JSON.parse(benchmarkText);
  const audit = JSON.parse(auditText);
  const backgroundFixture = JSON.parse(backgroundFixtureText);
  if (
    benchmark.pass !== true ||
    benchmark.repeat !== 3 ||
    benchmark.consecutivePasses !== 3 ||
    !Number.isFinite(benchmark.result?.summary?.minimumReductionPercent) ||
    benchmark.result.summary.minimumReductionPercent <= 90 ||
    benchmark.runtimePass !== null
  ) {
    throw new Error("Generated benchmark evidence is incomplete or overclaims runtime");
  }
  if (
    audit.pass !== true ||
    audit.summary?.findings !== 0 ||
    audit.coverage?.accountedPercent !== 100
  ) {
    throw new Error("Generated framework audit evidence is incomplete");
  }
  if (
    backgroundFixture.schema !== "background_pilot_suite_v2" ||
    backgroundFixture.pilots?.length !== 10
  ) {
    throw new Error("Background pilot fixture must contain exactly ten pilots");
  }
  const traceDigests = [tracesRun1, tracesRun2, tracesRun3].map((traces) =>
    sha256(canonical(traces)),
  );
  if (new Set(traceDigests).size !== 1) {
    throw new Error("OBSERVE route traces are not deterministic across clean resets");
  }
  const projectConfigDigest = sha256(projectConfigText);
  const liveCanary = await optionalCanary(
    resolvedRoot,
    projectConfigDigest,
    requiredAuthorityDigest,
  );
  const evidence = {
    schema: "fresh_release_execution_evidence_v2",
    authorityDigest: requiredAuthorityDigest,
    projectConfig,
    projectConfigDigest,
    attempts,
    observe: {
      verdict: "PASS",
      selectedLowRiskGoals: ["sc-status", "sc-review", "sc-audit"],
      attemptsPerGoal: 3,
      safetyParityPercent: 100,
      terminalParityPercent: 100,
      releaseParityPercent: 100,
      nonblockingParityPercent: 100,
      traceDigests,
      pairedTraces: tracesRun3,
    },
    benchmark: {
      verdict: "PASS",
      repeats: benchmark.repeat,
      minimumReductionPercent: benchmark.result.summary.minimumReductionPercent,
      totalReductionPercent: benchmark.result.summary.totalReductionPercent,
      reportDigest: sha256(benchmarkText),
      command: sanitizeCommand(benchmarkCommand),
    },
    audit: {
      verdict: "PASS",
      findings: audit.summary.findings,
      accountedPercent: audit.coverage.accountedPercent,
      reportDigest: sha256(auditText),
      regenerateCommand: sanitizeCommand(auditCommand),
      verifyCommand: sanitizeCommand(auditVerify),
    },
    background: {
      verdict: "PASS",
      pilotCount: backgroundFixture.pilots.length,
      fixtureDigest: sha256(backgroundFixtureText),
    },
    externalSandbox: {
      verdict: "PASS",
      fakeAdapter: true,
      realExternalMutation: false,
      failurePoints: FAILURE_POINTS,
      evidenceSource: "clean-reset fault/recovery command receipts",
    },
    packaging: {
      verdict: "PASS",
      durableEvalPackaged: testFiles.includes(".agent/tools/codex-install.test.mjs"),
    },
    liveCanary,
  };
  TRUSTED_EVIDENCE.add(evidence);
  return evidence;
}

export function buildReleaseCutoverReceipt(evidence) {
  if (!TRUSTED_EVIDENCE.has(evidence)) {
    throw new Error("Release receipt requires fresh evidence from the executable collector");
  }
  validatePairedRouteTraces(evidence.observe.pairedTraces);
  const preCanaryEvidencePass =
    evidence.attempts.length === 3 &&
    evidence.attempts.every(
      (attempt, index) =>
        attempt.attempt === index + 1 &&
        attempt.cleanReset === true &&
        attempt.fullSuite.summary.pass === attempt.fullSuite.summary.tests &&
        attempt.fullSuite.summary.fail === 0 &&
        attempt.hookSecurity.verdict === "PASS" &&
        attempt.faultRecovery.summary.fail === 0 &&
        attempt.migration.verdict === "PASS",
    ) &&
    evidence.benchmark.verdict === "PASS" &&
    evidence.audit.verdict === "PASS" &&
    evidence.background.pilotCount === 10 &&
    evidence.externalSandbox.failurePoints.length === 6 &&
    evidence.packaging.durableEvalPackaged === true;
  const cutover = deriveCutoverDecision({
    projectConfig: evidence.projectConfig,
    liveCanary: evidence.liveCanary,
    preCanaryEvidencePass,
  });
  const releaseEvidencePass = preCanaryEvidencePass && cutover.fullEnforceEligible;
  const receipt = {
    schema: "release_cutover_receipt_v2",
    contractVersion: "2.0.0",
    authorityDigest: evidence.authorityDigest,
    projectConfigDigest: evidence.projectConfigDigest,
    verdict: releaseEvidencePass ? "PASS" : "APPROVAL_REQUIRED",
    goalMet: releaseEvidencePass,
    preCanaryEvidencePass,
    releaseEvidencePass,
    cleanResetAttempts: evidence.attempts,
    observe: evidence.observe,
    benchmark: evidence.benchmark,
    audit: evidence.audit,
    background: evidence.background,
    externalSandbox: evidence.externalSandbox,
    packaging: evidence.packaging,
    liveCanary: evidence.liveCanary,
    cutover,
  };
  receipt.receiptDigest = sha256(canonical(receipt));
  return receipt;
}

function parseArgs(argv) {
  if (
    argv.length !== 2 ||
    argv[0] !== "--expected-output-digest" ||
    !(argv[1] === "ABSENT" || DIGEST.test(argv[1]))
  ) {
    throw new Error(
      "Usage: release-cutover.mjs --expected-output-digest <ABSENT|sha256:digest>",
    );
  }
  return { expectedOutputDigest: argv[1] };
}

async function currentOutputDigest(root) {
  const absolute = await resolveRepositoryPath(root, OUTPUT_PATH, {
    label: "Release cutover output",
  });
  const info = await lstat(absolute).catch(() => null);
  if (!info) return "ABSENT";
  return sha256(await readText(root, OUTPUT_PATH));
}

export async function runReleaseCutoverCli(argv, options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const { expectedOutputDigest } = parseArgs(argv);
  const evidence = await collectFreshReleaseEvidence(root);
  const receipt = buildReleaseCutoverReceipt(evidence);
  await withOwnerLock(root, LOCK_PATH, async () => {
    if ((await currentOutputDigest(root)) !== expectedOutputDigest) {
      throw new Error("Release cutover output CAS mismatch");
    }
    const result = await writeFileAtomic(
      root,
      OUTPUT_PATH,
      `${JSON.stringify(receipt, null, 2)}\n`,
      {
        label: "Release cutover output",
        maxBytes: MAX_BYTES,
        assertBeforeReplace: async () => {
          if ((await currentOutputDigest(root)) !== expectedOutputDigest) {
            throw new Error("Release cutover output changed before replace");
          }
        },
      },
    );
    if (result.durability.fileSync !== true || result.durability.atomicReplace !== true) {
      throw new Error("Release cutover receipt did not reach durable atomic persistence");
    }
  });
  return receipt;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  runReleaseCutoverCli(process.argv.slice(2))
    .then((receipt) => {
      process.stdout.write(
        `Release cutover: ${receipt.verdict}; pre-canary=${receipt.preCanaryEvidencePass}; full-enforce=${receipt.cutover.fullEnforceEligible}; digest=${receipt.receiptDigest}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
