import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {readBoundedFile,writeFileAtomic,resolveRepositoryPath} from './file-state.mjs';
import {parseStandardsConfig,assertFreshStandards,resolveEffectiveStandards,standardsPath} from './standards.mjs';
import {verifyStandardsReceipt} from './standards-checks.mjs';

const digest=content=>createHash('sha256').update(content).digest('hex');
const readJson=async (root,ref)=>JSON.parse(await readBoundedFile(root,ref,{encoding:'utf8',maxBytes:4*1024*1024}));
const text=value=>typeof value==='string'&&value.trim().length>0;
const fileRef=ref=>ref.split('#')[0];
const methods=new Set(['functional','visual','api','deployment','infrastructure','workflow','artifact','regression','manual']);
function refs(value,label,{empty=false}={}) {
 if(!Array.isArray(value)||value.length>200||(!empty&&!value.length)||value.some(ref=>!text(ref))||new Set(value).size!==value.length)throw new Error(`${label} must be bounded unique references`);
 return value;
}
function validateContract(contract) {
 if(contract?.schema!=='completion_contract_v1'||!text(contract.taskId)||!text(contract.goal))throw new Error('completion_contract_v1 task and goal required');
 refs(contract.authorityRefs,'authorityRefs');refs(contract.sourceRefs,'sourceRefs',{empty:true});
 if(contract.standards!==undefined) {
  const binding=contract.standards;
  if(!binding||typeof binding!=='object'||Array.isArray(binding)||Object.keys(binding).some(key=>!['snapshotRef','digest','receiptRef'].includes(key))||!/^[a-f0-9]{64}$/.test(binding.digest??''))throw new Error('invalid completion standards binding');
  refs([binding.snapshotRef,binding.receiptRef],'standards binding');
 }
 if(!Array.isArray(contract.criteria)||!contract.criteria.length||contract.criteria.length>200)throw new Error('completion acceptance criteria required');
 const ids=new Set(),authorities=new Set(contract.authorityRefs.map(fileRef));
 for(const criterion of contract.criteria) {
  if(!text(criterion.id)||ids.has(criterion.id)||!text(criterion.expected)||!methods.has(criterion.method)||(text(criterion.recipeRef)===text(criterion.observationRef)))throw new Error('invalid or duplicate completion criterion/proof route');
  ids.add(criterion.id);refs(criterion.requirementRefs,'criterion requirementRefs');
  if(criterion.requirementRefs.some(ref=>!authorities.has(fileRef(ref))))throw new Error('criterion requirementRefs must point to authorityRefs');
 }
 return contract;
}
const contractRefs=contract=>[...new Set([...contract.authorityRefs.map(fileRef),...contract.sourceRefs,...(contract.standards?[contract.standards.snapshotRef,contract.standards.receiptRef]:[])])];
async function assertCompletionStandards(root,contract) {
 let configuration;
 try {configuration=parseStandardsConfig(await readBoundedFile(root,'.agent/rules/project-config.md',{encoding:'utf8',maxBytes:4*1024*1024}));}
 catch(error) {if(!error.message.startsWith('File does not exist:'))throw error;}
 if(configuration?.enabled&&!contract.standards)throw new Error('Active pinned standards require a bound standards binding');
 if(!contract.standards)return {status:'legacy',limitations:['No active pinned standards; organizational compliance is not established.']};
 const binding=contract.standards,standards=await readJson(root,binding.snapshotRef);
 if(binding.digest!==standards.effectiveStandardsDigest)throw new Error('Completion standards digest does not match the pinned snapshot identity');
 await assertFreshStandards(root,standards);
 const sources=contract.sourceRefs.map(standardsPath).filter(ref=>!/^\.(?:scratch|debug|agent)(?:\/|$)/.test(ref));
 const required=await resolveEffectiveStandards(root,sources.length?sources:['.agent/rules/project-config.md']);
 if(required.status!=='ready'||required.scopes.some(scope=>!standards.scopes.some(bound=>bound.path===scope.path)))throw new Error(sources.length?'Completion standards scope does not cover contract sources':'Completion requires full standards for all configured scopes');
 const receipt=await verifyStandardsReceipt(root,standards,await readJson(root,binding.receiptRef));
 if(!receipt.allowed)throw new Error(`Completion standards verification failed: ${receipt.issues.join('; ')}`);
 return {status:'ready',...binding,scopes:standards.scopes,limitations:standards.limitations,waivedRules:standards.checks.flatMap(check=>check.waivedRules.map(id=>({scope:check.scope,id})))};
}
function environmentFingerprint(recipe) {
 const names=recipe.envRefs??[];
 refs(names,'envRefs',{empty:true});
 if(names.some(name=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))throw new Error('envRefs must name relevant environment variables');
 return {platform:process.platform,nodeVersion:process.version,inputs:names.map(name=>({name,digest:digest(JSON.stringify({present:process.env[name]!==undefined,value:process.env[name]??null}))}))};
}
async function assertRecipePaths(root,recipe,contract) {
 const identity=async ref=>{
  const absolute=await resolveRepositoryPath(root,ref);
  return process.platform==='win32'?absolute.toLowerCase():absolute;
 };
 const inputRefs=[...recipe.sourceRefs,...(contract?[recipe.contractPath,recipe.recipeRef,...contractRefs(contract),...contract.criteria.flatMap(c=>[c.recipeRef,c.observationRef].filter(text))]:[])];
 const inputs=new Set(await Promise.all(inputRefs.map(identity))),outputs=new Set();
 for(const ref of [recipe.evidencePath,recipe.outcomesPath].filter(text)) {
  const absolute=await identity(ref),relative=path.relative(path.resolve(root),await resolveRepositoryPath(root,ref)).replaceAll('\\','/');
  if(inputs.has(absolute)||outputs.has(absolute))throw new Error('recipe input/output paths must not alias');
  if(/^\.scratch\/work-packages\/[^/]+\/ledger\.json(?:$|\.lock(?:\/|$))/.test(process.platform==='win32'?relative.toLowerCase():relative))throw new Error('recipe output must not overwrite work-package control state');
  outputs.add(absolute);
 }
}
async function snapshot(root,references) {
 const records=[];
 for(const ref of [...new Set(references)])records.push({ref,digest:digest(await readBoundedFile(root,ref,{maxBytes:4*1024*1024}))});
 return records;
}
async function assertSnapshot(root,records,required,label) {
 if(!Array.isArray(records)||records.length>400)throw new Error(`${label} fingerprints required`);
 const mapped=new Map();
 for(const record of records) {
  if(!text(record?.ref)||!/^[a-f0-9]{64}$/.test(record.digest)||mapped.has(record.ref))throw new Error(`invalid ${label} fingerprint`);
  mapped.set(record.ref,record.digest);
  if(digest(await readBoundedFile(root,record.ref,{maxBytes:4*1024*1024}))!==record.digest)throw new Error(`stale ${label}: ${record.ref}`);
 }
 for(const ref of required)if(!mapped.has(ref))throw new Error(`missing ${label} fingerprint: ${ref}`);
}

