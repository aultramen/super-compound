import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    buildReport,
    collectObservations,
    computeFreshness,
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
            `- Origin: ${it.origin || it.id}`,
            '- Confidence: observed',
            '- Evidence: docs/example.md',
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
        ['---', 'category: config-issues', 'origin: independent-solution', 'confidence: confirmed', 'evidence: docs/example.md', '---', '# Rules drift', 'body'].join('\n')
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

test('freshness flags durable state older than the newest commit, date-only', (t) => {
    const root = makeRoot(t);
    fs.writeFileSync(
        path.join(root, 'docs', 'STATE.md'),
        '# Project State\nLast updated: 2026-08-06 00:00\n\n## Current Position\n- Workflow: none\n'
    );
    fs.writeFileSync(
        path.join(root, 'docs', 'progress.md'),
        [
            '# Progress Log',
            '',
            '## Codebase Patterns',
            '- pattern',
            '',
            '---',
            '',
            '## 2026-08-06 00:00 - seed',
            '- Implemented: x',
            '',
            '## 2026-08-06 14:30 - wave',
            '- Implemented: y',
            '',
        ].join('\n')
    );
    const stale = computeFreshness({ root, commitDate: '2026-08-20' });
    assert.deepEqual(stale, {
        commitDate: '2026-08-20',
        stateDate: '2026-08-06',
        progressDate: '2026-08-06',
        flags: ['STALE_STATE', 'STALE_PROGRESS'],
    });
    assert.deepEqual(computeFreshness({ root, commitDate: '2026-08-06' }).flags, []);
    // No Git history (temp dir) or no date: report absence, never staleness.
    assert.equal(computeFreshness({ root }).commitDate, null);
    assert.deepEqual(computeFreshness({ root }).flags, []);
    fs.rmSync(path.join(root, 'docs', 'STATE.md'));
    assert.deepEqual(computeFreshness({ root, commitDate: '2026-08-20' }).flags, [
        'STALE_PROGRESS',
    ]);
    assert.ok('freshness' in runReport({ root }));
});

test('report ignores inferred learnings and PATTERN cannot bypass origins', (t) => {
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
    assert.equal(flagged, undefined);
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

 test('copies and revisions of one origin never promote; legacy origins stay unknown', () => {
    const observations = Array.from({length: 4}, (_, i) => ({id: `copy-${i}`, category: 'retry', counted: true, origin: 'one', evidence: 'proof', pattern: true}));
    assert.deepEqual(buildReport({observations, totals: {}}).candidates, []);
    assert.deepEqual(buildReport({observations: observations.map(o => ({...o, origin: null})), totals: {}}).candidates, []);
 });

test('structured capture replays idempotently and keeps Quick Reference consistent', (t) => {
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'proof.txt'), 'tests pass');
    const input = {kind: 'LRN', origin: 'goal-1', revision: '1', topic: 'retry', confidence: 'confirmed', evidence: ['proof.txt'], outcome: 'verified', fields: {'Learning': 'Retry capture only', 'Applies to': 'project', 'Action rule': 'IF capture fails THEN retry capture'}};
    fs.writeFileSync(path.join(root, 'capture.json'), JSON.stringify(input));
    const run = () => spawnSync(process.execPath, [TOOL, 'capture', '--root', root, '--input-file', 'capture.json', '--json'], {encoding: 'utf8'});
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const before = fs.readFileSync(path.join(root, 'docs/LEARNED_KNOWLEDGE.md'), 'utf8');
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.equal(JSON.parse(second.stdout).action, 'unchanged');
    assert.equal(fs.readFileSync(path.join(root, 'docs/LEARNED_KNOWLEDGE.md'), 'utf8'), before);
    assert.equal(runCheck({root}).ok, true);
    assert.equal(runReport({root}).candidates.length, 0);
});

