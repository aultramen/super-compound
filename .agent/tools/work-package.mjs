#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_./-]{0,199}$/;
const STATUSES = new Set([
  "ready",
  "in-progress",
  "implemented",
  "verified",
  "blocked",
  "failed",
]);
const MAX_BRIEF_BYTES = 256 * 1024;
const MAX_DIFF_BYTES = 5 * 1024 * 1024;
const MAX_PATHS_FILE_BYTES = 64 * 1024;
const MAX_REVIEW_PATHS = 500;
const MAX_DIRTY_PATHS = 5000;
const MAX_VERIFICATION_CHARS = 2000;
const LOCK_WAIT_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 10;
const LOCK_STALE_MS = 60_000;
const TRANSIENT_LOCK_ACQUIRE_CODES = new Set(["EPERM", "EBUSY"]);
const SENSITIVE_CONTENT_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"']{8,}/i,
];

export async function createWorkPackage(root, options) {
  const safeRoot = path.resolve(root);
  const runId = validateId("runId", options.runId);
  const goalId = validateId("goalId", options.goalId);
  const briefSource = resolveInside(safeRoot, options.briefPath, "briefPath");
  await assertSafeRegularFile(safeRoot, briefSource, MAX_BRIEF_BYTES);
  if (!options.pathsFile) {
    throw new Error("Scheduler-owned pathsFile is required when creating a work package");
  }
  const scopePaths = await readReviewPaths(safeRoot, options.pathsFile);
  const scopeDigest = digestPaths(scopePaths);
  const baselineDirty = await captureDirtySnapshot(safeRoot);

  const packageDir = resolveInside(
    safeRoot,
    path.join(".scratch", "work-packages", runId, goalId),
    "packageDir",
  );
  await assertNoSymlinkComponents(safeRoot, packageDir);
  await mkdir(packageDir, { recursive: true });

  const briefPath = path.join(packageDir, "brief.md");
  const reportPath = path.join(packageDir, "report.md");
  const pathsPath = path.join(packageDir, "review-paths.json");
  const reviewPackagePath = path.join(packageDir, "review.patch");
  const ledgerPath = resolveInside(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    "ledgerPath",
  );
  const brief = await readFile(briefSource, "utf8");
  await writeStableFile(briefPath, brief, "brief");
  await writeIfMissing(reportPath, reportSkeleton(goalId));
  await writeStableFile(
    pathsPath,
    `${JSON.stringify(scopePaths, null, 2)}\n`,
    "review path scope",
  );

  await withLedgerLock(ledgerPath, async () => {
    const ledger = await readLedger(ledgerPath, runId);
    const existing = ledger.goals[goalId];
    ledger.goals[goalId] = {
      status: existing?.status ?? "ready",
      briefPath,
      reportPath,
      pathsPath,
      reviewPackagePath,
      scopeDigest: existing?.scopeDigest ?? scopeDigest,
      baselineDirty: existing?.baselineDirty ?? baselineDirty,
      verification: existing?.verification ?? "pending",
    };
    await writeJsonAtomic(ledgerPath, ledger);
  });

  return {
    packageDir,
    briefPath,
    reportPath,
    pathsPath,
    reviewPackagePath,
    ledgerPath,
  };
}

