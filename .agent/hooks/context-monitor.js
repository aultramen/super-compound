#!/usr/bin/env node
/**
 * Super Compound - Context Monitor Hook (PostToolUse)
 *
 * Injects an agent-facing warning when remaining context drops below
 * thresholds: WARNING at <=35% remaining ("wrap up"), CRITICAL at <=25%
 * remaining ("stop and save state"). Each level fires once per session.
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
const { readLatestContextTokens } = require('./lib/context-pressure');

const STANDARD_WINDOW = 200000;
const LARGE_WINDOW = 1000000;
const WARN_REMAINING_PCT = readPositiveInteger('SC_CONTEXT_WARN_PCT', 35);
const CRITICAL_REMAINING_PCT = readPositiveInteger('SC_CONTEXT_CRITICAL_PCT', 25);

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

const windowTokens = resolveWindowTokens(usage.tokens, usage.model, process.env);
const remainingPct = Math.max(
    0,
    Math.round(100 - (usage.tokens / windowTokens) * 100)
);

const state = readState(stateFile);
let message = null;
if (remainingPct <= CRITICAL_REMAINING_PCT && !state.criticalFired) {
    state.criticalFired = true;
    state.warnFired = true;
    message =
        `[Super Compound] CRITICAL: ~${remainingPct}% context remaining. ` +
        'Stop new work now: update docs/STATE.md with exact Next Action, ' +
        'write .continue-here.md, then finish or hand off via /sc-pause.';
} else if (remainingPct <= WARN_REMAINING_PCT && !state.warnFired) {
    state.warnFired = true;
    message =
        `[Super Compound] WARNING: ~${remainingPct}% context remaining. ` +
        'Wrap up the current step; avoid opening large files or new scope. ' +
        'Prefer finishing at the next logical boundary.';
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

function resolveWindowTokens(tokens, model, env) {
    const override = Number.parseInt(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '', 10);
    if (Number.isInteger(override) && override > 0) return override;
    if (String(model).includes('[1m]') || tokens > STANDARD_WINDOW) return LARGE_WINDOW;
    return STANDARD_WINDOW;
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
