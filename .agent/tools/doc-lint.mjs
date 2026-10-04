#!/usr/bin/env node
// Structural checks only. Agents assess clarity, completeness and HLD relevance.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function lintDoc({docPath, root = process.cwd(), requiresHld = false}) {
  const raw = fs.readFileSync(docPath, 'utf8').replace(/^\uFEFF/, '');
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\s*\n/, '').replace(/<!--[\s\S]*?-->/g, '');
  const prose = body.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '');
  const findings = [];
  const summary = prose.match(/^#{1,3}\s+(?:\d+[.)]?\s+)?(?:Summary|Executive Summary|Ringkasan)\s*\r?\n([^]*?)(?=^#{1,3}\s|$(?![\s\S]))/im);
  if (!summary || !summary[1].trim()) findings.push({kind:'missing-summary', value:'Begin with a summary of purpose, scope and key outcome.'});
  else if (/^#{2,6}\s/m.test(prose.slice(0, summary.index))) findings.push({kind:'summary-order', value:'Place the summary before detail sections; preserve required metadata.'});
  if (requiresHld && !/^```mermaid\s*\r?\n[\s\S]+?^```/m.test(body) && !/!\[[^\]]+\]\([^)]+\)/.test(body) && !/^```(?:text)?\s*\r?\n[\s\S]+?(?:-->|->|→)[\s\S]*?^```/m.test(body)) {
    findings.push({kind:'missing-hld', value:'Add an appropriate high-level diagram of components, relationships and flow.'});
  }
  const fences = body.match(/^\s*(?:```|~~~)/gm) ?? [];
  if (fences.length % 2) findings.push({kind:'unclosed-fence', value:'Close the code or diagram fence.'});
  for (const m of prose.matchAll(/(?<!!)\[[^\]]+\]\(([^\s)]+)\)/g)) {
    const ref = m[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(ref) || /[<>*{}]/.test(ref)) continue;
    const target = decodeURIComponent(ref.split('#')[0]);
    if (target && !fs.existsSync(path.resolve(path.dirname(docPath), target))) findings.push({kind:'broken-reference', value:`Reference does not exist: ${ref}`});
  }
  return findings;
}

function main(args) {
  let advisory = false, json = false, requiresHld = false, root = process.cwd();
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--advisory') advisory = true;
    else if (args[i] === '--json') json = true;
    else if (args[i] === '--requires-hld') requiresHld = true;
    else if (args[i] === '--root' && args[i+1]) root = args[++i];
    else if (args[i].startsWith('--')) throw new Error(`Unknown or incomplete option: ${args[i]}`);
    else files.push(args[i]);
  }
  if (!files.length) throw new Error('usage: doc-lint.mjs <files> [--advisory] [--requires-hld] [--json] [--root <path>]');
  const results = files.map(doc => ({doc, findings:lintDoc({docPath:doc, root, requiresHld}), words:fs.readFileSync(doc,'utf8').trim().split(/\s+/).length}));
  const total = results.reduce((n, f) => n + f.findings.length, 0);
  console.log(json ? JSON.stringify({files:results, total}, null, 2) : results.flatMap(r => r.findings.map(f => `${r.doc}: ${f.kind}: ${f.value}`)).join('\n') || 'No structural findings; content review still required.');
  return advisory || total === 0 ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
