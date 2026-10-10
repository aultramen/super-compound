import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBoundedFile,writeFileAtomic} from './file-state.mjs';
import {parseStandardsConfig,resolveOwnerReviewAuthority,standardsPath} from './standards.mjs';

const MAX_BYTES=4*1024*1024;
const hash=value=>createHash('sha256').update(value).digest('hex');
const nonempty=value=>typeof value==='string' && value.trim().length>0;
const validSha=value=>typeof value==='string' && /^[a-f0-9]{40}$/.test(value);
const validDigest=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const validLogin=value=>typeof value==='string' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
const reviewRef=value=>typeof value==='string' && /^\.scratch\/standards\/reviews\/[a-z\d_./-]+\.json$/i.test(value) && !value.split('/').some(part=>part==='..'||part==='.'||part==='');
const reviewQuery='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision}}}';

function requireIdentity(snapshot,context) {
  if (!context || !/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(context.repository??'') || context.repository.length>140 || context.repository.split('/').some(part=>part==='.'||part==='..') || !Number.isSafeInteger(context.number) || context.number<1 || !['testedSha','headSha','baseSha'].every(key=>validSha(context[key]))) throw new Error('Invalid GitHub repository or tested source identity');
  if (snapshot?.schema!=='effective_standards_v1' || snapshot.status!=='ready' || snapshot.gitHead!==context.testedSha || !validDigest(snapshot.effectiveStandardsDigest) || !validDigest(snapshot.sourceDigest) || !Array.isArray(snapshot.checks) || !snapshot.checks.length || snapshot.checks.length>500) throw new Error('Invalid effective standards or tested source identity');
  const manual=snapshot.checks.filter(check=>check?.kind==='manual');
  if(manual.some(check=>!Array.isArray(check.waivedRules)||!Array.isArray(check.ruleIds)||!check.ruleIds.length||check.ruleIds.some(rule=>!nonempty(rule))||new Set(check.ruleIds).size!==check.ruleIds.length||new Set(check.waivedRules).size!==check.waivedRules.length||check.waivedRules.some(rule=>!check.ruleIds.includes(rule))))throw new Error('Malformed required human review rules');
  const checks=manual.filter(check=>check.waivedRules.length!==check.ruleIds.length);
  const keys=new Set(),refs=new Set();
  for (const check of checks) {
    if (check.id!=='review'||!nonempty(check.key)||check.key.length>200||!reviewRef(check.observationRef)||keys.has(check.key)||refs.has(check.observationRef.toLowerCase())) throw new Error('Invalid/duplicate required review identity or observation path');
    keys.add(check.key);refs.add(check.observationRef.toLowerCase());
  }
  return checks;
}

