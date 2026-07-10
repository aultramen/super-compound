import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBenchmarkReport,
  countSkillMetadataTokens,
  countScenarioTokens,
  DEFAULT_SCENARIOS,
  evaluateScenarios,
  estimateTokens,
  expandPatterns,
  formatTable,
  resolveBenchmarkOutputPath,
  resolveRepositoryPath,
} from "./token-benchmark.mjs";

function sampleRun({ pass = true, afterTokens = 50 } = {}) {
  return {
    metric: "test_metric",
    threshold: 90,
    generatedAt: "ignored-per-run-time",
    scenarios: [
      {
        name: "sample",
        description: "sample scenario",
        before: { tokens: 1000, chars: 4000, bytes: 4000, fileCount: 1 },
        after: { tokens: afterTokens, chars: 200, bytes: 200, fileCount: 1 },
        reductionPercent: ((1000 - afterTokens) / 1000) * 100,
        pass,
      },
    ],
    summary: {
      pass,
      totalBeforeTokens: 1000,
      totalAfterTokens: afterTokens,
      totalReductionPercent: ((1000 - afterTokens) / 1000) * 100,
    },
  };
}

test("estimateTokens is deterministic and non-zero for prose", () => {
  const text = "Load only compact contracts before full procedures.";

  assert.equal(estimateTokens(text), estimateTokens(text));
  assert.ok(estimateTokens(text) > 0);
});

test("formatTable distinguishes reduction gates from absolute budgets", () => {
  const result = sampleRun();
  result.scenarios.push({
    name: "startup",
    description: "absolute startup budget",
    before: { tokens: 10, chars: 40, bytes: 40, fileCount: 1 },
    after: { tokens: 10, chars: 40, bytes: 40, fileCount: 1 },
    gateType: "budget",
    maxAfterTokens: 20,
    pass: true,
  });

  const table = formatTable(result);

  assert.match(table, /Reduction gates: >90%/);
  assert.match(table, /Budget gates: scenario-specific maximum/);
  assert.match(table, /REDUCTION TOTAL/);
  assert.doesNotMatch(table, /every scenario must reduce/);
});

