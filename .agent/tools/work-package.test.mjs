import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { watch, writeFileSync } from "node:fs";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {provisionCompletionFixture} from './completion-fixture.test-support.mjs';

import {
  createReviewPackage,
  createWorkPackage,
  recordWorkPackageResult,
  readDispatchContext,
  readLedger,
  withLedgerLock,
} from "./work-package.mjs";

test('stale proof blocks its consumers while independent dispatch and recovery proceed', async (t) => {
  const root=await mkdtemp(path.join(tmpdir(),'work-package-scoped-proof-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'issues'));
  await writeFile(path.join(root,'issues','a.md'),'# GOAL-001\nBlocked by: None\n');
  await writeFile(path.join(root,'issues','b.md'),'# GOAL-002\nBlocked by: None\n');
  await writeFile(path.join(root,'issues','c.md'),'# GOAL-003\nBlocked by: a.md\n');
  await writeFile(path.join(root,'scope-a.json'),'["src/a"]');
  await writeFile(path.join(root,'scope-b.json'),'["src/b"]');
  const proof=await writeCompletionEvidence(root,'GOAL-001');
  const first=await createWorkPackage(root,{runId:'run',goalId:'GOAL-001',briefPath:'issues/a.md',pathsFile:'scope-a.json',expectedEvidence:EXPECTED_EVIDENCE,completionContract:proof.completionContract});
  let version=first.ledgerVersion;
  for (const status of ['in-progress','implemented','verified']) version=(await recordWorkPackageResult(root,{runId:'run',goalId:'GOAL-001',status,expectedVersion:version,verification:'mapped checks pass',...(['implemented','verified'].includes(status)?{evidence:freshEvidence()}: {})})).ledgerVersion;
  for (const [goalId,briefPath] of [['GOAL-002','issues/b.md'],['GOAL-003','issues/c.md']]) version=(await createWorkPackage(root,{runId:'run',goalId,briefPath,pathsFile:'scope-b.json',expectedEvidence:EXPECTED_EVIDENCE})).ledgerVersion;
  assert.equal((await readDispatchContext(root,{runId:'run',goalId:'GOAL-003'})).dispatchStatus,'ready');
  const sourceBefore=await readFile(path.join(root,proof.sourcePath));
  await writeFile(path.join(root,proof.sourcePath),'changed implementation source');
  assert.equal((await readDispatchContext(root,{runId:'run',goalId:'GOAL-002'})).dispatchStatus,'ready');
  await assert.rejects(readDispatchContext(root,{runId:'run',goalId:'GOAL-003'}),/completion|stale source/i);
  await writeFile(path.join(root,proof.sourcePath),sourceBefore);
  await writeFreshEvidence(root,'changed proof');
  assert.equal((await readDispatchContext(root,{runId:'run',goalId:'GOAL-002'})).dispatchStatus,'ready');
  await assert.rejects(readDispatchContext(root,{runId:'run',goalId:'GOAL-003'}),/Evidence digest mismatch.*GOAL-001/);
  await assert.rejects(recordWorkPackageResult(root,{runId:'run',goalId:'GOAL-003',status:'in-progress',expectedVersion:version}),/Evidence digest mismatch.*GOAL-001/);
  const blocked=await recordWorkPackageResult(root,{runId:'run',goalId:'GOAL-002',status:'blocked',expectedVersion:version,reason:{code:'ACCESS',detail:'waiting for target access'}});
  assert.equal(blocked.status,'blocked');
  await assert.rejects(readLedger(root,first.ledgerPath,'run'),/Evidence digest mismatch/);
  const raw=JSON.parse(await readFile(first.ledgerPath,'utf8')); raw.goals['GOAL-001'].scopeDigest='invalid';
  await writeFile(first.ledgerPath,JSON.stringify(raw));
  await assert.rejects(readDispatchContext(root,{runId:'run',goalId:'GOAL-002'}),/scopeDigest/);
});

const EXPECTED_EVIDENCE = {
  authorityDigest: "a".repeat(64),
  evalDigest: "b".repeat(64),
  reviewerDigest: "c".repeat(64),
};
const WORK_PACKAGE_CLI = fileURLToPath(new URL("./work-package.mjs", import.meta.url));

test('failed or unassessed proof cannot promote a goal to verified', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'work-package-no-false-completion-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  await writeFile(path.join(root, 'goal.md'), '# GOAL-001\n');
  await writeFile(path.join(root, 'scope.json'), '["src"]');
  await writeFreshEvidence(root, '{"pass":false,"error":"acceptance failed"}');
  const options = {runId:'run', goalId:'GOAL-001'};
  const created = await createWorkPackage(root, {...options, briefPath:'goal.md', pathsFile:'scope.json', expectedEvidence:EXPECTED_EVIDENCE});
  await recordWorkPackageResult(root, {...options, status:'in-progress', expectedVersion:created.ledgerVersion});
  await recordWorkPackageResult(root, {...options, status:'implemented', expectedVersion:2, verification:'implementation produced', evidence:freshEvidence()});
  const before = await readFile(created.ledgerPath);
  await assert.rejects(recordWorkPackageResult(root, {...options, status:'verified', expectedVersion:3, verification:'claimed success', evidence:freshEvidence()}), /completion|criteria|outcome/i);
  assert.deepEqual(await readFile(created.ledgerPath), before, 'a denied completion must leave the ledger unchanged');
  assert.equal((await readLedger(root, created.ledgerPath, 'run', {checkEvidence:false})).goals['GOAL-001'].status, 'implemented');
});

function freshEvidence(overrides = {}) {
  return {
    ...EXPECTED_EVIDENCE,
    evidenceRefs: [".scratch/evidence/result.json"],
    ...overrides,
  };
}

async function writeFreshEvidence(root, content = '{"pass":true}\n') {
  const evidencePath = path.join(root, ".scratch", "evidence", "result.json");
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, content);
  return evidencePath;
}

