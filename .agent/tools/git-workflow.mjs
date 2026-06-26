#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  defaultBaseBranch: "main",
  remote: "origin",
  requireCleanWorkingTree: true,
  useFastForwardOnly: true,
  allowWorktree: true,
  branchPrefixes: ["feature", "fix", "hotfix", "refactor", "docs", "chore"],
  protectMainBranch: true,
  warnBeforeGitAddAll: true,
  previewFirst: true,
});

export const PR_TEMPLATE = `## Ringkasan
Jelaskan perubahan yang dibuat.

## Jenis Perubahan
- [ ] Feature
- [ ] Bugfix
- [ ] Hotfix
- [ ] Refactor
- [ ] Documentation
- [ ] Chore

## Perubahan Utama
-
-
-

## Cara Test
1.
2.
3.

## Checklist
- [ ] Branch dibuat dari base branch terbaru
- [ ] Tidak ada secret/API key yang ter-commit
- [ ] Test lokal sudah dijalankan
- [ ] Commit message jelas
- [ ] Scope perubahan sesuai
- [ ] Dokumentasi diperbarui jika diperlukan
`;

const SENSITIVE_PATH_PATTERNS = [
  /(^|[/\\])\.env($|[.\-/\\])/i,
  /(^|[/\\])\.cache([/\\]|$)/i,
  /(^|[/\\])dist([/\\]|$)/i,
  /(^|[/\\])build([/\\]|$)/i,
  /(^|[/\\])coverage([/\\]|$)/i,
  /(^|[/\\])logs?([/\\]|$)/i,
  /(^|[/\\])id_rsa($|\.)/i,
  /(^|[/\\])credentials?([.\-/\\]|$)/i,
  /(^|[/\\])secrets?([.\-/\\]|$)/i,
  /\.(key|pem|p12|pfx|log)$/i,
];

const SHELL_RISKY = /[~^:?*[\]\\;<>&|`$"'(){}!#\s]/;

export function normalizeConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    branchPrefixes:
      config.branchPrefixes ??
      config.allowedBranchPrefixes ??
      DEFAULT_CONFIG.branchPrefixes,
  };
}

export function validateBranchName(branch, config = {}) {
  const normalizedConfig = normalizeConfig(config);
  const value = String(branch ?? "");
  const errors = [];

  if (!value) {
    errors.push("Branch name must not be empty.");
    return { valid: false, errors };
  }

  if (!value.includes("/")) {
    errors.push(
      `Branch name must use one of these prefixes: ${normalizedConfig.branchPrefixes
        .map((prefix) => `${prefix}/`)
        .join(", ")}`,
    );
  }

  const [prefix, slug] = value.split("/", 2);
  if (!normalizedConfig.branchPrefixes.includes(prefix)) {
    errors.push(`Branch prefix \`${prefix}\` is not allowed.`);
  }

  if (!slug) {
    errors.push("Branch name must include a slug after the prefix.");
  }

  if (SHELL_RISKY.test(value)) {
    errors.push(
      "Branch name must use safe characters only: letters, numbers, dot, underscore, slash, and dash.",
    );
  }

  if (value.includes("..")) {
    errors.push("Branch name must not contain `..`.");
  }

  if (value.includes("//")) {
    errors.push("Branch name must not contain `//`.");
  }

  if (value.includes("@{")) {
    errors.push("Branch name must not contain `@{`.");
  }

  if (value.startsWith("-")) {
    errors.push("Branch name must not start with `-`.");
  }

  if (value.endsWith(".") || value.endsWith("/")) {
    errors.push("Branch name must not end with `.` or `/`.");
  }

  if (value.includes(".lock")) {
    errors.push("Branch name must not contain `.lock`.");
  }

  return { valid: errors.length === 0, errors };
}

export function detectSensitiveFiles(files = []) {
  return files.filter((file) =>
    SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(file)),
  );
}

export function planStart({ branch, base, config = {}, repoState = {} } = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const remote = normalizedConfig.remote;
  const errors = [
    ...validateCommonRepoState(repoState, normalizedConfig),
    ...validateBranchName(branch, normalizedConfig).errors,
  ];

  if (normalizedConfig.requireCleanWorkingTree && repoState.workingTreeClean === false) {
    errors.push("Working tree is not clean. Commit or stash local changes before changing branches.");
  }

  if (!hasRemoteBranch(repoState, remote, targetBase)) {
    errors.push(`Target base branch \`${remote}/${targetBase}\` was not found.`);
  }

  errors.push(...validateBranchDoesNotExist(repoState, remote, branch));

  return {
    mode: "start",
    errors,
    warnings: [],
    commands:
      errors.length === 0
        ? [
            `git checkout ${targetBase}`,
            `git pull ${normalizedConfig.useFastForwardOnly ? "--ff-only " : ""}${remote} ${targetBase}`,
            `git checkout -b ${branch}`,
          ]
        : [],
  };
}

