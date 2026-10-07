import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createBackgroundExecutionStore,
  createDurableBackgroundDispatchValidator,
} from "./background-execution.mjs";
import { BACKGROUND_REQUIRED_CAPABILITIES } from "./background-execution-model.mjs";
import {
  computeBackgroundAggregateEpochDigest,
  computeBackgroundRunAggregatePolicyDigest,
  computeEffectiveBackgroundLimitsDigest,
  createCanonicalBackgroundPolicyAuthority,
} from "./background-policy.mjs";
import { createLoopQueue } from "./loop-queue.mjs";
import { createLoopRunController } from "./loop-run.mjs";
import {
  createWorkflowCapabilityValidator,
} from "./action-adapter.mjs";
import { SUPPORTED_HOST_CAPABILITIES } from "./action-capability-model.mjs";
import {
  computeProjectModeCapabilityRootDigest,
  createProjectModeCapabilityAuthority,
  loadCanonicalProjectConfig,
} from "./project-config.mjs";
import { validateWorkflowAdmission } from "./workflow-admission.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const BASE_GIT_SHA = "4444444444444444444444444444444444444444";
const START_TIME = "2026-07-22T05:10:00.000Z";
const CONFIG_EXPIRY = "9999-12-31T23:59:59.999999999Z";
const CREDENTIAL_SCOPES = Object.freeze({
  read: ["repo.worktree.read"],
  write: ["repo.worktree.write"],
});

function sha256(value) {
  const bytes = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function createClock(initial = START_TIME) {
  let current = Date.parse(initial);
  if (!Number.isFinite(current)) throw new TypeError("PILOT_CLOCK_INVALID");
  return Object.freeze({
    now: () => new Date(current).toISOString(),
    set(value) {
      const next = Date.parse(value);
      if (!Number.isFinite(next) || next < current) {
        throw new TypeError("PILOT_CLOCK_REGRESSION");
      }
      current = next;
      return this.now();
    },
    advance(milliseconds) {
      if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
        throw new TypeError("PILOT_CLOCK_ADVANCE_INVALID");
      }
      current += milliseconds;
      return this.now();
    },
  });
}

function createIdSource(prefix) {
  let sequence = 0;
  return () => `${prefix}.${String(++sequence).padStart(4, "0")}`;
}

