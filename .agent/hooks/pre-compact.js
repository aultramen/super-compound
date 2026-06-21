#!/usr/bin/env node
/**
 * Super Compound - Pre-Compact Hook
 *
 * Runs before context compaction. Saves a timestamped note in docs/STATE.md
 * so the next session can recover context from disk.
 */

const fs = require('fs');
const path = require('path');
const {
    atomicWriteFile,
    buildCompactionMarker,
    passThroughStdin,
    replaceCompactionMarker,
    resolveHookProjectRoot,
    safeProjectFile,
} = require('./lib/hook-utils');

let projectRoot;
let stateFile;
let continueFile;

try {
    projectRoot = resolveHookProjectRoot(path.resolve(__dirname, '..', '..'));
    stateFile = safeProjectFile(projectRoot, ['docs', 'STATE.md']);
    continueFile = safeProjectFile(projectRoot, ['.continue-here.md']);
} catch (error) {
    console.error(`[Super Compound] Pre-compact: ${error.message}`);
    passThroughStdin();
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

if (fs.existsSync(continueFile)) {
    console.error('[Super Compound] Pre-compact: .continue-here.md present - /sc-status can route the next session');
}

console.error('');
console.error(`[Super Compound] Context compaction starting at ${timestamp}`);
console.error('  Files preserved: STATE.md, .continue-here.md, docs/');
console.error('  After new session: /sc-init reload, then /sc-status');
console.error('');

passThroughStdin();