function validateAssertionCounts(counts) {
 if(counts!==undefined&&(!counts||typeof counts!=='object'||Array.isArray(counts)||!['total','passed','failed','skipped'].every(key=>Number.isSafeInteger(counts[key])&&counts[key]>=0)||counts.total!==counts.passed+counts.failed+counts.skipped))throw new Error('invalid outcome assertion counts');
}
function validateOutcomes(outcomes) {
 if(outcomes?.schema!=='verification_outcomes_v1'||typeof outcomes.taskId!=='string'||!Array.isArray(outcomes.criteria)||!outcomes.criteria.length)throw new Error('structured verification outcomes required');
 const ids=new Set();
 for(const result of outcomes.criteria) {
  if(typeof result.criterionId!=='string'||!result.criterionId.trim()||ids.has(result.criterionId)||typeof result.expected!=='string'||!result.expected.trim()||typeof result.observed!=='string'||!result.observed.trim()||!['pass','fail','skip'].includes(result.status)||!Array.isArray(result.evidenceRefs)||!result.evidenceRefs.length||result.evidenceRefs.some(ref=>typeof ref!=='string'||!ref.trim()))throw new Error('invalid criterion outcome');
  ids.add(result.criterionId);
  validateAssertionCounts(result.counts);
 }
 return outcomes;
}
const outcomePassed=result=>result.status==='pass'&&(!result.counts||(result.counts.total>0&&result.counts.failed===0&&result.counts.skipped===0));

