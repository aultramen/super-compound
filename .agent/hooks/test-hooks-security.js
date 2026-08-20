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
const { readLatestContextTokens } = require('./lib/context-pressure');

for (const configName of ['hooks.json']) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, configName), 'utf8'));
    const suggest = config.hooks.PreToolUse
        .flatMap((entry) => entry.hooks || [])
        .find((hook) => JSON.stringify(hook).includes('suggest-compact.js'));
    assert(suggest, `${configName} must register suggest-compact.js`);
    assert.notStrictEqual(suggest.async, true, `${configName} must keep additionalContext synchronous`);
    assert.strictEqual(suggest.command, 'node');
    assert.deepStrictEqual(suggest.args, [
        '${CLAUDE_PROJECT_DIR}/.agent/hooks/suggest-compact.js',
    ]);
    const stop = config.hooks.Stop.flatMap((entry) => entry.hooks || [])[0];
    assert(stop, `${configName} must register stop-check.js`);
    assert.notStrictEqual(stop.async, true, `${configName} must surface systemMessage synchronously`);
}

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
    hook_event_name: 'Stop',
    last_assistant_message: `console.log(1); ${apiKeyName}=alpha ${passwordName}: bravo`,
});
const stopResult = spawnSync(process.execPath, [path.join(__dirname, 'stop-check.js')], {
    input: stopPayload,
    encoding: 'utf8',
});
assert.strictEqual(stopResult.status, 0);
const stopOutput = JSON.parse(stopResult.stdout);
assert.match(stopOutput.systemMessage, /console\.log detected/);
assert.match(stopOutput.systemMessage, /sensitive-looking value/);
assert(!stopResult.stderr.includes('alpha'));
assert(!stopResult.stderr.includes('bravo'));

const oversizedStopResult = spawnSync(
    process.execPath,
    [path.join(__dirname, 'stop-check.js')],
    {
        input: JSON.stringify({ last_assistant_message: 'x'.repeat(1024 * 1024 + 1) }),
        encoding: 'utf8',
    }
);
assert.strictEqual(oversizedStopResult.status, 0);
assert.strictEqual(oversizedStopResult.stdout.trim(), '{}');
assert.match(oversizedStopResult.stderr, /exceeds 1048576 bytes/);

withTempProject((root) => {
    const suggestPayload = JSON.stringify({
        tool_input: {
            content: `${apiKeyName}=alpha private edit payload`,
        },
    });
    const suggestResult = spawnSync(process.execPath, [path.join(__dirname, 'suggest-compact.js')], {
        input: suggestPayload,
        encoding: 'utf8',
        env: {
            ...process.env,
            SUPER_COMPOUND_PROJECT_ROOT: root,
            COMPACT_THRESHOLD: '999999',
        },
    });

    assert.strictEqual(suggestResult.status, 0);
    assert.strictEqual(suggestResult.stdout, '');
    assert(!suggestResult.stderr.includes('alpha'));
    const stateDir = path.join(root, '.agent', '.compact-state');
    assert(fs.existsSync(stateDir));
    assert.strictEqual(fs.readdirSync(stateDir).length, 1);
});

withTempProject((root) => {
    const stateDir = path.join(root, '.agent', '.compact-state');
    for (const name of ['one.jsonl', 'two.jsonl']) {
        const transcriptPath = path.join(root, name);
        fs.writeFileSync(transcriptPath, '', 'utf8');
        const result = spawnSync(
            process.execPath,
            [path.join(__dirname, 'suggest-compact.js')],
            {
                input: JSON.stringify({ transcript_path: transcriptPath }),
                encoding: 'utf8',
                env: {
                    ...process.env,
                    SUPER_COMPOUND_PROJECT_ROOT: root,
                    COMPACT_THRESHOLD: '999999',
                },
            }
        );
        assert.strictEqual(result.status, 0);
    }
    assert.strictEqual(fs.readdirSync(stateDir).length, 2);
});

withTempProject((root) => {
    const transcriptPath = path.join(root, 'transcript.jsonl');
    fs.writeFileSync(transcriptPath, [
        JSON.stringify({ message: { role: 'assistant', model: 'claude-test', usage: {
            input_tokens: 80,
            cache_read_input_tokens: 40,
            cache_creation_input_tokens: 30,
        } } }),
        '',
    ].join('\n'), 'utf8');
    const input = JSON.stringify({
        session_id: 'session/context-pressure',
        transcript_path: transcriptPath,
    });
    const env = {
        ...process.env,
        SUPER_COMPOUND_PROJECT_ROOT: root,
        COMPACT_THRESHOLD: '999999',
        COMPACT_CONTEXT_THRESHOLD: '100',
        COMPACT_CONTEXT_INTERVAL: '50',
    };

    const first = spawnSync(process.execPath, [path.join(__dirname, 'suggest-compact.js')], {
        input,
        encoding: 'utf8',
        env,
    });
    const second = spawnSync(process.execPath, [path.join(__dirname, 'suggest-compact.js')], {
        input,
        encoding: 'utf8',
        env,
    });
    const output = JSON.parse(first.stdout);

    assert.match(output.hookSpecificOutput.additionalContext, /150 context tokens/i);
    assert.strictEqual(second.stdout, '');
});

