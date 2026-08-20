import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    buildReport,
    collectObservations,
    planArchive,
    runCheck,
    runReport,
} from './memory-maintenance.mjs';

const TOOL = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'memory-maintenance.mjs'
);

function makeRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    return root;
}

function buildErrorLog(items) {
    const rows = items.map(
        (it) => `| ${it.id} | ${it.category} | ${it.prevention || 'IF x THEN y'} |`
    );
    const entries = items.map((it) =>
        [
            `## ${it.id} - ${it.category}`,
            `- Symptom: ${it.symptom || 'observed failure'}`,
            `- Root cause: ${it.rootCause || 'why'}`,
            `- Correct approach: ${it.correct || 'verified correction'}`,
            `- Prevention: ${it.prevention || 'IF x THEN y'}`,
            '- Files: docs/example.md',
        ].join('\n')
    );
    return [
        '# Error Log',
        '',
        '## Quick Reference',
        '',
        '| ID | Category | Prevention rule (IF-THEN) |',
        '| --- | --- | --- |',
        ...rows,
        '',
        '---',
        '',
        entries.join('\n\n'),
        '',
    ].join('\n');
}

function buildLearned(items) {
    const rows = items.map(
        (it) =>
            `| ${it.id} | ${it.scope || 'project'} | ${it.confidence || 'observed'} | ${it.rule || 'IF a THEN b'} |`
    );
    const entries = items.map((it) =>
        [
            `## ${it.id} - ${it.topic}`,
            `- Learning: ${it.learning || 'confirmed pattern'}`,
            `- Confidence: ${it.confidence || 'observed'}`,
            `- Applies to: ${it.scope || 'project'}`,
            `- Action rule: ${it.rule || 'IF a THEN b'}`,
            `- Source: ${it.source || 'repeated observation'}`,
            ...(it.extra ? [it.extra] : []),
        ].join('\n')
    );
    return [
        '# Learned Knowledge',
        '',
        '## Quick Reference',
        '',
        '| ID | Scope | Confidence | Action rule (IF-THEN) |',
        '| --- | --- | --- | --- |',
        ...rows,
        '',
        '---',
        '',
        entries.join('\n\n'),
        '',
    ].join('\n');
}

function writeDocs(root, { errorLog, learned }) {
    if (errorLog !== undefined) {
        fs.writeFileSync(path.join(root, 'docs', 'ERROR_LOG.md'), errorLog);
    }
    if (learned !== undefined) {
        fs.writeFileSync(path.join(root, 'docs', 'LEARNED_KNOWLEDGE.md'), learned);
    }
}

function errItems(count, category, opts = {}) {
    return Array.from({ length: count }, (_, i) => ({
        id: `ERR-2026-01-${String(i + 1).padStart(2, '0')}-001`,
        category,
        ...opts,
    }));
}

test('check passes on well-formed files and missing files are ok', (t) => {
    const root = makeRoot(t);
    assert.equal(runCheck({ root }).ok, true);
    writeDocs(root, {
        errorLog: buildErrorLog(errItems(2, 'timeout-handling')),
        learned: buildLearned([
            { id: 'LRN-2026-02-01-001', topic: 'commit style' },
        ]),
    });
    const result = runCheck({ root });
    assert.deepEqual(result.findings, []);
    assert.equal(result.ok, true);
});

test('check flags bad ID grammar, missing fields, bad confidence, table drift', (t) => {
    const root = makeRoot(t);
    const errorLog = buildErrorLog(errItems(1, 'timeout-handling')).replace(
        '- Prevention: IF x THEN y\n',
        ''
    );
    const learned = [
        '# Learned Knowledge',
        '',
        '## Quick Reference',
        '',
        '| ID | Scope | Confidence | Action rule (IF-THEN) |',
        '| --- | --- | --- | --- |',
        '| LRN-2026-02-01-001 | project | observed | IF a THEN b |',
        '| LRN-2026-09-09-009 | project | observed | IF a THEN b |',
        '',
        '---',
        '',
        '## LRN-2026-02-01-001 - commit style',
        '- Learning: confirmed pattern',
        '- Confidence: definitely',
        '- Applies to: project',
        '',
        '## LRN-BAD - malformed id',
        '- Learning: x',
        '- Confidence: observed',
        '- Applies to: project',
        '',
    ].join('\n');
    writeDocs(root, { errorLog, learned });
    const result = runCheck({ root });
    assert.equal(result.ok, false);
    const messages = result.findings.map((f) => f.message);
    assert.ok(messages.some((m) => m.includes('missing required field "Prevention"')));
    assert.ok(messages.some((m) => m.includes('invalid entry ID "LRN-BAD"')));
    assert.ok(messages.some((m) => m.includes('invalid Confidence "definitely"')));
    assert.ok(
        messages.some((m) =>
            m.includes('Quick Reference row LRN-2026-09-09-009 has no matching entry')
        )
    );
});