function validateCommand(step) {
 if(!step||typeof step.command!=='string'||!step.command.trim()||!Array.isArray(step.args)||step.args.length>100||step.args.some(a=>typeof a!=='string'||a.includes('\0')))throw new Error('recipe commands require executable and argv; no shell strings');
}
function recipeTimeout(recipe,contract) {
 const maximum=contract?.standards?1800000:60000,timeoutMs=recipe.timeoutMs??(contract?.standards?300000:30000);
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>maximum)throw new Error(`recipe step timeout must be 1..${maximum}ms`);
 return timeoutMs;
}
function execute(root,phase,step,timeoutMs) {
 validateCommand(step);
 const result=spawnSync(step.command,step.args,{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:2*1024*1024,windowsHide:true});
 return {phase,command:step.command,args:step.args,exitCode:result.status,stdout:result.stdout||'',stderr:result.stderr||'',error:result.error?.message||null};
}

export async function runVerificationRecipe(root,recipe) {
 if(!recipe||typeof recipe.id!=='string'||!recipe.id.trim()||!['LOCAL','MOCK','REAL'].includes(recipe.environment))throw new Error('invalid verification recipe identity');
 for(const phase of ['doctor','drive','cleanup'])if(!Array.isArray(recipe[phase])||recipe[phase].length>20||(phase!=='cleanup'&&!recipe[phase].length))throw new Error(`recipe ${phase} commands required`);
 [...recipe.doctor,...recipe.drive,...recipe.cleanup,...(recipe.launch?[recipe.launch]:[])].forEach(validateCommand);
 await resolveRepositoryPath(root,recipe.evidencePath);
 let contract,contractDigest,recipeFileDigest;
 refs(recipe.sourceRefs,'sourceRefs',{empty:true});
 const runtimeFingerprint=environmentFingerprint(recipe);
 if(recipe.contractPath||recipe.recipeRef||recipe.outcomesPath) {
  if(![recipe.contractPath,recipe.recipeRef,recipe.outcomesPath].every(text))throw new Error('bound recipes require contractPath, recipeRef and outcomesPath');
  contract=validateContract(await readJson(root,recipe.contractPath));
  await assertCompletionStandards(root,contract);
  contractDigest=digest(await readBoundedFile(root,recipe.contractPath));
  const recipeBytes=await readBoundedFile(root,recipe.recipeRef);
  if(JSON.stringify(JSON.parse(recipeBytes.toString('utf8')))!==JSON.stringify(recipe))throw new Error('recipe must match its saved recipeRef');
  recipeFileDigest=digest(recipeBytes);
 }
 const timeoutMs=recipeTimeout(recipe,contract);
 await assertRecipePaths(root,recipe,contract);
 const sources=[];
 if(!Array.isArray(recipe.sourceRefs)||recipe.sourceRefs.length>100)throw new Error('bounded sourceRefs required');
 sources.push(...await snapshot(root,[...recipe.sourceRefs,...(contract?contractRefs(contract):[])]));
 if(contract)await rm(await resolveRepositoryPath(root,recipe.outcomesPath),{force:true});
 const evidence={schema:'verification_recipe_v1',id:recipe.id,environment:recipe.environment,timestamp:new Date().toISOString(),recipeDigest:createHash('sha256').update(JSON.stringify(recipe)).digest('hex'),sources,steps:[],pass:false};
 if(contract)Object.assign(evidence,{taskId:contract.taskId,contractPath:recipe.contractPath,contractDigest,recipeRef:recipe.recipeRef,recipeFileDigest,outcomesPath:recipe.outcomesPath,environmentFingerprint:runtimeFingerprint});
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
  if(recipe.outcomesPath) {
   try {
    evidence.outcomes=validateOutcomes(await readJson(root,recipe.outcomesPath));
    evidence.outcomesDigest=digest(await readBoundedFile(root,recipe.outcomesPath));
    evidence.artifacts=await snapshot(root,evidence.outcomes.criteria.flatMap(result=>result.evidenceRefs));
    if(evidence.outcomes.taskId!==contract.taskId)throw new Error('outcomes belong to another task');
    const required=contract.criteria.filter(c=>c.recipeRef===recipe.recipeRef);
    if(!required.length||required.some(c=>!evidence.outcomes.criteria.some(result=>result.criterionId===c.id&&result.expected===c.expected)))throw new Error('outcomes missing required criterion');
    evidence.pass&&=evidence.outcomes.criteria.every(outcomePassed);
   } catch(error) {evidence.outcomesError=error.message;evidence.pass=false;}
  }
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
   if(contract) {
    try {
     await assertSnapshot(root,evidence.sources,contractRefs(contract),'source');
     await assertSnapshot(root,evidence.artifacts??[],evidence.outcomes?.criteria.flatMap(result=>result.evidenceRefs)??[],'artifact');
     if(digest(await readBoundedFile(root,recipe.outcomesPath))!==evidence.outcomesDigest||digest(await readBoundedFile(root,recipe.contractPath))!==contractDigest||digest(await readBoundedFile(root,recipe.recipeRef))!==recipeFileDigest||JSON.stringify(environmentFingerprint(recipe))!==JSON.stringify(runtimeFingerprint))throw new Error('verification inputs or outcomes changed during execution/cleanup');
     if(contract.standards)await assertCompletionStandards(root,contract);
    } catch(error) {evidence.integrityError=error.message;evidence.pass=false;}
   }
   await writeFileAtomic(root,recipe.evidencePath,`${JSON.stringify(evidence,null,2)}\n`,{maxBytes:4*1024*1024,fallbackOnBusy:false});
  }
 }
 return {pass:evidence.pass&&evidence.cleanup.pass,evidencePath:recipe.evidencePath};
}