// Only trusted base-branch jobs call this client; no PR code runs with its token.
export function githubRequest(token) {
  if (!nonempty(token)||/[\r\n\0]/.test(token)) throw new Error('Authenticated GitHub read token required');
  return async (route,options={})=>{
    if (typeof route!=='string'||!/^\/(?:graphql$|repos\/(?:[a-z\d_.\/-]|%2f)+(?:\?[a-z\d_=&]+)?$)/i.test(route)||decodeURIComponent(route).split(/[/?]/).some(part=>part==='.'||part==='..')) throw new Error('Invalid fixed GitHub API route');
    const response=await fetch('https://api.github.com'+route,{method:options.body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});
    if (!response.ok) throw new Error(`Authenticated GitHub API failed (${response.status})`);
    let size=0;const chunks=[];
    for await (const chunk of response.body) {size+=chunk.length;if(size>MAX_BYTES)throw new Error('GitHub API response exceeds evidence bound');chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
}

async function currentPull(context,request) {
  const pull=await request(`/repos/${context.repository}/pulls/${context.number}`);
  if (pull?.state!=='open'||pull.draft!==false||pull.head?.sha!==context.headSha||pull.base?.sha!==context.baseSha||pull.merge_commit_sha!==context.testedSha||!validLogin(pull.user?.login)) throw new Error('Current PR head/base/tested source identity changed or PR is not ready');
  return pull;
}
async function nativeApproval(context,request) {
  const [owner,name]=context.repository.split('/');
  const pull=await currentPull(context,request);
  const decision=await request('/graphql',{body:{query:reviewQuery,variables:{owner,name,number:context.number}}});
  if (decision?.errors?.length||decision?.data?.repository?.pullRequest?.reviewDecision!=='APPROVED') throw new Error('Current native required review approval is missing');
  return pull;
}

async function regularBaseReader(context,request) {
  const commit=await request(`/repos/${context.repository}/git/commits/${context.baseSha}`);
  if(commit?.sha!==context.baseSha||!validSha(commit.tree?.sha))throw new Error('Exact authenticated Git commit tree required');
  const trees=new Map();
  return async ref=>{
    const parts=ref.split('/');if(parts.length>30)throw new Error('Authority path exceeds Git tree depth bound');
    let treeSha=commit.tree.sha;
    for(let index=0;index<parts.length;index++) {
      if(!trees.has(treeSha)) {
        const tree=await request(`/repos/${context.repository}/git/trees/${treeSha}`);
        if(tree?.sha!==treeSha||tree.truncated!==false||!Array.isArray(tree.tree)||tree.tree.length>20000)throw new Error('Complete bounded authenticated Git tree required');
        trees.set(treeSha,tree.tree);
      }
      const matches=trees.get(treeSha).filter(entry=>entry.path===parts[index]);
      if(matches.length!==1||!validSha(matches[0].sha))throw new Error('Unique authenticated Git tree entry required');
      const entry=matches[0],leaf=index===parts.length-1;
      if(leaf) {
        if(entry.type!=='blob'||!['100644','100755'].includes(entry.mode))throw new Error('Regular Git tree blob mode required; symlinks/submodules denied');
        return entry.sha;
      }
      if(entry.type!=='tree'||entry.mode!=='040000')throw new Error('Regular parent Git tree mode required');
      treeSha=entry.sha;
    }
  };
}
async function baseFile(context,ref,request,regularMode) {
  ref=standardsPath(ref);
  if(!/^[a-z\d_.\/-]+$/i.test(ref)||ref==='.')throw new Error('Unsupported authenticated authority source path');
  const blobSha=await regularMode(ref);
  const file=await request(`/repos/${context.repository}/contents/${ref}?ref=${context.baseSha}`);
  if(file?.type!=='file'||file.path!==ref||file.sha!==blobSha||file.encoding!=='base64'||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_BYTES||typeof file.content!=='string'||file.content.length>6*1024*1024||!/^[a-z\d+/=\r\n]+$/i.test(file.content))throw new Error('Bounded authenticated trusted-base file required');
  const encoded=file.content.replace(/[\r\n]/g,''),bytes=Buffer.from(encoded,'base64');
  const actualBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if(bytes.length!==file.size||bytes.toString('base64')!==encoded||actualBlob!==blobSha)throw new Error('Trusted-base file size, canonical base64 or Git blob identity mismatch');
  return bytes;
}
async function protectedOwnerApproval(snapshot,context,request) {
  const pull=await currentPull(context,request),authority=snapshot.reviewAuthority;
  const branchName=pull.base?.ref;
  if(pull.user.type!=='User'||pull.base.repo?.full_name?.toLowerCase()!==context.repository.toLowerCase()||typeof branchName!=='string'||branchName.length>200||!/^[a-z\d_.\/-]+$/i.test(branchName)||branchName.includes('..')||branchName.split('/').some(part=>!part||part==='.'))throw new Error('Authenticated owner and trusted base identity required');
  const branch=await request(`/repos/${context.repository}/branches/${encodeURIComponent(branchName)}`);
  if(branch?.name!==branchName||branch.protected!==true||branch.commit?.sha!==context.baseSha)throw new Error('Current protected trusted base required; PR/local JSON cannot enable solo authority');
  const [owner,name]=context.repository.split('/');
  const decision=await request('/graphql',{body:{query:reviewQuery,variables:{owner,name,number:context.number}}});
  if(decision?.errors?.length||![null,'REVIEW_REQUIRED','APPROVED'].includes(decision?.data?.repository?.pullRequest?.reviewDecision))throw new Error('Outstanding native changes requested or invalid current review decision');
  const regularMode=await regularBaseReader(context,request);
  const source=ref=>baseFile(context,ref,request,regularMode);
  const configRef='.agent/rules/project-config.md',configBytes=await source(configRef);
  const config=parseStandardsConfig(configBytes.toString('utf8'));
  if(config?.enabled!==true||config.adoption?.reviewAuthority?.mode!=='solo-owner')throw new Error('Protected base has no approved solo appointment/configuration');
  const configured=config.adoption.reviewAuthority;
  const trusted=resolveOwnerReviewAuthority(config,await source(configured.policyRef),await source(config.adoption.approvalRef));
  if(JSON.stringify(trusted)!==JSON.stringify(authority)||trusted.repository.toLowerCase()!==context.repository.toLowerCase()||trusted.ownerLogin.toLowerCase()!==pull.user.login.toLowerCase()
    ||snapshot.checks.some(check=>!trusted.scopes.includes(check.scope)||check.key!==`${check.scope}:${check.id}`))throw new Error('Solo owner appointment or configured scope differs from protected base');
  const configInputs=snapshot.inputs?.filter(input=>input.ref===configRef);
  if(configInputs?.length!==1||configInputs[0].digest!==hash(configBytes))throw new Error('PR configuration differs from approved protected base');
  const engines=[['standards.mjs','.agent/tools/standards.mjs'],['standards-checks.mjs','.agent/tools/standards-checks.mjs'],['file-state.mjs','.agent/tools/file-state.mjs'],['../standards/tools/python-manifest.py','.agent/standards/tools/python-manifest.py'],['standards-github-review.mjs','.agent/tools/standards-github-review.mjs']];
  if(!Array.isArray(snapshot.engine)||snapshot.engine.length!==engines.length||new Set(snapshot.engine.map(item=>item.name)).size!==engines.length)throw new Error('Complete trusted standards engine identity required');
  for(const [name,ref] of engines)if(snapshot.engine.find(item=>item.name===name)?.digest!==hash(await source(ref)))throw new Error('PR standards engine differs from protected base');
  const selected=new Set(snapshot.checks.map(check=>check.scope));
  const normativeRefs=new Set([config.core?.ref,...config.scopes.filter(scope=>selected.has(standardsPath(scope.path))).map(scope=>scope.profile?.ref),...(snapshot.rules??[]).map(rule=>rule.source?.split('#')[0])].filter(Boolean).map(standardsPath));
  for(const input of snapshot.inputs??[])if(input.ref.startsWith('.agent/standards/')&&input.ref!==configured.policyRef)normativeRefs.add(input.ref);
  const normative=[...normativeRefs].filter(ref=>ref!==configured.policyRef).map(ref=>{
    const inputs=snapshot.inputs.filter(input=>input.ref===ref);
    if(inputs.length!==1||!validDigest(inputs[0].digest))throw new Error('Complete normative policy identity required');
    return inputs[0];
  });
  if(normative.length>100)throw new Error('Trusted normative input scope exceeds bound');
  for(const input of normative)if(input.digest!==hash(await source(input.ref)))throw new Error('PR normative policy differs from protected base');
  return pull;
}
async function nativeReviews(context,request) {
  const reviews=[];
  for(let page=1;page<=10;page++) {
    const rows=await request(`/repos/${context.repository}/pulls/${context.number}/reviews?per_page=100&page=${page}`);
    if(!Array.isArray(rows)||rows.length>100)throw new Error('Malformed review API response');
    if(rows.some(review=>!Number.isSafeInteger(review?.id)||review.id<1||!validLogin(review.user?.login)))throw new Error('Malformed native review identity');
    reviews.push(...rows);
    if(rows.length<100)return reviews;
  }
  throw new Error('Review history exceeds evidence bound');
}
function latestOwnerReview(reviews,login) {
  return reviews.filter(review=>review.user?.login?.toLowerCase()===login.toLowerCase()&&review.state!=='PENDING').sort((a,b)=>b.id-a.id)[0];
}

function reviewPacket(body) {
  if (typeof body!=='string'||Buffer.byteLength(body)>65536) throw new Error('Review body exceeds bound');
  const blocks=[...body.matchAll(/^```json super-compound-review\s*\r?\n([\s\S]*?)^```\s*$/gm)];
  if (blocks.length!==1) throw new Error('Exactly one actual structured review body required');
  let packet;
  try {packet=JSON.parse(blocks[0][1]);} catch {throw new Error('Invalid structured review JSON');}
  return packet;
}
function ownerAcceptance(authority,context,review,packet) {
  const allowed=['repository','number','testedSha','headSha','baseSha','reviewAuthority','contractVersion','policyDigest','decision','observations'];
  const time=Date.parse(review.submitted_at),now=Date.now();
  if(!packet||typeof packet!=='object'||Array.isArray(packet)||Object.keys(packet).some(key=>!allowed.includes(key))
    ||packet.reviewAuthority!=='owner-self-review'||packet.contractVersion!==authority.contractVersion||packet.policyDigest!==authority.policyDigest||packet.decision!=='accept'
    ||(packet.repository!==undefined&&packet.repository!==context.repository)||(packet.number!==undefined&&packet.number!==context.number)
    ||!Number.isFinite(time)||time>now+1000||time<Date.parse(authority.approvedAt)||now-time>authority.maxAgeHours*3600000||Date.parse(authority.expiresAt)<=now)throw new Error('Current explicit owner-self-review acceptance, context and freshness required');
}

export async function materializeGitHubReviews(snapshot,context,{request=githubRequest(process.env.GITHUB_TOKEN)}={}) {
  const checks=requireIdentity(snapshot,context);
  const solo=snapshot.reviewAuthority!==undefined;
  const pull=await (solo?protectedOwnerApproval(snapshot,context,request):nativeApproval(context,request));
  const reviews=await nativeReviews(context,request);
  const latest=new Map();
  for (const review of reviews) {
    if (solo?review.state==='PENDING':!['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(review.state)) continue;
    const actor=review.user.login.toLowerCase();
    if (!latest.has(actor)||latest.get(actor).id<review.id) latest.set(actor,review);
  }
  const records=new Map();
  for (const review of [...latest.values()].sort((a,b)=>b.id-a.id)) {
    if (review.state!==(solo?'COMMENTED':'APPROVED')||review.commit_id!==context.headSha||review.user.type!=='User'
      ||(solo?review.user.login.toLowerCase()!==snapshot.reviewAuthority.ownerLogin.toLowerCase():review.user.login.toLowerCase()===pull.user.login.toLowerCase())) continue;
    const authority=await request(`/repos/${context.repository}/collaborators/${review.user.login}/permission`);
    if (!['write','maintain','admin'].includes(authority?.permission)) continue;
    if (typeof review.body!=='string'||!review.body.includes('super-compound-review')) continue;
    const packet=reviewPacket(review.body);
    if(solo)ownerAcceptance(snapshot.reviewAuthority,context,review,packet);
    if (!['testedSha','headSha','baseSha'].every(key=>packet[key]===context[key])||!Array.isArray(packet.observations)||!packet.observations.length||packet.observations.length>500) throw new Error('Structured review tested source identity mismatch');
    if (!Number.isFinite(Date.parse(review.submitted_at))||Date.parse(review.submitted_at)>Date.now()+1000) throw new Error('Invalid actual review timestamp');
    const seen=new Set();
    for (const observation of packet.observations) {
      if (!observation||seen.has(observation.checkKey)) throw new Error('Duplicate/malformed review observation');
      seen.add(observation.checkKey);
      const check=checks.find(value=>value.key===observation.checkKey);
      if (!check) throw new Error('Structured review has wrong scope/check identity');
      if (observation.standardsDigest!==snapshot.effectiveStandardsDigest||observation.sourceDigest!==snapshot.sourceDigest||!Array.isArray(observation.steps)||!observation.steps.length||observation.steps.length>100||observation.steps.some(step=>!nonempty(step)||step.length>4000)||!nonempty(observation.observed)||observation.observed.length>16000) throw new Error('Actual reviewed standards/source digest and steps required');
      if (!records.has(check.key)) records.set(check.key,{ref:check.observationRef,observation:{schema:'standards_review_v1',checkKey:check.key,standardsDigest:observation.standardsDigest,sourceDigest:observation.sourceDigest,status:'pass',observer:`github:${review.user.login}`,steps:observation.steps,observed:observation.observed,timestamp:review.submitted_at,provenance:{provider:'github',...context,reviewId:review.id,reviewBodyDigest:hash(review.body),...(solo?{reviewAuthority:'owner-self-review',contractVersion:snapshot.reviewAuthority.contractVersion,policyDigest:snapshot.reviewAuthority.policyDigest,appointmentDigest:snapshot.reviewAuthority.approvalDigest,nativeState:'COMMENTED'}:{})}}});
    }
  }
  if (records.size!==checks.length) throw new Error('Every required scope needs an authorized current human review');
  if(solo) {
    await protectedOwnerApproval(snapshot,context,request);
    const permission=await request(`/repos/${context.repository}/collaborators/${snapshot.reviewAuthority.ownerLogin}/permission`);
    const latest=latestOwnerReview(await nativeReviews(context,request),snapshot.reviewAuthority.ownerLogin);
    if(!['write','maintain','admin'].includes(permission?.permission)||!latest||latest.user.type!=='User'||latest.state!=='COMMENTED'||latest.commit_id!==context.headSha
      ||[...records.values()].some(record=>record.observation.provenance.reviewId!==latest.id||record.observation.provenance.reviewBodyDigest!==hash(latest.body)||record.observation.timestamp!==latest.submitted_at))throw new Error('Owner review changed, revoked or lost authority during verification');
    ownerAcceptance(snapshot.reviewAuthority,context,latest,reviewPacket(latest.body));
  } else await nativeApproval(context,request);
  return checks.map(check=>records.get(check.key));
}

export async function writeGitHubReviews(root,snapshot,context,{request,verify=false}={}) {
  const records=await materializeGitHubReviews(snapshot,context,{request});
  for (const {ref,observation} of records) {
    if (verify) {
      const actual=JSON.parse(await readBoundedFile(root,ref,{encoding:'utf8',maxBytes:MAX_BYTES}));
      if (JSON.stringify(actual)!==JSON.stringify(observation)) throw new Error('Review artifact is stale or differs from authenticated native approval');
    } else await writeFileAtomic(root,ref,JSON.stringify(observation,null,2)+'\n',{maxBytes:MAX_BYTES});
  }
  return {allowed:true,reviewCount:records.length,testedSha:context.testedSha,...(snapshot.reviewAuthority?{reviewAuthority:'owner-self-review',nativeApproval:false}:{})};
}

async function main() {
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--verify') {if(options.verify)throw new Error('Duplicate argument');options.verify=true;continue;}
    if(!['--snapshot','--root'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--')||options[args[i]])throw new Error('Expected --snapshot <ref> [--root <evidence-directory>] [--verify]');
    options[args[i]]=args[++i];
  }
  if(!options['--snapshot'])throw new Error('Snapshot argument required');
  const root=path.resolve(options['--root']??process.cwd());
  const snapshot=JSON.parse(await readBoundedFile(root,options['--snapshot'],{encoding:'utf8',maxBytes:MAX_BYTES}));
  const context={repository:process.env.GITHUB_REPOSITORY,number:Number(process.env.STANDARDS_PR_NUMBER),testedSha:process.env.STANDARDS_TESTED_SHA,headSha:process.env.STANDARDS_HEAD_SHA,baseSha:process.env.STANDARDS_BASE_SHA};
  console.log(JSON.stringify(await writeGitHubReviews(root,snapshot,context,{verify:options.verify})));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