test('refresh validates locators and preserves conflicting records until reviewed', async (t) => {
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'proof.txt'), 'verified');
    fs.mkdirSync(path.join(root, 'docs/solutions'), {recursive: true});
    const record = 'docs/solutions/retry.md';
    fs.writeFileSync(path.join(root, record), '---\nstatus: active\n---\n# Retry\nInvariant: owner approved\n');
    fs.writeFileSync(path.join(root, 'refresh.json'), JSON.stringify({path: record, status: 'stale', evidence: ['proof.txt'], reason: 'locator moved'}));
    const run = spawnSync(process.execPath, [TOOL, 'refresh', '--root', root, '--input-file', 'refresh.json'], {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr);
    assert.match(fs.readFileSync(path.join(root, record), 'utf8'), /status: stale/);
    fs.writeFileSync(path.join(root, 'refresh.json'), JSON.stringify({path: record, status: 'active', evidence: ['missing.txt'], reason: 'changed'}));
    const bad = spawnSync(process.execPath, [TOOL, 'refresh', '--root', root, '--input-file', 'refresh.json'], {encoding: 'utf8'});
    assert.notEqual(bad.status, 0);
    assert.match(fs.readFileSync(path.join(root, record), 'utf8'), /status: stale/);
});

test('checkpoint restores next action and blockers, skipping verified goals and detecting drift', (t) => {
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'contract.md'), 'approved');
    fs.writeFileSync(path.join(root, '.continue-here.md'), '# Owner handoff\nKeep this note\n');
    fs.writeFileSync(path.join(root, 'checkpoint.json'), JSON.stringify({nextAction: 'retry knowledge capture', verifiedOutcomes: ['GOAL-001 tests passed'], blockers: ['capture pending'], artifactRefs: ['contract.md'], contractRefs: ['contract.md'], ledgerRefs: []}));
    const run = command => spawnSync(process.execPath, [TOOL, command, '--root', root, ...(command === 'checkpoint' ? ['--input-file', 'checkpoint.json'] : []), '--json'], {encoding: 'utf8'});
    assert.equal(run('checkpoint').status, 0);
    const restored = run('resume');
    assert.equal(restored.status, 0, restored.stderr);
    assert.equal(JSON.parse(restored.stdout).checkpoint.nextAction, 'retry knowledge capture');
    assert.deepEqual(JSON.parse(restored.stdout).checkpoint.blockers, ['capture pending']);
    assert.match(fs.readFileSync(path.join(root, '.continue-here.md'), 'utf8'), /Keep this note/);
    fs.writeFileSync(path.join(root, 'contract.md'), 'changed');
    assert.equal(JSON.parse(run('resume').stdout).drift.length, 1);
});

test('dismissed/deferred proposal is not reoffered without new evidence', (t) => {
    const root = makeRoot(t);
    writeDocs(root, {errorLog: buildErrorLog(errItems(3, 'retry'))});
    const candidate = runReport({root}).candidates.find(c => c.kind === 'category');
    assert.ok(candidate.evidenceDigest);
    fs.mkdirSync(path.join(root, 'docs/proposals'), {recursive: true});
    fs.writeFileSync(path.join(root, 'docs/proposals/retry.md'), `---\ncandidate_key: category:retry\nevidence_digest: ${candidate.evidenceDigest}\nstatus: DISMISSED\n---\n# Retry\n`);
    assert.ok(!runReport({root}).candidates.some(c => c.kind === 'category'));
    writeDocs(root, {errorLog: buildErrorLog(errItems(4, 'retry'))});
    assert.ok(runReport({root}).candidates.some(c => c.kind === 'category'));
});

test('bounded feedback replays without duplication and never becomes promotion evidence', (t) => {
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'proof.txt'), 'passed');
    fs.writeFileSync(path.join(root, 'feedback.json'), JSON.stringify({origin: 'task-1', knowledgeRef: 'docs/LEARNED_KNOWLEDGE.md#LRN-2026-10-03-001', disposition: 'used', outcome: 'verified', evidence: ['proof.txt']}));
    writeDocs(root, {learned: buildLearned([{id:'LRN-2026-10-03-001', topic:'retry'}])});
    const run = () => spawnSync(process.execPath, [TOOL, 'feedback', '--root', root, '--input-file', 'feedback.json'], {encoding:'utf8'});
    assert.equal(run().status, 0);
    assert.equal(JSON.parse(run().stdout).action, 'unchanged');
    assert.equal(runReport({root}).candidates.length, 0);
});

