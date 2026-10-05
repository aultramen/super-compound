import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateSchemaDefinition,
  validateValue,
} from "./schema-validator.mjs";

const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const D3 = `sha256:${"c".repeat(64)}`;
const PREPARED_AT = "2026-07-22T02:00:00.000Z";
const AVAILABLE_AT = "2026-07-22T02:01:00.000Z";
const EXPIRES_AT = "2026-07-22T03:00:00.000Z";

async function loadModel() {
  return import("./loop-queue-model.mjs").catch(() => ({}));
}

function preparation(overrides = {}) {
  return {
    queue_item_id: "queue.goal012.item001",
    run_binding: {
      run_id: "run.goal012.background001",
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
    },
    provenance: {
      trigger_id: "trigger.goal012.once001",
      actor_ref: "actor.project.owner",
      source_ref: "source.local.oneshot",
    },
    dedupe_identity_digest: D1,
    payload_digest: D2,
    prepared_at: PREPARED_AT,
    available_at: AVAILABLE_AT,
    expires_at: EXPIRES_AT,
    missed_run_policy: "CANCEL",
    lease_policy: {
      duration_ms: 60_000,
      heartbeat_interval_ms: 10_000,
    },
    retry_policy: {
      max_attempts: 2,
      backoff_ms: 5_000,
    },
    concurrency: {
      key: "project.goal012",
      limit: 1,
    },
    rate_limit: {
      key: "project.goal012",
      max_claims: 2,
      window_ms: 60_000,
    },
    result_sink_ref: "sink.local.audit",
    policy_ref: "policy.loop-runtime-v2",
    ...overrides,
  };
}

function approvalGate(item, overrides = {}) {
  return {
    allowed: true,
    would_allow: true,
    simulation_only: false,
    mutation_authorized: true,
    operation: "queue-claim",
    queue_item_id: item.queue_item_id,
    run_id: item.run_binding.run_id,
    run_version: 1,
    confirmation_expected_run_version: item.run_binding.expected_run_version,
    approval_phase: item.run_binding.phase,
    confirmation_digest: D2,
    approval_expires_at: "2026-07-22T02:45:00.000Z",
    confirmed_goal_digest: item.run_binding.goal_digest,
    authority_digest: item.run_binding.authority_digest,
    verifier_digest: item.run_binding.verifier_digest,
    confirmed_eval_definition_digest: item.run_binding.eval_definition_digest,
    project_config_digest: item.run_binding.project_config_digest,
    policy_digest: item.run_binding.policy_digest,
    operation_inventory_digest: item.run_binding.operation_inventory_digest,
    run_head_digest: D3,
    confirmed_risk_profile: item.run_binding.risk_profile,
    confirmed_autonomy_profile: item.run_binding.autonomy_profile,
    confirmed_required_gates: [...item.run_binding.required_gates],
    approver_actor_type: "HUMAN",
    approver_attestation: "HOST_ATTESTED_HUMAN",
    ...overrides,
  };
}

function dispatchPermit(overrides = {}) {
  return {
    expected_version: 2,
    now: "2026-07-22T02:06:10.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    attempt: 1,
    dispatch_id: "dispatch.goal014.atomic001",
    operation: "work",
    action_id: "action.goal014.atomic001",
    idempotency_key: "run.goal014.atomic001.action",
    controller_intent_digest: D1,
    action_run_head_digest: D2,
    action_run_version: 2,
    authorization_expires_at: "2026-07-22T02:45:00.000Z",
    background_record_version: 1,
    background_record_digest: D3,
    ...overrides,
  };
}

