#!/usr/bin/env node
/**
 * verified-promise - machine-checked completion predicate.
 *
 * A run may be declared COMPLETE only when every goal in its work-package
 * ledger has status "verified". The agent cannot talk its way out of the
 * loop: prose claims are ignored; only this predicate's PASS counts.
 *
 * Usage: node .agent/tools/verified-promise.mjs --run <run-id> [--root <path>]
 * Exit 0 = COMPLETE_ALLOWED; exit 1 = goals unverified; exit 2 = usage/corrupt.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export function evaluatePromise(ledger) {
    if (
        ledger === null ||
        typeof ledger !== 'object' ||
        typeof ledger.goals !== 'object' ||
        ledger.goals === null
    ) {
        return { allowed: false, corrupt: true, unverified: [] };
    }
    const entries = Object.entries(ledger.goals);
    if (entries.length === 0) {
        return { allowed: false, corrupt: false, unverified: [], empty: true };
    }
    const unverified = entries
        .filter(([, goal]) => goal?.status !== 'verified')
        .map(([id, goal]) => ({ id, status: goal?.status ?? 'unknown' }));
    return { allowed: unverified.length === 0, corrupt: false, unverified };
}

function main(argv) {
    const args = argv.slice(2);
    let runId = null;
    let root = process.cwd();
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--run') runId = args[++i];
        else if (a === '--root') root = args[++i];
    }
    if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) {
        process.stderr.write('usage: verified-promise.mjs --run <run-id> [--root <path>]\n');
        return 2;
    }
    const ledgerPath = path.join(root, '.scratch', 'work-packages', runId, 'ledger.json');
    let ledger;
    try {
        ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    } catch {
        process.stderr.write(`verified-promise: cannot read ledger ${ledgerPath}\n`);
        return 2;
    }
    const verdict = evaluatePromise(ledger);
    if (verdict.corrupt) {
        process.stderr.write('verified-promise: ledger shape invalid; failing closed\n');
        return 2;
    }
    if (verdict.empty) {
        process.stderr.write('verified-promise: ledger has no goals; failing closed\n');
        return 1;
    }
    if (verdict.allowed) {
        process.stdout.write(`COMPLETE_ALLOWED run=${runId}\n`);
        return 0;
    }
    for (const goal of verdict.unverified) {
        process.stdout.write(`UNVERIFIED ${goal.id}: ${goal.status}\n`);
    }
    process.stdout.write(
        `COMPLETE_DENIED run=${runId} unverified=${verdict.unverified.length}\n`
    );
    return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
