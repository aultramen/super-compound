import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {setup,installCodexBundle} from './setup.mjs';
import {createHash} from 'node:crypto';
import {provisionCompletionFixture} from './completion-fixture.test-support.mjs';
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
test('update retains explicit model overrides and projects them into host agents', t => {
  const f=fixture(t);
  assert.equal(run(f,'install').status,0);
  const mappingPath=path.join(f.target,'.agent/context/agent-models.json');
  const mapping=JSON.parse(fs.readFileSync(mappingPath,'utf8'));
  mapping.hosts['claude-code']['build-fixer']='haiku';
  mapping.hosts.codex['build-fixer']='user-model';
  fs.writeFileSync(mappingPath,JSON.stringify(mapping,null,2)+'\n');
  const update=run(f,'update');
  assert.equal(update.status,0,JSON.stringify(update));
  assert.deepEqual(JSON.parse(fs.readFileSync(mappingPath,'utf8')),mapping);
  assert.match(fs.readFileSync(path.join(f.target,'.claude/agents/build-fixer.md'),'utf8'), /model: haiku/);
});
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
  const codex = fs.readFileSync(path.join(f.target,'.agents/skills/super-compound/SKILL.md'),'utf8');
  assert.match(codex, /description: Use when.*plain-language/);
  assert.match(codex, /bug.*sc-debug/);
  assert.match(codex, /resume.*sc-status/);
  assert.match(codex, /small change.*sc-work/);
  assert.match(codex, /feature.*sc-launch/);
  assert.match(codex, /consultation.*sc-hints/);
  for (const rel of ['.claude/commands/sc-hints.md', '.agents/skills/sc-hints/SKILL.md', '.cursor/skills/sc-hints/SKILL.md', '.windsurf/workflows/sc-hints.md', '.gemini/commands/sc-hints.toml', '.agent/skills/hints/references/LICENSE']) assert.ok(fs.existsSync(path.join(f.target, rel)), rel);
  assert.match(fs.readFileSync(path.join(f.target,'.agent/rules/project-config.md'),'utf8'),/approval_mode:.*exception/);
  assert.match(fs.readFileSync(path.join(f.target,'AGENTS.md'),'utf8'), /exception.*default/i);
  assert.doesNotMatch(fs.readFileSync(path.join(f.target,'AGENTS.md'),'utf8'), /Full-tier checkpoints: BRD approval/);
  assert.equal(fs.existsSync(path.join(f.target,'.agent/tools/budget-wizard.mjs')),false);
  assert.equal(run(f,'doctor').status,0);
});

test('all six generated host adapters carry the canonical evidence completion gate', t => {
  const f=fixture(t),selected='codex,claude,antigravity,cursor,windsurf,gemini';
  const options={source,target:f.target,home:f.home,scope:'both',host:selected};
  assert.equal(setup(options).status,'applied');
  const routes=fs.readdirSync(path.join(source,'.agent/workflows')).filter(p=>/^sc-.*\.md$/.test(p)).map(p=>p.slice(0,-3));
  const missing=[];
  for(const global of [false,true]) {
    const root=global?f.home:f.target;
    const entries=[
      ['codex',`${global?'.codex':'.agents'}/skills/super-compound/SKILL.md`],
      ...routes.flatMap(route=>[
        ['claude',`.claude/commands/${route}.md`],
        ['antigravity',`${global?'.gemini/antigravity':'.agents'}/skills/${route}/SKILL.md`],
        ['cursor',`.cursor/skills/${route}/SKILL.md`],
        ['windsurf',`${global?'.codeium/windsurf/global_workflows':'.windsurf/workflows'}/${route}.md`],
        ['gemini',`.gemini/commands/${route}.toml`],
      ]),
      ['codex',global?'.codex/AGENTS.md':'AGENTS.md'],
      ['claude',global?'.claude/CLAUDE.md':'CLAUDE.md'],
      ['windsurf',global?'.codeium/windsurf/memories/global_rules.md':'.windsurf/rules/super-compound.md'],
      ['gemini',global?'.gemini/GEMINI.md':'GEMINI.md'],
      ...(!global?[['cursor','.cursor/rules/super-compound.mdc']]:[]),
    ];
    for(const [host,relative] of entries) {
      const text=fs.readFileSync(path.join(root,relative),'utf8');
      if(!text.includes('No Evidence = Not Done') || !text.includes('skills/verification-before-completion/SKILL.md') || !text.includes('Evidence of Completion')) missing.push(`${global?'global':'project'} ${host}: ${relative}`);
    }
  }
  assert.deepEqual(missing,[], 'all generated entrypoints must retain the completion policy');
  const report=setup({...options,command:'doctor'});
  assert.equal(report.status,'healthy');
  assert.ok(report.capabilities.every(c=>c.liveTested===false),'static adapter proof is not live host testing');
});

