import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  backgroundDispatchDigest,
} from "./background-execution-model.mjs";
import {
  createBackgroundExecutionStore,
} from "./background-execution.mjs";
import { createLoopQueue } from "./loop-queue.mjs";
import {
  computeBackgroundAggregateEpochDigest,
  computeBackgroundRunAggregatePolicyDigest,
  computeEffectiveBackgroundLimitsDigest,
  createCanonicalBackgroundPolicyAuthority,
} from "./background-policy.mjs";
import { createLoopRunController } from "./loop-run.mjs";
import { createProjectModeCapabilityAuthority } from "./project-config.mjs";

const fixture = JSON.parse(
  await readFile(
    new URL("../evals/fixtures/background-pilots-v2.json", import.meta.url),
    "utf8",
  ),
);
const D = (character) => `sha256:${character.repeat(64)}`;

function sha256(value) {
  const bytes = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function projectRootDigest(root) {
  return sha256(
    JSON.stringify({
      domain: "super-compound.project-mode-capability-root.v2",
      root: path.resolve(root),
    }),
  );
}

function clone(value) {
  return structuredClone(value);
}

function queuePreparation(input) {
  const claim = input.queue_claim;
  return {
    queue_item_id: claim.queue_item_id,
    run_binding: {
      run_id: claim.run_id,
      phase: claim.phase,
      expected_run_version: claim.expected_run_version,
      goal_digest: claim.goal_digest,
      authority_digest: claim.authority_digest,
      verifier_digest: claim.verifier_digest,
      eval_definition_digest: claim.eval_definition_digest,
      project_config_digest: claim.project_config_digest,
      policy_digest: claim.policy_digest,
      operation_inventory_digest: claim.operation_inventory_digest,
      risk_profile: claim.risk_profile,
      autonomy_profile: claim.autonomy_profile,
      required_gates: [...claim.required_gates],
    },
    provenance: {
      trigger_id: `trigger.${claim.queue_item_id}`,
      actor_ref: "actor.project.owner",
      source_ref: "source.local.oneshot",
    },
    dedupe_identity_digest: input.effective_limits_digest,
    payload_digest: input.aggregate_policy_digest,
    prepared_at: input.now,
    available_at: input.now,
    expires_at: claim.approval_expires_at,
    missed_run_policy: "CANCEL",
    lease_policy: { duration_ms: 600_000, heartbeat_interval_ms: 60_000 },
    retry_policy: { max_attempts: 2, backoff_ms: 0 },
    concurrency: { key: `project.${claim.queue_item_id}`, limit: 1 },
    rate_limit: {
      key: `project.${claim.queue_item_id}`,
      max_claims: 2,
      window_ms: 600_000,
    },
    result_sink_ref: "sink.local.audit",
    policy_ref: "policy.loop-runtime-v2",
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
  const relative = `.scratch/handoff-inputs/${name}.json`;
  const absolute = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return relative;
}

function confirmationFromProposal(proposal, proposalDigest, now) {
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
    confirmed_limits: clone(proposal.recommended_limits),
    confirmed_budget: clone(proposal.recommended),
    effective_budget: clone(proposal.effective_preview),
    autonomy_profile: proposal.autonomy_profile,
    risk_profile: proposal.risk_profile,
    approver: {
      actor_id: "host-human.goal014.handoff",
      actor_type: "HUMAN",
      attestation: "HOST_ATTESTED_HUMAN",
    },
    confirmed_at: now(),
    expires_at: proposal.approval_expires_at,
  };
}

async function writeAuthoritySources(root, inventoryText) {
  const definitions = [
    ["GOAL", ".scratch/authority/handoff-goal.md", "goal 014 handoff authority\n"],
    ["BRD", "docs/brd/brd-loop-runtime-v2.md", "brd handoff authority\n"],
    ["PRD", "docs/prd/prd-loop-runtime-v2.md", "prd handoff authority\n"],
    ["FSD", "docs/fsd/fsd-loop-runtime-v2.md", "fsd handoff authority\n"],
    ["ADR", "docs/solutions/adr-0001-loop-run-controller-v2.md", "adr handoff authority\n"],
    ["VERIFIER", ".agent/verifiers/test-014.md", "test 014 handoff verifier\n"],
    ["EVAL", ".agent/evals/loop-runtime-v2.md", "loop runtime handoff eval\n"],
    ["OPERATION_INVENTORY", ".agent/context/operation-inventory.json", inventoryText],
  ];
  const sources = [];
  for (const [role, sourcePath, content] of definitions) {
    const absolute = path.join(root, ...sourcePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    sources.push({ role, source_path: sourcePath, content_digest: sha256(content) });
  }
  return sources;
}

function digestFor(sources, role) {
  return sources.find((source) => source.role === role).content_digest;
}

async function prepareCanonicalRun(
  root,
  input,
  now,
  { mode = "ENFORCE" } = {},
) {
  assert.ok(new Set(["ENFORCE", "OBSERVE"]).has(mode));
  const schemaDirectory = path.join(root, ".agent", "context", "schemas");
  await mkdir(schemaDirectory, { recursive: true });
  await Promise.all([
    ["automation-trigger-v2.schema.json", "automation-trigger-v2.schema.json"],
    ["project-config-v2.schema.json", "project-config-v2.schema.json"],
    ["operation-inventory-v2.schema.json", "operation-inventory-v2.schema.json"],
    ["loop-run-contract-v2.schema.json", "loop-run-contract-v2.schema.json"],
    [
      "project-mode-capability-v2.schema.json",
      "project-mode-capability-v2.schema.json",
    ],
  ].map(([source, target]) =>
    copyFile(
      new URL(`../context/schemas/${source}`, import.meta.url),
      path.join(schemaDirectory, target),
    )),
  );
  const aggregatePolicy = clone(input.aggregate_policy);
  const config = JSON.parse(
    await readFile(new URL("../context/project-config.json", import.meta.url), "utf8"),
  );
  config.mode = mode;
  config.policy.allowlisted_operations = ["queue-claim", "source-write", "work"];
  config.policy.credential_scopes = [
    "repo.worktree.read",
    "repo.worktree.write",
  ];
  config.risk.maximum_autonomy = "BACKGROUND";
  config.background_aggregate_policy = clone(aggregatePolicy);
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(path.join(root, ".agent/context/project-config.json"), configText);
  const configDigest = sha256(configText);
  let modeCapabilityAuthority;
  if (mode === "ENFORCE") {
    const modeCapability = {
      schema: "project_mode_capability_v2",
      contract_version: "2.0.0",
      attestation_id: "project-mode.goal014.background-handoff",
      purpose: "PROJECT_MODE_ENFORCE",
      project_root_digest: projectRootDigest(root),
      workspace_root_digest: sha256(`workspace:${root}`),
      project_config_digest: configDigest,
      config_version: config.config_version,
      mode_version: config.mode_version,
      host_ref: "host.goal014.background-handoff",
      host_identity_digest: sha256("goal014-background-handoff-host"),
      host_verifier_digest: sha256("goal014-background-handoff-verifier"),
      write_interceptor_digest: sha256("goal014-background-handoff-interceptor"),
      filesystem_type: "ext4",
      external_write_policy: "DENY",
      capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      issued_at: input.now,
      expires_at: input.queue_claim.approval_expires_at,
      evidence_digest: sha256("goal014-background-handoff-mode-capability"),
    };
    await writeFile(
      path.join(root, ".agent/context/project-mode-capability.json"),
      `${JSON.stringify(modeCapability, null, 2)}\n`,
    );
    modeCapabilityAuthority = createProjectModeCapabilityAuthority(root, {
      now,
      verifyHostAttestation: async (verification) =>
        verification.attestation.attestation_id ===
          modeCapability.attestation_id &&
        verification.attestation.evidence_digest ===
          modeCapability.evidence_digest &&
        verification.attestation.host_ref === modeCapability.host_ref &&
        verification.project_root_digest === modeCapability.project_root_digest &&
        verification.project_config_digest === configDigest &&
        JSON.stringify(verification.attestation.capabilities) ===
          JSON.stringify(modeCapability.capabilities) &&
        JSON.stringify(verification.required_capabilities) ===
          JSON.stringify(modeCapability.capabilities),
    });
  }
  const inventory = {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.goal014.handoff",
    project_config_digest: configDigest,
    background_aggregate_policy: clone(aggregatePolicy),
    issued_at: input.now,
    expires_at: input.queue_claim.approval_expires_at,
    operations: [],
  };
  const inventoryText = `${JSON.stringify(inventory, null, 2)}\n`;
  const inventoryDigest = sha256(inventoryText);
  const sources = await writeAuthoritySources(root, inventoryText);
  const policy = {
    max_iterations: 20,
    max_runtime_minutes: 10,
    max_no_progress_iterations: 3,
    max_tokens: null,
    max_cost_micro: null,
    approval_ttl_minutes: 60,
    allowlisted_operations: ["queue-claim", "source-write", "work"],
    credential_scopes: ["repo.worktree.read", "repo.worktree.write"],
    required_gates: ["fresh-verifier", "human-budget-confirmation"],
    risk: "HIGH",
    isolation: "HARDENED",
    expires_at: input.queue_claim.approval_expires_at,
    background_aggregate_policy: clone(aggregatePolicy),
  };
  const contract = {
    schema: "loop_run_contract_v2",
    contract_version: "2.0.0",
    run_id: input.queue_claim.run_id,
    goal: {
      ref: "FSD-LER2@1.0.0#GOAL-014",
      digest: digestFor(sources, "GOAL"),
      summary: "Exercise atomic background handoff authority.",
      acceptance_criteria: ["At most one host handoff is granted."],
    },
    authority: {
      brd_digest: digestFor(sources, "BRD"),
      prd_digest: digestFor(sources, "PRD"),
      fsd_digest: digestFor(sources, "FSD"),
      adr_digests: [digestFor(sources, "ADR")],
      operation_inventory_digest: inventoryDigest,
      sources,
      base_git_sha: input.expected_base_git_sha,
    },
    verifier: {
      ref: "FSD-LER2@1.0.0#TEST-014",
      digest: digestFor(sources, "VERIFIER"),
      eval_definition_digest: digestFor(sources, "EVAL"),
      regression_verifier_digest: null,
      eval_class: "CAPABILITY",
      success_threshold: { metric: "PASS_AT_K", k: 3, minimum_basis_points: 9000 },
    },
    policy,
    lineage: { parent_run_id: null, root_run_id: input.queue_claim.run_id },
    autonomy_profile: "BACKGROUND",
    risk_profile: "HIGH",
    project_config_digest: configDigest,
    created_at: input.now,
  };
  const contractFile = await writeJson(root, "contract", contract);
  let eventSequence = 0;
  const controller = createLoopRunController(root, {
    now,
    randomId: () => `handoff-event.${String(++eventSequence).padStart(4, "0")}`,
    ...(modeCapabilityAuthority === undefined
      ? {}
      : { modeCapabilityAuthority }),
    verifyHostHumanAttestation: async () => true,
    verifyActiveRuntimeAttestation: async () => true,
    verifyUsageMetering: async () => true,
  });
  assert.equal(Object.isFrozen(controller), true);
  const loadedMode = await controller.showMode();
  assert.equal(loadedMode.valid, true);
  assert.equal(loadedMode.effective_mode, mode);
  const created = await controller.create({ contractFile });
  const recommendation = {
    schema: "budget_recommendation_v2",
    contract_version: "2.0.0",
    recommendation_source: "MODEL_ADVISORY",
    run_id: contract.run_id,
    phase: "START",
    expected_run_version: created.state.version,
    goal_ref: contract.goal.ref,
    goal_digest: contract.goal.digest,
    verifier_digest: contract.verifier.digest,
    policy_digest: policyDigest(contract),
    recommended_limits: {
      max_iterations: 20,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost: null,
    },
    recommendation_reason: "Bounded handoff verifies exactly-once worker dispatch.",
  };
  const recommendationFile = await writeJson(root, "recommendation", recommendation);
  const proposed = await controller.proposeBudget({
    runId: contract.run_id,
    phase: "START",
    queueItemId: input.queue_claim.queue_item_id,
    recommendationFile,
  });
  Object.assign(input.queue_claim, {
    phase: proposed.proposal.phase,
    expected_run_version: proposed.proposal.expected_run_version,
    goal_digest: proposed.proposal.goal_digest,
    authority_digest: proposed.proposal.authority_digest,
    verifier_digest: proposed.proposal.verifier_digest,
    eval_definition_digest: proposed.proposal.eval_definition_digest,
    project_config_digest: proposed.proposal.project_config_digest,
    policy_digest: proposed.proposal.policy_digest,
    operation_inventory_digest: inventoryDigest,
    risk_profile: proposed.proposal.risk_profile,
    autonomy_profile: proposed.proposal.autonomy_profile,
    required_gates: [...contract.policy.required_gates],
  });
  return {
    aggregatePolicy,
    configDigest,
    contract,
    controller,
    inventoryDigest,
    proposed,
  };
}

async function createHarness(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "goal014-handoff-"));
  const input = clone(fixture.base_reservation_input);
  let currentTime = input.now;
  const prepared = await prepareCanonicalRun(
    root,
    input,
    () => currentTime,
  );
  const { aggregatePolicy, contract, controller, inventoryDigest, proposed } = prepared;
  const source = queuePreparation(input);

  const makeQueue = (afterEventAppend = undefined) =>
    createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => input.queue_claim.lease.lease_id,
      validateQueueGate: (request) => controller.validateGate(request),
      afterEventAppend,
    });
  let queue = makeQueue(options.queueAfterEventAppend);
  await queue.prepare(source);
  const confirmationFile = await writeJson(
    root,
    "confirmation",
    confirmationFromProposal(
      proposed.proposal,
      proposed.proposal_digest,
      () => currentTime,
    ),
  );
  const confirmation = await controller.confirmBudget({
    runId: contract.run_id,
    expectedVersion: proposed.proposal.expected_run_version,
    inputFile: confirmationFile,
  });
  input.queue_claim.approval_digest = confirmation.confirmation_digest;
  input.queue_claim.approval_expires_at = proposed.proposal.approval_expires_at;
  await queue.submit(source.queue_item_id, {
    expected_version: 0,
    confirmation_digest: confirmation.confirmation_digest,
  });
  const claimed = await queue.claim(source.queue_item_id, {
    expected_version: 1,
    worker_ref: input.queue_claim.lease.worker_ref,
  });
  input.queue_claim = await queue.validateClaim({
    queue_item_id: claimed.queue_item_id,
    minimum_version: claimed.version,
    lease_id: claimed.lease.lease_id,
    worker_ref: claimed.lease.worker_ref,
    attempt: claimed.lease.attempt,
  });
  Object.assign(input.host_attestation, {
    run_id: input.queue_claim.run_id,
    run_head_digest: input.queue_claim.run_head_digest,
    authority_digest: input.queue_claim.authority_digest,
    verifier_digest: input.queue_claim.verifier_digest,
    project_config_digest: input.queue_claim.project_config_digest,
    operation_inventory_digest: input.queue_claim.operation_inventory_digest,
    policy_digest: input.queue_claim.policy_digest,
    approval_digest: input.queue_claim.approval_digest,
  });
  Object.assign(input.worktree_attestation, {
    run_id: input.queue_claim.run_id,
    queue_item_id: input.queue_claim.queue_item_id,
    lease_id: input.queue_claim.lease.lease_id,
    worker_ref: input.queue_claim.lease.worker_ref,
  });
  Object.assign(input.worktree_verification, {
    run_id: input.queue_claim.run_id,
    queue_item_id: input.queue_claim.queue_item_id,
    lease_id: input.queue_claim.lease.lease_id,
    worker_ref: input.queue_claim.lease.worker_ref,
  });

  let state = (await controller.show({ runId: contract.run_id })).state;
  const startFile = await writeJson(root, "start", {
    confirmation_digest: confirmation.confirmation_digest,
    freshness: freshness(contract),
  });
  state = (await controller.apply({
    runId: contract.run_id,
    expectedVersion: state.version,
    command: "START",
    inputFile: startFile,
  })).state;
  const actionFile = await writeJson(root, "begin-action", {
    confirmation_digest: confirmation.confirmation_digest,
    action_id: "action.goal014.atomic-handoff",
    idempotency_key: "run.goal014.atomic-handoff.action",
    freshness: freshness(contract),
  });
  await controller.apply({
    runId: contract.run_id,
    expectedVersion: state.version,
    command: "BEGIN_ACTION",
    inputFile: actionFile,
  });
  const gate = await controller.validateGate({
    runId: contract.run_id,
    operation: "work",
  });
  assert.equal(gate.allowed, true);
  assert.equal(gate.would_allow, true);
  assert.equal(gate.simulation_only, false);
  assert.equal(gate.mutation_authorized, true);

  input.effective_limits = clone(gate.background_budget_binding.effective_limits);
  input.effective_limits_digest =
    computeEffectiveBackgroundLimitsDigest(input.effective_limits);
  input.shared_aggregate_policy = clone(aggregatePolicy);
  input.aggregate_epoch_digest = computeBackgroundAggregateEpochDigest({
    shared_aggregate_policy: aggregatePolicy,
    project_config_digest: contract.project_config_digest,
    operation_inventory_digest: inventoryDigest,
  });
  input.aggregate_policy = clone(contract.policy.background_aggregate_policy);
  input.aggregate_policy_digest = computeBackgroundRunAggregatePolicyDigest({
    run_id: contract.run_id,
    aggregate_policy: input.aggregate_policy,
    policy_digest: policyDigest(contract),
    aggregate_epoch_digest: input.aggregate_epoch_digest,
  });
  Object.assign(input.policy_verification, {
    run_id: contract.run_id,
    queue_item_id: input.queue_claim.queue_item_id,
    confirmation_digest: confirmation.confirmation_digest,
    project_config_digest: contract.project_config_digest,
    policy_digest: policyDigest(contract),
    operation_inventory_digest: inventoryDigest,
    effective_limits_digest: input.effective_limits_digest,
    aggregate_epoch_digest: input.aggregate_epoch_digest,
    aggregate_policy_digest: input.aggregate_policy_digest,
  });
  const backgroundPolicyAuthority = createCanonicalBackgroundPolicyAuthority(root, {
    now: () => currentTime,
    loopRunController: controller,
  });

  const makeStore = (afterEventAppend = undefined) =>
    createBackgroundExecutionStore(root, {
      now: () => currentTime,
      queueCoordinator: queue.backgroundCoordinator,
      backgroundPolicyAuthority,
      verifyHostAttestation: async (candidate) =>
        candidate.host_attestation.run_id === candidate.queue_claim.run_id &&
        candidate.host_attestation.approval_digest ===
          candidate.queue_claim.approval_digest,
      verifyWorktreeAttestation: async (candidate) =>
        candidate.worktree_attestation.queue_item_id ===
          candidate.queue_claim.queue_item_id &&
        candidate.worktree_attestation.lease_id ===
          candidate.queue_claim.lease.lease_id,
      afterEventAppend,
    });
  let store = makeStore(options.storeAfterEventAppend);
  const reserved = await store.reserve(input);
  assert.equal(reserved.created, true);
  assert.deepEqual(
    reserved.record.budget_binding,
    gate.background_budget_binding,
  );
  assert.deepEqual(
    reserved.record.shared_aggregate_policy,
    input.shared_aggregate_policy,
  );
  assert.equal(
    reserved.record.aggregate_epoch_digest,
    input.aggregate_epoch_digest,
  );

  return {
    root,
    input,
    source,
    claimed,
    gate,
    now: () => currentTime,
    setTime(value) {
      currentTime = value;
    },
    get queue() {
      return queue;
    },
    get store() {
      return store;
    },
    restart({ queueAfterEventAppend, storeAfterEventAppend } = {}) {
      queue = makeQueue(queueAfterEventAppend);
      store = makeStore(storeAfterEventAppend);
    },
  };
}

