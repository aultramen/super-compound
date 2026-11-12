import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const GUIDE = '.agent/skills/verification-before-completion/references/bounded-formal-checking.md';
const FULL_ROUTES = [
  '.agent/skills/verification-before-completion/SKILL.md',
  '.agent/skills/verification-before-completion/references/claim-evidence.md',
  '.agent/skills/eval-harness/SKILL.md',
  '.agent/skills/eval-harness/references/eval-design.md',
  '.agent/skills/systematic-debugging/SKILL.md',
  '.agent/skills/systematic-debugging/references/advanced-techniques.md',
  '.agent/skills/integration-checking/SKILL.md',
];
const COMPACT_ROUTES = [
  '.agent/context/skills/execution-verification.contract.md',
  '.agent/context/workflows/sc-eval.contract.md',
];
const COMPACT_OWNER_ROUTES = [
  '.agent/context/skills/sc-work.contract.md',
  '.agent/context/workflows/sc-debug.contract.md',
];
const SECTION_ROUTES = [
  '.agent/skills/verification-before-completion/SKILL.md#when-to-use',
  '.agent/skills/verification-before-completion/references/claim-evidence.md#authored-or-changed-gates',
  '.agent/skills/eval-harness/references/eval-design.md#grader-routing',
  '.agent/skills/systematic-debugging/SKILL.md#when-to-use',
  '.agent/skills/systematic-debugging/references/advanced-techniques.md#bounded-formal-checking',
  '.agent/skills/integration-checking/SKILL.md#checks',
];
const PUBLIC_ROUTES = [
  'sc-audit', 'sc-compound', 'sc-debug', 'sc-eval', 'sc-evolve', 'sc-explore',
  'sc-geniusloop', 'sc-go', 'sc-hints', 'sc-init', 'sc-launch', 'sc-pause',
  'sc-plan', 'sc-prd', 'sc-research', 'sc-review', 'sc-status', 'sc-ui', 'sc-work',
];
const read = file => readFile(path.join(ROOT, file), 'utf8');
const slug = heading => heading.toLowerCase().replace(/[`*]/g, '')
  .replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ +/g, '-');

function section(text, heading) {
  const selected = selectedSection(text, slug(heading));
  assert.notEqual(selected, undefined, `missing named section: ${heading}`);
  return selected;
}

function selectedSection(text, fragment) {
  if (!fragment) return text;
  const headings = [...text.matchAll(/^(#{1,6}) +(.+)\r?$/gm)];
  const index = headings.findIndex(match => slug(match[2].trim()) === fragment);
  if (index === -1) return undefined;
  const start = headings[index];
  const end = headings.slice(index + 1).find(match => match[1].length <= start[1].length);
  return text.slice(start.index + start[0].length, end?.index).trim();
}

function resolveLink(source, locator) {
  if (/^[a-z]+:/i.test(locator)) return null;
  const [file, fragment] = locator.split('#');
  return {file: file ? path.posix.normalize(path.posix.join(path.posix.dirname(source), file)) : source, fragment};
}

function reaches(documents, source, target) {
  const pending = [resolveLink('', source)];
  const visited = new Set();
  while (pending.length) {
    const current = pending.pop();
    const text = documents.get(current.file);
    if (text === undefined || visited.has(`${current.file}#${current.fragment || ''}`)) continue;
    visited.add(`${current.file}#${current.fragment || ''}`);
    const selected = selectedSection(text, current.fragment);
    if (selected === undefined) continue;
    if (current.file === target) return true;
    for (const match of selected.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const next = resolveLink(current.file, match[1]);
      if (next) pending.push(next);
    }
  }
  return false;
}

test('formal guidance routing requires real files and named sections, not mentions', () => {
  const documents = new Map([
    ['entry.md', '[read](reference/guide.md#method)'],
    ['reference/guide.md', '## Method\n[back](../entry.md)'],
  ]);
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), true);
  documents.set('reference/guide.md', '## Renamed\n[back](../entry.md)');
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), false, 'missing heading must invalidate the link');
  documents.set('entry.md', '`reference/guide.md`');
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), false, 'a filename mention is not a route');
  documents.set('entry.md', '[self](entry.md) [missing](missing.md)');
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), false, 'cycles and absent files cannot produce reachability');
  assert.equal(section('## First\nselected\n## Second\nunrelated', 'First').trim(), 'selected', 'section loading must stop at the next named section');
  assert.throws(() => section('## Other\ntext', 'Missing'), /missing named section/);
  documents.set('entry.md', '[scope](owner.md#selected)');
  documents.set('owner.md', '## Selected\nRelevant text\n## Unrelated\n[guide](reference/guide.md)');
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), false, 'an unloaded neighboring section must not supply the route');
  documents.set('owner.md', '## Selected\n[guide](reference/guide.md)\n## Unrelated\nOther text');
  assert.equal(reaches(documents, 'entry.md', 'reference/guide.md'), true);
});

