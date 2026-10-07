import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const D3 = `sha256:${"c".repeat(64)}`;
const BASE_SHA = "4".repeat(40);
const NOW = "2026-07-22T05:10:00.000Z";

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function backgroundBudgetBinding(overrides = {}) {
  const effectiveLimits = structuredClone(
    overrides.effective_limits ?? {
      max_runtime_ms: 10 * 60_000,
      max_no_progress_iterations: 3,
      max_tokens: null,
    },
  );
  const consumed = structuredClone(
    overrides.consumed ?? {
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: effectiveLimits.max_tokens === null ? null : 0,
    },
  );
  const remaining = structuredClone(
    overrides.remaining ?? {
      runtime_ms:
        effectiveLimits.max_runtime_ms - consumed.active_runtime_ms,
      no_progress_iterations:
        effectiveLimits.max_no_progress_iterations -
        consumed.no_progress_iterations,
      tokens:
        effectiveLimits.max_tokens === null
          ? null
          : effectiveLimits.max_tokens - consumed.tokens,
    },
  );
  const candidate = {
    schema: "background_budget_binding_v2",
    run_id: "run.goal014.background001",
    confirmation_digest: D3,
    approval_phase: "START",
    approval_expires_at: "2026-07-22T06:00:00.000Z",
    run_version: 2,
    current_run_head_digest: D1,
    action_run_head_digest: D1,
    action_id: "action.goal014.001",
    idempotency_key: "run.goal014.action001",
    controller_intent_digest: D1,
    effective_limits: effectiveLimits,
    consumed,
    remaining,
    ...overrides,
  };
  delete candidate.authority_digest;
  candidate.effective_limits = effectiveLimits;
  candidate.consumed = consumed;
  candidate.remaining = remaining;
  if (!Object.hasOwn(overrides, "controller_intent_digest")) {
    candidate.controller_intent_digest = digestJson({
      run_id: candidate.run_id,
      action_id: candidate.action_id,
      idempotency_key: candidate.idempotency_key,
      run_head_digest: candidate.action_run_head_digest,
    });
  }
  return {
    ...candidate,
    authority_digest: digestJson({
      domain: "super-compound.background-budget-binding.v2",
      ...candidate,
    }),
  };
}

function rehashBudgetBinding(binding, mutate) {
  const next = structuredClone(binding);
  delete next.authority_digest;
  mutate(next);
  delete next.controller_intent_digest;
  return backgroundBudgetBinding(next);
}

async function loadModel() {
  return import("./background-execution-model.mjs").catch(() => ({}));
}

const REQUIRED_CAPABILITIES = [
  "CREDENTIAL_SCOPE_ENFORCEMENT",
  "DURABLE_AUDIT",
  "DURABLE_LOCAL_STATE",
  "FINITE_NO_PROGRESS_CAP",
  "FINITE_RUNTIME_CAP",
  "HARD_WRITE_INTERCEPTION",
  "ISOLATED_WORKTREE",
  "LEASE_RECOVERY",
  "NETWORK_EGRESS_ENFORCEMENT",
  "PERMISSION_BYPASS_PREVENTION",
  "PROCESS_ISOLATION",
];

function queueClaim(overrides = {}) {
  return {
    queue_item_id: "queue.goal014.item001",
    queue_version: 2,
    queue_state: "CLAIMED",
    run_id: "run.goal014.background001",
    phase: "START",
    expected_run_version: 0,
    goal_digest: D1,
    authority_digest: D2,
    verifier_digest: D3,
    eval_definition_digest: D1,
    project_config_digest: D2,
    policy_digest: D3,
    operation_inventory_digest: D1,
    risk_profile: "HIGH",
    autonomy_profile: "BACKGROUND",
    required_gates: ["fresh-verifier", "human-budget-confirmation"],
    run_head_digest: D2,
    approval_digest: D3,
    approval_expires_at: "2026-07-22T06:00:00.000Z",
    dispatch_commit: null,
    lease: {
      lease_id: "lease.goal014.001",
      worker_ref: "worker.goal014.001",
      attempt: 1,
      expires_at: "2026-07-22T05:20:00.000Z",
    },
    ...overrides,
  };
}

function dispatchGate(overrides = {}) {
  const {
    background_budget_binding: suppliedBudget,
    controller_intent_digest: suppliedIntent,
    ...gateOverrides
  } = overrides;
  const gate = {
    allowed: true,
    would_allow: true,
    simulation_only: false,
    mutation_authorized: true,
    operation: "work",
    queue_item_id: null,
    run_id: "run.goal014.background001",
    run_version: 2,
    confirmation_digest: D3,
    authority_digest: D2,
    policy_digest: D3,
    run_head_digest: D2,
    verifier_digest: D3,
    project_config_digest: D2,
    operation_inventory_digest: D1,
    confirmed_risk_profile: "HIGH",
    confirmed_autonomy_profile: "BACKGROUND",
    confirmed_required_gates: [
      "fresh-verifier",
      "human-budget-confirmation",
    ],
    action_id: "action.goal014.001",
    idempotency_key: "run.goal014.action001",
    controller_intent_digest: D1,
    ...gateOverrides,
  };
  gate.controller_intent_digest =
    suppliedIntent ??
    digestJson({
      run_id: gate.run_id,
      action_id: gate.action_id,
      idempotency_key: gate.idempotency_key,
      run_head_digest: gate.run_head_digest,
    });
  gate.background_budget_binding =
    suppliedBudget ??
    backgroundBudgetBinding({
      run_id: gate.run_id,
      confirmation_digest: gate.confirmation_digest,
      approval_phase: "START",
      approval_expires_at: "2026-07-22T06:00:00.000Z",
      run_version: gate.run_version,
      current_run_head_digest: gate.run_head_digest,
      action_run_head_digest: gate.run_head_digest,
      action_id: gate.action_id,
      idempotency_key: gate.idempotency_key,
      controller_intent_digest: gate.controller_intent_digest,
    });
  return gate;
}