export async function createReviewPackage(root, options) {
  const safeRoot = path.resolve(root);
  const runId = validateId("runId", options.runId);
  const goalId = validateId("goalId", options.goalId);
  const baseRef = validateRef(options.baseRef ?? "HEAD");
  const packageDir = resolveInside(
    safeRoot,
    path.join(".scratch", "work-packages", runId, goalId),
    "packageDir",
  );
  const info = await stat(packageDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Work package does not exist: ${packageDir}`);
  }
  await assertNoSymlinkComponents(safeRoot, packageDir);
  const pathsPath = path.join(packageDir, "review-paths.json");
  const paths = await readReviewPaths(safeRoot, pathsPath);
  const ledgerPath = resolveInside(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    "ledgerPath",
  );
  const ledger = await readLedger(ledgerPath, runId);
  const goal = ledger.goals[goalId];
  if (!goal?.scopeDigest || goal.scopeDigest !== digestPaths(paths)) {
    throw new Error("Scheduler-owned review scope is missing or was modified");
  }
  if (options.pathsFile) {
    const requestedPaths = await readReviewPaths(safeRoot, options.pathsFile);
    if (digestPaths(requestedPaths) !== goal.scopeDigest) {
      throw new Error("Review paths do not match the scheduler-owned scope");
    }
  }
  await validateNoNewOutOfScopeChanges(
    safeRoot,
    paths,
    goal.baselineDirty ?? {},
  );

  await execFileAsync(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${baseRef}^{commit}`],
    { cwd: safeRoot, windowsHide: true },
  );
  await validateReviewPaths(safeRoot, baseRef, paths);
  const { stdout } = await execFileAsync(
    "git",
    [
      "--literal-pathspecs",
      "diff",
      "--no-ext-diff",
      "--no-textconv",
      "--unified=12",
      baseRef,
      "--",
      ...paths,
    ],
    {
      cwd: safeRoot,
      encoding: "utf8",
      maxBuffer: MAX_DIFF_BYTES,
      windowsHide: true,
    },
  );
  const tracked = withholdSensitiveTrackedPatches(stdout);
  const untracked = await collectUntrackedPatches(safeRoot, paths);
  const reviewContent = `${tracked}${untracked}`;
  const bytes = Buffer.byteLength(reviewContent, "utf8");
  if (bytes > MAX_DIFF_BYTES) {
    throw new Error(`Review package exceeds ${MAX_DIFF_BYTES} bytes`);
  }
  if (bytes === 0) {
    throw new Error("Scoped review contains no changes for the requested paths");
  }

  const reviewPackagePath = path.join(packageDir, "review.patch");
  await writeFile(reviewPackagePath, reviewContent, "utf8");
  return { reviewPackagePath, baseRef, bytes, paths };
}

function digestPaths(paths) {
  return createHash("sha256").update(JSON.stringify(paths)).digest("hex");
}

async function captureDirtySnapshot(root) {
  const inside = await execFileAsync(
    "git",
    ["rev-parse", "--is-inside-work-tree"],
    { cwd: root, encoding: "utf8", windowsHide: true },
  ).catch(() => null);
  if (!inside || inside.stdout.trim() !== "true") return {};

  const commands = [
    ["diff", "--name-only", "--no-renames", "-z"],
    ["diff", "--cached", "--name-only", "--no-renames", "-z"],
    ["ls-files", "--others", "--exclude-standard", "-z"],
  ];
  const names = new Set();
  for (const args of commands) {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: MAX_DIFF_BYTES,
      windowsHide: true,
    });
    for (const raw of stdout.split("\0").filter(Boolean)) {
      const relative = normalizeRelativePath(raw);
      if (
        relative === ".scratch/work-packages" ||
        relative.startsWith(".scratch/work-packages/")
      ) {
        continue;
      }
      names.add(relative);
    }
  }
  if (names.size > MAX_DIRTY_PATHS) {
    throw new Error(`Working tree exceeds ${MAX_DIRTY_PATHS} dirty paths`);
  }

  const snapshot = {};
  for (const relative of [...names].sort((left, right) => left.localeCompare(right))) {
    snapshot[relative] = await digestWorkingPath(root, relative);
  }
  return snapshot;
}

