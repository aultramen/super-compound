import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {copyActiveDistribution} from './active-assets.mjs';
import {provisionCompletionFixture} from './completion-fixture.test-support.mjs';

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

test('active distribution can import memory maintenance without retired modules', (t) => {
    const temporary=makeRoot(t), bundle=path.join(temporary,'bundle');
    copyActiveDistribution(path.resolve(path.dirname(TOOL),'../..'),bundle);
    const entry=new URL(`file:///${path.join(bundle,'.agent/tools/memory-maintenance.mjs').replaceAll('\\','/')}`);
    const result=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(entry.href)})`],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
});

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

test('checkpoint restores next action and blockers, skipping verified goals and detecting drift', async (t) => {
    const root = makeRoot(t);
    const proof=await provisionCompletionFixture(root,{taskId:'GOAL-001'});
    fs.writeFileSync(path.join(root, 'contract.md'), 'approved');
    fs.writeFileSync(path.join(root, '.continue-here.md'), '# Owner handoff\nKeep this note\n');
    fs.writeFileSync(path.join(root, 'checkpoint.json'), JSON.stringify({nextAction: 'retry knowledge capture', verifiedOutcomes: ['GOAL-001 tests passed'], completionEvidence:{'GOAL-001 tests passed':{contractPath:proof.contractPath,contractDigest:proof.contractDigest}}, blockers: ['capture pending'], artifactRefs: ['contract.md'], contractRefs: ['contract.md'], ledgerRefs: []}));
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

test('checkpoint refuses newly persisted completion prose without outcome evidence', async (t) => {
    const {persistCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),input={nextAction:'continue',verifiedOutcomes:['task done'],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await assert.rejects(persistCheckpoint({root,input}),/completionEvidence/);
    assert.equal(fs.existsSync(path.join(root,'.continue-here.md')),false);
});

test('checkpoint accepts actual complete proof, diagnoses stale proof and refuses promotion before writing', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),proof=await provisionCompletionFixture(root,{taskId:'single-task'});
    const input={nextAction:'continue',verifiedOutcomes:['healthy outcome'],completionEvidence:{'healthy outcome':{contractPath:proof.contractPath,contractDigest:proof.contractDigest}},blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input});
    assert.deepEqual((await restoreCheckpoint({root})).completionIssues,[]);
    const bytes=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8');
    assert.equal((await persistCheckpoint({root,input})).action,'unchanged');
    fs.writeFileSync(path.join(root,proof.sourcePath),'changed implementation');
    const restored=await restoreCheckpoint({root});
    assert.equal(restored.status,'needs_validation');
    assert.equal(restored.completionIssues[0].outcome,'healthy outcome');
    await assert.rejects(persistCheckpoint({root,input}),/completionEvidence Needs Validation/);
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),bytes);
});

test('failed and skipped acceptance evidence cannot become checkpoint verified outcomes', async (t) => {
    const {persistCheckpoint}=await import('./memory-maintenance.mjs');
    for (const status of ['fail','skip']) {
        const root=makeRoot(t),proof=await provisionCompletionFixture(root,{taskId:status,status});
        const input={nextAction:'continue',verifiedOutcomes:['goal achieved'],completionEvidence:{'goal achieved':{contractPath:proof.contractPath,contractDigest:proof.contractDigest}},blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
        await assert.rejects(persistCheckpoint({root,input}),/completionEvidence Needs Validation/);
        assert.equal(fs.existsSync(path.join(root,'.continue-here.md')),false);
    }
});

test('legacy checkpoint stays readable but unproven verified metadata cannot skip or release its dependency', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),ref=await writeReadyLedger(root),key=id=>`${ref}#${id}`;
    const input={nextAction:'continue independent A',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref],goalScopes:{dependencies:{[key('A')]:[],[key('B')]:[key('A')],[key('C')]:[key('D')],[key('D')]:[]},blockers:{},contracts:{}}};
    await persistCheckpoint({root,input});
    const ledger=JSON.parse(fs.readFileSync(path.join(root,ref),'utf8'));
    delete ledger.goals.D.completionContract;
    fs.writeFileSync(path.join(root,ref),JSON.stringify(ledger));
    const file=path.join(root,'.continue-here.md');
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('"verifiedOutcomes": []','"verifiedOutcomes": ["D historically complete"]'));
    const restored=await restoreCheckpoint({root});
    assert.equal(restored.completionIssues[0].status,'Needs Validation');
    assert.deepEqual(restored.skippedVerified,[]);
    assert.deepEqual(restored.dispatchable,[{ledger:ref,id:'A'}]);
    assert.deepEqual(restored.blocked.map(goal=>goal.id).sort(),['C','D']);
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

