import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const attempt = JSON.parse(read('.agent/evals/questions-and-hints.responses.json'));
// Exact compatibility pins for reviewed completion additions in existing routes.
// Original response evidence is immutable; it does not evaluate the new gate.
const completionRevisionPins = {
  // Stored review refs are portable; runtime review still resolves absolute paths.
  '.agent/skills/checkpoint-protocol/references/answerable-package.md': '0e1f6537a7cb0105d5f1aace98e55bdca8de13be09c784a0aac6091dc65c19c1',
  '.agent/context/workflows/sc-compound.contract.md': '1032b832fdd8ada327e5c706f36ec03d406ebbb92a2a2e68ed24edd9e70f7494',
  '.agent/context/workflows/sc-debug.contract.md': '4e05c65e081491f9be9f7f76d9d8f487253a614b646fb701ad12d0986dd1f21b',
  '.agent/context/workflows/sc-eval.contract.md': 'b291f29bbd157320cf33942fd58443d50325c9925c3a1bbc130dba2e3165c637',
  '.agent/context/workflows/sc-launch.contract.md': '2619f78af5da0c6051a5d12af49f7d8e81f087093292a11877623212159cdc77',
  '.agent/context/workflows/sc-pause.contract.md': '7befb3690a0ea2df3f9b0c3b340c196e3ec4652c332419058cb5676d055e3b47',
  '.agent/context/workflows/sc-plan.contract.md': '6ddc777db270c8378b047d8349e18907e85642174c748507f9b565c01f7f6518',
  '.agent/context/workflows/sc-review.contract.md': '86f7cf9b043e477caabb58b20559f3ad5bfbdd67cdb5b1bd7eb773daa35480f5',
  '.agent/context/workflows/sc-status.contract.md': '6b6ea06a184ac074fa6548c369a2e43fe48349488e920582280649153683c35e',
  '.agent/context/workflows/sc-work.contract.md': 'deab09038a90245fc62bc2c004f2d3c689ccfd2f5cb98fbe746c4d4c9596092c',
  '.agent/workflows/sc-compound.md': '4da149d37837ef6ee0c2bd0bd3e3ec7686b271992d45dd47c1119bd9f9301a22',
  '.agent/workflows/sc-debug.md': 'da0fba2d5bfd867214cd268c983a0dcf960d9550914dc169eecf87bba5f01d52',
  '.agent/workflows/sc-eval.md': '122e356eba974a1441a487dbeeb352a61211cd17b61c025fae50c6453ef34cfa',
  '.agent/workflows/sc-launch.md': '987f63afbba8ee8c02b8d0b88a9f6655f77925224356039a26e6ad09d976225a',
  '.agent/workflows/sc-pause.md': 'f70cbd7ca62d5fb640cdf4a0dca8bd32debb04350f356aa09f30f951b4082e19',
  '.agent/workflows/sc-plan.md': '2e173b162d5bebf0d7ba59f3218e03469d0ea30c069151b7132e1694be3b2e48',
  '.agent/workflows/sc-review.md': '5974aba3b73a2ec3df388d87b96b88b4468ebc4ac8e7432c137ea4213f50b941',
  '.agent/workflows/sc-status.md': '7c99c5d5b80246698e41aeeccc45dd070fc078477f448cf48d41df4810a64123',
  '.agent/workflows/sc-work.md': 'd900582c5f73967999657d2007667c4f84f92c4667b84eaebbfde18b6c9da8f9',
};
// Candidate-specific source inspection of additive scoped standards routing.
// Historical completion pins, response bytes and negative controls remain exact.
// Exact candidate bytes only; no human approval or live qualification asserted.
const standardsCandidateRevisionPins = {
  ".agent/context/workflows/sc-init.contract.md": "002c95897ef42acae94c991f0a3057960925faa046b369cf64162c80541e767c",
  ".agent/workflows/sc-init.md": "dde20a59cad4c75b9c40f143ec9fa8b6e6dac277018e85c31eb02a56d6b8ddf7",
  ".agent/context/workflows/sc-plan.contract.md": "37b1ceff3269c3adf3f1bd8da628c6cb71f791ebcb175c4edb270aa5e4d2219e",
  ".agent/workflows/sc-plan.md": "11cc2a6e5ea770860c1eeca4fcd2a2329780e436ffa0c0460dcf5cb88e78567f",
  ".agent/context/workflows/sc-work.contract.md": "5821f656597271a78239efe1dfc20489eedcb51cfddd91f552f2864d86f5503a",
  ".agent/workflows/sc-work.md": "6972c4431704cf5406e68a040b86fa2b4e92710a1712ae1bd0507e09bf2024f8",
  ".agent/context/workflows/sc-debug.contract.md": "4e5e415c3743ff4417911ba60606ee04f587db3e3fc6026dad2e827d8017851e",
  ".agent/workflows/sc-debug.md": "b2a16041d814ca54a9f5e2d7c2e046ef3c1b22eee216935621330d871268c972",
  ".agent/context/workflows/sc-review.contract.md": "92c3aa43ff64e1c8e6577e770ac8b293f97090675cb721c8d29c56f516ccdc31",
  ".agent/workflows/sc-review.md": "d9c91223a5a811c84265ccf5a938196f348727e1bc5186dad71f959e92ec5aa9",
  ".agent/context/workflows/sc-audit.contract.md": "e7919d41d6b519b9a75f4471b4c6c555a0830b66d1a5d78ebf164f24ae1d5259",
  ".agent/workflows/sc-audit.md": "29e15ddd1c150d929f1757b06b9e278ce52b56160ec0d35437870ae4c6aa2cb5",
  ".agent/context/workflows/sc-compound.contract.md": "82c55ea6265e4d35e84a6149ba668e042483aff4ccfcf6a6fe7a38fda68a9fbd",
  ".agent/workflows/sc-compound.md": "1ffbf9625e4f1fc5349a1ac37fcb3346cb2c11120ae8aac4efcf6ff1fc46a26d",
  ".agent/context/workflows/sc-evolve.contract.md": "57d529922cdb15d2939aa05f73104acc77fba6ca23d5155bc46bbc70a9f3899e",
  ".agent/workflows/sc-evolve.md": "ddf2ae52a879646dc65a312d1903bdfb8d1caad4f9e1de24cd09a9a91130e0a2"
};

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
  assert.match(response, /Prioritas saat ini: Q1, Q2, Q3/);
  assert.match(response, /Ringkasan blocker lain: Q4.*Q5/);
  assert.match(response, /<details>[\s\S]*<summary>Daftar lengkap Q1-Q5/);
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

