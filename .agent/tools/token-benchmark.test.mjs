import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildBenchmarkReport,
  countSkillMetadataTokens,
  countScenarioTokens,
  DEFAULT_SCENARIOS,
  digestBenchmarkSuite,
  evaluateScenarios,
  estimateTokens,
  expandPatterns,
  formatTable,
  resolveBenchmarkOutputPath,
  resolveRepositoryPath,
  validateBaselineProvenance,
} from "./token-benchmark.mjs";
import { buildWorkflowEvidenceMatrix } from "./evidence-matrix.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function sampleRun({ pass = true, afterTokens = 50 } = {}) {
  return {
    metric: "test_metric",
    threshold: 90,
    generatedAt: "ignored-per-run-time",
    scenarios: [
      {
        name: "sample",
        stage: "process",
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
      minimumReductionPercent: ((1000 - afterTokens) / 1000) * 100,
      aggregation: "scenario-weighted",
      stages: {
        process: {
          pass,
          reductionScenarioCount: 1,
          budgetScenarioCount: 0,
          totalBeforeTokens: 1000,
          totalAfterTokens: afterTokens,
          totalReductionPercent: ((1000 - afterTokens) / 1000) * 100,
          minimumReductionPercent: ((1000 - afterTokens) / 1000) * 100,
          aggregation: "scenario-weighted",
        },
      },
    },
  };
}

