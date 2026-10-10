import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setup,installCodexBundle} from './setup.mjs';
import {standardsFixture,configure,put} from './standards-fixture.test-support.mjs';
import {resolveEffectiveStandards} from './standards.mjs';
import {runStandardsChecks,verifyStandardsReceipt} from './standards-checks.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-standards-install-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const source = path.join(root, 'source'), target = path.join(root, 'target'), home = path.join(root, 'home');
  const write = (relative, text) => {
    const full = path.join(source, relative);
    fs.mkdirSync(path.dirname(full), {recursive:true});
    fs.writeFileSync(full, text);
  };
  write('.agent/context/retired-assets.json', '{"schema":"retired_assets_v1","paths":[]}\n');
  write('.agent/context/agent-models.json', '{"hosts":{"claude-code":{"architect":"inherit"}}}\n');
  write('.agent/context/standards.contract.md', '# Effective standards\n\nResolve the project scope.\n');
  write('.agent/agents/architect.md', '---\nname: architect\ndescription: Architecture review\ntools: ["Read"]\n---\n');
  write('.agent/rules/project-config.md', '# Project Configuration\n');
  write('.agent/standards/core.json', '{"version":"1.0.0","rules":[]}\n');
  for (const name of fs.readdirSync(path.join(repository, '.agent/workflows')).filter(name => /^sc-.*\.md$/.test(name))) write(`.agent/workflows/${name}`, '# Workflow\n');
  return {source,target,home,write,scope:'project',host:'codex'};
}

