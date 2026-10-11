import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {materializeGitHubReviews,writeGitHubReviews,githubRequest} from './standards-github-review.mjs';
import {resolveOwnerReviewAuthority} from './standards.mjs';
import {fixtureGitDatabase} from './standards-fixture.test-support.mjs';

test('native client accepts its bounded pagination query and encoded base branch route', async t => {
  const original=globalThis.fetch,calls=[];
  t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response('[]',{status:200});};
  const request=githubRequest('fixture-only-token');
  assert.deepEqual(await request('/repos/acme/app/pulls/7/reviews?per_page=100&page=1'),[]);
  assert.deepEqual(await request('/repos/acme/app/branches/release%2Fstable'),[]);
  assert.equal(calls[0].url,'https://api.github.com/repos/acme/app/pulls/7/reviews?per_page=100&page=1');
  assert.equal(calls[0].options.method,'GET');
  for(const route of ['/repos/acme/app/branches/%2F..%2Fmain','/repos/acme/app?redirect=https://evil.invalid','/repos/acme/app?token=abc%26x'])await assert.rejects(request(route),/route/i);
});

const sha = character => character.repeat(40);
const digest = character => character.repeat(64);
function fixture() {
  const context = {repository:'acme/app',number:7,testedSha:sha('a'),headSha:sha('b'),baseSha:sha('c')};
  const snapshot = {schema:'effective_standards_v1',status:'ready',gitHead:context.testedSha,effectiveStandardsDigest:digest('d'),sourceDigest:digest('e'),checks:[
    {key:'apps/web:review',kind:'manual',id:'review',scope:'apps/web',ruleIds:['CORE-REVIEW'],waivedRules:[],observationRef:'.scratch/standards/reviews/web.json'},
  ]};
  const body = 'Reviewed the actual scope.\n\n```json super-compound-review\n' + JSON.stringify({...context,observations:[{checkKey:'apps/web:review',standardsDigest:snapshot.effectiveStandardsDigest,sourceDigest:snapshot.sourceDigest,steps:['Inspect service and errors','Inspect actual tests'],observed:'Behavior and design verified against the task.'}]}) + '\n```';
  const pull = {state:'open',draft:false,head:{sha:context.headSha},base:{sha:context.baseSha},merge_commit_sha:context.testedSha,user:{login:'author'}};
  const reviews = [{id:11,state:'APPROVED',commit_id:context.headSha,body,submitted_at:'2026-10-01T10:00:00Z',user:{login:'reviewer',type:'User'}}];
  let decision = 'APPROVED',permission = 'write';
  const request = async (route,options) => {
    if (route === '/graphql') return {data:{repository:{pullRequest:{reviewDecision:decision}}}};
    if (route.endsWith('/pulls/7')) return structuredClone(pull);
    if (route.includes('/reviews?')) return structuredClone(reviews);
    if (route.endsWith('/collaborators/reviewer/permission')) return {permission};
    throw new Error('Unexpected API request: '+route);
  };
  return {context,snapshot,pull,reviews,request,setDecision:value=>decision=value,setPermission:value=>permission=value};
}

