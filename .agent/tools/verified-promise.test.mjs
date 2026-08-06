import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluatePromise } from './verified-promise.mjs';

test('all goals verified allows completion', () => {
    const verdict = evaluatePromise({
        goals: {
            'GOAL-001': { status: 'verified' },
            'GOAL-002': { status: 'verified' },
        },
    });
    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.unverified, []);
});

test('any unverified goal denies completion', () => {
    const verdict = evaluatePromise({
        goals: {
            'GOAL-001': { status: 'verified' },
            'GOAL-002': { status: 'in-progress' },
            'GOAL-003': {},
        },
    });
    assert.equal(verdict.allowed, false);
    assert.deepEqual(verdict.unverified, [
        { id: 'GOAL-002', status: 'in-progress' },
        { id: 'GOAL-003', status: 'unknown' },
    ]);
});

test('empty ledger fails closed', () => {
    const verdict = evaluatePromise({ goals: {} });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.empty, true);
});

test('corrupt ledger fails closed', () => {
    assert.equal(evaluatePromise(null).corrupt, true);
    assert.equal(evaluatePromise({}).corrupt, true);
    assert.equal(evaluatePromise({ goals: 'nope' }).corrupt, true);
});
