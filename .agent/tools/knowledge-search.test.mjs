import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    buildIndex,
    globalKnowledgeFiles,
    parseFrontmatter,
    scoreQuery,
    search,
    searchWithCoverage,
    splitEntries,
    tokenize,
} from './knowledge-search.mjs';

test('CLI coverage treats absent optional default stores as a complete empty scan', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-coverage-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const run = spawnSync(process.execPath, [fileURLToPath(new URL('./knowledge-search.mjs', import.meta.url)), 'missing topic', '--root', root, '--json', '--require-complete'], {encoding: 'utf8', env: {...process.env, SC_GLOBAL_KNOWLEDGE_DIR: ''}});
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.deepEqual(output.results, []);
    assert.deepEqual(output.coverage, {complete: true, scannedFiles: 0, failedReads: [], diagnosticsTruncated: false});
});

test('explicit missing scopes report incomplete coverage with opt-in exit 2 and no write-safety claim', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-partial-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const args = [fileURLToPath(new URL('./knowledge-search.mjs', import.meta.url)), 'missing topic', '--root', root, '--dir', 'docs/missing', '--file', 'docs/missing.md'];
    const defaultRun = spawnSync(process.execPath, [...args, '--json'], {encoding: 'utf8'});
    assert.equal(defaultRun.status, 0, defaultRun.stderr);
    assert.deepEqual(JSON.parse(defaultRun.stdout).coverage, {
        complete: false, scannedFiles: 0,
        failedReads: [{locator: 'docs/missing', code: 'ENOENT'}, {locator: 'docs/missing.md', code: 'ENOENT'}],
        diagnosticsTruncated: false,
    });
    const strictRun = spawnSync(process.execPath, [...args, '--require-complete'], {encoding: 'utf8'});
    assert.equal(strictRun.status, 2, strictRun.stderr);
    assert.doesNotMatch(strictRun.stdout, /safe to write/i);
    assert.match(strictRun.stdout, /incomplete/i);
});

test('coverage counts unique successful reads and bounds unreadable-file diagnostics', () => {
    const root = path.resolve('coverage-fixture');
    const files = ['good.md', 'good.md', ...Array.from({length: 12}, (_, i) => `blocked-${i}.md`)];
    const readFile = file => {
        if (path.basename(file) === 'good.md') return '# Retrieval\nRead the useful evidence.';
        throw Object.assign(new Error('sensitive content must not be reported'), {code: 'EACCES'});
    };
    const output = searchWithCoverage({root, files, query: 'useful evidence', readFile});
    assert.equal(output.coverage.scannedFiles, 1);
    assert.equal(output.results.length, 1);
    assert.equal(output.coverage.complete, false);
    assert.equal(output.coverage.failedReads.length, 10);
    assert.deepEqual(output.coverage.failedReads[0], {locator: 'blocked-0.md', code: 'EACCES'});
    assert.equal(output.coverage.diagnosticsTruncated, true);
    assert.doesNotMatch(JSON.stringify(output.coverage), /sensitive content/);
});

test('default CLI recalls active overflow topics from both bounded-memory archives', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-archive-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    fs.mkdirSync(path.join(root, 'docs/archive'), {recursive: true});
    const learning = (n, topic, status = 'active') => `## LRN-2026-10-06-${String(n).padStart(3, '0')} - ${topic}\n- Learning: ${topic} retrieval\n- Status: ${status}\n`;
    fs.writeFileSync(path.join(root, 'docs/LEARNED_KNOWLEDGE.md'), '# Knowledge\n\n' + Array.from({length: 30}, (_, i) => learning(i + 4, 'routine memory')).join('\n'));
    fs.writeFileSync(path.join(root, 'docs/archive/KNOWLEDGE_ARCHIVE.md'), '# Archive\n\n' + learning(1, 'heliumretention') + '\n' + learning(2, 'heliumretention', 'stale') + '\n' + learning(3, 'routine memory'));
    fs.writeFileSync(path.join(root, 'docs/archive/ERROR_ARCHIVE.md'), '# Archive\n\n## ERR-2026-10-06-001 - heliumretention\n- Symptom: heliumretention error\n- Status: active\n');
    const args = [fileURLToPath(new URL('./knowledge-search.mjs', import.meta.url)), 'heliumretention', '--root', root, '--json', '--require-complete'];
    const run = spawnSync(process.execPath, args, {encoding: 'utf8', env: {...process.env, SC_GLOBAL_KNOWLEDGE_DIR: ''}});
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.deepEqual(output.results.map(hit => hit.id).sort(), ['ERR-2026-10-06-001', 'LRN-2026-10-06-001']);
    assert.ok(output.results.every(hit => hit.path.startsWith('docs/archive/') && hit.snippet.length <= 240));
    assert.equal(output.coverage.complete, true);
    assert.equal(search({root, files: ['docs/LEARNED_KNOWLEDGE.md', 'docs/archive/KNOWLEDGE_ARCHIVE.md'], query: 'memory retrieval'}).length, 3);
});