// Authenticated-service fixtures only; not a native appointment or live owner review.
async function soloFixture() {
  const f = fixture(), now = Date.now();
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const policy = Buffer.from('# SOLO-OWNER/1.0.0\nFixture-only policy.\n');
  const appointment = {schema:'standards_owner_appointment_v1',contractVersion:'1.0.0',status:'approved',owner:'Fixture Owner',ownerLogin:'author',repository:f.context.repository,scopes:['apps/web'],policyDigest:hash(policy),approvedAt:new Date(now-3600000).toISOString(),expiresAt:new Date(now+86400000).toISOString()};
  const approval = Buffer.from(JSON.stringify(appointment));
  const config = {schema:'project_standards_v1',enabled:true,scopes:[{path:'apps/web'}],adoption:{owner:appointment.owner,approvalRef:'docs/appointment.json',approvalDigest:hash(approval),reviewAuthority:{mode:'solo-owner',contractVersion:'1.0.0',policyRef:'.agent/standards/solo-owner.md',policyDigest:hash(policy),provider:'github',ownerLogin:'author',expiresAt:appointment.expiresAt}}};
  const configBytes = Buffer.from('```json super-compound-standards\n'+JSON.stringify(config)+'\n```\n');
  f.snapshot.reviewAuthority = resolveOwnerReviewAuthority(config,policy,approval);
  f.snapshot.inputs = [{ref:'.agent/rules/project-config.md',digest:hash(configBytes)}];
  f.snapshot.engine = [];
  const contents = new Map([
    ['.agent/rules/project-config.md',configBytes], ['.agent/standards/solo-owner.md',policy], ['docs/appointment.json',approval],
  ]);
  for (const [name,ref] of [['standards.mjs','.agent/tools/standards.mjs'],['standards-checks.mjs','.agent/tools/standards-checks.mjs'],['file-state.mjs','.agent/tools/file-state.mjs'],['../standards/tools/python-manifest.py','.agent/standards/tools/python-manifest.py'],['standards-github-review.mjs','.agent/tools/standards-github-review.mjs']]) {
    const bytes = await readFile(new URL('../../'+ref,import.meta.url));
    contents.set(ref,bytes); f.snapshot.engine.push({name,digest:hash(bytes)});
  }
  f.pull.user.type = 'User'; f.pull.base.ref = 'main'; f.pull.base.repo = {full_name:f.context.repository};
  const branch = {name:'main',protected:true,commit:{sha:f.context.baseSha}};
  const packet = {...f.context,reviewAuthority:'owner-self-review',contractVersion:'1.0.0',policyDigest:hash(policy),decision:'accept',observations:[{checkKey:'apps/web:review',standardsDigest:f.snapshot.effectiveStandardsDigest,sourceDigest:f.snapshot.sourceDigest,steps:['Actual-code boundary represented by fixture only'],observed:'Fixture self-review; not a human action.'}]};
  f.reviews[0] = {...f.reviews[0],state:'COMMENTED',user:{login:'author',type:'User'},submitted_at:new Date(now-1000).toISOString(),body:'```json super-compound-review\n'+JSON.stringify(packet)+'\n```'};
  const permission = {permission:'admin'}, calls = [];
  const request = async (route,options) => {
    calls.push(route);
    const database=fixtureGitDatabase(contents,f.context.baseSha),gitResponse=database.response(route);
    if(gitResponse)return structuredClone(gitResponse);
    if (route.endsWith('/branches/main')) return structuredClone(branch);
    if (route.includes('/contents/')) {
      const parts = route.split('/contents/')[1].split('?');
      assert.equal(parts[1], 'ref='+f.context.baseSha, 'authority must be fetched at exact trusted base SHA');
      const bytes = contents.get(parts[0]);
      if (!bytes) throw new Error('Fixture source missing: '+parts[0]);
      return {type:'file',path:parts[0],sha:database.blobs.get(parts[0]),encoding:'base64',size:bytes.length,content:bytes.toString('base64')};
    }
    if (route.endsWith('/collaborators/author/permission')) return structuredClone(permission);
    return f.request(route,options);
  };
  return {...f,config,appointment,contents,branch,packet,permission,calls,request,setPacket:value=>{f.reviews[0].body='```json super-compound-review\n'+JSON.stringify(value)+'\n```';}};
}
function syncSoloAppointment(f) {
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const approval=Buffer.from(JSON.stringify(f.appointment));
  f.contents.set('docs/appointment.json',approval);
  f.config.adoption.approvalDigest=hash(approval);
  const configBytes=Buffer.from('```json super-compound-standards\n'+JSON.stringify(f.config)+'\n```\n');
  f.contents.set('.agent/rules/project-config.md',configBytes);
  f.snapshot.inputs[0].digest=hash(configBytes);
  f.snapshot.reviewAuthority=resolveOwnerReviewAuthority(f.config,f.contents.get('.agent/standards/solo-owner.md'),approval);
}

test('explicit solo owner uses protected current base and real-service COMMENTED fixture without native approval claims', async () => {
  const f = await soloFixture(); f.setDecision('REVIEW_REQUIRED');
  const records = await materializeGitHubReviews(f.snapshot,f.context,{request:f.request});
  assert.equal(records.length,1);
  assert.equal(records[0].observation.observer,'github:author');
  assert.equal(records[0].observation.provenance.reviewAuthority,'owner-self-review');
  assert.equal(records[0].observation.provenance.nativeState,'COMMENTED');
  assert.equal(records[0].observation.provenance.appointmentDigest,f.snapshot.reviewAuthority.approvalDigest);
  assert.ok(f.calls.includes('/graphql'),'inspect outstanding rejection without requiring owner native APPROVED');
  assert.ok(f.calls.filter(route=>route.endsWith('/branches/main')).length>=2,'base protection must be freshly rechecked');
});

