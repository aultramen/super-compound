#!/usr/bin/env node
/**
 * Warn about suspicious response output without echoing sensitive diagnostics.
 * Report actual pending learning maintenance. Advisory only; never blocks.
 */

if ((process.env.SC_DISABLED_HOOKS || '').split(',').map((s) => s.trim()).includes('stop-check')) {
    process.exit(0);
}

const path = require('path');
const {
    readStdinJson,
    redactSensitiveText,
    resolveHookProjectRoot,
    inspectPendingLearning,
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
 * Read-only checkpoint/pending-input inspection; unrelated memory writes
 * cannot hide unresolved closeout. Legacy absence remains advisory.
 */
function buildCompoundNudge(payload) {
    try {
        const projectRoot = resolveHookProjectRoot(
            process.env.SUPER_COMPOUND_PROJECT_ROOT || path.resolve(__dirname, '..', '..')
        );
        const status = inspectPendingLearning(projectRoot);
        if (status.pending) return `${status.pending} pending learning closeout(s); retry through /sc-compound without replaying verified work`;
        if (status.coverage==='incomplete') return 'learning closeout inspection incomplete; inspect through /sc-status';
        return null;
    } catch {
        return null;
    }
}
