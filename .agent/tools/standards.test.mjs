import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {standardsFixture, soloStandardsFixture, configure, put, hash} from './standards-fixture.test-support.mjs';

let standards = {};
try { standards = await import('./standards.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('optional solo owner authority binds a versioned scoped fixture appointment without claiming authentication', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-solo-authority-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await soloStandardsFixture(root);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(snapshot.status, 'ready', snapshot.conflicts.join('; '));
  assert.equal(snapshot.reviewAuthority?.mode, 'solo-owner');
  assert.equal(snapshot.reviewAuthority.contractVersion, '1.0.0');
  assert.equal(snapshot.reviewAuthority.maxAgeHours, 24);
  assert.equal(snapshot.reviewAuthority.ownerLogin, 'fixture-owner');
  assert.deepEqual(snapshot.reviewAuthority.scopes, ['apps/web']);
  assert.equal(snapshot.reviewAuthority.approvalDigest, config.adoption.approvalDigest);
  assert.ok(snapshot.inputs.some(input => input.ref === config.adoption.reviewAuthority.policyRef));
  assert.ok(snapshot.engine.some(input => input.name === 'standards-github-review.mjs'));
  assert.match(snapshot.limitations.join(' '), /owner self-review[\s\S]*not.*authenticated/i);
});

test('solo authority rejects unsupported settings, revoked appointments, invalid scope and lifetime', async t => {
  const cases = [
    config => config.adoption.reviewAuthority.mode = 'independent-but-solo',
    config => config.adoption.reviewAuthority.contractVersion = '2.0.0',
    config => config.adoption.reviewAuthority.provider = 'local-json',
    config => config.adoption.reviewAuthority.policyRef = 'docs/other-policy.md',
    config => config.adoption.reviewAuthority.allowBot = true,
    config => config.adoption.reviewAuthority.maxAgeHours = 25,
    config => config.adoption.reviewAuthority.maxAgeHours = 0,
    config => config.adoption.reviewAuthority.ownerLogin = '../owner',
    config => config.adoption.reviewAuthority = null,
  ];
  for (const mutate of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sc-solo-settings-'));
    t.after(() => rm(root, {recursive: true, force: true}));
    const config = await soloStandardsFixture(root); mutate(config); await configure(root, config);
    assert.equal((await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt'])).status, 'conflict');
  }
  for (const mutate of [
    value => value.status = 'revoked', value => value.owner = 'Different owner',
    value => value.ownerLogin = 'other-owner', value => value.repository = '../app',
    value => value.scopes = ['services/api'], value => value.scopes = ['apps/web', 'apps/web'],
    value => value.allowBot = true,
    value => value.approvedAt = new Date(Date.now() + 3600000).toISOString(),
    value => value.approvedAt = new Date(Date.now() - 40 * 86400000).toISOString(),
    value => value.expiresAt = new Date(Date.now() - 1000).toISOString(),
  ]) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sc-solo-appointment-'));
    t.after(() => rm(root, {recursive: true, force: true}));
    const config = await soloStandardsFixture(root);
    const appointment = JSON.parse(await readFile(path.join(root, config.adoption.approvalRef), 'utf8'));
    mutate(appointment); await put(root, config.adoption.approvalRef, appointment);
    config.adoption.approvalDigest = hash(await readFile(path.join(root, config.adoption.approvalRef)));
    await configure(root, config);
    assert.equal((await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt'])).status, 'conflict');
  }
});

test('changing or expiring solo appointment invalidates the effective snapshot without disabling review', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-solo-drift-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await soloStandardsFixture(root);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  await assert.rejects(standards.assertFreshStandards(root, snapshot, {now: new Date(config.adoption.reviewAuthority.expiresAt)}), /Stale/);
  await put(root, config.adoption.approvalRef, 'Revoked fixture appointment\n');
  await assert.rejects(standards.assertFreshStandards(root, snapshot), /Stale/);
});

test('legacy configuration stays inspectable without inventing organizational compliance', async t => {
  assert.equal(typeof standards.resolveEffectiveStandards, 'function', 'a shared scoped standards resolver is required');
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-legacy-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const result = await standards.resolveEffectiveStandards(root, ['src/service.js']);
  assert.equal(result.status, 'legacy');
  assert.equal(result.checks.length, 0);
  assert.match(result.limitations.join(' '), /compliance/i);
});

test('conflicting detection never replaces explicit configuration', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-conflict-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  const before = await readFile(path.join(root, '.agent/rules/project-config.md'));
  await put(root, 'apps/web/package.json', {dependencies: {next: '17.0.0'}});
  const result = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(result.status, 'conflict');
  assert.match(result.conflicts.join(' '), /framework\/version conflicts/);
  assert.deepEqual(await readFile(path.join(root, '.agent/rules/project-config.md')), before);
});

test('unknown frameworks use core and repository conventions without complete framework claims', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-unknown-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  config.scopes[0].profile = null;
  await configure(root, config);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(snapshot.status, 'ready', JSON.stringify(snapshot.conflicts));
  assert.equal(snapshot.scopes[0].profile, null);
  assert.match(snapshot.limitations.join(' '), /complete framework validation is unavailable/);
});

