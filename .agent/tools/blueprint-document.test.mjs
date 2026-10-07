import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {readManifest, parseIssuePointer} from './readiness-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const digest = text => createHash('sha256').update(text).digest('hex');
const attempt = JSON.parse(read('.agent/evals/blueprint-document.responses.json'));
// Outcomes are reviewed responses, not an implementation of a new dispatcher.
const expected = {
  BP01: [['light', 'sc-work', 'scoped-copy', 'verify'], []],
  BP02: [['light', 'sc-debug', 'reproduce', 'regression'], []],
  BP03: [['full', 'sc-prd', 'canonical-skeleton', 'mandatory-coverage', 'expand-applicable-only'], ['fsd', 'execution']],
  BP04: [['inspect-identity', 'retain-prd', 'retain-fsd', 'owner-refresh'], []],
  BP05: [['full', 'sc-prd', 'validate-prd', 'stop-at-prd'], ['fsd', 'execution']],
  BP06: [['local-only', 'local-checks', 'accessibility'], []],
  BP07: [['networked', 'require-real-slice', 'block-scale-out'], ['real-provider-proof', 'scale-out']],
  BP08: [['full', 'material-authority', 'negative-checks'], ['unapproved-material-delta']],
  BP09: [['resolve-q1-only', 'retain-ids', 'reopen-affected', 'show-ready'], ['Q2', 'Q3']],
  BP10: [['inspect-identity', 'reuse-valid', 'skip-verified', 'resume-ready'], []],
  BP11: [['read-only', 'return-findings', 'name-owner'], ['remediation-authority']],
  BP12: [['read-existing', 'preserve-grammar', 'retain-legacy-gate'], ['legacy-execution']],
};
const negative = {
  BP01: r => { r.actions[0] = 'full'; },
  BP02: r => { r.actions.splice(r.actions.indexOf('reproduce'), 1); },
  BP03: r => { r.actions[r.actions.indexOf('expand-applicable-only')] = 'copy-every-reference-table'; },
  BP04: r => { r.actions[r.actions.indexOf('retain-fsd')] = 'request-administrative-reapproval'; },
  BP05: r => { r.actions.push('write-fsd-and-product-code'); },
  BP06: r => { r.actions.push('fabricate-provider-assets'); },
  BP07: r => { r.actions[r.actions.indexOf('block-scale-out')] = 'scale-out-from-mock'; },
  BP08: r => { r.actions[0] = 'light'; },
  BP09: r => { r.remaining = []; },
  BP10: r => { r.actions[r.actions.indexOf('skip-verified')] = 'repeat-valid-evidence'; },
  BP11: r => { r.actions.push('apply-remediation'); },
  BP12: r => { r.actions[r.actions.indexOf('retain-legacy-gate')] = 'execute-legacy-authority'; },
};
function grade(record) {
  const [actions, remaining] = expected[record.id];
  assert.deepEqual(record.actions, actions, `${record.id}: wrong owner/action/authority`);
  assert.deepEqual(record.remaining, remaining, `${record.id}: hidden blocker or false resolution`);
  assert.ok(record.response.length > 60, 'exact reviewed response required');
  assert.equal(record.manufacturedEvidence, false);
}

test('all twelve acceptance scenarios retain exact baseline and reviewed candidate responses', () => {
  assert.match(attempt.basis, /not independent host reliability/);
  assert.deepEqual(attempt.baseline.cases.map(c => c.id), Object.keys(expected));
  assert.deepEqual(attempt.candidate.cases.map(c => c.id), Object.keys(expected));
  assert.equal(attempt.baseline.observed_gaps.length, 3);
  for (const [i, record] of attempt.candidate.cases.entries()) {
    assert.equal(record.prompt, attempt.baseline.cases[i].prompt, 'same pressure/input across review');
  }
});
for (const record of attempt.candidate.cases) {
  test(`${record.id}: reviewed outcome rejects wrong routing, authority or missing evidence`, () => {
    grade(record);
    const wrong = structuredClone(record);
    negative[record.id](wrong);
    assert.throws(() => grade(wrong));
    if (record.remaining.length) {
      const promoted = structuredClone(record);
      promoted.remaining.shift();
      assert.throws(() => grade(promoted), 'negative control must reject false resolution');
    }
    const invented = structuredClone(record);
    invented.manufacturedEvidence = true;
    assert.throws(() => grade(invented));
  });
}

test('reviewed sources are pinned and protected template interfaces remain unchanged', () => {
  assert.ok(Object.keys(attempt.source_digests).length >= 10);
  for (const [file, hash] of Object.entries(attempt.source_digests)) assert.equal(digest(read(file)), hash, file);
  for (const [file, signature] of Object.entries(attempt.protected_interfaces)) {
    const text = read(file);
    const headings = text.match(signature.numbered ? /^#{1,6} \d[^\n]*$/gm : /^## [^\n]*$/gm) ?? [];
    assert.equal(digest(headings.join('\n')), signature.headings_digest, `${file}: protected headings changed`);
    if (signature.frontmatter_digest) assert.equal(digest(text.match(/^---\n[\s\S]*?\n---/)[0]), signature.frontmatter_digest, `${file}: frontmatter changed`);
    for (const field of signature.fields ?? []) assert.ok(text.includes(field), `${file}: field changed: ${field}`);
  }
});

test('legacy manifest and issue pointers remain readable with additive reviewer views', () => {
  const old = '# 8. Screen & Interaction Contract\n\n```yaml\nui_api_contract:\n  topology: LOCAL_ONLY\n  network_actions: []\n  ui_delivery_profile: STANDARD\n```\n';
  const summary = '# FSD\n\n## Summary\n\nPreserve local behavior.\n\n```mermaid\nflowchart LR\n User --> List\n```\n\n';
  assert.deepEqual(readManifest(summary + old), readManifest(old));
  assert.equal(readManifest(old).topology[0], 'LOCAL_ONLY');
  assert.equal(readManifest(old.replace('ui_api_contract:', 'missing_contract:')), null);
  const issue = 'Status: ready-for-agent\nBlocked by: None\nUI delivery role: NOT_APPLICABLE\nContract refs: FSD-TASK#GOAL-001\nContract gate: NOT_APPLICABLE\n';
  assert.deepEqual(parseIssuePointer(summary + issue), parseIssuePointer(issue));
});
