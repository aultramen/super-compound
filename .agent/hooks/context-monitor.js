#!/usr/bin/env node
/**
 * Super Compound - Context Monitor Hook (PostToolUse)
 *
 * Injects an agent-facing note when remaining context drops below
 * thresholds: WARNING ("persist state, continue"), CRITICAL ("hand off").
 * Defaults: 35%/25% remaining on a 200k window, 15%/8% on a detected 1M
 * window. The note never states a remaining-token count: a countdown in
 * context makes the model wrap up early. Each level fires once per session.
 * Deterministic, local-first; reads only the transcript tail.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('context-monitor')) {
    process.exit(0);
}

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const {
    atomicWriteFile,
    readPositiveInteger,
    readStdinJson,
    resolveHookProjectRoot,
    safeProjectFile,
} = require('./lib/hook-utils');
const {
    LARGE_WINDOW,
    formatWindow,
    readLatestContextTokens,
    resolveContextWindow,
} = require('./lib/context-pressure');

let input = {};
try {
    input = readStdinJson();
} catch (error) {
    console.error(`[Super Compound] Context monitor: ${error.message}`);
}

let stateFile;
try {
    const projectRoot = resolveHookProjectRoot(
        process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
    );
    const sessionId = sanitizeSessionId(
        input.session_id ||
        process.env.CLAUDE_SESSION_ID ||
        transcriptSessionId(input.transcript_path)
    );
    safeProjectFile(projectRoot, ['.agent', '.compact-state']);
    stateFile = safeProjectFile(
        projectRoot,
        ['.agent', '.compact-state', `${sessionId}-monitor.json`]
    );
} catch (error) {
    console.error(`[Super Compound] Context monitor: ${error.message}`);
    process.exit(0);
}

const usage = readLatestContextTokens(input.transcript_path);
if (!usage) process.exit(0);

const { windowTokens, detected } = resolveContextWindow(usage.tokens, usage.model, process.env);
const largeWindow = windowTokens >= LARGE_WINDOW;
const WARN_REMAINING_PCT = readPositiveInteger('SC_CONTEXT_WARN_PCT', largeWindow ? 15 : 35);
const CRITICAL_REMAINING_PCT = readPositiveInteger('SC_CONTEXT_CRITICAL_PCT', largeWindow ? 8 : 25);
const remainingPct = Math.max(
    0,
    Math.round(100 - (usage.tokens / windowTokens) * 100)
);
// The note carries no token count or percentage; an assumed window says so.
const note = detected
    ? ''
    : ` (window not detected; assumed ${formatWindow(windowTokens)} window, ` +
      'set CLAUDE_CODE_AUTO_COMPACT_WINDOW if larger)';

const state = readState(stateFile);
let message = null;
if (remainingPct <= CRITICAL_REMAINING_PCT && !state.criticalFired) {
    state.criticalFired = true;
    state.warnFired = true;
    message =
        `[Super Compound] CRITICAL: context is nearly exhausted${note}. ` +
        'Update docs/STATE.md with the exact Next Action, write .continue-here.md, ' +
        'then hand off via /sc-pause.';
} else if (remainingPct <= WARN_REMAINING_PCT && !state.warnFired) {
    state.warnFired = true;
    message =
        `[Super Compound] WARNING: context is running low${note}. ` +
        'Persist the docs/STATE.md Next Action at the next natural boundary, then continue.';
}

if (message) {
    state.updatedAt = new Date().toISOString();
    try {
        atomicWriteFile(stateFile, JSON.stringify(state));
    } catch (error) {
        console.error(`[Super Compound] Context monitor: state write failed: ${error.message}`);
    }
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: message,
        },
    }));
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

function readState(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return {
            warnFired: parsed.warnFired === true,
            criticalFired: parsed.criticalFired === true,
            updatedAt: parsed.updatedAt,
        };
    } catch {
        return { warnFired: false, criticalFired: false, updatedAt: null };
    }
}
