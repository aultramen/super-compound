import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditRepository, parseCsvRows } from "./framework-audit.mjs";

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
    const serializedFindings = JSON.stringify(report.findings);
    assert.equal(serializedFindings.includes(repeated), false);
    assert.equal(serializedFindings.includes("{not-json}"), false);
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

  assert.deepEqual(report.findings, []);
  assert.ok(report.summary.filesRead >= 170);
});

test("auditRepository rejects non-deterministic benchmark evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "framework-audit-"));

  try {
    await mkdir(path.join(root, ".agent", "benchmarks"), { recursive: true });
    await writeFile(
      path.join(root, ".agent", "benchmarks", "token-benchmark.after.json"),
      JSON.stringify({
        schema: "token_benchmark_report_v2",
        repeat: 3,
        deterministic: false,
        consecutivePasses: 3,
        pass: true,
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
          /digest/i.test(finding.message),
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

    assert.deepEqual(after.summary, before.summary);
    assert.deepEqual(after.findings, before.findings);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