test('core-only scopes disclose configured checks that have no mandatory rule without executing them', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-unused-check-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  config.scopes[0].profile = null;
  config.scopes[0].checks.format = {command: process.execPath,
    args: ['-e', 'throw Error("An unreferenced format binding must not execute")'],
    tool: {command: process.execPath, args: ['--version'], version: process.version}};
  await configure(root, config);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(snapshot.status, 'ready', JSON.stringify(snapshot.conflicts));
  assert.equal(snapshot.scopes[0].profile, null);
  assert.deepEqual(snapshot.rules.map(rule => rule.id), ['CORE-TEST']);
  assert.deepEqual(snapshot.checks.map(check => check.key), ['apps/web:test']);
  assert.match(snapshot.limitations.join(' '), /apps\/web: configured check format is not scheduled.*no adopted mandatory rule/);
  const {runStandardsChecks} = await import('./standards-checks.mjs');
  const receipt = await runStandardsChecks(root, snapshot);
  assert.equal(receipt.pass, true, JSON.stringify(receipt.issues));
  assert.deepEqual(receipt.limitations, snapshot.limitations);
  assert.deepEqual(receipt.results.map(result => result.checkKey), ['apps/web:test']);
});

test('supported profile bindings remain scheduled without unused-check limitations', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-profile-check-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const scope = config.scopes[0];
  const profile = JSON.parse(await readFile(path.join(root, scope.profile.ref), 'utf8'));
  profile.rules.push({id: 'NEXT-FORMAT', level: 'mandatory', owner: 'Engineering',
    source: '.agent/standards/core.md#tests', check: 'format'});
  await put(root, scope.profile.ref, profile);
  scope.profile.digest = hash(await readFile(path.join(root, scope.profile.ref)));
  scope.checks.format = {command: process.execPath, args: ['--version'],
    tool: {command: process.execPath, args: ['--version'], version: process.version}};
  await configure(root, config);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(snapshot.status, 'ready', JSON.stringify(snapshot.conflicts));
  assert.equal(snapshot.scopes[0].profile.id, 'nextjs-typescript');
  assert.deepEqual(snapshot.checks.map(check => check.key), ['apps/web:format', 'apps/web:test']);
  assert.deepEqual(snapshot.limitations, []);
});

test('unused inherited bindings are disclosed only for selected scopes, without sibling leakage', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-unused-inherit-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const binding = {command: process.execPath, args: ['--version'],
    tool: {command: process.execPath, args: ['--version'], version: process.version}};
  config.scopes.unshift({path: '.', profile: null, checks: {format: binding}});
  config.scopes[2].checks.lint = binding;
  await configure(root, config);
  const web = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(web.status, 'ready', JSON.stringify(web.conflicts));
  assert.deepEqual(web.scopes.map(scope => scope.path), ['apps/web']);
  assert.equal(web.limitations.length, 1);
  assert.match(web.limitations[0], /^apps\/web: configured check format is not scheduled/);
  assert.deepEqual(web.checks.map(check => check.key), ['apps/web:test']);
  const api = await standards.resolveEffectiveStandards(root, ['services/api/src/service.txt']);
  assert.equal(api.status, 'ready', JSON.stringify(api.conflicts));
  assert.deepEqual(api.scopes.map(scope => scope.path), ['services/api']);
  assert.equal(api.limitations.length, 2);
  assert.match(api.limitations[0], /^services\/api: configured check format is not scheduled/);
  assert.match(api.limitations[1], /^services\/api: configured check lint is not scheduled/);
  assert.deepEqual(api.checks.map(check => check.key), ['services/api:test']);
});