async function digestWorkingPath(root, relative) {
  const absolute = resolveInside(root, relative, "dirty path");
  const info = await lstat(absolute).catch(() => null);
  if (!info) return "deleted";
  if (info.isSymbolicLink()) {
    throw new Error(`Refusing symlinked dirty path: ${absolute}`);
  }
  if (!info.isFile()) return `non-file:${info.size}:${info.mtimeMs}`;

  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(absolute);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function validateNoNewOutOfScopeChanges(root, paths, baselineDirty) {
  const currentDirty = await captureDirtySnapshot(root);
  const candidates = new Set([
    ...Object.keys(baselineDirty),
    ...Object.keys(currentDirty),
  ]);
  const outside = [...candidates]
    .filter((file) => !paths.some((scope) => isInScope(file, scope)))
    .filter((file) => baselineDirty[file] !== currentDirty[file])
    .sort((left, right) => left.localeCompare(right));
  if (outside.length > 0) {
    throw new Error(
      `Implementation changed files outside scheduler-owned review scope: ${outside.join(", ")}`,
    );
  }
}

function withholdSensitiveTrackedPatches(patch) {
  if (!patch) return patch;
  return patch
    .split(/(?=^diff --git )/m)
    .map((section) => {
      if (!section.startsWith("diff --git ")) return section;
      const sensitivePath = trackedPatchHasSensitivePath(section);
      if (!sensitivePath && !containsSensitiveContent(section)) return section;

      const bytes = Buffer.byteLength(section, "utf8");
      const digest = createHash("sha256").update(section).digest("hex");
      if (sensitivePath) {
        const metadata = section.split(/^@@/m, 1)[0];
        const pathDigest = createHash("sha256")
          .update(metadata)
          .digest("hex");
        return (
          "diff --git a/[withheld] b/[withheld]\n" +
          `# content withheld (tracked sensitive path), bytes=${bytes}, sha256=${digest}, path_sha256=${pathDigest}\n`
        );
      }

      const header = section.split("\n", 1)[0];
      return (
        `${header}\n` +
        `# content withheld (tracked sensitive content), bytes=${bytes}, sha256=${digest}\n`
      );
    })
    .join("");
}

function trackedPatchHasSensitivePath(section) {
  const metadata = section.split(/^@@/m, 1)[0];
  return metadata
    .split(/\s+/)
    .map((candidate) =>
      candidate.replace(/^"?[ab]\//, "").replace(/["\r\n]$/g, ""),
    )
    .some((candidate) => candidate && isSensitivePath(candidate));
}

async function collectUntrackedPatches(root, paths) {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: root, encoding: "utf8", maxBuffer: MAX_DIFF_BYTES, windowsHide: true },
  );
  const files = stdout
    .split("\0")
    .filter((entry) => entry.startsWith("?? "))
    .map((entry) => entry.slice(3).replace(/\\/g, "/"))
    .filter((file) => !file.startsWith(".scratch/work-packages/"))
    .filter((file) => paths === null || paths.some((scope) => isInScope(file, scope)));
  let output = "";

  for (const file of files) {
    if (/[\r\n]/.test(file)) {
      throw new Error("Untracked file name contains a line break");
    }
    const absolute = resolveInside(root, file, "untracked file");
    await assertNoSymlinkComponents(root, absolute);
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile()) continue;
    if (info.size > MAX_DIFF_BYTES) {
      throw new Error(`Untracked file exceeds ${MAX_DIFF_BYTES} bytes: ${file}`);
    }
    const content = await readFile(absolute);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(content);
    } catch {
      text = null;
    }
    if (
      text === null ||
      content.includes(0) ||
      isSensitivePath(file) ||
      containsSensitiveContent(text)
    ) {
      const digest = createHash("sha256").update(content).digest("hex");
      output += `\ndiff --git a/${file} b/${file}\n`;
      output += `# content withheld (binary or sensitive), bytes=${content.length}, sha256=${digest}\n`;
      continue;
    }
    const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
    output += `\ndiff --git a/${file} b/${file}\nnew file mode 100644\n`;
    output += `--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n`;
    output += `${lines.map((line) => `+${line}`).join("\n")}\n`;
  }

  return output;
}

function isSensitivePath(file) {
  const name = path.basename(file).toLowerCase();
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    /(?:secret|credential|private[-_]?key)/i.test(file) ||
    /\.(?:pem|key|p12|pfx)$/i.test(name)
  );
}

function containsSensitiveContent(text) {
  return SENSITIVE_CONTENT_PATTERNS.some((pattern) => pattern.test(text));
}

export async function recordWorkPackageResult(root, options) {
  const safeRoot = path.resolve(root);
  const runId = validateId("runId", options.runId);
  const goalId = validateId("goalId", options.goalId);
  if (!STATUSES.has(options.status)) {
    throw new Error(`Unsupported status: ${options.status}`);
  }
  const verification = String(options.verification ?? "").trim();
  if (verification.length > MAX_VERIFICATION_CHARS) {
    throw new Error(
      `verification exceeds ${MAX_VERIFICATION_CHARS} characters`,
    );
  }

  const ledgerPath = resolveInside(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    "ledgerPath",
  );
  await withLedgerLock(ledgerPath, async () => {
    const ledger = await readLedger(ledgerPath, runId);
    if (!ledger.goals[goalId]) {
      throw new Error(`Unknown goalId in ledger: ${goalId}`);
    }
    ledger.goals[goalId].status = options.status;
    ledger.goals[goalId].verification = verification || "not reported";
    await writeJsonAtomic(ledgerPath, ledger);
  });
  return { ledgerPath, goalId, status: options.status };
}

