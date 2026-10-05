import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.SC_CONTEXT_TEST_ROOT ?? process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('resident preflight and covered checks do not cause universal full-load',()=>{
  const preflight=read('.agent/skills/executing-plans/references/authority-and-workspace.md');
  assert.match(preflight,/reuse resident/i);
  assert.match(preflight,/missing fact/);
  const index=read('.agent/context/skill-index.md');
  assert.doesNotMatch(index,/When a task reaches implementation.*read the full/s);
  assert.match(index,/mandatory checks.*authority/s);
  const core=read('.agent/context/skills/sc-work.contract.md');
  for(const marker of ['acceptance','boundaries','RED','GREEN','fingerprints','integration-checking','reportPath','EXCEPTION_APPROVED']) assert.ok(core.includes(marker),marker);
});
test('large windows preserve summary-first and session models inherit',()=>{
  const depth=read('.agent/skills/context-engineering/references/read-depth.md');
  assert.doesNotMatch(depth,/Full body permitted/);
  assert.match(depth,/All windows use summary-first/);
  const models=JSON.parse(read('.agent/context/agent-models.json'));
  assert.equal(models.schema,'agent_models_v1');
  for(const roles of Object.values(models.hosts)) assert.ok(Object.values(roles).every(m=>m==='inherit'));
});
test('simple checkpoint retains boundaries while complex details load conditionally',()=>{
  const checkpoint=read('.agent/context/checkpoint.contract.md');
  for(const marker of ['stable Q<n>','all ready','revision','evidence','resume','Silence','resolution','detailed package']) assert.ok(checkpoint.includes(marker),marker);
  assert.match(checkpoint,/For a simple need use a short item/);
  assert.match(read('.agent/skills/checkpoint-protocol/references/answerable-package.md'),/Bahan review:/);
});