test('feedback remains bound to each actual knowledge revision and record digest', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),knowledgeRef='docs/solutions/retry.md';
    fs.mkdirSync(path.dirname(path.join(root,knowledgeRef)),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const revision1='---\norigin: knowledge\nrevision: 1\n---\n# Retry\nBounded backoff\n';
    fs.writeFileSync(path.join(root,knowledgeRef),revision1);
    const input={origin:'task-1',knowledgeRef,disposition:'used',outcome:'verified',evidence:['proof.txt']};
    await recordFeedback({root,input});
    fs.writeFileSync(path.join(root,knowledgeRef),revision1.replace('revision: 1','revision: 2'));
    await recordFeedback({root,input:{...input,outcome:'failed'}});
    const raw=fs.readFileSync(path.join(root,'docs/learnings/knowledge-feedback.md'),'utf8');
    assert.equal((raw.match(/^## feedback-/gm)||[]).length,2);
    assert.match(raw,/- Knowledge revision: 1/);
    assert.match(raw,/- Knowledge revision: 2/);
    assert.ok(raw.includes(`- Knowledge digest: ${createHash('sha256').update(revision1).digest('hex')}`));
    assert.equal((await recordFeedback({root,input:{...input,outcome:'failed'}})).action,'unchanged');
    assert.equal(runReport({root}).candidates.length,0);
});

test('feedback overflow archives losslessly before active replacement and archived replay stays idempotent', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),knowledgeRef='docs/solutions/retry.md';
    fs.mkdirSync(path.dirname(path.join(root,knowledgeRef)),{recursive:true});
    fs.writeFileSync(path.join(root,knowledgeRef),'---\nrevision: 1\n---\n# Retry\nBackoff\n');
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={origin:'task-0',knowledgeRef,disposition:'used',outcome:'failed',evidence:['proof.txt']};
    for(let i=0;i<101;i++) await recordFeedback({root,input:{...input,origin:`task-${i}`}});
    const active=fs.readFileSync(path.join(root,'docs/learnings/knowledge-feedback.md'),'utf8');
    const archiveFile=path.join(root,'docs/archive/KNOWLEDGE_FEEDBACK_ARCHIVE.md');
    assert.equal(fs.existsSync(archiveFile),true);
    const archive=fs.readFileSync(archiveFile,'utf8');
    assert.equal((active.match(/^## feedback-/gm)||[]).length,100);
    assert.equal((archive.match(/^## feedback-/gm)||[]).length,1);
    assert.match(archive,/- Origin: task-0\n/);
    assert.equal((await recordFeedback({root,input})).action,'unchanged');
    assert.equal(fs.readFileSync(archiveFile,'utf8'),archive);
    assert.equal(fs.readFileSync(path.join(root,'docs/learnings/knowledge-feedback.md'),'utf8'),active);
    await recordFeedback({root,input:{...input,origin:'task-101'},dryRun:true});
    assert.equal(fs.readFileSync(archiveFile,'utf8'),archive);
});

test('feedback report preserves negative observations, summarizes revision outcomes, and marks legacy unknown', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),knowledgeRef='docs/solutions/retry.md';
    fs.mkdirSync(path.dirname(path.join(root,knowledgeRef)),{recursive:true});
    fs.writeFileSync(path.join(root,knowledgeRef),'---\nrevision: 1\n---\n# Retry\nBackoff\n');
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={origin:'task-1',knowledgeRef,disposition:'used',outcome:'failed',evidence:['proof.txt']};
    await recordFeedback({root,input});
    await recordFeedback({root,input:{...input,outcome:'verified'}});
    await recordFeedback({root,input:{...input,origin:'task-2',disposition:'rejected',outcome:'unknown'}});
    await recordFeedback({root,input:{...input,origin:'task-3',outcome:'unknown'}});
    fs.appendFileSync(path.join(root,'docs/learnings/knowledge-feedback.md'),'\n## feedback-legacy\n- Origin: old-task\n- Knowledge: docs/solutions/old.md\n- Disposition: used\n- Outcome: verified\n- Evidence: old-proof\n');
    const report=runReport({root});
    assert.equal(report.feedback.records,5);
    assert.deepEqual(report.feedback.outcomes,{verified:2,failed:1,unknown:2});
    assert.equal(report.feedback.legacyUnbound,1);
    assert.equal(report.feedback.groups[0].reviewRequired,true);
    assert.equal(report.feedback.groups[0].knowledgeRef,knowledgeRef);
    assert.equal(report.feedback.groups[0].knowledgeRevision,'1');
    assert.deepEqual(report.feedback.groups[0].outcomes,{verified:1,failed:1,unknown:2});
    assert.equal(report.feedback.groups[0].dispositions.rejected,1);
    assert.equal(report.candidates.length,0);
});

test('feedback archive-first interruption recovers without duplicate counts and cap failure retains bytes', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),knowledgeRef='docs/solutions/retry.md';
    fs.mkdirSync(path.dirname(path.join(root,knowledgeRef)),{recursive:true});
    fs.writeFileSync(path.join(root,knowledgeRef),'---\nrevision: 1\n---\n# Retry\nBackoff\n');
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={origin:'task-0',knowledgeRef,disposition:'used',outcome:'failed',evidence:['proof.txt']};
    for(let i=0;i<100;i++)await recordFeedback({root,input:{...input,origin:`task-${i}`}});
    const activeFile=path.join(root,'docs/learnings/knowledge-feedback.md'),archiveFile=path.join(root,'docs/archive/KNOWLEDGE_FEEDBACK_ARCHIVE.md');
    const before=fs.readFileSync(activeFile,'utf8');
    await assert.rejects(recordFeedback({root,input:{...input,origin:'task-100'},writeOptions:{renameFile:async(from,to)=>{if(to===activeFile)throw new Error('active write unavailable');await fs.promises.rename(from,to);}}}),/active write unavailable/);
    assert.equal(fs.readFileSync(activeFile,'utf8'),before);
    assert.match(fs.readFileSync(archiveFile,'utf8'),/- Origin: task-0\n/);
    assert.equal(runReport({root}).feedback.records,100);
    await recordFeedback({root,input:{...input,origin:'task-100'}});
    assert.equal(runReport({root}).feedback.records,101);
    const archive=fs.readFileSync(archiveFile,'utf8');
    const capped=`${archive}\n<!--${'x'.repeat(2*1024*1024-Buffer.byteLength(archive,'utf8')-8)}-->`;
    fs.writeFileSync(archiveFile,capped);
    const current=fs.readFileSync(activeFile,'utf8');
    await assert.rejects(recordFeedback({root,input:{...input,origin:'task-101'}}),/archive cap exceeded/);
    assert.equal(fs.readFileSync(activeFile,'utf8'),current);
    assert.equal(fs.readFileSync(archiveFile,'utf8'),capped);
});

test('feedback summaries remain bounded and show negative groups before positive ones', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.mkdirSync(path.join(root,'docs/solutions'),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    for(let i=0;i<12;i++) {
        const knowledgeRef=`docs/solutions/record-${i}.md`;
        fs.writeFileSync(path.join(root,knowledgeRef),`---\nrevision: 1\n---\n# Record ${i}\n`);
        await recordFeedback({root,input:{origin:'same-origin',knowledgeRef,disposition:'used',outcome:i===11?'failed':'verified',evidence:['proof.txt']}});
    }
    const report=runReport({root});
    assert.equal(report.feedback.groups.length,10);
    assert.equal(report.feedback.groupsTotal,12);
    assert.equal(report.feedback.truncated,true);
    assert.equal(report.feedback.groups[0].knowledgeRef,'docs/solutions/record-11.md');
    assert.equal(report.feedback.groups[0].reviewRequired,true);
    assert.equal(report.feedback.records,12);
    const result=spawnSync(process.execPath,[TOOL,'report','--root',root],{encoding:'utf8'});
    assert.match(result.stdout,/REVIEW feedback docs\/solutions\/record-11.md/);
    assert.equal(report.candidates.length,0);
});

test('bounded feedback references preserve archived negative proof ahead of newer positive observations', async (t) => {
    const {recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),knowledgeRef='docs/solutions/retry.md';
    fs.mkdirSync(path.dirname(path.join(root,knowledgeRef)),{recursive:true});
    fs.writeFileSync(path.join(root,knowledgeRef),'---\nrevision: 1\n---\n# Retry\nBackoff\n');
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={origin:'negative-task',knowledgeRef,disposition:'rejected',outcome:'failed',evidence:['proof.txt']};
    await recordFeedback({root,input});
    for(let i=0;i<100;i++)await recordFeedback({root,input:{...input,origin:`positive-${i}`,disposition:'used',outcome:'verified'}});
    const archive='docs/archive/KNOWLEDGE_FEEDBACK_ARCHIVE.md';
    const negativeId=fs.readFileSync(path.join(root,archive),'utf8').match(/^## (feedback-[a-f0-9]+)/m)[1];
    const report=runReport({root});
    assert.equal(report.feedback.records,101);
    assert.equal(report.feedback.groups[0].reviewRequired,true);
    assert.equal(report.feedback.groups[0].feedbackRefs.length,5);
    assert.equal(report.feedback.groups[0].feedbackRefs[0],`${archive}#${negativeId}`);
    assert.deepEqual(report.feedback.groups[0].outcomes,{verified:100,failed:1,unknown:0});
});

test('legacy unbound feedback references prioritize negative observations without inferring revision', (t) => {
    const root=makeRoot(t),file='docs/learnings/knowledge-feedback.md';
    fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
    const blocks=Array.from({length:7},(_,i)=>`## feedback-legacy-${i}\n- Origin: old-${i}\n- Knowledge: docs/solutions/old.md\n- Disposition: used\n- Outcome: ${i===6?'failed':'verified'}\n`);
    fs.writeFileSync(path.join(root,file),'# Feedback\n\n'+blocks.join('\n'));
    const report=runReport({root});
    assert.equal(report.feedback.legacyUnbound,7);
    assert.deepEqual(report.feedback.outcomes,{verified:6,failed:1,unknown:0});
    assert.equal(report.feedback.legacyFeedbackRefs.length,5);
    assert.equal(report.feedback.legacyFeedbackRefs[0],`${file}#feedback-legacy-6`);
    assert.equal(report.feedback.groups.length,0);
    assert.equal(report.candidates.length,0);
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

test('privacy guard rejects capture fields and metadata before durable or pending writes', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const sensitive='password=synthetic-sensitive-value';
    for(const input of [{...captureInput(),topic:sensitive},{...captureInput(),origin:sensitive},{...captureInput(),fields:{Learning:sensitive,'Applies to':'project'}}]) {
        await assert.rejects(captureMemory({root,input}), error=>/PRIVACY_STOP/.test(error.message) && !error.message.includes(sensitive));
    }
    assert.equal(fs.existsSync(path.join(root,'docs/LEARNED_KNOWLEDGE.md')),false);
    assert.equal(fs.existsSync(path.join(root,'.scratch/pending-captures')),false);
    assert.equal((await captureMemory({root,input:captureInput()})).action,'created');
});

test('privacy guards refresh replacement and feedback without rewriting historical bytes', async (t) => {
    const {refreshMemory,recordFeedback}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t), file='docs/solutions/record.md';
    fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
    const historical='# Retry\nHistorical email: owner@example.test\n';
    fs.writeFileSync(path.join(root,file),historical);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={path:file,status:'active',reason:'verified',evidence:['proof.txt'],reviewed:true,expectedDigest:createHash('sha256').update(historical).digest('hex')};
    await assert.rejects(refreshMemory({root,input:{...input,content:'# Retry\npassword=synthetic-sensitive-value'}}), /PRIVACY_STOP/);
    assert.equal(fs.readFileSync(path.join(root,file),'utf8'),historical);
    await assert.rejects(recordFeedback({root,input:{origin:'password=synthetic-sensitive-value',knowledgeRef:file,disposition:'used',outcome:'verified',evidence:['proof.txt']}}), /PRIVACY_STOP/);
    assert.equal(fs.existsSync(path.join(root,'docs/learnings/knowledge-feedback.md')),false);
    assert.equal((await refreshMemory({root,input})).action,'updated');
    assert.match(fs.readFileSync(path.join(root,file),'utf8'),/Historical email: owner@example.test/);
});

test('maintenance catalog fails safely on unreadable scope rather than claiming no candidates', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    fs.mkdirSync(path.join(root,'docs/solutions'),{recursive:true});
    const original=fs.readdirSync;
    fs.readdirSync=function(file,...args) {
        if(file===path.join(root,'docs/solutions')) throw Object.assign(new Error('password=do-not-echo'),{code:'EACCES'});
        return original.call(this,file,...args);
    };
    try {
        assert.throws(()=>runReport({root}),error=>/incomplete catalog.*docs\/solutions.*EACCES/.test(error.message) && !error.message.includes('do-not-echo'));
        const input={...captureInput(),kind:'solution',category:'reliability',worth:'non-obvious-root-cause',fields:{Problem:'timeout',Symptoms:'reconnect','Root cause':'backoff',Solution:'bounded retry',Prevention:'test'}};
        await assert.rejects(captureMemory({root,input}),/incomplete catalog/);
    } finally { fs.readdirSync=original; }
    assert.equal(runReport({root}).candidates.length,0);
});

test('checkpoint preserves pending learning across updates and keeps verified work skipped', async (t) => {
    const {persistCheckpoint,restoreCheckpoint,captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),ref=await writeReadyLedger(root);
    const captureInputRef='.scratch/pending-captures/learning.json';
    fs.mkdirSync(path.dirname(path.join(root,captureInputRef)),{recursive:true});
    fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput('verified-work')}));
    const base={nextAction:'dispatch',verifiedOutcomes:['D verified'],completionEvidence:{'D verified':{ledgerRef:ref,goalId:'D'}},blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref]};
    const pending={origin:'verified-work',revision:'1',disposition:'pending',reason:'retry capture',evidenceRefs:['proof.txt'],captureInputRef};
    await persistCheckpoint({root,input:{...base,learningCloseouts:[pending]}});
    const first=await restoreCheckpoint({root});
    assert.equal(first.pendingKnowledgeMaintenance.length,1);
    assert.match(first.checkpoint.learningCloseouts[0].evidenceDigest,/^[a-f0-9]{64}$/);
    assert.deepEqual(first.skippedVerified,[{ledger:ref,id:'D'}]);
    assert.deepEqual(first.dispatchable.map(g=>g.id),['A','B','C']);
    await persistCheckpoint({root,input:{...base,nextAction:'continue independent work',learningCloseouts:[]}});
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,1);
    const captured=await captureMemory({root,input:captureInput('verified-work')});
    await persistCheckpoint({root,input:{...base,learningCloseouts:[{...pending,disposition:'captured',knowledgeRef:`${captured.path}#${captured.id}`,captureInputRef:undefined}]}});
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,0);
    const before=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8');
    assert.equal((await persistCheckpoint({root,input:{...base,learningCloseouts:[{...pending,disposition:'captured',knowledgeRef:`${captured.path}#${captured.id}`,captureInputRef:undefined}]}})).action,'unchanged');
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),before);
});

