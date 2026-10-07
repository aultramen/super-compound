import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {provisionCompletionFixture,completionDigest} from './completion-fixture.test-support.mjs';
import * as verification from './verification-recipe.mjs';
import {readBoundedFile,writeFileAtomic} from './file-state.mjs';

async function fixtureRoot(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-completion-adversarial-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;
}
const check=(root,fixture,extra={})=>verification.verifyCompletionEvidence(root,{contractPath:fixture.contractPath,contractDigest:fixture.contractDigest,...extra});
async function mutateJson(root,ref,mutate) {
 const json=JSON.parse(await readBoundedFile(root,ref,{encoding:'utf8',maxBytes:4*1024*1024}));mutate(json);await writeFileAtomic(root,ref,`${JSON.stringify(json)}\n`,{maxBytes:4*1024*1024});
}

test('exit zero with a failing outcome is not a successful verification recipe',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-completion-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const fixture=await provisionCompletionFixture(root,{status:'fail'});
 assert.equal(fixture.result.pass,false,'successful command execution must not hide a failed acceptance outcome');
});

test('a generated screenshot without actual inspection cannot complete a visual criterion',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-completion-visual-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const directory='.scratch/completion/visual';
 const fixture=await provisionCompletionFixture(root,{directory,criteria:[{id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'visual',recipeRef:`${directory}/recipe.json`}]});
 const verdict=await verification.verifyCompletionEvidence(root,{contractPath:fixture.contractPath,contractDigest:fixture.contractDigest});
 assert.equal(verdict.allowed,false,'visual completion needs inspection, not only an artifact locator');
});

test('completion gate requires evidence and admits an executed acceptance outcome',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-completion-gate-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const fixture=await provisionCompletionFixture(root);
 assert.equal(typeof verification.verifyCompletionEvidence,'function','completion must expose one shared evidence validator');
 const options={contractPath:fixture.contractPath,contractDigest:fixture.contractDigest};
 assert.equal((await verification.verifyCompletionEvidence(root,{...options,evidenceRefs:[]})).allowed,false);
 assert.equal((await verification.verifyCompletionEvidence(root,{...options,evidenceRefs:[fixture.evidenceRef]})).allowed,true);
});

test('a bug-fix after check alone cannot replace reproduced before and verified after evidence',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-completion-regression-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const directory='.scratch/completion/regression';
 const fixture=await provisionCompletionFixture(root,{directory,criteria:[{id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'regression',recipeRef:`${directory}/recipe.json`}]});
 const verdict=await verification.verifyCompletionEvidence(root,{contractPath:fixture.contractPath,contractDigest:fixture.contractDigest});
 assert.equal(verdict.allowed,false,'bug-fix completion must include reproduced regression evidence');
});

test('real RED/GREEN assertion artifacts prove a bug-fix criterion',async t=>{
 const root=await fixtureRoot(t),directory='.scratch/completion/regression',beforeRef=`${directory}/before.json`,afterRef=`${directory}/after.json`;
 const driveSetup=`{const fs=require('fs'),assert=require('assert/strict');for(const [ref,healthy] of [[${JSON.stringify(beforeRef)},false],[${JSON.stringify(afterRef)},true]]){let status='pass';try{assert.equal(healthy,true)}catch(error){status='fail'}fs.writeFileSync(ref,JSON.stringify({taskId:'GOAL-1',criterionId:'AC-1',expected:'healthy',observed:healthy?'healthy':'unhealthy',status}))}};`;
 const fixture=await provisionCompletionFixture(root,{directory,criteria:[{id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'regression',recipeRef:`${directory}/recipe.json`}],driveSetup,artifactRefs:[beforeRef,afterRef],outcomeExtras:{regression:{beforeRef,afterRef}}});
 assert.equal((await check(root,fixture)).allowed,true);
});

