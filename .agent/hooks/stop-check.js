#!/usr/bin/env node
/**
 * Warn about suspicious response output without echoing sensitive diagnostics.
 */

const { redactSensitiveText } = require('./lib/hook-utils');

const MAX_INSPECT_CHARS = 20000;

let input = '';
process.stdin.on('data', (chunk) => {
    input += chunk;
});

process.stdin.on('end', () => {
    try {
        const payload = JSON.parse(input || '{}');
        const toolOutput = String(payload.tool_output?.output || '').slice(0, MAX_INSPECT_CHARS);
        if (/console\.log/.test(toolOutput)) {
            console.error('[Hook] Warning: console.log detected in output. Consider removing before commit.');
        }

        const redacted = redactSensitiveText(toolOutput);
        if (redacted !== toolOutput) {
            console.error('[Hook] Warning: sensitive-looking value detected in output; diagnostics redacted.');
        }
    } catch {
        console.error('[Hook] Warning: could not parse Stop hook payload.');
    }

    process.stdout.write('{}\n');
});
