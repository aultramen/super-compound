import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {measureLoads, evaluatePairs} from './context-load.mjs';
import {seedContextFixtures} from './context-fixtures.mjs';
import {spawnSync} from 'node:child_process';

test('range replay counts cumulative payloads and warm reuse without conflating host context', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'context-load-'));
  try {
    await writeFile(path.join(root, 'contract.md'), 'one\ntwo\nthree\n');
    const read = {path:'contract.md', start:1, end:2, reason:'authority', phase:'cold-entry', source:'framework'};
    const a = await measureLoads(root, [read, {...read, phase:'execution'}, {...read, phase:'warm-reuse', reused:true}, {...read, source:'host'}]);
    assert.equal(a.framework.reads, 2);
    assert.equal(a.framework.tokens, a.loads[0].tokens * 2);
    assert.equal(a.framework.repeatedTokens, a.loads[0].tokens);
    assert.equal(a.host.reads, 1);
    assert.equal(a.phases['warm-reuse'].tokens, 0);
    assert.deepEqual(await measureLoads(root, [read]), await measureLoads(root, [read]));
    await assert.rejects(measureLoads(root, [{...read, path:'../outside'}]), /path/i);
    await assert.rejects(measureLoads(root, [{...read, end:20}]), /range/i);
    await assert.rejects(measureLoads(root, [{...read, digest:'wrong'}]), /digest/i);
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('runtime gate requires all fixtures, balanced pairs, provenance and correctness', () => {
  assert.equal(evaluatePairs([]).status, 'UNPROVEN');
  const fixtures = ['consultation','light-edit','fsd-execution','debugging','review','multi-goal-resume'];
  const pairs = fixtures.flatMap(fixture => Array.from({length:6}, (_, i) => ({
    fixture, model:'session-model', order:i%2 ? 'BA':'AB', pairId:`${fixture}-${i}`,
    before:{evidenceClass:'observed-framework-payload',overhead:1000, correct:true, mandatoryChecks:true, complete:true, workEvidence:'report#before', snapshot:'old', replay:'fixture-v1', environment:'same'},
    after:{evidenceClass:'observed-framework-payload',overhead:400, correct:true, mandatoryChecks:true, complete:true, workEvidence:'report#after', snapshot:'new', replay:'fixture-v1', environment:'same'},
  })));
  assert.equal(evaluatePairs(pairs).status, 'PASS');
  assert.equal(evaluatePairs(pairs).groups[0].medianReduction, 0.6);
  assert.equal(evaluatePairs(pairs.slice(2)).status, 'UNPROVEN');
  const noisy=structuredClone(pairs);
  for(const p of noisy) p.after.overhead=p.order==='AB'?100:900;
  assert.equal(evaluatePairs(noisy).status,'FAIL');
  const staticPairs=structuredClone(pairs);
  for(const p of staticPairs) p.after.evidenceClass='modeled-static-cumulative';
  assert.equal(evaluatePairs(staticPairs).status,'UNPROVEN');
  const gap=structuredClone(pairs); gap[0].after.environment='other';
  assert.equal(evaluatePairs(gap).status,'PASS'); // five remaining balanced pairs
  gap[1].after.complete=false;
  assert.equal(evaluatePairs(gap).status,'UNPROVEN');
  pairs[0].after.correct = false;
  assert.equal(evaluatePairs(pairs).status, 'FAIL');
});

test('six fixture seeds expose real failing/passing checks and refuse overwrite',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'context-fixtures-'));
  const target=path.join(root,'seed');
  try {
    const report=await seedContextFixtures(target);
    assert.equal(report.fixtures.length,6);
    const env={...process.env}; delete env.NODE_TEST_CONTEXT;
    for(const f of report.fixtures) {
      const run=spawnSync(process.execPath,['--test','test/sum.test.cjs'],{cwd:path.join(target,f.fixture),encoding:'utf8',env});
      assert.equal(run.status,['fsd-execution','debugging','review'].includes(f.fixture)?1:0,run.stderr);
      assert.ok(f.files['docs/fsd/fsd-arithmetic.md']);
    }
    await assert.rejects(seedContextFixtures(target),/fresh/);
  } finally {await rm(root,{recursive:true,force:true});}
});
