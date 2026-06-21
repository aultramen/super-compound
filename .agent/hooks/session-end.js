#!/usr/bin/env node
/**
 * Super Compound - Session End Hook
 *
 * Prints a lightweight closeout checklist. It does not mutate project files.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const stateFile = path.join(projectRoot, 'docs', 'STATE.md');
const continueFile = path.join(projectRoot, '.continue-here.md');

const hasState = fs.existsSync(stateFile);
const hasContinue = fs.existsSync(continueFile);

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

let input = '';
process.stdin.on('data', (chunk) => {
    input += chunk;
});
process.stdin.on('end', () => {
    console.log(input || '{}');
});
