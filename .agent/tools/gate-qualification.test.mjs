import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {selectActiveAssets} from './active-assets.mjs';
import {checkExecutableReferences} from './framework-audit.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const POLICY = '.agent/skills/verification-before-completion/references/claim-evidence.md';
const ANCHOR = '#authored-or-changed-gates';
const read = relative => readFile(path.join(ROOT, relative), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', windowsHide: true});

async function assertMarkdownRoute(source, target) {
  const text = await read(source);
  const targets = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(targets.some(link => {
    const [file, fragment] = link.split('#');
    return path.resolve(ROOT, path.dirname(source), file) === path.resolve(ROOT, target.split('#')[0])
      && (fragment ? `#${fragment}` : '') === (target.includes('#') ? `#${target.split('#')[1]}` : '');
  }), `${source} must link to ${target}`);
  await read(target.split('#')[0]);
}

test('gate qualification is reachable from full and compact verification routes', async () => {
  await assertMarkdownRoute('.agent/skills/verification-before-completion/SKILL.md', POLICY + ANCHOR);
  await assertMarkdownRoute('.agent/skills/plan-verification/SKILL.md', '.agent/skills/plan-verification/references/tests-and-decisions.md');
  await assertMarkdownRoute('.agent/skills/plan-verification/references/tests-and-decisions.md', POLICY + ANCHOR);
  await assertMarkdownRoute('.agent/skills/eval-harness/references/eval-design.md', POLICY + ANCHOR);
  for (const source of ['.agent/context/skills/execution-verification.contract.md', '.agent/context/skills/sc-work.contract.md']) {
    assert.ok((await read(source)).includes(`verification-before-completion/references/claim-evidence.md${ANCHOR}`), `${source} must explicitly route authored/changed gates to the canonical procedure`);
  }
});

test('authored gate procedure requires current real-artifact qualification and bounded claims', async () => {
  const policy = await read(POLICY);
  const section = policy.match(/^## Authored or Changed Gates\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  assert.ok(section, 'canonical authored-or-changed-gates section must exist');
  for (const [requirement, pattern] of [
    ['expected outcomes fixed before execution', /(?:before[^.\n]*expected|expected[\s\S]*?before[^.\n]*(?:run|execut))/i],
    ['current root and HEAD identity', /(?:root[\s\S]*HEAD|HEAD[\s\S]*root)/i],
    ['actual dirty and untracked input bytes', /dirty[\s\S]*untracked[\s\S]*(?:bytes|digest|hash)/i],
    ['genuine current target run', /(?:real|genuine)[\s\S]*(?:artifact|target)[\s\S]*(?:run|execut)/i],
    ['isolated deliberately invalid derivative', /isolat[\s\S]*(?:invalid|negative)[\s\S]*(?:derivative|cop(?:y|ied)|mutation)/i],
    ['rejection for its intended reason', /reject[\s\S]*(?:intended|expected)[\s\S]*reason/i],
    ['semantic verdict beyond exit status', /(?:semantic[\s\S]*(?:exit|status)|(?:exit|status)[\s\S]*semantic)/i],
    ['legitimate not-applicable result', /(?:legitimate|applicability|factual)[\s\S]*(?:NOT_APPLICABLE|N\/A)/i],
    ['same checker and configuration', /same[\s\S]*checker[\s\S]*(?:config|configuration)/i],
    ['failed runs retained', /(?:retain|preserve)[\s\S]*fail/i],
    ['no whole-system proof claim', /(?:not|never|no)[\s\S]*whole.system/i],
  ]) assert.match(section, pattern, requirement);
});

test('maintained dependency gate accepts its current real artifact and rejects an isolated missing-import derivative', async t => {
  const target = '.agent/tools/framework-audit.mjs';
  const absent = '.agent/tools/__r03_deliberately_missing_dependency__.mjs';
  const expected = {
    valid: [],
    invalid: [{severity: 'P1', code: 'MISSING_LOCAL_MODULE', file: target, message: `Local runtime dependency is not shipped: ${absent}`}],
  };
  const head = git(['rev-parse', 'HEAD']).trim();
  assert.match(head, /^[a-f0-9]{40}$/);
  const manifest = selectActiveAssets([...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))].sort());
  const files = new Set(manifest);
  assert.ok(files.has(target), 'real target is an active current Git input');
  assert.equal(files.has(absent), false, 'negative control must name an absent dependency');
  const original = await readFile(path.join(ROOT, target));
  const invalid = Buffer.concat([original, Buffer.from("\nimport './__r03_deliberately_missing_dependency__.mjs';\n")]);
  assert.deepEqual(invalid.subarray(0, original.length), original, 'derivative preserves all real target bytes');
  assert.notEqual(digest(invalid), digest(original));
  const validResult = checkExecutableReferences(target, original.toString('utf8'), files);
  const invalidResult = checkExecutableReferences(target, invalid.toString('utf8'), files);
  t.diagnostic(JSON.stringify({scope: 'dependency-gate API only; no whole-system claim', root: ROOT, head, target, sourceDigest: digest(original), derivativeDigest: digest(invalid), manifestDigest: digest(manifest.join('\0')), dirtyStatus: git(['status', '--porcelain=v1', '-z']), expected, actual: {valid: validResult, invalid: invalidResult}}));
  assert.deepEqual(validResult, expected.valid);
  assert.deepEqual(invalidResult, expected.invalid, 'invalid derivative must fail for the intended dependency reason');
  assert.deepEqual(await readFile(path.join(ROOT, target)), original, 'qualification must preserve the source artifact');
  assert.equal(git(['rev-parse', 'HEAD']).trim(), head, 'qualification must preserve HEAD');
});
