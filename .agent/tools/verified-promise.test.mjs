import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import { evaluatePromise } from './verified-promise.mjs';
import {provisionCompletionFixture} from './completion-fixture.test-support.mjs';
import {createWorkPackage,recordWorkPackageResult} from './work-package.mjs';

test('light completion evaluates actual outcomes without a ledger', async (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'verified-light-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const fixture=await provisionCompletionFixture(root,{taskId:'TASK-001',status:'fail'});
    const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--contract',fixture.contractPath,'--root',root],{encoding:'utf8'});
    const denied=run();
    assert.equal(denied.status,1,denied.stderr);
    assert.doesNotMatch(denied.stdout,/COMPLETE_ALLOWED/);
    assert.match(denied.stdout,/Verification Failed/);
    await provisionCompletionFixture(root,{taskId:'TASK-001'});
    const allowed=run();
    assert.equal(allowed.status,0,allowed.stderr);
    assert.match(allowed.stdout,/COMPLETE_ALLOWED/);
    assert.match(allowed.stdout,/Evidence of Completion/);
    assert.match(allowed.stdout,/AC-1/);
    assert.equal(fs.existsSync(path.join(root,'.scratch/work-packages')),false);
});

test('all branch goals passing cannot hide a failed aggregate health outcome', async (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'verified-aggregate-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    assert.equal(spawnSync('git',['init'],{cwd:root,windowsHide:true}).status,0);
    fs.writeFileSync(path.join(root,'scope.json'),'["src"]');
    const aggregate=await provisionCompletionFixture(root,{taskId:'run',status:'fail'});
    const pins={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    for (const goalId of ['A','B']) {
        const fixture=await provisionCompletionFixture(root,{taskId:goalId});
        const common={runId:'run',goalId};
        const created=await createWorkPackage(root,{...common,briefPath:fixture.authorityPath,pathsFile:'scope.json',expectedEvidence:pins,completionContract:{path:fixture.contractPath,digest:fixture.contractDigest},runCompletionContract:{path:aggregate.contractPath,digest:aggregate.contractDigest}});
        let expectedVersion=created.ledgerVersion;
        for (const status of ['in-progress','implemented','verified']) {
            const result=await recordWorkPackageResult(root,{...common,status,expectedVersion,verification:'actual health assertion',...(['implemented','verified'].includes(status)?{evidence:{...pins,evidenceRefs:[fixture.evidencePath]}}:{})});
            expectedVersion=result.ledgerVersion;
        }
    }
    const args=[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--run','run','--root',root];
    const denied=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
    assert.equal(denied.status,1,denied.stderr);
    assert.match(denied.stdout,/COMPLETE_DENIED.*Verification Failed/);
    assert.doesNotMatch(denied.stdout,/COMPLETE_ALLOWED/);
    await provisionCompletionFixture(root,{taskId:'run'});
    const allowed=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
    assert.equal(allowed.status,0,allowed.stderr);
    assert.match(allowed.stdout,/COMPLETE_ALLOWED run=run/);
    assert.match(allowed.stdout,/Evidence of Completion/);
    const file=path.join(root,'.scratch/work-packages/run/ledger.json');
    const legacy=JSON.parse(fs.readFileSync(file,'utf8'));
    const aggregatePin=legacy.completionContract;
    legacy.completionContract=legacy.goals.A.completionContract;
    fs.writeFileSync(file,JSON.stringify(legacy));
    const wrongScope=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
    assert.equal(wrongScope.status,1,'an unrelated goal proof cannot stand in for the aggregate outcome');
    assert.doesNotMatch(wrongScope.stdout,/COMPLETE_ALLOWED/);
    legacy.completionContract=aggregatePin;
    fs.writeFileSync(file,JSON.stringify(legacy));
    const aggregateFile=path.join(root,aggregatePin.path);
    const aggregateBytes=fs.readFileSync(aggregateFile);
    fs.unlinkSync(aggregateFile);
    const unreadable=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
    assert.equal(unreadable.status,2,'unreadable aggregate input retains the usage/corrupt exit code');
    assert.doesNotMatch(unreadable.stdout,/COMPLETE_ALLOWED/);
    fs.writeFileSync(aggregateFile,aggregateBytes);
    delete legacy.completionContract;
    fs.writeFileSync(file,JSON.stringify(legacy));
    const missing=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
    assert.equal(missing.status,1);
    assert.match(missing.stdout,/aggregate outcome contract missing/);
});

test('legacy status and arbitrary proof remain inspectable but cannot authorize completion', (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'verified-legacy-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const proof=JSON.stringify({pass:false,error:'acceptance failed'});
    fs.writeFileSync(path.join(root,'proof.json'),proof);
    const pins={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    const goal={status:'verified',briefPath:'brief.md',reportPath:'report.md',pathsPath:'scope.json',reviewPackagePath:'review.patch',scopeDigest:'d'.repeat(64),baselineDirty:{},verification:'claim only',expectedEvidence:pins,evidence:{...pins,evidenceRefs:['proof.json'],evidenceArtifacts:[{path:'proof.json',digest:createHash('sha256').update(proof).digest('hex')}]}};
    const directory=path.join(root,'.scratch/work-packages/run');
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'ledger.json'),JSON.stringify({schema:'work_package_ledger_v2',runId:'run',ledgerVersion:1,goals:{A:goal}}));
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--run','run','--root',root],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,1,result.stderr);
    assert.match(result.stdout,/Needs Validation/);
    assert.doesNotMatch(result.stdout,/COMPLETE_ALLOWED/);
});

test('completion CLI requires a valid ledger and fresh proof while retaining exit codes', async (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'verified-promise-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const file=path.join(root,'.scratch/work-packages/run/ledger.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const fixture=await provisionCompletionFixture(root,{taskId:'GOAL-001',evidencePath:'proof.txt'});
    const proof=fs.readFileSync(path.join(root,'proof.txt'));
    const digests={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    const goal={status:'verified',briefPath:'brief.md',reportPath:'report.md',pathsPath:'scope.json',reviewPackagePath:'review.patch',scopeDigest:'d'.repeat(64),baselineDirty:{},verification:'mapped checks pass',completionContract:{path:fixture.contractPath,digest:fixture.contractDigest},expectedEvidence:digests,evidence:{...digests,evidenceRefs:['proof.txt'],evidenceArtifacts:[fixture.evidenceRef]}};
    const ledger={schema:'work_package_ledger_v2',runId:'run',ledgerVersion:1,goals:{'GOAL-001':goal}};
    const write=()=>fs.writeFileSync(file,JSON.stringify(ledger));
    const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--run','run','--root',root],{encoding:'utf8'});
    write(); assert.equal(run().status,0);
    fs.writeFileSync(path.join(root,'proof.txt'),'changed');
    assert.equal(run().status,2,'stale proof must never print COMPLETE_ALLOWED');
    fs.writeFileSync(path.join(root,'proof.txt'),proof);
    ledger.goals['GOAL-001']={...goal,status:'ready'}; delete ledger.goals['GOAL-001'].evidence;
    write(); assert.equal(run().status,1);
    ledger.extra='corrupt'; write(); assert.equal(run().status,2); delete ledger.extra;
    ledger.goals={}; write(); assert.equal(run().status,1);
    fs.rmSync(file); assert.equal(run().status,2);
});

test('all verified statuses satisfy the status predicate, not evidence authority', () => {
    const verdict = evaluatePromise({
        goals: {
            'GOAL-001': { status: 'verified' },
            'GOAL-002': { status: 'verified' },
        },
    });
    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.unverified, []);
});

test('any unverified goal denies completion', () => {
    const verdict = evaluatePromise({
        goals: {
            'GOAL-001': { status: 'verified' },
            'GOAL-002': { status: 'in-progress' },
            'GOAL-003': {},
        },
    });
    assert.equal(verdict.allowed, false);
    assert.deepEqual(verdict.unverified, [
        { id: 'GOAL-002', status: 'in-progress' },
        { id: 'GOAL-003', status: 'unknown' },
    ]);
});

test('empty ledger fails closed', () => {
    const verdict = evaluatePromise({ goals: {} });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.empty, true);
});

test('corrupt ledger fails closed', () => {
    assert.equal(evaluatePromise(null).corrupt, true);
    assert.equal(evaluatePromise({}).corrupt, true);
    assert.equal(evaluatePromise({ goals: 'nope' }).corrupt, true);
});
