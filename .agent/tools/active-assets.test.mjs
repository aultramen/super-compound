import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isActiveAsset, selectActiveAssets, retiredPaths,copyActiveDistribution} from './active-assets.mjs';

test('retired archive preserves exact source bytes and excludes both locators', () => {
 const manifest=JSON.parse(fs.readFileSync('docs/archive/retired-assets-20261007/manifest.json','utf8'));
 assert.equal(manifest.schema,'retired_archive_v1');
 assert.ok(manifest.entries.length>0);
 for(const entry of manifest.entries) {
   assert.equal(isActiveAsset(entry.from),false,entry.from);
   assert.equal(isActiveAsset(entry.to),false,entry.to);
   assert.equal(fs.existsSync(entry.from),false,entry.from);
   assert.equal(createHash('sha256').update(fs.readFileSync(entry.to)).digest('hex'),entry.sha256,entry.to);
 }
});

test('distribution rejects a missing local runtime import before copying', t => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-closure-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'source'),destination=path.join(root,'bundle');
 fs.mkdirSync(path.join(source,'.agent/tools'),{recursive:true});
 fs.writeFileSync(path.join(source,'.agent/tools/active.mjs'), "import {value} from './loop-telemetry-model.mjs';\n");
 fs.writeFileSync(path.join(source,'.agent/tools/loop-telemetry-model.mjs'), 'export const value=1;');
 assert.throws(()=>copyActiveDistribution(source,destination),/missing local runtime dependency.*loop-telemetry-model/i);
 assert.equal(fs.existsSync(destination),false);
});

test('real offline distribution runs memory commands and installation without repository-only assets', t => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-offline-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const destination=path.join(root,'bundle'),project=path.join(root,'project');
 copyActiveDistribution(process.cwd(),destination);
 assert.equal(fs.existsSync(path.join(destination,'package.json')),false);
 assert.equal(fs.existsSync(path.join(destination,'OFFLINE-SETUP.md')),true);
 for(const command of ['check','report','resume']) {
   const result=spawnSync(process.execPath,[path.join(destination,'.agent/tools/memory-maintenance.mjs'),command,'--root',destination,'--json'],{encoding:'utf8'});
   assert.equal(result.status,0,result.stderr+result.stdout);
 }
 const options=['--source',destination,'--target',project,'--host','codex','--scope','project','--json'];
 for(const command of ['install','doctor']) {
   const result=spawnSync(process.execPath,[path.join(destination,'.agent/tools/setup.mjs'),command,...options],{encoding:'utf8'});
   assert.equal(result.status,0,result.stdout+result.stderr);
 }
});

test('exact retirement preserves new neighboring paths and canonical locators', () => {
  assert.equal(isActiveAsset('.agent\\tools\\loop-run.mjs'), false);
  assert.equal(isActiveAsset('.agent/tools/loop-run-new.test.mjs'), true);
  assert.deepEqual(selectActiveAssets(['.agent/tools/loop-run.mjs', 'new.test.mjs']), ['new.test.mjs']);
  assert.ok(retiredPaths.includes('.agent/context/doc-budgets.json'));
});

test('active runner discovers new failing tests and propagates FAIL', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-active-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'.agent/tools'), {recursive:true});
  fs.mkdirSync(path.join(root,'.agent/context'), {recursive:true});
  for (const file of ['run-local-tests.mjs','active-assets.mjs']) fs.copyFileSync(new URL(file,import.meta.url),path.join(root,'.agent/tools',file));
  fs.copyFileSync(new URL('../context/retired-assets.json',import.meta.url),path.join(root,'.agent/context/retired-assets.json'));
  fs.writeFileSync(path.join(root,'.agent/tools/loop-run.test.mjs'), 'throw new Error("retired");');
  fs.writeFileSync(path.join(root,'.agent/tools/new.test.mjs'), 'import test from "node:test"; test("active FAIL",()=>{throw new Error("active failure")});');
  const result=spawnSync(process.execPath,[path.join(root,'.agent/tools/run-local-tests.mjs')],{encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stdout,/active FAIL/);
  assert.doesNotMatch(result.stdout+result.stderr,/Error: retired/);
});

test('distribution retains new active neighbors while preserving physical retired files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-distribution-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'source'),destination=path.join(root,'bundle');
 fs.mkdirSync(path.join(source,'.agent/tools'),{recursive:true});
 fs.writeFileSync(path.join(source,'.agent/tools/loop-run.mjs'),'retired');
 fs.writeFileSync(path.join(source,'.agent/tools/loop-run-new.mjs'),'active');
 copyActiveDistribution(source,destination);
 assert.equal(fs.existsSync(path.join(source,'.agent/tools/loop-run.mjs')),true);
 assert.equal(fs.existsSync(path.join(destination,'.agent/tools/loop-run.mjs')),false);
 assert.equal(fs.readFileSync(path.join(destination,'.agent/tools/loop-run-new.mjs'),'utf8'),'active');
 assert.throws(()=>copyActiveDistribution(source,destination),/new destination/);
});
