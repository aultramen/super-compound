import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function loadFileState() {
  return import("./file-state.mjs").catch(() => ({}));
}

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createManualHeartbeatScheduler() {
  const tasks = new Set();
  return {
    get activeCount() {
      return tasks.size;
    },
    schedule(task, intervalMs) {
      assert.equal(typeof task, "function");
      assert.equal(Number.isSafeInteger(intervalMs) && intervalMs > 0, true);
      const entry = { task };
      tasks.add(entry);
      return () => tasks.delete(entry);
    },
    async tick() {
      assert.equal(tasks.size, 1, "expected exactly one active heartbeat");
      await [...tasks][0].task();
    },
  };
}

test("repository reads are confined, symlink-safe, and bounded", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-read-"));
  try {
    const { readBoundedFile, resolveRepositoryPath } = await loadFileState();
    assert.equal(typeof resolveRepositoryPath, "function");
    assert.equal(typeof readBoundedFile, "function");

    await mkdir(path.join(root, "state"));
    await writeFile(path.join(root, "state", "value.txt"), "bounded\n");

    assert.equal(
      await resolveRepositoryPath(root, "state/value.txt"),
      path.join(root, "state", "value.txt"),
    );
    assert.equal(
      await readBoundedFile(root, "state/value.txt", {
        encoding: "utf8",
        maxBytes: 8,
      }),
      "bounded\n",
    );
    await assert.rejects(
      resolveRepositoryPath(root, "../outside.txt"),
      /outside repository root/i,
    );
    await assert.rejects(
      readBoundedFile(root, "state/value.txt", { maxBytes: 7 }),
      /exceeds 7 bytes/i,
    );

    if (process.platform !== "win32") {
      const outside = await mkdtemp(path.join(tmpdir(), "file-state-outside-"));
      try {
        await symlink(outside, path.join(root, "linked"), "dir");
        await assert.rejects(
          resolveRepositoryPath(root, "linked/value.txt"),
          /symlink/i,
        );
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bounded reads request at most maxBytes plus one from the file handle", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-read-growth-"));
  try {
    const { readBoundedFile } = await loadFileState();
    await writeFile(path.join(root, "value.txt"), "safe");
    const growingContent = Buffer.from("12345");
    let requestedBytes = 0;
    const openFile = async () => ({
      async close() {},
      async read(buffer, offset, length) {
        requestedBytes += length;
        growingContent.copy(buffer, offset, 0, length);
        return { bytesRead: length };
      },
      async stat() {
        return { isFile: () => true };
      },
    });

    await assert.rejects(
      readBoundedFile(root, "value.txt", { maxBytes: 4, openFile }),
      /exceeds 4 bytes/i,
    );
    assert.equal(requestedBytes, 5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("state writes are durable atomic replacements with bounded append and CAS", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-write-"));
  try {
    const {
      appendFileDurable,
      assertExpectedVersion,
      writeFileAtomic,
    } = await loadFileState();
    assert.equal(typeof writeFileAtomic, "function");
    assert.equal(typeof appendFileDurable, "function");
    assert.equal(typeof assertExpectedVersion, "function");

    const first = await writeFileAtomic(root, "state/value.json", '{"version":1}\n');
    const second = await writeFileAtomic(root, "state/value.json", '{"version":2}\n');
    const appended = await appendFileDurable(root, "state/events.jsonl", "one\n", {
      maxBytes: 8,
    });
    await appendFileDurable(root, "state/events.jsonl", "two\n", { maxBytes: 8 });

    assert.equal(await readFile(path.join(root, "state", "value.json"), "utf8"), '{"version":2}\n');
    assert.equal(await readFile(path.join(root, "state", "events.jsonl"), "utf8"), "one\ntwo\n");
    assert.equal(first.durability.fileSync, true);
    assert.equal(second.durability.atomicReplace, true);
    assert.equal(appended.bytes, 4);
    assert.deepEqual(
      (await readdir(path.join(root, "state"))).filter((name) => name.endsWith(".tmp")),
      [],
    );
    assert.equal(assertExpectedVersion(2, 2), 2);
    assert.throws(() => assertExpectedVersion(2, 1), /CAS conflict/i);
    await assert.rejects(
      appendFileDurable(root, "state/events.jsonl", "x", { maxBytes: 8 }),
      /exceeds 8 bytes/i,
    );
    await assert.rejects(
      writeFileAtomic(root, "state/oversized.json", "12345", { maxBytes: 4 }),
      /exceeds 4 bytes/i,
    );
    await assert.rejects(readFile(path.join(root, "state", "oversized.json")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("durability failures are injected by stage without platform branches", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-durability-fault-"));
  try {
    const {
      createDurabilityFailureInjector,
      verifyDirectoryDurability,
      writeFileAtomic,
    } = await loadFileState();
    const target = path.join(root, "state", "value.txt");

    await assert.rejects(
      writeFileAtomic(root, "state/value.txt", "never-visible\n", {
        durabilityFault: createDurabilityFailureInjector("BEFORE_FILE_SYNC"),
      }),
      /DURABILITY_FAILURE_INJECTED: BEFORE_FILE_SYNC/u,
    );
    await assert.rejects(readFile(target), { code: "ENOENT" });

    await writeFileAtomic(root, "state/value.txt", "preimage\n");
    await assert.rejects(
      writeFileAtomic(root, "state/value.txt", "not-replaced\n", {
        durabilityFault: createDurabilityFailureInjector(
          "BEFORE_ATOMIC_REPLACE",
        ),
      }),
      /DURABILITY_FAILURE_INJECTED: BEFORE_ATOMIC_REPLACE/u,
    );
    assert.equal(await readFile(target, "utf8"), "preimage\n");

    await assert.rejects(
      writeFileAtomic(root, "state/value.txt", "replaced-before-sync-fault\n", {
        durabilityFault: createDurabilityFailureInjector(
          "BEFORE_DIRECTORY_SYNC",
        ),
      }),
      /DURABILITY_FAILURE_INJECTED: BEFORE_DIRECTORY_SYNC/u,
    );
    assert.equal(
      await readFile(target, "utf8"),
      "replaced-before-sync-fault\n",
    );
    assert.equal((await verifyDirectoryDurability(root)).directory_sync, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hard interceptor authority only constructs root-bound read-only worker commands", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-interceptor-"));
  try {
    const {
      buildHardWriteSandboxCommand,
      createHardWriteInterceptor,
      hardWriteInterceptorDigest,
    } = await loadFileState();
    const interceptor = createHardWriteInterceptor(root);
    const interceptorDigest = hardWriteInterceptorDigest(interceptor, root);
    const command = buildHardWriteSandboxCommand(interceptor, {
      command: "/usr/bin/printf",
      args: ["safe"],
    });
    assert.equal(command.executable, "/usr/bin/bwrap");
    assert.equal(command.interceptor_digest, interceptorDigest);
    assert.deepEqual(
      command.args.slice(
        command.args.indexOf("--ro-bind", 1),
        command.args.indexOf("--ro-bind", 1) + 3,
      ),
      ["--ro-bind", "/", "/"],
    );
    const repositoryBind = command.args.lastIndexOf("--ro-bind");
    assert.deepEqual(
      command.args.slice(repositoryBind, repositoryBind + 3),
      ["--ro-bind", root, root],
    );
    assert.equal(command.args.includes("--clearenv"), true);
    assert.equal(Object.isFrozen(command.args), true);
    assert.throws(
      () => buildHardWriteSandboxCommand(interceptor, {
        admission: {},
        command: "/usr/bin/true",
      }),
      /unsupported field/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("atomic replacement rejects a non-function pre-replace assertion", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-invalid-pre-replace-"));
  try {
    const { writeFileAtomic } = await loadFileState();

    await assert.rejects(
      writeFileAtomic(root, "state/value.txt", "new\n", {
        assertBeforeReplace: true,
      }),
      /assertBeforeReplace must be a function/i,
    );
    await assert.rejects(readFile(path.join(root, "state", "value.txt")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("atomic replacement preserves a racing write when the pre-replace assertion rejects", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-pre-replace-race-"));
  try {
    const { writeFileAtomic } = await loadFileState();
    const target = path.join(root, "state", "value.txt");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "before\n");
    const callOrder = [];

    await assert.rejects(
      writeFileAtomic(root, "state/value.txt", "replacement\n", {
        assertOwnership: async () => {
          callOrder.push("ownership");
        },
        assertBeforeReplace: async () => {
          callOrder.push("pre-replace");
          await writeFile(target, "racing-write\n");
          throw new Error("CAS conflict before atomic replace");
        },
      }),
      /CAS conflict before atomic replace/i,
    );

    assert.deepEqual(callOrder, ["ownership", "pre-replace"]);
    assert.equal(await readFile(target, "utf8"), "racing-write\n");
    assert.deepEqual(
      (await readdir(path.dirname(target))).filter((name) => name.endsWith(".tmp")),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("concurrent appends serialize the size check with the durable write", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-append-race-"));
  try {
    const { appendFileDurable } = await loadFileState();
    const results = await Promise.allSettled([
      appendFileDurable(root, "state/events.jsonl", "one\n", { maxBytes: 4 }),
      appendFileDurable(root, "state/events.jsonl", "two\n", { maxBytes: 4 }),
    ]);

    assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(results.filter(({ status }) => status === "rejected").length, 1);
    assert.match(
      results.find(({ status }) => status === "rejected").reason.message,
      /exceeds 4 bytes/i,
    );
    assert.equal((await readFile(path.join(root, "state", "events.jsonl"))).length, 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("owner-token locks serialize operations and reclaim stale locks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-lock-"));
  try {
    const { withOwnerLock } = await loadFileState();
    assert.equal(typeof withOwnerLock, "function");

    let active = 0;
    let maximumActive = 0;
    const order = [];
    const operation = (name) =>
      withOwnerLock(root, "state/ledger.lock", async ({ ownerToken }) => {
        assert.match(ownerToken, /^[a-f0-9-]{36}$/i);
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        order.push(`${name}:start`);
        await new Promise((resolve) => setTimeout(resolve, 15));
        order.push(`${name}:end`);
        active -= 1;
      });

    await Promise.all([operation("one"), operation("two")]);
    assert.equal(maximumActive, 1);
    assert.equal(order.length, 4);

    const lockPath = path.join(root, "state", "ledger.lock");
    await mkdir(lockPath);
    const staleTime = new Date(Date.now() - 120_000);
    const { utimes } = await import("node:fs/promises");
    await utimes(lockPath, staleTime, staleTime);
    let reclaimed = false;
    await withOwnerLock(
      root,
      "state/ledger.lock",
      async () => {
        reclaimed = true;
      },
      { staleMs: 60_000 },
    );
    assert.equal(reclaimed, true);
    await assert.rejects(readFile(lockPath), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("owner-token locks renew active leases on a deterministic scheduler", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-active-lock-"));
  const firstEntered = createDeferred();
  const releaseFirst = createDeferred();
  const contenderWaiting = createDeferred();
  const allowContenderRetry = createDeferred();
  const secondEntered = createDeferred();
  const heartbeatScheduler = createManualHeartbeatScheduler();
  let firstOwnerPath;
  let first;
  let second;
  try {
    const { withOwnerLock } = await loadFileState();
    let nowMs = Math.ceil(Date.now() / 1_000) * 1_000 + 60_000;
    let active = 0;
    let maximumActive = 0;
    const options = {
      heartbeatMs: 1_000,
      now: () => nowMs,
      retryMs: 1,
      scheduleHeartbeat: heartbeatScheduler.schedule,
      staleMs: 10_000,
      timeoutMs: 20_000,
      wait: async () => {
        contenderWaiting.resolve();
        await allowContenderRetry.promise;
      },
    };

    first = withOwnerLock(
      root,
      "state/ledger.lock",
      async ({ lockPath }) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        firstOwnerPath = path.join(lockPath, "owner");
        firstEntered.resolve();
        try {
          await releaseFirst.promise;
        } finally {
          active -= 1;
        }
      },
      options,
    );
    await firstEntered.promise;

    const unrenewedOwner = await lstat(firstOwnerPath);
    assert.equal(nowMs - unrenewedOwner.mtimeMs > options.staleMs, true);
    nowMs += 1_000;
    await heartbeatScheduler.tick();
    const renewedOwner = await lstat(firstOwnerPath);
    assert.equal(Math.abs(nowMs - renewedOwner.mtimeMs) <= 1_000, true);
    nowMs += 5_000;

    second = withOwnerLock(
      root,
      "state/ledger.lock",
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        secondEntered.resolve();
        active -= 1;
      },
      options,
    );
    const contenderOutcome = await Promise.race([
      contenderWaiting.promise.then(() => "waiting"),
      secondEntered.promise.then(() => "entered"),
      second.then(
        () => "completed",
        (error) => Promise.reject(error),
      ),
    ]);
    assert.equal(contenderOutcome, "waiting");
    assert.equal(maximumActive, 1);

    releaseFirst.resolve();
    await first;
    allowContenderRetry.resolve();
    await second;

    assert.equal(maximumActive, 1);
    assert.equal(heartbeatScheduler.activeCount, 0);
  } finally {
    releaseFirst.resolve();
    allowContenderRetry.resolve();
    await Promise.allSettled([first, second].filter(Boolean));
    await rm(root, { recursive: true, force: true });
  }
});

test("owner-token locks settle heartbeats queued during scheduler stop before reporting completion", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-late-heartbeat-"));
  const unhandledRejections = [];
  const recordUnhandledRejection = (reason) => unhandledRejections.push(reason);
  process.on("unhandledRejection", recordUnhandledRejection);

  try {
    const { withOwnerLock } = await loadFileState();

    let successfulStopCalls = 0;
    let successfulRenewal;
    let successfulRenewalSettled = false;
    const successfulResult = await withOwnerLock(
      root,
      "state/late-success.lock",
      async () => "operation-result",
      {
        scheduleHeartbeat: (task) => () => {
          successfulStopCalls += 1;
          successfulRenewal = task().then(() => {
            successfulRenewalSettled = true;
          });
        },
      },
    );
    assert.equal(successfulResult, "operation-result");
    assert.equal(successfulStopCalls, 1);
    assert.equal(successfulRenewalSettled, true);
    await successfulRenewal;
    await assert.rejects(readFile(path.join(root, "state", "late-success.lock", "owner")), {
      code: "ENOENT",
    });

    const lateFailureLockPath = path.join(root, "state", "late-failure.lock");
    const lateFailureOwnerPath = path.join(lateFailureLockPath, "owner");
    let failingStopCalls = 0;
    let failingRenewal;
    await assert.rejects(
      withOwnerLock(
        root,
        "state/late-failure.lock",
        async () => "must-not-be-reported",
        {
          scheduleHeartbeat: (task) => () => {
            failingStopCalls += 1;
            writeFileSync(lateFailureOwnerPath, "replacement-owner", "utf8");
            failingRenewal = task();
          },
        },
      ),
      /owner lock was lost/i,
    );
    assert.equal(failingStopCalls, 1);
    await failingRenewal;
    assert.equal(await readFile(lateFailureOwnerPath, "utf8"), "replacement-owner");

    const operationFailure = new Error("operation failed before heartbeat cleanup");
    const originalFailureLockPath = path.join(root, "state", "original-failure.lock");
    const originalFailureOwnerPath = path.join(originalFailureLockPath, "owner");
    let originalFailureStopCalls = 0;
    let originalFailureRenewal;
    let observedFailure;
    try {
      await withOwnerLock(
        root,
        "state/original-failure.lock",
        async () => {
          throw operationFailure;
        },
        {
          scheduleHeartbeat: (task) => () => {
            originalFailureStopCalls += 1;
            writeFileSync(originalFailureOwnerPath, "replacement-owner", "utf8");
            originalFailureRenewal = task();
          },
        },
      );
    } catch (error) {
      observedFailure = error;
    }
    assert.equal(observedFailure, operationFailure);
    assert.equal(originalFailureStopCalls, 1);
    await originalFailureRenewal;
    assert.equal(await readFile(originalFailureOwnerPath, "utf8"), "replacement-owner");

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", recordUnhandledRejection);
    await rm(root, { recursive: true, force: true });
  }
});

test("atomic replacement fences a writer whose owner token was stolen", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-fence-"));
  try {
    const { withOwnerLock, writeFileAtomic } = await loadFileState();
    await writeFileAtomic(root, "state/value.txt", "before\n");

    await withOwnerLock(
      root,
      "state/ledger.lock",
      async ({ assertOwnership, lockPath }) => {
        assert.equal(typeof assertOwnership, "function");
        await rm(lockPath, { recursive: true, force: true });
        await mkdir(lockPath);
        await writeFile(path.join(lockPath, "owner"), "new-owner", "utf8");

        await assert.rejects(
          writeFileAtomic(root, "state/value.txt", "after\n", {
            assertOwnership,
          }),
          /owner lock was lost/i,
        );
      },
      { heartbeatMs: 100, staleMs: 300 },
    );

    assert.equal(await readFile(path.join(root, "state", "value.txt"), "utf8"), "before\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