test('check enforces entry and size caps', (t) => {
    const root = makeRoot(t);
    const overCount = Array.from({ length: 51 }, (_, i) => ({
        id: `ERR-2026-03-${String((i % 28) + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
        category: `cat-${i}`,
    }));
    writeDocs(root, {
        errorLog: buildErrorLog(overCount),
        learned: buildLearned([
            {
                id: 'LRN-2026-02-01-001',
                topic: 'padding',
                learning: 'x'.repeat(31 * 1024),
            },
        ]),
    });
    const messages = runCheck({ root }).findings.map((f) => f.message);
    assert.ok(messages.some((m) => m.includes('entry cap exceeded: 51 entries > 50')));
    assert.ok(messages.some((m) => m.includes('size cap exceeded')));
});

test('report promotes 3+ recurrences across files and solutions frontmatter', (t) => {
    const root = makeRoot(t);
    writeDocs(root, {
        errorLog: buildErrorLog([
            ...errItems(2, 'config-issues'),
            { id: 'ERR-2026-01-09-001', category: 'one-off' },
        ]),
    });
    const solutionsDir = path.join(root, 'docs', 'solutions', 'config-issues');
    fs.mkdirSync(solutionsDir, { recursive: true });
    fs.writeFileSync(
        path.join(solutionsDir, 'rules-drift.md'),
        ['---', 'category: config-issues', '---', '# Rules drift', 'body'].join('\n')
    );
    const report = runReport({ root });
    assert.deepEqual(report.totals, { errors: 3, learnings: 0, solutions: 1 });
    const candidate = report.candidates.find(
        (c) => c.kind === 'category' && c.key === 'config issues'
    );
    assert.ok(candidate);
    assert.equal(candidate.count, 3);
    assert.ok(candidate.evidence.includes('ERR-2026-01-01-001'));
    assert.ok(candidate.evidence.some((id) => id.endsWith('rules-drift.md')));
    assert.ok(!report.candidates.some((c) => c.key === 'one off'));
});

test('report ignores inferred learnings but honors the PATTERN flag', (t) => {
    const root = makeRoot(t);
    writeDocs(root, {
        learned: buildLearned([
            { id: 'LRN-2026-02-01-001', topic: 'retry', confidence: 'inferred' },
            { id: 'LRN-2026-02-02-001', topic: 'retry', confidence: 'inferred' },
            { id: 'LRN-2026-02-03-001', topic: 'retry', confidence: 'inferred' },
            {
                id: 'LRN-2026-02-04-001',
                topic: 'naming',
                confidence: 'observed',
                extra: '- Flags: PATTERN',
            },
        ]),
    });
    const { candidates } = buildReport(collectObservations({ root }));
    assert.ok(!candidates.some((c) => c.key === 'retry'));
    const flagged = candidates.find((c) => c.key === 'naming');
    assert.ok(flagged);
    assert.equal(flagged.reason, 'PATTERN flag');
});

test('archive plan proposes consolidation plus oldest moves on overflow', (t) => {
    const root = makeRoot(t);
    const items = Array.from({ length: 52 }, (_, i) => ({
        id: `ERR-2026-04-${String((i % 28) + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
        category: `cat-${i}`,
        rootCause: i < 2 ? 'shared cause' : `cause-${i}`,
    }));
    writeDocs(root, { errorLog: buildErrorLog(items) });
    const plans = planArchive({ root });
    const errorPlan = plans.find((p) => p.file === 'docs/ERROR_LOG.md');
    assert.equal(errorPlan.overflow, true);
    assert.equal(errorPlan.archive, 'docs/archive/ERROR_ARCHIVE.md');
    assert.deepEqual(errorPlan.consolidations, [
        {
            rootCause: 'shared cause',
            ids: ['ERR-2026-04-01-001', 'ERR-2026-04-02-002'],
        },
    ]);
    assert.deepEqual(errorPlan.moves, ['ERR-2026-04-01-001', 'ERR-2026-04-01-029']);
    const learnedPlan = plans.find((p) => p.file === 'docs/LEARNED_KNOWLEDGE.md');
    assert.equal(learnedPlan.overflow, false);
});

test('archive plan moves superseded and lowest-confidence learnings first', (t) => {
    const root = makeRoot(t);
    const items = Array.from({ length: 32 }, (_, i) => ({
        id: `LRN-2026-05-${String((i % 28) + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
        topic: `topic-${i}`,
        confidence: 'confirmed',
    }));
    items[10].extra = '- Status: SUPERSEDED by LRN-2026-05-12-012';
    items[20].confidence = 'inferred';
    writeDocs(root, { learned: buildLearned(items) });
    const plan = planArchive({ root }).find(
        (p) => p.file === 'docs/LEARNED_KNOWLEDGE.md'
    );
    assert.deepEqual(plan.moves, [items[10].id, items[20].id]);
});

test('archive --dry-run prints proposals and never writes', (t) => {
    const root = makeRoot(t);
    writeDocs(root, { errorLog: buildErrorLog(errItems(3, 'timeout-handling')) });
    const before = fs.readFileSync(path.join(root, 'docs', 'ERROR_LOG.md'), 'utf8');
    const run = spawnSync(
        process.execPath,
        [TOOL, 'archive', '--dry-run', '--root', root],
        { encoding: 'utf8' }
    );
    assert.equal(run.status, 0);
    assert.match(run.stdout, /DRY RUN/);
    assert.match(run.stdout, /nothing to archive/);
    assert.equal(
        fs.readFileSync(path.join(root, 'docs', 'ERROR_LOG.md'), 'utf8'),
        before
    );
    assert.equal(fs.existsSync(path.join(root, 'docs', 'archive')), false);
});

test('bare archive without --dry-run is rejected', (t) => {
    const root = makeRoot(t);
    const run = spawnSync(process.execPath, [TOOL, 'archive', '--root', root], {
        encoding: 'utf8',
    });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /human-approved workflow action/);
});

test('check CLI exits non-zero with findings and zero with ok', (t) => {
    const root = makeRoot(t);
    const pass = spawnSync(process.execPath, [TOOL, 'check', '--root', root], {
        encoding: 'utf8',
    });
    assert.equal(pass.status, 0);
    assert.match(pass.stdout, /^ok$/m);
    writeDocs(root, {
        errorLog: buildErrorLog(errItems(1, 'x')).replace('- Symptom: observed failure\n', ''),
    });
    const fail = spawnSync(process.execPath, [TOOL, 'check', '--root', root], {
        encoding: 'utf8',
    });
    assert.equal(fail.status, 1);
    assert.match(fail.stdout, /missing required field "Symptom"/);
});
