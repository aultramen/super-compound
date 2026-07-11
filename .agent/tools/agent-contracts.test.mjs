import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const AGENTS = [
  "code-reviewer",
  "build-fixer",
  "doc-updater",
  "e2e-runner",
  "architect",
];
const LEGACY_WORDS = 3157;

async function readAgent(name) {
  return readFile(path.join(ROOT, ".agent", "agents", `${name}.md`), "utf8");
}

function wordCount(text) {
  return text.match(/\S+/gu)?.length ?? 0;
}

function includesAll(text, patterns) {
  for (const pattern of patterns) {
    assert.match(text, pattern);
  }
}

test("legacy specialist prompts remain compact adapters instead of procedure copies", async () => {
  const documents = await Promise.all(AGENTS.map(readAgent));
  const counts = documents.map(wordCount);
  const total = counts.reduce((sum, count) => sum + count, 0);

  counts.forEach((count, index) => {
    assert.ok(count <= 240, `${AGENTS[index]} has ${count} words; adapter limit is 240`);
  });
  assert.ok(total <= 1000, `specialist adapters have ${total} words; total limit is 1000`);
  assert.ok(
    (LEGACY_WORDS - total) / LEGACY_WORDS >= 0.68,
    "specialist prompt surface must be at least 68% smaller than the legacy 3157-word surface",
  );
});

test("code-reviewer delegates to the spec-first findings-first review contract", async () => {
  const text = await readAgent("code-reviewer");
  includesAll(text, [
    /skills\/code-review\/SKILL\.md/i,
    /workflows\/sc-review\.md/i,
    /spec(?:ification)?[^.\n]*(?:first|stage 1)/i,
    /stop[^.\n]*stage 1[^.\n]*(?:fail|gap)/i,
    /findings first/i,
    /file-size thresholds?[^.\n]*signals?[^.\n]*not[^.\n]*(?:verdict|violation)/i,
    /file:line/i,
  ]);
});

test("build-fixer diagnoses before mutation and gates dependency changes", async () => {
  const text = await readAgent("build-fixer");
  includesAll(text, [
    /skills\/systematic-debugging\/SKILL\.md/i,
    /skills\/compatibility-check\/SKILL\.md/i,
    /skills\/verification-before-completion\/SKILL\.md/i,
    /root cause[^.\n]*(?:before|prior to)[^.\n]*(?:fix|change|mutation)/i,
    /compatibility-check[^.\n]*(?:before|prior to)[^.\n]*(?:install|upgrade|pin|replace|dependency)/i,
    /(?:delete|remove)[^.\n]*(?:node_modules|lockfile|dependency cache)[^.\n]*(?:explicit )?(?:user )?approval/i,
    /fresh[^.\n]*(?:build|test|verification)/i,
  ]);
});

test("doc-updater derives changes from repository evidence and fails safe on uncertainty", async () => {
  const text = await readAgent("doc-updater");
  includesAll(text, [
    /repository evidence/i,
    /(?:diff|requirements?)[^.\n]*(?:code|tests?|config)/i,
    /never (?:invent|guess)/i,
    /uncertain[^.\n]*(?:preserve|do not delete|must not delete)/i,
    /skills\/knowledge-compounding\/SKILL\.md/i,
  ]);
  assert.doesNotMatch(text, /when in doubt,? delete/i);
});

test("e2e-runner gates parallelism and preserves reproducible evidence", async () => {
  const text = await readAgent("e2e-runner");
  includesAll(text, [
    /skills\/eval-harness\/SKILL\.md/i,
    /skills\/verification-before-completion\/SKILL\.md/i,
    /parallel[^.\n]*only[^.\n]*(?:isolated|resource-independent)/i,
    /shared[^.\n]*(?:account|database|port|state)[^.\n]*sequential/i,
    /(?:trace|screenshot|report)[^.\n]*(?:path|artifact|evidence)/i,
    /critical user flows?/i,
  ]);
});

test("architect follows nested config, FSD authority, and conditional ADR policy", async () => {
  const text = await readAgent("architect");
  includesAll(text, [
    /skills\/architecture-enforcement\/SKILL\.md/i,
    /skills\/writing-plans\/SKILL\.md/i,
    /frontend\.framework/i,
    /backend\.framework/i,
    /runtime\.[a-z_]+/i,
    /commands\.[a-z_]+/i,
    /conventions\.architecture/i,
    /FSD[^.\n]*TDEC-\*/i,
    /ADR[^.\n]*(?:only|conditional)/i,
    /templates\/agentic-delivery\/skeletons\/ADR-Skeleton-OPTIONAL\.md/i,
    /docs\/solutions\/adr-####-<slug>\.md/i,
  ]);
});

test("every active agent prompt is covered and Brain stays read-only", async () => {
  const files = (await readdir(path.join(ROOT, ".agent", "agents")))
    .filter((file) => file.endsWith(".md"))
    .sort();
  assert.deepEqual(files, [...AGENTS, "brain"].map((name) => `${name}.md`).sort());

  const [brain, index] = await Promise.all([
    readAgent("brain"),
    readFile(path.join(ROOT, ".agent", "context", "agent-index.md"), "utf8"),
  ]);
  includesAll(brain, [
    /read-only evaluator/i,
    /do not edit files/i,
    /Beta/i,
    /Alpha/i,
    /Theta/i,
    /Delta/i,
    /recommended route/i,
  ]);
  assert.match(index, /`brain`.*read-only.*genius-loop/i);
});
