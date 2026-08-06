import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createExternalActionStore } from "./external-action-store.mjs";

const D1 = `sha256:${"a".repeat(64)}`;
const D2 = `sha256:${"b".repeat(64)}`;
const D3 = `sha256:${"c".repeat(64)}`;
const T0 = "2026-07-22T04:10:00.000Z";
const T1 = "2026-07-22T04:10:01.000Z";
const T2 = "2026-07-22T04:10:02.000Z";

async function fixture(t, dependencies = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-external-action-"));
  await mkdir(path.join(root, ".scratch", "loop-runtime"), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, store: createExternalActionStore(root, dependencies) };
}

function intent(overrides = {}) {
  return {
    run_id: "LER2-GOAL-013-01",
    operation_id: "fake.external.write",
    action_id: "action-001",
    idempotency_key: "key-001",
    kind: "EXECUTE",
    parent_action_digest: null,
    queue_item_id: null,
    plan_digest: D1,
    controller_intent_digest: D2,
    confirmation_digest: D3,
    authority_digest: D1,
    policy_digest: D2,
    run_head_digest: D3,
    recorded_at: T0,
    ...overrides,
  };
}

test("durable intent reserves one dispatch and records one authoritative outcome", async (t) => {
  const { root, store } = await fixture(t);
  const created = await store.intent(intent());
  assert.equal(created.state, "INTENDED");
  assert.equal(created.version, 0);
  assert.equal(created.dispatch_count, 0);

  const dispatch = await store.markDispatch(created.record_id, {
    expected_version: 0,
    recorded_at: T1,
  });
  assert.equal(dispatch.state, "DISPATCH_MARKED");
  assert.equal(dispatch.dispatch_count, 1);

  const result = await store.recordOutcome(created.record_id, {
    expected_version: 1,
    recorded_at: T2,
    outcome: "APPLIED",
    target_audit_digest: D1,
  });
  assert.equal(result.state, "KNOWN_RESULT");
  assert.equal(result.outcome, "APPLIED");
  assert.equal(result.target_audit_digest, D1);

  const retry = await store.markDispatch(created.record_id, {
    expected_version: 0,
    recorded_at: "2026-07-22T04:11:00.000Z",
  });
  assert.deepEqual(retry, result, "recovery must never reserve a second dispatch");

  const eventPath = path.join(
    root,
    ".scratch",
    "loop-runtime",
    "external-actions",
    created.storage_key,
    "events.jsonl",
  );
  const events = (await readFile(eventPath, "utf8")).trim().split("\n");
  assert.equal(events.length, 3);
});

test("result event survives a snapshot crash and an idempotent retry repairs without another event", async (t) => {
  let crashResult = true;
  const { root, store } = await fixture(t, {
    afterEventAppend(record) {
      if (record.state === "KNOWN_RESULT" && crashResult) {
        crashResult = false;
        throw new Error("CRASH_AFTER_RESULT_EVENT");
      }
    },
  });
  const created = await store.intent(intent());
  await store.markDispatch(created, { expected_version: 0, recorded_at: T1 });
  await assert.rejects(
    () =>
      store.recordOutcome(created, {
        expected_version: 1,
        recorded_at: T2,
        outcome: "APPLIED",
        target_audit_digest: D1,
      }),
    /CRASH_AFTER_RESULT_EVENT/,
  );

  const recovered = createExternalActionStore(root);
  await assert.rejects(() => recovered.show(created), /SNAPSHOT_BEHIND/);
  const repaired = await recovered.recordOutcome(created, {
    expected_version: 1,
    recorded_at: "2026-07-22T04:12:00.000Z",
    outcome: "APPLIED",
    target_audit_digest: D1,
  });
  assert.equal(repaired.version, 2);
  assert.equal(repaired.outcome, "APPLIED");

  const eventPath = path.join(
    root,
    ".scratch",
    "loop-runtime",
    "external-actions",
    created.storage_key,
    "events.jsonl",
  );
  assert.equal((await readFile(eventPath, "utf8")).trim().split("\n").length, 3);
});

test("four reconciliation outcomes are exact and indeterminate never re-enters dispatch", async (t) => {
  for (const [index, outcome] of [
    "APPLIED",
    "NOT_APPLIED",
    "PARTIALLY_APPLIED",
    "INDETERMINATE",
  ].entries()) {
    const { store } = await fixture(t);
    const created = await store.intent(
      intent({
        action_id: `action-${index + 1}`,
        idempotency_key: `key-${index + 1}`,
      }),
    );
    await store.markDispatch(created, { expected_version: 0, recorded_at: T1 });
    const result = await store.recordOutcome(created, {
      expected_version: 1,
      recorded_at: T2,
      outcome,
      target_audit_digest: D1,
    });
    assert.equal(result.outcome, outcome);
    assert.equal(
      result.state,
      outcome === "INDETERMINATE" ? "UNKNOWN_OUTCOME" : "KNOWN_RESULT",
    );
    const retry = await store.markDispatch(created, {
      expected_version: 0,
      recorded_at: "2026-07-22T04:20:00.000Z",
    });
    assert.equal(retry.version, result.version);
    assert.equal(retry.dispatch_count, 1);
  }
});

test("pre-dispatch cancellation is durable CANCELLED with no fabricated dispatch", async (t) => {
  const { store } = await fixture(t);
  const created = await store.intent(intent());
  const cancelled = await store.cancel(created, {
    expected_version: 0,
    recorded_at: T1,
    reason_ref: "owner.cancelled",
    target_audit_digest: D2,
  });
  assert.equal(cancelled.state, "CANCELLED");
  assert.equal(cancelled.dispatch_count, 0);
  assert.equal(cancelled.outcome, "NOT_APPLIED");
  const retry = await store.cancel(created, {
    expected_version: 0,
    recorded_at: T2,
    reason_ref: "owner.cancelled",
    target_audit_digest: D2,
  });
  assert.deepEqual(retry, cancelled);
});

test("post-dispatch cancellation is durable UNKNOWN_OUTCOME until readback", async (t) => {
  const { store } = await fixture(t);
  const created = await store.intent(intent());
  const dispatched = await store.markDispatch(created, {
    expected_version: 0,
    recorded_at: T1,
  });
  const cancelled = await store.cancel(dispatched, {
    expected_version: 1,
    recorded_at: T2,
    reason_ref: "owner.cancelled",
    target_audit_digest: D2,
  });
  assert.equal(cancelled.state, "UNKNOWN_OUTCOME");
  assert.equal(cancelled.dispatch_count, 1);
  assert.equal(cancelled.outcome, "INDETERMINATE");
});
