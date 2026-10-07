#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {validateConstraints, contextDigest, constraintBlock, relevantConstraints} from './instruction-context.mjs';
import {verifyCompletionEvidence} from './verification-recipe.mjs';

export async function amendWorkPackageConstraints(root, options) {
  const runId = validateId('runId', options.runId), goalId = validateId('goalId', options.goalId);
  const ledgerPath = await resolveRepositoryPath(root, `.scratch/work-packages/${runId}/ledger.json`);
  const constraints = validateConstraints(options.constraints);
  return withLedgerLock(ledgerPath, async lock => {
    const ledger = await readLedger(root, ledgerPath, runId, {checkEvidence:false});
    const goal = ledger.goals[goalId];
    if (!goal) throw new Error('Unknown goal');
    if (goal.constraintDigest === contextDigest(constraints)) return {action:'unchanged',ledgerVersion:ledger.ledgerVersion};
    assertExpectedVersion(ledger.ledgerVersion,options.expectedVersion,'work-package ledger version');
    // Corrections append provenance and supersession; they cannot erase history.
    for (const prior of goal.constraints || []) if (!constraints.some(c => JSON.stringify(c) === JSON.stringify(prior))) throw new Error('constraint history must be retained');
    goal.constraints = constraints;
    goal.constraintDigest = contextDigest(constraints);
    incrementLedgerVersion(ledger);
    await writeJsonAtomic(root,ledgerPath,ledger,lock);
    return {action:'updated',ledgerVersion:ledger.ledgerVersion};
  });
}

export async function readDispatchContext(root, options) {
  const runId = validateId('runId',options.runId), goalId = validateId('goalId',options.goalId);
  const ledger = await readLedger(root,`.scratch/work-packages/${runId}/ledger.json`,runId,{checkEvidence:false});
  const goal = ledger.goals[goalId];
  if (!goal) throw new Error('Unknown goal');
  await assertPackageDependenciesFresh(root,ledger,goalId);
  await assertLedgerEvidenceFresh(root,ledger,[goalId]);
  const raw = await readBoundedFile(root,goal.briefPath,{encoding:'utf8',maxBytes:MAX_BRIEF_BYTES});
  const text = raw.replace(/\n\n<!-- sc-constraints:start -->[\s\S]*?<!-- sc-constraints:end -->/g,'') + constraintBlock(goal.constraints || [],goalId);
  const composition = composePayload({mandatory:text,maxTokens:options.maxTokens,targetTokens:options.targetTokens});
  return {...composition,constraints:relevantConstraints(goal.constraints || [],goalId),constraintDigest:goal.constraintDigest || contextDigest([]),ledgerVersion:ledger.ledgerVersion,dispatchStatus:goal.status === 'verified' ? 'skip_verified' : composition.status === 'over_budget' ? 'blocked' : goal.status === 'ready' ? 'ready' : 'not_ready'};
}

function validateAssignment(value) {
  if (!value || Object.keys(value).some(k => !['workerId','attempt'].includes(k)) || !Number.isSafeInteger(value.attempt) || value.attempt < 1) throw new Error('invalid worker assignment');
  validateId('workerId',value.workerId);
  return {...value};
}

async function mutateCompletion(root, options, operation) {
  const runId=validateId('runId',options.runId), goalId=validateId('goalId',options.goalId);
  const ledgerPath=await resolveRepositoryPath(root,`.scratch/work-packages/${runId}/ledger.json`);
  return withLedgerLock(ledgerPath, async lock => {
    const ledger=await readLedger(root,ledgerPath,runId,{checkEvidence:false}), goal=ledger.goals[goalId];
    if (!goal) throw new Error('Unknown goal');
    const result=await operation(goal,ledger,goalId);
    if (result.action !== 'unchanged') {
      incrementLedgerVersion(ledger);
      await writeJsonAtomic(root,ledgerPath,ledger,lock);
      if (options.status === 'verified' && result.classification?.disposition === 'verified') {
        try {
          await assertEvidenceArtifactsFresh(root,goalId,goal.evidence);
          await assertGoalCompletion(root,goal,goalId);
        } catch (error) {
          await quarantineCommittedCompletion(root,ledger,goalId,ledgerPath,lock,error);
          throw error;
        }
      }
    }
    return {...result,ledgerVersion:ledger.ledgerVersion};
  });
}

export async function submitCompletionReceipt(root, options) {
  const assignment=validateAssignment({workerId:options.workerId,attempt:options.attempt});
  return mutateCompletion(root,options,async (goal,ledger,goalId) => {
    if (JSON.stringify(assignment)!==JSON.stringify(goal.assignment)) throw new Error('worker assignment mismatch');
    const reportPath=validateStoredPath(options.reportPath,'reportPath');
    if (reportPath !== goal.reportPath) throw new Error('receipt report must match scheduler-owned report');
    const report=await readBoundedFile(root,reportPath,{maxBytes:MAX_BRIEF_BYTES});
    const reportDigest=createHash('sha256').update(report).digest('hex');
    const evidence=await materializeResultEvidence(root,goal.expectedEvidence,options.evidence);
    const identity={...assignment,goalId,reportPath,reportDigest,evidence,constraintDigest:goal.constraintDigest || contextDigest([])};
    const receiptId=contextDigest(identity);
    if (goal.receipts?.[receiptId]) return {action:'unchanged',receiptId};
    if (!['in-progress','implemented'].includes(goal.status)) throw new Error('goal cannot receive a new completion');
    if (Object.keys(goal.receipts || {}).length >= 20) throw new Error('completion inbox full');
    if (options.expectedVersion !== undefined) assertExpectedVersion(ledger.ledgerVersion,options.expectedVersion,'work-package ledger version');
    goal.receipts ??= {};
    goal.receipts[receiptId]={...identity,state:'received'};
    return {action:'received',receiptId};
  });
}