function assertExecution(evidence,recipe) {
 const expected=['doctor','drive'].flatMap(phase=>recipe[phase].map(step=>({phase,...step})));
 const clean=recipe.cleanup.map(step=>({phase:'cleanup',...step}));
 const matches=(actual,wanted)=>Array.isArray(actual)&&actual.length===wanted.length&&actual.every((step,index)=>step.phase===wanted[index].phase&&step.command===wanted[index].command&&JSON.stringify(step.args)===JSON.stringify(wanted[index].args)&&step.exitCode===0&&!step.error&&typeof step.stdout==='string'&&typeof step.stderr==='string');
 if(!matches(evidence.steps,expected)||!matches(evidence.cleanup?.steps,clean)||evidence.cleanup?.pass!==true)throw new Error('incomplete or failed execution/cleanup');
 if(recipe.launch&&(!evidence.launch||evidence.launch.error||evidence.launch.command!==recipe.launch.command||JSON.stringify(evidence.launch.args)!==JSON.stringify(recipe.launch.args)||!Number.isSafeInteger(evidence.launch.pid)))throw new Error('invalid launch evidence');
}
function assertTimestamp(value) {
 const timestamp=Date.parse(value);
 if(!Number.isFinite(timestamp)||timestamp>Date.now()+1000)throw new Error('valid evidence timestamp required');
}
function assertInspection(observation,criterion) {
 if(observation?.inspected!==true||!text(observation.observer)||!Array.isArray(observation.steps)||!observation.steps.length||observation.steps.length>100||observation.steps.some(step=>!text(step)))throw new Error('repeatable actual visual/manual inspection required');
 assertTimestamp(observation.timestamp,criterion);
}
async function assertRegression(root,outcome,evidence,contract,criterion) {
 const regression=outcome.regression;
 if(!text(regression?.beforeRef)||!text(regression.afterRef)||regression.beforeRef===regression.afterRef)throw new Error('regression before/after assertion evidence required');
 for(const [ref,status] of [[regression.beforeRef,'fail'],[regression.afterRef,'pass']]) {
  await assertSnapshot(root,evidence.artifacts,[ref],'regression artifact');
  const assertion=await readJson(root,ref);
  if(assertion.taskId!==contract.taskId||assertion.criterionId!==criterion.id||assertion.expected!==criterion.expected||!text(assertion.observed)||assertion.status!==status)throw new Error(`regression ${status==='fail'?'before':'after'} assertion does not prove the same criterion`);
 }
}