function armInput(harness) {
  return {
    expected_version: 0,
    action_gate: harness.gate,
    evidence_digest: harness.input.effective_limits_digest,
  };
}

test("TEST-014 OBSERVE cannot authorize a background handoff", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "goal014-observe-handoff-"));
  const input = clone(fixture.base_reservation_input);
  const currentTime = input.now;
  try {
    const prepared = await prepareCanonicalRun(
      root,
      input,
      () => currentTime,
      { mode: "OBSERVE" },
    );
    const source = queuePreparation(input);
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => input.queue_claim.lease.lease_id,
      validateQueueGate: (request) => prepared.controller.validateGate(request),
    });
    await queue.prepare(source);
    const confirmationFile = await writeJson(
      root,
      "observe-confirmation",
      confirmationFromProposal(
        prepared.proposed.proposal,
        prepared.proposed.proposal_digest,
        () => currentTime,
      ),
    );
    const confirmation = await prepared.controller.confirmBudget({
      runId: prepared.contract.run_id,
      expectedVersion: prepared.proposed.proposal.expected_run_version,
      inputFile: confirmationFile,
    });
    const gate = await prepared.controller.validateGate({
      runId: prepared.contract.run_id,
      operation: "queue-claim",
      queueItemId: source.queue_item_id,
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.would_allow, true);
    assert.equal(gate.simulation_only, true);
    assert.equal(gate.mutation_authorized, false);
    assert.equal(Object.hasOwn(gate, "background_budget_binding"), false);
    await assert.rejects(
      queue.submit(source.queue_item_id, {
        expected_version: 0,
        confirmation_digest: confirmation.confirmation_digest,
      }),
      /QUEUE_APPROVAL_REQUIRED/u,
    );
    const unchanged = await queue.show(source.queue_item_id);
    assert.equal(unchanged.state, "PREPARED");
    assert.equal(unchanged.dispatch_commit, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-014 cancel and dispatch permit serialize before any host handoff", async () => {
  const cancelFirst = await createHarness();
  const commitFirst = await createHarness();
  try {
    const cancellation = await cancelFirst.queue.cancel(
      cancelFirst.source.queue_item_id,
      {
        expected_version: cancelFirst.claimed.version,
        actor_ref: "actor.project.owner",
        reason_ref: "reason.user.cancelled",
      },
    );
    assert.equal(cancellation.state, "CANCEL_REQUESTED");
    let cancelFirstHostCalls = 0;
    await assert.rejects(
      () => cancelFirst.store.arm(cancelFirst.input.dispatch_id, armInput(cancelFirst)),
      /QUEUE_CLAIM_NOT_ACTIVE/,
    );
    const cancelledTicket = await cancelFirst.store.apply(
      cancelFirst.input.dispatch_id,
      {
        expected_version: 0,
        command: "CANCEL",
        authorization: null,
        evidence_digest: D("d"),
        outcome: null,
      },
    );
    assert.equal(cancelledTicket.record.state, "CANCELLED");
    assert.equal(cancelFirstHostCalls, 0);
    assert.equal(
      (await cancelFirst.queue.show(cancelFirst.source.queue_item_id))
        .dispatch_commit,
      null,
    );

    const armed = await commitFirst.store.arm(
      commitFirst.input.dispatch_id,
      armInput(commitFirst),
    );
    let commitFirstHostCalls = 0;
    if (armed.handoff_granted) commitFirstHostCalls += 1;
    const queueAfterCommit = await commitFirst.queue.show(
      commitFirst.source.queue_item_id,
    );
    const commit = queueAfterCommit.dispatch_commit;
    assert.equal(commit.background_record_digest, backgroundDispatchDigest(armed.record));
    assert.equal(commit.background_record_version, armed.record.version);
    assert.equal(commit.action_id, armed.record.action_binding.action_id);
    assert.equal(commit.authorization_expires_at, armed.record.action_binding.authorization_expires_at);
    const requested = await commitFirst.queue.cancel(
      commitFirst.source.queue_item_id,
      {
        expected_version: queueAfterCommit.version,
        actor_ref: "actor.project.owner",
        reason_ref: "reason.user.cancelled",
      },
    );
    assert.equal(requested.state, "CANCEL_REQUESTED");
    assert.equal(requested.dispatch_commit.dispatch_id, armed.record.dispatch_id);
    assert.equal(commitFirstHostCalls, 1);
  } finally {
    await rm(cancelFirst.root, { recursive: true, force: true });
    await rm(commitFirst.root, { recursive: true, force: true });
  }
});