export async function classifyCompletionReceipt(root, options) {
  return mutateCompletion(root,options,async (goal,ledger,goalId) => {
    const receipt=goal.receipts?.[options.receiptId];
    if (!receipt) throw new Error('Unknown receipt');
    if (receipt.state !== 'received') return {action:'unchanged',receiptId:options.receiptId,classification:receipt.classification};
    assertExpectedVersion(ledger.ledgerVersion,options.expectedVersion,'work-package ledger version');
    let reason;
    if (options.workerAvailable === false || JSON.stringify(goal.assignment)!==JSON.stringify({workerId:receipt.workerId,attempt:receipt.attempt})) reason='worker_lost';
    else if (receipt.constraintDigest !== (goal.constraintDigest || contextDigest([]))) reason='constraint_drift';
    else {
      try {
        await assertPackageDependenciesFresh(root,ledger,goalId);
        await assertLedgerEvidenceFresh(root,ledger,[goalId]);
        const report=await readBoundedFile(root,receipt.reportPath,{maxBytes:MAX_BRIEF_BYTES});
        if (createHash('sha256').update(report).digest('hex') !== receipt.reportDigest) throw new Error('report digest mismatch');
        validateResultEvidence(goal.expectedEvidence,receipt.evidence,{stored:true});
        await assertEvidenceArtifactsFresh(root,goalId,receipt.evidence);
      } catch (error) { reason=`stale_evidence: ${error.message}`; }
    }
    if (!['implemented','verified'].includes(options.status)) throw new Error('classification requires implemented or verified');
    // Outcome failures cannot be committed as a verified receipt or goal.
    if (!reason && options.status === 'verified') await assertGoalCompletion(root,goal,goalId,receipt.evidence);
    if (reason) {
      // A previously verified goal is never rerun solely for inbox maintenance.
      if (goal.status !== 'verified') {
        if (goal.evidence) {
          goal.quarantinedEvidence = goal.evidence;
          delete goal.evidence;
        }
        goal.status='blocked';
        goal.statusReason={code:'COMPLETION_RECONCILE',detail:reason.slice(0,500)};
        goal.verification=reason;
      }
      receipt.classification={disposition:'blocked',reason};
    } else {
      if (goal.status !== 'verified') {
        if (!TRANSITIONS.get(goal.status)?.has(options.status)) throw new Error('receipt classification cannot bypass ordered review transitions');
        goal.status=options.status;
        goal.evidence=receipt.evidence;
        goal.verification=`completion receipt ${options.receiptId}`;
      }
      receipt.classification={disposition:goal.status,reason:goal.status === 'verified' ? 'complete outcome evidence independently reviewed' : 'implementation evidence received; verification pending'};
    }
    receipt.state='classified';
    return {action:'classified',receiptId:options.receiptId,classification:receipt.classification};
  });
}

export async function acknowledgeCompletionReceipt(root, options) {
  return mutateCompletion(root,options,async (goal,ledger) => {
    const receipt=goal.receipts?.[options.receiptId];
    if (!receipt) throw new Error('Unknown receipt');
    if (receipt.state==='acknowledged') return {action:'unchanged',receiptId:options.receiptId};
    if (receipt.state!=='classified') throw new Error('classify receipt before acknowledgement');
    assertExpectedVersion(ledger.ledgerVersion,options.expectedVersion,'work-package ledger version');
    receipt.state='acknowledged';
    return {action:'acknowledged',receiptId:options.receiptId};
  });
}

import {
  assertExpectedVersion,
  readBoundedFile,
  resolveRepositoryPath,
  writeFileAtomic,
} from "./file-state.mjs";

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
const MAX_LEDGER_BYTES = 2 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const MAX_CLI_INPUT_BYTES = 64 * 1024;
const SENSITIVE_CONTENT_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"']{8,}/i,
];
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REPOSITORY_PATH_PATTERN = /^(?!\/)(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*[\\:\u0000-\u001F\u007F])[^/]+(?:\/[^/]+)*$/;
const WORK_PACKAGE_CONTROL_PATH_PATTERN =
  /^\.scratch\/work-packages\/[^/]+\/ledger\.json(?:$|\.lock(?:\/|$))/;
const TRANSITIONS = new Map([
  ["ready", new Set(["in-progress", "blocked"])],
  ["in-progress", new Set(["implemented", "blocked", "failed"])],
  ["implemented", new Set(["verified", "blocked", "failed"])],
  ["blocked", new Set(["ready"])],
  ["failed", new Set(["ready"])],
  ["verified", new Set()],
]);

// The issue/goal brief is entirely mandatory. Only explicitly optional
// background may become a pointer; estimates never imply runtime billing.
export function composePayload({mandatory, background = [], maxTokens, targetTokens = 2000}) {
  if (typeof mandatory !== 'string' || !mandatory.trim() || !Array.isArray(background) || background.length > 20 || (maxTokens !== undefined && (!Number.isSafeInteger(maxTokens) || maxTokens < 1))) {
    throw new Error('Invalid composition input');
  }
  if (!Number.isSafeInteger(targetTokens) || targetTokens < 1) throw new Error('Invalid targetTokens');
  const estimate = text => Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
  const mandatoryTokens = estimate(mandatory);
  // An omitted limit is a soft target. Explicit host/user limits remain hard.
  const explicitMax = maxTokens;
  const contextTarget = Math.min(maxTokens ?? Infinity, Math.max(targetTokens, mandatoryTokens));
  maxTokens ??= Math.max(targetTokens, mandatoryTokens);
  let text = mandatory;
  const omissions = [];
  for (const item of background) {
    if (typeof item.text !== 'string' || typeof item.ref !== 'string' || !REPOSITORY_PATH_PATTERN.test(item.ref)) throw new Error('Invalid background pointer');
    const full = `${text}\n\n${item.text}`;
    if (estimate(full) <= contextTarget) text = full;
    else {
      const pointer = `${text}\n\nBackground: ${item.ref}`;
      if (estimate(pointer) <= contextTarget) {
        text = pointer;
        omissions.push({ref: item.ref, reason: 'optional_background_pointer'});
      } else {
        omissions.push({ref: item.ref, reason: 'optional_background_omitted'});
      }
    }
  }
  const estimatedTokens = estimate(text);
  return {text, omissions, estimatedTokens, mandatoryTokens, maxTokens, targetTokens, targetExceeded: estimatedTokens > targetTokens, hardLimit: explicitMax ?? null, measurement: 'utf8_bytes_div_4_estimate', status: estimatedTokens > maxTokens ? 'over_budget' : 'within_budget'};
}

