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


test("atomic writes replace in place, enforce CAS, and tolerate filesystems without directory fsync", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "file-state-write-"));
  try {
    const { assertExpectedVersion, syncDirectory, writeFileAtomic } = await loadFileState();
    const first = await writeFileAtomic(root, "state/value.json", '{"version":1}\n');
    const second = await writeFileAtomic(root, "state/value.json", '{"version":2}\n');
    assert.equal(first.durability.atomicReplace, true);
    assert.equal(second.durability.fileSync, true);
    assert.equal(await readFile(path.join(root, "state/value.json"), "utf8"), '{"version":2}\n');
    const leftovers = (await readdir(path.join(root, "state"))).filter((name) => name.endsWith(".tmp"));
    assert.deepEqual(leftovers, []);

    // WSL on /mnt/c (drvfs/9p) and NTFS reject directory fsync with EINVAL/EPERM;
    // that must degrade to directorySync=false, never fail the completed write.
    const einval = Object.assign(new Error("EINVAL: invalid argument, fsync"), { code: "EINVAL" });
    const openDirectory = async () => ({ sync: async () => { throw einval; }, close: async () => {} });
    assert.equal(await syncDirectory(root, { openDirectory }), false);
    const tolerated = await writeFileAtomic(root, "state/value.json", '{"version":3}\n', { openDirectory });
    assert.equal(tolerated.durability.directorySync, false);
    assert.equal(await readFile(path.join(root, "state/value.json"), "utf8"), '{"version":3}\n');
    const other = Object.assign(new Error("EIO"), { code: "EIO" });
    await assert.rejects(
      syncDirectory(root, { openDirectory: async () => ({ sync: async () => { throw other; }, close: async () => {} }) }),
      /EIO/,
    );

    assert.equal(assertExpectedVersion(3, 3, "ledger"), 3);
    assert.throws(() => assertExpectedVersion(3, 2, "ledger"), /CAS conflict for ledger/);
    await assert.rejects(
      writeFileAtomic(root, "state/big.json", "x".repeat(11), { maxBytes: 10 }),
      /exceeds 10 bytes/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict atomic replacement preserves old bytes on busy rename", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "strict-write-"));
  t.after(() => rm(root, {recursive: true, force: true}));
  await writeFile(path.join(root, 'memory.md'), 'old');
  const {writeFileAtomic} = await loadFileState();
  await assert.rejects(writeFileAtomic(root, 'memory.md', 'new', {
    fallbackOnBusy: false,
    renameFile: async () => { throw Object.assign(new Error('busy'), {code: 'EBUSY'}); },
  }), /busy/);
  assert.equal(await readFile(path.join(root, 'memory.md'), 'utf8'), 'old');
});
