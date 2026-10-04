#!/usr/bin/env node
/**
 * Super Compound - Pre-Compact Hook
 *
 * Runs before context compaction. Saves a timestamped note in docs/STATE.md
 * so the next session can recover context from disk.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('pre-compact')) {
    process.exit(0);
}

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const {
    atomicWriteFile,
    buildCompactionMarker,
    replaceCompactionMarker,
    resolveHookProjectRoot,
    safeProjectFile,
} = require('./lib/hook-utils');

let projectRoot;
let stateFile;
let continueFile;

try {
    projectRoot = resolveHookProjectRoot(
        process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
    );
    stateFile = safeProjectFile(projectRoot, ['docs', 'STATE.md']);
    continueFile = safeProjectFile(projectRoot, ['.continue-here.md']);
} catch (error) {
    console.error(`[Super Compound] Pre-compact: ${error.message}`);
    return;
}

function getTimestamp() {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

const timestamp = getTimestamp();
const marker = buildCompactionMarker(timestamp);

if (fs.existsSync(stateFile)) {
    try {
        const content = fs.readFileSync(stateFile, 'utf8');
        const updated = replaceCompactionMarker(content, marker);
        atomicWriteFile(stateFile, updated);
        console.error('[Super Compound] Pre-compact: Updated STATE.md with compaction marker');
    } catch (error) {
        console.error(`[Super Compound] Pre-compact: Could not update STATE.md: ${error.message}`);
    }
} else {
    console.error('[Super Compound] Pre-compact: No STATE.md found. Run /sc-pause before compacting for best results.');
}

try {
    const restored = spawnSync(process.execPath, [
        path.resolve(__dirname, '..', 'tools', 'memory-maintenance.mjs'),
        'resume', '--root', projectRoot, '--json',
    ], {encoding: 'utf8', timeout: 5000, maxBuffer: 128 * 1024});
    const state = restored.status === 0 ? JSON.parse(restored.stdout) : null;
    if (!state?.checkpoint) {
        console.error('[Super Compound] Pre-compact: checkpoint missing or invalid; run /sc-pause. Timestamp alone is not a handoff.');
    } else if (state.drift.length) {
        console.error('[Super Compound] Pre-compact: checkpoint contract drift; reconcile with /sc-status before dispatch.');
    } else {
        console.error('[Super Compound] Pre-compact: structured checkpoint available; verify STATE and ledger on resume.');
    }
} catch {
    console.error('[Super Compound] Pre-compact: checkpoint missing or invalid; run /sc-pause.');
}

console.error('');
console.error(`[Super Compound] Context compaction starting at ${timestamp}`);
console.error('  Files preserved: STATE.md, .continue-here.md, docs/');
console.error('  After new session: /sc-init reload, then /sc-status');
console.error('');
