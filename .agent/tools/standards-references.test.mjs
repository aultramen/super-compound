import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {copyActiveDistribution, isDistributionAsset} from './active-assets.mjs';

const examples = new URL('../standards/examples/', import.meta.url);
const reference = fileURLToPath(new URL('nextjs-typescript/', examples));
const bridge = path.join(reference, 'checks/next-rule-bridge');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const provenance = () => JSON.parse(fs.readFileSync(path.join(bridge, 'PROVENANCE.json')));
test('Next.js reference freezes the manifest dependencies and transitive integrity', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('nextjs-typescript/package.json', examples)));
  const ref = new URL('nextjs-typescript/package-lock.json', examples);
  assert.ok(fs.existsSync(ref), 'qualified Next.js reference requires a frozen lockfile');
  const lock = JSON.parse(fs.readFileSync(ref));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, manifest.name);
  for (const kind of ['dependencies','devDependencies']) assert.deepEqual(lock.packages[''][kind], manifest[kind]);
  for (const [name, value] of Object.entries(lock.packages)) {
    if (!name) continue;
    assert.match(value.integrity ?? '', /^sha512-/, `registry package integrity required: ${name}`);
    assert.match(value.resolved ?? '', /^https:\/\/registry\.npmjs\.org\//, `review registry provenance: ${name}`);
  }
});

