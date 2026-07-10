#!/usr/bin/env node
/**
 * Warn about suspicious response output without echoing sensitive diagnostics.
 */

const {
    readStdinJson,
    redactSensitiveText,
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