export async function createWorkPackage(root, options) {
  const safeRoot = path.resolve(root);
  const assignment = options.assignment ? validateAssignment(options.assignment) : undefined;
  const runId = validateId("runId", options.runId);
  const goalId = validateId("goalId", options.goalId);
  const constraints = validateConstraints(options.constraints);
  const sourceBrief = (await readBoundedFile(safeRoot, options.briefPath, {
    encoding: "utf8",
    label: "briefPath",
    maxBytes: MAX_BRIEF_BYTES,
  })) + constraintBlock(constraints, goalId);
  let composition;
  if (options.composition) {
    for (const item of options.composition.background || []) await readBoundedFile(safeRoot, item.ref);
    composition = composePayload({...options.composition, mandatory: sourceBrief});
    if (composition.status === 'over_budget') return {
      ...composition,
      dispatchStatus: 'blocked',
      recovery: {
        action: 'recompose',
        minimumTokens: composition.mandatoryTokens,
        reason: 'mandatory_content_exceeds_explicit_cap',
        detail: 'Preserve mandatory requirements. Reduce optional background; retry only within the host/user cap or use a supported handoff with complete mandatory content.',
      },
    };
  }
  const brief = composition?.text ?? sourceBrief;
  if (!options.pathsFile) {
    throw new Error("Scheduler-owned pathsFile is required when creating a work package");
  }
  const scopePaths = await readReviewPaths(safeRoot, options.pathsFile);
  const scopeDigest = digestPaths(scopePaths);
  const baselineDirty = await captureDirtySnapshot(safeRoot);
  const expectedEvidence = validateDigestBundle(
    options.expectedEvidence,
    "expectedEvidence",
    false,
  );
  const completionContract = options.completionContract === undefined ? undefined
    : await pinCompletionContract(safeRoot,options.completionContract,goalId);
  const runCompletionContract = options.runCompletionContract === undefined ? undefined
    : await pinCompletionContract(safeRoot,options.runCompletionContract,runId);

  const packageDir = await resolveRepositoryPath(
    safeRoot,
    path.join(".scratch", "work-packages", runId, goalId),
    { label: "packageDir" },
  );
  await mkdir(packageDir, { recursive: true });
  await resolveRepositoryPath(safeRoot, packageDir, { label: "packageDir" });

  const briefPath = path.join(packageDir, "brief.md");
  const reportPath = path.join(packageDir, "report.md");
  const pathsPath = path.join(packageDir, "review-paths.json");
  const reviewPackagePath = path.join(packageDir, "review.patch");
  const ledgerPath = await resolveRepositoryPath(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    { label: "ledgerPath" },
  );
  await writeStableFile(safeRoot, briefPath, brief, "brief", MAX_BRIEF_BYTES);
  await writeIfMissing(
    safeRoot,
    reportPath,
    reportSkeleton(goalId),
    MAX_BRIEF_BYTES,
  );
  await writeStableFile(
    safeRoot,
    pathsPath,
    `${JSON.stringify(scopePaths, null, 2)}\n`,
    "review path scope",
    MAX_PATHS_FILE_BYTES,
  );

  let ledgerVersion;
  let dispatchStatus = 'ready';
  await withLedgerLock(ledgerPath, async (lock) => {
    const ledger = await readLedger(safeRoot, ledgerPath, runId, {checkEvidence:false});
    if (runCompletionContract && ledger.completionContract
      && JSON.stringify(runCompletionContract) !== JSON.stringify(ledger.completionContract)) throw new Error('run completionContract already pinned');
    const existing = ledger.goals[goalId];
    if (existing) {
      if (existing.scopeDigest !== scopeDigest) {
        throw new Error(`Review scope already pinned for goalId: ${goalId}`);
      }
      if (
        expectedEvidence &&
        JSON.stringify(existing.expectedEvidence) !== JSON.stringify(expectedEvidence)
      ) {
        throw new Error(`expectedEvidence already pinned for goalId: ${goalId}`);
      }
      if (completionContract && JSON.stringify(existing.completionContract) !== JSON.stringify(completionContract)) throw new Error('completionContract already pinned; attach missing proof through a nonterminal result');
      if (runCompletionContract && !ledger.completionContract) {
        ledger.completionContract = runCompletionContract;
        incrementLedgerVersion(ledger);
        await writeJsonAtomic(safeRoot,ledgerPath,ledger,lock);
      }
      ledgerVersion = ledger.ledgerVersion;
      dispatchStatus = existing.status === 'ready' ? 'ready' : 'not_ready';
      return;
    }
    ledger.goals[goalId] = {
      status: "ready",
      sourceBriefPath: repositoryRelative(safeRoot,await resolveRepositoryPath(safeRoot,options.briefPath)),
      briefPath: repositoryRelative(safeRoot, briefPath),
      reportPath: repositoryRelative(safeRoot, reportPath),
      pathsPath: repositoryRelative(safeRoot, pathsPath),
      reviewPackagePath: repositoryRelative(safeRoot, reviewPackagePath),
      scopeDigest,
      baselineDirty,
      verification: "pending",
      ...(expectedEvidence ? { expectedEvidence } : {}),
      ...(completionContract ? { completionContract } : {}),
      ...(options.constraints ? {constraints, constraintDigest: contextDigest(constraints)} : {}),
      ...(assignment ? {assignment} : {}),
    };
    if (runCompletionContract) ledger.completionContract = runCompletionContract;
    incrementLedgerVersion(ledger);
    await writeJsonAtomic(safeRoot, ledgerPath, ledger, lock);
    ledgerVersion = ledger.ledgerVersion;
  });

  return {
    dispatchStatus,
    packageDir,
    briefPath,
    reportPath,
    pathsPath,
    reviewPackagePath,
    ledgerPath,
    ledgerVersion,
    ...(composition ? {composition} : {}),
  };
}

