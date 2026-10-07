import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const D3 = `sha256:${"c".repeat(64)}`;
const SCHEMA_SOURCE = new URL(
  "../context/schemas/automation-trigger-v2.schema.json",
  import.meta.url,
);

async function loadQueue() {
  return import("./loop-queue.mjs").catch(() => ({}));
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
    prepared_at: "2026-07-22T02:00:00.000Z",
    available_at: "2026-07-22T02:01:00.000Z",
    expires_at: "2026-07-22T03:00:00.000Z",
    missed_run_policy: "CANCEL",
    lease_policy: { duration_ms: 60_000, heartbeat_interval_ms: 10_000 },
    retry_policy: { max_attempts: 2, backoff_ms: 5_000 },
    concurrency: { key: "project.goal012", limit: 1 },
    rate_limit: { key: "project.goal012", max_claims: 2, window_ms: 60_000 },
    result_sink_ref: "sink.local.audit",
    policy_ref: "policy.loop-runtime-v2",
    ...overrides,
  };
}

function approvalGate(input, overrides = {}) {
  return {
    allowed: true,
    would_allow: true,
    simulation_only: false,
    mutation_authorized: true,
    operation: "queue-claim",
    queue_item_id: input.queue_item_id,
    run_id: input.run_binding.run_id,
    run_version: 1,
    confirmation_expected_run_version: input.run_binding.expected_run_version,
    approval_phase: input.run_binding.phase,
    confirmation_digest: D2,
    approval_expires_at: "2026-07-22T02:45:00.000Z",
    confirmed_goal_digest: input.run_binding.goal_digest,
    authority_digest: input.run_binding.authority_digest,
    verifier_digest: input.run_binding.verifier_digest,
    confirmed_eval_definition_digest: input.run_binding.eval_definition_digest,
    project_config_digest: input.run_binding.project_config_digest,
    policy_digest: input.run_binding.policy_digest,
    operation_inventory_digest: input.run_binding.operation_inventory_digest,
    run_head_digest: D3,
    confirmed_risk_profile: input.run_binding.risk_profile,
    confirmed_autonomy_profile: input.run_binding.autonomy_profile,
    confirmed_required_gates: [...input.run_binding.required_gates],
    approver_actor_type: "HUMAN",
    approver_attestation: "HOST_ATTESTED_HUMAN",
    ...overrides,
  };
}

function dispatchPermitInput(claimed, overrides = {}) {
  return {
    queue_item_id: claimed.queue_item_id,
    minimum_version: claimed.version,
    lease_id: claimed.lease.lease_id,
    worker_ref: claimed.lease.worker_ref,
    attempt: claimed.lease.attempt,
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

async function createRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "loop-queue-v2-"));
  const schemaDirectory = path.join(root, ".agent", "context", "schemas");
  await mkdir(schemaDirectory, { recursive: true });
  await copyFile(SCHEMA_SOURCE, path.join(schemaDirectory, "automation-trigger-v2.schema.json"));
  return root;
}