async function writeCompletionEvidence(root,taskId) {
 const proof=await provisionCompletionFixture(root,{taskId,evidencePath:'.scratch/evidence/result.json'});
 return {...proof,completionContract:{path:proof.contractPath,digest:proof.contractDigest}};
}

function runWorkPackageCli(root, args) {
  return JSON.parse(
    execFileSync(process.execPath, [WORK_PACKAGE_CLI, ...args], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }),
  );
}

test("legacy verification quarantine rejects every result byte-for-byte", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-legacy-quarantine-"));
  try {
    const ledgerPath = path.join(
      root,
      ".scratch",
      "work-packages",
      "legacy-run",
      "ledger.json",
    );
    await mkdir(path.dirname(ledgerPath), { recursive: true });
    const ledger = {
      schema: "work_package_ledger_v2",
      runId: "legacy-run",
      ledgerVersion: 1,
      goals: {
        "goal-001": {
          status: "implemented",
          briefPath: ".scratch/work-packages/legacy-run/goal-001/brief.md",
          reportPath: ".scratch/work-packages/legacy-run/goal-001/report.md",
          pathsPath: ".scratch/work-packages/legacy-run/goal-001/review-paths.json",
          reviewPackagePath: ".scratch/work-packages/legacy-run/goal-001/review.patch",
          scopeDigest: "d".repeat(64),
          baselineDirty: {},
          verification: "REPLAN_REQUIRED: legacy verification is not v2 evidence",
          requiresFreshVerification: true,
        },
      },
    };
    await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    const before = await readFile(ledgerPath);

    for (const status of ["blocked", "failed", "verified"]) {
      await assert.rejects(
        recordWorkPackageResult(root, {
          runId: "legacy-run",
          goalId: "goal-001",
          expectedVersion: 1,
          status,
          verification: `attempted ${status} transition`,
          ...(status === "verified" ? { evidence: freshEvidence() } : {}),
          ...(["blocked", "failed"].includes(status)
            ? { reason: { code: "VERIFICATION", detail: "legacy evidence is stale" } }
            : {}),
        }),
        /FRESH_VERIFICATION_REPLAN_REQUIRED/,
        status,
      );
      assert.deepEqual(await readFile(ledgerPath), before, status);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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
    assert.equal(ledger.schema, "work_package_ledger_v2");
    assert.equal(ledger.ledgerVersion, 1);
    assert.equal(ledger.goals["goal-001"].status, "ready");
    assert.equal(
      ledger.goals["goal-001"].reportPath,
      ".scratch/work-packages/feature-run/goal-001/report.md",
    );
    assert.equal(
      ledger.goals["goal-001"].pathsPath,
      ".scratch/work-packages/feature-run/goal-001/review-paths.json",
    );
    assert.equal(path.isAbsolute(ledger.goals["goal-001"].briefPath), false);

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

    await writeFile(
      result.ledgerPath,
      `${JSON.stringify({ schema: "work_package_ledger_v1", runId: "feature-run", goals: {} })}\n`,
    );
    await assert.rejects(
      createWorkPackage(root, {
        runId: "feature-run",
        goalId: "goal-002",
        briefPath: brief,
        pathsFile,
      }),
      /v1|legacy|invalid work-package ledger/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("createWorkPackage retry preserves a verified goal byte-for-byte", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-idempotent-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "review-paths.json");
    const evidencePath = path.join(root, ".scratch", "evidence", "result.json");
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const proof=await writeCompletionEvidence(root,'goal-001');

    const created = await createWorkPackage(root, {
      runId: "idempotent-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
      completionContract:proof.completionContract,
    });
    await recordWorkPackageResult(root, {
      runId: "idempotent-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });
    await recordWorkPackageResult(root, {
      runId: "idempotent-run",
      goalId: "goal-001",
      expectedVersion: 2,
      status: "implemented",
      verification: "implementation evidence recorded",
      evidence: freshEvidence(),
    });
    await recordWorkPackageResult(root, {
      runId: "idempotent-run",
      goalId: "goal-001",
      expectedVersion: 3,
      status: "verified",
      verification: "review evidence recorded",
      evidence: freshEvidence(),
    });

    const {persistCheckpoint, restoreCheckpoint} = await import('./memory-maintenance.mjs');
    await persistCheckpoint({root,input:{nextAction:'retry capture', verifiedOutcomes:['goal-001 verified'], completionEvidence:{'goal-001 verified':{ledgerRef:'.scratch/work-packages/idempotent-run/ledger.json',goalId:'goal-001'}},blockers:[], artifactRefs:['goal.md'], contractRefs:['goal.md'], ledgerRefs:['.scratch/work-packages/idempotent-run/ledger.json']}});
    const resumed = await restoreCheckpoint({root});
    assert.deepEqual(resumed.dispatchable, []);
    assert.deepEqual(resumed.skippedVerified.map(g => g.id), ['goal-001']);
    const beforeRetry = await readFile(created.ledgerPath);
    const retried = await createWorkPackage(root, {
      runId: "idempotent-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
    });
    const afterRetry = await readFile(created.ledgerPath);

    assert.equal(retried.ledgerVersion, 4);
    assert.equal(retried.dispatchStatus, 'not_ready');
    assert.deepEqual(afterRetry, beforeRetry);
    const ledger = JSON.parse(afterRetry);
    assert.equal(ledger.goals["goal-001"].status, "verified");
    assert.equal(ledger.goals["goal-001"].verification, "review evidence recorded");
    assert.deepEqual(ledger.goals["goal-001"].evidence.evidenceRefs, [
      ".scratch/evidence/result.json",
    ]);
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

test("dirty snapshots preserve a literal __proto__ path and detect its drift", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-proto-path-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    const protoPath = path.join(root, "__proto__");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["allowed.txt"]\n');
    await writeFile(path.join(root, "allowed.txt"), "before\n");
    await writeFile(protoPath, "before\n");
    execFileSync("git", ["add", "goal.md", "scope.json", "allowed.txt", "__proto__"], {
      cwd: root,
    });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    await writeFile(protoPath, "dirty at package creation\n");

    const created = await createWorkPackage(root, {
      runId: "proto-path-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const ledger = JSON.parse(await readFile(created.ledgerPath, "utf8"));
    const baselineDirty = ledger.goals["goal-001"].baselineDirty;
    assert.equal(Object.hasOwn(baselineDirty, "__proto__"), true);
    assert.deepEqual(Object.keys(baselineDirty), ["__proto__"]);

    await writeFile(protoPath, "changed outside scope after package creation\n");
    await writeFile(path.join(root, "allowed.txt"), "after\n");
    await assert.rejects(
      createReviewPackage(root, {
        runId: "proto-path-run",
        goalId: "goal-001",
        baseRef: "HEAD",
        pathsFile,
      }),
      /outside scheduler-owned review scope: __proto__/i,
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

test("recordWorkPackageResult enforces ordered transitions, CAS, and fresh evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-"));

  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const proof=await writeCompletionEvidence(root,'goal-001');
    await createWorkPackage(root, {
      runId: "result-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
      completionContract:proof.completionContract,
    });

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "result-run",
        goalId: "goal-001",
        expectedVersion: 1,
        status: "verified",
        verification: "node --test: pass",
        evidence: freshEvidence(),
      }),
      /transition.*ready.*verified/i,
    );

    const started = await recordWorkPackageResult(root, {
      runId: "result-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
      verification: "execution admitted",
    });
    assert.equal(started.ledgerVersion, 2);

    const implemented = await recordWorkPackageResult(root, {
      runId: "result-run",
      goalId: "goal-001",
      expectedVersion: 2,
      status: "implemented",
      verification: "implementation evidence recorded",
      evidence: freshEvidence(),
    });
    assert.equal(implemented.ledgerVersion, 3);

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "result-run",
        goalId: "goal-001",
        expectedVersion: 2,
        status: "verified",
        verification: "node --test: pass",
        evidence: freshEvidence(),
      }),
      /CAS conflict/i,
    );
    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "result-run",
        goalId: "goal-001",
        expectedVersion: 3,
        status: "verified",
        verification: "node --test: pass",
        evidence: freshEvidence({ authorityDigest: "d".repeat(64) }),
      }),
      /stale authority digest/i,
    );
    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "result-run",
        goalId: "goal-001",
        expectedVersion: 3,
        status: "verified",
        verification: "   ",
        evidence: freshEvidence(),
      }),
      /blank verification evidence/i,
    );

    const result = await recordWorkPackageResult(root, {
      runId: "result-run",
      goalId: "goal-001",
      expectedVersion: 3,
      status: "verified",
      verification: "node --test: pass",
      evidence: freshEvidence(),
    });
    const ledger = JSON.parse(await readFile(result.ledgerPath, "utf8"));

    assert.equal(result.ledgerVersion, 4);
    assert.equal(ledger.goals["goal-001"].status, "verified");
    assert.equal(
      ledger.goals["goal-001"].verification,
      "node --test: pass",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recordWorkPackageResult rejects missing evidence without changing the ledger", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-missing-evidence-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const created = await createWorkPackage(root, {
      runId: "missing-evidence-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
    });
    await recordWorkPackageResult(root, {
      runId: "missing-evidence-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });
    const beforeAttempt = await readFile(created.ledgerPath);

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "missing-evidence-run",
        goalId: "goal-001",
        expectedVersion: 2,
        status: "implemented",
        verification: "missing evidence must not authorize implementation",
        evidence: freshEvidence(),
      }),
      /file does not exist/i,
    );

    assert.deepEqual(await readFile(created.ledgerPath), beforeAttempt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recordWorkPackageResult rejects mutable work-package control-state evidence by platform identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-control-evidence-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const created = await createWorkPackage(root, {
      runId: "control-evidence-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
    });
    await recordWorkPackageResult(root, {
      runId: "control-evidence-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });
    const beforeAttempt = await readFile(created.ledgerPath);
    const controlRefs = [
      ".scratch/work-packages/control-evidence-run/ledger.json",
      ".scratch/work-packages/control-evidence-run/ledger.json.lock/owner",
      ...(process.platform === "win32"
        ? [
            ".scratch/WORK-PACKAGES/control-evidence-run/LEDGER.JSON",
            ".scratch/WORK-PACKAGES/control-evidence-run/LEDGER.JSON.LOCK/OWNER",
          ]
        : []),
    ];

    for (const evidenceRef of controlRefs) {
      await assert.rejects(
        recordWorkPackageResult(root, {
          runId: "control-evidence-run",
          goalId: "goal-001",
          expectedVersion: 2,
          status: "implemented",
          verification: "mutable control state must not authorize implementation",
          evidence: freshEvidence({ evidenceRefs: [evidenceRef] }),
        }),
        /mutable work-package control state/i,
        evidenceRef,
      );
      assert.deepEqual(await readFile(created.ledgerPath), beforeAttempt);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recordWorkPackageResult rechecks evidence after the durable ledger commit", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-post-commit-evidence-"));
  let watcher;
  let mutationTimeout;
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const evidencePath = await writeFreshEvidence(root);
    const created = await createWorkPackage(root, {
      runId: "post-commit-evidence-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
    });
    await recordWorkPackageResult(root, {
      runId: "post-commit-evidence-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });

    const mutationObserved = new Promise((resolve, reject) => {
      mutationTimeout = setTimeout(
        () => reject(new Error("Timed out waiting for the durable ledger commit")),
        5_000,
      );
      watcher = watch(path.dirname(created.ledgerPath), (_eventType, filename) => {
        if (String(filename) !== path.basename(created.ledgerPath)) return;
        watcher.close();
        watcher = undefined;
        clearTimeout(mutationTimeout);
        mutationTimeout = undefined;
        writeFileSync(evidencePath, '{"pass":"changed-at-commit"}\n');
        resolve();
      });
    });
    const recording = recordWorkPackageResult(root, {
      runId: "post-commit-evidence-run",
      goalId: "goal-001",
      expectedVersion: 2,
      status: "implemented",
      verification: "evidence must remain fresh across the durable commit",
      evidence: freshEvidence(),
    }).then(
      (value) => ({ status: "fulfilled", value }),
      (error) => ({ status: "rejected", error }),
    );

    await mutationObserved;
    const outcome = await recording;
    assert.equal(outcome.status, "rejected");
    assert.match(outcome.error.message, /evidence.*digest mismatch/i);
  } finally {
    clearTimeout(mutationTimeout);
    watcher?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('proof drift during verified commit is quarantined before completion is returned', async (t) => {
  const root=await mkdtemp(path.join(tmpdir(),'work-package-verified-commit-drift-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(path.join(root,'goal.md'),'# Goal\n');
  await writeFile(path.join(root,'scope.json'),'["src"]');
  const proof=await writeCompletionEvidence(root,'goal-001');
  const common={runId:'run',goalId:'goal-001'};
  const created=await createWorkPackage(root,{...common,briefPath:'goal.md',pathsFile:'scope.json',expectedEvidence:EXPECTED_EVIDENCE,completionContract:proof.completionContract});
  await recordWorkPackageResult(root,{...common,status:'in-progress',expectedVersion:1});
  await recordWorkPackageResult(root,{...common,status:'implemented',expectedVersion:2,verification:'actual outcome asserted',evidence:freshEvidence()});
  let watcher,timeout;
  try {
    const mutated=new Promise((resolve,reject)=>{
      timeout=setTimeout(()=>reject(new Error('verified commit not observed')),5000);
      watcher=watch(path.dirname(created.ledgerPath),(_event,name)=>{
        if (String(name)!==path.basename(created.ledgerPath)) return;
        watcher.close(); watcher=undefined; clearTimeout(timeout);
        writeFileSync(path.join(root,proof.evidencePath),'{"pass":false,"error":"changed during commit"}');
        resolve();
      });
    });
    const transition=recordWorkPackageResult(root,{...common,status:'verified',expectedVersion:3,verification:'actual verification',evidence:freshEvidence()});
    await assert.rejects(transition,/evidence.*digest mismatch/i);
    await mutated;
    const ledger=await readLedger(root,created.ledgerPath,'run',{checkEvidence:false});
    assert.equal(ledger.goals['goal-001'].status,'blocked');
    assert.equal(ledger.goals['goal-001'].statusReason.code,'COMPLETION_DRIFT');
    assert.ok(ledger.goals['goal-001'].quarantinedEvidence);
    assert.equal(ledger.goals['goal-001'].evidence,undefined);
    assert.equal(ledger.ledgerVersion,5);
  } finally {clearTimeout(timeout);watcher?.close();}
});

test("ledger version overflow is rejected before any bytes change", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-version-overflow-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const created = await createWorkPackage(root, {
      runId: "overflow-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const ledger = JSON.parse(await readFile(created.ledgerPath, "utf8"));
    ledger.ledgerVersion = Number.MAX_SAFE_INTEGER;
    await writeFile(created.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    const beforeAttempt = await readFile(created.ledgerPath);

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "overflow-run",
        goalId: "goal-001",
        expectedVersion: Number.MAX_SAFE_INTEGER,
        status: "in-progress",
      }),
      /ledger version.*safe integer|cannot increment/i,
    );

    assert.deepEqual(await readFile(created.ledgerPath), beforeAttempt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("terminal evidence is digest-bound and rehashed before reuse", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-evidence-digest-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const proof=await writeCompletionEvidence(root,'goal-001');
    const evidencePath=path.join(root,proof.evidencePath);
    const originalEvidence=await readFile(evidencePath);
    const created = await createWorkPackage(root, {
      runId: "digest-bound-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
      completionContract:proof.completionContract,
    });
    await recordWorkPackageResult(root, {
      runId: "digest-bound-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });
    await recordWorkPackageResult(root, {
      runId: "digest-bound-run",
      goalId: "goal-001",
      expectedVersion: 2,
      status: "implemented",
      verification: "implementation evidence recorded",
      evidence: freshEvidence(),
    });
    const implementedLedger = JSON.parse(await readFile(created.ledgerPath, "utf8"));
    assert.deepEqual(
      implementedLedger.goals["goal-001"].evidence.evidenceArtifacts.map(
        ({ path: artifactPath }) => artifactPath,
      ),
      [".scratch/evidence/result.json"],
    );
    assert.match(
      implementedLedger.goals["goal-001"].evidence.evidenceArtifacts[0].digest,
      /^[a-f0-9]{64}$/,
    );

    await writeFile(evidencePath, '{"pass":false}\n');
    const beforeRejectedVerification = await readFile(created.ledgerPath);
    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "digest-bound-run",
        goalId: "goal-001",
        expectedVersion: 3,
        status: "verified",
        verification: "mutated evidence must not verify",
        evidence: freshEvidence(),
      }),
      /evidence.*digest mismatch/i,
    );
    assert.deepEqual(await readFile(created.ledgerPath), beforeRejectedVerification);

    await writeFile(evidencePath, originalEvidence);
    await recordWorkPackageResult(root, {
      runId: "digest-bound-run",
      goalId: "goal-001",
      expectedVersion: 3,
      status: "verified",
      verification: "fresh evidence verified",
      evidence: freshEvidence(),
    });
    await writeFile(evidencePath, '{"pass":"changed-after-verification"}\n');
    const verifiedBytes=await readFile(created.ledgerPath);
    await createWorkPackage(root, {
      runId: "digest-bound-run", goalId: "goal-001", briefPath: brief,
      pathsFile, expectedEvidence: EXPECTED_EVIDENCE,
    });
    assert.deepEqual(await readFile(created.ledgerPath),verifiedBytes);
    await assert.rejects(
      readDispatchContext(root, {runId:"digest-bound-run",goalId:"goal-001"}),
      /evidence.*digest mismatch/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("terminal evidence rejects symlinked and oversized files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-evidence-safety-"));
  const outside = await mkdtemp(path.join(tmpdir(), "work-package-evidence-outside-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    await writeFile(path.join(outside, "result.json"), '{"pass":true}\n');
    await mkdir(path.join(root, ".scratch"), { recursive: true });
    await symlink(
      outside,
      path.join(root, ".scratch", "evidence-link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const created = await createWorkPackage(root, {
      runId: "evidence-safety-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
      expectedEvidence: EXPECTED_EVIDENCE,
    });
    await recordWorkPackageResult(root, {
      runId: "evidence-safety-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "in-progress",
    });

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "evidence-safety-run",
        goalId: "goal-001",
        expectedVersion: 2,
        status: "implemented",
        verification: "symlink evidence must fail",
        evidence: freshEvidence({
          evidenceRefs: [".scratch/evidence-link/result.json"],
        }),
      }),
      /symlink/i,
    );

    await writeFreshEvidence(root, Buffer.alloc(2 * 1024 * 1024 + 1));
    const beforeOversizedAttempt = await readFile(created.ledgerPath);
    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "evidence-safety-run",
        goalId: "goal-001",
        expectedVersion: 2,
        status: "implemented",
        verification: "oversized evidence must fail",
        evidence: freshEvidence(),
      }),
      /exceeds 2097152 bytes/i,
    );
    assert.deepEqual(await readFile(created.ledgerPath), beforeOversizedAttempt);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("CLI JSON inputs drive the complete recovery and verification lifecycle", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-cli-"));
  try {
    await writeFile(path.join(root, "goal.md"), "# Goal\n");
    await writeFile(path.join(root, "scope.json"), '["src"]\n');
    const proof=await writeCompletionEvidence(root,'goal-001');
    const inputs = {
      create: { expectedEvidence: EXPECTED_EVIDENCE,completionContract:proof.completionContract },
      blocked: {
        expectedVersion: 1,
        reason: { code: "DEPENDENCY", detail: "upstream evidence missing" },
      },
      ready: {
        expectedVersion: 2,
        recovery: {
          code: "DEPENDENCY_RESOLVED",
          evidenceRef: ".scratch/evidence/result.json",
        },
      },
      started: { expectedVersion: 3 },
      implemented: { expectedVersion: 4, evidence: freshEvidence() },
      verified: { expectedVersion: 5, evidence: freshEvidence() },
    };
    for (const [name, value] of Object.entries(inputs)) {
      await writeFile(path.join(root, `${name}.json`), `${JSON.stringify(value)}\n`);
    }

    const created = runWorkPackageCli(root, [
      "create",
      "--run",
      "cli-run",
      "--goal",
      "goal-001",
      "--brief",
      "goal.md",
      "--paths-file",
      "scope.json",
      "--input-file",
      "create.json",
    ]);
    assert.equal(created.ledgerVersion, 1);

    for (const [status, inputName, verification] of [
      ["blocked", "blocked.json", "dependency recorded"],
      ["ready", "ready.json", "recovery recorded"],
      ["in-progress", "started.json", "execution admitted"],
      ["implemented", "implemented.json", "implementation verified"],
      ["verified", "verified.json", "fresh review passed"],
    ]) {
      runWorkPackageCli(root, [
        "record",
        "--run",
        "cli-run",
        "--goal",
        "goal-001",
        "--status",
        status,
        "--verification",
        verification,
        "--input-file",
        inputName,
      ]);
    }

    const ledger = JSON.parse(await readFile(created.ledgerPath, "utf8"));
    assert.equal(ledger.ledgerVersion, 6);
    assert.equal(ledger.goals["goal-001"].status, "verified");
    assert.equal(ledger.goals["goal-001"].statusReason.code, "DEPENDENCY");
    assert.equal(ledger.goals["goal-001"].recovery.code, "DEPENDENCY_RESOLVED");
    assert.match(
      ledger.goals["goal-001"].evidence.evidenceArtifacts[0].digest,
      /^[a-f0-9]{64}$/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI input files reject missing, malformed, oversized, and unknown fields", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-cli-invalid-"));
  try {
    await writeFile(path.join(root, "goal.md"), "# Goal\n");
    await writeFile(path.join(root, "scope.json"), '["src"]\n');
    await writeFile(path.join(root, "malformed.json"), "{not-json\n");
    await writeFile(
      path.join(root, "unknown.json"),
      `${JSON.stringify({ expectedEvidence: EXPECTED_EVIDENCE, surprise: true })}\n`,
    );
    await writeFile(path.join(root, "oversized.json"), "x".repeat(64 * 1024 + 1));
    const createArgs = [
      "create",
      "--run",
      "invalid-cli-run",
      "--goal",
      "goal-001",
      "--brief",
      "goal.md",
      "--paths-file",
      "scope.json",
    ];

    assert.throws(
      () => runWorkPackageCli(root, createArgs),
      /input-file is required/i,
    );
    assert.throws(
      () => runWorkPackageCli(root, [...createArgs, "--input-file", "malformed.json"]),
      /must be valid JSON/i,
    );
    assert.throws(
      () => runWorkPackageCli(root, [...createArgs, "--input-file", "unknown.json"]),
      /unsupported field: surprise/i,
    );
    assert.throws(
      () => runWorkPackageCli(root, [...createArgs, "--input-file", "oversized.json"]),
      /exceeds 65536 bytes/i,
    );
    assert.throws(
      () => runWorkPackageCli(root, [...createArgs, "--unknown", "value"]),
      /unsupported option: --unknown/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("blocked and failed transitions require typed reasons and recovery evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-recovery-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    await createWorkPackage(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });

    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "recovery-run",
        goalId: "goal-001",
        expectedVersion: 1,
        status: "blocked",
      }),
      /typed status reason/i,
    );
    await recordWorkPackageResult(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      expectedVersion: 1,
      status: "blocked",
      reason: { code: "DEPENDENCY", detail: "upstream evidence missing" },
    });
    await assert.rejects(
      recordWorkPackageResult(root, {
        runId: "recovery-run",
        goalId: "goal-001",
        expectedVersion: 2,
        status: "ready",
      }),
      /typed recovery evidence/i,
    );
    await recordWorkPackageResult(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      expectedVersion: 2,
      status: "ready",
      recovery: {
        code: "DEPENDENCY_RESOLVED",
        evidenceRef: ".scratch/evidence/dependency.json",
      },
    });
    await recordWorkPackageResult(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      expectedVersion: 3,
      status: "in-progress",
    });
    await recordWorkPackageResult(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      expectedVersion: 4,
      status: "failed",
      reason: { code: "VERIFICATION", detail: "targeted test failed" },
    });
    const recovered = await recordWorkPackageResult(root, {
      runId: "recovery-run",
      goalId: "goal-001",
      expectedVersion: 5,
      status: "ready",
      recovery: {
        code: "FIX_PLANNED",
        evidenceRef: ".scratch/evidence/fix-plan.json",
      },
    });
    const ledger = JSON.parse(await readFile(recovered.ledgerPath, "utf8"));
    assert.equal(ledger.goals["goal-001"].status, "ready");
    assert.equal(ledger.goals["goal-001"].statusReason.code, "VERIFICATION");
    assert.equal(ledger.goals["goal-001"].recovery.code, "FIX_PLANNED");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("concurrent create preserves every goal under the owner lock", async () => {
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

    assert.equal(createdLedger.ledgerVersion, goalIds.length);
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 50,
    });
  }
});

