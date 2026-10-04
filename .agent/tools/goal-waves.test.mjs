import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    computeWaves,
    computeReadyGoals,
    parseIssueDependencies,
    resolveMaxWorkers,
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

test('resolveMaxWorkers prefers override, then 2', () => {
    assert.equal(resolveMaxWorkers('.', 4), 4);
    assert.equal(resolveMaxWorkers('.', null), 2);
});

const cliPath = fileURLToPath(new URL('./goal-waves.mjs', import.meta.url));

function writeGoalsFile(dir) {
    const input = path.join(dir, 'goals.json');
    fs.writeFileSync(
        input,
        JSON.stringify([
            { id: 'schema', dependsOn: [] },
            { id: 'api', dependsOn: ['schema'] },
            { id: 'ui', dependsOn: ['schema'] },
        ])
    );
    return input;
}

test('--json emits the stable goal_waves_plan_v1 machine shape', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-json-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const stdout = execFileSync(
        process.execPath,
        [cliPath, '--input', writeGoalsFile(dir), '--max-workers', '2', '--json'],
        { encoding: 'utf8' }
    );
    assert.deepEqual(JSON.parse(stdout), {
        schema: 'goal_waves_plan_v1',
        maxWorkers: 2,
        goalCount: 3,
        waveCount: 2,
        waves: [['schema'], ['api', 'ui']],
    });
});

test('default CLI output keeps the goal_waves_v1 shape', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-text-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const stdout = execFileSync(
        process.execPath,
        [cliPath, '--input', writeGoalsFile(dir), '--max-workers', '2'],
        { encoding: 'utf8' }
    );
    const plan = JSON.parse(stdout);
    assert.equal(plan.schema, 'goal_waves_v1');
    assert.deepEqual(plan.waves[1], { wave: 2, parallel: 2, goals: ['api', 'ui'] });
});


test('dispatch releases a dependent while its unrelated reporting wave peer runs', () => {
    const goals = [
        { id: 'a', dependsOn: [] },
        { id: 'b', dependsOn: [] },
        { id: 'c', dependsOn: ['a'] },
        { id: 'd', dependsOn: ['b'] },
    ];
    assert.deepEqual(computeReadyGoals(goals, {
        verified: ['a'], inProgress: ['b'], maxWorkers: 2,
    }), ['c']);
});

test('blocked stream leaves independent goals dispatchable and respects slots', () => {
    const goals = [
        { id: 'blocked', dependsOn: [] },
        { id: 'child', dependsOn: ['blocked'] },
        { id: 'free', dependsOn: [] },
        { id: 'other', dependsOn: [] },
    ];
    assert.deepEqual(computeReadyGoals(goals, { blocked: ['blocked'], maxWorkers: 1 }), ['free']);
    assert.deepEqual(computeReadyGoals(goals, { blocked: ['blocked'], inProgress: ['free'], maxWorkers: 1 }), []);
});

test('dispatch requires verified dependencies and rejects malformed state', () => {
    const goals = [{ id: 'a' }, { id: 'b', dependsOn: ['a'] }];
    assert.deepEqual(computeReadyGoals(goals, { inProgress: ['a'], maxWorkers: 2 }), []);
    assert.throws(() => computeReadyGoals(goals, { verified: ['unknown'] }), /WAVES_UNKNOWN_STATE_GOAL/);
    assert.throws(() => computeReadyGoals(goals, { verified: ['a'], blocked: ['a'] }), /WAVES_CONFLICTING_STATE/);
    assert.throws(() => computeReadyGoals(goals, { maxWorkers: 0 }), /WAVES_INVALID_WORKERS/);
    assert.throws(() => computeReadyGoals([{ id: 'a', dependsOn: ['a'] }]), /WAVES_CYCLE_DETECTED/);
});

test('worker allowance follows host and resource capacity with a conservative fallback', () => {
    assert.equal(resolveMaxWorkers('.', null, { hostSlots: 6 }), 6);
    assert.equal(resolveMaxWorkers('.', 8, { hostSlots: 6, resourceSlots: 3 }), 3);
    assert.equal(resolveMaxWorkers('.', null, { resourceSlots: 1 }), 1);
    assert.throws(() => resolveMaxWorkers('.', null, { hostSlots: 0 }), /WAVES_INVALID_WORKERS/);
});

test('--ready emits dependency-ready dispatch independently of reporting waves', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waves-ready-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const statePath = path.join(dir, 'state.json');
    fs.writeFileSync(statePath, JSON.stringify({ verified: ['schema'], inProgress: ['api'], hostSlots: 3 }));
    const plan = JSON.parse(execFileSync(process.execPath,
        [cliPath, '--input', writeGoalsFile(dir), '--ready', '--state', statePath], { encoding: 'utf8' }));
    assert.equal(plan.schema, 'goal_dispatch_plan_v1');
    assert.equal(plan.maxWorkers, 3);
    assert.deepEqual(plan.readyGoals, ['ui']);
});

test('a blocked ancestor suppresses dispatch even if an intermediate proof remains listed', () => {
    const goals = [
        { id: 'root' },
        { id: 'child', dependsOn: ['root'] },
        { id: 'leaf', dependsOn: ['child'] },
        { id: 'free' },
    ];
    assert.deepEqual(computeReadyGoals(goals, {
        blocked: ['root'], verified: ['child'], maxWorkers: 2,
    }), ['free']);
});
