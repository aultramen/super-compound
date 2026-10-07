import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  computeBackgroundRunAggregatePolicyDigest,
  createCanonicalBackgroundPolicyAuthority,
} from "./background-policy.mjs";
import {
  addActiveRun,
  makeReservationInput,
  runObserveDispatchAuthorityAttack,
  setupActivePilot,
} from "./background-pilot-harness.test-support.mjs";
import { createDurabilityFailureInjector } from "./file-state.mjs";

const fixture = JSON.parse(
  await readFile(
    new URL("../evals/fixtures/background-pilots-v2.json", import.meta.url),
    "utf8",
  ),
);
function sha256(value) {
  const bytes = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function loadStoreModule() {
  return import("./background-execution.mjs").catch(() => ({}));
}

function clone(value) {
  return structuredClone(value);
}

function reservation(index, overrides = {}) {
  const value = clone(fixture.base_reservation_input);
  const suffix = String(index).padStart(2, "0");
  const replace = (candidate) => {
    if (typeof candidate === "string") {
      return candidate.replaceAll("pilot01", `pilot${suffix}`);
    }
    if (Array.isArray(candidate)) return candidate.map(replace);
    if (candidate !== null && typeof candidate === "object") {
      return Object.fromEntries(
        Object.entries(candidate).map(([key, entry]) => [key, replace(entry)]),
      );
    }
    return candidate;
  };
  const prepared = replace(value);
  prepared.aggregate_policy.max_workers = 1;
  if (index > 1) {
    const root = `sha256:${"d".repeat(64)}`;
    prepared.worktree_attestation.root_digest = root;
    prepared.worktree_verification.root_digest = root;
  }
  return { ...prepared, ...overrides };
}

async function durableBackgroundEventCount(root) {
  const directory = path.join(
    root,
    ".scratch/loop-runtime/background-dispatches/items",
  );
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    },
  );
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const text = await readFile(
      path.join(directory, entry.name, "events.jsonl"),
      "utf8",
    );
    count += text.trim().length === 0 ? 0 : text.trim().split("\n").length;
  }
  return count;
}

function durableStoreDependencies(context, extra = {}) {
  return {
    now: context.clock.now,
    queueCoordinator: context.queue.backgroundCoordinator,
    backgroundPolicyAuthority: context.backgroundPolicyAuthority,
    verifyHostAttestation: async (input) =>
      input.host_attestation.run_id === input.queue_claim.run_id &&
      input.host_verification.evidence_digest ===
        input.host_attestation.evidence_digest,
    verifyWorktreeAttestation: async (input) =>
      input.worktree_verification.verified === true &&
      input.worktree_verification.worktree_ref ===
        input.worktree_attestation.worktree_ref,
    ...extra,
  };
}

async function activeStoreFixture(pilotId, options = {}) {
  const active = await setupActivePilot(pilotId, options);
  return {
    ...active,
    input: makeReservationInput(active.context, active.queueClaim),
  };
}

function actionInput(input, queueVersion = 3) {
  const queue = clone(input.queue_claim);
  queue.queue_version = queueVersion;
  const actionHead = `sha256:${"e".repeat(64)}`;
  const actionId = "action.goal014.pilot";
  const intentDigest = `sha256:${"f".repeat(64)}`;
  return {
    current_queue_claim: queue,
    action_gate: {
      allowed: true,
      would_allow: true,
      simulation_only: false,
      mutation_authorized: true,
      operation: "work",
      queue_item_id: null,
      run_id: queue.run_id,
      run_version: 2,
      confirmation_digest: queue.approval_digest,
      authority_digest: queue.authority_digest,
      policy_digest: queue.policy_digest,
      run_head_digest: actionHead,
      verifier_digest: queue.verifier_digest,
      project_config_digest: queue.project_config_digest,
      operation_inventory_digest: queue.operation_inventory_digest,
      confirmed_risk_profile: queue.risk_profile,
      confirmed_autonomy_profile: queue.autonomy_profile,
      confirmed_required_gates: [...queue.required_gates],
      action_id: actionId,
      idempotency_key: "run.goal014.pilot.action",
      controller_intent_digest: intentDigest,
    },
    lineage_verification: {
      schema: "background_run_lineage_verification_v2",
      contract_version: "2.0.0",
      verified: true,
      run_id: queue.run_id,
      queue_item_id: queue.queue_item_id,
      queue_run_head_digest: queue.run_head_digest,
      action_run_head_digest: actionHead,
      queue_expected_run_version: queue.expected_run_version,
      action_run_version: 2,
      operation: "work",
      action_id: actionId,
      controller_intent_digest: intentDigest,
      evidence_digest: `sha256:${"d".repeat(64)}`,
      verified_at: input.now,
    },
    now: input.now,
  };
}