function hostAttestation(overrides = {}) {
  return {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.goal014.001",
    host_ref: "host.local.reference",
    run_id: "run.goal014.background001",
    run_head_digest: D2,
    authority_digest: D2,
    verifier_digest: D3,
    project_config_digest: D2,
    operation_inventory_digest: D1,
    policy_digest: D3,
    approval_digest: D3,
    capabilities: [...REQUIRED_CAPABILITIES],
    credential_scopes: {
      read: ["repo.worktree.read"],
      write: ["repo.worktree.write"],
    },
    egress_ids: [],
    isolation: "HARDENED",
    issued_at: "2026-07-22T05:00:00.000Z",
    expires_at: "2026-07-22T06:00:00.000Z",
    evidence_digest: D1,
    ...overrides,
  };
}

function worktreeAttestation(overrides = {}) {
  return {
    schema: "background_worktree_attestation_v2",
    contract_version: "2.0.0",
    attestation_id: "worktree-attestation.goal014.001",
    host_ref: "host.local.reference",
    run_id: "run.goal014.background001",
    queue_item_id: "queue.goal014.item001",
    lease_id: "lease.goal014.001",
    worker_ref: "worker.goal014.001",
    worktree_ref: "worktree.goal014.001",
    root_digest: D2,
    base_git_sha: BASE_SHA,
    dedicated: true,
    main_workspace: false,
    path_confined: true,
    symlink_free: true,
    issued_at: "2026-07-22T05:00:00.000Z",
    expires_at: "2026-07-22T05:30:00.000Z",
    evidence_digest: D3,
    ...overrides,
  };
}

function worktreeVerification(overrides = {}) {
  return {
    schema: "background_worktree_verification_v2",
    contract_version: "2.0.0",
    verified: true,
    attestation_id: "worktree-attestation.goal014.001",
    run_id: "run.goal014.background001",
    queue_item_id: "queue.goal014.item001",
    lease_id: "lease.goal014.001",
    worker_ref: "worker.goal014.001",
    worktree_ref: "worktree.goal014.001",
    root_digest: D2,
    base_git_sha: BASE_SHA,
    evidence_digest: D3,
    verified_at: NOW,
    ...overrides,
  };
}

function policyVerification(overrides = {}) {
  return {
    schema: "background_policy_verification_v2",
    contract_version: "2.0.0",
    verified: true,
    run_id: "run.goal014.background001",
    queue_item_id: "queue.goal014.item001",
    confirmation_digest: D3,
    project_config_digest: D2,
    policy_digest: D3,
    operation_inventory_digest: D1,
    effective_limits_digest: D1,
    aggregate_epoch_digest: D1,
    aggregate_policy_digest: D2,
    issued_at: "2026-07-22T05:00:00.000Z",
    expires_at: "2026-07-22T06:00:00.000Z",
    evidence_digest: D1,
    ...overrides,
  };
}

function reservationInput(overrides = {}) {
  const queue = overrides.queue_claim ?? queueClaim();
  const effectiveLimits = structuredClone(
    overrides.effective_limits ?? {
      max_runtime_ms: 10 * 60_000,
      max_no_progress_iterations: 3,
      max_tokens: null,
    },
  );
  const effectiveLimitsDigest = overrides.effective_limits_digest ?? D1;
  const aggregateEpochDigest = overrides.aggregate_epoch_digest ?? D1;
  const aggregatePolicyDigest = overrides.aggregate_policy_digest ?? D2;
  const host =
    overrides.host_attestation ??
    hostAttestation({
      run_id: queue.run_id,
      run_head_digest: queue.run_head_digest,
      authority_digest: queue.authority_digest,
      verifier_digest: queue.verifier_digest,
      project_config_digest: queue.project_config_digest,
      operation_inventory_digest: queue.operation_inventory_digest,
      policy_digest: queue.policy_digest,
      approval_digest: queue.approval_digest,
    });
  const worktree =
    overrides.worktree_attestation ??
    worktreeAttestation({
      run_id: queue.run_id,
      queue_item_id: queue.queue_item_id,
      lease_id: queue.lease.lease_id,
      worker_ref: queue.lease.worker_ref,
    });
  const worktreeProof =
    overrides.worktree_verification ??
    worktreeVerification({
      attestation_id: worktree.attestation_id,
      run_id: worktree.run_id,
      queue_item_id: worktree.queue_item_id,
      lease_id: worktree.lease_id,
      worker_ref: worktree.worker_ref,
      worktree_ref: worktree.worktree_ref,
      root_digest: worktree.root_digest,
      base_git_sha: worktree.base_git_sha,
      evidence_digest: worktree.evidence_digest,
    });
  const verification =
    overrides.policy_verification ??
    policyVerification({
      run_id: queue.run_id,
      queue_item_id: queue.queue_item_id,
      confirmation_digest: queue.approval_digest,
      project_config_digest: queue.project_config_digest,
      policy_digest: queue.policy_digest,
      operation_inventory_digest: queue.operation_inventory_digest,
      effective_limits_digest: effectiveLimitsDigest,
      aggregate_epoch_digest: aggregateEpochDigest,
      aggregate_policy_digest: aggregatePolicyDigest,
    });
  const budget =
    overrides.budget_binding ??
    backgroundBudgetBinding({
      run_id: queue.run_id,
      confirmation_digest: queue.approval_digest,
      approval_phase: queue.phase,
      approval_expires_at: queue.approval_expires_at,
      run_version: Math.max(2, queue.expected_run_version + 2),
      effective_limits: effectiveLimits,
    });
  return {
    dispatch_id: "dispatch.goal014.001",
    queue_claim: queue,
    host_attestation: host,
    host_verification: {
      verified: true,
      evidence_digest: host.evidence_digest,
    },
    capability_decision: {
      allowed: true,
      code: "ACTION_CAPABILITY_VERIFIED",
      effective_isolation: "HARDENED",
      required_capabilities: [...REQUIRED_CAPABILITIES],
    },
    worktree_attestation: worktree,
    worktree_verification: worktreeProof,
    expected_base_git_sha: BASE_SHA,
    effective_limits: effectiveLimits,
    effective_limits_digest: effectiveLimitsDigest,
    shared_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 20 * 60_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    aggregate_epoch_digest: aggregateEpochDigest,
    aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 20 * 60_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    aggregate_policy_digest: aggregatePolicyDigest,
    budget_binding: budget,
    policy_verification: verification,
    reservation: {
      workers: 1,
      tokens: null,
      runtime_ms: 10 * 60_000,
      remote_calls: 0,
      reviewers: 1,
    },
    now: NOW,
    ...overrides,
  };
}

