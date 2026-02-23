#!/usr/bin/env node
/**
 * Super Compound — Suggest Compact Hook
 * 
 * Runs on PreToolUse (Edit/Write). Tracks tool call count and suggests
 * /pause at logical intervals based on count threshold.
 * 
 * Inspired by everything-claude-code's suggest-compact.js
 * 
 * Configuration:
 *   COMPACT_THRESHOLD env var — tool calls before first suggestion (default: 50)
 *   COMPACT_REMINDER_INTERVAL — calls between reminders (default: 25)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const THRESHOLD = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
const REMINDER_INTERVAL = parseInt(process.env.COMPACT_REMINDER_INTERVAL || '25', 10);

// Counter file stored per-project in .agent/
const projectRoot = process.cwd();
const counterFile = path.join(projectRoot, '.agent', '.tool-call-count');

function readCount() {
    try {
        if (fs.existsSync(counterFile)) {
            const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
            // Reset count if it's from a different day (new session)
            const today = new Date().toDateString();
            if (data.date !== today) return { count: 0, date: today };
            return data;
        }
    } catch { }
    return { count: 0, date: new Date().toDateString() };
}

function writeCount(count) {
    try {
        const dir = path.dirname(counterFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(counterFile, JSON.stringify({ count, date: new Date().toDateString() }), 'utf8');
    } catch { }
}

const data = readCount();
const newCount = data.count + 1;
writeCount(newCount);

// Check if we should suggest compaction
const shouldSuggest = newCount === THRESHOLD ||
    (newCount > THRESHOLD && (newCount - THRESHOLD) % REMINDER_INTERVAL === 0);

if (shouldSuggest) {
    console.error('');
    console.error(`[Super Compound] 🧠 Context checkpoint — ${newCount} tool calls this session`);
    console.error('');
    console.error('  Consider whether to compact context at this logical boundary:');
    console.error('');
    console.error('  COMPACT if:');
    console.error('    → You just finished a planning/research phase');
    console.error('    → You completed a major milestone');
    console.error('    → Debug traces are polluting context for new work');
    console.error('');
    console.error('  SKIP if:');
    console.error('    → Mid-implementation (would lose file/variable context)');
    console.error('    → Tests actively reference recent code changes');
    console.error('');
    console.error('  Run: /pause   → save state + create handoff → start fresh session');
    console.error('  Or:  /compact → compact in-place (keep conversation going)');
    console.error('');
}

// Pass through stdin unchanged
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    console.log(input || '{}');
});