test('active entries win archive duplicates before ranking and status filtering', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-duplicate-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    fs.mkdirSync(path.join(root, 'docs/archive'), {recursive: true});
    const id = 'LRN-2026-10-06-001';
    const active = 'docs/LEARNED_KNOWLEDGE.md';
    const archive = 'docs/archive/KNOWLEDGE_ARCHIVE.md';
    fs.writeFileSync(path.join(root, active), `# Memory\n\n## ${id} - retry\n- Learning: bounded retry\n- Revision: 2\n- Status: active\n`);
    fs.writeFileSync(path.join(root, archive), `# Archive\n\n## ${id} - retry\n- Learning: retry retry retry retry obsoletey\n- Revision: 1\n- Status: active\n`);
    const options = {root, files: [archive, active], query: 'retry'};
    const hits = search(options);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, id);
    assert.equal(hits[0].path, active);
    assert.equal(hits[0].revision, '2');
    assert.deepEqual(search({...options, query: 'obsoletey'}), []);
    fs.writeFileSync(path.join(root, active), fs.readFileSync(path.join(root, active), 'utf8').replace('Status: active', 'Status: stale'));
    assert.deepEqual(search(options), []);
});

test('general and global rules cross project boundaries but retain explicit stack and version constraints', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-applicability-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    fs.mkdirSync(path.join(root, 'docs'), {recursive: true});
    const file = 'docs/LEARNED_KNOWLEDGE.md';
    for (const scope of ['general', 'global', 'all']) {
        fs.writeFileSync(path.join(root, file), `# Memory\n\n## LRN-2026-10-06-001 - hydration\n- Learning: deterministic hydration\n- Applies to: ${scope}\n- Project: other\n- Stack: react\n- Version: 19\n`);
        const options = {root, files: [file], query: 'hydration', project: 'current'};
        assert.deepEqual(search({...options, stack: 'vue', version: '19'}), [], `${scope}: conflicting stack`);
        assert.deepEqual(search({...options, stack: 'react', version: '18'}), [], `${scope}: conflicting version`);
        assert.equal(search({...options, stack: 'react', version: '19'}).length, 1, `${scope}: compatible cross-project lesson`);
        assert.equal(search(options).length, 1, `${scope}: unknown caller constraints remain advisory`);
    }
});

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

test('global store joins the corpus only when SC_GLOBAL_KNOWLEDGE_DIR points at a file', (t) => {
    const root = makeStore(t);
    const globalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-global-'));
    t.after(() => fs.rmSync(globalDir, { recursive: true, force: true }));
    assert.deepEqual(globalKnowledgeFiles({}), []);
    assert.deepEqual(globalKnowledgeFiles({ SC_GLOBAL_KNOWLEDGE_DIR: globalDir }), []);
    assert.deepEqual(globalKnowledgeFiles({ SC_GLOBAL_KNOWLEDGE_DIR: globalDir }, {includeMissing: true}), [{file: path.join(globalDir, 'LEARNED_KNOWLEDGE.md'), global: true, optional: true}]);
    fs.writeFileSync(
        path.join(globalDir, 'LEARNED_KNOWLEDGE.md'),
        [
            '# Learned Knowledge',
            '',
            '## Quick Reference',
            '',
            '| ID | Scope | Confidence | Action rule (IF-THEN) |',
            '| --- | --- | --- | --- |',
            '| LRN-2026-09-02-001 | global | confirmed | IF replying THEN use the user language |',
            '',
            '---',
            '',
            '## LRN-2026-09-02-001 - reply language',
            '- Learning: the user writes Indonesian; reply in Indonesian, technical terms verbatim.',
            '- Confidence: confirmed',
            '- Applies to: global',
        ].join('\n')
    );
    const files = globalKnowledgeFiles({ SC_GLOBAL_KNOWLEDGE_DIR: globalDir });
    assert.equal(files.length, 1);
    assert.equal(files[0].global, true);
    const hits = search({ root, files, query: 'reply language indonesian' });
    assert.equal(hits[0].id, 'LRN-2026-09-02-001');
    assert.equal(hits[0].path, 'global:LEARNED_KNOWLEDGE.md');
    assert.equal(hits[0].category, 'global');
    assert.equal(JSON.stringify(hits).includes(globalDir), false);
});

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