export function planWorktree({
  branch,
  path,
  base,
  config = {},
  repoState = {},
} = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const remote = normalizedConfig.remote;
  const errors = [
    ...validateCommonRepoState(repoState, normalizedConfig),
    ...validateBranchName(branch, normalizedConfig).errors,
  ];

  if (!normalizedConfig.allowWorktree) {
    errors.push("Git worktree workflow is disabled by configuration.");
  }

  if (!path || /[\r\n;]/.test(path)) {
    errors.push("Worktree path must be provided and must not contain newlines or semicolons.");
  }

  if (!hasRemoteBranch(repoState, remote, targetBase)) {
    errors.push(`Target base branch \`${remote}/${targetBase}\` was not found.`);
  }

  errors.push(...validateBranchDoesNotExist(repoState, remote, branch));

  return {
    mode: "worktree",
    errors,
    warnings: [
      "Git worktree is optional. Use it only for parallel branch work or multi-branch review.",
    ],
    commands:
      errors.length === 0
        ? [
            `git fetch ${remote}`,
            `git worktree add -b ${branch} ${path} ${remote}/${targetBase}`,
            `cd ${path}`,
          ]
        : [],
  };
}

export function planFinish({
  branch,
  base,
  message,
  config = {},
  repoState = {},
} = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const remote = normalizedConfig.remote;
  const activeBranch = repoState.currentBranch;
  const targetBranch = branch ?? activeBranch;
  const errors = validateCommonRepoState(repoState, normalizedConfig);
  const warnings = [];

  if (!targetBranch) {
    errors.push("No active branch found. Specify a branch or checkout the intended branch first.");
  } else {
    errors.push(...validateBranchName(targetBranch, normalizedConfig).errors);
  }

  if (branch && activeBranch && branch !== activeBranch) {
    errors.push(
      `Requested branch is \`${branch}\`, but the active branch is \`${activeBranch}\`. Checkout that branch or use a worktree first.`,
    );
  }

  if (isProtectedBranch(activeBranch, normalizedConfig, targetBase)) {
    errors.push(`Direct commit/push from protected branch \`${activeBranch}\` is not allowed.`);
  }

  if (!message) {
    errors.push("Commit message is required before previewing commit commands.");
  }

  const sensitiveFiles = detectSensitiveFiles(repoState.changedFiles ?? []);
  if (normalizedConfig.warnBeforeGitAddAll) {
    warnings.push(
      "Review sensitive files before running `git add .`: .env, secret keys, credentials, logs, cache, and build output must not be committed.",
    );
  }

  if (sensitiveFiles.length > 0) {
    warnings.push(`Sensitive-looking paths detected: ${sensitiveFiles.join(", ")}`);
  }

  return {
    mode: "finish",
    errors,
    warnings,
    commands:
      errors.length === 0
        ? [
            "git status",
            "git diff",
            "git add .",
            `git commit -m ${quoteForShell(message)}`,
            `git push -u ${remote} ${targetBranch}`,
          ]
        : [],
  };
}

export function planCommit({
  branch,
  base,
  message,
  config = {},
  repoState = {},
} = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const activeBranch = repoState.currentBranch;
  const targetBranch = branch ?? activeBranch;
  const errors = validateCommonRepoState(repoState, normalizedConfig);
  const warnings = [];

  if (!targetBranch) {
    errors.push("No active branch found. Specify a branch or checkout the intended branch first.");
  } else {
    errors.push(...validateBranchName(targetBranch, normalizedConfig).errors);
  }

  if (branch && activeBranch && branch !== activeBranch) {
    errors.push(
      `Requested branch is \`${branch}\`, but the active branch is \`${activeBranch}\`. Checkout that branch or use a worktree first.`,
    );
  }

  if (isProtectedBranch(activeBranch, normalizedConfig, targetBase)) {
    errors.push(`Direct commit/push from protected branch \`${activeBranch}\` is not allowed.`);
  }

  if (!message) {
    errors.push("Commit message is required before previewing commit commands.");
  }

  const sensitiveFiles = detectSensitiveFiles(repoState.changedFiles ?? []);
  if (normalizedConfig.warnBeforeGitAddAll) {
    warnings.push(
      "Review sensitive files before running `git add .`: .env, secret keys, credentials, logs, cache, and build output must not be committed.",
    );
  }

  if (sensitiveFiles.length > 0) {
    warnings.push(`Sensitive-looking paths detected: ${sensitiveFiles.join(", ")}`);
  }

  return {
    mode: "commit",
    errors,
    warnings,
    commands:
      errors.length === 0
        ? [
            "git status",
            "git diff",
            "git add .",
            `git commit -m ${quoteForShell(message)}`,
          ]
        : [],
  };
}