function validateId(label, value) {
  if (!ID_PATTERN.test(String(value ?? ""))) {
    throw new Error(`${label} must match ${ID_PATTERN}`);
  }
  return String(value);
}

function validateRef(value) {
  const ref = String(value ?? "");
  if (!REF_PATTERN.test(ref) || ref.includes("..") || ref.includes("@{")) {
    throw new Error("baseRef contains unsupported characters");
  }
  return ref;
}

async function readReviewPaths(root, pathsFile) {
  if (!pathsFile) return null;
  const source = resolveInside(root, pathsFile, "pathsFile");
  await assertSafeRegularFile(root, source, MAX_PATHS_FILE_BYTES);

  let values;
  try {
    values = JSON.parse(await readFile(source, "utf8"));
  } catch (error) {
    throw new Error(`pathsFile must be valid JSON: ${error.message}`);
  }
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.length > MAX_REVIEW_PATHS
  ) {
    throw new Error(
      `pathsFile must contain 1-${MAX_REVIEW_PATHS} repository-relative paths`,
    );
  }

  const paths = new Set();
  for (const value of values) {
    if (
      typeof value !== "string" ||
      !value ||
      path.isAbsolute(value) ||
      /[\0\r\n]/.test(value)
    ) {
      throw new Error("pathsFile entries must be safe repository-relative paths");
    }
    const absolute = resolveInside(root, value, "review path");
    const relative = normalizeRelativePath(path.relative(root, absolute));
    if (
      !relative ||
      relative === "." ||
      relative === ".scratch/work-packages" ||
      relative.startsWith(".scratch/work-packages/")
    ) {
      throw new Error(`Unsupported review path: ${value}`);
    }
    paths.add(relative);
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

async function validateReviewPaths(root, baseRef, paths) {
  const missing = [];
  for (const relative of paths) {
    const absolute = resolveInside(root, relative, "review path");
    const info = await lstat(absolute).catch(() => null);
    if (info) {
      await assertNoSymlinkComponents(root, absolute);
    } else {
      missing.push(relative);
    }
  }
  if (missing.length === 0) return;

  const { stdout } = await execFileAsync(
    "git",
    [
      "--literal-pathspecs",
      "diff",
      "--name-only",
      "--no-renames",
      "--diff-filter=D",
      "-z",
      baseRef,
      "--",
      ...missing,
    ],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: MAX_PATHS_FILE_BYTES,
      windowsHide: true,
    },
  );
  const deleted = new Set(
    stdout
      .split("\0")
      .filter(Boolean)
      .map((value) => normalizeRelativePath(value)),
  );
  const invalid = missing.filter((relative) => !deleted.has(relative));
  if (invalid.length > 0) {
    throw new Error(
      `Review path does not exist and is not a tracked deletion: ${invalid[0]}`,
    );
  }
}

function isInScope(file, scope) {
  return file === scope || file.startsWith(`${scope}/`);
}

function normalizeRelativePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function resolveInside(root, value, label) {
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} resolves outside repository root`);
  }
  return absolute;
}

async function assertSafeRegularFile(root, file, maxBytes) {
  await assertNoSymlinkComponents(root, file);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new Error(`File does not exist: ${file}`);
  if (info.size > maxBytes) throw new Error(`File exceeds ${maxBytes} bytes`);
}

async function assertNoSymlinkComponents(root, target) {
  const relative = path.relative(root, target);
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = await lstat(current).catch(() => null);
    if (info?.isSymbolicLink()) {
      throw new Error(`Refusing symlinked path: ${current}`);
    }
  }
}

async function writeStableFile(target, content, label) {
  const existing = await readFile(target, "utf8").catch(() => null);
  if (existing !== null && existing !== content) {
    throw new Error(`${label} already exists with different content: ${target}`);
  }
  if (existing === null) await writeFile(target, content, "utf8");
}

async function writeIfMissing(target, content) {
  const existing = await stat(target).catch(() => null);
  if (!existing) await writeFile(target, content, "utf8");
}

async function readLedger(ledgerPath, runId) {
  const content = await readFile(ledgerPath, "utf8").catch(() => null);
  if (!content) return { schema: "work_package_ledger_v1", runId, goals: {} };
  const ledger = JSON.parse(content);
  if (
    ledger.schema !== "work_package_ledger_v1" ||
    ledger.runId !== runId ||
    typeof ledger.goals !== "object" ||
    ledger.goals === null
  ) {
    throw new Error(`Invalid work-package ledger: ${ledgerPath}`);
  }
  return ledger;
}

async function writeJsonAtomic(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temp, target);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
}

export async function withLedgerLock(
  ledgerPath,
  operation,
  dependencies = {},
) {
  const lockPath = `${ledgerPath}.lock`;
  const mkdirLock = dependencies.mkdirLock ?? mkdir;
  const wait = dependencies.wait ?? delay;
  const now = dependencies.now ?? Date.now;
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  const deadline = now() + LOCK_WAIT_TIMEOUT_MS;
  const owner = randomUUID();

  while (true) {
    let created = false;
    try {
      await mkdirLock(lockPath);
      created = true;
      await writeFile(path.join(lockPath, "owner"), owner, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      break;
    } catch (error) {
      if (created) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
      }
      const code = error?.code;
      if (code === "EEXIST") {
        if (await reclaimStaleLedgerLock(lockPath)) continue;
      } else if (!TRANSIENT_LOCK_ACQUIRE_CODES.has(code)) {
        throw error;
      }
      if (now() >= deadline) {
        if (code !== "EEXIST") throw error;
        throw new Error(`Timed out waiting for work-package ledger lock: ${lockPath}`);
      }
      await wait(LOCK_RETRY_MS);
    }
  }

  try {
    return await operation();
  } finally {
    await releaseOwnedLedgerLock(lockPath, owner);
  }
}

async function releaseOwnedLedgerLock(lockPath, owner) {
  const currentOwner = await readFile(path.join(lockPath, "owner"), "utf8").catch(
    () => null,
  );
  if (currentOwner === owner) {
    await rm(lockPath, { recursive: true, force: true });
  }
}

async function reclaimStaleLedgerLock(lockPath) {
  const info = await lstat(lockPath).catch(() => null);
  if (!info) return true;
  if (info.isSymbolicLink()) {
    throw new Error(`Refusing symlinked work-package ledger lock: ${lockPath}`);
  }
  if (Date.now() - info.mtimeMs <= LOCK_STALE_MS) return false;

  const stalePath = `${lockPath}.stale.${randomUUID()}`;
  try {
    await rename(lockPath, stalePath);
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    if (["EACCES", "EPERM"].includes(error?.code)) return false;
    throw error;
  }
  await rm(stalePath, { recursive: true, force: true });
  return true;
}

function reportSkeleton(goalId) {
  return `# ${goalId} Report\n\nStatus: in-progress\n\n## Outcome\n\n## Changed Files\n\n## Verification\n\n## Blockers\n`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--") || !rest[index + 1]) {
      throw new Error(`Invalid argument: ${key}`);
    }
    options[key.slice(2)] = rest[index + 1];
    index += 1;
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  let result;
  if (command === "create") {
    result = await createWorkPackage(root, {
      runId: options.run,
      goalId: options.goal,
      briefPath: options.brief,
      pathsFile: options["paths-file"],
    });
  } else if (command === "review") {
    result = await createReviewPackage(root, {
      runId: options.run,
      goalId: options.goal,
      baseRef: options.base,
      pathsFile: options["paths-file"],
    });
  } else if (command === "record") {
    result = await recordWorkPackageResult(root, {
      runId: options.run,
      goalId: options.goal,
      status: options.status,
      verification: options.verification,
    });
  } else {
    throw new Error(
      "Usage: work-package.mjs create --run <id> --goal <id> --brief <issue> --paths-file <scheduler-scope.json> | review|record ...",
    );
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