test('capture rejects unsafe evidence and a failed replace retains prior memory', async (t) => {
    const {captureMemory} = await import('./memory-maintenance.mjs');
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'proof.txt'), 'verified');
    const input = {kind:'LRN', origin:'origin-1', revision:'1', topic:'retry', confidence:'observed', evidence:['proof.txt'], outcome:'verified', fields:{Learning:'Retry capture', 'Applies to':'project'}};
    await captureMemory({root,input});
    const file = path.join(root,'docs/LEARNED_KNOWLEDGE.md');
    const before = fs.readFileSync(file,'utf8');
    await assert.rejects(captureMemory({root,input:{...input,origin:'origin-2'},writeOptions:{renameFile:async()=>{throw Object.assign(new Error('busy'),{code:'EBUSY'});}}}), /busy/);
    assert.equal(fs.readFileSync(file,'utf8'),before);
    await assert.rejects(captureMemory({root,input:{...input,evidence:['../outside.txt']}}), /outside repository/);
});

test('solution worth gate and stable origin survive rename and revision', async (t) => {
    const {captureMemory} = await import('./memory-maintenance.mjs');
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input = {kind:'solution', origin:'goal-1', revision:'1', topic:'timeout', category:'reliability', confidence:'confirmed', evidence:['proof.txt'], outcome:'verified', fields:{Problem:'connection', Symptoms:'timeout', 'Root cause':'no backoff', Solution:'bounded retry', Prevention:'verify timeout'}};
    await assert.rejects(captureMemory({root,input}), /worth/);
    input.worth = 'non-obvious-root-cause';
    const first = await captureMemory({root,input});
    const renamed = 'docs/solutions/reliability/renamed.md';
    fs.renameSync(path.join(root,first.path),path.join(root,renamed));
    assert.equal((await captureMemory({root,input})).path,renamed);
    assert.equal((await captureMemory({root,input:{...input,revision:'2'}})).action,'review_required');
    assert.equal(runReport({root}).candidates.length,0);
});

test('upsert preserves owner sections and canonicalizes field order', async (t) => {
    const {captureMemory} = await import('./memory-maintenance.mjs');
    const root = makeRoot(t);
    fs.writeFileSync(path.join(root, 'proof.txt'), 'verified');
    const input = {kind:'LRN', origin:'one', revision:'1', topic:'retry', confidence:'confirmed', evidence:['proof.txt'], outcome:'verified', fields:{Learning:'Retry', 'Applies to':'project'}};
    await captureMemory({root,input});
    const file=path.join(root,'docs/LEARNED_KNOWLEDGE.md');
    fs.appendFileSync(file,'\n## Owner notes\nPreserve this decision\n');
    assert.equal((await captureMemory({root,input:{...input, fields:{'Applies to':'project', Learning:'Retry'}}})).action, 'unchanged');
    await captureMemory({root,input:{...input,origin:'two'}});
    assert.match(fs.readFileSync(file,'utf8'),/Preserve this decision/);
});

test('resume fails closed on corrupt ledgers before offering dispatch', async (t) => {
    const {persistCheckpoint,restoreCheckpoint} = await import('./memory-maintenance.mjs');
    const root = makeRoot(t);
    const ref='.scratch/work-packages/run-1/ledger.json';
    fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});
    fs.writeFileSync(path.join(root,ref),JSON.stringify({goals:{'GOAL-001':{status:'ready'}}}));
    await persistCheckpoint({root,input:{nextAction:'dispatch',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref]}});
    await assert.rejects(restoreCheckpoint({root}), /Invalid work-package ledger/);
});

