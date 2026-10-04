import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {lintDoc} from './doc-lint.mjs';
function fixture(t, text) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-quality-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const docPath = path.join(root, 'report.md');
  fs.writeFileSync(docPath, text);
  return {root, docPath};
}
test('long docs, summary repetition and evidence tables are retained', t => {
  const summary = 'This report records verification scope, results, and the next actions for the installation engine.';
  const f = fixture(t, `# Report\n\n## Summary\n\n${summary}\n\n## Evidence\n\n${summary}\n\n| Case | Status |\n| --- | --- |\n| Windows | PASS |\n| Linux | PASS |\n\n${'Detailed evidence. '.repeat(6000)}`);
  assert.deepEqual(lintDoc(f), []);
});
test('status pointer needs summary but no decorative HLD', t => {
  const f = fixture(t, '# Goal\n\n## Summary\n\nTrack verification of GOAL-001.\n\nStatus: pending\n');
  assert.deepEqual(lintDoc(f), []);
  fs.writeFileSync(f.docPath, '# Goal\n\nStatus: pending\n');
  assert.ok(lintDoc(f).some(f => f.kind === 'missing-summary'));
});
test('explicit HLD requirement checks diagram presence, content needs review', t => {
  const f = fixture(t, '# System\n\n## Summary\n\nExplains setup and recovery.\n');
  assert.ok(lintDoc({...f, requiresHld:true}).some(f => f.kind === 'missing-hld'));
  fs.appendFileSync(f.docPath, '\n## High-Level Design\n\n```mermaid\nflowchart LR\n A --> B\n```\n');
  assert.deepEqual(lintDoc({...f, requiresHld:true}), []);
});
test('advisory tolerates editorial findings but input errors remain nonzero', t => {
  const f = fixture(t, '# Incomplete\n');
  const cli = path.resolve('.agent/tools/doc-lint.mjs');
  assert.equal(spawnSync(process.execPath, [cli, f.docPath, '--advisory']).status, 0);
  assert.equal(spawnSync(process.execPath, [cli, f.docPath]).status, 1);
  assert.notEqual(spawnSync(process.execPath, [cli, path.join(f.root, 'missing'), '--advisory']).status, 0);
});
test('generated memory and handoff documents include summaries without breaking checkpoint replay',async t=>{
  const {captureMemory,persistCheckpoint,restoreCheckpoint}=await import('./memory-maintenance.mjs');
  const f=fixture(t,'evidence');
  await captureMemory({root:f.root,input:{kind:'LRN',origin:'summary-test',revision:'1',topic:'Preserve evidence',confidence:'observed',evidence:['report.md'],outcome:'verified',fields:{Learning:'Retain diagnostic evidence.','Applies to':'project'}}});
  const memory=path.join(f.root,'docs/LEARNED_KNOWLEDGE.md');
  assert.ok(!lintDoc({root:f.root,docPath:memory}).some(f=>f.kind==='missing-summary'));
  await persistCheckpoint({root:f.root,input:{nextAction:'Verify setup',verifiedOutcomes:[],blockers:[],artifactRefs:[],contractRefs:[],ledgerRefs:[]}});
  assert.match(fs.readFileSync(path.join(f.root,'.continue-here.md'),'utf8'),/## Summary/);
  assert.equal((await restoreCheckpoint({root:f.root})).checkpoint.nextAction,'Verify setup');
});