test('new files, source edits, and configuration changes invalidate a saved scope snapshot', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-fresh-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  await standards.assertFreshStandards(root, snapshot);
  await put(root, 'apps/web/src/new.txt', 'new unchecked source');
  await assert.rejects(standards.assertFreshStandards(root, snapshot), /Stale/);
});

test('invalid schemas, duplicate scopes, expired waivers, traversal, and core downgrades fail closed', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-invalid-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const base = await standardsFixture(root);
  const cases = [
    config => {config.schema = 'project_standards_v999';},
    config => {config.scopes.push(config.scopes[0]);},
    config => {config.scopes[0].path = '../outside';},
    config => {config.exceptions = [{scope: 'apps/web', ruleIds: ['CORE-TEST'], owner: 'Engineering', reason: 'temporary', approvalRef: config.adoption.approvalRef, approvalDigest: config.adoption.approvalDigest, expiresAt: '2000-01-01T00:00:00Z'}];},
    config => {config.scopes[0].checks.test.key = 'services/api:review';},
    config => {config.scopes[0].checks.test = {method: 'manual', observationRef: '.scratch/claim.json'};},
    config => {config.scopes[0].checks.review = structuredClone(config.scopes[0].checks.test);},
  ];
  for (const change of cases) {
    const config = structuredClone(base); change(config); await configure(root, config);
    assert.equal((await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt'])).status, 'conflict', change.toString());
  }
  const profileRef = base.scopes[0].profile.ref;
  const profile = JSON.parse(await readFile(path.join(root, profileRef), 'utf8'));
  profile.rules = [{id: 'CORE-TEST', level: 'recommendation', owner: 'Engineering', source: '.agent/standards/core.md#tests', check: null}];
  await put(root, profileRef, profile);
  base.scopes[0].profile.digest = hash(await readFile(path.join(root, profileRef)));
  await configure(root, base);
  const downgrade = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(downgrade.status, 'conflict');
  assert.match(downgrade.conflicts.join(' '), /override or downgrade/);
});

test('explicit directory profiles isolate a monorepo and pin effective standards', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-scopes-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  const web = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(web.status, 'ready', JSON.stringify(web.conflicts));
  assert.ok(web.engine.some(record => record.name === '../standards/tools/python-manifest.py' && /^[a-f0-9]{64}$/.test(record.digest)), 'Python manifest parser is part of the pinned resolver engine');
  assert.deepEqual(web.scopes.map(scope => scope.path), ['apps/web']);
  assert.deepEqual(web.scopes.map(scope => scope.profile.id), ['nextjs-typescript']);
  assert.deepEqual(web.checks.map(check => check.key), ['apps/web:test']);
  assert.match(web.effectiveStandardsDigest, /^[a-f0-9]{64}$/);
  const both = await standards.resolveEffectiveStandards(root, ['services/api/src/service.txt', 'apps/web/src/service.txt']);
  assert.deepEqual(both.scopes.map(scope => scope.profile.id), ['nextjs-typescript', 'fastapi-python']);
  assert.equal(both.rules.filter(rule => rule.id === 'CORE-TEST').length, 2);
  assert.equal(both.effectiveStandardsDigest, (await standards.resolveEffectiveStandards(root, [...both.paths].reverse())).effectiveStandardsDigest);
});

test('nearest scope inherits check defaults while shared inputs select only their declared consumers', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-inherit-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const testBinding = config.scopes[0].checks.test;
  config.scopes.unshift({path: '.', profile: null, configRefs: [], checks: {test: testBinding}});
  config.scopes[1].checks = {};
  config.scopes[1].dependsOn = ['packages/contracts'];
  config.scopes[2].dependsOn = ['packages/contracts'];
  await put(root, 'packages/contracts/api.json', {version: 1});
  await configure(root, config);
  const web = await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt']);
  assert.equal(web.status, 'ready');
  assert.deepEqual(web.scopes.map(scope => scope.path), ['apps/web']);
  assert.equal(web.checks[0].kind, 'command');
  assert.equal(web.checks[0].command, testBinding.command);
  const shared = await standards.resolveEffectiveStandards(root, ['packages/contracts/api.json']);
  assert.equal(shared.status, 'conflict', 'root and web intentionally share one resultRef; receipts must be distinct per consumer');
  assert.match(shared.conflicts.join(' '), /distinct output paths/);
});

