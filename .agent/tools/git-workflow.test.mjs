import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONFIG,
  detectScopeTriggers,
  detectSensitiveFiles,
  planCommit,
  planFinish,
  planPush,
  planStart,
  planWorktree,
  renderPullRequestTemplate,
  validateBranchName,
} from "./git-workflow.mjs";

const cleanRepo = {
  isGitRepository: true,
  remotes: ["origin"],
  currentBranch: "feature/current",
  workingTreeClean: true,
  localBranches: ["main", "feature/current"],
  remoteBranches: ["origin/main"],
  changedFiles: [],
};

test("validates recommended branch names", () => {
  for (const branch of [
    "feature/login",
    "fix/session-timeout",
    "hotfix/payment-rollback",
    "refactor/auth-service",
    "docs/git-workflow",
    "chore/update-hooks",
  ]) {
    assert.deepEqual(validateBranchName(branch).errors, []);
  }
});

test("rejects unsafe branch names", () => {
  const invalid = [
    "",
    "feature/login page",
    "feat/login",
    "feature/../main",
    "feature//login",
    "feature/login@{1}",
    "-feature/login",
    "feature/login.",
    "feature/login;",
  ];

  for (const branch of invalid) {
    assert.notEqual(validateBranchName(branch).errors.length, 0, branch);
  }
});

test("detects non-git repository and missing origin", () => {
  assert.match(
    planStart({
      branch: "feature/login",
      repoState: { ...cleanRepo, isGitRepository: false },
    }).errors.join("\n"),
    /not a Git repository/i,
  );

  assert.match(
    planStart({
      branch: "feature/login",
      repoState: { ...cleanRepo, remotes: ["upstream"] },
    }).errors.join("\n"),
    /remote `origin`/i,
  );
});

test("detects dirty tree, missing base, and branch collisions", () => {
  assert.match(
    planStart({
      branch: "feature/login",
      repoState: { ...cleanRepo, workingTreeClean: false },
    }).errors.join("\n"),
    /working tree is not clean/i,
  );

  assert.match(
    planStart({
      branch: "feature/login",
      repoState: { ...cleanRepo, remoteBranches: [] },
    }).errors.join("\n"),
    /origin\/main/i,
  );

  assert.match(
    planStart({
      branch: "feature/current",
      repoState: cleanRepo,
    }).errors.join("\n"),
    /already exists locally/i,
  );

  assert.match(
    planStart({
      branch: "feature/login",
      repoState: { ...cleanRepo, remoteBranches: ["origin/main", "origin/feature/login"] },
    }).errors.join("\n"),
    /already exists on origin/i,
  );
});

test("generates preview commands for the standard branch workflow", () => {
  const plan = planStart({
    branch: "feature/login",
    repoState: cleanRepo,
  });

  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.commands, [
    "git checkout main",
    "git pull --ff-only origin main",
    "git checkout -b feature/login",
  ]);
});

test("generates preview commands for optional worktree workflow", () => {
  const plan = planWorktree({
    branch: "feature/login",
    path: "../project-feature",
    repoState: cleanRepo,
  });

  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.commands, [
    "git fetch origin",
    "git worktree add -b feature/login ../project-feature origin/main",
    "cd ../project-feature",
  ]);
});

test("protects main from direct commit and warns before add all", () => {
  const protectedPlan = planFinish({
    message: "Implement login workflow",
    repoState: { ...cleanRepo, currentBranch: "main", localBranches: ["main"] },
  });

  assert.match(protectedPlan.errors.join("\n"), /protected branch/i);

  const finishPlan = planFinish({
    message: "Implement login workflow",
    repoState: {
      ...cleanRepo,
      currentBranch: "feature/login",
      changedFiles: ["src/login.ts", ".env"],
    },
  });

  assert.deepEqual(finishPlan.commands, [
    "git status",
    "git diff",
    "git add .",
    "git commit -m \"Implement login workflow\"",
    "git push -u origin feature/login",
  ]);
  assert.match(finishPlan.warnings.join("\n"), /review sensitive files/i);
  assert.doesNotMatch(finishPlan.commands.join("\n"), /push --force(?!-with-lease)/);
});

