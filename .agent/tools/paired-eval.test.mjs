import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePairedTrials,compareRuns} from './adaptive-eval.mjs';

function trials(count=5) {
 return Array.from({length:count},(_,i)=>['A','B'].map(variant=>({pair:i+1,variant,taskDigest:'a'.repeat(64),fixtureDigest:'b'.repeat(64),configDigest:'c'.repeat(64),graderDigest:'d'.repeat(64),sourceDigest:(variant==='A'?'e':'f').repeat(64),host:'codex-windows',model:'fixed-model',metric:'total_tokens',basis:'codex-jsonl',value:variant==='A'?1000:800,correctness:true,errorCount:0,timestamp:'2026-10-04T00:00:00Z',actualWork:{commandCount:3,evidenceRef:'evidence.json',digest:'f'.repeat(64)}}))).flat();
}
test('legacy comparison treats identical explicit valid source digests as a control while retaining quality rejection',()=>{
 const before={tasks:['task'],host:'codex',model:'fixed',metric:'tokens',basis:'measured',grader:'fixed',quality:1,value:100,sourceDigest:'a'.repeat(64)};
 const after={...before,value:80};
 assert.equal(compareRuns(before,after).decision,'INCONCLUSIVE');
 assert.equal(compareRuns(before,{...after,quality:0}).decision,'REJECT');
 const missing={...before};delete missing.sourceDigest;
 assert.equal(compareRuns(missing,{...missing,value:80}).decision,'KEEP');
 assert.equal(compareRuns(before,{...after,sourceDigest:'b'.repeat(64)}).decision,'KEEP');
});
test('five measured pairs require a 10 percent improvement above variation with correctness intact',()=>{
 const result=comparePairedTrials(trials());
 assert.equal(result.decision,'KEEP');
 assert.equal(result.pairs,5);
 assert.equal(result.medianReduction,0.2);
});

test('noise-aware improvement requires six comparable same-source controls and exceeds their conservative floor',()=>{
 const input=trials(), controls=trials(6);
 controls.forEach(t=>{t.sourceDigest='e'.repeat(64);if(t.variant==='B')t.value=950;});
 assert.equal(comparePairedTrials(input,{noiseAware:true}).decision,'INCONCLUSIVE');
 const result=comparePairedTrials(input,{noiseAware:true,controlTrials:controls});
 assert.equal(result.decision,'KEEP'); assert.equal(result.noiseFloor,0.05);
 assert.equal(result.controlPairs,6);
 for(const mutate of [c=>c.pop(),c=>c[0].host='other',c=>c[0].sourceDigest='f'.repeat(64),c=>c[0].correctness=false,c=>c[0].actualWork.commandCount=0]) {
  const changed=structuredClone(controls); mutate(changed);
  assert.equal(comparePairedTrials(input,{noiseAware:true,controlTrials:changed}).decision,'INCONCLUSIVE');
 }
 const noisy=structuredClone(controls); noisy.find(t=>t.variant==='B').value=750;
 assert.equal(comparePairedTrials(input,{noiseAware:true,controlTrials:noisy}).decision,'INCONCLUSIVE');
 controls.filter(t=>t.variant==='B').forEach(t=>t.value=800);
 assert.equal(comparePairedTrials(input,{noiseAware:true,controlTrials:controls}).decision,'INCONCLUSIVE');
 const failed=structuredClone(input); failed[1].correctness=false;
 assert.equal(comparePairedTrials(failed,{noiseAware:true}).decision,'REJECT');
 const regression=structuredClone(input);regression.filter(t=>t.variant==='B').forEach(t=>t.value=1100);
 assert.equal(comparePairedTrials(regression,{noiseAware:true,controlTrials:controls}).decision,'REJECT');
});

test('identical effective sources retain control statistics but cannot claim optimization',()=>{
 const input=trials(); input.forEach(t=>t.sourceDigest='e'.repeat(64));
 const result=comparePairedTrials(input);
 assert.equal(result.decision,'INCONCLUSIVE');
 assert.equal(result.medianReduction,0.2);
 assert.equal(result.pairs,5);
 input[1].correctness=false;
 assert.equal(comparePairedTrials(input).decision,'REJECT');
});

test('unknown work, duplicate pairs, changed fixtures, low gains and quality loss cannot pass',()=>{
 for(const mutate of [t=>t[0].value='unknown',t=>t[0].actualWork.commandCount=0,t=>t[1].fixtureDigest='x',t=>t[1].variant='A',t=>t[1].timestamp='unknown']) {
  const input=trials(); mutate(input); assert.equal(comparePairedTrials(input).decision,'INCONCLUSIVE');
 }
 const quality=trials();quality[1].correctness=false;assert.equal(comparePairedTrials(quality).decision,'REJECT');
 const low=trials();low.filter(t=>t.variant==='B').forEach(t=>t.value=950);assert.equal(comparePairedTrials(low).decision,'INCONCLUSIVE');
 const no=trials();no.filter(t=>t.variant==='B').forEach(t=>t.value=1100);assert.equal(comparePairedTrials(no).decision,'REJECT');
});