test('Next.js reference retains exact licensed upstream sources and separate owned identities', () => {
  const manifest = provenance();
  assert.equal(manifest.schema, 'next_reference_source_manifest_v1');
  assert.ok(manifest.owner);
  assert.equal(manifest.upstream.name, '@next/eslint-plugin-next');
  assert.equal(manifest.upstream.version, '16.4.0');
  assert.equal(manifest.upstream.license, 'MIT');
  assert.match(manifest.upstream.integrity, /^sha512-/);
  assert.match(manifest.upstream.tarball, /^https:\/\/registry\.npmjs\.org\/@next\/eslint-plugin-next\//);
  assert.match(manifest.upstream.gitTagCommit, /^[a-f0-9]{40}$/);
  assert.equal(manifest.upstream.gitTagIsNotTarballAttestation, true);
  assert.equal(manifest.upstream.publishedSources.length, 25);
  assert.equal(manifest.firstParty.contract, 'default-context-cwd-only');
  assert.deepEqual(manifest.firstParty.sources.map(source => source.path).sort(), [
    'index.cjs', 'package.json', 'published/utils/get-root-dirs.js',
  ]);
  const sources = [...manifest.upstream.publishedSources, ...manifest.firstParty.sources];
  assert.equal(new Set(sources.map(source => source.path)).size, sources.length);
  for (const source of sources) {
    assert.ok(!path.isAbsolute(source.path) && !source.path.split('/').includes('..'), source.path);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.equal(sha256(path.join(bridge, source.path)), source.sha256, source.path);
  }
  assert.equal(sha256(path.join(bridge, manifest.upstream.licensePath)), manifest.upstream.licenseSha256);
  assert.match(fs.readFileSync(path.join(bridge, manifest.upstream.licensePath), 'utf8'), /MIT License/);
});

test('Next.js bridge preserves all recommended rule IDs and severities without the old root dependency chain', () => {
  const sourceManifest = provenance();
  const loaded = {module: {exports: {}}, require: ref => {
    assert.match(ref, /^\.\/published\/rules\/[a-z-]+$/);
    assert.ok(fs.existsSync(path.join(bridge, `${ref}.js`)), ref);
    return {default: {source: ref}};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(bridge, 'index.cjs'), 'utf8'), loaded);
  const plugin = loaded.module.exports;
  assert.equal(Object.keys(plugin.rules).length, 22);
  assert.deepEqual(JSON.parse(JSON.stringify(plugin.configs.recommended.rules)), sourceManifest.recommendedRules);
  assert.equal(Object.keys(sourceManifest.recommendedRules).length, 22);
  for (const [rule, severity] of Object.entries(sourceManifest.recommendedRules)) {
    assert.ok(Object.hasOwn(plugin.rules, rule.replace('@next/next/', '')), rule);
    assert.ok(['warn', 'error'].includes(severity), rule);
  }
  const packageManifest = JSON.parse(fs.readFileSync(path.join(reference, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(reference, 'package-lock.json')));
  assert.equal(packageManifest.dependencies.next, '16.4.0');
  assert.equal(packageManifest.devDependencies['@eslint-community/eslint-utils'], '4.9.1');
  assert.ok(!Object.hasOwn(packageManifest, 'overrides'));
  for (const name of ['@next/eslint-plugin-next', 'fast-glob', 'braces']) {
    assert.ok(!Object.hasOwn(lock.packages, `node_modules/${name}`), name);
  }
});

test('Next.js reference cwd contract denies defined root settings and invalid directories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-next-cwd-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const file = path.join(root, 'file.ts');
  fs.writeFileSync(file, 'export {};\n');
  const {getRootDirs} = createRequire(import.meta.url)(path.join(bridge, 'published/utils/get-root-dirs.js'));
  assert.deepEqual(getRootDirs({cwd: root}), [root]);
  assert.deepEqual(getRootDirs({cwd: root, settings: {next: {rootDir: undefined}}}), [root]);
  for (const rootDir of ['.', root, 'src/**', ['.'], [], '', null, false, 0, {}]) {
    assert.throws(() => getRootDirs({cwd: root, settings: {next: {rootDir}}}), /accepts only default cwd roots/);
  }
  for (const cwd of [undefined, null, '', '.', 0]) {
    assert.throws(() => getRootDirs({cwd}), /requires an absolute cwd directory/);
  }
  assert.throws(() => getRootDirs({cwd: file}), /requires cwd to be a directory/);
  assert.throws(() => getRootDirs({cwd: path.join(root, 'missing')}), /ENOENT/);
});

test('active distribution retains the complete Next.js reference source manifest and excludes generated assets', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-next-source-distribution-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const destination = path.join(root, 'bundle');
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  copyActiveDistribution(repoRoot, destination);
  const prefix = '.agent/standards/examples/nextjs-typescript';
  const output = path.join(destination, prefix, 'checks/next-rule-bridge');
  const sourceManifest = provenance();
  assert.equal(sha256(path.join(output, 'PROVENANCE.json')), sha256(path.join(bridge, 'PROVENANCE.json')));
  for (const source of [...sourceManifest.upstream.publishedSources, ...sourceManifest.firstParty.sources]) {
    assert.ok(isDistributionAsset(`${prefix}/checks/next-rule-bridge/${source.path}`));
    assert.equal(sha256(path.join(output, source.path)), source.sha256, source.path);
  }
  assert.equal(sha256(path.join(output, sourceManifest.upstream.licensePath)), sourceManifest.upstream.licenseSha256);
  for (const generated of ['node_modules/a.js', 'dist/a.js', '.next/a.js', '.vitest-results.json', '.test-outcome.json']) {
    assert.equal(isDistributionAsset(`${prefix}/${generated}`), false, generated);
    assert.ok(!fs.existsSync(path.join(destination, prefix, generated)), generated);
  }
});

test('FastAPI reference has a universal frozen lock for its declared checks extra', () => {
  const ref = new URL('fastapi-python/uv.lock', examples);
  assert.ok(fs.existsSync(ref), 'qualified FastAPI reference requires a frozen lockfile');
  const lock = fs.readFileSync(ref, 'utf8');
  assert.match(lock, /requires-python = ">=3\.12"/);
  for (const name of ['fastapi','httpx','pytest','ruff','mypy']) assert.match(lock, new RegExp(`name = "${name}"`));
  assert.match(lock, /sha256:/);
  assert.ok(fs.existsSync(fileURLToPath(new URL('fastapi-python/pyproject.toml', examples))));
});
