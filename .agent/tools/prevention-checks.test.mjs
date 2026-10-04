import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {recordPreventionCheck,readPreventionStore,recordCheckEffectiveness,preventionReport} from './prevention-checks.mjs';

async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-prevention-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'docs/learnings'),{recursive:true});
 await writeFile(path.join(root,'docs/learnings/rule.md'),'---\nstatus: active\n---\n# Regression rule');
 await writeFile(path.join(root,'proof.json'),JSON.stringify({exitCode:0,command:'node --test check.mjs',sourceDigest:'a'.repeat(64),timestamp:'2026-10-04T00:00:00Z',counts:{pass:1,fail:0,skip:0}}));
 await writeFile(path.join(root,'check.mjs'),'// existing check');
 const input={owner:'sc-work',origin:'project:goal:defect',closeout:'close-1',knowledgeRef:'docs/learnings/rule.md',scope:['check.mjs'],authorizedScope:['check.mjs'],reproducer:'sum(2,3) returned -1',checkRef:'check.mjs',mode:'reuse',evidence:['proof.json'],afterRef:'proof.json',state:'candidate',reason:'existing check covers reproducer'};
 return {root,input};
}
test('existing check is reused with durable lifecycle and replay identity',async t=>{
 const {root,input}=await fixture(t);
 const candidate=await recordPreventionCheck({root,input});
 assert.equal(candidate.receipt.state,'candidate');
 const validated=await recordPreventionCheck({root,input:{...input,state:'validated',expectedVersion:candidate.version}});
 assert.equal(validated.receipt.state,'validated');
 const applied=await recordPreventionCheck({root,input:{...input,state:'applied',expectedVersion:validated.version}});
 assert.equal(applied.receipt.disposition,'reused');
 const duplicate=await recordPreventionCheck({root,input:{...input,state:'applied',expectedVersion:0}});
 assert.equal(duplicate.action,'unchanged');
 assert.equal(duplicate.version,applied.version);
});
test('malformed pass counts and changed knowledge cannot promote a check',async t=>{
 const {root,input}=await fixture(t);
 const first=await recordPreventionCheck({root,input});
 const proof=JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root,'proof.json'),'utf8'));
 delete proof.counts.pass;
 await writeFile(path.join(root,'malformed.json'),JSON.stringify(proof));
 await assert.rejects(recordPreventionCheck({root,input:{...input,state:'validated',afterRef:'malformed.json',expectedVersion:first.version}}),/provenance/);
 const validated=await recordPreventionCheck({root,input:{...input,state:'validated',expectedVersion:first.version+1}});
 await writeFile(path.join(root,'docs/learnings/rule.md'),'---\nstatus: active\n---\n# Changed rule');
 await assert.rejects(recordPreventionCheck({root,input:{...input,state:'applied',expectedVersion:validated.version}}),/knowledge.*changed/);
});

test('failed/deferred candidates persist, scope is enforced, and stale guidance is rejected',async t=>{
 const {root,input}=await fixture(t);
 await assert.rejects(recordPreventionCheck({root,input:{...input,scope:['other'],checkRef:'check.mjs'}}),/scope/);
 await assert.rejects(recordPreventionCheck({root,input:{...input,owner:'sc-compound'}}),/owning/);
 const candidate=await recordPreventionCheck({root,input});
 await writeFile(path.join(root,'failed.json'),'{"exitCode":1}');
 await assert.rejects(recordPreventionCheck({root,input:{...input,state:'validated',afterRef:'failed.json',expectedVersion:candidate.version}}),/pass/);
 const deferred=await recordPreventionCheck({root,input:{...input,state:'deferred',reason:'check failure needs investigation',expectedVersion:candidate.version+1}});
 assert.equal((await recordPreventionCheck({root,input})).receipt.state,'deferred');
 assert.equal(deferred.receipt.verification.result,'FAIL');
 await writeFile(path.join(root,'docs/learnings/rule.md'),'---\nstatus: contradicted\n---\n# old rule');
 await assert.rejects(recordPreventionCheck({root,input:{...input,origin:'new'}}),/revalidation/);
});

test('new regression requires RED and only one candidate per closeout',async t=>{
 const {root,input}=await fixture(t);
 await writeFile(path.join(root,'red.json'),JSON.stringify({exitCode:1,command:'node --test check.mjs',timestamp:'2026-10-04T00:00:00Z'}));
 const add={...input,mode:'add',preventionGap:true,beforeRef:'red.json'};
 const first=await recordPreventionCheck({root,input:add});
 await assert.rejects(recordPreventionCheck({root,input:{...add,origin:'another'}}),/one new check/);
 await assert.rejects(recordPreventionCheck({root,input:{...add,state:'applied',expectedVersion:first.version}}),/validate/);
 const validated=await recordPreventionCheck({root,input:{...add,state:'validated',expectedVersion:first.version}});
 const applied=await recordPreventionCheck({root,input:{...add,state:'applied',expectedVersion:validated.version}});
 assert.equal(applied.receipt.disposition,'added');
});

test('two failed validation attempts are durable and effectiveness requires later evidence',async t=>{
 const {root,input}=await fixture(t);
 const first=await recordPreventionCheck({root,input});
 await writeFile(path.join(root,'failed.json'),'{"exitCode":1}');
 for(let i=0;i<2;i++)await assert.rejects(recordPreventionCheck({root,input:{...input,state:'validated',afterRef:'failed.json',expectedVersion:first.version+i}}),/pass/);
 const receipt=readPreventionStore(root).receipts[first.receipt.id];
 assert.equal(receipt.attempts,2);assert.equal(receipt.state,'deferred');
 assert.equal((await recordPreventionCheck({root,input:{...input,state:'validated'}})).action,'unchanged');
 await assert.rejects(recordCheckEffectiveness({root,input:{id:receipt.id,outcome:'prevented',evidence:['proof.json'],expectedVersion:3}}),/applied/);
 const next={...input,origin:'new-evidence',closeout:'close-2'};
 const candidate=await recordPreventionCheck({root,input:next});
 const validated=await recordPreventionCheck({root,input:{...next,state:'validated',expectedVersion:candidate.version}});
 const applied=await recordPreventionCheck({root,input:{...next,state:'applied',expectedVersion:validated.version}});
 await recordCheckEffectiveness({root,input:{id:applied.receipt.id,outcome:'prevented',evidence:['proof.json'],expectedVersion:applied.version}});
 assert.equal(preventionReport(root).checks.find(c=>c.origin==='new-evidence').effectiveness.outcome,'prevented');
});
