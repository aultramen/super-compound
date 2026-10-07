import assert from "node:assert/strict";
import test from "node:test";

import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createActionAdapter,
  loadCanonicalOperationInventory,
} from "./action-adapter.mjs";
import { SUPPORTED_HOST_CAPABILITIES } from "./action-capability-model.mjs";
import { createExternalActionStore } from "./external-action-store.mjs";

const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const D3 = `sha256:${"c".repeat(64)}`;
const NOW = "2026-07-21T22:30:00.000Z";
const EXPIRES = "2026-07-21T23:30:00.000Z";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("canonical reference inventory is confined, config-bound, immutable, and empty", async () => {
  const loaded = await loadCanonicalOperationInventory(ROOT, {
    expectedProjectConfigDigest:
      "sha256:67727ba523cdd472d09b963ca8b7bf483e4a30aa08e48ed85a9b4de819966a3d",
    now: NOW,
  });
  assert.equal(loaded.valid, true);
  assert.match(loaded.inventory_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(loaded.inventory.operations, []);
  assert.equal(Object.isFrozen(loaded.inventory), true);
  await assert.rejects(
    () =>
      loadCanonicalOperationInventory(ROOT, {
        expectedProjectConfigDigest: D2,
        now: NOW,
      }),
    /PROJECT_CONFIG_BINDING_MISMATCH/,
  );
  await assert.rejects(
    () =>
      loadCanonicalOperationInventory(ROOT, {
        expectedProjectConfigDigest:
          "sha256:67727ba523cdd472d09b963ca8b7bf483e4a30aa08e48ed85a9b4de819966a3d",
        now: "July 21, 2026 22:30:00 GMT",
      }),
    /ACTION_INVENTORY_EXPIRED_OR_NOT_YET_VALID/,
  );
});

function fixture() {
  const operation = {
    operation_id: "fake.source.write",
    target_ref: "target.local.test",
    write_class: "implementation_write",
    credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    egress_ids: [],
    idempotency: { required: true, key_scope: "RUN_OPERATION" },
    authoritative_readback: { required: true, strategy_ref: "strategy.local.readback" },
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
  const inventory = {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.test",
    project_config_digest: D1,
    issued_at: NOW,
    expires_at: EXPIRES,
    operations: [operation],
  };
  const attestation = {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.test",
    host_ref: "host.test",
    run_id: "LER2-GOAL-011-01",
    run_head_digest: D1,
    authority_digest: D2,
    verifier_digest: D3,
    project_config_digest: D1,
    operation_inventory_digest: D2,
    policy_digest: D3,
    approval_digest: D1,
    capabilities: [...SUPPORTED_HOST_CAPABILITIES],
    credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    egress_ids: [],
    isolation: "HARDENED",
    issued_at: NOW,
    expires_at: EXPIRES,
    evidence_digest: D2,
  };
  const request = {
    operation_id: operation.operation_id,
    run_id: attestation.run_id,
    run_head_digest: D1,
    authority_digest: D2,
    verifier_digest: D3,
    project_config_digest: D1,
    operation_inventory_digest: D2,
    policy_digest: D3,
    approval_digest: D1,
    write_class: operation.write_class,
    risk_profile: "HIGH",
    autonomy_profile: "INTERACTIVE",
    required_gates: ["human-approval"],
    requested_credential_scopes: { read: ["repo:read"], write: ["repo:write"] },
    requested_egress_ids: [],
    requested_isolation: "WORKTREE",
  };
  return { inventory, attestation, request };
}

function policy() {
  return {
    effective_policy: {
      allowlisted_operations: ["fake.source.write"],
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
  };
}

function allowedControllerGate(request) {
  return {
    allowed: true,
    mutation_authorized: true,
    run_id: request.run_id,
    operation: request.operation_id,
    confirmation_digest: request.approval_digest,
    authority_digest: request.authority_digest,
    policy_digest: request.policy_digest,
    run_head_digest: request.run_head_digest,
    verifier_digest: request.verifier_digest,
    project_config_digest: request.project_config_digest,
    operation_inventory_digest: request.operation_inventory_digest,
    confirmed_risk_profile: request.risk_profile,
    confirmed_autonomy_profile: request.autonomy_profile,
    confirmed_required_gates: [...request.required_gates],
    action_id: "action-001",
    idempotency_key: "key-001",
    controller_intent_digest: D2,
  };
}

test("TEST-014 background action requires a live durable dispatch ticket", async () => {
  const value = fixture();
  value.request.autonomy_profile = "BACKGROUND";
  const backgroundPolicy = {
    ...policy(),
    autonomy_profile: "BACKGROUND",
    policy_digest: D3,
  };
  const dependencies = {
    policyAuthority: backgroundPolicy,
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => allowedControllerGate(value.request),
  };
  assert.throws(
    () => createActionAdapter(dependencies),
    /BACKGROUND_DISPATCH_VALIDATOR_REQUIRED/,
  );
  let calls = 0;
  let authorizedHostRef = value.attestation.host_ref;
  const adapter = createActionAdapter({
    ...dependencies,
    validateBackgroundDispatch: async ({ dispatchId, request, gate, attestation }) => {
      calls += 1;
      assert.equal(dispatchId, "dispatch.goal014.action001");
      assert.deepEqual(attestation, value.attestation);
      return {
        schema: "background_action_authorization_v2",
        contract_version: "2.0.0",
        dispatch_id: dispatchId,
        operation: request.operation_id,
        run_id: request.run_id,
        queue_item_id: "queue.goal014.item001",
        lease_id: "lease.goal014.001",
        worker_ref: "worker.goal014.001",
        worktree_ref: "worktree.goal014.001",
        action_id: gate.action_id,
        idempotency_key: gate.idempotency_key,
        controller_intent_digest: gate.controller_intent_digest,
        action_run_head_digest: gate.run_head_digest,
        policy_digest: request.policy_digest,
        confirmation_digest: request.approval_digest,
        host_binding: {
          attestation_id: attestation.attestation_id,
          host_ref: authorizedHostRef,
          evidence_digest: attestation.evidence_digest,
          expires_at: attestation.expires_at,
          effective_isolation: attestation.isolation,
          required_capabilities: [
            "DURABLE_LOCAL_STATE",
            "HARD_WRITE_INTERCEPTION",
          ],
        },
        expires_at: EXPIRES,
      };
    },
  });
  const plan = await adapter.plan({
    request: value.request,
    attestation: value.attestation,
    background_dispatch_id: "dispatch.goal014.action001",
  });
  assert.equal(calls, 1);
  assert.equal(plan.background_dispatch.dispatch_id, "dispatch.goal014.action001");
  assert.equal(plan.background_dispatch.operation, "fake.source.write");
  assert.equal(plan.background_dispatch.queue_item_id, "queue.goal014.item001");
  assert.equal(plan.background_dispatch.host_binding.host_ref, "host.test");

  authorizedHostRef = "host.other";
  await assert.rejects(
    () =>
      adapter.plan({
        request: value.request,
        attestation: value.attestation,
        background_dispatch_id: "dispatch.goal014.action001",
      }),
    /BACKGROUND_DISPATCH_INVALID/,
  );
});

function externalFixture() {
  const value = fixture();
  value.inventory.operations[0] = {
    ...value.inventory.operations[0],
    operation_id: "fake.external.write",
    write_class: "external_write",
    egress_ids: ["egress.fake-provider"],
    required_capabilities: [...SUPPORTED_HOST_CAPABILITIES],
  };
  value.request = {
    ...value.request,
    operation_id: "fake.external.write",
    write_class: "external_write",
    requested_egress_ids: ["egress.fake-provider"],
  };
  value.attestation = {
    ...value.attestation,
    egress_ids: ["egress.fake-provider"],
  };
  return value;
}

test("reference adapter has the exact four-method host-neutral interface", () => {
  const adapter = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: fixture().inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => ({
      allowed: true,
      mutation_authorized: true,
      run_id: "LER2-GOAL-011-01",
      operation: "fake.source.write",
      confirmation_digest: D1,
      authority_digest: D2,
      policy_digest: D3,
    }),
  });
  assert.deepEqual(Object.keys(adapter).sort(), ["compensate", "executeOnce", "plan", "queryOutcome"]);
});

test("plan requires trusted host proof and exact controller-gate binding", async () => {
  const value = fixture();
  let verificationCalls = 0;
  let gateCalls = 0;
  const adapter = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => {
      verificationCalls += 1;
      return { verified: true, evidence_digest: D2 };
    },
    validateControllerGate: async () => {
      gateCalls += 1;
      return allowedControllerGate(value.request);
    },
  });

  const plan = await adapter.plan({ ...value, ...policy() });
  assert.equal(plan.schema, "action_plan_v2");
  assert.equal(plan.authorized, true);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(verificationCalls, 1);
  assert.equal(gateCalls, 1);

  const restrictedPolicy = policy();
  restrictedPolicy.effective_policy = {
    ...restrictedPolicy.effective_policy,
    allowlisted_operations: [],
  };
  const restricted = createActionAdapter({
    inventory: value.inventory,
    inventoryDigest: D2,
    policyAuthority: { ...restrictedPolicy, policy_digest: D3 },
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => allowedControllerGate(value.request),
  });
  await assert.rejects(
    () => restricted.plan({ ...value, ...policy() }),
    /OPERATION_NOT_ALLOWLISTED/,
    "caller policy fields must not widen trusted constructor authority",
  );

  const forged = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: false, evidence_digest: D2 }),
    validateControllerGate: async () => ({ allowed: true }),
  });
  await assert.rejects(() => forged.plan({ ...value, ...policy() }), /HOST_ATTESTATION_UNVERIFIED/);
});