export function planPush({ branch, base, config = {}, repoState = {} } = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const remote = normalizedConfig.remote;
  const activeBranch = repoState.currentBranch;
  const targetBranch = branch ?? activeBranch;
  const errors = validateCommonRepoState(repoState, normalizedConfig);

  if (!targetBranch) {
    errors.push("No active branch found. Specify a branch or checkout the intended branch first.");
  } else {
    errors.push(...validateBranchName(targetBranch, normalizedConfig).errors);
  }

  if (branch && activeBranch && branch !== activeBranch) {
    errors.push(
      `Requested branch is \`${branch}\`, but the active branch is \`${activeBranch}\`. Checkout that branch or use a worktree first.`,
    );
  }

  if (isProtectedBranch(activeBranch, normalizedConfig, targetBase)) {
    errors.push(`Direct commit/push from protected branch \`${activeBranch}\` is not allowed.`);
  }

  return {
    mode: "push",
    errors,
    warnings: ["Push only after local verification passes."],
    commands: errors.length === 0 ? [`git push -u ${remote} ${targetBranch}`] : [],
  };
}

export function planPullRequest({
  branch,
  base,
  config = {},
  repoState = {},
  create = false,
  tool = "gh",
} = {}) {
  const normalizedConfig = normalizeConfig(config);
  const targetBase = base ?? normalizedConfig.defaultBaseBranch;
  const activeBranch = repoState.currentBranch;
  const targetBranch = branch ?? activeBranch;
  const errors = validateCommonRepoState(repoState, normalizedConfig);

  if (!targetBranch) {
    errors.push("No source branch found for Pull Request.");
  } else {
    errors.push(...validateBranchName(targetBranch, normalizedConfig).errors);
  }

  if (isProtectedBranch(targetBranch, normalizedConfig, targetBase)) {
    errors.push("Pull Request source branch must not be the protected base branch.");
  }

  if (branch && activeBranch && branch !== activeBranch) {
    errors.push(
      `Requested branch is \`${branch}\`, but the active branch is \`${activeBranch}\`. Checkout that branch or use a worktree first.`,
    );
  }

  const prCommand =
    tool === "glab"
      ? `glab mr create --source-branch ${targetBranch} --target-branch ${targetBase} --fill`
      : `gh pr create --base ${targetBase} --head ${targetBranch} --fill`;

  return {
    mode: "pr",
    errors,
    warnings: [
      "Create the PR only after local verification passes and the branch has been pushed.",
    ],
    commands: errors.length === 0 && create ? [prCommand] : [],
    template: renderPullRequestTemplate(),
  };
}

export function renderPullRequestTemplate() {
  return PR_TEMPLATE;
}

export function collectGitState(cwd = process.cwd()) {
  const isGitRepository = gitOk(["rev-parse", "--is-inside-work-tree"], cwd);

  if (!isGitRepository) {
    return {
      isGitRepository: false,
      remotes: [],
      currentBranch: "",
      workingTreeClean: false,
      localBranches: [],
      remoteBranches: [],
      changedFiles: [],
    };
  }

  const statusLines = gitOutput(["status", "--porcelain"], cwd)
    .split("\n")
    .filter(Boolean);

  return {
    isGitRepository: true,
    remotes: lines(gitOutput(["remote"], cwd)),
    currentBranch: gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], cwd).trim(),
    workingTreeClean: statusLines.length === 0,
    localBranches: lines(gitOutput(["branch", "--format=%(refname:short)"], cwd)),
    remoteBranches: lines(gitOutput(["branch", "-r", "--format=%(refname:short)"], cwd)),
    changedFiles: statusLines.map(parseStatusPath),
  };
}

function validateCommonRepoState(repoState, config) {
  const errors = [];

  if (repoState.isGitRepository !== true) {
    errors.push("Current directory is not a Git repository.");
  }

  if (!asSet(repoState.remotes).has(config.remote)) {
    errors.push(`Required remote \`${config.remote}\` is not configured.`);
  }

  return errors;
}