async function assertQueueUnlocked(context, label) {
  const ownerPath = path.join(
    context.root,
    ".scratch",
    "loop-queue",
    ".queue.lock",
    "owner",
  );
  try {
    const owner = await readFile(ownerPath, "utf8");
    assert.fail(`${label}: queue lock leaked by owner ${owner}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function projectConfig(overrides = {}) {
  const maxTokens = overrides.maxTokens ?? null;
  return {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: overrides.mode ?? "ENFORCE",
    policy: {
      max_iterations: 20,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: maxTokens,
      max_cost_micro: null,
      approval_ttl_minutes: 60,
      allowlisted_operations: ["queue-claim", "source-write", "work"],
      credential_scopes: [...CREDENTIAL_SCOPES.read, ...CREDENTIAL_SCOPES.write],
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
      risk: "HIGH",
      isolation: "HARDENED",
      expires_at: CONFIG_EXPIRY,
    },
    background_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: maxTokens === null ? null : maxTokens * 2,
      max_reserved_runtime_ms: 21_600_000,
      max_remote_calls: 0,
      max_reviewers: 2,
      ...(overrides.aggregatePolicy ?? {}),
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
      pricing_digest: sha256("pilot-pricing-revision"),
    },
    risk: {
      default_profile: "HIGH",
      maximum_autonomy: "BACKGROUND",
      external_write_policy: "DENY",
    },
    write_classification: {
      runtime_audit_prefixes: [".scratch/loop-runs/"],
      authority_prefixes: ["docs/fsd/"],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [...BACKGROUND_REQUIRED_CAPABILITIES],
      external_write: ["DURABLE_INTENT"],
    },
    artifact_authority: {
      required_contract_version: "2.0.0",
      execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
      legacy_action: "REPLAN_REQUIRED",
    },
  };
}

function sourceWriteOperation(expiresAt) {
  return {
    operation_id: "source-write",
    target_ref: "target.local.pilot-worktree",
    write_class: "implementation_write",
    credential_scopes: structuredClone(CREDENTIAL_SCOPES),
    egress_ids: [],
    idempotency: { required: true, key_scope: "RUN_OPERATION" },
    authoritative_readback: {
      required: true,
      strategy_ref: "strategy.local.pilot-readback",
    },
    compensation: {
      required: true,
      strategy_ref: "strategy.local.pilot-restore",
    },
    timeout_ms: 30_000,
    expires_at: expiresAt,
    audit_sink_ref: "audit.local.loop-runtime",
    owner_ref: "owner.project",
    risk: "HIGH",
    human_gate: "REQUIRED",
    required_capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    required_isolation: "HARDENED",
  };
}

async function writeAuthority(root, configDigest, clock, aggregatePolicy) {
  const inventory = {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.goal014.integrated-pilots",
    project_config_digest: configDigest,
    background_aggregate_policy: structuredClone(aggregatePolicy),
    issued_at: clock.now(),
    expires_at: CONFIG_EXPIRY,
    operations: [sourceWriteOperation(CONFIG_EXPIRY)],
  };
  const inventoryText = `${JSON.stringify(inventory, null, 2)}\n`;
  const definitions = [
    ["GOAL", ".scratch/issues/14-background-isolation.md", "goal 014 pilot authority\n"],
    ["BRD", "docs/brd/brd-loop-runtime-v2.md", "brd pilot authority\n"],
    ["PRD", "docs/prd/prd-loop-runtime-v2.md", "prd pilot authority\n"],
    ["FSD", "docs/fsd/fsd-loop-runtime-v2.md", "fsd pilot authority\n"],
    ["ADR", "docs/solutions/adr-0001-loop-run-controller-v2.md", "adr pilot authority\n"],
    ["VERIFIER", ".agent/verifiers/test-014.md", "test 014 verifier\n"],
    ["EVAL", ".agent/evals/loop-runtime-v2.md", "loop runtime pilot eval\n"],
    ["OPERATION_INVENTORY", ".agent/context/operation-inventory.json", inventoryText],
  ];
  const sources = [];
  for (const [role, sourcePath, content] of definitions) {
    const absolute = path.join(root, ...sourcePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    sources.push({ role, source_path: sourcePath, content_digest: sha256(content) });
  }
  return { inventory, inventoryDigest: sha256(inventoryText), sources };
}

function digestFor(sources, role) {
  return sources.find((source) => source.role === role).content_digest;
}

function makeContract({
  runId,
  configDigest,
  sources,
  clock,
  maxTokens = null,
  aggregatePolicy,
  lineage = null,
  policyOverrides = {},
}) {
  return {
    schema: "loop_run_contract_v2",
    contract_version: "2.0.0",
    run_id: runId,
    goal: {
      ref: "FSD-LER2@1.0.0#GOAL-014",
      digest: digestFor(sources, "GOAL"),
      summary: "Execute one deterministic integrated background pilot.",
      acceptance_criteria: ["TEST-014 integrated pilot reaches its durable expected state."],
    },
    authority: {
      brd_digest: digestFor(sources, "BRD"),
      prd_digest: digestFor(sources, "PRD"),
      fsd_digest: digestFor(sources, "FSD"),
      adr_digests: sources
        .filter((source) => source.role === "ADR")
        .map((source) => source.content_digest),
      operation_inventory_digest: digestFor(sources, "OPERATION_INVENTORY"),
      sources: structuredClone(sources),
      base_git_sha: BASE_GIT_SHA,
    },
    verifier: {
      ref: "FSD-LER2@1.0.0#TEST-014",
      digest: digestFor(sources, "VERIFIER"),
      eval_definition_digest: digestFor(sources, "EVAL"),
      regression_verifier_digest: null,
      eval_class: "CAPABILITY",
      success_threshold: {
        metric: "PASS_AT_K",
        k: 3,
        minimum_basis_points: 9000,
      },
    },
    policy: {
      max_iterations: 20,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: maxTokens,
      max_cost_micro: null,
      approval_ttl_minutes: 60,
      allowlisted_operations: ["queue-claim", "source-write", "work"],
      credential_scopes: [...CREDENTIAL_SCOPES.read, ...CREDENTIAL_SCOPES.write],
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
      risk: "HIGH",
      isolation: "HARDENED",
      expires_at: CONFIG_EXPIRY,
      background_aggregate_policy: structuredClone(aggregatePolicy),
      ...structuredClone(policyOverrides),
    },
    lineage: lineage ?? { parent_run_id: null, root_run_id: runId },
    autonomy_profile: "BACKGROUND",
    risk_profile: "HIGH",
    project_config_digest: configDigest,
    created_at: clock.now(),
  };
}

function authorityDigest(contract) {
  return sha256(JSON.stringify({
    goal: contract.goal,
    authority: contract.authority,
    verifier: contract.verifier,
    project_config_digest: contract.project_config_digest,
  }));
}

function policyDigest(contract) {
  return sha256(JSON.stringify(contract.policy));
}

function freshness(contract) {
  return {
    authority_digest: authorityDigest(contract),
    project_config_digest: contract.project_config_digest,
    verifier_digest: contract.verifier.digest,
    eval_definition_digest: contract.verifier.eval_definition_digest,
  };
}

async function writeJson(root, name, value) {
  const file = `.scratch/pilot-inputs/${name}.json`;
  const absolute = path.join(root, ...file.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function confirmationFromProposal(proposal, proposalDigest, clock) {
  return {
    schema: "budget_confirmation_v2",
    contract_version: "2.0.0",
    confirmation_id: `${proposal.proposal_id}.human`,
    proposal_digest: proposalDigest,
    run_id: proposal.run_id,
    phase: proposal.phase,
    queue_item_id: proposal.queue_item_id,
    expected_run_version: proposal.expected_run_version,
    goal_ref: proposal.goal_ref,
    goal_digest: proposal.goal_digest,
    authority_digest: proposal.authority_digest,
    project_config_digest: proposal.project_config_digest,
    verifier_ref: proposal.verifier_ref,
    verifier_digest: proposal.verifier_digest,
    regression_verifier_digest: proposal.regression_verifier_digest,
    eval_definition_digest: proposal.eval_definition_digest,
    policy_digest: proposal.policy_digest,
    billing_currency: proposal.billing_currency,
    confirmed_limits: structuredClone(proposal.recommended_limits),
    confirmed_budget: structuredClone(proposal.recommended),
    effective_budget: structuredClone(proposal.effective_preview),
    autonomy_profile: proposal.autonomy_profile,
    risk_profile: proposal.risk_profile,
    approver: {
      actor_id: "host-human.goal014.pilot",
      actor_type: "HUMAN",
      attestation: "HOST_ATTESTED_HUMAN",
    },
    confirmed_at: clock.now(),
    expires_at: proposal.approval_expires_at,
  };
}

function queuePreparation(context, proposal) {
  const contract = context.contract;
  const availableAt = context.clock.now();
  return {
    queue_item_id: context.queueItemId,
    run_binding: {
      run_id: contract.run_id,
      phase: proposal.phase,
      expected_run_version: proposal.expected_run_version,
      goal_digest: contract.goal.digest,
      authority_digest: proposal.authority_digest,
      verifier_digest: contract.verifier.digest,
      eval_definition_digest: contract.verifier.eval_definition_digest,
      project_config_digest: contract.project_config_digest,
      policy_digest: proposal.policy_digest,
      operation_inventory_digest: contract.authority.operation_inventory_digest,
      risk_profile: contract.risk_profile,
      autonomy_profile: contract.autonomy_profile,
      required_gates: [...contract.policy.required_gates],
    },
    provenance: {
      trigger_id: `${context.queueItemId}.trigger`,
      actor_ref: "actor.project.owner",
      source_ref: "source.local.oneshot",
    },
    dedupe_identity_digest: sha256(`${context.queueItemId}:dedupe`),
    payload_digest: sha256(`${context.queueItemId}:payload`),
    prepared_at: availableAt,
    available_at: availableAt,
    expires_at: new Date(Date.parse(availableAt) + 90 * 60_000).toISOString(),
    missed_run_policy: "CANCEL",
    lease_policy: { duration_ms: 600_000, heartbeat_interval_ms: 60_000 },
    retry_policy: { max_attempts: 2, backoff_ms: 5_000 },
    concurrency: { key: `${contract.run_id}.concurrency`, limit: 1 },
    rate_limit: { key: `${contract.run_id}.rate`, max_claims: 2, window_ms: 600_000 },
    result_sink_ref: "sink.local.audit",
    policy_ref: "policy.loop-runtime-v2",
  };
}

function createCountedHost() {
  const calls = [];
  const seen = new Set();
  return Object.freeze({
    calls,
    async dispatch(armResult, { fault = null } = {}) {
      if (armResult?.handoff_granted !== true) {
        throw new TypeError("HOST_HANDOFF_NOT_GRANTED");
      }
      const key = armResult.record.action_binding?.idempotency_key;
      if (typeof key !== "string" || seen.has(key)) {
        throw new TypeError("HOST_DUPLICATE_DISPATCH");
      }
      seen.add(key);
      calls.push(Object.freeze({
        dispatch_id: armResult.record.dispatch_id,
        idempotency_key: key,
      }));
      if (fault === "after-host-call-before-observation") {
        throw new Error("INJECTED_AFTER_HOST_CALL_BEFORE_OBSERVATION");
      }
      return { receipt_digest: sha256(`${armResult.record.dispatch_id}:receipt`) };
    },
  });
}

function hostCapabilities(maxTokens) {
  const values = new Set([
    ...SUPPORTED_HOST_CAPABILITIES,
    ...BACKGROUND_REQUIRED_CAPABILITIES,
  ]);
  if (maxTokens !== null) values.add("TOKEN_METERING");
  return [...values].sort();
}

export function makeReservationInput(context, queueClaim, overrides = {}) {
  const effectiveBudget =
    context.effectiveBudget ?? context.contract.policy;
  const maxTokens = effectiveBudget.max_tokens;
  const effectiveLimits = {
    max_runtime_ms: effectiveBudget.max_runtime_minutes * 60_000,
    max_no_progress_iterations:
      effectiveBudget.max_no_progress_iterations,
    max_tokens: maxTokens,
    ...overrides.effective_limits,
  };
  const aggregatePolicy = {
    ...structuredClone(context.contract.policy.background_aggregate_policy),
    ...overrides.aggregate_policy,
  };
  const sharedAggregatePolicy = structuredClone(
    context.config.background_aggregate_policy,
  );
  const reservation = {
    workers: 1,
    tokens: maxTokens === null ? null : Math.min(1000, maxTokens),
    runtime_ms: 600_000,
    remote_calls: 0,
    reviewers: 1,
    ...overrides.reservation,
  };
  const effectiveLimitsDigest = computeEffectiveBackgroundLimitsDigest(effectiveLimits);
  const aggregateEpochDigest = computeBackgroundAggregateEpochDigest({
    shared_aggregate_policy: sharedAggregatePolicy,
    project_config_digest: queueClaim.project_config_digest,
    operation_inventory_digest: queueClaim.operation_inventory_digest,
  });
  const aggregatePolicyDigest = computeBackgroundRunAggregatePolicyDigest({
    run_id: queueClaim.run_id,
    aggregate_policy: aggregatePolicy,
    policy_digest: queueClaim.policy_digest,
    aggregate_epoch_digest: aggregateEpochDigest,
  });
  const worktreeRef = overrides.worktree_ref ?? `${context.runId}.worktree.01`;
  const worktreeRootDigest = overrides.worktree_root_digest ?? sha256(worktreeRef);
  const capabilities = hostCapabilities(maxTokens);
  const now = context.clock.now();
  const hostExpiry = new Date(Date.parse(now) + 50 * 60_000).toISOString();
  const worktreeExpiry = new Date(Date.parse(now) + 45 * 60_000).toISOString();
  const hostEvidenceDigest = sha256(`${context.runId}:host-evidence`);
  const worktreeEvidenceDigest = sha256(`${worktreeRef}:evidence`);
  return {
    dispatch_id: overrides.dispatch_id ?? `${context.runId}.dispatch.01`,
    queue_claim: queueClaim,
    host_attestation: {
      schema: "host_capability_v2",
      contract_version: "2.0.0",
      attestation_id: `${context.runId}.host-attestation`,
      host_ref: "host.local.reference",
      run_id: context.runId,
      run_head_digest: queueClaim.run_head_digest,
      authority_digest: queueClaim.authority_digest,
      verifier_digest: queueClaim.verifier_digest,
      project_config_digest: queueClaim.project_config_digest,
      operation_inventory_digest: queueClaim.operation_inventory_digest,
      policy_digest: queueClaim.policy_digest,
      approval_digest: queueClaim.approval_digest,
      capabilities,
      credential_scopes: structuredClone(CREDENTIAL_SCOPES),
      egress_ids: [],
      isolation: "HARDENED",
      issued_at: now,
      expires_at: hostExpiry,
      evidence_digest: hostEvidenceDigest,
    },
    host_verification: { verified: true, evidence_digest: hostEvidenceDigest },
    capability_decision: {
      allowed: true,
      code: "ACTION_CAPABILITY_VERIFIED",
      effective_isolation: "HARDENED",
      required_capabilities: [...BACKGROUND_REQUIRED_CAPABILITIES],
    },
    worktree_attestation: {
      schema: "background_worktree_attestation_v2",
      contract_version: "2.0.0",
      attestation_id: `${worktreeRef}.attestation`,
      host_ref: "host.local.reference",
      run_id: context.runId,
      queue_item_id: queueClaim.queue_item_id,
      lease_id: queueClaim.lease.lease_id,
      worker_ref: queueClaim.lease.worker_ref,
      worktree_ref: worktreeRef,
      root_digest: worktreeRootDigest,
      base_git_sha: BASE_GIT_SHA,
      dedicated: overrides.worktree_dedicated ?? true,
      main_workspace: false,
      path_confined: true,
      symlink_free: true,
      issued_at: now,
      expires_at: worktreeExpiry,
      evidence_digest: worktreeEvidenceDigest,
    },
    worktree_verification: {
      schema: "background_worktree_verification_v2",
      contract_version: "2.0.0",
      verified: true,
      attestation_id: `${worktreeRef}.attestation`,
      run_id: context.runId,
      queue_item_id: queueClaim.queue_item_id,
      lease_id: queueClaim.lease.lease_id,
      worker_ref: queueClaim.lease.worker_ref,
      worktree_ref: worktreeRef,
      root_digest: worktreeRootDigest,
      base_git_sha: BASE_GIT_SHA,
      evidence_digest: worktreeEvidenceDigest,
      verified_at: now,
    },
    expected_base_git_sha: BASE_GIT_SHA,
    effective_limits: effectiveLimits,
    effective_limits_digest: overrides.effective_limits_digest ?? effectiveLimitsDigest,
    aggregate_policy: aggregatePolicy,
    aggregate_policy_digest: overrides.aggregate_policy_digest ?? aggregatePolicyDigest,
    shared_aggregate_policy: sharedAggregatePolicy,
    aggregate_epoch_digest:
      overrides.aggregate_epoch_digest ?? aggregateEpochDigest,
    policy_verification: {
      schema: "background_policy_verification_v2",
      contract_version: "2.0.0",
      verified: true,
      run_id: context.runId,
      queue_item_id: queueClaim.queue_item_id,
      confirmation_digest: queueClaim.approval_digest,
      project_config_digest: queueClaim.project_config_digest,
      policy_digest: queueClaim.policy_digest,
      operation_inventory_digest: queueClaim.operation_inventory_digest,
      effective_limits_digest: overrides.effective_limits_digest ?? effectiveLimitsDigest,
      aggregate_epoch_digest:
        overrides.aggregate_epoch_digest ?? aggregateEpochDigest,
      aggregate_policy_digest: overrides.aggregate_policy_digest ?? aggregatePolicyDigest,
      issued_at: now,
      expires_at: hostExpiry,
      evidence_digest: sha256(`${context.runId}:policy-evidence`),
    },
    reservation,
    now,
  };
}

export function createStore(context, overrides = {}) {
  return createBackgroundExecutionStore(context.root, {
    now: context.clock.now,
    queueCoordinator: context.queue.backgroundCoordinator,
    backgroundPolicyAuthority: context.backgroundPolicyAuthority,
    verifyHostAttestation: async (input) =>
      input.host_attestation.run_id === input.queue_claim.run_id &&
      input.host_verification.evidence_digest === input.host_attestation.evidence_digest,
    verifyWorktreeAttestation: async (input) =>
      input.worktree_verification.verified === true &&
      input.worktree_verification.worktree_ref === input.worktree_attestation.worktree_ref,
    ...overrides,
  });
}

export async function createHarness({
  pilotId,
  maxTokens = null,
  aggregatePolicy = {},
  confirmedLimits = {},
  mode = "ENFORCE",
  verifyModeCapabilityAttestation = null,
} = {}) {
  const root = await mkdtemp(path.join(tmpdir(), `goal014-${pilotId.toLowerCase()}-`));
  const clock = createClock();
  const ids = createIdSource(`${pilotId.toLowerCase()}.event`);
  const contextDirectory = path.join(root, ".agent", "context");
  const schemaDirectory = path.join(contextDirectory, "schemas");
  await mkdir(schemaDirectory, { recursive: true });
  await Promise.all([
    copyFile(
      new URL("../context/schemas/project-config-v2.schema.json", import.meta.url),
      path.join(schemaDirectory, "project-config-v2.schema.json"),
    ),
    copyFile(
      new URL("../context/schemas/automation-trigger-v2.schema.json", import.meta.url),
      path.join(schemaDirectory, "automation-trigger-v2.schema.json"),
    ),
    copyFile(
      new URL("../context/schemas/operation-inventory-v2.schema.json", import.meta.url),
      path.join(schemaDirectory, "operation-inventory-v2.schema.json"),
    ),
    copyFile(
      new URL("../context/schemas/loop-run-contract-v2.schema.json", import.meta.url),
      path.join(schemaDirectory, "loop-run-contract-v2.schema.json"),
    ),
    copyFile(
      new URL(
        "../context/schemas/project-mode-capability-v2.schema.json",
        import.meta.url,
      ),
      path.join(schemaDirectory, "project-mode-capability-v2.schema.json"),
    ),
  ]);
  const config = projectConfig({ maxTokens, aggregatePolicy, mode });
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(path.join(contextDirectory, "project-config.json"), configText);
  const configDigest = sha256(configText);
  const modeCapability = {
    schema: "project_mode_capability_v2",
    contract_version: "2.0.0",
    attestation_id: `${pilotId.toLowerCase()}.mode-capability`,
    purpose: "PROJECT_MODE_ENFORCE",
    project_root_digest: computeProjectModeCapabilityRootDigest(root),
    workspace_root_digest: sha256(`workspace:${root}`),
    project_config_digest: configDigest,
    config_version: config.config_version,
    mode_version: config.mode_version,
    host_ref: "host.local.reference",
    host_identity_digest: sha256(`${pilotId}:host-identity`),
    host_verifier_digest: sha256(`${pilotId}:host-verifier`),
    write_interceptor_digest: sha256(`${pilotId}:write-interceptor`),
    filesystem_type: "ext4",
    external_write_policy: "DENY",
    capabilities: [...config.capability_requirements.enforce].sort(),
    issued_at: clock.now(),
    expires_at: CONFIG_EXPIRY,
    evidence_digest: sha256(`${pilotId}:mode-capability-evidence`),
  };
  await writeFile(
    path.join(contextDirectory, "project-mode-capability.json"),
    `${JSON.stringify(modeCapability, null, 2)}\n`,
  );
  const modeCapabilityAuthority = createProjectModeCapabilityAuthority(root, {
    now: clock.now,
    verifyHostAttestation: async (input) => {
      const bindingValid =
        input.attestation.attestation_id === modeCapability.attestation_id &&
        input.attestation.evidence_digest === modeCapability.evidence_digest &&
        input.project_root_digest === modeCapability.project_root_digest &&
        input.project_config_digest === configDigest &&
        input.required_capabilities.every((capability) =>
          modeCapability.capabilities.includes(capability),
        );
      if (!bindingValid) return false;
      return verifyModeCapabilityAttestation === null
        ? true
        : (await verifyModeCapabilityAttestation(input)) === true;
    },
  });
  const authority = await writeAuthority(
    root,
    configDigest,
    clock,
    config.background_aggregate_policy,
  );
  const runId = `LER2-${pilotId}-RUN-01`;
  const contract = makeContract({
    runId,
    configDigest,
    sources: authority.sources,
    clock,
    maxTokens,
    aggregatePolicy: config.background_aggregate_policy,
  });
  const contractFile = await writeJson(root, `${pilotId}-contract`, contract);
  const controller = createLoopRunController(root, {
    now: clock.now,
    randomId: ids,
    modeCapabilityAuthority,
    verifyHostHumanAttestation: async () => true,
    verifyActiveRuntimeAttestation: async () => true,
    verifyUsageMetering: async () => true,
    verifyUsageCompletionAttestation: async () => true,
  });
  const backgroundPolicyAuthority = createCanonicalBackgroundPolicyAuthority(
    root,
    { now: clock.now, loopRunController: controller },
  );
  const validateGate = (input) => controller.validateGate(input);
  const queue = createLoopQueue(root, {
    now: clock.now,
    randomId: createIdSource(`${pilotId.toLowerCase()}.lease`),
    validateQueueGate: validateGate,
  });
  const context = {
    root,
    clock,
    runId,
    queueItemId: `${pilotId.toLowerCase()}.queue.01`,
    contract,
    contractFile,
    controller,
    modeCapabilityAuthority,
    backgroundPolicyAuthority,
    validateGate,
    queue,
    host: createCountedHost(),
    inventory: authority.inventory,
    inventoryDigest: authority.inventoryDigest,
    authoritySources: authority.sources,
    config,
    confirmedLimits,
  };
  context.store = createStore(context);
  context.cleanup = () => rm(root, { recursive: true, force: true });
  return context;
}

export async function approveStart(context) {
  const confirmedLimits = context.confirmedLimits ?? {};
  const created = await context.controller.create({ contractFile: context.contractFile });
  const recommendation = {
    schema: "budget_recommendation_v2",
    contract_version: "2.0.0",
    recommendation_source: "MODEL_ADVISORY",
    run_id: context.runId,
    phase: "START",
    expected_run_version: created.state.version,
    goal_ref: context.contract.goal.ref,
    goal_digest: context.contract.goal.digest,
    verifier_digest: context.contract.verifier.digest,
    policy_digest: policyDigest(context.contract),
    recommended_limits: {
      max_iterations: confirmedLimits.max_iterations ?? 20,
      max_runtime_minutes:
        confirmedLimits.max_runtime_minutes ?? null,
      max_no_progress_iterations:
        confirmedLimits.max_no_progress_iterations ?? null,
      max_tokens: confirmedLimits.max_tokens ?? null,
      max_cost: confirmedLimits.max_cost ?? null,
    },
    recommendation_reason: "Twenty bounded cycles cover the deterministic integrated background pilot.",
  };
  const recommendationFile = await writeJson(
    context.root,
    `${context.runId}-recommendation-start`,
    recommendation,
  );
  const proposed = await context.controller.proposeBudget({
    runId: context.runId,
    phase: "START",
    queueItemId: context.queueItemId,
    recommendationFile,
  });
  await context.queue.prepare(queuePreparation(context, proposed.proposal));
  const confirmationFile = await writeJson(
    context.root,
    `${context.runId}-confirmation-start`,
    confirmationFromProposal(proposed.proposal, proposed.proposal_digest, context.clock),
  );
  const confirmation = await context.controller.confirmBudget({
    runId: context.runId,
    expectedVersion: created.state.version,
    inputFile: confirmationFile,
  });
  context.confirmationDigest = confirmation.confirmation_digest;
  context.effectiveBudget = structuredClone(
    confirmation.state.effective_budget,
  );
  return confirmation;
}

export async function claimAndStart(context, { beginAction = true } = {}) {
  await context.queue.submit(context.queueItemId, {
    expected_version: 0,
    confirmation_digest: context.confirmationDigest,
  });
  const claimed = await context.queue.claim(context.queueItemId, {
    expected_version: 1,
    worker_ref: `${context.runId}.worker.01`,
  });
  context.fence = {
    queue_item_id: context.queueItemId,
    minimum_version: claimed.version,
    lease_id: claimed.lease.lease_id,
    worker_ref: claimed.lease.worker_ref,
    attempt: claimed.lease.attempt,
  };
  let state = (await context.controller.show({ runId: context.runId })).state;
  const startFile = await writeJson(context.root, `${context.runId}-start`, {
    confirmation_digest: context.confirmationDigest,
    freshness: freshness(context.contract),
  });
  state = (await context.controller.apply({
    runId: context.runId,
    expectedVersion: state.version,
    command: "START",
    inputFile: startFile,
  })).state;
  if (!beginAction) return context.queue.validateClaim(context.fence);
  const actionFile = await writeJson(context.root, `${context.runId}-action-01`, {
    confirmation_digest: context.confirmationDigest,
    action_id: `${context.runId}.action.01`,
    idempotency_key: `${context.runId}.action-key.01`,
    freshness: freshness(context.contract),
  });
  await context.controller.apply({
    runId: context.runId,
    expectedVersion: state.version,
    command: "BEGIN_ACTION",
    inputFile: actionFile,
  });
  return context.queue.validateClaim(context.fence);
}

export async function setupActivePilot(pilotId, options = {}) {
  const context = await createHarness({ pilotId, ...options });
  await approveStart(context);
  const queueClaim = await claimAndStart(context);
  return { context, queueClaim };
}

export async function addActiveRun(
  context,
  suffix,
  { lineage = null, policyOverrides = {} } = {},
) {
  const runId = `${context.runId}.child.${suffix}`;
  const contract = makeContract({
    runId,
    configDigest: context.contract.project_config_digest,
    sources: context.authoritySources,
    clock: context.clock,
    maxTokens: context.contract.policy.max_tokens,
    aggregatePolicy: context.contract.policy.background_aggregate_policy,
    lineage,
    policyOverrides,
  });
  const child = {
    ...context,
    runId,
    queueItemId: `${context.queueItemId}.child.${suffix}`,
    contract,
    contractFile: await writeJson(context.root, `${runId}-contract`, contract),
    host: createCountedHost(),
  };
  await approveStart(child);
  const queueClaim = await claimAndStart(child);
  return { context: child, queueClaim };
}

async function captureError(operation) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function durableLineCount(file, { missingAsZero = false } = {}) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (missingAsZero && error?.code === "ENOENT") return 0;
    throw error;
  }
  return text.trim().length === 0 ? 0 : text.trim().split("\n").length;
}

async function backgroundEventCount(context, dispatchId, options = {}) {
  const storageKey = sha256(dispatchId).slice("sha256:".length);
  const eventPath = path.join(
    context.root,
    ".scratch",
    "loop-runtime",
    "background-dispatches",
    "items",
    storageKey,
    "events.jsonl",
  );
  return durableLineCount(eventPath, options);
}

async function queueEventCount(context, queueItemId = context.queueItemId) {
  const storageKey = await context.queue.itemStorageKey(queueItemId);
  return durableLineCount(
    path.join(
      context.root,
      ".scratch",
      "loop-queue",
      "items",
      storageKey,
      "events.jsonl",
    ),
  );
}

async function armDispatch(context, reservation, operation = "work") {
  const gate = await context.validateGate({ runId: context.runId, operation });
  const result = await context.store.arm(reservation.dispatch_id, {
    expected_version: 0,
    action_gate: gate,
    evidence_digest: reservation.effective_limits_digest,
  });
  return { gate, result };
}

async function applyDispatch(context, reservation, record, command, outcome = null) {
  return context.store.apply(reservation.dispatch_id, {
    expected_version: record.version,
    command,
    authorization: null,
    evidence_digest: reservation.policy_verification.evidence_digest,
    outcome,
  });
}

async function pauseAfterFailedVerification(context) {
  const state = (await context.controller.show({ runId: context.runId })).state;
  const action = state.active_action;
  const observedFile = await writeJson(context.root, `${context.runId}-observe`, {
    action_id: action.action_id,
    idempotency_key: action.idempotency_key,
    external_action_record_digest: null,
    external_outcome: null,
    target_audit_digest: null,
    duration_ms: 25,
    freshness: freshness(context.contract),
  });
  const observed = await context.controller.apply({
    runId: context.runId,
    expectedVersion: state.version,
    command: "OBSERVE_ACTION",
    inputFile: observedFile,
  });
  const verificationFile = await writeJson(context.root, `${context.runId}-verify`, {
    freshness: freshness(context.contract),
  });
  const verifying = await context.controller.apply({
    runId: context.runId,
    expectedVersion: observed.state.version,
    command: "BEGIN_VERIFICATION",
    inputFile: verificationFile,
  });
  const failedFile = await writeJson(context.root, `${context.runId}-verification-failed`, {
    verification_status: "FAIL",
    fingerprint: sha256(`${context.runId}:failed-verification`),
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: `${context.runId}.approach.01`,
    freshness: freshness(context.contract),
  });
  const failed = await context.controller.apply({
    runId: context.runId,
    expectedVersion: verifying.state.version,
    command: "VERIFICATION_FAILED",
    inputFile: failedFile,
  });
  const pauseFile = await writeJson(context.root, `${context.runId}-pause`, {
    freshness: freshness(context.contract),
  });
  return context.controller.apply({
    runId: context.runId,
    expectedVersion: failed.state.version,
    command: "PAUSE",
    inputFile: pauseFile,
  });
}

async function approveResumeAndClaim(context) {
  const recommendation = {
    schema: "budget_recommendation_v2",
    contract_version: "2.0.0",
    recommendation_source: "MODEL_ADVISORY",
    run_id: context.runId,
    phase: "RESUME",
    expected_run_version: (await context.controller.show({ runId: context.runId })).state
      .version,
    goal_ref: context.contract.goal.ref,
    goal_digest: context.contract.goal.digest,
    verifier_digest: context.contract.verifier.digest,
    policy_digest: policyDigest(context.contract),
    recommended_limits: {
      max_iterations: 20,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: context.contract.policy.max_tokens,
      max_cost: null,
    },
    recommendation_reason:
      "Resume only after lease reconciliation and fresh human confirmation.",
  };
  const recommendationFile = await writeJson(
    context.root,
    `${context.runId}-recommendation-resume`,
    recommendation,
  );
  const proposed = await context.controller.proposeBudget({
    runId: context.runId,
    phase: "RESUME",
    queueItemId: context.queueItemId,
    recommendationFile,
  });
  const confirmationFile = await writeJson(
    context.root,
    `${context.runId}-confirmation-resume`,
    confirmationFromProposal(proposed.proposal, proposed.proposal_digest, context.clock),
  );
  const current = (await context.controller.show({ runId: context.runId })).state;
  const confirmation = await context.controller.confirmBudget({
    runId: context.runId,
    expectedVersion: current.version,
    inputFile: confirmationFile,
  });
  const previousConfirmationDigest = context.confirmationDigest;
  context.confirmationDigest = confirmation.confirmation_digest;
  let queueState = await context.queue.show(context.queueItemId);
  if (
    queueState.retry_not_before !== null &&
    Date.parse(queueState.retry_not_before) > Date.parse(context.clock.now())
  ) {
    context.clock.advance(
      Date.parse(queueState.retry_not_before) - Date.parse(context.clock.now()),
    );
  }
  await context.queue.submit(context.queueItemId, {
    expected_version: queueState.version,
    confirmation_digest: context.confirmationDigest,
  });
  queueState = await context.queue.show(context.queueItemId);
  const claimed = await context.queue.claim(context.queueItemId, {
    expected_version: queueState.version,
    worker_ref: `${context.runId}.worker.02`,
  });
  context.fence = {
    queue_item_id: context.queueItemId,
    minimum_version: claimed.version,
    lease_id: claimed.lease.lease_id,
    worker_ref: claimed.lease.worker_ref,
    attempt: claimed.lease.attempt,
  };
  const resumeFile = await writeJson(context.root, `${context.runId}-resume`, {
    confirmation_digest: context.confirmationDigest,
    duration_ms: 0,
    freshness: freshness(context.contract),
  });
  const confirmedState = (await context.controller.show({ runId: context.runId })).state;
  const resumed = await context.controller.apply({
    runId: context.runId,
    expectedVersion: confirmedState.version,
    command: "RESUME",
    inputFile: resumeFile,
  });
  const actionFile = await writeJson(context.root, `${context.runId}-action-02`, {
    confirmation_digest: context.confirmationDigest,
    action_id: `${context.runId}.action.02`,
    idempotency_key: `${context.runId}.action-key.02`,
    freshness: freshness(context.contract),
  });
  await context.controller.apply({
    runId: context.runId,
    expectedVersion: resumed.state.version,
    command: "BEGIN_ACTION",
    inputFile: actionFile,
  });
  return {
    queueClaim: await context.queue.validateClaim(context.fence),
    previousConfirmationDigest,
  };
}

async function expireLease(context) {
  context.clock.advance(601_000);
  const current = await context.queue.show(context.queueItemId);
  return context.queue.reconcile(context.queueItemId, {
    expected_version: current.version,
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
}

async function terminalizeUnknownOutcome(context) {
  const current = (await context.controller.show({ runId: context.runId })).state;
  const inputFile = await writeJson(context.root, `${context.runId}-cancel-unknown`, {
    freshness: freshness(context.contract),
  });
  const cancelled = await context.controller.apply({
    runId: context.runId,
    expectedVersion: current.version,
    command: "CANCEL",
    inputFile,
  });
  assert.equal(cancelled.state.status, "UNKNOWN_OUTCOME");
  return cancelled;
}

function actionPolicyAuthority(context) {
  return {
    effective_policy: {
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [...CREDENTIAL_SCOPES.read, ...CREDENTIAL_SCOPES.write],
      required_gates: [...context.contract.policy.required_gates],
      isolation: "HARDENED",
      risk: "HIGH",
      expires_at: CONFIG_EXPIRY,
    },
    capability_requirements: structuredClone(context.config.capability_requirements),
    execution_mode: "ENFORCE",
    autonomy_profile: "BACKGROUND",
    external_write_policy: "DENY",
    project_egress_ids: [],
    policy_digest: policyDigest(context.contract),
  };
}

function sourceWriteAttestation(gate, reservationAttestation) {
  return {
    ...structuredClone(reservationAttestation),
    run_head_digest: gate.run_head_digest,
  };
}

async function authorizeSourceWrite(context, dispatchId, reservationAttestation) {
  const validateControllerGate = context.validateGate;
  const validateActionCapability = createWorkflowCapabilityValidator({
    inventory: context.inventory,
    inventoryDigest: context.inventoryDigest,
    policyAuthority: actionPolicyAuthority(context),
    now: context.clock.now,
    validateControllerGate,
    verifyHostAttestation: async (attestation, binding) => ({
      verified:
        attestation.run_id === binding.run_id &&
        attestation.run_head_digest === binding.run_head_digest &&
        binding.inventory_digest === context.inventoryDigest,
      evidence_digest: attestation.evidence_digest,
    }),
    validateBackgroundDispatch: createDurableBackgroundDispatchValidator(context.store),
  });
  const gate = await validateControllerGate({
    runId: context.runId,
    operation: "source-write",
  });
  const loadedConfig = await loadCanonicalProjectConfig(context.root, {
    modeCapabilityAuthority: context.modeCapabilityAuthority,
  });
  return validateWorkflowAdmission(
    context.root,
    {
      route: "sc-work",
      intent: { path: ".agent/tools/pilot-source-write.mjs" },
      runId: context.runId,
      operation: "source-write",
      capabilityAttestation: sourceWriteAttestation(
        gate,
        reservationAttestation,
      ),
      backgroundDispatchId: dispatchId,
    },
    {
      loadedConfig,
      validateGate: validateControllerGate,
      validateActionCapability,
      now: context.clock.now,
    },
  );
}

async function runSuccessPilot(pilot) {
  const context = await createHarness({ pilotId: pilot.pilot_id });
  try {
    await approveStart(context);
    await assertQueueUnlocked(context, "approval");
    const queueClaim = await claimAndStart(context);
    await assertQueueUnlocked(context, "claim/start");
    const reservation = makeReservationInput(context, queueClaim);
    const reserved = await context.store.reserve(reservation);
    assert.equal(reserved.created, true);
    context.clock.advance(60_000);
    const heartbeat = await context.queue.heartbeat(context.queueItemId, {
      expected_version: 2,
      worker_ref: queueClaim.lease.worker_ref,
      lease_id: queueClaim.lease.lease_id,
    });
    const workGate = await context.validateGate({
      runId: context.runId,
      operation: "work",
    });
    const armed = await context.store.arm(reservation.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: reservation.effective_limits_digest,
    });
    const receipt = await context.host.dispatch(armed);
    const dispatched = await context.store.apply(reservation.dispatch_id, {
      expected_version: armed.record.version,
      command: "OBSERVE_DISPATCH",
      authorization: null,
      evidence_digest: receipt.receipt_digest,
      outcome: "DISPATCHED",
    });
    const admission = await authorizeSourceWrite(
      context,
      reservation.dispatch_id,
      reservation.host_attestation,
    );
    assert.equal(admission.allowed, true, JSON.stringify(admission));
    assert.equal(
      admission.gate_evidence.background_dispatch.dispatch_id,
      reservation.dispatch_id,
    );
    const completed = await context.store.apply(reservation.dispatch_id, {
      expected_version: dispatched.record.version,
      command: "COMPLETE",
      authorization: null,
      evidence_digest: reservation.policy_verification.evidence_digest,
      outcome: "SUCCESS",
    });
    const queueState = await context.queue.show(context.queueItemId);
    const queueCompletion = await context.queue.complete(context.queueItemId, {
      expected_version: queueState.version,
      worker_ref: queueClaim.lease.worker_ref,
      lease_id: queueClaim.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: reservation.policy_verification.evidence_digest,
    });
    const commit = queueState.dispatch_commit;
    assert.equal(commit.dispatch_id, reservation.dispatch_id);
    assert.equal(commit.action_id, workGate.action_id);
    assert.equal(commit.background_record_version, armed.record.version);
    assert.equal(heartbeat.version + 1, queueState.version);
    return {
      queue_state: queueCompletion.item.state,
      ticket_state: completed.record.state,
      reservation_status: completed.record.reservation_status,
      worktree_disposition: completed.record.worktree.disposition,
      dispatch_count: completed.record.dispatch_count,
      host_calls: context.host.calls.length,
      budget_binding_schema:
        workGate.background_budget_binding?.schema ?? null,
      budget_binding_confirmation_matches:
        workGate.background_budget_binding?.confirmation_digest ===
        context.confirmationDigest,
      budget_binding_current_head_matches:
        workGate.background_budget_binding?.current_run_head_digest ===
        (await context.controller.show({ runId: context.runId })).head,
      budget_remaining_runtime_ms:
        workGate.background_budget_binding?.remaining.runtime_ms ?? null,
      budget_remaining_no_progress_iterations:
        workGate.background_budget_binding?.remaining
          .no_progress_iterations ?? null,
      reserved_budget_binding_schema:
        reserved.record.budget_binding?.schema ?? null,
      armed_budget_binding_matches_gate:
        armed.record.budget_binding?.authority_digest ===
        workGate.background_budget_binding?.authority_digest,
    };
  } finally {
    await context.cleanup();
  }
}

async function runDuplicateReservationPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    const concurrent = await Promise.allSettled([
      context.store.reserve(reservation),
      context.store.reserve(reservation),
    ]);
    assert.equal(concurrent.every((entry) => entry.status === "fulfilled"), true);
    const results = concurrent.map((entry) => entry.value);
    const first = results.find((entry) => entry.created === true);
    const retry = results.find((entry) => entry.created === false);
    assert.notEqual(first, undefined);
    assert.notEqual(retry, undefined);
    const conflicting = makeReservationInput(context, queueClaim, {
      worktree_root_digest: sha256(`${context.runId}:conflicting-root`),
    });
    const conflictCode = await captureError(() => context.store.reserve(conflicting));
    const armed = await armDispatch(context, reservation);
    await context.host.dispatch(armed.result);
    const replay = await context.store.arm(reservation.dispatch_id, {
      expected_version: 0,
      action_gate: armed.gate,
      evidence_digest: reservation.effective_limits_digest,
    });
    const eventCount = await backgroundEventCount(
      context,
      reservation.dispatch_id,
    );
    assert.equal(replay.handoff_granted, false, "PILOT_REPLAY_HANDOFF_DENIED");
    assert.equal(context.host.calls.length, 1);
    assert.equal(first.created, true);
    assert.equal(retry.created, false);
    return {
      ticket_state: replay.record.state,
      created_count: Number(first.created) + Number(retry.created),
      event_count: eventCount,
      dispatch_count: replay.record.dispatch_count,
      reservation_status: replay.record.reservation_status,
      worktree_disposition: replay.record.worktree.disposition,
      requires_new_approval: replay.record.requires_new_approval,
      replay_handoff_granted: replay.handoff_granted,
      host_calls: context.host.calls.length,
      error_code: conflictCode,
    };
  } finally {
    await context.cleanup();
  }
}

async function runIsolationMismatchPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim, {
      worktree_dedicated: false,
    });
    const queueEvents = await queueEventCount(context);
    const errorCode = await captureError(() => context.store.reserve(reservation));
    assert.equal(await queueEventCount(context), queueEvents);
    return {
      queue_state: (await context.queue.show(context.queueItemId)).state,
      ticket_state: null,
      event_count: await backgroundEventCount(context, reservation.dispatch_id, {
        missingAsZero: true,
      }),
      error_code: errorCode,
    };
  } finally {
    await context.cleanup();
  }
}

async function runCapExhaustionPilot(pilot) {
  const scenarios = [
    {
      aggregate_policy: { max_workers: 1 },
      error: "BACKGROUND_WORKER_CAP_EXHAUSTED",
    },
    {
      maxTokens: 2_000,
      aggregate_policy: { max_reserved_tokens: 1_000 },
      reservation: { tokens: 1_000 },
      error: "BACKGROUND_TOKEN_CAP_EXHAUSTED",
    },
    {
      aggregate_policy: { max_reserved_runtime_ms: 600_000 },
      error: "BACKGROUND_RUNTIME_CAP_EXHAUSTED",
    },
    {
      aggregate_policy: { max_remote_calls: 1 },
      reservation: { remote_calls: 1 },
      error: "BACKGROUND_REMOTE_CAP_EXHAUSTED",
    },
    {
      aggregate_policy: { max_reviewers: 1 },
      error: "BACKGROUND_REVIEWER_CAP_EXHAUSTED",
    },
  ];
  const codes = [];
  let winnerState = null;
  let loserEventCount = 0;
  for (const [index, scenario] of scenarios.entries()) {
    const { context, queueClaim } = await setupActivePilot(
      `${pilot.pilot_id}-${index + 1}`,
      {
        maxTokens: scenario.maxTokens ?? null,
        aggregatePolicy: scenario.aggregate_policy,
      },
    );
    try {
      const common = {
        aggregate_policy: scenario.aggregate_policy,
        reservation: scenario.reservation,
      };
      const first = makeReservationInput(context, queueClaim, common);
      const secondary = await addActiveRun(context, "02");
      const second = makeReservationInput(
        secondary.context,
        secondary.queueClaim,
        common,
      );
      const winner = await context.store.reserve(first);
      winnerState = winner.record.state;
      const queueEvents = await queueEventCount(
        secondary.context,
        secondary.context.queueItemId,
      );
      const code = await captureError(() => context.store.reserve(second));
      assert.equal(code, scenario.error);
      assert.equal(
        await queueEventCount(secondary.context, secondary.context.queueItemId),
        queueEvents,
      );
      loserEventCount += await backgroundEventCount(
        context,
        second.dispatch_id,
        { missingAsZero: true },
      );
      assert.equal(context.host.calls.length, 0);
      codes.push(code);
    } finally {
      await context.cleanup();
    }
  }
  return {
    winner_ticket_state: winnerState,
    loser_event_count: loserEventCount,
    error_codes: codes,
  };
}

async function runTokenUnknownPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id, {
    maxTokens: 10_000,
    aggregatePolicy: { max_reserved_tokens: 10_000 },
  });
  try {
    const reservation = makeReservationInput(context, queueClaim, {
      reservation: { tokens: null },
      aggregate_policy: { max_reserved_tokens: 10_000 },
    });
    const queueEvents = await queueEventCount(context);
    const errorCode = await captureError(() => context.store.reserve(reservation));
    assert.equal(await queueEventCount(context), queueEvents);
    return {
      ticket_state: null,
      event_count: await backgroundEventCount(context, reservation.dispatch_id, {
        missingAsZero: true,
      }),
      error_code: errorCode,
    };
  } finally {
    await context.cleanup();
  }
}

async function runCancelPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    await context.store.reserve(reservation);
    const armed = await armDispatch(context, reservation);
    const receipt = await context.host.dispatch(armed.result);
    const queueBeforeCancel = await context.queue.show(context.queueItemId);
    await context.queue.cancel(context.queueItemId, {
      expected_version: queueBeforeCancel.version,
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    });
    const cancelling = await applyDispatch(
      context,
      reservation,
      armed.result.record,
      "CANCEL",
    );
    const observed = await context.store.apply(reservation.dispatch_id, {
      expected_version: cancelling.record.version,
      command: "OBSERVE_DISPATCH",
      authorization: null,
      evidence_digest: receipt.receipt_digest,
      outcome: "DISPATCHED",
    });
    const completed = await applyDispatch(
      context,
      reservation,
      observed.record,
      "COMPLETE",
      "SUCCESS",
    );
    const queueState = await context.queue.show(context.queueItemId);
    await context.queue.complete(context.queueItemId, {
      expected_version: queueState.version,
      worker_ref: queueClaim.lease.worker_ref,
      lease_id: queueClaim.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: reservation.policy_verification.evidence_digest,
    });
    return {
      intermediate_ticket_state: cancelling.record.state,
      ticket_state: completed.record.state,
      reservation_status: completed.record.reservation_status,
      worktree_disposition: completed.record.worktree.disposition,
      dispatch_count: completed.record.dispatch_count,
      host_calls: context.host.calls.length,
    };
  } finally {
    await context.cleanup();
  }
}

async function runCrashPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    await context.store.reserve(reservation);
    const armed = await armDispatch(context, reservation);
    await assert.rejects(
      () =>
        context.host.dispatch(armed.result, {
          fault: "after-host-call-before-observation",
        }),
      /INJECTED_AFTER_HOST_CALL_BEFORE_OBSERVATION/u,
    );
    context.store = createStore(context);
    await context.store.recover(reservation.dispatch_id);
    const retry = await context.store.arm(reservation.dispatch_id, {
      expected_version: 0,
      action_gate: armed.gate,
      evidence_digest: reservation.effective_limits_digest,
    });
    assert.equal(retry.handoff_granted, false);
    return {
      ticket_state: retry.record.state,
      reservation_status: retry.record.reservation_status,
      worktree_disposition: retry.record.worktree.disposition,
      requires_new_approval: retry.record.requires_new_approval,
      dispatch_count: retry.record.dispatch_count,
      host_calls: context.host.calls.length,
    };
  } finally {
    await context.cleanup();
  }
}

async function runLeaseLossPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    const reserved = await context.store.reserve(reservation);
    const oldGate = await context.validateGate({
      runId: context.runId,
      operation: "work",
    });
    const queueState = await expireLease(context);
    const staleFenceCode = await captureError(() =>
      context.store.arm(reservation.dispatch_id, {
        expected_version: 0,
        action_gate: oldGate,
        evidence_digest: reservation.effective_limits_digest,
      }),
    );
    assert.match(staleFenceCode, /QUEUE_CLAIM_NOT_ACTIVE/u, "PILOT_STALE_FENCE_DENIED");
    assert.equal(context.host.calls.length, 0);
    const lost = await applyDispatch(
      context,
      reservation,
      reserved.record,
      "LEASE_LOST",
    );
    return {
      queue_state: queueState.state,
      ticket_state: lost.record.state,
      reservation_status: lost.record.reservation_status,
      worktree_disposition: lost.record.worktree.disposition,
      requires_new_approval: lost.record.requires_new_approval,
    };
  } finally {
    await context.cleanup();
  }
}

async function prepareResumedReservation(context, queueClaim, oldRecord, suffix) {
  const reservation = makeReservationInput(context, queueClaim, {
    dispatch_id: `${context.runId}.dispatch.${suffix}`,
    worktree_ref: `${context.runId}.worktree.${suffix}`,
  });
  const reserved = await context.store.reserve(reservation);
  assert.equal(reserved.record.state, "RESERVED");
  return { reservation, reserved, oldRecord };
}

async function runResumeApprovalPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    const reserved = await context.store.reserve(reservation);
    await expireLease(context);
    const approvalRequired = await context.queue.show(context.queueItemId);
    const staleSubmitCode = await captureError(() =>
      context.queue.submit(context.queueItemId, {
        expected_version: approvalRequired.version,
        confirmation_digest: context.confirmationDigest,
      }),
    );
    assert.match(
      staleSubmitCode,
      /APPROVAL_REQUIRED/u,
      "PILOT_STALE_CONFIRMATION_DENIED",
    );
    const staleClaimCode = await captureError(() =>
      context.queue.claim(context.queueItemId, {
        expected_version: approvalRequired.version,
        worker_ref: `${context.runId}.stale-worker`,
      }),
    );
    assert.match(staleClaimCode, /QUEUE_NOT_CLAIMABLE|APPROVAL_REQUIRED/u);
    const lost = await applyDispatch(
      context,
      reservation,
      reserved.record,
      "LEASE_LOST",
    );
    const reconciled = await applyDispatch(
      context,
      reservation,
      lost.record,
      "RECONCILE",
      "QUARANTINED",
    );
    await pauseAfterFailedVerification(context);
    const resumed = await approveResumeAndClaim(context);
    const next = await prepareResumedReservation(
      context,
      resumed.queueClaim,
      reconciled.record,
      "02",
    );
    return {
      phase: resumed.queueClaim.phase,
      lease_attempt: resumed.queueClaim.lease.attempt,
      old_ticket_state: reconciled.record.state,
      new_ticket_state: next.reserved.record.state,
      fresh_approval_required:
        resumed.queueClaim.approval_digest !== resumed.previousConfirmationDigest,
    };
  } finally {
    await context.cleanup();
  }
}

async function runQuarantineRetentionPilot(pilot) {
  const { context, queueClaim } = await setupActivePilot(pilot.pilot_id);
  try {
    const reservation = makeReservationInput(context, queueClaim);
    await context.store.reserve(reservation);
    const armed = await armDispatch(context, reservation);
    await assert.rejects(
      () =>
        context.host.dispatch(armed.result, {
          fault: "after-host-call-before-observation",
        }),
      /INJECTED_AFTER_HOST_CALL_BEFORE_OBSERVATION/u,
    );
    const hostCallsBeforeRetry = context.host.calls.length;
    const unknown = await context.store.arm(reservation.dispatch_id, {
      expected_version: 0,
      action_gate: armed.gate,
      evidence_digest: reservation.effective_limits_digest,
    });
    assert.equal(
      unknown.handoff_granted,
      false,
      "PILOT_REPLAY_HANDOFF_DENIED",
    );
    assert.equal(context.host.calls.length, hostCallsBeforeRetry);
    const automaticRetry = unknown.handoff_granted === true;
    const reconciled = await applyDispatch(
      context,
      reservation,
      unknown.record,
      "RECONCILE",
      "QUARANTINED",
    );
    await expireLease(context);
    await terminalizeUnknownOutcome(context);
    const continued = await addActiveRun(context, "continuation");
    const sameWorktree = makeReservationInput(
      continued.context,
      continued.queueClaim,
      {
        dispatch_id: `${continued.context.runId}.dispatch.02`,
        worktree_ref: reservation.worktree_attestation.worktree_ref,
        worktree_root_digest: reservation.worktree_attestation.root_digest,
      },
    );
    const reuseCode = await captureError(() =>
      context.store.reserve(sameWorktree),
    );
    const differentWorktree = makeReservationInput(
      continued.context,
      continued.queueClaim,
      {
        dispatch_id: `${continued.context.runId}.dispatch.03`,
        worktree_ref: `${continued.context.runId}.worktree.03`,
      },
    );
    assert.equal(
      (await context.store.reserve(differentWorktree)).record.state,
      "RESERVED",
    );
    assert.equal(context.host.calls.length, 1);
    return {
      old_ticket_state: reconciled.record.state,
      reservation_status: reconciled.record.reservation_status,
      worktree_disposition: reconciled.record.worktree.disposition,
      reuse_error_code: reuseCode,
      automatic_retry: automaticRetry,
    };
  } finally {
    await context.cleanup();
  }
}

const PILOT_RUNNERS = Object.freeze({
  success: runSuccessPilot,
  "duplicate-reservation": runDuplicateReservationPilot,
  "isolation-mismatch": runIsolationMismatchPilot,
  "cap-exhaustion": runCapExhaustionPilot,
  "token-unknown": runTokenUnknownPilot,
  cancel: runCancelPilot,
  crash: runCrashPilot,
  "lease-loss": runLeaseLossPilot,
  "resume-approval": runResumeApprovalPilot,
  "quarantine-retention": runQuarantineRetentionPilot,
});

export async function runIntegratedPilot(pilot, fixture) {
  assert.equal(fixture.schema, "background_pilot_suite_v2");
  const runner = PILOT_RUNNERS[pilot?.scenario];
  if (typeof runner !== "function") {
    throw new TypeError(`INTEGRATED_PILOT_NOT_IMPLEMENTED:${String(pilot?.scenario)}`);
  }
  const result = await runner(pilot);
  if (Object.hasOwn(result, "host_calls")) {
    assert.equal(Number.isSafeInteger(result.host_calls), true);
  }
  return result;
}

export async function runHumanBudgetWideningAttack() {
  const { context, queueClaim } = await setupActivePilot(
    "PILOT-BUDGET-AUTHORITY",
    {
      maxTokens: 5_000,
      confirmedLimits: {
        max_runtime_minutes: 10,
        max_no_progress_iterations: 1,
        max_tokens: 1_000,
      },
    },
  );
  try {
    const attack = makeReservationInput(context, queueClaim, {
      effective_limits: {
        max_runtime_ms:
          context.contract.policy.max_runtime_minutes * 60_000,
        max_no_progress_iterations:
          context.contract.policy.max_no_progress_iterations,
        max_tokens: context.contract.policy.max_tokens,
      },
      reservation: {
        runtime_ms: 600_000,
        tokens: 1_000,
      },
    });
    const errorCode = await captureError(() => context.store.reserve(attack));
    return {
      error_code: errorCode,
      event_count: await backgroundEventCount(
        context,
        attack.dispatch_id,
        { missingAsZero: true },
      ),
    };
  } finally {
    await context.cleanup();
  }
}

export async function runRemainingRuntimeReservationBoundary() {
  const context = await createHarness({
    pilotId: "PILOT-RUNTIME-REMAINING",
    confirmedLimits: { max_runtime_minutes: 10 },
  });
  try {
    await approveStart(context);
    const queueClaim = await claimAndStart(context, { beginAction: false });
    let state = (await context.controller.show({ runId: context.runId })).state;
    const backoffFile = await writeJson(
      context.root,
      `${context.runId}-backoff`,
      { duration_ms: 540_000, freshness: freshness(context.contract) },
    );
    state = (await context.controller.apply({
      runId: context.runId,
      expectedVersion: state.version,
      command: "RECORD_BACKOFF_DURATION",
      inputFile: backoffFile,
    })).state;
    const actionFile = await writeJson(
      context.root,
      `${context.runId}-action-after-backoff`,
      {
        confirmation_digest: context.confirmationDigest,
        action_id: `${context.runId}.action.after-backoff`,
        idempotency_key: `${context.runId}.action-key.after-backoff`,
        freshness: freshness(context.contract),
      },
    );
    await context.controller.apply({
      runId: context.runId,
      expectedVersion: state.version,
      command: "BEGIN_ACTION",
      inputFile: actionFile,
    });
    const tooLarge = makeReservationInput(context, queueClaim, {
      reservation: { runtime_ms: 60_001 },
    });
    const errorCode = await captureError(() => context.store.reserve(tooLarge));
    const rejectedEventCount = await backgroundEventCount(
      context,
      tooLarge.dispatch_id,
      { missingAsZero: true },
    );
    const exact = makeReservationInput(context, queueClaim, {
      reservation: { runtime_ms: 60_000 },
    });
    const accepted = await context.store.reserve(exact);
    return {
      error_code: errorCode,
      rejected_event_count: rejectedEventCount,
      accepted_state: accepted.record.state,
      consumed_runtime_ms:
        accepted.record.budget_binding.consumed.active_runtime_ms,
      remaining_runtime_ms:
        accepted.record.budget_binding.remaining.runtime_ms,
    };
  } finally {
    await context.cleanup();
  }
}

export async function runArmRevalidationAfterTokenConsumption() {
  const { context, queueClaim } = await setupActivePilot(
    "PILOT-ARM-TOKEN-REVALIDATION",
    {
      maxTokens: 5_000,
      confirmedLimits: { max_tokens: 1_000 },
    },
  );
  try {
    const reservation = makeReservationInput(context, queueClaim, {
      reservation: { tokens: 600 },
    });
    await context.store.reserve(reservation);
    const state = (await context.controller.show({ runId: context.runId })).state;
    const usageFile = await writeJson(
      context.root,
      `${context.runId}-usage-after-reserve`,
      {
        receipt: {
          schema: "usage_receipt_v2",
          contract_version: "2.0.0",
          receipt_id: `${context.runId}.usage.01`,
          run_id: context.runId,
          bound_run_head_digest: state.last_event_hash,
          workflow_route: "sc-work",
          iteration: state.counters.iterations,
          attempt: 1,
          autonomy_profile: context.contract.autonomy_profile,
          risk_profile: context.contract.risk_profile,
          contributor: { kind: "MAIN_AGENT", ref: sha256("main-agent") },
          token_usage: {
            input_tokens: { status: "MEASURED", value: 500 },
            output_tokens: { status: "MEASURED", value: 0 },
            reasoning_tokens: { status: "MEASURED", value: 0 },
            cached_input_tokens: { status: "MEASURED", value: 0 },
          },
          cost: {
            status: "MEASURED",
            micro_units: 0,
            billing_currency: context.config.billing_currency,
            pricing_revision: context.config.telemetry.pricing_revision,
            pricing_digest: context.config.telemetry.pricing_digest,
          },
          reservation: {
            status: "VERIFIED",
            attestation_digest: sha256("token-reservation"),
          },
          coverage: {
            status: "COMPLETE",
            receipt_count: 1,
            attestation_digest: sha256("usage-complete"),
          },
          recorded_at: context.clock.now(),
        },
        freshness: freshness(context.contract),
      },
    );
    await context.controller.apply({
      runId: context.runId,
      expectedVersion: state.version,
      command: "RECORD_USAGE",
      inputFile: usageFile,
    });
    const errorCode = await captureError(() =>
      armDispatch(context, reservation),
    );
    return {
      error_code: errorCode,
      event_count: await backgroundEventCount(
        context,
        reservation.dispatch_id,
      ),
      queue_dispatch_commit:
        (await context.queue.show(context.queueItemId)).dispatch_commit,
    };
  } finally {
    await context.cleanup();
  }
}

export async function runLegacyLineageCallbackInjectionAttack() {
  const context = await createHarness({
    pilotId: "PILOT-LEGACY-LINEAGE-CALLBACK",
  });
  try {
    return captureError(() =>
      createStore(context, {
        loadRunLineageVerification: async () => ({ verified: true }),
        verifyRunLineage: async () => true,
      }),
    );
  } finally {
    await context.cleanup();
  }
}

export async function runObserveDispatchAuthorityAttack() {
  const context = await createHarness({
    pilotId: "OBSERVE-AUTHORITY-ATTACK",
    mode: "OBSERVE",
  });
  try {
    await approveStart(context);
    const queueGate = await context.controller.validateGate({
      runId: context.runId,
      operation: "queue-claim",
      queueItemId: context.queueItemId,
    });
    assert.equal(queueGate.allowed, false);
    assert.equal(queueGate.would_allow, true);
    assert.equal(queueGate.simulation_only, true);
    assert.equal(queueGate.mutation_authorized, false);

    // This second coordinator is deliberately adversarial: it forges the
    // OBSERVE decision bits to prove the store independently revalidates the
    // sealed controller authority before any durable dispatch event.
    const attackerQueue = createLoopQueue(context.root, {
      now: context.clock.now,
      randomId: createIdSource("observe-authority-attack.lease"),
      validateQueueGate: async (request) => {
        const observed = await context.controller.validateGate(request);
        return Object.freeze({
          ...observed,
          allowed: true,
          simulation_only: false,
          mutation_authorized: true,
        });
      },
    });
    const attackerContext = { ...context, queue: attackerQueue };
    const queueClaim = await claimAndStart(attackerContext);
    const reservation = makeReservationInput(attackerContext, queueClaim);
    const workGate = await context.controller.validateGate({
      runId: context.runId,
      operation: "work",
    });
    assert.equal(workGate.allowed, false);
    assert.equal(workGate.would_allow, true);
    assert.equal(workGate.simulation_only, true);
    assert.equal(workGate.mutation_authorized, false);

    const reserveError = await captureError(() =>
      context.store.reserve(reservation),
    );
    const armError = await captureError(() =>
      context.store.arm(reservation.dispatch_id, {
        expected_version: 0,
        action_gate: workGate,
        evidence_digest: reservation.effective_limits_digest,
      }),
    );
    const queueState = await attackerQueue.show(context.queueItemId);
    return {
      queue_gate: {
        allowed: queueGate.allowed,
        simulation_only: queueGate.simulation_only,
        mutation_authorized: queueGate.mutation_authorized,
      },
      work_gate: {
        allowed: workGate.allowed,
        simulation_only: workGate.simulation_only,
        mutation_authorized: workGate.mutation_authorized,
      },
      reserve_error: reserveError,
      arm_error: armError,
      event_count: await backgroundEventCount(
        context,
        reservation.dispatch_id,
        { missingAsZero: true },
      ),
      queue_dispatch_commit: queueState.dispatch_commit,
      host_dispatch_count: context.host.calls.length,
    };
  } finally {
    await context.cleanup();
  }
}

export async function runDistinctPolicySharedAggregatePool() {
  const { context, queueClaim } = await setupActivePilot(
    "PILOT-DISTINCT-RUN-POLICIES",
  );
  try {
    const other = await addActiveRun(context, "02", {
      policyOverrides: {
        approval_ttl_minutes: 30,
        background_aggregate_policy: {
          ...structuredClone(
            context.contract.policy.background_aggregate_policy,
          ),
          max_workers: 1,
        },
      },
    });
    const first = makeReservationInput(context, queueClaim);
    const second = makeReservationInput(other.context, other.queueClaim);
    const firstResult = await context.store.reserve(first);
    const secondResult = await context.store.reserve(second);
    return {
      run_policy_digests_differ:
        first.queue_claim.policy_digest !== second.queue_claim.policy_digest,
      aggregate_epoch_digests_match:
        first.aggregate_epoch_digest === second.aggregate_epoch_digest,
      run_aggregate_digests_differ:
        first.aggregate_policy_digest !== second.aggregate_policy_digest,
      states: [firstResult.record.state, secondResult.record.state],
      event_count:
        (await backgroundEventCount(context, first.dispatch_id)) +
        (await backgroundEventCount(context, second.dispatch_id)),
    };
  } finally {
    await context.cleanup();
  }
}
