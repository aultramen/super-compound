import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  makeReservationInput,
  setupActivePilot,
} from "./background-pilot-harness.test-support.mjs";

const EVIDENCE_DIGEST = `sha256:${"c".repeat(64)}`;

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function freshness(contract) {
  return {
    authority_digest: sha256(JSON.stringify({
      goal: contract.goal,
      authority: contract.authority,
      verifier: contract.verifier,
      project_config_digest: contract.project_config_digest,
    })),
    project_config_digest: contract.project_config_digest,
    verifier_digest: contract.verifier.digest,
    eval_definition_digest: contract.verifier.eval_definition_digest,
  };
}

async function loadCoordinator() {
  return import("./loop-cancellation-coordinator.mjs").catch(() => ({}));
}

function cancellationRequest(context, reservation, runState, queueState) {
  return {
    run_id: context.runId,
    expected_run_version: runState.version,
    queue_item_id: context.queueItemId,
    expected_queue_version: queueState.version,
    background_dispatches: [
      {
        dispatch_id: reservation.dispatch_id,
        expected_version: 0,
      },
    ],
    actor_ref: "actor.project.owner",
    reason_ref: "reason.user.stop",
    evidence_digest: EVIDENCE_DIGEST,
    freshness: freshness(context.contract),
  };
}