function secondReservationInput(overrides = {}) {
  const queue =
    overrides.queue_claim ??
    queueClaim({
      queue_item_id: "queue.goal014.item002",
      lease: {
        lease_id: "lease.goal014.002",
        worker_ref: "worker.goal014.002",
        attempt: 1,
        expires_at: "2026-07-22T05:20:00.000Z",
      },
    });
  const worktree =
    overrides.worktree_attestation ??
    worktreeAttestation({
      attestation_id: "worktree-attestation.goal014.002",
      run_id: queue.run_id,
      queue_item_id: queue.queue_item_id,
      lease_id: queue.lease.lease_id,
      worker_ref: queue.lease.worker_ref,
      worktree_ref: "worktree.goal014.002",
      root_digest: D3,
    });
  return reservationInput({
    dispatch_id: "dispatch.goal014.002",
    queue_claim: queue,
    worktree_attestation: worktree,
    worktree_verification: worktreeVerification({
      attestation_id: worktree.attestation_id,
      run_id: worktree.run_id,
      queue_item_id: worktree.queue_item_id,
      lease_id: worktree.lease_id,
      worker_ref: worktree.worker_ref,
      worktree_ref: worktree.worktree_ref,
      root_digest: worktree.root_digest,
      base_git_sha: worktree.base_git_sha,
      evidence_digest: worktree.evidence_digest,
    }),
    ...overrides,
  });
}

function actionAuthorizationInput(overrides = {}) {
  const actionGate = overrides.action_gate ?? dispatchGate({ run_head_digest: D1 });
  const candidate = {
    current_queue_claim: queueClaim({ queue_version: 3 }),
    action_gate: actionGate,
    lineage_verification: {
      schema: "background_run_lineage_verification_v2",
      contract_version: "2.0.0",
      verified: true,
      run_id: "run.goal014.background001",
      queue_item_id: "queue.goal014.item001",
      queue_run_head_digest: D2,
      action_run_head_digest: actionGate.run_head_digest,
      queue_expected_run_version: 0,
      action_run_version: 2,
      operation: "work",
      action_id: actionGate.action_id,
      controller_intent_digest: actionGate.controller_intent_digest,
      evidence_digest: D3,
      verified_at: NOW,
    },
    now: NOW,
    ...overrides,
  };
  return candidate;
}

function dispatchCommitFor(record) {
  return {
    dispatch_id: record.dispatch_id,
    operation: "work",
    action_id: record.action_binding.action_id,
    idempotency_key: record.action_binding.idempotency_key,
    controller_intent_digest: record.action_binding.controller_intent_digest,
    action_run_head_digest: record.action_binding.action_run_head_digest,
    action_run_version: record.action_binding.action_run_version,
    authorization_expires_at: record.action_binding.authorization_expires_at,
    background_record_version: record.version,
    background_record_digest: D3,
    lease_id: record.queue_binding.lease_id,
    worker_ref: record.queue_binding.worker_ref,
    attempt: record.queue_binding.attempt,
    committed_at: NOW,
  };
}

test("TEST-014 reserves one bounded dispatch for an exact queue lease and dedicated worktree", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  assert.equal(
    typeof reserveBackgroundClaim,
    "function",
    "background execution model must expose a pre-dispatch claim admission seam",
  );

  const record = reserveBackgroundClaim(reservationInput(), []);
  assert.equal(record.schema, "background_dispatch_v2");
  assert.equal(record.state, "RESERVED");
  assert.equal(record.dispatch_count, 0);
  assert.equal(record.queue_binding.lease_id, "lease.goal014.001");
  assert.equal(record.worktree.worktree_ref, "worktree.goal014.001");
  assert.deepEqual(record.reservation, reservationInput().reservation);
  assert.equal(record.action_binding, null);
  assert.equal(record.quarantine, null);
  assert.equal(record.reservation_status, "HELD");
  assert.equal(record.requires_new_approval, false);
  assert.ok(Object.isFrozen(record));
});

test("TEST-014 rejects self-hashed budget authority drift from its queue/run envelope", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const cases = [
    ["run", (budget) => { budget.run_id = "run.goal014.other"; }],
    ["confirmation", (budget) => { budget.confirmation_digest = D2; }],
    ["phase", (budget) => { budget.approval_phase = "RESUME"; }],
    ["expiry", (budget) => { budget.approval_expires_at = "2026-07-22T06:30:00.000Z"; }],
    ["current head", (budget) => { budget.current_run_head_digest = D2; }],
    ["action head", (budget) => { budget.action_run_head_digest = D2; }],
  ];
  for (const [name, mutate] of cases) {
    const original = reservationInput();
    const budget = rehashBudgetBinding(original.budget_binding, mutate);
    assert.throws(
      () => reserveBackgroundClaim({ ...original, budget_binding: budget }, []),
      /BACKGROUND_ADMISSION_DENIED/,
      name,
    );
  }
});

test("TEST-014 refreshed action budget cannot switch intent or regress consumed counters", async () => {
  const { authorizeBackgroundAction, reserveBackgroundClaim } = await loadModel();
  const admitted = reserveBackgroundClaim(reservationInput(), []);
  const switchedGate = dispatchGate({
    action_id: "action.goal014.switched",
    idempotency_key: "run.goal014.action-switched",
    run_head_digest: D1,
  });
  assert.throws(
    () =>
      authorizeBackgroundAction(
        admitted,
        actionAuthorizationInput({ action_gate: switchedGate }),
      ),
    /BACKGROUND_ACTION_GATE_DENIED/,
  );

  const consumedBudget = backgroundBudgetBinding({
    consumed: {
      active_runtime_ms: 100,
      no_progress_iterations: 1,
      tokens: null,
    },
  });
  const consumedAdmission = reserveBackgroundClaim(
    reservationInput({
      budget_binding: consumedBudget,
      reservation: {
        ...reservationInput().reservation,
        runtime_ms: 500_000,
      },
    }),
    [],
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(
        consumedAdmission,
        actionAuthorizationInput(),
      ),
    /BACKGROUND_ACTION_GATE_DENIED/,
  );
});