export async function createReviewPackage(root, options) {
  const safeRoot = path.resolve(root);
  const runId = validateId("runId", options.runId);
  const goalId = validateId("goalId", options.goalId);
  const baseRef = validateRef(options.baseRef ?? "HEAD");
  const packageDir = await resolveRepositoryPath(
    safeRoot,
    path.join(".scratch", "work-packages", runId, goalId),
    { label: "packageDir" },
  );
  const info = await stat(packageDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Work package does not exist: ${packageDir}`);
  }
  const pathsPath = path.join(packageDir, "review-paths.json");
  const paths = await readReviewPaths(safeRoot, pathsPath);
  const ledgerPath = await resolveRepositoryPath(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    { label: "ledgerPath" },
  );
  const ledger = await readLedger(safeRoot, ledgerPath, runId, {checkEvidence:false});
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
  await writeFileAtomic(safeRoot, reviewPackagePath, reviewContent, {
    encoding: "utf8",
    label: "Review package",
    maxBytes: MAX_DIFF_BYTES,
  });
  return { reviewPackagePath, baseRef, bytes, paths };
}

function digestPaths(paths) {
  return createHash("sha256").update(JSON.stringify(paths)).digest("hex");
}

async function captureDirtySnapshot(root) {
  const snapshot = Object.create(null);
  const inside = await execFileAsync(
    "git",
    ["rev-parse", "--is-inside-work-tree"],
    { cwd: root, encoding: "utf8", windowsHide: true },
  ).catch(() => null);
  if (!inside || inside.stdout.trim() !== "true") return snapshot;

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

  for (const relative of [...names].sort((left, right) => left.localeCompare(right))) {
    snapshot[relative] = await digestWorkingPath(root, relative);
  }
  return snapshot;
}

async function digestWorkingPath(root, relative) {
  const absolute = await resolveRepositoryPath(root, relative, {
    label: "dirty path",
  });
  const info = await lstat(absolute).catch(() => null);
  if (!info) return "deleted";
  if (!info.isFile()) return `non-file:${info.size}:${info.mtimeMs}`;
  const content = await readBoundedFile(root, relative, {
    label: "dirty path",
    maxBytes: MAX_DIFF_BYTES,
  });
  return createHash("sha256").update(content).digest("hex");
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
    const content = await readBoundedFile(root, file, {
      label: "Untracked file",
      maxBytes: MAX_DIFF_BYTES,
    }).catch((error) => {
      if (/File does not exist/.test(error.message)) return null;
      throw error;
    });
    if (content === null) continue;
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

  const ledgerPath = await resolveRepositoryPath(
    safeRoot,
    path.join(".scratch", "work-packages", runId, "ledger.json"),
    { label: "ledgerPath" },
  );
  let ledgerVersion;
  await withLedgerLock(ledgerPath, async (lock) => {
    const ledger = await readLedger(safeRoot, ledgerPath, runId, {checkEvidence:false});
    assertExpectedVersion(
      ledger.ledgerVersion,
      options.expectedVersion,
      "work-package ledger version",
    );
    if (!ledger.goals[goalId]) {
      throw new Error(`Unknown goalId in ledger: ${goalId}`);
    }
    const goal = ledger.goals[goalId];
    const allowed = TRANSITIONS.get(goal.status);
    if (!allowed?.has(options.status)) {
      throw new Error(
        `Unsupported work-package transition: ${goal.status} -> ${options.status}`,
      );
    }
    if (goal.requiresFreshVerification) {
      throw new Error(
        "FRESH_VERIFICATION_REPLAN_REQUIRED: migrated legacy verification must be replanned as a new v2 work package",
      );
    }
    if (["in-progress", "implemented", "verified"].includes(options.status)) {
      await assertPackageDependenciesFresh(safeRoot,ledger,goalId);
      await assertLedgerEvidenceFresh(safeRoot,ledger,[goalId]);
    }

    let evidence;
    if (["implemented", "verified"].includes(options.status)) {
      if (!verification) {
        throw new Error("Blank verification evidence is not allowed");
      }
      evidence = await materializeResultEvidence(
        safeRoot,
        goal.expectedEvidence,
        options.evidence,
      );
    }
    const completionContract = options.completionContract === undefined ? goal.completionContract
      : await pinCompletionContract(safeRoot,options.completionContract,goalId);
    if (goal.completionContract && completionContract
      && JSON.stringify(goal.completionContract) !== JSON.stringify(completionContract)) throw new Error('completionContract already pinned');
    if (evidence) await assertEvidenceArtifactsFresh(safeRoot,goalId,evidence);
    if (options.status === 'verified') await assertGoalCompletion(safeRoot,{...goal,completionContract},goalId,evidence);
    const statusReason = ["blocked", "failed"].includes(options.status)
      ? validateStatusReason(options.reason)
      : undefined;
    const recovery =
      ["blocked", "failed"].includes(goal.status) && options.status === "ready"
        ? validateRecovery(options.recovery)
        : undefined;

    goal.status = options.status;
    if (statusReason && goal.evidence && (await inspectLedgerEvidence(safeRoot,ledger,[goalId])).length) {
      goal.quarantinedEvidence=goal.evidence;
      delete goal.evidence;
    }
    goal.verification = verification || `transitioned to ${options.status}`;
    if (evidence) goal.evidence = evidence;
    if (completionContract) goal.completionContract = completionContract;
    if (statusReason) goal.statusReason = statusReason;
    if (recovery) goal.recovery = recovery;
    incrementLedgerVersion(ledger);
    await writeJsonAtomic(safeRoot, ledgerPath, ledger, lock);
    if (evidence) {
      try {
        await assertEvidenceArtifactsFresh(safeRoot,goalId,evidence);
        if (options.status === 'verified') await assertGoalCompletion(safeRoot,goal,goalId);
      } catch (error) {
        if (options.status === 'verified') await quarantineCommittedCompletion(safeRoot,ledger,goalId,ledgerPath,lock,error);
        throw error;
      }
    }
    ledgerVersion = ledger.ledgerVersion;
  });
  return { ledgerPath, goalId, status: options.status, ledgerVersion };
}

function validateDigestBundle(value, label, required = true) {
  if (value === undefined && !required) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const keys = ["authorityDigest", "evalDigest", "reviewerDigest"];
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${label} contains unsupported field: ${unknown[0]}`);
  }
  const result = {};
  for (const key of keys) {
    if (!DIGEST_PATTERN.test(String(value[key] ?? ""))) {
      throw new Error(`${label}.${key} must be a lowercase SHA-256 digest`);
    }
    result[key] = value[key];
  }
  return result;
}

function validateCompletionContractPin(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key=>!['path','digest'].includes(key))
    || !DIGEST_PATTERN.test(String(value.digest ?? ''))) throw new Error('completionContract must contain path and SHA-256 digest');
  return {path:validateStoredPath(value.path,'completionContract.path'),digest:value.digest};
}

