import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateDoc } from './validate-doc-claims.mjs';

function makeRepo(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vdc-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'docs/solutions'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/solutions/real.md'), '# Real');
    return root;
}

test('verified paths and links produce no findings', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(
        doc,
        '# S\nSee `docs/solutions/real.md` and [link](./real.md).'
    );
    const findings = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(findings, []);
});

test('missing cited path is flagged', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(doc, '# S\nSee `docs/absent/thing.md`.');
    const findings = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].kind, 'missing-path');
});

test('broken relative link is flagged, external links skipped', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(
        doc,
        '# S\n[gone](./gone.md) [ok](https://example.com/x)'
    );
    const findings = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(findings.map((f) => f.kind), ['broken-link']);
});

test('drafting scaffold is flagged', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(doc, '# S\nTODO finish this <placeholder>');
    const findings = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(
        findings.map((f) => f.kind),
        ['drafting-scaffold', 'drafting-scaffold']
    );
});

test('skeleton boilerplate is flagged in produced docs but not in templates', (t) => {
    const root = makeRepo(t);
    const residue =
        '# S\nImplement referenced FSD goal only; do not copy authority prose.\nActive task: <task or none>';
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(doc, residue);
    const findings = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(
        findings.map((f) => f.kind),
        ['skeleton-boilerplate', 'skeleton-boilerplate']
    );
    fs.mkdirSync(path.join(root, '.agent/templates'), { recursive: true });
    const template = path.join(root, '.agent/templates/skeleton.md');
    fs.writeFileSync(template, residue);
    const exempt = validateDoc({ docPath: template, root, gitCheck: false });
    assert.deepEqual(exempt, []);
});

test('unknown commit sha flagged only when gitCheck enabled', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(doc, '# S\nFixed in deadbeefcafe1234.');
    const off = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(off, []);
});

test('hex without a commit cue is a NOTE, cued or backticked hex is a FLAG', (t) => {
    // The temp root is not a git repository, so every sha is unresolvable.
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(
        doc,
        [
            '# S',
            'Fixed in commit deadbeefcafe1234 and rev `abc1234`.',
            'Session a781a1fff73e43c20 measured digest 610263b525265bdb9d900fe55af5acb129cba89e.',
        ].join('\n')
    );
    const findings = validateDoc({ docPath: doc, root, gitCheck: true });
    assert.deepEqual(
        findings.map((f) => [f.kind, f.value, f.severity ?? 'FLAG']),
        [
            ['unknown-commit', 'deadbeefcafe1234', 'FLAG'],
            ['unknown-commit', 'abc1234', 'FLAG'],
            ['unresolved-hex', 'a781a1fff73e43c20', 'NOTE'],
            ['unresolved-hex', '610263b525265bdb9d900fe55af5acb129cba89e', 'NOTE'],
        ]
    );
});
