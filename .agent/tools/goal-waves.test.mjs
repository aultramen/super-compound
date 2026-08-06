import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    acquireStateLock,
    computeWaves,
    parseIssueDependencies,
    releaseStateLock,
    resolveMaxWorkers,
    stateLockPath,
} from './goal-waves.mjs';

test('linear chain produces one goal per wave', () => {
    const waves = computeWaves([
        { id: 'a', dependsOn: [] },
        { id: 'b', dependsOn: ['a'] },
        { id: 'c', dependsOn: ['b'] },
    ]);
    assert.deepEqual(waves, [['a'], ['b'], ['c']]);
});

test('independent goals share a wave; dependents wait', () => {
    const waves = computeWaves([
        { id: 'schema', dependsOn: [] },
        { id: 'api', dependsOn: ['schema'] },
        { id: 'ui', dependsOn: ['schema'] },
        { id: 'e2e', dependsOn: ['api', 'ui'] },
    ]);
    assert.deepEqual(waves, [['schema'], ['api', 'ui'], ['e2e']]);
});

test('cycle fails closed', () => {
    assert.throws(
        () =>
            computeWaves([
                { id: 'a', dependsOn: ['b'] },
                { id: 'b', dependsOn: ['a'] },
            ]),
        /WAVES_CYCLE_DETECTED/
    );
});

test('unknown dependency fails closed', () => {
    assert.throws(
        () => computeWaves([{ id: 'a', dependsOn: ['ghost'] }]),
        /WAVES_UNKNOWN_DEPENDENCY/
    );
});

test('duplicate goal id fails closed', () => {
    assert.throws(
        () =>
            computeWaves([
                { id: 'a', dependsOn: [] },
                { id: 'a', dependsOn: [] },
            ]),
        /WAVES_DUPLICATE_GOAL/
    );
});

test('parseIssueDependencies reads Blocked by lines', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, '01-first.md'), 'Status: ready\nBlocked by: None\n');
    fs.writeFileSync(
        path.join(dir, '02-second.md'),
        'Status: ready\nBlocked by: 01-first.md\n'
    );
    const goals = parseIssueDependencies(dir);
    assert.deepEqual(goals, [
        { id: '01-first.md', dependsOn: [] },
        { id: '02-second.md', dependsOn: ['01-first.md'] },
    ]);
    assert.deepEqual(computeWaves(goals), [['01-first.md'], ['02-second.md']]);
});

test('resolveMaxWorkers prefers override, then config, then 2', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-root-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    assert.equal(resolveMaxWorkers(root, 4), 4);
    assert.equal(resolveMaxWorkers(root, null), 2);
    fs.mkdirSync(path.join(root, '.agent/context'), { recursive: true });
    fs.writeFileSync(
        path.join(root, '.agent/context/project-config.json'),
        JSON.stringify({ background_aggregate_policy: { max_workers: 3 } })
    );
    assert.equal(resolveMaxWorkers(root, null), 3);
});

test('state lock is exclusive and stale locks clear', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-lock-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    assert.equal(acquireStateLock(root), true);
    assert.equal(acquireStateLock(root), false);
    releaseStateLock(root);
    assert.equal(acquireStateLock(root), true);
    const past = Date.now() - 60_000;
    fs.utimesSync(stateLockPath(root), past / 1000, past / 1000);
    assert.equal(acquireStateLock(root), true);
    releaseStateLock(root);
});
