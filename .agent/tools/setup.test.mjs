import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {setup,installCodexBundle} from './setup.mjs';
import {createHash} from 'node:crypto';
const engine = path.resolve('.agent/tools/setup.mjs');
const source = process.cwd();
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-setup-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return {root, target:path.join(root,'proyek spasi 日本'), home:path.join(root,'home')};
}
function run(f, command, ...args) {
  const p = spawnSync(process.execPath, [engine, command, '--source',source,'--target',f.target,'--scope','project','--host','codex,claude,antigravity,cursor,windsurf,gemini','--json',...args], {encoding:'utf8',env:{...process.env, SUPER_COMPOUND_HOME:f.home}});
  return {status:p.status, report: (()=>{try{return JSON.parse(p.stdout)}catch{return p.stderr}})()};
}
test('dry run is read-only; six adapters install and reinstall is a no-op', t => {
  const f = fixture(t);
  const dry = run(f,'install','--dry-run');
  assert.equal(dry.status,0,JSON.stringify(dry));
  assert.equal(fs.existsSync(f.target),false);
  assert.equal(run(f,'install').status,0);
  const next = run(f,'install');
  assert.equal(next.status,0,JSON.stringify(next));
  assert.equal(next.report.changed,0);
  for(const rel of ['.agents/skills/super-compound/SKILL.md','.claude/commands/sc-init.md','.agents/skills/sc-init/SKILL.md','.cursor/skills/sc-init/SKILL.md','.windsurf/workflows/sc-init.md','.gemini/commands/sc-init.toml']) assert.ok(fs.existsSync(path.join(f.target,rel)),rel);
  assert.match(fs.readFileSync(path.join(f.target,'.agent/rules/project-config.md'),'utf8'),/approval_mode:.*stage/);
  assert.equal(fs.existsSync(path.join(f.target,'.agent/tools/budget-wizard.mjs')),false);
  assert.equal(run(f,'doctor').status,0);
});
test('global cache activates a project offline and both scopes roll back partial application', t=>{
  const f=fixture(t);
  const options={source,target:f.target,home:f.home,host:'claude,gemini,codex,windsurf',scope:'global'};
  assert.equal(setup(options).status,'applied');
  assert.equal(fs.existsSync(f.target),false);
  const cached=path.join(f.home,'.super-compound/framework');
  assert.equal(setup({...options,source:cached,scope:'project'}).status,'applied');
  assert.ok(fs.existsSync(path.join(f.target,'.claude/agents/doc-updater.md')));
  assert.ok(fs.existsSync(path.join(f.home,'.codeium/windsurf/global_workflows/sc-init.md')));
  const g=fixture(t);
  const before=process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;
  process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY='3';
  try {
    assert.throws(()=>setup({...options,target:g.target,home:g.home,scope:'both'}),/partial apply failure/);
    assert.equal(fs.existsSync(g.target),false);
    assert.equal(fs.existsSync(g.home),false);
  } finally {if(before===undefined)delete process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;else process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY=before;}
});
test('managed blocks retain outside edits; doctor and conflict never apply changes',t=>{
  const f=fixture(t);
  assert.equal(run(f,'install').status,0);
  const instructions=path.join(f.target,'AGENTS.md');
  fs.appendFileSync(instructions,'\nMy extra instruction.\n');
  assert.equal(run(f,'update').status,0);
  assert.match(fs.readFileSync(instructions,'utf8'),/My extra instruction/);
  fs.writeFileSync(instructions,fs.readFileSync(instructions,'utf8').replace('## Super Compound','## My changed block'));
  const before=fs.readFileSync(instructions,'utf8');
  assert.equal(run(f,'doctor').status,1);
  assert.equal(run(f,'update').status,1);
  assert.equal(fs.readFileSync(instructions,'utf8'),before);
});
test('symlink destination cannot escape target and invalid CLI never writes',t=>{
  const f=fixture(t);
  fs.mkdirSync(f.target,{recursive:true});fs.mkdirSync(f.home,{recursive:true});
  fs.symlinkSync(f.home,path.join(f.target,'.agent'),process.platform==='win32'?'junction':'dir');
  assert.notEqual(run(f,'install').status,0);
  assert.deepEqual(fs.readdirSync(f.home),[]);
  assert.notEqual(run(f,'install','--unknown').status,0);
});
test('existing instructions and config survive; user-owned collisions are batched', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.target,'.agent/rules'),{recursive:true});
  fs.writeFileSync(path.join(f.target,'AGENTS.md'),'# My instructions\nKeep me.\n');
  fs.writeFileSync(path.join(f.target,'.agent/rules/project-config.md'),'custom config');
  assert.equal(run(f,'install').status,0);
  assert.match(fs.readFileSync(path.join(f.target,'AGENTS.md'),'utf8'),/Keep me/);
  assert.equal(fs.readFileSync(path.join(f.target,'.agent/rules/project-config.md'),'utf8'),'custom config');
  for (const rel of ['.agent/tools/doc-lint.mjs','.agent/context/output-style.md']) fs.appendFileSync(path.join(f.target,rel),'\nuser edit');
  const result=run(f,'update');
  assert.notEqual(result.status,0);
  assert.equal(result.report.conflicts.length,2);
});
test('update applies unchanged owned assets, retires only owned bytes, and rolls back existing files',t=>{
  const f=fixture(t),checkout=path.join(f.root,'checkout');
  fs.cpSync(path.join(source,'.agent'),path.join(checkout,'.agent'),{recursive:true});
  const options={source:checkout,target:f.target,home:f.home,scope:'project',host:'codex'};
  assert.equal(setup(options).status,'applied');
  const rel='.agent/context/output-style.md',targetFile=path.join(f.target,rel);
  const before=fs.readFileSync(targetFile);
  fs.appendFileSync(path.join(checkout,rel),'\nNew source revision.\n');
  const previous=process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;
  process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY='1';
  try {assert.throws(()=>setup({...options,command:'update'}),/partial apply/);assert.deepEqual(fs.readFileSync(targetFile),before);}
  finally{if(previous===undefined)delete process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY;else process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY=previous;}
  assert.equal(setup({...options,command:'update'}).status,'applied');
  assert.match(fs.readFileSync(targetFile,'utf8'),/New source revision/);
  const retired='.agent/tools/budget-wizard.mjs',retiredFile=path.join(f.target,retired),mp=path.join(f.target,'.super-compound/manifest.json');
  fs.writeFileSync(retiredFile,'old managed asset');
  const manifest=JSON.parse(fs.readFileSync(mp));
  manifest.files[retired]={owner:'super-compound',mode:'owned',hash:createHash('sha256').update('old managed asset').digest('hex')};
  fs.writeFileSync(mp,JSON.stringify(manifest));
  assert.equal(setup({...options,command:'update'}).status,'applied');
  assert.equal(fs.existsSync(retiredFile),false);
});
test('Bash wrapper uses the same active hashed bundle as the Node engine',t=>{
  const f=fixture(t);
  const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
  const probe=spawnSync(bash,['--version'],{encoding:'utf8'});
  if(probe.error || probe.status!==0){t.skip('Bash unavailable on this host');return;}
  const direct=path.join(f.root,'direct'),wrapped=path.join(f.root,'bash path 日本');
  installCodexBundle({command:'install',source,'codex-home':direct});
  const result=spawnSync(bash,[path.join(source,'.codex/install-super-compound.sh'),'--codex-home',wrapped],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.equal(fs.readFileSync(path.join(direct,'skills/super-compound/manifest.json'),'utf8'),fs.readFileSync(path.join(wrapped,'skills/super-compound/manifest.json'),'utf8'));
  const verify=spawnSync(bash,[path.join(source,'.codex/install-super-compound.sh'),'--codex-home',wrapped,'--verify-only'],{encoding:'utf8'});
  assert.equal(verify.status,0,verify.stdout+verify.stderr);
});
