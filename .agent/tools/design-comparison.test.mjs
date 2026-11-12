import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reference = '.agent/skills/prototyping/references/design-comparison.md';
const owners = [
  '.agent/skills/prototyping/SKILL.md',
  '.agent/skills/codebase-design/SKILL.md',
  '.agent/skills/eval-harness/SKILL.md',
  '.agent/context/workflows/sc-explore.contract.md',
  '.agent/skills/executing-plans/SKILL.md',
  '.agent/skills/executing-plans/references/authority-and-workspace.md',
];
const read = file => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function markdownTargets(file, text) {
  return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map(match => match[1].split('#')[0])
    .filter(target => target && !/^[a-z]+:/i.test(target))
    .map(target => path.posix.normalize(path.posix.join(path.posix.dirname(file), target)));
}

function reaches(documents, start, target) {
  const pending = [start];
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file) || !documents.has(file)) continue;
    if (file === target) return true;
    visited.add(file);
    pending.push(...markdownTargets(file, documents.get(file)));
  }
  return false;
}

test('link traversal requires real Markdown edges and terminates on cycles', () => {
  const documents = new Map([
    ['entry.md', '[detail](details/step.md)'],
    ['details/step.md', '[back](../entry.md) [decision](../decision.md)'],
    ['decision.md', '# Decision'],
  ]);
  assert.equal(reaches(documents, 'entry.md', 'decision.md'), true);
  documents.set('details/step.md', '[back](../entry.md) `../decision.md`');
  assert.equal(reaches(documents, 'entry.md', 'decision.md'), false);
  assert.equal(reaches(documents, 'entry.md', 'missing.md'), false);
});

test('design comparison is progressively reachable from compact and owning procedures', () => {
  assert.ok(existsSync(path.join(root, reference)), `missing canonical procedure: ${reference}`);
  const documents = new Map([...owners, reference].map(file => [file, read(file)]));
  for (const owner of owners) {
    assert.equal(reaches(documents, owner, reference), true, `${owner}: no linked route to comparison`);
  }

  const disconnected = new Map([...documents].map(([file, text]) => [file,
    text.replace(/\[[^\]]*\]\(([^)]+)\)/g, (link, target) =>
      markdownTargets(file, link).includes(reference) ? `\`${target}\`` : link),
  ]));
  for (const owner of owners) {
    assert.equal(reaches(disconnected, owner, reference), false,
      `${owner}: a filename mention must not replace the removed procedure link`);
  }
});

const contract = [
  ['optional consequential uncertainty', /(?:optional|only when)[\s\S]*(?:consequential|material)[\s\S]*uncertain/i],
  ['freeze before generation', /freez(?:e|ing)[\s\S]*(?:before|prior to)[\s\S]*(?:generat|worker|alternative)/i],
  ['shared complete requirements', /(?:shared|same|common)[\s\S]*brief[\s\S]*(?:all|complete|every)[\s\S]*requirement/i],
  ['private preference weights', /(?:private|withhold|hidden)[\s\S]*(?:preference|weight)/i],
  ['two or three distinct feasible alternatives', /(?:2\s*[-\u2013]\s*3|two or three)[\s\S]*distinct[\s\S]*(?:feasib|constraint)/i],
  ['fresh isolated generation', /fresh[\s\S]*context[\s\S]*isolat/i],
  ['mapping hidden from a read-only anonymous judge', /(?:anonymous|anonymized|anonymised)[\s\S]*(?:read.only|cannot edit)[\s\S]*judge[\s\S]*(?:mapping|identit)[\s\S]*(?:hidden|withheld|private)/i],
  ['mandatory gates precede scores', /(?:mandatory|hard)[\s\S]*gate[\s\S]*(?:before|precede)[\s\S]*scor/i],
  ['tie outcome', /\btie(?:s|d)?\b/i],
  ['unknown outcome', /\bUNKNOWN\b/],
  ['dropout disclosure', /(?:dropout|drop.out|withdraw|failed worker|missing alternative)/i],
  ['leak disclosure', /(?:leak|contaminat)[\s\S]*(?:disclos|record|report|restart|invalid)/i],
  ['selected and grafted results retest the original predicate', /(?:selected|winner)[\s\S]*graft[\s\S]*(?:retest|re.test|rerun|re.run)[\s\S]*original[\s\S]*predicate/i],
  ['owning authority', /(?:BRD|PRD|FSD)[\s\S]*(?:owner|authority)/i],
  ['disposable code', /(?:disposable|throwaway|discard)[\s\S]*code/i],
];

test('canonical comparison procedure retains the complete static contract', () => {
  assert.ok(existsSync(path.join(root, reference)), `missing canonical procedure: ${reference}`);
  const text = read(reference);
  for (const [requirement, pattern] of contract) assert.match(text, pattern, requirement);
});

test('comparison preserves existing scope, production authority, and evidence limits', () => {
  const prototype = read(owners[0]);
  const explore = read(owners[3]);
  const execution = read(owners[5]);
  assert.match(prototype, /prototype acceptance alone does not authorize promotion/i);
  assert.match(prototype, /explicit[\s\S]*scoped exception[\s\S]*production authority/i);
  assert.match(explore, /BRD is the[\s\S]*only durable output/i);
  assert.match(explore, /UI evidence[\s\S]*never authority/i);
  assert.match(execution, /Requirement, acceptance, or contract changes return to their BRD\/PRD\/FSD owner before implementation/i);
  assert.match(execution, /Reversible implementation details within existing authority need no micro-approval/i);
  assert.match(read(owners[2]), /(?:synthetic tool traces|static contract test)[\s\S]*(?:reliability|runtime)/i);
});

test('comparison capture preserves light-tier authority without requiring a new artifact', () => {
  for (const file of [reference, owners[0]]) {
    const text = read(file);
    const capture = file === reference
      ? text.match(/^7\. \*\*Capture[\s\S]*?(?=^## |$(?![\s\S]))/m)?.[0]
      : text.match(/^3\. Capture[\s\S]*?(?=^4\.)/m)?.[0];
    assert.ok(capture, `${file}: missing decision capture procedure`);
    assert.match(capture, /light[- ]tier/i, `${file}: light-tier capture remains available`);
    for (const authority of [/\brequest\b/i, /\bissues?\b/i, /\bconversation\b/i]) {
      assert.match(capture, authority, `${file}: preserve existing request/issue/conversation authority`);
    }
    assert.match(capture, /(?:no|without|do not)[\s\S]*(?:new|creat)[\s\S]*(?:artifact|document|BRD)[\s\S]*(?:solely|only)[\s\S]*comparison/i,
      `${file}: comparison alone must not require a new authority artifact`);
    assert.match(capture, /full[- ]tier[\s\S]*BRD[\s\S]*PRD[\s\S]*FSD/i,
      `${file}: preserve existing full-tier artifact authority`);
    assert.match(capture, /TDEC-\*[\s\S]*accepted ADR/i,
      `${file}: retain existing technical-decision and conditional ADR policy`);
    assert.match(capture, /pointer/i, `${file}: issues retain full-tier pointers`);
  }
});
