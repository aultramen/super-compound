import {mkdir, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Deterministic Git API metadata only, not a real repository tree or human authority.
export function fixtureGitDatabase(contents, commitSha) {
  const blobs=new Map(),directories=new Map([['',new Map()]]),trees=new Map();
  for(const [ref,bytes] of contents) {
    const parts=ref.split('/'),name=parts.pop();let directory='';
    const sha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');blobs.set(ref,sha);
    for(const part of parts) {const next=directory?directory+'/'+part:part;if(!directories.has(next))directories.set(next,new Map());directories.get(directory).set(part,{path:part,mode:'040000',type:'tree',directory:next});directory=next;}
    directories.get(directory).set(name,{path:name,mode:'100644',type:'blob',sha});
  }
  const hashes=new Map();
  for(const directory of [...directories.keys()].sort((a,b)=>b.split('/').length-a.split('/').length||b.length-a.length)) {
    const tree=[...directories.get(directory).values()].map(({directory:child,...entry})=>child===undefined?entry:{...entry,sha:hashes.get(child)});
    const sha=createHash('sha1').update(JSON.stringify(tree)).digest('hex');hashes.set(directory,sha);trees.set(sha,{sha,truncated:false,tree});
  }
  return {blobs,response:route=>route.endsWith('/git/commits/'+commitSha)?{sha:commitSha,tree:{sha:hashes.get('')}}:route.includes('/git/trees/')?trees.get(route.split('/git/trees/')[1]):undefined};
}
export async function put(root, ref, content) {
  await mkdir(path.dirname(path.join(root, ref)), {recursive: true});
  await writeFile(path.join(root, ref), typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
}
export async function configure(root, config) {
  await put(root, '.agent/rules/project-config.md', '# Project Configuration\n\n```yaml\nmonorepo: true\n```\n\n```json super-compound-standards\n' + JSON.stringify(config, null, 2) + '\n```\n');
}
export async function standardsFixture(root) {
  await put(root, 'docs/standards-approval.md', '# Owner approval\nFixture approval only.\n');
  await put(root, '.agent/standards/core.md', '# Core\n\n## Tests\nRequire actual outcomes.\n');
  const core = {schema: 'standards_bundle_v1', id: 'core', version: '1.0.0', rules: [
    {id: 'CORE-TEST', level: 'mandatory', owner: 'Engineering', source: '.agent/standards/core.md#tests', check: 'test'},
  ]};
  const pin = async (ref, bundle) => {
    await put(root, ref, bundle);
    return {ref, version: bundle.version, digest: hash(await readFile(path.join(root, ref)))};
  };
  const corePin = await pin('.agent/standards/core.json', core);
  const scope = async (directory, id, dependency, version) => {
    const manifest = dependency === 'next' ? 'package.json' : 'pyproject.toml';
    await put(root, `${directory}/${manifest}`, dependency === 'next' ? {dependencies: {next: version}} : `[project]\ndependencies = ["fastapi==${version}"]\n`);
    await put(root, `${directory}/src/service.txt`, 'existing service\n');
    const profile = {schema: 'standards_bundle_v1', id, version: '1.0.0', framework: {name: dependency === 'next' ? 'nextjs' : 'fastapi', language: dependency === 'next' ? 'typescript' : 'python', manifest, dependency}, rules: []};
    const profilePin = await pin(`.agent/standards/profiles/${id}.json`, profile);
    const resultRef = `.scratch/outcomes/${id}.json`;
    return {path: directory, profile: profilePin, frameworkVersion: version, configRefs: [`${directory}/${manifest}`], checks: {test: {
      command: process.execPath,
      args: ['-e', 'const fs=require("fs"),assert=require("assert/strict");let passed=0,failed=0;try{assert.equal(2+2,4);passed++}catch{failed++}fs.mkdirSync(".scratch/outcomes",{recursive:true});fs.writeFileSync(' + JSON.stringify(resultRef) + ',JSON.stringify({schema:"standards_check_outcome_v1",status:failed?"fail":"pass",observed:"arithmetic assertion",counts:{total:passed+failed,passed,failed,skipped:0}}))'],
      cwd: '.', tool: {command: process.execPath, args: ['--version'], version: process.version}, resultRef,
    }}};
  };
  const config = {schema: 'project_standards_v1', enabled: true, core: corePin,
    adoption: {owner: 'Engineering', approvalRef: 'docs/standards-approval.md', approvalDigest: hash(await readFile(path.join(root, 'docs/standards-approval.md')))},
    scopes: [await scope('apps/web', 'nextjs-typescript', 'next', '16.0.0'), await scope('services/api', 'fastapi-python', 'fastapi', '0.119.0')], exceptions: []};
  await configure(root, config);
  return config;
}

// Deterministic fixture only: never a real owner appointment or live review.
export async function soloStandardsFixture(root, {now = new Date()} = {}) {
  const config = await standardsFixture(root);
  config.scopes = [config.scopes[0]];
  config.scopes[0].checks.review = {method: 'manual', observationRef: '.scratch/standards/reviews/web.json'};
  const core = JSON.parse(await readFile(path.join(root, config.core.ref), 'utf8'));
  core.rules.push({id: 'CORE-REVIEW', level: 'mandatory', owner: 'Engineering', source: '.agent/standards/core.md#tests', check: 'review'});
  await put(root, config.core.ref, core);
  config.core.digest = hash(await readFile(path.join(root, config.core.ref)));
  const policyRef = '.agent/standards/solo-owner.md';
  await put(root, policyRef, '# SOLO-OWNER/1.0.0\nFixture-only policy, not adoption.\n');
  const policyDigest = hash(await readFile(path.join(root, policyRef)));
  const approvedAt = new Date(new Date(now).getTime() - 3600000).toISOString();
  const expiresAt = new Date(new Date(now).getTime() + 2 * 86400000).toISOString();
  const appointment = {schema: 'standards_owner_appointment_v1', contractVersion: '1.0.0', status: 'approved',
    owner: 'Fixture Owner', ownerLogin: 'fixture-owner', repository: 'acme/app', scopes: ['apps/web'],
    policyDigest, approvedAt, expiresAt};
  await put(root, config.adoption.approvalRef, appointment);
  config.adoption.owner = appointment.owner;
  config.adoption.approvalDigest = hash(await readFile(path.join(root, config.adoption.approvalRef)));
  config.adoption.reviewAuthority = {mode: 'solo-owner', contractVersion: '1.0.0', policyRef, policyDigest,
    provider: 'github', ownerLogin: appointment.ownerLogin, expiresAt};
  await configure(root, config);
  return config;
}
