import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    buildIndex,
    parseFrontmatter,
    scoreQuery,
    search,
    splitEntries,
    tokenize,
} from './knowledge-search.mjs';

function makeStore(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const dir = path.join(root, 'docs', 'solutions', 'config-issues');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, 'worktree-lock.md'),
        [
            '---',
            'category: config-issues',
            'tags: git worktree lock',
            '---',
            '# Worktree lock contention',
            'Parallel streams fail when git worktree lock is held. Use isolated worktrees.',
        ].join('\n')
    );
    fs.writeFileSync(
        path.join(dir, 'csv-preload.md'),
        [
            '# CSV preload regression',
            'Preloading interface-design CSV data exploded token usage; retrieval-only fixed it.',
        ].join('\n')
    );
    return root;
}

function makeMemoryStore(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-mem-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, 'docs');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(
        path.join(docs, 'ERROR_LOG.md'),
        [
            '# Error Log',
            '',
            '<!-- Entry format:',
            '## ERR-YYYY-MM-DD-NNN - <error category>',
            '-->',
            '',
            '## ERR-2026-08-19-001 - context overflow',
            '- Symptom: compaction dropped goal state mid-loop.',
            '- Prevention: IF context nears limit THEN checkpoint first.',
            '',
            '## ERR-2026-08-20-002 - worktree lock contention',
            '- Symptom: parallel streams fail when git worktree lock is held.',
            '- Prevention: IF running parallel streams THEN use isolated worktrees.',
        ].join('\n')
    );
    fs.writeFileSync(
        path.join(docs, 'progress.md'),
        [
            '# Progress Log',
            '',
            '## Codebase Patterns',
            '- Context contracts are the first runtime layer.',
            '',
            '---',
            '',
            '## 2026-08-20 10:00 - zeppelin telemetry session',
            '- Implemented: zeppelin telemetry probes.',
        ].join('\n')
    );
    return root;
}

test('tokenize lowercases and drops punctuation and single chars', () => {
    assert.deepEqual(tokenize('Git-Worktree LOCK! a'), ['git', 'worktree', 'lock']);
});

test('parseFrontmatter splits meta and body, tolerates absence', () => {
    const parsed = parseFrontmatter('---\ncategory: x\n---\n# T\nbody');
    assert.equal(parsed.meta.category, 'x');
    assert.match(parsed.body, /# T/);
    const bare = parseFrontmatter('# Only body');
    assert.deepEqual(bare.meta, {});
});

test('BM25 ranks the on-topic doc first and caps results', (t) => {
    const root = makeStore(t);
    const hits = search({
        root,
        dirs: ['docs/solutions'],
        query: 'git worktree lock',
        limit: 3,
    });
    assert.ok(hits.length >= 1);
    assert.match(hits[0].path, /worktree-lock\.md$/);
    assert.equal(hits[0].category, 'config-issues');
    assert.ok(hits[0].snippet.length <= 240);
});

test('no match returns empty result set', (t) => {
    const root = makeStore(t);
    const hits = search({
        root,
        dirs: ['docs/solutions'],
        query: 'quantum entanglement billing',
        limit: 3,
    });
    assert.equal(hits.length, 0);
});

test('missing directory is tolerated', (t) => {
    const root = makeStore(t);
    const hits = search({
        root,
        dirs: ['docs/does-not-exist'],
        query: 'anything',
        limit: 3,
    });
    assert.equal(hits.length, 0);
});

test('scoreQuery is deterministic for tie ordering', () => {
    const files = ['/a.md', '/b.md'];
    const readFile = () => '# Same\nidentical content tokens here';
    const index = buildIndex(files, readFile);
    const first = scoreQuery(index, 'identical content');
    const second = scoreQuery(index, 'identical content');
    assert.deepEqual(
        first.map((r) => r.doc.file),
        second.map((r) => r.doc.file)
    );
});

test('splitEntries splits on ## headings and drops template comments', () => {
    const entries = splitEntries(
        '<!--\n## ERR-YYYY-MM-DD-NNN - template\n-->\n## ERR-2026-01-01-001 - real\nbody text'
    );
    assert.deepEqual(
        entries.map((e) => e.heading),
        ['ERR-2026-01-01-001 - real']
    );
    assert.match(entries[0].text, /body text/);
});

test('multi-entry files rank at entry granularity with ERR ids', (t) => {
    const root = makeMemoryStore(t);
    const hits = search({
        root,
        files: ['docs/ERROR_LOG.md'],
        query: 'worktree lock contention',
        limit: 3,
    });
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].id, 'ERR-2026-08-20-002');
    assert.equal(hits[0].path, 'docs/ERROR_LOG.md');
    assert.match(hits[0].title, /worktree lock contention/);
});

test('entries without ERR/LRN ids get stable file+heading ids', (t) => {
    const root = makeMemoryStore(t);
    const hits = search({
        root,
        files: [{ file: 'docs/progress.md', section: 'Codebase Patterns' }],
        query: 'runtime layer contracts',
        limit: 3,
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, 'docs/progress.md#Codebase Patterns');
});

test('progress head section is indexed; dated entries are not', (t) => {
    const root = makeMemoryStore(t);
    const hits = search({
        root,
        files: [{ file: 'docs/progress.md', section: 'Codebase Patterns' }],
        query: 'zeppelin telemetry probes',
        limit: 3,
    });
    assert.equal(hits.length, 0);
});

test('missing memory files are skipped silently', (t) => {
    const root = makeMemoryStore(t);
    const hits = search({
        root,
        files: ['docs/LEARNED_KNOWLEDGE.md'],
        query: 'anything at all',
        limit: 3,
    });
    assert.equal(hits.length, 0);
});

test('dirs plus missing default files match dirs-only results', (t) => {
    const root = makeStore(t);
    const dirsOnly = search({
        root,
        dirs: ['docs/solutions'],
        query: 'git worktree lock',
        limit: 3,
    });
    const withFiles = search({
        root,
        dirs: ['docs/solutions'],
        files: [
            'docs/ERROR_LOG.md',
            'docs/LEARNED_KNOWLEDGE.md',
            { file: 'docs/progress.md', section: 'Codebase Patterns' },
        ],
        query: 'git worktree lock',
        limit: 3,
    });
    assert.deepEqual(withFiles, dirsOnly);
    assert.equal(dirsOnly[0].id, dirsOnly[0].path);
});

test('entry results stay top-3 and snippet-bounded as entries grow', (t) => {
    const root = makeMemoryStore(t);
    const lines = ['# Learned Knowledge', ''];
    for (let i = 1; i <= 8; i += 1) {
        lines.push(`## LRN-2026-08-20-00${i} - retrieval habit ${i}`);
        lines.push('- Learning: retrieval keeps memory cost flat and bounded.');
        lines.push('');
    }
    fs.writeFileSync(path.join(root, 'docs', 'LEARNED_KNOWLEDGE.md'), lines.join('\n'));
    const hits = search({
        root,
        files: ['docs/LEARNED_KNOWLEDGE.md'],
        query: 'retrieval memory cost',
    });
    assert.equal(hits.length, 3);
    for (const hit of hits) {
        assert.match(hit.id, /^LRN-2026-08-20-00\d$/);
        assert.ok(hit.snippet.length <= 240);
    }
});