test('formal guidance is reachable from full owners and explicitly routed by compact contracts', async () => {
  const documents = new Map(await Promise.all([...FULL_ROUTES, GUIDE].map(async file => [file, await read(file)])));
  for (const owner of FULL_ROUTES) {
    assert.equal(reaches(documents, owner, GUIDE), true, `${owner}: no valid Markdown route to canonical guidance`);
  }
  for (const owner of SECTION_ROUTES) {
    assert.equal(reaches(documents, owner, GUIDE), true, `${owner}: the answering section must itself route to the guidance`);
  }
  const disconnected = new Map([...documents].map(([file, text]) => [file,
    text.replace(/\[[^\]]*\]\(([^)]+)\)/g, (link, locator) =>
      resolveLink(file, locator)?.file === GUIDE ? `\`${locator}\`` : link),
  ]));
  for (const owner of FULL_ROUTES) {
    assert.equal(reaches(disconnected, owner, GUIDE), false, `${owner}: removed guidance links must not remain reachable through mentions`);
  }
  const compactPointer = GUIDE.slice('.agent/skills/'.length);
  for (const owner of COMPACT_ROUTES) {
    assert.ok((await read(owner)).includes(compactPointer), `${owner}: missing explicit canonical pointer`);
  }
  for (const owner of COMPACT_OWNER_ROUTES) {
    const block = (await read(owner)).match(/^(?:- )?(verification-before-completion\/SKILL\.md):[\s\S]*?(?=\r?\n- |\r?\n\r?\n|$(?![\s\S]))/m);
    assert.ok(block, `${owner}: missing explicit existing verification owner`);
    assert.match(block[0], /optional[\s\S]*(?:concurrency|retry|state-machine)[\s\S]*invariant[\s\S]*(?:extra|additional) proof[\s\S]*real target[\s\S]*available toolchain/i, `${owner}: the owner block must retain the complete applicability trigger`);
    assert.equal(reaches(documents, `.agent/skills/${block[1]}`, GUIDE), true, `${owner}: the resolved owner must link to canonical guidance`);
  }
});

test('bounded procedure preserves the essential optional proof distinctions', async () => {
  const text = await read(GUIDE);
  const summary = section(text, 'Summary');
  const mapping = section(text, 'Define the Model and Code Correspondence');
  const execution = section(text, 'Execute, Challenge and Replay');
  const report = section(text, 'Report and Maintain the Result');
  assert.match(summary, /optional[\s\S]*named concurrency, retry or state-machine[\s\S]*invariant needs additional proof/);
  assert.match(summary, /supplements ordinary regression, integration and completion evidence/);
  assert.match(mapping, /source check may detect drift[\s\S]*does not prove the abstraction[\s\S]*inspect the correspondence/);
  const steps = new Map([...execution.matchAll(/^(\d+)\. ([\s\S]*?)(?=^\d+\. |$(?![\s\S]))/gm)]
    .map(match => [Number(match[1]), match[2]]));
  assert.deepEqual([...steps.keys()], [1, 2, 3, 4, 5], 'preserve the ordered evidence, exploration, control, replay and drift checks');
  assert.match(steps.get(2), /pending frontier is empty[\s\S]*cutoff leaving unexplored behavior[\s\S]*INCONCLUSIVE/);
  assert.match(steps.get(3), /derivative of the \*\*real source\*\*[\s\S]*same checker, properties and configuration/);
  assert.match(steps.get(4), /deterministic real-code[\s\S]*derivative[\s\S]*unchanged\s+baseline/);
  assert.match(steps.get(4), /overapproximation[\s\S]*same pinned property violation[\s\S]*same model transitions[\s\S]*not replayed exactly/);
  assert.match(steps.get(5), /after-run digests[\s\S]*pinned inputs[\s\S]*drift invalidates affected proof/);
  assert.match(report, /do not establish unbounded correctness, production wiring,[\s\S]*cross-process coordination or liveness outside the checked assumptions/);
});

test('bounded guidance retains the existing nineteen public workflows', async () => {
  const workflows = (await readdir(path.join(ROOT, '.agent/workflows')))
    .filter(file => /^sc-.*\.md$/.test(file)).map(file => file.slice(0, -3)).sort();
  const manifest = JSON.parse(await read('.agent/context/workflow-invariants.json'));
  assert.deepEqual(workflows, PUBLIC_ROUTES);
  assert.deepEqual(Object.keys(manifest.routes).sort(), PUBLIC_ROUTES);
});
