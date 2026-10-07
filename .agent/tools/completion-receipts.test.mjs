import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createWorkPackage,recordWorkPackageResult,readLedger,submitCompletionReceipt,classifyCompletionReceipt,acknowledgeCompletionReceipt} from './work-package.mjs';
import {provisionCompletionFixture} from './completion-fixture.test-support.mjs';

const expectedEvidence={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
async function fixture(t,options={}) {
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-inbox-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 execFileSync('git',['init'],{cwd:root,stdio:'ignore'});
 await writeFile(path.join(root,'brief.md'),'Implement GOAL-001');
 await writeFile(path.join(root,'scope.json'),'["src"]');
 const proof=await provisionCompletionFixture(root,{taskId:'GOAL-001',evidencePath:'evidence.json',...options});
 const opts={runId:'run',goalId:'GOAL-001'};
 const pkg=await createWorkPackage(root,{...opts,briefPath:'brief.md',pathsFile:'scope.json',expectedEvidence,completionContract:{path:proof.contractPath,digest:proof.contractDigest},assignment:{workerId:'worker',attempt:1}});
 await recordWorkPackageResult(root,{...opts,status:'in-progress',expectedVersion:pkg.ledgerVersion});
 await writeFile(pkg.reportPath,'Implemented — Pending Verification. Actual health assertion recorded.');
 return {root,pkg,opts,proof,input:{...opts,workerId:'worker',attempt:1,reportPath:path.relative(root,pkg.reportPath).replaceAll('\\','/'),evidence:{...expectedEvidence,evidenceRefs:['evidence.json']}}};
}
test('completion survives interruption on both sides of classification and duplicates are no-ops',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const submitted=await submitCompletionReceipt(root,input);
 let ledger=await readLedger(root,pkg.ledgerPath,'run');
 assert.equal(ledger.goals['GOAL-001'].receipts[submitted.receiptId].state,'received');
 const duplicate=await submitCompletionReceipt(root,input);
 assert.equal(duplicate.action,'unchanged');
 assert.equal(duplicate.ledgerVersion,submitted.ledgerVersion);
 const classified=await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:ledger.ledgerVersion,status:'implemented'});
 ledger=await readLedger(root,pkg.ledgerPath,'run');
 assert.equal(ledger.goals['GOAL-001'].status,'implemented');
 assert.equal(ledger.goals['GOAL-001'].receipts[submitted.receiptId].state,'classified');
 const replay=await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:0,status:'implemented'});
 assert.equal(replay.ledgerVersion,classified.ledgerVersion);
 await acknowledgeCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:ledger.ledgerVersion});
 ledger=await readLedger(root,pkg.ledgerPath,'run');
 assert.equal(ledger.goals['GOAL-001'].receipts[submitted.receiptId].state,'acknowledged');
 assert.equal((await submitCompletionReceipt(root,input)).action,'unchanged');
});

test('stale completion blocks only its goal and acknowledgement requires classification',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const submitted=await submitCompletionReceipt(root,input);
 await assert.rejects(acknowledgeCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion}),/classify/);
 await writeFile(path.join(root,'evidence.json'),'{"pass":false}');
 const classified=await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'implemented'});
 assert.equal(classified.classification.disposition,'blocked');
 assert.match(classified.classification.reason,/stale_evidence/);
 assert.equal((await readLedger(root,pkg.ledgerPath,'run')).goals['GOAL-001'].status,'blocked');
});

test('lost worker is classified without promoting its report',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const submitted=await submitCompletionReceipt(root,input);
 const result=await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'implemented',workerAvailable:false});
 assert.equal(result.classification.reason,'worker_lost');
 assert.equal((await readLedger(root,pkg.ledgerPath,'run')).goals['GOAL-001'].status,'blocked');
});

test('valid verified work is retained when receipt acknowledgement is retried',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const submitted=await submitCompletionReceipt(root,input);
 const classified=await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'implemented'});
 const verified=await recordWorkPackageResult(root,{...opts,status:'verified',expectedVersion:classified.ledgerVersion,evidence:input.evidence,verification:'SPEC and QUALITY pass'});
 await acknowledgeCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:verified.ledgerVersion});
 const before=await readFile(pkg.ledgerPath,'utf8');
 await acknowledgeCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:0});
 await submitCompletionReceipt(root,input);
 assert.equal(await readFile(pkg.ledgerPath,'utf8'),before);
 assert.equal((await readLedger(root,pkg.ledgerPath,'run')).goals['GOAL-001'].status,'verified');
});

test('stale implemented proof is quarantined without blocking independent goals',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const implemented=await recordWorkPackageResult(root,{...opts,status:'implemented',expectedVersion:2,evidence:input.evidence,verification:'implementation proof'});
 const other=await createWorkPackage(root,{runId:'run',goalId:'GOAL-002',briefPath:'brief.md',pathsFile:'scope.json',expectedEvidence});
 const submitted=await submitCompletionReceipt(root,input);
 await writeFile(path.join(root,'evidence.json'),'{"pass":false}');
 await classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'verified'});
 const ledger=await readLedger(root,pkg.ledgerPath,'run');
 assert.equal(ledger.goals['GOAL-001'].status,'blocked');
 assert.equal(ledger.goals['GOAL-002'].status,'ready');
 assert.ok(ledger.goals['GOAL-001'].quarantinedEvidence);
});

