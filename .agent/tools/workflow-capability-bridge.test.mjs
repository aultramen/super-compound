import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import test, { after } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createWorkflowCapabilityValidator } from "./action-adapter.mjs";
import { SUPPORTED_HOST_CAPABILITIES } from "./action-capability-model.mjs";
import { loadCanonicalProjectConfig } from "./project-config.mjs";
import { validateWorkflowAdmission } from "./workflow-admission.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NOW = "2026-07-21T23:00:00.000Z";
const EXPIRES = "2026-07-22T00:00:00.000Z";
const CONFIRMATION_DIGEST = `sha256:${"a".repeat(64)}`;
const AUTHORITY_DIGEST = `sha256:${"b".repeat(64)}`;
const POLICY_DIGEST = `sha256:${"c".repeat(64)}`;
const RUN_HEAD_DIGEST = `sha256:${"d".repeat(64)}`;
const VERIFIER_DIGEST = `sha256:${"e".repeat(64)}`;
const INVENTORY_DIGEST = `sha256:${"1".repeat(64)}`;
const HOST_EVIDENCE_DIGEST = `sha256:${"2".repeat(64)}`;
const STALE_DIGEST = `sha256:${"3".repeat(64)}`;

// Canonical fresh-installation DISABLED baseline; mirrors
// defaultConfigCandidate() in migrate-loop-v2.mjs, which is not exported.
function canonicalDisabledConfig() {
  return {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
    policy: {
      max_iterations: 100,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 5,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 60,
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [],
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
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
    },
    risk: {
      default_profile: "MEDIUM",
      maximum_autonomy: "INTERACTIVE",
      external_write_policy: "DENY",
    },
    write_classification: {
      runtime_audit_prefixes: [
        ".scratch/loop-runs/",
        ".scratch/loop-queue/",
        ".scratch/loop-runtime/",
        ".scratch/work-packages/",
      ],
      authority_prefixes: [".agent/evals/", "docs/brd/", "docs/fsd/", "docs/prd/"],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [
        "FINITE_NO_PROGRESS_CAP",
        "FINITE_RUNTIME_CAP",
        "ISOLATED_WORKTREE",
        "LEASE_RECOVERY",
      ],
      external_write: [
        "AUTHORITATIVE_READBACK",
        "COMPENSATION",
        "DURABLE_INTENT",
        "IDEMPOTENCY",
      ],
    },
    artifact_authority: {
      required_contract_version: "2.0.0",
      execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
      legacy_action: "REPLAN_REQUIRED",
    },
  };
}

async function createCanonicalDisabledConfigFixture() {
  const scratchRoot = path.join(ROOT, ".scratch", "test-fixtures");
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(
    path.join(scratchRoot, "workflow-capability-bridge-"),
  );
  const configPath = path.join(directory, "project-config.json");
  await writeFile(
    configPath,
    `${JSON.stringify(canonicalDisabledConfig(), null, 2)}\n`,
    "utf8",
  );
  return {
    directory,
    configFile: path.relative(ROOT, configPath).replaceAll("\\", "/"),
  };
}

const configFixture = await createCanonicalDisabledConfigFixture();
after(() => rm(configFixture.directory, { force: true, recursive: true }));

async function loadFixtureProjectConfig() {
  const loadedConfig = await loadCanonicalProjectConfig(ROOT, {
    configFile: configFixture.configFile,
  });
  assert.equal(loadedConfig.valid, true, JSON.stringify(loadedConfig.errors));
  assert.equal(loadedConfig.effective_mode, "DISABLED");
  return loadedConfig;
}

const PROJECT_CONFIG_DIGEST = (await loadFixtureProjectConfig()).config_digest;

function operation() {
  return {
    operation_id: "source-write",
    target_ref: "target.local.repository",
    write_class: "implementation_write",
    credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    egress_ids: [],
    idempotency: { required: true, key_scope: "RUN_OPERATION" },
    authoritative_readback: {
      required: true,
      strategy_ref: "strategy.local.readback",
    },
    compensation: { required: true, strategy_ref: "strategy.local.restore" },
    timeout_ms: 30_000,
    expires_at: EXPIRES,
    audit_sink_ref: "audit.local.loop-runtime",
    owner_ref: "owner.project",
    risk: "HIGH",
    human_gate: "REQUIRED",
    required_capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    required_isolation: "WORKTREE",
  };
}

function inventory() {
  return {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.test.workflow-bridge",
    project_config_digest: PROJECT_CONFIG_DIGEST,
    issued_at: NOW,
    expires_at: EXPIRES,
    operations: [operation()],
  };
}