test('pending learning overflow stays in the existing queue without blocking progress checkpoints', async (t) => {
    const {persistCheckpoint,restoreCheckpoint,captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const pending=Array.from({length:21},(_,i)=>{
        const captureInputRef=`.scratch/pending-captures/learning-${i}.json`, origin=`verified-${i}`;
        fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput(origin),nextAction:'retry capture'}));
        return {origin,revision:'1',disposition:'pending',reason:'retry capture',evidenceRefs:['proof.txt'],captureInputRef};
    });
    const base={nextAction:'continue first goal',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:pending.slice(0,20)}});
    const before=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8');
    const jobs=fs.readdirSync(directory).map(name=>fs.readFileSync(path.join(directory,name),'utf8'));
    await persistCheckpoint({root,input:{...base,nextAction:'continue independent goal',learningCloseouts:[pending[20]]},dryRun:true});
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),before);
    assert.deepEqual(fs.readdirSync(directory).map(name=>fs.readFileSync(path.join(directory,name),'utf8')),jobs);
    await persistCheckpoint({root,input:{...base,nextAction:'continue independent goal',learningCloseouts:[pending[20]]}});
    let restored=await restoreCheckpoint({root});
    assert.equal(restored.checkpoint.nextAction,'continue independent goal');
    assert.ok(restored.checkpoint.learningCloseouts.length<=20);
    assert.equal(restored.pendingKnowledgeMaintenance.length,21);
    assert.equal(new Set(restored.pendingKnowledgeMaintenance.map(record=>record.origin)).size,21);
    const queued=restored.pendingKnowledgeMaintenance.find(record=>!restored.checkpoint.learningCloseouts.some(hot=>hot.origin===record.origin));
    const captured=await captureMemory({root,input:captureInput(queued.origin)});
    await persistCheckpoint({root,input:{...base,nextAction:'next verified goal',learningCloseouts:[{...queued,disposition:'captured',knowledgeRef:`${captured.path}#${captured.id}`,captureInputRef:undefined}]}});
    restored=await restoreCheckpoint({root});
    assert.equal(restored.pendingKnowledgeMaintenance.length,20);
    assert.ok(!restored.pendingKnowledgeMaintenance.some(record=>record.origin===queued.origin));
    assert.equal((await persistCheckpoint({root,input:{...base,nextAction:'next verified goal',learningCloseouts:[{...queued,disposition:'captured',knowledgeRef:`${captured.path}#${captured.id}`,captureInputRef:undefined}]}})).action,'unchanged');
});

