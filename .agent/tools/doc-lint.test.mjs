import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {lintDoc} from './doc-lint.mjs';
test('doc quality reports broken references and unclosed fences without changing source', t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-doc-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const docPath=path.join(root,'note.md');
  const source='---\nid: GOAL-001\n---\n# Note\n\n## Summary\n\nTracks verification.\n\n[Evidence](missing.md)\n\n```text\nunclosed\n';
  fs.writeFileSync(docPath,source);
  const kinds=lintDoc({root,docPath}).map(f=>f.kind);
  assert.ok(kinds.includes('broken-reference'));
  assert.ok(kinds.includes('unclosed-fence'));
  assert.equal(fs.readFileSync(docPath,'utf8'),source);
});
