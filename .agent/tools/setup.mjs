#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isActiveAsset,assertLocalModuleClosure} from './active-assets.mjs';
import {loadModels, render} from './agent-projection.mjs';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hosts = ['codex','claude','antigravity','cursor','windsurf','gemini'];
const coreDirs = ['context','workflows','skills','templates','rules','agents','evals','hooks','tools'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const exists = p => fs.existsSync(p);
const begin = '<!-- super-compound:begin -->', end = '<!-- super-compound:end -->';

function safePath(root, relative) {
  if (path.isAbsolute(relative) || path.win32.isAbsolute(relative) || relative.split(/[\\/]/).some(p=>p==='..') || /[\x00-\x1f]/.test(relative)) throw new Error(`Unsafe path: ${relative}`);
  let full = path.resolve(root, relative);
  // macOS exposes these system directories through fixed /private aliases.
  // Resolve only those exact links, then check every canonical ancestor below.
  if (process.platform === 'darwin') {
    for (const alias of ['/var', '/tmp', '/etc']) {
      if ((full === alias || full.startsWith(alias + '/'))
        && fs.lstatSync(alias).isSymbolicLink()
        && path.resolve(path.dirname(alias), fs.readlinkSync(alias)) === `/private${alias}`) {
        full = `/private${full}`;
        break;
      }
    }
  }
  let cursor = full;
  while (true) {
    try { if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`Path confinement: symlink/reparse point at ${cursor}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return full;
}
function files(root, prefix) {
  const dir = safePath(root,prefix);
  if (!exists(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!isActiveAsset(rel) || ['__pycache__','.compact-state'].includes(entry.name) || /\.py[co]$/.test(entry.name)) return [];
    safePath(root,rel);
    return entry.isDirectory() ? files(root,rel) : entry.isFile() ? [rel] : [];
  });
}
function block(text, content) {
  const starts = text.split(begin).length-1, ends = text.split(end).length-1;
  if (starts !== ends || starts > 1 || (starts && text.indexOf(end)<text.indexOf(begin))) throw new Error('Malformed managed block');
  const replacement = `${begin}\n${content.trim()}\n${end}`;
  return starts ? text.slice(0,text.indexOf(begin))+replacement+text.slice(text.indexOf(end)+end.length) : `${text}${text.endsWith('\n') || !text ? '' : '\n'}\n${replacement}\n`;
}
function managedPart(text) {
  if (!text.includes(begin)) return null;
  block(text,'validation');
  return text.slice(text.indexOf(begin),text.indexOf(end)+end.length);
}
function adapterAssets(source, selected, global, modelRoot=source) {
  const result = new Map();
  const fallback = global ? '~/.super-compound/framework/.agent' : '.agent';
  const routing = route => `Use the project's .agent/context/workflows/${route}.contract.md first; otherwise use ${fallback}/context/workflows/${route}.contract.md. Load the full workflow only when needed. Preserve project authorization. Follow output-style.md in the same context directory. If no subagent capability exists, execute sequentially in-thread. For /sc-init setup, read ${global ? '~/.super-compound/framework/' : ''}SETUP.md and activate project core from the local cache. Arguments are user input, never shell code.`;
  const routes = files(source,'.agent/workflows').filter(p=>/\/sc-[^/]+\.md$/.test(p)).map(p=>path.basename(p,'.md'));
  if (routes.length !== 19) throw new Error('Expected exactly 19 public workflows');
  const add = (p,text, mode='owned') => result.set(p,{bytes:Buffer.from(text),mode});
  for (const host of selected) {
    for (const route of routes) {
      const body = `# /${route}\n\n## Summary\n\n${routing(route)}\n`;
      const skill = `---\nname: ${route}\ndescription: Run Super Compound /${route} workflow.\n---\n\n${body}`;
      if (host === 'claude') add(`.claude/commands/${route}.md`,body);
      if (host === 'antigravity') add(`${global?'.gemini/antigravity':'.agents'}/skills/${route}/SKILL.md`,skill);
      if (host === 'cursor') add(`.cursor/skills/${route}/SKILL.md`,skill);
      if (host === 'windsurf') add(`${global?'.codeium/windsurf/global_workflows':'.windsurf/workflows'}/${route}.md`,`---\ndescription: Super Compound ${route}\n---\n\n${body}`);
      if (host === 'gemini') add(`.gemini/commands/${route}.toml`,`description = ${JSON.stringify(`Super Compound ${route}`)}\nprompt = ${JSON.stringify(routing(route)+'\nRequest: {{args}}')}\n`);
    }
    const overview = `## Super Compound\n\nUse project .agent core before ${fallback}. Route /sc-* through context/workflows/sc-X.contract.md, then full workflow as needed. Follow context/output-style.md and the project's conventions.approval_mode: exception is the new-install default; stage is explicit opt-in. Existing project authorization and approval preferences persist. Infer context, execute authorized bounded work, validate, and finish when the goal is met; ask only for unresolved material decisions, critical missing information, or risky actions outside existing authority. Without subagents, run sequentially in-thread.`;
    if (host==='codex') add(`${global?'.codex':'.agents'}/skills/super-compound/SKILL.md`,`---\nname: super-compound\ndescription: Use when handling Super Compound /sc-* commands or plain-language requests to set up, fix a bug, make a small change, deliver a feature, review, resume work, or ask for guidance.\n---\n\n# Super Compound\n\n## Summary\n\nRoute intent: setup -> sc-init setup; bug -> sc-debug; small change -> sc-work; full feature delivery -> sc-launch; resume -> sc-status; review -> sc-review; consultation -> sc-hints. Clear implementation, debugging, review and resume requests select their owner directly; hints is guidance only. Explicit /sc-* commands select their named route. Preserve read-only scope and existing authorization; routing adds no approval or write authority.\n\n${routing('sc-X')}\n`);
    if (host==='codex') add(global?'.codex/AGENTS.md':'AGENTS.md',overview,'block');
    if (host==='claude') {
      add(global?'.claude/CLAUDE.md':'CLAUDE.md',overview,'block');
      const names=files(source,'.agent/agents').filter(p=>p.endsWith('.md')).map(p=>path.basename(p,'.md'));
      const models=loadModels(modelRoot,names)['claude-code'];
      for(const name of names) {
        let text=render(name,fs.readFileSync(safePath(source,`.agent/agents/${name}.md`),'utf8'),models[name]);
        if(global)text+=`\nIf absent, read ~/.super-compound/framework/.agent/agents/${name}.md.\n`;
        add(`.claude/agents/${name}.md`,text);
      }
    }
    if (host==='cursor') {
      // Global skills are supported; project rules are activated with project setup.
      if (!global) add('.cursor/rules/super-compound.mdc',`---\ndescription: Super Compound workflow routing\nalwaysApply: true\n---\n\n${overview}\n`);
    }
    if (host==='windsurf') add(global?'.codeium/windsurf/memories/global_rules.md':'.windsurf/rules/super-compound.md',overview,'block');
    if (host==='gemini') add(global?'.gemini/GEMINI.md':'GEMINI.md',overview,'block');
  }
  return result;
}
function coreAssets(source) {
  const assets = new Map();
  for (const dir of coreDirs) for (const rel of files(source,`.agent/${dir}`)) assets.set(rel,{bytes:fs.readFileSync(safePath(source,rel)),mode:['.agent/rules/project-config.md','.agent/context/agent-models.json'].includes(rel)?'preserve':'owned'});
  for (const rel of ['SETUP.md','SUPER-COMPOUND.md']) if(exists(path.join(source,rel))) assets.set(rel,{bytes:fs.readFileSync(safePath(source,rel)),mode:'preserve-unowned'});
  return assets;
}
function planRoot(root, assets, sourceDigest, selected) {
  const manifestPath = '.super-compound/manifest.json';
  const location = safePath(root,manifestPath);
  const previous = exists(location) ? JSON.parse(fs.readFileSync(location,'utf8')) : {schema:1,files:{}};
  if (previous.schema!==1 || !previous.files || typeof previous.files!=='object') throw new Error('Invalid ownership manifest');
  const changes=[], conflicts=[], checks=[], owned={...previous.files};
  for(const [rel,asset] of assets) {
    const full=safePath(root,rel), old=exists(full)?fs.readFileSync(full):null, record=previous.files[rel];
    let bytes=asset.bytes;
    if(asset.mode==='preserve' && old) { checks.push({path:rel,status:'user-config-preserved'}); continue; }
    if(asset.mode==='preserve-unowned' && old && !record) { checks.push({path:rel,status:'user-document-preserved'}); continue; }
    if(asset.mode==='block') {
      try {
        const prior = managedPart(old?.toString('utf8')??'');
        if(prior && (!record || digest(prior)!==record.hash)) {conflicts.push({path:rel,reason:'managed block modified or unowned'});continue;}
        bytes=Buffer.from(block(old?.toString('utf8')??'',bytes.toString('utf8')));
      } catch(error) { conflicts.push({path:rel,reason:error.message});continue; }
    } else if(old && !old.equals(bytes) && (!record || digest(old)!==record.hash)) {
      conflicts.push({path:rel,reason:'user-owned or locally modified',currentHash:digest(old),proposedHash:digest(bytes)});continue;
    }
    owned[rel]={hash:digest(asset.mode==='block'?managedPart(bytes.toString('utf8')):bytes),mode:asset.mode,owner:'super-compound'};
    const same=old?.equals(bytes)??false;
    checks.push({path:rel,status:same?'valid':'missing-or-outdated'});
    if(!same) changes.push({root,rel,old,bytes});
  }
  // Retire only files whose current content still matches this installer's ownership.
  for(const [rel,record] of Object.entries(previous.files)) {
    safePath(root,rel);
    if(isActiveAsset(rel) || assets.has(rel)) continue;
    const full=safePath(root,rel), old=exists(full)?fs.readFileSync(full):null;
    if(old && digest(old)!==record.hash) conflicts.push({path:rel,reason:'retired asset has user changes'});
    else {if(old)changes.push({root,rel,old,bytes:null});delete owned[rel];}
  }
  const manifest=Buffer.from(JSON.stringify({schema:1,sourceDigest,hosts:[...new Set([...(previous.hosts??[]),...selected])].sort(),files:owned},null,2)+'\n');
  const old=exists(location)?fs.readFileSync(location):null;
  if(!old?.equals(manifest))changes.push({root,rel:manifestPath,old,bytes:manifest});
  checks.push({root,path:manifestPath,status:old?.equals(manifest)?'valid':'missing-or-outdated'});
  return {changes,conflicts:conflicts.map(c=>({...c,root})),checks:checks.map(c=>({...c,root}))};
}
function applyTransaction(changes) {
  if(!changes.length)return;
  const stage=fs.mkdtempSync(path.join(os.tmpdir(),'super-compound-stage-'));
  const applied=[], createdDirs=[];
  let retainStage=false;
  const mkdir = dir => {
    if(exists(dir))return;
    mkdir(path.dirname(dir));fs.mkdirSync(dir);createdDirs.push(dir);
  };
  try {
    for(let i=0;i<changes.length;i++) {
      if(changes[i].old)fs.writeFileSync(path.join(stage,`${i}.old`),changes[i].old);
      if(changes[i].bytes) {
        fs.writeFileSync(path.join(stage,String(i)),changes[i].bytes);
        if(digest(fs.readFileSync(path.join(stage,String(i))))!==digest(changes[i].bytes))throw new Error('Stage verification failed');
      }
    }
    if(process.env.SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE==='1')throw new Error('Injected failure after stage verification');
    for(let i=0;i<changes.length;i++) {
      const c=changes[i], full=safePath(c.root,c.rel);
      const current=exists(full)?fs.readFileSync(full):null;
      if((current===null)!==(c.old===null) || (current && !current.equals(c.old)))throw new Error(`Concurrent change: ${c.rel}`);
      mkdir(path.dirname(full));applied.push(c);
      if(c.bytes)fs.copyFileSync(path.join(stage,String(i)),full);else fs.unlinkSync(full);
      if(process.env.SUPER_COMPOUND_SETUP_FAIL_AFTER_APPLY===String(i+1))throw new Error('Injected partial apply failure');
      if(c.bytes && digest(fs.readFileSync(full))!==digest(c.bytes))throw new Error(`Apply verification failed: ${c.rel}`);
    }
  }catch(error){
    const failures=[];
    for(const c of applied.reverse()) try {
      const full=safePath(c.root,c.rel);
      if(c.old)fs.writeFileSync(full,c.old);else if(exists(full))fs.unlinkSync(full);
    }catch(e){failures.push(e.message);}
    for(const dir of createdDirs.reverse())try{fs.rmdirSync(dir);}catch(e){if(e.code!=='ENOTEMPTY')failures.push(e.message);}
    if(failures.length){retainStage=true;throw new Error(`${error.message}; rollback incomplete: ${failures.join('; ')}; stage retained at ${stage}`);}
    throw error;
  }finally{
    // Stage is a fresh, exact temporary directory owned by this invocation.
    if(!retainStage && exists(stage))fs.rmSync(stage,{recursive:true,force:true});
  }
}
export function setup(options={}) {
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node 22 or newer is required');
  const {command='install',scope,host='auto',dryRun=false}=options;
  if(!['install','update','doctor'].includes(command))throw new Error('Expected install, update or doctor');
  if(!['project','global','both'].includes(scope))throw new Error('Choose --scope project|global|both');
  const source=path.resolve(options.source??here),target=path.resolve(options.target??process.cwd());
  const home=path.resolve(options.home??process.env.SUPER_COMPOUND_HOME??os.homedir());
  const detected=hosts.filter(h=>{
    const dirs={codex:'.codex',claude:'.claude',antigravity:'.gemini/antigravity',cursor:'.cursor',windsurf:'.codeium/windsurf',gemini:'.gemini'};
    return exists(path.join(home,dirs[h])) || exists(path.join(target,dirs[h])) || (h==='codex' && !!process.env.CODEX_HOME);
  });
  const selected=host==='auto'?detected:host.split(',');
  if(!selected.length)throw new Error('No host detected; choose --host codex|claude|antigravity|cursor|windsurf|gemini');
  if(selected.some(h=>!hosts.includes(h)))throw new Error('Unknown host');
  const core=coreAssets(source);
  assertLocalModuleClosure(core);
  if(!core.has('.agent/context/retired-assets.json'))throw new Error('Source is not an active framework checkout/cache');
  const sourceDigest=digest([...core].map(([p,a])=>p+':'+digest(a.bytes)).join('\n'));
  const plans=[];
  const modelRoot = root => exists(safePath(root,'.agent/context/agent-models.json')) ? root : source;
  if(scope!=='global')plans.push(planRoot(target,new Map([...core,...adapterAssets(source,selected,false,modelRoot(target))]),sourceDigest,selected));
  if(scope!=='project') {
    plans.push(planRoot(path.join(home,'.super-compound/framework'),core,sourceDigest,selected));
    plans.push(planRoot(home,adapterAssets(source,selected,true,modelRoot(path.join(home,'.super-compound/framework'))),sourceDigest,selected));
  }
  const changes=plans.flatMap(p=>p.changes),conflicts=plans.flatMap(p=>p.conflicts),checks=plans.flatMap(p=>p.checks);
  const healthy=!conflicts.length && !checks.some(c=>c.status==='missing-or-outdated');
  const report={summary:command==='doctor'?'Installation structure, static local imports and source drift checked; live host execution is not tested.':'Setup planned with dependency closure, ownership checks and rollback.',command,scope,os:process.platform,sourceDigest,changed:changes.length,conflicts,checks,capabilities:selected.map(host=>({host,detected:detected.includes(host),filesValid:healthy,liveTested:false})),status:conflicts.length?'conflict':command==='doctor'?(healthy?'healthy':'drift'):dryRun?'dry-run':changes.length?'applied':'unchanged'};
  if(command!=='doctor' && !dryRun && !conflicts.length) {
    applyTransaction(changes);
    report.capabilities.forEach(c=>c.filesValid=true);
  }
  return report;
}
function parseArgs(args) {
  const options={command:args.shift()};
  if(!['install','update','doctor'].includes(options.command))throw new Error('Expected install, update or doctor');
  for(let i=0;i<args.length;i++) {
    const a=args[i];
    if(a==='--dry-run')options.dryRun=true;
    else if(a==='--json')options.json=true;
    else if(['--scope','--host','--target','--source','--codex-home'].includes(a) && args[i+1] && !args[i+1].startsWith('--')) options[a.slice(2)]=args[++i];
    else throw new Error(`Unknown or incomplete option: ${a}`);
  }
  return options;
}
// Compatibility entry point for the original standalone Codex bundle path.
// Uses the same asset selector and transaction engine; user edits are conflicts.
export function installCodexBundle(options) {
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node 22 or newer is required');
  if(!['install','update','doctor'].includes(options.command))throw new Error('Expected install, update or doctor');
  const source=path.resolve(options.source??here);
  const root=path.resolve(options['codex-home'] || process.env.CODEX_HOME || path.join(os.homedir(),'.codex'),'skills/super-compound');
  const desired=new Map([['SKILL.md',fs.readFileSync(safePath(source,'.codex/SKILL.md'))]]);
  for(const dir of coreDirs)for(const rel of files(source,`.agent/${dir}`))desired.set(rel.replace(/^\.agent\//,'references/'),fs.readFileSync(safePath(source,rel)));
  assertLocalModuleClosure(desired);
  const mp=safePath(root,'manifest.json');
  const previous=exists(mp)?JSON.parse(fs.readFileSync(mp,'utf8')):{files:[]};
  if(!Array.isArray(previous.files))throw new Error('Invalid legacy manifest');
  const hashes=new Map(previous.files.map(f=>[f.path,f.sha256]));
  const changes=[],conflicts=[],drift=[];
  for(const [rel,bytes] of desired) {
    const full=safePath(root,rel),old=exists(full)?fs.readFileSync(full):null;
    if(old?.equals(bytes))continue;
    drift.push(`Verification hash mismatch or missing: ${rel}`);
    if(old && digest(old)!==hashes.get(rel))conflicts.push({path:rel,reason:'locally modified or unowned'});
    else changes.push({root,rel,old,bytes});
  }
  for(const rel of files(root,'').map(p=>p.replace(/^\//,''))) {
    if(rel==='manifest.json' || desired.has(rel))continue;
    const full=safePath(root,rel),old=fs.readFileSync(full);
    drift.push(`Verification unexpected stale file: ${rel}`);
    if(hashes.get(rel)===digest(old))changes.push({root,rel,old,bytes:null});
    else conflicts.push({path:rel,reason:'unowned stale file preserved'});
  }
  const manifest=Buffer.from(JSON.stringify({schemaVersion:1,algorithm:'SHA256',files:[...desired].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([path,bytes])=>({path,sha256:digest(bytes)}))},null,2)+'\n');
  const old=exists(mp)?fs.readFileSync(mp):null;
  if(!old?.equals(manifest)) {changes.push({root,rel:'manifest.json',old,bytes:manifest});drift.push('Verification manifest hash mismatch');}
  if(options.command==='doctor')return {status:drift.length?'drift':'healthy',summary:drift.join('\n')||'Verified',changed:changes.length,conflicts};
  if(conflicts.length)return {status:'conflict',summary:'User-owned conflicts; installation preserved',changed:0,conflicts};
  if(!options.dryRun)applyTransaction(changes);
  return {status:options.dryRun?'dry-run':changes.length?'applied':'unchanged',summary:changes.length?'Codex bundle installed and verified':'Already current',changed:changes.length,conflicts};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const options=parseArgs(process.argv.slice(2)),report=options['codex-home']?installCodexBundle(options):setup(options);
    console.log(options.json?JSON.stringify(report,null,2):`${report.summary}\nStatus: ${report.status}; changed: ${report.changed}; conflicts: ${report.conflicts.length}\n${report.conflicts.map(c=>`${c.root?c.root+'/':''}${c.path}: ${c.reason}`).join('\n')}`);
    process.exitCode=['conflict','drift'].includes(report.status)?1:0;
  }catch(error){ console.log(JSON.stringify({status:'error',error:error.message}));process.exitCode=2; }
}