test('solo trust bootstrap denies unprotected base, PR-only policy, actors, engine and current source conflicts', async () => {
  for (const mutate of [
    f=>f.branch.protected=false, f=>f.branch.commit.sha=sha('f'), f=>f.pull.user.type='Bot',
    f=>f.pull.user.login='other-author', f=>f.pull.draft=true, f=>f.pull.state='closed',
    f=>f.pull.base.repo.full_name='other/app', f=>f.snapshot.reviewAuthority.ownerLogin='other-owner',
    f=>f.snapshot.reviewAuthority.mode='unknown', f=>f.snapshot.reviewAuthority.contractVersion='2.0.0',
    f=>f.contents.set('.agent/rules/project-config.md',Buffer.from('No opt-in on trusted base.')),
    f=>f.contents.set('.agent/standards/solo-owner.md',Buffer.from('Changed policy')),
    f=>f.contents.set('docs/appointment.json',Buffer.from('Revoked appointment')),
    f=>f.snapshot.engine[0].digest=digest('f'), f=>f.snapshot.inputs[0].digest=digest('f'),
    f=>f.snapshot.checks[0].scope='services/api', f=>f.setDecision('CHANGES_REQUESTED'),
  ]) {
    const f=await soloFixture(); mutate(f);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}));
  }
  const f=await soloFixture();
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:async(route,options)=>route.includes('/contents/')?{type:'symlink',encoding:'base64',size:1,content:'eA=='}:f.request(route,options)}),/trusted.base/i);
});

test('solo latest owner action and exact current scoped inspection are mandatory', async () => {
  for (const mutate of [
    f=>f.reviews.push({...f.reviews[0],id:12,body:'Unstructured later comment'}),
    f=>f.reviews.push({...f.reviews[0],id:12,state:'DISMISSED'}),
    f=>f.reviews[0].user.type='Bot', f=>f.reviews[0].user.login='other-reviewer',
    f=>f.permission.permission='read', f=>f.reviews[0].commit_id=sha('f'),
    f=>f.reviews[0].submitted_at=new Date(Date.now()-25*3600000).toISOString(),
    f=>f.reviews[0].submitted_at=new Date(Date.now()+3600000).toISOString(),
    f=>f.setPacket({...f.packet,decision:'reject'}), f=>f.setPacket({...f.packet,decision:'revoke'}),
    f=>f.setPacket({...f.packet,reviewAuthority:'independent'}),
    f=>f.setPacket({...f.packet,policyDigest:digest('f')}),
    f=>f.setPacket({...f.packet,observations:[{...f.packet.observations[0],checkKey:'services/api:review'}]}),
    f=>f.setPacket({...f.packet,observations:[{...f.packet.observations[0],steps:[]}]}),
    f=>f.setPacket({...f.packet,observations:[]}),
  ]) {
    const f=await soloFixture();mutate(f);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}));
  }
});

test('solo authorization re-fetch rejects changes during materialization rather than reusing stale accept', async () => {
  for (const mutate of [
    f=>f.branch.protected=false, f=>f.pull.head.sha=sha('f'),
    f=>f.permission.permission='read', f=>f.setDecision('CHANGES_REQUESTED'),
    f=>f.contents.set('docs/appointment.json',Buffer.from('Revoked')),
    f=>f.reviews.push({...f.reviews[0],id:12,body:'Revoke previous self-review'}),
    f=>f.reviews[0].body+='Edited after materialization',
  ]) {
    const f=await soloFixture();let pullReads=0;
    const request=async(route,options)=>{if(route.endsWith('/pulls/7')&&++pullReads===2)mutate(f);return f.request(route,options);};
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}));
  }
});

test('solo normative rule sources outside the standards directory cannot change from the trusted base', async () => {
  const f=await soloFixture();
  f.snapshot.rules=[{id:'CORE-REVIEW',source:'docs/custom-rules.md#review'}];
  f.snapshot.inputs.push({ref:'docs/custom-rules.md',digest:digest('f')});
  f.contents.set('docs/custom-rules.md',Buffer.from('Actual trusted normative source'));
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/normative.*policy/i);
});

