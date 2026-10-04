import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {seedFiles} from './session-baseline.mjs';
import {activeCopyFilter,selectActiveAssets} from './active-assets.mjs';
import {comparePairedTrials} from './adaptive-eval.mjs';
import {persistCheckpoint} from './memory-maintenance.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validNumber=n=>Number.isSafeInteger(n)&&n>=0;
export function analyzeCodexJsonl(raw) {
 const events=[],parseErrors=[];
 for(const line of raw.split(/\r?\n/).filter(Boolean))try{events.push(JSON.parse(line));}catch{parseErrors.push('invalid JSONL');}
 const completed=events.filter(e=>e.type==='turn.completed');
 const failures=events.filter(e=>['error','turn.failed'].includes(e.type));
 const commands=events.filter(e=>e.type==='item.completed'&&e.item?.type==='command_execution').map(e=>e.item);
 const sum=key=>completed.length&&completed.every(e=>validNumber(e.usage?.[key]))?completed.reduce((s,e)=>s+e.usage[key],0):'unknown';
 const inputTokens=sum('input_tokens'),outputTokens=sum('output_tokens'),cachedInputTokens=sum('cached_input_tokens');
 const totalTokens=typeof inputTokens==='number'&&typeof outputTokens==='number'?inputTokens+outputTokens:'unknown';
 return {inputTokens,outputTokens,cachedInputTokens,totalTokens,uncachedInputTokens:typeof inputTokens==='number'&&typeof cachedInputTokens==='number'&&cachedInputTokens<=inputTokens?inputTokens-cachedInputTokens:'unknown',commandCount:commands.length,repeatedCommands:commands.length-new Set(commands.map(c=>c.command)).size,errorCount:failures.length+parseErrors.length+commands.filter(c=>typeof c.exit_code==='number'&&c.exit_code!==0).length,complete:completed.length>0&&!failures.length&&!parseErrors.length,commands:commands.map(c=>({command:c.command,exitCode:c.exit_code??'unknown'})),events};
}

export const PILOT_PROMPT='Read PILOT-ADAPTER.md. Cold resume from .continue-here.md, continue the pending goal, use relevant durable knowledge, verify the change, capture the verified outcome and save the next action. Respect active constraints and preserve previously verified work. Work only in this fixture; do not commit, use global skills, inspect other sessions, or read the external evaluator. Stop within five minutes; report any failure honestly.';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
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
 return hash(JSON.stringify(selectActiveAssets(surface).map(ref=>[ref,hash(fs.readFileSync(path.join(dir,ref)))])));
}

async function seedPilot(dir,source) {
 fs.mkdirSync(dir,{recursive:true});
 for(const name of ['.agent'])fs.cpSync(path.join(source,name),path.join(dir,name),{recursive:true,filter:src=>activeCopyFilter(source)(src)&&!/^\.agent\/tools\/(?:codex-pilot|paired-eval)(?:\.|$)/.test(path.relative(source,src).replaceAll('\\','/'))});
 const fixture=seedFiles('2026-10-04');
 fixture['AGENTS.md']='# Pilot project\nUse local .agent/context contracts before details. No global skills or external workspace reads. Preserve test/sum.test.js and src/verified.js byte for byte. Do not repeat verified GOAL-000. No commit. Node and npm are the project harness. Active user goal is to finish GOAL-001.\n';
 fixture['PILOT-ADAPTER.md']='Local adapter: read .agent/context/workflows/sc-status.contract.md to recover, then .agent/context/workflows/sc-work.contract.md for the pending issue. Use only this project framework variant.\n';
 fixture['src/verified.js']='module.exports = () => "already verified";\n';
 fixture['docs/fsd/fsd-dummy.md']='# Dummy FSD\nID: FSD-DUMMY\nArtifact contract version: `2.0.0`\nStatus: APPROVED\nUI: NOT_APPLICABLE (CLI helper)\n\n## GOAL-000\nStatus: verified\nScope: src/verified.js\nEvidence: docs/verified-proof.json\n\n## GOAL-001\nStatus: ready-for-agent\nScope: src/sum.js\nAcceptance: sum returns a+b for numeric arguments. Keep existing CommonJS style and original acceptance test.\n\n## TEST-001\nRun npm test and save actual output.\n\n## TDEC-001\nUse the existing arithmetic helper and harness.\n';
 fixture['docs/verified-proof.json']='{"goal":"GOAL-000","pass":true}\n';
 fixture['docs/STATE.md']='# Project State\nLast updated: 2026-10-04 09:00\n\n## Current Position\n- Active task: GOAL-001\n- Next action: /sc-work .scratch/dummy/issues/01-sum-returns-sum.md\n\n## Completed Work\n- GOAL-000 verified: docs/verified-proof.json; src/verified.js must be retained.\n';
 for(const [ref,content] of Object.entries(fixture))write(dir,ref,content);
 const initialized=spawnSync('git',['init','-q','-b','pilot-work'],{cwd:dir,encoding:'utf8'});
 if(initialized.status!==0)throw new Error('pilot fixture Git initialization failed');
 await persistCheckpoint({root:dir,input:{nextAction:'/sc-work .scratch/dummy/issues/01-sum-returns-sum.md',verifiedOutcomes:['GOAL-000'],blockers:[],artifactRefs:['docs/fsd/fsd-dummy.md'],contractRefs:['.agent/context/workflows/sc-work.contract.md'],ledgerRefs:[],constraints:[{id:'P1',instruction:'Preserve acceptance test and previously verified GOAL-000',source:'user:pilot',scope:['*'],supersedes:[]}]}});
 const red=spawnSync(process.execPath,['--test','test/sum.test.js'],{cwd:dir,encoding:'utf8'});
 if(red.status!==1)throw new Error('pilot fixture must reproduce the defect');
 return {fixtureDigest:hash(JSON.stringify(fixture)),testDigest:hash(fixture['test/sum.test.js']),verifiedDigest:hash(fixture['src/verified.js']),memoryDigest:hash(fixture['docs/ERROR_LOG.md']+fixture['docs/LEARNED_KNOWLEDGE.md'])};
}

