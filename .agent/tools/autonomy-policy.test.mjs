import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const delivery = ".agent/skills/agentic-delivery/references/workflow-integration.md";

test("session handoff and sensitive paths cannot independently escalate a light bugfix", async () => {
  const rubric = await read(delivery);
  assert.match(rubric, /session handoff alone only require state management/);
  assert.match(rubric, /Contract-preserving maintenance stays light/);
  for (const file of [".agent/context/workflows/sc-review.contract.md", ".agent/workflows/sc-review.md"])
    assert.match(await read(file), /semantic.*diff|diff.*semantic/is);
});

test("explicit Git authorization persists through preview; implementation grants no publishing authority", async () => {
  for (const file of [".agent/context/workflows/sc-go.contract.md", ".agent/workflows/sc-go.md"])
    assert.match(await read(file), /no (?:second|redundant) confirmation/);
  assert.match(await read(delivery), /Implementation authority alone never authorizes commit, push, deploy, publish/);
  assert.match(await read(delivery), /High risk:[\s\S]*explicit scoped authorization/);
});

test("board derivation and contract materialization do not duplicate approved decisions", async () => {
  assert.match(await read(".agent/skills/issue-workflow/SKILL.md"), /write the board automatically/);
  const ui = await read(".agent/skills/agentic-delivery/references/ui-contract-readiness.md");
  assert.match(ui, /releases the first-slice pointer automatically when approved semantics are\nunchanged/);
  assert.match(ui, /re-approval is\nrequired only for a material semantic change/);
  assert.match(await read(delivery), /four checkpoints/);
  assert.match(await read(delivery), /separate\s+execution authorization/);
  assert.match(await read(delivery), /not\s+additional approval gates/);
});

test("reversible judgment and safe TDD recovery preserve authority and user work", async () => {
  assert.match(await read(".agent/skills/executing-plans/references/authority-and-workspace.md"), /delegated by default within approved scope/);
  const tdd = await read(".agent/skills/test-driven-development/SKILL.md");
  assert.match(tdd, /remain test-first/);
  assert.match(tdd, /preserve user work/);
  assert.match(tdd, /safe baseline or isolated fix toggle/);
  assert.doesNotMatch(tdd, /Delete it\. Start over/);
});

test("retries and context pressure recover without masking mandatory gaps", async () => {
  assert.match(await read(delivery), /Numbers trigger reassessment, not universal shutdown/);
  assert.match(await read(delivery), /never parks mandatory failures as completed work/);
  const context = await read(".agent/skills/context-engineering/references/phase-boundaries.md");
  assert.match(context, /compact\/continue/);
  assert.match(context, /Stop only when safe recovery is unavailable/);
  assert.match(await read(".agent/skills/subagent-orchestration/SKILL.md"), /ready -> in-progress -> implemented -> verified/);
});

test("evidence reuse validates identity while short returns allow deep investigation", async () => {
  const proof = await read(delivery);
  for (const marker of [/dirty-change digests/, /contract\/fixture revisions/, /environment\/configuration/, /command\/arguments/, /provenance inspection/, /after integration\/merge/]) assert.match(proof, marker);
  const depth = await read(".agent/skills/context-engineering/references/read-depth.md");
  assert.match(depth, /short answer never limits required evidence/);
  assert.doesNotMatch(depth, /Chat brief[^\n]*no subagents/);
});

test("active intent precedes hygiene; independent streams and host slots determine scheduling", async () => {
  for (const file of [".agent/context/workflows/sc-status.contract.md", ".agent/workflows/sc-status.md"])
    assert.match(await read(file), /prioritize active|Prioritize active/);
  const scheduling = await read(".agent/skills/subagent-orchestration/references/orchestration-loop.md");
  assert.match(scheduling, /not dispatch barriers/);
  assert.match(scheduling, /hostSlots/);
  assert.match(scheduling, /Quarantine a diverged or failed worker/);
  assert.match(scheduling, /there are no filesystem lock helpers/);
  const work = await read(".agent/workflows/sc-work.md");
  assert.match(work, /dependency-ready goals/);
  assert.doesNotMatch(work, /wave N-1 is `verified`/);
});
