import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {provisionCompletionFixture,completionDigest} from './completion-fixture.test-support.mjs';
import {standardsFixture,soloStandardsFixture,fixtureGitDatabase,put,configure,hash} from './standards-fixture.test-support.mjs';
import {resolveEffectiveStandards} from './standards.mjs';
import {runStandardsChecks,verifyStandardsReceipt} from './standards-checks.mjs';
import {writeGitHubReviews} from './standards-github-review.mjs';
import {runVerificationRecipe,verifyCompletionEvidence} from './verification-recipe.mjs';

async function fixtureRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sc-standards-completion-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  return root;
}
const verify = (root, proof) => verifyCompletionEvidence(root, {contractPath:proof.contractPath,contractDigest:proof.contractDigest});
const completionCli = (root,proof) => spawnSync(process.execPath,[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--contract',proof.contractPath,'--root',root],{encoding:'utf8',windowsHide:true});
async function boundFixture(t, {paths=['apps/web/src/service.txt'],coreOnly=false,waive=false}={}) {
  const root = await fixtureRoot(t);
  const proof = await provisionCompletionFixture(root);
  const config = await standardsFixture(root);
  if (coreOnly) delete config.scopes[0].profile;
  if (waive) config.exceptions = [{scope:'apps/web',ruleIds:['CORE-TEST'],owner:'Engineering',reason:'approved fixture exception',expiresAt:'2099-01-01T00:00:00Z',approvalRef:'docs/standards-approval.md',approvalDigest:hash(await readFile(path.join(root,'docs/standards-approval.md')))}];
  if (coreOnly || waive) await configure(root,config);
  proof.contract.sourceRefs.push('apps/web/src/service.txt');
  const snapshot = await resolveEffectiveStandards(root, paths);
  const snapshotRef = '.scratch/standards/snapshot.json', receiptRef = '.scratch/standards/receipt.json';
  await put(root, snapshotRef, snapshot);
  const receipt = await runStandardsChecks(root, snapshot, {outputRef:receiptRef});
  assert.equal(receipt.pass, true, receipt.issues?.join(' '));
  proof.contract.standards = {snapshotRef,digest:snapshot.effectiveStandardsDigest,receiptRef};
  await put(root, proof.contractPath, proof.contract);
  proof.contractDigest = completionDigest(await readFile(path.join(root,proof.contractPath)));
  return {root,proof,config,snapshot,snapshotRef,receiptRef,receipt};
}

test('solo fixture native review flows through receipts and completion without bypassing fresh evidence', async t => {
  const root=await fixtureRoot(t),proof=await provisionCompletionFixture(root);
  await soloStandardsFixture(root);
  // Only this disposable test directory receives a synthetic identity, never a real application commit.
  for(const args of [['init','--quiet'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','--no-verify','--quiet','-m','Fixture-only identity']]) {
    const result=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr);
  }
  const snapshot=await resolveEffectiveStandards(root,['apps/web/src/service.txt']);
  const context={repository:'acme/app',number:7,testedSha:snapshot.gitHead,headSha:snapshot.gitHead,baseSha:'a'.repeat(40)};
  const check=snapshot.checks.find(value=>value.id==='review');
  const packet={...context,reviewAuthority:'owner-self-review',contractVersion:'1.0.0',policyDigest:snapshot.reviewAuthority.policyDigest,decision:'accept',
    observations:[{checkKey:check.key,standardsDigest:snapshot.effectiveStandardsDigest,sourceDigest:snapshot.sourceDigest,
      steps:['Fixture-only boundary inspection'],observed:'Deterministic API fixture, not a real human decision.'}]};
  const review={id:11,state:'COMMENTED',user:{login:'fixture-owner',type:'User'},commit_id:context.headSha,
    submitted_at:new Date(Date.now()-1000).toISOString(),body:'```json super-compound-review\n'+JSON.stringify(packet)+'\n```'};
  const contents=new Map();
  for(const input of snapshot.inputs)contents.set(input.ref,await readFile(path.join(root,input.ref)));
  for(const engine of snapshot.engine)contents.set(path.posix.normalize('.agent/tools/'+engine.name),await readFile(new URL(engine.name,import.meta.url)));
  const database=fixtureGitDatabase(contents,context.baseSha);
  const request=async(route)=>{
    const gitResponse=database.response(route);if(gitResponse)return structuredClone(gitResponse);
    if(route==='/graphql')return {data:{repository:{pullRequest:{reviewDecision:'REVIEW_REQUIRED'}}}};
    if(route.endsWith('/pulls/7'))return {state:'open',draft:false,user:{login:'fixture-owner',type:'User'},head:{sha:context.headSha},base:{sha:context.baseSha,ref:'main',repo:{full_name:context.repository}},merge_commit_sha:context.testedSha};
    if(route.endsWith('/branches/main'))return {name:'main',protected:true,commit:{sha:context.baseSha}};
    if(route.includes('/reviews?'))return [structuredClone(review)];
    if(route.endsWith('/permission'))return {permission:'admin'};
    if(route.includes('/contents/')) {
      const [ref,query]=route.split('/contents/')[1].split('?');
      assert.equal(query,'ref='+context.baseSha);
      const bytes=contents.get(ref);
      return {type:'file',path:ref,sha:database.blobs.get(ref),encoding:'base64',size:bytes.length,content:bytes.toString('base64')};
    }
    throw new Error('Unexpected fixture route '+route);
  };
  await writeGitHubReviews(root,snapshot,context,{request});
  const snapshotRef='.scratch/standards/snapshot.json',receiptRef='.scratch/standards/receipt.json';
  await put(root,snapshotRef,snapshot);
  const receipt=await runStandardsChecks(root,snapshot,{outputRef:receiptRef});
  assert.equal(receipt.pass,true,JSON.stringify(receipt.results));
  assert.equal((await verifyStandardsReceipt(root,snapshot,receipt)).allowed,true);
  proof.contract.sourceRefs.push('apps/web/src/service.txt');
  proof.contract.standards={snapshotRef,digest:snapshot.effectiveStandardsDigest,receiptRef};
  await put(root,proof.contractPath,proof.contract);
  proof.contractDigest=completionDigest(await readFile(path.join(root,proof.contractPath)));
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass,true);
  assert.equal((await verify(root,proof)).allowed,true);
  const observation=JSON.parse(await readFile(path.join(root,check.observationRef),'utf8'));
  for(const mutate of [value=>delete value.provenance,value=>value.provenance.reviewAuthority='independent',value=>value.provenance.appointmentDigest='f'.repeat(64),value=>value.timestamp='2000-01-01T00:00:00.000Z',value=>value.steps=[]]) {
    const invalid=structuredClone(observation);mutate(invalid);await put(root,check.observationRef,invalid);
    assert.equal((await verifyStandardsReceipt(root,snapshot,receipt)).allowed,false);
    assert.equal((await verify(root,proof)).allowed,false);
    await assert.rejects(runVerificationRecipe(root,proof.recipe),/standards verification failed/);
  }
  await put(root,check.observationRef,observation);
  assert.equal((await verify(root,proof)).allowed,true);
  for(const mutate of [value=>{value.results=[];},value=>{value.pass=true;value.results.find(result=>result.checkKey===check.key).status='skip';},value=>{value.results.find(result=>result.checkKey===check.key).artifact.digest='f'.repeat(64);}]) {
    const invalid=structuredClone(receipt);mutate(invalid);await put(root,receiptRef,invalid);
    assert.equal((await verify(root,proof)).allowed,false);
  }
});

test('active pinned standards cannot complete from functional outcomes without standards binding', async t => {
  const root = await fixtureRoot(t);
  const proof = await provisionCompletionFixture(root);
  await standardsFixture(root);
  const verdict = await verify(root, proof);
  assert.equal(verdict.allowed, false, 'active standards require scoped snapshot and gate receipt');
  assert.match(verdict.issues.join(' '), /standards.*binding|bound.*standards/i);
});

test('scoped standards snapshot and receipt are captured in executed acceptance provenance', async t => {
  const {root,proof,snapshotRef,receiptRef} = await boundFixture(t);
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass, true);
  const evidence = JSON.parse(await readFile(path.join(root,proof.evidencePath),'utf8'));
  for (const ref of [snapshotRef,receiptRef]) assert.ok(evidence.sources.some(source => source.ref === ref), `binding provenance must include ${ref}`);
  assert.equal((await verify(root,proof)).allowed, true);
});

test('acceptance recipe rejects a standards identity mismatch before overwriting prior outcomes', async t => {
  const {root,proof} = await boundFixture(t);
  const before = await readFile(path.join(root,proof.outcomesPath));
  proof.contract.standards.digest = 'a'.repeat(64);
  await put(root,proof.contractPath,proof.contract);
  await assert.rejects(runVerificationRecipe(root,proof.recipe), /standards.*digest|standards.*identity/i);
  assert.deepEqual(await readFile(path.join(root,proof.outcomesPath)), before);
});

test('a passing profile subset cannot complete changes in another application scope', async t => {
  const {root,proof} = await boundFixture(t);
  proof.contract.sourceRefs.push('services/api/src/service.txt');
  await put(root,proof.contractPath,proof.contract);
  await assert.rejects(runVerificationRecipe(root,proof.recipe), /standards.*scope|scope.*standards/i);
});

test('a completion contract without application source scope requires all configured standards scopes', async t => {
  const {root,proof} = await boundFixture(t);
  proof.contract.sourceRefs = proof.contract.sourceRefs.filter(ref => !ref.startsWith('apps/'));
  await put(root,proof.contractPath,proof.contract);
  await assert.rejects(runVerificationRecipe(root,proof.recipe), /full.*standards|all configured.*scope/i);
});

test('standards-bound recipes accept stack validation budgets while legacy budgets stay bounded', async t => {
  const {root,proof} = await boundFixture(t);
  const recipe = {...proof.recipe,timeoutMs:1800000};
  await put(root,proof.recipePath,recipe);
  assert.equal((await runVerificationRecipe(root,recipe)).pass, true);
  const invalid = {...recipe,timeoutMs:1800001};
  await put(root,proof.recipePath,invalid);
  await assert.rejects(runVerificationRecipe(root,invalid), /timeout/);
  const legacy = await fixtureRoot(t), old = await provisionCompletionFixture(legacy);
  const oldInvalid = {...old.recipe,timeoutMs:60001};
  await put(legacy,old.recipePath,oldInvalid);
  await assert.rejects(runVerificationRecipe(legacy,oldInvalid), /timeout/);
});

test('missing, subset, failed, skipped and forged gate receipts cannot complete or run acceptance', async t => {
  const {root,proof,receiptRef,receipt} = await boundFixture(t);
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass, true);
  const outcomes = await readFile(path.join(root,proof.outcomesPath));
  const changes = [
    value => {value.results=[];},
    value => {value.results.push({...value.results[0]});},
    value => {value.standardsDigest='a'.repeat(64);},
    value => {value.sourceDigest='a'.repeat(64);},
    value => {value.timestamp='2099-01-01T00:00:00Z';},
    value => {value.results[0].execution=null;},
    ...['fail','skip','not-run','error'].map(status => value => {value.results[0].status=status;}),
  ];
  for (const change of changes) {
    const invalid = structuredClone(receipt);
    change(invalid);
    await put(root,receiptRef,invalid);
    assert.equal((await verify(root,proof)).allowed, false);
    await assert.rejects(runVerificationRecipe(root,proof.recipe), /standards verification failed/);
    assert.deepEqual(await readFile(path.join(root,proof.outcomesPath)), outcomes);
  }
  await rm(path.join(root,receiptRef));
  assert.equal((await verify(root,proof)).allowed, false);
  await assert.rejects(runVerificationRecipe(root,proof.recipe), /File does not exist/);
  await put(root,receiptRef,receipt);
  assert.equal((await verify(root,proof)).allowed, true);
});

