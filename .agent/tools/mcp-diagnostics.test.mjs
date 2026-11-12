import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const GUIDE = '.agent/skills/integration-checking/references/mcp-diagnostics.md';
const read = relative => readFile(path.join(ROOT, relative), 'utf8');

async function assertGuideRoute(source) {
  const content = await read(source);
  const links = [...content.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)/g)];
  assert.ok(links.some(([, target]) => path.resolve(ROOT, path.dirname(source), target) === path.resolve(ROOT, GUIDE)), `${source} must resolve a Markdown link to the canonical MCP guide`);
  assert.match(content, /(?:only|optional|when|if|for a requested)[^\n.]*MCP|MCP[^\n.]*(?:only|optional|when|if|in scope)/i, `${source} must load diagnostics conditionally`);
}

test('MCP diagnostics are optional and reachable from integration, live evidence and the compact group', async () => {
  for (const source of ['.agent/skills/integration-checking/SKILL.md', '.agent/skills/verification-before-completion/references/live-verification.md']) await assertGuideRoute(source);
  const compact = await read('.agent/context/skills/execution-verification.contract.md');
  assert.ok(compact.includes('integration-checking/references/mcp-diagnostics.md'), 'compact verification must name the canonical guide');
  await read(GUIDE);
});

test('MCP diagnosis selects the configured protocol profile rather than applying legacy initialization universally', async () => {
  const guide = await read(GUIDE);
  assert.match(guide, /(?:configured|documented|maintained)[\s\S]{0,150}(?:client|harness|profile)/i, 'reuse a maintained configured client/profile');
  assert.match(guide, /2026-07-28[\s\S]{0,600}server\/discover/i, 'the modern profile discovers the server');
  assert.match(guide, /2026-07-28[\s\S]{0,800}(?:no|without|never|do not)[^.\n]*(?:initialize|initialization)/i, 'modern discovery must not require legacy initialization');
  assert.match(guide, /2026-07-28[\s\S]{0,800}(?:no|without|never|do not)[^.\n]*session/i, 'modern requests must not require legacy sessions');
  assert.match(guide, /2025-\d{2}-\d{2}[\s\S]{0,600}\binitialize\b[\s\S]{0,250}(?:notifications\/initialized|initialized notification)/i, 'the legacy profile keeps its initialization handshake');
  assert.match(guide, /(?:unsupported|unknown|mismatch)[^\n.]*(?:profile|version)|(?:profile|version)[^\n.]*(?:unsupported|unknown|mismatch)/i, 'an unknown profile stays explicit rather than being guessed');
});

test('MCP transport guidance distinguishes stdio, Streamable HTTP and legacy SSE', async () => {
  const guide = await read(GUIDE);
  for (const transport of [/\bstdio\b/i, /Streamable HTTP/i, /legacy[^\n.]*SSE|SSE[^\n.]*legacy/i]) assert.match(guide, transport);
  assert.match(guide, /stdout[^\n.]*(?:protocol|JSON)|(?:protocol|JSON)[^\n.]*stdout/i, 'stdio protocol output must remain separate from logging');
  assert.match(guide, /stderr[^\n.]*log|log[^\n.]*stderr/i, 'stdio diagnostics belong on stderr');
  assert.match(guide, /(?:POST|endpoint)[\s\S]{0,250}(?:Streamable|SSE)|(?:Streamable|SSE)[\s\S]{0,250}(?:POST|endpoint)/i, 'HTTP guidance must describe an actual request/endpoint distinction');
  assert.match(guide, /(?:not|never|do not)[^.\n]*(?:interchange|substitut|fallback|equivalent)|(?:legacy[^\n.]*SSE|SSE[^\n.]*legacy)[\s\S]{0,160}(?:only|explicit|configured)/i, 'legacy SSE cannot silently replace the selected HTTP transport');
});

test('MCP evidence records each layer independently and does not equate discovery with an invocation', async () => {
  const guide = await read(GUIDE);
  for (const layer of ['transport', 'protocol', 'authentication', 'authorization', 'discovery', 'invocation']) assert.match(guide, new RegExp(`\\b${layer}\\b`, 'i'), `missing evidence layer: ${layer}`);
  assert.match(guide, /independent|per.layer|separate[^.\n]*(?:outcome|result|status)/i, 'layers need separate outcomes');
  assert.match(guide, /not.run|unverified|unavailable/i, 'unexecuted layers cannot inherit a pass');
  assert.match(guide, /discover(?:y|ed)?[^.\n]*(?:does not|cannot|never|not)[^.\n]*(?:invocation|operation|call|permission)|(?:invocation|operation)[^.\n]*(?:not|never)[^.\n]*discover/i, 'discovery is not operation proof');
  for (const field of [/revision|digest/i, /environment/i, /timestamp|time/i, /evidence|locator/i]) assert.match(guide, field, 'retain bounded reproducible evidence identity');
});

test('MCP authorization diagnosis preserves ambiguous 401 and 403 observations', async () => {
  const guide = await read(GUIDE);
  assert.match(guide, /\b401\b/);
  assert.match(guide, /\b403\b/);
  assert.match(guide, /(?:401|403)[\s\S]{0,450}(?:ambiguous|alone|not definitive|does not prove|cannot infer)|(?:ambiguous|not definitive|cannot infer)[\s\S]{0,300}(?:401|403)/i, 'status alone must not establish a root cause');
  assert.match(guide, /(?:challenge|scope|audience|resource|provider)/i, 'inspect contextual auth evidence before diagnosing');
  assert.match(guide, /(?:existing|authorized)[^.\n]*(?:session|credential)|(?:session|credential)[^.\n]*(?:existing|authorized)/i, 'reuse authorized authentication without requesting secret values');
});

test('MCP probes and evidence are scoped before execution, display or persistence', async () => {
  const guide = await read(GUIDE);
  assert.match(guide, /(?:harmless|read.only|non.mutating)[\s\S]{0,180}(?:operation|tool|probe|call)|(?:operation|tool|probe|call)[\s\S]{0,180}(?:harmless|read.only|non.mutating)/i, 'use a harmless task-relevant operation');
  assert.match(guide, /(?:task|scope|approved|authorized)[^.\n]*(?:operation|tool|probe)|(?:operation|tool|probe)[^.\n]*(?:task|scope|approved|authorized)/i, 'a discovered tool is not blanket execution authority');
  assert.match(guide, /allowlist[\s\S]{0,250}before[\s\S]{0,150}(?:persist|display|print|writ|save)/i, 'allowlist safe evidence before it reaches an output or file');
  for (const secret of [/tokens?/i, /cookies?/i, /headers?/i, /(?:arguments?|payloads?|bodies)/i]) assert.match(guide, secret, 'exclude secret-bearing raw diagnostic content');
  assert.match(guide, /(?:only|own)[^.\n]*(?:started|created|owned)|(?:started|created|owned)[^.\n]*(?:only|own)/i, 'cleanup must affect only resources this check owns');
  assert.match(guide, /(?:static|selector)[\s\S]{0,300}(?:never|do not|no)[^.\n]*(?:launch|execut|start|install)/i, 'static config inspection must not execute discovered commands');
  assert.match(guide, /(?:MOCK|fixture|controlled)[\s\S]{0,250}(?:not|never|cannot)[^.\n]*(?:REAL|production|live|host)/i, 'controlled evidence must not be promoted to real-server qualification');
});