test("prepare creates one immutable strict one-shot queue item without approval authority", async () => {
  const { prepareQueueItem } = await loadModel();
  assert.equal(typeof prepareQueueItem, "function", "queue model must expose prepareQueueItem");

  const item = prepareQueueItem(preparation());

  assert.equal(item.schema, "automation_trigger_v2");
  assert.equal(item.contract_version, "2.0.0");
  assert.equal(item.queue_item_id, "queue.goal012.item001");
  assert.equal(item.version, 0);
  assert.equal(item.state, "PREPARED");
  assert.equal(item.run_binding.approval_digest, null);
  assert.equal(item.run_binding.approval_expires_at, null);
  assert.equal(item.lease, null);
  assert.equal(item.dispatch_commit, null);
  assert.equal(item.result, null);
  assert.equal(item.cancellation, null);
  assert.equal(item.reconciliation, null);
  assert.equal(item.attempts, 0);
  assert.deepEqual(item.claim_history, []);
  assert.equal(item.cancellation_requested, false);
  assert.equal(item.retry_not_before, null);
  assert.equal(Object.isFrozen(item), true);
  assert.equal(Object.isFrozen(item.run_binding), true);

  assert.throws(
    () => prepareQueueItem(preparation({ retry_policy: { max_attempts: 257, backoff_ms: 0 } })),
    /INVALID_QUEUE_PREPARATION/,
    "claim history is bounded to 256, so retry attempts must use the same ceiling",
  );
});

test("submit makes a prepared item claimable only from an exact host-attested approval gate", async () => {
  const { prepareQueueItem, submitQueueItem } = await loadModel();
  assert.equal(typeof submitQueueItem, "function", "queue model must expose submitQueueItem");
  const prepared = prepareQueueItem(preparation());

  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate: approvalGate(prepared),
  });

  assert.equal(submitted.state, "SUBMITTED");
  assert.equal(submitted.version, 1);
  assert.equal(submitted.run_binding.approval_digest, D2);
  assert.equal(
    submitted.run_binding.approval_expires_at,
    "2026-07-22T02:45:00.000Z",
  );
  assert.equal(submitted.run_binding.run_head_digest, D3);
  assert.equal(Object.isFrozen(submitted), true);

  for (const gate of [
    approvalGate(prepared, { queue_item_id: "queue.other" }),
    approvalGate(prepared, { confirmed_goal_digest: D3 }),
    approvalGate(prepared, { approver_actor_type: "MODEL" }),
    approvalGate(prepared, { approval_expires_at: "2026-07-22T02:04:59.000Z" }),
    approvalGate(prepared, { mutation_authorized: false, simulation_only: true }),
  ]) {
    assert.throws(
      () =>
        submitQueueItem(prepared, {
          expected_version: 0,
          confirmation_digest: D2,
          now: "2026-07-22T02:05:00.000Z",
          gate,
        }),
      /QUEUE_APPROVAL_REQUIRED/,
    );
  }
});