function gate(input, overrides = {}) {
  return {
    allowed: true,
    would_allow: true,
    mutation_authorized: true,
    simulation_only: false,
    confirmation_digest: CONFIRMATION_DIGEST,
    authority_digest: AUTHORITY_DIGEST,
    policy_digest: POLICY_DIGEST,
    run_head_digest: RUN_HEAD_DIGEST,
    verifier_digest: VERIFIER_DIGEST,
    project_config_digest: PROJECT_CONFIG_DIGEST,
    operation_inventory_digest: INVENTORY_DIGEST,
    confirmed_risk_profile: "HIGH",
    confirmed_autonomy_profile: "INTERACTIVE",
    confirmed_required_gates: ["human-approval"],
    run_id: input.runId,
    run_version: 7,
    operation: input.operation,
    ...overrides,
  };
}

function attestation(overrides = {}) {
  return {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.test.workflow-bridge",
    host_ref: "host.test",
    run_id: "RUN-011",
    run_head_digest: RUN_HEAD_DIGEST,
    authority_digest: AUTHORITY_DIGEST,
    verifier_digest: VERIFIER_DIGEST,
    project_config_digest: PROJECT_CONFIG_DIGEST,
    operation_inventory_digest: INVENTORY_DIGEST,
    policy_digest: POLICY_DIGEST,
    approval_digest: CONFIRMATION_DIGEST,
    capabilities: [...SUPPORTED_HOST_CAPABILITIES],
    credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    egress_ids: [],
    isolation: "HARDENED",
    issued_at: NOW,
    expires_at: EXPIRES,
    evidence_digest: HOST_EVIDENCE_DIGEST,
    ...overrides,
  };
}

function policyAuthority(overrides = {}) {
  return {
    effective_policy: {
      allowlisted_operations: ["source-write"],
      credential_scopes: ["repo:read", "repo:write"],
      required_gates: ["human-approval"],
      isolation: "WORKTREE",
      risk: "HIGH",
      expires_at: EXPIRES,
      ...overrides,
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [],
      external_write: [],
    },
    execution_mode: "ENFORCE",
    autonomy_profile: "INTERACTIVE",
    external_write_policy: "DENY",
    project_egress_ids: ["egress.fake-provider"],
    policy_digest: POLICY_DIGEST,
  };
}

async function harness(policy = policyAuthority(), gateOverrides = {}) {
  const loadedConfig = await loadFixtureProjectConfig();
  assert.equal(loadedConfig.valid, true);
  const validateControllerGate = async (input) => gate(input, gateOverrides);
  return {
    loadedConfig,
    validateGate: validateControllerGate,
    validateActionCapability: createWorkflowCapabilityValidator({
      inventory: inventory(),
      inventoryDigest: INVENTORY_DIGEST,
      policyAuthority: policy,
      now: () => NOW,
      validateControllerGate,
      verifyHostAttestation: async (value, binding) => ({
        verified:
          value?.run_id === binding.run_id &&
          value?.run_head_digest === binding.run_head_digest &&
          binding.inventory_digest === INVENTORY_DIGEST,
        evidence_digest: value?.evidence_digest,
      }),
    }),
  };
}

function request(capabilityAttestation = attestation(), overrides = {}) {
  return {
    route: "sc-work",
    intent: { path: ".agent/tools/example.mjs" },
    runId: "RUN-011",
    operation: "source-write",
    capabilityAttestation,
    ...overrides,
  };
}