test('prioritized checkpoint retains five ready IDs with expandable review detail', () => {
  gradeDisplay(attempt.after.display);
  for (const mutate of [
    s => s.replace(/^Q5 — [\s\S]*?(?=^Tertunda:)/m, ''),
    s => s.replaceAll('Rekomendasi:', 'Saran hilang:'),
    s => s.replaceAll(`${attempt.workspace}/`, ''),
    s => s.replace('Bagian: Answerable package', 'Bagian: Imaginary section'),
    s => s.replace('Tertunda: Q6', 'Siap: Q6'),
    s => s.replace('Saya setuju semua rekomendasi kecuali Q2:', 'Jawab sendiri:'),
    s => s.replace('Prioritas saat ini: Q1, Q2, Q3', 'Semua kebutuhan sudah selesai'),
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

test('historical response-content remains compatible with the exact reviewed completion addition', () => {
  assert.match(attempt.content_review, /A01.*A11/);
  for (const [file, expected] of Object.entries(standardsCandidateRevisionPins)) {
    assert.equal(createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex'), expected, 're-evaluate candidate scoped standards compatibility: '+file);
  }
  for (const [file, digest] of Object.entries(attempt.source_digests)) {
    const expected=standardsCandidateRevisionPins[file] ?? completionRevisionPins[file] ?? digest;
    assert.equal(createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex'), expected, file);
  }
});

test('brainstorming callers retain complete needs with prioritized progressive display', () => {
  for (const file of ['.agent/skills/brainstorming/SKILL.md', '.agent/skills/brainstorming/references/questions-and-options.md', '.agent/context/workflows/sc-explore.contract.md', '.agent/workflows/sc-explore.md']) {
    const text = read(file);
    assert.doesNotMatch(text, /1[-–]3 high-impact|small (?:numbered )?batches/i);
  }
  const contract = read('.agent/context/checkpoint.contract.md');
  for (const pattern of [/all ready/i, /full absolute/i, /verify files\/sections/i, /host dialog/i, /both reply examples/i]) assert.match(contract, pattern);
  assert.match(contract, /at most three actionable/);
  assert.match(contract, /unresolved IDs/);
  for (const name of ['prd-generator', 'writing-plans', 'triage-workflow', 'codebase-design']) {
    assert.match(read(`.agent/skills/${name}/SKILL.md`), /brainstorming.*questions-and-options/);
  }
});
