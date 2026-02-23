#!/usr/bin/env node
/**
 * Super Compound — Session End Hook
 * 
 * Runs when a session ends. Prompts the AI to:
 * 1. Save final state to STATE.md
 * 2. Suggest /compound if non-trivial problems were solved
 * 3. Append a progress entry to docs/progress.md
 * 
 * Inspired by everything-claude-code's session-end.js + evaluate-session.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const stateFile = path.join(projectRoot, 'docs', 'STATE.md');
const progressFile = path.join(projectRoot, 'docs', 'progress.md');
const continueFile = path.join(projectRoot, '.continue-here.md');

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function getTimestamp() {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

// Check if there's meaningful work done this session
const hasState = fs.existsSync(stateFile);
const hasContinue = fs.existsSync(continueFile);
const hasProgress = fs.existsSync(progressFile);

// Output suggestions to stderr (visible in Claude Code logs)
console.error('');
console.error('[Super Compound] Session ending. Checklist:');
console.error('');

if (!hasState) {
    console.error('  [ ] Consider running /compound to document solutions');
    console.error('  [ ] Consider /pause to create a handoff file');
} else {
    console.error('  [✓] STATE.md exists — state is tracked');
    console.error('  [ ] If you solved non-trivial problems, run /compound');
}

if (hasContinue) {
    console.error('  [✓] .continue-here.md exists — can /resume next session');
}

console.error('');
console.error('[Super Compound] To preserve context across sessions:');
console.error('  - Run /pause before closing');
console.error('  - Or /compound to document solutions');
console.error('');

// Pass through stdin unchanged
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    console.log(input || '{}');
});
