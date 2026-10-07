import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import { evaluatePromise } from './verified-promise.mjs';

test('completion CLI requires a valid ledger and fresh proof while retaining exit codes', (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'verified-promise-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const file=path.join(root,'.scratch/work-packages/run/ledger.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const digests={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    const goal={status:'verified',briefPath:'brief.md',reportPath:'report.md',pathsPath:'scope.json',reviewPackagePath:'review.patch',scopeDigest:'d'.repeat(64),baselineDirty:{},verification:'mapped checks pass',expectedEvidence:digests,evidence:{...digests,evidenceRefs:['proof.txt'],evidenceArtifacts:[{path:'proof.txt',digest:createHash('sha256').update('verified').digest('hex')}]}};
    const ledger={schema:'work_package_ledger_v2',runId:'run',ledgerVersion:1,goals:{'GOAL-001':goal}};
    const write=()=>fs.writeFileSync(file,JSON.stringify(ledger));
    const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./verified-promise.mjs',import.meta.url)),'--run','run','--root',root],{encoding:'utf8'});
    write(); assert.equal(run().status,0);
    fs.writeFileSync(path.join(root,'proof.txt'),'changed');
    assert.equal(run().status,2,'stale proof must never print COMPLETE_ALLOWED');
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    ledger.goals['GOAL-001']={...goal,status:'ready'}; delete ledger.goals['GOAL-001'].evidence;
    write(); assert.equal(run().status,1);
    ledger.extra='corrupt'; write(); assert.equal(run().status,2); delete ledger.extra;
    ledger.goals={}; write(); assert.equal(run().status,1);
    fs.rmSync(file); assert.equal(run().status,2);
});

test('all goals verified allows completion', () => {
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