function sampleStaticEvidence() {
  const scenarios = DEFAULT_SCENARIOS.filter(
    ({ semanticContract }) => typeof semanticContract === "string",
  );
  const benchmarkResult = {
    threshold: 90,
    scenarios: scenarios.map(({ name, stage }, index) => ({
      name,
      stage,
      gateType: "reduction",
      before: { tokens: 1_000 + index },
      after: {
        tokens: 50,
        contentDigest: `${index.toString(16)}`.padStart(64, "0"),
      },
      reductionPercent: ((950 + index) / (1_000 + index)) * 100,
      pass: true,
    })),
  };
  const workflowInvariants = {
    schema: "workflow_invariants_v2",
    routes: Object.fromEntries(
      scenarios.map(({ name }) => [
        name,
        {
          authority: `authority:${name}`,
          mutation: "explicit-only",
          evidenceSink: `sink:${name}`,
          loopRuntimeRole: "READ_ONLY",
          writeClasses: [],
          wizardPolicy: "NEVER",
          requiredOperationGate: [],
          loopStateAccess: "READ_ONLY",
          nextOwners: ["caller"],
          workflowMarkers: ["workflow marker"],
          contractMarkers: ["contract marker"],
        },
      ]),
    ),
  };
  const outputBudgets = {
    schema: "output_budgets_v1",
    routes: Object.fromEntries(
      scenarios.map(({ name }) => [
        name,
        { maxEstimatedTokens: 400, maxCharacters: 1_600 },
      ]),
    ),
  };
  return buildWorkflowEvidenceMatrix({
    scenarios,
    benchmarkResult,
    workflowInvariants,
    outputBudgets,
    sourceDigests: {
      workflowInvariants: "c".repeat(64),
      outputBudgets: "d".repeat(64),
    },
  });
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
  assert.match(table, /PROCESS STAGE \(WEIGHTED\).*MIN 95\.00%/);
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

test("expandPatterns excludes non-authoritative runtime and worktree surfaces", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await mkdir(path.join(root, "docs"), { recursive: true });
    await mkdir(path.join(root, ".scratch", "recovery"), { recursive: true });
    await mkdir(path.join(root, ".sc-worktrees", "stale", "docs"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".agent", ".compact-state"), {
      recursive: true,
    });
    await writeFile(path.join(root, "docs", "active.md"), "active");
    await writeFile(
      path.join(root, ".scratch", "recovery", "stale.md"),
      "stale runtime evidence",
    );
    await writeFile(
      path.join(root, ".sc-worktrees", "stale", "docs", "active.md"),
      "stale worktree copy",
    );
    await writeFile(
      path.join(root, ".agent", ".compact-state", "stale.md"),
      "stale compact state",
    );

    const files = await expandPatterns(root, ["**/*.md"]);

    assert.deepEqual(files, ["docs/active.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("expandPatterns rejects traversal and absolute input patterns", async () => {
  const container = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));
  const root = path.join(container, "repository");

  try {
    await mkdir(root, { recursive: true });
    await writeFile(path.join(container, "outside.md"), "secret");
    await assert.rejects(
      expandPatterns(root, ["../outside.md"], { requireEveryPattern: true }),
      /outside repository|repository-relative/i,
    );
    await assert.rejects(
      expandPatterns(root, [path.join(container, "outside.md")]),
      /outside repository|repository-relative/i,
    );
  } finally {
    await rm(container, { recursive: true, force: true });
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
      resolveRepositoryPath(root, ".agent/report\n.json"),
      /control characters/i,
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
    const codexDir = path.join(root, ".codex");
    await mkdir(codexDir, { recursive: true });
    await writeFile(
      path.join(codexDir, "SKILL.md"),
      '---\nname: adapter\ndescription: "Compact Codex adapter."\n---\nlarge body\n',
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

    const adapter = await countSkillMetadataTokens(root, [".codex/SKILL.md"]);
    assert.deepEqual(adapter.files, [".codex/SKILL.md"]);
    assert.ok(adapter.tokens < 20);
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
      stage: "process",
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

test("evaluateScenarios rejects absent or malformed reduction baselines", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "token-benchmark-"));

  try {
    await writeFile(path.join(root, "before.md"), "word ".repeat(1000));
    await writeFile(path.join(root, "after.md"), "word ".repeat(10));
    const scenario = {
      name: "required-baseline",
      stage: "process",
      before: ["before.md"],
      after: ["after.md"],
    };

    await assert.rejects(
      evaluateScenarios(root, [scenario], {}, 90),
      /missing baseline.*required-baseline/i,
    );
    await assert.rejects(
      evaluateScenarios(
        root,
        [scenario],
        {
          "required-baseline": {
            tokens: 1_000_000_000,
            chars: 1,
            bytes: 1,
            fileCount: 1,
            files: ["before.md"],
          },
        },
        90,
      ),
      /baseline.*digest|invalid baseline/i,
    );
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
      stage: "input",
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
    "sc-evolve",
    "sc-pause",
    "sc-launch",
    "sc-ui",
  ];
  const relatedHotspots = [
    "legacy-eager-preload",
    "startup-codex-repository",
    "startup-codex-adapter-metadata",
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
  for (const name of workflows) {
    const scenario = DEFAULT_SCENARIOS.find((candidate) => candidate.name === name);
    assert.equal(
      scenario.after[0],
      ".codex/SKILL.md",
      `${name}: native Codex adapter overhead must be included`,
    );
    assert.ok(
      scenario.after.includes(`.agent/context/workflows/${name}.contract.md`),
      `${name}: must measure its matching compact contract`,
    );
    assert.equal(
      scenario.semanticContract,
      `workflow-invariants-v1/${name}`,
    );
  }
  assert.deepEqual(
    new Set(DEFAULT_SCENARIOS.map(({ stage }) => stage)),
    new Set(["input", "process", "output"]),
  );
  for (const scenario of DEFAULT_SCENARIOS) {
    assert.ok(scenario.stage, `${scenario.name}: missing input/process/output stage`);
  }

  const codexAdapter = DEFAULT_SCENARIOS.find(
    ({ name }) => name === "startup-codex-adapter-metadata",
  );
  assert.deepEqual(codexAdapter.after, [".codex/SKILL.md"]);
  assert.equal(codexAdapter.measure, "skill-metadata");
});

test("benchmark suite digest covers after surfaces, stages, and descriptions", () => {
  const scenario = {
    name: "sample",
    description: "original",
    stage: "process",
    before: ["before.md"],
    after: ["after.md"],
  };
  const original = digestBenchmarkSuite([scenario]);

  for (const mutation of [
    { description: "changed" },
    { stage: "input" },
    { after: ["different.md"] },
  ]) {
    assert.notEqual(
      digestBenchmarkSuite([{ ...scenario, ...mutation }]),
      original,
    );
  }
});

test("historical baseline is complete and reproducible from Git blobs", async () => {
  const baselinePath = path.join(ROOT, ".agent", "benchmarks", "token-baseline.before.json");
  const text = await readFile(baselinePath, "utf8");
  const baseline = JSON.parse(text);
  const result = await validateBaselineProvenance(
    ROOT,
    DEFAULT_SCENARIOS,
    baseline,
    { rawText: text },
  );

  assert.equal(result.pass, true);
  assert.equal(result.reductionScenarioCount, 32);
  assert.ok(Number.isFinite(Date.parse(baseline.assembledAt)));
  assert.equal(baseline.generatedAt, undefined);
  assert.equal(
    result.baselineDigest,
    createHash("sha256").update(text).digest("hex"),
  );

  const tamperedDigest = structuredClone(baseline);
  tamperedDigest.provenance.contentDigest = "0".repeat(64);
  await assert.rejects(
    validateBaselineProvenance(ROOT, DEFAULT_SCENARIOS, tamperedDigest),
    /content digest/i,
  );

  const tamperedEntryDigest = structuredClone(baseline);
  tamperedEntryDigest.scenarios["sc-init"].contentDigest = "0".repeat(64);
  await assert.rejects(
    validateBaselineProvenance(ROOT, DEFAULT_SCENARIOS, tamperedEntryDigest),
    /sc-init.*content digest|content digest.*sc-init/i,
  );

  const treeSha = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const treeBaseline = structuredClone(baseline);
  treeBaseline.provenance.defaultSourceCommit = treeSha;
  await assert.rejects(
    validateBaselineProvenance(ROOT, DEFAULT_SCENARIOS, treeBaseline),
    /not a commit/i,
  );
});

test("buildBenchmarkReport stores one canonical result for deterministic repeats", () => {
  const staticEvidence = sampleStaticEvidence();
  const report = buildBenchmarkReport([sampleRun(), sampleRun()], {
    generatedAt: "2026-07-10T00:00:00.000Z",
    baselineDigest: "a".repeat(64),
    suiteDefinitionDigest: "b".repeat(64),
    authoritative: true,
    staticEvidence,
  });

  assert.equal(report.schema, "token_benchmark_report_v3");
  assert.equal(report.repeat, 2);
  assert.equal(report.deterministic, true);
  assert.equal(report.pass, true);
  assert.equal(report.authoritative, true);
  assert.equal(report.consecutivePasses, 2);
  assert.equal(report.observedRuntimeTokens, "unknown");
  assert.equal(report.hostInjectedSurfaceTokens, "unknown");
  assert.deepEqual(report.claimScope, staticEvidence.claimScope);
  assert.deepEqual(report.coverage, staticEvidence.coverage);
  assert.deepEqual(report.workflowMatrix, staticEvidence.workflowMatrix);
  assert.deepEqual(report.gates, staticEvidence.gates);
  assert.deepEqual(report.evidenceDigests, staticEvidence.evidenceDigests);
  assert.deepEqual(report.digests, {
    baseline: "a".repeat(64),
    suiteDefinition: "b".repeat(64),
    workflowInvariants: staticEvidence.evidenceDigests.workflowInvariants,
    outputBudgets: staticEvidence.evidenceDigests.outputBudgets,
    workflowMatrix: staticEvidence.evidenceDigests.workflowMatrix,
  });
  assert.equal(report.runtimePass, null);
  assert.equal(report.staticPass, true);
  assert.equal(
    report.methodology.kind,
    "modeled-static-first-hop-surface",
  );
  assert.match(report.methodology.limitation, /not host-observed runtime usage/i);
  assert.equal(report.baselineDigest, "a".repeat(64));
  assert.equal(report.suiteDefinitionDigest, "b".repeat(64));
  assert.equal(report.runs, undefined);
  assert.equal(report.runDigests.length, 1);
  assert.equal(report.runDigests[0].count, 2);
  assert.equal(
    report.runDigests[0].digest,
    createHash("sha256").update(JSON.stringify(report.result)).digest("hex"),
  );
  assert.deepEqual(report.result.scenarios[0], {
    name: "sample",
    stage: "process",
    beforeTokens: 1000,
    afterTokens: 50,
    reductionPercent: 95,
    pass: true,
  });
});

test("buildBenchmarkReport rejects a forged runtimePass without paired attributable traces", () => {
  const staticEvidence = sampleStaticEvidence();
  staticEvidence.runtimePass = true;
  staticEvidence.runtimeEvidence = {
    ...staticEvidence.runtimeEvidence,
    status: "comparable",
    pairedTraces: [],
  };

  assert.throws(
    () =>
      buildBenchmarkReport([sampleRun()], {
        baselineDigest: "a".repeat(64),
        suiteDefinitionDigest: "b".repeat(64),
        authoritative: true,
        staticEvidence,
      }),
    /runtimePass=true requires 18 paired attributable traces/i,
  );
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