test("TEST-014 dispatch authorization snapshot is exactly cross-bound to its budget authority", async () => {
  const {
    authorizeBackgroundAction,
    reserveBackgroundClaim,
    transitionBackgroundDispatch,
  } = await loadModel();
  const record = reserveBackgroundClaim(reservationInput(), []);
  const authorization = authorizeBackgroundAction(
    record,
    actionAuthorizationInput(),
  );
  const cases = [
    ["unknown field", (candidate) => { candidate.extra = true; }],
    ["action", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.action_id = "action.goal014.other"; },
      );
      candidate.action_id = candidate.budget_binding.action_id;
      candidate.controller_intent_digest =
        candidate.budget_binding.controller_intent_digest;
    }],
    ["idempotency", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.idempotency_key = "run.goal014.other-key"; },
      );
      candidate.idempotency_key = candidate.budget_binding.idempotency_key;
      candidate.controller_intent_digest =
        candidate.budget_binding.controller_intent_digest;
    }],
    ["action head", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.action_run_head_digest = D3; },
      );
      candidate.action_run_head_digest =
        candidate.budget_binding.action_run_head_digest;
      candidate.controller_intent_digest =
        candidate.budget_binding.controller_intent_digest;
    }],
    ["run version", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.run_version = 1; },
      );
      candidate.action_run_version = candidate.budget_binding.run_version;
    }],
    ["current head without version", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.current_run_head_digest = D3; },
      );
    }],
    ["effective limits", (candidate) => {
      candidate.budget_binding = backgroundBudgetBinding({
        ...candidate.budget_binding,
        effective_limits: {
          ...candidate.budget_binding.effective_limits,
          max_runtime_ms: 599_999,
        },
      });
    }],
    ["phase", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.approval_phase = "RESUME"; },
      );
    }],
    ["expiry", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => {
          budget.approval_expires_at = "2026-07-22T06:30:00.000Z";
        },
      );
    }],
  ];
  for (const [name, mutate] of cases) {
    const candidate = structuredClone(authorization);
    mutate(candidate);
    assert.throws(
      () =>
        transitionBackgroundDispatch(record, {
          expected_version: record.version,
          command: "DISPATCH_INTENDED",
          now: NOW,
          authorization: candidate,
          evidence_digest: D1,
          outcome: null,
        }),
      /BACKGROUND_TRANSITION_DENIED/,
      name,
    );
  }
});

test("TEST-014 runtime record validation matches strict run and budget bindings", async () => {
  const { isBackgroundDispatchRecord, reserveBackgroundClaim } = await loadModel();
  const record = reserveBackgroundClaim(reservationInput(), []);
  assert.equal(isBackgroundDispatchRecord(record), true);
  const cases = [
    ["phase", (candidate) => { candidate.run_binding.phase = "BROKEN"; }],
    ["version", (candidate) => { candidate.run_binding.expected_run_version = -1; }],
    ["goal", (candidate) => { candidate.run_binding.goal_digest = "not-a-digest"; }],
    ["expiry", (candidate) => { candidate.run_binding.approval_expires_at = "invalid"; }],
    ["risk", (candidate) => { candidate.run_binding.risk_profile = "UNKNOWN"; }],
    ["autonomy", (candidate) => { candidate.run_binding.autonomy_profile = "INTERACTIVE"; }],
    ["required gates", (candidate) => { candidate.run_binding.required_gates = ["bad gate"]; }],
    ["budget run", (candidate) => {
      candidate.budget_binding = rehashBudgetBinding(
        candidate.budget_binding,
        (budget) => { budget.run_id = "run.goal014.other"; },
      );
    }],
  ];
  for (const [name, mutate] of cases) {
    const candidate = structuredClone(record);
    mutate(candidate);
    assert.equal(isBackgroundDispatchRecord(candidate), false, name);
  }
});

test("TEST-014 enforces the project worker reservation across queue keys", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const sharedPolicy = {
    ...reservationInput().shared_aggregate_policy,
    max_workers: 1,
  };
  const firstInput = reservationInput({
    shared_aggregate_policy: sharedPolicy,
    aggregate_policy: {
      ...reservationInput().aggregate_policy,
      max_workers: 1,
    },
  });
  const first = reserveBackgroundClaim(firstInput, []);
  const secondInput = secondReservationInput({
    shared_aggregate_policy: sharedPolicy,
    aggregate_policy: firstInput.aggregate_policy,
  });

  assert.throws(
    () => reserveBackgroundClaim(secondInput, [first]),
    /BACKGROUND_WORKER_CAP_EXHAUSTED/,
  );
});

test("TEST-014 enforces every aggregate reservation dimension", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const cases = [
    {
      name: "runtime",
      code: "BACKGROUND_RUNTIME_CAP_EXHAUSTED",
      policy: { max_reserved_runtime_ms: 10 * 60_000 },
    },
    {
      name: "remote calls",
      code: "BACKGROUND_REMOTE_CAP_EXHAUSTED",
      policy: { max_remote_calls: 1 },
      reservation: { remote_calls: 1 },
    },
    {
      name: "reviewers",
      code: "BACKGROUND_REVIEWER_CAP_EXHAUSTED",
      policy: { max_reviewers: 1 },
    },
    {
      name: "tokens",
      code: "BACKGROUND_TOKEN_CAP_EXHAUSTED",
      policy: { max_reserved_tokens: 1_000 },
      limits: { max_tokens: 1_000 },
      reservation: { tokens: 1_000 },
      capabilities: [...REQUIRED_CAPABILITIES, "TOKEN_METERING"],
    },
  ];

  for (const scenario of cases) {
    const defaults = reservationInput();
    const policy = { ...defaults.aggregate_policy, ...scenario.policy };
    const limits = { ...defaults.effective_limits, ...scenario.limits };
    const reservation = { ...defaults.reservation, ...scenario.reservation };
    const host = hostAttestation({
      capabilities: scenario.capabilities ?? [...REQUIRED_CAPABILITIES],
    });
    const firstInput = reservationInput({
      shared_aggregate_policy: policy,
      aggregate_policy: policy,
      effective_limits: limits,
      reservation,
      host_attestation: host,
    });
    const first = reserveBackgroundClaim(firstInput, []);
    const second = secondReservationInput({
      shared_aggregate_policy: policy,
      aggregate_policy: policy,
      effective_limits: limits,
      reservation,
      host_attestation: host,
    });
    assert.throws(
      () => reserveBackgroundClaim(second, [first]),
      new RegExp(scenario.code),
      scenario.name,
    );
  }
});