async function pinCompletionContract(root,value,taskId) {
  const pin = validateCompletionContractPin(value);
  const bytes = await readBoundedFile(root,pin.path,{maxBytes:MAX_EVIDENCE_BYTES});
  if (createHash('sha256').update(bytes).digest('hex') !== pin.digest) throw new Error('completion contract digest mismatch');
  const contract = JSON.parse(bytes.toString('utf8'));
  if (contract.schema !== 'completion_contract_v1' || contract.taskId !== taskId) throw new Error('completion contract task identity mismatch');
  return pin;
}

export async function assertGoalCompletion(root,goal,goalId,evidence=goal.evidence) {
  if (!goal.completionContract) throw new Error(`Completion Needs Validation: ${goalId} has no pinned completion contract`);
  const pin = await pinCompletionContract(root,goal.completionContract,goalId);
  const verdict = await verifyCompletionEvidence(root,{contractPath:pin.path,contractDigest:pin.digest,evidenceRefs:evidence?.evidenceArtifacts});
  if (!verdict.allowed) throw new Error(`Completion ${verdict.status}: ${goalId}: ${verdict.issues.join('; ')}`);
  return verdict;
}

async function quarantineCommittedCompletion(root,ledger,goalId,ledgerPath,lock,error) {
  const goal=ledger.goals[goalId],reason=String(error.message).slice(0,500);
  goal.status='blocked';
  goal.statusReason={code:'COMPLETION_DRIFT',detail:reason};
  goal.verification=reason;
  goal.quarantinedEvidence=goal.evidence;
  delete goal.evidence;
  for (const receipt of Object.values(goal.receipts??{})) if (receipt.classification?.disposition==='verified') receipt.classification={disposition:'blocked',reason};
  incrementLedgerVersion(ledger);
  await writeJsonAtomic(root,ledgerPath,ledger,lock);
}

function validateResultEvidence(expected, value, options = {}) {
  if (!expected) {
    throw new Error("Expected authority/eval/reviewer digests are not pinned");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Verification evidence must be an object");
  }
  const allowed = new Set([
    "authorityDigest",
    "evalDigest",
    "reviewerDigest",
    "evidenceRefs",
    ...(options.stored ? ["evidenceArtifacts"] : []),
  ]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Verification evidence contains unsupported field: ${unknown}`);

  const actual = validateDigestBundle(
    {
      authorityDigest: value.authorityDigest,
      evalDigest: value.evalDigest,
      reviewerDigest: value.reviewerDigest,
    },
    "evidence",
  );
  for (const [key, noun] of [
    ["authorityDigest", "authority"],
    ["evalDigest", "eval"],
    ["reviewerDigest", "reviewer"],
  ]) {
    if (actual[key] !== expected[key]) {
      throw new Error(`Stale ${noun} digest in verification evidence`);
    }
  }
  if (
    !Array.isArray(value.evidenceRefs) ||
    value.evidenceRefs.length === 0 ||
    value.evidenceRefs.length > 100
  ) {
    throw new Error("Verification evidence must contain 1-100 evidenceRefs");
  }
  const evidenceRefs = value.evidenceRefs.map((entry) => {
    const evidenceRef = validateStoredPath(entry, "evidenceRefs entry");
    const pathIdentity =
      process.platform === "win32" ? evidenceRef.toLowerCase() : evidenceRef;
    if (WORK_PACKAGE_CONTROL_PATH_PATTERN.test(pathIdentity)) {
      throw new Error(
        `Evidence ref aliases mutable work-package control state: ${evidenceRef}`,
      );
    }
    return evidenceRef;
  });
  if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    throw new Error("Verification evidenceRefs must be unique");
  }
  if (!options.stored) return { ...actual, evidenceRefs };

  if (
    !Array.isArray(value.evidenceArtifacts) ||
    value.evidenceArtifacts.length !== evidenceRefs.length
  ) {
    throw new Error("Verification evidence must bind every evidenceRef by digest");
  }
  const evidenceArtifacts = value.evidenceArtifacts.map((artifact, index) => {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      throw new Error("Verification evidence artifact must be an object");
    }
    const unknownArtifact = Object.keys(artifact).find(
      (key) => !["path", "digest"].includes(key),
    );
    if (unknownArtifact) {
      throw new Error(
        `Verification evidence artifact contains unsupported field: ${unknownArtifact}`,
      );
    }
    const artifactPath = validateStoredPath(
      artifact.path,
      "evidence artifact path",
    );
    if (artifactPath !== evidenceRefs[index]) {
      throw new Error("Verification evidence artifact paths must match evidenceRefs");
    }
    if (!DIGEST_PATTERN.test(String(artifact.digest ?? ""))) {
      throw new Error("Verification evidence artifact digest must be SHA-256");
    }
    return { path: artifactPath, digest: artifact.digest };
  });
  return { ...actual, evidenceRefs, evidenceArtifacts };
}

async function materializeResultEvidence(root, expected, value) {
  const validated = validateResultEvidence(expected, value);
  const evidenceArtifacts = [];
  for (const evidenceRef of validated.evidenceRefs) {
    const content = await readBoundedFile(root, evidenceRef, {
      label: "Evidence file",
      maxBytes: MAX_EVIDENCE_BYTES,
    });
    evidenceArtifacts.push({
      path: evidenceRef,
      digest: createHash("sha256").update(content).digest("hex"),
    });
  }
  return { ...validated, evidenceArtifacts };
}

function validateStatusReason(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A typed status reason is required for blocked/failed");
  }
  const unknown = Object.keys(value).find((key) => !["code", "detail"].includes(key));
  if (unknown) throw new Error(`Typed status reason contains unsupported field: ${unknown}`);
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(String(value.code ?? ""))) {
    throw new Error("Typed status reason code is invalid");
  }
  const detail = String(value.detail ?? "").trim();
  if (!detail || detail.length > 500) {
    throw new Error("Typed status reason detail must contain 1-500 characters");
  }
  return { code: value.code, detail };
}

function validateRecovery(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Typed recovery evidence is required after blocked/failed");
  }
  const unknown = Object.keys(value).find((key) => !["code", "evidenceRef"].includes(key));
  if (unknown) throw new Error(`Typed recovery evidence contains unsupported field: ${unknown}`);
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(String(value.code ?? ""))) {
    throw new Error("Typed recovery evidence code is invalid");
  }
  const evidenceRef = validateStoredPath(
    value.evidenceRef,
    "Typed recovery evidenceRef",
  );
  return { code: value.code, evidenceRef };
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
  let values;
  try {
    values = JSON.parse(
      await readBoundedFile(root, pathsFile, {
        encoding: "utf8",
        label: "pathsFile",
        maxBytes: MAX_PATHS_FILE_BYTES,
      }),
    );
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
    const relative = validateStoredPath(value, "pathsFile entry");
    await resolveRepositoryPath(root, relative, { label: "review path" });
    if (
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
    const absolute = await resolveRepositoryPath(root, relative, {
      label: "review path",
    });
    const info = await lstat(absolute).catch(() => null);
    if (!info) {
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

function repositoryRelative(root, absolute) {
  const relative = normalizeRelativePath(path.relative(root, absolute));
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) {
    throw new Error(`Stored path must be repository-relative: ${absolute}`);
  }
  return validateStoredPath(relative, "Stored path");
}

async function readOptionalBoundedFile(root, target, label, maxBytes) {
  return readBoundedFile(root, target, {
    encoding: "utf8",
    label,
    maxBytes,
  }).catch((error) => {
    if (/File does not exist/.test(error.message)) return null;
    throw error;
  });
}

async function writeStableFile(root, target, content, label, maxBytes) {
  const existing = await readOptionalBoundedFile(root, target, label, maxBytes);
  if (existing !== null && existing !== content) {
    throw new Error(`${label} already exists with different content: ${target}`);
  }
  if (existing === null) {
    await writeFileAtomic(root, target, content, {
      encoding: "utf8",
      label,
      maxBytes,
    });
  }
}

async function writeIfMissing(root, target, content, maxBytes) {
  const existing = await readOptionalBoundedFile(
    root,
    target,
    "Work-package report",
    maxBytes,
  );
  if (existing === null) {
    await writeFileAtomic(root, target, content, {
      encoding: "utf8",
      label: "Work-package report",
      maxBytes,
    });
  }
}

export async function readLedger(root, ledgerPath, runId, {checkEvidence=true,evidenceGoalIds}={}) {
  const content = await readBoundedFile(root, ledgerPath, {
    encoding: "utf8",
    label: "Work-package ledger",
    maxBytes: MAX_LEDGER_BYTES,
  }).catch((error) => {
    if (/File does not exist/.test(error.message)) return null;
    throw error;
  });
  if (!content) {
    return {
      schema: "work_package_ledger_v2",
      runId,
      ledgerVersion: 0,
      goals: {},
    };
  }
  let ledger;
  try {
    ledger = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid work-package ledger JSON: ${error.message}`);
  }
  if (ledger.schema !== "work_package_ledger_v2") {
    throw new Error(
      `Invalid work-package ledger (v1/legacy ledgers are not accepted): ${ledgerPath}`,
    );
  }
  validateLedger(ledger, runId);
  if (checkEvidence) await assertLedgerEvidenceFresh(root, ledger, evidenceGoalIds);
  return ledger;
}

