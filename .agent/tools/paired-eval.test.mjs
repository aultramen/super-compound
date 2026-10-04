import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePairedTrials} from './adaptive-eval.mjs';

function trials() {
 return Array.from({length:5},(_,i)=>['A','B'].map(variant=>({pair:i+1,variant,taskDigest:'a'.repeat(64),fixtureDigest:'b'.repeat(64),configDigest:'c'.repeat(64),graderDigest:'d'.repeat(64),sourceDigest:'e'.repeat(64),host:'codex-windows',model:'fixed-model',metric:'total_tokens',basis:'codex-jsonl',value:variant==='A'?1000:800,correctness:true,errorCount:0,timestamp:'2026-10-04T00:00:00Z',actualWork:{commandCount:3,evidenceRef:'evidence.json',digest:'f'.repeat(64)}}))).flat();
}
test('five measured pairs require a 10 percent improvement above variation with correctness intact',()=>{
 const result=comparePairedTrials(trials());
 assert.equal(result.decision,'KEEP');
 assert.equal(result.pairs,5);
 assert.equal(result.medianReduction,0.2);
});

test('unknown work, duplicate pairs, changed fixtures, low gains and quality loss cannot pass',()=>{
 for(const mutate of [t=>t[0].value='unknown',t=>t[0].actualWork.commandCount=0,t=>t[1].fixtureDigest='x',t=>t[1].variant='A',t=>t[1].timestamp='unknown']) {
  const input=trials(); mutate(input); assert.equal(comparePairedTrials(input).decision,'INCONCLUSIVE');
 }
 const quality=trials();quality[1].correctness=false;assert.equal(comparePairedTrials(quality).decision,'REJECT');
 const low=trials();low.filter(t=>t.variant==='B').forEach(t=>t.value=950);assert.equal(comparePairedTrials(low).decision,'INCONCLUSIVE');
 const no=trials();no.filter(t=>t.variant==='B').forEach(t=>t.value=1100);assert.equal(comparePairedTrials(no).decision,'REJECT');
});