test('installed Codex fallback executes stored completion proof and rejects failed outcome', async t => {
  const f=fixture(t);
  assert.equal(installCodexBundle({command:'install',source,'codex-home':f.home}).status,'applied');
  fs.mkdirSync(f.target,{recursive:true});
  const gate=path.join(f.home,'skills/super-compound/references/tools/verified-promise.mjs');
  for(const status of ['fail','pass']) {
    const proof=await provisionCompletionFixture(f.target,{taskId:`fallback-${status}`,status});
    const result=spawnSync(process.execPath,[gate,'--root',f.target,'--contract',proof.contractPath],{encoding:'utf8'});
    assert.equal(result.status,status==='pass'?0:1,result.stdout+result.stderr);
    assert.match(result.stdout,status==='pass'?/COMPLETE_ALLOWED[\s\S]*Evidence of Completion/:/COMPLETE_DENIED/);
    assert.equal(fs.existsSync(path.join(f.target,'.scratch/work-packages')),false,'light proof needs no ledger');
  }
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
  const alias=path.join(f.root,'untrusted-alias');
  fs.symlinkSync(f.home,alias,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>setup({source,target:path.join(alias,'project'),home:f.home,scope:'project',host:'codex'}),/symlink\/reparse/);
  assert.deepEqual(fs.readdirSync(f.home),[]);
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

test('explicit stage preference survives update while generated adapters defer to project config', t => {
  const f=fixture(t);
  assert.equal(run(f,'install').status,0);
  const config=path.join(f.target,'.agent/rules/project-config.md');
  const stage=fs.readFileSync(config,'utf8').replace(/approval_mode:.*exception/, 'approval_mode: "stage"');
  fs.writeFileSync(config,stage);
  assert.equal(run(f,'update').status,0);
  assert.equal(fs.readFileSync(config,'utf8'),stage);
  assert.match(fs.readFileSync(path.join(f.target,'AGENTS.md'),'utf8'), /project.*approval_mode/);
});

test('installer and doctor reject unshipped local imports without writing', t => {
  const f=fixture(t),checkout=path.join(f.root,'checkout');
  fs.cpSync(path.join(source,'.agent'),path.join(checkout,'.agent'),{recursive:true});
  fs.writeFileSync(path.join(checkout,'.agent/tools/broken.mjs'), "import './loop-telemetry-model.mjs';\n");
  for(const command of ['install','doctor']) assert.throws(()=>setup({source:checkout,target:f.target,home:f.home,scope:'project',host:'codex',command}),/missing local runtime dependency/i);
  assert.equal(fs.existsSync(f.target),false);
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
  const dry=spawnSync(bash,[path.join(source,'.codex/install-super-compound.sh'),'--codex-home',wrapped,'--dry-run'],{encoding:'utf8'});
  assert.equal(dry.status,0,dry.stdout+dry.stderr);
  assert.equal(fs.existsSync(wrapped),false);
  const result=spawnSync(bash,[path.join(source,'.codex/install-super-compound.sh'),'--codex-home',wrapped],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.equal(fs.readFileSync(path.join(direct,'skills/super-compound/manifest.json'),'utf8'),fs.readFileSync(path.join(wrapped,'skills/super-compound/manifest.json'),'utf8'));
  const verify=spawnSync(bash,[path.join(source,'.codex/install-super-compound.sh'),'--codex-home',wrapped,'--verify-only'],{encoding:'utf8'});
  assert.equal(verify.status,0,verify.stdout+verify.stderr);
});
