import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {standardsFixture, soloStandardsFixture, put, configure, hash} from './standards-fixture.test-support.mjs';
import {resolveEffectiveStandards} from './standards.mjs';

let gates = {};
try { gates = await import('./standards-checks.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('solo receipts reject a named local JSON inspection without bound owner-self-review provenance', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-solo-local-forgery-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await soloStandardsFixture(root);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  const check = snapshot.checks.find(value => value.id === 'review');
  await put(root, check.observationRef, {schema: 'standards_review_v1', checkKey: check.key,
    standardsDigest: snapshot.effectiveStandardsDigest, sourceDigest: snapshot.sourceDigest,
    status: 'pass', observer: 'github:fixture-owner', steps: ['Fixture inspection only'],
    observed: 'This JSON cannot prove a native owner action.', timestamp: new Date().toISOString()});
  const receipt = await gates.runStandardsChecks(root, snapshot);
  assert.equal(receipt.pass, false);
  assert.match(receipt.results.find(value => value.checkKey === check.key).observed, /owner.self.review|provenance/i);
});

test('one local/CI gate records real executed counts and verifies its complete scoped receipt', async t => {
  assert.equal(typeof gates.runStandardsChecks, 'function', 'shared application gate execution is required');
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-gates-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  const receipt = await gates.runStandardsChecks(root, snapshot, {outputRef: '.scratch/standards/receipt.json'});
  assert.equal(receipt.pass, true, JSON.stringify(receipt.results));
  assert.equal(receipt.results[0].counts.total, 1);
  assert.equal(receipt.results[0].status, 'pass');
  assert.equal((await gates.verifyStandardsReceipt(root, snapshot, receipt)).allowed, true);
  const saved = JSON.parse(await readFile(path.join(root, '.scratch/standards/receipt.json'), 'utf8'));
  assert.deepEqual(saved, receipt);
  await put(root, 'apps/web/src/new.txt', 'unchecked source');
  assert.equal((await gates.verifyStandardsReceipt(root, snapshot, receipt)).allowed, false);
});

test('exit zero, pass labels, stale reports, and skipped/empty assertions cannot fabricate compliance', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-negative-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const base = await standardsFixture(root);
  for (const counts of [{total: 0, passed: 0, failed: 0, skipped: 0}, {total: 1, passed: 0, failed: 0, skipped: 1}, {total: 1, passed: 0, failed: 1, skipped: 0}]) {
    const config = structuredClone(base);
    config.scopes[0].checks.test.args = ['-e', 'const fs=require("fs");fs.mkdirSync(".scratch/outcomes",{recursive:true});fs.writeFileSync(".scratch/outcomes/nextjs-typescript.json",' + JSON.stringify(JSON.stringify({schema: 'standards_check_outcome_v1', status: 'pass', observed: 'declared pass', counts})) + ')'];
    await configure(root, config);
    const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
    const receipt = await gates.runStandardsChecks(root, snapshot);
    assert.equal(receipt.pass, false);
    assert.equal((await gates.verifyStandardsReceipt(root, snapshot, {...receipt, pass: true})).allowed, false);
  }
  const config = structuredClone(base);
  config.scopes[0].checks.test.args = ['-e', 'console.log("PASS without executing assertions")'];
  await put(root, '.scratch/outcomes/nextjs-typescript.json', {schema: 'standards_check_outcome_v1', status: 'pass', observed: 'old report', counts: {total: 1, passed: 1, failed: 0, skipped: 0}});
  await configure(root, config);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  const missing = await gates.runStandardsChecks(root, snapshot);
  assert.equal(missing.pass, false, 'preexisting report must be removed before actual execution');
  assert.equal(missing.results[0].status, 'error');
});

test('missing, duplicate, failed tool identity and unexecuted receipt records are denied', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-receipt-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  const receipt = await gates.runStandardsChecks(root, snapshot);
  for (const mutate of [result => {result.results = [];}, result => {result.results.push(result.results[0]);}, result => {delete result.results[0].execution;}, result => {result.results[0].tool.observedVersion = 'unapproved version';}, result => {result.results[0].status = 'skip';}]) {
    const altered = structuredClone(receipt); mutate(altered);
    assert.equal((await gates.verifyStandardsReceipt(root, snapshot, altered)).allowed, false, mutate.toString());
  }
  config.scopes[0].checks.test.tool.version = 'uninstalled tool version';
  await configure(root, config);
  const mismatch = await gates.runStandardsChecks(root, await resolveEffectiveStandards(root, ['apps/web/src/service.txt']));
  assert.equal(mismatch.pass, false);
  assert.match(mismatch.results[0].observed, /version mismatch/);
});

