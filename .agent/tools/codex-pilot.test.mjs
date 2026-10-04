import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCodexJsonl} from './codex-pilot.mjs';

test('Codex usage includes cached input once and counts observed commands and errors',()=>{
 const events=[{type:'item.completed',item:{type:'command_execution',command:'npm test',exit_code:0}},{type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:80,output_tokens:20}}];
 const result=analyzeCodexJsonl(events.map(e=>JSON.stringify(e)).join('\n'));
 assert.equal(result.totalTokens,120);
 assert.equal(result.uncachedInputTokens,20);
 assert.equal(result.commandCount,1);
 assert.equal(result.errorCount,0);
});

test('missing or malformed Codex usage remains unknown and incomplete',()=>{
 assert.equal(analyzeCodexJsonl('').totalTokens,'unknown');
 const failed=analyzeCodexJsonl('{"type":"turn.failed"}\ninvalid');
 assert.equal(failed.complete,false);assert.equal(failed.errorCount,2);
 const partial=analyzeCodexJsonl('{"type":"turn.completed","usage":{"input_tokens":100}}');
 assert.equal(partial.outputTokens,'unknown');assert.equal(partial.cachedInputTokens,'unknown');assert.equal(partial.totalTokens,'unknown');
});
