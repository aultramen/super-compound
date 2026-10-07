import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {seedFiles} from './session-baseline.mjs';
import {activeCopyFilter,selectActiveAssets} from './active-assets.mjs';
import {comparePairedTrials} from './adaptive-eval.mjs';
import {persistCheckpoint,validateLearningCloseouts,parseEntries} from './memory-maintenance.mjs';
import {parseFrontmatter} from './knowledge-search.mjs';
import {readBoundedFile} from './file-state.mjs';
import {seedContextFixtures} from './context-fixtures.mjs';
import {runVerificationRecipe,verifyCompletionEvidence} from './verification-recipe.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validNumber=n=>Number.isSafeInteger(n)&&n>=0;
const testEnv={...process.env};delete testEnv.NODE_TEST_CONTEXT;
export function analyzeCodexJsonl(raw) {
 const events=[],parseErrors=[];
 for(const line of raw.split(/\r?\n/).filter(Boolean))try{events.push(JSON.parse(line));}catch{parseErrors.push('invalid JSONL');}
 const completed=events.filter(e=>e.type==='turn.completed');
 const failures=events.filter(e=>['error','turn.failed'].includes(e.type));
 const commands=events.filter(e=>e.type==='item.completed'&&e.item?.type==='command_execution').map(e=>e.item);
 const sum=key=>completed.length&&completed.every(e=>validNumber(e.usage?.[key]))?completed.reduce((s,e)=>s+e.usage[key],0):'unknown';
 const inputTokens=sum('input_tokens'),outputTokens=sum('output_tokens'),cachedInputTokens=sum('cached_input_tokens'),cacheWriteInputTokens=sum('cache_write_input_tokens');
 const reasoning=sum('reasoning_output_tokens');
 const reasoningOutputTokens=typeof reasoning==='number'&&typeof outputTokens==='number'&&reasoning<=outputTokens?reasoning:'unknown';
 const totalTokens=typeof inputTokens==='number'&&typeof outputTokens==='number'?inputTokens+outputTokens:'unknown';
 return {inputTokens,outputTokens,cachedInputTokens,cacheWriteInputTokens,reasoningOutputTokens,totalTokens,uncachedInputTokens:typeof inputTokens==='number'&&typeof cachedInputTokens==='number'&&cachedInputTokens<=inputTokens?inputTokens-cachedInputTokens:'unknown',commandCount:commands.length,repeatedCommands:commands.length-new Set(commands.map(c=>c.command)).size,errorCount:failures.length+parseErrors.length+commands.filter(c=>typeof c.exit_code==='number'&&c.exit_code!==0).length,complete:completed.length>0&&!failures.length&&!parseErrors.length,commands:commands.map(c=>({command:c.command,exitCode:c.exit_code??'unknown'})),events};
}