test("claim creates one bounded fencing lease only after revalidating approval and caps", async () => {
  const {
    claimQueueItem,
    evaluateQueueClaimApproval,
    prepareQueueItem,
    submitQueueItem,
    transitionQueueClaimApprovalRequired,
  } = await loadModel();
  assert.equal(typeof claimQueueItem, "function", "queue model must expose claimQueueItem");
  assert.equal(typeof evaluateQueueClaimApproval, "function");
  assert.equal(typeof transitionQueueClaimApprovalRequired, "function");
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimInput = {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  };

  const claimed = claimQueueItem(submitted, claimInput);

  assert.equal(claimed.state, "CLAIMED");
  assert.equal(claimed.version, 2);
  assert.equal(claimed.attempts, 1);
  assert.deepEqual(claimed.claim_history, ["2026-07-22T02:06:00.000Z"]);
  assert.deepEqual(claimed.lease, {
    lease_id: "lease.goal012.001",
    worker_ref: "worker.local.001",
    claimed_at: "2026-07-22T02:06:00.000Z",
    heartbeat_at: "2026-07-22T02:06:00.000Z",
    expires_at: "2026-07-22T02:07:00.000Z",
    attempt: 1,
  });
  assert.throws(() => claimQueueItem(claimed, { ...claimInput, expected_version: 2 }), /QUEUE_NOT_CLAIMABLE/);
  assert.throws(
    () => claimQueueItem(submitted, { ...claimInput, active_concurrency_count: 1 }),
    /QUEUE_CONCURRENCY_LIMIT/,
  );
  assert.throws(
    () => claimQueueItem(submitted, { ...claimInput, recent_claim_count: 2 }),
    /QUEUE_RATE_LIMIT/,
  );
  assert.throws(
    () =>
      claimQueueItem(submitted, {
        ...claimInput,
        gate: approvalGate(prepared, { confirmation_digest: D3 }),
      }),
    /QUEUE_APPROVAL_REQUIRED/,
  );
  const expiredApproval = evaluateQueueClaimApproval(submitted, {
      now: "2026-07-22T02:46:00.000Z",
      gate,
    });
  assert.deepEqual(
    expiredApproval,
    {
      decision: "APPROVAL_REQUIRED",
      transition: {
        state: "APPROVAL_REQUIRED",
        reason: "APPROVAL_EXPIRED",
        expected_version: 1,
        observed_at: "2026-07-22T02:46:00.000Z",
      },
    },
  );
  const approvalRequired = transitionQueueClaimApprovalRequired(
    submitted,
    expiredApproval,
  );
  assert.equal(approvalRequired.state, "APPROVAL_REQUIRED");
  assert.equal(approvalRequired.version, 2);
  assert.equal(approvalRequired.run_binding.approval_digest, null);
  assert.equal(approvalRequired.run_binding.run_head_digest, null);
  assert.equal(approvalRequired.retry_not_before, "2026-07-22T02:46:00.000Z");
  assert.deepEqual(approvalRequired.recovery, {
    reason: "APPROVAL_EXPIRED",
    previous_lease_id: null,
    requires_new_approval: true,
    reconciled_at: "2026-07-22T02:46:00.000Z",
  });
  const restartGate = approvalGate(prepared, {
    run_version: 4,
    confirmation_expected_run_version: 3,
    approval_phase: "START",
    confirmation_digest: D3,
    approval_expires_at: "2026-07-22T02:55:00.000Z",
    run_head_digest: D2,
  });
  const resubmitted = submitQueueItem(approvalRequired, {
    expected_version: 2,
    confirmation_digest: D3,
    now: "2026-07-22T02:46:00.000Z",
    gate: restartGate,
  });
  assert.equal(resubmitted.state, "SUBMITTED");
  assert.equal(resubmitted.run_binding.phase, "START");
  const mismatchedApproval = evaluateQueueClaimApproval(submitted, {
      now: "2026-07-22T02:06:00.000Z",
      gate: approvalGate(prepared, { confirmed_goal_digest: D3 }),
    });
  assert.equal(mismatchedApproval.transition.reason, "APPROVAL_MISMATCH");
  const mismatchRequired = transitionQueueClaimApprovalRequired(
    submitted,
    mismatchedApproval,
  );
  assert.equal(mismatchRequired.recovery.reason, "APPROVAL_MISMATCH");
  assert.equal(mismatchRequired.retry_not_before, "2026-07-22T02:06:00.000Z");
  const mismatchResubmitted = submitQueueItem(mismatchRequired, {
    expected_version: 2,
    confirmation_digest: D3,
    now: "2026-07-22T02:06:00.000Z",
    gate: restartGate,
  });
  assert.equal(mismatchResubmitted.state, "SUBMITTED");
  assert.equal(mismatchResubmitted.run_binding.phase, "START");
});

