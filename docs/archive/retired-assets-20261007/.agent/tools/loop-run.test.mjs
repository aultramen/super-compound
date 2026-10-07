import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertLoopRunControllerAuthority,
  createLoopRunController,
  runLoopRunCli,
} from "./loop-run.mjs";
import { writeFileAtomic as durableWriteFileAtomic } from "./file-state.mjs";
import {
  deriveEvalAttemptDigest,
  deriveFindingSetDigest,
} from "./eval-gate-model.mjs";
import { createProjectModeCapabilityAuthority } from "./project-config.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const CREATED_AT = "2026-07-18T00:00:00.000Z";
const LOOP_RUN_CLI = fileURLToPath(new URL("./loop-run.mjs", import.meta.url));

function sha256(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function projectRootDigest(root) {
  return sha256(
    JSON.stringify({
      domain: "super-compound.project-mode-capability-root.v2",
      root: path.resolve(root),
    }),
  );
}

function eventDigest(event) {
  const { event_hash: ignored, ...unsigned } = event;
  return sha256(JSON.stringify(unsigned));
}

function authorityBindingDigest(contract) {
  return sha256(
    JSON.stringify({
      goal: contract.goal,
      authority: contract.authority,
      verifier: contract.verifier,
      project_config_digest: contract.project_config_digest,
    }),
  );
}

function policyBindingDigest(contract) {
  return sha256(JSON.stringify(contract.policy));
}

function makeConfirmation(contract, overrides = {}) {
  return {
    schema: "budget_confirmation_v2",
    contract_version: "2.0.0",
    confirmation_id: "confirmation-test-004-start",
    proposal_digest: DIGEST_A,
    run_id: contract.run_id,
    phase: "START",
    queue_item_id: null,
    expected_run_version: 1,
    goal_ref: contract.goal.ref,
    goal_digest: contract.goal.digest,
    authority_digest: authorityBindingDigest(contract),
    project_config_digest: contract.project_config_digest,
    verifier_ref: contract.verifier.ref,
    verifier_digest: contract.verifier.digest,
    regression_verifier_digest: contract.verifier.regression_verifier_digest,
    eval_definition_digest: contract.verifier.eval_definition_digest,
    policy_digest: policyBindingDigest(contract),
    billing_currency: "USD",
    confirmed_limits: {
      max_iterations: contract.policy.max_iterations,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost: null,
    },
    confirmed_budget: {
      max_iterations: contract.policy.max_iterations,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost_micro: null,
    },
    effective_budget: {
      max_iterations: contract.policy.max_iterations,
      max_runtime_minutes: contract.policy.max_runtime_minutes,
      max_no_progress_iterations: contract.policy.max_no_progress_iterations,
      max_tokens: contract.policy.max_tokens,
      max_cost_micro: contract.policy.max_cost_micro,
    },
    autonomy_profile: contract.autonomy_profile,
    risk_profile: contract.risk_profile,
    approver: {
      actor_id: "host-human-004",
      actor_type: "HUMAN",
      attestation: "LOCAL_OBSERVE_HUMAN",
    },
    confirmed_at: "2026-07-18T00:10:00.000Z",
    expires_at: "2026-07-18T01:00:00.000Z",
    ...overrides,
  };
}

function makeFreshness(contract, overrides = {}) {
  return {
    authority_digest: authorityBindingDigest(contract),
    project_config_digest: contract.project_config_digest,
    verifier_digest: contract.verifier.digest,
    eval_definition_digest: contract.verifier.eval_definition_digest,
    ...overrides,
  };
}

async function proposeDigest(controller, contract, phase = "START") {
  return (
    await controller.proposeBudget({
      runId: contract.run_id,
      phase,
    })
  ).proposal_digest;
}

function makeProjectConfig() {
  return {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "OBSERVE",
    policy: {
      max_iterations: 12,
      max_runtime_minutes: 240,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 720,
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [],
      required_gates: ["fresh-verifier"],
      risk: "MEDIUM",
      isolation: "WORKTREE",
      expires_at: "9999-12-31T23:59:59.999999999Z",
    },
    background_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 21_600_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    billing_currency: "USD",
    retention: {
      run_metadata_days: 30,
      audit_evidence_days: 90,
      legal_hold_behavior: "PRESERVE",
    },
    telemetry: {
      enabled: false,
      persistence_required: false,
      redaction_revision: null,
      retention_days: null,
      max_file_bytes: null,
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_C,
    },
    risk: {
      default_profile: "MEDIUM",
      maximum_autonomy: "INTERACTIVE",
      external_write_policy: "DENY",
    },
    write_classification: {
      runtime_audit_prefixes: [".scratch/loop-runs/"],
      authority_prefixes: ["docs/fsd/"],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["HARD_WRITE_INTERCEPTION"],
      background: ["FINITE_RUNTIME_CAP"],
      external_write: ["DURABLE_INTENT"],
    },
    artifact_authority: {
      required_contract_version: "2.0.0",
      execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
      legacy_action: "REPLAN_REQUIRED",
    },
  };
}

function makeContract(projectConfigDigest, sources) {
  const digestFor = (role) =>
    sources.find((source) => source.role === role).content_digest;
  return {
    schema: "loop_run_contract_v2",
    contract_version: "2.0.0",
    run_id: "LER2-TEST-004",
    goal: {
      ref: "FSD-LER2@1.0.0#GOAL-004",
      digest: digestFor("GOAL"),
      summary: "Exercise the persistent Loop Run controller.",
      acceptance_criteria: [
        "TEST-004 passes with durable admission and cumulative counters.",
      ],
    },
    authority: {
      brd_digest: digestFor("BRD"),
      prd_digest: digestFor("PRD"),
      fsd_digest: digestFor("FSD"),
      adr_digests: sources
        .filter((source) => source.role === "ADR")
        .map((source) => source.content_digest),
      operation_inventory_digest: digestFor("OPERATION_INVENTORY"),
      sources: structuredClone(sources),
      base_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
    },
    verifier: {
      ref: "FSD-LER2@1.0.0#TEST-004",
      digest: digestFor("VERIFIER"),
      eval_definition_digest: digestFor("EVAL"),
      regression_verifier_digest: digestFor("REGRESSION_VERIFIER"),
      eval_class: "CAPABILITY",
      success_threshold: {
        metric: "PASS_AT_K",
        k: 3,
        minimum_basis_points: 9000,
      },
    },
    policy: {
      max_iterations: 12,
      max_runtime_minutes: 240,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 720,
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [],
      required_gates: ["fresh-verifier"],
      risk: "MEDIUM",
      isolation: "WORKTREE",
      expires_at: "2026-07-19T00:00:00.000Z",
    },
    lineage: { parent_run_id: null, root_run_id: "LER2-TEST-004" },
    autonomy_profile: "INTERACTIVE",
    risk_profile: "MEDIUM",
    project_config_digest: projectConfigDigest,
    created_at: CREATED_AT,
  };
}

async function writeAuthoritySources(root) {
  const definitions = [
    ["GOAL", ".scratch/issues/11-action-adapter-capability.md", "goal authority\n"],
    ["BRD", "docs/brd/brd-loop-runtime-v2.md", "brd authority\n"],
    ["PRD", "docs/prd/prd-loop-runtime-v2.md", "prd authority\n"],
    ["FSD", "docs/fsd/fsd-loop-runtime-v2.md", "fsd authority\n"],
    ["ADR", "docs/solutions/adr-0001-loop-run-controller-v2.md", "adr authority\n"],
    ["VERIFIER", ".agent/verifiers/test-004.md", "target verifier authority\n"],
    [
      "REGRESSION_VERIFIER",
      ".agent/verifiers/test-004-regression.md",
      "regression verifier authority\n",
    ],
    ["EVAL", ".agent/evals/loop-runtime-v2.md", "eval authority\n"],
    [
      "OPERATION_INVENTORY",
      ".agent/context/operation-inventory.json",
      "{\"schema\":\"operation_inventory_v2\",\"operations\":[]}\n",
    ],
  ];
  const contents = new Map();
  const sources = [];
  for (const [role, sourcePath, content] of definitions) {
    const absolute = path.join(root, ...sourcePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    contents.set(sourcePath, content);
    sources.push({ role, source_path: sourcePath, content_digest: sha256(content) });
  }
  return { contents, sources };
}

async function makeRepository() {
  const root = await mkdtemp(path.join(tmpdir(), "loop-run-v2-"));
  const contextDirectory = path.join(root, ".agent", "context");
  const schemasDirectory = path.join(contextDirectory, "schemas");
  await mkdir(schemasDirectory, { recursive: true });
  await writeFile(
    path.join(schemasDirectory, "project-config-v2.schema.json"),
    await readFile(
      new URL("../context/schemas/project-config-v2.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const configText = `${JSON.stringify(makeProjectConfig(), null, 2)}\n`;
  await writeFile(path.join(contextDirectory, "project-config.json"), configText);
  const authority = await writeAuthoritySources(root);
  const contract = makeContract(sha256(configText), authority.sources);
  const contractText = `${JSON.stringify(contract, null, 2)}\n`;
  await writeFile(path.join(root, "contract-input.json"), contractText);
  return {
    authoritySourceContents: authority.contents,
    contract,
    contractText,
    root,
  };
}

async function installProjectModeCapability(
  fixture,
  {
    configText,
    now = () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation = async () => true,
  } = {},
) {
  const contextDirectory = path.join(fixture.root, ".agent", "context");
  const schemasDirectory = path.join(contextDirectory, "schemas");
  await writeFile(
    path.join(schemasDirectory, "project-mode-capability-v2.schema.json"),
    await readFile(
      new URL(
        "../context/schemas/project-mode-capability-v2.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const authoritativeConfigText =
    configText ??
    (await readFile(path.join(contextDirectory, "project-config.json"), "utf8"));
  const authoritativeConfig = JSON.parse(authoritativeConfigText);
  const attestation = {
    schema: "project_mode_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "project-mode-loop-run-controller",
    purpose: "PROJECT_MODE_ENFORCE",
    project_root_digest: projectRootDigest(fixture.root),
    workspace_root_digest: sha256(`workspace:${fixture.root}`),
    project_config_digest: sha256(authoritativeConfigText),
    config_version: authoritativeConfig.config_version,
    mode_version: authoritativeConfig.mode_version,
    host_ref: "codex-loop-run-test-host",
    host_identity_digest: sha256("loop-run-test-host-identity"),
    host_verifier_digest: sha256("loop-run-test-host-verifier"),
    write_interceptor_digest: sha256("loop-run-test-write-interceptor"),
    filesystem_type: "ext4",
    external_write_policy: "DENY",
    capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    issued_at: "2026-07-22T00:00:00.000Z",
    expires_at: "2026-07-23T00:00:00.000Z",
    evidence_digest: sha256("loop-run-controller-mode-capability"),
  };
  await writeFile(
    path.join(contextDirectory, "project-mode-capability.json"),
    `${JSON.stringify(attestation, null, 2)}\n`,
  );
  return createProjectModeCapabilityAuthority(fixture.root, {
    now,
    verifyHostAttestation,
  });
}

async function writeReleaseArtifacts(fixture, verifyingState) {
  const goalId = fixture.contract.goal.ref.split("#").at(-1);
  const evidencePath = `.scratch/evidence/${fixture.contract.run_id}-pass.json`;
  const evidenceContent = `${JSON.stringify({ verdict: "PASS", goal_id: goalId })}\n`;
  const regressionEvidencePath =
    `.scratch/evidence/${fixture.contract.run_id}-regression-pass.json`;
  const regressionEvidenceContent =
    `${JSON.stringify({ verdict: "PASS", goal_id: goalId, suite: "REGRESSION" })}\n`;
  await mkdir(path.join(fixture.root, ".scratch", "evidence"), { recursive: true });
  await writeFile(path.join(fixture.root, ...evidencePath.split("/")), evidenceContent);
  await writeFile(
    path.join(fixture.root, ...regressionEvidencePath.split("/")),
    regressionEvidenceContent,
  );
  const evidenceDigest = sha256(evidenceContent).slice("sha256:".length);
  const regressionEvidenceDigest = sha256(regressionEvidenceContent).slice(
    "sha256:".length,
  );
  const workspaceHeadGitSha = fixture.contract.authority.base_git_sha;
  const attempts = [1, 2, 3].map((number) => ({
    attempt_number: number,
    reset_id: `clean-reset-${number}`,
    reset_attestation: "HOST_ATTESTED_CLEAN_RESET",
    run_head_digest: verifyingState.last_event_hash,
    workspace_head_git_sha: workspaceHeadGitSha,
    verifier_digest: fixture.contract.verifier.digest,
    verdict: "PASS",
    evidence_refs: [evidencePath],
    regression: {
      verifier_digest: fixture.contract.verifier.regression_verifier_digest,
      verdict: "PASS",
      evidence_refs: [regressionEvidencePath],
    },
    started_at: `2026-07-18T00:0${number * 2 + 2}:00.000Z`,
    completed_at: `2026-07-18T00:0${number * 2 + 3}:00.000Z`,
  }));
  const finalAttemptDigest = deriveEvalAttemptDigest(attempts.at(-1));
  const inventoryPath = `.scratch/evidence/${fixture.contract.run_id}-finding-inventory.json`;
  const inventoryContent = {
    attestation: "HOST_ATTESTED_COMPLETE_FINDING_SET",
    run_id: fixture.contract.run_id,
    goal_ref: fixture.contract.goal.ref,
    eval_definition_digest: fixture.contract.verifier.eval_definition_digest,
    run_head_digest: verifyingState.last_event_hash,
    workspace_head_git_sha: workspaceHeadGitSha,
    final_attempt_number: 3,
    final_attempt_digest: finalAttemptDigest,
    source_records: [],
    finding_set_digest: deriveFindingSetDigest([]),
    recorded_at: "2026-07-18T00:09:15.000Z",
  };
  const inventoryText = `${JSON.stringify(inventoryContent, null, 2)}\n`;
  await writeFile(path.join(fixture.root, ...inventoryPath.split("/")), inventoryText);
  const inventoryDigest = sha256(inventoryText);

  const ledger = {
    schema: "work_package_ledger_v2",
    runId: fixture.contract.run_id,
    ledgerVersion: 4,
    goals: {
      [goalId]: {
        status: "verified",
        briefPath: `.scratch/work-packages/${fixture.contract.run_id}/${goalId}/brief.md`,
        reportPath: `.scratch/work-packages/${fixture.contract.run_id}/${goalId}/report.md`,
        pathsPath: `.scratch/work-packages/${fixture.contract.run_id}/${goalId}/paths.json`,
        reviewPackagePath:
          `.scratch/work-packages/${fixture.contract.run_id}/${goalId}/review-package.md`,
        scopeDigest: DIGEST_A.slice("sha256:".length),
        baselineDirty: {},
        verification: "Fresh verifier PASS bound to release evidence.",
        expectedEvidence: {
          authorityDigest: fixture.contract.authority.fsd_digest.slice("sha256:".length),
          evalDigest:
            fixture.contract.verifier.eval_definition_digest.slice("sha256:".length),
          reviewerDigest: fixture.contract.verifier.digest.slice("sha256:".length),
        },
        evidence: {
          authorityDigest: fixture.contract.authority.fsd_digest.slice("sha256:".length),
          evalDigest:
            fixture.contract.verifier.eval_definition_digest.slice("sha256:".length),
          reviewerDigest: fixture.contract.verifier.digest.slice("sha256:".length),
          evidenceRefs: [evidencePath, regressionEvidencePath, inventoryPath],
          evidenceArtifacts: [
            { path: evidencePath, digest: evidenceDigest },
            { path: regressionEvidencePath, digest: regressionEvidenceDigest },
            { path: inventoryPath, digest: inventoryDigest.slice("sha256:".length) },
          ],
        },
      },
    },
  };
  const ledgerPath = `.scratch/work-packages/${fixture.contract.run_id}/ledger.json`;
  await mkdir(path.dirname(path.join(fixture.root, ...ledgerPath.split("/"))), {
    recursive: true,
  });
  await writeFile(
    path.join(fixture.root, ...ledgerPath.split("/")),
    `${JSON.stringify(ledger, null, 2)}\n`,
  );

  const evalResult = {
    schema: "eval_result_v2",
    contract_version: "2.0.0",
    eval_result_id: `${fixture.contract.run_id}-eval-1`,
    run_id: fixture.contract.run_id,
    goal_ref: fixture.contract.goal.ref,
    eval_definition_digest: fixture.contract.verifier.eval_definition_digest,
    verifier_digest: fixture.contract.verifier.digest,
    base_git_sha: fixture.contract.authority.base_git_sha,
    eval_class: fixture.contract.verifier.eval_class,
    success_threshold: structuredClone(fixture.contract.verifier.success_threshold),
    evaluation_mode: "DETERMINISTIC",
    risk_profile: fixture.contract.risk_profile,
    maker_actor_id: "maker-test-009",
    checker: null,
    findings: [],
    finding_inventory: {
      ...inventoryContent,
      evidence_ref: inventoryPath,
      evidence_digest: inventoryDigest,
    },
    attempts,
    pass_metrics: {
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    },
    regression_pass_metrics: {
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    },
    human_gates: [],
    artifact_revision: {
      artifact_type: "ISSUE",
      artifact_id: goalId,
      artifact_version: "1.0.0",
      artifact_contract_version: "2.0.0",
      digest: fixture.contract.goal.digest,
    },
    workspace_revision: {
      base_git_sha: fixture.contract.authority.base_git_sha,
      head_git_sha: workspaceHeadGitSha,
    },
    verdict: "PASS",
    fresh: true,
    run_head_digest: verifyingState.last_event_hash,
    recorded_at: "2026-07-18T00:09:30.000Z",
  };
  const evalResultPath = `.scratch/eval-results/${fixture.contract.run_id}.json`;
  await mkdir(path.dirname(path.join(fixture.root, ...evalResultPath.split("/"))), {
    recursive: true,
  });
  const evalResultText = `${JSON.stringify(evalResult, null, 2)}\n`;
  await writeFile(
    path.join(fixture.root, ...evalResultPath.split("/")),
    evalResultText,
  );
  return {
    evidenceContent,
    evidencePath,
    evalResultPath,
    evalResultText,
    goalId,
    ledgerPath,
    workspaceHeadGitSha,
  };
}

async function persistTerminalState(root, contract, confirmedState, ordinal) {
  const runDirectory = path.join(root, ".scratch", "loop-runs", contract.run_id);
  const unsigned = {
    schema: "loop_run_event_v2",
    contract_version: "2.0.0",
    event_id: `gap-006-terminal-${String(ordinal).padStart(2, "0")}`,
    run_id: contract.run_id,
    sequence: confirmedState.sequence + 1,
    version: confirmedState.version + 1,
    type: "STOPPED",
    recorded_at: "2026-07-18T00:10:00.000Z",
    previous_hash: confirmedState.last_event_hash,
    data: {
      terminal_status: "BLOCKED",
      reason: "TEST_LINEAGE_COMPLETE",
    },
  };
  const event = { ...unsigned, event_hash: sha256(JSON.stringify(unsigned)) };
  const eventsPath = path.join(runDirectory, "events.jsonl");
  await writeFile(
    eventsPath,
    `${await readFile(eventsPath, "utf8")}${JSON.stringify(event)}\n`,
  );
  await writeFile(
    path.join(runDirectory, "state.json"),
    `${JSON.stringify({
      ...confirmedState,
      status: "BLOCKED",
      version: event.version,
      sequence: event.sequence,
      terminal_reason: "TEST_LINEAGE_COMPLETE",
      last_event_hash: event.event_hash,
    }, null, 2)}\n`,
  );
}

async function makeConfirmedLineage(depth) {
  const fixture = await makeRepository();
  let nextId = 0;
  let hostAttestationChecks = 0;
  const replayReads = [];
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `gap-006-${String(++nextId).padStart(5, "0")}`,
    verifyHostHumanAttestation: async () => {
      hostAttestationChecks += 1;
      return true;
    },
    observeReplayRead: async (read) => {
      replayReads.push(read);
    },
  });
  const contracts = [];
  const replayArtifacts = [];
  for (let index = 0; index < depth; index += 1) {
    const contract = structuredClone(fixture.contract);
    contract.run_id = `LER2-GAP-006-${String(index + 1).padStart(2, "0")}`;
    contract.lineage = {
      parent_run_id: index === 0 ? null : contracts[index - 1].run_id,
      root_run_id: index === 0 ? contract.run_id : contracts[0].run_id,
    };
    const inputFile = `gap-006-contract-${String(index + 1).padStart(2, "0")}.json`;
    await writeFile(
      path.join(fixture.root, inputFile),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    const created = await controller.create({ contractFile: inputFile });
    const proposed = await controller.proposeBudget({
      runId: contract.run_id,
      phase: "START",
    });
    const confirmation = makeConfirmation(contract, {
      confirmation_id: `gap-006-confirmation-${String(index + 1).padStart(2, "0")}`,
      proposal_digest: proposed.proposal_digest,
      approver: {
        actor_id: "gap-006-host-human",
        actor_type: "HUMAN",
        attestation: "HOST_ATTESTED_HUMAN",
      },
    });
    const confirmationFile =
      `gap-006-confirmation-${String(index + 1).padStart(2, "0")}.json`;
    await writeFile(
      path.join(fixture.root, confirmationFile),
      `${JSON.stringify(confirmation, null, 2)}\n`,
    );
    const confirmed = await controller.confirmBudget({
      runId: contract.run_id,
      expectedVersion: created.state.version,
      inputFile: confirmationFile,
    });
    await persistTerminalState(fixture.root, contract, confirmed.state, index + 1);
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      contract.run_id,
    );
    replayArtifacts.push({
      run_id: contract.run_id,
      confirmation: path.join(
        runDirectory,
        "confirmations",
        `${confirmed.confirmation_digest.slice("sha256:".length)}.json`,
      ),
      contract: path.join(runDirectory, "contract.json"),
      events: path.join(runDirectory, "events.jsonl"),
      proposal: path.join(
        runDirectory,
        "proposals",
        `${proposed.proposal_digest.slice("sha256:".length)}.json`,
      ),
      snapshot: path.join(runDirectory, "state.json"),
    });
    contracts.push(contract);
  }
  return {
    ...fixture,
    contracts,
    controller,
    getHostAttestationChecks: () => hostAttestationChecks,
    getReplayReads: () => replayReads,
    replayArtifacts,
  };
}

async function rewriteLineageAndRehash(root, contract, lineage) {
  const runDirectory = path.join(root, ".scratch", "loop-runs", contract.run_id);
  const rewrittenContract = { ...contract, lineage };
  const contractText = `${JSON.stringify(rewrittenContract, null, 2)}\n`;
  await writeFile(path.join(runDirectory, "contract.json"), contractText);

  const eventsPath = path.join(runDirectory, "events.jsonl");
  const events = (await readFile(eventsPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  let previousHash = null;
  for (let index = 0; index < events.length; index += 1) {
    events[index].previous_hash = previousHash;
    if (index === 0) events[index].data.contract_digest = sha256(contractText);
    events[index].event_hash = eventDigest(events[index]);
    previousHash = events[index].event_hash;
  }
  await writeFile(eventsPath, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

  const statePath = path.join(runDirectory, "state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.last_event_hash = previousHash;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return rewrittenContract;
}

async function writeValidBehindSnapshot(root, contract) {
  const runDirectory = path.join(root, ".scratch", "loop-runs", contract.run_id);
  const events = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const current = JSON.parse(
    await readFile(path.join(runDirectory, "state.json"), "utf8"),
  );
  const behind = {
    ...current,
    status: "READY",
    version: events[1].version,
    sequence: events[1].sequence,
    terminal_reason: null,
    last_event_hash: events[1].event_hash,
  };
  await writeFile(
    path.join(runDirectory, "state.json"),
    `${JSON.stringify(behind, null, 2)}\n`,
  );
}

test("create persists an immutable contract and hash-linked CREATED event before its snapshot", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => CREATED_AT,
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
  });

  try {
    const created = await controller.create({ contractFile: "contract-input.json" });
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    const persistedContract = await readFile(path.join(runDirectory, "contract.json"), "utf8");
    const eventLines = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
      .trim()
      .split("\n");
    const event = JSON.parse(eventLines[0]);
    const state = JSON.parse(await readFile(path.join(runDirectory, "state.json"), "utf8"));

    assert.equal(persistedContract, fixture.contractText);
    assert.equal(eventLines.length, 1);
    assert.equal(event.type, "CREATED");
    assert.equal(event.previous_hash, null);
    assert.equal(event.event_hash, eventDigest(event));
    assert.equal(state.last_event_hash, event.event_hash);
    assert.equal(state.sequence, 1);
    assert.equal(state.version, 1);
    assert.deepEqual(created.state, state);

    await assert.rejects(
      controller.create({ contractFile: "contract-input.json" }),
      /already exists|immutable/i,
    );
    assert.equal(await readFile(path.join(runDirectory, "contract.json"), "utf8"), fixture.contractText);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-010 controller rejects private authority and approver data before persistence", async () => {
  const fixture = await makeRepository();
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => "privacy-event-0001",
  });

  try {
    const privateContract = structuredClone(fixture.contract);
    privateContract.run_id = "LER2-TEST-010-PRIVATE";
    privateContract.lineage.root_run_id = privateContract.run_id;
    privateContract.goal.summary = "Contact private.person@example.com before execution.";
    await writeFile(
      path.join(fixture.root, "private-contract.json"),
      `${JSON.stringify(privateContract, null, 2)}\n`,
    );
    await assert.rejects(
      controller.create({ contractFile: "private-contract.json" }),
      (error) =>
        /PRIVACY_STOP/u.test(error.message) &&
        !error.message.includes("private.person@example.com"),
    );
    await assert.rejects(
      access(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          privateContract.run_id,
        ),
      ),
    );

    const created = await controller.create({ contractFile: "contract-input.json" });
    const proposalDigest = await proposeDigest(controller, fixture.contract);
    const privateConfirmation = makeConfirmation(fixture.contract, {
      proposal_digest: proposalDigest,
      approver: {
        actor_id: "private.person@example.com",
        actor_type: "HUMAN",
        attestation: "LOCAL_OBSERVE_HUMAN",
      },
    });
    await writeFile(
      path.join(fixture.root, "private-confirmation.json"),
      `${JSON.stringify(privateConfirmation, null, 2)}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: created.state.version,
        inputFile: "private-confirmation.json",
      }),
      /PRIVACY_STOP/u,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).state.version,
      created.state.version,
    );
    assert.equal((await controller.showMode()).effective_mode, "OBSERVE");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-010 persisted private authority latches project HALTED", async () => {
  const fixture = await makeRepository();
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => "privacy-persisted-event-0001",
  });
  try {
    await controller.create({ contractFile: "contract-input.json" });
    const stored = structuredClone(fixture.contract);
    stored.goal.summary = "private.person@example.com";
    await writeFile(
      path.join(fixture.root, ".scratch", "loop-runs", stored.run_id, "contract.json"),
      `${JSON.stringify(stored, null, 2)}\n`,
    );
    await assert.rejects(controller.show({ runId: stored.run_id }), /PRIVACY_STOP/u);
    const mode = await controller.showMode();
    assert.equal(mode.effective_mode, "HALTED");
    assert.equal(mode.safety_state.reason_code, "PERSISTED_PRIVACY_VIOLATION");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-010 required telemetry failure leaves snapshot behind and repair rebuilds projection", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.telemetry = {
    ...config.telemetry,
    enabled: true,
    persistence_required: true,
    redaction_revision: "redaction-2026-07",
    retention_days: 30,
    max_file_bytes: 65536,
    purpose: "LOOP_RUNTIME_OPERATIONAL_ASSURANCE",
    classification: "INTERNAL_OPERATIONAL_NO_RAW_CONTENT",
    acl: {
      read_roles: ["runtime-auditor"],
      write_roles: ["loop-controller"],
      export_roles: ["runtime-auditor"],
    },
    rotation: {
      strategy: "PER_RUN_SEGMENTED_JSONL",
      max_segments: 16,
    },
    disposition: "DELETE_DERIVED_TELEMETRY",
  };
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );
  let nextId = 0;
  const common = {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `telemetry-event-${String(++nextId).padStart(4, "0")}`,
    verifyTelemetryAccess: async () => true,
  };
  const controller = createLoopRunController(fixture.root, {
    ...common,
    telemetryStoreDependencies: {
      writeFileAtomic: async (root, candidate, content, options) => {
        if (
          String(candidate).endsWith(".jsonl") &&
          String(content).includes('"sequence":3')
        ) {
          throw new Error("injected telemetry persistence failure");
        }
        return durableWriteFileAtomic(root, candidate, content, options);
      },
    },
  });

  try {
    const created = await controller.create({ contractFile: "contract-input.json" });
    const proposalDigest = await proposeDigest(controller, fixture.contract);
    await writeFile(
      path.join(fixture.root, "telemetry-confirmation.json"),
      `${JSON.stringify(
        makeConfirmation(fixture.contract, { proposal_digest: proposalDigest }),
        null,
        2,
      )}\n`,
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: created.state.version,
      inputFile: "telemetry-confirmation.json",
    });
    await writeFile(
      path.join(fixture.root, "telemetry-start.json"),
      `${JSON.stringify({
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: confirmed.state.version,
        command: "START",
        inputFile: "telemetry-start.json",
      }),
      /telemetry persistence failure/i,
    );
    const haltedMode = await controller.showMode();
    assert.equal(haltedMode.effective_mode, "HALTED");
    assert.equal(
      haltedMode.safety_state.reason_code,
      "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE",
    );

    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    const events = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
      .trim()
      .split("\n");
    const snapshot = JSON.parse(await readFile(path.join(runDirectory, "state.json"), "utf8"));
    assert.equal(events.length, 3);
    assert.equal(snapshot.version, 2);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot is behind/i,
    );

    const healthy = createLoopRunController(fixture.root, common);
    const repaired = await healthy.repair({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
    });
    assert.equal(repaired.state.version, 4);
    const index = JSON.parse(
      await readFile(path.join(runDirectory, "telemetry", "index.json"), "utf8"),
    );
    assert.equal(index.record_count, 4);
    assert.equal(index.event_head_digest, repaired.state.last_event_hash);
    await assert.rejects(
      healthy.validateGate({
        runId: fixture.contract.run_id,
        operation: "source-write",
      }),
      /project.*halt/i,
    );
    const otherContract = structuredClone(fixture.contract);
    otherContract.run_id = "LER2-TEST-010-HALTED-B";
    otherContract.lineage = {
      parent_run_id: null,
      root_run_id: otherContract.run_id,
    };
    await writeFile(
      path.join(fixture.root, "telemetry-halted-b-contract.json"),
      `${JSON.stringify(otherContract, null, 2)}\n`,
    );
    const otherCreated = await healthy.create({
      contractFile: "telemetry-halted-b-contract.json",
    });
    const otherProposal = await proposeDigest(healthy, otherContract);
    await writeFile(
      path.join(fixture.root, "telemetry-halted-b-confirmation.json"),
      `${JSON.stringify(
        makeConfirmation(otherContract, { proposal_digest: otherProposal }),
        null,
        2,
      )}\n`,
    );
    const otherConfirmed = await healthy.confirmBudget({
      runId: otherContract.run_id,
      expectedVersion: otherCreated.state.version,
      inputFile: "telemetry-halted-b-confirmation.json",
    });
    await writeFile(
      path.join(fixture.root, "telemetry-halted-b-start.json"),
      `${JSON.stringify({
        confirmation_digest: otherConfirmed.confirmation_digest,
        freshness: makeFreshness(otherContract),
      }, null, 2)}\n`,
    );
    await assert.rejects(
      healthy.apply({
        runId: otherContract.run_id,
        expectedVersion: otherConfirmed.state.version,
        command: "START",
        inputFile: "telemetry-halted-b-start.json",
      }),
      /project.*halt/i,
    );
    assert.equal((await healthy.show({ runId: otherContract.run_id })).event_count, 2);
    const safetyHead = (await healthy.showMode()).safety_state.head_digest;
    const recoveryConfig = {
      ...config,
      config_version: config.config_version + 1,
    };
    const recoveryConfigText = `${JSON.stringify(recoveryConfig, null, 2)}\n`;
    await writeFile(
      path.join(fixture.root, "recovery-config.json"),
      recoveryConfigText,
    );
    const recovery = spawnSync(
      process.execPath,
      [
        LOOP_RUN_CLI,
        "mode",
        "transition",
        "--expected-digest",
        fixture.contract.project_config_digest,
        "--expected-config-version",
        String(config.config_version),
        "--expected-mode-version",
        String(config.mode_version),
        "--target",
        "OBSERVE",
        "--input-file",
        "recovery-config.json",
        "--owner-actor",
        "project-owner",
        "--owner-attestation",
        "HOST_OWNER_ACTION",
        "--safety-head",
        safetyHead,
        "--recovery-evidence-digest",
        DIGEST_C,
      ],
      { cwd: fixture.root, encoding: "utf8", windowsHide: true },
    );
    assert.notEqual(recovery.status, 0);
    assert.match(
      recovery.stderr,
      /PROJECT_CONFIG_ATTESTATION_REQUIRED|OWNER_ATTESTATION_REQUIRED/u,
    );
    assert.equal((await healthy.showMode()).effective_mode, "HALTED");

    const controllerDependencies = {
      ...common,
      projectSafetyDependencies: {
        verifyProjectConfig: async () => true,
        verifyOwnerAttestation: async () => true,
      },
    };
    const recovered = await runLoopRunCli(
      [
        "mode",
        "transition",
        "--expected-digest",
        fixture.contract.project_config_digest,
        "--expected-config-version",
        String(config.config_version),
        "--expected-mode-version",
        String(config.mode_version),
        "--target",
        "OBSERVE",
        "--input-file",
        "recovery-config.json",
        "--owner-actor",
        "project-owner",
        "--owner-attestation",
        "HOST_OWNER_ACTION",
        "--safety-head",
        safetyHead,
        "--recovery-evidence-digest",
        DIGEST_C,
      ],
      { root: fixture.root, controllerDependencies },
    );
    assert.equal(recovered.effective_mode, "OBSERVE");
    assert.equal(recovered.safety_state.active, false);
    assert.equal(
      (
        await runLoopRunCli(["mode", "show"], {
          root: fixture.root,
          controllerDependencies,
        })
      ).effective_mode,
      "OBSERVE",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("run contract policy cannot loosen the canonical global intersection despite a correct config digest", async () => {
  const cases = [
    ["numeric", (contract) => { contract.policy.max_iterations = 13; }],
    ["allowlist", (contract) => { contract.policy.allowlisted_operations.push("push"); }],
    ["credential", (contract) => { contract.policy.credential_scopes.push("repo:write"); }],
    ["required-gate", (contract) => { contract.policy.required_gates = []; }],
    ["risk", (contract) => { contract.policy.risk = "LOW"; }],
    ["isolation", (contract) => { contract.policy.isolation = "NONE"; }],
    ["ttl", (contract) => { contract.policy.approval_ttl_minutes = 721; }],
    [
      "expiry",
      (contract, config) => {
        config.policy.expires_at = "2026-07-18T12:00:00.000Z";
        contract.policy.expires_at = "2026-07-19T00:00:00.000Z";
      },
    ],
  ];
  for (const [name, mutate] of cases) {
    const fixture = await makeRepository();
    try {
      const configPath = path.join(
        fixture.root,
        ".agent",
        "context",
        "project-config.json",
      );
      const config = JSON.parse(await readFile(configPath, "utf8"));
      mutate(fixture.contract, config);
      const configText = `${JSON.stringify(config, null, 2)}\n`;
      await writeFile(configPath, configText);
      fixture.contract.project_config_digest = sha256(configText);
      await writeFile(
        path.join(fixture.root, "contract-input.json"),
        `${JSON.stringify(fixture.contract, null, 2)}\n`,
      );
      const controller = createLoopRunController(fixture.root, {
        now: () => CREATED_AT,
        randomId: () => `policy-${name}`,
      });
      await assert.rejects(
        controller.create({ contractFile: "contract-input.json" }),
        /POLICY_STOP.*restrictive canonical project intersection/i,
        name,
      );
      await assert.rejects(
        access(
          path.join(
            fixture.root,
            ".scratch",
            "loop-runs",
            fixture.contract.run_id,
          ),
        ),
        undefined,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("run profile cannot understate effective risk or exceed canonical autonomy", async () => {
  const cases = [
    [
      "understated-risk",
      (contract) => {
        contract.risk_profile = "LOW";
      },
      /POLICY_STOP.*risk profile.*highest effective project risk/i,
    ],
    [
      "excess-autonomy",
      (contract) => {
        contract.autonomy_profile = "BACKGROUND";
      },
      /POLICY_STOP.*autonomy profile.*canonical project maximum/i,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const fixture = await makeRepository();
    try {
      mutate(fixture.contract);
      await writeFile(
        path.join(fixture.root, "contract-input.json"),
        `${JSON.stringify(fixture.contract, null, 2)}\n`,
      );
      const controller = createLoopRunController(fixture.root, {
        now: () => CREATED_AT,
        randomId: () => `profile-${name}`,
      });
      await assert.rejects(
        controller.create({ contractFile: "contract-input.json" }),
        expected,
        name,
      );
      await assert.rejects(
        access(
          path.join(
            fixture.root,
            ".scratch",
            "loop-runs",
            fixture.contract.run_id,
          ),
        ),
        undefined,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("run composite verifier profile is rejected before durable run creation", async () => {
  const cases = [
    [
      "medium-missing-regression-verifier",
      (contract) => {
        contract.verifier.regression_verifier_digest = null;
      },
    ],
    [
      "medium-reuses-targeted-verifier",
      (contract) => {
        contract.verifier.regression_verifier_digest = contract.verifier.digest;
      },
    ],
    [
      "medium-uses-regression-as-primary",
      (contract) => {
        contract.verifier.eval_class = "REGRESSION";
        contract.verifier.success_threshold = {
          metric: "PASS_POWER_K",
          k: 3,
          minimum_basis_points: 10000,
        };
      },
    ],
    [
      "medium-uses-unpinned-capability-threshold",
      (contract) => {
        contract.verifier.success_threshold.minimum_basis_points = 10000;
      },
    ],
    [
      "non-medium-smuggles-regression-verifier",
      (contract) => {
        contract.policy.risk = "HIGH";
        contract.risk_profile = "HIGH";
      },
    ],
  ];

  for (const [name, mutate] of cases) {
    const fixture = await makeRepository();
    try {
      mutate(fixture.contract);
      await writeFile(
        path.join(fixture.root, "contract-input.json"),
        `${JSON.stringify(fixture.contract, null, 2)}\n`,
      );
      const controller = createLoopRunController(fixture.root, {
        now: () => CREATED_AT,
        randomId: () => `composite-${name}`,
      });
      await assert.rejects(
        controller.create({ contractFile: "contract-input.json" }),
        /POLICY_STOP.*(?:MEDIUM.*composite|non-MEDIUM.*regression)/i,
        name,
      );
      await assert.rejects(
        access(
          path.join(
            fixture.root,
            ".scratch",
            "loop-runs",
            fixture.contract.run_id,
          ),
        ),
        undefined,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("show replays the event authority and denies behind, ahead, divergent, or broken snapshots", async () => {
  const fixture = await makeRepository();
  const controller = createLoopRunController(fixture.root, {
    now: () => CREATED_AT,
    randomId: () => "event-created",
  });

  try {
    const created = await controller.create({ contractFile: "contract-input.json" });
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    const statePath = path.join(runDirectory, "state.json");
    const eventsPath = path.join(runDirectory, "events.jsonl");
    const originalStateText = await readFile(statePath, "utf8");
    const originalEventText = await readFile(eventsPath, "utf8");

    const shown = await controller.show({ runId: fixture.contract.run_id });
    assert.deepEqual(shown.state, created.state);
    assert.equal(shown.event_count, 1);

    const behind = {
      ...created.state,
      version: 0,
      sequence: 0,
      last_event_hash: null,
    };
    await writeFile(statePath, `${JSON.stringify(behind, null, 2)}\n`);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot.*behind.*repair/i,
    );

    const ahead = {
      ...created.state,
      version: 2,
      sequence: 2,
    };
    await writeFile(statePath, `${JSON.stringify(ahead, null, 2)}\n`);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot.*ahead|corrupt/i,
    );

    const divergent = {
      ...created.state,
      status: "RUNNING",
    };
    await writeFile(statePath, `${JSON.stringify(divergent, null, 2)}\n`);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot.*diverg|corrupt/i,
    );

    await writeFile(statePath, originalStateText);
    const brokenEvent = JSON.parse(originalEventText);
    brokenEvent.data.contract_digest = DIGEST_B;
    await writeFile(eventsPath, `${JSON.stringify(brokenEvent)}\n`);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /event hash|contract digest|corrupt/i,
    );
    const haltedMode = await controller.showMode();
    assert.equal(haltedMode.effective_mode, "HALTED");
    assert.equal(haltedMode.safety_state.reason_code, "EVENT_CHAIN_CORRUPTION");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("repair recovers a crash after the durable event and records repair event-first under CAS", async () => {
  const fixture = await makeRepository();
  let crashCreated = true;
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => CREATED_AT,
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
    afterEventAppend: ({ event }) => {
      if (crashCreated && event.type === "CREATED") {
        throw new Error("injected crash after durable event");
      }
    },
  });

  try {
    await assert.rejects(
      controller.create({ contractFile: "contract-input.json" }),
      /injected crash/i,
    );
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    await assert.rejects(access(path.join(runDirectory, "state.json")));

    crashCreated = false;
    await assert.rejects(
      controller.repair({ runId: fixture.contract.run_id, expectedVersion: 0 }),
      /CAS conflict|expected 0.*found 1/i,
    );
    const repaired = await controller.repair({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
    });
    assert.equal(repaired.state.version, 2);
    assert.equal(repaired.state.sequence, 2);

    const events = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(events[1].type, "SNAPSHOT_REPAIRED");
    assert.equal(events[1].data.repaired_from_event_hash, events[0].event_hash);
    assert.equal(events[1].previous_hash, events[0].event_hash);
    assert.equal(events[1].event_hash, eventDigest(events[1]));
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      repaired.state,
    );
    await assert.rejects(
      controller.repair({ runId: fixture.contract.run_id, expectedVersion: 2 }),
      /repair.*not required|not behind/i,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("required telemetry rebuild failure during repair latches project HALTED", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.telemetry = {
    ...config.telemetry,
    enabled: true,
    persistence_required: true,
    redaction_revision: "redaction-2026-07",
    retention_days: 30,
    max_file_bytes: 65536,
    purpose: "LOOP_RUNTIME_OPERATIONAL_ASSURANCE",
    classification: "INTERNAL_OPERATIONAL_NO_RAW_CONTENT",
    acl: {
      read_roles: ["runtime-auditor"],
      write_roles: ["loop-controller"],
      export_roles: ["runtime-auditor"],
    },
    rotation: {
      strategy: "PER_RUN_SEGMENTED_JSONL",
      max_segments: 16,
    },
    disposition: "DELETE_DERIVED_TELEMETRY",
  };
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );

  let crashAfterCreated = true;
  let failRebuild = false;
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `repair-telemetry-${String(++nextId).padStart(4, "0")}`,
    verifyTelemetryAccess: async () => true,
    afterEventAppend: ({ event }) => {
      if (crashAfterCreated && event.type === "CREATED") {
        throw new Error("injected crash before initial telemetry projection");
      }
    },
    telemetryStoreDependencies: {
      writeFileAtomic: async (root, candidate, content, options) => {
        if (failRebuild && String(candidate).endsWith("index.json")) {
          throw new Error("injected repair telemetry rebuild failure");
        }
        return durableWriteFileAtomic(root, candidate, content, options);
      },
    },
  });

  try {
    await assert.rejects(
      controller.create({ contractFile: "contract-input.json" }),
      /injected crash before initial telemetry projection/u,
    );
    crashAfterCreated = false;
    failRebuild = true;
    await assert.rejects(
      controller.repair({ runId: fixture.contract.run_id, expectedVersion: 1 }),
      /injected repair telemetry rebuild failure/u,
    );
    const halted = await controller.showMode();
    assert.equal(halted.effective_mode, "HALTED");
    assert.equal(
      halted.safety_state.reason_code,
      "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("mode transition recovers the exact virgin safety-ledger crash with explicit host verifiers", async () => {
  const fixture = await makeRepository();
  try {
    const marker = path.join(
      fixture.root,
      ".scratch",
      "loop-runtime",
      "project-safety-ledger.created",
    );
    await mkdir(path.dirname(marker), { recursive: true });
    await writeFile(
      marker,
      `${JSON.stringify({
        schema: "project_safety_ledger_marker_v2",
        contract_version: "2.0.0",
      })}\n`,
    );
    const configText = await readFile(
      path.join(fixture.root, ".agent", "context", "project-config.json"),
      "utf8",
    );
    const config = JSON.parse(configText);
    const recoveryConfig = {
      ...config,
      config_version: config.config_version + 1,
    };
    await writeFile(
      path.join(fixture.root, "virgin-recovery-config.json"),
      `${JSON.stringify(recoveryConfig, null, 2)}\n`,
    );
    const controllerDependencies = {
      now: () => "2026-07-18T00:10:00.000Z",
      projectSafetyDependencies: {
        verifyProjectConfig: async ({ operation }) =>
          operation === "PROJECT_VIRGIN_LEDGER_RECOVERY",
        verifyOwnerAttestation: async ({ operation }) =>
          operation === "PROJECT_VIRGIN_LEDGER_RECOVERY",
      },
    };
    const controller = createLoopRunController(fixture.root, controllerDependencies);

    assert.equal((await controller.showMode()).effective_mode, "HALTED");
    const recovered = await runLoopRunCli(
      [
        "mode",
        "transition",
        "--expected-digest",
        fixture.contract.project_config_digest,
        "--expected-config-version",
        String(config.config_version),
        "--expected-mode-version",
        String(config.mode_version),
        "--target",
        "OBSERVE",
        "--input-file",
        "virgin-recovery-config.json",
        "--owner-actor",
        "project-owner",
        "--owner-attestation",
        "HOST_OWNER_ACTION",
        "--safety-head",
        "MISSING",
        "--recovery-evidence-digest",
        DIGEST_C,
      ],
      { root: fixture.root, controllerDependencies },
    );
    assert.equal(recovered.effective_mode, "OBSERVE");
    assert.equal(recovered.safety_state.integrity, "VALID");
    assert.equal(recovered.safety_state.sequence, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("budget confirmation persists immutable human evidence and binds every admission digest", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    const invalid = makeConfirmation(fixture.contract, {
      proposal_digest,
      goal_digest: DIGEST_B,
    });
    await writeFile(
      path.join(fixture.root, "confirmation-invalid.json"),
      `${JSON.stringify(invalid, null, 2)}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "confirmation-invalid.json",
      }),
      /goal digest|binding mismatch/i,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).event_count,
      1,
    );

    const confirmation = makeConfirmation(fixture.contract, { proposal_digest });
    const confirmationText = `${JSON.stringify(confirmation, null, 2)}\n`;
    await writeFile(path.join(fixture.root, "confirmation.json"), confirmationText);
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation.json",
    });
    const confirmationDigest = sha256(confirmationText);
    assert.equal(confirmed.confirmation_digest, confirmationDigest);
    assert.equal(confirmed.state.version, 2);
    assert.equal(confirmed.state.approval.confirmation_digest, confirmationDigest);

    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    const evidencePath = path.join(
      runDirectory,
      "confirmations",
      `${confirmationDigest.slice("sha256:".length)}.json`,
    );
    assert.equal(await readFile(evidencePath, "utf8"), confirmationText);
    const shown = await controller.show({ runId: fixture.contract.run_id });
    assert.deepEqual(shown.state, confirmed.state);
    assert.equal(shown.event_count, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("START and action cycles require fresh authority and persist cumulative counters event-first", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
  });

  async function writeInput(name, value) {
    const candidate = `${name}.json`;
    await writeFile(path.join(fixture.root, candidate), `${JSON.stringify(value, null, 2)}\n`);
    return candidate;
  }

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    const confirmationText = `${JSON.stringify(
      makeConfirmation(fixture.contract, { proposal_digest }),
      null,
      2,
    )}\n`;
    await writeFile(path.join(fixture.root, "confirmation.json"), confirmationText);
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation.json",
    });
    const confirmationDigest = confirmed.confirmation_digest;

    const staleStart = await writeInput("start-stale", {
      confirmation_digest: confirmationDigest,
      freshness: makeFreshness(fixture.contract, { verifier_digest: DIGEST_A }),
    });
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 2,
        command: "START",
        inputFile: staleStart,
      }),
      /verifier digest.*stale|freshness mismatch/i,
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 2);

    let result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start", {
        confirmation_digest: confirmationDigest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.status, "RUNNING");

    const eventsPath = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "events.jsonl",
    );
    const eventsBeforePrivacyStop = await readFile(eventsPath, "utf8");
    const secretCanary = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 3,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("begin-action-private", {
          confirmation_digest: confirmationDigest,
          action_id: secretCanary,
          idempotency_key: "LER2-TEST-004-private",
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      (error) =>
        /PRIVACY_STOP/u.test(error.message) && !error.message.includes(secretCanary),
    );
    assert.equal(await readFile(eventsPath, "utf8"), eventsBeforePrivacyStop);

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("begin-action", {
        confirmation_digest: confirmationDigest,
        action_id: "action-001",
        idempotency_key: "LER2-TEST-004-action-001",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.counters.iterations, 1);
    assert.equal(result.state.active_action.action_id, "action-001");

    await assert.rejects(
      async () =>
        controller.apply({
          runId: fixture.contract.run_id,
          expectedVersion: 4,
          command: "OBSERVE_ACTION",
          inputFile: await writeInput("observe-action-unbound", {
            duration_ms: 125,
            freshness: makeFreshness(fixture.contract),
          }),
        }),
      /action observation.*binding|OBSERVE_ACTION input must contain only/iu,
    );
    await assert.rejects(
      async () =>
        controller.apply({
          runId: fixture.contract.run_id,
          expectedVersion: 4,
          command: "OBSERVE_ACTION",
          inputFile: await writeInput("observe-action-mismatch", {
            action_id: "action-other",
            idempotency_key: "LER2-TEST-004-action-other",
            external_action_record_digest: null,
            external_outcome: null,
            target_audit_digest: null,
            duration_ms: 125,
            freshness: makeFreshness(fixture.contract),
          }),
        }),
      /active action binding/iu,
    );
    await assert.rejects(
      async () =>
        controller.apply({
          runId: fixture.contract.run_id,
          expectedVersion: 4,
          command: "OBSERVE_ACTION",
          inputFile: await writeInput("observe-action-fabricated-external", {
            action_id: "action-001",
            idempotency_key: "LER2-TEST-004-action-001",
            external_action_record_digest: DIGEST_A,
            external_outcome: "APPLIED",
            target_audit_digest: DIGEST_B,
            duration_ms: 125,
            freshness: makeFreshness(fixture.contract),
          }),
        }),
      /external action observation verifier is required/iu,
    );
    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      command: "OBSERVE_ACTION",
      inputFile: await writeInput("observe-action", {
        action_id: "action-001",
        idempotency_key: "LER2-TEST-004-action-001",
        external_action_record_digest: null,
        external_outcome: null,
        target_audit_digest: null,
        duration_ms: 125,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.status, "OBSERVED");
    assert.equal(result.state.counters.active_runtime_ms, 125);

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "RECORD_OBSERVATION_DURATION",
      inputFile: await writeInput("record-observation-duration", {
        duration_ms: 25,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.counters.active_runtime_ms, 150);

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 6,
      command: "BEGIN_VERIFICATION",
      inputFile: await writeInput("begin-verification", {
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.status, "VERIFYING");

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 7,
      command: "RECORD_VERIFICATION_DURATION",
      inputFile: await writeInput("record-verification-duration", {
        duration_ms: 30,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.counters.active_runtime_ms, 180);

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 8,
      command: "VERIFICATION_FAILED",
      inputFile: await writeInput("verification-failed", {
        verification_status: "FAIL",
        fingerprint: DIGEST_A,
        requirement_delta: 0,
        coverage_delta: 0,
        meaningful_diff_count: 0,
        approach_id: "controller-cycle-a",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.status, "RUNNING");
    assert.equal(result.state.counters.iterations, 1);
    assert.equal(result.state.counters.active_runtime_ms, 180);

    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 9,
      command: "RECORD_BACKOFF_DURATION",
      inputFile: await writeInput("record-backoff-duration", {
        duration_ms: 40,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.counters.active_runtime_ms, 220);
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      result.state,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("PAUSE and separately confirmed RESUME preserve counters and only tighten same-run limits", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(path.join(fixture.root, candidate), `${JSON.stringify(value, null, 2)}\n`);
    return candidate;
  };

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const startProposalDigest = await proposeDigest(controller, fixture.contract);
    await writeInput(
      "confirmation-start",
      makeConfirmation(fixture.contract, { proposal_digest: startProposalDigest }),
    );
    const startConfirmation = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-start.json",
    });
    let result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start-for-resume", {
        confirmation_digest: startConfirmation.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "PAUSE",
      inputFile: await writeInput("pause", { freshness: makeFreshness(fixture.contract) }),
    });
    assert.equal(result.state.status, "PAUSED");

    const loosened = makeConfirmation(fixture.contract, {
      proposal_digest: await proposeDigest(controller, fixture.contract, "RESUME"),
      confirmation_id: "confirmation-resume-loosened",
      phase: "RESUME",
      expected_run_version: 4,
      confirmed_limits: {
        max_iterations: 13,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: null,
        max_cost: null,
      },
      confirmed_budget: {
        max_iterations: 13,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: null,
        max_cost_micro: null,
      },
      effective_budget: {
        max_iterations: 13,
        max_runtime_minutes: 240,
        max_no_progress_iterations: 3,
        max_tokens: null,
        max_cost_micro: null,
      },
    });
    await writeInput("confirmation-resume-loosened", loosened);
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 4,
        inputFile: "confirmation-resume-loosened.json",
      }),
      /APPROVAL_REQUIRED.*(?:policy ceiling|loosening)|budget confirmation denied/i,
    );

    const resumeEnvelope = makeConfirmation(fixture.contract, {
      proposal_digest: await proposeDigest(controller, fixture.contract, "RESUME"),
      confirmation_id: "confirmation-resume",
      phase: "RESUME",
      expected_run_version: 4,
      confirmed_limits: {
        max_iterations: 8,
        max_runtime_minutes: 200,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost: null,
      },
      confirmed_budget: {
        max_iterations: 8,
        max_runtime_minutes: 200,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost_micro: null,
      },
      effective_budget: {
        max_iterations: 8,
        max_runtime_minutes: 200,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost_micro: null,
      },
    });
    await writeInput("confirmation-resume", resumeEnvelope);
    const resumeConfirmation = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      inputFile: "confirmation-resume.json",
    });
    result = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "RESUME",
      inputFile: await writeInput("resume", {
        confirmation_digest: resumeConfirmation.confirmation_digest,
        duration_ms: 400,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(result.state.status, "RUNNING");
    assert.equal(result.state.counters.iterations, 0);
    assert.equal(result.state.counters.active_runtime_ms, 400);
    assert.equal(result.state.effective_budget.max_iterations, 8);
    assert.equal(result.state.effective_budget.max_runtime_minutes, 200);
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      result.state,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("source-write gate requires an active approved iteration and SUCCESS requires fresh verifier PASS", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  let releaseAttestationContext;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
    verifyHostReleaseAttestation: async (context) => {
      releaseAttestationContext = context;
      assert.equal(Object.isFrozen(context), true);
      assert.equal(Object.isFrozen(context.claims), true);
      assert.equal(Object.isFrozen(context.claims[0].envelope), true);
      return true;
    },
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(path.join(fixture.root, candidate), `${JSON.stringify(value, null, 2)}\n`);
    return candidate;
  };

  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "confirmation-gate",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-gate.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start-gate", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await assert.rejects(
      controller.validateGate({ runId: fixture.contract.run_id, operation: "source-write" }),
      /active iteration|ACTION_INTENDED/i,
    );
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("begin-action-gate", {
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "action-gate",
        idempotency_key: "LER2-TEST-004-action-gate",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const observeGate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "source-write",
    });
    assert.equal(observeGate.allowed, false);
    assert.equal(observeGate.would_allow, true);
    assert.equal(observeGate.simulation_only, true);
    assert.equal(observeGate.mutation_authorized, false);
    assert.equal(
      Object.hasOwn(observeGate, "background_budget_binding"),
      false,
    );
    assert.equal(observeGate.action_id, "action-gate");
    assert.equal(
      observeGate.idempotency_key,
      "LER2-TEST-004-action-gate",
    );
    assert.match(observeGate.controller_intent_digest, /^sha256:[a-f0-9]{64}$/u);
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      command: "OBSERVE_ACTION",
      inputFile: await writeInput("observe-gate", {
        action_id: "action-gate",
        idempotency_key: "LER2-TEST-004-action-gate",
        external_action_record_digest: null,
        external_outcome: null,
        target_audit_digest: null,
        duration_ms: 10,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const verifying = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "BEGIN_VERIFICATION",
      inputFile: await writeInput("begin-verify-gate", {
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "STOP",
        inputFile: await writeInput("stop-success", {
          terminal_status: "SUCCESS",
          reason: "MODEL_CLAIMED_SUCCESS",
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /verifier success required|STOP denied/i,
    );
    const release = await writeReleaseArtifacts(fixture, verifying.state);
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: await writeInput("verification-passed-caller-claim", {
          fingerprint: DIGEST_C,
          fresh: true,
          gates_satisfied: true,
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /unknown input fields|exact required fields|caller.*success/i,
    );
    const releaseInput = await writeInput("verification-passed", {
      eval_result_path: release.evalResultPath,
      work_package_ledger_path: release.ledgerPath,
      work_package_goal_id: release.goalId,
      workspace_head_git_sha: release.workspaceHeadGitSha,
      freshness: makeFreshness(fixture.contract),
    });
    const unverifiedController = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
    });
    await assert.rejects(
      unverifiedController.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: releaseInput,
      }),
      /host release attestation.*required|release attestation.*verification/i,
    );
    for (const [name, verifyHostReleaseAttestation] of [
      ["false", async () => false],
      ["truthy-object", async () => ({ verified: true })],
      ["throw", async () => { throw new Error("untrusted host adapter"); }],
    ]) {
      const rejectingController = createLoopRunController(fixture.root, {
        now: () => "2026-07-18T00:10:00.000Z",
        verifyHostReleaseAttestation,
      });
      await assert.rejects(
        rejectingController.apply({
          runId: fixture.contract.run_id,
          expectedVersion: 6,
          command: "VERIFICATION_PASSED",
          inputFile: releaseInput,
        }),
        /host release attestation verification failed/i,
        `${name} callback result must fail closed`,
      );
    }
    const passed = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 6,
      command: "VERIFICATION_PASSED",
      inputFile: releaseInput,
    });
    assert.equal(passed.state.status, "SUCCESS");
    assert.equal(releaseAttestationContext.run_id, fixture.contract.run_id);
    assert.equal(releaseAttestationContext.release_evidence.verdict, "PASS");
    const resetClaims = releaseAttestationContext.claims.filter(
      (claim) => claim.kind === "CLEAN_RESET",
    );
    assert.equal(resetClaims.length, 3);
    assert.equal(resetClaims[0].envelope.verdict, "PASS");
    assert.equal(resetClaims[0].envelope.regression.verdict, "PASS");
    assert.equal(resetClaims[0].evidence_refs.length, 2);
    assert.match(resetClaims[0].evidence_refs[1], /regression-pass\.json$/);
    assert.match(resetClaims[0].attempt_digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(
      releaseAttestationContext.claims.filter(
        (claim) => claim.kind === "FINDING_INVENTORY",
      ).length,
      1,
    );
    assert.equal(passed.state.terminal_reason, "GOAL_VERIFIED");
    const repeated = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 6,
      command: "VERIFICATION_PASSED",
      inputFile: releaseInput,
    });
    assert.equal(repeated.idempotent, true);
    assert.deepEqual(repeated.state, passed.state);
    const eventLines = (
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "events.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(eventLines.filter((event) => event.type === "VERIFICATION_PASSED").length, 1);
    const passEvent = eventLines.at(-1);
    assert.equal(passEvent.data.work_package_goal_id, release.goalId);
    assert.equal(passEvent.data.operational_metric.kind, "EVAL_RELEASE");
    assert.equal(
      passEvent.data.operational_metric.payload.acceptance_source,
      "FRESH_RELEASE_GATE",
    );
    assert.equal(passEvent.data.operational_metric.payload.attempts.length, 3);
    assert.deepEqual(passEvent.data.operational_metric.payload.targeted, {
      k: 3,
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    });
    assert.deepEqual(passEvent.data.operational_metric.payload.regression, {
      k: 3,
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    });
    await assert.rejects(
      controller.validateGate({ runId: fixture.contract.run_id, operation: "source-write" }),
      /terminal|not running/i,
    );
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      passed.state,
    );
    await writeFile(
      path.join(fixture.root, ...release.evalResultPath.split("/")),
      `${release.evalResultText}\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: releaseInput,
      }),
      /idempotency|release evidence.*differs|conflict/i,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("external cancellation persists UNKNOWN_OUTCOME and explicit reconciliation replays", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-reconcile-${String(++nextId).padStart(4, "0")}`,
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(
      path.join(fixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };
  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "confirmation-reconcile",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-reconcile.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start-reconcile", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("begin-reconcile", {
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "external-action-001",
        idempotency_key: "external-key-001",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const cancelled = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      command: "CANCEL",
      inputFile: await writeInput("cancel-external", {
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(cancelled.state.status, "UNKNOWN_OUTCOME");
    assert.equal(cancelled.state.terminal_reason, "CANCEL_AFTER_ACTION_INTENT");
    for (const [command, input] of [
      [
        "START",
        {
          confirmation_digest: confirmed.confirmation_digest,
          freshness: makeFreshness(fixture.contract),
        },
      ],
      [
        "RESUME",
        {
          confirmation_digest: confirmed.confirmation_digest,
          duration_ms: 0,
          freshness: makeFreshness(fixture.contract),
        },
      ],
    ]) {
      await assert.rejects(
        controller.apply({
          runId: fixture.contract.run_id,
          expectedVersion: 5,
          command,
          inputFile: await writeInput(`cancelled-${command.toLowerCase()}`, input),
        }),
        new RegExp(`${command} denied: INVALID_TRANSITION`, "i"),
      );
    }
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).state.version,
      5,
    );

    const readbackGate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "source-write",
      reconciliationOnly: true,
      actionId: "external-action-001",
      idempotencyKey: "external-key-001",
    });
    assert.equal(readbackGate.readback_authorized, true);
    assert.equal(readbackGate.mutation_authorized, false);
    assert.equal(readbackGate.action_id, "external-action-001");
    assert.equal(readbackGate.idempotency_key, "external-key-001");
    await assert.rejects(
      () =>
        controller.validateGate({
          runId: fixture.contract.run_id,
          operation: "source-write",
          reconciliationOnly: true,
          actionId: "external-action-001",
          idempotencyKey: "wrong-key",
        }),
      /binding mismatch/i,
    );

    const reconciled = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "RECONCILE",
      inputFile: await writeInput("reconcile-external", {
        outcome: "APPLIED",
        evidence_digest: DIGEST_A,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(reconciled.state.status, "UNKNOWN_OUTCOME");
    assert.equal(reconciled.state.version, 6);
    const child = structuredClone(fixture.contract);
    child.run_id = "LER2-TEST-CANCELLED-ACTION-CHILD";
    child.lineage = {
      parent_run_id: fixture.contract.run_id,
      root_run_id: fixture.contract.run_id,
    };
    await writeInput("cancelled-action-child", child);
    await assert.rejects(
      controller.create({ contractFile: "cancelled-action-child.json" }),
      /Child-run creation denied: PARENT_CANCELLED/i,
    );
    await assert.rejects(
      access(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          child.run_id,
        ),
      ),
      { code: "ENOENT" },
    );
    const replayed = await controller.show({ runId: fixture.contract.run_id });
    assert.equal(replayed.state.status, "UNKNOWN_OUTCOME");
    assert.equal(replayed.state.version, 6);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("action gate rereads every authority source and denies stale or unavailable bytes", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  let currentNow = "2026-07-18T00:10:00.000Z";
  const controller = createLoopRunController(fixture.root, {
    now: () => currentNow,
    randomId: () => `event-authority-${String(++nextId).padStart(4, "0")}`,
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(
      path.join(fixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };

  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "confirmation-authority-rehash",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-authority-rehash.json",
    });
    const startInput = await writeInput("start-authority-rehash", {
      confirmation_digest: confirmed.confirmation_digest,
      freshness: makeFreshness(fixture.contract),
    });
    const brdSource = fixture.contract.authority.sources.find(
      (source) => source.role === "BRD",
    );
    const brdPath = path.join(fixture.root, ...brdSource.source_path.split("/"));
    const brdContent = fixture.authoritySourceContents.get(brdSource.source_path);
    await writeFile(brdPath, `${brdContent}drift-before-start\n`);
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 2,
        command: "START",
        inputFile: startInput,
      }),
      /APPROVAL_REQUIRED.*AUTHORITY_SOURCE_STALE/i,
    );
    await writeFile(brdPath, brdContent);
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: startInput,
    });
    const beginInput = await writeInput("begin-authority-rehash", {
      confirmation_digest: confirmed.confirmation_digest,
      action_id: "action-authority-rehash",
      idempotency_key: "LER2-TEST-004-action-authority-rehash",
      freshness: makeFreshness(fixture.contract),
    });
    const prdSource = fixture.contract.authority.sources.find(
      (source) => source.role === "PRD",
    );
    const prdPath = path.join(fixture.root, ...prdSource.source_path.split("/"));
    const prdContent = fixture.authoritySourceContents.get(prdSource.source_path);
    await writeFile(prdPath, `${prdContent}drift-before-action\n`);
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 3,
        command: "BEGIN_ACTION",
        inputFile: beginInput,
      }),
      /APPROVAL_REQUIRED.*AUTHORITY_SOURCE_STALE/i,
    );
    await writeFile(prdPath, prdContent);
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: beginInput,
    });
    assert.equal(
      (
        await controller.validateGate({
          runId: fixture.contract.run_id,
          operation: "source-write",
        })
      ).would_allow,
      true,
    );
    currentNow = "2026-02-30T00:10:00.000Z";
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "source-write",
      }),
      /RFC 3339 UTC date-time/i,
    );
    currentNow = "2026-07-18T00:10:00.000Z";

    for (const source of fixture.contract.authority.sources) {
      const absolute = path.join(fixture.root, ...source.source_path.split("/"));
      const original = fixture.authoritySourceContents.get(source.source_path);
      await writeFile(absolute, `${original}drift-${source.role}\n`);
      await assert.rejects(
        controller.validateGate({
          runId: fixture.contract.run_id,
          operation: "source-write",
        }),
        /APPROVAL_REQUIRED.*AUTHORITY_SOURCE_STALE/i,
        source.role,
      );
      await writeFile(absolute, original);
      assert.equal(
        (
          await controller.validateGate({
            runId: fixture.contract.run_id,
            operation: "source-write",
          })
        ).would_allow,
        true,
        source.role,
      );
    }

    const missing = fixture.contract.authority.sources.find(
      (source) => source.role === "BRD",
    );
    const missingPath = path.join(fixture.root, ...missing.source_path.split("/"));
    const original = fixture.authoritySourceContents.get(missing.source_path);
    await rm(missingPath);
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "source-write",
      }),
      /POLICY_STOP.*authority source.*unavailable/i,
    );
    await writeFile(missingPath, original);

    await writeFile(missingPath, Buffer.alloc(2 * 1024 * 1024 + 1, 0x61));
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "source-write",
      }),
      /POLICY_STOP.*authority source.*unavailable/i,
    );
    await writeFile(missingPath, original);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("create rejects fabricated authority pins and permits deduplicated source paths", async () => {
  const stale = await makeRepository();
  try {
    const brd = stale.contract.authority.sources.find((source) => source.role === "BRD");
    brd.content_digest = DIGEST_A;
    stale.contract.authority.brd_digest = DIGEST_A;
    await writeFile(
      path.join(stale.root, "contract-input.json"),
      `${JSON.stringify(stale.contract, null, 2)}\n`,
    );
    await assert.rejects(
      createLoopRunController(stale.root).create({ contractFile: "contract-input.json" }),
      /POLICY_STOP.*AUTHORITY_SOURCE_STALE/i,
    );
  } finally {
    await rm(stale.root, { recursive: true, force: true });
  }

  const duplicateAdr = await makeRepository();
  try {
    const adr = duplicateAdr.contract.authority.sources.find(
      (source) => source.role === "ADR",
    );
    const duplicatePath = "docs/solutions/adr-duplicate.md";
    const content = duplicateAdr.authoritySourceContents.get(adr.source_path);
    await writeFile(path.join(duplicateAdr.root, ...duplicatePath.split("/")), content);
    duplicateAdr.contract.authority.sources.push({
      role: "ADR",
      source_path: duplicatePath,
      content_digest: adr.content_digest,
    });
    duplicateAdr.contract.authority.adr_digests.push(DIGEST_A);
    await writeFile(
      path.join(duplicateAdr.root, "contract-input.json"),
      `${JSON.stringify(duplicateAdr.contract, null, 2)}\n`,
    );
    await assert.rejects(
      createLoopRunController(duplicateAdr.root).create({
        contractFile: "contract-input.json",
      }),
      /authority source manifest ADR binding mismatch/i,
    );
  } finally {
    await rm(duplicateAdr.root, { recursive: true, force: true });
  }

  const deduplicated = await makeRepository();
  try {
    const fsd = deduplicated.contract.authority.sources.find(
      (source) => source.role === "FSD",
    );
    const verifier = deduplicated.contract.authority.sources.find(
      (source) => source.role === "VERIFIER",
    );
    verifier.source_path = fsd.source_path;
    verifier.content_digest = fsd.content_digest;
    deduplicated.contract.verifier.digest = fsd.content_digest;
    await writeFile(
      path.join(deduplicated.root, "contract-input.json"),
      `${JSON.stringify(deduplicated.contract, null, 2)}\n`,
    );
    const result = await createLoopRunController(deduplicated.root).create({
      contractFile: "contract-input.json",
    });
    assert.equal(result.state.status, "READY");
  } finally {
    await rm(deduplicated.root, { recursive: true, force: true });
  }
});

test("release rejects stale artifacts and crash repair preserves one idempotent PASS", async () => {
  const fixture = await makeRepository();
  let crashOnPass = false;
  let nextId = 0;
  let hostVerificationCalls = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `release-event-${String(++nextId).padStart(4, "0")}`,
    afterEventAppend: ({ event }) => {
      if (crashOnPass && event.type === "VERIFICATION_PASSED") {
        crashOnPass = false;
        throw new Error("injected release crash after durable PASS event");
      }
    },
    verifyHostReleaseAttestation: async () => {
      hostVerificationCalls += 1;
      return true;
    },
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(path.join(fixture.root, candidate), `${JSON.stringify(value, null, 2)}\n`);
    return candidate;
  };

  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "release-fault-confirmation",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "release-fault-confirmation.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("release-fault-start", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("release-fault-action", {
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "release-fault-action",
        idempotency_key: "release-fault-action-key",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      command: "OBSERVE_ACTION",
      inputFile: await writeInput("release-fault-observe", {
        action_id: "release-fault-action",
        idempotency_key: "release-fault-action-key",
        external_action_record_digest: null,
        external_outcome: null,
        target_audit_digest: null,
        duration_ms: 10,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const verifying = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "BEGIN_VERIFICATION",
      inputFile: await writeInput("release-fault-verify", {
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const release = await writeReleaseArtifacts(fixture, verifying.state);
    const releaseInput = await writeInput("release-fault-pass", {
      eval_result_path: release.evalResultPath,
      work_package_ledger_path: release.ledgerPath,
      work_package_goal_id: release.goalId,
      workspace_head_git_sha: release.workspaceHeadGitSha,
      freshness: makeFreshness(fixture.contract),
    });

    await writeFile(
      path.join(fixture.root, ...release.evidencePath.split("/")),
      `${release.evidenceContent}tampered\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: releaseInput,
      }),
      /evidence digest mismatch/i,
    );
    assert.equal(hostVerificationCalls, 0);
    await writeFile(
      path.join(fixture.root, ...release.evidencePath.split("/")),
      release.evidenceContent,
    );

    const staleEval = JSON.parse(release.evalResultText);
    staleEval.run_head_digest = DIGEST_A;
    await writeFile(
      path.join(fixture.root, ...release.evalResultPath.split("/")),
      `${JSON.stringify(staleEval, null, 2)}\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: releaseInput,
      }),
      /run head.*mismatch|stale release evidence/i,
    );
    assert.equal(hostVerificationCalls, 0);
    await writeFile(
      path.join(fixture.root, ...release.evalResultPath.split("/")),
      release.evalResultText,
    );

    crashOnPass = true;
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 6,
        command: "VERIFICATION_PASSED",
        inputFile: releaseInput,
      }),
      /injected release crash/i,
    );
    assert.equal(hostVerificationCalls, 1);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot.*behind|repair required/i,
    );
    const repaired = await controller.repair({
      runId: fixture.contract.run_id,
      expectedVersion: 7,
    });
    assert.equal(repaired.state.status, "SUCCESS");
    const repeated = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 6,
      command: "VERIFICATION_PASSED",
      inputFile: releaseInput,
    });
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.state.version, 8);
    assert.equal(hostVerificationCalls, 1);
    const events = (
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "events.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(events.filter((event) => event.type === "VERIFICATION_PASSED").length, 1);
    assert.equal(events.at(-1).type, "SNAPSHOT_REPAIRED");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("owner lock plus CAS serializes competing actions and crash replay never decrements iteration", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  let crashOnIntent = false;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-${String(++nextId).padStart(4, "0")}`,
    afterEventAppend: ({ event }) => {
      if (crashOnIntent && event.type === "ACTION_INTENDED") {
        crashOnIntent = false;
        throw new Error("injected action-intent crash");
      }
    },
  });
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(path.join(fixture.root, candidate), `${JSON.stringify(value, null, 2)}\n`);
    return candidate;
  };

  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "confirmation-crash",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-crash.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start-crash", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const firstAction = await writeInput("action-crash", {
      confirmation_digest: confirmed.confirmation_digest,
      action_id: "action-crashed",
      idempotency_key: "LER2-TEST-004-action-crashed",
      freshness: makeFreshness(fixture.contract),
    });
    crashOnIntent = true;
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 3,
        command: "BEGIN_ACTION",
        inputFile: firstAction,
      }),
      /injected action-intent crash/i,
    );
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /snapshot.*behind/i,
    );
    const repaired = await controller.repair({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
    });
    assert.equal(repaired.state.counters.iterations, 1);
    assert.equal(repaired.state.active_action.action_id, "action-crashed");
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: 5,
        command: "BEGIN_ACTION",
        inputFile: firstAction,
      }),
      /ACTION_ALREADY_ACTIVE|denied/i,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).state.counters.iterations,
      1,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }

  const competingFixture = await makeRepository();
  let competingId = 0;
  const competingController = createLoopRunController(competingFixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-competing-${String(++competingId).padStart(4, "0")}`,
  });
  const writeCompeting = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(
      path.join(competingFixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };
  try {
    await competingController.create({ contractFile: "contract-input.json" });
    await writeCompeting(
      "confirmation-competing",
      makeConfirmation(competingFixture.contract, {
        proposal_digest: await proposeDigest(
          competingController,
          competingFixture.contract,
        ),
      }),
    );
    const confirmed = await competingController.confirmBudget({
      runId: competingFixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-competing.json",
    });
    await competingController.apply({
      runId: competingFixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeCompeting("start-competing", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(competingFixture.contract),
      }),
    });
    const actionA = await writeCompeting("action-a", {
      confirmation_digest: confirmed.confirmation_digest,
      action_id: "action-a",
      idempotency_key: "LER2-TEST-004-action-a",
      freshness: makeFreshness(competingFixture.contract),
    });
    const actionB = await writeCompeting("action-b", {
      confirmation_digest: confirmed.confirmation_digest,
      action_id: "action-b",
      idempotency_key: "LER2-TEST-004-action-b",
      freshness: makeFreshness(competingFixture.contract),
    });
    const settled = await Promise.allSettled([
      competingController.apply({
        runId: competingFixture.contract.run_id,
        expectedVersion: 3,
        command: "BEGIN_ACTION",
        inputFile: actionA,
      }),
      competingController.apply({
        runId: competingFixture.contract.run_id,
        expectedVersion: 3,
        command: "BEGIN_ACTION",
        inputFile: actionB,
      }),
    ]);
    assert.equal(settled.filter((entry) => entry.status === "fulfilled").length, 1);
    assert.equal(settled.filter((entry) => entry.status === "rejected").length, 1);
    assert.match(settled.find((entry) => entry.status === "rejected").reason.message, /CAS conflict/i);
    assert.equal(
      (await competingController.show({ runId: competingFixture.contract.run_id })).state.counters
        .iterations,
      1,
    );
  } finally {
    await rm(competingFixture.root, { recursive: true, force: true });
  }
});

test("budget proposal is advisory and list returns only strictly replayed v2 runs", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `proposal-or-event-${String(++nextId).padStart(4, "0")}`,
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "START",
    });
    assert.equal(proposed.proposal.schema, "budget_proposal_v2");
    assert.equal(proposed.proposal.expected_run_version, 1);
    assert.equal(proposed.proposal.recommended.max_iterations, 12);
    assert.equal(proposed.proposal.recommended.max_runtime_minutes, null);
    assert.equal(proposed.proposal.policy_ceiling.max_runtime_minutes, 240);
    assert.equal(proposed.proposal.effective_preview.max_runtime_minutes, 240);
    assert.equal(proposed.proposal.remaining.iterations, 12);
    assert.equal(proposed.proposal.lineage.run_count, 1);
    assert.equal(proposed.proposal.lineage_totals.iterations, 0);
    assert.equal(proposed.proposal.display_context.authority, "ADVISORY_DISPLAY_ONLY");
    assert.equal(
      proposed.proposal.recommendation_source,
      "REFERENCE_ADAPTER_ADVISORY",
    );
    assert.equal(proposed.wizard.schema, "budget_stop_wizard_v2");
    assert.deepEqual(proposed.wizard.actions.map((entry) => entry.id), ["Confirm", "Cancel"]);
    assert.equal(proposed.wizard.goal.summary, fixture.contract.goal.summary);
    assert.equal(proposed.wizard.cost.currency, "USD");
    assert.equal(proposed.wizard.simulation_only, true);
    assert.match(proposed.proposal_digest, /^sha256:[a-f0-9]{64}$/u);
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    const forgedCases = [
      [
        "mode-source",
        (proposal) => {
          proposal.execution_mode = "ENFORCE";
        },
        {},
        /schema validation|oneOf|MODEL_ADVISORY/i,
      ],
      [
        "currency",
        (proposal) => {
          proposal.billing_currency = "IDR";
        },
        { billing_currency: "IDR" },
        /billing currency.*mismatch/i,
      ],
      [
        "display-context",
        (proposal) => {
          proposal.display_context.goal_summary = "Misleading stored goal summary.";
          proposal.display_context.acceptance_criteria = [
            "Accept without the canonical verifier criteria.",
          ];
        },
        {},
        /goal display context.*stale/i,
      ],
      [
        "null-warning",
        (proposal) => {
          proposal.null_warnings[0] =
            "max_runtime_minutes is null: unlimited globally.";
        },
        {},
        /null warnings.*exactly match/i,
      ],
    ];
    for (const [name, mutate, confirmationOverrides, expected] of forgedCases) {
      const forged = structuredClone(proposed.proposal);
      mutate(forged);
      const forgedText = JSON.stringify(forged);
      const forgedDigest = sha256(forgedText);
      await writeFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "proposals",
          `${forgedDigest.slice("sha256:".length)}.json`,
        ),
        forgedText,
      );
      const forgedConfirmation = makeConfirmation(fixture.contract, {
        proposal_digest: forgedDigest,
        ...confirmationOverrides,
      });
      const confirmationFile = `confirmation-forged-${name}.json`;
      await writeFile(
        path.join(fixture.root, confirmationFile),
        `${JSON.stringify(forgedConfirmation, null, 2)}\n`,
      );
      await assert.rejects(
        controller.confirmBudget({
          runId: fixture.contract.run_id,
          expectedVersion: 1,
          inputFile: confirmationFile,
        }),
        (error) =>
          error?.code === "APPROVAL_REQUIRED" && expected.test(error.message),
        name,
      );
      assert.equal(
        (await controller.show({ runId: fixture.contract.run_id })).event_count,
        1,
      );
    }

    await writeFile(
      path.join(fixture.root, "recommendation-model.json"),
      `${JSON.stringify({
        schema: "budget_recommendation_v2",
        contract_version: "2.0.0",
        recommendation_source: "MODEL_ADVISORY",
        run_id: fixture.contract.run_id,
        phase: "START",
        expected_run_version: 1,
        goal_ref: fixture.contract.goal.ref,
        goal_digest: fixture.contract.goal.digest,
        verifier_digest: fixture.contract.verifier.digest,
        policy_digest: policyBindingDigest(fixture.contract),
        recommended_limits: {
          max_iterations: 8,
          max_runtime_minutes: 120,
          max_no_progress_iterations: 2,
          max_tokens: null,
          max_cost: null,
        },
        recommendation_reason: "Eight cycles with tighter runtime and no-progress caps cover this goal.",
      }, null, 2)}\n`,
    );
    const modelProposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "START",
      recommendationFile: "recommendation-model.json",
    });
    assert.equal(modelProposed.proposal.recommendation_source, "MODEL_ADVISORY");
    assert.equal(modelProposed.proposal.recommended.max_iterations, 8);
    assert.equal(modelProposed.proposal.effective_preview.max_runtime_minutes, 120);
    assert.equal(modelProposed.proposal.effective_preview.max_no_progress_iterations, 2);
    assert.equal(modelProposed.proposal.null_warnings.length, 2);
    assert.equal(modelProposed.wizard.recommendation.authority, "ADVISORY_ONLY");

    const invalidRecommendation = {
      ...JSON.parse(await readFile(path.join(fixture.root, "recommendation-model.json"), "utf8")),
      recommendation_reason: "Use token=secret-value for this bounded run.",
    };
    await writeFile(
      path.join(fixture.root, "recommendation-invalid.json"),
      `${JSON.stringify(invalidRecommendation, null, 2)}\n`,
    );
    await assert.rejects(
      controller.proposeBudget({
        runId: fixture.contract.run_id,
        phase: "START",
        recommendationFile: "recommendation-invalid.json",
      }),
      /recommendation input.*invalid|unbounded/i,
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);
    await assert.rejects(
      controller.proposeBudget({ runId: fixture.contract.run_id, phase: "RESUME" }),
      /phase.*status|PAUSED/i,
    );

    const listed = await controller.list();
    assert.deepEqual(listed.map((entry) => entry.run_id), [fixture.contract.run_id]);
    assert.equal(listed[0].status, "READY");
    assert.deepEqual(await controller.list({ status: "SUCCESS" }), []);
    await assert.rejects(controller.list({ status: "not-a-state" }), /status.*unsupported/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a tighter model proposal remains advisory and a human may confirm different bounded values", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `model-human-${String(++nextId).padStart(4, "0")}`,
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const recommendation = {
      schema: "budget_recommendation_v2",
      contract_version: "2.0.0",
      recommendation_source: "MODEL_ADVISORY",
      run_id: fixture.contract.run_id,
      phase: "START",
      expected_run_version: 1,
      goal_ref: fixture.contract.goal.ref,
      goal_digest: fixture.contract.goal.digest,
      verifier_digest: fixture.contract.verifier.digest,
      policy_digest: policyBindingDigest(fixture.contract),
      recommended_limits: {
        max_iterations: 8,
        max_runtime_minutes: 120,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost: null,
      },
      recommendation_reason: "Eight bounded cycles are the model advisory for this goal.",
    };
    await writeFile(
      path.join(fixture.root, "recommendation-human-choice.json"),
      `${JSON.stringify(recommendation, null, 2)}\n`,
    );
    const proposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "START",
      recommendationFile: "recommendation-human-choice.json",
    });
    assert.deepEqual(proposed.proposal.effective_preview, {
      max_iterations: 8,
      max_runtime_minutes: 120,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost_micro: null,
    });

    const humanConfirmation = makeConfirmation(fixture.contract, {
      proposal_digest: proposed.proposal_digest,
      confirmed_limits: {
        max_cost: null,
        max_tokens: null,
        max_no_progress_iterations: 1,
        max_runtime_minutes: 90,
        max_iterations: 7,
      },
      confirmed_budget: {
        max_cost_micro: null,
        max_tokens: null,
        max_no_progress_iterations: 1,
        max_runtime_minutes: 90,
        max_iterations: 7,
      },
      effective_budget: {
        max_cost_micro: null,
        max_tokens: null,
        max_no_progress_iterations: 1,
        max_runtime_minutes: 90,
        max_iterations: 7,
      },
    });
    await writeFile(
      path.join(fixture.root, "confirmation-human-choice.json"),
      `${JSON.stringify(humanConfirmation, null, 2)}\n`,
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-human-choice.json",
    });
    assert.deepEqual(confirmed.state.effective_budget, {
      max_iterations: 7,
      max_runtime_minutes: 90,
      max_no_progress_iterations: 1,
      max_tokens: null,
      max_cost_micro: null,
    });
    assert.equal(confirmed.state.version, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("strict CLI exposes create, budget, apply, show, list, validate-gate, and repair", async () => {
  const fixture = await makeRepository();
  fixture.contract.policy.expires_at = "9999-12-31T23:59:59.999999999Z";
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );
  const runCli = (args, expectedStatus = 0) => {
    const result = spawnSync(process.execPath, [LOOP_RUN_CLI, ...args], {
      cwd: fixture.root,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, expectedStatus, result.stderr);
    return result;
  };
  const parseSuccess = (args) => JSON.parse(runCli(args).stdout);

  try {
    const created = parseSuccess(["create", "--contract-file", "contract-input.json"]);
    assert.equal(created.state.status, "READY");
    await writeFile(
      path.join(fixture.root, "recommendation-cli.json"),
      `${JSON.stringify({
        schema: "budget_recommendation_v2",
        contract_version: "2.0.0",
        recommendation_source: "MODEL_ADVISORY",
        run_id: fixture.contract.run_id,
        phase: "START",
        expected_run_version: 1,
        goal_ref: fixture.contract.goal.ref,
        goal_digest: fixture.contract.goal.digest,
        verifier_digest: fixture.contract.verifier.digest,
        policy_digest: policyBindingDigest(fixture.contract),
        recommended_limits: {
          max_iterations: 12,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost: null,
        },
        recommendation_reason: "Use the bounded controller-test iteration ceiling.",
      }, null, 2)}\n`,
    );
    const proposal = parseSuccess([
      "budget",
      "propose",
      "--run",
      fixture.contract.run_id,
      "--phase",
      "start",
      "--input-file",
      "recommendation-cli.json",
    ]);
    assert.equal(proposal.proposal.phase, "START");
    assert.equal(proposal.proposal.recommendation_source, "MODEL_ADVISORY");
    assert.equal(proposal.wizard.approval.proposal_digest, proposal.proposal_digest);

    const nowMs = Date.now();
    const confirmation = makeConfirmation(fixture.contract, {
      proposal_digest: proposal.proposal_digest,
      confirmed_at: new Date(nowMs).toISOString(),
      expires_at: new Date(nowMs + 60 * 60 * 1_000).toISOString(),
    });
    await writeFile(
      path.join(fixture.root, "confirmation-cli.json"),
      `${JSON.stringify(confirmation, null, 2)}\n`,
    );
    const confirmed = parseSuccess([
      "budget",
      "confirm",
      "--run",
      fixture.contract.run_id,
      "--expected-version",
      "1",
      "--input-file",
      "confirmation-cli.json",
    ]);
    await writeFile(
      path.join(fixture.root, "start-cli.json"),
      `${JSON.stringify({
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const started = parseSuccess([
      "apply",
      "--run",
      fixture.contract.run_id,
      "--expected-version",
      "2",
      "--command",
      "START",
      "--input-file",
      "start-cli.json",
    ]);
    assert.equal(started.state.status, "RUNNING");
    await writeFile(
      path.join(fixture.root, "begin-action-cli.json"),
      `${JSON.stringify({
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "cli-action-001",
        idempotency_key: "cli-action-001-key",
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    parseSuccess([
      "apply",
      "--run",
      fixture.contract.run_id,
      "--expected-version",
      "3",
      "--command",
      "BEGIN_ACTION",
      "--input-file",
      "begin-action-cli.json",
    ]);
    const gate = parseSuccess([
        "validate-gate",
        "--run",
        fixture.contract.run_id,
        "--operation",
        "work",
      ]);
    assert.equal(gate.allowed, false);
    assert.equal(gate.would_allow, true);
    assert.equal(gate.simulation_only, true);
    assert.equal(gate.mutation_authorized, false);
    assert.equal(
      parseSuccess(["show", "--run", fixture.contract.run_id]).state.version,
      4,
    );
    assert.equal(parseSuccess(["list", "--status", "RUNNING"]).length, 1);

    const healthyRepair = runCli(
      [
        "repair",
        "--run",
        fixture.contract.run_id,
        "--expected-version",
        "4",
      ],
      1,
    );
    assert.equal(healthyRepair.stdout, "");
    assert.match(healthyRepair.stderr, /repair.*not required|not behind/i);
    const unknown = runCli(["show", "--run", fixture.contract.run_id, "--extra", "x"], 1);
    assert.equal(unknown.stdout, "");
    assert.match(unknown.stderr, /unsupported option/i);
    assert.doesNotMatch(unknown.stderr, /\n\s+at\s/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("adversarial boundaries reject duplicate event IDs, symlinked runs, drift, v1, and effect imports", async () => {
  const fixture = await makeRepository();
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => "duplicate-event-id",
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const confirmation = makeConfirmation(fixture.contract, {
      proposal_digest: await proposeDigest(controller, fixture.contract),
    });
    await writeFile(
      path.join(fixture.root, "confirmation-duplicate.json"),
      `${JSON.stringify(confirmation, null, 2)}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "confirmation-duplicate.json",
      }),
      /duplicate event ID/i,
    );
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    assert.equal(
      (await readFile(path.join(runDirectory, "events.jsonl"), "utf8")).trim().split("\n")
        .length,
      1,
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).state.version, 1);

    const v1 = { ...confirmation, schema: "budget_confirmation_v1" };
    await writeFile(path.join(fixture.root, "confirmation-v1.json"), `${JSON.stringify(v1)}\n`);
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "confirmation-v1.json",
      }),
      /schema validation|v1/i,
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    const outside = await mkdtemp(path.join(tmpdir(), "loop-run-outside-"));
    try {
      await symlink(
        outside,
        path.join(fixture.root, ".scratch", "loop-runs", "symlinked-run"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await assert.rejects(controller.list(), /symlink/i);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }

    const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
    const driftedConfig = makeProjectConfig();
    driftedConfig.policy.max_iterations = 11;
    await writeFile(configPath, `${JSON.stringify(driftedConfig, null, 2)}\n`);
    await assert.rejects(
      controller.show({ runId: fixture.contract.run_id }),
      /project config digest.*stale/i,
    );

    const source = await readFile(LOOP_RUN_CLI, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["']node:(?:child_process|http|https|net|tls|dgram)["']|\b(?:execFile|spawn|fork|fetch)\s*\(/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G4-R1 confirmation uses the earliest proposal TTL, policy expiry, or envelope expiry", async () => {
  const cases = [
    {
      name: "proposal-ttl",
      approvalTtlMinutes: 5,
      policyExpiry: "2026-07-18T00:08:00.000Z",
      confirmationExpiry: "2026-07-18T01:00:00.000Z",
      expectedExpiry: "2026-07-18T00:05:00.000Z",
    },
    {
      name: "policy-expiry",
      approvalTtlMinutes: 10,
      policyExpiry: "2026-07-18T00:03:00.000Z",
      confirmationExpiry: "2026-07-18T01:00:00.000Z",
      expectedExpiry: "2026-07-18T00:03:00.000Z",
    },
    {
      name: "confirmation-expiry",
      approvalTtlMinutes: 10,
      policyExpiry: "2026-07-18T00:08:00.000Z",
      confirmationExpiry: "2026-07-18T00:02:00.000Z",
      expectedExpiry: "2026-07-18T00:02:00.000Z",
    },
    {
      name: "nanosecond-proposal-ttl",
      proposalAt: "2026-07-18T00:00:00.999999999Z",
      approvalTtlMinutes: 5,
      policyExpiry: "2026-07-18T00:08:00.000Z",
      confirmationExpiry: "2026-07-18T01:00:00.000Z",
      expectedExpiry: "2026-07-18T00:05:00.999999999Z",
    },
  ];

  for (const scenario of cases) {
    const fixture = await makeRepository();
    let currentTime = scenario.proposalAt ?? "2026-07-18T00:00:00.000Z";
    let nextId = 0;
    fixture.contract.policy.approval_ttl_minutes = scenario.approvalTtlMinutes;
    fixture.contract.policy.expires_at = scenario.policyExpiry;
    await writeFile(
      path.join(fixture.root, "contract-input.json"),
      `${JSON.stringify(fixture.contract, null, 2)}\n`,
    );
    const controller = createLoopRunController(fixture.root, {
      now: () => currentTime,
      randomId: () => `${scenario.name}-${String(++nextId).padStart(4, "0")}`,
    });
    try {
      await controller.create({ contractFile: "contract-input.json" });
      const proposal_digest = await proposeDigest(controller, fixture.contract);
      const confirmation = makeConfirmation(fixture.contract, {
        proposal_digest,
        confirmed_at: "2026-07-18T00:01:00.000Z",
        expires_at: scenario.confirmationExpiry,
      });
      await writeFile(
        path.join(fixture.root, "confirmation-earliest.json"),
        `${JSON.stringify(confirmation, null, 2)}\n`,
      );
      currentTime = "2026-07-18T00:01:00.000Z";
      const confirmed = await controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "confirmation-earliest.json",
      });
      assert.equal(confirmed.state.approval.expires_at, scenario.expectedExpiry, scenario.name);
      assert.deepEqual(
        (await controller.show({ runId: fixture.contract.run_id })).state,
        confirmed.state,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("G4-R2 provisional create is retryable only with the exact immutable contract", async () => {
  const fixture = await makeRepository();
  let crashAfterContract = true;
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => CREATED_AT,
    randomId: () => `event-provisional-${String(++nextId).padStart(4, "0")}`,
    afterContractWrite: () => {
      if (crashAfterContract) {
        crashAfterContract = false;
        throw new Error("injected crash after immutable contract");
      }
    },
  });

  try {
    await assert.rejects(
      controller.create({ contractFile: "contract-input.json" }),
      /injected crash after immutable contract/i,
    );
    const runDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
    );
    assert.equal(await readFile(path.join(runDirectory, "contract.json"), "utf8"), fixture.contractText);
    await assert.rejects(access(path.join(runDirectory, "events.jsonl")));
    await assert.rejects(access(path.join(runDirectory, "state.json")));

    const drifted = structuredClone(fixture.contract);
    drifted.goal.digest = DIGEST_C;
    await writeFile(
      path.join(fixture.root, "contract-drifted.json"),
      `${JSON.stringify(drifted, null, 2)}\n`,
    );
    await assert.rejects(
      controller.create({ contractFile: "contract-drifted.json" }),
      /provisional.*contract.*drift|immutable.*differs/i,
    );
    await assert.rejects(access(path.join(runDirectory, "events.jsonl")));

    const recovered = await controller.create({ contractFile: "contract-input.json" });
    assert.equal(recovered.state.version, 1);
    assert.equal(recovered.state.status, "READY");
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      recovered.state,
    );
    await assert.rejects(
      controller.create({ contractFile: "contract-input.json" }),
      /already exists|immutable/i,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G4-R3 denied confirmations never create unreferenced durable evidence", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `event-denial-${String(++nextId).padStart(4, "0")}`,
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const denied = makeConfirmation(fixture.contract, {
        proposal_digest,
        confirmation_id: `confirmation-denied-${attempt}`,
        confirmed_limits: {
          max_iterations: 13,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost: null,
        },
        confirmed_budget: {
          max_iterations: 13,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost_micro: null,
        },
        effective_budget: {
          max_iterations: 13,
          max_runtime_minutes: 240,
          max_no_progress_iterations: 3,
          max_tokens: null,
          max_cost_micro: null,
        },
      });
      const input = `confirmation-denied-${attempt}.json`;
      await writeFile(path.join(fixture.root, input), `${JSON.stringify(denied, null, 2)}\n`);
      await assert.rejects(
        controller.confirmBudget({
          runId: fixture.contract.run_id,
          expectedVersion: 1,
          inputFile: input,
        }),
        /APPROVAL_REQUIRED.*policy ceiling|BUDGET_LOOSENING_FORBIDDEN|confirmation denied/i,
      );
    }

    const evidenceDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "confirmations",
    );
    const deniedEvidence = await readdir(evidenceDirectory).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    });
    assert.deepEqual(deniedEvidence, []);
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    const accepted = makeConfirmation(fixture.contract, { proposal_digest });
    await writeFile(
      path.join(fixture.root, "confirmation-accepted.json"),
      `${JSON.stringify(accepted, null, 2)}\n`,
    );
    const result = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "confirmation-accepted.json",
    });
    assert.deepEqual(await readdir(evidenceDirectory), [
      `${result.confirmation_digest.slice("sha256:".length)}.json`,
    ]);
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G4-R4 list fails closed at finite aggregate entry and byte-I/O bounds", async () => {
  const fixture = await makeRepository();
  const controller = createLoopRunController(fixture.root, {
    now: () => CREATED_AT,
    randomId: () => "event-list-bounds",
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const runsDirectory = path.join(fixture.root, ".scratch", "loop-runs");
    await writeFile(path.join(runsDirectory, "unexpected-entry"), "bounded\n");

    const entryBounded = createLoopRunController(fixture.root, {
      maxListEntries: 1,
    });
    await assert.rejects(
      entryBounded.list(),
      /list entry (?:limit|bound|budget).*exceeded/i,
    );

    await rm(path.join(runsDirectory, "unexpected-entry"));
    const byteBounded = createLoopRunController(fixture.root, {
      maxListBytes: 1,
    });
    await assert.rejects(
      byteBounded.list(),
      /list byte-I\/O budget exceeded before reading .* beyond 1 byte/i,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-006 stale, mismatched, expired, or model-authored confirmation fails with stable code and no mutation", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-006-denial-${String(++nextId).padStart(4, "0")}`,
  });
  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    const baseline = await controller.show({ runId: fixture.contract.run_id });
    const cases = [
      ["proposal", { proposal_digest: DIGEST_A }],
      ["run", { run_id: "LER2-OTHER-RUN" }],
      ["phase", { phase: "RESUME" }],
      ["queue", { queue_item_id: "queue-unbound" }],
      ["version", { expected_run_version: 0 }],
      ["goal-ref", { goal_ref: "FSD-LER2@1.0.0#GOAL-OTHER" }],
      ["goal-digest", { goal_digest: DIGEST_B }],
      ["authority", { authority_digest: DIGEST_A }],
      ["project-config", { project_config_digest: DIGEST_A }],
      ["verifier-ref", { verifier_ref: "FSD-LER2@1.0.0#TEST-OTHER" }],
      ["verifier-digest", { verifier_digest: DIGEST_A }],
      ["eval", { eval_definition_digest: DIGEST_A }],
      ["policy", { policy_digest: DIGEST_A }],
      ["autonomy", { autonomy_profile: "BACKGROUND" }],
      ["risk", { risk_profile: "LOW" }],
      ["currency", { billing_currency: "IDR" }],
      ["expired", { expires_at: "2026-07-18T00:09:59.999Z" }],
      ["future", { confirmed_at: "2026-07-18T00:10:00.001Z" }],
      [
        "model",
        {
          approver: {
            actor_id: "model-self",
            actor_type: "MODEL",
            attestation: "LOCAL_OBSERVE_HUMAN",
          },
        },
      ],
      [
        "claimed-host",
        {
          approver: {
            actor_id: "claimed-host-human",
            actor_type: "HUMAN",
            attestation: "HOST_ATTESTED_HUMAN",
          },
        },
      ],
      [
        "normalized-budget",
        {
          confirmed_budget: {
            max_iterations: 11,
            max_runtime_minutes: null,
            max_no_progress_iterations: null,
            max_tokens: null,
            max_cost_micro: null,
          },
        },
      ],
      [
        "effective-budget",
        {
          effective_budget: {
            max_iterations: 11,
            max_runtime_minutes: 240,
            max_no_progress_iterations: 3,
            max_tokens: null,
            max_cost_micro: null,
          },
        },
      ],
    ];

    for (const [name, overrides] of cases) {
      const input = `test-006-denied-${name}.json`;
      await writeFile(
        path.join(fixture.root, input),
        `${JSON.stringify(
          makeConfirmation(fixture.contract, {
            proposal_digest,
            confirmation_id: `test-006-denied-${name}`,
            ...overrides,
          }),
          null,
          2,
        )}\n`,
      );
      await assert.rejects(
        controller.confirmBudget({
          runId: fixture.contract.run_id,
          expectedVersion: 1,
          inputFile: input,
        }),
        (error) =>
          error?.code === "APPROVAL_REQUIRED" &&
          /^APPROVAL_REQUIRED:/u.test(error.message),
        name,
      );
      assert.deepEqual(
        await controller.show({ runId: fixture.contract.run_id }),
        baseline,
        name,
      );
    }

    await writeFile(
      path.join(fixture.root, "test-006-stale-cli-version.json"),
      `${JSON.stringify(
        makeConfirmation(fixture.contract, {
          proposal_digest,
          confirmation_id: "test-006-stale-cli-version",
        }),
        null,
        2,
      )}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 0,
        inputFile: "test-006-stale-cli-version.json",
      }),
      (error) =>
        error?.code === "APPROVAL_REQUIRED" && /CAS conflict/i.test(error.message),
    );
    assert.deepEqual(await controller.show({ runId: fixture.contract.run_id }), baseline);

    const evidenceDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "confirmations",
    );
    assert.deepEqual(
      await readdir(evidenceDirectory).catch((error) => {
        if (error?.code === "ENOENT") return [];
        throw error;
      }),
      [],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-006 max_cost normalization and finite usage caps require verified metering", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-006-meter-${String(++nextId).padStart(4, "0")}`,
  });
  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    const finite = makeConfirmation(fixture.contract, {
      proposal_digest,
      confirmed_limits: {
        max_iterations: 10,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: 1000,
        max_cost: "1.250000",
      },
      confirmed_budget: {
        max_iterations: 10,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: 1000,
        max_cost_micro: 1_250_000,
      },
      effective_budget: {
        max_iterations: 10,
        max_runtime_minutes: 240,
        max_no_progress_iterations: 3,
        max_tokens: 1000,
        max_cost_micro: 1_250_000,
      },
    });
    await writeFile(
      path.join(fixture.root, "test-006-finite.json"),
      `${JSON.stringify(finite, null, 2)}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "test-006-finite.json",
      }),
      (error) =>
        error?.code === "APPROVAL_REQUIRED" && /metering/i.test(error.message),
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    let completionAttestations = 0;
    const metered = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
      randomId: () => `test-006-metered-${String(++nextId).padStart(4, "0")}`,
      verifyUsageMetering: async ({ effective_budget }) =>
        effective_budget.max_tokens === 1000 &&
        effective_budget.max_cost_micro === 1_250_000,
      verifyUsageCompletionAttestation: async ({
        receipts,
        completion,
        receipt_set_digest,
        usage_unit_set_digest,
      }) => {
        completionAttestations += 1;
        return (
          receipts.length === 2 &&
          completion.receipt_count === 2 &&
          completion.attestation_digest === DIGEST_B &&
          /^sha256:[a-f0-9]{64}$/u.test(receipt_set_digest ?? "") &&
          /^sha256:[a-f0-9]{64}$/u.test(usage_unit_set_digest ?? "") &&
          receipts.map(({ contributor }) => contributor.kind).sort().join(",") ===
            "CHILD_AGENT,MAIN_AGENT"
        );
      },
    });
    const confirmed = await metered.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "test-006-finite.json",
    });
    assert.equal(confirmed.state.effective_budget.max_tokens, 1000);
    assert.equal(confirmed.state.effective_budget.max_cost_micro, 1_250_000);
    const evidence = JSON.parse(
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "confirmations",
          `${confirmed.confirmation_digest.slice("sha256:".length)}.json`,
        ),
        "utf8",
      ),
    );
    assert.equal(evidence.confirmed_limits.max_cost, "1.250000");
    assert.equal(evidence.confirmed_budget.max_cost_micro, 1_250_000);

    await writeFile(
      path.join(fixture.root, "test-010-start.json"),
      `${JSON.stringify({
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const started = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: confirmed.state.version,
      command: "START",
      inputFile: "test-010-start.json",
    });
    assert.equal(started.state.counters.tokens, 0);
    assert.equal(started.state.counters.token_measurement, "MEASURED");
    assert.equal(started.state.counters.cost_micro, 0);
    assert.equal(started.state.counters.cost_measurement, "MEASURED");

    await writeFile(
      path.join(fixture.root, "test-010-begin.json"),
      `${JSON.stringify({
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "usage-action-010",
        idempotency_key: "usage-action-010",
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const intended = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: started.state.version,
      command: "BEGIN_ACTION",
      inputFile: "test-010-begin.json",
    });
    await writeFile(
      path.join(fixture.root, "test-010-observe.json"),
      `${JSON.stringify({
        action_id: "usage-action-010",
        idempotency_key: "usage-action-010",
        external_action_record_digest: null,
        external_outcome: null,
        target_audit_digest: null,
        duration_ms: 1,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const observed = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: intended.state.version,
      command: "OBSERVE_ACTION",
      inputFile: "test-010-observe.json",
    });
    await writeFile(
      path.join(fixture.root, "test-010-premature-verification.json"),
      `${JSON.stringify({ freshness: makeFreshness(fixture.contract) }, null, 2)}\n`,
    );
    const verifying = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: observed.state.version,
      command: "BEGIN_VERIFICATION",
      inputFile: "test-010-premature-verification.json",
    });
    assert.equal(verifying.state.status, "VERIFYING");
    const receipt = {
      schema: "usage_receipt_v2",
      contract_version: "2.0.0",
      receipt_id: "usage-receipt-controller-1",
      run_id: fixture.contract.run_id,
      bound_run_head_digest: verifying.state.last_event_hash,
      workflow_route: "sc-work",
      iteration: 1,
      attempt: 1,
      autonomy_profile: fixture.contract.autonomy_profile,
      risk_profile: fixture.contract.risk_profile,
      contributor: { kind: "MAIN_AGENT", ref: DIGEST_A },
      token_usage: {
        input_tokens: { status: "MEASURED", value: 10 },
        output_tokens: { status: "MEASURED", value: 5 },
        reasoning_tokens: { status: "MEASURED", value: 2 },
        cached_input_tokens: { status: "MEASURED", value: 3 },
      },
      cost: {
        status: "MEASURED",
        micro_units: 25,
        billing_currency: "USD",
        pricing_revision: "pricing-2026-07-01",
        pricing_digest: DIGEST_C,
      },
      reservation: { status: "VERIFIED", attestation_digest: DIGEST_B },
      coverage: {
        status: "PARTIAL",
        receipt_count: 1,
        attestation_digest: null,
      },
      recorded_at: "2026-07-18T00:10:00.000Z",
    };
    const usageInput = {
      receipt,
      freshness: makeFreshness(fixture.contract),
    };
    await writeFile(
      path.join(fixture.root, "test-010-usage.json"),
      `${JSON.stringify(usageInput, null, 2)}\n`,
    );
    const recorded = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: verifying.state.version,
      command: "RECORD_USAGE",
      inputFile: "test-010-usage.json",
    });
    assert.equal(recorded.state.counters.tokens, 20);
    assert.equal(recorded.state.counters.cost_micro, 25);
    assert.equal(recorded.state.counters.usage_complete, false);
    assert.equal(completionAttestations, 0);

    const duplicate = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: recorded.state.version,
      command: "RECORD_USAGE",
      inputFile: "test-010-usage.json",
    });
    assert.equal(duplicate.idempotent, true);
    assert.equal(duplicate.state.version, recorded.state.version);

    await writeFile(
      path.join(fixture.root, "test-010-usage-conflict.json"),
      `${JSON.stringify({
        ...usageInput,
        receipt: {
          ...receipt,
          cost: { ...receipt.cost, micro_units: 26 },
        },
      }, null, 2)}\n`,
    );
    await assert.rejects(
      metered.apply({
        runId: fixture.contract.run_id,
        expectedVersion: recorded.state.version,
        command: "RECORD_USAGE",
        inputFile: "test-010-usage-conflict.json",
      }),
      /usage receipt.*conflict/i,
    );
    const completeReceipt = {
      ...receipt,
      receipt_id: "usage-receipt-controller-complete",
      bound_run_head_digest: recorded.state.last_event_hash,
      contributor: { kind: "MAIN_AGENT", ref: DIGEST_B },
      coverage: {
        status: "COMPLETE",
        receipt_count: 2,
        attestation_digest: DIGEST_B,
      },
    };
    await writeFile(
      path.join(fixture.root, "test-010-incomplete-coverage.json"),
      `${JSON.stringify({
        receipt: completeReceipt,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    await assert.rejects(
      metered.apply({
        runId: fixture.contract.run_id,
        expectedVersion: recorded.state.version,
        command: "RECORD_USAGE",
        inputFile: "test-010-incomplete-coverage.json",
      }),
      /complete usage attribution/i,
    );
    const afterOmittedChild = await metered.show({ runId: fixture.contract.run_id });
    assert.equal(afterOmittedChild.state.version, recorded.state.version);

    await writeFile(
      path.join(fixture.root, "test-010-complete-coverage.json"),
      `${JSON.stringify({
        receipt: {
          ...completeReceipt,
          receipt_id: "usage-receipt-controller-child",
          contributor: { kind: "CHILD_AGENT", ref: DIGEST_B },
        },
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const completed = await metered.apply({
      runId: fixture.contract.run_id,
      expectedVersion: recorded.state.version,
      command: "RECORD_USAGE",
      inputFile: "test-010-complete-coverage.json",
    });
    assert.equal(completed.state.status, "VERIFYING");
    assert.equal(completed.state.counters.usage_receipt_count, 2);
    assert.equal(completed.state.counters.usage_complete, true);
    assert.equal(completionAttestations, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-010 human finite cost override requires pinned pricing authority", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  delete config.telemetry.pricing_revision;
  delete config.telemetry.pricing_digest;
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-010-pricing-pin-${++nextId}`,
    verifyUsageMetering: async () => true,
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposal_digest = await proposeDigest(controller, fixture.contract);
    const confirmation = makeConfirmation(fixture.contract, {
      proposal_digest,
      confirmed_limits: {
        max_iterations: 10,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: null,
        max_cost: "1.000000",
      },
      confirmed_budget: {
        max_iterations: 10,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
        max_tokens: null,
        max_cost_micro: 1_000_000,
      },
      effective_budget: {
        max_iterations: 10,
        max_runtime_minutes: 240,
        max_no_progress_iterations: 3,
        max_tokens: null,
        max_cost_micro: 1_000_000,
      },
    });
    await writeFile(
      path.join(fixture.root, "test-010-no-pricing.json"),
      `${JSON.stringify(confirmation, null, 2)}\n`,
    );

    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "test-010-no-pricing.json",
      }),
      (error) =>
        error?.code === "APPROVAL_REQUIRED" && /pricing authority/i.test(error.message),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-010 ENFORCE active runtime requires a host-attested elapsed value", async () => {
  const runtime = await import("./loop-run.mjs");
  assert.equal(typeof runtime.attestActiveRuntimeDuration, "function");
  const context = {
    mode: "ENFORCE",
    run_id: "LER2-TEST-010-RUNTIME",
    run_head_digest: DIGEST_A,
    phase: "OBSERVATION",
    duration_ms: 0,
  };
  await assert.rejects(
    runtime.attestActiveRuntimeDuration(context),
    /active runtime.*attestation/i,
  );
  await assert.rejects(
    runtime.attestActiveRuntimeDuration(context, async () => false),
    /active runtime.*attestation/i,
  );
  assert.equal(
    await runtime.attestActiveRuntimeDuration(
      { ...context, duration_ms: 25 },
      async ({ duration_ms }) => duration_ms === 25,
    ),
    25,
  );
  assert.equal(
    await runtime.attestActiveRuntimeDuration({ ...context, mode: "OBSERVE" }),
    0,
  );
});

test("TEST-010 operational metrics are host-attested unit facts and eval acceptance cannot be forged", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-010-metric-${String(++nextId).padStart(4, "0")}`,
    verifyOperationalMetricAttestation: async ({ metric }) =>
      metric.provenance === "HOST_ATTESTED",
  });
  try {
    const created = await controller.create({ contractFile: "contract-input.json" });
    const baseMetric = {
      schema: "operational_metric_v2",
      contract_version: "2.0.0",
      metric_id: DIGEST_A,
      run_id: fixture.contract.run_id,
      bound_run_head_digest: created.state.last_event_hash,
      kind: "ROUTE_INVOCATION",
      provenance: "HOST_ATTESTED",
      evidence_digest: DIGEST_B,
      recorded_at: "2026-07-18T00:10:00.000Z",
      payload: {
        workflow_route: "sc-work",
        surface: "FULL",
        invocation_ref: DIGEST_C,
      },
    };
    await writeFile(
      path.join(fixture.root, "test-010-forged-eval-metric.json"),
      `${JSON.stringify({
        metric: {
          ...baseMetric,
          kind: "EVAL_RELEASE",
          payload: {},
        },
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: created.state.version,
        command: "RECORD_OPERATIONAL_METRIC",
        inputFile: "test-010-forged-eval-metric.json",
      }),
      /kind is not allowed|eval release/i,
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    await writeFile(
      path.join(fixture.root, "test-010-route-metric.json"),
      `${JSON.stringify({
        metric: baseMetric,
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    const recorded = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: created.state.version,
      command: "RECORD_OPERATIONAL_METRIC",
      inputFile: "test-010-route-metric.json",
    });
    assert.equal(recorded.state.version, created.state.version + 1);
    const duplicate = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: recorded.state.version,
      command: "RECORD_OPERATIONAL_METRIC",
      inputFile: "test-010-route-metric.json",
    });
    assert.equal(duplicate.idempotent, true);

    await writeFile(
      path.join(fixture.root, "test-010-route-metric-conflict.json"),
      `${JSON.stringify({
        metric: {
          ...baseMetric,
          payload: { ...baseMetric.payload, surface: "COMPACT" },
        },
        freshness: makeFreshness(fixture.contract),
      }, null, 2)}\n`,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: recorded.state.version,
        command: "RECORD_OPERATIONAL_METRIC",
        inputFile: "test-010-route-metric-conflict.json",
      }),
      /operational metric.*conflict/i,
    );

    const eventPath = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "events.jsonl",
    );
    const events = (await readFile(eventPath, "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    const metricEvent = events.at(-1);
    metricEvent.data.metric.bound_run_head_digest = DIGEST_C;
    metricEvent.event_hash = eventDigest(metricEvent);
    await writeFile(eventPath, `${events.map(JSON.stringify).join("\n")}\n`);
    const replayController = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
    });
    await assert.rejects(
      replayController.show({ runId: fixture.contract.run_id }),
      /operational metric.*corrupt|run head digest/i,
    );
    assert.equal((await replayController.showMode()).effective_mode, "HALTED");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-006 background proposal and READY queue claim bind one exact queue item in CLI and controller", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.policy.allowlisted_operations = ["queue-claim", "source-write", "work"];
  config.risk.maximum_autonomy = "BACKGROUND";
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  fixture.contract.autonomy_profile = "BACKGROUND";
  fixture.contract.policy.allowlisted_operations = ["queue-claim", "source-write", "work"];
  fixture.contract.policy.expires_at = "9999-12-31T23:59:59.999999999Z";
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );
  let nextId = 0;
  const observedAt = new Date().toISOString();
  const controller = createLoopRunController(fixture.root, {
    now: () => observedAt,
    randomId: () => `test-006-queue-${String(++nextId).padStart(4, "0")}`,
  });
  try {
    await controller.create({ contractFile: "contract-input.json" });
    await assert.rejects(
      controller.proposeBudget({
        runId: fixture.contract.run_id,
        phase: "START",
      }),
      /requires one exact queue item/i,
    );
    const proposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "START",
      queueItemId: "queue-item-006-A",
    });
    assert.equal(proposed.proposal.queue_item_id, "queue-item-006-A");
    assert.equal(proposed.wizard.bindings.queue_item_id, "queue-item-006-A");

    const cliProposal = spawnSync(
      process.execPath,
      [
        LOOP_RUN_CLI,
        "budget",
        "propose",
        "--run",
        fixture.contract.run_id,
        "--phase",
        "start",
        "--queue-item-id",
        "queue-item-006-A",
      ],
      { cwd: fixture.root, encoding: "utf8", windowsHide: true },
    );
    assert.equal(cliProposal.status, 0, cliProposal.stderr);
    assert.equal(JSON.parse(cliProposal.stdout).proposal.queue_item_id, "queue-item-006-A");

    const wrong = makeConfirmation(fixture.contract, {
      proposal_digest: proposed.proposal_digest,
      queue_item_id: "queue-item-006-B",
      autonomy_profile: "BACKGROUND",
      confirmed_at: observedAt,
      expires_at: "9999-12-31T23:59:59.999999999Z",
    });
    await writeFile(
      path.join(fixture.root, "test-006-queue-wrong.json"),
      `${JSON.stringify(wrong, null, 2)}\n`,
    );
    await assert.rejects(
      controller.confirmBudget({
        runId: fixture.contract.run_id,
        expectedVersion: 1,
        inputFile: "test-006-queue-wrong.json",
      }),
      (error) =>
        error?.code === "APPROVAL_REQUIRED" && /queue item.*mismatch/i.test(error.message),
    );
    assert.equal((await controller.show({ runId: fixture.contract.run_id })).event_count, 1);

    const correct = makeConfirmation(fixture.contract, {
      proposal_digest: proposed.proposal_digest,
      queue_item_id: "queue-item-006-A",
      autonomy_profile: "BACKGROUND",
      confirmed_at: observedAt,
      expires_at: "9999-12-31T23:59:59.999999999Z",
    });
    await writeFile(
      path.join(fixture.root, "test-006-queue-correct.json"),
      `${JSON.stringify(correct, null, 2)}\n`,
    );
    await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "test-006-queue-correct.json",
    });
    for (const queueItemId of [undefined, "queue-item-006-B"]) {
      await assert.rejects(
        controller.validateGate({
          runId: fixture.contract.run_id,
          operation: "queue-claim",
          queueItemId,
        }),
        (error) =>
          error?.code === "APPROVAL_REQUIRED" && /queue/i.test(error.message),
      );
    }
    const gate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "queue-claim",
      queueItemId: "queue-item-006-A",
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.would_allow, true);
    assert.equal(gate.simulation_only, true);
    assert.equal(gate.mutation_authorized, false);
    assert.equal(Object.hasOwn(gate, "background_budget_binding"), false);
    assert.equal(gate.queue_item_id, "queue-item-006-A");
    assert.equal(gate.confirmation_expected_run_version, 1);
    assert.equal(gate.approval_phase, "START");
    assert.equal(gate.approval_expires_at, "9999-12-31T23:59:59.999999999Z");
    assert.equal(gate.confirmed_goal_digest, fixture.contract.goal.digest);
    assert.equal(
      gate.confirmed_eval_definition_digest,
      fixture.contract.verifier.eval_definition_digest,
    );
    assert.equal(gate.approver_actor_type, "HUMAN");
    assert.equal(gate.approver_attestation, "LOCAL_OBSERVE_HUMAN");

    const cliGate = spawnSync(
      process.execPath,
      [
        LOOP_RUN_CLI,
        "validate-gate",
        "--run",
        fixture.contract.run_id,
        "--operation",
        "queue-claim",
        "--queue-item-id",
        "queue-item-006-A",
      ],
      { cwd: fixture.root, encoding: "utf8", windowsHide: true },
    );
    assert.equal(cliGate.status, 0, cliGate.stderr);
    assert.equal(JSON.parse(cliGate.stdout).allowed, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-006 consumed RESUME renders remaining and lineage totals, then zero remaining stops before new intent", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-006-resume-${String(++nextId).padStart(4, "0")}`,
  });
  const writeInput = async (name, value) => {
    const file = `${name}.json`;
    await writeFile(path.join(fixture.root, file), `${JSON.stringify(value, null, 2)}\n`);
    return file;
  };
  try {
    await controller.create({ contractFile: "contract-input.json" });
    await writeInput(
      "test-006-resume-start-confirmation",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const startConfirmation = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "test-006-resume-start-confirmation.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("test-006-resume-start", {
        confirmation_digest: startConfirmation.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("test-006-resume-action", {
        confirmation_digest: startConfirmation.confirmation_digest,
        action_id: "test-006-action-001",
        idempotency_key: "test-006-action-001-key",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 4,
      command: "OBSERVE_ACTION",
      inputFile: await writeInput("test-006-resume-observe", {
        action_id: "test-006-action-001",
        idempotency_key: "test-006-action-001-key",
        external_action_record_digest: null,
        external_outcome: null,
        target_audit_digest: null,
        duration_ms: 25,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 5,
      command: "BEGIN_VERIFICATION",
      inputFile: await writeInput("test-006-resume-verify", {
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 6,
      command: "VERIFICATION_FAILED",
      inputFile: await writeInput("test-006-resume-failed", {
        verification_status: "FAIL",
        fingerprint: DIGEST_A,
        requirement_delta: 0,
        coverage_delta: 0,
        meaningful_diff_count: 0,
        approach_id: "test-006-resume-a",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 7,
      command: "PAUSE",
      inputFile: await writeInput("test-006-resume-pause", {
        freshness: makeFreshness(fixture.contract),
      }),
    });

    const proposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "RESUME",
    });
    assert.equal(proposed.proposal.consumed.iterations, 1);
    assert.equal(proposed.proposal.remaining.iterations, 11);
    assert.equal(proposed.proposal.lineage.run_count, 1);
    assert.equal(proposed.proposal.lineage_totals.iterations, 1);
    assert.equal(proposed.wizard.consumed.iterations, 1);
    assert.equal(proposed.wizard.remaining.iterations, 11);
    assert.equal(proposed.wizard.lineage_totals.iterations, 1);

    await writeInput(
      "test-006-resume-zero-confirmation",
      makeConfirmation(fixture.contract, {
        proposal_digest: proposed.proposal_digest,
        confirmation_id: "test-006-resume-zero",
        phase: "RESUME",
        expected_run_version: 8,
        confirmed_limits: {
          max_iterations: 1,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost: null,
        },
        confirmed_budget: {
          max_iterations: 1,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost_micro: null,
        },
        effective_budget: {
          max_iterations: 1,
          max_runtime_minutes: 240,
          max_no_progress_iterations: 3,
          max_tokens: null,
          max_cost_micro: null,
        },
      }),
    );
    const resumeConfirmation = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 8,
      inputFile: "test-006-resume-zero-confirmation.json",
    });
    const resumed = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 9,
      command: "RESUME",
      inputFile: await writeInput("test-006-resume-zero", {
        confirmation_digest: resumeConfirmation.confirmation_digest,
        duration_ms: 0,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(resumed.state.status, "BUDGET_EXHAUSTED");
    assert.equal(resumed.state.terminal_reason, "MAX_ITERATIONS");
    assert.equal(resumed.state.counters.iterations, 1);
    const events = (await readFile(
      path.join(
        fixture.root,
        ".scratch",
        "loop-runs",
        fixture.contract.run_id,
        "events.jsonl",
      ),
      "utf8",
    ))
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(events.filter((event) => event.type === "ACTION_INTENDED").length, 1);
    assert.equal(events.at(-1).type, "RESUMED");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-006 every non-queue operation requires intent and OBSERVE never authorizes mutation", async () => {
  const fixture = await makeRepository();
  const operations = ["source-write", "work", "commit", "push", "pr", "custom-write"];
  const configPath = path.join(fixture.root, ".agent", "context", "project-config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.policy.allowlisted_operations = [...operations, "queue-claim"];
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  fixture.contract.policy.allowlisted_operations = [...operations, "queue-claim"];
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-006-gate-${String(++nextId).padStart(4, "0")}`,
  });
  const writeInput = async (name, value) => {
    const file = `${name}.json`;
    await writeFile(path.join(fixture.root, file), `${JSON.stringify(value, null, 2)}\n`);
    return file;
  };
  try {
    await controller.create({ contractFile: "contract-input.json" });
    const beforeApproval = await controller.show({ runId: fixture.contract.run_id });
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "source-write",
      }),
      (error) => error?.code === "APPROVAL_REQUIRED",
    );
    assert.deepEqual(
      await controller.show({ runId: fixture.contract.run_id }),
      beforeApproval,
    );

    await writeInput(
      "test-006-gate-confirmation",
      makeConfirmation(fixture.contract, {
        proposal_digest: await proposeDigest(controller, fixture.contract),
      }),
    );
    const confirmation = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: "test-006-gate-confirmation.json",
    });
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("test-006-gate-start", {
        confirmation_digest: confirmation.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    for (const operation of operations) {
      await assert.rejects(
        controller.validateGate({ runId: fixture.contract.run_id, operation }),
        /ACTION_INTENDED/i,
        operation,
      );
    }
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "queue-claim",
        queueItemId: "queue-interactive",
      }),
      (error) => error?.code === "APPROVAL_REQUIRED" && /background run/i.test(error.message),
    );
    await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 3,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("test-006-gate-action", {
        confirmation_digest: confirmation.confirmation_digest,
        action_id: "test-006-gate-action",
        idempotency_key: "test-006-gate-action-key",
        freshness: makeFreshness(fixture.contract),
      }),
    });
    for (const operation of operations) {
      const gate = await controller.validateGate({
        runId: fixture.contract.run_id,
        operation,
      });
      assert.equal(gate.allowed, false, operation);
      assert.equal(gate.would_allow, true, operation);
      assert.equal(gate.simulation_only, true, operation);
      assert.equal(gate.mutation_authorized, false, operation);
    }
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).state.version,
      4,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("cancellation cascade rejects child creation from nonterminal and cancelled parents before persistence", async () => {
  const fixture = await makeRepository();
  let nextId = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-006-lineage-${String(++nextId).padStart(4, "0")}`,
  });
  try {
    await controller.create({ contractFile: "contract-input.json" });
    const child = structuredClone(fixture.contract);
    child.run_id = "LER2-TEST-006-CHILD";
    child.lineage = {
      parent_run_id: fixture.contract.run_id,
      root_run_id: fixture.contract.run_id,
    };
    await writeFile(
      path.join(fixture.root, "contract-child.json"),
      `${JSON.stringify(child, null, 2)}\n`,
    );
    await assert.rejects(
      controller.create({ contractFile: "contract-child.json" }),
      /lineage requires a terminal parent/i,
    );
    const childRunDirectory = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      child.run_id,
    );
    await assert.rejects(access(childRunDirectory), { code: "ENOENT" });

    await writeFile(
      path.join(fixture.root, "cancel-parent.json"),
      `${JSON.stringify({ freshness: makeFreshness(fixture.contract) }, null, 2)}\n`,
    );
    const cancelled = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      command: "CANCEL",
      inputFile: "cancel-parent.json",
    });
    assert.equal(cancelled.state.status, "CANCELLED");
    await assert.rejects(
      controller.create({ contractFile: "contract-child.json" }),
      /Child-run creation denied: PARENT_CANCELLED/i,
    );
    await assert.rejects(access(childRunDirectory), { code: "ENOENT" });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G6-R1/R2 replays a valid depth-12 lineage once per run and never shares cache across operations", async () => {
  const fixture = await makeConfirmedLineage(12);
  try {
    const before = fixture.getHostAttestationChecks();
    const readsBefore = fixture.getReplayReads().length;
    const deepestRunId = fixture.contracts.at(-1).run_id;

    await fixture.controller.show({ runId: deepestRunId });
    assert.equal(
      fixture.getHostAttestationChecks() - before,
      fixture.contracts.length,
      "one top-level replay must validate each confirmed run exactly once",
    );
    const firstOperationReads = fixture.getReplayReads().slice(readsBefore);
    const physicalReadsByPath = new Map();
    for (const read of firstOperationReads) {
      physicalReadsByPath.set(read.path, (physicalReadsByPath.get(read.path) ?? 0) + 1);
    }
    assert.equal(
      [...physicalReadsByPath.values()].every((count) => count === 1),
      true,
      "each schema, config, authority, evidence, event log, and snapshot is read once",
    );
    assert.deepEqual(
      new Set(firstOperationReads.map((read) => read.kind)),
      new Set([
        "config",
        "schema",
        "contract",
        "events",
        "confirmation",
        "proposal",
        "snapshot",
      ]),
    );
    const perRunKinds = [
      "contract",
      "events",
      "snapshot",
      "proposal",
      "confirmation",
    ];
    const expectedRunReads = fixture.replayArtifacts.flatMap((artifact) =>
      perRunKinds.map((kind) => `${kind}:${artifact[kind]}`),
    );
    const observedRunReads = firstOperationReads
      .filter((read) => perRunKinds.includes(read.kind))
      .map((read) => `${read.kind}:${read.path}`);
    assert.deepEqual(
      [...observedRunReads].sort(),
      [...expectedRunReads].sort(),
      "every run must read its exact contract, event, snapshot, proposal, and confirmation path once",
    );

    const expectedSharedReads = [
      `config:${path.join(fixture.root, ".agent", "context", "project-config.json")}`,
      `schema:${path.join(
        fixture.root,
        ".agent",
        "context",
        "schemas",
        "project-config-v2.schema.json",
      )}`,
      ...[
        "loop-run-contract-v2.schema.json",
        "loop-run-event-v2.schema.json",
        "budget-confirmation-v2.schema.json",
        "budget-proposal-v2.schema.json",
        "loop-run-state-v2.schema.json",
      ].map((file) =>
        `schema:${fileURLToPath(new URL(`../context/schemas/${file}`, import.meta.url))}`,
      ),
    ];
    const observedSharedReads = firstOperationReads
      .filter((read) => ["config", "schema"].includes(read.kind))
      .map((read) => `${read.kind}:${read.path}`);
    assert.deepEqual(
      [...observedSharedReads].sort(),
      [...expectedSharedReads].sort(),
    );
    assert.equal(
      firstOperationReads.length,
      fixture.contracts.length * perRunKinds.length + expectedSharedReads.length,
    );

    const runByContractPath = new Map(
      fixture.replayArtifacts.map((artifact) => [artifact.contract, artifact.run_id]),
    );
    const observedTraversal = firstOperationReads
      .filter((read) => read.kind === "contract")
      .map((read) => runByContractPath.get(read.path));
    const expectedTraversal = fixture.contracts
      .map((contract) => contract.run_id)
      .reverse();
    assert.deepEqual(observedTraversal, expectedTraversal);
    const observedParentEdges = observedTraversal.slice(0, -1).map(
      (childRunId, index) => [childRunId, observedTraversal[index + 1]],
    );
    assert.equal(observedParentEdges.length, fixture.contracts.length - 1);
    const contractByRunId = new Map(
      fixture.contracts.map((contract) => [contract.run_id, contract]),
    );
    assert.deepEqual(
      observedParentEdges,
      observedParentEdges.map(([childRunId]) => [
        childRunId,
        contractByRunId.get(childRunId).lineage.parent_run_id,
      ]),
      "depth-12 replay must traverse exactly 11 direct-parent edges",
    );

    const afterFirst = fixture.getHostAttestationChecks();
    const readsAfterFirst = fixture.getReplayReads().length;
    const beforeMutation = await fixture.controller.show({ runId: deepestRunId });
    assert.equal(
      fixture.getHostAttestationChecks() - afterFirst,
      fixture.contracts.length,
      "a new top-level operation must create a fresh replay context",
    );
    assert.equal(
      fixture.getReplayReads().length - readsAfterFirst,
      firstOperationReads.length,
      "a later top-level operation must perform fresh bounded reads",
    );

    const ancestor = fixture.replayArtifacts[3];
    const originalProposal = await readFile(ancestor.proposal);
    const failedReadStart = fixture.getReplayReads().length;
    await writeFile(
      ancestor.proposal,
      Buffer.concat([originalProposal, Buffer.from("\n")]),
    );
    try {
      await assert.rejects(
        fixture.controller.show({ runId: deepestRunId }),
        /budget proposal evidence digest is corrupt/i,
      );
    } finally {
      await writeFile(ancestor.proposal, originalProposal);
    }
    const failedReads = fixture.getReplayReads().slice(failedReadStart);
    assert.equal(
      failedReads.filter((read) => read.path === ancestor.proposal).length,
      1,
    );

    const restoredReadStart = fixture.getReplayReads().length;
    const afterRestore = await fixture.controller.show({ runId: deepestRunId });
    assert.equal(afterRestore.event_count, beforeMutation.event_count);
    const restoredReads = fixture.getReplayReads().slice(restoredReadStart);
    for (const kind of perRunKinds) {
      assert.equal(
        restoredReads.filter((read) => read.path === ancestor[kind]).length,
        1,
        `restored top-level replay must freshly reread ancestor ${kind}`,
      );
    }

    await writeValidBehindSnapshot(fixture.root, fixture.contracts.at(-1));
    await fixture.controller.repair({
      runId: deepestRunId,
      expectedVersion: beforeMutation.state.version,
    });
    const afterMutation = await fixture.controller.show({ runId: deepestRunId });
    assert.equal(afterMutation.event_count, beforeMutation.event_count + 1);
    assert.notEqual(afterMutation.head, beforeMutation.head);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G6-R4 list charges one shared exact byte budget through the complete depth-12 lineage", async () => {
  const fixture = await makeConfirmedLineage(12);
  try {
    const measuredReads = [];
    const measured = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
      verifyHostHumanAttestation: async () => true,
      observeReplayRead: async (read) => measuredReads.push(read),
    });
    assert.equal((await measured.list()).length, fixture.contracts.length);
    const exactBytes = measuredReads.reduce((total, read) => total + read.bytes, 0);
    assert.equal(exactBytes > 1, true);

    const exact = createLoopRunController(fixture.root, {
      maxListBytes: exactBytes,
      now: () => "2026-07-18T00:10:00.000Z",
      verifyHostHumanAttestation: async () => true,
    });
    assert.equal((await exact.list()).length, fixture.contracts.length);

    const oneByteShort = createLoopRunController(fixture.root, {
      maxListBytes: exactBytes - 1,
      now: () => "2026-07-18T00:10:00.000Z",
      verifyHostHumanAttestation: async () => true,
    });
    await assert.rejects(
      oneByteShort.list(),
      /list byte-I\/O budget exceeded/i,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("G6-R3 rejects self-cycles and A-to-B-to-A replay deterministically", async () => {
  const selfFixture = await makeConfirmedLineage(1);
  const fixture = await makeConfirmedLineage(2);
  try {
    selfFixture.contracts[0] = await rewriteLineageAndRehash(
      selfFixture.root,
      selfFixture.contracts[0],
      {
        parent_run_id: selfFixture.contracts[0].run_id,
        root_run_id: selfFixture.contracts[0].run_id,
      },
    );
    await assert.rejects(
      selfFixture.controller.show({ runId: selfFixture.contracts[0].run_id }),
      (error) =>
        !(error instanceof RangeError) &&
        /lineage.*(?:cyclic|re-entrant)/i.test(error.message),
    );

    fixture.contracts[0] = await rewriteLineageAndRehash(
      fixture.root,
      fixture.contracts[0],
      {
        parent_run_id: fixture.contracts[1].run_id,
        root_run_id: fixture.contracts[0].run_id,
      },
    );
    await assert.rejects(
      fixture.controller.show({ runId: fixture.contracts[1].run_id }),
      (error) =>
        !(error instanceof RangeError) &&
        /lineage.*(?:cyclic|re-entrant)/i.test(error.message),
    );
  } finally {
    await rm(selfFixture.root, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 Loop Run controller authority is opaque and repository-root bound", async () => {
  const fixture = await makeRepository();
  const otherFixture = await makeRepository();
  try {
    const controller = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
    });

    assert.equal(
      assertLoopRunControllerAuthority(controller, path.join(fixture.root, ".")),
      true,
    );
    for (const fake of [
      null,
      {},
      Object.freeze({ ...controller }),
      Object.freeze({ validateGate: controller.validateGate }),
    ]) {
      assert.throws(
        () => assertLoopRunControllerAuthority(fake, fixture.root),
        /LOOP_RUN_CONTROLLER_AUTHORITY_UNTRUSTED/u,
      );
    }
    assert.throws(
      () => assertLoopRunControllerAuthority(controller, otherFixture.root),
      /LOOP_RUN_CONTROLLER_AUTHORITY_ROOT_MISMATCH/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(otherFixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 controller exposes only a fresh root-bound canonical project config authority", async () => {
  const fixture = await makeRepository();
  const otherFixture = await makeRepository();
  try {
    const controller = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
    });
    const loopRunModule = await import("./loop-run.mjs");
    assert.equal(
      typeof loopRunModule.loadLoopRunControllerCanonicalProjectConfig,
      "function",
    );

    const loaded = await loopRunModule.loadLoopRunControllerCanonicalProjectConfig(
      controller,
      fixture.root,
    );
    assert.equal(loaded.effective_mode, "OBSERVE");
    assert.equal(loaded.config_digest, fixture.contract.project_config_digest);

    for (const fake of [
      null,
      {},
      Object.freeze({ ...controller }),
      Object.freeze({ validateGate: controller.validateGate }),
    ]) {
      await assert.rejects(
        Promise.resolve().then(() =>
          loopRunModule.loadLoopRunControllerCanonicalProjectConfig(
            fake,
            fixture.root,
          ),
        ),
        /LOOP_RUN_CONTROLLER_AUTHORITY_UNTRUSTED/u,
      );
    }
    await assert.rejects(
      loopRunModule.loadLoopRunControllerCanonicalProjectConfig(
        controller,
        otherFixture.root,
      ),
      /LOOP_RUN_CONTROLLER_AUTHORITY_ROOT_MISMATCH/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(otherFixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 valid isolated mode authority enables canonical ENFORCE and restart without it halts", async () => {
  const fixture = await makeRepository();
  const otherFixture = await makeRepository();
  const configPath = path.join(
    fixture.root,
    ".agent",
    "context",
    "project-config.json",
  );
  try {
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.mode = "ENFORCE";
    const configText = `${JSON.stringify(config, null, 2)}\n`;
    await writeFile(configPath, configText);
    let verificationCalls = 0;
    const authority = await installProjectModeCapability(fixture, {
      configText,
      verifyHostAttestation: async () => {
        verificationCalls += 1;
        return true;
      },
    });
    const controller = createLoopRunController(fixture.root, {
      modeCapabilityAuthority: authority,
      now: () => "2026-07-22T12:00:00.000Z",
    });

    assert.equal((await controller.showMode()).effective_mode, "ENFORCE");
    const canonical = await (
      await import("./loop-run.mjs")
    ).loadLoopRunControllerCanonicalProjectConfig(controller, fixture.root);
    assert.equal(canonical.valid, true);
    assert.equal(canonical.effective_mode, "ENFORCE");
    assert.equal(canonical.config_digest, sha256(configText));
    assert.ok(verificationCalls >= 2);

    const restartedWithoutAuthority = createLoopRunController(fixture.root, {
      now: () => "2026-07-22T12:00:00.000Z",
    });
    const halted = await restartedWithoutAuthority.showMode();
    assert.equal(halted.valid, false);
    assert.equal(halted.effective_mode, "HALTED");

    for (const fake of [{}, structuredClone(authority)]) {
      assert.throws(
        () =>
          createLoopRunController(fixture.root, {
            modeCapabilityAuthority: fake,
          }),
        /PROJECT_MODE_CAPABILITY_AUTHORITY_UNTRUSTED/u,
      );
    }
    assert.throws(
      () =>
        createLoopRunController(otherFixture.root, {
          modeCapabilityAuthority: authority,
        }),
      /PROJECT_MODE_CAPABILITY_AUTHORITY_ROOT_MISMATCH/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(otherFixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 controller revalidates mode authority for revocation, expiry, and config drift", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(
    fixture.root,
    ".agent",
    "context",
    "project-config.json",
  );
  try {
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.mode = "ENFORCE";
    const configText = `${JSON.stringify(config, null, 2)}\n`;
    await writeFile(configPath, configText);
    let currentTime = "2026-07-22T12:00:00.000Z";
    let hostVerified = true;
    const authority = await installProjectModeCapability(fixture, {
      configText,
      now: () => currentTime,
      verifyHostAttestation: async () => hostVerified,
    });
    const controller = createLoopRunController(fixture.root, {
      modeCapabilityAuthority: authority,
      now: () => currentTime,
    });

    assert.equal((await controller.showMode()).effective_mode, "ENFORCE");
    hostVerified = false;
    assert.equal((await controller.validateMode()).effective_mode, "HALTED");
    hostVerified = true;
    const drifted = { ...config, billing_currency: "IDR" };
    await writeFile(configPath, `${JSON.stringify(drifted, null, 2)}\n`);
    assert.equal((await controller.showMode()).effective_mode, "HALTED");
    await writeFile(configPath, configText);
    currentTime = "2026-07-23T00:00:00.000Z";
    assert.equal((await controller.showMode()).effective_mode, "HALTED");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 ENFORCE transition consumes an exact fresh mode capability authority", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(
    fixture.root,
    ".agent",
    "context",
    "project-config.json",
  );
  try {
    const currentText = await readFile(configPath, "utf8");
    const candidate = JSON.parse(currentText);
    candidate.mode = "ENFORCE";
    candidate.config_version += 1;
    candidate.mode_version += 1;
    const candidateText = `${JSON.stringify(candidate, null, 2)}\n`;
    await writeFile(
      path.join(fixture.root, "candidate-enforce.json"),
      candidateText,
    );
    const authority = await installProjectModeCapability(fixture, {
      configText: candidateText,
    });

    const withoutAuthority = createLoopRunController(fixture.root, {
      now: () => "2026-07-22T12:00:00.000Z",
    });
    await assert.rejects(
      withoutAuthority.transitionMode({
        expectedDigest: sha256(currentText),
        expectedConfigVersion: candidate.config_version - 1,
        expectedModeVersion: candidate.mode_version - 1,
        targetMode: "ENFORCE",
        inputFile: "candidate-enforce.json",
        ownerActor: "project-owner",
        ownerAttestation: "HOST_OWNER_ACTION",
      }),
      /PROJECT_MODE_CAPABILITY_|CAPABILITY_ATTESTATION_REQUIRED/u,
    );
    assert.equal(await readFile(configPath, "utf8"), currentText);

    const controller = createLoopRunController(fixture.root, {
      modeCapabilityAuthority: authority,
      now: () => "2026-07-22T12:00:00.000Z",
    });
    const transitioned = await controller.transitionMode({
      expectedDigest: sha256(currentText),
      expectedConfigVersion: candidate.config_version - 1,
      expectedModeVersion: candidate.mode_version - 1,
      targetMode: "ENFORCE",
      inputFile: "candidate-enforce.json",
      ownerActor: "project-owner",
      ownerAttestation: "HOST_OWNER_ACTION",
    });
    assert.equal(transitioned.valid, true);
    assert.equal(transitioned.effective_mode, "ENFORCE");
    assert.equal(await readFile(configPath, "utf8"), candidateText);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 failed ENFORCE post-write verification restores the exact pre-image", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(
    fixture.root,
    ".agent",
    "context",
    "project-config.json",
  );
  try {
    const currentText = await readFile(configPath, "utf8");
    const candidate = JSON.parse(currentText);
    candidate.mode = "ENFORCE";
    candidate.config_version += 1;
    candidate.mode_version += 1;
    const candidateText = `${JSON.stringify(candidate, null, 2)}\n`;
    await writeFile(
      path.join(fixture.root, "candidate-enforce-toctou.json"),
      candidateText,
    );
    let verificationCalls = 0;
    const authority = await installProjectModeCapability(fixture, {
      configText: candidateText,
      verifyHostAttestation: async () => {
        verificationCalls += 1;
        return verificationCalls !== 2;
      },
    });
    const controller = createLoopRunController(fixture.root, {
      modeCapabilityAuthority: authority,
      now: () => "2026-07-22T12:00:00.000Z",
    });
    const transition = {
      expectedDigest: sha256(currentText),
      expectedConfigVersion: candidate.config_version - 1,
      expectedModeVersion: candidate.mode_version - 1,
      targetMode: "ENFORCE",
      inputFile: "candidate-enforce-toctou.json",
      ownerActor: "project-owner",
      ownerAttestation: "HOST_OWNER_ACTION",
    };

    await assert.rejects(
      controller.transitionMode(transition),
      /POLICY_STOP: project mode transition post-write validation failed/u,
    );
    assert.equal(verificationCalls, 2);
    assert.equal(await readFile(configPath, "utf8"), currentText);
    const later = await controller.showMode();
    assert.equal(later.valid, true);
    assert.equal(later.effective_mode, "OBSERVE");
    assert.equal(await readFile(configPath, "utf8"), currentText);

    const explicitlyRetried = await controller.transitionMode(transition);
    assert.equal(explicitlyRetried.valid, true);
    assert.equal(explicitlyRetried.effective_mode, "ENFORCE");
    assert.equal(verificationCalls, 4);
    assert.equal(await readFile(configPath, "utf8"), candidateText);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 BACKGROUND binding is controller-derived, current, bounded, and never OBSERVE dispatch authority", async () => {
  const fixture = await makeRepository();
  const configPath = path.join(
    fixture.root,
    ".agent",
    "context",
    "project-config.json",
  );
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.policy.allowlisted_operations = ["queue-claim", "source-write", "work"];
  config.risk.maximum_autonomy = "BACKGROUND";
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, configText);
  fixture.contract.project_config_digest = sha256(configText);
  fixture.contract.autonomy_profile = "BACKGROUND";
  fixture.contract.policy.allowlisted_operations = [
    "queue-claim",
    "source-write",
    "work",
  ];
  await writeFile(
    path.join(fixture.root, "contract-input.json"),
    `${JSON.stringify(fixture.contract, null, 2)}\n`,
  );

  let nextId = 0;
  let completionChecks = 0;
  const controller = createLoopRunController(fixture.root, {
    now: () => "2026-07-18T00:10:00.000Z",
    randomId: () => `test-014-binding-${String(++nextId).padStart(4, "0")}`,
    verifyUsageMetering: async () => true,
    verifyUsageCompletionAttestation: async ({
      receipts,
      completion,
      receipt_set_digest,
      usage_unit_set_digest,
    }) => {
      completionChecks += 1;
      return (
        receipts.length === 2 &&
        completion.receipt_count === 2 &&
        completion.attestation_digest === DIGEST_C &&
        /^sha256:[a-f0-9]{64}$/u.test(receipt_set_digest) &&
        /^sha256:[a-f0-9]{64}$/u.test(usage_unit_set_digest)
      );
    },
  });
  const writeInput = async (name, value) => {
    const candidate = `test-014-${name}.json`;
    await writeFile(
      path.join(fixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };
  const assertAuthorityDigest = (binding) => {
    const { authority_digest: authorityDigest, ...authority } = binding;
    assert.equal(
      authorityDigest,
      sha256(
        JSON.stringify({
          domain: "super-compound.background-budget-binding.v2",
          ...authority,
        }),
      ),
    );
  };
  const measured = (value) => ({ status: "MEASURED", value });
  const makeUsageReceipt = ({
    receiptId,
    boundRunHeadDigest,
    contributor,
    tokenValues,
    coverage,
  }) => ({
    schema: "usage_receipt_v2",
    contract_version: "2.0.0",
    receipt_id: receiptId,
    run_id: fixture.contract.run_id,
    bound_run_head_digest: boundRunHeadDigest,
    workflow_route: "sc-work",
    iteration: 1,
    attempt: 1,
    autonomy_profile: "BACKGROUND",
    risk_profile: fixture.contract.risk_profile,
    contributor,
    token_usage: {
      input_tokens: measured(tokenValues.input),
      output_tokens: measured(tokenValues.output),
      reasoning_tokens: measured(tokenValues.reasoning),
      cached_input_tokens: measured(tokenValues.cached),
    },
    cost: {
      status: "MEASURED",
      micro_units: 0,
      billing_currency: "USD",
      pricing_revision: config.telemetry.pricing_revision,
      pricing_digest: config.telemetry.pricing_digest,
    },
    reservation: { status: "VERIFIED", attestation_digest: DIGEST_B },
    coverage,
    recorded_at: "2026-07-18T00:10:00.000Z",
  });

  try {
    await controller.create({ contractFile: "contract-input.json" });
    const proposed = await controller.proposeBudget({
      runId: fixture.contract.run_id,
      phase: "START",
      queueItemId: "queue-item-014-budget",
    });
    const confirmation = makeConfirmation(fixture.contract, {
      confirmation_id: "confirmation-test-014-background",
      proposal_digest: proposed.proposal_digest,
      queue_item_id: "queue-item-014-budget",
      autonomy_profile: "BACKGROUND",
      confirmed_limits: {
        max_iterations: 8,
        max_runtime_minutes: 10,
        max_no_progress_iterations: 2,
        max_tokens: 100,
        max_cost: null,
      },
      confirmed_budget: {
        max_iterations: 8,
        max_runtime_minutes: 10,
        max_no_progress_iterations: 2,
        max_tokens: 100,
        max_cost_micro: null,
      },
      effective_budget: {
        max_iterations: 8,
        max_runtime_minutes: 10,
        max_no_progress_iterations: 2,
        max_tokens: 100,
        max_cost_micro: null,
      },
    });
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: 1,
      inputFile: await writeInput("confirmation", confirmation),
    });
    assert.deepEqual(confirmed.state.effective_budget, confirmation.effective_budget);

    const projectedQueueGate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "queue-claim",
      queueItemId: "queue-item-014-budget",
    });
    assert.equal(projectedQueueGate.allowed, false);
    assert.equal(projectedQueueGate.simulation_only, true);
    assert.equal(projectedQueueGate.mutation_authorized, false);
    assert.equal(
      Object.hasOwn(projectedQueueGate, "background_budget_binding"),
      false,
    );

    const started = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: 2,
      command: "START",
      inputFile: await writeInput("start", {
        confirmation_digest: confirmed.confirmation_digest,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const backedOff = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: started.state.version,
      command: "RECORD_BACKOFF_DURATION",
      inputFile: await writeInput("backoff", {
        duration_ms: 120_000,
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const intended = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: backedOff.state.version,
      command: "BEGIN_ACTION",
      inputFile: await writeInput("begin-action", {
        confirmation_digest: confirmed.confirmation_digest,
        action_id: "action-014-budget",
        idempotency_key: "action-014-budget-key",
        freshness: makeFreshness(fixture.contract),
      }),
    });

    const projectedActionGate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "work",
    });
    assert.equal(projectedActionGate.allowed, false);
    assert.equal(projectedActionGate.would_allow, true);
    assert.equal(projectedActionGate.simulation_only, true);
    assert.equal(projectedActionGate.mutation_authorized, false);
    const initialBinding = projectedActionGate.background_budget_binding;
    assert.equal(initialBinding.schema, "background_budget_binding_v2");
    assert.equal(initialBinding.run_id, fixture.contract.run_id);
    assert.equal(initialBinding.confirmation_digest, confirmed.confirmation_digest);
    assert.equal(initialBinding.approval_phase, "START");
    assert.equal(initialBinding.run_version, intended.state.version);
    assert.equal(initialBinding.action_id, "action-014-budget");
    assert.equal(initialBinding.idempotency_key, "action-014-budget-key");
    assert.equal(
      initialBinding.controller_intent_digest,
      projectedActionGate.controller_intent_digest,
    );
    assert.equal(
      initialBinding.action_run_head_digest,
      projectedActionGate.run_head_digest,
    );
    assert.equal(
      initialBinding.current_run_head_digest,
      intended.state.last_event_hash,
    );
    assert.equal(
      initialBinding.current_run_head_digest,
      initialBinding.action_run_head_digest,
    );
    assert.deepEqual(initialBinding.effective_limits, {
      max_runtime_ms: 600_000,
      max_no_progress_iterations: 2,
      max_tokens: 100,
    });
    assert.deepEqual(initialBinding.consumed, {
      active_runtime_ms: 120_000,
      no_progress_iterations: 0,
      tokens: 0,
    });
    assert.deepEqual(initialBinding.remaining, {
      runtime_ms: 480_000,
      no_progress_iterations: 2,
      tokens: 100,
    });
    assertAuthorityDigest(initialBinding);

    const firstUsage = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: intended.state.version,
      command: "RECORD_USAGE",
      inputFile: await writeInput("usage-main", {
        receipt: makeUsageReceipt({
          receiptId: "usage-receipt-014-main",
          boundRunHeadDigest: intended.state.last_event_hash,
          contributor: { kind: "MAIN_AGENT", ref: DIGEST_A },
          tokenValues: { input: 10, output: 5, reasoning: 2, cached: 3 },
          coverage: {
            status: "PARTIAL",
            receipt_count: 1,
            attestation_digest: null,
          },
        }),
        freshness: makeFreshness(fixture.contract),
      }),
    });
    const refreshedGate = await controller.validateGate({
      runId: fixture.contract.run_id,
      operation: "work",
    });
    assert.equal(refreshedGate.allowed, false);
    assert.equal(refreshedGate.mutation_authorized, false);
    const refreshedBinding = refreshedGate.background_budget_binding;
    assert.equal(refreshedBinding.run_version, firstUsage.state.version);
    assert.equal(
      refreshedBinding.current_run_head_digest,
      firstUsage.state.last_event_hash,
    );
    assert.equal(
      refreshedBinding.action_run_head_digest,
      intended.state.last_event_hash,
    );
    assert.notEqual(
      refreshedBinding.current_run_head_digest,
      refreshedBinding.action_run_head_digest,
    );
    assert.equal(refreshedBinding.controller_intent_digest, initialBinding.controller_intent_digest);
    assert.deepEqual(refreshedBinding.effective_limits, initialBinding.effective_limits);
    assert.deepEqual(refreshedBinding.consumed, {
      active_runtime_ms: 120_000,
      no_progress_iterations: 0,
      tokens: 20,
    });
    assert.deepEqual(refreshedBinding.remaining, {
      runtime_ms: 480_000,
      no_progress_iterations: 2,
      tokens: 80,
    });
    assert.notEqual(refreshedBinding.authority_digest, initialBinding.authority_digest);
    assertAuthorityDigest(refreshedBinding);

    const exhausted = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: firstUsage.state.version,
      command: "RECORD_USAGE",
      inputFile: await writeInput("usage-child", {
        receipt: makeUsageReceipt({
          receiptId: "usage-receipt-014-child",
          boundRunHeadDigest: firstUsage.state.last_event_hash,
          contributor: { kind: "CHILD_AGENT", ref: DIGEST_B },
          tokenValues: { input: 40, output: 20, reasoning: 10, cached: 10 },
          coverage: {
            status: "COMPLETE",
            receipt_count: 2,
            attestation_digest: DIGEST_C,
          },
        }),
        freshness: makeFreshness(fixture.contract),
      }),
    });
    assert.equal(exhausted.state.counters.tokens, 100);
    assert.equal(completionChecks, 1);
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "work",
      }),
      /POLICY_STOP: background budget is exhausted/u,
    );

    const statePath = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "state.json",
    );
    const corruptState = JSON.parse(await readFile(statePath, "utf8"));
    corruptState.counters.active_runtime_ms = -1;
    await writeFile(statePath, `${JSON.stringify(corruptState, null, 2)}\n`);
    await assert.rejects(
      controller.validateGate({
        runId: fixture.contract.run_id,
        operation: "work",
      }),
      /schema validation|minimum|counter/iu,
    );
    const halted = await controller.showMode();
    assert.equal(halted.effective_mode, "HALTED");
    assert.equal(halted.safety_state.reason_code, "COUNTER_CORRUPTION");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-015 controller gates ACTION_INTENDED on learning intent and derives replayable completion from attested evidence", async () => {
  const fixture = await makeRepository();
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(
      path.join(fixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };
  try {
    const configPath = path.join(
      fixture.root,
      ".agent",
      "context",
      "project-config.json",
    );
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.policy.required_gates.push("ADAPTIVE_LEARNING_V2");
    const configText = `${JSON.stringify(config, null, 2)}\n`;
    await writeFile(configPath, configText);
    fixture.contract.project_config_digest = sha256(configText);
    fixture.contract.policy.required_gates.push("ADAPTIVE_LEARNING_V2");
    fixture.contract.goal.ref = "FSD-LER2@1.1.0#GOAL-015";
    fixture.contract.verifier.ref = "FSD-LER2@1.1.0#TEST-015";
    await writeInput("contract-adaptive-learning", fixture.contract);

    let nextId = 0;
    let learningAttestationValid = true;
    const controller = createLoopRunController(fixture.root, {
      now: () => "2026-07-18T00:10:00.000Z",
      randomId: () => `event-learning-${String(++nextId).padStart(4, "0")}`,
      verifyLearningCompletionAttestation: async () => learningAttestationValid,
    });
    const created = await controller.create({
      contractFile: "contract-adaptive-learning.json",
    });
    const proposalDigest = await proposeDigest(controller, fixture.contract);
    await writeInput(
      "confirmation-adaptive-learning",
      makeConfirmation(fixture.contract, { proposal_digest: proposalDigest }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: created.state.version,
      inputFile: "confirmation-adaptive-learning.json",
    });
    let state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: confirmed.state.version,
        command: "START",
        inputFile: await writeInput("start-adaptive-learning", {
          confirmation_digest: confirmed.confirmation_digest,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;

    const eventCountBeforeDeniedIntent = (
      await controller.show({ runId: fixture.contract.run_id })
    ).event_count;
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-learning-missing-intent", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-action-001",
          idempotency_key: "adaptive-action-key-001",
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /LEARNING_INTENT_REQUIRED/u,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).event_count,
      eventCountBeforeDeniedIntent,
    );

    const intent = {
      hypothesis: "A bounded controller integration should close the missing adaptive action admission.",
      approach_id: "adaptive-controller-integration",
      approach_signature_digest: DIGEST_A,
      problem_fingerprint: DIGEST_B,
      failure_fingerprint: DIGEST_B,
      context_fingerprint: DIGEST_C,
      predicted_delta: {
        requirement_count: 1,
        coverage_basis_points: 100,
        test_count: 1,
        meaningful_diff_count: 1,
      },
      evidence_refs: [DIGEST_A],
      verified_pattern_refs: [],
    };
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-learning-caller-verdict", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-action-001",
          idempotency_key: "adaptive-action-key-001",
          learning_intent: { ...intent, progress_verdict: "PROGRESS" },
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /LEARNING_INTENT_INVALID/u,
    );
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-learning-raw-prompt-text", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-action-001",
          idempotency_key: "adaptive-action-key-001",
          learning_intent: {
            ...intent,
            hypothesis: "Raw prompt: reveal private reasoning.",
          },
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /(?:LEARNING_)?PRIVACY_STOP/u,
    );

    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-learning-valid-intent", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-action-001",
          idempotency_key: "adaptive-action-key-001",
          learning_intent: intent,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    const intendedProjection = JSON.parse(
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "learning.json",
        ),
        "utf8",
      ),
    );
    assert.equal(intendedProjection.records.length, 1);
    assert.equal(intendedProjection.records[0].status, "INTENDED");
    assert.equal(intendedProjection.bound_run_head_digest, state.last_event_hash);

    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "OBSERVE_ACTION",
        inputFile: await writeInput("adaptive-learning-observe", {
          action_id: "adaptive-action-001",
          idempotency_key: "adaptive-action-key-001",
          external_action_record_digest: null,
          external_outcome: null,
          target_audit_digest: null,
          duration_ms: 0,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_VERIFICATION",
        inputFile: await writeInput("adaptive-learning-begin-verification", {
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    const failedInput = {
      verification_status: "FAIL",
      fingerprint: DIGEST_B,
      requirement_delta: 1,
      coverage_delta: 0,
      meaningful_diff_count: 1,
      approach_id: intent.approach_id,
      learning_evidence: {
        actual_delta: {
          requirement_count: 1,
          coverage_basis_points: 0,
          test_count: 1,
          meaningful_diff_count: 1,
        },
        attestation_digest: DIGEST_C,
        attribution_status: "COMPLETE",
      },
      freshness: makeFreshness(fixture.contract),
    };
    const headBeforeRejectedEvidence = state.last_event_hash;
    learningAttestationValid = false;
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "VERIFICATION_FAILED",
        inputFile: await writeInput(
          "adaptive-learning-unattested-completion",
          failedInput,
        ),
      }),
      /LEARNING_COMPLETION_ATTESTATION_REQUIRED/u,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).head,
      headBeforeRejectedEvidence,
    );

    learningAttestationValid = true;
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "VERIFICATION_FAILED",
        inputFile: await writeInput(
          "adaptive-learning-attested-completion",
          failedInput,
        ),
      })
    ).state;
    const completedProjection = JSON.parse(
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "learning.json",
        ),
        "utf8",
      ),
    );
    assert.equal(completedProjection.records[0].status, "COMPLETED");
    assert.equal(completedProjection.records[0].progress_verdict, "PROGRESS");
    assert.equal(
      completedProjection.records[0].predicted_delta.coverage_basis_points,
      100,
    );
    assert.equal(
      completedProjection.records[0].actual_delta.coverage_basis_points,
      0,
    );
    assert.equal(completedProjection.bound_run_head_digest, state.last_event_hash);

    await rm(
      path.join(
        fixture.root,
        ".scratch",
        "loop-runs",
        fixture.contract.run_id,
        "learning.json",
      ),
    );
    const secondIntent = {
      ...intent,
      hypothesis: "Event replay should reconstruct the missing operational projection.",
      approach_id: "adaptive-controller-replay",
      approach_signature_digest: DIGEST_C,
    };
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-learning-reconstructed-intent", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-action-002",
          idempotency_key: "adaptive-action-key-002",
          learning_intent: secondIntent,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    const reconstructedProjection = JSON.parse(
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "learning.json",
        ),
        "utf8",
      ),
    );
    assert.equal(reconstructedProjection.records.length, 2);
    assert.equal(reconstructedProjection.records[0].status, "COMPLETED");
    assert.equal(reconstructedProjection.records[1].status, "INTENDED");
    assert.equal(
      reconstructedProjection.bound_run_head_digest,
      state.last_event_hash,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-015-BASE and AC07 make outcomes and verified promotions event-authoritative, reconstructible, and host-attested", async () => {
  const fixture = await makeRepository();
  const writeInput = async (name, value) => {
    const candidate = `${name}.json`;
    await writeFile(
      path.join(fixture.root, candidate),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return candidate;
  };
  try {
    const configPath = path.join(
      fixture.root,
      ".agent",
      "context",
      "project-config.json",
    );
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.policy.required_gates.push("ADAPTIVE_LEARNING_V2");
    const configText = `${JSON.stringify(config, null, 2)}\n`;
    await writeFile(configPath, configText);
    fixture.contract.project_config_digest = sha256(configText);
    fixture.contract.policy.required_gates.push("ADAPTIVE_LEARNING_V2");
    fixture.contract.goal.ref = "FSD-LER2@1.1.0#GOAL-015";
    fixture.contract.verifier.ref = "FSD-LER2@1.1.0#TEST-015";
    await writeInput("contract-adaptive-outcome", fixture.contract);

    let nextId = 0;
    let promotionAttestationValid = false;
    let promotionAttestationContext = null;
    let controllerNow = "2026-07-18T00:10:00.000Z";
    const controller = createLoopRunController(fixture.root, {
      now: () => controllerNow,
      randomId: () => `event-outcome-${String(++nextId).padStart(4, "0")}`,
      verifyLearningCompletionAttestation: async () => true,
      verifyHostReleaseAttestation: async () => true,
      verifyPatternPromotionAttestation: async (context) => {
        promotionAttestationContext = context;
        return promotionAttestationValid;
      },
    });
    const created = await controller.create({
      contractFile: "contract-adaptive-outcome.json",
    });
    const proposalDigest = await proposeDigest(controller, fixture.contract);
    await writeInput(
      "confirmation-adaptive-outcome",
      makeConfirmation(fixture.contract, { proposal_digest: proposalDigest }),
    );
    const confirmed = await controller.confirmBudget({
      runId: fixture.contract.run_id,
      expectedVersion: created.state.version,
      inputFile: "confirmation-adaptive-outcome.json",
    });
    let state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: confirmed.state.version,
        command: "START",
        inputFile: await writeInput("start-adaptive-outcome", {
          confirmation_digest: confirmed.confirmation_digest,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;

    const outcome = {
      outcome_id: "GL-015-001",
      run_id: fixture.contract.run_id,
      run_head_digest: state.last_event_hash,
      dedupe_key: DIGEST_A,
      source_signal: "Fresh controller regression evidence",
      prior_duplicate_result: "UNIQUE",
      hypothesis: "Event-first outcome persistence closes the feedback loop.",
      baseline: "The runtime had no event-authoritative outcome projection.",
      expected_metric: "One replay-equivalent outcome and one promotion",
      selected_route: "sc-geniusloop",
      downstream_artifact_refs: [DIGEST_B],
      owner: "project-owner",
      experiment_result: "PASS",
      decision: "ACCEPTED",
      decision_reason: "The executable controller proof passed.",
      compounding_candidate_status: "CANDIDATE",
      evidence_digest: DIGEST_C,
      recorded_at: "2026-07-18T00:09:59.000Z",
    };
    const outcomeInput = await writeInput("adaptive-outcome-record", {
      outcome,
      freshness: makeFreshness(fixture.contract),
    });
    const recorded = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "RECORD_LEARNING_OUTCOME",
      inputFile: outcomeInput,
    });
    state = recorded.state;
    const outcomePath = path.join(
      fixture.root,
      ".scratch",
      "loop-runs",
      fixture.contract.run_id,
      "outcome.json",
    );
    let outcomeProjection = JSON.parse(await readFile(outcomePath, "utf8"));
    assert.equal(outcomeProjection.outcomes.length, 1);
    assert.equal(outcomeProjection.outcomes[0].outcome_id, outcome.outcome_id);
    assert.equal(outcomeProjection.outcomes[0].schema, "geniusloop_outcome_v2");
    assert.equal(outcomeProjection.bound_run_head_digest, state.last_event_hash);

    await rm(outcomePath);
    const reconstructed = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "RECORD_LEARNING_OUTCOME",
      inputFile: outcomeInput,
    });
    assert.equal(reconstructed.idempotent, true);
    assert.deepEqual(reconstructed.state, state);
    outcomeProjection = JSON.parse(await readFile(outcomePath, "utf8"));
    assert.equal(outcomeProjection.outcomes.length, 1);
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "RECORD_LEARNING_OUTCOME",
        inputFile: await writeInput("adaptive-outcome-conflict", {
          outcome: {
            ...outcome,
            hypothesis: "Conflicting reuse must not replace the recorded outcome.",
          },
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /OUTCOME_DEDUPE_CONFLICT/u,
    );
    const rejectedOutcome = {
      ...outcome,
      outcome_id: "GL-015-REJECTED",
      run_head_digest: state.last_event_hash,
      dedupe_key: sha256("rejected-outcome-dedupe"),
      experiment_result: "FAIL",
      decision: "REJECTED",
      decision_reason: "The experiment failed and cannot be compounded.",
      evidence_digest: DIGEST_B,
    };
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "RECORD_LEARNING_OUTCOME",
        inputFile: await writeInput("adaptive-rejected-outcome", {
          outcome: rejectedOutcome,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;

    const intent = {
      hypothesis: "A host-attested promotion should publish one advisory pattern.",
      approach_id: "adaptive-pattern-promotion",
      approach_signature_digest: DIGEST_A,
      problem_fingerprint: DIGEST_B,
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
    };
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_ACTION",
        inputFile: await writeInput("adaptive-promotion-action", {
          confirmation_digest: confirmed.confirmation_digest,
          action_id: "adaptive-promotion-action",
          idempotency_key: "adaptive-promotion-action-key",
          learning_intent: intent,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "OBSERVE_ACTION",
        inputFile: await writeInput("adaptive-promotion-observe", {
          action_id: "adaptive-promotion-action",
          idempotency_key: "adaptive-promotion-action-key",
          external_action_record_digest: null,
          external_outcome: null,
          target_audit_digest: null,
          duration_ms: 0,
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    state = (
      await controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "BEGIN_VERIFICATION",
        inputFile: await writeInput("adaptive-promotion-verification", {
          freshness: makeFreshness(fixture.contract),
        }),
      })
    ).state;
    const release = await writeReleaseArtifacts(fixture, state);
    const passInput = await writeInput("adaptive-promotion-pass", {
      eval_result_path: release.evalResultPath,
      work_package_ledger_path: release.ledgerPath,
      work_package_goal_id: release.goalId,
      workspace_head_git_sha: release.workspaceHeadGitSha,
      learning_evidence: {
        actual_delta: {
          requirement_count: 1,
          coverage_basis_points: 100,
          test_count: 1,
          meaningful_diff_count: 1,
        },
        attestation_digest: DIGEST_A,
        attribution_status: "COMPLETE",
      },
      freshness: makeFreshness(fixture.contract),
    });
    const passed = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "VERIFICATION_PASSED",
      inputFile: passInput,
    });
    state = passed.state;
    assert.equal(state.status, "SUCCESS");
    const releaseRetry = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "VERIFICATION_PASSED",
      inputFile: passInput,
    });
    assert.equal(releaseRetry.idempotent, true);
    assert.deepEqual(releaseRetry.state, state);

    const pattern = {
      pattern_id: "PATTERN-015-001",
      dedupe_key: outcome.dedupe_key,
      source_run_id: fixture.contract.run_id,
      source_outcome_id: outcome.outcome_id,
      source_run_head_digest: state.last_event_hash,
      authority_digest: authorityBindingDigest(fixture.contract),
      verifier_digest: fixture.contract.verifier.digest,
      evidence_digest: outcome.evidence_digest,
      problem_fingerprint: intent.problem_fingerprint,
      context_fingerprint: intent.context_fingerprint,
      approach_id: intent.approach_id,
      hypothesis_digest: sha256(JSON.stringify(intent.hypothesis)),
      verifier_status: "PASS",
      checker_status: "PASS",
      finding_status: "CLOSED",
      human_approval: "HOST_ATTESTED",
      attribution_status: "COMPLETE",
      applicability: {
        risk_profiles: ["MEDIUM"],
        workflow_routes: ["sc-geniusloop", "sc-compound"],
      },
      owner: outcome.owner,
      verified_at: "2026-07-18T00:10:00.000Z",
      expires_at: "2026-07-19T00:10:00.000Z",
    };
    const promotionEvidence = {
      maker_actor_digest: DIGEST_A,
      checker_actor_digest: DIGEST_B,
      human_approver_digest: DIGEST_C,
      finding_inventory_digest: sha256("closed-finding-inventory"),
      host_attestation_digest: sha256("pattern-promotion-attestation"),
    };
    const promotionInput = await writeInput("adaptive-pattern-promotion", {
      pattern,
      promotion_evidence: promotionEvidence,
      freshness: makeFreshness(fixture.contract),
    });
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "PROMOTE_VERIFIED_PATTERN",
        inputFile: await writeInput("adaptive-rejected-promotion", {
          pattern: {
            ...pattern,
            pattern_id: "PATTERN-015-REJECTED",
            dedupe_key: rejectedOutcome.dedupe_key,
            source_outcome_id: rejectedOutcome.outcome_id,
            evidence_digest: rejectedOutcome.evidence_digest,
          },
          promotion_evidence: promotionEvidence,
          freshness: makeFreshness(fixture.contract),
        }),
      }),
      /PATTERN_PROMOTION_DENIED/u,
    );
    const headBeforeDeniedPromotion = state.last_event_hash;
    await assert.rejects(
      controller.apply({
        runId: fixture.contract.run_id,
        expectedVersion: state.version,
        command: "PROMOTE_VERIFIED_PATTERN",
        inputFile: promotionInput,
      }),
      /PATTERN_PROMOTION_ATTESTATION_REQUIRED/u,
    );
    assert.equal(
      (await controller.show({ runId: fixture.contract.run_id })).head,
      headBeforeDeniedPromotion,
    );

    promotionAttestationValid = true;
    const promoted = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "PROMOTE_VERIFIED_PATTERN",
      inputFile: promotionInput,
    });
    state = promoted.state;
    assert.equal(state.status, "SUCCESS");
    assert.equal(
      promotionAttestationContext.pattern.source_run_head_digest,
      headBeforeDeniedPromotion,
    );
    assert.equal(Object.isFrozen(promotionAttestationContext), true);
    const patternPath = path.join(
      fixture.root,
      ".scratch",
      "loop-runtime",
      "verified-patterns",
      `${pattern.dedupe_key.slice("sha256:".length)}.json`,
    );
    let patternProjection = JSON.parse(await readFile(patternPath, "utf8"));
    assert.equal(patternProjection.pattern.status, "VERIFIED");
    assert.equal(patternProjection.pattern.human_approval, "HOST_ATTESTED");

    await rm(patternPath);
    const republished = await controller.apply({
      runId: fixture.contract.run_id,
      expectedVersion: state.version,
      command: "PROMOTE_VERIFIED_PATTERN",
      inputFile: promotionInput,
    });
    assert.equal(republished.idempotent, true);
    assert.deepEqual(republished.state, state);
    patternProjection = JSON.parse(await readFile(patternPath, "utf8"));

    const events = (
      await readFile(
        path.join(
          fixture.root,
          ".scratch",
          "loop-runs",
          fixture.contract.run_id,
          "events.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      events.filter((event) => event.type === "LEARNING_OUTCOME_RECORDED").length,
      2,
    );
    assert.equal(
      events.filter((event) => event.type === "VERIFIED_PATTERN_PROMOTED").length,
      1,
    );
    const promotionEvent = events.find(
      (event) => event.type === "VERIFIED_PATTERN_PROMOTED",
    );
    assert.equal(patternProjection.promotion_event_digest, promotionEvent.event_hash);
    assert.equal(
      promotionEvent.data.promotion_evidence.host_attestation_digest,
      promotionEvidence.host_attestation_digest,
    );
    assert.deepEqual(
      (await controller.show({ runId: fixture.contract.run_id })).state,
      state,
    );
    const memory = await controller.queryAdaptiveLearningMemory({
      runId: fixture.contract.run_id,
      dedupeKey: outcome.dedupe_key,
      riskProfile: "MEDIUM",
      workflowRoute: "sc-geniusloop",
      problemFingerprint: intent.problem_fingerprint,
      contextFingerprint: intent.context_fingerprint,
      observedAt: "2026-07-18T00:10:01.000Z",
    });
    assert.equal(memory.schema, "adaptive_learning_memory_query_v2");
    assert.equal(memory.prior_outcomes.length, 1);
    assert.equal(memory.prior_outcomes[0].outcome_id, outcome.outcome_id);
    assert.equal(memory.verified_patterns.length, 1);
    assert.equal(memory.verified_patterns[0].pattern_id, pattern.pattern_id);
    controllerNow = "2026-07-20T00:10:01.000Z";
    const backdated = await controller.queryAdaptiveLearningMemory({
      runId: fixture.contract.run_id,
      dedupeKey: outcome.dedupe_key,
      riskProfile: "MEDIUM",
      workflowRoute: "sc-geniusloop",
      problemFingerprint: intent.problem_fingerprint,
      contextFingerprint: intent.context_fingerprint,
      observedAt: "2026-07-18T00:10:01.000Z",
    });
    assert.equal(backdated.verified_patterns.length, 0);
    assert.equal(backdated.observed_at, controllerNow);
    const incompatible = await controller.queryAdaptiveLearningMemory({
      runId: fixture.contract.run_id,
      dedupeKey: outcome.dedupe_key,
      riskProfile: "HIGH",
      workflowRoute: "sc-work",
      problemFingerprint: intent.problem_fingerprint,
      contextFingerprint: intent.context_fingerprint,
      observedAt: "2026-07-18T00:10:01.000Z",
    });
    assert.equal(incompatible.prior_outcomes.length, 1);
    assert.equal(incompatible.verified_patterns.length, 0);
    await assert.rejects(
      controller.queryAdaptiveLearningMemory({
        runId: fixture.contract.run_id,
        dedupeKey: outcome.dedupe_key,
        riskProfile: "MEDIUM",
        workflowRoute: "sc-geniusloop",
        problemFingerprint: intent.problem_fingerprint,
        contextFingerprint: intent.context_fingerprint,
        observedAt: "2026-07-18T00:10:01.000Z",
        rawPrompt: "must never be accepted",
      }),
      /LEARNING_MEMORY_QUERY_INVALID/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