test("TEST-014 store accepts only same-root opaque queue and policy authorities", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const otherRoot = await mkdtemp(path.join(tmpdir(), "goal014-coordinator-other-"));
  const { context } = await activeStoreFixture("STORE-AUTHORITY");
  try {
    const dependencies = durableStoreDependencies(context);
    assert.throws(
      () =>
        createBackgroundExecutionStore(context.root, {
          ...dependencies,
          queueCoordinator: Object.freeze({}),
        }),
      /QUEUE_BACKGROUND_COORDINATOR_UNTRUSTED/u,
    );
    assert.throws(
      () => createBackgroundExecutionStore(otherRoot, dependencies),
      /QUEUE_BACKGROUND_COORDINATOR_ROOT_MISMATCH/u,
    );
    for (const fake of [undefined, Object.freeze({}), async () => true]) {
      assert.throws(
        () =>
          createBackgroundExecutionStore(context.root, {
            ...dependencies,
            backgroundPolicyAuthority: fake,
          }),
        /BACKGROUND_POLICY_AUTHORITY_UNTRUSTED/u,
      );
    }
    assert.throws(
      () =>
        createBackgroundExecutionStore(context.root, {
          ...dependencies,
          backgroundPolicyAuthority:
            createCanonicalBackgroundPolicyAuthority(otherRoot),
        }),
      /BACKGROUND_POLICY_AUTHORITY_ROOT_MISMATCH/u,
    );
    assert.doesNotThrow(() =>
      createBackgroundExecutionStore(context.root, dependencies),
    );
  } finally {
    await Promise.all([
      context.cleanup(),
      rm(otherRoot, { recursive: true, force: true }),
    ]);
  }
});

test("TEST-014 durable global reservation permits one winner at max_workers one", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  assert.equal(typeof createBackgroundExecutionStore, "function");
  const { context, queueClaim } = await setupActivePilot("STORE-WORKER", {
    aggregatePolicy: { max_workers: 1 },
  });
  try {
    const child = await addActiveRun(context, "second");
    const first = makeReservationInput(context, queueClaim);
    const second = makeReservationInput(child.context, child.queueClaim);
    const store = createBackgroundExecutionStore(
      context.root,
      durableStoreDependencies(context),
    );

    const results = await Promise.allSettled([
      store.reserve(first),
      store.reserve(second),
    ]);
    assert.equal(
      results.filter((entry) => entry.status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter((entry) => entry.status === "rejected").length,
      1,
    );
    assert.match(
      String(results.find((entry) => entry.status === "rejected").reason),
      /BACKGROUND_WORKER_CAP_EXHAUSTED/,
    );
  } finally {
    await context.cleanup();
  }
});

test("TEST-014 canonical authority rejects every self-consistent aggregate widening before persistence", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const cases = [
    ["max_workers", {}, (policy) => { policy.max_workers += 1; }],
    [
      "max_reserved_tokens",
      { maxTokens: 1_000, aggregatePolicy: { max_reserved_tokens: 1_000 } },
      (policy) => { policy.max_reserved_tokens = null; },
    ],
    [
      "max_reserved_runtime_ms",
      {},
      (policy) => { policy.max_reserved_runtime_ms += 1; },
    ],
    ["max_remote_calls", {}, (policy) => { policy.max_remote_calls += 1; }],
    ["max_reviewers", {}, (policy) => { policy.max_reviewers += 1; }],
  ];
  for (const [field, options, widen] of cases) {
    const { context, queueClaim } = await setupActivePilot(
      `STORE-WIDEN-${field.toUpperCase()}`,
      options,
    );
    try {
      const input = makeReservationInput(context, queueClaim);
      const store = createBackgroundExecutionStore(
        context.root,
        durableStoreDependencies(context),
      );
      const queueVersion = (
        await context.queue.show(input.queue_claim.queue_item_id)
      ).version;
      widen(input.aggregate_policy);
      input.aggregate_policy_digest = computeBackgroundRunAggregatePolicyDigest({
        run_id: input.queue_claim.run_id,
        aggregate_policy: input.aggregate_policy,
        policy_digest: input.queue_claim.policy_digest,
        aggregate_epoch_digest: input.aggregate_epoch_digest,
      });
      input.policy_verification.aggregate_policy_digest =
        input.aggregate_policy_digest;
      await assert.rejects(
        () => store.reserve(input),
        /BACKGROUND_AGGREGATE_POLICY_WIDENED/,
        field,
      );
      assert.equal(await durableBackgroundEventCount(context.root), 0, field);
      assert.equal(
        (await context.queue.show(input.queue_claim.queue_item_id)).version,
        queueVersion,
        field,
      );
    } finally {
      await context.cleanup();
    }
  }
});