test('solo final review fetch rejects malformed native identities instead of falling back to older accept', async () => {
  const f=await soloFixture();let reads=0;
  const request=async(route,options)=>{
    const response=await f.request(route,options);
    if(route.includes('/reviews?')&&++reads===2)response.push({...response[0],id:NaN,body:'Malformed later revocation'});
    return response;
  };
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}),/native.*identity|review/i);
});

test('solo final review fetch rechecks review age after authenticated calls', async t => {
  const f=await soloFixture(),original=Date.now,now=original();t.after(()=>{Date.now=original;});
  f.appointment.approvedAt=new Date(now-25*3600000).toISOString();syncSoloAppointment(f);
  f.reviews[0].submitted_at=new Date(now-24*3600000+1000).toISOString();let reads=0;
  const request=async(route,options)=>{const response=await f.request(route,options);if(route.includes('/reviews?')&&++reads===2)Date.now=()=>now+2000;return response;};
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}),/fresh|acceptance/i);
});

test('solo native packet repository and pull number cannot contradict authenticated context', async () => {
  for(const patch of [{repository:'other/app'},{number:8}]) {
    const f=await soloFixture();f.setPacket({...f.packet,...patch});
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/identity|context|acceptance/i);
  }
});

test('solo authenticated contents rejects noncanonical base64 rather than accepting ignored trailing padding', async () => {
  const f=await soloFixture();
  const request=async(route,options)=>{const response=await f.request(route,options);if(route.includes('/contents/'))response.content+='===';return response;};
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}),/base64|trusted.base/i);
});

test('solo native tree mode rejects symlinks even when Contents returns a regular target file', async () => {
  const f=await soloFixture();
  const request=async(route,options)=>{
    if(route.includes('/git/commits/'))return {sha:f.context.baseSha,tree:{sha:sha('1')}};
    if(route.endsWith('/git/trees/'+sha('1')))return {sha:sha('1'),truncated:false,tree:[{path:'.agent',mode:'040000',type:'tree',sha:sha('2')}]};
    if(route.endsWith('/git/trees/'+sha('2')))return {sha:sha('2'),truncated:false,tree:[{path:'rules',mode:'040000',type:'tree',sha:sha('3')}]};
    if(route.endsWith('/git/trees/'+sha('3')))return {sha:sha('3'),truncated:false,tree:[{path:'project-config.md',mode:'120000',type:'blob',sha:sha('4')}]};
    return f.request(route,options);
  };
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}),/regular.*mode|Git.*tree/i);
});

test('solo exact-base Git tree traversal denies missing, duplicate, truncated, aliased and wrong blob evidence', async () => {
  for(const mutate of [
    (route,value)=>{if(route.includes('/git/commits/'))value.sha=sha('f');},
    (route,value)=>{if(route.includes('/git/commits/'))value.tree.sha='bad';},
    (route,value)=>{if(route.includes('/git/trees/'))value.sha=sha('f');},
    (route,value)=>{if(route.includes('/git/trees/'))value.truncated=true;},
    (route,value)=>{if(route.includes('/git/trees/'))value.tree=null;},
    (route,value)=>{if(route.includes('/git/trees/'))value.tree=[];},
    (route,value)=>{if(route.includes('/git/trees/'))value.tree.push({...value.tree[0]});},
    (route,value)=>{if(route.includes('/git/trees/'))value.tree=Array(20001).fill(value.tree[0]);},
    (route,value)=>{if(route.includes('/git/trees/'))for(const entry of value.tree)if(entry.path==='.agent')entry.mode='120000';},
    (route,value)=>{if(route.includes('/git/trees/'))for(const entry of value.tree)if(entry.path==='project-config.md'){entry.mode='160000';entry.type='commit';}},
    (route,value)=>{if(route.includes('/git/trees/'))for(const entry of value.tree)if(entry.path==='project-config.md'){entry.mode='040000';entry.type='tree';}},
    (route,value)=>{if(route.includes('/contents/'))value.sha=sha('f');},
    (route,value)=>{if(route.includes('/contents/')){const bytes=Buffer.from('Different bytes');value.content=bytes.toString('base64');value.size=bytes.length;}},
  ]) {
    const f=await soloFixture();
    const request=async(route,options)=>{assert.equal(route.includes('recursive='),false,'only nonrecursive path metadata');const value=await f.request(route,options);mutate(route,value);return value;};
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request}));
  }
});