test('standards assets ship with owned hashes while project configuration stays user-owned', t => {
  const f = fixture(t);
  const config = path.join(f.target, '.agent/rules/project-config.md');
  fs.mkdirSync(path.dirname(config), {recursive:true});
  const custom = '# Custom project\nstandards: pinned-by-owner\n';
  fs.writeFileSync(config, custom);
  assert.equal(setup(f).status, 'applied');
  const relative = '.agent/standards/core.json';
  assert.ok(fs.existsSync(path.join(f.target, relative)), 'standards catalog must be distributed');
  assert.equal(fs.readFileSync(config, 'utf8'), custom);
  const bytes = fs.readFileSync(path.join(f.target, relative));
  const manifest = JSON.parse(fs.readFileSync(path.join(f.target, '.super-compound/manifest.json'), 'utf8'));
  assert.equal(manifest.files[relative].hash, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(manifest.files[relative].owner, 'super-compound');
  assert.equal(setup({...f,command:'doctor'}).status, 'healthy');
});

test('six host adapters point to one scoped standards contract in project and global installs', t => {
  const f = fixture(t);
  assert.equal(setup({...f,scope:'both',host:'codex,claude,antigravity,cursor,windsurf,gemini'}).status, 'applied');
  for (const global of [false,true]) {
    const root = global ? f.home : f.target;
    const entrypoints = [
      `${global ? '.codex' : '.agents'}/skills/super-compound/SKILL.md`,
      global ? '.codex/AGENTS.md' : 'AGENTS.md',
      global ? '.claude/CLAUDE.md' : 'CLAUDE.md',
      global ? '.codeium/windsurf/memories/global_rules.md' : '.windsurf/rules/super-compound.md',
      global ? '.gemini/GEMINI.md' : 'GEMINI.md',
      ...(!global ? ['.cursor/rules/super-compound.mdc'] : []),
    ];
    for (const route of ['sc-init','sc-plan','sc-work','sc-debug','sc-review','sc-audit','sc-status']) entrypoints.push(
      `.claude/commands/${route}.md`,
      `${global ? '.gemini/antigravity' : '.agents'}/skills/${route}/SKILL.md`,
      `.cursor/skills/${route}/SKILL.md`,
      `${global ? '.codeium/windsurf/global_workflows' : '.windsurf/workflows'}/${route}.md`,
      `.gemini/commands/${route}.toml`,
    );
    for (const relative of entrypoints) {
      const text = fs.readFileSync(path.join(root, relative), 'utf8');
      assert.ok(text.includes('context/standards.contract.md'), `${relative} must load canonical standards`);
      assert.ok(text.includes('scope'), `${relative} must select standards for the change scope`);
      assert.ok(text.includes('No Evidence = Not Done'), `${relative} must keep the completion gate`);
    }
  }
});

test('standards updates detect drift, preserve project pins and restore previous bytes after partial apply', t => {
  const f = fixture(t);
  assert.equal(setup(f).status, 'applied');
  const config = path.join(f.target, '.agent/rules/project-config.md');
  const custom = '# Project\nstandards: owner-approved-pin\n';
  fs.writeFileSync(config, custom);
  const relative = '.agent/standards/core.json', full = path.join(f.target, relative);
  const before = fs.readFileSync(full), manifest = fs.readFileSync(path.join(f.target, '.super-compound/manifest.json'));
  f.write(relative, '{"version":"1.1.0","rules":[]}\n');
  assert.equal(setup({...f,command:'doctor'}).status, 'drift');
  assert.deepEqual(fs.readFileSync(full), before);
  const previous = process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;
  process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY = '1';
  try { assert.throws(() => setup({...f,command:'update'}), /partial apply/); }
  finally {
    if (previous === undefined) delete process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;
    else process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY = previous;
  }
  assert.deepEqual(fs.readFileSync(full), before);
  assert.deepEqual(fs.readFileSync(path.join(f.target, '.super-compound/manifest.json')), manifest);
  assert.equal(setup({...f,command:'update'}).status, 'applied');
  assert.equal(fs.readFileSync(config, 'utf8'), custom);
  fs.appendFileSync(full, 'user edit');
  assert.equal(setup({...f,command:'update'}).status, 'conflict');
  assert.ok(fs.readFileSync(full, 'utf8').endsWith('user edit'));
});

test('standards runtime imports are shipped and missing local dependencies stop installation before writes', t => {
  const f = fixture(t);
  f.write('.agent/tools/standards.mjs', "import '../standards/policy.mjs';\n");
  f.write('.agent/standards/policy.mjs', 'export const version = "1.0.0";\n');
  assert.equal(setup(f).status, 'applied');
  assert.ok(fs.existsSync(path.join(f.target, '.agent/standards/policy.mjs')));
  const badTarget = path.join(f.home, 'bad-target');
  f.write('.agent/tools/standards.mjs', "import '../standards/missing.mjs';\n");
  assert.throws(() => setup({...f,target:badTarget}), /Missing local runtime dependency/);
  assert.equal(fs.existsSync(badTarget), false);
});

test('application CI template always verifies aggregate evidence and never installs repository protection', t => {
  const file = path.join(repository, '.agent/templates/standards/application-ci.yml');
  assert.ok(fs.existsSync(file), 'an application CI template must be shipped');
  const yaml = fs.readFileSync(file, 'utf8');
  assert.match(yaml, /standards-aggregate:\s*\n\s+if: \$\{\{ always\(\) \}\}/);
  assert.match(yaml, /needs: \[standards-prepare, standards-review, standards, standards-review-fresh\]/);
  assert.match(yaml, /needs\.standards\.result/);
  assert.match(yaml, /standards-checks\.mjs --verify --snapshot .* --receipt /);
  assert.match(yaml, /if-no-files-found: error/);
  assert.doesNotMatch(yaml, /continue-on-error|paths-ignore:|branches\/.*protection|gh api/);
});

test('application CI restores scoped artifacts and identical runtimes before reproving current tools', t => {
  const yaml = fs.readFileSync(path.join(repository,'.agent/templates/standards/application-ci.yml'),'utf8');
  const aggregate = yaml.slice(yaml.indexOf('  standards-aggregate:'));
  const checks = yaml.slice(0,yaml.indexOf('  standards-aggregate:'));
  assert.match(checks, /uses: actions\/upload-artifact@[a-f0-9]{40} # v4[\s\S]*?path: \.scratch\/standards\/[ \t]*\r?\n/);
  assert.match(aggregate, /uses: actions\/download-artifact@[a-f0-9]{40} # v4[\s\S]*?path: \.scratch\/standards\/[ \t]*\r?\n/);
  assert.match(yaml, /STANDARDS_NODE_VERSION: "24"/);
  assert.match(yaml, /STANDARDS_PYTHON_VERSION: "3\.12"/);
  assert.equal((yaml.match(/node-version: \$\{\{ env\.STANDARDS_NODE_VERSION \}\}/g) ?? []).length, 5);
  assert.equal((yaml.match(/python-version: \$\{\{ env\.STANDARDS_PYTHON_VERSION \}\}/g) ?? []).length, 3);
  assert.match(yaml, /Python 3\.14 application.*same pinned runtime/);
  assert.equal((yaml.match(/same lockfile-based installation steps/g) ?? []).length, 2);
  assert.match(yaml, /resultRef.*observationRef.*\.scratch\/standards\//);
  assert.match(yaml, /secrets and raw logs elsewhere/);
  assert.doesNotMatch(yaml, /path: \.scratch\/\s*$/m);
});

test('authenticated review jobs run protected base tools without PR execution or persisted credentials', () => {
  const yaml=fs.readFileSync(path.join(repository,'.agent/templates/standards/application-ci.yml'),'utf8');
  assert.match(yaml,/pull_request_review:[\s\S]*?types: \[submitted, edited, dismissed\]/);
  assert.doesNotMatch(yaml,/pull_request_target|secrets\.(?!GITHUB_TOKEN)/);
  for(const job of ['standards-review','standards-review-fresh']) {
    const section=yaml.slice(yaml.indexOf(`  ${job}:`)).split(/\n  [a-z-]+:/)[0];
    assert.match(section,/pull-requests: read/);
    assert.match(section,/ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    assert.match(section,/path: trusted/);
    assert.match(section,/persist-credentials: false/);
    assert.match(section,/node trusted\/\.agent\/tools\/standards-github-review\.mjs/);
    assert.match(section,/GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
    assert.doesNotMatch(section,/npm |pip |standards-checks\.mjs|standards\.mjs/);
  }
  assert.match(yaml,/standards-github-review\.mjs --verify/);
  assert.match(yaml,/needs\.standards-review-fresh\.result/);
  assert.match(yaml,/run_attempt/);
  assert.match(yaml,/concurrency:\s*\n\s+group: application-standards-\$\{\{ github\.event\.pull_request\.number \}\}\s*\n\s+cancel-in-progress: true/);
  for (const action of yaml.matchAll(/uses: ([^\r\n]+)/g)) assert.match(action[1],/^actions\/[a-z-]+@[a-f0-9]{40} # v[45]$/);
});

test('fresh-checkout aggregate needs normalized gate artifacts in addition to metadata', async t => {
  const f = fixture(t), app = path.join(f.home,'app'), restored = path.join(f.home,'aggregate');
  const config = await standardsFixture(app);
  for (const scope of config.scopes) {
    scope.checks.test.resultRef = scope.checks.test.resultRef.replace('.scratch/outcomes/','.scratch/standards/results/');
    scope.checks.test.args = scope.checks.test.args.map(arg => arg.replaceAll('.scratch/outcomes','.scratch/standards/results'));
  }
  await configure(app,config);
  const snapshot = await resolveEffectiveStandards(app,['.agent/rules/project-config.md']);
  await put(app,'.scratch/standards/ci/snapshot.json',snapshot);
  const receipt = await runStandardsChecks(app,snapshot,{outputRef:'.scratch/standards/ci/receipt.json'});
  assert.equal(receipt.pass,true,receipt.issues?.join(' '));
  fs.cpSync(app,restored,{recursive:true});
  fs.rmSync(path.join(restored,'.scratch/standards'),{recursive:true});
  fs.cpSync(path.join(app,'.scratch/standards/ci'),path.join(restored,'.scratch/standards/ci'),{recursive:true});
  assert.equal((await verifyStandardsReceipt(restored,snapshot,receipt)).allowed,false,'metadata-only transfer loses actual check reports');
  fs.cpSync(path.join(app,'.scratch/standards'),path.join(restored,'.scratch/standards'),{recursive:true});
  assert.equal((await verifyStandardsReceipt(restored,snapshot,receipt)).allowed,true,'scoped evidence plus current pinned tools verifies on a fresh checkout');
});

test('actual standards entrypoints import from both project core and standalone Codex bundle', t => {
  const f = fixture(t);
  assert.equal(setup({...f,source:repository}).status, 'applied');
  assert.equal(installCodexBundle({command:'install',source:repository,'codex-home':f.home}).status, 'applied');
  for (const base of [path.join(f.target,'.agent'),path.join(f.home,'skills/super-compound/references')]) {
    assert.ok(fs.existsSync(path.join(base,'standards')), 'installed catalog must be present');
    assert.ok(fs.existsSync(path.join(base,'templates/standards/application-ci.yml')), 'application CI template must be installed');
    for (const name of ['standards.mjs','standards-checks.mjs','standards-github-review.mjs']) {
      const url = pathToFileURL(path.join(base,'tools',name)).href;
      const result = spawnSync(process.execPath, ['--input-type=module','-e',`await import(${JSON.stringify(url)});process.stdout.write('imported');`], {cwd:f.target,encoding:'utf8'});
      assert.equal(result.status, 0, `${base}/${name}: ${result.stdout}${result.stderr}`);
      assert.equal(result.stdout, 'imported', 'library import must not execute the CLI');
    }
  }
});