test("every effect boundary revalidates, then denies because GOAL-013 protocol is absent", async () => {
  const value = fixture();
  let gateCalls = 0;
  const adapter = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => {
      gateCalls += 1;
      return allowedControllerGate(value.request);
    },
  });
  const input = { ...value, ...policy() };
  const plan = await adapter.plan(input);
  assert.equal(gateCalls, 1);

  for (const method of ["executeOnce", "queryOutcome", "compensate"]) {
    await assert.rejects(() => adapter[method](plan, input), /GOAL-013|DURABLE_ACTION_PROTOCOL_REQUIRED/);
  }
  assert.equal(gateCalls, 4, "each boundary must revalidate before denying dispatch");
});

test("plans cannot be forged or replayed across an adapter instance", async () => {
  const value = fixture();
  const dependencies = {
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => allowedControllerGate(value.request),
  };
  const first = createActionAdapter(dependencies);
  const second = createActionAdapter(dependencies);
  const input = { ...value, ...policy() };
  const plan = await first.plan(input);
  await assert.rejects(() => second.executeOnce(plan, input), /ACTION_PLAN_NOT_TRUSTED/);
});

test("adapter snapshots trusted inventory before any caller mutation", async () => {
  const value = fixture();
  const mutableInventory = { ...value.inventory, operations: [] };
  const adapter = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: mutableInventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => allowedControllerGate(value.request),
  });

  mutableInventory.operations.push(value.inventory.operations[0]);
  await assert.rejects(
    () => adapter.plan(value),
    /OPERATION_NOT_IN_INVENTORY/,
  );
});