test('solo authority mode checks do not ban unrelated tree siblings or Unicode names', async () => {
  const f=await soloFixture();
  const request=async(route,options)=>{
    const response=await f.request(route,options);
    if(route.includes('/git/trees/'))response.tree.push({path:'unrelated-link',mode:'120000',type:'blob',sha:sha('f')},{path:'other-module',mode:'160000',type:'commit',sha:sha('e')},{path:'unicode-\u00e9',mode:'100644',type:'blob',sha:sha('d')});
    return response;
  };
  assert.equal((await materializeGitHubReviews(f.snapshot,f.context,{request})).length,1);
});

test('solo fresh native verification rejects forged, relabelled, edited or revoked artifacts', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'sc-solo-native-review-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const f=await soloFixture();
  const result=await writeGitHubReviews(root,f.snapshot,f.context,{request:f.request});
  assert.equal(result.reviewAuthority,'owner-self-review');assert.equal(result.nativeApproval,false);
  await writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true});
  const ref=path.join(root,f.snapshot.checks[0].observationRef),original=JSON.parse(await readFile(ref,'utf8'));
  for(const mutate of [value=>delete value.provenance.reviewAuthority,value=>value.observer='github:independent-reviewer',value=>value.provenance.appointmentDigest=digest('f')]) {
    const forged=structuredClone(original);mutate(forged);await writeFile(ref,JSON.stringify(forged));
    await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/stale|authenticated/i);
  }
  await writeFile(ref,JSON.stringify(original));f.reviews[0].body+='\nEdited native review';
  await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/stale|authenticated/i);
  f.reviews.push({...f.reviews[0],id:12,body:'Revoked the previous self-review'});
  await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/review/i);
});

test('authenticated native approvals materialize existing review observations with exact provenance', async () => {
  const f=fixture(), records=await materializeGitHubReviews(f.snapshot,f.context,{request:f.request});
  assert.equal(records.length,1);
  assert.equal(records[0].ref,f.snapshot.checks[0].observationRef);
  assert.equal(records[0].observation.schema,'standards_review_v1');
  assert.equal(records[0].observation.observer,'github:reviewer');
  assert.equal(records[0].observation.timestamp,f.reviews[0].submitted_at);
  assert.deepEqual(records[0].observation.provenance,{provider:'github',...f.context,reviewId:11,reviewBodyDigest:records[0].observation.provenance.reviewBodyDigest});
  assert.match(records[0].observation.provenance.reviewBodyDigest,/^[a-f0-9]{64}$/);
});

test('native review decision and actual reviewer authority are mandatory', async () => {
  for (const decision of [null,'REVIEW_REQUIRED','CHANGES_REQUESTED']) {
    const f=fixture();f.setDecision(decision);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/native.*approval/i);
  }
  for (const permission of ['read','triage','none']) {
    const f=fixture();f.setPermission(permission);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/authorized.*review/i);
  }
  for (const mutate of [f=>f.reviews[0].user.login='author',f=>f.reviews[0].user.type='Bot',f=>f.reviews[0].state='DISMISSED',f=>f.reviews[0].state='CHANGES_REQUESTED']) {
    const f=fixture();mutate(f);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/review/i);
  }
});

test('changed head, base, tested source, review commit and digest invalidate approval', async () => {
  for (const mutate of [f=>f.pull.head.sha=sha('f'),f=>f.pull.base.sha=sha('f'),f=>f.pull.merge_commit_sha=sha('f'),f=>f.snapshot.gitHead=sha('f'),f=>f.reviews[0].commit_id=sha('f'),f=>f.snapshot.sourceDigest=digest('f'),f=>f.snapshot.effectiveStandardsDigest=digest('f')]) {
    const f=fixture();mutate(f);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/identity|review|source|digest/i);
  }
  const f=fixture();f.reviews.push({...f.reviews[0],id:12,state:'DISMISSED'});
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/review/i);
});