function validateBranchDoesNotExist(repoState, remote, branch) {
  const errors = [];

  if (!branch) {
    return errors;
  }

  if (asSet(repoState.localBranches).has(branch)) {
    errors.push(`Branch \`${branch}\` already exists locally.`);
  }

  if (hasRemoteBranch(repoState, remote, branch)) {
    errors.push(`Branch \`${branch}\` already exists on ${remote}.`);
  }

  return errors;
}

function hasRemoteBranch(repoState, remote, branch) {
  return asSet(repoState.remoteBranches).has(`${remote}/${branch}`);
}

function isProtectedBranch(branch, config, base) {
  return Boolean(config.protectMainBranch && branch && branch === base);
}

function asSet(values) {
  return new Set(values ?? []);
}

function quoteForShell(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function gitOk(args, cwd) {
  try {
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function gitOutput(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
}

function lines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseStatusPath(line) {
  const value = line.slice(3).trim();
  const renameIndex = value.indexOf(" -> ");
  return renameIndex === -1 ? value : value.slice(renameIndex + 4);
}

function parseArgs(argv) {
  const options = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--branch") {
      options.branch = next;
      index += 1;
    } else if (arg === "--base") {
      options.base = next;
      index += 1;
    } else if (arg === "--path") {
      options.path = next;
      index += 1;
    } else if (arg === "--message" || arg === "-m") {
      options.message = next;
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--create") {
      options.create = true;
    } else if (arg === "--tool") {
      options.tool = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      options._.push(arg);
    }
  }

  return options;
}

function usage() {
  return `Usage:
  node .agent/tools/git-workflow.mjs status [--json]
  node .agent/tools/git-workflow.mjs start <branch> [--base main] [--json]
  node .agent/tools/git-workflow.mjs worktree <branch> --path ../worktree [--base main] [--json]
  node .agent/tools/git-workflow.mjs commit --message "Commit message" [--branch feature/name] [--json]
  node .agent/tools/git-workflow.mjs push [--branch feature/name] [--json]
  node .agent/tools/git-workflow.mjs finish --message "Commit message" [--branch feature/name] [--json]
  node .agent/tools/git-workflow.mjs pr [--branch feature/name] [--base main] [--create] [--tool gh|glab] [--json]
  node .agent/tools/git-workflow.mjs pr-template

All commands preview Git operations. They do not run checkout, add, commit, push, or PR creation for you.
`;
}

function formatPlan(plan) {
  const lines = [];
  lines.push(`Git workflow preview: ${plan.mode}`);

  if (plan.errors?.length) {
    lines.push("\nErrors:");
    lines.push(...plan.errors.map((error) => `- ${error}`));
  }

  if (plan.warnings?.length) {
    lines.push("\nWarnings:");
    lines.push(...plan.warnings.map((warning) => `- ${warning}`));
  }

  if (plan.commands?.length) {
    lines.push("\nCommands:");
    lines.push(...plan.commands.map((command) => `  ${command}`));
  }

  if (plan.template && !plan.commands?.length) {
    lines.push("\nPull Request template:");
    lines.push(plan.template.trimEnd());
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [command, positionalBranch] = options._;

  if (options.help || !command) {
    console.log(usage());
    return;
  }

  if (command === "pr-template") {
    console.log(renderPullRequestTemplate());
    return;
  }

  const repoState = collectGitState();
  let plan;

  if (command === "status") {
    plan = { mode: "status", errors: [], warnings: [], repoState };
  } else if (command === "start") {
    plan = planStart({
      branch: options.branch ?? positionalBranch,
      base: options.base,
      repoState,
    });
  } else if (command === "worktree") {
    plan = planWorktree({
      branch: options.branch ?? positionalBranch,
      base: options.base,
      path: options.path,
      repoState,
    });
  } else if (command === "finish") {
    plan = planFinish({
      branch: options.branch,
      base: options.base,
      message: options.message,
      repoState,
    });
  } else if (command === "commit") {
    plan = planCommit({
      branch: options.branch,
      base: options.base,
      message: options.message,
      repoState,
    });
  } else if (command === "push") {
    plan = planPush({
      branch: options.branch,
      base: options.base,
      repoState,
    });
  } else if (command === "pr") {
    plan = planPullRequest({
      branch: options.branch,
      base: options.base,
      create: options.create,
      tool: options.tool,
      repoState,
    });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else if (command === "status") {
    console.log(JSON.stringify(repoState, null, 2));
  } else {
    console.log(formatPlan(plan));
  }

  if (plan.errors?.length) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
