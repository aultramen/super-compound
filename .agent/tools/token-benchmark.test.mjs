import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  countScenarioTokens,
  DEFAULT_SCENARIOS,
  evaluateScenarios,
  estimateTokens,
  expandPatterns,
} from "./token-benchmark.mjs";

test("estimateTokens is deterministic and non-zero for prose", () => {
  const text = "Load only compact contracts before full procedures.";

  assert.equal(estimateTokens(text), estimateTokens(text));
  assert.ok(estimateTokens(text) > 0);
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

test("default benchmark covers all workflows and related hotspots", () => {
  const names = new Set(DEFAULT_SCENARIOS.map((scenario) => scenario.name));
  const workflows = [
    "sc-init",
    "sc-status",
    "sc-explore",
    "sc-research",
    "sc-prd",
    "sc-plan",
    "sc-eval",
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
    "full-framework-load",
    "artifact-output-brd-prd-fsd-issue",
    "related-all-skills",
    "related-delivery-planning-skills",
    "related-execution-verification-skills",
    "related-risk-audit-skills",
    "related-agentic-templates",
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