test("TEST-014 finite token caps reject unknown accounting semantically", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const defaults = reservationInput();
  const input = reservationInput({
    aggregate_policy: {
      ...defaults.aggregate_policy,
      max_reserved_tokens: 10_000,
    },
    effective_limits: {
      ...defaults.effective_limits,
      max_tokens: 10_000,
    },
    reservation: {
      ...defaults.reservation,
      tokens: null,
    },
    host_attestation: hostAttestation({
      capabilities: [...REQUIRED_CAPABILITIES, "TOKEN_METERING"],
    }),
  });

  assert.throws(
    () => reserveBackgroundClaim(input, []),
    /BACKGROUND_TOKEN_ACCOUNTING_UNKNOWN/,
  );
});

test("TEST-014 denies malformed active accounting and same-run policy drift", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const input = reservationInput();
  const record = reserveBackgroundClaim(input, []);

  assert.throws(
    () => reserveBackgroundClaim(secondReservationInput(), [{}]),
    /INVALID_ACTIVE_BACKGROUND_RESERVATION/,
  );
  assert.throws(
    () =>
      reserveBackgroundClaim(secondReservationInput(), [
        { ...record, aggregate_policy_digest: D3 },
      ]),
    /BACKGROUND_RUN_POLICY_DRIFT/,
  );
});

test("TEST-014 held epoch drift fails closed while a released epoch does not hold capacity", async () => {
  const { reserveBackgroundClaim, transitionBackgroundDispatch } =
    await loadModel();
  const first = reserveBackgroundClaim(reservationInput(), []);
  const nextEpoch = secondReservationInput({
    aggregate_epoch_digest: D3,
    policy_verification: policyVerification({
      queue_item_id: "queue.goal014.item002",
      aggregate_epoch_digest: D3,
    }),
  });

  assert.throws(
    () => reserveBackgroundClaim(nextEpoch, [first]),
    /BACKGROUND_AGGREGATE_EPOCH_DRIFT/,
  );

  const released = transitionBackgroundDispatch(first, {
    expected_version: 0,
    command: "CANCEL",
    now: NOW,
    authorization: null,
    evidence_digest: D1,
    outcome: null,
  });
  const accepted = reserveBackgroundClaim(nextEpoch, [released]);
  assert.equal(accepted.aggregate_epoch_digest, D3);
  assert.equal(accepted.reservation_status, "HELD");
});

test("TEST-014 same-run tightening is distinct from shared capacity", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const sharedPolicy = {
    ...reservationInput().shared_aggregate_policy,
    max_workers: 3,
  };
  const runPolicy = {
    ...reservationInput().aggregate_policy,
    max_workers: 1,
  };
  const first = reserveBackgroundClaim(
    reservationInput({
      shared_aggregate_policy: sharedPolicy,
      aggregate_policy: runPolicy,
    }),
    [],
  );
  const drifted = secondReservationInput({
    shared_aggregate_policy: sharedPolicy,
    aggregate_policy: { ...runPolicy, max_workers: 2 },
    aggregate_policy_digest: D3,
    policy_verification: policyVerification({
      queue_item_id: "queue.goal014.item002",
      aggregate_policy_digest: D3,
    }),
  });
  assert.throws(
    () => reserveBackgroundClaim(drifted, [first]),
    /BACKGROUND_RUN_POLICY_DRIFT/,
  );

  const sameRunPolicy = secondReservationInput({
    shared_aggregate_policy: sharedPolicy,
    aggregate_policy: runPolicy,
  });
  assert.throws(
    () => reserveBackgroundClaim(sameRunPolicy, [first]),
    /BACKGROUND_RUN_WORKER_CAP_EXHAUSTED/,
  );
});

test("TEST-014 finite run token accounting ignores null usage from another run when the shared cap is null", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const sharedPolicy = {
    ...reservationInput().shared_aggregate_policy,
    max_workers: 3,
    max_reserved_runtime_ms: 30 * 60_000,
    max_reviewers: 3,
  };
  const foreignQueue = queueClaim({
    queue_item_id: "queue.goal014.foreign001",
    run_id: "run.goal014.foreign001",
    policy_digest: D2,
    lease: {
      lease_id: "lease.goal014.foreign001",
      worker_ref: "worker.goal014.foreign001",
      attempt: 1,
      expires_at: "2026-07-22T05:20:00.000Z",
    },
  });
  const foreign = reserveBackgroundClaim(
    reservationInput({
      dispatch_id: "dispatch.goal014.foreign001",
      queue_claim: foreignQueue,
      shared_aggregate_policy: sharedPolicy,
      aggregate_policy_digest: D3,
      worktree_attestation: worktreeAttestation({
        attestation_id: "worktree-attestation.goal014.foreign001",
        run_id: foreignQueue.run_id,
        queue_item_id: foreignQueue.queue_item_id,
        lease_id: foreignQueue.lease.lease_id,
        worker_ref: foreignQueue.lease.worker_ref,
        worktree_ref: "worktree.goal014.foreign001",
        root_digest: D1,
      }),
    }),
    [],
  );

  const defaults = reservationInput();
  const runPolicy = {
    ...defaults.aggregate_policy,
    max_reserved_tokens: 1_000,
  };
  const limits = { ...defaults.effective_limits, max_tokens: 1_000 };
  const reservation = { ...defaults.reservation, tokens: 1_000 };
  const meteredHost = hostAttestation({
    capabilities: [...REQUIRED_CAPABILITIES, "TOKEN_METERING"],
  });
  const accepted = reserveBackgroundClaim(
    reservationInput({
      shared_aggregate_policy: sharedPolicy,
      aggregate_policy: runPolicy,
      effective_limits: limits,
      reservation,
      host_attestation: meteredHost,
    }),
    [foreign],
  );
  assert.equal(accepted.reservation.tokens, 1_000);

  const sameRunSecond = secondReservationInput({
    shared_aggregate_policy: sharedPolicy,
    aggregate_policy: runPolicy,
    effective_limits: limits,
    reservation,
    host_attestation: meteredHost,
  });
  assert.throws(
    () => reserveBackgroundClaim(sameRunSecond, [foreign, accepted]),
    /BACKGROUND_RUN_TOKEN_CAP_EXHAUSTED/,
  );
});

