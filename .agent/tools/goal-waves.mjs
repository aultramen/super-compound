#!/usr/bin/env node
/**
 * goal-waves - dependency-graph wave planner for parallel goal execution.
 *
 * Reads goal dependencies (issue pointers' "Blocked by:" lines or a JSON
 * array) and emits reporting waves. Dispatch uses verified dependencies and
 * available slots, never a global wave barrier. Fails closed on invalid graphs.
 *
 * Usage:
 *   node .agent/tools/goal-waves.mjs --issues-dir .scratch/<feature>/issues
 *   node .agent/tools/goal-waves.mjs --input goals.json [--max-workers N]
 *   node .agent/tools/goal-waves.mjs --input goals.json --json
 *   node .agent/tools/goal-waves.mjs --input goals.json --ready --state state.json
 *
 * --json emits the stable machine shape goal_waves_plan_v1: waves as an
 * array of goal-id arrays plus maxWorkers/goalCount/waveCount metadata.
 * --ready emits goal_dispatch_plan_v1; state supplies verified/inProgress/blocked
 * goal ids and optional hostSlots/resourceSlots total worker allowances.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';


export function computeWaves(goals) {
    const byId = new Map();
    for (const goal of goals) {
        if (!goal || typeof goal.id !== 'string' || goal.id.length === 0) {
            throw new Error('WAVES_INVALID_GOAL: every goal needs a string id');
        }
        if (byId.has(goal.id)) {
            throw new Error(`WAVES_DUPLICATE_GOAL: ${goal.id}`);
        }
        byId.set(goal.id, {
            id: goal.id,
            dependsOn: Array.isArray(goal.dependsOn) ? [...goal.dependsOn] : [],
        });
    }
    for (const goal of byId.values()) {
        for (const dep of goal.dependsOn) {
            if (!byId.has(dep)) {
                throw new Error(`WAVES_UNKNOWN_DEPENDENCY: ${goal.id} -> ${dep}`);
            }
        }
    }
    const waves = [];
    const placed = new Set();
    let remaining = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
    while (remaining.length > 0) {
        const ready = remaining.filter((goal) =>
            goal.dependsOn.every((dep) => placed.has(dep))
        );
        if (ready.length === 0) {
            const cycle = remaining.map((goal) => goal.id).join(', ');
            throw new Error(`WAVES_CYCLE_DETECTED: ${cycle}`);
        }
        waves.push(ready.map((goal) => goal.id));
        for (const goal of ready) placed.add(goal.id);
        remaining = remaining.filter((goal) => !placed.has(goal.id));
    }
    return waves;
}

export function parseIssueDependencies(issuesDir) {
    const goals = [];
    const files = fs
        .readdirSync(issuesDir)
        .filter((name) => name.endsWith('.md'))
        .sort();
    for (const name of files) {
        const raw = fs.readFileSync(path.join(issuesDir, name), 'utf8');
        const line = (raw.match(/^Blocked by:\s*(.+)$/m) || [])[1] || 'None';
        const dependsOn =
            line.trim().toLowerCase() === 'none'
                ? []
                : line
                    .split(/[,\s]+/)
                    .map((token) => path.basename(token.trim()))
                    .filter((token) => token.endsWith('.md'));
        goals.push({ id: name, dependsOn });
    }
    return goals;
}

// Capacity comes from the host/scheduler, not CPU count (agent slots and build
// resources need not track CPUs). Preserve the conservative fallback when absent.
export function resolveMaxWorkers(root, override, capacity = {}) {
    const limits = [override, capacity.hostSlots, capacity.resourceSlots]
        .filter((value) => value !== null && value !== undefined);
    if (limits.some((value) => !Number.isSafeInteger(value) || value < 1)) {
        throw new Error('WAVES_INVALID_WORKERS: capacity must be a positive integer');
    }
    const requested = override ?? capacity.hostSlots ?? 2;
    return Math.min(requested, ...limits);
}

export function computeReadyGoals(goals, {
    verified = [], inProgress = [], blocked = [], maxWorkers = 2,
} = {}) {
    const waves = computeWaves(goals); // Validate the DAG before trusting partial state.
    resolveMaxWorkers(null, maxWorkers);
    const ids = new Set(goals.map((goal) => goal.id));
    const claimed = new Set();
    for (const group of [verified, inProgress, blocked]) {
        if (!Array.isArray(group)) throw new Error('WAVES_INVALID_STATE: expected goal-id arrays');
        for (const id of group) {
            if (!ids.has(id)) throw new Error(`WAVES_UNKNOWN_STATE_GOAL: ${id}`);
            if (claimed.has(id)) throw new Error(`WAVES_CONFLICTING_STATE: ${id}`);
            claimed.add(id);
        }
    }
    const affected = new Set(blocked);
    const byId = new Map(goals.map((goal) => [goal.id, goal]));
    for (const wave of waves) {
        for (const id of wave) {
            if ((byId.get(id).dependsOn ?? []).some((dep) => affected.has(dep))) {
                affected.add(id);
            }
        }
    }
    const proven = new Set(verified);
    const availableSlots = Math.max(0, maxWorkers - inProgress.length);
    return goals.filter((goal) => !claimed.has(goal.id) && !affected.has(goal.id) &&
        (goal.dependsOn ?? []).every((dep) => proven.has(dep)))
        .map((goal) => goal.id).sort((a, b) => a.localeCompare(b))
        .slice(0, availableSlots);
}

function main(argv) {
    const args = argv.slice(2);
    let issuesDir = null;
    let inputFile = null;
    let maxWorkers = null;
    let root = process.cwd();
    let json = false;
    let ready = false;
    let stateFile = null;
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--issues-dir') issuesDir = args[++i];
        else if (a === '--input') inputFile = args[++i];
        else if (a === '--max-workers') maxWorkers = Number(args[++i]);
        else if (a === '--root') root = args[++i];
        else if (a === '--json') json = true;
        else if (a === '--ready') ready = true;
        else if (a === '--state') stateFile = args[++i];
    }
    let goals;
    if (inputFile) {
        goals = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    } else if (issuesDir) {
        goals = parseIssueDependencies(issuesDir);
    } else {
        process.stderr.write(
            'usage: goal-waves.mjs (--issues-dir <dir> | --input <goals.json>) [--max-workers N] [--root <path>] [--json] [--ready --state <state.json>]\n'
        );
        return 2;
    }
    const waves = computeWaves(goals);
    const state = stateFile ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('WAVES_INVALID_STATE: expected state object');
    }
    const workers = resolveMaxWorkers(root, maxWorkers, state);
    if (ready) {
        const readyGoals = computeReadyGoals(goals, { ...state, maxWorkers: workers });
        process.stdout.write(`${JSON.stringify({
            schema: 'goal_dispatch_plan_v1', maxWorkers: workers,
            readyGoals, waves,
        })}\n`);
        return 0;
    }
    if (json) {
        process.stdout.write(
            `${JSON.stringify({
                schema: 'goal_waves_plan_v1',
                maxWorkers: workers,
                goalCount: goals.length,
                waveCount: waves.length,
                waves,
            })}\n`
        );
        return 0;
    }
    process.stdout.write(
        `${JSON.stringify(
            {
                schema: 'goal_waves_v1',
                maxWorkers: workers,
                waves: waves.map((wave, index) => ({
                    wave: index + 1,
                    parallel: Math.min(wave.length, workers),
                    goals: wave,
                })),
            },
            null,
            2
        )}\n`
    );
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