test("expandPatterns resolves explicit files and recursive globs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await mkdir(path.join(root, "docs", "nested"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "root");
    await writeFile(path.join(root, "docs", "a.md"), "alpha");
    await writeFile(path.join(root, "docs", "nested", "b.md"), "beta");
    await writeFile(path.join(root, "docs", "skip.txt"), "skip");

    const files = await expandPatterns(root, ["README.md", "docs/**/*.md"]);

    assert.deepEqual(files, [
      "README.md",
      "docs/a.md",
      "docs/nested/b.md",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("countScenarioTokens fingerprints same-size semantic changes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    const target = path.join(root, "surface.md");
    await writeFile(target, "alpha\n");
    const first = await countScenarioTokens(root, ["surface.md"]);
    await writeFile(target, "bravo\n");
    const second = await countScenarioTokens(root, ["surface.md"]);

    assert.equal(first.tokens, second.tokens);
    assert.equal(first.bytes, second.bytes);
    assert.notEqual(first.contentDigest, second.contentDigest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolveRepositoryPath confines outputs and rejects symlinks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    assert.equal(
      await resolveRepositoryPath(root, ".agent/report.json"),
      path.join(root, ".agent", "report.json"),
    );
    await assert.rejects(
      resolveRepositoryPath(root, "../outside.json"),
      /outside repository root/i,
    );
    await assert.rejects(
      resolveBenchmarkOutputPath(root, "package.json"),
      /\.agent\/benchmarks/i,
    );
    assert.equal(
      await resolveBenchmarkOutputPath(
        root,
        ".agent/benchmarks/report.json",
      ),
      path.join(root, ".agent", "benchmarks", "report.json"),
    );
    if (process.platform !== "win32") {
      const outside = await mkdtemp(path.join(tmpdir(), "token-outside-"));
      try {
        await symlink(outside, path.join(root, "linked"), "dir");
        await assert.rejects(
          resolveRepositoryPath(root, "linked/report.json"),
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

test("countSkillMetadataTokens ignores on-demand skill bodies", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    const skillDir = path.join(root, ".agent", "skills", "sample");
    await mkdir(skillDir, { recursive: true });
    const frontmatter =
      '---\nname: sample\ndescription: "Use when sample work is active."\n---\n';
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      `${frontmatter}${"large body ".repeat(1000)}`,
    );
    const first = await countSkillMetadataTokens(root);
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      `${frontmatter}${"different body ".repeat(2000)}`,
    );
    const second = await countSkillMetadataTokens(root);

    assert.equal(first.tokens, second.tokens);
    assert.equal(first.fileCount, 1);
    assert.ok(first.tokens < 30);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluateScenarios reports pass when reduction exceeds threshold", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await mkdir(path.join(root, "before"), { recursive: true });
    await mkdir(path.join(root, "after"), { recursive: true });
    await writeFile(path.join(root, "before", "large.md"), "word ".repeat(1000));
    await writeFile(path.join(root, "after", "small.md"), "word ".repeat(50));

    const scenario = {
      name: "sample",
      before: ["before/*.md"],
      after: ["after/*.md"],
    };
    const baseline = {
      sample: await countScenarioTokens(root, scenario.before),
    };
    const result = await evaluateScenarios(root, [scenario], baseline, 90);

    assert.equal(result.summary.pass, true);
    assert.ok(result.scenarios[0].reductionPercent > 90);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluateScenarios rejects missing explicit and glob surfaces", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await writeFile(path.join(root, "before.md"), "word ".repeat(100));
    const baseline = {
      missing: await countScenarioTokens(root, ["before.md"]),
    };

    await assert.rejects(
      evaluateScenarios(
        root,
        [{ name: "missing", before: ["before.md"], after: ["absent.md"] }],
        baseline,
        90,
      ),
      /matched no files.*absent\.md/i,
    );
    await assert.rejects(
      evaluateScenarios(
        root,
        [{ name: "missing", before: ["before.md"], after: ["none\/*.md"] }],
        baseline,
        90,
      ),
      /matched no files.*none\/\*\.md/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluateScenarios rejects thresholds below the evidence contract", async () => {
  await assert.rejects(
    evaluateScenarios(process.cwd(), [], {}, -1),
    /between 90 and 100/i,
  );
  await assert.rejects(
    evaluateScenarios(process.cwd(), [], {}, 100),
    /between 90 and 100/i,
  );
});

test("evaluateScenarios enforces absolute startup token budgets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await mkdir(path.join(root, "startup"), { recursive: true });
    await writeFile(path.join(root, "startup", "AGENTS.md"), "word ".repeat(20));
    const scenario = {
      name: "startup-test",
      before: ["startup/AGENTS.md"],
      after: ["startup/AGENTS.md"],
      maxAfterTokens: 25,
    };

    const passing = await evaluateScenarios(root, [scenario], {}, 90);
    const failing = await evaluateScenarios(
      root,
      [{ ...scenario, maxAfterTokens: 10 }],
      {},
      90,
    );

    assert.equal(passing.scenarios[0].gateType, "budget");
    assert.equal(passing.scenarios[0].pass, true);
    assert.equal(failing.scenarios[0].pass, false);
    assert.equal(passing.summary.budgetScenarioCount, 1);
    assert.equal(passing.summary.reductionScenarioCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("default benchmark covers all workflows and related hotspots", () => {
  const names = new Set(DEFAULT_SCENARIOS.map((scenario) => scenario.name));
  const workflows = [
    "sc-init",
    "sc-status",
    "sc-geniusloop",
    "sc-explore",
    "sc-research",
    "sc-prd",
    "sc-plan",
    "sc-eval",
    "sc-go",
    "sc-work",
    "sc-debug",
    "sc-review",
    "sc-audit",
    "sc-compound",
    "sc-pause",
    "sc-launch",
    "sc-ui",
  ];
  const relatedHotspots = [
    "legacy-eager-preload",
    "startup-codex-repository",
    "startup-claude-repository",
    "startup-antigravity-rules",
    "startup-installed-skill-metadata",
    "artifact-output-brd-prd-fsd-issue",
    "related-all-skills",
    "related-delivery-planning-skills",
    "related-execution-verification-skills",
    "related-risk-audit-skills",
    "related-agentic-templates",
    "related-git-workflow",
    "related-interface-data",
    "related-interface-scripts",
    "related-hooks",
    "related-agents",
    "related-all-workflows",
    "related-rules",
  ];

  for (const name of [...workflows, ...relatedHotspots]) {
    assert.equal(names.has(name), true, `missing benchmark scenario: ${name}`);
  }
});

test("buildBenchmarkReport stores one canonical result for deterministic repeats", () => {
  const report = buildBenchmarkReport([sampleRun(), sampleRun()], {
    generatedAt: "2026-07-10T00:00:00.000Z",
  });

  assert.equal(report.schema, "token_benchmark_report_v2");
  assert.equal(report.repeat, 2);
  assert.equal(report.deterministic, true);
  assert.equal(report.pass, true);
  assert.equal(report.consecutivePasses, 2);
  assert.equal(report.observedRuntimeTokens, "unknown");
  assert.equal(report.hostInjectedSurfaceTokens, "unknown");
  assert.equal(report.runs, undefined);
  assert.equal(report.runDigests.length, 1);
  assert.equal(report.runDigests[0].count, 2);
  assert.deepEqual(report.result.scenarios[0], {
    name: "sample",
    beforeTokens: 1000,
    afterTokens: 50,
    reductionPercent: 95,
    pass: true,
  });
});

test("buildBenchmarkReport fails nondeterministic runs and counts the trailing streak", () => {
  const report = buildBenchmarkReport([
    sampleRun(),
    sampleRun({ pass: false, afterTokens: 150 }),
    sampleRun(),
  ]);

  assert.equal(report.deterministic, false);
  assert.equal(report.consecutivePasses, 1);
  assert.equal(report.pass, false);
});