test("TEST-014 every aggregate dimension is enforced atomically across distinct runs", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const cases = [
    [
      "worker",
      /BACKGROUND_WORKER_CAP_EXHAUSTED/,
      { aggregatePolicy: { max_workers: 1 } },
      {},
    ],
    [
      "runtime",
      /BACKGROUND_RUNTIME_CAP_EXHAUSTED/,
      { aggregatePolicy: { max_reserved_runtime_ms: 600_000 } },
      {},
    ],
    [
      "token",
      /BACKGROUND_TOKEN_CAP_EXHAUSTED/,
      { maxTokens: 1_000, aggregatePolicy: { max_reserved_tokens: 1_000 } },
      {},
    ],
    [
      "remote",
      /BACKGROUND_REMOTE_CAP_EXHAUSTED/,
      { aggregatePolicy: { max_remote_calls: 1 } },
      { reservation: { remote_calls: 1 } },
    ],
    [
      "reviewer",
      /BACKGROUND_REVIEWER_CAP_EXHAUSTED/,
      { aggregatePolicy: { max_reviewers: 1 } },
      {},
    ],
  ];
  for (const [name, expected, options, reservationOverrides] of cases) {
    const { context, queueClaim } = await setupActivePilot(
      `STORE-CROSS-${name.toUpperCase()}`,
      options,
    );
    try {
      const child = await addActiveRun(context, "second");
      const first = makeReservationInput(
        context,
        queueClaim,
        reservationOverrides,
      );
      const second = makeReservationInput(
        child.context,
        child.queueClaim,
        reservationOverrides,
      );
      const store = createBackgroundExecutionStore(
        context.root,
        durableStoreDependencies(context),
      );
      const results = await Promise.allSettled([
        store.reserve(first),
        store.reserve(second),
      ]);
      assert.equal(
        results.filter((entry) => entry.status === "fulfilled").length,
        1,
        name,
      );
      const rejected = results.find((entry) => entry.status === "rejected");
      assert.match(String(rejected.reason), expected, name);
      assert.equal(await durableBackgroundEventCount(context.root), 1, name);
    } finally {
      await context.cleanup();
    }
  }
});

test("TEST-014 stale config, inventory, run policy, and forged digest deny before event persistence", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const cases = [
    ["config", /BACKGROUND_PROJECT_CONFIG_(INVALID|STALE)/, async (root) => {
      const file = path.join(root, ".agent/context/project-config.json");
      await writeFile(file, `${await readFile(file, "utf8")}\n`);
    }],
    ["inventory", /BACKGROUND_OPERATION_INVENTORY_STALE/, async (root) => {
      const file = path.join(root, ".agent/context/operation-inventory.json");
      await writeFile(file, `${await readFile(file, "utf8")}\n`);
    }],
    ["run-policy", /BACKGROUND_RUN_POLICY_STALE/, async (root, input) => {
      const file = path.join(
        root,
        ".scratch/loop-runs",
        input.queue_claim.run_id,
        "contract.json",
      );
      const contract = JSON.parse(await readFile(file, "utf8"));
      contract.policy.max_iterations -= 1;
      await writeFile(file, `${JSON.stringify(contract, null, 2)}\n`);
    }],
    ["aggregate-digest", /BACKGROUND_AGGREGATE_POLICY_DIGEST_MISMATCH/, async (_root, input) => {
      input.aggregate_policy_digest = sha256("forged-aggregate-policy");
      input.policy_verification.aggregate_policy_digest =
        input.aggregate_policy_digest;
    }],
  ];
  for (const [name, expected, mutate] of cases) {
    const { context, queueClaim } = await setupActivePilot(
      `STORE-STALE-${name.toUpperCase()}`,
    );
    try {
      const input = makeReservationInput(context, queueClaim);
      const store = createBackgroundExecutionStore(
        context.root,
        durableStoreDependencies(context),
      );
      const queueVersion = (
        await context.queue.show(input.queue_claim.queue_item_id)
      ).version;
      await mutate(context.root, input);
      await assert.rejects(() => store.reserve(input), expected, name);
      assert.equal(await durableBackgroundEventCount(context.root), 0, name);
      assert.equal(
        (await context.queue.show(input.queue_claim.queue_item_id)).version,
        queueVersion,
        name,
      );
    } finally {
      await context.cleanup();
    }
  }
});