test("heartbeat renews only the live fencing lease and never revives a dead lease", async () => {
  const {
    claimQueueItem,
    heartbeatQueueItem,
    prepareQueueItem,
    submitQueueItem,
  } = await loadModel();
  assert.equal(typeof heartbeatQueueItem, "function");
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });

  const renewed = heartbeatQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:06:30.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
  });
  assert.equal(renewed.version, 3);
  assert.equal(renewed.lease.heartbeat_at, "2026-07-22T02:06:30.000Z");
  assert.equal(renewed.lease.expires_at, "2026-07-22T02:07:30.000Z");

  assert.throws(
    () => heartbeatQueueItem(claimed, {
      expected_version: 2,
      now: "2026-07-22T02:06:30.000Z",
      worker_ref: "worker.local.002",
      lease_id: "lease.goal012.001",
    }),
    /QUEUE_LEASE_OWNERSHIP_LOST/,
  );
  assert.throws(
    () => heartbeatQueueItem(claimed, {
      expected_version: 2,
      now: "2026-07-22T02:07:00.000Z",
      worker_ref: "worker.local.001",
      lease_id: "lease.goal012.001",
    }),
    /QUEUE_LEASE_EXPIRED/,
  );
});

test("an in-flight lease remains observable after approval expiry without authorizing another claim", async () => {
  const {
    claimQueueItem,
    heartbeatQueueItem,
    prepareQueueItem,
    submitQueueItem,
  } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const shortGate = approvalGate(prepared, {
    approval_expires_at: "2026-07-22T02:06:15.000Z",
  });
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate: shortGate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate: shortGate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  assert.equal(claimed.lease.expires_at, "2026-07-22T02:07:00.000Z");
  const observed = heartbeatQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:06:30.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
  });
  assert.equal(observed.lease.expires_at, "2026-07-22T02:07:30.000Z");
});

test("complete accepts one live claimant result and is idempotent only for the same result", async () => {
  const {
    claimQueueItem,
    completeQueueItem,
    prepareQueueItem,
    submitQueueItem,
  } = await loadModel();
  assert.equal(typeof completeQueueItem, "function");
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const completion = {
    expected_version: 2,
    now: "2026-07-22T02:06:30.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    outcome: "KNOWN_RESULT",
    result_digest: D3,
  };

  const completed = completeQueueItem(claimed, completion);
  assert.equal(completed.state, "COMPLETED");
  assert.equal(completed.version, 3);
  assert.equal(completed.lease, null);
  assert.deepEqual(completed.result, {
    outcome: "KNOWN_RESULT",
    result_digest: D3,
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    recorded_at: "2026-07-22T02:06:30.000Z",
  });
  assert.equal(completeQueueItem(completed, completion), completed);
  assert.equal(
    completeQueueItem(completed, {
      ...completion,
      expected_version: completed.version,
      now: "2026-07-22T02:06:45.000Z",
    }),
    completed,
    "a transport retry for the same result identity must ignore observation time",
  );
  assert.throws(
    () => completeQueueItem(completed, { ...completion, result_digest: D2 }),
    /QUEUE_RESULT_CONFLICT/,
  );

  const unknown = completeQueueItem(claimed, {
    ...completion,
    outcome: "UNKNOWN_OUTCOME",
  });
  assert.equal(unknown.state, "UNKNOWN_OUTCOME");
  assert.equal(unknown.recovery.requires_new_approval, true);
});