test('changed sources, new inventory files, gate artifacts and expired exceptions invalidate completion', async t => {
  const {root,proof,snapshot,config} = await boundFixture(t);
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass, true);
  const source = 'apps/web/src/service.txt', original = await readFile(path.join(root,source));
  await put(root,source,'changed implementation\n');
  assert.equal((await verify(root,proof)).allowed, false);
  await put(root,source,original.toString('utf8'));
  const added = 'apps/web/src/new-service.txt';
  await put(root,added,'new unverified file\n');
  assert.equal((await verify(root,proof)).allowed, false);
  await rm(path.join(root,added));
  const reportRef = snapshot.checks[0].resultRef, report = await readFile(path.join(root,reportRef));
  await put(root,reportRef,{schema:'standards_check_outcome_v1',status:'skip',observed:'check skipped',counts:{total:1,passed:0,failed:0,skipped:1}});
  assert.equal((await verify(root,proof)).allowed, false);
  await put(root,reportRef,report.toString('utf8'));
  assert.equal((await verify(root,proof)).allowed, true);
  config.exceptions = [{scope:'apps/web',ruleIds:['CORE-TEST'],owner:'Engineering',reason:'fixture exception',expiresAt:'2000-01-01T00:00:00Z',approvalRef:'docs/standards-approval.md',approvalDigest:hash(await readFile(path.join(root,'docs/standards-approval.md')))}];
  await configure(root,config);
  assert.equal((await verify(root,proof)).allowed, false);
});

