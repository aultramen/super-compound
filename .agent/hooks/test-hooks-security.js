#!/usr/bin/env node
/**
 * Security regression tests for Super Compound hook helpers.
 */

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    atomicWriteFile,
    buildCompactionMarker,
    redactSensitiveText,
    replaceCompactionMarker,
    resolveHookProjectRoot,
    safeProjectFile,
} = require('./lib/hook-utils');

function withTempProject(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-hooks-'));
    fs.mkdirSync(path.join(root, '.agent', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    try {
        fn(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

withTempProject((root) => {
    const resolved = resolveHookProjectRoot(root);
    assert.strictEqual(resolved, fs.realpathSync(root));
});

withTempProject((root) => {
    const statePath = safeProjectFile(root, ['docs', 'STATE.md']);
    fs.writeFileSync(statePath, '# State\n\n## Last Compaction\n\nUser notes stay here.\n', 'utf8');

    const marker = buildCompactionMarker('2026-06-21 19:00');
    const updated = replaceCompactionMarker(fs.readFileSync(statePath, 'utf8'), marker);

    assert.match(updated, /## Last Compaction\n\nUser notes stay here\./);
    assert.match(updated, /sc:last-compaction:start/);
});

withTempProject((root) => {
    const target = safeProjectFile(root, ['docs', 'STATE.md']);
    fs.writeFileSync(target, 'old', 'utf8');
    atomicWriteFile(target, 'new');
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'new');
});

if (process.platform !== 'win32') {
    withTempProject((root) => {
        const outside = path.join(os.tmpdir(), `sc-outside-${Date.now()}`);
        fs.writeFileSync(outside, 'outside', 'utf8');
        const link = path.join(root, 'docs', 'STATE.md');
        fs.symlinkSync(outside, link);

        assert.throws(() => safeProjectFile(root, ['docs', 'STATE.md']), /symlink/i);

        fs.unlinkSync(link);
        fs.rmSync(outside, { force: true });
    });
}

const apiKeyName = 'API_' + 'KEY';
const passwordName = 'pass' + 'word';
const redacted = redactSensitiveText(`${apiKeyName}=alpha ${passwordName}: bravo normal text`);
assert(!redacted.includes('alpha'));
assert(!redacted.includes('bravo'));
assert.match(redacted, /API_KEY=\[REDACTED\]/);
assert.match(redacted, /password: \[REDACTED\]/);

const stopPayload = JSON.stringify({
    tool_output: {
        output: `console.log(1); ${apiKeyName}=alpha ${passwordName}: bravo`,
    },
});
const stopResult = spawnSync(process.execPath, [path.join(__dirname, 'stop-check.js')], {
    input: stopPayload,
    encoding: 'utf8',
});
assert.strictEqual(stopResult.status, 0);
assert.strictEqual(stopResult.stdout.trim(), '{}');
assert(!stopResult.stderr.includes('alpha'));
assert(!stopResult.stderr.includes('bravo'));
assert.match(stopResult.stderr, /console\.log detected/);
assert.match(stopResult.stderr, /sensitive-looking value/);

console.log('hook security tests passed');