test("cancellation before permit consumption denies handoff while commit-first requires observation", async () => {
  const {
    cancelQueueItem,
    claimQueueItem,
    consumeQueueDispatchPermit,
    heartbeatQueueItem,
    prepareQueueItem,
    submitQueueItem,
  } = await loadModel();
  assert.equal(typeof cancelQueueItem, "function");
  const prepared = prepareQueueItem(preparation());
  const cancellation = {
    expected_version: 0,
    now: "2026-07-22T02:00:30.000Z",
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.cancelled",
  };
  const cancelled = cancelQueueItem(prepared, cancellation);
  assert.equal(cancelled.state, "CANCELLED");
  assert.equal(cancelled.cancellation_requested, true);
  assert.equal(cancelQueueItem(cancelled, cancellation), cancelled);

  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const cancelledBeforeDispatch = cancelQueueItem(claimed, {
    ...cancellation,
    expected_version: 2,
    now: "2026-07-22T02:06:10.000Z",
  });
  assert.equal(cancelledBeforeDispatch.state, "CANCEL_REQUESTED");
  assert.equal(cancelledBeforeDispatch.dispatch_commit, null);
  assert.throws(
    () => consumeQueueDispatchPermit(cancelledBeforeDispatch, dispatchPermit()),
    /QUEUE_DISPATCH_NOT_CLAIMABLE/,
  );
  assert.throws(
    () =>
      heartbeatQueueItem(cancelledBeforeDispatch, {
        expected_version: cancelledBeforeDispatch.version,
        now: "2026-07-22T02:06:20.000Z",
        worker_ref: "worker.local.001",
        lease_id: "lease.goal012.001",
      }),
    /QUEUE_LEASE_OWNERSHIP_LOST/,
  );

  const committed = consumeQueueDispatchPermit(claimed, dispatchPermit());
  assert.equal(committed.state, "CLAIMED");
  assert.equal(committed.version, 3);
  assert.deepEqual(committed.dispatch_commit, {
    dispatch_id: "dispatch.goal014.atomic001",
    operation: "work",
    action_id: "action.goal014.atomic001",
    idempotency_key: "run.goal014.atomic001.action",
    controller_intent_digest: D1,
    action_run_head_digest: D2,
    action_run_version: 2,
    authorization_expires_at: "2026-07-22T02:45:00.000Z",
    background_record_version: 1,
    background_record_digest: D3,
    lease_id: "lease.goal012.001",
    worker_ref: "worker.local.001",
    attempt: 1,
    committed_at: "2026-07-22T02:06:10.000Z",
  });
  assert.equal(
    consumeQueueDispatchPermit(
      committed,
      dispatchPermit({ now: "2026-07-22T02:06:20.000Z" }),
    ),
    committed,
    "a lost acknowledgement must never consume a second permit",
  );
  const requested = cancelQueueItem(committed, {
    ...cancellation,
    expected_version: 3,
    now: "2026-07-22T02:06:30.000Z",
  });
  assert.equal(requested.state, "CANCEL_REQUESTED");
  assert.equal(requested.lease.lease_id, "lease.goal012.001");
  assert.equal(
    cancelQueueItem(requested, {
      ...cancellation,
      expected_version: 3,
      now: "2026-07-22T02:06:40.000Z",
    }),
    requested,
  );
  assert.throws(
    () =>
      cancelQueueItem(requested, {
        ...cancellation,
        expected_version: 3,
        now: "2026-07-22T02:06:40.000Z",
        reason_ref: "reason.different",
      }),
    /QUEUE_CANCELLATION_CONFLICT/,
  );
  assert.throws(
    () =>
      consumeQueueDispatchPermit(
        committed,
        dispatchPermit({ dispatch_id: "dispatch.goal014.conflict" }),
      ),
    /QUEUE_DISPATCH_COMMIT_CONFLICT/,
  );
});

test("a consumed dispatch permit makes dead-lease outcome unknown and non-retryable", async () => {
  const {
    claimQueueItem,
    consumeQueueDispatchPermit,
    prepareQueueItem,
    reconcileQueueItem,
    submitQueueItem,
  } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const committed = consumeQueueDispatchPermit(claimed, dispatchPermit());
  const unknown = reconcileQueueItem(committed, {
    expected_version: 3,
    now: "2026-07-22T02:07:00.000Z",
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });

  assert.equal(unknown.state, "UNKNOWN_OUTCOME");
  assert.equal(unknown.lease, null);
  assert.equal(unknown.dispatch_commit.dispatch_id, "dispatch.goal014.atomic001");
  assert.equal(unknown.recovery.reason, "LEASE_EXPIRED_AFTER_DISPATCH_COMMIT");
  assert.equal(unknown.recovery.requires_new_approval, true);
});