test('dependency proof drift after dispatch blocks receipt promotion while acknowledgement remains available',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 await recordWorkPackageResult(root,{...opts,status:'implemented',expectedVersion:2,evidence:input.evidence,verification:'implementation proof'});
 await recordWorkPackageResult(root,{...opts,status:'verified',expectedVersion:3,evidence:input.evidence,verification:'review passed'});
 await writeFile(path.join(root,'dependent.md'),'# GOAL-002\nBlocked by: brief.md\n');
 const proof=await provisionCompletionFixture(root,{taskId:'GOAL-002',evidencePath:'dependent-evidence.json'});
 const dependent={runId:'run',goalId:'GOAL-002'};
 const created=await createWorkPackage(root,{...dependent,briefPath:'dependent.md',pathsFile:'scope.json',expectedEvidence,completionContract:{path:proof.contractPath,digest:proof.contractDigest},assignment:{workerId:'dependent-worker',attempt:1}});
 await recordWorkPackageResult(root,{...dependent,status:'in-progress',expectedVersion:created.ledgerVersion});
 await writeFile(created.reportPath,'Implementation with independent proof passed.');
 const submitted=await submitCompletionReceipt(root,{...dependent,workerId:'dependent-worker',attempt:1,reportPath:path.relative(root,created.reportPath).replaceAll('\\','/'),evidence:{...expectedEvidence,evidenceRefs:['dependent-evidence.json']}});
 await writeFile(path.join(root,'evidence.json'),'{"pass":false}');
 const classified=await classifyCompletionReceipt(root,{...dependent,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'implemented'});
 assert.equal(classified.classification.disposition,'blocked');
 assert.match(classified.classification.reason,/Evidence digest mismatch for GOAL-001/);
 const ledger=await readLedger(root,pkg.ledgerPath,'run',{checkEvidence:false});
 assert.equal(ledger.goals['GOAL-002'].status,'blocked');
 assert.equal(ledger.goals['GOAL-001'].status,'verified');
 await acknowledgeCompletionReceipt(root,{...dependent,receiptId:submitted.receiptId,expectedVersion:classified.ledgerVersion});
 await assert.rejects(readLedger(root,pkg.ledgerPath,'run'),/Evidence digest mismatch/);
});

test('failed acceptance outcome cannot classify a receipt as verified or change ledger bytes',async t=>{
 const {root,pkg,opts,input}=await fixture(t,{status:'fail'});
 const implemented=await recordWorkPackageResult(root,{...opts,status:'implemented',expectedVersion:2,evidence:input.evidence,verification:'implementation produced; failed verification retained'});
 const submitted=await submitCompletionReceipt(root,{...input,expectedVersion:implemented.ledgerVersion});
 const before=await readFile(pkg.ledgerPath);
 await assert.rejects(classifyCompletionReceipt(root,{...opts,receiptId:submitted.receiptId,expectedVersion:submitted.ledgerVersion,status:'verified'}),/completion|Verification Failed|outcome/i);
 assert.deepEqual(await readFile(pkg.ledgerPath),before);
 const ledger=await readLedger(root,pkg.ledgerPath,'run',{checkEvidence:false});
 assert.equal(ledger.goals['GOAL-001'].status,'implemented');
 assert.equal(ledger.goals['GOAL-001'].receipts[submitted.receiptId].state,'received');
});

test('a distinct reviewed receipt promotes implemented work only after all acceptance evidence passes',async t=>{
 const {root,pkg,opts,input}=await fixture(t);
 const first=await submitCompletionReceipt(root,input);
 const implemented=await classifyCompletionReceipt(root,{...opts,receiptId:first.receiptId,expectedVersion:first.ledgerVersion,status:'implemented'});
 await writeFile(pkg.reportPath,'Coordinator inspected health assertion output: healthy=true; AC-1 passed.');
 const reviewed=await submitCompletionReceipt(root,{...input,expectedVersion:implemented.ledgerVersion});
 assert.notEqual(reviewed.receiptId,first.receiptId);
 const verified=await classifyCompletionReceipt(root,{...opts,receiptId:reviewed.receiptId,expectedVersion:reviewed.ledgerVersion,status:'verified'});
 assert.equal(verified.classification.disposition,'verified');
 const ledger=await readLedger(root,pkg.ledgerPath,'run');
 assert.equal(ledger.goals['GOAL-001'].status,'verified');
 assert.equal(ledger.goals['GOAL-001'].receipts[first.receiptId].classification.disposition,'implemented');
 assert.equal(ledger.goals['GOAL-001'].receipts[reviewed.receiptId].classification.disposition,'verified');
});
