#!/usr/bin/env node
/**
 * Super Compound - Session End Hook
 *
 * Prints a lightweight closeout checklist. It does not mutate project files.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('session-end')) {
    process.exit(0);
}

const fs = require('fs');
const path = require('path');
const { resolveHookProjectRoot, safeProjectFile } = require('./lib/hook-utils');

let stateFile;
let continueFile;

try {
    const projectRoot = resolveHookProjectRoot(
        process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
    );
    stateFile = safeProjectFile(projectRoot, ['docs', 'STATE.md']);
    continueFile = safeProjectFile(projectRoot, ['.continue-here.md']);
} catch (error) {
    console.error(`[Super Compound] Session end: ${error.message}`);
}

const hasState = stateFile ? fs.existsSync(stateFile) : false;
const hasContinue = continueFile ? fs.existsSync(continueFile) : false;

console.error('');
console.error('[Super Compound] Session ending. Checklist:');
console.error('');

if (!hasState) {
    console.error('  [ ] Consider /sc-pause to create a durable handoff');
    console.error('  [ ] Consider /sc-compound if you solved a reusable problem');
} else {
    console.error('  [OK] STATE.md exists - state is tracked');
    console.error('  [ ] If you solved non-trivial problems, run /sc-compound');
}

if (hasContinue) {
    console.error('  [OK] .continue-here.md exists - /sc-status can route the next session');
}

console.error('');
console.error('[Super Compound] To preserve context across sessions:');
console.error('  - Run /sc-pause before closing');
console.error('  - Run /sc-compound to document reusable solutions');
console.error('');