test("a cancellation retry uses stable actor and reason identity instead of the observation time", async () => {
  const { cancelQueueItem, prepareQueueItem } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const cancelled = cancelQueueItem(prepared, {
    expected_version: 0,
    now: "2026-07-22T02:00:30.000Z",
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.cancelled",
  });

  assert.equal(
    cancelQueueItem(cancelled, {
      expected_version: 0,
      now: "2026-07-22T02:00:45.000Z",
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    }),
    cancelled,
  );
  assert.throws(
    () =>
      cancelQueueItem(cancelled, {
        expected_version: 0,
        now: "2026-07-22T02:00:45.000Z",
        actor_ref: "actor.project.owner",
        reason_ref: "reason.different",
      }),
    /QUEUE_CANCELLATION_CONFLICT/,
  );
});

test("an unconsumed cancellation becomes terminal when its lease dies and cannot enter submit or claim", async () => {
  const {
    cancelQueueItem,
    claimQueueItem,
    prepareQueueItem,
    reconcileQueueItem,
    submitQueueItem,
  } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const requested = cancelQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:06:10.000Z",
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.cancelled",
  });
  assert.equal(requested.state, "CANCEL_REQUESTED");
  const cancelled = reconcileQueueItem(requested, {
    expected_version: 3,
    now: "2026-07-22T02:07:00.000Z",
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
  assert.equal(cancelled.state, "CANCELLED");
  assert.equal(cancelled.lease, null);
  assert.equal(cancelled.retry_not_before, null);
  assert.equal(cancelled.recovery.requires_new_approval, false);

  const cancellation = {
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.cancelled",
    requested_at: "2026-07-22T02:00:30.000Z",
  };
  const preparedWithCancellation = {
    ...prepared,
    cancellation_requested: true,
    cancellation,
  };
  assert.throws(
    () =>
      submitQueueItem(preparedWithCancellation, {
        expected_version: 0,
        confirmation_digest: D2,
        now: "2026-07-22T02:05:00.000Z",
        gate,
      }),
    /QUEUE_APPROVAL_REQUIRED/,
  );

  const submittedWithCancellation = {
    ...submitted,
    cancellation_requested: true,
    cancellation,
  };
  assert.throws(
    () =>
      claimQueueItem(submittedWithCancellation, {
        expected_version: 1,
        now: "2026-07-22T02:06:00.000Z",
        worker_ref: "worker.local.001",
        lease_id: "lease.goal012.cancelled",
        gate,
        active_concurrency_count: 0,
        recent_claim_count: 0,
      }),
    /QUEUE_NOT_CLAIMABLE/,
  );
});

test("approval-loss handling cannot rewrite a cancellation-marked submitted item", async () => {
  const {
    evaluateQueueClaimApproval,
    prepareQueueItem,
    submitQueueItem,
    transitionQueueClaimApprovalRequired,
  } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const cancellationMarked = {
    ...submitted,
    cancellation_requested: true,
    cancellation: {
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
      requested_at: "2026-07-22T02:06:10.000Z",
    },
  };
  const disposition = evaluateQueueClaimApproval(cancellationMarked, {
    now: "2026-07-22T02:46:00.000Z",
    gate,
  });

  assert.equal(disposition.decision, "APPROVAL_REQUIRED");
  assert.throws(
    () => transitionQueueClaimApprovalRequired(cancellationMarked, disposition),
    /INVALID_QUEUE_APPROVAL_TRANSITION/,
    "claim admission must fail closed before persisting an approval transition",
  );
});