// The grader stays outside every worker fixture and receives anonymous labels.
export function gradePilot(dir,trace,seed) {
 const test=spawnSync(process.execPath,['--test','test/sum.test.js'],{cwd:dir,encoding:'utf8'});
 const sum=spawnSync(process.execPath,['-e','const s=require("./src/sum.js"); for(const [a,b] of [[2,3],[-2,5],[0,0],[1.5,2.25]]) if(s(a,b)!==a+b)process.exit(1);'],{cwd:dir,encoding:'utf8'});
 const safeRead=ref=>{try{return fs.readFileSync(path.join(dir,ref),'utf8');}catch{return '';}};
 const unchanged=hash(safeRead('test/sum.test.js'))===seed.testDigest&&hash(safeRead('src/verified.js'))===seed.verifiedDigest;
 const commandText=trace.commands.map(c=>c.command).join('\n');
 const relevantKnowledge=trace.events.some(e=>e.type==='item.completed'&&e.item?.type==='command_execution'&&e.item.exit_code===0&&/knowledge-search/.test(e.item.command)&&/ERR-2026-09-01-001|src\/sum\.js/.test(e.item.aggregated_output||''));
 const resume=/memory-maintenance[^\n]*resume/.test(commandText);
 const verification=trace.commands.some(c=>/(npm\s+test|node\s+--test)/.test(c.command)&&c.exitCode===0);
 const capture=trace.events.some(e=>e.type==='item.completed'&&e.item?.type==='command_execution'&&e.item.exit_code===0&&/memory-maintenance[^\n]*capture/.test(e.item.command)&&/"action"\s*:\s*"(?:created|updated|unchanged|deduplicated|skipped_worth_gate)"/.test(e.item.aggregated_output||''));
 const state=safeRead('docs/STATE.md');
 const action=state.match(/Next action:\s*([^\r\n]+)/i)?.[1]||'';
 const nextAction=!!action&&!action.includes('01-sum-returns-sum')&&state!==seed.state;
 const constraintCompliance=unchanged&&!/GOAL-000/.test(trace.commands.filter(c=>/work-package[^\n]*create/.test(c.command)).map(c=>c.command).join('\n'));
 const checks={tests:test.status===0,hiddenArithmetic:sum.status===0,constraintCompliance,relevantKnowledge,resume,verification,capture,nextAction,actualWork:trace.commandCount>0,complete:trace.complete};
 return {correctness:Object.values(checks).every(Boolean),checks,verificationOutput:test.stdout+test.stderr};
}