test('malformed, missing, unbounded and duplicate review bodies fail closed', async () => {
  for (const body of ['', '```json super-compound-review\n{}\n```','```json super-compound-review\nnot json\n```','x'.repeat(70000)]) {
    const f=fixture();f.reviews[0].body=body;
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/review|bound/i);
  }
  const f=fixture();f.reviews[0].body+='\n'+f.reviews[0].body;
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/review/i);
});

test('untrusted repository, identity, observation path and API failures are rejected before writes', async () => {
  for (const mutate of [f=>f.context.repository='acme/app/../../evil',f=>f.context.number=0,f=>f.context.testedSha='abc',f=>f.snapshot.checks[0].observationRef='../outside.json',f=>f.snapshot.checks[0].observationRef='.scratch/standards/ci/snapshot.json',f=>f.snapshot.checks[0].observationRef='.scratch/standards/reviews/../outside.json']) {
    const f=fixture();mutate(f);
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}));
  }
  const f=fixture();await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:async()=>{throw new Error('Unavailable authenticated API')}}),/Unavailable/);
});

test('fresh API rereview rejects fabricated, edited or dismissed artifacts rather than trusting author JSON', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'sc-github-review-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const f=fixture();await writeGitHubReviews(root,f.snapshot,f.context,{request:f.request});
  await writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true});
  const before=JSON.parse(await readFile(path.join(root,f.snapshot.checks[0].observationRef),'utf8'));
  assert.equal(before.provenance.reviewId,11);
  await writeFile(path.join(root,f.snapshot.checks[0].observationRef),JSON.stringify({...before,observer:'github:author'}));
  await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/stale|authenticated/i);
  await writeFile(path.join(root,f.snapshot.checks[0].observationRef),JSON.stringify(before));
  f.reviews[0].body=f.reviews[0].body.replace('Behavior and design verified','Edited after original approval');
  await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/stale|authenticated/i);
  f.reviews[0].state='DISMISSED';
  await assert.rejects(writeGitHubReviews(root,f.snapshot,f.context,{request:f.request,verify:true}),/review/i);
});

test('malformed manual checks cannot omit required authenticated review', async () => {
  const f=fixture();delete f.snapshot.checks[0].waivedRules;delete f.snapshot.checks[0].ruleIds;
  f.reviews.length=0;
  await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/required.*review/i);
});

test('duplicate waiver and rule identities cannot suppress another required review', async () => {
  for (const duplicateRules of [false,true]) {
    const f=fixture();
    f.snapshot.checks.push({...f.snapshot.checks[0],key:'services/api:review',observationRef:'.scratch/standards/reviews/api.json',ruleIds:duplicateRules?['CORE-REVIEW','CORE-REVIEW']:['CORE-REVIEW','OTHER-REVIEW'],waivedRules:['CORE-REVIEW','CORE-REVIEW']});
    await assert.rejects(materializeGitHubReviews(f.snapshot,f.context,{request:f.request}),/required.*review/i);
  }
});

test('authenticated API client never follows an untrusted URL or exposes raw error bodies', async t => {
  const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;});
  const calls=[];
  globalThis.fetch=async (url,options)=>{calls.push({url,options});return new Response('{"permission":"write"}',{status:200});};
  const request=githubRequest('test-secret');
  assert.deepEqual(await request('/repos/acme/app/collaborators/reviewer/permission'),{permission:'write'});
  assert.equal(calls[0].url,'https://api.github.com/repos/acme/app/collaborators/reviewer/permission');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.headers.Authorization,'Bearer test-secret');
  for (const route of ['https://evil.example/api','//evil.example/api','/repos/acme/app/../other','/graphql?token=secret']) await assert.rejects(request(route));
  assert.equal(calls.length,1);
  globalThis.fetch=async ()=>new Response('RAW SECRET ERROR BODY',{status:403});
  await assert.rejects(request('/repos/acme/app/pulls/7'),error=>error.message==='Authenticated GitHub API failed (403)');
  assert.throws(()=>githubRequest('bad\ntoken'));
});

test('oversized authenticated API data fails closed', async t => {
  const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;});
  globalThis.fetch=async ()=>new Response('x'.repeat(4*1024*1024+1),{status:200});
  await assert.rejects(githubRequest('test-secret')('/repos/acme/app/pulls/7'),/bound/);
});
