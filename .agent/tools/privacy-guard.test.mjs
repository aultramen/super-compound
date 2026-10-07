import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPrivacySafeRuntimeValue} from './privacy-guard.mjs';

test('privacy guard retains secret, personal data, reasoning and JSON inspection boundaries', () => {
  const canaries = [
    '-----BEGIN PRIVATE KEY-----', 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    'sk-abcdefghijklmnop', 'AKIA1234567890123456', 'Bearer abcdefghijklmnop',
    'password=synthetic-sensitive-value', 'person@example.com', '+6281234567890',
    '3174010101010001', 'Raw prompt: hidden', 'Chain of thought: hidden',
    'Raw untrusted payload: hidden',
  ];
  for (const canary of canaries) {
    for (let repeat=0; repeat<2; repeat++) assert.throws(
      () => assertPrivacySafeRuntimeValue({nested:[canary]}),
      error => /PRIVACY_STOP/.test(error.message) && !error.message.includes(canary),
    );
  }
  assert.throws(() => assertPrivacySafeRuntimeValue({Password:'ordinary'}), /sensitive field/);
  const cyclic={}; cyclic.self=cyclic;
  for (const value of [cyclic, new Date(), {x:undefined}]) assert.throws(() => assertPrivacySafeRuntimeValue(value), /bounded plain JSON/);
  let deep={}; for (let i=0; i<65; i++) deep={next:deep};
  assert.throws(() => assertPrivacySafeRuntimeValue(deep), /inspection bound/);
  assert.throws(() => assertPrivacySafeRuntimeValue(Array(100_001).fill(null)), /inspection bound/);
  const safe={acceptance:['Raw prompts and PII must not be persisted.'],digest:'1'.repeat(64),sha:`sha256:${'1'.repeat(64)}`,revision:'1'.repeat(40),empty:null};
  assert.equal(assertPrivacySafeRuntimeValue(safe),safe);
});

test('completion locator receipt hashes do not randomly match personal-data digit sequences', () => {
  const hashes=[`a3174010101010001${'f'.repeat(47)}`,`a081234567890${'b'.repeat(51)}`];
  for(const hash of hashes) {
    assert.equal(hash.length,64);
    const completionRef=`.scratch/work-packages/run/ledger.json#D#${hash}`;
    assert.doesNotThrow(()=>assertPrivacySafeRuntimeValue(completionRef,'completion locator'));
    const record={completionRef,nested:[completionRef]};
    assert.equal(assertPrivacySafeRuntimeValue(record),record);
  }
});

test('receipt hash exemption still rejects personal data in prefixes, ledger paths and goal IDs', () => {
  const hash=`a3174010101010001${'f'.repeat(47)}`;
  const unsafe=[
    `person@example.com .scratch/work-packages/run/ledger.json#D#${hash}`,
    `.scratch/work-packages/081234567890/ledger.json#D#${hash}`,
    `.scratch/work-packages/3174010101010001/ledger.json#D#${hash}`,
    `.scratch/work-packages/run/person@example.com.json#D#${hash}`,
    `.scratch/work-packages/run/ledger.json#081234567890#${hash}`,
    `.scratch/work-packages/run/ledger.json#3174010101010001#${hash}`,
    `.scratch/work-packages/run/ledger.json#person@example.com#${hash}`,
    `password=synthetic-sensitive-value .scratch/work-packages/run/ledger.json#D#${hash}`,
    `.scratch/work-packages/run/ledger.json#D#${hash}#extra`,
    `unrecognized receipt: ${hash}`,
  ];
  for(const completionRef of unsafe)for(const candidate of [completionRef,{completionRef}]) {
    assert.throws(()=>assertPrivacySafeRuntimeValue(candidate),/PRIVACY_STOP/);
  }
});

test('receipt locator exemption matches bounded work-package run and goal IDs', () => {
  const hash=`a3174010101010001${'f'.repeat(47)}`;
  for(const [run,goal] of [['run','D'],['r'.repeat(80),'D'],['run','g'.repeat(80)]]) {
    assert.doesNotThrow(()=>assertPrivacySafeRuntimeValue(`.scratch/work-packages/${run}/ledger.json#${goal}#${hash}`));
  }
  for(const [run,goal] of [['r'.repeat(81),'D'],['run','g'.repeat(81)],['_run','D'],['run','-goal'],['run.v1','D'],['run','GOAL.v1']]) {
    assert.throws(()=>assertPrivacySafeRuntimeValue(`.scratch/work-packages/${run}/ledger.json#${goal}#${hash}`),/PRIVACY_STOP/);
  }
});
