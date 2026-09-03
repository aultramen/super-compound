const fs = require('fs');

const STANDARD_WINDOW = 200000;
const LARGE_WINDOW = 1000000;
// Model families whose context window is known to be 1M tokens. Anything else
// without an explicit marker is an *assumed* 200k window, and the hooks say so
// instead of reporting a percentage that may be five times too pessimistic.
const LARGE_WINDOW_MODEL_RE = /claude-(?:opus|fable|mythos)-5\b/i;
const DEFAULT_TAIL_BYTES = 256 * 1024;
const MAX_RECORD_TAIL_BYTES = 1024 * 1024;
const DEFAULT_CONTEXT_INTERVAL = 60000;

function readLatestContextTokens(transcriptPath, tailBytes = DEFAULT_TAIL_BYTES) {
    if (typeof transcriptPath !== 'string' || !transcriptPath) return null;

    let descriptor;
    try {
        descriptor = fs.openSync(transcriptPath, 'r');
        const size = fs.fstatSync(descriptor).size;
        let bytesToRead = Math.min(size, Math.max(1, tailBytes));
        const maximum = Math.min(
            size,
            Math.max(bytesToRead, MAX_RECORD_TAIL_BYTES)
        );

        while (bytesToRead > 0) {
            const start = size - bytesToRead;
            const buffer = Buffer.alloc(bytesToRead);
            const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, start);
            const lines = buffer.toString('utf8', 0, bytesRead).split('\n');
            const firstCompleteLine = start > 0 ? 1 : 0;

            for (let index = lines.length - 1; index >= firstCompleteLine; index -= 1) {
                const line = lines[index].trim();
                if (!line) continue;

                let record;
                try {
                    record = JSON.parse(line);
                } catch {
                    continue;
                }

                const usage = record?.message?.usage;
                if (!usage || typeof usage !== 'object') continue;
                const tokens =
                    finiteToken(usage.input_tokens) +
                    finiteToken(usage.cache_read_input_tokens) +
                    finiteToken(usage.cache_creation_input_tokens);
                if (tokens > 0) {
                    return {
                        tokens,
                        model: typeof record.message.model === 'string' ? record.message.model : '',
                    };
                }
            }

            if (start === 0 || lines.length > 1 || bytesToRead >= maximum) break;
            bytesToRead = Math.min(maximum, bytesToRead * 2);
        }
    } catch {
        return null;
    } finally {
        if (descriptor !== undefined) {
            try { fs.closeSync(descriptor); } catch { }
        }
    }

    return null;
}

function buildContextSuggestion(usage, lastBucket, env = process.env) {
    if (!usage) return null;
    const { windowTokens, detected } = resolveContextWindow(usage.tokens, usage.model, env);
    const threshold = resolveSetting(
        env.COMPACT_CONTEXT_THRESHOLD,
        windowTokens >= LARGE_WINDOW ? 700000 : 160000,
        true
    );
    if (threshold === 0 || usage.tokens < threshold) return null;

    const interval = resolveSetting(
        env.COMPACT_CONTEXT_INTERVAL,
        DEFAULT_CONTEXT_INTERVAL,
        false
    );
    const bucket = Math.floor((usage.tokens - threshold) / interval);
    if (bucket <= lastBucket) return null;

    // No token count or percentage: a countdown in context makes the model wrap up early.
    const note = detected
        ? ''
        : ` (window assumed ${formatWindow(windowTokens)}; set CLAUDE_CODE_AUTO_COMPACT_WINDOW if larger)`;
    return {
        bucket,
        message:
            `[Super Compound] Context pressure is high${note}. ` +
            'Compact at the next logical boundary.',
    };
}

/**
 * Resolve the host context window. `detected` is true only for an explicit
 * override, a `[1m]` marker, a known 1M model family, or observed usage above
 * 200k; otherwise the 200k window is an assumption and callers must say so.
 */
function resolveContextWindow(tokens, model, env = process.env) {
    const override = Number.parseInt(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '', 10);
    if (Number.isInteger(override) && override > 0) {
        return { windowTokens: override, detected: true };
    }
    const name = String(model || '');
    if (name.includes('[1m]') || LARGE_WINDOW_MODEL_RE.test(name) || tokens > STANDARD_WINDOW) {
        return { windowTokens: LARGE_WINDOW, detected: true };
    }
    return { windowTokens: STANDARD_WINDOW, detected: false };
}

function formatWindow(windowTokens) {
    return windowTokens >= LARGE_WINDOW ? '1M' : `${Math.round(windowTokens / 1000)}k`;
}

function resolveSetting(raw, fallback, allowZero) {
    const parsed = Number.parseInt(raw || '', 10);
    if (allowZero && parsed === 0) return 0;
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 10000000
        ? parsed
        : fallback;
}

function finiteToken(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

module.exports = {
    LARGE_WINDOW,
    buildContextSuggestion,
    formatWindow,
    readLatestContextTokens,
    resolveContextWindow,
};