test("TEST-014 canonical policy revalidates after async proof and at arm and authorize", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();

  const verifier = await activeStoreFixture("STORE-POLICY-LAST");
  try {
    const configFile = path.join(
      verifier.context.root,
      ".agent/context/project-config.json",
    );
    const store = createBackgroundExecutionStore(
      verifier.context.root,
      durableStoreDependencies(verifier.context, {
        verifyWorktreeAttestation: async () => {
          await writeFile(configFile, `${await readFile(configFile, "utf8")}\n`);
          return true;
        },
      }),
    );
    await assert.rejects(
      () => store.reserve(verifier.input),
      /BACKGROUND_PROJECT_CONFIG_(INVALID|STALE)/,
    );
    assert.equal(await durableBackgroundEventCount(verifier.context.root), 0);
  } finally {
    await verifier.context.cleanup();
  }

  const arm = await activeStoreFixture("STORE-POLICY-ARM");
  try {
    const store = createBackgroundExecutionStore(
      arm.context.root,
      durableStoreDependencies(arm.context),
    );
    await store.reserve(arm.input);
    const workGate = await arm.context.validateGate({
      runId: arm.context.runId,
      operation: "work",
    });
    const before = await durableBackgroundEventCount(arm.context.root);
    const configFile = path.join(
      arm.context.root,
      ".agent/context/project-config.json",
    );
    await writeFile(configFile, `${await readFile(configFile, "utf8")}\n`);
    await assert.rejects(
      () =>
        store.arm(arm.input.dispatch_id, {
          expected_version: 0,
          action_gate: workGate,
          evidence_digest: arm.input.effective_limits_digest,
        }),
      /BACKGROUND_PROJECT_CONFIG_(INVALID|STALE)/,
    );
    assert.equal(await durableBackgroundEventCount(arm.context.root), before);
    assert.equal((await store.show(arm.input.dispatch_id)).state, "RESERVED");
  } finally {
    await arm.context.cleanup();
  }

  const authorize = await activeStoreFixture("STORE-POLICY-AUTHORIZE");
  try {
    const store = createBackgroundExecutionStore(
      authorize.context.root,
      durableStoreDependencies(authorize.context),
    );
    await store.reserve(authorize.input);
    const work = await authorize.context.validateGate({
      runId: authorize.context.runId,
      operation: "work",
    });
    await store.arm(authorize.input.dispatch_id, {
      expected_version: 0,
      action_gate: work,
      evidence_digest: authorize.input.effective_limits_digest,
    });
    await store.apply(authorize.input.dispatch_id, {
      expected_version: 1,
      command: "OBSERVE_DISPATCH",
      authorization: null,
      evidence_digest: authorize.input.aggregate_policy_digest,
      outcome: "DISPATCHED",
    });
    const sourceGate = await authorize.context.validateGate({
      runId: authorize.context.runId,
      operation: "source-write",
    });
    const before = await durableBackgroundEventCount(authorize.context.root);
    const configFile = path.join(
      authorize.context.root,
      ".agent/context/project-config.json",
    );
    await writeFile(configFile, `${await readFile(configFile, "utf8")}\n`);
    await assert.rejects(
      () =>
        store.authorize(authorize.input.dispatch_id, {
          action_gate: sourceGate,
          host_attestation: {
            ...authorize.input.host_attestation,
            run_head_digest: sourceGate.run_head_digest,
          },
        }),
      /BACKGROUND_PROJECT_CONFIG_(INVALID|STALE)/,
    );
    assert.equal(
      await durableBackgroundEventCount(authorize.context.root),
      before,
    );
    assert.equal(
      (await store.show(authorize.input.dispatch_id)).state,
      "DISPATCHED",
    );
  } finally {
    await authorize.context.cleanup();
  }
});

test("TEST-014 event-first crash retains capacity and recover repairs snapshot", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const { context, queueClaim } = await setupActivePilot("STORE-CRASH", {
    aggregatePolicy: { max_workers: 1 },
  });
  try {
    const child = await addActiveRun(context, "second");
    const first = makeReservationInput(context, queueClaim);
    const second = makeReservationInput(child.context, child.queueClaim);
    let crash = true;
    const crashing = createBackgroundExecutionStore(
      context.root,
      durableStoreDependencies(context, {
        afterEventAppend: async () => {
          if (crash) {
            crash = false;
            throw new Error("SIMULATED_BACKGROUND_CRASH");
          }
        },
      }),
    );
    await assert.rejects(
      () => crashing.reserve(first),
      /SIMULATED_BACKGROUND_CRASH/,
    );

    const restarted = createBackgroundExecutionStore(
      context.root,
      durableStoreDependencies(context),
    );
    await assert.rejects(
      () => restarted.reserve(second),
      /BACKGROUND_WORKER_CAP_EXHAUSTED/,
    );
    const recovered = await restarted.recover(first.dispatch_id);
    assert.equal(recovered.state, "RESERVED");
    assert.equal(recovered.reservation_status, "HELD");
  } finally {
    await context.cleanup();
  }
});