test('learning closeout validation is bounded, privacy safe, and legacy checkpoints remain advisory', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),base={nextAction:'continue',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input:base});
    assert.equal((await restoreCheckpoint({root})).learningCoverage,'legacy-unknown');
    const skipped={origin:'tiny-change',revision:'1',disposition:'skipped-trivial',reason:'reasoning remains obvious in code',evidenceRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:[skipped]}});
    assert.equal((await restoreCheckpoint({root})).checkpoint.learningCloseouts[0].evidenceDigest,null);
    const before=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8');
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:[{...skipped,reason:'password=synthetic-sensitive-value'}]}}), /PRIVACY_STOP/);
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:Array.from({length:21},(_,i)=>({...skipped,origin:`skip-${i}`}))}}),/maximum 20/);
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:[{...skipped,disposition:'captured',evidenceRefs:['missing.txt'],knowledgeRef:'docs/solutions/missing.md'}]}}));
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),before);
});

test('queued learning survives interrupted completion and does not resurrect a durable capture', async (t) => {
    const {persistCheckpoint,restoreCheckpoint,captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const pending=Array.from({length:21},(_,i)=>{
        const origin=`work-${i}`,captureInputRef=`.scratch/pending-captures/${createHash('sha256').update(`LRN\n${origin}`).digest('hex')}.json`;
        fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput(origin)}));
        return {origin,revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef};
    });
    const base={nextAction:'continue',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:pending.slice(0,20)}});
    await persistCheckpoint({root,input:{...base,learningCloseouts:[pending[20]]}});
    const restored=await restoreCheckpoint({root});
    const queued=restored.pendingKnowledgeMaintenance.find(record=>!restored.checkpoint.learningCloseouts.some(hot=>hot.origin===record.origin));
    const jobFile=path.join(root,queued.captureInputRef);
    await assert.rejects(captureMemory({root,input:captureInput(queued.origin),writeOptions:{renameFile:async()=>{throw new Error('capture write unavailable');}}}),/capture write unavailable/);
    assert.deepEqual(JSON.parse(fs.readFileSync(jobFile,'utf8')).learningCloseout,queued);
    const jobBytes=fs.readFileSync(jobFile,'utf8');
    const captured=await captureMemory({root,input:captureInput(queued.origin)});
    assert.equal(fs.readFileSync(jobFile,'utf8'),jobBytes);
    const completed={...queued,disposition:'captured',knowledgeRef:`${captured.path}#${captured.id}`,captureInputRef:undefined};
    const checkpointBytes=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8');
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:[completed]},writeOptions:{renameFile:async()=>{throw new Error('checkpoint write unavailable');}}}),/checkpoint write unavailable/);
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),checkpointBytes);
    assert.equal(fs.readFileSync(jobFile,'utf8'),jobBytes);
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,21);
    await persistCheckpoint({root,input:{...base,learningCloseouts:[completed]}});
    fs.writeFileSync(jobFile,jobBytes);
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,20);
    await persistCheckpoint({root,input:{...base,nextAction:'independent goal'}});
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,20);
    assert.equal(JSON.parse(fs.readFileSync(jobFile,'utf8')).learningCloseout,undefined);
});

