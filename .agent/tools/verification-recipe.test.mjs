import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runVerificationRecipe} from './verification-recipe.mjs';
test('launch doctor drive evidence cleanup retains verification after temporary output removal',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-recipe-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const command=args=>({command:process.execPath,args});
 const recipe={id:'cli-smoke',evidencePath:'evidence/result.json',environment:'LOCAL',sourceRefs:[],doctor:[command(['-e','console.log("ready")'])],drive:[command(['-e','require("fs").writeFileSync("temporary.txt","result");console.log("drive PASS")'])],cleanup:[command(['-e','require("fs").rmSync("temporary.txt")'])]};
 const result=await runVerificationRecipe(root,recipe);
 assert.equal(result.pass,true);
 const evidence=JSON.parse(await readFile(path.join(root,'evidence/result.json'),'utf8'));
 assert.deepEqual(evidence.steps.map(s=>s.phase),['doctor','drive']);
 assert.match(evidence.steps[1].stdout,/drive PASS/);
 assert.equal(evidence.cleanup.pass,true);
 await assert.rejects(readFile(path.join(root,'temporary.txt')),/ENOENT/);
});
test('launch failure remains recorded after cleanup',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'sc-recipe-failed-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const step={command:process.execPath,args:['-e','console.log("ok")']};
 const result=await runVerificationRecipe(root,{id:'failed-launch',evidencePath:'evidence/failure.json',environment:'LOCAL',sourceRefs:[],launch:{command:'sc-nonexistent-launch-executable',args:[]},doctor:[step],drive:[step],cleanup:[step]});
 assert.equal(result.pass,false);
 const evidence=JSON.parse(await readFile(path.join(root,'evidence/failure.json'),'utf8'));
 assert.match(evidence.launch.error,/ENOENT/);
 assert.equal(evidence.cleanup.pass,true);
});
