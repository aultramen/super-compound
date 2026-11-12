import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {MappingError, projectAgents} from './agent-projection.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAPPING = '.agent/context/agent-models.json';
const ADAPTER = '.claude/agents/code-reviewer.md';
const GUIDE = '.agent/skills/subagent-orchestration/references/completion-inbox.md';
const ANCHOR = 'external-execution-receipts';
const REPORT = '.scratch/r08-model-receipts-20261107/controls.json';
const SOURCES = [
  {file:'.agent/skills/subagent-orchestration/SKILL.md', heading:'File-Backed Process'},
  {file:'.agent/context/model-guidance.md', heading:'Requested and Observed Execution'},
  {file:'.agent/skills/subagent-orchestration/references/orchestration-loop.md', heading:'Session model and effort'},
  {file:'.agent/skills/eval-harness/references/paired-experiments.md', paragraph:'For actual pilot sessions'},
];
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function answeringSection(text, source) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (source.paragraph) return normalized.split(/\n\s*\n/).find(block => block.startsWith(source.paragraph)) || '';
  const lines = normalized.split('\n');
  const start = lines.indexOf(`## ${source.heading}`);
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

function hasReceiptRoute(source, text, guide) {
  return /^## External Execution Receipts\r?$/m.test(guide)
    && [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].some(match => {
      const [file, fragment] = match[1].split('#');
      return fragment === ANCHOR
        && path.resolve(ROOT, path.dirname(source), file) === path.resolve(ROOT, GUIDE);
    });
}

test('current agent artifacts qualify configuration checks without attesting execution identity', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-model-receipts-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sc-model-receipts-'));
    fs.rmSync(resolved, {recursive:true, force:true});
  });
  const artifacts = [MAPPING, '.agent/tools/agent-projection.mjs', '.agent/tools/model-receipts.test.mjs',
    '.agent/tools/knowledge-search.mjs', '.agent/tools/active-assets.mjs', '.agent/context/retired-assets.json',
    ...['.agent/agents', '.claude/agents'].flatMap(directory =>
      fs.readdirSync(path.join(ROOT, directory)).filter(file => file.endsWith('.md'))
        .map(file => `${directory}/${file}`))];
  const original = new Map(artifacts.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
  for (const directory of ['.agent/agents', '.claude/agents']) {
    fs.cpSync(path.join(ROOT, directory), path.join(root, directory), {recursive:true});
  }
  fs.mkdirSync(path.join(root, path.dirname(MAPPING)), {recursive:true});
  fs.writeFileSync(path.join(root, MAPPING), original.get(MAPPING));
  const mapping = JSON.parse(original.get(MAPPING));
  const requestedModel = mapping.hosts['claude-code']['code-reviewer'];
  const invalidModel = '__r08_invalid_claude_model__';
  const expected = Object.freeze({
    baseline: {written:[], drifted:[], requestedModel},
    changedAdapter: {written:[], drifted:[`${ADAPTER} (drifted)`]},
    invalidMapping: {error:'MappingError', reason:`"code-reviewer" model "${invalidModel}" not in`},
  });
  const actual = {};
  const report = {
    environment:'LOCAL', scope:'configuration projection only; no provider execution or identity attestation',
    root:ROOT, startedAt:new Date().toISOString(),
    command:'node --test .agent/tools/model-receipts.test.mjs', runtime:process.version,
    target:ADAPTER, expected, actual,
    sourceDigests:Object.fromEntries([...original].map(([file, bytes]) => [file, digest(bytes)])),
    identityEvidence:{requested:{host:'claude-code', model:requestedModel}, observed:{provider:null, model:null},
      limitation:'Observed identity is UNKNOWN. Requested mapping, projected tools and model settings establish configuration only.'},
  };
  try {
    const baseline = projectAgents({root, write:false});
    actual.baseline = {written:baseline.written, drifted:baseline.drifted,
      requestedModel:fs.readFileSync(path.join(root, ADAPTER), 'utf8').match(/^model: (.+)\r?$/m)?.[1].trim()};
    assert.deepEqual(actual.baseline, expected.baseline);

    const native = fs.readFileSync(path.join(root, ADAPTER), 'utf8');
    const changed = native.replace(/^model: .+$/m, `model: ${requestedModel === 'opus' ? 'sonnet' : 'opus'}`);
    assert.notEqual(changed, native);
    report.changedAdapter = {beforeDigest:digest(native), afterDigest:digest(changed),
      diff:{from:`model: ${requestedModel}`, to:`model: ${requestedModel === 'opus' ? 'sonnet' : 'opus'}`}};
    fs.writeFileSync(path.join(root, ADAPTER), changed);
    const drifted = projectAgents({root, write:false});
    actual.changedAdapter = {written:drifted.written, drifted:drifted.drifted};
    assert.deepEqual(actual.changedAdapter, expected.changedAdapter);
    assert.equal(fs.readFileSync(path.join(root, ADAPTER), 'utf8'), changed, 'check mode cannot repair away the invalid control');

    fs.writeFileSync(path.join(root, ADAPTER), native);
    mapping.hosts['claude-code']['code-reviewer'] = invalidModel;
    const invalidMapping = JSON.stringify(mapping);
    report.invalidMapping = {beforeDigest:digest(original.get(MAPPING)), afterDigest:digest(invalidMapping),
      diff:{field:'hosts.claude-code.code-reviewer', from:requestedModel, to:invalidModel}};
    fs.writeFileSync(path.join(root, MAPPING), invalidMapping);
    assert.throws(() => projectAgents({root, write:false}), error => {
      actual.invalidMapping = {error:error.constructor.name, message:error.message};
      return error instanceof MappingError && error.message.includes(expected.invalidMapping.reason);
    });
    assert.equal(fs.readFileSync(path.join(root, ADAPTER), 'utf8'), native, 'invalid mapping cannot rewrite the adapter');
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.message;
    throw error;
  } finally {
    const after = new Map([...original.keys()].map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
    report.sourceDigestsAfter = Object.fromEntries([...after].map(([file, bytes]) => [file, digest(bytes)]));
    report.sourcePreserved = [...original].every(([file, bytes]) => after.get(file).equals(bytes));
    if (!report.sourcePreserved) report.status = 'FAIL';
    fs.mkdirSync(path.join(ROOT, path.dirname(REPORT)), {recursive:true});
    fs.writeFileSync(path.join(ROOT, REPORT), `${JSON.stringify(report, null, 2)}\n`);
    assert.equal(report.sourcePreserved, true, 'isolated controls must preserve all real source artifact bytes');
    t.diagnostic(`Expected and actual LOCAL configuration controls: ${REPORT}`);
  }
});