test('bounded maintenance flush durably closes spilled learning without resetting goal context', async (t) => {
    const {persistCheckpoint,restoreCheckpoint,flushPendingMaintenance}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    fs.writeFileSync(path.join(root,'contract.txt'),'pinned contract');
    const pending=Array.from({length:21},(_,i)=>{
        const origin=`work-${i}`,captureInputRef=`.scratch/pending-captures/${createHash('sha256').update(`LRN\n${origin}`).digest('hex')}.json`;
        fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput(origin)}));
        return {origin,revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef};
    });
    const base={nextAction:'continue independent goal',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:['contract.txt'],ledgerRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:pending.slice(0,20)}});
    await persistCheckpoint({root,input:{...base,learningCloseouts:[pending[20]]}});
    const original=await restoreCheckpoint({root});
    fs.writeFileSync(path.join(root,'contract.txt'),'changed contract');
    const result=await flushPendingMaintenance({root});
    assert.equal(result.processed,3);
    assert.equal(result.remaining,18);
    const restored=await restoreCheckpoint({root});
    assert.equal(restored.pendingKnowledgeMaintenance.length,18);
    assert.equal(restored.checkpoint.nextAction,base.nextAction);
    assert.deepEqual(restored.checkpoint.contracts,original.checkpoint.contracts);
    assert.deepEqual(restored.drift,['contract.txt']);
    assert.equal(new Set(restored.pendingKnowledgeMaintenance.map(record=>record.origin)).size,18);
});

