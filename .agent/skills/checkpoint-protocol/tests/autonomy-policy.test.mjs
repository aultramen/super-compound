import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';

const root = new URL('../../../../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('human checkpoints prioritize a concise batch without losing unresolved authority', async () => {
  const source = await read('.agent/skills/checkpoint-protocol/references/answerable-package.md');
  for (const marker of [/at most three/i, /highest.priority/i, /complete.*unresolved/i, /stable `Q<n>`/, /material block/i, /Silence, timeout/, /independent ready work/]) assert.match(source, marker);
  assert.doesNotMatch(source, /No arbitrary question cap|Always include both reply examples/);
});

test('PRD reuse and factual N/A do not add a human gate', async () => {
  const source = await read('.agent/skills/prd-generator/SKILL.md');
  assert.match(source, /revise the canonical PRD/i);
  assert.doesNotMatch(source, /ask whether to revise/);
  assert.match(source, /N\/A.*factual reason/i);
  const template = await read('.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md');
  assert.doesNotMatch(template, /\{\{REASON\/APPROVER\}\}/);
  assert.match(template, /N\/A does not\s+require.*approver/i);
});

test('local UI and UAT retain applicable verification without synthetic stages', async () => {
  const source = await read('.agent/skills/writing-plans/references/goal-slicing.md');
  assert.match(source, /LOCAL_ONLY.*within.*goal/is);
  assert.match(source, /separate `HARDENING`.*only/is);
  assert.match(source, /UAT.*only.*acceptance|UAT.*only.*material/is);
  const triage = await read('.agent/skills/triage-workflow/SKILL.md');
  assert.match(triage, /full.tier networked UI/i);
  assert.match(triage, /UAT\s+is\s+required|requires UAT/);
});

test('authority distinguishes full-tier FSD from a concrete light request', async () => {
  const source = await read('.agent/skills/agentic-delivery/references/authority-and-adr.md');
  assert.match(source, /full.tier/i);
  assert.match(source, /light.tier.*concrete.*request/is);
  assert.match(source, /must not invent schema/);
});

test('adequate original RED evidence avoids a redundant sensitivity toggle', async () => {
  const source = await read('.agent/skills/test-driven-development/SKILL.md');
  assert.match(source, /original RED[\s\S]{0,80}adequate/i);
  assert.match(source, /toggle only\s+when.*missing or inadequate/i);
  assert.match(source, /never delete working code/);
  const detail = await read('.agent/skills/test-driven-development/references/red-green-refactor.md');
  assert.match(detail, /only when original RED is missing or inadequate/i);
  assert.match(detail, /do not remove\/disable/);
});

test('prototype decisions can advance while production code requires a scoped exception', async () => {
  const source = await read('.agent/skills/prototyping/SKILL.md');
  assert.match(source, /Promote validated decisions/i);
  assert.match(source, /explicit.*exception/i);
  assert.match(source, /production.*tests|tests.*production/i);
  assert.doesNotMatch(source, /delete or absorb the prototype/);
});

test('skill routers use the shared phase announcement instead of repeated announcements', async () => {
  const directory = new URL('.agent/skills/', root);
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (!entry.isDirectory()) continue;
    const source = await read(`.agent/skills/${entry.name}/SKILL.md`);
    assert.doesNotMatch(source, /^(?:\*\*)?Announce:/m, entry.name);
    assert.doesNotMatch(source, /Announce use before/, entry.name);
  }
});

test('hints checks the active manifest rather than a retired runtime dependency', async () => {
  const source = await read('.agent/tools/hints.test.mjs');
  assert.match(source, /workflow-invariants\.json/);
  assert.doesNotMatch(source, /readFile\(new URL\('\.\/workflow-admission\.mjs'/);
});
