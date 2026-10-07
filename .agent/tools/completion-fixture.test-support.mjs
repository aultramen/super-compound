import {createHash} from 'node:crypto';
import {readBoundedFile,writeFileAtomic} from './file-state.mjs';
import {runVerificationRecipe} from './verification-recipe.mjs';

export const completionDigest = content => createHash('sha256').update(content).digest('hex');

// Fixtures execute a real argv command and retain its assertion output.
export async function provisionCompletionFixture(root,options={}) {
 const taskId=options.taskId??'GOAL-1',directory=options.directory??`.scratch/completion/${taskId}`;
 const contractPath=options.contractPath??`${directory}/contract.json`,recipePath=options.recipePath??`${directory}/recipe.json`;
 const evidencePath=options.evidencePath??`${directory}/evidence.json`,outcomesPath=`${directory}/outcomes.json`,artifactPath=`${directory}/result.json`;
 const authorityPath=options.authorityPath??`${directory}/request.md`,sourcePath=options.sourcePath??`${directory}/source.txt`,healthPath=`${directory}/health.json`;
 if(!options.authorityPath)await writeFileAtomic(root,authorityPath,'Requirement REQ-1: service is healthy. Acceptance AC-1: health response is healthy.\n');
 if(!options.sourcePath)await writeFileAtomic(root,sourcePath,'health implementation\n');
 await writeFileAtomic(root,healthPath,JSON.stringify({healthy:options.status!=='fail'}));
 const criteria=options.criteria??[{id:'AC-1',requirementRefs:[`${authorityPath}#AC-1`],expected:'healthy',method:'functional',recipeRef:recipePath}];
 const contract={schema:'completion_contract_v1',taskId,goal:'service is healthy',authorityRefs:[authorityPath],sourceRefs:[sourcePath,healthPath],criteria};
 const outcomes={schema:'verification_outcomes_v1',taskId,criteria:criteria.map(c=>({criterionId:c.id,expected:c.expected,observed:options.status==='fail'?'unhealthy':c.expected,status:options.status??'pass',evidenceRefs:[artifactPath,...(options.artifactRefs??[])],...(options.counts?{counts:options.counts}:{}),...(options.outcomeExtras??{})}))};
 const command=code=>({command:process.execPath,args:['-e',code]});
 const drive=`const fs=require('fs'),assert=require('assert/strict');const actual=JSON.parse(fs.readFileSync(${JSON.stringify(healthPath)},'utf8'));let failed=false;try{assert.equal(actual.healthy,true)}catch(error){failed=true;console.log(error.message)}const outcomes=${JSON.stringify(outcomes)};for(const result of outcomes.criteria){if(failed){result.status='fail';result.observed='unhealthy'}}fs.writeFileSync(${JSON.stringify(artifactPath)},JSON.stringify(actual));fs.writeFileSync(${JSON.stringify(outcomesPath)},JSON.stringify(outcomes));console.log('actual health assertion',failed?'FAIL':'PASS');`;
 const recipe={id:`check-${taskId}`,environment:'LOCAL',sourceRefs:[sourcePath,healthPath],...(options.envRefs?{envRefs:options.envRefs}:{}),contractPath,recipeRef:recipePath,outcomesPath,evidencePath,doctor:[command('console.log("ready")')],drive:[command(`${options.driveSetup??''}${drive}`)],cleanup:options.cleanup??[]};
 await writeFileAtomic(root,contractPath,`${JSON.stringify(contract,null,2)}\n`);
 await writeFileAtomic(root,recipePath,`${JSON.stringify(recipe,null,2)}\n`);
 const result=await runVerificationRecipe(root,recipe);
 const contractDigest=completionDigest(await readBoundedFile(root,contractPath));
 const evidenceRef={path:evidencePath,digest:completionDigest(await readBoundedFile(root,evidencePath,{maxBytes:4*1024*1024}))};
 return {contractPath,contractDigest,evidencePath,evidenceRef,recipePath,outcomesPath,artifactPath,authorityPath,sourcePath,contract,recipe,result};
}