test('Python manifest comments cannot masquerade as framework version evidence', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-python-evidence-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  await put(root, 'services/api/pyproject.toml', '# fastapi==0.119.0\n[project]\ndependencies = []\n');
  const result = await standards.resolveEffectiveStandards(root, ['services/api/src/service.txt']);
  assert.equal(result.status, 'conflict');
  assert.match(result.conflicts.join(' '), /framework conflicts with Python manifest/);
});

test('malformed/duplicate blocks and missing owner approval remain conflicts', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-config-block-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  const valid = await readFile(path.join(root, '.agent/rules/project-config.md'), 'utf8');
  for (const content of [valid + '\n```json super-compound-standards\n{}\n```\n', '```json super-compound-standards\n{}', '```json super-compound-standards\n{invalid}\n```']) {
    await put(root, '.agent/rules/project-config.md', content);
    assert.equal((await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt'])).status, 'conflict');
  }
  delete config.adoption;
  await configure(root, config);
  assert.match((await standards.resolveEffectiveStandards(root, ['apps/web/src/service.txt'])).conflicts.join(' '), /owner approval/);
});

test('a policy change never exempts unrelated unconfigured source from coverage', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-uncovered-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  await put(root, 'new-service/main.py', 'print("unconfigured")');
  const snapshot = await standards.resolveEffectiveStandards(root, ['.agent/standards/core.md', 'new-service/main.py']);
  assert.equal(snapshot.status, 'conflict');
  assert.match(snapshot.conflicts.join(' '), /No configured standards scope covers change/);
});

test('shared check configuration selects its owning scope instead of being treated as uncovered source', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-shared-check-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const config = await standardsFixture(root);
  config.scopes[0].checks.test.configRefs = ['shared-validation.json'];
  await put(root, 'shared-validation.json', {rules: ['required']});
  await configure(root, config);
  const snapshot = await standards.resolveEffectiveStandards(root, ['shared-validation.json']);
  assert.equal(snapshot.status, 'ready', JSON.stringify(snapshot.conflicts));
  assert.deepEqual(snapshot.scopes.map(scope => scope.path), ['apps/web']);
});

test('source directories named build or dist remain inventoried and cannot hide stale code', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-source-layout-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  await put(root, 'apps/web/src/build/task.ts', 'export const count: number = 1;');
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/build/task.ts']);
  assert.equal(snapshot.status, 'ready');
  assert.ok(snapshot.inventory.some(input => input.ref === 'apps/web/src/build/task.ts'));
  await put(root, 'apps/web/src/build/task.ts', 'export const count: number = false;');
  await assert.rejects(standards.assertFreshStandards(root, snapshot), /Stale/);
});

test('resolver output cannot overwrite its authoritative paths input', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-cli-alias-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  await put(root, '.scratch/paths.json', ['apps/web/src/service.txt']);
  const before = await readFile(path.join(root, '.scratch/paths.json'));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./standards.mjs', import.meta.url)), '--root', root, '--paths-file', '.scratch/paths.json', '--output', '.scratch/paths.json'], {encoding: 'utf8', windowsHide: true});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must not overwrite/);
  assert.deepEqual(await readFile(path.join(root, '.scratch/paths.json')), before);
});

test('explicit targets remain fingerprinted even inside excluded runtime directories', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-explicit-cache-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await standardsFixture(root);
  await put(root, 'apps/web/src/.venv/task.ts', 'export const count = 1;');
  const snapshot = await standards.resolveEffectiveStandards(root, ['apps/web/src/.venv/task.ts']);
  assert.ok(snapshot.inventory.some(input => input.ref === 'apps/web/src/.venv/task.ts'));
  await put(root, 'apps/web/src/.venv/task.ts', 'export const count = false;');
  await assert.rejects(standards.assertFreshStandards(root, snapshot), /Stale/);
});
