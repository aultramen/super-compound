import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stocktake = '.agent/skills/skill-authoring/references/structure-and-quality.md';
const builder = '.agent/skills/brainstorming/references/questions-and-options.md';
const precheck = '.agent/skills/executing-plans/references/authority-and-workspace.md';
const read = file => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const links = text => [...text.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g)];

function localTarget(file, href) {
  if (/^[a-z]+:/i.test(href)) return undefined;
  const [relative, anchor] = href.split('#');
  return {
    file: relative ? path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)) : file,
    anchor: anchor ? decodeURIComponent(anchor) : undefined,
  };
}

function anchors(text) {
  const found = new Set();
  const counts = new Map();
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(?:```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const heading = line.match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/)?.[1];
    if (!heading) continue;
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const duplicate = counts.get(slug) ?? 0;
    counts.set(slug, duplicate + 1);
    found.add(duplicate ? `${slug}-${duplicate}` : slug);
  }
  return found;
}

function targets(file, text) {
  const found = links(text).map(([, href]) => localTarget(file, href)).filter(Boolean);
  if (file.startsWith('.agent/context/')) {
    for (const match of text.matchAll(/(?:^|[\s`])((?:\.agent\/skills\/)?[a-z][a-z0-9-]+\/[\w./-]+\.md(?:#[\w-]+)?)/gm)) {
      const [source, anchor] = match[1].split('#');
      found.push({file: source.startsWith('.agent/') ? source : `.agent/skills/${source}`, anchor});
    }
    if (/\bskill-authoring\b/.test(text)) found.push({file: '.agent/skills/skill-authoring/SKILL.md'});
  }
  return found;
}

function reaches(documents, start, target) {
  const pending = [start];
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file) || !documents.has(file)) continue;
    if (file === target) return true;
    visited.add(file);
    for (const next of targets(file, documents.get(file))) {
      if (!documents.has(next.file)) continue;
      if (next.anchor) assert.ok(anchors(documents.get(next.file)).has(next.anchor), `${file}: missing ${next.file}#${next.anchor}`);
      pending.push(next.file);
    }
  }
  return false;
}