test('failed and skipped assertion counts cannot be hidden by pass labels',async t=>{
 const root=await fixtureRoot(t);
 for(const [index,counts] of [{total:1,passed:0,failed:1,skipped:0},{total:1,passed:0,failed:0,skipped:1},{total:0,passed:0,failed:0,skipped:0}].entries()) {
  const fixture=await provisionCompletionFixture(root,{directory:`.scratch/completion/count-${index}`,counts});
  assert.equal(fixture.result.pass,false);
  assert.equal((await check(root,fixture)).allowed,false);
 }
});

test('every pinned criterion is required and a verified subset remains partial',async t=>{
 const root=await fixtureRoot(t),directory='.scratch/completion/partial';
 const fixture=await provisionCompletionFixture(root,{directory,criteria:[
  {id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'functional',recipeRef:`${directory}/recipe.json`},
  {id:'AC-2',requirementRefs:[`${directory}/request.md#AC-2`],expected:'readable screenshot',method:'visual',observationRef:`${directory}/observation.json`}
 ]});
 const verdict=await check(root,fixture);
 assert.equal(verdict.allowed,false);assert.equal(verdict.status,'Partially Verified');assert.equal(verdict.criteria.length,2);
});

test('authority, source, recipe, contract, outcome, and artifact changes invalidate saved evidence',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root);
 for(const ref of [fixture.authorityPath,fixture.sourcePath,fixture.recipePath,fixture.contractPath,fixture.outcomesPath,fixture.artifactPath]) {
  const original=await readBoundedFile(root,ref);
  await writeFileAtomic(root,ref,`${original.toString('utf8')}\nchanged`);
  assert.equal((await check(root,fixture)).allowed,false,ref);
  await writeFileAtomic(root,ref,original);
 }
 assert.equal((await check(root,fixture)).allowed,true);
});

test('prose-only, false pass, missing execution, wrong scope and bad digests cannot complete',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root),original=await readBoundedFile(root,fixture.evidencePath,{maxBytes:4*1024*1024});
 for(const mutate of [proof=>{proof.pass=false},proof=>{proof.steps.pop()},proof=>{proof.cleanup.steps.push(proof.steps[0])},proof=>{proof.taskId='other'},proof=>{proof.contractDigest='a'.repeat(64)}]) {
  await mutateJson(root,fixture.evidencePath,mutate);assert.equal((await check(root,fixture)).allowed,false);
  await writeFileAtomic(root,fixture.evidencePath,original,{maxBytes:4*1024*1024});
 }
 await writeFileAtomic(root,fixture.evidencePath,'Implemented and should work');assert.equal((await check(root,fixture)).allowed,false);
 await writeFileAtomic(root,fixture.evidencePath,original,{maxBytes:4*1024*1024});
 assert.equal((await check(root,fixture,{evidenceRefs:[{path:fixture.evidencePath,digest:'a'.repeat(64)}]})).allowed,false);
});

test('inspection observations bind artifacts, criteria, fingerprints and consistent optional counts',async t=>{
 const root=await fixtureRoot(t),directory='.scratch/completion/manual',observationRef=`${directory}/observation.json`;
 const fixture=await provisionCompletionFixture(root,{directory});
 const contract={...fixture.contract,criteria:[{id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'manual',observationRef}]};
 await writeFileAtomic(root,fixture.contractPath,JSON.stringify(contract));fixture.contractDigest=completionDigest(await readBoundedFile(root,fixture.contractPath));
 // Actually open and inspect the generated artifact before recording the observation.
 const artifact=JSON.parse(await readBoundedFile(root,fixture.artifactPath,{encoding:'utf8'}));assert.equal(artifact.healthy,true);
 const captured=async ref=>({ref,digest:completionDigest(await readBoundedFile(root,ref))});
 const observation={schema:'completion_observation_v1',taskId:contract.taskId,criterionId:'AC-1',contractDigest:fixture.contractDigest,steps:['Open result.json and compare healthy with expected true'],expected:'healthy',observed:'healthy=true',status:'pass',observer:'test verifier',timestamp:new Date().toISOString(),inspected:true,sources:await Promise.all([...contract.authorityRefs,...contract.sourceRefs].map(captured)),artifacts:[await captured(fixture.artifactPath)]};
 await writeFileAtomic(root,observationRef,JSON.stringify(observation));assert.equal((await check(root,fixture)).allowed,true);
 for(const counts of [{total:1,passed:0,failed:0,skipped:0},{total:1,passed:1,failed:-1,skipped:1},{total:'1',passed:1,failed:0,skipped:0},null,false,0,[],{}]) {
  await writeFileAtomic(root,observationRef,JSON.stringify({...observation,counts}));
  assert.equal((await check(root,fixture)).allowed,false,'inspection counts must not contradict the reported outcome');
 }
 await writeFileAtomic(root,observationRef,JSON.stringify({...observation,counts:{total:1,passed:1,failed:0,skipped:0}}));assert.equal((await check(root,fixture)).allowed,true);
 await writeFileAtomic(root,observationRef,JSON.stringify(observation));assert.equal((await check(root,fixture)).allowed,true);
 await mutateJson(root,observationRef,value=>{value.inspected=false});assert.equal((await check(root,fixture)).allowed,false);
});