test("TEST-014 both durable arm crash windows refuse a replayed handoff", async () => {
  let failBeforeCommit = true;
  const beforeCommit = await createHarness({
    storeAfterEventAppend: async (record) => {
      if (record.state === "DISPATCH_INTENDED" && failBeforeCommit) {
        failBeforeCommit = false;
        throw new Error("INJECTED_BEFORE_QUEUE_DISPATCH_COMMIT");
      }
    },
  });
  let failAfterCommit = true;
  const afterCommit = await createHarness({
    queueAfterEventAppend: async (item) => {
      if (item.dispatch_commit !== null && failAfterCommit) {
        failAfterCommit = false;
        throw new Error("INJECTED_AFTER_QUEUE_DISPATCH_COMMIT");
      }
    },
  });
  try {
    await assert.rejects(
      () => beforeCommit.store.arm(beforeCommit.input.dispatch_id, armInput(beforeCommit)),
      /INJECTED_BEFORE_QUEUE_DISPATCH_COMMIT/,
    );
    assert.equal(
      (await beforeCommit.queue.show(beforeCommit.source.queue_item_id))
        .dispatch_commit,
      null,
    );
    beforeCommit.restart();
    const notDispatched = await beforeCommit.store.arm(
      beforeCommit.input.dispatch_id,
      armInput(beforeCommit),
    );
    assert.equal(notDispatched.handoff_granted, false);
    assert.equal(notDispatched.record.state, "CANCELLED");

    await assert.rejects(
      () => afterCommit.store.arm(afterCommit.input.dispatch_id, armInput(afterCommit)),
      /INJECTED_AFTER_QUEUE_DISPATCH_COMMIT/,
    );
    assert.notEqual(
      (await afterCommit.queue.show(afterCommit.source.queue_item_id))
        .dispatch_commit,
      null,
    );
    afterCommit.restart();
    const unknown = await afterCommit.store.arm(
      afterCommit.input.dispatch_id,
      armInput(afterCommit),
    );
    assert.equal(unknown.handoff_granted, false);
    assert.equal(unknown.record.state, "UNKNOWN_OUTCOME");
    assert.equal(unknown.record.worktree.disposition, "QUARANTINED");
    assert.equal(unknown.record.requires_new_approval, true);
  } finally {
    await rm(beforeCommit.root, { recursive: true, force: true });
    await rm(afterCommit.root, { recursive: true, force: true });
  }
});