test('refresh preserves multiline frontmatter and comments outside updated scalars', async (t) => {
    const {refreshMemory} = await import('./memory-maintenance.mjs');
    const root = makeRoot(t);
    fs.mkdirSync(path.join(root,'docs/solutions'),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const file='docs/solutions/record.md';
    fs.writeFileSync(path.join(root,file),'---\nstatus: active\n# Owner metadata\ntags:\n  - retry\n  - backoff\n---\n# Retry\nInvariant stays.\n');
    await refreshMemory({root,input:{path:file,status:'stale',reason:'locator drift',evidence:['proof.txt']}});
    const raw=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(raw, /tags:\n  - retry\n  - backoff/);
    assert.match(raw, /# Owner metadata/);
});

test('solution capture automatically supersedes identical copies of the same origin', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={kind:'solution',origin:'one-source',revision:'1',topic:'bounded retry',category:'reliability',confidence:'confirmed',outcome:'verified',evidence:['proof.txt'],worth:'non-obvious-root-cause',fields:{Problem:'timeout',Symptoms:'network reconnect', 'Root cause':'no backoff',Solution:'bounded retry',Prevention:'test connection timeout'}};
    const first=await captureMemory({root,input});
    const copy='docs/solutions/reliability/z-copy.md';
    fs.copyFileSync(path.join(root,first.path),path.join(root,copy));
    const result=await captureMemory({root,input});
    assert.equal(result.action,'deduplicated');
    assert.match(fs.readFileSync(path.join(root,copy),'utf8'),/status: superseded/);
    const {search}=await import('./knowledge-search.mjs');
    const hits=search({root,dirs:['docs/solutions'],query:'network reconnect bounded retry'});
    assert.equal(hits.length,1);
    assert.equal(hits[0].path,first.path);
    assert.equal((await captureMemory({root,input})).action,'unchanged');
});

test('lightweight capture consolidates identical copied origins without losing old IDs', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={kind:'LRN',origin:'one-source',revision:'1',topic:'retry',confidence:'confirmed',outcome:'verified',evidence:['proof.txt'],fields:{Learning:'bounded reconnect', 'Applies to':'project'}};
    const first=await captureMemory({root,input});
    const file=path.join(root,'docs/LEARNED_KNOWLEDGE.md');
    const raw=fs.readFileSync(file,'utf8');
    const oldID='LRN-2026-01-01-999';
    const copy=raw.slice(raw.indexOf(`## ${first.id}`)).replace(first.id,oldID);
    const copied=raw.replace('| --- | --- | --- |','| --- | --- | --- |\n| '+oldID+' | retry | bounded reconnect |')+'\n'+copy;
    fs.writeFileSync(file,copied);
    assert.equal((await captureMemory({root,input})).action,'deduplicated');
    assert.equal((await captureMemory({root,input})).action,'unchanged');
    const {search}=await import('./knowledge-search.mjs');
    const hits=search({root,files:['docs/LEARNED_KNOWLEDGE.md'],query:oldID});
    assert.equal(hits.length,1);
    assert.equal(hits[0].id,first.id);
    assert.equal(runCheck({root}).ok,true);
});

test('resume rejects malformed checkpoint fields rather than ignoring blockers', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    await persistCheckpoint({root,input:{nextAction:'resume',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]}});
    const file=path.join(root,'.continue-here.md');
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('"blockers": []','"blockers": ""'));
    await assert.rejects(restoreCheckpoint({root}), /blockers must be a bounded array/);
});

test('structured solutions carry project/stack/version applicability into retrieval', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const {search}=await import('./knowledge-search.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={kind:'solution',origin:'one',revision:'1',topic:'retry',category:'reliability',confidence:'confirmed',outcome:'verified',evidence:['proof.txt'],worth:'non-obvious-root-cause',fields:{Problem:'timeout',Symptoms:'reconnect', 'Root cause':'backoff',Solution:'bounded retry',Prevention:'test',Project:'alpha',Stack:'react',Version:'19'}};
    await captureMemory({root,input});
    assert.equal(search({root,dirs:['docs/solutions'],query:'retry',project:'beta'}).length,0);
    assert.equal(search({root,dirs:['docs/solutions'],query:'retry',project:'alpha',stack:'react',version:'19'}).length,1);
});


function captureInput(origin = 'new-origin') {
    return {kind:'LRN',origin,revision:'1',topic:'retry',confidence:'confirmed',outcome:'verified',evidence:['proof.txt'],fields:{Learning:'retry only capture', 'Applies to':'project'}};
}