test('deployment checks prove actual health after changing the environment state',async t=>{
 const root=await fixtureRoot(t),directory='.scratch/completion/deploy';
 const fixture=await provisionCompletionFixture(root,{directory,criteria:[{id:'AC-1',requirementRefs:[`${directory}/request.md#AC-1`],expected:'healthy',method:'deployment',recipeRef:`${directory}/recipe.json`}]});
 assert.equal((await check(root,fixture)).allowed,true);
 await writeFileAtomic(root,`${directory}/health.json`,JSON.stringify({healthy:false}));
 assert.equal((await check(root,fixture)).allowed,false);
 const result=await verification.runVerificationRecipe(root,fixture.recipe);
 const verdict=await check(root,fixture);assert.equal(result.pass,false);assert.equal(verdict.allowed,false);assert.equal(verdict.status,'Verification Failed');
});

test('a failed health outcome is reported as Verification Failed despite exit zero',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root,{status:'fail'}),verdict=await check(root,fixture);
 assert.equal(verdict.allowed,false);assert.equal(verdict.status,'Verification Failed');assert.equal(verdict.criteria[0].observed,'unhealthy');
});

test('cleanup failure cannot leave successful completion evidence',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root,{cleanup:[{command:process.execPath,args:['-e','process.exit(1)']}]});
 assert.equal(fixture.result.pass,false);assert.equal((await check(root,fixture)).allowed,false);
});

test('declared environment input changes invalidate evidence without disclosing its value',async t=>{
 const root=await fixtureRoot(t),key='SC_COMPLETION_FIXTURE_ENV',original=process.env[key];
 t.after(()=>{if(original===undefined)delete process.env[key];else process.env[key]=original;});
 process.env[key]='fixture-value-before';
 const fixture=await provisionCompletionFixture(root,{envRefs:[key]});
 assert.equal((await check(root,fixture)).allowed,true);
 process.env[key]='fixture-value-after';
 assert.equal((await check(root,fixture)).allowed,false,'relevant runtime environment is a verification input');
 assert.equal((await readBoundedFile(root,fixture.evidencePath,{encoding:'utf8'})).includes('fixture-value-before'),false);
});

test('outcome output aliasing authority is rejected before deleting the authoritative request',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root);
 const recipe={...fixture.recipe,outcomesPath:fixture.authorityPath};
 await writeFileAtomic(root,fixture.recipePath,JSON.stringify(recipe));
 const before=await readBoundedFile(root,fixture.authorityPath);
 await assert.rejects(verification.runVerificationRecipe(root,recipe),/alias|input.*output|output.*input/i);
 assert.deepEqual(await readBoundedFile(root,fixture.authorityPath),before,'validation must happen before deleting a prior output');
});