test("adapter snapshots untrusted attestation before asynchronous verification", async () => {
  const value = fixture();
  const mutableAttestation = {
    ...value.attestation,
    capabilities: [],
    credential_scopes: { read: [], write: [] },
    isolation: "NONE",
  };
  let enterVerification;
  let releaseVerification;
  const verificationEntered = new Promise((resolve) => {
    enterVerification = resolve;
  });
  const verificationReleased = new Promise((resolve) => {
    releaseVerification = resolve;
  });
  let observedAttestation;
  const adapter = createActionAdapter({
    policyAuthority: { ...policy(), policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async (candidate) => {
      observedAttestation = structuredClone(candidate);
      enterVerification();
      await verificationReleased;
      return { verified: true, evidence_digest: D2 };
    },
    validateControllerGate: async () => allowedControllerGate(value.request),
  });

  const pending = adapter.plan({
    request: value.request,
    attestation: mutableAttestation,
  });
  await verificationEntered;
  mutableAttestation.capabilities.push(...SUPPORTED_HOST_CAPABILITIES);
  mutableAttestation.credential_scopes.read.push("repo:read");
  mutableAttestation.credential_scopes.write.push("repo:write");
  mutableAttestation.isolation = "HARDENED";
  releaseVerification();

  await assert.rejects(
    pending,
    /CAPABILITY_REQUIRED|CREDENTIAL_SCOPE_DENIED|ISOLATION_INSUFFICIENT/,
  );
  assert.deepEqual(observedAttestation.capabilities, []);
  assert.deepEqual(observedAttestation.credential_scopes.write, []);
  assert.equal(observedAttestation.isolation, "NONE");
});

test("durable external execution dispatches once and recovers by authoritative readback", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-action-adapter-"));
  await mkdir(path.join(root, ".scratch", "loop-runtime"), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  const value = externalFixture();
  const externalPolicy = {
    ...policy(),
    effective_policy: {
      ...policy().effective_policy,
      allowlisted_operations: ["fake.external.write"],
    },
    external_write_policy: "ALLOWLIST_ONLY",
  };
  let effects = 0;
  let readbacks = 0;
  let compensations = 0;
  let gateIdentity = {
    action_id: "action-001",
    idempotency_key: "key-001",
    controller_intent_digest: D2,
  };
  const currentGate = () => ({
    ...allowedControllerGate(value.request),
    ...gateIdentity,
  });
  const driver = {
    async executeOnce(command) {
      effects += 1;
      assert.equal(command.idempotency_key, "key-001");
      return { receipt_digest: D3 };
    },
    async queryOutcome(command) {
      readbacks += 1;
      assert.ok(
        ["key-001", "compensation-key-001"].includes(
          command.idempotency_key,
        ),
      );
      return { outcome: "APPLIED", target_audit_digest: D1 };
    },
    async compensate(command) {
      compensations += 1;
      assert.equal(command.idempotency_key, "compensation-key-001");
      assert.match(command.parent_action_digest, /^sha256:[a-f0-9]{64}$/u);
      return { receipt_digest: D2 };
    },
  };
  const dependencies = {
    policyAuthority: { ...externalPolicy, policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => currentGate(),
    validateReconciliationGate: async () => ({
      ...currentGate(),
      mutation_authorized: false,
      readback_authorized: true,
    }),
    externalActionStore: createExternalActionStore(root),
    effectDriver: driver,
  };
  const input = { request: value.request, attestation: value.attestation };
  const first = createActionAdapter(dependencies);
  const plan = await first.plan(input);
  const receipt = await first.executeOnce(plan, "key-001", input);
  assert.equal(receipt.state, "RESPONSE_RECEIVED");
  assert.equal(effects, 1);

  const observed = await first.queryOutcome(receipt, input);
  assert.equal(observed.acknowledged, true);
  assert.equal(observed.outcome, "APPLIED");
  assert.equal(readbacks, 1);

  const recovered = createActionAdapter({
    ...dependencies,
    externalActionStore: createExternalActionStore(root),
  });
  const recoveredPlan = await recovered.plan(input);
  const recoveredReceipt = await recovered.executeOnce(
    recoveredPlan,
    "key-001",
    input,
  );
  assert.equal(recoveredReceipt.outcome, "APPLIED");
  assert.equal(effects, 1, "restart must not dispatch the same key again");

  gateIdentity = {
    action_id: "compensation-action-001",
    idempotency_key: "compensation-key-001",
    controller_intent_digest: D3,
  };
  const compensationReceipt = await recovered.compensate(observed, input);
  assert.equal(compensationReceipt.kind, "COMPENSATE");
  assert.equal(compensationReceipt.idempotency_key, "compensation-key-001");
  assert.equal(compensations, 1);
  const compensationResult = await recovered.queryOutcome(
    compensationReceipt,
    input,
  );
  assert.equal(compensationResult.outcome, "APPLIED");
  assert.equal(compensationResult.acknowledged, true);
});

test("concurrent executeOnce calls reserve exactly one provider dispatch", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-action-race-"));
  await mkdir(path.join(root, ".scratch", "loop-runtime"), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  const value = externalFixture();
  const externalPolicy = {
    ...policy(),
    effective_policy: {
      ...policy().effective_policy,
      allowlisted_operations: ["fake.external.write"],
    },
    external_write_policy: "ALLOWLIST_ONLY",
  };
  let dispatches = 0;
  let intentArrivals = 0;
  let releaseIntents;
  const intentsReady = new Promise((resolve) => {
    releaseIntents = resolve;
  });
  const dependencies = {
    policyAuthority: { ...externalPolicy, policy_digest: D3 },
    inventory: value.inventory,
    inventoryDigest: D2,
    now: () => NOW,
    verifyHostAttestation: async () => ({ verified: true, evidence_digest: D2 }),
    validateControllerGate: async () => allowedControllerGate(value.request),
    validateReconciliationGate: async () => ({
      ...allowedControllerGate(value.request),
      mutation_authorized: false,
      readback_authorized: true,
    }),
    externalActionStore: createExternalActionStore(root),
    effectHooks: {
      async afterIntentPersisted() {
        intentArrivals += 1;
        if (intentArrivals === 2) releaseIntents();
        await intentsReady;
      },
    },
    effectDriver: {
      async executeOnce() {
        dispatches += 1;
        await new Promise((resolve) => setImmediate(resolve));
        return { receipt_digest: D3 };
      },
      async queryOutcome() {
        return { outcome: "APPLIED", target_audit_digest: D1 };
      },
      async compensate() {
        throw new Error("not used");
      },
    },
  };
  const input = { request: value.request, attestation: value.attestation };
  const first = createActionAdapter(dependencies);
  const second = createActionAdapter(dependencies);
  const [firstPlan, secondPlan] = await Promise.all([
    first.plan(input),
    second.plan(input),
  ]);
  const results = await Promise.allSettled([
    first.executeOnce(firstPlan, "key-001", input),
    second.executeOnce(secondPlan, "key-001", input),
  ]);

  assert.equal(dispatches, 1);
  assert.ok(results.some((result) => result.status === "fulfilled"));
});

test("five external-effect fault points after queue claim never produce more than one effect per key", async (t) => {
  const points = [
    "afterIntentPersisted",
    "afterDispatch",
    "afterResponse",
    "afterResultPersisted",
    "beforeAcknowledge",
  ];
  for (const point of points) {
    const root = await mkdtemp(path.join(os.tmpdir(), `sc-fault-${point}-`));
    await mkdir(path.join(root, ".scratch", "loop-runtime"), {
      recursive: true,
    });
    t.after(() => rm(root, { recursive: true, force: true }));
    const value = externalFixture();
    const externalPolicy = {
      ...policy(),
      effective_policy: {
        ...policy().effective_policy,
        allowlisted_operations: ["fake.external.write"],
      },
      external_write_policy: "ALLOWLIST_ONLY",
    };
    const applied = new Map();
    let effectCount = 0;
    let crashed = false;
    const effectHooks = {
      [point]() {
        if (!crashed) {
          crashed = true;
          throw new Error(`CRASH_${point}`);
        }
      },
    };
    const driver = {
      async executeOnce(command) {
        if (!applied.has(command.idempotency_key)) {
          effectCount += 1;
          applied.set(command.idempotency_key, D3);
        }
        return { receipt_digest: applied.get(command.idempotency_key) };
      },
      async queryOutcome(command) {
        return applied.has(command.idempotency_key)
          ? { outcome: "APPLIED", target_audit_digest: D1 }
          : { outcome: "NOT_APPLIED", target_audit_digest: D2 };
      },
      async compensate() {
        throw new Error("not used");
      },
    };
    const baseDependencies = {
      policyAuthority: { ...externalPolicy, policy_digest: D3 },
      inventory: value.inventory,
      inventoryDigest: D2,
      now: () => NOW,
      verifyHostAttestation: async () => ({
        verified: true,
        evidence_digest: D2,
      }),
      validateControllerGate: async () => allowedControllerGate(value.request),
      validateReconciliationGate: async () => ({
        ...allowedControllerGate(value.request),
        mutation_authorized: false,
        readback_authorized: true,
      }),
      effectDriver: driver,
    };
    const input = { request: value.request, attestation: value.attestation };
    let adapter = createActionAdapter({
      ...baseDependencies,
      externalActionStore: createExternalActionStore(root),
      effectHooks,
    });
    let plan = await adapter.plan(input);
    let receipt;
    try {
      receipt = await adapter.executeOnce(plan, "key-001", input);
    } catch (error) {
      assert.match(error.message, new RegExp(`CRASH_${point}`));
    }

    adapter = createActionAdapter({
      ...baseDependencies,
      externalActionStore: createExternalActionStore(root),
    });
    plan = await adapter.plan(input);
    receipt ??= await adapter.executeOnce(plan, "key-001", input);
    let result;
    try {
      result = await adapter.queryOutcome(receipt, input);
    } catch (error) {
      assert.match(error.message, new RegExp(`CRASH_${point}`));
    }
    if (result === undefined) {
      const retryAdapter = createActionAdapter({
        ...baseDependencies,
        externalActionStore: createExternalActionStore(root),
      });
      result = await retryAdapter.queryOutcome(receipt, input);
    }
    assert.equal(result.acknowledged, true);
    assert.ok(effectCount <= 1, `${point}: duplicate external effect`);
    assert.equal(result.outcome, "APPLIED");
    assert.equal(effectCount, 1);
  }
});