test("durable prepare is event-first, strict, and deduplicates one-shot identity", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    assert.equal(typeof createLoopQueue, "function", "queue adapter must exist");
    const queue = createLoopQueue(root, {
      now: () => "2026-07-22T02:00:00.000Z",
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => {
        throw new Error("gate must not run during prepare");
      },
    });

    const first = await queue.prepare(preparation());
    const duplicate = await queue.prepare(
      preparation({ queue_item_id: "queue.goal012.duplicate-id" }),
    );
    assert.equal(first.queue_item_id, "queue.goal012.item001");
    assert.deepEqual(duplicate, first);
    await assert.rejects(
      () => queue.prepare(preparation({ payload_digest: D3 })),
      /QUEUE_DEDUPE_CONFLICT/,
    );
    assert.deepEqual(await queue.show(first.queue_item_id), first);

    const itemHash = await queue.itemStorageKey(first.queue_item_id);
    const events = await readFile(
      path.join(root, ".scratch", "loop-queue", "items", itemHash, "events.jsonl"),
      "utf8",
    );
    assert.equal(events.trim().split("\n").length, 1);
    const event = JSON.parse(events.trim());
    assert.equal(event.event_format, "loop_queue_event_v2");
    assert.equal(event.sequence, 0);
    assert.equal(event.previous_event_digest, null);
    assert.match(event.event_digest, /^sha256:[a-f0-9]{64}$/u);
    assert.deepEqual(event.item, first);
    const snapshot = JSON.parse(
      await readFile(
        path.join(root, ".scratch", "loop-queue", "items", itemHash, "state.json"),
        "utf8",
      ),
    );
    assert.deepEqual(snapshot, first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-013 crash point 1 uses a durable queue claim before any external intent or effect", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let leaseSequence = 0;
    const gateCalls = [];
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => `lease.generated.${String(++leaseSequence).padStart(3, "0")}`,
      validateQueueGate: async (request) => {
        gateCalls.push(structuredClone(request));
        return approvalGate(source);
      },
    });
    await queue.prepare(source);

    currentTime = "2026-07-22T02:05:00.000Z";
    const submitted = await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    assert.equal(submitted.state, "SUBMITTED");
    assert.deepEqual(gateCalls[0], {
      runId: source.run_binding.run_id,
      operation: "queue-claim",
      queueItemId: source.queue_item_id,
    });

    currentTime = "2026-07-22T02:06:00.000Z";
    const contenders = await Promise.allSettled([
      queue.claim(source.queue_item_id, {
        expected_version: 1,
        worker_ref: "worker.local.001",
      }),
      queue.claim(source.queue_item_id, {
        expected_version: 1,
        worker_ref: "worker.local.002",
      }),
    ]);
    assert.equal(contenders.filter((entry) => entry.status === "fulfilled").length, 1);
    assert.equal(contenders.filter((entry) => entry.status === "rejected").length, 1);
    const claimed = await queue.show(source.queue_item_id);
    assert.equal(claimed.state, "CLAIMED");
    assert.equal(claimed.version, 2);
    assert.equal(claimed.attempts, 1);
    assert.equal(gateCalls.length, 3, "submit and every claim attempt revalidate the gate");
    await assert.rejects(
      () =>
        access(
          path.join(root, ".scratch", "loop-runtime", "external-actions"),
        ),
      { code: "ENOENT" },
      "a crash after claim must precede every external-action intent",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("heartbeat, in-flight cancel, and completion require the exact fencing lease and acknowledge only after persistence", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue, coordinateBackgroundQueueClaim } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
    });
    assert.equal(queue.withValidatedClaim, undefined);
    assert.deepEqual(Object.keys(queue.backgroundCoordinator), []);
    await assert.rejects(
      () =>
        coordinateBackgroundQueueClaim(
          Object.freeze({}),
          root,
          {},
          async () => undefined,
        ),
      /QUEUE_BACKGROUND_COORDINATOR_UNTRUSTED/,
    );
    await assert.rejects(
      () =>
        coordinateBackgroundQueueClaim(
          queue.backgroundCoordinator,
          path.join(root, "different-root"),
          {},
          async () => undefined,
        ),
      /QUEUE_BACKGROUND_COORDINATOR_ROOT_MISMATCH/,
    );
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    const claimed = await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });

    currentTime = "2026-07-22T02:06:30.000Z";
    const renewed = await queue.heartbeat(source.queue_item_id, {
      expected_version: 2,
      worker_ref: "worker.local.001",
      lease_id: claimed.lease.lease_id,
    });
    assert.equal(renewed.version, 3);
    const claimAuthority = await queue.validateClaim({
      queue_item_id: source.queue_item_id,
      minimum_version: claimed.version,
      lease_id: claimed.lease.lease_id,
      worker_ref: "worker.local.001",
      attempt: 1,
    });
    assert.equal(claimAuthority.queue_version, 3);
    assert.equal(claimAuthority.queue_state, "CLAIMED");
    assert.equal(claimAuthority.lease.attempt, 1);
    const coordinated = await coordinateBackgroundQueueClaim(
      queue.backgroundCoordinator,
      root,
      {
        queue_item_id: source.queue_item_id,
        minimum_version: claimed.version,
        lease_id: claimed.lease.lease_id,
        worker_ref: "worker.local.001",
        attempt: 1,
      },
      async (projection) => {
        const authoritativeItem = await queue.show(source.queue_item_id);
        return {
          projection,
          event_version: authoritativeItem.version,
        };
      },
    );
    assert.equal(coordinated.projection.queue_version, 3);
    assert.equal(coordinated.event_version, 3);
    await assert.rejects(
      () =>
        queue.validateClaim({
          queue_item_id: source.queue_item_id,
          minimum_version: claimed.version,
          lease_id: claimed.lease.lease_id,
          worker_ref: "worker.local.001",
          attempt: 2,
        }),
      /QUEUE_CLAIM_FENCE_INVALID/,
    );
    await assert.rejects(
      () => queue.heartbeat(source.queue_item_id, {
        expected_version: 3,
        worker_ref: "worker.local.002",
        lease_id: claimed.lease.lease_id,
      }),
      /QUEUE_LEASE_OWNERSHIP_LOST/,
    );

    const cancellation = await queue.cancel(source.queue_item_id, {
      expected_version: 3,
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    });
    assert.equal(cancellation.state, "CANCEL_REQUESTED");
    assert.notEqual(cancellation.lease, null);
    await assert.rejects(
      () =>
        queue.heartbeat(source.queue_item_id, {
          expected_version: cancellation.version,
          worker_ref: "worker.local.001",
          lease_id: claimed.lease.lease_id,
        }),
      /QUEUE_LEASE_OWNERSHIP_LOST/,
    );
    await assert.rejects(
      () =>
        queue.validateClaim({
          queue_item_id: source.queue_item_id,
          minimum_version: claimed.version,
          lease_id: claimed.lease.lease_id,
          worker_ref: "worker.local.001",
          attempt: 1,
        }),
      /QUEUE_CLAIM_NOT_ACTIVE/,
    );

    const completion = await queue.complete(source.queue_item_id, {
      expected_version: 4,
      worker_ref: "worker.local.001",
      lease_id: claimed.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: D3,
    });
    assert.equal(completion.acknowledged, true);
    assert.equal(completion.item.state, "COMPLETED");
    assert.equal((await queue.show(source.queue_item_id)).state, "COMPLETED");

    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;
    currentTime = "2026-07-22T02:20:00.000Z";
    const repeated = await queue.complete(source.queue_item_id, {
      expected_version: 4,
      worker_ref: "worker.local.001",
      lease_id: claimed.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: D3,
    });
    assert.equal(repeated.acknowledged, true);
    assert.deepEqual(repeated.item, completion.item);
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
      "an idempotent retry must not append another event",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cancellation retry after a lost acknowledgement returns the durable terminal item without another event", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let loseCancellationAck = true;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      afterEventAppend: async (item) => {
        if (item.state === "CANCEL_REQUESTED" && loseCancellationAck) {
          loseCancellationAck = false;
          throw new Error("INJECTED_LOST_CANCELLATION_ACK");
        }
      },
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });
    const cancellationInput = {
      expected_version: 2,
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    };
    currentTime = "2026-07-22T02:06:30.000Z";
    await assert.rejects(
      () => queue.cancel(source.queue_item_id, cancellationInput),
      /INJECTED_LOST_CANCELLATION_ACK/,
    );
    const cancelled = await queue.show(source.queue_item_id);
    assert.equal(cancelled.state, "CANCEL_REQUESTED");
    assert.equal(cancelled.cancellation.requested_at, "2026-07-22T02:06:30.000Z");
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;

    currentTime = "2026-07-22T02:06:45.000Z";
    const repeated = await queue.cancel(source.queue_item_id, cancellationInput);

    assert.deepEqual(repeated, cancelled);
    assert.equal(repeated.cancellation.requested_at, "2026-07-22T02:06:30.000Z");
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
      "an idempotent cancellation retry must not append another event",
    );
    const repairedSnapshot = JSON.parse(
      await readFile(path.join(path.dirname(eventPath), "state.json"), "utf8"),
    );
    assert.deepEqual(repairedSnapshot, repeated);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dead-lease reconciliation makes an in-flight cancellation terminal instead of claimable again", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });
    currentTime = "2026-07-22T02:06:10.000Z";
    const requested = await queue.cancel(source.queue_item_id, {
      expected_version: 2,
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    });
    assert.equal(requested.state, "CANCEL_REQUESTED");

    currentTime = "2026-07-22T02:07:00.000Z";
    await assert.rejects(
      () =>
        queue.reconcile(source.queue_item_id, {
          expected_version: 3,
          actor_ref: "actor.reconciliation.owner",
          resolution: "RESOLVED",
          result_digest: D3,
        }),
      /INVALID_QUEUE_RECONCILIATION/,
    );
    assert.equal((await queue.show(source.queue_item_id)).state, "CANCEL_REQUESTED");
    const cancelled = await queue.reconcile(source.queue_item_id, {
      expected_version: 3,
      actor_ref: "actor.reconciliation.owner",
      resolution: "OBSERVE",
      result_digest: null,
    });

    assert.equal(cancelled.state, "CANCELLED");
    assert.equal(cancelled.lease, null);
    assert.equal(cancelled.retry_not_before, null);
    assert.equal(cancelled.attempts, 1);
    assert.equal(cancelled.cancellation_requested, true);
    assert.deepEqual(cancelled.cancellation, requested.cancellation);
    assert.equal(cancelled.recovery.requires_new_approval, false);
    assert.equal((await queue.show(source.queue_item_id)).state, "CANCELLED");
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;
    currentTime = "2026-07-22T02:07:05.000Z";
    await assert.rejects(
      () =>
        queue.submit(source.queue_item_id, {
          expected_version: 4,
          confirmation_digest: D2,
        }),
      /QUEUE_APPROVAL_REQUIRED/,
    );
    await assert.rejects(
      () =>
        queue.claim(source.queue_item_id, {
          expected_version: 4,
          worker_ref: "worker.local.002",
        }),
      /QUEUE_NOT_CLAIMABLE/,
    );
    assert.equal((await queue.show(source.queue_item_id)).state, "CANCELLED");
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
      "rejected revival attempts must not append events",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("retrying a claim after a lost terminal approval transition repairs the snapshot and remains denied", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let loseTerminalAck = true;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      afterEventAppend: async (item) => {
        if (item.state === "EXPIRED" && loseTerminalAck) {
          loseTerminalAck = false;
          throw new Error("INJECTED_LOST_TERMINAL_CLAIM_ACK");
        }
      },
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    const claimInput = {
      expected_version: 1,
      worker_ref: "worker.local.001",
    };
    currentTime = "2026-07-22T03:00:00.000Z";
    await assert.rejects(
      () => queue.claim(source.queue_item_id, claimInput),
      /INJECTED_LOST_TERMINAL_CLAIM_ACK/,
    );
    const expired = await queue.show(source.queue_item_id);
    assert.equal(expired.state, "EXPIRED");
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;

    currentTime = "2026-07-22T03:00:05.000Z";
    await assert.rejects(
      () => queue.claim(source.queue_item_id, claimInput),
      /QUEUE_NOT_CLAIMABLE/,
    );
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
    );
    const repairedSnapshot = JSON.parse(
      await readFile(path.join(path.dirname(eventPath), "state.json"), "utf8"),
    );
    assert.deepEqual(repairedSnapshot, expired);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("claim rechecks approval after authority scan and durably requires approval when it expires", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let expireDuringNextScan = false;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source, {
        approval_expires_at: "2026-07-22T02:06:00.000Z",
      }),
      afterAuthorityScan: async () => {
        if (expireDuringNextScan) currentTime = "2026-07-22T02:06:00.000Z";
      },
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });

    expireDuringNextScan = true;
    await assert.rejects(
      () => queue.claim(source.queue_item_id, {
        expected_version: 1,
        worker_ref: "worker.local.001",
      }),
      /QUEUE_APPROVAL_REQUIRED/,
    );
    const blocked = await queue.show(source.queue_item_id);
    assert.equal(blocked.state, "APPROVAL_REQUIRED");
    assert.equal(blocked.version, 2);
    assert.equal(blocked.run_binding.approval_digest, null);
    assert.equal(blocked.run_binding.approval_expires_at, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a mismatched envelope persists APPROVAL_REQUIRED while gate infrastructure failure does not mutate", async () => {
  for (const scenario of ["mismatch", "controller-approval", "infrastructure"]) {
    const root = await createRoot();
    try {
      const { createLoopQueue } = await loadQueue();
      const source = preparation({
        queue_item_id: `queue.goal012.${scenario}`,
      });
      let claimGate = false;
      const queue = createLoopQueue(root, {
        now: () => "2026-07-22T02:06:00.000Z",
        randomId: () => "lease.generated.001",
        validateQueueGate: async () => {
          if (claimGate && scenario === "infrastructure") {
            throw new Error("GATE_INFRASTRUCTURE_UNAVAILABLE");
          }
          if (claimGate && scenario === "controller-approval") {
            throw Object.assign(new Error("APPROVAL_REQUIRED"), {
              code: "APPROVAL_REQUIRED",
            });
          }
          return approvalGate(source, claimGate && scenario === "mismatch"
            ? { verifier_digest: D2 }
            : {});
        },
      });
      await queue.prepare(source);
      await queue.submit(source.queue_item_id, {
        expected_version: 0,
        confirmation_digest: D2,
      });
      claimGate = true;
      await assert.rejects(
        () => queue.claim(source.queue_item_id, {
          expected_version: 1,
          worker_ref: "worker.local.001",
        }),
        scenario !== "infrastructure"
          ? /QUEUE_APPROVAL_REQUIRED/
          : /GATE_INFRASTRUCTURE_UNAVAILABLE/,
      );
      const persisted = await queue.show(source.queue_item_id);
      const approvalRequired = scenario !== "infrastructure";
      assert.equal(persisted.state, approvalRequired ? "APPROVAL_REQUIRED" : "SUBMITTED");
      assert.equal(persisted.version, approvalRequired ? 2 : 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("hash-linked event authority rejects a schema-valid mutation of a prior event", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    const queue = createLoopQueue(root, {
      now: () => "2026-07-22T02:05:00.000Z",
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
    });
    await queue.prepare(source);
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });

    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const events = (await readFile(eventPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    events[0].item.payload_digest = D3;
    await writeFile(eventPath, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
    await assert.rejects(
      () => queue.show(source.queue_item_id),
      /QUEUE_EVENT_CHAIN_CORRUPT/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("replay rejects a correctly rehashed event that changes immutable lifecycle identity", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    const queue = createLoopQueue(root, {
      now: () => "2026-07-22T02:05:00.000Z",
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
    });
    await queue.prepare(source);
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const directory = path.join(root, ".scratch", "loop-queue", "items", itemHash);
    const eventPath = path.join(directory, "events.jsonl");
    const statePath = path.join(directory, "state.json");
    const events = (await readFile(eventPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const latest = events.at(-1);
    latest.item.payload_digest = D3;
    latest.item.policy_ref = "policy.tampered";
    latest.event_digest = `sha256:${createHash("sha256")
      .update(JSON.stringify(latest.item))
      .digest("hex")}`;
    await writeFile(eventPath, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
    await writeFile(statePath, `${JSON.stringify(latest.item)}\n`);
    await assert.rejects(
      () => queue.show(source.queue_item_id),
      /QUEUE_EVENT_CHAIN_CORRUPT/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("event replay rejects reorder, duplicate, truncation, and a snapshot ahead of authority", async () => {
  for (const corruption of ["reorder", "duplicate", "truncate", "snapshot-ahead"]) {
    const root = await createRoot();
    try {
      const { createLoopQueue } = await loadQueue();
      const source = preparation({ queue_item_id: `queue.goal012.${corruption}` });
      const queue = createLoopQueue(root, {
        now: () => "2026-07-22T02:05:00.000Z",
        randomId: () => "lease.generated.001",
        validateQueueGate: async () => approvalGate(source),
      });
      await queue.prepare(source);
      await queue.submit(source.queue_item_id, {
        expected_version: 0,
        confirmation_digest: D2,
      });
      const itemHash = await queue.itemStorageKey(source.queue_item_id);
      const directory = path.join(root, ".scratch", "loop-queue", "items", itemHash);
      const eventPath = path.join(directory, "events.jsonl");
      const statePath = path.join(directory, "state.json");
      const lines = (await readFile(eventPath, "utf8")).trim().split("\n");
      if (corruption === "reorder") lines.reverse();
      if (corruption === "duplicate") lines.push(lines[1]);
      if (corruption === "truncate") lines.pop();
      if (corruption === "snapshot-ahead") {
        const snapshot = JSON.parse(await readFile(statePath, "utf8"));
        snapshot.version += 1;
        await writeFile(statePath, `${JSON.stringify(snapshot)}\n`);
      } else {
        await writeFile(eventPath, `${lines.join("\n")}\n`);
      }
      await assert.rejects(
        () => queue.show(source.queue_item_id),
        /QUEUE_EVENT_CHAIN_CORRUPT|QUEUE_SNAPSHOT_CORRUPT/,
        corruption,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("authority scans fail closed at an aggregate byte limit", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    const queue = createLoopQueue(root, {
      now: () => "2026-07-22T02:00:00.000Z",
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      scanByteLimit: 256,
    });
    await queue.prepare(source);
    await assert.rejects(
      () => queue.prepare(preparation({
        queue_item_id: "queue.goal012.item002",
        dedupe_identity_digest: D3,
      })),
      /QUEUE_SCAN_BYTE_LIMIT_EXCEEDED/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dead-lease reconciliation requires new approval and never auto-retries", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let recoveryGate = false;
    let leaseSequence = 0;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => `lease.generated.${String(++leaseSequence).padStart(3, "0")}`,
      validateQueueGate: async () => approvalGate(source, recoveryGate
        ? {
            run_version: 4,
            confirmation_expected_run_version: 3,
            approval_phase: "START",
            confirmation_digest: D3,
            run_head_digest: D2,
          }
        : {}),
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });

    currentTime = "2026-07-22T02:07:00.000Z";
    await assert.rejects(
      () =>
        queue.reconcile(source.queue_item_id, {
          expected_version: 2,
          actor_ref: "actor.reconciliation.owner",
          resolution: "RESOLVED",
          result_digest: D3,
        }),
      /INVALID_QUEUE_RECONCILIATION/,
    );
    assert.equal((await queue.show(source.queue_item_id)).state, "CLAIMED");
    const reconciled = await queue.reconcile(source.queue_item_id, {
      expected_version: 2,
      actor_ref: "actor.reconciliation.owner",
      resolution: "OBSERVE",
      result_digest: null,
    });
    assert.equal(reconciled.state, "APPROVAL_REQUIRED");
    assert.equal(reconciled.attempts, 1);
    assert.equal(reconciled.lease, null);
    assert.equal(reconciled.run_binding.approval_digest, null);
    assert.equal(reconciled.retry_not_before, "2026-07-22T02:07:05.000Z");
    await assert.rejects(
      () => queue.claim(source.queue_item_id, {
        expected_version: 3,
        worker_ref: "worker.local.002",
      }),
      /QUEUE_NOT_CLAIMABLE/,
    );
    assert.equal((await queue.show(source.queue_item_id)).attempts, 1);

    recoveryGate = true;
    await assert.rejects(
      () => queue.submit(source.queue_item_id, {
        expected_version: 3,
        confirmation_digest: D3,
      }),
      /QUEUE_BACKOFF_ACTIVE/,
    );
    currentTime = "2026-07-22T02:07:05.000Z";
    const resubmitted = await queue.submit(source.queue_item_id, {
      expected_version: 3,
      confirmation_digest: D3,
    });
    assert.equal(resubmitted.state, "SUBMITTED");
    assert.equal(resubmitted.run_binding.phase, "START");
    assert.equal(resubmitted.run_binding.expected_run_version, 3);
    assert.equal(resubmitted.run_binding.approval_digest, D3);
    currentTime = "2026-07-22T02:07:06.000Z";
    const secondClaim = await queue.claim(source.queue_item_id, {
      expected_version: 4,
      worker_ref: "worker.local.002",
    });
    assert.equal(secondClaim.state, "CLAIMED");
    assert.equal(secondClaim.attempts, 2);
    assert.equal(secondClaim.lease.attempt, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("event authority survives a crash before snapshot and the next mutation repairs durability", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let shouldCrash = true;
    const crashing = createLoopQueue(root, {
      now: () => "2026-07-22T02:00:00.000Z",
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      afterEventAppend: async () => {
        if (shouldCrash) {
          shouldCrash = false;
          throw new Error("INJECTED_QUEUE_CRASH_AFTER_EVENT");
        }
      },
    });
    await assert.rejects(() => crashing.prepare(source), /INJECTED_QUEUE_CRASH_AFTER_EVENT/);

    const recovered = createLoopQueue(root, {
      now: () => "2026-07-22T02:05:00.000Z",
      randomId: () => "lease.generated.002",
      validateQueueGate: async () => approvalGate(source),
    });
    assert.equal((await recovered.show(source.queue_item_id)).state, "PREPARED");
    const submitted = await recovered.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    assert.equal(submitted.version, 1);
    assert.deepEqual(await recovered.show(source.queue_item_id), submitted);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("completion retry after a lost acknowledgement returns the durable result without another event", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let loseCompletionAck = true;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      afterEventAppend: async (item) => {
        if (item.state === "COMPLETED" && loseCompletionAck) {
          loseCompletionAck = false;
          throw new Error("INJECTED_LOST_COMPLETION_ACK");
        }
      },
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, { expected_version: 0, confirmation_digest: D2 });
    currentTime = "2026-07-22T02:06:00.000Z";
    const claimed = await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });
    const completionInput = {
      expected_version: 2,
      worker_ref: "worker.local.001",
      lease_id: claimed.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: D3,
    };
    currentTime = "2026-07-22T02:06:30.000Z";
    await assert.rejects(() => queue.complete(source.queue_item_id, completionInput), /LOST_COMPLETION_ACK/);
    assert.equal((await queue.show(source.queue_item_id)).state, "COMPLETED");
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(root, ".scratch", "loop-queue", "items", itemHash, "events.jsonl");
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;
    currentTime = "2026-07-22T02:20:00.000Z";
    const retried = await queue.complete(source.queue_item_id, completionInput);
    assert.equal(retried.acknowledged, true);
    assert.equal(retried.item.state, "COMPLETED");
    assert.equal((await readFile(eventPath, "utf8")).trim().split("\n").length, eventCount);
    const repairedSnapshot = JSON.parse(
      await readFile(path.join(path.dirname(eventPath), "state.json"), "utf8"),
    );
    assert.deepEqual(repairedSnapshot, retried.item);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation retry after a lost acknowledgement repairs the terminal snapshot without another event", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    let loseReconciliationAck = true;
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.generated.001",
      validateQueueGate: async () => approvalGate(source),
      afterEventAppend: async (item) => {
        if (item.state === "EXPIRED" && loseReconciliationAck) {
          loseReconciliationAck = false;
          throw new Error("INJECTED_LOST_RECONCILIATION_ACK");
        }
      },
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    const reconciliationInput = {
      expected_version: 1,
      actor_ref: "actor.reconciliation.owner",
      resolution: "OBSERVE",
      result_digest: null,
    };
    currentTime = "2026-07-22T03:00:00.000Z";
    await assert.rejects(
      () => queue.reconcile(source.queue_item_id, reconciliationInput),
      /INJECTED_LOST_RECONCILIATION_ACK/,
    );
    const expired = await queue.show(source.queue_item_id);
    assert.equal(expired.state, "EXPIRED");
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;

    currentTime = "2026-07-22T03:00:05.000Z";
    const retried = await queue.reconcile(source.queue_item_id, reconciliationInput);
    assert.deepEqual(retried, expired);
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
    );
    const repairedSnapshot = JSON.parse(
      await readFile(path.join(path.dirname(eventPath), "state.json"), "utf8"),
    );
    assert.deepEqual(repairedSnapshot, retried);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dispatch permit lost acknowledgement is idempotent and conflicting proof is denied", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue, coordinateBackgroundQueueClaim } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.goal014.atomic001",
      validateQueueGate: async () => approvalGate(source),
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    const claimed = await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });
    const fence = {
      queue_item_id: claimed.queue_item_id,
      minimum_version: claimed.version,
      lease_id: claimed.lease.lease_id,
      worker_ref: claimed.lease.worker_ref,
      attempt: claimed.lease.attempt,
    };
    const proof = dispatchPermitInput(claimed);
    currentTime = "2026-07-22T02:06:10.000Z";
    const first = await coordinateBackgroundQueueClaim(
      queue.backgroundCoordinator,
      root,
      fence,
      async (_projection, { commitDispatch }) => commitDispatch(proof),
    );
    assert.equal(first.consumed, true);
    const itemHash = await queue.itemStorageKey(source.queue_item_id);
    const eventPath = path.join(
      root,
      ".scratch",
      "loop-queue",
      "items",
      itemHash,
      "events.jsonl",
    );
    const eventCount = (await readFile(eventPath, "utf8")).trim().split("\n").length;
    currentTime = "2026-07-22T02:06:20.000Z";
    const retry = await coordinateBackgroundQueueClaim(
      queue.backgroundCoordinator,
      root,
      fence,
      async (_projection, { commitDispatch }) => commitDispatch(proof),
    );
    assert.equal(retry.consumed, false);
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
    );
    await assert.rejects(
      () =>
        coordinateBackgroundQueueClaim(
          queue.backgroundCoordinator,
          root,
          fence,
          async (_projection, { commitDispatch }) =>
            commitDispatch({ ...proof, dispatch_id: "dispatch.goal014.conflict" }),
        ),
      /QUEUE_DISPATCH_COMMIT_CONFLICT/,
    );
    assert.equal(
      (await readFile(eventPath, "utf8")).trim().split("\n").length,
      eventCount,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dispatch permit consumption and cancellation have one durable linearization winner", async () => {
  const root = await createRoot();
  try {
    const { createLoopQueue, coordinateBackgroundQueueClaim } = await loadQueue();
    const source = preparation();
    let currentTime = "2026-07-22T02:00:00.000Z";
    const queue = createLoopQueue(root, {
      now: () => currentTime,
      randomId: () => "lease.goal014.atomic001",
      validateQueueGate: async () => approvalGate(source),
    });
    await queue.prepare(source);
    currentTime = "2026-07-22T02:05:00.000Z";
    await queue.submit(source.queue_item_id, {
      expected_version: 0,
      confirmation_digest: D2,
    });
    currentTime = "2026-07-22T02:06:00.000Z";
    const claimed = await queue.claim(source.queue_item_id, {
      expected_version: 1,
      worker_ref: "worker.local.001",
    });
    currentTime = "2026-07-22T02:06:10.000Z";
    const cancellation = {
      expected_version: claimed.version,
      actor_ref: "actor.project.owner",
      reason_ref: "reason.user.cancelled",
    };
    const fence = {
      queue_item_id: claimed.queue_item_id,
      minimum_version: claimed.version,
      lease_id: claimed.lease.lease_id,
      worker_ref: claimed.lease.worker_ref,
      attempt: claimed.lease.attempt,
    };
    const [permitResult, cancellationResult] = await Promise.allSettled([
      coordinateBackgroundQueueClaim(
        queue.backgroundCoordinator,
        root,
        fence,
        async (_projection, { commitDispatch }) =>
          commitDispatch(dispatchPermitInput(claimed)),
      ),
      queue.cancel(source.queue_item_id, cancellation),
    ]);
    let item = await queue.show(source.queue_item_id);
    if (permitResult.status === "fulfilled" && cancellationResult.status === "rejected") {
      item = await queue.cancel(source.queue_item_id, {
        ...cancellation,
        expected_version: item.version,
      });
    }

    if (item.dispatch_commit === null) {
      assert.equal(item.state, "CANCEL_REQUESTED");
      assert.equal(permitResult.status, "rejected");
      assert.equal(item.lease.lease_id, "lease.goal014.atomic001");
    } else {
      assert.equal(permitResult.status, "fulfilled");
      assert.equal(item.state, "CANCEL_REQUESTED");
      assert.equal(item.dispatch_commit.dispatch_id, "dispatch.goal014.atomic001");
      assert.equal(item.lease.lease_id, "lease.goal014.atomic001");
    }
    assert.equal(item.state, "CANCEL_REQUESTED");
    assert.equal(
      (item.dispatch_commit === null) !== (permitResult.status === "fulfilled"),
      true,
      "exactly one of cancel-before-commit or durable permit consumption wins",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("one-shot CLI accepts only strict file inputs and exposes prepare/show without a daemon", async () => {
  const root = await createRoot();
  try {
    const { runLoopQueueCli } = await loadQueue();
    assert.equal(typeof runLoopQueueCli, "function");
    const source = preparation();
    await writeFile(
      path.join(root, "prepare.json"),
      `${JSON.stringify(source, null, 2)}\n`,
    );
    const options = {
      root,
      queueDependencies: {
        now: () => "2026-07-22T02:00:00.000Z",
        randomId: () => "lease.generated.001",
        validateQueueGate: async () => approvalGate(source),
      },
    };
    const prepared = await runLoopQueueCli(
      ["prepare", "--input-file", "prepare.json"],
      options,
    );
    assert.equal(prepared.state, "PREPARED");
    assert.equal(
      (await runLoopQueueCli(["show", "--item", source.queue_item_id], options)).version,
      0,
    );
    await writeFile(
      path.join(root, "submit-with-version.json"),
      `${JSON.stringify({ confirmation_digest: D2, expected_version: 99 })}\n`,
    );
    await assert.rejects(
      () =>
        runLoopQueueCli(
          [
            "submit",
            "--item",
            source.queue_item_id,
            "--expected-version",
            "0",
            "--input-file",
            "submit-with-version.json",
          ],
          options,
        ),
      /expected.version.*input.*forbidden/i,
    );
    await assert.rejects(
      () => runLoopQueueCli(["show", "--item", source.queue_item_id, "--shell", "whoami"], options),
      /unknown option|unsupported/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
