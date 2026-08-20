import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { lintDoc, loadBudgets } from './doc-lint.mjs';

function makeRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-lint-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    return root;
}

function lint(root, relPath, content) {
    const docPath = path.join(root, relPath);
    fs.writeFileSync(docPath, content);
    return lintDoc({ docPath, root, budgets: loadBudgets(root) });
}

test('clean single-projection doc produces no findings', (t) => {
    const root = makeRoot(t);
    const findings = lint(
        root,
        'docs/subject.md',
        '# Subject\n\nOne substantial paragraph that states the result once and moves on.\n\n## Detail\n\nA second distinct paragraph covering GOAL-001..GOAL-006 in range notation.\n'
    );
    assert.deepEqual(findings, []);
});

test('more than two empty-shell headings are flagged, two are tolerated', (t) => {
    const root = makeRoot(t);
    const flagged = lint(
        root,
        'docs/shells.md',
        '# Doc\n\nIntro text.\n\n## Risks\n\n## Learnings\n\nNone\n\n## Follow-ups\n\nN/A\n'
    );
    assert.deepEqual(flagged.map((f) => f.kind), ['empty-shell']);
    const tolerated = lint(
        root,
        'docs/two-shells.md',
        '# Doc\n\nIntro text.\n\n## Risks\n\n## Learnings\n\nNone\n\n## Next\n\nReal content here.\n'
    );
    assert.deepEqual(tolerated, []);
});

test('parent heading followed by a subsection is not an empty shell', (t) => {
    const root = makeRoot(t);
    const findings = lint(
        root,
        'docs/container.md',
        '# Doc\n\n## A\n\n### A1\n\ntext\n\n## B\n\n### B1\n\ntext\n\n## C\n\n### C1\n\ntext\n'
    );
    assert.deepEqual(findings, []);
});

test('duplicate 12+ word paragraphs are flagged within a doc', (t) => {
    const root = makeRoot(t);
    const para = 'This exact sentence contains at least twelve words so the duplicate detector treats it as substantive prose.';
    const findings = lint(root, 'docs/dupe.md', `# Doc\n\n${para}\n\nOther text.\n\n${para}\n`);
    assert.deepEqual(findings.map((f) => f.kind), ['duplicate-paragraph']);
    assert.match(findings[0].value, /repeated 2x in doc/);
});

test('paragraph repeated in a sibling markdown file is flagged', (t) => {
    const root = makeRoot(t);
    const para = 'Shared boilerplate paragraph of at least twelve words that was copied between two sibling documents verbatim.';
    fs.writeFileSync(path.join(root, 'docs/sibling.md'), `# Sibling\n\n${para}\n`);
    const findings = lint(root, 'docs/subject.md', `# Subject\n\n${para}\n`);
    assert.deepEqual(findings.map((f) => f.kind), ['duplicate-paragraph']);
    assert.match(findings[0].value, /sibling\.md/);
});

test('uniform status table suggests a one-line collapse, mixed table passes', (t) => {
    const root = makeRoot(t);
    const uniform = lint(
        root,
        'docs/table.md',
        '# Doc\n\n| Check | Result |\n| --- | --- |\n| build | PASS |\n| lint | PASS |\n| tests | PASS |\n'
    );
    assert.deepEqual(uniform.map((f) => f.kind), ['uniform-table']);
    assert.match(uniform[0].value, /3\/3 PASS/);
    const mixed = lint(
        root,
        'docs/mixed.md',
        '# Doc\n\n| Check | Result |\n| --- | --- |\n| build | PASS |\n| lint | FAIL |\n| tests | PASS |\n'
    );
    assert.deepEqual(mixed, []);
});

test('word-cap fires from doc-budgets.json and is skipped when the map is missing', (t) => {
    const root = makeRoot(t);
    const longDoc = (prefix) =>
        `# Doc\n\n${Array.from({ length: 30 }, (_, i) => `${prefix}${i}`).join(' ')}\n`;
    assert.deepEqual(lint(root, 'docs/over.md', longDoc('word')), []);
    fs.mkdirSync(path.join(root, '.agent/context'), { recursive: true });
    fs.writeFileSync(
        path.join(root, '.agent/context/doc-budgets.json'),
        JSON.stringify({
            schema: 'doc_budgets_v1',
            metric: 'words',
            budgets: { 'docs/': 999, 'docs/**/*.md': 10 },
        })
    );
    const findings = lint(root, 'docs/over-budget.md', longDoc('item'));
    assert.deepEqual(findings.map((f) => f.kind), ['word-cap']);
    assert.match(findings[0].value, /10-word budget/);
});

test('run of more than four sequential IDs suggests range notation', (t) => {
    const root = makeRoot(t);
    const flagged = lint(
        root,
        'docs/ids.md',
        '# Doc\n\n- GOAL-001\n- GOAL-002\n- GOAL-003\n- GOAL-004\n- GOAL-005\n'
    );
    assert.deepEqual(flagged.map((f) => f.kind), ['expanded-id-run']);
    assert.match(flagged[0].value, /GOAL-001\.\.GOAL-005/);
    const tolerated = lint(
        root,
        'docs/four-ids.md',
        '# Doc\n\n- GOAL-001\n- GOAL-002\n- GOAL-003\n- GOAL-004\n'
    );
    assert.deepEqual(tolerated, []);
});