test("TEST-014 restart after host handoff never dispatches the worker twice", async () => {
  const harness = await createHarness();
  try {
    const calls = [];
    const armed = await harness.store.arm(
      harness.input.dispatch_id,
      armInput(harness),
    );
    if (armed.handoff_granted) calls.push(armed.record.action_binding.idempotency_key);
    assert.equal(calls.length, 1);

    harness.restart();
    const replay = await harness.store.arm(
      harness.input.dispatch_id,
      armInput(harness),
    );
    if (replay.handoff_granted) calls.push(replay.record.action_binding.idempotency_key);
    assert.equal(replay.handoff_granted, false);
    assert.equal(replay.record.state, "UNKNOWN_OUTCOME");
    assert.equal(calls.length, 1);
    assert.equal(new Set(calls).size, 1);

    const queueItem = await harness.queue.show(harness.source.queue_item_id);
    const unknownQueue = await harness.queue.complete(harness.source.queue_item_id, {
      expected_version: queueItem.version,
      worker_ref: harness.claimed.lease.worker_ref,
      lease_id: harness.claimed.lease.lease_id,
      outcome: "UNKNOWN_OUTCOME",
      result_digest: D("d"),
    });
    assert.equal(unknownQueue.item.state, "UNKNOWN_OUTCOME");
    assert.equal(unknownQueue.item.recovery.requires_new_approval, true);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});