function section(file, heading) {
  const text = read(file);
  const start = [...text.matchAll(/^## (.+)$/gm)].find(match => heading.test(match[1]));
  assert.ok(start, `${file}: missing ${heading} section`);
  const rest = text.slice(start.index + start[0].length);
  return rest.split(/^## /m)[0];
}

function requires(text, checks) {
  for (const [meaning, patterns] of checks) {
    for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) assert.match(text, pattern, meaning);
  }
}

test('Markdown route checks reject severed links and invalid anchors', () => {
  const documents = new Map([
    ['entry.md', '[procedure](detail.md#material-check)'],
    ['detail.md', '# Detail\n\n## Material check\n[back](entry.md)'],
  ]);
  assert.equal(reaches(documents, 'entry.md', 'detail.md'), true);
  documents.set('entry.md', '`detail.md#material-check`');
  assert.equal(reaches(documents, 'entry.md', 'detail.md'), false);
  documents.set('entry.md', '[procedure](detail.md#imaginary-check)');
  assert.throws(() => reaches(documents, 'entry.md', 'detail.md'), /missing/);
  documents.set('entry.md', '[procedure](detail.md#material-check)');
  assert.equal(reaches(documents, 'detail.md', 'missing.md'), false);
});

test('existing authoring, execution and planning routes reach their canonical R05 procedures', () => {
  const routes = [
    ['.agent/skills/skill-authoring/SKILL.md', stocktake],
    ['.agent/context/skill-index.md', stocktake],
    ['.agent/context/skills/sc-work.contract.md', stocktake],
    ['.agent/context/skills/execution-verification.contract.md', stocktake],
    ['.agent/context/skills/sc-work.contract.md', precheck],
    ['.agent/context/skills/execution-verification.contract.md', precheck],
    ['.agent/context/skills/delivery-planning.contract.md', builder],
    ['.agent/context/skills/sc-plan.contract.md', builder],
    ['.agent/skills/brainstorming/SKILL.md', builder],
    ['.agent/skills/writing-plans/SKILL.md', builder],
  ];
  const files = [...new Set(routes.flat())];
  const documents = new Map(files.map(file => [file, read(file)]));
  for (const [source, target] of routes) {
    assert.equal(reaches(documents, source, target), true, `${source}: no source route to ${target}`);
  }
  for (const [source, target] of routes.filter(([source]) => source.startsWith('.agent/skills/'))) {
    const disconnected = new Map([...documents].map(([file, text]) => [file,
      text.replace(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g, (link, href) =>
        localTarget(file, href)?.file === target ? `\`${href}\`` : link),
    ]));
    assert.equal(reaches(disconnected, source, target), false, `${source}: filename mentions cannot replace links`);
  }
  for (const file of ['.agent/context/skills/sc-work.contract.md', '.agent/context/skills/execution-verification.contract.md']) {
    requires(read(file), [
      ['compact execution checks current satisfaction', /(?:already.satisfied|satisf(?:ied|action)|outcome[\s\S]*current)/i],
      ['compact skill changes reach the existing authoring owner', /(?:skill[\s\S]*chang|chang[\s\S]*skill)/i],
    ]);
  }
  for (const file of ['.agent/context/skills/delivery-planning.contract.md', '.agent/context/skills/sc-plan.contract.md']) {
    assert.match(read(file), /(?:material|consequential)[\s\S]*ambigu|ambigu[\s\S]*(?:material|consequential)/i, `${file}: fresh-builder routing stays conditional`);
  }
});

// These assertions check the instruction contract; observed worker behavior is separate evidence.
test('changed-skill stocktake bounds its comparison and accounts for owned bundle changes', () => {
  requires(section(stocktake, /changed.skill.*stocktake|stocktake/i), [
    ['declare the comparison baseline', /(?:baseline|comparison)[\s\S]*(?:ref|snapshot|captured|state)/i],
    ['include tracked and untracked task changes', [/\bstaged\b/i, /\bunstaged\b/i, /\buntracked\b/i]],
    ['do not adopt unrelated dirty work as task scope', /(?:unrelated|pre.existing)[\s\S]*(?:dirty|work|change)/i],
    ['include the router', /SKILL\.md/],
    ['include references, scripts, data and tests', [/references?/i, /scripts?/i, /\bdata\b/i, /tests?/i]],
    ['account for deletions and both rename paths', [/delet/i, /renam/i, /(?:old[\s\S]*new|new[\s\S]*old|both)/i]],
    ['inspect affected owning consumers', /(?:consumer|caller)[\s\S]*(?:workflow|agent|skill|contract)|(?:workflow|agent|skill|contract)[\s\S]*(?:consumer|caller)/i],
    ['missing usage stays unmeasured', /(?:missing|unknown|absent|unavailable)[\s\S]*usage[\s\S]*unmeasured|usage[\s\S]*(?:missing|unknown|absent|unavailable)[\s\S]*unmeasured/i],
    ['record evidence-backed dispositions in the existing report', /(?:existing|current)[\s\S]*report[\s\S]*(?:disposition|keep|improve|retire)|(?:disposition|keep|improve|retire)[\s\S]*(?:existing|current)[\s\S]*report/i],
  ]);
});

test('pruning identifies provenance, consumers and replacement protection before removing rules', () => {
  requires(section(stocktake, /pruning/i), [
    ['inspect protecting tests and incidents', [/tests?/i, /incident|learning|bug/i]],
    ['inspect history and live consumers', [/history|commit/i, /consumer|caller/i]],
    ['identify the successor owner or decider', /(?:replacement|successor|relocat)[\s\S]*(?:owner|decid)|(?:owner|decid)[\s\S]*(?:replacement|successor|relocat)/i],
    ['retain required gates or prove equivalent protection', /(?:required|mandatory)[\s\S]*(?:gate|constraint)[\s\S]*(?:retain|preserv|protect|equivalent)|(?:retain|preserv|protect|equivalent)[\s\S]*(?:required|mandatory)[\s\S]*(?:gate|constraint)/i],
    ['missing provenance does not justify deletion', /(?:missing|unknown|absent|no)[\s\S]*provenance[\s\S]*(?:retain|test|proof|not|never)/i],
    ['preserve behavior-bearing rationale and harness constraints', /(?:non.derivable|WHY|gotcha)[\s\S]*(?:harness|model)|(?:harness|model)[\s\S]*(?:non.derivable|WHY|gotcha)/i],
    ['preserve notices, parser fields and evidence history', [/licen/i, /parser/i, /history|evidence/i]],
  ]);
});

test('fresh-builder checks target material ambiguity and retain delegated choices and owning authority', () => {
  requires(section(builder, /fresh.builder/i), [
    ['trigger only for material ambiguity or absent author context', /(?:material|consequential)[\s\S]*(?:ambigu|author[\s\S]*context)/i],
    ['use fresh context and canonical artifacts with necessary references', /fresh.context[\s\S]*canonical[\s\S]*(?:reference|contract)/i],
    ['ask for an implementation and proving-check outline', /(?:outline|plan)[\s\S]*implementation[\s\S]*(?:proving|verif|check)/i],
    ['material questions explain the consequence for the plan', /question[\s\S]*(?:changes?|affects?)[\s\S]*(?:plan|behavior|acceptance|scope)/i],
    ['skip routine delegated choices and settled scope', [/skip|exclude/i, /routine|delegated/i, /settled/i]],
    ['resolve routine reversible choices internally', /(?:routine|reversible)[\s\S]*internal/i],
    ['return material decisions to the existing OPEN or authority owner', /(?:existing|owning|owner)[\s\S]*(?:OPEN|BRD|PRD|FSD|checkpoint)/],
    ['do not introduce a second artifact or approval', /(?:no|without|not)[\s\S]*(?:sidecar|artifact)[\s\S]*(?:approval|gate|veto)/i],
  ]);
});

test('execution precheck distinguishes satisfied, partial and unproved current outcomes', () => {
  requires(section(precheck, /execution preflight/i), [
    ['compare every requested outcome and acceptance criterion', /(?:every|each|all)[\s\S]*outcome[\s\S]*(?:acceptance|AC)/i],
    ['inspect actual current behavior and evidence', /(?:actual|current)[\s\S]*behavior[\s\S]*evidence/i],
    ['fully satisfied work proceeds through verification without implementation edits', /(?:all|fully|complete)[\s\S]*(?:prov|satisfied)[\s\S]*(?:no|without|skip|exit)[\s\S]*(?:edit|implementation)[\s\S]*verif/i],
    ['partial work preserves proved portions and closes remaining outcomes', /partial[\s\S]*(?:preserv|retain)[\s\S]*(?:remaining|uncovered|missing)/i],
    ['stale, missing, failed and skipped proof cannot establish completion', [/stale/i, /missing/i, /failed/i, /skipped/i, /unverified|incomplete|cannot|not/i]],
    ['file existence and clean Git status are insufficient', /(?:file|exist)[\s\S]*clean[\s\S]*(?:Git|tree|status)/i],
    ['historical GREEN is insufficient', /(?:old|historical|previous)[\s\S]*GREEN/i],
    ['external deliverables need actual current observation', /external[\s\S]*(?:actual|current|observ|evidence)/i],
    ['continue independent ready authorized work', /(?:continue|proceed)[\s\S]*independent[\s\S]*(?:ready|authorized)/i],
  ]);
});

test('reference-only execution preflight retains the precreation search guard independently of its router', () => {
  const guard = /Search symbols, paths, tests, and nearby implementations before creating or declaring anything missing\./;
  const router = read('.agent/skills/executing-plans/SKILL.md');
  const reference = read(precheck);
  const requireGuard = text => assert.match(text, guard, 'reference-only readers need the precreation discovery guard');
  requireGuard(router);
  requireGuard(reference);
  assert.throws(() => requireGuard(reference.replace(guard, '')), /reference-only readers/);
  requireGuard(router);
});
