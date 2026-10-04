import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readBoundedFile,writeFileAtomic,resolveRepositoryPath} from './file-state.mjs';

function validateCommand(step) {
 if(!step||typeof step.command!=='string'||!step.command.trim()||!Array.isArray(step.args)||step.args.length>100||step.args.some(a=>typeof a!=='string'||a.includes('\0')))throw new Error('recipe commands require executable and argv; no shell strings');
}
function execute(root,phase,step,timeoutMs) {
 validateCommand(step);
 const result=spawnSync(step.command,step.args,{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:2*1024*1024,windowsHide:true});
 return {phase,command:step.command,args:step.args,exitCode:result.status,stdout:result.stdout||'',stderr:result.stderr||'',error:result.error?.message||null};
}

export async function runVerificationRecipe(root,recipe) {
 if(!recipe||typeof recipe.id!=='string'||!recipe.id.trim()||!['LOCAL','MOCK','REAL'].includes(recipe.environment))throw new Error('invalid verification recipe identity');
 const timeoutMs=recipe.timeoutMs??30000;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw new Error('recipe step timeout must be 1..60000ms');
 for(const phase of ['doctor','drive','cleanup'])if(!Array.isArray(recipe[phase])||recipe[phase].length>20||(phase!=='cleanup'&&!recipe[phase].length))throw new Error(`recipe ${phase} commands required`);
 [...recipe.doctor,...recipe.drive,...recipe.cleanup,...(recipe.launch?[recipe.launch]:[])].forEach(validateCommand);
 await resolveRepositoryPath(root,recipe.evidencePath);
 const sources=[];
 if(!Array.isArray(recipe.sourceRefs)||recipe.sourceRefs.length>100)throw new Error('bounded sourceRefs required');
 for(const ref of recipe.sourceRefs)sources.push({ref,digest:createHash('sha256').update(await readBoundedFile(root,ref)).digest('hex')});
 const evidence={schema:'verification_recipe_v1',id:recipe.id,environment:recipe.environment,timestamp:new Date().toISOString(),recipeDigest:createHash('sha256').update(JSON.stringify(recipe)).digest('hex'),sources,steps:[],pass:false};
 let child,launchError;
 if(recipe.launch) {
  child=spawn(recipe.launch.command,recipe.launch.args,{cwd:root,windowsHide:true,stdio:'ignore'});
  child.on('error',error=>{launchError=error.message;});
  // Give asynchronous spawn errors a boundary before the doctor checks readiness.
  await new Promise(resolve=>setImmediate(resolve));
  evidence.launch={command:recipe.launch.command,args:recipe.launch.args,pid:child.pid??null};
 }
 let persisted=false;
 try {
  if(launchError)evidence.launch.error=launchError;
  for(const phase of launchError?[]:['doctor','drive']) {
   for(const step of recipe[phase]) {
    const result=execute(root,phase,step,timeoutMs);evidence.steps.push(result);
    if(result.exitCode!==0||result.error)break;
   }
   if(evidence.steps.some(s=>s.exitCode!==0||s.error))break;
  }
  evidence.pass=!launchError&&evidence.steps.length===recipe.doctor.length+recipe.drive.length&&evidence.steps.every(s=>s.exitCode===0&&!s.error);
  await writeFileAtomic(root,recipe.evidencePath,`${JSON.stringify(evidence,null,2)}\n`,{maxBytes:4*1024*1024,fallbackOnBusy:false});
  persisted=true;
 } finally {
  const cleanup=recipe.cleanup.map(step=>execute(root,'cleanup',step,timeoutMs));
  if(child?.pid&&child.exitCode===null) {
   if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
   else child.kill('SIGTERM');
  }
  if(persisted) {
   // Fail if cleanup erased saved evidence; never silently recreate a lost proof.
   await readBoundedFile(root,recipe.evidencePath,{maxBytes:4*1024*1024});
   evidence.cleanup={steps:cleanup,pass:cleanup.every(s=>s.exitCode===0&&!s.error)};
   await writeFileAtomic(root,recipe.evidencePath,`${JSON.stringify(evidence,null,2)}\n`,{maxBytes:4*1024*1024,fallbackOnBusy:false});
  }
 }
 return {pass:evidence.pass&&evidence.cleanup.pass,evidencePath:recipe.evidencePath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const recipe=JSON.parse(await readBoundedFile(process.cwd(),process.argv[2],{encoding:'utf8'}));
 const result=await runVerificationRecipe(process.cwd(),recipe);
 process.stdout.write(`${JSON.stringify(result)}\n`);if(!result.pass)process.exitCode=1;
}
