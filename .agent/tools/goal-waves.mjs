#!/usr/bin/env node
/**
 * goal-waves - dependency-graph wave planner for parallel goal execution.
 *
 * Reads goal dependencies (issue pointers' "Blocked by:" lines or a JSON
 * array) and emits execution waves: wave N runs in parallel after wave N-1
 * completes. Fails closed on cycles and unknown dependencies.
 *
 * Also provides the STATE.md.lock primitives (O_EXCL create, stale-lock
 * clear) that parallel wave writers must hold around shared-state writes.
 *
 * Usage:
 *   node .agent/tools/goal-waves.mjs --issues-dir .scratch/<feature>/issues
 *   node .agent/tools/goal-waves.mjs --input goals.json [--max-workers N]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const STALE_LOCK_MS = 10_000;

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

export function resolveMaxWorkers(root, override) {
    if (Number.isInteger(override) && override >= 1) return override;
    try {
        const config = JSON.parse(
            fs.readFileSync(
                path.join(root, '.agent', 'context', 'project-config.json'),
                'utf8'
            )
        );
        const workers = config?.background_aggregate_policy?.max_workers;
        if (Number.isInteger(workers) && workers >= 1) return workers;
    } catch {
        // fall through to conservative default
    }
    return 2;
}

export function stateLockPath(root) {
    return path.join(root, 'docs', 'STATE.md.lock');
}

export function acquireStateLock(root, now = Date.now()) {
    const lockFile = stateLockPath(root);
    try {
        const descriptor = fs.openSync(lockFile, 'wx');
        fs.writeSync(descriptor, JSON.stringify({ pid: process.pid, at: now }));
        fs.closeSync(descriptor);
        return true;
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        let stale = false;
        try {
            stale = now - fs.statSync(lockFile).mtimeMs > STALE_LOCK_MS;
        } catch {
            stale = false;
        }
        if (stale) {
            fs.rmSync(lockFile, { force: true });
            return acquireStateLock(root, now);
        }
        return false;
    }
}

export function releaseStateLock(root) {
    fs.rmSync(stateLockPath(root), { force: true });
}

function main(argv) {
    const args = argv.slice(2);
    let issuesDir = null;
    let inputFile = null;
    let maxWorkers = null;
    let root = process.cwd();
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--issues-dir') issuesDir = args[++i];
        else if (a === '--input') inputFile = args[++i];
        else if (a === '--max-workers') maxWorkers = Number(args[++i]);
        else if (a === '--root') root = args[++i];
    }
    let goals;
    if (inputFile) {
        goals = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    } else if (issuesDir) {
        goals = parseIssueDependencies(issuesDir);
    } else {
        process.stderr.write(
            'usage: goal-waves.mjs (--issues-dir <dir> | --input <goals.json>) [--max-workers N] [--root <path>]\n'
        );
        return 2;
    }
    const waves = computeWaves(goals);
    const workers = resolveMaxWorkers(root, maxWorkers);
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