test('explicit stale and superseded entries are diagnostic-only; applicability keeps general rules', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-status-'));
    try {
        fs.mkdirSync(path.join(root, 'docs'), {recursive: true});
        fs.writeFileSync(path.join(root, 'docs/LEARNED_KNOWLEDGE.md'), '# Memory\n\n## LRN-2026-10-03-001 - retry\n- Status: SUPERSEDED by LRN-2026-10-03-002\n- Learning: retry timeout\n\n## LRN-2026-10-03-002 - retry\n- Learning: retry timeout\n- Project: other\n\n## LRN-2026-10-03-003 - retry\n- Learning: retry timeout\n- Applies to: general\n');
        const options = {root, files: ['docs/LEARNED_KNOWLEDGE.md'], query: 'retry timeout'};
        assert.ok(!search(options).some(h => h.id.endsWith('001')));
        assert.ok(search({...options, diagnostic: true}).some(h => h.id.endsWith('001')));
        assert.deepEqual(search({...options, project: 'current'}).map(h => h.id), ['LRN-2026-10-03-003']);
    } finally { fs.rmSync(root, {recursive:true, force:true}); }
});

test('calibration and held-out relevance retain aliases, reject contradictions, and preserve general rules', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-heldout-'));
    t.after(() => fs.rmSync(root, {recursive:true, force:true}));
    const fixture = JSON.parse(fs.readFileSync(new URL('../evals/knowledge-relevance.json', import.meta.url), 'utf8'));
    const dir = path.join(root, 'docs/solutions');
    fs.mkdirSync(dir, {recursive:true});
    for (const doc of fixture.documents) fs.writeFileSync(path.join(dir, `${doc.id}.md`), `---\n${Object.entries(doc.meta).map(([k,v]) => `${k}: ${v}`).join('\n')}\n---\n${doc.body}`);
    for (const group of ['calibration','held_out']) for (const item of fixture[group]) {
        const hits = search({root, dirs:['docs/solutions'], ...item});
        assert.equal(hits[0]?.id, `docs/solutions/${item.expected}.md`, `${group}: ${item.query}`);
        assert.ok(!hits.some(h => /stale-retry|contradiction|other-project/.test(h.id)));
    }
});

test('quoted stale metadata and feedback logs do not pollute default retrieval', (t) => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'quoted-status-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    fs.mkdirSync(path.join(root,'docs/solutions'),{recursive:true});
    fs.mkdirSync(path.join(root,'docs/learnings'),{recursive:true});
    fs.mkdirSync(path.join(root,'docs/archive'),{recursive:true});
    fs.writeFileSync(path.join(root,'docs/solutions/old.md'),'---\nstatus: "stale"\n---\n# Timeout\nTimeout retry.\n');
    fs.writeFileSync(path.join(root,'docs/learnings/knowledge-feedback.md'),'# Feedback\nTimeout timeout retry retry.\n');
    fs.writeFileSync(path.join(root,'docs/archive/KNOWLEDGE_FEEDBACK_ARCHIVE.md'),'# Feedback archive\nTimeout timeout retry retry.\n');
    assert.deepEqual(search({root,dirs:['docs/solutions','docs/learnings'],query:'timeout retry'}), []);
    assert.deepEqual(search({root,dirs:['docs/archive'],query:'timeout retry'}), []);
});