test('passing pinned criteria cannot hide a failed required harness assertion',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root);
 const extra=`const fs=require('fs'),assert=require('assert/strict'),outcomes=JSON.parse(fs.readFileSync(${JSON.stringify(fixture.outcomesPath)},'utf8'));let status='pass',observed='healthy';try{assert.equal(false,true)}catch(error){status='fail';observed=error.message}outcomes.criteria.push({criterionId:'required-harness-health',expected:'healthy',observed,status,evidenceRefs:[${JSON.stringify(fixture.artifactPath)}]});fs.writeFileSync(${JSON.stringify(fixture.outcomesPath)},JSON.stringify(outcomes));`;
 const recipe={...fixture.recipe,drive:[...fixture.recipe.drive,{command:process.execPath,args:['-e',extra]}]};
 await writeFileAtomic(root,fixture.recipePath,JSON.stringify(recipe));
 assert.equal((await verification.runVerificationRecipe(root,recipe)).pass,false);
 const verdict=await check(root,fixture);
 assert.equal(verdict.allowed,false,'a recipe failure must block completion even when report-selected pinned outcomes pass');
 assert.equal(verdict.status,'Verification Failed');
});

test('input/output aliases, platform case aliases and control-state outputs preserve original bytes',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root);
 const aliases=[fixture.authorityPath,fixture.sourcePath,fixture.contractPath,fixture.recipePath];
 if(process.platform==='win32')aliases.push(fixture.authorityPath.toUpperCase());
 for(const output of ['evidencePath','outcomesPath']) {
  for(const target of [...aliases,output==='evidencePath'?fixture.outcomesPath:fixture.evidencePath]) {
   const recipe={...fixture.recipe,[output]:target};
   await writeFileAtomic(root,fixture.recipePath,JSON.stringify(recipe));
   const before=await readBoundedFile(root,target);
   await assert.rejects(verification.runVerificationRecipe(root,recipe),/input\/output.*alias/i);
   assert.deepEqual(await readBoundedFile(root,target),before);
  }
  const target='.scratch/work-packages/run/ledger.json';
  await writeFileAtomic(root,target,'ledger bytes must remain unchanged');
  const recipe={...fixture.recipe,[output]:target};
  await writeFileAtomic(root,fixture.recipePath,JSON.stringify(recipe));
  await assert.rejects(verification.runVerificationRecipe(root,recipe),/work-package control state/);
  assert.equal(await readBoundedFile(root,target,{encoding:'utf8'}),'ledger bytes must remain unchanged');
 }
});

test('passing pinned criteria cannot hide a skipped required harness assertion',async t=>{
 const root=await fixtureRoot(t),fixture=await provisionCompletionFixture(root);
 const extra=`const fs=require('fs'),outcomes=JSON.parse(fs.readFileSync(${JSON.stringify(fixture.outcomesPath)},'utf8'));outcomes.criteria.push({criterionId:'required-harness-check',expected:'assertion runs',observed:'required check skipped',status:'skip',evidenceRefs:[${JSON.stringify(fixture.artifactPath)}],counts:{total:1,passed:0,failed:0,skipped:1}});fs.writeFileSync(${JSON.stringify(fixture.outcomesPath)},JSON.stringify(outcomes));`;
 const recipe={...fixture.recipe,drive:[...fixture.recipe.drive,{command:process.execPath,args:['-e',extra]}]};
 await writeFileAtomic(root,fixture.recipePath,JSON.stringify(recipe));
 assert.equal((await verification.runVerificationRecipe(root,recipe)).pass,false);
 const verdict=await check(root,fixture);assert.equal(verdict.allowed,false);assert.equal(verdict.criteria[0].status,'skip');assert.equal(verdict.status,'Needs Validation');
});

test('cleanup input mutation invalidates the preserved verification proof',async t=>{
 const root=await fixtureRoot(t),sourcePath='.scratch/completion/GOAL-1/source.txt';
 const fixture=await provisionCompletionFixture(root,{cleanup:[{command:process.execPath,args:['-e',`require('fs').writeFileSync(${JSON.stringify(sourcePath)},'changed by cleanup')`]}]});
 assert.equal(fixture.result.pass,false);
 assert.equal((await check(root,fixture)).allowed,false);
 const evidence=JSON.parse(await readBoundedFile(root,fixture.evidencePath,{encoding:'utf8'}));
 assert.match(evidence.integrityError,/stale source/);assert.equal(evidence.cleanup.pass,true);
});