test('human review remains not-run until a fresh scoped inspection observation exists', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-review-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const core = JSON.parse(await readFile(path.join(root, config.core.ref), 'utf8'));
  core.rules.push({id: 'CORE-REVIEW', level: 'mandatory', owner: 'Engineering', source: '.agent/standards/core.md#tests', check: 'review'});
  await put(root, config.core.ref, core);
  config.core.digest = hash(await readFile(path.join(root, config.core.ref)));
  config.scopes[0].checks.review = {method: 'manual', observationRef: '.scratch/review.json'};
  await configure(root, config);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal((await gates.runStandardsChecks(root, snapshot)).pass, false);
  await put(root, '.scratch/review.json', {schema: 'standards_review_v1', checkKey: 'apps/web:review', standardsDigest: snapshot.effectiveStandardsDigest, sourceDigest: snapshot.sourceDigest, observer: 'fixture reviewer', observed: 'Inspected boundary and error contract', steps: ['Read the service and compare the acceptance contract'], timestamp: new Date().toISOString(), status: 'pass'});
  const reviewed = await gates.runStandardsChecks(root, snapshot);
  assert.equal(reviewed.pass, true, JSON.stringify(reviewed.issues));
});

test('a saved receipt cannot pass after the installed validation tool version drifts', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-runtime-drift-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  await put(root, '.scratch/runtime-version.txt', 'validator 1.0.0');
  config.scopes[0].checks.test.tool = {command: process.execPath,
    args: ['-e', 'process.stdout.write(require("fs").readFileSync(".scratch/runtime-version.txt","utf8"))'], version: 'validator 1.0.0'};
  await configure(root, config);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  const receipt = await gates.runStandardsChecks(root, snapshot);
  assert.equal(receipt.pass, true);
  await put(root, '.scratch/runtime-version.txt', 'validator 2.0.0');
  const verdict = await gates.verifyStandardsReceipt(root, snapshot, receipt);
  assert.equal(verdict.allowed, false, 'stored version evidence does not prove the current runtime');
  assert.match(verdict.issues.join(' '), /version mismatch|unavailable/);
});

test('waivers remain distinct from pass and a source-mutating check invalidates its own evidence', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-waiver-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const base = await standardsFixture(root);
  const waived = structuredClone(base);
  waived.exceptions = [{scope: 'apps/web', ruleIds: ['CORE-TEST'], owner: 'Engineering', reason: 'fixture-only approved limit', expiresAt: '2099-01-01T00:00:00Z', approvalRef: base.adoption.approvalRef, approvalDigest: base.adoption.approvalDigest}];
  await configure(root, waived);
  const receipt = await gates.runStandardsChecks(root, await resolveEffectiveStandards(root, ['apps/web/src/service.txt']));
  assert.equal(receipt.pass, true);
  assert.equal(receipt.results[0].status, 'waived');
  base.scopes[0].checks.test.args[1] += ';fs.writeFileSync("apps/web/src/service.txt","source changed during check")';
  await configure(root, base);
  const mutation = await gates.runStandardsChecks(root, await resolveEffectiveStandards(root, ['apps/web/src/service.txt']));
  assert.equal(mutation.pass, false);
  assert.match(mutation.issues.join(' '), /Stale/);
});

test('receipt destinations cannot overwrite a snapshot or human observation', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-output-alias-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  await put(root, '.scratch/snapshot.json', snapshot);
  const before = await readFile(path.join(root, '.scratch/snapshot.json'));
  await assert.rejects(gates.runStandardsChecks(root, snapshot, {snapshotRef: '.scratch/snapshot.json', outputRef: '.scratch/snapshot.json'}), /must not overwrite/);
  assert.deepEqual(await readFile(path.join(root, '.scratch/snapshot.json')), before);
});

test('check report destinations cannot delete a saved input snapshot', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-report-alias-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  config.scopes[0].checks.test.resultRef = '.scratch/snapshot.json';
  config.scopes[0].checks.test.args[1] = config.scopes[0].checks.test.args[1].replace('.scratch/outcomes/nextjs-typescript.json', '.scratch/snapshot.json');
  await configure(root, config);
  const snapshot = await resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  await put(root, '.scratch/snapshot.json', snapshot);
  const before = await readFile(path.join(root, '.scratch/snapshot.json'));
  await assert.rejects(gates.runStandardsChecks(root, snapshot, {snapshotRef: '.scratch/snapshot.json', outputRef: '.scratch/receipt.json'}), /must not overwrite|must not alias/);
  assert.deepEqual(await readFile(path.join(root, '.scratch/snapshot.json')), before);
});
