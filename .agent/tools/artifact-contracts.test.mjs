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

test("compact PRD exposes the UI Experience Gate without creating a new authority", async () => {
  const prd = await read(`${TEMPLATE_ROOT}/skeletons/PRD-Skeleton.md`);

  for (const marker of [
    "UI Experience Gate",
    "ui_delivery_profile",
    "experience_baseline_status",
    "critical journey",
    "state applicability",
    "responsive/accessibility",
    "validation evidence",
    "approver",
    "blocking OPEN",
    "N/A - reason + approver",
  ]) {
    assert.match(
      prd,
      new RegExp(marker.replaceAll("+", "\\+"), "i"),
      `PRD UI gate: ${marker}`,
    );
  }
});

test("compact FSD and issue pointers expose UI-API gates as references", async () => {
  const [fsd, issue] = await Promise.all([
    read(`${TEMPLATE_ROOT}/skeletons/FSD-Skeleton.md`),
    read(`${TEMPLATE_ROOT}/skeletons/Issue-Pointer-Skeleton.md`),
  ]);

  for (const marker of [
    "Screen & Interaction Contract",
    "ui_contract_readiness",
    "UI-STATE-*",
    "UIMAP-*",
    "SCHEMA-*",
    "CONTRACT-*",
    "deterministic fixture",
    "typed consumer",
    "provider/consumer",
    "FIRST_VERTICAL_SLICE",
  ]) {
    assert.match(fsd, new RegExp(marker.replaceAll("*", "\\*"), "i"), `FSD UI contract: ${marker}`);
  }

  assert.match(issue, /^Contract refs:/m);
  assert.match(issue, /^Contract gate:/m);
  assert.match(issue, /^Status: needs-info$/m);
  assert.match(issue, /READY_FOR_SLICE/);
  assert.match(issue, /FIRST_VERTICAL_SLICE_VERIFIED/);
  assert.doesNotMatch(issue, /openapi:\s*3|properties:\s*\{/i);
});

test("full PRD and FSD publish additive UI contract interfaces", async () => {
  const [prd, fsd] = await Promise.all([
    read(`${TEMPLATE_ROOT}/PRD-Agentic-Ready-Reusable-Template.md`),
    read(`${TEMPLATE_ROOT}/FSD-Agentic-AI-Ready-Template.md`),
  ]);

  for (const template of [prd, fsd]) {
    assert.match(template, /template_version:\s*["']2\.1\.0["']/);
    assert.match(template, /artifact_contract_version:\s*["']1\.1\.0["']/);
  }

  assert.match(prd, /UI Experience Gate/i);
  assert.match(prd, /State Applicability Matrix/i);
  assert.match(prd, /ui_experience:/);
  assert.match(prd, /baseline_status:/);

  assert.match(fsd, /Screen & Interaction Contract/i);
  assert.match(fsd, /UI-state ID[\s\S]*Required data\/fixture refs/i);
  assert.match(fsd, /UIMAP ID[\s\S]*Operation refs[\s\S]*Schema refs/i);
  assert.match(fsd, /Responsive[\s\S]*Mode\/breakpoint[\s\S]*Test ref/i);
  assert.match(fsd, /Accessibility[\s\S]*keyboard[\s\S]*reduced motion/i);
  assert.match(fsd, /ui_api_contract:/);
  assert.match(fsd, /ui_delivery_role:/);
  assert.match(fsd, /required_gate:/);
});

test("FSD approval permits only the contract enabler before UI readiness", async () => {
  const fsd = await read(
    `${TEMPLATE_ROOT}/FSD-Agentic-AI-Ready-Template.md`,
  );

  assert.match(
    fsd,
    /ui_contract_readiness[\s\S]*(?:DRAFT|BLOCKED)[\s\S]*CONTRACT_ENABLER[\s\S]*(?:may|can) be (?:READY|approved)/i,
  );
  assert.match(
    fsd,
    /CONTRACT_ENABLER[\s\S]*\/sc-plan[\s\S]*READY_FOR_SLICE[\s\S]*FIRST_VERTICAL_SLICE/i,
  );
  assert.match(
    fsd,
    /FSD-\{\{PROJECT_CODE\}\}@\{\{FSD_VERSION\}\}#CONTRACT-001/,
  );
  assert.doesNotMatch(
    fsd,
    /FSD-\{\{PROJECT_CODE\}\}@1\.1\.0#(?:CONTRACT|UIMAP|SCHEMA|FIX)-/,
  );
});

test("full FSD keeps UI goal packets, state coverage, and traceability synchronized", async () => {
  const fsd = await read(
    `${TEMPLATE_ROOT}/FSD-Agentic-AI-Ready-Template.md`,
  );
  const prd = await read(
    `${TEMPLATE_ROOT}/PRD-Agentic-Ready-Reusable-Template.md`,
  );

  assert.match(
    fsd,
    /Goal Packet Template[\s\S]*UI delivery role[\s\S]*Required gate[\s\S]*Contract refs/i,
  );
  assert.match(
    fsd,
    /Recommended Goal Sequence Pattern[\s\S]*CONTRACT_ENABLER[\s\S]*FIRST_VERTICAL_SLICE[\s\S]*SCALE_OUT_SLICE[\s\S]*HARDENING/i,
  );
  assert.match(
    fsd,
    /Feature Definition of Done[\s\S]*loading[\s\S]*empty[\s\S]*success[\s\S]*validation[\s\S]*error[\s\S]*forbidden[\s\S]*stale[\s\S]*partial[\s\S]*offline[\s\S]*async/i,
  );
  assert.match(
    fsd,
    /Requirement-to-Test Matrix[\s\S]*(?:UI-ACT|UI action)[\s\S]*UI-STATE[\s\S]*UIMAP[\s\S]*CONTRACT[\s\S]*SCHEMA/i,
  );
  assert.match(
    fsd,
    /End-to-End Traceability Matrix[\s\S]*UI-001[\s\S]*UI-ACT-001[\s\S]*UI-STATE-001[\s\S]*UIMAP-001[\s\S]*CONTRACT-001[\s\S]*SCHEMA-001/i,
  );
  assert.match(
    fsd,
    /ui_api_contract:[\s\S]*applicability:[\s\S]*reason:[\s\S]*approved_by:/i,
  );
  assert.match(
    prd,
    /ui_experience:[\s\S]*not_applicable_reason:[\s\S]*approved_by:/i,
  );
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