export async function verifyCompletionEvidence(root,{contractPath,contractDigest,evidenceRefs}={}) {
 const verdict={allowed:false,status:'Needs Validation',criteria:[],issues:[]};
 let contract,currentDigest;
 try {
  const content=await readBoundedFile(root,contractPath);
  currentDigest=digest(content);
  if(!/^[a-f0-9]{64}$/.test(contractDigest)||currentDigest!==contractDigest)throw new Error('completion contract pin is missing or stale');
  contract=validateContract(JSON.parse(content.toString('utf8')));
  verdict.standards=await assertCompletionStandards(root,contract);
  // Opening each authority/source is required even before any proof is considered.
  for(const ref of contractRefs(contract))await readBoundedFile(root,ref,{maxBytes:4*1024*1024});
 } catch(error) {verdict.issues.push(error.message);return verdict;}
 if(evidenceRefs!==undefined&&(!Array.isArray(evidenceRefs)||evidenceRefs.length>400)) {verdict.issues.push('bounded evidenceRefs required');return verdict;}
 for(const criterion of contract.criteria) {
  const result={id:criterion.id,method:criterion.method,expected:criterion.expected,observed:null,status:'missing',evidenceRefs:[],issues:[]};
  verdict.criteria.push(result);
  try {
   let proofPath,recipe;
   if(criterion.recipeRef) {
    recipe=await readJson(root,criterion.recipeRef);
    if(recipe.contractPath!==contractPath||recipe.recipeRef!==criterion.recipeRef)throw new Error('recipe does not bind the current contract');
    for(const phase of ['doctor','drive','cleanup']) {
     if(!Array.isArray(recipe[phase])||(phase!=='cleanup'&&!recipe[phase].length)||recipe[phase].length>20)throw new Error('invalid saved recipe phase');
     recipe[phase].forEach(validateCommand);
    }
    if(recipe.launch)validateCommand(recipe.launch);
    recipeTimeout(recipe,contract);
    refs(recipe.sourceRefs,'recipe sourceRefs',{empty:true});
    await assertRecipePaths(root,recipe,contract);
    proofPath=recipe.evidencePath;
   } else proofPath=criterion.observationRef;
   const supplied=evidenceRefs?.find(ref=>(typeof ref==='string'?ref:ref?.path)===proofPath);
   if(evidenceRefs&&!supplied)throw new Error(`missing evidence for ${criterion.id}`);
   const content=await readBoundedFile(root,proofPath,{maxBytes:4*1024*1024});
   if(typeof supplied==='object'&&supplied.digest!==digest(content))throw new Error('evidence artifact digest mismatch');
   const evidence=JSON.parse(content.toString('utf8'));
   if(evidence.taskId!==contract.taskId||evidence.contractDigest!==currentDigest)throw new Error('evidence scope or contract fingerprint mismatch');
   assertTimestamp(evidence.timestamp,criterion);
   await assertSnapshot(root,evidence.sources,contractRefs(contract),'source');
   let outcome,recipeFailure;
   if(recipe) {
    if(evidence.schema!=='verification_recipe_v1'||evidence.contractPath!==contractPath||evidence.recipeRef!==criterion.recipeRef||evidence.environment!==recipe.environment||evidence.id!==recipe.id||evidence.integrityError||evidence.outcomesError)throw new Error('invalid bound recipe evidence');
    if(evidence.recipeFileDigest!==digest(await readBoundedFile(root,criterion.recipeRef))||evidence.recipeDigest!==digest(JSON.stringify(recipe))||JSON.stringify(evidence.environmentFingerprint)!==JSON.stringify(environmentFingerprint(recipe)))throw new Error('stale recipe command/environment fingerprint');
    await assertSnapshot(root,evidence.sources,recipe.sourceRefs,'recipe source');
    assertExecution(evidence,recipe);
    if(evidence.outcomesPath!==recipe.outcomesPath||evidence.outcomesDigest!==digest(await readBoundedFile(root,recipe.outcomesPath)))throw new Error('stale outcomes artifact');
    const outcomes=validateOutcomes(await readJson(root,recipe.outcomesPath));
    if(outcomes.taskId!==contract.taskId||JSON.stringify(outcomes)!==JSON.stringify(evidence.outcomes))throw new Error('outcome scope/snapshot mismatch');
    outcome=outcomes.criteria.find(candidate=>candidate.criterionId===criterion.id);
    if(!outcome)throw new Error('required acceptance outcome missing');
    const rejected=outcomes.criteria.filter(assertion=>!outcomePassed(assertion));
    if(rejected.length) {
     recipeFailure=rejected.some(assertion=>assertion.status==='fail'||assertion.counts?.failed>0||(assertion.status!=='skip'&&!assertion.counts?.skipped))?'fail':'skip';
     result.issues.push(`required recipe assertions ${recipeFailure}: ${rejected.map(assertion=>assertion.criterionId).join(', ')}`);
    }
    if(evidence.pass!==true&&!recipeFailure)throw new Error('recipe reports failed verification');
    await assertSnapshot(root,evidence.artifacts,outcome.evidenceRefs,'artifact');
    result.evidenceRefs=[proofPath,...outcome.evidenceRefs];
   } else {
    if(evidence.schema!=='completion_observation_v1'||evidence.criterionId!==criterion.id||!Array.isArray(evidence.artifacts)||!evidence.artifacts.length)throw new Error('repeatable inspected observation and artifacts required');
    assertInspection(evidence,criterion);
    await assertSnapshot(root,evidence.artifacts,evidence.artifacts.map(artifact=>artifact.ref),'artifact');
    outcome=evidence;result.evidenceRefs=[proofPath,...evidence.artifacts.map(artifact=>artifact.ref)];
   }
   validateAssertionCounts(outcome.counts);
   if(outcome.expected!==criterion.expected||!text(outcome.observed)||!['pass','fail','skip'].includes(outcome.status))throw new Error('outcome does not match required acceptance criterion');
   if(recipe&&['visual','manual'].includes(criterion.method))assertInspection(outcome.inspection,criterion);
   if(criterion.method==='regression')await assertRegression(root,outcome,evidence,contract,criterion);
   result.observed=outcome.observed;
   result.status=recipeFailure??(outcomePassed(outcome)?'pass':outcome.status==='skip'?'skip':'fail');
   if(result.status!=='pass')result.issues.push(`acceptance outcome ${result.status}`);
  } catch(error) {result.status=/missing evidence|required acceptance outcome missing/.test(error.message)?'missing':'invalid';result.issues.push(error.message);}
  verdict.issues.push(...result.issues.map(issue=>`${criterion.id}: ${issue}`));
 }
 const passed=verdict.criteria.filter(criterion=>criterion.status==='pass').length;
 verdict.allowed=passed===contract.criteria.length;
 verdict.status=verdict.allowed?'Done':verdict.criteria.some(criterion=>criterion.status==='fail')?'Verification Failed':passed?'Partially Verified':'Needs Validation';
 return verdict;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const recipe=JSON.parse(await readBoundedFile(process.cwd(),process.argv[2],{encoding:'utf8'}));
 const result=await runVerificationRecipe(process.cwd(),recipe);
 process.stdout.write(`${JSON.stringify(result)}\n`);if(!result.pass)process.exitCode=1;
}