export async function inspectLedgerEvidence(root, ledger, goalIds=Object.keys(ledger.goals)) {
  if (!Array.isArray(goalIds) || goalIds.length>5000 || new Set(goalIds).size!==goalIds.length) throw new Error('Invalid evidence goal selection');
  const issues=[];
  for (const goalId of goalIds) {
    const goal=ledger.goals[goalId];
    if (!goal) throw new Error(`Unknown evidence goal: ${goalId}`);
    if (!goal.evidence) continue;
    try {
      await assertEvidenceArtifactsFresh(root,goalId,goal.evidence);
      if (goal.status === 'verified') await assertGoalCompletion(root,goal,goalId);
    }
    catch (error) { issues.push({goalId,reason:error.message}); }
  }
  return issues;
}

async function assertLedgerEvidenceFresh(root, ledger, goalIds) {
  const issues=await inspectLedgerEvidence(root,ledger,goalIds);
  if (issues.length) throw new Error(issues[0].reason);
}

async function assertPackageDependenciesFresh(root, ledger, goalId, visiting=new Set(), checked=new Set()) {
  if (visiting.has(goalId)) throw new Error('Cyclic work-package dependency');
  if (checked.has(goalId)) return;
  visiting.add(goalId);
  const goal=ledger.goals[goalId];
  const brief=await readBoundedFile(root,goal.briefPath,{encoding:'utf8',maxBytes:MAX_BRIEF_BYTES});
  const declaration=brief.match(/^Blocked by:\s*(.+)$/m)?.[1]?.trim();
  const refs=!declaration || /^none$/i.test(declaration) ? [] : declaration.split(/[,\s]+/).filter(Boolean);
  for (const ref of refs) {
    let dependencyId=Object.hasOwn(ledger.goals,ref) ? ref : null;
    if (!dependencyId) {
      const source=goal.sourceBriefPath ? normalizeRelativePath(path.posix.join(path.posix.dirname(goal.sourceBriefPath),ref.replaceAll('\\','/'))) : null;
      const matches=Object.entries(ledger.goals).filter(([,candidate])=>candidate.sourceBriefPath && source
        && (process.platform==='win32' ? candidate.sourceBriefPath.toLowerCase()===source.toLowerCase() : candidate.sourceBriefPath===source));
      if (matches.length===1) dependencyId=matches[0][0];
    }
    if (!dependencyId) throw new Error(`Unresolved work-package dependency: ${ref}`);
    if (ledger.goals[dependencyId].status!=='verified') throw new Error(`Work-package dependency is not verified: ${dependencyId}`);
    await assertLedgerEvidenceFresh(root,ledger,[dependencyId]);
    await assertPackageDependenciesFresh(root,ledger,dependencyId,visiting,checked);
  }
  visiting.delete(goalId);
  checked.add(goalId);
}

async function assertEvidenceArtifactsFresh(root, goalId, evidence) {
  for (const artifact of evidence.evidenceArtifacts) {
    const content = await readBoundedFile(root, artifact.path, {
      label: "Evidence file",
      maxBytes: MAX_EVIDENCE_BYTES,
    });
    const actualDigest = createHash("sha256").update(content).digest("hex");
    if (actualDigest !== artifact.digest) {
      throw new Error(
        `Evidence digest mismatch for ${goalId}: ${artifact.path}`,
      );
    }
  }
}

