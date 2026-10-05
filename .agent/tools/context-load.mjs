#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolveRepositoryPath} from './file-state.mjs';
import {estimateTokens, METRIC} from './token-benchmark.mjs';

export const PHASES = ['cold-entry','warm-reuse','execution','checkpoint','resume'];
export const FIXTURES = ['consultation','light-edit','fsd-execution','debugging','review','multi-goal-resume'];
const hash = value => createHash('sha256').update(value).digest('hex');
const bucket = () => ({reads:0, bytes:0, tokens:0, repeatedTokens:0});

// Explicit payload manifest, never infer delivered context from a shell command.
// Source files/ranges are replayed byte-for-byte; wrappers belong in payloadPath.
export async function measureLoads(root, events) {
  if (!Array.isArray(events)) throw new Error('Loads must be an array');
  const result = {schema:'context_load_v1', metric:METRIC, framework:bucket(),
    host:bucket(), toolSchema:bucket(), phases:Object.fromEntries(PHASES.map(p=>[p,bucket()])), loads:[]};
  const seen = new Set();
  for (const event of events) {
    if (!PHASES.includes(event.phase) || !['framework','host','toolSchema'].includes(event.source) ||
        typeof event.reason !== 'string' || !event.reason.trim()) throw new Error('Phase, source and read reason required');
    const filename = await resolveRepositoryPath(root, event.path);
    const file = await readFile(filename);
    const digest = hash(file);
    if (event.digest && event.digest !== digest) throw new Error('Source digest changed');
    const lines = file.toString('utf8').match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const start = event.start ?? 1, end = event.end ?? lines.length;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > lines.length) throw new Error('Invalid source range');
    const payload = event.payloadPath
      ? await readFile(await resolveRepositoryPath(root, event.payloadPath))
      : Buffer.from(lines.slice(start-1,end).join(''));
    const payloadDigest = hash(payload);
    if (event.payloadDigest && event.payloadDigest !== payloadDigest) throw new Error('Payload digest changed');
    const key = `${event.source}:${event.path}:${start}:${end}:${digest}:${payloadDigest}`;
    if (event.reused && !seen.has(key) && !event.residentDigest) throw new Error('Reuse requires prior load or resident digest');
    if (event.residentDigest && event.residentDigest !== payloadDigest) throw new Error('Resident digest changed');
    const repeated = seen.has(key), tokens = event.reused ? 0 : estimateTokens(payload.toString('utf8'));
    const load = {...event, start, end, digest, payloadDigest, bytes:event.reused ? 0 : payload.length, tokens, repeated};
    result.loads.push(load);
    for (const target of [result[event.source], result.phases[event.phase]]) {
      target.reads += event.reused ? 0 : 1; target.bytes += load.bytes; target.tokens += tokens;
      if (repeated) target.repeatedTokens += tokens;
    }
    seen.add(key);
  }
  result.replayDigest = hash(JSON.stringify(result.loads));
  return result;
}

const median = xs => { const a=[...xs].sort((x,y)=>x-y), n=a.length; return n ? (a[Math.floor(n/2)]+a[Math.ceil(n/2)-1])/2 : null; };
export function evaluatePairs(pairs, models = [...new Set(pairs.map(p=>p.model))]) {
  if (!Array.isArray(pairs)) throw new Error('Pairs must be an array');
  const groups = [], ids = new Set();
  for (const pair of pairs) {
    if (!pair.pairId || ids.has(pair.pairId) || !FIXTURES.includes(pair.fixture) || !pair.model || !['AB','BA'].includes(pair.order)) throw new Error('Invalid or duplicate pair');
    ids.add(pair.pairId);
  }
  for (const model of models) for (const fixture of FIXTURES) {
    const selected = pairs.filter(p=>p.model===model && p.fixture===fixture);
    const valid = selected.filter(p=>[p.before,p.after].every(r=>r && r.evidenceClass==='observed-framework-payload' && Number.isFinite(r.overhead) && r.overhead>=0 && r.complete===true &&
      typeof r.workEvidence==='string' && r.workEvidence && r.snapshot && r.replay && r.environment) && p.before.overhead>0 &&
      p.before.snapshot!==p.after.snapshot && p.before.replay===p.after.replay && p.before.environment===p.after.environment);
    const reductions = valid.map(p=>1-p.after.overhead/p.before.overhead);
    const center = median(reductions), mad = center===null ? null : median(reductions.map(x=>Math.abs(x-center)));
    const regression = selected.some(p=>[p.before,p.after].some(r=>r?.correct===false || r?.mandatoryChecks===false));
    const sufficient = valid.length>=5 && valid.every(p=>[p.before,p.after].every(r=>r.correct===true && r.mandatoryChecks===true)) &&
      ['AB','BA'].every(order=>valid.filter(p=>p.order===order).length>=2) &&
      Math.abs(valid.filter(p=>p.order==='AB').length-valid.filter(p=>p.order==='BA').length)<=1;
    groups.push({model,fixture,pairs:valid.length,medianReduction:center,mad,
      status:regression ? 'FAIL' : !sufficient ? 'UNPROVEN' : center>=0.5 && center>2*mad ? 'PASS':'FAIL'});
  }
  return {schema:'context_pairs_v1', groups, status:groups.some(g=>g.status==='FAIL') ? 'FAIL' :
    groups.length && groups.every(g=>g.status==='PASS') ? 'PASS':'UNPROVEN'};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [mode, file, root='.'] = process.argv.slice(2);
    if (!['loads','pairs'].includes(mode) || !file) throw new Error('Usage: context-load.mjs loads <manifest.json> [root] | pairs <pairs.json>');
    const input = JSON.parse(await readFile(file,'utf8'));
    const loadScenario = async scenario => {
      if (!/^sc-[a-z]+$/.test(scenario.route) || !['light','full'].includes(scenario.tier)) throw new Error('Route and tier required');
      return {...await measureLoads(root,scenario.loads), route:scenario.route, tier:scenario.tier, name:scenario.name};
    };
    const report = mode==='loads' ? input.scenarios
      ? {schema:'context_load_suite_v1', evidenceClass:input.evidenceClass ?? 'unclassified', scenarios:await Promise.all(input.scenarios.map(loadScenario))}
      : await loadScenario(input) : evaluatePairs(input.pairs,input.models);
    console.log(JSON.stringify(report,null,2));
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
