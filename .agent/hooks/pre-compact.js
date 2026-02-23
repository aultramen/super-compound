#!/usr/bin/env node
/**
 * Super Compound — Pre-Compact Hook
 * 
 * Runs before context compaction. Saves a snapshot of STATE.md
 * with a compaction timestamp so state is preserved through compaction.
 * 
 * Inspired by everything-claude-code's pre-compact.js
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

// If STATE.md exists, append compaction note
if (fs.existsSync(stateFile)) {
    try {
        const content = fs.readFileSync(stateFile, 'utf8');

        // Check if we already have a compaction marker
        if (!content.includes('## Last Compaction')) {
            const compactionNote = `\n\n---\n## Last Compaction\n\n**When:** ${timestamp}\n**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.\n**After resume:** Run /reload then /resume to restore full context.\n`;
            fs.writeFileSync(stateFile, content + compactionNote, 'utf8');
            console.error(`[Super Compound] Pre-compact: Updated STATE.md with compaction marker`);
        } else {
            // Update existing compaction marker
            const updated = content.replace(
                /## Last Compaction[\s\S]*?(?=\n---|\n##|$)/,
                `## Last Compaction\n\n**When:** ${timestamp}\n**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.\n**After resume:** Run /reload then /resume to restore full context.\n`
            );
            fs.writeFileSync(stateFile, updated, 'utf8');
            console.error(`[Super Compound] Pre-compact: Updated compaction timestamp in STATE.md`);
        }
    } catch (e) {
        console.error(`[Super Compound] Pre-compact: Could not update STATE.md: ${e.message}`);
    }
} else {
    console.error(`[Super Compound] Pre-compact: No STATE.md found. Run /pause before compacting for best results.`);
}

// If .continue-here.md exists, log it
if (fs.existsSync(continueFile)) {
    console.error(`[Super Compound] Pre-compact: .continue-here.md present — /resume will work after compaction`);
}

console.error('');
console.error(`[Super Compound] ⚡ Context compaction starting at ${timestamp}`);
console.error('  Files preserved: STATE.md, .continue-here.md, docs/');
console.error('  After new session: /reload → /resume');
console.error('');

// Pass through stdin unchanged
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    console.log(input || '{}');
});
