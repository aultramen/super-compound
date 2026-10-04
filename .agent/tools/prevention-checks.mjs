import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {withMemoryWriter} from './memory-maintenance.mjs';
import {readBoundedFile,writeFileAtomic,assertExpectedVersion} from './file-state.mjs';
import {canonicalLocator} from './active-assets.mjs';

const STORE='docs/learnings/prevention-receipts.json';
const sha=value=>createHash('sha256').update(value).digest('hex');
const states=new Set(['candidate','validated','applied','rejected','deferred']);
const terminal=new Set(['applied','rejected','deferred']);
const safePath=p=>typeof p==='string' && p.length<=300 && /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*[\\:\x00-\x1f])[^/]+(?:\/[^/]+)*$/.test(p);
const inScope=(file,scope)=>scope.some(p=>file===p || file.startsWith(`${p}/`));
const line=(value,key)=>{if(typeof value!=='string'||!value.trim()||value.length>2000||/[\r\n\0]/.test(value))throw new Error(`invalid ${key}`);return value;};

export function readPreventionStore(root) {
 const target=path.join(root,STORE);
 if (!fs.existsSync(target)) return {schema:'prevention_checks_v1',version:0,receipts:{}};
 if(fs.lstatSync(target).isSymbolicLink()||fs.statSync(target).size>2*1024*1024)throw new Error('unsafe prevention store');
 const store=JSON.parse(fs.readFileSync(target,'utf8'));
 if(store.schema!=='prevention_checks_v1'||!Number.isSafeInteger(store.version)||store.version<0||!store.receipts||Array.isArray(store.receipts))throw new Error('invalid prevention store');
 for(const [id,r] of Object.entries(store.receipts)) {
  if(!states.has(r.state)||r.id!==id||!Array.isArray(r.history)||r.history.length>8||!Number.isSafeInteger(r.attempts)||r.attempts<0||r.attempts>2)throw new Error('invalid prevention receipt');
 }
 return store;
}

