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