test("generates separate commit and push previews", () => {
  const commitPlan = planCommit({
    message: "Implement login workflow",
    repoState: {
      ...cleanRepo,
      currentBranch: "feature/login",
      changedFiles: ["src/login.ts"],
    },
  });

  assert.deepEqual(commitPlan.errors, []);
  assert.deepEqual(commitPlan.commands, [
    "git status",
    "git diff",
    "git add .",
    "git commit -m \"Implement login workflow\"",
  ]);

  const pushPlan = planPush({
    repoState: {
      ...cleanRepo,
      currentBranch: "feature/login",
    },
  });

  assert.deepEqual(pushPlan.errors, []);
  assert.deepEqual(pushPlan.commands, ["git push -u origin feature/login"]);
});

test("stops when user mentions a different branch than the active branch", () => {
  const plan = planFinish({
    branch: "feature/login",
    message: "Implement login workflow",
    repoState: { ...cleanRepo, currentBranch: "feature/current" },
  });

  assert.match(plan.errors.join("\n"), /active branch is `feature\/current`/i);
});

test("generates PR template and detects sensitive files", () => {
  const template = renderPullRequestTemplate();

  assert.match(template, /## Ringkasan/);
  assert.match(template, /## Jenis Perubahan/);
  assert.match(template, /## Checklist/);
  assert.deepEqual(detectSensitiveFiles(["src/app.ts", "dist/app.js", ".env.local"]), [
    "dist/app.js",
    ".env.local",
  ]);
});

test("supports default base branch override", () => {
  const plan = planStart({
    branch: "feature/login",
    config: { defaultBaseBranch: "develop" },
    repoState: { ...cleanRepo, remoteBranches: ["origin/develop"] },
  });

  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.commands, [
    "git checkout develop",
    "git pull --ff-only origin develop",
    "git checkout -b feature/login",
  ]);
});

test("exports safe default configuration", () => {
  assert.equal(DEFAULT_CONFIG.defaultBaseBranch, "main");
  assert.equal(DEFAULT_CONFIG.remote, "origin");
  assert.equal(DEFAULT_CONFIG.previewFirst, true);
  assert.equal(DEFAULT_CONFIG.protectMainBranch, true);
});

test("flags sensitive paths for semantic inspection without automatic escalation", () => {
  assert.deepEqual(
    detectScopeTriggers(["src/app.ts", "migrations/001_add_column.sql", "src/auth/session.ts", "README.md"]),
    ["migrations/001_add_column.sql", "src/auth/session.ts"],
  );
  const preview = planCommit({
    message: "feat: add column",
    config: DEFAULT_CONFIG,
    repoState: {
      isGitRepo: true,
      currentBranch: "feature/x",
      hasOrigin: true,
      changedFiles: ["migrations/001_add_column.sql"],
    },
  });
  assert.ok(preview.warnings.some((line) => /Contract-sensitive paths touched/.test(line)));
});

test("local-only setup uses known base without remote or network commands", () => {
  const state = {...cleanRepo, remotes: [], remoteBranches: [], currentBranch: "main"};
  const start = planStart({branch: "fix/offline", local: true, repoState: state});
  assert.deepEqual(start.errors, []);
  assert.deepEqual(start.commands, ["git checkout -b fix/offline main"]);
  const worktree = planWorktree({branch: "fix/offline", path: "../offline", local: true, repoState: {...state, workingTreeClean: false}});
  assert.deepEqual(worktree.errors, []);
  assert.deepEqual(worktree.commands, ["git worktree add -b fix/offline ../offline main", "cd ../offline"]);
  assert.doesNotMatch(worktree.commands.join("\n"), /fetch|pull|stash|reset|commit/);
});
test("local setup refuses unknown base and checkout across dirty user work", () => {
  const state = {...cleanRepo, remotes: [], remoteBranches: []};
  assert.ok(planStart({branch: "fix/offline", local: true, base: "unknown", repoState: state}).errors.length);
  assert.ok(planStart({branch: "fix/offline", local: true, repoState: {...state, workingTreeClean: false}}).errors.length);
  assert.deepEqual(planStart({branch: "fix/offline", local: true, repoState: {...state, currentBranch: "main", workingTreeClean: false}}).errors, []);
});