test("reconcile expires unclaimed work and turns a dead lease into approval-required without retry", async () => {
  const {
    claimQueueItem,
    prepareQueueItem,
    reconcileQueueItem,
    submitQueueItem,
  } = await loadModel();
  assert.equal(typeof reconcileQueueItem, "function");
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  assert.throws(
    () =>
      reconcileQueueItem(claimed, {
        expected_version: 2,
        now: "2026-07-22T02:07:00.000Z",
        actor_ref: "actor.reconciliation.owner",
        resolution: "RESOLVED",
        result_digest: D3,
      }),
    /INVALID_QUEUE_RECONCILIATION/,
    "a dead-lease result must be reported through completion, not discarded by retry recovery",
  );
  const deadLease = reconcileQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:07:00.000Z",
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
  assert.equal(deadLease.state, "APPROVAL_REQUIRED");
  assert.equal(deadLease.lease, null);
  assert.equal(deadLease.attempts, 1, "reconciliation must not retry or decrement");
  assert.deepEqual(deadLease.recovery, {
    reason: "LEASE_EXPIRED",
    previous_lease_id: "lease.goal012.001",
    requires_new_approval: true,
    reconciled_at: "2026-07-22T02:07:00.000Z",
  });
  assert.equal(deadLease.retry_not_before, "2026-07-22T02:07:05.000Z");
  const resumeGate = approvalGate(prepared, {
    run_version: 4,
    confirmation_expected_run_version: 3,
    approval_phase: "RESUME",
    confirmation_digest: D3,
    run_head_digest: D2,
  });
  for (const invalidRecoveryGate of [
    approvalGate(prepared, {
      run_version: 4,
      confirmation_expected_run_version: 0,
      approval_phase: "RESUME",
      confirmation_digest: D3,
      run_head_digest: D2,
    }),
    approvalGate(prepared, {
      run_version: 4,
      confirmation_expected_run_version: 3,
      approval_phase: "RETRY",
      confirmation_digest: D3,
      run_head_digest: D2,
    }),
    approvalGate(prepared, {
      run_version: 4,
      confirmation_expected_run_version: 3,
      approval_phase: "RESUME",
      confirmation_digest: D3,
      run_head_digest: D2,
      confirmed_goal_digest: D3,
    }),
  ]) {
    assert.throws(
      () =>
        submitQueueItem(deadLease, {
          expected_version: 3,
          confirmation_digest: D3,
          now: "2026-07-22T02:07:05.000Z",
          gate: invalidRecoveryGate,
        }),
      /QUEUE_APPROVAL_REQUIRED/,
    );
  }
  assert.throws(
    () =>
      submitQueueItem(deadLease, {
        expected_version: 3,
        confirmation_digest: D3,
        now: "2026-07-22T02:07:04.999Z",
        gate: resumeGate,
      }),
    /QUEUE_BACKOFF_ACTIVE/,
  );
  const resubmitted = submitQueueItem(deadLease, {
    expected_version: 3,
    confirmation_digest: D3,
    now: "2026-07-22T02:07:05.000Z",
    gate: resumeGate,
  });
  assert.equal(resubmitted.state, "SUBMITTED");
  assert.equal(resubmitted.run_binding.phase, "RESUME");
  assert.equal(resubmitted.run_binding.expected_run_version, 3);
  assert.equal(resubmitted.run_binding.approval_digest, D3);
  assert.equal(resubmitted.retry_not_before, null);
  const secondClaim = claimQueueItem(resubmitted, {
    expected_version: 4,
    now: "2026-07-22T02:07:05.000Z",
    worker_ref: "worker.local.002",
    lease_id: "lease.goal012.002",
    gate: resumeGate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  assert.equal(secondClaim.attempts, 2);

  const singleAttemptPrepared = prepareQueueItem(
    preparation({
      queue_item_id: "queue.goal012.item002",
      retry_policy: { max_attempts: 1, backoff_ms: 5_000 },
    }),
  );
  const singleAttemptGate = approvalGate(singleAttemptPrepared);
  const singleAttemptSubmitted = submitQueueItem(singleAttemptPrepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate: singleAttemptGate,
  });
  const singleAttemptClaimed = claimQueueItem(singleAttemptSubmitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.003",
    lease_id: "lease.goal012.003",
    gate: singleAttemptGate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const exhausted = reconcileQueueItem(singleAttemptClaimed, {
    expected_version: 2,
    now: "2026-07-22T02:07:00.000Z",
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
  assert.equal(exhausted.state, "EXPIRED");
  assert.equal(exhausted.retry_not_before, null);
  assert.deepEqual(exhausted.recovery, {
    reason: "MAX_ATTEMPTS_EXHAUSTED",
    previous_lease_id: "lease.goal012.003",
    requires_new_approval: false,
    reconciled_at: "2026-07-22T02:07:00.000Z",
  });
  assert.equal(exhausted.reconciliation.outcome, "MAX_ATTEMPTS_EXHAUSTED");

  const expired = reconcileQueueItem(submitted, {
    expected_version: 1,
    now: EXPIRES_AT,
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
  assert.equal(expired.state, "EXPIRED");
  assert.equal(expired.attempts, 0);
  assert.equal(
    reconcileQueueItem(expired, {
      expected_version: 1,
      now: "2026-07-22T03:00:05.000Z",
      actor_ref: "actor.reconciliation.owner",
      resolution: "OBSERVE",
      result_digest: null,
    }),
    expired,
  );
  assert.throws(
    () =>
      reconcileQueueItem(expired, {
        expected_version: 1,
        now: "2026-07-22T03:00:05.000Z",
        actor_ref: "actor.different",
        resolution: "OBSERVE",
        result_digest: null,
      }),
    /QUEUE_RECONCILIATION_CONFLICT/,
  );
});

test("automation trigger schema is strict v2 and validates every queue lifecycle snapshot", async () => {
  const schemaText = await readFile(
    new URL("../context/schemas/automation-trigger-v2.schema.json", import.meta.url),
    "utf8",
  ).catch(() => null);
  assert.notEqual(schemaText, null, "automation-trigger-v2 schema must exist");
  const schema = JSON.parse(schemaText);
  assert.equal(validateSchemaDefinition(schema).valid, true);

  const {
    cancelQueueItem,
    claimQueueItem,
    completeQueueItem,
    prepareQueueItem,
    reconcileQueueItem,
    submitQueueItem,
  } = await loadModel();
  const prepared = prepareQueueItem(preparation());
  const gate = approvalGate(prepared);
  const submitted = submitQueueItem(prepared, {
    expected_version: 0,
    confirmation_digest: D2,
    now: "2026-07-22T02:05:00.000Z",
    gate,
  });
  const claimed = claimQueueItem(submitted, {
    expected_version: 1,
    now: "2026-07-22T02:06:00.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    gate,
    active_concurrency_count: 0,
    recent_claim_count: 0,
  });
  const completed = completeQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:06:30.000Z",
    worker_ref: "worker.local.001",
    lease_id: "lease.goal012.001",
    outcome: "KNOWN_RESULT",
    result_digest: D3,
  });
  const cancelled = cancelQueueItem(prepared, {
    expected_version: 0,
    now: "2026-07-22T02:00:30.000Z",
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.cancelled",
  });
  const approvalRequired = reconcileQueueItem(claimed, {
    expected_version: 2,
    now: "2026-07-22T02:07:00.000Z",
    actor_ref: "actor.reconciliation.owner",
    resolution: "OBSERVE",
    result_digest: null,
  });
  for (const item of [prepared, submitted, claimed, completed, cancelled, approvalRequired]) {
    assert.deepEqual(validateValue(item, schema), { valid: true, errors: [] }, item.state);
  }

  const legacy = structuredClone(prepared);
  legacy.contract_version = "1.0.0";
  assert.equal(validateValue(legacy, schema).valid, false);
  const unknown = structuredClone(prepared);
  unknown.command = "run arbitrary payload";
  assert.equal(validateValue(unknown, schema).valid, false);
  const missing = structuredClone(prepared);
  delete missing.policy_ref;
  assert.equal(validateValue(missing, schema).valid, false);
});