test("ledger reader rejects unknown fields, invalid states, and absolute stored paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "work-package-invalid-ledger-"));
  try {
    const brief = path.join(root, "goal.md");
    const pathsFile = path.join(root, "scope.json");
    await writeFile(brief, "# Goal\n");
    await writeFile(pathsFile, '["src"]\n');
    const created = await createWorkPackage(root, {
      runId: "invalid-run",
      goalId: "goal-001",
      briefPath: brief,
      pathsFile,
    });
    const valid = JSON.parse(await readFile(created.ledgerPath, "utf8"));
    const variants = [
      { ...valid, unexpected: true },
      {
        ...valid,
        goals: {
          ...valid.goals,
          "goal-001": { ...valid.goals["goal-001"], status: "done" },
        },
      },
      {
        ...valid,
        goals: {
          ...valid.goals,
          "goal-001": {
            ...valid.goals["goal-001"],
            reportPath: path.join(root, "absolute-report.md"),
          },
        },
      },
    ];

    for (const ledger of variants) {
      await writeFile(created.ledgerPath, `${JSON.stringify(ledger)}\n`);
      await assert.rejects(
        createWorkPackage(root, {
          runId: "invalid-run",
          goalId: "goal-002",
          briefPath: brief,
          pathsFile,
        }),
        /invalid work-package ledger|unsupported ledger field|repository-relative/i,
      );
    }
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

test('composer preserves mandatory content and exposes mandatory overflow', async () => {
  const {composePayload} = await import('./work-package.mjs');
  assert.equal(typeof composePayload, 'function');
  const mandatory = '# Requirements\nAC-1 must pass\nScope: src/a\nBlocker: approval';
  const result = composePayload({mandatory, background: [{text: 'optional '.repeat(100), ref: 'docs/design.md'}], maxTokens: 100});
  assert.ok(result.text.includes(mandatory));
  assert.ok(result.text.includes('docs/design.md'));
  assert.equal(result.omissions.length, 1);
  assert.equal(composePayload({mandatory, background: [], maxTokens: 1}).status, 'over_budget');
});

test('work-package creation reports overflow before writing any package', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'compose-overflow-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  await writeFile(path.join(root,'goal.md'), '# Requirements\nAC-1 required\nScope: src/a\nBlocker: owner');
  const result = await createWorkPackage(root,{runId:'run-1',goalId:'goal-1',briefPath:'goal.md',composition:{maxTokens:1}});
  assert.equal(result.status,'over_budget');
  await assert.rejects(readFile(path.join(root,'.scratch/work-packages/run-1/ledger.json')), /ENOENT/);
});

test('optional background pointers cannot overflow a valid mandatory payload', async () => {
  const {composePayload} = await import('./work-package.mjs');
  const mandatory = 'm'.repeat(7900);
  const background = Array.from({length: 20}, (_, index) => ({
    text: 'optional '.repeat(100), ref: `docs/background-${index}.md`,
  }));
  const result = composePayload({mandatory, background, maxTokens: 2000});
  assert.equal(result.status, 'within_budget');
  assert.ok(result.estimatedTokens <= 2000);
  assert.ok(result.text.startsWith(mandatory));
  assert.equal(result.omissions.length, 20);
  assert.ok(result.omissions.some(item => item.reason === 'optional_background_omitted'));
});

test('mandatory content sets the minimum soft allowance but cannot bypass an explicit cap', async () => {
  const {composePayload} = await import('./work-package.mjs');
  const mandatory = 'required '.repeat(1200);
  const soft = composePayload({mandatory});
  assert.equal(soft.status, 'within_budget');
  assert.equal(soft.text, mandatory);
  assert.equal(soft.maxTokens, soft.mandatoryTokens);
  assert.ok(soft.maxTokens > 2000);
  const hard = composePayload({mandatory, maxTokens: 2000});
  assert.equal(hard.status, 'over_budget');
  assert.equal(hard.text, mandatory);
  assert.equal(hard.maxTokens, 2000);
  const advisory = composePayload({mandatory, targetTokens: 10, background:[{text:'optional '.repeat(900),ref:'docs/context.md'}]});
  assert.equal(advisory.status, 'within_budget');
  assert.ok(advisory.text.startsWith(mandatory));
  assert.equal(advisory.targetExceeded,true);
  assert.equal(advisory.hardLimit,null);
  assert.equal(advisory.omissions.length,1);
  const constrained=composePayload({mandatory,targetTokens:100000,maxTokens:1});
  assert.equal(constrained.status,'over_budget');
  assert.equal(constrained.maxTokens,1);
  assert.throws(()=>composePayload({mandatory,targetTokens:0}),/targetTokens/);
});

test('CLI overflow exits unsuccessfully with dispatch recovery and no package writes', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'compose-cli-overflow-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await writeFile(path.join(root, 'goal.md'), '# Requirements\nAC-1 must pass\n');
  await writeFile(path.join(root, 'scope.json'), '["src"]');
  await writeFile(path.join(root, 'create.json'), JSON.stringify({
    expectedEvidence: EXPECTED_EVIDENCE, composition: {maxTokens: 1},
  }));
  const args = ['create', '--run', 'run-1', '--goal', 'goal-1', '--brief', 'goal.md',
    '--paths-file', 'scope.json', '--input-file', 'create.json'];
  const failed = spawnSync(process.execPath, [WORK_PACKAGE_CLI, ...args], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(failed.status, 2);
  const result = JSON.parse(failed.stdout);
  assert.equal(result.status, 'over_budget');
  assert.equal(result.dispatchStatus, 'blocked');
  assert.equal(result.recovery.action, 'recompose');
  assert.ok(result.recovery.minimumTokens > 1);
  await assert.rejects(access(path.join(root, '.scratch')), /ENOENT/);
  // The owning route can retry without a hard cap, preserving all requirements.
  await writeFile(path.join(root, 'create.json'), JSON.stringify({
    expectedEvidence: EXPECTED_EVIDENCE, composition: {},
  }));
  const recovered = runWorkPackageCli(root, args);
  assert.equal(recovered.dispatchStatus, 'ready');
  assert.equal(await readFile(recovered.briefPath, 'utf8'), await readFile(path.join(root, 'goal.md'), 'utf8'));
});
