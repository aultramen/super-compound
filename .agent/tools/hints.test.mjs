import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {DEFAULT_SCENARIOS, evaluateScenarios, createBaseline, digestScenarioDefinitions, digestBenchmarkSuite, hasBaseline, formatTable, buildBenchmarkReport} from './token-benchmark.mjs';

test('hints uses live full-vs-compact without changing frozen baseline membership', () => {
  const hints = DEFAULT_SCENARIOS.find(s => s.name === 'sc-hints');
  assert.ok(hints);
  assert.equal(hints.liveBefore, true);
  assert.equal(hints.comparisonBasis, 'current-full-vs-compact');
  assert.equal(hasBaseline(hints), false);
  assert.equal(digestScenarioDefinitions(DEFAULT_SCENARIOS), digestScenarioDefinitions(DEFAULT_SCENARIOS.filter(s => s.name !== 'sc-hints')));
  assert.notEqual(digestBenchmarkSuite([hints]), digestBenchmarkSuite([{...hints, liveBefore: false}]));
});

test('live reduction gates on current sources and stays outside historical totals', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-hints-bench-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  await writeFile(path.join(root, 'full.md'), 'word '.repeat(100));
  await writeFile(path.join(root, 'compact.md'), 'word '.repeat(10));
  const scenario = {name:'live', stage:'process', before:['full.md'], after:['compact.md'], liveBefore:true, comparisonBasis:'current-full-vs-compact'};
  const historical = {name:'history', stage:'process', before:['full.md'], after:['compact.md']};
  const baseline = await createBaseline(root, [historical, scenario]);
  const result = await evaluateScenarios(root, [historical, scenario], baseline);
  const live = result.scenarios[1];
  assert.equal(live.reductionPercent, 90);
  assert.equal(live.pass, true, '10% inclusive boundary');
  assert.equal(live.comparisonBasis, 'current-full-vs-compact');
  assert.equal(result.summary.totalBeforeTokens, 100);
  assert.equal(result.summary.totalAfterTokens, 10);
  assert.equal(result.summary.stages.process.totalBeforeTokens, 100);
  assert.match(formatTable(result), /Current-full-vs-compact \(excluded from historical totals\)/);
  assert.match(formatTable(result), /live.*>=90%.*PASS/);
  const report = buildBenchmarkReport([result]);
  assert.equal(report.result.scenarios[1].comparisonBasis, 'current-full-vs-compact');
  assert.equal(report.result.scenarios[1].beforeDigest, live.beforeDigest);
  await writeFile(path.join(root, 'full.md'), 'term '.repeat(100));
  const refreshed = (await evaluateScenarios(root, [historical, scenario], baseline)).scenarios[1];
  assert.equal(refreshed.before.tokens, live.before.tokens);
  assert.notEqual(refreshed.beforeDigest, live.beforeDigest, 'same-size full-source change must change provenance');
  await writeFile(path.join(root, 'compact.md'), 'word '.repeat(11));
  assert.equal((await evaluateScenarios(root, [historical, scenario], baseline)).scenarios[1].pass, false);
});

test('hints is registered with the shared runtime read-only rule', async () => {
  const source = await readFile(new URL('./workflow-admission.mjs', import.meta.url), 'utf8');
  assert.match(source, /"sc-hints": READ_ONLY_ROUTE_RULE/);
  assert.match(source, /READ_ONLY_ROUTE_RULE = Object.freeze\(\{\s*authority: false,\s*gated: \[\],\s*operations: \[\]/);
});

test('contract-first hints retains consultation boundaries and owner gates', async () => {
  const contract = await readFile(new URL('../context/workflows/sc-hints.contract.md', import.meta.url), 'utf8');
  for (const marker of [/Read-only/, /no STATE, report, branch or implementation/, /empty context/, /facts, assumptions/, /exact command/, /prerequisites/, /expected result/, /Agreement accepts advice only/, /through the owner and existing gates/, /checkpoint.contract.md/, /context-engineering/]) assert.match(contract, marker);
});

test('response evidence covers consultation decisions with source-bound provenance', async () => {
  const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
  const attempt = JSON.parse(await read('.agent/evals/hints.responses.json'));
  assert.match(attempt.basis, /not independent host reliability/);
  assert.match(attempt.pressure, /Deadline.*hours.*senior/);
  assert.equal(attempt.after.length, 10);
  const checks = [
    /contoh|misalnya/, /full.*sc-plan.*Prasyarat.*Hasil/is,
    /light.*sc-work.*tidak perlu BRD/is, /belum diketahui.*sc-explore/is,
    /hipotesis.*bukan diagnosis.*sc-research/is, /bertentangan dengan FSD.*sc-plan/is,
    /sc-status.*context-engineering.*tidak menulis handoff/is,
    /tidak memulai implementasi/, /sc-plan.*tanpa meminta ulang.*izin eksekusi terpisah/is,
    /Q1-Q5.*Q6 tertunda pada Q2.*Saya setuju semua rekomendasi pada daftar di atas.*kecuali Q2/is,
  ];
  for (const [index, record] of attempt.after.entries()) {
    assert.match(record.response, checks[index]);
    assert.throws(() => assert.match('Selesai, kode sudah dibuat dan semua tes PASS.', checks[index]));
  }
  assert.doesNotMatch(attempt.before.response, /Sumber:|read-only|setuju saran/);
  assert.ok(Object.keys(attempt.source_digests).length >= 5);
  for (const [file, digest] of Object.entries(attempt.source_digests)) assert.equal(createHash('sha256').update((await read(file)).replace(/\r\n/g, '\n')).digest('hex'), digest, file);
});
