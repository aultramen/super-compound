import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {setup} from './setup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const CANONICAL = '.agent/context/writing-language.md';
const PRIORITY = ['explicit language instruction', 'main language of the user\'s current instruction', 'conventions.output_language', 'last relevant conversation language', 'Fallback: English'];
const PROTECTED = ['JSON keys', 'YAML keys', 'command names', 'file paths', 'Stable IDs', 'READY_FOR_SLICE', '## Evidence of Completion', 'test assertions'];

export function checkWritingLanguage(text) {
  const problems = [];
  const section = text.slice(text.indexOf('## Language Resolution'), text.indexOf('## Writing Modes'));
  const resolution = section.slice(section.indexOf('\n1. '));
  const positions = PRIORITY.map(item => resolution.indexOf(item));
  if (positions.some(p => p < 0) || positions.some((p, i) => i && p < positions[i - 1])) problems.push('resolution priority missing or out of order');
  for (const item of PROTECTED) if (!text.includes(item)) problems.push(`protected literal missing: ${item}`);
  if (!/STE-inspired, not validated/.test(text) || !/Never\s+claim ASD-STE100 compliance/.test(text) || !text.includes('## Limitations')) problems.push('limitation statement missing');
  // Affirmative claims only: the negation must sit in the same clause, before the claim term.
  // Wrapped lines stay in one clause; a new list item, heading or table row starts a new one.
  for (const clause of text.split(/(?<=[.!?;:])\s+|,\s+|\n(?=\s*(?:[-*|#>]|\d+\.))/)) {
    const claim = clause.search(/ASD-STE100[- ]complian(t|ce)|\bcertified\b/i);
    if (claim >= 0 && !/\b(never|not|no|without)\b/i.test(clause.slice(0, claim))) problems.push(`affirmative compliance claim: ${clause.trim()}`);
  }
  return problems;
}

test('canonical writing-language standard has priority, protected literals and limitations', () => {
  assert.deepEqual(checkWritingLanguage(read(CANONICAL)), []);
});

test('checker rejects mutated text (negative control)', () => {
  const text = read(CANONICAL);
  // Move the project-config step after the fallback: same words, wrong order.
  const swapped = text.replace('3. Project config `conventions.output_language`', '3. Project config').replace('5. Fallback: English.', '5. Fallback: English.\n6. `conventions.output_language`');
  assert.ok(checkWritingLanguage(swapped).some(p => /priority/.test(p)));
  assert.ok(checkWritingLanguage(text.replace('READY_FOR_SLICE', 'READY')).some(p => /READY_FOR_SLICE/.test(p)));
  assert.ok(checkWritingLanguage(`${text}\nThis output is ASD-STE100 compliant.\n`).some(p => /affirmative/.test(p)));
  assert.ok(checkWritingLanguage(`${text}\nNot validated; this output is ASD-STE100 compliant.\n`).some(p => /affirmative/.test(p)));
});

test('startup and shared surfaces point to the canonical file', () => {
  for (const file of ['AGENTS.md', '.agent/context/output-style.md', '.agent/rules/super-compound.md', '.agent/context/policy-loading.md']) {
    assert.match(read(file), /writing-language\.md/, file);
  }
  assert.match(read('.agent/context/output-style.md'), /## Evidence of Completion/);
});

test('every host install ships writing-language.md and adapter pointers', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-wl-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const target = path.join(dir, 'project');
  assert.equal(setup({source: root, target, home: path.join(dir, 'home'), scope: 'project', host: 'codex,claude,antigravity,cursor,windsurf,gemini'}).status, 'applied');
  assert.equal(fs.readFileSync(path.join(target, CANONICAL), 'utf8'), fs.readFileSync(path.join(root, CANONICAL), 'utf8'));
  // Every generated routing adapter and startup overview, all six hosts.
  const adapters = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursor/rules/super-compound.mdc', '.windsurf/rules/super-compound.md',
    '.agents/skills/super-compound/SKILL.md', '.claude/commands/sc-work.md', '.agents/skills/sc-work/SKILL.md',
    '.cursor/skills/sc-work/SKILL.md', '.windsurf/workflows/sc-work.md', '.gemini/commands/sc-work.toml'];
  for (const file of adapters) assert.match(fs.readFileSync(path.join(target, file), 'utf8'), /writing-language\.md/, file);
});
