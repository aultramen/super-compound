import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { estimateTokens } from "./token-benchmark.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE_ROOT = ".agent/templates/agentic-delivery";
const FULL_TEMPLATES = [
  "BRD-Agentic-Ready-Reusable-Template.md",
  "PRD-Agentic-Ready-Reusable-Template.md",
  "FSD-Agentic-AI-Ready-Template.md",
  "ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md",
];
const SKELETONS = [
  "BRD-Skeleton.md",
  "PRD-Skeleton.md",
  "FSD-Skeleton.md",
  "ADR-Skeleton-OPTIONAL.md",
  "Issue-Pointer-Skeleton.md",
];

function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

test("artifact authoring is skeleton-first and section-on-demand", async () => {
  const [routes, prdSkill, architect, ...templates] = await Promise.all([
    read(".agent/skills/agentic-delivery/references/templates-and-outputs.md"),
    read(".agent/skills/prd-generator/SKILL.md"),
    read(".agent/agents/architect.md"),
    ...FULL_TEMPLATES.map((name) => read(`${TEMPLATE_ROOT}/${name}`)),
  ]);

  for (const text of [routes, prdSkill, architect]) {
    assert.match(text, /skeleton/i);
    assert.match(text, /section.*on demand|specific section|named section/is);
  }
  for (const template of templates) {
    assert.match(template, /REFERENCE LIBRARY/i);
    assert.match(template, /do not load.*entire|never load.*entire/is);
  }
});

test("compact BRD and PRD profiles preserve mandatory risk and completeness gates", async () => {
  const [brd, prd] = await Promise.all([
    read(`${TEMPLATE_ROOT}/skeletons/BRD-Skeleton.md`),
    read(`${TEMPLATE_ROOT}/skeletons/PRD-Skeleton.md`),
  ]);

  for (const marker of [
    "regulatory",
    "sensitive data",
    "external vendor",
    "financial",
    "automation/AI",
    "irreversible migration",
    "cost/benefit",
    "operational readiness",
  ]) {
    assert.match(brd, new RegExp(marker, "i"), `BRD: ${marker}`);
  }
  for (const marker of [
    "approver",
    "permission",
    "negative/failure/degraded",
    "security/privacy/AI",
    "UAT/release gate",
    "FSD handoff",
  ]) {
    assert.match(prd, new RegExp(marker, "i"), `PRD: ${marker}`);
  }
});

test("active artifact templates use current workflow and ADR paths", async () => {
  const templates = await Promise.all(
    FULL_TEMPLATES.map((name) => read(`${TEMPLATE_ROOT}/${name}`)),
  );
  const joined = templates.join("\n");

  assert.doesNotMatch(joined, /`\/goal\b|^\/goal\b/m);
  assert.match(joined, /\/sc-work/);
  assert.doesNotMatch(joined, /docs[\\/]architecture/i);
  assert.match(
    templates[3],
    /docs\/solutions\/adr-\{\{4_DIGIT_ID\}\}-\{\{lowercase-kebab-case-title\}\}\.md/,
  );
});

test("compact artifact surface remains more than 90 percent smaller", async () => {
  const [full, compact] = await Promise.all([
    Promise.all(FULL_TEMPLATES.map((name) => read(`${TEMPLATE_ROOT}/${name}`))),
    Promise.all(SKELETONS.map((name) => read(`${TEMPLATE_ROOT}/skeletons/${name}`))),
  ]);
  const before = estimateTokens(full.join("\n"));
  const after = estimateTokens(compact.join("\n"));
  const reduction = ((before - after) / before) * 100;

  assert.ok(reduction > 90, `artifact surface reduction was ${reduction.toFixed(2)}%`);
});
