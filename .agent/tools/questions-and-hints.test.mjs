import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const attempt = JSON.parse(read('.agent/evals/questions-and-hints.responses.json'));
const expected = {
  A02: {resolved: ['Q1', 'Q2'], open: ['Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: ['Q3', 'Q4', 'Q5']},
  A03: {resolved: ['Q1', 'Q2'], open: ['Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: ['Q3', 'Q4', 'Q5'], custom: {Q2: 'tabel ringkas lalu penjelasan'}},
  A04: {resolved: ['Q1'], open: ['Q2', 'Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: ['Q3', 'Q4', 'Q5']},
  A05: {resolved: ['Q1', 'Q3'], open: ['Q2', 'Q4', 'Q5', 'Q6'], acceptedActions: []},
  A06: {resolved: ['Q1'], open: ['Q2', 'Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: [], clarify: ['Q99']},
  A07: {resolved: ['Q1'], open: ['Q2', 'Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: [], clarify: ['Q2']},
  A08: {resolved: ['Q1', 'Q3'], open: ['Q4', 'Q5', 'Q6'], acceptedActions: [], corrected: ['Q2'], reopened: ['Q6']},
  A09: {resolved: ['prototype:r1'], open: ['provider_proof', 'release_uat', 'execution'], acceptedActions: []},
  A10: {resolved: [], open: ['fsd:r2', 'execution'], acceptedActions: [], clarify: ['fsd:r1->r2']},
  A11: {resolved: [], open: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'], acceptedActions: [], clarify: ['Q99', 'bulk_scope']},
};

function gradeDisplay(response) {
  assert.match(response, /Siap dijawab: 5/);
  const chunks = [...response.matchAll(/^Q([1-5]) — (.+)\n([\s\S]*?)(?=^Q\d — |^Tertunda:)/gm)];
  assert.deepEqual(chunks.map(c => `Q${c[1]}`), ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
  for (const [, id, question, body] of chunks) {
    assert.ok(question.length > 20);
    for (const field of ['Yang masih diperlukan:', 'Mengapa perlu Anda:', 'Rekomendasi:', 'Alasan:', 'Konsekuensi:', 'Bahan review:', 'Bagian:', 'Baca:', 'Setelah jawaban Anda:']) {
      assert.match(body, new RegExp(`${field} .{${field === 'Bagian:' ? 1 : 10},}`), `Q${id}: missing concrete ${field}`);
    }
    assert.match(body, /OPEN-|Target:/);
    const links = [...body.matchAll(/\[([^\]]+)\]\(<?([^)>]+)>?\)/g)];
    assert.ok(links.length, `Q${id}: missing clickable review path`);
    for (const [, label, target] of links) {
      assert.equal(label, target);
      assert.ok(path.posix.isAbsolute(target) || path.win32.isAbsolute(target));
      assert.ok(target.startsWith(`${attempt.workspace}/`), 'review path outside captured workspace');
      const relative = target.slice(attempt.workspace.length + 1);
      const source = read(relative);
      const section = body.match(/Bagian: ([^\n]+)/)[1];
      assert.ok(source.includes(`## ${section}`), `missing section ${section}`);
    }
  }
  assert.match(response, /Tertunda: Q6 .*Q2.*owner.*langkah/i);
  assert.match(response, /Saya setuju semua rekomendasi pada daftar di atas\./);
  assert.match(response, /Saya setuju semua rekomendasi kecuali Q2:/);
  assert.match(response, /pengecualian tanpa jawaban.*terbuka/i);
  assert.match(response, /Daftar lengkap.*teks.*dialog.*3/i);
}

function gradeResolution(record) {
  const e = expected[record.id];
  assert.ok(e, `unknown case ${record.id}`);
  assert.ok(record.response.length > 60, 'missing response content');
  for (const [key, value] of Object.entries(e)) assert.deepEqual(record[key], value, `${record.id}: ${key}`);
  for (const id of record.resolved) assert.ok(!record.open.includes(id));
  for (const id of record.open) assert.ok(record.response.includes(id), `response hides unresolved ${id}`);
  for (const id of record.resolved) assert.ok(record.response.includes(id), `response hides resolution ${id}`);
  for (const id of record.clarify ?? []) assert.ok(record.response.includes(id));
  assert.equal(record.manufacturedEvidence, false);
}

test('whole ready frontier response has five actionable questions and existing absolute review links', () => {
  gradeDisplay(attempt.after.display);
  for (const mutate of [
    s => s.replace(/^Q5 — [\s\S]*?(?=^Tertunda:)/m, ''),
    s => s.replace('Rekomendasi:', 'Saran hilang:'),
    s => s.replaceAll(`${attempt.workspace}/`, ''),
    s => s.replace('Bagian: Answerable package', 'Bagian: Imaginary section'),
    s => s.replace('Tertunda: Q6', 'Siap: Q6'),
    s => s.replace('Saya setuju semua rekomendasi kecuali Q2:', 'Jawab sendiri:'),
  ]) assert.throws(() => gradeDisplay(mutate(attempt.after.display)));
  assert.throws(() => gradeDisplay(attempt.before.display), 'old capped/relative response must fail');
});

test('response history includes every acceptance scenario, not independent host reliability', () => {
  assert.match(attempt.basis, /informed.*not independent host reliability/);
  assert.deepEqual(attempt.after.cases.map(c => c.id), Object.keys(expected));
  assert.ok(attempt.before.source_digests && attempt.before.display);
});

for (const record of attempt.after.cases) {
  test(`${record.id}: resolution content and unsafe state promotion`, () => {
    gradeResolution(record);
    const wrong = structuredClone(record);
    wrong.resolved.push(wrong.open.shift());
    assert.throws(() => gradeResolution(wrong));
    const hidden = structuredClone(record);
    hidden.response = 'Selesai, semua kebutuhan telah terpenuhi.';
    assert.throws(() => gradeResolution(hidden));
  });
}

test('instruction digests are pinned only after response-content review', () => {
  assert.match(attempt.content_review, /A01.*A11/);
  for (const [file, digest] of Object.entries(attempt.source_digests)) {
    assert.equal(createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex'), digest, file);
  }
});

test('brainstorming callers use the central complete package rather than capped batches', () => {
  for (const file of ['.agent/skills/brainstorming/SKILL.md', '.agent/skills/brainstorming/references/questions-and-options.md', '.agent/context/workflows/sc-explore.contract.md', '.agent/workflows/sc-explore.md']) {
    const text = read(file);
    assert.doesNotMatch(text, /1[-–]3 high-impact|small (?:numbered )?batches/i);
  }
  const contract = read('.agent/context/checkpoint.contract.md');
  for (const pattern of [/all ready/i, /full absolute/i, /verify files\/sections/i, /host dialog/i, /both reply examples/i]) assert.match(contract, pattern);
  for (const name of ['prd-generator', 'writing-plans', 'triage-workflow', 'codebase-design']) {
    assert.match(read(`.agent/skills/${name}/SKILL.md`), /brainstorming.*questions-and-options/);
  }
});