export const PILOT_PROTOCOL='rtk-explicit-v3';
const WRITE_PROOF_REF='.scratch/pilot-write-proof.json';
const RTK_RULE='Prefix every shell command with rtk. Read files with rtk powershell -NoProfile -Command "Get-Content -LiteralPath <file>". Run Node using rtk node, including verification and memory tools; use rtk git for Git. These approved command forms preserve normal policy; do not ignore rules or bypass approval.';
export const PILOT_PROMPT=`${RTK_RULE} Read PILOT-ADAPTER.md. Cold resume from .continue-here.md, continue the pending goal, use relevant durable knowledge, verify the change, capture the verified outcome and save the next action. Respect active constraints and preserve previously verified work. Work only in this fixture; do not commit, use global skills, inspect other sessions, or read the external evaluator. Stop within five minutes; report any failure honestly.`;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const excludedPilotFile=/^\.agent\/tools\/(?:codex-pilot|paired-eval)(?:\.|$)/;
function write(dir,ref,content) {const target=path.join(dir,ref);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
function files(dir,current='') {
 return fs.readdirSync(path.join(dir,current),{withFileTypes:true}).flatMap(e=>{
  const ref=path.posix.join(current,e.name);
  if(e.isSymbolicLink())throw new Error('pilot rejects symlinks');
  if(['.git','node_modules','__pycache__','.compact-state'].includes(e.name))return [];
  return e.isDirectory()?files(dir,ref):[ref];
 }).sort();
}
function surfaceDigest(dir) {
 const surface=files(path.join(dir,'.agent')).map(ref=>`.agent/${ref}`);
 return hash(JSON.stringify(selectActiveAssets(surface).filter(ref=>!excludedPilotFile.test(ref)).map(ref=>[ref,hash(fs.readFileSync(path.join(dir,ref)))])));
}

function preparePilotCompletion(dir,taskId,{sourceRef,testRefs,authorityRef,regression=false,verifiedHelper=false}) {
 const prefix=`.scratch/completion/${taskId}`,contractPath=`${prefix}/contract.json`,recipeRef=`${prefix}/recipe.json`;
 const outcomesPath=`${prefix}/outcomes.json`,evidencePath=`${prefix}/evidence.json`,beforeRef=`${prefix}/before.json`,afterRef=`${prefix}/after.json`,logRef=`${prefix}/test.log`;
 const expected=verifiedHelper?'protected helper returns already verified':taskId==='GOAL-002'?'multiply(2,3)=6; multiply(-2,3)=-6; multiply(0,3)=0':'sum(2,3)=5; sum(-2,3)=1';
 const criterionId=`${taskId}-AC`,sourceRefs=[sourceRef,...testRefs];
 const contract={schema:'completion_contract_v1',taskId,goal:expected,authorityRefs:[authorityRef],sourceRefs,criteria:[{id:criterionId,requirementRefs:[`${authorityRef}#${taskId}`],expected,method:regression?'regression':'functional',recipeRef}]};
 // The fixed node:test harness supplies real assertions and TAP counts, not a
 // guessed pass flag. Missing/skipped/failed checks are never successful proof.
 const arithmeticCases=verifiedHelper?[]:taskId==='GOAL-002'?[[2,3,6],[-2,3,-6],[0,3,0]]:[[2,3,5],[-2,3,1]];
 const arithmeticMethod=taskId==='GOAL-002'?'multiply':'sum';
 const arithmeticAssertions=`const domain=[];for(const [a,b,expected] of ${JSON.stringify(arithmeticCases)}){let observed,status='fail';try{const s=require('./'+${JSON.stringify(sourceRef)});observed=(typeof s==='function'?s:s[${JSON.stringify(arithmeticMethod)}])(a,b);require('assert/strict').equal(observed,expected);status='pass'}catch(error){if(observed===undefined)observed=error.message}domain.push({inputs:[a,b],expected,observed,status});counts.total++;counts[status==='pass'?'passed':'failed']++}const domainOutput=' actual arithmetic assertions '+JSON.stringify(domain);fs.appendFileSync(${JSON.stringify(logRef)},domainOutput);process.stdout.write(domainOutput);`;
 const drive=artifact=>`const fs=require('fs'),{spawnSync}=require('child_process');const env={...process.env};delete env.NODE_TEST_CONTEXT;const args=${JSON.stringify(verifiedHelper?['-e',"require('assert/strict').equal(require('./src/verified.js')(),'already verified'); console.log('protected helper assertion PASS')"]:['--test','--test-reporter=tap',...testRefs])};const run=spawnSync(process.execPath,args,{encoding:'utf8',env});const raw=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(${JSON.stringify(logRef)},raw);process.stdout.write(raw);const count=name=>Number(raw.match(new RegExp('^# '+name+' (\\\\d+)','m'))?.[1]);const counts=${verifiedHelper?'{total:1,passed:run.status===0?1:0,failed:run.status===0?0:1,skipped:0}':"{total:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped')}"};${arithmeticAssertions}const pass=run.status===0&&counts.total>0&&counts.failed===0&&counts.skipped===0;const assertion={taskId:${JSON.stringify(taskId)},criterionId:${JSON.stringify(criterionId)},expected:${JSON.stringify(expected)},observed:'actual node assertion: '+raw.trim()+'; '+JSON.stringify(domain),status:pass?'pass':'fail'};fs.writeFileSync(${JSON.stringify(artifact)},JSON.stringify(assertion));fs.writeFileSync(${JSON.stringify(outcomesPath)},JSON.stringify({schema:'verification_outcomes_v1',taskId:assertion.taskId,criteria:[{...assertion,counts,evidenceRefs:${JSON.stringify([afterRef,logRef,...(regression?[beforeRef]:[])])},${regression?`regression:${JSON.stringify({beforeRef,afterRef})}`:''}}]}));process.exitCode=pass?0:1;`;
 const recipe={id:`pilot-${taskId}`,environment:'LOCAL',sourceRefs,contractPath,recipeRef,outcomesPath,evidencePath,doctor:[{command:process.execPath,args:['-e','console.log("local node harness")']}],drive:[{command:process.execPath,args:['-e',drive(afterRef)]}],cleanup:[]};
 write(dir,contractPath,JSON.stringify(contract)+'\n');write(dir,recipeRef,JSON.stringify(recipe)+'\n');
 if(regression) {
  const before=spawnSync(process.execPath,['-e',drive(beforeRef)],{cwd:dir,encoding:'utf8',env:testEnv});
  if(before.status!==1||JSON.parse(fs.readFileSync(path.join(dir,beforeRef),'utf8')).status!=='fail')throw new Error('pilot regression requires actual failing baseline');
 }
 return {contractPath,contractDigest:hash(fs.readFileSync(path.join(dir,contractPath))),recipePath:recipeRef,evidencePath};
}

export async function seedPilot(dir,source,fixtureName='legacy') {
 if(!['legacy','debugging','multi-goal-resume'].includes(fixtureName))throw new Error('unsupported pilot fixture');
 if(fs.existsSync(dir))throw new Error('pilot fixture must be fresh');
 fs.mkdirSync(dir,{recursive:true});
 for(const name of ['.agent'])fs.cpSync(path.join(source,name),path.join(dir,name),{recursive:true,filter:src=>activeCopyFilter(source)(src)&&!excludedPilotFile.test(path.relative(source,src).replaceAll('\\','/'))});
 const fixture=seedFiles('2026-10-04');
 fixture['AGENTS.md']='# Pilot project\nUse local .agent/context contracts before details. No global skills or external workspace reads. Preserve test/sum.test.js and src/verified.js byte for byte. Do not repeat verified GOAL-000. No commit. Node and npm are the project harness. Active user goal is to finish GOAL-001.\n';
 fixture['PILOT-ADAPTER.md']='Local adapter: read .agent/context/workflows/sc-status.contract.md to recover, then .agent/context/workflows/sc-work.contract.md for the pending issue. Use only this project framework variant.\n';
 fixture['src/verified.js']='module.exports = () => "already verified";\n';
 fixture['docs/fsd/fsd-dummy.md']='# Dummy FSD\nID: FSD-DUMMY\nArtifact contract version: `2.0.0`\nStatus: APPROVED\nUI: NOT_APPLICABLE (CLI helper)\n\n## GOAL-000\nStatus: verified\nScope: src/verified.js\nEvidence: .scratch/completion/GOAL-000/evidence.json\n\n## GOAL-001\nStatus: ready-for-agent\nScope: src/sum.js\nAcceptance: sum returns a+b for numeric arguments. Keep existing CommonJS style and original acceptance test.\n\n## TEST-001\nRun npm test and save actual output.\n\n## TDEC-001\nUse the existing arithmetic helper and harness.\n';
 fixture['docs/STATE.md']='# Project State\nLast updated: 2026-10-04 09:00\n\n## Current Position\n- Active task: GOAL-001\n- Next action: /sc-work .scratch/dummy/issues/01-sum-returns-sum.md\n\n## Completed Work\n- GOAL-000 verified: .scratch/completion/GOAL-000/evidence.json; src/verified.js must be retained.\n';
 const buildDigest=surfaceDigest(source);
 let testRef='test/sum.test.js',sourceRef='src/sum.js',initialExit=1,preservedExpression=null;
 if(fixtureName!=='legacy') {
  const seeds=`${dir}-seeds`; await seedContextFixtures(seeds);
  for(const ref of Object.keys(fixture))if(/^(?:src\/sum|test\/|docs\/fsd\/|\.scratch\/dummy\/)/.test(ref))delete fixture[ref];
  const selected=path.join(seeds,fixtureName);
  for(const ref of files(selected))fixture[ref]=fs.readFileSync(path.join(selected,ref),'utf8');
  testRef='test/sum.test.cjs';sourceRef='src/sum.cjs';initialExit=fixtureName==='debugging'?1:0;
  const protectedFunction=fixtureName==='debugging'?'multiply':'sum';
  preservedExpression=fixture[sourceRef].match(new RegExp(`exports\\.${protectedFunction} = [^;]+;`))[0];
  fixture['AGENTS.md']=`# Pilot project\nUse only local .agent contracts and the approved fixture FSD. Preserve ${testRef} byte for byte and preserve ${protectedFunction}. No commit, global skills, external workspace reads, or policy bypass.\n`;
  fixture['PILOT-ADAPTER.md']=`Local adapter: read .agent/context/workflows/${fixtureName==='debugging'?'sc-debug':'sc-status'}.contract.md, then use this fixture's prompt from fixture.json. Preserve already verified work.\n`;
  for(const ref of ['docs/ERROR_LOG.md','docs/LEARNED_KNOWLEDGE.md','docs/progress.md'])fixture[ref]=fixture[ref].replaceAll('src/sum.js',sourceRef).replaceAll('test/sum.test.js',testRef);
 }
 fixture['PILOT-BUILD.json']=JSON.stringify({sourceDigest:buildDigest,fixture:fixtureName})+'\n';
 fixture['AGENTS.md']+=`${RTK_RULE}\n`;
 fixture['PILOT-ADAPTER.md']+=`${RTK_RULE}\nProve the selected local build with rtk node -p "require('./PILOT-BUILD.json').sourceDigest" before continuing. Search relevant arithmetic knowledge; save actual verification output and either capture reusable knowledge or a justified no-learning disposition with verification evidence.\n`;
 for(const [ref,content] of Object.entries(fixture))write(dir,ref,content);
 const initialized=spawnSync('git',['init','-q','-b','pilot-work'],{cwd:dir,encoding:'utf8'});
 if(initialized.status!==0)throw new Error('pilot fixture Git initialization failed');
 const nextAction=fixture['docs/STATE.md'].match(/Next action:\s*([^\r\n]+)/)[1];
 const authorityRef=fixtureName==='legacy'?'docs/fsd/fsd-dummy.md':'docs/fsd/fsd-arithmetic.md';
 const pendingGoal=fixtureName==='multi-goal-resume'?'GOAL-002':'GOAL-001';
 const pendingCompletion=preparePilotCompletion(dir,pendingGoal,{sourceRef,testRefs:fixtureName==='multi-goal-resume'?[testRef,'test/multiply.test.cjs']:[testRef],authorityRef,regression:fixtureName!=='multi-goal-resume'});
 const verifiedOutcomes=fixtureName==='multi-goal-resume'?['GOAL-001']:fixtureName==='legacy'?['GOAL-000']:[],completionEvidence={};
 for(const goalId of verifiedOutcomes) {
  const proof=preparePilotCompletion(dir,goalId,{sourceRef:fixtureName==='legacy'?'src/verified.js':sourceRef,testRefs:fixtureName==='legacy'?[]:[testRef],authorityRef,verifiedHelper:fixtureName==='legacy'});
  const result=await runVerificationRecipe(dir,JSON.parse(fs.readFileSync(path.join(dir,proof.recipePath),'utf8')));
  if(!result.pass)throw new Error('pilot verified seed requires actual passing proof');
  completionEvidence[goalId]={contractPath:proof.contractPath,contractDigest:proof.contractDigest};
 }
 await persistCheckpoint({root:dir,input:{nextAction,verifiedOutcomes,completionEvidence,blockers:[],artifactRefs:[authorityRef],contractRefs:[`.agent/context/workflows/${fixtureName==='debugging'?'sc-debug':'sc-work'}.contract.md`],ledgerRefs:[],constraints:[{id:'P1',instruction:`Preserve ${testRef} and already verified work`,source:'user:pilot',scope:['*'],supersedes:[]}]}});
 const initial=spawnSync(process.execPath,['--test',testRef],{cwd:dir,encoding:'utf8',env:testEnv});
 if(initial.status!==initialExit)throw new Error(`pilot fixture initial test expected exit ${initialExit}, got ${initial.status}`);
 return {fixture:fixtureName,fixtureDigest:hash(JSON.stringify(Object.fromEntries(Object.entries(fixture).filter(([ref])=>ref!=='PILOT-BUILD.json')))),testRef,sourceRef,initialExit,nextAction,preservedExpression,buildDigest,pendingCompletion,sourceDigest:hash(fixture[sourceRef]),testDigest:hash(fixture[testRef]),verifiedDigest:hash(fixture['src/verified.js']),memoryDigest:hash(fixture['docs/ERROR_LOG.md']+fixture['docs/LEARNED_KNOWLEDGE.md'])};
}

export function gradePreflight(dir,trace,seed) {
 const commands=trace.events.filter(e=>e.type==='item.completed'&&e.item?.type==='command_execution').map(e=>e.item);
 let unchanged=false;
 try {unchanged=hash(fs.readFileSync(path.join(dir,seed.sourceRef)))===seed.sourceDigest&&hash(fs.readFileSync(path.join(dir,seed.testRef)))===seed.testDigest;}catch{/* Missing worker files must still produce a structured failed attempt. */}
 let writeProof=null;
 try {
  const target=path.join(dir,WRITE_PROOF_REF),stat=fs.lstatSync(target);
  if(!fs.lstatSync(path.join(dir,'.scratch')).isSymbolicLink()&&stat.isFile()&&stat.size>0&&stat.size<=1024) {
   const bytes=fs.readFileSync(target),proof=JSON.parse(bytes.toString('utf8'));
   if(bytes.length<=1024&&proof.sourceDigest===seed.buildDigest&&proof.fixture===seed.fixture&&commands.some(c=>c.exit_code===0&&c.command.includes(WRITE_PROOF_REF)))writeProof={evidenceRef:WRITE_PROOF_REF,digest:hash(bytes),bytes:bytes.length};
  }
 }catch{/* A claimed write capability needs the actual bounded probe and observed command. */}
 const checks={selectedBuild:commands.some(c=>c.exit_code===0&&c.command.includes('PILOT-BUILD.json')&&(c.aggregated_output||'').includes(seed.buildDigest)),actualWork:commands.some(c=>c.command.includes(seed.testRef)&&/node(?:\.exe)?["']?\s+--test\b/.test(c.command)&&c.exit_code===seed.initialExit&&/(?:#|ℹ)\s*tests\s+[1-9]/.test(c.aggregated_output||'')),writeCapability:writeProof!==null,unchanged,complete:trace.complete};
 return {pass:Object.values(checks).every(Boolean),checks,writeProof,expectedInitialExit:seed.initialExit};
}

export function codexArgs(model,effort='low') {
 if(!model||!['low','medium','high','xhigh','max'].includes(effort))throw new Error('fixed model and supported effort required');
 return ['exec','--json','--ephemeral','--ignore-user-config','--sandbox','workspace-write','-c','approval_policy="never"','-c',`model_reasoning_effort="${effort}"`,'-m',model,'-'];
}

// The grader stays outside every worker fixture and receives anonymous labels.
export async function gradePilot(dir,trace,seed) {
 let testRefs=[];try {testRefs=fs.readdirSync(path.join(dir,'test')).filter(ref=>/\.test\.(?:c?js)$/.test(ref)).map(ref=>`test/${ref}`);}catch{/* Worker damage is a failed grade, never an implicit broad test discovery. */}
 const test=testRefs.length?spawnSync(process.execPath,['--test',...testRefs],{cwd:dir,encoding:'utf8',env:testEnv}):{status:1,stdout:'',stderr:'missing acceptance tests'};
 const sum=spawnSync(process.execPath,['-e',`const s=require(${JSON.stringify(`./${seed.sourceRef}`)}); for(const [a,b] of [[2,3],[-2,5],[0,0],[1.5,2.25]]) if((typeof s==='function'?s(a,b):s.sum(a,b))!==a+b)process.exit(1); ${seed.fixture==='multi-goal-resume'?'for(const [a,b] of [[2,3],[-2,3],[0,3]])if(s.multiply(a,b)!==a*b)process.exit(1);':''}`],{cwd:dir,encoding:'utf8',env:testEnv});
 const safeRead=ref=>{try{return fs.readFileSync(path.join(dir,ref),'utf8');}catch{return '';}};
 const unchanged=hash(safeRead(seed.testRef))===seed.testDigest&&hash(safeRead('src/verified.js'))===seed.verifiedDigest&&(!seed.preservedExpression||safeRead(seed.sourceRef).includes(seed.preservedExpression));
 const commandText=trace.commands.map(c=>c.command).join('\n');
 const completed=trace.events.filter(e=>e.type==='item.completed'&&e.item?.type==='command_execution'&&e.item.exit_code===0).map(e=>e.item);
 const relevantKnowledge=completed.some(c=>/knowledge-search/.test(c.command)&&(/ERR-2026-09-01-001/.test(c.aggregated_output||'')||(c.aggregated_output||'').includes(seed.sourceRef)));
 const selectedBuild=completed.some(c=>c.command.includes('PILOT-BUILD.json')&&(c.aggregated_output||'').includes(seed.buildDigest));
 const resume=seed.fixture==='debugging'||/memory-maintenance[^\n]*resume/.test(commandText);
 const verification=trace.commands.some(c=>/(npm\s+test|node\s+--test)/.test(c.command)&&c.exitCode===0);
 let checkpoint=null,capture=false,completionEvidence=false;
 try {
  const managed=safeRead('.continue-here.md').match(/<!-- sc-checkpoint:start -->[\s\S]*?```json\n([\s\S]*?)\n```[\s\S]*?<!-- sc-checkpoint:end -->/);
  if(managed)checkpoint=JSON.parse(managed[1]);
  const currentGoal=seed.fixture==='multi-goal-resume'?'GOAL-002':'GOAL-001';
  const pin=checkpoint?.completionEvidence?.[currentGoal];
  if(pin?.contractPath===seed.pendingCompletion?.contractPath&&pin?.contractDigest===seed.pendingCompletion.contractDigest)
   completionEvidence=(await verifyCompletionEvidence(dir,pin)).allowed;
  if(checkpoint?.learningCloseouts!==undefined) {
   const stored=checkpoint.learningCloseouts,validated=await validateLearningCloseouts(dir,stored);
   capture=stored.length>0&&validated.every((r,i)=>['captured','skipped-trivial'].includes(r.disposition)&&r.evidenceRefs.length>0&&r.evidenceDigest===stored[i].evidenceDigest);
  } else {
   for(const command of completed.filter(c=>/memory-maintenance[^\n]*capture/.test(c.command))) {
    try {
     const result=JSON.parse(command.aggregated_output||'');
     if(!['created','updated','unchanged','deduplicated'].includes(result.action)||result.dryRun||typeof result.path!=='string')continue;
     const knowledgeRef=`${result.path}${result.id?`#${result.id}`:''}`;
     const raw=await readBoundedFile(dir,result.path,{encoding:'utf8',maxBytes:2*1024*1024});
     const fields=result.id?parseEntries(raw,result.id.split('-')[0]).find(e=>e.id===result.id)?.fields:parseFrontmatter(raw).meta;
     if(!fields||String(fields.Outcome||fields.outcome)!=='verified')continue;
     const record={origin:fields.Origin||fields.origin,revision:fields.Revision||fields.revision,disposition:'captured',reason:'Legacy successful capture with actual verified evidence',evidenceRefs:String(fields.Evidence||fields.evidence||'').split(', ').map(ref=>ref.replace(/@[a-f0-9]{64}$/,'')),knowledgeRef};
     await validateLearningCloseouts(dir,[record]);capture=true;break;
    } catch { /* A claimed capture is not proof until its actual record validates. */ }
   }
  }
 } catch { /* Invalid or drifted closeout evidence fails this quality gate. */ }
 const state=safeRead('docs/STATE.md');
 const action=state.match(/Next action:\s*([^\r\n]+)/i)?.[1]||'';
 const nextAction=!!checkpoint?.nextAction&&checkpoint.nextAction!==seed.nextAction||!!action&&action!==seed.nextAction&&state!==seed.state;
 const verifiedGoal=seed.fixture==='multi-goal-resume'?'GOAL-001':'GOAL-000';
 const constraintCompliance=unchanged&&!trace.commands.filter(c=>/work-package[^\n]*create/.test(c.command)).some(c=>c.command.includes(verifiedGoal));
 const checks={tests:test.status===0,hiddenArithmetic:sum.status===0,constraintCompliance,selectedBuild,relevantKnowledge,resume,verification,completionEvidence,capture,nextAction,actualWork:trace.commandCount>0,complete:trace.complete};
 return {correctness:Object.values(checks).every(Boolean),checks,verificationOutput:test.stdout+test.stderr};
}

function runSession(executable,dir,model,rawFile,errFile,{prompt=PILOT_PROMPT,effort='low',timeoutMs=300000}={}) {
 return new Promise(resolve=>{
  const started=Date.now(),out=fs.createWriteStream(rawFile),err=fs.createWriteStream(errFile);
  const args=codexArgs(model,effort);
  const child=spawn(executable,args,{cwd:dir,windowsHide:true,stdio:['pipe','pipe','pipe']});
  child.stdout.pipe(out);child.stderr.pipe(err);
  let failure=null;
  const timer=setTimeout(()=>{
   failure=`timeout_${timeoutMs/1000}_seconds`;
   if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true});
   else child.kill('SIGKILL');
  },timeoutMs);
  child.on('error',error=>{failure=error.code||error.message;});
  child.on('close',async code=>{
   clearTimeout(timer);await Promise.all([new Promise(r=>out.end(r)),new Promise(r=>err.end(r))]);
   resolve({exitCode:code,latencyMs:Date.now()-started,failure:failure|| (code===0?null:`exit_${code}`),timestamp:new Date().toISOString(),args});
  });
  child.stdin.on('error',()=>{});child.stdin.end(prompt);
 });
}

export async function runCodexPreflight({baseline,enhanced=root,out,model,effort='low',fixture='legacy',executable='codex'}) {
 if(!baseline||!out||!model)throw new Error('baseline, out, and fixed model required');
 codexArgs(model,effort);
 if(fs.existsSync(out))throw new Error('preflight output must be a new directory');
 fs.mkdirSync(out,{recursive:true});
 const attempts=[];
 for(const [variant,source] of Object.entries({A:baseline,B:enhanced})) {
  const label=`preflight-${variant}`,dir=path.join(out,label),seed=await seedPilot(dir,source,fixture);
  const rawFile=path.join(out,`${label}.jsonl`),errFile=path.join(out,`${label}.stderr.log`);
  const prompt=`${RTK_RULE} Read the adapter using rtk powershell -NoProfile -Command "Get-Content -LiteralPath PILOT-ADAPTER.md" and read its named local contract with the same command form. Preflight only: execute rtk node -p "require('./PILOT-BUILD.json').sourceDigest", then rtk node --test ${seed.testRef}. Expected test exit: ${seed.initialExit}; a known RED is deliberate. One write probe is authorized only if effective session policy permits: use rtk node to create ${WRITE_PROOF_REF} containing JSON with sourceDigest and fixture copied from PILOT-BUILD.json, at most 1024 bytes. Only that probe may be written; preserve source and tests unchanged. If session policy is read-only, stop and report blocked; never bypass it. Do not commit, use global skills, inspect other sessions or make other edits. Stop within 90 seconds and report actual results.`;
  process.stdout.write(`Starting ${label} ${fixture}\n`);
  const result=await runSession(executable,dir,model,rawFile,errFile,{prompt,effort,timeoutMs:90000});
  const trace=analyzeCodexJsonl(fs.readFileSync(rawFile,'utf8'));
  const grade=gradePreflight(dir,trace,seed);
  attempts.push({variant,fixture,sourceDigest:seed.buildDigest,result,...grade,usage:{...trace,events:undefined}});
  const report={schema:'codex_preflight_v1',protocol:PILOT_PROTOCOL,pass:attempts.length===2&&attempts.every(a=>a.pass&&!a.result.failure),attempts};
  write(out,'preflight.json',JSON.stringify(report,null,2));
  if(!grade.pass||result.failure)return report;
 }
 return JSON.parse(fs.readFileSync(path.join(out,'preflight.json'),'utf8'));
}

export async function runCodexPilot({baseline,enhanced=root,out,model,effort='low',fixture='legacy',noiseAware=false,executable='codex'}) {
 if(!baseline||!out||!model)throw new Error('baseline, out, and fixed model required');
 if(typeof noiseAware!=='boolean')throw new Error('noiseAware must be a boolean');
 const args=codexArgs(model,effort);
 if(fs.existsSync(out))throw new Error('pilot output must be a new directory; no hidden retries or overwrite');
 fs.mkdirSync(out,{recursive:true});
 const sourceDigests={A:surfaceDigest(baseline),B:surfaceDigest(enhanced)};
 const graderDigest=hash(gradePilot.toString()),configDigest=hash(JSON.stringify({protocol:PILOT_PROTOCOL,model,effort,args,timeoutMs:300000,executable}));
 const prompt=fixture==='legacy'?PILOT_PROMPT:fixture==='debugging'?`${RTK_RULE} Read PILOT-ADAPTER.md, then execute only the debugging task specified in fixture.json. Diagnose and fix sum only; preserve the existing test and multiply placeholder. Prove the selected build, use relevant arithmetic knowledge, save actual regression verification and capture reusable knowledge or a justified evidence-backed no-learning disposition, then save the next action. Work only here; do not commit, use global skills, inspect other sessions or read the external evaluator. Stop within five minutes; report failures honestly.`:`${PILOT_PROMPT}\nExecute only the ${fixture} task specified in fixture.json. Do not continue into another goal.`;
 const taskDigest=hash(prompt),trials=[],controlTrials=[];
 write(out,'protocol.json',JSON.stringify({schema:'codex_paired_pilot_v1',protocol:PILOT_PROTOCOL,fixture,pairs:5,controlPairs:noiseAware?6:0,noiseAware,sourceDigests,taskDigest,graderDigest,configDigest,model,effort,prompt},null,2));
 const preflight=await runCodexPreflight({baseline,enhanced,out:path.join(out,'preflight'),model,effort,fixture,executable});
 if(!preflight.pass) {
  const verdict={decision:'INCONCLUSIVE',reason:'access/build/actual-work preflight failed',pairs:0,medianReduction:'unknown'};
  write(out,'trials.json',JSON.stringify({trials,gates:{noiseAware,controlTrials}},null,2));
  write(out,'verdict.json',JSON.stringify(verdict,null,2));
  return {trials,controlTrials,preflight,verdict};
 }
 for(const batch of noiseAware?[{control:true,pairs:6},{control:false,pairs:5}]:[{control:false,pairs:5}])for(let pair=1;pair<=batch.pairs;pair++)for(const variant of pair%2?['A','B']:['B','A']) {
  const attempts=batch.control?controlTrials:trials;
  const label=`${batch.control?'control-':''}session-${attempts.length+1}`,dir=path.join(out,label),source=batch.control||variant==='A'?baseline:enhanced;
  const seed=await seedPilot(dir,source,fixture);seed.state=fs.readFileSync(path.join(dir,'docs/STATE.md'),'utf8');
  const rawFile=path.join(out,`${label}.jsonl`),errFile=path.join(out,`${label}.stderr.log`);
  process.stdout.write(`Starting ${label} pair ${pair}\n`);
  const result=await runSession(executable,dir,model,rawFile,errFile,{prompt,effort});
  const trace=analyzeCodexJsonl(fs.readFileSync(rawFile,'utf8'));
  const grade=await gradePilot(dir,trace,seed);
  const evidenceFile=`${label}.grade.json`;
  write(out,evidenceFile,JSON.stringify({label,...grade,sourceDigest:seed.buildDigest,traceDigest:hash(fs.readFileSync(rawFile)),result,usage:{...trace,events:undefined}},null,2));
  const trial={pair,variant,label,...result,host:`codex-${process.platform}`,model,metric:'total_tokens',basis:'codex-jsonl',taskDigest,fixtureDigest:seed.fixtureDigest,configDigest,graderDigest,sourceDigest:seed.buildDigest,value:trace.totalTokens,correctness:grade.correctness,errorCount:trace.errorCount,usage:{input:trace.inputTokens,output:trace.outputTokens,cache:trace.cachedInputTokens,cacheWrite:trace.cacheWriteInputTokens,reasoning:trace.reasoningOutputTokens,uncached:trace.uncachedInputTokens},repeatedCommands:trace.repeatedCommands,checks:grade.checks,actualWork:{commandCount:trace.commandCount,evidenceRef:evidenceFile,digest:hash(fs.readFileSync(path.join(out,evidenceFile)))}};
  attempts.push(trial);write(out,'trials.json',JSON.stringify({trials,gates:{noiseAware,...(noiseAware?{controlTrials}:{})}},null,2));
  process.stdout.write(`${label}: ${grade.correctness?'PASS':'FAIL'}, tokens=${trace.totalTokens}, ${result.failure||'finished'}\n`);
  if(result.failure || batch.control&&!grade.correctness) {
   const verdict={decision:'INCONCLUSIVE',reason:result.failure?'session execution failed':'A/A control correctness failed',failedAttempt:label,pairs:0,medianReduction:'unknown'};
   write(out,'verdict.json',JSON.stringify(verdict,null,2));
   return {trials,controlTrials,preflight,verdict};
  }
 }
 const verdict=comparePairedTrials(trials,{noiseAware,...(noiseAware?{controlTrials}:{})});
 write(out,'verdict.json',JSON.stringify(verdict,null,2));
 process.stdout.write(`${JSON.stringify(verdict)}\n`);
 return {trials,controlTrials,preflight,verdict};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [command,...args]=process.argv.slice(2);
 const options={};for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])throw new Error('invalid pilot arguments');options[args[i].slice(2)]=args[i+1];}
 if(options['noise-aware']!==undefined){if(!['true','false'].includes(options['noise-aware']))throw new Error('noise-aware must be true or false');options.noiseAware=options['noise-aware']==='true';delete options['noise-aware'];}
 if(!['run','preflight'].includes(command))throw new Error('usage: codex-pilot.mjs <run|preflight> --baseline <frozen-root> --out <new-root> --model <fixed-model> [--fixture debugging|multi-goal-resume] [--effort low] [--executable <codex.exe>]');
 const result=command==='preflight'?await runCodexPreflight(options):await runCodexPilot(options);
 if(command==='preflight'){process.stdout.write(`${JSON.stringify(result)}\n`);if(!result.pass)process.exitCode=1;}
}
