import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createReviewPackage,
  createWorkPackage,
  recordWorkPackageResult,
} from "./work-package.mjs";

test("createWorkPackage materializes a path-only handoff and ledger", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-"));

  try {
    const brief = path.join(root, ".scratch", "feature", "issues", "01-goal.md");
    const pathsFile = path.join(root, ".scratch", "feature", "scope.json");
    await mkdir(path.dirname(brief), { recursive: true });
    await writeFile(brief, "# GOAL-001\n\nImplement the referenced goal.\n");
    await writeFile(pathsFile, '["src"]\n');

    const result = await createWorkPackage(root, {
      runId: "feature-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const ledger = JSON.parse(await readFile(result.ledgerPath, "utf8"));

    assert.match(result.packageDir, /\.scratch[\\/]work-packages[\\/]feature-run[\\/]goal-001$/);
    assert.equal(await readFile(result.briefPath, "utf8"), await readFile(brief, "utf8"));
    assert.match(await readFile(result.reportPath, "utf8"), /Verification/);
    assert.equal(await readFile(result.pathsPath, "utf8"), '[\n  "src"\n]\n');
    assert.equal(ledger.goals["goal-001"].status, "ready");
    assert.equal(ledger.goals["goal-001"].reportPath, result.reportPath);
    assert.equal(ledger.goals["goal-001"].pathsPath, result.pathsPath);

    await assert.rejects(
      createWorkPackage(root, {
        runId: "../escape",
        goalId: "goal-002",
        briefPath: brief,
        pathsFile,
      }),
      /runId/i,
    );
    await assert.rejects(
      createWorkPackage(root, {
        runId: "feature-run",
        goalId: "goal-002",
        briefPath: path.join(root, "..", "outside.md"),
        pathsFile,
      }),
      /outside/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createReviewPackage writes the working-tree diff once", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-git-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    await writeFile(path.join(root, "app.txt"), "before\n");
    await writeFile(path.join(root, "other.txt"), "before other\n");
    execFileSync("git", ["add", "app.txt", "other.txt"], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    await writeFile(path.join(root, "app.txt"), "after\n");
    await writeFile(path.join(root, "other.txt"), "after other\n");
    await writeFile(path.join(root, "new.txt"), "new file\n");
    await writeFile(
      path.join(root, "ordinary-config.txt"),
      "password=do-not-package-this-fixture\n",
    );

    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "review-paths.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(
      pathsFile,
      `${JSON.stringify(["app.txt", "new.txt", "ordinary-config.txt"])}\n`,
    );
    await createWorkPackage(root, {
      runId: "review-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const result = await createReviewPackage(root, {
      runId: "review-run",
      goalId: "goal-001",
      baseRef: "HEAD",
      pathsFile,
    });
    const diff = await readFile(result.reviewPackagePath, "utf8");

    assert.match(diff, /-before/);
    assert.match(diff, /\+after/);
    assert.match(diff, /new\.txt/);
    assert.match(diff, /\+new file/);
    assert.match(diff, /ordinary-config\.txt/);
    assert.match(diff, /content withheld/);
    assert.doesNotMatch(diff, /do-not-package-this-fixture/);
    assert.doesNotMatch(diff, /other\.txt/);
    assert.doesNotMatch(diff, /review-paths\.json/);
    assert.deepEqual(result.paths, ["app.txt", "new.txt", "ordinary-config.txt"]);
    assert.ok(result.bytes > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scheduler-owned scope rejects implementation edits outside the allowlist", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    await writeFile(path.join(root, "allowed.txt"), "before\n");
    await writeFile(path.join(root, "outside.txt"), "before\n");
    execFileSync("git", ["add", "allowed.txt", "outside.txt"], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });

    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scheduler-scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["allowed.txt"]\n');
    await createWorkPackage(root, {
      runId: "scope-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    await writeFile(path.join(root, "allowed.txt"), "after\n");
    await writeFile(path.join(root, "outside.txt"), "after outside\n");

    await assert.rejects(
      createReviewPackage(root, {
        runId: "scope-run",
        goalId: "goal-001",
        baseRef: "HEAD",
        pathsFile,
      }),
      /outside scheduler-owned review scope.*outside\.txt/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createReviewPackage withholds tracked sensitive paths and content", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-sensitive-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    await writeFile(path.join(root, ".env.production"), "API_KEY=old-tracked-value\n");
    await writeFile(path.join(root, "ordinary-config.txt"), "mode=safe\n");
    execFileSync("git", ["add", ".env.production", "ordinary-config.txt"], {
      cwd: root,
    });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    await writeFile(path.join(root, ".env.production"), "API_KEY=new-tracked-value\n");
    await writeFile(
      path.join(root, "ordinary-config.txt"),
      "password=tracked-content-value\n",
    );

    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "review-paths.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(
      pathsFile,
      `${JSON.stringify([".env.production", "ordinary-config.txt"])}\n`,
    );
    await createWorkPackage(root, {
      runId: "sensitive-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    const result = await createReviewPackage(root, {
      runId: "sensitive-run",
      goalId: "goal-001",
      baseRef: "HEAD",
      pathsFile,
    });
    const diff = await readFile(result.reviewPackagePath, "utf8");

    assert.doesNotMatch(diff, /old-tracked-value|new-tracked-value/);
    assert.doesNotMatch(diff, /tracked-content-value/);
    assert.doesNotMatch(diff, /\.env\.production/);
    assert.match(diff, /ordinary-config\.txt/);
    assert.match(diff, /content withheld/);
    assert.match(diff, /sha256=[a-f0-9]{64}/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recordWorkPackageResult updates only the named goal", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-"));

  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    await createWorkPackage(root, {
      runId: "result-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    const result = await recordWorkPackageResult(root, {
      runId: "result-run",
      goalId: "goal-001",
      status: "verified",
      verification: "node --test: pass",
    });
    const ledger = JSON.parse(await readFile(result.ledgerPath, "utf8"));

    assert.equal(ledger.goals["goal-001"].status, "verified");
    assert.equal(
      ledger.goals["goal-001"].verification,
      "node --test: pass",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("concurrent create and record preserve every goal", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-concurrent-"));

  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const goalIds = Array.from(
      { length: 20 },
      (_, index) => `goal-${String(index + 1).padStart(2, "0")}`,
    );

    const created = await Promise.all(
      goalIds.map((goalId) =>
        createWorkPackage(root, {
          runId: "concurrent-run",
          goalId,
          briefPath: brief,
          pathsFile,
        }),
      ),
    );
    const ledgerPath = created[0].ledgerPath;
    const createdLedger = JSON.parse(await readFile(ledgerPath, "utf8"));

    assert.deepEqual(Object.keys(createdLedger.goals).sort(), goalIds);

    await Promise.all(
      goalIds.map((goalId) =>
        recordWorkPackageResult(root, {
          runId: "concurrent-run",
          goalId,
          status: "verified",
          verification: `verified ${goalId}`,
        }),
      ),
    );
    const recordedLedger = JSON.parse(await readFile(ledgerPath, "utf8"));

    assert.deepEqual(Object.keys(recordedLedger.goals).sort(), goalIds);
    for (const goalId of goalIds) {
      assert.equal(recordedLedger.goals[goalId].status, "verified");
      assert.equal(
        recordedLedger.goals[goalId].verification,
        `verified ${goalId}`,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createWorkPackage reclaims a bounded stale ledger lock", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-stale-lock-"));

  try {
    const brief = path.join(root, "goal.md");
    const runDir = path.join(
      root,
      ".scratch",
      "work-packages",
      "stale-run",
    );
    const lockPath = path.join(runDir, "ledger.json.lock");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    await mkdir(lockPath, { recursive: true });
    const staleTime = new Date(Date.now() - 120_000);
    await utimes(lockPath, staleTime, staleTime);

    const result = await createWorkPackage(root, {
      runId: "stale-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const ledger = JSON.parse(await readFile(result.ledgerPath, "utf8"));

    assert.equal(ledger.goals["goal-001"].status, "ready");
    await assert.rejects(access(lockPath), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createReviewPackage bounds unchanged hunk context", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-context-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    const lines = Array.from({ length: 100 }, (_, index) => `line-${index + 1}`);
    await writeFile(path.join(root, "large.txt"), `${lines.join("\n")}\n`);
    execFileSync("git", ["add", "large.txt"], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    lines[49] = "line-50 changed";
    await writeFile(path.join(root, "large.txt"), `${lines.join("\n")}\n`);
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "paths.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["large.txt"]\n');
    await createWorkPackage(root, {
      runId: "context-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    const result = await createReviewPackage(root, {
      runId: "context-run",
      goalId: "goal-001",
      baseRef: "HEAD",
      pathsFile,
    });
    const diff = await readFile(result.reviewPackagePath, "utf8");

    assert.match(diff, /line-50 changed/);
    assert.doesNotMatch(diff, /line-10\n/);
    assert.doesNotMatch(diff, /line-90\n/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createReviewPackage rejects nonexistent paths but allows tracked deletions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-paths-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    await writeFile(path.join(root, "deleted.txt"), "remove me\n");
    execFileSync("git", ["add", "deleted.txt"], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    await rm(path.join(root, "deleted.txt"));

    const brief = path.join(root, "goal.md");
    const typoPaths = path.join(root, "typo-paths.json");
    const deletionPaths = path.join(root, "deletion-paths.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(typoPaths, '["typo-does-not-exist.txt"]\n');
    await writeFile(deletionPaths, '["deleted.txt"]\n');
    await createWorkPackage(root, {
      runId: "paths-run",
      goalId: "goal-typo",
      briefPath: brief,
      pathsFile: typoPaths,
    });

    await assert.rejects(
      createReviewPackage(root, {
        runId: "paths-run",
        goalId: "goal-typo",
        baseRef: "HEAD",
        pathsFile: typoPaths,
      }),
      /does not exist.*tracked deletion/i,
    );

    await createWorkPackage(root, {
      runId: "paths-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile: deletionPaths,
    });

    const result = await createReviewPackage(root, {
      runId: "paths-run",
      goalId: "goal-001",
      baseRef: "HEAD",
      pathsFile: deletionPaths,
    });
    const diff = await readFile(result.reviewPackagePath, "utf8");
    assert.match(diff, /deleted file mode/);
    assert.match(diff, /deleted\.txt/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createReviewPackage rejects an empty scoped review", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-empty-scope-"));

  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    await writeFile(path.join(root, "unchanged.txt"), "unchanged\n");
    execFileSync("git", ["add", "unchanged.txt"], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });

    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "review-paths.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["unchanged.txt"]\n');
    await createWorkPackage(root, {
      runId: "empty-scope-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    await assert.rejects(
      createReviewPackage(root, {
        runId: "empty-scope-run",
        goalId: "goal-001",
        baseRef: "HEAD",
        pathsFile,
      }),
      /scoped review.*no changes/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