test('queue inspection overflow is advisory and retains every pending job while progress checkpoints continue', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const captureInputRef='.scratch/pending-captures/hot.json';
    fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput('hot')}));
    const base={nextAction:'continue',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:[{origin:'hot',revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef}]}});
    const template=(await restoreCheckpoint({root})).checkpoint.learningCloseouts[0];
    for (let i=0;i<101;i++) {
        const origin=`queued-${i}`,ref=`.scratch/pending-captures/queued-${i}.json`;
        fs.writeFileSync(path.join(root,ref),JSON.stringify({input:captureInput(origin),learningCloseout:{...template,origin,captureInputRef:ref}}));
    }
    await persistCheckpoint({root,input:{...base,nextAction:'continue independent goal'}});
    const restored=await restoreCheckpoint({root});
    assert.equal(restored.checkpoint.nextAction,'continue independent goal');
    assert.ok(restored.pendingLearningQueueIssues.some(issue=>issue.ref==='.scratch/pending-captures' && /inspection bound/.test(issue.error)));
    assert.ok(restored.checkpoint.learningCloseouts.length<=20);
    assert.equal(fs.readdirSync(directory).filter(name=>name.endsWith('.json')).length,102);
    for (let i=0;i<101;i++) assert.equal(JSON.parse(fs.readFileSync(path.join(directory,`queued-${i}.json`),'utf8')).input.origin,`queued-${i}`);
});

test('maintenance flush retains the old learning identity when queued evidence changes', async (t) => {
    const {persistCheckpoint,restoreCheckpoint,flushPendingMaintenance}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),origin='verified-work';
    const ref=`.scratch/pending-captures/${createHash('sha256').update(`LRN\n${origin}`).digest('hex')}.json`;
    fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    fs.writeFileSync(path.join(root,ref),JSON.stringify({input:captureInput(origin)}));
    const base={nextAction:'independent work',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    await persistCheckpoint({root,input:{...base,learningCloseouts:[{origin,revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef:ref}]}});
    const before=await restoreCheckpoint({root});
    const checkpointBytes=fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),jobBytes=fs.readFileSync(path.join(root,ref),'utf8');
    fs.writeFileSync(path.join(root,'proof.txt'),'changed evidence');
    const result=await flushPendingMaintenance({root});
    assert.equal(result.processed,0);
    assert.equal(result.remaining,1);
    assert.equal(result.results[0].status,'pending');
    assert.equal(fs.existsSync(path.join(root,'docs/LEARNED_KNOWLEDGE.md')),false);
    assert.deepEqual((await restoreCheckpoint({root})).pendingKnowledgeMaintenance,before.pendingKnowledgeMaintenance);
    assert.equal(fs.readFileSync(path.join(root,'.continue-here.md'),'utf8'),checkpointBytes);
    assert.equal(fs.readFileSync(path.join(root,ref),'utf8'),jobBytes);
});

