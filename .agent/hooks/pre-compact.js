#!/usr/bin/env node
/**
 * Super Compound - Pre-Compact Hook
 *
 * Runs before context compaction. Saves a timestamped note in docs/STATE.md
 * so the next session can recover context from disk.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const stateFile = path.join(projectRoot, 'docs', 'STATE.md');
const continueFile = path.join(projectRoot, '.continue-here.md');

function getTimestamp() {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

const timestamp = getTimestamp();
const marker = `## Last Compaction\n\n**When:** ${timestamp}\n**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.\n**After compaction:** Run /sc-init reload, then /sc-status to restore context.\n`;

if (fs.existsSync(stateFile)) {
    try {
        const content = fs.readFileSync(stateFile, 'utf8');

        if (!content.includes('## Last Compaction')) {
            fs.writeFileSync(stateFile, `${content}\n\n---\n${marker}`, 'utf8');
            console.error('[Super Compound] Pre-compact: Updated STATE.md with compaction marker');
        } else {
            const updated = content.replace(/## Last Compaction[\s\S]*?(?=\n---|\n##|$)/, marker);
            fs.writeFileSync(stateFile, updated, 'utf8');
            console.error('[Super Compound] Pre-compact: Updated compaction timestamp in STATE.md');
        }
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

let input = '';
process.stdin.on('data', (chunk) => {
    input += chunk;
});
process.stdin.on('end', () => {
    console.log(input || '{}');
});
