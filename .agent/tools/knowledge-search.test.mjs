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