test("TEST-014 prevents active or quarantined worktree reuse", async () => {
  const { reserveBackgroundClaim } = await loadModel();
  const record = reserveBackgroundClaim(reservationInput(), []);
  const reused = secondReservationInput({
    worktree_attestation: worktreeAttestation({
      attestation_id: "worktree-attestation.goal014.002",
      queue_item_id: "queue.goal014.item002",
      lease_id: "lease.goal014.002",
      worker_ref: "worker.goal014.002",
    }),
    worktree_verification: worktreeVerification({
      attestation_id: "worktree-attestation.goal014.002",
      queue_item_id: "queue.goal014.item002",
      lease_id: "lease.goal014.002",
      worker_ref: "worker.goal014.002",
    }),
  });

  assert.throws(
    () => reserveBackgroundClaim(reused, [record]),
    /BACKGROUND_WORKTREE_UNAVAILABLE/,
  );
  assert.throws(
    () =>
      reserveBackgroundClaim(reused, [
        {
          ...record,
          state: "COMPLETED",
          worktree: { ...record.worktree, disposition: "QUARANTINED" },
        },
      ]),
    /BACKGROUND_WORKTREE_UNAVAILABLE/,
  );
});

test("TEST-014 authorizes an action only from a live admission and proven newer run head", async () => {
  const { authorizeBackgroundAction, reserveBackgroundClaim } = await loadModel();
  assert.equal(typeof authorizeBackgroundAction, "function");
  const admission = reserveBackgroundClaim(reservationInput(), []);
  const authorization = authorizeBackgroundAction(
    admission,
    actionAuthorizationInput(),
  );

  assert.equal(authorization.schema, "background_action_authorization_v2");
  assert.equal(authorization.queue_run_head_digest, D2);
  assert.equal(authorization.action_run_head_digest, D1);
  assert.notEqual(
    authorization.queue_run_head_digest,
    authorization.action_run_head_digest,
  );
  assert.equal(authorization.queue_item_id, "queue.goal014.item001");
  assert.equal(authorization.lease_id, "lease.goal014.001");
  assert.equal(authorization.worktree_ref, "worktree.goal014.001");
  assert.equal(authorization.action_id, "action.goal014.001");
  assert.ok(Object.isFrozen(authorization));
});

test("TEST-014 binds post-dispatch authorization to the exact non-work operation", async () => {
  const {
    authorizeBackgroundAction,
    reserveBackgroundClaim,
    transitionBackgroundDispatch,
  } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);
  const workInput = actionAuthorizationInput({
    lineage_verification: {
      ...actionAuthorizationInput().lineage_verification,
      operation: "work",
    },
  });
  const workAuthorization = authorizeBackgroundAction(admission, workInput);
  const intended = transitionBackgroundDispatch(admission, {
    expected_version: 0,
    command: "DISPATCH_INTENDED",
    now: NOW,
    authorization: workAuthorization,
    evidence_digest: D1,
    outcome: null,
  });
  const dispatched = transitionBackgroundDispatch(intended, {
    expected_version: 1,
    command: "OBSERVE_DISPATCH",
    now: NOW,
    authorization: null,
    evidence_digest: D2,
    outcome: "DISPATCHED",
  });
  const sourceWriteInput = actionAuthorizationInput({
    current_queue_claim: queueClaim({
      queue_version: 4,
      dispatch_commit: dispatchCommitFor(intended),
    }),
    action_gate: dispatchGate({ operation: "source-write", run_head_digest: D1 }),
    lineage_verification: {
      ...actionAuthorizationInput().lineage_verification,
      operation: "source-write",
    },
    host_attestation: hostAttestation({ run_head_digest: D1 }),
  });
  const sourceWrite = authorizeBackgroundAction(dispatched, sourceWriteInput);
  assert.equal(sourceWrite.operation, "source-write");
  assert.equal(sourceWrite.action_id, dispatched.action_binding.action_id);
  assert.equal(sourceWrite.action_run_head_digest, D1);
  assert.deepEqual(sourceWrite.host_binding, {
    attestation_id: "attestation.goal014.001",
    host_ref: "host.local.reference",
    evidence_digest: D1,
    expires_at: "2026-07-22T06:00:00.000Z",
    effective_isolation: "HARDENED",
    required_capabilities: [...REQUIRED_CAPABILITIES].sort(),
  });

  assert.throws(
    () =>
      authorizeBackgroundAction(dispatched, {
        ...sourceWriteInput,
        host_attestation: null,
      }),
    /BACKGROUND_HOST_ATTESTATION_MISMATCH/,
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(dispatched, {
        ...sourceWriteInput,
        host_attestation: hostAttestation({
          attestation_id: "attestation.goal014.other",
          host_ref: "host.other.reference",
          run_head_digest: D1,
          evidence_digest: D2,
        }),
      }),
    /BACKGROUND_HOST_ATTESTATION_MISMATCH/,
  );

  assert.throws(
    () =>
      authorizeBackgroundAction(dispatched, {
        ...workInput,
        current_queue_claim: sourceWriteInput.current_queue_claim,
        host_attestation: hostAttestation({ run_head_digest: D1 }),
      }),
    /BACKGROUND_ACTION_GATE_DENIED/,
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(dispatched, {
        ...sourceWriteInput,
        action_gate: {
          ...sourceWriteInput.action_gate,
          operation: "fake.external.write",
          action_id: "action.goal014.different",
        },
        lineage_verification: {
          ...sourceWriteInput.lineage_verification,
          operation: "fake.external.write",
          action_id: "action.goal014.different",
        },
      }),
    /BACKGROUND_ACTION_GATE_DENIED/,
  );
});