withTempProject((root) => {
    const transcriptPath = path.join(root, 'large-record.jsonl');
    fs.writeFileSync(transcriptPath, JSON.stringify({
        padding: 'x'.repeat(300000),
        message: {
            role: 'assistant',
            model: 'claude-test',
            usage: { input_tokens: 170000 },
        },
    }), 'utf8');

    assert.deepStrictEqual(readLatestContextTokens(transcriptPath), {
        tokens: 170000,
        model: 'claude-test',
    });
});

withTempProject((root) => {
    const suggestResult = spawnSync(process.execPath, [path.join(__dirname, 'suggest-compact.js')], {
        input: JSON.stringify({ tool_input: { content: `${passwordName}=bravo` } }),
        encoding: 'utf8',
        env: {
            ...process.env,
            SUPER_COMPOUND_PROJECT_ROOT: root,
            COMPACT_THRESHOLD: '1',
        },
    });
    const output = JSON.parse(suggestResult.stdout);

    assert.strictEqual(output.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.match(output.hookSpecificOutput.additionalContext, /context checkpoint/i);
    assert(!suggestResult.stdout.includes('bravo'));
});

for (const script of ['pre-compact.js', 'session-end.js']) {
    withTempProject((root) => {
        const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
            input: JSON.stringify({ payload: `${apiKeyName}=alpha` }),
            encoding: 'utf8',
            env: {
                ...process.env,
                SUPER_COMPOUND_PROJECT_ROOT: root,
            },
        });

        assert.strictEqual(result.status, 0);
        assert.strictEqual(result.stdout, '');
        assert(!result.stderr.includes('alpha'));
    });
}

withTempProject((root) => {
    const stateDir = path.join(root, '.agent', '.compact-state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'solutions'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'ERROR_LOG.md'), '# Errors\n', 'utf8');
    fs.writeFileSync(path.join(root, 'docs', 'LEARNED_KNOWLEDGE.md'), '# Learned\n', 'utf8');
    const past = (Date.now() - 86400000) / 1000;
    for (const name of ['solutions', 'ERROR_LOG.md', 'LEARNED_KNOWLEDGE.md']) {
        fs.utimesSync(path.join(root, 'docs', name), past, past);
    }
    fs.writeFileSync(path.join(stateDir, 'nudge-session.json'), JSON.stringify({ count: 3 }), 'utf8');
    const env = { ...process.env, SUPER_COMPOUND_PROJECT_ROOT: root };

    const nudged = spawnSync(process.execPath, [path.join(__dirname, 'stop-check.js')], {
        input: JSON.stringify({ session_id: 'nudge-session', last_assistant_message: 'done' }),
        encoding: 'utf8',
        env,
    });
    assert.strictEqual(nudged.status, 0);
    assert.match(JSON.parse(nudged.stdout).systemMessage, /\/sc-compound/);

    const future = (Date.now() + 10000) / 1000;
    fs.utimesSync(path.join(root, 'docs', 'LEARNED_KNOWLEDGE.md'), future, future);
    const captured = spawnSync(process.execPath, [path.join(__dirname, 'stop-check.js')], {
        input: JSON.stringify({ session_id: 'nudge-session', last_assistant_message: 'done' }),
        encoding: 'utf8',
        env,
    });
    assert.strictEqual(captured.status, 0);
    assert.strictEqual(captured.stdout.trim(), '{}');

    const untouched = spawnSync(process.execPath, [path.join(__dirname, 'stop-check.js')], {
        input: JSON.stringify({ session_id: 'other-session', last_assistant_message: 'done' }),
        encoding: 'utf8',
        env,
    });
    assert.strictEqual(untouched.status, 0);
    assert.strictEqual(untouched.stdout.trim(), '{}');
});

withTempProject((root) => {
    const transcriptPath = path.join(root, 'usage-transcript.jsonl');
    fs.writeFileSync(transcriptPath, `${JSON.stringify({
        type: 'assistant',
        message: {
            usage: {
                input_tokens: 80,
                output_tokens: 20,
                reasoning_tokens: 5,
                cache_creation_input_tokens: 30,
                cache_read_input_tokens: 40,
            },
        },
    })}\n`, 'utf8');

    const result = spawnSync(process.execPath, [path.join(__dirname, 'session-end.js')], {
        input: JSON.stringify({ session_id: 'usage-session', transcript_path: transcriptPath }),
        encoding: 'utf8',
        env: {
            ...process.env,
            SUPER_COMPOUND_PROJECT_ROOT: root,
        },
    });
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');

    const logFile = path.join(root, '.agent', '.compact-state', 'usage-log.jsonl');
    const entries = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].session, 'usage-session');
    assert.strictEqual(entries[0].measurement, 'MEASURED');
    assert.strictEqual(entries[0].inputTokens, 80);
    assert.strictEqual(entries[0].outputTokens, 20);
    assert.strictEqual(entries[0].cacheCreationTokens, 30);
    assert.strictEqual(entries[0].cacheReadTokens, 40);
    assert.strictEqual(entries[0].conservativeTokens, 175);
});

withTempProject((root) => {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'session-end.js')], {
        input: JSON.stringify({
            session_id: 'missing-transcript',
            transcript_path: path.join(root, 'absent.jsonl'),
        }),
        encoding: 'utf8',
        env: {
            ...process.env,
            SUPER_COMPOUND_PROJECT_ROOT: root,
        },
    });
    assert.strictEqual(result.status, 0);
    assert(!fs.existsSync(path.join(root, '.agent', '.compact-state', 'usage-log.jsonl')));
});

console.log('hook security tests passed');