test('absent and explicitly disabled legacy configuration preserve completion without a standards claim', async t => {
  const root = await fixtureRoot(t), proof = await provisionCompletionFixture(root);
  let verdict = await verify(root,proof);
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.standards.status, 'legacy');
  await configure(root,{schema:'project_standards_v1',enabled:false});
  verdict = await verify(root,proof);
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.standards.status, 'legacy');
  assert.match(verdict.standards.limitations.join(' '), /compliance is not established/);
  await configure(root,{schema:'unsupported_standards',enabled:false});
  assert.equal((await verify(root,proof)).allowed, false, 'invalid schema cannot silently fall back to legacy');
  await put(root,'.agent/rules/project-config.md','```json super-compound-standards\n{broken}\n```\n');
  assert.equal((await verify(root,proof)).allowed, false);
});

test('standards binding rejects wrong identity, malformed fields and aliased gate outputs', async t => {
  const {root,proof} = await boundFixture(t);
  const original = structuredClone(proof.contract);
  for (const change of [
    value => {value.standards.digest='a'.repeat(64);},
    value => {value.standards.digest='unversioned';},
    value => {value.standards.receiptRef=value.standards.snapshotRef;},
    value => {value.standards.snapshotRef='../../outside.json';},
    value => {value.standards.overrideMandatory=true;},
    value => {value.standards=null;},
  ]) {
    const invalid = structuredClone(original);
    change(invalid);
    await put(root,proof.contractPath,invalid);
    const pin = {...proof,contractDigest:completionDigest(await readFile(path.join(root,proof.contractPath)))};
    assert.equal((await verify(root,pin)).allowed, false);
  }
  await put(root,proof.contractPath,original);
  const recipe = {...proof.recipe,outcomesPath:original.standards.receiptRef};
  await put(root,proof.recipePath,recipe);
  const before = await readFile(path.join(root,original.standards.receiptRef));
  await assert.rejects(runVerificationRecipe(root,recipe), /input\/output.*alias/);
  assert.deepEqual(await readFile(path.join(root,original.standards.receiptRef)), before);
});

