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

test('unknown commit sha flagged only when gitCheck enabled', (t) => {
    const root = makeRepo(t);
    const doc = path.join(root, 'docs/solutions/subject.md');
    fs.writeFileSync(doc, '# S\nFixed in deadbeefcafe1234.');
    const off = validateDoc({ docPath: doc, root, gitCheck: false });
    assert.deepEqual(off, []);
});
