import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {flushPendingMaintenance} from './memory-maintenance.mjs';
test('resume flushes at most three pending captures and retry performs only remaining maintenance',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-flush-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'.scratch/pending-captures'),{recursive:true});
 await writeFile(path.join(root,'proof.md'),'verified result');
 for(let i=1;i<=4;i++) {
  const input={kind:'LRN',origin:`fixture:origin-${i}`,revision:'1',topic:`rule ${i}`,confidence:'confirmed',outcome:'verified',evidence:['proof.md'],fields:{Learning:`learning ${i}`,'Applies to':'project','Action rule':`IF ${i} THEN check`}};
  await writeFile(path.join(root,`.scratch/pending-captures/${i}.json`),JSON.stringify({input}));
 }
 const first=await flushPendingMaintenance({root});
 assert.equal(first.processed,3);assert.equal(first.remaining,1);
 const second=await flushPendingMaintenance({root});
 assert.equal(second.processed,1);assert.equal(second.remaining,0);
 assert.equal((await readdir(path.join(root,'.scratch/pending-captures'))).length,0);
});
