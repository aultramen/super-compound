import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  auditEvidenceFingerprint,
  auditRepository,
  parseCsvRows,
  verifyStoredAuditEvidence,
} from "./framework-audit.mjs";

test("parseCsvRows preserves quoted commas and newlines", () => {
  const rows = parseCsvRows('name,notes\nalpha,"one,two"\nbeta,"line 1\nline 2"\n');

  assert.deepEqual(rows, [
    ["name", "notes"],
    ["alpha", "one,two"],
    ["beta", "line 1\nline 2"],
  ]);
});

test("auditRepository reads every file and reports structural gaps", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "workflows"), { recursive: true });
    await mkdir(path.join(root, ".agent", "skills", "example"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".agent", "context"), { recursive: true });
    await mkdir(path.join(root, "docs"), { recursive: true });

    await writeFile(
      path.join(root, ".agent", "workflows", "sc-test.md"),
      '---\ndescription: "test"\n---\n\n# Test\n',
    );
    await writeFile(
      path.join(root, ".agent", "skills", "example", "SKILL.md"),
      '---\nname: wrong-name\ndescription: "test"\n---\n\n# Example\n',
    );
    await writeFile(
      path.join(root, ".agent", "context", "token-budget-gates.md"),
      "# Token gates\n",
    );
    await writeFile(path.join(root, "bad.json"), "{not-json}\n");
    await writeFile(path.join(root, "bad.csv"), "a,b\n1,2,3\n");
    await writeFile(
      path.join(root, "README.md"),
      "[missing](docs/absent.md)\n",
    );

    const repeated =
      "This paragraph is deliberately long enough to prove that repeated " +
      "operating instructions are detected across separate documentation files.";
    await writeFile(path.join(root, "docs", "a.md"), `## Alpha\n${repeated}\n`);
    await writeFile(path.join(root, "docs", "b.md"), `## Beta\n${repeated}\n`);
    await writeFile(path.join(root, "asset.bin"), Buffer.from([0, 1, 2, 3]));

    const report = await auditRepository(root, {
      duplicateParagraphMinChars: 80,
    });
    const codes = new Set(report.findings.map((finding) => finding.code));

    assert.equal(report.summary.filesRead, 9);
    assert.equal(report.summary.binaryFiles, 1);
    assert.equal(report.pass, false);
    assert.equal(codes.has("WORKFLOW_CONTRACT_MISSING"), true);
    assert.equal(codes.has("SKILL_NAME_MISMATCH"), true);
    assert.equal(codes.has("JSON_PARSE_ERROR"), true);
    assert.equal(codes.has("CSV_WIDTH_MISMATCH"), true);
    assert.equal(codes.has("MARKDOWN_LINK_MISSING"), true);
    assert.equal(codes.has("DUPLICATE_PARAGRAPH"), true);
    assert.equal(codes.has("OUTPUT_BUDGET_GAP"), true);
    assert.equal(codes.has("OUTPUT_BUDGET_MANIFEST_MISSING"), true);
    assert.equal(codes.has("AUDIT_CLASS_MISSING"), true);
    const serializedFindings = JSON.stringify(report.findings);
    assert.equal(serializedFindings.includes(repeated), false);
    assert.equal(serializedFindings.includes("{not-json}"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("physical inventory excludes operational runtime and isolated-worktree roots", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".scratch", "recovery"), { recursive: true });
    await mkdir(path.join(root, ".sc-worktrees", "stale"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".agent", ".compact-state"), {
      recursive: true,
    });
    await writeFile(path.join(root, "README.md"), "# Active\n");
    await writeFile(
      path.join(root, ".scratch", "recovery", "event.json"),
      "{}\n",
    );
    await writeFile(
      path.join(root, ".sc-worktrees", "stale", "README.md"),
      "# Stale\n",
    );
    await writeFile(
      path.join(root, ".agent", ".compact-state", "session.json"),
      "{}\n",
    );

    const report = await auditRepository(root);

    assert.equal(report.summary.manifestFiles, 1);
    assert.deepEqual(report.physicalInventory, {
      scope: "physical-authority-worktree-excluding-runtime-roots",
      files: 1,
      filesRead: 1,
      symlinks: 0,
      activeManifestEntries: 1,
      outsideActiveManifestEntries: 0,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("auditRepository accepts the compact support-skill catch-all", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "skills", "support-only"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".agent", "context"), { recursive: true });
    await writeFile(
      path.join(root, ".agent", "skills", "support-only", "SKILL.md"),
      '---\nname: support-only\ndescription: "loaded by catalog match"\n---\n\n# Support\n',
    );
    await writeFile(
      path.join(root, ".agent", "context", "skill-index.md"),
      "# Skills\n\n| Other support skills | load only when their description matches |\n",
    );

    const report = await auditRepository(root);

    assert.equal(
      report.findings.some((finding) => finding.code === "SKILL_INDEX_GAP"),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("auditRepository caps skill entrypoints while reporting aggregate size", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "skills", "oversized"), {
      recursive: true,
    });
    const body = Array.from({ length: 501 }, () => "word").join(" ");
    await writeFile(
      path.join(root, ".agent", "skills", "oversized", "SKILL.md"),
      `---\nname: oversized\ndescription: "Use when testing size"\n---\n\n${body}\n`,
    );

    const report = await auditRepository(root);

    assert.equal(report.summary.skillEntrypoints, 1);
    assert.ok(report.summary.skillEntrypointWords > 500);
    assert.ok(report.summary.maxSkillEntrypointWords > 500);
    assert.equal(
      report.findings.some(
        (finding) => finding.code === "SKILL_ENTRYPOINT_TOO_LARGE",
      ),
      true,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the current framework passes the all-file audit", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const report = await auditRepository(root);

  assert.equal(report.schema, "super_compound_framework_audit_v2");
  assert.deepEqual(report.findings, []);
  assert.equal(report.summary.manifestSource, "git-active-manifest");
  assert.match(report.repositoryHead, /^[a-f0-9]{40}$/);
  assert.equal(report.evidenceDigest, auditEvidenceFingerprint(report));
  assert.equal(report.summary.filesRead, report.summary.auditedFiles);
  assert.equal(
    report.summary.manifestFiles,
    report.summary.auditedFiles + report.summary.excludedFiles.length,
  );
  assert.deepEqual(report.summary.excludedFiles, [
    {
      path: ".agent/benchmarks/framework-audit.after.json",
      reason: "generated audit output",
    },
  ]);
  assert.deepEqual(report.coverage, {
    activeManifestEntries: report.summary.manifestFiles,
    byteContentAuditedEntries: report.summary.auditedFiles,
    specialVerificationEntries: report.summary.excludedFiles.length,
    accountedEntries: report.summary.manifestFiles,
    unaccountedEntries: 0,
    accountedPercent: 100,
    byteContentAuditPercent: Number(
      ((report.summary.auditedFiles / report.summary.manifestFiles) * 100).toFixed(4),
    ),
    classifiedEntries: report.summary.manifestFiles,
    unclassifiedEntries: 0,
    classCoveragePercent: 100,
    auditClassCounts: report.coverage.auditClassCounts,
    auditClassDigest: report.coverage.auditClassDigest,
    contentDigestScope: "byte-content-audited",
    specialVerificationRequired: true,
    specialEntries: [
      {
        path: ".agent/benchmarks/framework-audit.after.json",
        validator: "stored-audit-evidence-v1",
      },
    ],
  });
  assert.ok(report.coverage.auditClassCounts.workflow >= 18);
  assert.equal(report.coverage.auditClassCounts.agent, 6);
  assert.match(report.coverage.auditClassDigest, /^[a-f0-9]{64}$/);
  assert.equal(
    report.physicalInventory.files,
    report.physicalInventory.filesRead,
  );
  assert.equal(report.physicalInventory.symlinks, 0);
  assert.equal(
    report.physicalInventory.activeManifestEntries,
    report.summary.manifestFiles,
  );
  assert.equal(
    report.physicalInventory.files,
    report.physicalInventory.activeManifestEntries +
      report.physicalInventory.outsideActiveManifestEntries,
  );

  const changedTimestamp = { ...report, generatedAt: "2099-01-01T00:00:00.000Z" };
  assert.equal(auditEvidenceFingerprint(changedTimestamp), report.evidenceDigest);
  const tampered = structuredClone(report);
  tampered.summary.bytesRead += 1;
  assert.notEqual(auditEvidenceFingerprint(tampered), report.evidenceDigest);
});

test("auditRepository rejects non-deterministic benchmark evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "benchmarks"), { recursive: true });
    await writeFile(
      path.join(root, ".agent", "benchmarks", "token-benchmark.after.json"),
      JSON.stringify({
        schema: "token_benchmark_report_v3",
        repeat: 3,
        deterministic: false,
        consecutivePasses: 3,
        pass: true,
        runDigests: [{ digest: "0".repeat(64), count: 3 }],
        result: { threshold: -1, scenarios: [] },
      }),
    );

    const report = await auditRepository(root);

    assert.equal(
      report.findings.some(
        (finding) => finding.code === "BENCHMARK_EVIDENCE_INVALID",
      ),
      true,
    );
    assert.equal(
      report.findings.some(
        (finding) =>
          finding.code === "BENCHMARK_EVIDENCE_INVALID" &&
          /threshold/i.test(finding.message),
      ),
      true,
    );
    assert.equal(
      report.findings.some(
        (finding) =>
          finding.code === "BENCHMARK_EVIDENCE_INVALID" &&
          /run digest/i.test(finding.message),
      ),
      true,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generated audit evidence does not change the audited surface", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "benchmarks"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Fixture\n");
    const before = await auditRepository(root);
    assert.equal(before.summary.manifestSource, "filesystem-fallback");
    await writeFile(
      path.join(root, ".agent", "benchmarks", "framework-audit.after.json"),
      `${JSON.stringify(before, null, 2)}\n`,
    );
    await writeFile(
      path.join(root, ".agent", "benchmarks", "custom-audit.json"),
      '{"generated":true}\n',
    );
    await mkdir(path.join(root, ".agent", ".compact-state"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".scratch", "work-packages", "run"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, ".agent", ".compact-state", "session.json"),
      '{"count":1}\n',
    );
    await writeFile(
      path.join(root, ".scratch", "work-packages", "run", "review.patch"),
      "ephemeral review data\n",
    );
    const after = await auditRepository(root, {
      excludePaths: [".agent/benchmarks/custom-audit.json"],
    });

    for (const field of [
      "auditedFiles",
      "filesRead",
      "textFiles",
      "binaryFiles",
      "bytesRead",
      "linesRead",
      "contentDigest",
      "skillEntrypoints",
      "skillEntrypointWords",
      "maxSkillEntrypointWords",
      "manifestSource",
      "findings",
    ]) {
      assert.deepEqual(after.summary[field], before.summary[field], field);
    }
    assert.equal(after.summary.manifestFiles, before.summary.manifestFiles + 2);
    assert.deepEqual(after.summary.excludedFiles, [
      {
        path: ".agent/benchmarks/custom-audit.json",
        reason: "requested output path",
      },
      {
        path: ".agent/benchmarks/framework-audit.after.json",
        reason: "generated audit output",
      },
    ]);
    assert.deepEqual(after.findings, before.findings);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stored audit verification accounts for the self-generated report separately", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));
  const target = ".agent/benchmarks/framework-audit.after.json";

  try {
    await mkdir(path.join(root, ".agent", "benchmarks"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Fixture\n");
    await writeFile(path.join(root, target), "{}\n");
    const stored = await auditRepository(root, {
      excludePaths: [target],
      requireGitManifest: false,
    });
    await writeFile(path.join(root, target), `${JSON.stringify(stored, null, 2)}\n`);

    const envelope = await verifyStoredAuditEvidence(root, target, {
      requireGitManifest: false,
    });

    assert.equal(envelope.schema, "framework_audit_verification_v1");
    assert.equal(envelope.target, target);
    assert.equal(envelope.specialVerificationPass, true);
    assert.equal(envelope.accountedPercent, 100);
    assert.equal(envelope.accountedEntries, envelope.activeManifestEntries);
    assert.equal(
      envelope.byteContentAuditedEntries + envelope.speciallyVerifiedEntries,
      envelope.accountedEntries,
    );
    assert.equal(envelope.frameworkAuditPass, stored.pass);

    await writeFile(path.join(root, target), "{\"tampered\":true}\n");
    await assert.rejects(
      verifyStoredAuditEvidence(root, target, { requireGitManifest: false }),
      /digest is invalid/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stored audit verification survives committing unchanged audited content", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-commit-"));
  const target = ".agent/benchmarks/framework-audit.after.json";

  try {
    await mkdir(path.join(root, ".agent", "benchmarks"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Fixture\n");
    await writeFile(path.join(root, target), "{}\n");
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], {
      cwd: root,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: root });

    const stored = await auditRepository(root, {
      excludePaths: [target],
      requireGitManifest: true,
    });
    await writeFile(path.join(root, target), `${JSON.stringify(stored, null, 2)}\n`);
    execFileSync("git", ["add", target], { cwd: root });
    execFileSync("git", ["commit", "-qm", "store audit evidence"], {
      cwd: root,
    });
    const committedHead = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    assert.notEqual(committedHead, stored.repositoryHead);
    const envelope = await verifyStoredAuditEvidence(root, target, {
      requireGitManifest: true,
    });
    assert.equal(envelope.pass, true);
    assert.equal(envelope.repositoryHeadMatch, false);
    assert.equal(envelope.storedRepositoryHead, stored.repositoryHead);
    assert.equal(envelope.currentRepositoryHead, committedHead);
    assert.equal(
      envelope.repositoryHeadPolicy,
      "digest-bound provenance; content-based freshness",
    );

    await writeFile(path.join(root, "README.md"), "# Changed fixture\n");
    await assert.rejects(
      verifyStoredAuditEvidence(root, target, { requireGitManifest: true }),
      /stale/i,
    );
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 50,
    });
  }
});