test("TEST-014 crash repair cannot bypass required directory durability", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const fixtureContext = await activeStoreFixture("STORE-DURABILITY");
  try {
    const store = createBackgroundExecutionStore(
      fixtureContext.context.root,
      durableStoreDependencies(fixtureContext.context, {
        durabilityFault: createDurabilityFailureInjector(
          "BEFORE_DIRECTORY_SYNC",
        ),
        requireDirectorySync: true,
      }),
    );

    await assert.rejects(
      () => store.reserve(fixtureContext.input),
      /BACKGROUND_DURABILITY_UNSUPPORTED/,
    );
    await assert.rejects(
      () => store.reserve(fixtureContext.input),
      /BACKGROUND_DURABILITY_UNSUPPORTED/,
    );
    await assert.rejects(
      () => store.recover(fixtureContext.input.dispatch_id),
      /BACKGROUND_DURABILITY_UNSUPPORTED/,
    );
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("TEST-014 async verifier delay cannot cross reservation or arm expiry", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const reserve = await activeStoreFixture("STORE-EXPIRY-RESERVE");
  try {
    const expiredReserve = createBackgroundExecutionStore(
      reserve.context.root,
      durableStoreDependencies(reserve.context, {
        verifyWorktreeAttestation: async () => {
          reserve.context.clock.set(
            reserve.input.queue_claim.approval_expires_at,
          );
          return true;
        },
      }),
    );
    await assert.rejects(
      () => expiredReserve.reserve(reserve.input),
      /BACKGROUND_(CONTROLLER_GATE_DENIED|ADMISSION_EXPIRED)/,
    );
    assert.equal(await durableBackgroundEventCount(reserve.context.root), 0);
  } finally {
    await reserve.context.cleanup();
  }

  let advanceModeVerification = null;
  const arm = await activeStoreFixture("STORE-EXPIRY-ARM", {
    verifyModeCapabilityAttestation: async () => {
      advanceModeVerification?.();
      return true;
    },
  });
  try {
    const store = createBackgroundExecutionStore(
      arm.context.root,
      durableStoreDependencies(arm.context),
    );
    await store.reserve(arm.input);
    const workGate = await arm.context.validateGate({
      runId: arm.context.runId,
      operation: "work",
    });
    advanceModeVerification = () =>
      arm.context.clock.set(arm.input.queue_claim.lease.expires_at);
    await assert.rejects(
      () =>
        store.arm(arm.input.dispatch_id, {
          expected_version: 0,
          action_gate: workGate,
          evidence_digest: arm.input.effective_limits_digest,
        }),
      /BACKGROUND_(ADMISSION_EXPIRED|LEASE_STALE)/,
    );
    assert.equal(await durableBackgroundEventCount(arm.context.root), 1);
  } finally {
    await arm.context.cleanup();
  }
});

test("TEST-014 store transition is CAS-safe and lost-ack cancellation is idempotent", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const fixtureContext = await activeStoreFixture("STORE-CAS");
  try {
    const store = createBackgroundExecutionStore(
      fixtureContext.context.root,
      durableStoreDependencies(fixtureContext.context),
    );
    await store.reserve(fixtureContext.input);
    const command = {
      expected_version: 0,
      command: "CANCEL",
      now: fixtureContext.context.clock.now(),
      authorization: null,
      evidence_digest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      outcome: null,
    };
    const applied = await store.apply(fixtureContext.input.dispatch_id, command);
    const retried = await store.apply(fixtureContext.input.dispatch_id, command);
    assert.equal(applied.applied, true);
    assert.equal(retried.applied, false);
    assert.equal(retried.record.version, 1);
    await assert.rejects(
      () =>
        store.apply(fixtureContext.input.dispatch_id, {
          ...command,
          evidence_digest:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        }),
      /BACKGROUND_VERSION_CONFLICT/,
    );
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("cancellation cascade blocks durable re-arm while preserving observation and reconciliation", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const fixtureContext = await activeStoreFixture("STORE-CANCEL-CASCADE");
  try {
    const store = createBackgroundExecutionStore(
      fixtureContext.context.root,
      durableStoreDependencies(fixtureContext.context),
    );
    await store.reserve(fixtureContext.input);
    const workGate = await fixtureContext.context.validateGate({
      runId: fixtureContext.context.runId,
      operation: "work",
    });
    const armed = await store.arm(fixtureContext.input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: fixtureContext.input.effective_limits_digest,
    });
    assert.equal(armed.record.state, "DISPATCH_INTENDED");

    const cancelled = await store.apply(fixtureContext.input.dispatch_id, {
      expected_version: 1,
      command: "CANCEL",
      now: fixtureContext.context.clock.now(),
      authorization: null,
      evidence_digest: fixtureContext.input.effective_limits_digest,
      outcome: null,
    });
    assert.equal(cancelled.record.state, "CANCEL_REQUESTED");
    await assert.rejects(
      () =>
        store.arm(fixtureContext.input.dispatch_id, {
          expected_version: 2,
          action_gate: workGate,
          evidence_digest: fixtureContext.input.effective_limits_digest,
        }),
      /BACKGROUND_ACTION_BLOCKED/,
    );

    const observed = await store.apply(fixtureContext.input.dispatch_id, {
      expected_version: 2,
      command: "OBSERVE_DISPATCH",
      now: fixtureContext.context.clock.now(),
      authorization: null,
      evidence_digest: fixtureContext.input.effective_limits_digest,
      outcome: "DISPATCHED",
    });
    assert.equal(observed.record.state, "CANCEL_REQUESTED");
    assert.equal(observed.record.result.outcome, "DISPATCHED_CANCEL_PENDING");

    const unknown = await store.apply(fixtureContext.input.dispatch_id, {
      expected_version: 3,
      command: "COMPLETE",
      now: fixtureContext.context.clock.now(),
      authorization: null,
      evidence_digest: fixtureContext.input.effective_limits_digest,
      outcome: "UNKNOWN",
    });
    assert.equal(unknown.record.state, "UNKNOWN_OUTCOME");

    const reconciled = await store.apply(fixtureContext.input.dispatch_id, {
      expected_version: 4,
      command: "RECONCILE",
      now: fixtureContext.context.clock.now(),
      authorization: null,
      evidence_digest: fixtureContext.input.effective_limits_digest,
      outcome: "QUARANTINED",
    });
    assert.equal(reconciled.record.state, "RECONCILED");
    assert.equal(reconciled.record.worktree.disposition, "QUARANTINED");
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("TEST-014 only trusted arm can consume the one-shot worker dispatch token", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  const fixtureContext = await activeStoreFixture("STORE-ARM");
  try {
    const store = createBackgroundExecutionStore(
      fixtureContext.context.root,
      durableStoreDependencies(fixtureContext.context),
    );
    await store.reserve(fixtureContext.input);
    const workGate = await fixtureContext.context.validateGate({
      runId: fixtureContext.context.runId,
      operation: "work",
    });
    await assert.rejects(
      () =>
        store.apply(fixtureContext.input.dispatch_id, {
          expected_version: 0,
          command: "DISPATCH_INTENDED",
          now: fixtureContext.context.clock.now(),
          authorization: null,
          evidence_digest: fixtureContext.input.effective_limits_digest,
          outcome: null,
        }),
      /BACKGROUND_ARM_REQUIRED/,
    );
    const armed = await store.arm(fixtureContext.input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: fixtureContext.input.effective_limits_digest,
    });
    const retry = await store.arm(fixtureContext.input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: fixtureContext.input.effective_limits_digest,
    });
    assert.equal(armed.applied, true);
    assert.equal(armed.handoff_granted, true);
    assert.equal(armed.record.state, "DISPATCH_INTENDED");
    assert.equal(retry.applied, false);
    assert.equal(retry.handoff_granted, false);
    assert.equal(retry.record.state, "UNKNOWN_OUTCOME");
    assert.equal(retry.record.dispatch_count, 1);
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("TEST-014 arm revalidates capability after durable intent before queue commit", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();
  let modeCapabilityValid = true;
  const fixtureContext = await activeStoreFixture("STORE-ARM-COMMIT-FENCE", {
    verifyModeCapabilityAttestation: async () => modeCapabilityValid,
  });
  try {
    let durableIntentObserved = false;
    const store = createBackgroundExecutionStore(
      fixtureContext.context.root,
      durableStoreDependencies(fixtureContext.context, {
        afterEventAppend: async (record) => {
          if (record.state === "DISPATCH_INTENDED") {
            durableIntentObserved = true;
            modeCapabilityValid = false;
          }
        },
      }),
    );
    await store.reserve(fixtureContext.input);
    const workGate = await fixtureContext.context.validateGate({
      runId: fixtureContext.context.runId,
      operation: "work",
    });
    const before = await durableBackgroundEventCount(fixtureContext.context.root);

    await assert.rejects(
      () =>
        store.arm(fixtureContext.input.dispatch_id, {
          expected_version: 0,
          action_gate: workGate,
          evidence_digest: fixtureContext.input.effective_limits_digest,
        }),
      /BACKGROUND_PROJECT_CONFIG_INVALID/u,
    );

    assert.equal(durableIntentObserved, true);
    assert.equal(
      await durableBackgroundEventCount(fixtureContext.context.root),
      before + 1,
    );
    assert.equal(
      (await store.show(fixtureContext.input.dispatch_id)).state,
      "DISPATCH_INTENDED",
    );
    assert.equal(
      (await fixtureContext.context.queue.show(
        fixtureContext.input.queue_claim.queue_item_id,
      )).dispatch_commit,
      null,
    );

    modeCapabilityValid = true;
    const recovered = await store.arm(fixtureContext.input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: fixtureContext.input.effective_limits_digest,
    });
    assert.equal(recovered.applied, false);
    assert.equal(recovered.handoff_granted, false);
    assert.equal(recovered.record.state, "CANCELLED");
    assert.equal(recovered.record.result.outcome, "NOT_DISPATCHED");
    assert.equal(
      (await fixtureContext.context.queue.show(
        fixtureContext.input.queue_claim.queue_item_id,
      )).dispatch_commit,
      null,
    );
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("TEST-014 reserve persist and authorize return use a final capability fence", async () => {
  const { createBackgroundExecutionStore } = await loadStoreModule();

  let reserveFenceActive = false;
  let reserveCapabilityChecks = 0;
  const reserve = await activeStoreFixture("STORE-RESERVE-FINAL-FENCE", {
    verifyModeCapabilityAttestation: async () => {
      if (!reserveFenceActive) return true;
      reserveCapabilityChecks += 1;
      return reserveCapabilityChecks < 3;
    },
  });
  try {
    const store = createBackgroundExecutionStore(
      reserve.context.root,
      durableStoreDependencies(reserve.context),
    );
    reserveFenceActive = true;
    await assert.rejects(
      () => store.reserve(reserve.input),
      /BACKGROUND_PROJECT_CONFIG_INVALID/u,
    );
    assert.equal(reserveCapabilityChecks, 3);
    assert.equal(await durableBackgroundEventCount(reserve.context.root), 0);
  } finally {
    await reserve.context.cleanup();
  }

  let authorizeFenceActive = false;
  let authorizeCapabilityChecks = 0;
  const authorize = await activeStoreFixture("STORE-AUTHORIZE-FINAL-FENCE", {
    verifyModeCapabilityAttestation: async () => {
      if (!authorizeFenceActive) return true;
      authorizeCapabilityChecks += 1;
      return authorizeCapabilityChecks < 3;
    },
  });
  try {
    const store = createBackgroundExecutionStore(
      authorize.context.root,
      durableStoreDependencies(authorize.context),
    );
    await store.reserve(authorize.input);
    const workGate = await authorize.context.validateGate({
      runId: authorize.context.runId,
      operation: "work",
    });
    await store.arm(authorize.input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: authorize.input.effective_limits_digest,
    });
    await store.apply(authorize.input.dispatch_id, {
      expected_version: 1,
      command: "OBSERVE_DISPATCH",
      authorization: null,
      evidence_digest: authorize.input.aggregate_policy_digest,
      outcome: "DISPATCHED",
    });
    const sourceGate = await authorize.context.validateGate({
      runId: authorize.context.runId,
      operation: "source-write",
    });
    const before = await durableBackgroundEventCount(authorize.context.root);
    authorizeFenceActive = true;
    await assert.rejects(
      () =>
        store.authorize(authorize.input.dispatch_id, {
          action_gate: sourceGate,
          host_attestation: {
            ...authorize.input.host_attestation,
            run_head_digest: sourceGate.run_head_digest,
          },
        }),
      /BACKGROUND_PROJECT_CONFIG_INVALID/u,
    );
    assert.equal(authorizeCapabilityChecks, 3);
    assert.equal(await durableBackgroundEventCount(authorize.context.root), before);
    assert.equal((await store.show(authorize.input.dispatch_id)).state, "DISPATCHED");
  } finally {
    await authorize.context.cleanup();
  }
});

test("TEST-014 durable validator requires and forwards the current host attestation", async () => {
  const { createDurableBackgroundDispatchValidator } = await loadStoreModule();
  const input = reservation(1);
  const gate = actionInput(input).action_gate;
  const attestation = {
    ...input.host_attestation,
    run_head_digest: gate.run_head_digest,
  };
  let authorizeInput = null;
  const validator = createDurableBackgroundDispatchValidator({
    authorize: async (dispatchId, candidate) => {
      authorizeInput = candidate;
      return {
        dispatch_id: dispatchId,
        run_id: input.queue_claim.run_id,
        operation: gate.operation,
      };
    },
  });

  await validator({
    dispatchId: input.dispatch_id,
    request: {
      run_id: input.queue_claim.run_id,
      operation_id: gate.operation,
    },
    gate,
    attestation,
  });
  assert.deepEqual(authorizeInput, {
    action_gate: gate,
    host_attestation: attestation,
  });
  await assert.rejects(
    () =>
      validator({
        dispatchId: input.dispatch_id,
        request: {
          run_id: input.queue_claim.run_id,
          operation_id: gate.operation,
        },
        gate,
        attestation: null,
      }),
    /BACKGROUND_DISPATCH_BINDING_MISMATCH/,
  );
});

test("TEST-014 durable queue bridge authorizes a post-dispatch source write", async () => {
  const {
    createBackgroundExecutionStore,
    createDurableBackgroundDispatchValidator,
  } = await loadStoreModule();
  assert.equal(typeof createDurableBackgroundDispatchValidator, "function");
  const fixtureContext = await activeStoreFixture("STORE-QUEUE-BRIDGE");
  try {
    const { context, input } = fixtureContext;
    const claimed = input.queue_claim;
    const queueInput = { queue_item_id: input.queue_claim.queue_item_id };
    const store = createBackgroundExecutionStore(
      context.root,
      durableStoreDependencies(context),
    );
    await store.reserve(input);
    context.clock.advance(60_000);
    const heartbeat = await context.queue.heartbeat(queueInput.queue_item_id, {
      expected_version: (await context.queue.show(queueInput.queue_item_id)).version,
      worker_ref: claimed.lease.worker_ref,
      lease_id: claimed.lease.lease_id,
    });
    const workGate = await context.validateGate({
      runId: context.runId,
      operation: "work",
    });
    const armed = await store.arm(input.dispatch_id, {
      expected_version: 0,
      action_gate: workGate,
      evidence_digest: input.effective_limits_digest,
    });
    assert.equal(armed.record.state, "DISPATCH_INTENDED");
    const dispatched = await store.apply(input.dispatch_id, {
      expected_version: 1,
      command: "OBSERVE_DISPATCH",
      authorization: null,
      evidence_digest: input.aggregate_policy_digest,
      outcome: "DISPATCHED",
    });
    const sourceGate = await context.validateGate({
      runId: context.runId,
      operation: "source-write",
    });
    const validator = createDurableBackgroundDispatchValidator(store);
    const authorization = await validator({
      dispatchId: input.dispatch_id,
      request: {
        run_id: input.queue_claim.run_id,
        operation_id: "source-write",
      },
      gate: sourceGate,
      attestation: {
        ...input.host_attestation,
        run_head_digest: sourceGate.run_head_digest,
      },
    });
    const completed = await store.apply(input.dispatch_id, {
      expected_version: 2,
      command: "COMPLETE",
      authorization: null,
      evidence_digest: input.policy_verification.evidence_digest,
      outcome: "SUCCESS",
    });
    const queueCompletion = await context.queue.complete(queueInput.queue_item_id, {
      expected_version: (await context.queue.show(queueInput.queue_item_id)).version,
      worker_ref: claimed.lease.worker_ref,
      lease_id: claimed.lease.lease_id,
      outcome: "KNOWN_RESULT",
      result_digest: input.policy_verification.evidence_digest,
    });

    assert.equal(heartbeat.version, 3);
    assert.equal(dispatched.record.state, "DISPATCHED");
    assert.equal(authorization.operation, "source-write");
    assert.equal(authorization.queue_version, heartbeat.version + 1);
    assert.equal(
      (await context.queue.show(queueInput.queue_item_id)).dispatch_commit.dispatch_id,
      input.dispatch_id,
    );
    assert.equal(completed.record.state, "COMPLETED");
    assert.equal(completed.record.reservation_status, "RELEASED");
    assert.equal(completed.record.worktree.disposition, "RELEASED");
    assert.equal(queueCompletion.item.state, "COMPLETED");
    assert.equal((await store.show(input.dispatch_id)).dispatch_count, 1);
  } finally {
    await fixtureContext.context.cleanup();
  }
});

test("TEST-014 pilot manifest is the exact accepted threat-model matrix", () => {
  assert.equal(fixture.pilots.length, 10);
  assert.equal(new Set(fixture.pilots.map((entry) => entry.pilot_id)).size, 10);
  const scenarios = new Set(fixture.pilots.map((entry) => entry.scenario));
  assert.deepEqual(scenarios, new Set([
    "success",
    "duplicate-reservation",
    "isolation-mismatch",
    "cap-exhaustion",
    "token-unknown",
    "cancel",
    "crash",
    "lease-loss",
    "resume-approval",
    "quarantine-retention",
  ]));
  assert.ok(
    fixture.pilots.every(
      (entry) =>
        entry.expected !== null &&
        typeof entry.expected === "object" &&
        !Array.isArray(entry.expected),
    ),
  );
});

test("TEST-014 pilot harness derives declared race and denial evidence", async () => {
  const source = await readFile(
    new URL("background-pilot-harness.test-support.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /Promise\.allSettled/u);
  assert.equal(source.includes("event_count: 0"), false);
  assert.equal(source.includes("loser_event_count: 0"), false);
  assert.equal(source.includes("automatic_retry: false"), false);
  for (const marker of [
    "PILOT_STALE_FENCE_DENIED",
    "PILOT_STALE_CONFIRMATION_DENIED",
    "PILOT_REPLAY_HANDOFF_DENIED",
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
});

async function runPilot(pilot) {
  const { runIntegratedPilot } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  return runIntegratedPilot(pilot, fixture);
}

test("TEST-014 human-confirmed background limits cannot be widened back to the contract ceiling", async () => {
  const { runHumanBudgetWideningAttack } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  assert.deepEqual(await runHumanBudgetWideningAttack(), {
    error_code: "BACKGROUND_EFFECTIVE_LIMITS_WIDENED",
    event_count: 0,
  });
});

test("TEST-014 background reservation uses current remaining runtime after cumulative consumption", async () => {
  const { runRemainingRuntimeReservationBoundary } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  assert.deepEqual(await runRemainingRuntimeReservationBoundary(), {
    error_code: "BACKGROUND_REMAINING_BUDGET_EXHAUSTED",
    rejected_event_count: 0,
    accepted_state: "RESERVED",
    consumed_runtime_ms: 540_000,
    remaining_runtime_ms: 60_000,
  });
});

test("TEST-014 ARM revalidates current token remaining before durable dispatch intent", async () => {
  const { runArmRevalidationAfterTokenConsumption } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  assert.deepEqual(await runArmRevalidationAfterTokenConsumption(), {
    error_code: "BACKGROUND_REMAINING_BUDGET_EXHAUSTED",
    event_count: 1,
    queue_dispatch_commit: null,
  });
});

test("TEST-014 arbitrary legacy lineage callbacks cannot become background authority", async () => {
  const { runLegacyLineageCallbackInjectionAttack } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  assert.equal(
    await runLegacyLineageCallbackInjectionAttack(),
    "BACKGROUND_LEGACY_LINEAGE_CALLBACK_FORBIDDEN",
  );
});

test("TEST-014 OBSERVE authority cannot reserve, arm, commit, or hand off", async () => {
  assert.deepEqual(await runObserveDispatchAuthorityAttack(), {
    queue_gate: {
      allowed: false,
      simulation_only: true,
      mutation_authorized: false,
    },
    work_gate: {
      allowed: false,
      simulation_only: true,
      mutation_authorized: false,
    },
    reserve_error: "BACKGROUND_CONTROLLER_GATE_DENIED",
    arm_error: "BACKGROUND_DISPATCH_NOT_FOUND",
    event_count: 0,
    queue_dispatch_commit: null,
    host_dispatch_count: 0,
  });
});

test("TEST-014 distinct run policies share one aggregate epoch without false drift", async () => {
  const { runDistinctPolicySharedAggregatePool } = await import(
    "./background-pilot-harness.test-support.mjs"
  );
  assert.deepEqual(await runDistinctPolicySharedAggregatePool(), {
    run_policy_digests_differ: true,
    aggregate_epoch_digests_match: true,
    run_aggregate_digests_differ: true,
    states: ["RESERVED", "RESERVED"],
    event_count: 2,
  });
});

for (const pilot of fixture.pilots) {
  test(`TEST-014 ${pilot.pilot_id} executes ${pilot.scenario}`, async () => {
    assert.deepEqual(await runPilot(pilot), pilot.expected);
  });
}

test("TEST-014 background model and store remain host-neutral and effect-free", async () => {
  for (const file of ["background-execution-model.mjs", "background-execution.mjs"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const forbidden of [
      "node:child_process",
      "node:http",
      "node:https",
      "node:net",
      "node:dgram",
      "node:worker_threads",
      "execFile(",
      "spawn(",
      "fetch(",
    ]) {
      assert.equal(source.includes(forbidden), false, `${file}: ${forbidden}`);
    }
  }
});