test('capture archives overflow losslessly, preserves locators, and replays archived origins', async (t) => {
    const {captureMemory,parseEntries}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    for(let i=0;i<33;i++) await captureMemory({root,input:captureInput(`origin-${i}`)});
    assert.equal(runCheck({root}).ok,true);
    const active=fs.readFileSync(path.join(root,'docs/LEARNED_KNOWLEDGE.md'),'utf8');
    const archived=fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8');
    assert.equal(parseEntries(active,'LRN').length,30);
    assert.equal(parseEntries(archived,'LRN').length,3);
    for(const record of parseEntries(archived,'LRN')) assert.ok(active.includes(`id="${record.id}"`));
    const old=parseEntries(archived,'LRN')[0];
    assert.ok(active.includes(`id="${old.id}"`));
    assert.ok(active.includes(`archive/KNOWLEDGE_ARCHIVE.md#${old.id}`));
    assert.ok(archived.includes(`<a id="${old.id}"></a>`));
    const link = path.resolve(root, "docs", `archive/KNOWLEDGE_ARCHIVE.md`);
    assert.ok(fs.existsSync(link));
    assert.equal((await captureMemory({root,input:captureInput('origin-0')})).action,'unchanged');
    assert.equal(parseEntries(fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8'),'LRN').length,3);
});

test('failed archive retains active records and pending capture for safe retry', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    for(let i=0;i<30;i++) await captureMemory({root,input:captureInput(`origin-${i}`)});
    const active=path.join(root,'docs/LEARNED_KNOWLEDGE.md');
    const before=fs.readFileSync(active,'utf8');
    await assert.rejects(captureMemory({root,input:captureInput(),writeOptions:{renameFile:async()=>{throw new Error('archive unavailable');}}}), /archive unavailable/);
    assert.equal(fs.readFileSync(active,'utf8'),before);
    const pending=fs.readdirSync(path.join(root,'.scratch/pending-captures'));
    assert.equal(pending.length,1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.scratch/pending-captures',pending[0]),'utf8')).input.origin,'new-origin');
    await captureMemory({root,input:captureInput()});
    assert.equal(fs.readdirSync(path.join(root,'.scratch/pending-captures')).length,0);
});

function writeReadyLedger(root) {
    const ref='.scratch/work-packages/run-1/ledger.json';
    const goal=id=>({status:'ready',briefPath:`.scratch/${id}.md`,reportPath:`.scratch/${id}-report.md`,pathsPath:`.scratch/${id}.json`,reviewPackagePath:`.scratch/${id}.patch`,scopeDigest:'a'.repeat(64),baselineDirty:{},verification:'pending'});
    fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const digests={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    const evidence={...digests,evidenceRefs:['proof.txt'],evidenceArtifacts:[{path:'proof.txt',digest:createHash('sha256').update('verified').digest('hex')}]};
    fs.writeFileSync(path.join(root,ref),JSON.stringify({schema:'work_package_ledger_v2',runId:'run-1',ledgerVersion:1,goals:{A:goal('A'),B:goal('B'),C:goal('C'),D:{...goal('D'),status:'verified',expectedEvidence:digests,evidence}}}));
    return ref;
}

test('resume blocks scoped drift and descendants while independent goals proceed', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t), ref=writeReadyLedger(root), key=id=>`${ref}#${id}`;
    fs.writeFileSync(path.join(root,'contract.md'),'approved');
    await persistCheckpoint({root,input:{nextAction:'dispatch ready goals',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:['contract.md'],ledgerRefs:[ref],goalScopes:{dependencies:{[key('A')]:[],[key('B')]:[key('A')],[key('C')]:[],[key('D')]:[]},blockers:{},contracts:{'contract.md':[key('A')]}}}});
    fs.writeFileSync(path.join(root,'contract.md'),'changed');
    const result=await restoreCheckpoint({root});
    assert.deepEqual(result.dispatchable,[{ledger:ref,id:'C'}]);
    assert.deepEqual(result.skippedVerified,[{ledger:ref,id:'D'}]);
    assert.deepEqual(result.blocked.map(g=>g.id).sort(),['A','B']);
});

test('resume fails closed for unknown blocker scope and rejects incomplete dependency scope', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t), ref=writeReadyLedger(root);
    await persistCheckpoint({root,input:{nextAction:'dispatch',verifiedOutcomes:[],blockers:['access needed'],artifactRefs:[],contractRefs:[],ledgerRefs:[ref]}});
    assert.deepEqual((await restoreCheckpoint({root})).dispatchable,[]);
    await assert.rejects(persistCheckpoint({root,input:{nextAction:'dispatch',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref],goalScopes:{dependencies:{},blockers:{},contracts:{}}}}), /dependency scope/);
});