function validateLedger(ledger, runId) {
  const topKeys = new Set(["schema", "runId", "ledgerVersion", "goals", "completionContract"]);
  const extraTop = Object.keys(ledger).find((key) => !topKeys.has(key));
  if (extraTop) throw new Error(`Unsupported ledger field: ${extraTop}`);
  if (
    ledger.runId !== runId ||
    !Number.isSafeInteger(ledger.ledgerVersion) ||
    ledger.ledgerVersion < 0 ||
    !ledger.goals ||
    typeof ledger.goals !== "object" ||
    Array.isArray(ledger.goals)
  ) {
    throw new Error("Invalid work-package ledger header");
  }
  const goalEntries = Object.entries(ledger.goals);
  if (ledger.completionContract !== undefined) validateCompletionContractPin(ledger.completionContract);
  if (goalEntries.length > 5000) {
    throw new Error("Invalid work-package ledger: too many goals");
  }
  for (const [goalId, goal] of goalEntries) validateLedgerGoal(goalId, goal);
}

function incrementLedgerVersion(ledger) {
  if (ledger.ledgerVersion >= Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Work-package ledger version cannot increment beyond the maximum safe integer",
    );
  }
  ledger.ledgerVersion += 1;
}

function validateLedgerGoal(goalId, goal) {
  validateId("ledger goalId", goalId);
  if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
    throw new Error(`Invalid work-package ledger goal: ${goalId}`);
  }
  const required = [
    "status",
    "briefPath",
    "reportPath",
    "pathsPath",
    "reviewPackagePath",
    "scopeDigest",
    "baselineDirty",
    "verification",
  ];
  const allowed = new Set([
    ...required,
    "expectedEvidence",
    "evidence",
    "quarantinedEvidence",
    "requiresFreshVerification",
    "statusReason",
    "recovery",
    "constraints",
    "constraintDigest",
    "receipts",
    "assignment",
    "sourceBriefPath",
    "completionContract",
  ]);
  const unknown = Object.keys(goal).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Unsupported ledger goal field: ${unknown}`);
  const missing = required.find((key) => !(key in goal));
  if (goal.constraints !== undefined) {
    validateConstraints(goal.constraints);
    if (goal.constraintDigest !== contextDigest(goal.constraints)) throw new Error('constraint digest mismatch');
  } else if (goal.constraintDigest !== undefined) throw new Error('constraints missing');
  if (goal.assignment !== undefined) validateAssignment(goal.assignment);
  if (goal.sourceBriefPath !== undefined) validateStoredPath(goal.sourceBriefPath,'sourceBriefPath');
  if (goal.completionContract !== undefined) validateCompletionContractPin(goal.completionContract);
  if (goal.receipts !== undefined) {
    if (!goal.receipts || Array.isArray(goal.receipts) || typeof goal.receipts !== 'object' || Object.keys(goal.receipts).length > 20) throw new Error('invalid completion inbox');
    for (const [id,receipt] of Object.entries(goal.receipts)) {
      if (!receipt || Object.keys(receipt).some(k=>!['workerId','attempt','goalId','reportPath','reportDigest','evidence','constraintDigest','state','classification'].includes(k))) throw new Error('invalid receipt fields');
      validateAssignment({workerId:receipt.workerId,attempt:receipt.attempt});
      const {state,classification,...identity}=receipt;
      if (id!==contextDigest(identity) || receipt.goalId!==goalId || receipt.reportPath!==goal.reportPath || !DIGEST_PATTERN.test(receipt.reportDigest) || !DIGEST_PATTERN.test(receipt.constraintDigest)) throw new Error('receipt identity mismatch');
      validateResultEvidence(goal.expectedEvidence,receipt.evidence,{stored:true});
      if (!['received','classified','acknowledged'].includes(state) || (state === 'received' ? classification!==undefined : !classification || !['implemented','verified','blocked'].includes(classification.disposition) || typeof classification.reason !== 'string')) throw new Error('invalid receipt lifecycle');
    }
  }
  if (missing) throw new Error(`Invalid work-package ledger goal missing ${missing}`);
  if (!STATUSES.has(goal.status)) {
    throw new Error(`Invalid work-package ledger status: ${goal.status}`);
  }
  for (const key of ["briefPath", "reportPath", "pathsPath", "reviewPackagePath"]) {
    validateStoredPath(goal[key], `ledger.${goalId}.${key}`);
  }
  if (!DIGEST_PATTERN.test(String(goal.scopeDigest ?? ""))) {
    throw new Error(`Invalid work-package ledger scopeDigest: ${goalId}`);
  }
  if (
    !goal.baselineDirty ||
    typeof goal.baselineDirty !== "object" ||
    Array.isArray(goal.baselineDirty)
  ) {
    throw new Error(`Invalid work-package ledger baselineDirty: ${goalId}`);
  }
  for (const [dirtyPath, digest] of Object.entries(goal.baselineDirty)) {
    validateStoredPath(dirtyPath, `ledger.${goalId}.baselineDirty`);
    if (typeof digest !== "string" || !digest || digest.length > 256) {
      throw new Error(`Invalid work-package ledger dirty digest: ${goalId}`);
    }
  }
  if (
    typeof goal.verification !== "string" ||
    !goal.verification.trim() ||
    goal.verification.length > MAX_VERIFICATION_CHARS
  ) {
    throw new Error(`Invalid work-package ledger verification: ${goalId}`);
  }
  const expected = goal.expectedEvidence
    ? validateDigestBundle(goal.expectedEvidence, "expectedEvidence")
    : undefined;
  if (goal.evidence) {
    validateResultEvidence(expected, goal.evidence, { stored: true });
  }
  if (goal.quarantinedEvidence) {
    validateResultEvidence(expected, goal.quarantinedEvidence, { stored: true });
  }
  if (goal.requiresFreshVerification !== undefined) {
    if (goal.requiresFreshVerification !== true) {
      throw new Error(
        `Invalid work-package ledger requiresFreshVerification: ${goalId}`,
      );
    }
    if (goal.status !== "implemented" || goal.evidence) {
      throw new Error(
        `Invalid work-package ledger legacy verification quarantine: ${goalId}`,
      );
    }
  }
  if (
    ["implemented", "verified"].includes(goal.status) &&
    !goal.evidence &&
    !goal.requiresFreshVerification
  ) {
    throw new Error(`Invalid work-package ledger missing evidence: ${goalId}`);
  }
  if (goal.statusReason) validateStatusReason(goal.statusReason);
  if (["blocked", "failed"].includes(goal.status) && !goal.statusReason) {
    throw new Error(`Invalid work-package ledger missing typed status reason: ${goalId}`);
  }
  if (goal.recovery) validateRecovery(goal.recovery);
}

function validateStoredPath(value, label) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 4096 ||
    !REPOSITORY_PATH_PATTERN.test(value) ||
    path.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    value !== normalizeRelativePath(value)
  ) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  return value;
}

async function writeJsonAtomic(root, target, value, lock = {}) {
  return writeFileAtomic(root, target, `${JSON.stringify(value, null, 2)}\n`, {
    assertOwnership: lock.assertOwnership,
    label: "Work-package ledger",
    maxBytes: MAX_LEDGER_BYTES,
    mode: 0o600,
    fallbackOnBusy: false,
  });
}

const ledgerQueues = new Map();

// ponytail: in-process serialization per ledger path; work packages are
// written by one orchestrator session, so a cross-process lock buys nothing
// and a filesystem lock is what broke Windows and WSL mounts.
export async function withLedgerLock(ledgerPath, operation) {
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  const key = path.resolve(ledgerPath);
  const previous = ledgerQueues.get(key) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() =>
    operation({ assertOwnership: async () => {} }),
  );
  ledgerQueues.set(key, run);
  try {
    return await run;
  } finally {
    if (ledgerQueues.get(key) === run) ledgerQueues.delete(key);
  }
}

function reportSkeleton(goalId) {
  return `# ${goalId} Report\n\n## Summary\n\nTracks implementation, evidence, and remaining work for ${goalId}. Verification is pending.\n\nStatus: in-progress\n\n<!-- Update summary on completion. Append Outcome, Changed Files, Verification, and Blockers; omit empty sections. -->\n\n## Evidence of Completion\n\nPending verification. Map every authoritative requirement/AC to its actual check, result and evidence locator before declaring completion.\n`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--") || !rest[index + 1]) {
      throw new Error(`Invalid argument: ${key}`);
    }
    const name = key.slice(2);
    if (Object.hasOwn(options, name)) {
      throw new Error(`Duplicate argument: ${key}`);
    }
    options[name] = rest[index + 1];
    index += 1;
  }
  return { command, options };
}