async function writePreventionCheck({root,input}) {
 return withMemoryWriter(root,async()=>{
  if(!['sc-work','sc-debug'].includes(input.owner))throw new Error('only owning work/debug may assess or add checks');
  for(const k of ['origin','closeout','knowledgeRef','reproducer','reason'])line(input[k],k);
  if(!states.has(input.state)||!['reuse','add'].includes(input.mode))throw new Error('invalid prevention lifecycle');
  for(const k of ['scope','authorizedScope'])if(!Array.isArray(input[k])||!input[k].length||input[k].length>100||input[k].some(p=>!safePath(p)))throw new Error(`invalid ${k}`);
  if(input.scope.some(p=>!inScope(p,input.authorizedScope)))throw new Error('check outside authorized scope');
  const checkRef=canonicalLocator(input.checkRef);
  if(!safePath(checkRef)||!inScope(checkRef,input.scope))throw new Error('check outside authorized scope');
  if(/^\.agent\/(?:workflows|rules|context)\//.test(checkRef)||/^\.agent\/skills\/.*\/SKILL\.md$/.test(checkRef))throw new Error('skills/workflows/policy require proposal');
  if(input.mode==='add' && input.preventionGap!==true)throw new Error('new check requires demonstrated prevention gap');
  const knowledgeRef=canonicalLocator(input.knowledgeRef);
  const [knowledgePath,anchor]=knowledgeRef.split('#');
  const knowledge=await readBoundedFile(root,knowledgePath,{encoding:'utf8'});
  if(anchor&&!knowledge.includes(anchor))throw new Error('knowledge anchor missing');
  if(/^(?:status:|- Status:)\s*(stale|superseded|contradicted)\b/im.test(knowledge))throw new Error('knowledge needs revalidation before guidance');
  if(!Array.isArray(input.evidence)||!input.evidence.length||input.evidence.length>10)throw new Error('verified outcome evidence required');
  const evidence=[];
  for(const ref of input.evidence) {
   if(!safePath(canonicalLocator(ref)))throw new Error('invalid evidence locator');
   const bytes=await readBoundedFile(root,canonicalLocator(ref));
   evidence.push({ref:canonicalLocator(ref),digest:sha(bytes)});
  }
  const evidenceDigest=sha(JSON.stringify(evidence));
  const id=sha(JSON.stringify([input.origin,knowledgeRef,input.reproducer,evidenceDigest]));
  await readBoundedFile(root,STORE,{maxBytes:2*1024*1024}).catch(e=>{if(!/File does not exist/.test(e.message))throw e;});
  const store=readPreventionStore(root), prior=store.receipts[id];
  if(prior && (prior.mode!==input.mode||prior.checkRef!==checkRef||JSON.stringify(prior.scope)!==JSON.stringify(input.scope)))throw new Error('candidate identity already pinned');
  if(prior && (prior.state===input.state||terminal.has(prior.state)))return {action:'unchanged',version:store.version,receipt:prior};
  if(input.expectedVersion!==undefined)assertExpectedVersion(store.version,input.expectedVersion,'prevention store version');
  if(!prior && input.state!=='candidate')throw new Error('candidate required before validation');
  if(!prior && input.mode==='add' && Object.values(store.receipts).some(r=>r.closeout===input.closeout&&r.mode==='add'))throw new Error('one new check candidate per closeout');
  if(prior && input.state==='applied' && prior.state!=='validated')throw new Error('validate check before applying');
  const attempts=(prior?.attempts||0)+(input.state==='validated'?1:0);
  if(attempts>2)throw new Error('two attempts per evidence version');
  const checkDigest=sha(await readBoundedFile(root,checkRef));
  let verification=prior?.verification;
  if(input.state==='validated') {
   try {
   if(!input.afterRef)throw new Error('validation requires actual after evidence');
   const after=JSON.parse(await readBoundedFile(root,input.afterRef,{encoding:'utf8'}));
   if(after.exitCode!==0||typeof after.command!=='string'||!after.command.trim()||!Number.isFinite(Date.parse(after.timestamp))||!/^[a-f0-9]{64}$/.test(after.sourceDigest)||!after.counts||['pass','fail','skip'].some(k=>!Number.isSafeInteger(after.counts[k])||after.counts[k]<0)||after.counts.fail!==0||after.counts.pass<1)throw new Error('check must pass with execution provenance');
   if(input.mode==='add') {
    if(!input.beforeRef)throw new Error('new check requires failing reproducer evidence');
    const before=JSON.parse(await readBoundedFile(root,input.beforeRef,{encoding:'utf8'}));
    if(!Number.isSafeInteger(before.exitCode)||before.exitCode===0||!Number.isFinite(Date.parse(before.timestamp))||before.command!==after.command)throw new Error('regression must fail before fix');
   }
   verification={beforeRef:input.beforeRef||null,afterRef:input.afterRef,afterDigest:sha(await readBoundedFile(root,input.afterRef)),beforeDigest:input.beforeRef?sha(await readBoundedFile(root,input.beforeRef)):null,checkDigest,result:'PASS'};
   } catch(error) {
    prior.attempts=attempts;
    prior.state=attempts>=2?'deferred':'candidate';
    prior.disposition=prior.state;
    prior.reason=`validation failed: ${error.message}`;
    prior.verification={result:'FAIL'};
    prior.history.push({state:prior.state,reason:prior.reason,evidenceDigest});
    store.version++;
    await writeFileAtomic(root,STORE,`${JSON.stringify(store,null,2)}\n`,{fallbackOnBusy:false,maxBytes:2*1024*1024});
    throw error;
   }
  }
  if(input.state==='applied') {
   if(prior.knowledgeDigest!==sha(knowledge))throw new Error('knowledge changed; revalidate before application');
   if(verification.checkDigest!==checkDigest||sha(await readBoundedFile(root,verification.afterRef))!==verification.afterDigest||verification.beforeRef&&sha(await readBoundedFile(root,verification.beforeRef))!==verification.beforeDigest)throw new Error('stale check verification');
  }
  const receipt={...(prior||{}),id,owner:input.owner,origin:input.origin,closeout:prior?.closeout||input.closeout,knowledgeRef,knowledgeDigest:sha(knowledge),scope:input.scope,reproducer:input.reproducer,checkRef,checkDigest,mode:input.mode,evidence,evidenceDigest,state:input.state,attempts,reason:input.reason,disposition:input.state==='applied'?(input.mode==='reuse'?'reused':'added'):input.state,verification:verification||null,history:[...(prior?.history||[]),{state:input.state,reason:input.reason,evidenceDigest}]};
  store.receipts[id]=receipt;
  if(store.version>=Number.MAX_SAFE_INTEGER)throw new Error('prevention version overflow');
  store.version++;
  await writeFileAtomic(root,STORE,`${JSON.stringify(store,null,2)}\n`,{fallbackOnBusy:false,maxBytes:2*1024*1024});
  return {action:'recorded',version:store.version,receipt};
 });
}

export async function recordPreventionCheck({root,input}) {
 try {return await writePreventionCheck({root,input});}
 catch(error) {
  if(['EACCES','EPERM','EBUSY','ENOSPC','EIO'].includes(error.code)) {
   const target=`.scratch/pending-checks/${sha(JSON.stringify([input.origin,input.reproducer,input.evidence]))}.json`;
   try {await writeFileAtomic(root,target,`${JSON.stringify({input,error:error.message,nextAction:'retry check receipt'},null,2)}\n`,{fallbackOnBusy:false});}
   catch(pendingError){throw new AggregateError([error,pendingError],'receipt and pending persistence failed; retain original input');}
  }
  throw error;
 }
}

export function preventionReport(root) {
 const receipts=Object.values(readPreventionStore(root).receipts);
 return {total:receipts.length,states:Object.fromEntries([...states].map(s=>[s,receipts.filter(r=>r.state===s).length])),checks:receipts.map(r=>({origin:r.origin,knowledgeRef:r.knowledgeRef,checkRef:r.checkRef,state:r.state,result:r.verification?.result||'unknown',evidenceDigest:r.evidenceDigest,effectiveness:r.effectiveness||'unknown'}))};
}

export async function recordCheckEffectiveness({root,input}) {
 return withMemoryWriter(root,async()=>{
  await readBoundedFile(root,STORE,{maxBytes:2*1024*1024});
  const store=readPreventionStore(root),receipt=store.receipts[input.id];
  if(!receipt||receipt.state!=='applied')throw new Error('effectiveness requires applied receipt');
  if(!['prevented','missed','unknown'].includes(input.outcome)||!Array.isArray(input.evidence)||!input.evidence.length||input.evidence.length>10)throw new Error('invalid effectiveness feedback');
  const evidence=[];
  for(const ref of input.evidence)evidence.push({ref:canonicalLocator(ref),digest:sha(await readBoundedFile(root,ref))});
  const effectiveness={outcome:input.outcome,evidence};
  if(JSON.stringify(receipt.effectiveness)===JSON.stringify(effectiveness))return {action:'unchanged',version:store.version};
  assertExpectedVersion(store.version,input.expectedVersion,'prevention store version');
  receipt.effectiveness=effectiveness;store.version++;
  await writeFileAtomic(root,STORE,`${JSON.stringify(store,null,2)}\n`,{fallbackOnBusy:false,maxBytes:2*1024*1024});
  return {action:'updated',version:store.version};
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [command,inputFile]=process.argv.slice(2);
 const root=process.cwd();
 const result=command==='report'?preventionReport(root):['record','feedback'].includes(command)?await ({record:recordPreventionCheck,feedback:recordCheckEffectiveness}[command])({root,input:JSON.parse(await readBoundedFile(root,inputFile,{encoding:'utf8'}))}):(()=>{throw new Error('usage: prevention-checks.mjs <record input.json|feedback input.json|report>')})();
 process.stdout.write(`${JSON.stringify(result)}\n`);
}
