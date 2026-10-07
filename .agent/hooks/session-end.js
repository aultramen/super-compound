#!/usr/bin/env node
/**
 * Super Compound - Session End Hook
 *
 * Reports pending closeout exceptions and appends session token usage
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
const { readStdinJson, resolveHookProjectRoot, safeProjectFile, inspectPendingLearning } = require('./lib/hook-utils');

const USAGE_TOOL_TIMEOUT_MS = 20000;

let input = {};
try {
    input = readStdinJson();
} catch (error) {
    console.error(`[Super Compound] Session end: ${error.message}`);
}

let projectRoot;

try {
    projectRoot = resolveHookProjectRoot(
        process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
    );
} catch (error) {
    console.error(`[Super Compound] Session end: ${error.message}`);
}

if (projectRoot) {
    const learning = inspectPendingLearning(projectRoot);
    if (learning.pending) console.error(`[Super Compound] ${learning.pending} pending learning closeout(s); retry /sc-compound without replaying verified work`);
    if (learning.coverage==='incomplete') console.error('[Super Compound] Learning closeout inspection incomplete; inspect through /sc-status');
}

recordSessionUsage(projectRoot, input);

/**
 * Best-effort runtime telemetry: measure the ending session's transcript
 * with the deterministic transcript-usage tool and append one compact JSON
 * line to the audit-invisible runtime cache. Failures stay silent; the
 * pending closeout notices above are independent of telemetry.
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
        const parsed = JSON.parse(result.stdout);
        const totals = parsed.totals;
        if (!totals || typeof totals !== 'object') return;

        const entry = {
            ts: new Date().toISOString(),
            session: sanitizeSessionId(
                payload.session_id ||
                process.env.CLAUDE_SESSION_ID ||
                transcriptSessionId(payload.transcript_path)
            ),
            measurement: totals.measurement === 'MEASURED' ? 'MEASURED' : 'UNMEASURED',
            tokenSemantics: parsed.tokenSemantics || 'input_excludes_cache_output_excludes_reasoning',
            inputTokens: safeToken(totals.inputTokens),
            outputTokens: safeToken(totals.outputTokens),
            reasoningTokens: safeToken(totals.reasoningTokens),
            cacheCreationTokens: safeToken(totals.cacheCreationTokens),
            cacheReadTokens: safeToken(totals.cacheReadTokens),
            conservativeTokens: safeToken(totals.totalTokens ?? totals.conservativeTokens),
            assetReads: compactAssetReads(parsed.assetReads),
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

/**
 * Which framework assets (contracts, workflows, skills) the session actually
 * read: the activation evidence the static benchmark cannot supply. Keys are
 * repository-relative `.agent/...` paths only; the top 10 keep the log compact.
 */
function compactAssetReads(assetReads) {
    if (!assetReads || typeof assetReads !== 'object') return null;
    const top = Object.entries(assetReads.byAsset || {}).slice(0, 10);
    return {
        total: Number.isSafeInteger(assetReads.total) ? assetReads.total : 0,
        top: Object.fromEntries(top),
    };
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