test('bounded maintenance retry defers failing jobs so valid queued work cannot starve', async (t) => {
    const {flushPendingMaintenance}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const failing=['a.json','b.json','c.json'];
    for (const name of failing) {
        fs.writeFileSync(path.join(directory,name),'malformed private payload');
        fs.utimesSync(path.join(directory,name),new Date('2000-01-01'),new Date('2000-01-01'));
    }
    fs.writeFileSync(path.join(directory,'z.json'),JSON.stringify({input:captureInput('valid-tail')}));
    fs.utimesSync(path.join(directory,'z.json'),new Date('2100-01-01'),new Date('2100-01-01'));
    const first=await flushPendingMaintenance({root});
    assert.equal(first.results.length,3);
    assert.equal(first.processed,0);
    assert.equal(first.remaining,4);
    const second=await flushPendingMaintenance({root});
    assert.ok(second.results.some(result=>result.ref.endsWith('/z.json') && result.status==='completed'));
    assert.equal(second.processed,1);
    assert.equal(second.remaining,3);
    assert.ok(second.results.length<=3);
    for (const name of failing) assert.equal(fs.readFileSync(path.join(directory,name),'utf8'),'malformed private payload');
    assert.ok(!JSON.stringify([first,second]).includes('malformed private payload'));
});

test('pending capture payload is validated and unresolved evidence identity cannot be replaced', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),base={nextAction:'continue',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]};
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const captureInputRef='.scratch/pending-captures/learning.json';
    fs.mkdirSync(path.dirname(path.join(root,captureInputRef)),{recursive:true});
    const pending={origin:'work',revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef};
    fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:{...captureInput('work'),fields:{Learning:'password=synthetic-sensitive-value','Applies to':'project'}}}));
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:[pending]}}),/PRIVACY_STOP/);
    assert.equal(fs.existsSync(path.join(root,'.continue-here.md')),false);
    fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput('work')}));
    await persistCheckpoint({root,input:{...base,learningCloseouts:[pending]}});
    fs.writeFileSync(path.join(root,'proof.txt'),'new evidence');
    await persistCheckpoint({root,input:{...base,learningCloseouts:[{...pending,disposition:'skipped-trivial',captureInputRef:undefined,reason:'new trivial work'}]}});
    assert.equal((await restoreCheckpoint({root})).pendingKnowledgeMaintenance.length,1);
    assert.equal((await restoreCheckpoint({root})).checkpoint.learningCloseouts.length,2);
});

test('failed solution write retains validated pending input and retries idempotently', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const input={...captureInput(),kind:'solution',category:'reliability',worth:'non-obvious-root-cause',fields:{Problem:'timeout',Symptoms:'reconnect','Root cause':'backoff',Solution:'bounded retry',Prevention:'test'}};
    await assert.rejects(captureMemory({root,input,writeOptions:{renameFile:async()=>{throw new Error('write unavailable');}}}),/write unavailable/);
    const directory=path.join(root,'.scratch/pending-captures');
    assert.equal(fs.existsSync(directory),true);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,fs.readdirSync(directory)[0]),'utf8')).input,input);
    assert.equal((await captureMemory({root,input})).action,'created');
    assert.equal(fs.readdirSync(directory).length,0);
    assert.equal((await captureMemory({root,input})).action,'unchanged');
});

test('learning receipt reference preserves completion identity through pending overflow', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const {contextDigest}=await import('./instruction-context.mjs');
    const root=makeRoot(t),ref=await writeReadyLedger(root),ledgerFile=path.join(root,ref);
    const ledger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
    const identity={workerId:'worker-1',attempt:1,goalId:'D',reportPath:ledger.goals.D.reportPath,reportDigest:'d'.repeat(64),evidence:ledger.goals.D.evidence,constraintDigest:contextDigest([])};
    const receiptId=contextDigest(identity);
    ledger.goals.D.receipts={[receiptId]:{...identity,state:'received'}};
    fs.writeFileSync(ledgerFile,JSON.stringify(ledger));
    const ledgerBytes=fs.readFileSync(ledgerFile,'utf8');
    const captureInputRef='.scratch/pending-captures/learning.json';
    fs.mkdirSync(path.dirname(path.join(root,captureInputRef)),{recursive:true});
    fs.writeFileSync(path.join(root,captureInputRef),JSON.stringify({input:captureInput('work')}));
    const base={nextAction:'continue',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref]};
    const pending={origin:'work',revision:'1',disposition:'pending',reason:'retry',evidenceRefs:['proof.txt'],captureInputRef,completionRef:`${ref}#D#${receiptId}`};
    await persistCheckpoint({root,input:{...base,learningCloseouts:[pending]}});
    assert.equal((await restoreCheckpoint({root})).checkpoint.learningCloseouts[0].completionRef,pending.completionRef);
    await persistCheckpoint({root,input:{...base,learningCloseouts:Array.from({length:20},(_,i)=>({origin:`skip-${i}`,revision:'1',disposition:'skipped-trivial',reason:'obvious',evidenceRefs:[]}))}});
    const restored=await restoreCheckpoint({root});
    assert.equal(restored.checkpoint.learningCloseouts.length,20);
    assert.equal(restored.pendingKnowledgeMaintenance.length,1);
    assert.equal(restored.pendingKnowledgeMaintenance[0].completionRef,pending.completionRef);
    await assert.rejects(persistCheckpoint({root,input:{...base,learningCloseouts:[{...pending,completionRef:`${ref}#D#unknown`}]}}),/existing work-package receipt/);
    assert.equal(fs.readFileSync(ledgerFile,'utf8'),ledgerBytes);
});

