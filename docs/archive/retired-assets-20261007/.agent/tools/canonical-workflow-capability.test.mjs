import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createCanonicalWorkflowCapabilityValidator } from "./action-adapter.mjs";
import { SUPPORTED_HOST_CAPABILITIES } from "./action-capability-model.mjs";
import { loadCanonicalProjectConfig } from "./project-config.mjs";
import { validateWorkflowAdmission } from "./workflow-admission.mjs";

const NOW = "2026-07-21T23:00:00.000Z";
const EXPIRES = "2026-07-22T01:00:00.000Z";
const CONFIRMATION_DIGEST = `sha256:${"a".repeat(64)}`;
const AUTHORITY_DIGEST = `sha256:${"b".repeat(64)}`;
const POLICY_DIGEST = `sha256:${"c".repeat(64)}`;
const RUN_HEAD_DIGEST = `sha256:${"d".repeat(64)}`;
const VERIFIER_DIGEST = `sha256:${"e".repeat(64)}`;
const HOST_EVIDENCE_DIGEST = `sha256:${"f".repeat(64)}`;

function digest(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

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

function inventory(projectConfigDigest, overrides = {}) {
  return {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.test.canonical-bridge",
    project_config_digest: projectConfigDigest,
    issued_at: NOW,
    expires_at: EXPIRES,
    operations: [operation()],
    ...overrides,
  };
}

function policyAuthority() {
  return {
    effective_policy: {
      allowlisted_operations: ["source-write"],
      credential_scopes: ["repo:read", "repo:write"],
      required_gates: ["human-approval"],
      isolation: "WORKTREE",
      risk: "HIGH",
      expires_at: EXPIRES,
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

function gate(input, projectConfigDigest, inventoryDigest) {
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
    project_config_digest: projectConfigDigest,
    operation_inventory_digest: inventoryDigest,
    confirmed_risk_profile: "HIGH",
    confirmed_autonomy_profile: "INTERACTIVE",
    confirmed_required_gates: ["human-approval"],
    run_id: input.runId,
    run_version: 7,
    operation: input.operation,
  };
}

function attestation(projectConfigDigest, inventoryDigest) {
  return {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.test.canonical-bridge",
    host_ref: "host.test",
    run_id: "RUN-CANONICAL-011",
    run_head_digest: RUN_HEAD_DIGEST,
    authority_digest: AUTHORITY_DIGEST,
    verifier_digest: VERIFIER_DIGEST,
    project_config_digest: projectConfigDigest,
    operation_inventory_digest: inventoryDigest,
    policy_digest: POLICY_DIGEST,
    approval_digest: CONFIRMATION_DIGEST,
    capabilities: [...SUPPORTED_HOST_CAPABILITIES],
    credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    egress_ids: [],
    isolation: "HARDENED",
    issued_at: NOW,
    expires_at: EXPIRES,
    evidence_digest: HOST_EVIDENCE_DIGEST,
  };
}

async function repository() {
  const root = await mkdtemp(path.join(tmpdir(), "canonical-capability-"));
  const context = path.join(root, ".agent", "context");
  const schemas = path.join(context, "schemas");
  await mkdir(schemas, { recursive: true });
  const projectConfigText = await readFile(
    new URL("../context/project-config.json", import.meta.url),
    "utf8",
  );
  for (const schema of [
    "project-config-v2.schema.json",
    "operation-inventory-v2.schema.json",
  ]) {
    await writeFile(
      path.join(schemas, schema),
      await readFile(new URL(`../context/schemas/${schema}`, import.meta.url)),
    );
  }
  await writeFile(path.join(context, "project-config.json"), projectConfigText);
  const projectConfigDigest = digest(projectConfigText);
  const inventoryText = `${JSON.stringify(inventory(projectConfigDigest), null, 2)}\n`;
  await writeFile(path.join(context, "operation-inventory.json"), inventoryText);
  return {
    inventoryPath: path.join(context, "operation-inventory.json"),
    inventoryText,
    inventoryDigest: digest(inventoryText),
    projectConfigDigest,
    root,
  };
}

async function validatorFor(fixture, expectedInventoryDigest = fixture.inventoryDigest) {
  const validateControllerGate = async (input) =>
    gate(input, fixture.projectConfigDigest, expectedInventoryDigest);
  return createCanonicalWorkflowCapabilityValidator(fixture.root, {
    expectedProjectConfigDigest: fixture.projectConfigDigest,
    policyAuthority: policyAuthority(),
    now: () => NOW,
    validateControllerGate,
    verifyHostAttestation: async (value) => ({
      verified: value?.evidence_digest === HOST_EVIDENCE_DIGEST,
      evidence_digest: value?.evidence_digest,
    }),
  });
}

test("canonical bytes bind inventory digest through host proof and workflow admission", async () => {
  const fixture = await repository();
  try {
    const loadedConfig = await loadCanonicalProjectConfig(fixture.root);
    assert.equal(loadedConfig.valid, true);
    const result = await validateWorkflowAdmission(
      fixture.root,
      {
        route: "sc-work",
        intent: { path: ".agent/tools/example.mjs" },
        runId: "RUN-CANONICAL-011",
        operation: "source-write",
        capabilityAttestation: attestation(
          fixture.projectConfigDigest,
          fixture.inventoryDigest,
        ),
      },
      {
        loadedConfig,
        validateGate: async (input) =>
          gate(input, fixture.projectConfigDigest, fixture.inventoryDigest),
        validateActionCapability: await validatorFor(fixture),
      },
    );
    assert.equal(result.allowed, true);
    assert.equal(
      result.gate_evidence.operation_inventory_digest,
      fixture.inventoryDigest,
    );

    const changed = inventory(fixture.projectConfigDigest);
    changed.operations[0].target_ref = "target.local.changed";
    await writeFile(
      fixture.inventoryPath,
      `${JSON.stringify(changed, null, 2)}\n`,
    );
    const stale = await validateWorkflowAdmission(
      fixture.root,
      {
        route: "sc-work",
        intent: { path: ".agent/tools/example.mjs" },
        runId: "RUN-CANONICAL-011",
        operation: "source-write",
        capabilityAttestation: attestation(
          fixture.projectConfigDigest,
          fixture.inventoryDigest,
        ),
      },
      {
        loadedConfig,
        validateGate: async (input) =>
          gate(input, fixture.projectConfigDigest, fixture.inventoryDigest),
        validateActionCapability: await validatorFor(fixture),
      },
    );
    assert.equal(stale.allowed, false);
    assert.equal(stale.reason, "CAPABILITY_ATTESTATION_INVALID");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("TEST-014 canonical factory preserves the background dispatch validator", async () => {
  const fixture = await repository();
  try {
    const backgroundPolicy = {
      ...policyAuthority(),
      autonomy_profile: "BACKGROUND",
    };
    const intentDigest = `sha256:${"1".repeat(64)}`;
    const controllerGate = {
      ...gate(
        { runId: "RUN-CANONICAL-011", operation: "source-write" },
        fixture.projectConfigDigest,
        fixture.inventoryDigest,
      ),
      confirmed_autonomy_profile: "BACKGROUND",
      action_id: "action.goal014.canonical001",
      idempotency_key: "run.goal014.canonical001",
      controller_intent_digest: AUTHORITY_DIGEST,
      intent_path: ".agent/tools/example.mjs",
      intent_digest: intentDigest,
    };
    let dispatchCalls = 0;
    const validator = await createCanonicalWorkflowCapabilityValidator(
      fixture.root,
      {
        expectedProjectConfigDigest: fixture.projectConfigDigest,
        policyAuthority: backgroundPolicy,
        now: () => NOW,
        validateControllerGate: async () => controllerGate,
        verifyHostAttestation: async (value) => ({
          verified: true,
          evidence_digest: value?.evidence_digest,
        }),
        validateBackgroundDispatch: async ({
          dispatchId,
          gate: actionGate,
          attestation: hostAttestation,
        }) => {
          dispatchCalls += 1;
          return {
            schema: "background_action_authorization_v2",
            contract_version: "2.0.0",
            dispatch_id: dispatchId,
            operation: actionGate.operation,
            run_id: actionGate.run_id,
            queue_item_id: "queue.goal014.canonical001",
            lease_id: "lease.goal014.canonical001",
            worker_ref: "worker.goal014.canonical001",
            worktree_ref: "worktree.goal014.canonical001",
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
      },
    );
    const result = await validator({
      runId: "RUN-CANONICAL-011",
      operation: "source-write",
      writeClass: "implementation_write",
      gate: controllerGate,
      attestation: attestation(
        fixture.projectConfigDigest,
        fixture.inventoryDigest,
      ),
      intentBinding: {
        intent_path: ".agent/tools/example.mjs",
        intent_digest: intentDigest,
      },
      backgroundDispatchId: "dispatch.goal014.canonical001",
    });

    assert.equal(result.allowed, true);
    assert.equal(dispatchCalls, 1);
    assert.equal(
      result.background_dispatch.dispatch_id,
      "dispatch.goal014.canonical001",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("canonical factory rejects config mismatch and expired inventory", async () => {
  const fixture = await repository();
  try {
    await writeFile(
      fixture.inventoryPath,
      `${JSON.stringify(inventory(AUTHORITY_DIGEST), null, 2)}\n`,
    );
    await assert.rejects(
      validatorFor(fixture),
      /PROJECT_CONFIG_BINDING_MISMATCH/,
    );

    await writeFile(
      fixture.inventoryPath,
      `${JSON.stringify(
        inventory(fixture.projectConfigDigest, { expires_at: NOW }),
        null,
        2,
      )}\n`,
    );
    await assert.rejects(
      validatorFor(fixture),
      /ACTION_INVENTORY_EXPIRED_OR_NOT_YET_VALID/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
