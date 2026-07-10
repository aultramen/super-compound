#!/usr/bin/env node
/**
 * Suggest compaction from real transcript pressure, with session-scoped
 * tool-count fallback. Silent unless a structured PreToolUse reminder fires.
 */

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
    buildContextSuggestion,
    readLatestContextTokens,
} = require('./lib/context-pressure');

const TOOL_THRESHOLD = readPositiveInteger('COMPACT_THRESHOLD', 50);
const TOOL_INTERVAL = readPositiveInteger('COMPACT_REMINDER_INTERVAL', 25);
const STATE_TTL_MS = readPositiveInteger('COMPACT_STATE_TTL_DAYS', 14) * 86400000;

let input = {};
try {
    input = readStdinJson();
} catch (error) {
    console.error(`[Super Compound] Suggest compact: ${error.message}`);
}

let stateDir;
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
    stateDir = safeProjectFile(projectRoot, ['.agent', '.compact-state']);
    stateFile = safeProjectFile(projectRoot, ['.agent', '.compact-state', `${sessionId}.json`]);
} catch (error) {
    console.error(`[Super Compound] Suggest compact: ${error.message}`);
    return;
}

cleanupOldState(stateDir, stateFile);
const state = readState(stateFile);
state.count += 1;

const messages = [];
const usage = readLatestContextTokens(input.transcript_path);
const contextSuggestion = buildContextSuggestion(
    usage,
    state.lastContextBucket,
    process.env
);
if (contextSuggestion) {
    state.lastContextBucket = contextSuggestion.bucket;
    messages.push(contextSuggestion.message);
}

if (
    state.count === TOOL_THRESHOLD ||
    (state.count > TOOL_THRESHOLD &&
        (state.count - TOOL_THRESHOLD) % TOOL_INTERVAL === 0)
) {
    messages.push(
        `[Super Compound] Context checkpoint after ${state.count} tool calls. ` +
        'Use /sc-pause or /compact at the next logical boundary.'
    );
}

state.updatedAt = new Date().toISOString();
try {
    atomicWriteFile(stateFile, JSON.stringify(state));
} catch (error) {
    console.error(`[Super Compound] Suggest compact: state write failed: ${error.message}`);
}

if (messages.length > 0) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext:
                `${messages.join('\n')} Skip compaction while implementation or tests are active.`,
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
            count: Number.isInteger(parsed.count) && parsed.count >= 0 && parsed.count <= 1000000
                ? parsed.count
                : 0,
            lastContextBucket:
                Number.isInteger(parsed.lastContextBucket) && parsed.lastContextBucket >= -1
                    ? parsed.lastContextBucket
                    : -1,
            updatedAt: parsed.updatedAt,
        };
    } catch {
        return { count: 0, lastContextBucket: -1, updatedAt: null };
    }
}

function cleanupOldState(directory, activeFile) {
    if (!fs.existsSync(directory)) return;
    const cutoff = Date.now() - STATE_TTL_MS;
    try {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const candidate = path.join(directory, entry.name);
            if (!entry.isFile() || candidate === activeFile) continue;
            if (fs.statSync(candidate).mtimeMs < cutoff) fs.rmSync(candidate, { force: true });
        }
    } catch {
        // Cleanup is best-effort; active state still proceeds.
    }
}