test('archive-first interruption keeps both copies and retry preserves comments and owner notes', async (t) => {
    const {captureMemory,parseEntries}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    for(let i=0;i<30;i++) await captureMemory({root,input:captureInput(`origin-${i}`)});
    const file=path.join(root,'docs/LEARNED_KNOWLEDGE.md');
    let before=fs.readFileSync(file,'utf8');
    const oldest=parseEntries(before,'LRN')[0];
    before=before.replace(`## ${oldest.id} - retry`, `## ${oldest.id} - retry\n<!-- Retain provenance comment -->`)+ '\n## Owner notes\nKeep approved decision\n';
    fs.writeFileSync(file,before);
    await assert.rejects(captureMemory({root,input:captureInput(),writeOptions:{renameFile:async(from,to)=>{
        if(to===file) throw new Error('active replace unavailable');
        await fs.promises.rename(from,to);
    }}}), /active replace unavailable/);
    assert.equal(fs.readFileSync(file,'utf8'),before);
    assert.match(fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8'), /Retain provenance comment/);
    await captureMemory({root,input:captureInput()});
    assert.match(fs.readFileSync(file,'utf8'), /Keep approved decision/);
    assert.equal(parseEntries(fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8'),'LRN').length,1);
    assert.equal(runCheck({root}).ok,true);
});

test('scoped blockers respect dependency readiness and unknown contract scope stays fail closed', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),ref=writeReadyLedger(root),key=id=>`${ref}#${id}`;
    fs.writeFileSync(path.join(root,'contract.md'),'approved');
    const input={nextAction:'dispatch',verifiedOutcomes:[],blockers:['needs access'],artifactRefs:[],contractRefs:['contract.md'],ledgerRefs:[ref],goalScopes:{dependencies:{[key('A')]:[],[key('B')]:[key('A')],[key('C')]:[key('D')],[key('D')]:[]},blockers:{'needs access':[key('A')]},contracts:{}}};
    await persistCheckpoint({root,input});
    assert.deepEqual((await restoreCheckpoint({root})).dispatchable,[{ledger:ref,id:'C'}]);
    fs.writeFileSync(path.join(root,'contract.md'),'changed');
    const result=await restoreCheckpoint({root});
    assert.equal(result.unknownScope,true);
    assert.deepEqual(result.dispatchable,[]);
});


test('size cap recovery is lossless and dry-run proposes without writing', async (t) => {
    const {captureMemory,parseEntries}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const fields={Learning:'l'.repeat(1800),'Applies to':'project','Action rule':'a'.repeat(1800)};
    for(let i=0;i<8;i++) await captureMemory({root,input:{...captureInput(`large-${i}`),fields}});
    assert.equal(runCheck({root}).ok,true);
    const active=fs.readFileSync(path.join(root,'docs/LEARNED_KNOWLEDGE.md'),'utf8');
    const archive=fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8');
    assert.equal(parseEntries(active,'LRN').length+parseEntries(archive,'LRN').length,8);
    for(const entry of [...parseEntries(active,'LRN'),...parseEntries(archive,'LRN')]) assert.equal(entry.fields.Learning,fields.Learning);
    const result=await captureMemory({root,input:{...captureInput('large-8'),fields},dryRun:true});
    assert.ok(result.archived.length);
    assert.equal(fs.readFileSync(path.join(root,'docs/LEARNED_KNOWLEDGE.md'),'utf8'),active);
    assert.equal(fs.readFileSync(path.join(root,'docs/archive/KNOWLEDGE_ARCHIVE.md'),'utf8'),archive);
    assert.equal(fs.existsSync(path.join(root,'.scratch/pending-captures')),false);
});

test('capture can read every archive size it permits writing', async (t) => {
  const {captureMemory} = await import('./memory-maintenance.mjs');
  const root = makeRoot(t);
  fs.writeFileSync(path.join(root, 'proof.txt'), 'verified');
  for (let i = 0; i < 31; i++) await captureMemory({root, input: captureInput(`large-${i}`)});
  const archive = path.join(root, 'docs/archive/KNOWLEDGE_ARCHIVE.md');
  fs.appendFileSync(archive, `\n<!--${'x'.repeat(1024 * 1024)}-->\n`);
  assert.ok(fs.statSync(archive).size > 1024 * 1024);
  const result = await captureMemory({root, input: captureInput('next-large')});
  assert.equal(result.action, 'created');
  assert.equal(runCheck({root}).ok, true);
});
