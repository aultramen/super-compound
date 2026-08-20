#!/usr/bin/env node
/**
 * Super Compound - Session End Hook
 *
 * Prints a lightweight closeout checklist and appends session token usage
 * to the runtime usage log. It does not mutate project files; it only
 * writes runtime cache under `.agent/.compact-state/`.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('session-end')) {
    process.exit(0);
}

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createHash } = require('crypto');
const { readStdinJson, resolveHookProjectRoot, safeProjectFile } = require('./lib/hook-utils');

const USAGE_TOOL_TIMEOUT_MS = 20000;

let input = {};
try {
    input = readStdinJson();
} catch (error) {
    console.error(`[Super Compound] Session end: ${error.message}`);
}

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

recordSessionUsage(projectRoot, input);

/**
 * Best-effort runtime telemetry: measure the ending session's transcript
 * with the deterministic transcript-usage tool and append one compact JSON
 * line to the audit-invisible runtime cache. Failures stay silent; the
 * closeout checklist above already printed.
 */
function recordSessionUsage(root, payload) {
    try {
        if (!root || typeof payload.transcript_path !== 'string' || !payload.transcript_path) return;
        const tool = path.resolve(__dirname, '..', 'tools', 'transcript-usage.mjs');
        const result = spawnSync(process.execPath, [tool, payload.transcript_path], {
            encoding: 'utf8',
            timeout: USAGE_TOOL_TIMEOUT_MS,
            maxBuffer: 4 * 1024 * 1024,
        });
        if (result.error || result.status !== 0 || !result.stdout) return;
        const totals = JSON.parse(result.stdout).totals;
        if (!totals || typeof totals !== 'object') return;

        const entry = {
            ts: new Date().toISOString(),
            session: sanitizeSessionId(
                payload.session_id ||
                process.env.CLAUDE_SESSION_ID ||
                transcriptSessionId(payload.transcript_path)
            ),
            measurement: totals.measurement === 'MEASURED' ? 'MEASURED' : 'UNMEASURED',
            inputTokens: safeToken(totals.inputTokens),
            outputTokens: safeToken(totals.outputTokens),
            cacheCreationTokens: safeToken(totals.cacheCreationTokens),
            cacheReadTokens: safeToken(totals.cacheReadTokens),
            conservativeTokens: safeToken(totals.totalTokens ?? totals.conservativeTokens),
        };
        const logDir = safeProjectFile(root, ['.agent', '.compact-state']);
        const logFile = safeProjectFile(root, ['.agent', '.compact-state', 'usage-log.jsonl']);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch {
        // Telemetry is best-effort and must never break session end.
    }
}

function safeToken(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sanitizeSessionId(value) {
    return String(value || 'default')
        .replace(/[^A-Za-z0-9_-]/g, '')
        .slice(0, 80) || 'default';
}

function transcriptSessionId(value) {
    if (typeof value !== 'string' || !value) return '';
    return `transcript_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}
