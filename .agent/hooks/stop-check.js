#!/usr/bin/env node
/**
 * Warn about suspicious response output without echoing sensitive diagnostics.
 * Also nudge /sc-compound when the session edited source files but the
 * knowledge docs were not updated afterwards. Advisory only; never blocks.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('stop-check')) {
    process.exit(0);
}

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const {
    readStdinJson,
    redactSensitiveText,
    resolveHookProjectRoot,
    safeProjectFile,
} = require('./lib/hook-utils');

const MAX_INSPECT_CHARS = 20000;

try {
    const payload = readStdinJson();
    const assistantMessage = String(
        payload.last_assistant_message ?? payload.tool_output?.output ?? ''
    ).slice(0, MAX_INSPECT_CHARS);
    const warnings = [];
    if (/console\.log/.test(assistantMessage)) {
        warnings.push('console.log detected in the final response; inspect changed code before commit');
    }

    const redacted = redactSensitiveText(assistantMessage);
    if (redacted !== assistantMessage) {
        warnings.push('sensitive-looking value detected; the hook did not echo it');
    }

    const compoundNudge = buildCompoundNudge(payload);
    if (compoundNudge) {
        warnings.push(compoundNudge);
    }
    if (warnings.length > 0) {
        process.stdout.write(`${JSON.stringify({
            systemMessage: `[Super Compound] ${warnings.join('; ')}.`,
        })}\n`);
    } else {
        process.stdout.write('{}\n');
    }
} catch (error) {
    console.error(`[Hook] Warning: ${error.message}`);
    process.stdout.write('{}\n');
}

/**
 * Deterministic, cheap heuristic: suggest-compact writes
 * `.agent/.compact-state/<sessionId>.json` only on Edit|Write PreToolUse, so
 * its presence means this session touched source files and its mtime is the
 * last source touch. If no knowledge doc was updated at or after that point,
 * suggest /sc-compound. Any failure stays silent.
 */
function buildCompoundNudge(payload) {
    try {
        const projectRoot = resolveHookProjectRoot(
            process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
        );
        const sessionId = sanitizeSessionId(
            payload.session_id ||
            process.env.CLAUDE_SESSION_ID ||
            transcriptSessionId(payload.transcript_path)
        );
        const stateFile = safeProjectFile(projectRoot, ['.agent', '.compact-state', `${sessionId}.json`]);
        if (!fs.existsSync(stateFile)) return null;
        const lastSourceTouchMs = fs.statSync(stateFile).mtimeMs;

        const knowledgeTargets = [
            ['docs', 'solutions'],
            ['docs', 'ERROR_LOG.md'],
            ['docs', 'LEARNED_KNOWLEDGE.md'],
        ];
        for (const parts of knowledgeTargets) {
            const target = safeProjectFile(projectRoot, parts);
            if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= lastSourceTouchMs) {
                return null;
            }
        }
        return 'this session edited files without capturing knowledge; consider /sc-compound';
    } catch {
        return null;
    }
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