test('pending maintenance diagnostics never echo malformed capture payloads', async (t) => {
    const {flushPendingMaintenance}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),directory=path.join(root,'.scratch/pending-captures');
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'invalid.json'),'password=synthetic-sensitive-value');
    const result=await flushPendingMaintenance({root});
    assert.equal(result.remaining,1);
    assert.equal(result.results[0].status,'pending');
    assert.ok(!JSON.stringify(result).includes('synthetic-sensitive-value'));
    assert.equal(fs.readFileSync(path.join(directory,'invalid.json'),'utf8'),'password=synthetic-sensitive-value');
});

test('malformed CLI input diagnostics do not echo sensitive payload snippets', (t) => {
    const root=makeRoot(t);
    fs.writeFileSync(path.join(root,'input.json'),'password=synthetic-sensitive-value');
    const result=spawnSync(process.execPath,[TOOL,'capture','--root',root,'--input-file','input.json'],{encoding:'utf8'});
    assert.equal(result.status,2);
    assert.ok(!result.stderr.includes('password='),result.stderr);
    assert.match(result.stderr,/invalid maintenance input JSON/);
});

test('pending capture identity treats reordered field keys as the same retry', async (t) => {
    const {captureMemory}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),input=captureInput();
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    await assert.rejects(captureMemory({root,input,writeOptions:{renameFile:async()=>{throw new Error('busy');}}}),/busy/);
    const reordered={...input,fields:Object.fromEntries(Object.entries(input.fields).reverse())};
    assert.equal((await captureMemory({root,input:reordered})).action,'created');
    assert.equal(fs.readdirSync(path.join(root,'.scratch/pending-captures')).length,0);
});

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

async function writeReadyLedger(root) {
    const ref='.scratch/work-packages/run-1/ledger.json';
    const goal=id=>({status:'ready',briefPath:`.scratch/${id}.md`,reportPath:`.scratch/${id}-report.md`,pathsPath:`.scratch/${id}.json`,reviewPackagePath:`.scratch/${id}.patch`,scopeDigest:'a'.repeat(64),baselineDirty:{},verification:'pending'});
    fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});
    fs.writeFileSync(path.join(root,'proof.txt'),'verified');
    const digests={authorityDigest:'a'.repeat(64),evalDigest:'b'.repeat(64),reviewerDigest:'c'.repeat(64)};
    const proof=await provisionCompletionFixture(root,{taskId:'D'});
    const evidence={...digests,evidenceRefs:['proof.txt',proof.evidencePath],evidenceArtifacts:[{path:'proof.txt',digest:createHash('sha256').update('verified').digest('hex')},proof.evidenceRef]};
    fs.writeFileSync(path.join(root,ref),JSON.stringify({schema:'work_package_ledger_v2',runId:'run-1',ledgerVersion:1,goals:{A:goal('A'),B:goal('B'),C:goal('C'),D:{...goal('D'),status:'verified',expectedEvidence:digests,completionContract:{path:proof.contractPath,digest:proof.contractDigest},evidence}}}));
    return ref;
}

test('resume diagnoses stale proof per goal and blocks only its dependency consumers', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t),ref=await writeReadyLedger(root),key=id=>`${ref}#${id}`;
    const input={nextAction:'dispatch ready goals',verifiedOutcomes:['D previously verified'],completionEvidence:{'D previously verified':{ledgerRef:ref,goalId:'D'}},blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[ref],goalScopes:{dependencies:{[key('A')]:[],[key('B')]:[key('A')],[key('C')]:[key('D')],[key('D')]:[]},blockers:{},contracts:{}}};
    await persistCheckpoint({root,input});
    fs.writeFileSync(path.join(root,'proof.txt'),'changed');
    const result=await restoreCheckpoint({root});
    assert.deepEqual(result.dispatchable,[{ledger:ref,id:'A'}]);
    assert.deepEqual(result.blocked.map(goal=>goal.id).sort(),['C','D']);
    assert.deepEqual(result.skippedVerified,[]);
    assert.equal(result.staleEvidence[0].goalId,'D');
    assert.equal((await persistCheckpoint({root,input:{...input,verifiedOutcomes:[],completionEvidence:{},nextAction:'continue independent goal A'}})).action,'checkpointed');
    const ledger=JSON.parse(fs.readFileSync(path.join(root,ref),'utf8')); ledger.goals.D.scopeDigest='invalid';
    fs.writeFileSync(path.join(root,ref),JSON.stringify(ledger));
    await assert.rejects(restoreCheckpoint({root}),/scopeDigest/);
});

test('resume blocks scoped drift and descendants while independent goals proceed', async (t) => {
    const {persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
    const root=makeRoot(t), ref=await writeReadyLedger(root), key=id=>`${ref}#${id}`;
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
    const root=makeRoot(t), ref=await writeReadyLedger(root);
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
    const root=makeRoot(t),ref=await writeReadyLedger(root),key=id=>`${ref}#${id}`;
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