test('external receipt guidance has real file and section routes', () => {
  const guide = read(GUIDE);
  for (const source of SOURCES) {
    const text = read(source.file);
    const selected = answeringSection(text, source);
    assert.equal(hasReceiptRoute(source.file, selected, guide), true, `${source.file}: answering section lacks canonical receipt link`);
    assert.equal(hasReceiptRoute(source.file, selected, guide.replace('## External Execution Receipts', '## Other')), false,
      'an absent target heading must break the route');
    assert.equal(hasReceiptRoute(source.file, selected.replaceAll(`#${ANCHOR}`, '#missing-section'), guide), false,
      'a filename or another fragment cannot replace the canonical section route');
    const link = selected.match(/\[[^\]]*\]\([^)]*#external-execution-receipts\)/)?.[0];
    assert.ok(link);
    const moved = `${text.replaceAll(`#${ANCHOR}`, '#missing-section')}\n\n## Unloaded Neighbor\n${link}\n`;
    assert.equal(hasReceiptRoute(source.file, answeringSection(moved, source), guide), false,
      `${source.file}: a link in an unloaded neighboring section cannot supply the route`);
  }
  const pointer = 'subagent-orchestration/SKILL.md';
  const compact = read('.agent/context/skills/execution-verification.contract.md')
    .split(/\r?\n(?=- )/).find(block => block.includes(pointer));
  assert.ok(compact, 'compact verification must explicitly select its existing orchestration owner');
  assert.match(compact, /selected\/recovered authorized external execution[\s\S]*(?:authoritative identity[\s\S]*requirements?|required identity)/i);

  const work = read('.agent/context/skills/sc-work.contract.md').split(/\r?\n(?=- )/)
    .find(block => block.startsWith('- subagent-orchestration/SKILL.md:'));
  assert.ok(work, 'compact work must retain its explicit orchestration owner');
  assert.match(work, /real external execution receipts/);
  const owner = SOURCES[0];
  assert.equal(path.resolve(ROOT, '.agent/skills', pointer), path.resolve(ROOT, owner.file));
  assert.equal(hasReceiptRoute(owner.file, answeringSection(read(owner.file), owner), guide), true,
    'compact verification and work must resolve through the answering owner section to the canonical receipt section');
});

test('identity and capability guidance preserves the essential trust distinctions', () => {
  const section = read(GUIDE).split('## External Execution Receipts')[1]?.split(/\r?\n## /)[0];
  assert.ok(section, 'canonical receipt section must exist');
  assert.match(section, /capabilities \*\*requested\*\*, \*\*available\*\* and actually \*\*enforced\*\*[\s\S]*unable to enforce[\s\S]*unavailable/);
  assert.match(section, /requested[\s\S]*separately from observed[\s\S]*Worker self-report[\s\S]*do not authenticate[\s\S]*unknown/);
  assert.match(section, /Adapter assertions[\s\S]*not backend[\s\S]*attestation/);
  assert.match(section, /existing `evidenceRefs`[\s\S]*Receipt existence or process exit zero never supplies[\s\S]*completion authority/);
});