function createRunCancellationInputWriter(context) {
  return async ({ run_id, freshness: boundFreshness }) => {
    const relative = `.scratch/pilot-inputs/${run_id}-single-stop-cancel.json`;
    const absolute = path.join(context.root, ...relative.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(
      absolute,
      `${JSON.stringify({ freshness: boundFreshness }, null, 2)}\n`,
    );
    return relative;
  };
}

test("TEST-014 one user stop converges run, queue, and background dispatch through one coordinator call", async () => {
  const { createLoopCancellationCoordinator } = await loadCoordinator();
  assert.equal(
    typeof createLoopCancellationCoordinator,
    "function",
    "single-stop cancellation coordinator must exist",
  );
  const { context, queueClaim } = await setupActivePilot("PILOT-SINGLE-STOP");
  try {
    const reservation = makeReservationInput(context, queueClaim);
    await context.store.reserve(reservation);
    const runBefore = (await context.controller.show({ runId: context.runId })).state;
    const queueBefore = await context.queue.show(context.queueItemId);
    const workGateBefore = await context.validateGate({
      runId: context.runId,
      operation: "work",
    });
    const request = cancellationRequest(
      context,
      reservation,
      runBefore,
      queueBefore,
    );
    const coordinator = createLoopCancellationCoordinator({
      loopRunController: context.controller,
      loopQueue: context.queue,
      backgroundExecutionStore: context.store,
      writeRunCancellationInput: createRunCancellationInputWriter(context),
    });

    const stopped = await coordinator.cancel(request);
    assert.equal(stopped.converged, true);
    assert.equal(stopped.run.state, "UNKNOWN_OUTCOME");
    assert.equal(stopped.queue.state, "CANCEL_REQUESTED");
    assert.deepEqual(
      stopped.background_dispatches.map((entry) => entry.state),
      ["CANCELLED"],
    );
    assert.equal(stopped.requires_reconciliation, true);
    assert.deepEqual(stopped.applied, {
      background_dispatches: 1,
      queue: true,
      run: true,
    });

    const versionsAfterFirstStop = {
      run: (await context.controller.show({ runId: context.runId })).state.version,
      queue: (await context.queue.show(context.queueItemId)).version,
      background: (await context.store.show(reservation.dispatch_id)).version,
    };
    const retried = await coordinator.cancel(request);
    assert.equal(retried.converged, true);
    assert.deepEqual(retried.applied, {
      background_dispatches: 0,
      queue: false,
      run: false,
    });
    assert.deepEqual(
      {
        run: (await context.controller.show({ runId: context.runId })).state.version,
        queue: (await context.queue.show(context.queueItemId)).version,
        background: (await context.store.show(reservation.dispatch_id)).version,
      },
      versionsAfterFirstStop,
      "an acknowledgement retry must not append another lifecycle transition",
    );

    await assert.rejects(
      context.queue.heartbeat(context.queueItemId, {
        expected_version: versionsAfterFirstStop.queue,
        worker_ref: queueClaim.lease.worker_ref,
        lease_id: queueClaim.lease.lease_id,
      }),
      /QUEUE_(?:NOT_HEARTBEATABLE|LEASE_OWNERSHIP_LOST)/u,
    );
    await assert.rejects(
      context.queue.claim(context.queueItemId, {
        expected_version: versionsAfterFirstStop.queue,
        worker_ref: `${context.runId}.replacement-worker`,
      }),
      /QUEUE_NOT_CLAIMABLE|APPROVAL_REQUIRED/u,
    );
    await assert.rejects(
      context.store.arm(reservation.dispatch_id, {
        expected_version: 0,
        action_gate: workGateBefore,
        evidence_digest: reservation.effective_limits_digest,
      }),
      /BACKGROUND_(?:VERSION_CONFLICT|TRANSITION_DENIED)|QUEUE_CLAIM_NOT_ACTIVE/u,
    );
    await assert.rejects(
      context.controller.validateGate({
        runId: context.runId,
        operation: "work",
      }),
      /terminal|not running/u,
    );
  } finally {
    await context.cleanup();
  }
});

for (const lostBoundary of ["background", "queue", "run"]) {
  test(`TEST-014 lost ${lostBoundary} acknowledgement is recovered inside the same single-stop call`, async () => {
    const { createLoopCancellationCoordinator } = await loadCoordinator();
    const { context, queueClaim } = await setupActivePilot(
      `PILOT-SINGLE-STOP-${lostBoundary.toUpperCase()}-ACK`,
    );
    try {
      const reservation = makeReservationInput(context, queueClaim);
      await context.store.reserve(reservation);
      const runBefore = (
        await context.controller.show({ runId: context.runId })
      ).state;
      const queueBefore = await context.queue.show(context.queueItemId);
      const request = cancellationRequest(
        context,
        reservation,
        runBefore,
        queueBefore,
      );
      let acknowledgementLost = false;
      const loseOnce = async (boundary, operation) => {
        const durable = await operation();
        if (lostBoundary === boundary && !acknowledgementLost) {
          acknowledgementLost = true;
          throw new Error(`INJECTED_${boundary.toUpperCase()}_ACK_LOSS`);
        }
        return durable;
      };
      const coordinator = createLoopCancellationCoordinator({
        loopRunController: {
          show: (...args) => context.controller.show(...args),
          apply: (...args) =>
            loseOnce("run", () => context.controller.apply(...args)),
        },
        loopQueue: {
          show: (...args) => context.queue.show(...args),
          cancel: (...args) =>
            loseOnce("queue", () => context.queue.cancel(...args)),
        },
        backgroundExecutionStore: {
          show: (...args) => context.store.show(...args),
          listForRunQueue: (...args) =>
            context.store.listForRunQueue(...args),
          apply: (...args) =>
            loseOnce("background", () => context.store.apply(...args)),
        },
        writeRunCancellationInput: createRunCancellationInputWriter(context),
      });

      const recovered = await coordinator.cancel(request);
      assert.equal(acknowledgementLost, true);
      assert.equal(recovered.converged, true);
      assert.equal(recovered.run.state, "UNKNOWN_OUTCOME");
      assert.equal(recovered.queue.state, "CANCEL_REQUESTED");
      assert.deepEqual(
        recovered.background_dispatches.map((entry) => entry.state),
        ["CANCELLED"],
      );
      assert.deepEqual(recovered.applied, {
        background_dispatches: 1,
        queue: true,
        run: true,
      });
      await assert.rejects(
        context.controller.validateGate({
          runId: context.runId,
          operation: "work",
        }),
        /terminal|not running/u,
      );
    } finally {
      await context.cleanup();
    }
  });
}

test("TEST-014 caller cannot omit an authoritative active dispatch from the single-stop manifest", async () => {
  const { createLoopCancellationCoordinator } = await loadCoordinator();
  const { context, queueClaim } = await setupActivePilot(
    "PILOT-SINGLE-STOP-OMISSION",
  );
  try {
    const reservation = makeReservationInput(context, queueClaim);
    await context.store.reserve(reservation);
    const runBefore = (await context.controller.show({ runId: context.runId })).state;
    const queueBefore = await context.queue.show(context.queueItemId);
    const request = {
      ...cancellationRequest(context, reservation, runBefore, queueBefore),
      background_dispatches: [],
    };
    const coordinator = createLoopCancellationCoordinator({
      loopRunController: context.controller,
      loopQueue: context.queue,
      backgroundExecutionStore: context.store,
      writeRunCancellationInput: createRunCancellationInputWriter(context),
    });

    await assert.rejects(
      coordinator.cancel(request),
      /LOOP_CANCELLATION_BACKGROUND_EXACT_SET_MISMATCH/u,
    );
    assert.equal(
      (await context.store.show(reservation.dispatch_id)).state,
      "RESERVED",
    );
    assert.equal(
      (await context.queue.show(context.queueItemId)).state,
      "CLAIMED",
    );
    assert.equal(
      (await context.controller.show({ runId: context.runId })).state.status,
      "RUNNING",
    );
  } finally {
    await context.cleanup();
  }
});

test("TEST-014 a dispatch reserved during cancellation is discovered after queue fencing and stopped", async () => {
  const { createLoopCancellationCoordinator } = await loadCoordinator();
  const { context, queueClaim } = await setupActivePilot(
    "PILOT-SINGLE-STOP-RACING-DISPATCH",
  );
  try {
    const runBefore = (await context.controller.show({ runId: context.runId })).state;
    const queueBefore = await context.queue.show(context.queueItemId);
    const racing = makeReservationInput(context, queueClaim, {
      dispatch_id: `${context.runId}.dispatch.racing`,
      worktree_ref: `${context.runId}.worktree.racing`,
    });
    let raceInjected = false;
    const coordinator = createLoopCancellationCoordinator({
      loopRunController: context.controller,
      loopQueue: {
        show: (...args) => context.queue.show(...args),
        async cancel(...args) {
          if (!raceInjected) {
            raceInjected = true;
            await context.store.reserve(racing);
          }
          return context.queue.cancel(...args);
        },
      },
      backgroundExecutionStore: context.store,
      writeRunCancellationInput: createRunCancellationInputWriter(context),
    });

    const stopped = await coordinator.cancel({
      ...cancellationRequest(context, racing, runBefore, queueBefore),
      background_dispatches: [],
    });
    assert.equal(raceInjected, true);
    assert.deepEqual(
      stopped.background_dispatches.map((entry) => [
        entry.dispatch_id,
        entry.state,
      ]),
      [
        [racing.dispatch_id, "CANCELLED"],
      ],
    );
    assert.equal(stopped.applied.background_dispatches, 1);
    assert.equal(stopped.converged, true);
  } finally {
    await context.cleanup();
  }
});
