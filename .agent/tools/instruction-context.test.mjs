import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createWorkPackage, amendWorkPackageConstraints, readDispatchContext} from './work-package.mjs';
import {persistCheckpoint,restoreCheckpoint} from './memory-maintenance.mjs';
import {validateConstraints,relevantConstraints} from './instruction-context.mjs';

const first={id:'C1',instruction:'Keep the original acceptance test',source:'user:approved-plan',scope:['*'],supersedes:[]};
test('instructions survive checkpoint and are mandatory in fresh dispatch',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-constraints-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 execFileSync('git',['init'],{cwd:root,stdio:'ignore'});
 await writeFile(path.join(root,'brief.md'),'Implement GOAL-001');
 await writeFile(path.join(root,'scope.json'),'["src"]');
 const pkg=await createWorkPackage(root,{runId:'run',goalId:'GOAL-001',briefPath:'brief.md',pathsFile:'scope.json',constraints:[first]});
 assert.match(await readFile(pkg.briefPath,'utf8'),/Keep the original acceptance test/);
 const input={nextAction:'GOAL-001',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[],constraints:[first]};
 await persistCheckpoint({root,input});
 const restored=await restoreCheckpoint({root});
 assert.deepEqual(restored.checkpoint.constraints,[first]);
});

test('instruction correction supersedes the old rule on resumed dispatch',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-correction-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 execFileSync('git',['init'],{cwd:root,stdio:'ignore'});
 await writeFile(path.join(root,'brief.md'),'Implement GOAL-001');
 await writeFile(path.join(root,'scope.json'),'["src"]');
 const pkg=await createWorkPackage(root,{runId:'run',goalId:'GOAL-001',briefPath:'brief.md',pathsFile:'scope.json',constraints:[first]});
 const correction={...first,id:'C2',instruction:'Keep tests and add the negative case',source:'user:correction',supersedes:['C1']};
 await amendWorkPackageConstraints(root,{runId:'run',goalId:'GOAL-001',constraints:[first,correction],expectedVersion:pkg.ledgerVersion});
 const dispatch=await readDispatchContext(root,{runId:'run',goalId:'GOAL-001'});
 assert.match(dispatch.text,/Keep tests and add the negative case/);
 assert.doesNotMatch(dispatch.text,/Keep the original acceptance test/);
 assert.equal(dispatch.constraints.length,1);
});

test('scoped corrections cannot discard unrelated instructions or bypass mandatory cap',async t=>{
 const scoped={...first,id:'C2',instruction:'Correct only goal two',scope:['GOAL-002'],supersedes:['C1']};
 assert.deepEqual(relevantConstraints([first,scoped],'GOAL-001'),[first]);
 assert.deepEqual(relevantConstraints([first,scoped],'GOAL-002'),[scoped]);
 assert.throws(()=>validateConstraints([{...first,supersedes:['C2']},scoped]),/cycle/);
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-cap-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(path.join(root,'brief.md'),'A small brief.');
 const pkg=await createWorkPackage(root,{runId:'run',goalId:'GOAL-001',briefPath:'brief.md',constraints:[first],composition:{maxTokens:10}});
 assert.equal(pkg.dispatchStatus,'blocked');
 assert.equal(pkg.status,'over_budget');
});