function runSession(executable,dir,model,rawFile,errFile) {
 return new Promise(resolve=>{
  const started=Date.now(),out=fs.createWriteStream(rawFile),err=fs.createWriteStream(errFile);
  const args=['exec','--json','--ephemeral','--ignore-user-config','--ignore-rules','--sandbox','workspace-write','-c','approval_policy="never"','-m',model,'-'];
  const child=spawn(executable,args,{cwd:dir,windowsHide:true,stdio:['pipe','pipe','pipe']});
  child.stdout.pipe(out);child.stderr.pipe(err);
  let failure=null;
  const timer=setTimeout(()=>{
   failure='timeout_300_seconds';
   if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true});
   else child.kill('SIGKILL');
  },300000);
  child.on('error',error=>{failure=error.code||error.message;});
  child.on('close',async code=>{
   clearTimeout(timer);await Promise.all([new Promise(r=>out.end(r)),new Promise(r=>err.end(r))]);
   resolve({exitCode:code,latencyMs:Date.now()-started,failure:failure|| (code===0?null:`exit_${code}`),timestamp:new Date().toISOString(),args});
  });
  child.stdin.on('error',()=>{});child.stdin.end(PILOT_PROMPT);
 });
}

export async function runCodexPilot({baseline,enhanced=root,out,model,executable='codex'}) {
 if(!baseline||!out||!model)throw new Error('baseline, out, and fixed model required');
 if(fs.existsSync(out))throw new Error('pilot output must be a new directory; no hidden retries or overwrite');
 fs.mkdirSync(out,{recursive:true});
 const sourceDigests={A:surfaceDigest(baseline),B:surfaceDigest(enhanced)};
 const graderDigest=hash(gradePilot.toString()),configDigest=hash(JSON.stringify({model,sandbox:'workspace-write',timeoutMs:300000,config:'ignore-user-config'}));
 const taskDigest=hash(PILOT_PROMPT),trials=[];
 write(out,'protocol.json',JSON.stringify({schema:'codex_paired_pilot_v1',pairs:5,sourceDigests,taskDigest,graderDigest,configDigest,model,prompt:PILOT_PROMPT},null,2));
 for(let pair=1;pair<=5;pair++)for(const variant of pair%2?['A','B']:['B','A']) {
  const label=`session-${trials.length+1}`,dir=path.join(out,label),source=variant==='A'?baseline:enhanced;
  const seed=await seedPilot(dir,source);seed.state=fs.readFileSync(path.join(dir,'docs/STATE.md'),'utf8');
  const rawFile=path.join(out,`${label}.jsonl`),errFile=path.join(out,`${label}.stderr.log`);
  process.stdout.write(`Starting ${label} pair ${pair}\n`);
  const result=await runSession(executable,dir,model,rawFile,errFile);
  const trace=analyzeCodexJsonl(fs.readFileSync(rawFile,'utf8'));
  const grade=gradePilot(dir,trace,seed);
  const evidenceFile=`${label}.grade.json`;
  write(out,evidenceFile,JSON.stringify({label,...grade,sourceDigest:sourceDigests[variant],traceDigest:hash(fs.readFileSync(rawFile)),result,usage:{...trace,events:undefined}},null,2));
  const trial={pair,variant,label,...result,host:`codex-${process.platform}`,model,metric:'total_tokens',basis:'codex-jsonl',taskDigest,fixtureDigest:seed.fixtureDigest,configDigest,graderDigest,sourceDigest:sourceDigests[variant],value:trace.totalTokens,correctness:grade.correctness,errorCount:trace.errorCount,usage:{input:trace.inputTokens,output:trace.outputTokens,cache:trace.cachedInputTokens,uncached:trace.uncachedInputTokens},repeatedCommands:trace.repeatedCommands,checks:grade.checks,actualWork:{commandCount:trace.commandCount,evidenceRef:evidenceFile,digest:hash(fs.readFileSync(path.join(out,evidenceFile)))}};
  trials.push(trial);write(out,'trials.json',JSON.stringify({trials},null,2));
  process.stdout.write(`${label}: ${grade.correctness?'PASS':'FAIL'}, tokens=${trace.totalTokens}, ${result.failure||'finished'}\n`);
 }
 const verdict=comparePairedTrials(trials);
 write(out,'verdict.json',JSON.stringify(verdict,null,2));
 process.stdout.write(`${JSON.stringify(verdict)}\n`);
 return {trials,verdict};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [command,...args]=process.argv.slice(2);
 const options={};for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])throw new Error('invalid pilot arguments');options[args[i].slice(2)]=args[i+1];}
 if(command!=='run')throw new Error('usage: codex-pilot.mjs run --baseline <frozen-root> --out <new-root> --model <fixed-model> [--executable <codex.exe>]');
 await runCodexPilot(options);
}
