import assert from 'node:assert/strict';
import test from 'node:test';

test('paired evaluation requires comparable evidence and rejects quality regressions', async () => {
    const {compareRuns} = await import('./adaptive-eval.mjs').catch(() => ({}));
    assert.equal(typeof compareRuns, 'function');
    const before = {tasks: ['retry'], host: 'codex', model: 'same', quality: 1, metric: 'runtime_input_tokens', basis: 'host_usage', grader: 'quality-v1', value: 100};
    assert.equal(compareRuns(before, {...before, value: 80}).decision, 'KEEP');
    assert.equal(compareRuns(before, {...before, quality: 0.9, value: 80}).decision, 'REJECT');
    assert.equal(compareRuns(before, {...before, host: 'claude', value: 80}).decision, 'INCONCLUSIVE');
    assert.equal(compareRuns(before, {...before, value: null}).decision, 'INCONCLUSIVE');
    assert.equal(compareRuns(before, {...before, metric: 'text_estimate', value: 80}).decision, 'INCONCLUSIVE');
});

test('behavior grader checks recorded actions and evidence rather than stated rules', async () => {
    const {gradeBehavior} = await import('./adaptive-eval.mjs');
    assert.equal(typeof gradeBehavior, 'function');
    const events = [
      {action: 'read_contract', path: '.agent/context/workflows/sc-work.contract.md'},
      {action: 'verify', exitCode: 0, evidence: 'tests.log'},
      {action: 'capture', outcome: 'created', evidence: 'knowledge.md'},
      {action: 'review_spec', verdict: 'PASS', evidence: 'spec.md'},
      {action: 'review_quality', verdict: 'PASS', evidence: 'quality.md'},
      {action: 'close'},
    ];
    assert.equal(gradeBehavior({events, requiredContracts: [events[0].path]}).pass, true);
    assert.equal(gradeBehavior({events: [{action:'say', text:'I verified and captured knowledge'}], requiredContracts:[events[0].path]}).pass, false);
    assert.equal(gradeBehavior({events: [events[5], ...events.slice(0,5)], requiredContracts:[events[0].path]}).pass, false);
    assert.equal(gradeBehavior({events: events.map(e => e.action === 'verify' ? {...e,exitCode:1} : e), requiredContracts:[events[0].path]}).pass, false);
});

test('unknown host identities and later failing checks cannot certify improvement or completion', async () => {
    const {compareRuns,gradeBehavior}=await import('./adaptive-eval.mjs');
    const before={tasks:['retry'],host:'unknown',model:'unknown',metric:'runtime_input_tokens',basis:'host_usage',grader:'quality-v1',quality:1,value:100};
    assert.equal(compareRuns(before,{...before,value:80}).decision,'INCONCLUSIVE');
    const events=[{action:'read_contract',path:'contract'}, {action:'verify',exitCode:0,evidence:'proof'}, {action:'capture',outcome:'created',evidence:'record'}, {action:'review_spec',verdict:'PASS',evidence:'spec'}, {action:'review_quality',verdict:'PASS',evidence:'quality'}, {action:'verify',exitCode:1,evidence:'failed'}, {action:'close'}];
    assert.equal(gradeBehavior({events,requiredContracts:['contract']}).pass,false);
    assert.equal(gradeBehavior({events:[...events.slice(0,5),{action:'review_quality',verdict:'FAIL',evidence:'failed'},events[6]],requiredContracts:['contract']}).pass,false);
});