test("shipped bridge converts trusted controller and adapter evidence into admission", async () => {
  const dependencies = await harness();
  const result = await validateWorkflowAdmission(ROOT, request(), dependencies);

  assert.equal(result.allowed, true, JSON.stringify(result));
  assert.equal(result.mutation_authorized, true);
  assert.match(result.gate_evidence.intent_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(
    result.gate_evidence.hard_write_interceptor_digest,
    /^sha256:[a-f0-9]{64}$/u,
  );
  assert.deepEqual(result.gate_evidence, {
    run_id: "RUN-011",
    run_version: 7,
    confirmation_digest: CONFIRMATION_DIGEST,
    authority_digest: AUTHORITY_DIGEST,
    policy_digest: POLICY_DIGEST,
    operation: "source-write",
    run_head_digest: RUN_HEAD_DIGEST,
    verifier_digest: VERIFIER_DIGEST,
    project_config_digest: PROJECT_CONFIG_DIGEST,
    operation_inventory_digest: INVENTORY_DIGEST,
    host_capability_digest: HOST_EVIDENCE_DIGEST,
    confirmed_risk_profile: "HIGH",
    confirmed_autonomy_profile: "INTERACTIVE",
    confirmed_required_gates: ["human-approval"],
    intent_path: ".agent/tools/example.mjs",
    intent_digest: result.gate_evidence.intent_digest,
    config_version: 1,
    hard_write_interceptor_digest:
      result.gate_evidence.hard_write_interceptor_digest,
    mode_version: 0,
  });
});

test("TEST-014 background admission consumes one capability-bound dispatch authorization", async () => {
  const loadedConfig = await loadFixtureProjectConfig();
  const backgroundGate = (input) =>
    gate(input, {
      confirmed_autonomy_profile: "BACKGROUND",
      action_id: "action.goal014.bridge001",
      idempotency_key: "run.goal014.bridge001",
      controller_intent_digest: STALE_DIGEST,
    });
  const validateControllerGate = async (input) => backgroundGate(input);
  let dispatchCalls = 0;
  const validateActionCapability = createWorkflowCapabilityValidator({
    inventory: inventory(),
    inventoryDigest: INVENTORY_DIGEST,
    policyAuthority: {
      ...policyAuthority(),
      autonomy_profile: "BACKGROUND",
    },
    now: () => NOW,
    validateControllerGate,
    verifyHostAttestation: async (value) => ({
      verified: true,
      evidence_digest: value?.evidence_digest,
    }),
    validateBackgroundDispatch: async ({
      dispatchId,
      request: actionRequest,
      gate: actionGate,
      attestation: hostAttestation,
    }) => {
      dispatchCalls += 1;
      return {
        schema: "background_action_authorization_v2",
        contract_version: "2.0.0",
        dispatch_id: dispatchId,
        operation: actionGate.operation,
        run_id: actionRequest.run_id,
        queue_item_id: "queue.goal014.bridge001",
        lease_id: "lease.goal014.bridge001",
        worker_ref: "worker.goal014.bridge001",
        worktree_ref: "worktree.goal014.bridge001",
        action_id: actionGate.action_id,
        idempotency_key: actionGate.idempotency_key,
        controller_intent_digest: actionGate.controller_intent_digest,
        action_run_head_digest: actionGate.run_head_digest,
        policy_digest: actionGate.policy_digest,
        confirmation_digest: actionGate.confirmation_digest,
        host_binding: {
          attestation_id: hostAttestation.attestation_id,
          host_ref: hostAttestation.host_ref,
          evidence_digest: hostAttestation.evidence_digest,
          expires_at: hostAttestation.expires_at,
          effective_isolation: hostAttestation.isolation,
          required_capabilities: [...hostAttestation.capabilities],
        },
        expires_at: EXPIRES,
      };
    },
  });

  const result = await validateWorkflowAdmission(
    ROOT,
    request(attestation(), {
      backgroundDispatchId: "dispatch.goal014.bridge001",
    }),
    {
      loadedConfig,
      validateGate: validateControllerGate,
      validateActionCapability,
      now: () => NOW,
    },
  );

  assert.equal(result.allowed, true, JSON.stringify(result));
  assert.equal(dispatchCalls, 1);
  assert.equal(
    result.gate_evidence.background_dispatch.dispatch_id,
    "dispatch.goal014.bridge001",
  );
  assert.equal(result.gate_evidence.background_dispatch.operation, "source-write");
});

test("bridge denies stale attestation and ignores caller attempts to widen policy", async () => {
  const dependencies = await harness();
  const stale = await validateWorkflowAdmission(
    ROOT,
    request(attestation({ run_head_digest: STALE_DIGEST })),
    dependencies,
  );
  assert.equal(stale.allowed, false);
  assert.equal(stale.reason, "CAPABILITY_ATTESTATION_INVALID");

  const restricted = await harness({
    ...policyAuthority({ allowlisted_operations: [] }),
  });
  const widenedByCaller = await validateWorkflowAdmission(
    ROOT,
    request(attestation(), {
      policyAuthority: policyAuthority(),
      requested_credential_scopes: {
        read: ["repo:read"],
        write: ["repo:write", "repo:admin"],
      },
    }),
    restricted,
  );
  assert.equal(widenedByCaller.allowed, false);
  assert.equal(widenedByCaller.reason, "CAPABILITY_ATTESTATION_INVALID");
});

test("bridge cannot elevate confirmation risk or alter confirmed policy gates", async () => {
  for (const [label, overrides, requestOverrides = {}] of [
    ["risk", { confirmed_risk_profile: "MEDIUM" }],
    [
      "autonomy",
      { confirmed_autonomy_profile: "BACKGROUND" },
      { backgroundDispatchId: "dispatch.goal014.unapproved001" },
    ],
    ["missing gate", { confirmed_required_gates: [] }],
    ["extra gate", { confirmed_required_gates: ["human-approval", "self-approved"] }],
  ]) {
    const result = await validateWorkflowAdmission(
      ROOT,
      request(attestation(), { risk_profile: "HIGH", ...requestOverrides }),
      await harness(policyAuthority(), overrides),
    );
    assert.equal(result.allowed, false, label);
    assert.equal(result.reason, "CAPABILITY_ATTESTATION_INVALID", label);
  }

  const reordered = await validateWorkflowAdmission(
    ROOT,
    request(),
    await harness(
      policyAuthority({ required_gates: ["human-approval", "fresh-verifier"] }),
      { confirmed_required_gates: ["fresh-verifier", "human-approval"] },
    ),
  );
  assert.equal(reordered.allowed, true);
});