function assertCliOptions(command, options, allowed) {
  const unknown = Object.keys(options).find((key) => !allowed.includes(key));
  if (unknown) {
    throw new Error(`${command} contains unsupported option: --${unknown}`);
  }
}

async function readCliInput(root, candidate, options) {
  if (!candidate) {
    throw new Error(`${options.label} --input-file is required`);
  }
  const content = await readBoundedFile(root, candidate, {
    encoding: "utf8",
    label: `${options.label} input file`,
    maxBytes: MAX_CLI_INPUT_BYTES,
  });
  let value;
  try {
    value = JSON.parse(content);
  } catch (error) {
    throw new Error(`${options.label} input file must be valid JSON: ${error.message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${options.label} input file must contain an object`);
  }
  const unknown = Object.keys(value).find(
    (key) => !options.allowedFields.includes(key),
  );
  if (unknown) {
    throw new Error(`${options.label} input contains unsupported field: ${unknown}`);
  }
  const missing = options.requiredFields.find(
    (key) => !Object.hasOwn(value, key),
  );
  if (missing) {
    throw new Error(`${options.label} input is missing required field: ${missing}`);
  }
  return value;
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  let result;
  if (command === "create") {
    assertCliOptions(command, options, [
      "run",
      "goal",
      "brief",
      "paths-file",
      "input-file",
    ]);
    const input = await readCliInput(root, options["input-file"], {
      label: "create",
      allowedFields: ["expectedEvidence", "composition", "constraints", "assignment", "completionContract", "runCompletionContract"],
      requiredFields: ["expectedEvidence"],
    });
    result = await createWorkPackage(root, {
      runId: options.run,
      goalId: options.goal,
      briefPath: options.brief,
      pathsFile: options["paths-file"],
      expectedEvidence: input.expectedEvidence,
      composition: input.composition,
      constraints: input.constraints,
      assignment: input.assignment,
      completionContract: input.completionContract,
      runCompletionContract: input.runCompletionContract,
    });
  } else if (['dispatch','constraints','submit','classify','ack'].includes(command)) {
    assertCliOptions(command,options,['run','goal','input-file']);
    const fields={dispatch:['maxTokens','targetTokens'],constraints:['constraints','expectedVersion'],submit:['workerId','attempt','reportPath','evidence','expectedVersion'],classify:['receiptId','expectedVersion','status','workerAvailable'],ack:['receiptId','expectedVersion']}[command];
    const input = options['input-file'] ? await readCliInput(root,options['input-file'],{label:command,allowedFields:fields,requiredFields:command==='dispatch'?[]:command==='submit'?['workerId','attempt','reportPath','evidence']:['expectedVersion']}) : {};
    result = await ({dispatch:readDispatchContext,constraints:amendWorkPackageConstraints,submit:submitCompletionReceipt,classify:classifyCompletionReceipt,ack:acknowledgeCompletionReceipt}[command])(root,{...input,runId:options.run,goalId:options.goal});
  } else if (command === "review") {
    assertCliOptions(command, options, ["run", "goal", "base", "paths-file"]);
    result = await createReviewPackage(root, {
      runId: options.run,
      goalId: options.goal,
      baseRef: options.base,
      pathsFile: options["paths-file"],
    });
  } else if (command === "record") {
    assertCliOptions(command, options, [
      "run",
      "goal",
      "status",
      "verification",
      "input-file",
    ]);
    const input = await readCliInput(root, options["input-file"], {
      label: "record",
      allowedFields: ["expectedVersion", "evidence", "reason", "recovery", "completionContract"],
      requiredFields: ["expectedVersion"],
    });
    result = await recordWorkPackageResult(root, {
      runId: options.run,
      goalId: options.goal,
      status: options.status,
      verification: options.verification,
      expectedVersion: input.expectedVersion,
      evidence: input.evidence,
      reason: input.reason,
      recovery: input.recovery,
      completionContract: input.completionContract,
    });
  } else {
    throw new Error(
      "Usage: work-package.mjs create --run <id> --goal <id> --brief <issue> --paths-file <scope.json> --input-file <create.json> | review ... | record --run <id> --goal <id> --status <status> --input-file <transition.json>",
    );
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status === 'over_budget') process.exitCode = 2;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