test("TEST-014 denies stale lease, unproven lineage, and action after cancellation", async () => {
  const { authorizeBackgroundAction, reserveBackgroundClaim } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);

  assert.throws(
    () =>
      authorizeBackgroundAction(
        admission,
        actionAuthorizationInput({
          current_queue_claim: queueClaim({
            queue_version: 4,
            lease: {
              lease_id: "lease.goal014.replaced",
              worker_ref: "worker.goal014.001",
              attempt: 2,
              expires_at: "2026-07-22T05:20:00.000Z",
            },
          }),
        }),
      ),
    /BACKGROUND_LEASE_STALE/,
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(admission, actionAuthorizationInput({
        lineage_verification: {
          ...actionAuthorizationInput().lineage_verification,
          verified: false,
        },
      })),
    /BACKGROUND_LINEAGE_UNVERIFIED/,
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(
        { ...admission, state: "CANCEL_REQUESTED" },
        actionAuthorizationInput(),
      ),
    /BACKGROUND_ACTION_BLOCKED/,
  );
});

test("TEST-014 permits only a higher-attempt released continuation with fresh approval", async () => {
  const { reserveBackgroundClaim, transitionBackgroundDispatch } = await loadModel();
  const first = reserveBackgroundClaim(reservationInput(), []);
  const released = transitionBackgroundDispatch(first, {
    expected_version: 0,
    command: "CANCEL",
    now: NOW,
    authorization: null,
    evidence_digest: D1,
    outcome: null,
  });
  const resumeClaim = queueClaim({
    queue_version: 8,
    phase: "RESUME",
    expected_run_version: 5,
    approval_digest: D1,
    lease: {
      lease_id: "lease.goal014.002",
      worker_ref: "worker.goal014.002",
      attempt: 2,
      expires_at: "2026-07-22T05:20:00.000Z",
    },
  });
  const resumed = reservationInput({
    dispatch_id: "dispatch.goal014.resume002",
    queue_claim: resumeClaim,
    host_attestation: hostAttestation({ approval_digest: D1 }),
    worktree_attestation: worktreeAttestation({
      lease_id: "lease.goal014.002",
      worker_ref: "worker.goal014.002",
    }),
    worktree_verification: worktreeVerification({
      lease_id: "lease.goal014.002",
      worker_ref: "worker.goal014.002",
    }),
    policy_verification: policyVerification({ confirmation_digest: D1 }),
  });

  const continuation = reserveBackgroundClaim(resumed, [released]);
  assert.equal(continuation.queue_binding.attempt, 2);
  assert.equal(continuation.run_binding.confirmation_digest, D1);
  assert.throws(
    () =>
      reserveBackgroundClaim(
        {
          ...resumed,
          dispatch_id: "dispatch.goal014.resume-same-attempt",
          queue_claim: {
            ...resumeClaim,
            lease: { ...resumeClaim.lease, attempt: 1 },
          },
        },
        [released],
      ),
    /BACKGROUND_DISPATCH_CONFLICT/,
  );
  assert.throws(
    () =>
      reserveBackgroundClaim(
        {
          ...resumed,
          dispatch_id: "dispatch.goal014.resume-stale-approval",
          queue_claim: { ...resumeClaim, approval_digest: D3 },
          host_attestation: hostAttestation(),
          policy_verification: policyVerification(),
        },
        [released],
      ),
    /BACKGROUND_ADMISSION_DENIED/,
  );
});

test("TEST-014 rejects action authorization after worktree or host capability expiry", async () => {
  const { authorizeBackgroundAction, reserveBackgroundClaim } = await loadModel();
  const observedAt = "2026-07-22T05:16:00.000Z";
  const expiredWorktree = reserveBackgroundClaim(
    reservationInput({
      worktree_attestation: worktreeAttestation({
        expires_at: "2026-07-22T05:15:00.000Z",
      }),
    }),
    [],
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(
        expiredWorktree,
        actionAuthorizationInput({ now: observedAt }),
      ),
    /BACKGROUND_ADMISSION_EXPIRED/,
  );

  const expiredHost = reserveBackgroundClaim(
    reservationInput({
      host_attestation: hostAttestation({
        expires_at: "2026-07-22T05:15:00.000Z",
      }),
    }),
    [],
  );
  assert.throws(
    () =>
      authorizeBackgroundAction(
        expiredHost,
        actionAuthorizationInput({ now: observedAt }),
      ),
    /BACKGROUND_ADMISSION_EXPIRED/,
  );
});

test("TEST-014 cancellation before dispatch releases capacity, after intent it quarantines", async () => {
  const {
    authorizeBackgroundAction,
    reserveBackgroundClaim,
    transitionBackgroundDispatch,
  } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);
  const cancelled = transitionBackgroundDispatch(admission, {
    expected_version: 0,
    command: "CANCEL",
    now: NOW,
    authorization: null,
    evidence_digest: D1,
    outcome: null,
  });
  assert.equal(cancelled.state, "CANCELLED");
  assert.equal(cancelled.reservation_status, "RELEASED");
  assert.equal(cancelled.worktree.disposition, "RELEASED");

  const authorization = authorizeBackgroundAction(
    admission,
    actionAuthorizationInput(),
  );
  const intended = transitionBackgroundDispatch(admission, {
    expected_version: 0,
    command: "DISPATCH_INTENDED",
    now: NOW,
    authorization,
    evidence_digest: D1,
    outcome: null,
  });
  assert.equal(intended.state, "DISPATCH_INTENDED");
  assert.equal(intended.dispatch_count, 1);
  const cancelling = transitionBackgroundDispatch(intended, {
    expected_version: 1,
    command: "CANCEL",
    now: NOW,
    authorization: null,
    evidence_digest: D2,
    outcome: null,
  });
  assert.equal(cancelling.state, "CANCEL_REQUESTED");
  assert.equal(cancelling.reservation_status, "HELD");
  assert.equal(cancelling.worktree.disposition, "ACTIVE");
  assert.throws(
    () => authorizeBackgroundAction(cancelling, actionAuthorizationInput()),
    /BACKGROUND_ACTION_BLOCKED/,
  );
});