test('source inventory changes during acceptance prevent the recipe from publishing a passing proof', async t => {
  const {root,proof} = await boundFixture(t);
  const recipe = {...proof.recipe,drive:[...proof.recipe.drive,{command:process.execPath,args:['-e','require("fs").writeFileSync("apps/web/src/unverified.txt","new implementation")']}]};
  await put(root,proof.recipePath,recipe);
  assert.equal((await runVerificationRecipe(root,recipe)).pass, false);
  assert.equal((await verify(root,proof)).allowed, false);
});

test('completion CLI explicitly separates legacy goal completion from organizational compliance', async t => {
  const root = await fixtureRoot(t), proof = await provisionCompletionFixture(root);
  const result = completionCli(root,proof);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /COMPLETE_ALLOWED.*status=Done/);
  assert.match(result.stdout, /STANDARDS_LEGACY.*organizational compliance not established/);
});

test('completion CLI reports the exact standards binding and scoped profile version', async t => {
  const {root,proof,snapshot,snapshotRef,receiptRef} = await boundFixture(t);
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass, true);
  const result = completionCli(root,proof);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`STANDARDS digest=${snapshot.effectiveStandardsDigest}`));
  assert.ok(result.stdout.includes(`snapshot=${snapshotRef} receipt=${receiptRef}`));
  assert.match(result.stdout, /STANDARDS_SCOPE apps\/web profile=nextjs-typescript@1\.0\.0/);
});

test('completion CLI retains core-only limitations and approved waivers without claiming framework validation', async t => {
  const {root,proof} = await boundFixture(t,{coreOnly:true,waive:true});
  assert.equal((await runVerificationRecipe(root,proof.recipe)).pass, true);
  const result = completionCli(root,proof);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /STANDARDS_LIMITATION .*core and repository conventions only/);
  assert.match(result.stdout, /STANDARDS_WAIVED apps\/web:CORE-TEST/);
  assert.doesNotMatch(result.stdout, /framework validation passed|full.framework pass/);
});