test("TEST-014 unknown dispatch outcome remains held and quarantined until reconciliation", async () => {
  const {
    authorizeBackgroundAction,
    reserveBackgroundClaim,
    transitionBackgroundDispatch,
  } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);
  const authorization = authorizeBackgroundAction(
    admission,
    actionAuthorizationInput(),
  );
  const intended = transitionBackgroundDispatch(admission, {
    expected_version: 0,
    command: "DISPATCH_INTENDED",
    now: NOW,
    authorization,
    evidence_digest: D1,
    outcome: null,
  });
  const unknown = transitionBackgroundDispatch(intended, {
    expected_version: 1,
    command: "OBSERVE_DISPATCH",
    now: NOW,
    authorization: null,
    evidence_digest: D2,
    outcome: "UNKNOWN",
  });
  assert.equal(unknown.state, "UNKNOWN_OUTCOME");
  assert.equal(unknown.reservation_status, "HELD");
  assert.equal(unknown.worktree.disposition, "QUARANTINED");
  assert.equal(unknown.requires_new_approval, true);
  assert.throws(
    () =>
      transitionBackgroundDispatch(unknown, {
        expected_version: 2,
        command: "DISPATCH_INTENDED",
        now: NOW,
        authorization,
        evidence_digest: D3,
        outcome: null,
      }),
    /BACKGROUND_TRANSITION_DENIED/,
  );

  const reconciled = transitionBackgroundDispatch(unknown, {
    expected_version: 2,
    command: "RECONCILE",
    now: NOW,
    authorization: null,
    evidence_digest: D3,
    outcome: "QUARANTINED",
  });
  assert.equal(reconciled.state, "RECONCILED");
  assert.equal(reconciled.reservation_status, "RELEASED");
  assert.equal(reconciled.worktree.disposition, "QUARANTINED");
});

test("TEST-014 lease loss and failed completion quarantine with fresh approval", async () => {
  const { authorizeBackgroundAction, reserveBackgroundClaim, transitionBackgroundDispatch } =
    await loadModel();
  const input = reservationInput();
  const reserved = reserveBackgroundClaim(input, []);
  const lost = transitionBackgroundDispatch(reserved, {
    expected_version: 0,
    command: "LEASE_LOST",
    now: input.now,
    authorization: null,
    evidence_digest: input.aggregate_policy_digest,
    outcome: null,
  });
  assert.equal(lost.state, "UNKNOWN_OUTCOME");
  assert.equal(lost.reservation_status, "HELD");
  assert.equal(lost.worktree.disposition, "QUARANTINED");
  assert.equal(lost.requires_new_approval, true);

  const authorization = authorizeBackgroundAction(
    reserved,
    actionAuthorizationInput(),
  );
  const intended = transitionBackgroundDispatch(reserved, {
    expected_version: 0,
    command: "DISPATCH_INTENDED",
    now: input.now,
    authorization,
    evidence_digest: input.aggregate_policy_digest,
    outcome: null,
  });
  const dispatched = transitionBackgroundDispatch(intended, {
    expected_version: 1,
    command: "OBSERVE_DISPATCH",
    now: input.now,
    authorization: null,
    evidence_digest: input.aggregate_policy_digest,
    outcome: "DISPATCHED",
  });
  const failed = transitionBackgroundDispatch(dispatched, {
    expected_version: 2,
    command: "COMPLETE",
    now: input.now,
    authorization: null,
    evidence_digest: input.aggregate_policy_digest,
    outcome: "FAILURE",
  });
  assert.equal(failed.worktree.disposition, "QUARANTINED");
  assert.equal(failed.requires_new_approval, true);
});

test("TEST-014 transition CAS rejects stale writers", async () => {
  const { reserveBackgroundClaim, transitionBackgroundDispatch } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);
  assert.throws(
    () =>
      transitionBackgroundDispatch(admission, {
        expected_version: 1,
        command: "CANCEL",
        now: NOW,
        authorization: null,
        evidence_digest: D1,
        outcome: null,
      }),
    /BACKGROUND_VERSION_CONFLICT/,
  );
});

test("TEST-014 cancellation race still accepts authoritative dispatch observation", async () => {
  const {
    authorizeBackgroundAction,
    reserveBackgroundClaim,
    transitionBackgroundDispatch,
  } = await loadModel();
  const admission = reserveBackgroundClaim(reservationInput(), []);
  const authorization = authorizeBackgroundAction(
    admission,
    actionAuthorizationInput(),
  );
  const intended = transitionBackgroundDispatch(admission, {
    expected_version: 0,
    command: "DISPATCH_INTENDED",
    now: NOW,
    authorization,
    evidence_digest: D1,
    outcome: null,
  });
  const cancelling = transitionBackgroundDispatch(intended, {
    expected_version: 1,
    command: "CANCEL",
    now: NOW,
    authorization: null,
    evidence_digest: D2,
    outcome: null,
  });
  const observed = transitionBackgroundDispatch(cancelling, {
    expected_version: 2,
    command: "OBSERVE_DISPATCH",
    now: NOW,
    authorization: null,
    evidence_digest: D3,
    outcome: "DISPATCHED",
  });
  assert.equal(observed.state, "CANCEL_REQUESTED");
  assert.equal(observed.reservation_status, "HELD");
  assert.equal(observed.result.outcome, "DISPATCHED_CANCEL_PENDING");
});
