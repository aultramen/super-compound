#!/usr/bin/env node
/**
 * D09 host orchestrator (Node >= 22 core modules only, plus writeFileAtomic from the existing runner).
 * argv-only spawnSync, never a shell string. Every pinned input is downloaded inside a container; the only host-side
 * network use is `docker pull`, host DNS lookups that pin allowlisted names for --add-host, and read-only `gh api`
 * GETs in reconcile. Paths resolve from the repository root at runtime, so the local and CI recipes carry identical
 * argv. Policy STOPs print exactly `D09-STOP S<n>: <reason>` (D09-VERIFIER-ADMISSION/1.0.0 numbering).
 *
 * Usage: node .github/qualification/d09/d09.mjs <subcommand> [...]   (see README.md#how-to-run)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns';
import zlib from 'node:zlib';
import {createHash, randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileAtomic} from '../../../.agent/tools/file-state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const Q = '.github/qualification/d09', S = '.scratch/d09', EV = `${S}/evidence`;
const MAX = 4 * 1024 * 1024, BUDGET_MS = 55000, MAX_AGE_HOURS = 168, FRESH_MS = 72 * 3600e3;
const PY = ['/usr/local/bin/python3.12', '-I', '-B', '/q/d09.py'];
const CI_ENV = ['GITHUB_REPOSITORY', 'GITHUB_EVENT_NAME', 'GITHUB_WORKFLOW_REF', 'GITHUB_SHA', 'GITHUB_HEAD_REF', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_JOB', 'RUNNER_OS', 'ImageOS', 'ImageVersion'];
const VOLUMES = ['capsule-a', 'capsule-b', 'tools', 'tuf-a', 'tuf-b'];
const JOB = 'd09-source-verification', DISPOSITIONS = `${Q}/security-dispositions.json`;
const SHA40 = /^[0-9a-f]{40}$/, SHA64 = /^[0-9a-f]{64}$/, ISO_Z = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
// Every file whose bytes can change a D09 verdict: the gate's local import closure (selftest re-derives it), the
// harness, its pins, the security dispositions and both locks. Both contracts and all four recipes bind this list.
export const SOURCE_REFS = [`${Q}/d09.mjs`, `${Q}/d09.py`, `${Q}/inputs.json`, `${Q}/cases.json`, DISPOSITIONS, `${Q}/requirements-linux-cp312.txt`,
  `${Q}/requirements-tools.txt`, '.agent/tools/file-state.mjs', '.agent/tools/instruction-context.mjs', '.agent/tools/standards-checks.mjs',
  '.agent/tools/standards.mjs', '.agent/tools/verification-recipe.mjs', '.agent/tools/verified-promise.mjs', '.agent/tools/work-package.mjs',
  '.agent/rules/project-config.md', '.github/workflows/ci.yml'];
const abs = (...p) => path.join(ROOT, ...p);
const sha = data => createHash('sha256').update(data).digest('hex');
const readJson = rel => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const chk = (name, ok, observed = '', group, stop) => ({name, ok: Boolean(ok), observed: String(observed).slice(0, 2000), ...(group ? {group} : {}), ...(stop ? {stop} : {})});
const clip = (s, n = 65536) => (s.length <= n ? s : `${s.slice(0, n)}\n[clipped ${s.length - n} chars]`);
const SANDBOX = fs.existsSync(abs('.d09-sandbox.json'));
const MODE = process.env.GITHUB_ACTIONS === 'true' ? 'ci' : 'local';

export function shaFile(file) {
  const h = createHash('sha256'), fd = fs.openSync(file, 'r'), buf = Buffer.allocUnsafe(1 << 20);
  try { for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0;) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
async function writeJson(rel, obj) { await writeFileAtomic(ROOT, rel, `${JSON.stringify(obj, null, 1)}\n`, {maxBytes: MAX, mode: 0o644}); }
async function writeText(rel, text) { await writeFileAtomic(ROOT, rel, text, {maxBytes: MAX, mode: 0o644}); }
function mkdir777(rel) { fs.mkdirSync(abs(rel), {recursive: true}); if (process.platform !== 'win32') fs.chmodSync(abs(rel), 0o777); }
function run(cmd, args, {timeout = 30000, input, cwd = ROOT, env} = {}) {
  const r = spawnSync(cmd, args, {cwd, input, env, encoding: 'utf8', timeout, maxBuffer: MAX, windowsHide: true});
  return {argv: [cmd, ...args], exit: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout ?? '', stderr: r.stderr ?? ''};
}

// ---------------------------------------------------------------- pure helpers (selftested)

export function parseLock(text) {
  const pins = new Map(); let cur = null;
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[([^\]]*)\])?==([^\s;\\]+)/.exec(line);
    if (m) {
      const name = m[1].replace(/[-_.]+/g, '-').toLowerCase();
      if (pins.has(name)) throw new Error(`duplicate pin ${name}`);
      cur = {name, version: m[3], extras: (m[2] ?? '').split(',').filter(Boolean), hashes: []};
      pins.set(name, cur); line = line.slice(m[0].length);
    }
    if (!cur) throw new Error(`hash before pin: ${raw}`);
    for (const tok of line.split(/\s+/).filter(t => t && t !== '\\')) {
      const h = /^--hash=sha256:([0-9a-f]{64}|PENDING_W)$/.exec(tok);
      if (!h) throw new Error(`unexpected lock token ${tok}`);
      cur.hashes.push(h[1]);
    }
  }
  for (const p of pins.values()) if (!p.hashes.length) throw new Error(`pin without hash ${p.name}`);
  return pins;
}

export function mountSpec({type = 'bind', source, target, readonly = false}) {
  if (/[,=\n]/.test(source) || /[,=\n]/.test(target)) throw new Error(`mount path must not contain ',', '=' or newline: ${source}`);
  return `type=${type},source=${source},target=${target}${readonly ? ',readonly' : ''}`;
}

export function dockerArgs({image, nonce, user = '10001:10001', network = 'none', hosts = [], mounts = [], tmpfs = [], env = {}, readOnly = true, caps = [], workdir = '/tmp', argv}) {
  if (!/^[A-Za-z0-9.-]+$/.test(nonce)) throw new Error('nonce required');
  if (!['none', 'bridge'].includes(network)) throw new Error(`network must be none or bridge: ${network}`);
  if (!Array.isArray(argv) || !argv.length || argv.some(a => typeof a !== 'string' || a.includes('\0'))) throw new Error('container argv required');
  const a = ['run', '--rm', '--pull', 'never', '--platform', 'linux/amd64', '--label', 'd09=1', '--label', `d09.run=${nonce}`];
  if (readOnly) a.push('--read-only');
  a.push('--tmpfs', '/tmp:rw,nosuid,nodev,size=512m,mode=1777');
  for (const t of tmpfs) a.push('--tmpfs', t);
  a.push('--cap-drop', 'ALL');
  for (const c of caps) a.push('--cap-add', c);
  a.push('--security-opt', 'no-new-privileges', '--pids-limit', '512', '--user', user);
  // S7: a dead resolver in every container: loopback nameserver only, no search domain (glibc CVE-2026-8674 guard).
  a.push('--dns', '127.0.0.1', '--dns-search', '.');
  if (network === 'none') a.push('--network', 'none');
  else for (const h of hosts) a.push('--add-host', `${h.host}:${h.ip}`);
  for (const m of mounts) a.push('--mount', mountSpec(m));
  for (const [k, v] of Object.entries(env)) a.push('-e', `${k}=${v}`);
  a.push('--workdir', workdir, image, ...argv);
  return a;
}

export function envFingerprintInputs(names, env = process.env) {
  return names.map(name => ({name, digest: sha(JSON.stringify({present: env[name] !== undefined, value: env[name] ?? null}))}));
}

export function stopLines(step, checks) {
  return checks.filter(c => !c.ok).slice(0, 20).map(c => `D09-STOP ${c.stop ?? step}: ${c.name}${c.observed ? ` (${c.observed})` : ''}`.replace(/[\r\n]+/g, ' '));
}
// A pre-publication observation completes (exit 0) so its failing PREPUBLICATION check reaches the outcomes.
export function stepExit(rec) {
  if (rec.ok) return 0;
  return rec.observeOnly === true && rec.checks.length > 0 && rec.checks.every(c => c.ok || c.name.startsWith('PREPUBLICATION: ')) ? 0 : 1;
}

export function nodeCheck(pinned, actual = process.version) {
  return chk('node version equals inputs.host.nodeVersion', /^v\d+\.\d+\.\d+$/.test(pinned ?? '') && actual === pinned, `process.version=${actual} pinned=${pinned}`, undefined, 'S5');
}

const DECISIONS = ['APPROVE D14', 'APPROVE ALL'];
const OA_KEYS = ['answerVerbatim', 'decision', 'dispositionsSha256', 'label', 'packetSha256', 'recordedAt', 'residuals', 'schema'];
// Structure and binding only: a machine check cannot prove that a human gave the answer.
export function ownerAcceptanceIssues(oa, se, now = Date.now()) {
  if (!oa || typeof oa !== 'object' || Array.isArray(oa)) return ['not a genuine_user_decision/1 record'];
  const t = Date.parse(oa.recordedAt);
  return [[same(Object.keys(oa).sort(), OA_KEYS), `fields ${Object.keys(oa).sort().join(',')}`], [oa.schema === 'genuine_user_decision/1', 'schema'],
    [DECISIONS.includes(oa.decision), 'decision'], [typeof oa.answerVerbatim === 'string' && oa.answerVerbatim.trim() !== '', 'answerVerbatim'],
    [SHA64.test(oa.packetSha256 ?? ''), 'packetSha256'], [SHA64.test(oa.dispositionsSha256 ?? '') && oa.dispositionsSha256 === se?.dispositionsSha256, 'dispositionsSha256'],
    [Array.isArray(oa.residuals) && same(oa.residuals, se?.residuals), 'residuals'], [oa.label === 'owner self-review', 'label'],
    [typeof oa.recordedAt === 'string' && ISO_Z.test(oa.recordedAt) && Number.isFinite(t) && t <= now, 'recordedAt']].filter(([ok]) => !ok).map(([, what]) => what);
}

// I4: policy S6 (and any declared item STOP). Returns [{code, name, observed}]; empty means admitted.
export function admissionIssues(se, disp, {dispositionsSha256 = null, now = Date.now()} = {}) {
  const issues = [], s6 = (name, observed) => issues.push({code: 'S6', name, observed: String(observed ?? '')});
  const t = Date.parse(se?.capturedAt), items = Array.isArray(disp?.items) ? disp.items : [];
  if (se?.dispositionsRef !== DISPOSITIONS) s6('securityEvidence dispositionsRef is not the bound dispositions file', se?.dispositionsRef);
  if (!dispositionsSha256 || !SHA64.test(se?.dispositionsSha256 ?? '') || se.dispositionsSha256 !== dispositionsSha256) s6('securityEvidence dispositionsSha256 does not match the dispositions file', `file=${dispositionsSha256} pinned=${se?.dispositionsSha256}`);
  if (disp?.schema !== 'd09_security_dispositions_v1' || !Array.isArray(disp?.items) || new Set(items.map(i => i?.id)).size !== items.length
    || items.some(i => typeof i?.id !== 'string' || !i.id || typeof i.residual !== 'boolean' || typeof i.stop !== 'boolean')) s6('securityEvidence dispositions malformed', disp?.schema);
  if (disp?.capturedAt !== se?.capturedAt) s6('securityEvidence capturedAt differs from the dispositions capturedAt', `${se?.capturedAt} vs ${disp?.capturedAt}`);
  if (se?.maxAgeHours !== MAX_AGE_HOURS) s6(`securityEvidence maxAgeHours is not ${MAX_AGE_HOURS}`, se?.maxAgeHours);
  if (typeof se?.capturedAt !== 'string' || !ISO_Z.test(se.capturedAt) || !Number.isFinite(t)) s6('securityEvidence capturedAt is not an ISO UTC timestamp', se?.capturedAt);
  else if (now - t > MAX_AGE_HOURS * 3600e3) s6('securityEvidence stale', `capturedAt ${se.capturedAt} is ${((now - t) / 3600e3).toFixed(1)} h old; maxAgeHours ${MAX_AGE_HOURS}`);
  else if (t > now + 60e3) s6('securityEvidence capturedAt is in the future', se.capturedAt);
  const residuals = items.filter(i => i?.residual === true).map(i => i.id);
  if (!Array.isArray(se?.residuals) || !se.residuals.length || !same(se.residuals, residuals)) s6('securityEvidence residuals differ from the dispositions residual items', `${JSON.stringify(se?.residuals)} vs ${JSON.stringify(residuals)}`);
  if (se?.ownerAcceptance === 'PENDING') s6('ownerAcceptance PENDING', 'no genuine owner decision recorded');
  else { const bad = ownerAcceptanceIssues(se?.ownerAcceptance, se, now); if (bad.length) s6('ownerAcceptance invalid', bad.join(', ')); }
  for (const i of items.filter(x => x?.stop === true)) {
    if (/^S[1-7]$/.test(i.stopIfMapped ?? '')) issues.push({code: i.stopIfMapped, name: `${i.id} declared stop`, observed: `${i.component ?? ''} ${i.version ?? ''}`.trim()});
    else s6(`${i.id} declared stop without a STOP code`, i.stopIfMapped);
  }
  return issues;
}
export const X4_STALE = 'D09-STOP S6: securityEvidence stale';
export const x4Pins = x4 => [...new Set([...[].concat(x4?.stderr ?? []).filter(p => typeof p === 'string' && p), X4_STALE])];

export function pendingSlots(value, at = '') {
  if (value === 'PENDING' || (typeof value === 'string' && value.startsWith('PENDING '))) return [at];
  if (Array.isArray(value)) return value.flatMap((v, i) => pendingSlots(v, `${at}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => pendingSlots(v, at ? `${at}.${k}` : k));
  return [];
}

export function inputFiles(inputs) {
  const list = [];
  for (const t of inputs.cpython) list.push({name: t.file, ...t}, {name: t.bundle.file, ...t.bundle});
  for (const w of inputs.wheels) list.push({name: w.file, ...w});
  list.push({name: inputs.rebuilt.file, ...inputs.rebuilt}, {name: inputs.installer.file, ...inputs.installer}, {name: inputs.sdist.file, ...inputs.sdist},
    {name: inputs.officialRfc3161Wheel.file, ...inputs.officialRfc3161Wheel});
  for (const w of inputs.toolWheels) list.push({name: w.file, ...w});
  if (Array.isArray(inputs.debs)) for (const d of inputs.debs) list.push({name: d.filename, path: `debs/${d.filename}`, url: d.uri, fallbackUrls: [d.snapshotUri].filter(Boolean), size: d.size, sha256: d.sha256});
  return list;
}

// I2: W is bound by host streaming hashes of the prepare outputs. The local D14 report is pinned by
// rebuilt.reportSha256; a CI report is produced fresh by `prepare --ci` in the same job, so it is recorded, not pinned.
export function rebuiltChecks(mode, rebuilt, {reportSha256, b1, b2, copy}) {
  const pin = (n, ok, o) => chk(n, ok, o, 'inputs', 'S5'), out = [];
  if (mode === 'local') out.push(pin('prepare report.json sha256 == rebuilt.reportSha256', SHA64.test(rebuilt.reportSha256 ?? '') && reportSha256 === rebuilt.reportSha256, `report=${reportSha256} pin=${rebuilt.reportSha256}`));
  for (const [label, list] of mode === 'local' ? [['b1', b1], ['b2', b2]] : [['b1', b1]]) {
    out.push(pin(`build/${label} holds exactly one wheel named ${rebuilt.file}`, list?.length === 1 && list[0].file === rebuilt.file, (list ?? []).map(w => w.file).join(',') || 'none'));
    out.push(pin(`build/${label} wheel sha256 and size == rebuilt pin == inputs copy`, list?.length === 1 && SHA64.test(rebuilt.sha256 ?? '') && list[0].sha256 === rebuilt.sha256
      && list[0].size === rebuilt.size && copy?.sha256 === rebuilt.sha256, `wheel=${list?.[0]?.sha256} pin=${rebuilt.sha256} copy=${copy?.sha256}`));
  }
  return out;
}
// Prepare-side facts gate the run only; no criterion takes its status from report.json (AC-04/AC-05 use wheel-audit).
export function prepareReportChecks(mode, report, inputs) {
  const w = inputs.rebuilt.sha256, wanted = mode === 'ci' ? 1 : 2, shas = (report?.builds ?? []).map(b => b.sha256), g = (n, ok, o) => chk(n, ok, o, 'prepare-report');
  return [g(`prepare report is a ${mode} report with ${wanted} build(s)`, report?.schema === 'd09_prepare_report_v1' && report.mode === mode && shas.length === wanted, `${report?.mode} ${shas.length}`),
    g('prepare builds are byte-identical and equal the pinned W', shas.length > 0 && shas.every(s => s === w) && report.W === w && report.equal === true, shas.join(',')),
    g('prepare ELF audit: W PASS, official FAIL, cryptography PASS', report?.elf?.W?.verdict === 'PASS' && report.elf.official?.verdict === 'FAIL' && report.elf.cryptography?.verdict === 'PASS',
      `${report?.elf?.W?.verdict}/${report?.elf?.official?.verdict}/${report?.elf?.cryptography?.verdict}`),
    g('prepare cargo fetch exact registry/git set', report?.cargoFetch?.ok === true, report?.cargoFetch?.ok),
    g('prepare build negatives rejected', report?.buildNegatives?.ok === true, report?.buildNegatives?.ok)];
}

export function keepOnWipe(rel) { return /^[^/]+-receipt\.json$/.test(rel); }

// B10: init deletes only resources whose nonce this checkout recorded in its own current*.json; every other d09=1
// resource (a concurrent prepare, another checkout, a missing label) fails init closed and is listed, never deleted.
export function planLeftovers(listed, own) {
  const remove = listed.filter(r => own.has(r.nonce)), foreign = listed.filter(r => !own.has(r.nonce));
  return {remove, foreign, check: chk('no foreign d09=1 resources (never deleted: remove them by hand or let their run finish)', !foreign.length,
    foreign.map(r => `${r.kind} ${r.id} nonce=${r.nonce || '?'}`).join(', ') || 'none')};
}
export function parseLabelled(kind, stdout) {
  return stdout.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [id, nonce = ''] = l.split(/\s+/); return {kind, id, nonce}; });
}
function ownNonces(dir = abs(S, 'run')) {
  const own = new Set();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/^current(-[a-z]+)?\.json$/.test(f)) continue;
    try { const n = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).nonce; if (/^[0-9a-f]{16}$/.test(n ?? '')) own.add(n); } catch { /* unreadable record: its resources stay foreign */ }
  }
  return own;
}

// I7: the classic store reports the config digest as Id, the containerd store the index digest; nothing else is accepted.
export function imageStore(info) {
  const status = new Map((Array.isArray(info?.DriverStatus) ? info.DriverStatus : []).filter(p => Array.isArray(p) && p.length === 2));
  if (status.get('driver-type') === 'io.containerd.snapshotter.v1') return 'containerd';
  return !status.has('driver-type') && /^(overlay2|fuse-overlayfs|btrfs|zfs|vfs)$/.test(info?.Driver ?? '') ? 'classic' : 'unknown';
}
export function imageChecks(inspect, inputs, store) {
  const img = inspect?.[0] ?? {}, s5 = (n, ok, o) => chk(n, ok, o, undefined, 'S5');
  const id = store === 'classic' ? inputs.image.config : store === 'containerd' ? inputs.image.index : null;
  return [s5('RepoDigests contains the pinned index digest', (img.RepoDigests ?? []).some(d => d.endsWith(`@${inputs.image.index}`) && /(^|\/)python@/.test(d)), (img.RepoDigests ?? []).join(' ')),
    s5(`Id == the pinned ${store === 'containerd' ? 'index' : 'config'} digest for the ${store} image store`, id !== null && img.Id === id, `store=${store} Id=${img.Id}`),
    s5('RootFS.Layers == pinned diffIds', same(img.RootFS?.Layers, inputs.image.diffIds), (img.RootFS?.Layers ?? []).length),
    s5('platform linux/amd64', img.Os === 'linux' && img.Architecture === 'amd64', `${img.Os}/${img.Architecture}`)];
}

// ---------------------------------------------------------------- docker plumbing

function image(inputs) { return `${inputs.image.ref}@${inputs.image.index}`; }
const bind = (source, target, readonly = true) => ({type: 'bind', source, target, readonly});
const vol = (nonce, name, target, readonly = false) => ({type: 'volume', source: `d09-${nonce}-${name}`, target, readonly});
function baseMounts(nonce) { return [bind(abs(Q), '/q'), bind(abs(S, 'inputs'), '/in'), bind(abs(EV), '/out', false), bind(abs(S, 'run', nonce), '/run', false)]; }
async function hostsFor(names) {
  const out = [];
  for (const host of names) out.push({host, ip: (await dns.promises.lookup(host, {family: 4})).address});
  return out;
}
async function docker(rec, label, spec, deadline, logDir = `${EV}/logs`) {
  const args = dockerArgs(spec), t0 = Date.now(), timeout = Math.max(1000, deadline - Date.now());
  const r = run('docker', args, {timeout});
  await writeText(`${logDir}/${label}.out.txt`, clip(r.stdout, 1 << 20));
  await writeText(`${logDir}/${label}.err.txt`, clip(r.stderr, 1 << 20));
  const entry = {label, argv: ['docker', ...args], exit: r.exit, signal: r.signal, error: r.error, durationMs: Date.now() - t0,
    stdoutSha256: sha(r.stdout), stderrSha256: sha(r.stderr), stdoutRef: `${logDir}/${label}.out.txt`, stderrRef: `${logDir}/${label}.err.txt`};
  rec.docker.push(entry);
  return {...entry, stdout: r.stdout, stderr: r.stderr};
}
function dockerList(args) {
  const r = run('docker', args);
  if (r.exit !== 0) throw new Error(`docker ${args.slice(0, 2).join(' ')} failed (exit ${r.exit}): ${(r.error ?? r.stderr).trim().slice(0, 300)}`);
  return r.stdout;
}
function current(file = 'current.json') {
  const c = readJson(`${S}/run/${file}`);
  if (!/^[0-9a-f]{16}$/.test(c.nonce)) throw new Error('invalid run nonce');
  return c;
}
async function step(name, fn, {dir = `${EV}/steps`, nonce} = {}) {
  const t0 = Date.now(), rec = {step: name, nonce: nonce ?? null, startedAt: new Date(t0).toISOString(), docker: [], checks: []};
  let code;
  try { code = await fn(rec, t0 + BUDGET_MS); } catch (error) { rec.checks.push(chk(`${name} error`, false, error.message)); code = 1; }
  rec.finishedAt = new Date().toISOString(); rec.durationMs = Date.now() - t0;
  rec.ok = !code && rec.checks.length > 0 && rec.checks.every(c => c.ok);
  await writeJson(`${dir}/${name}.json`, rec);
  const exit = stepExit(rec), bad = rec.checks.filter(c => !c.ok);
  process.stdout.write(`${JSON.stringify({step: name, ok: rec.ok, exit, checks: rec.checks.length, failed: bad.slice(0, 3).map(c => c.name), durationMs: rec.durationMs})}\n`);
  if (exit) process.stderr.write(`${(bad.length ? stopLines(name, bad) : [`D09-STOP ${name}: failed`]).join('\n')}\n`);
  else if (bad.length) process.stdout.write(`${bad.map(c => c.name).join('\n')}\n`);
  return exit;
}
async function containerStep(name, specFn) {
  const c = current(), inputs = readJson(`${Q}/inputs.json`);
  return step(name, async (rec, deadline) => {
    rec.nonce = c.nonce;
    for (const [label, specOrThunk] of await specFn(c.nonce, inputs, deadline)) {
      const spec = typeof specOrThunk === 'function' ? await specOrThunk() : specOrThunk;  // thunks size their budget just in time
      const r = await docker(rec, label, {image: image(inputs), nonce: c.nonce, ...spec}, deadline);
      const stops = r.stderr.split('\n').filter(l => l.startsWith('D09-STOP')).slice(0, 20);
      if (stops.length) process.stderr.write(`${stops.join('\n')}\n`);  // the container's own policy lines, verbatim
      rec.checks.push(chk(`${label} exit 0`, r.exit === 0, `exit=${r.exit} ${r.error ?? ''} ${stops.slice(0, 2).join(' | ')}`));
    }
  }, {nonce: c.nonce});
}

// ---------------------------------------------------------------- doctor phase

function wipeEvidence() {
  if (!fs.existsSync(abs(EV))) return;
  for (const entry of fs.readdirSync(abs(EV))) if (!keepOnWipe(entry)) fs.rmSync(abs(EV, entry), {recursive: true, force: true});
}
function dockerLabelled(kind) {
  const args = kind === 'container' ? ['ps', '-a', '--filter', 'label=d09=1', '--format', '{{.ID}} {{.Label "d09.run"}}'] : ['volume', 'ls', '--filter', 'label=d09=1', '--format', '{{.Name}} {{.Label "d09.run"}}'];
  return parseLabelled(kind, dockerList(args));
}

async function cmdInit() {
  const inputs = readJson(`${Q}/inputs.json`), nonce = randomBytes(8).toString('hex'), own = ownNonces();
  wipeEvidence();
  fs.rmSync(abs(S, 'run'), {recursive: true, force: true});
  mkdir777(EV); mkdir777(`${S}/run/${nonce}`); fs.mkdirSync(abs(S, 'inputs'), {recursive: true});
  return step('init', async (rec, deadline) => {
    rec.nonce = nonce;
    rec.checks.push(nodeCheck(inputs.host?.nodeVersion));
    if (!rec.checks[0].ok) return;
    let info = null, store = 'not queried in a challenge sandbox';
    if (!SANDBOX) {  // a challenge sandbox never touches Docker (X4 must stop at check-admission, not here)
      const plan = planLeftovers([...dockerLabelled('container'), ...dockerLabelled('volume')], own);
      for (const r of plan.remove) {
        const res = run('docker', r.kind === 'container' ? ['rm', '-f', r.id] : ['volume', 'rm', r.id]);
        rec.checks.push(chk(`own leftover ${r.kind} ${r.id} (nonce ${r.nonce}) removed`, res.exit === 0, res.stderr.trim()));
      }
      rec.leftovers = {ownNonces: [...own], removed: plan.remove, foreign: plan.foreign};
      rec.checks.push(plan.check);
      if (rec.checks.some(c => !c.ok)) return;
      const di = run('docker', ['info', '--format', '{{json .}}']);
      try { info = JSON.parse(di.stdout); } catch { info = null; }
      store = imageStore(info);
      rec.checks.push(chk('docker image store is classic or containerd', store !== 'unknown', `store=${store} Driver=${info?.Driver} DriverStatus=${JSON.stringify(info?.DriverStatus ?? null)} exit=${di.exit}`, undefined, 'S5'));
    }
    const dv = SANDBOX ? {exit: null, stdout: '', stderr: 'not queried in a challenge sandbox'} : run('docker', ['version', '--format', '{{json .}}']);
    await writeJson(`${EV}/host-identity.json`, {nonce, node: process.version, nodeExecPath: process.execPath, platform: process.platform, arch: process.arch, os: {type: os.type(), release: os.release()},
      docker: (() => { try { return JSON.parse(dv.stdout); } catch { return {error: dv.stderr.slice(0, 500)}; } })(),
      dockerInfo: info ? {Driver: info.Driver, DriverStatus: info.DriverStatus, ServerVersion: info.ServerVersion, OperatingSystem: info.OperatingSystem, Architecture: info.Architecture} : null,
      imageStore: store, mode: MODE, sandbox: SANDBOX, ci: Object.fromEntries(CI_ENV.map(k => [k, process.env[k] ?? null]))});
    rec.checks.push(chk(SANDBOX ? 'sandbox run: docker untouched' : 'docker version readable', SANDBOX || dv.exit === 0, dv.exit));
    if (!SANDBOX && rec.checks.every(c => c.ok)) {
      for (const v of VOLUMES) {
        const r = run('docker', ['volume', 'create', '--label', 'd09=1', '--label', `d09.run=${nonce}`, `d09-${nonce}-${v}`]);
        rec.checks.push(chk(`volume ${v} created`, r.exit === 0, r.stderr.trim()));
      }
      const r = await docker(rec, 'init-chown', {image: image(inputs), nonce, user: '0:0', caps: ['CHOWN'], mounts: VOLUMES.map(v => vol(nonce, v, `/v/${v}`)),
        argv: ['chown', '10001:10001', ...VOLUMES.map(v => `/v/${v}`)]}, deadline);
      rec.checks.push(chk('volume roots owned by 10001', r.exit === 0, r.stderr.slice(0, 300)));
    }
    await writeJson(`${S}/run/current.json`, {nonce, mode: MODE, sandbox: SANDBOX, imageStore: store, startedAt: rec.startedAt});
  }, {nonce});
}

async function cmdCheckAdmission() {
  const c = current(), se = readJson(`${Q}/inputs.json`).securityEvidence;
  return step('check-admission', async rec => {
    rec.nonce = c.nonce;
    let bytes = null, disp = null;
    try { bytes = fs.readFileSync(abs(DISPOSITIONS)); disp = JSON.parse(bytes.toString('utf8')); } catch { /* reported as S6 issues below */ }
    const issues = admissionIssues(se, disp, {dispositionsSha256: bytes ? sha(bytes) : null});
    for (const i of issues) rec.checks.push(chk(i.name, false, i.observed, 'admission', i.code));
    if (!issues.length) rec.checks.push(chk('securityEvidence fresh, bound to the dispositions file and owner-accepted', true, `capturedAt ${se.capturedAt}`, 'admission'));
    rec.securityEvidence = {capturedAt: se?.capturedAt ?? null, maxAgeHours: se?.maxAgeHours ?? null, dispositionsSha256: bytes ? sha(bytes) : null, residuals: se?.residuals ?? null};
  }, {nonce: c.nonce});
}

function wheelsIn(rel) {
  const dir = abs(rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(n => n.endsWith('.whl')).sort().map(n => {
    const p = path.join(dir, n), st = fs.lstatSync(p);
    return st.isFile() && !st.isSymbolicLink() ? {file: n, size: st.size, sha256: shaFile(p)} : {file: n, size: null, sha256: null};
  });
}

async function cmdCheckInputs() {
  const c = current(), inputs = readJson(`${Q}/inputs.json`);
  return step('check-inputs', async rec => {
    rec.nonce = c.nonce;
    const pin = (n, ok, o) => chk(n, ok, o, 'inputs', 'S5'), pending = pendingSlots(inputs);
    rec.checks.push(pin('no PENDING slot in inputs.json', !pending.length, pending.join(', ')));
    for (const f of inputFiles(inputs)) {
      if (f.sha256 === 'PENDING' || f.size === 'PENDING') { rec.checks.push(pin(`${f.name} pinned`, false, 'PENDING slot')); continue; }
      const p = abs(S, 'inputs', f.path);
      let ok = false, observed = 'missing';
      if (fs.existsSync(p)) {
        const st = fs.lstatSync(p);
        observed = st.isSymbolicLink() || !st.isFile() ? 'not a regular file' : `size=${st.size}`;
        if (!st.isSymbolicLink() && st.isFile() && st.size === f.size) { const h = shaFile(p); ok = h === f.sha256; observed += ` sha256=${h}`; }
      }
      rec.checks.push(pin(`${f.name} size+sha256`, ok, observed));
    }
    const lock = parseLock(fs.readFileSync(abs(Q, 'requirements-linux-cp312.txt'), 'utf8'));
    const names = new Set([...inputs.wheels.map(w => w.name), inputs.rebuilt.name]);
    rec.checks.push(pin('capsule lock pin set == inputs wheels + rebuilt (31)', lock.size === 31 && [...lock.keys()].every(k => names.has(k)) && names.size === 31, [...lock.keys()].length));
    for (const w of inputs.wheels) rec.checks.push(pin(`lock admits ${w.file}`, lock.get(w.name)?.version === w.version && lock.get(w.name)?.hashes.includes(w.sha256), lock.get(w.name)?.version));
    const rfc = lock.get('rfc3161-client');
    rec.checks.push(pin('rfc3161-client lock hash set == {W}', rfc?.hashes.length === 1 && rfc.hashes[0] === inputs.rebuilt.sha256, rfc?.hashes));
    const tools = parseLock(fs.readFileSync(abs(Q, 'requirements-tools.txt'), 'utf8'));
    rec.checks.push(pin('tools lock == inputs toolWheels (one hash each)', tools.size === inputs.toolWheels.length && inputs.toolWheels.every(t => tools.get(t.name)?.version === t.version && tools.get(t.name).hashes.length === 1 && tools.get(t.name).hashes[0] === t.sha256), tools.size));
    const reportRel = `${S}/build/report.json`, report = fs.existsSync(abs(reportRel)) ? fs.readFileSync(abs(reportRel)) : null, copy = abs(S, 'inputs', inputs.rebuilt.path);
    rec.checks.push(...rebuiltChecks(MODE, inputs.rebuilt, {reportSha256: report ? sha(report) : null, b1: wheelsIn(`${S}/build/b1`), b2: wheelsIn(`${S}/build/b2`),
      copy: fs.existsSync(copy) && fs.lstatSync(copy).isFile() ? {sha256: shaFile(copy)} : null}));
    rec.prepareReport = {path: reportRel, sha256: report ? sha(report) : null, pinned: MODE === 'local'};
    if (!report) { rec.checks.push(chk('prepare report present', false, reportRel, 'prepare-report')); return; }
    await writeText(`${EV}/prepare-report.json`, report.toString('utf8'));
    rec.checks.push(...prepareReportChecks(MODE, JSON.parse(report.toString('utf8')), inputs));
  }, {nonce: c.nonce});
}

async function cmdDoctorImage() {
  const c = current(), inputs = readJson(`${Q}/inputs.json`);
  return step('doctor-image', async rec => {
    rec.nonce = c.nonce;
    const r = run('docker', ['image', 'inspect', image(inputs)]);
    let inspect = null;
    try { inspect = JSON.parse(r.stdout); } catch { /* recorded as failed checks below */ }
    rec.checks.push(...imageChecks(inspect, inputs, c.imageStore));
    rec.observed = inspect?.[0] ? {imageStore: c.imageStore, Id: inspect[0].Id, RepoDigests: inspect[0].RepoDigests, Layers: inspect[0].RootFS?.Layers, Os: inspect[0].Os, Architecture: inspect[0].Architecture} : {error: r.stderr.slice(0, 500)};
  }, {nonce: c.nonce});
}

// I3: W (build/b1, and build/b2 locally) and the official wheel are re-audited from their bytes inside the recipe, in the
// official image with --network none and read-only mounts; AC-04/AC-05 take their status only from this step.
const cmdWheelAudit = () => containerStep('wheel-audit', (nonce, inputs) => [['wheel-audit', {mounts: [...baseMounts(nonce), bind(abs(S, 'build'), '/prep')],
  argv: [...PY, 'wheel-audit', '--nonce', nonce, '--mode', MODE, '--b1', '/prep/b1', ...(MODE === 'local' ? ['--b2', '/prep/b2'] : []),
    '--official', `/in/${inputs.officialRfc3161Wheel.path}`, '--sdist', `/in/${inputs.sdist.path}`, '--elf', '/prep/elf.json']}]]);

const cmdProbeRuntime = () => containerStep('probe-runtime', nonce => [['probe-runtime', {mounts: baseMounts(nonce), argv: [...PY, 'probe-runtime', '--nonce', nonce]}]]);

function cmdInstall(name) {
  if (!['a', 'b', 'tools'].includes(name)) throw new Error('install a|b|tools');
  const volume = name === 'tools' ? 'tools' : `capsule-${name}`;
  return containerStep(`install-${name}`, (nonce, inputs, deadline) => [[`install-${name}`, {mounts: [...baseMounts(nonce), vol(nonce, volume, '/cap')],
    argv: [...PY, 'install', '--name', name, '--cap', '/cap', '--nonce', nonce, '--lock', '/q/requirements-linux-cp312.txt', '--wheels', '/in/wheels',
      ...(name === 'tools' ? ['--lock', '/q/requirements-tools.txt', '--wheels', '/in/tools'] : []), '--expect', name === 'tools' ? '36' : '31',
      '--installer', `/in/${inputs.installer.path}`, '--installer-sha256', inputs.installer.sha256, '--timeout', String(Math.floor((deadline - Date.now()) / 1000) - 8)]}]]);
}

const cmdCompare = () => containerStep('compare', nonce => [['compare', {mounts: [...baseMounts(nonce), vol(nonce, 'capsule-a', '/cap-a', true), vol(nonce, 'capsule-b', '/cap-b', true), vol(nonce, 'tools', '/tools', true)],
  argv: [...PY, 'compare', '--a', '/cap-a/venv', '--b', '/cap-b/venv', '--tools', '/tools/venv', '--lock', '/q/requirements-linux-cp312.txt', '--nonce', nonce]}]]);

const cmdLinkage = () => containerStep('linkage', nonce => ['a', 'b'].map(cap => [`linkage-${cap}`, {mounts: [...baseMounts(nonce), vol(nonce, `capsule-${cap}`, '/cap', true)],
  argv: [...PY, 'linkage', '--capsule', cap, '--nonce', nonce]}]));

// ---------------------------------------------------------------- drive phase

function cmdTuf(cap) {
  if (!['a', 'b'].includes(cap)) throw new Error('tuf a|b');
  return containerStep(`tuf-${cap}`, async (nonce, inputs, deadline) => [[`tuf-${cap}`, {network: 'bridge', hosts: await hostsFor(inputs.hosts.tuf),
    mounts: [...baseMounts(nonce), vol(nonce, `capsule-${cap}`, '/cap', true), vol(nonce, `tuf-${cap}`, '/state')],
    argv: [...PY, 'tuf', '--capsule', cap, '--nonce', nonce, '--timeout', String(Math.floor((deadline - Date.now()) / 1000) - 8)]}]]);
}

function cmdCases(group) {
  const cases = readJson(`${Q}/cases.json`), index = Number(/^g(\d\d)$/.exec(group)?.[1]) - 1, ids = cases.groups[index];
  if (!ids) throw new Error(`unknown case group ${group}`);
  const byId = Object.fromEntries(cases.cases.map(c => [c.id, c]));
  return containerStep(`cases-${group}`, (nonce, inputs, deadline) => ids.map((id, i) => [`case-${id}`, async () => {
    const c = byId[id], budget = Math.floor((deadline - Date.now()) / 1000 / (ids.length - i));
    const hosts = c.network === 'none' ? [] : await hostsFor(c.network === 'tufStaging' ? inputs.hosts.tufStaging : inputs.hosts.tuf);
    return {network: c.network === 'none' ? 'none' : 'bridge', hosts,
      mounts: [...baseMounts(nonce), vol(nonce, `capsule-${c.capsule}`, '/cap', true), ...(c.state === 'capsule' ? [vol(nonce, `tuf-${c.capsule}`, '/state')] : [])],
      tmpfs: c.state === 'tmpfs' ? ['/state:rw,nosuid,nodev,size=64m,mode=1777'] : [],
      argv: [...PY, 'case', id, '--nonce', nonce, '--timeout', String(Math.max(5, budget - 3))]};
  }]));
}

const cmdTsaDirect = () => containerStep('tsa-direct', nonce => [['tsa-direct', {mounts: [...baseMounts(nonce), vol(nonce, 'capsule-a', '/cap', true), vol(nonce, 'tuf-a', '/state', true)],
  argv: [...PY, 'tsa-direct', '--nonce', nonce]}]]);
const cmdRfcTests = () => containerStep('rfc3161-tests', nonce => [['rfc3161-tests', {mounts: [...baseMounts(nonce), vol(nonce, 'tools', '/tools', true)], argv: [...PY, 'rfc3161-tests', '--nonce', nonce]}]]);
const cmdAdmissionNegatives = () => containerStep('admission-negatives', nonce => [['admission-negatives', {mounts: baseMounts(nonce), argv: [...PY, 'admission-negatives', '--nonce', nonce]}]]);
const cmdGuardSelftest = () => containerStep('guard-selftest', nonce => [['guard-selftest', {mounts: baseMounts(nonce), argv: [...PY, 'guard-selftest', '--nonce', nonce]}]]);

function cmdOutcomes(kind = MODE) {
  const file = kind === 'challenges' ? 'current-challenges.json' : kind === 'reconcile' ? 'current-reconcile.json' : 'current.json';
  if (!['local', 'ci', 'challenges', 'reconcile'].includes(kind) || (['local', 'ci'].includes(kind) && kind !== MODE)) throw new Error(`outcomes mode ${kind} invalid here`);
  const c = current(file), inputs = readJson(`${Q}/inputs.json`);
  return step(`outcomes-${kind}`, async (rec, deadline) => {
    rec.nonce = c.nonce;
    mkdir777(EV);
    const r = await docker(rec, `outcomes-${kind}`, {image: image(inputs), nonce: c.nonce, mounts: [bind(abs(Q), '/q'), bind(abs(EV), '/out', false)],
      argv: [...PY, 'outcomes', '--mode', kind, '--nonce', c.nonce]}, deadline);
    rec.checks.push(chk('outcomes written', r.exit === 0, r.stdout.trim().slice(0, 500)));
  }, {nonce: c.nonce});
}

async function cmdCleanup() {
  let c;
  try { c = current(); } catch { process.stdout.write('{"cleanup":"no current run"}\n'); return 0; }
  let ok = true, containers = [], volumes = [];
  if (!SANDBOX) {
    try {
      containers = dockerList(['ps', '-aq', '--filter', `label=d09.run=${c.nonce}`]).split('\n').map(s => s.trim()).filter(Boolean);
      if (containers.length) ok = run('docker', ['rm', '-f', ...containers]).exit === 0;
      volumes = dockerList(['volume', 'ls', '-q', '--filter', `label=d09.run=${c.nonce}`]).split('\n').map(s => s.trim()).filter(Boolean);
      if (volumes.length) ok = run('docker', ['volume', 'rm', ...volumes]).exit === 0 && ok;
    } catch (error) { ok = false; process.stderr.write(`D09-STOP cleanup: ${error.message}\n`); }
  }
  fs.rmSync(abs(S, 'run', c.nonce), {recursive: true, force: true});
  process.stdout.write(`${JSON.stringify({cleanup: c.nonce, containers: containers.length, volumes: volumes.length, ok})}\n`);
  return ok ? 0 : 1;
}

// ---------------------------------------------------------------- challenges (completion-gate trust boundary)

function contractRefs(contract) { return [...new Set([...contract.authorityRefs.map(r => r.split('#')[0]), ...contract.sourceRefs])]; }
const sandboxPath = (dir, rel) => path.join(dir, ...rel.split('/'));
function sbRead(dir, rel) { return fs.readFileSync(sandboxPath(dir, rel)); }
function sbWrite(dir, rel, data) { fs.mkdirSync(path.dirname(sandboxPath(dir, rel)), {recursive: true}); fs.writeFileSync(sandboxPath(dir, rel), data); }

const REPO_PART = /^[A-Za-z0-9-]+$/, NAME_PART = /^[A-Za-z0-9._-]+$/;
// I1: the single repository pin; every gh endpoint is built from it and BASE_REV is its full base sha.
export function repoPin(inputs) {
  const r = inputs?.repository ?? {};
  const ok = REPO_PART.test(r.owner ?? '') && NAME_PART.test(r.name ?? '') && r.fullName === `${r.owner}/${r.name}` && typeof r.baseRef === 'string' && r.baseRef.length > 0
    && typeof r.headRef === 'string' && r.headRef.startsWith('feature/d09-') && SHA40.test(r.baseSha ?? '') && Number.isSafeInteger(r.otherRunId) && r.otherRunId > 0;
  if (!ok) throw new Error(`inputs.json repository pin invalid: ${JSON.stringify(r).slice(0, 300)}`);
  return r;
}
const baseRev = () => repoPin(readJson(`${Q}/inputs.json`)).baseSha;

export function extractBaseGate(dir) {
  const rev = baseRev(), ls = run('git', ['-C', ROOT, 'ls-tree', '-r', '-z', '--name-only', rev, '--', '.agent/tools', '.agent/rules/project-config.md']);
  const names = ls.stdout.split('\0').filter(Boolean);
  if (ls.exit !== 0 || !names.length) throw new Error(`base gate ${rev} unavailable: ${ls.stderr.trim()}`);
  const r = spawnSync('git', ['-C', ROOT, 'cat-file', '--batch'], {input: names.map(n => `${rev}:${n}\n`).join(''), maxBuffer: 64 * 1024 * 1024, windowsHide: true});
  const out = r.stdout; let at = 0;
  for (const name of names) {
    const nl = out.indexOf(10, at), [, type, size] = out.subarray(at, nl).toString().split(' ');
    if (type !== 'blob') throw new Error(`unexpected git object for ${name}`);
    sbWrite(dir, name, out.subarray(nl + 1, nl + 1 + Number(size)));
    at = nl + 1 + Number(size) + 1;
  }
  return names.length;
}

function makeSandbox(id, {baseGate = false, evidence = false} = {}) {
  const dir = abs(S, 'challenges', id);
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  if (baseGate) extractBaseGate(dir);
  else { fs.cpSync(abs('.agent/tools'), sandboxPath(dir, '.agent/tools'), {recursive: true}); sbWrite(dir, '.agent/rules/project-config.md', fs.readFileSync(abs('.agent/rules/project-config.md'))); }
  fs.cpSync(abs(Q), sandboxPath(dir, Q), {recursive: true});
  sbWrite(dir, '.github/workflows/ci.yml', fs.readFileSync(abs('.github/workflows/ci.yml')));
  if (evidence) {
    const receiptRel = `${EV}/e2e-local-receipt.json`, receipt = readJson(receiptRel);
    for (const rel of [receiptRel, receipt.outcomesPath, ...(receipt.artifacts ?? []).map(a => a.ref)]) sbWrite(dir, rel, fs.readFileSync(abs(rel)));
  }
  sbWrite(dir, '.d09-sandbox.json', `${JSON.stringify({id, createdAt: new Date().toISOString()})}\n`);
  return dir;
}

export function gate(dir, extra = [], contract = `${Q}/contract-local.json`) {
  const args = [sandboxPath(dir, '.agent/tools/verified-promise.mjs'), '--root', dir, '--contract', contract, ...extra];
  const r = run(process.execPath, args, {cwd: dir, timeout: 50000});
  return {argv: ['node', ...args.map(a => a.replace(ROOT, '<root>'))], exit: r.exit, error: r.error, stdout: clip(r.stdout, 32768), stderr: clip(r.stderr, 8192)};
}

export function forgedEvidence(dir, recipe, {outcomes, failStep = false}) {
  const contractBytes = sbRead(dir, recipe.contractPath), contract = JSON.parse(contractBytes);
  const digestOf = ref => sha(sbRead(dir, ref)), outBytes = `${JSON.stringify(outcomes, null, 2)}\n`;
  sbWrite(dir, recipe.outcomesPath, outBytes);
  const stepOf = phase => s => ({phase, command: s.command, args: s.args, exitCode: 0, stdout: '', stderr: '', error: null});
  const steps = [...recipe.doctor.map(stepOf('doctor')), ...recipe.drive.map(stepOf('drive'))];
  if (failStep) steps[steps.length - 1].exitCode = 1;
  const evidence = {schema: 'verification_recipe_v1', id: recipe.id, environment: recipe.environment, timestamp: new Date().toISOString(),
    recipeDigest: sha(JSON.stringify(recipe)), sources: [...new Set([...recipe.sourceRefs, ...contractRefs(contract)])].map(ref => ({ref, digest: digestOf(ref)})),
    steps, pass: true, taskId: contract.taskId, contractPath: recipe.contractPath, contractDigest: sha(contractBytes), recipeRef: recipe.recipeRef,
    recipeFileDigest: digestOf(recipe.recipeRef), outcomesPath: recipe.outcomesPath,
    environmentFingerprint: {platform: process.platform, nodeVersion: process.version, inputs: envFingerprintInputs(recipe.envRefs ?? [])},
    outcomes, outcomesDigest: sha(outBytes), artifacts: [...new Set(outcomes.criteria.flatMap(c => c.evidenceRefs))].map(ref => ({ref, digest: digestOf(ref)})),
    cleanup: {steps: recipe.cleanup.map(stepOf('cleanup')), pass: true}};
  sbWrite(dir, recipe.evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function reducedContract(dir, contractRel, keep, {replayRequired = true} = {}) {
  const contract = JSON.parse(sbRead(dir, contractRel));
  const reduced = {...contract, criteria: contract.criteria.filter(keep)};
  if (replayRequired) reduced.replayRequired = true; else delete reduced.replayRequired;
  sbWrite(dir, contractRel, `${JSON.stringify(reduced, null, 1)}\n`);
  return reduced;
}

export function forgeSingle(dir, recipeRel, contractRel, {replayRequired = true, outcomes: mutateOutcomes, failStep = false} = {}) {
  const recipe = JSON.parse(sbRead(dir, recipeRel));
  const contract = reducedContract(dir, contractRel, c => c.id === 'AC-08' && c.recipeRef === recipe.recipeRef, {replayRequired});
  const artifact = `${EV}/forged-artifact.json`;
  sbWrite(dir, artifact, '{"forged":true,"note":"synthetic bytes; nothing was executed"}\n');
  let outcomes = {schema: 'verification_outcomes_v1', taskId: contract.taskId, criteria: contract.criteria.map(c => ({criterionId: c.id, expected: c.expected,
    observed: 'forged: nothing executed', status: 'pass', evidenceRefs: [artifact], counts: {total: 4, passed: 4, failed: 0, skipped: 0}}))};
  if (mutateOutcomes) outcomes = mutateOutcomes(outcomes);
  return forgedEvidence(dir, recipe, {outcomes, failStep});
}

export function variant(name, result, pinned, mutation) {
  const ok = result.exit === 1 && result.stdout.includes('COMPLETE_DENIED') && pinned.every(p => result.stdout.includes(p));
  return {check: chk(name, ok, `exit=${result.exit} pinned=${JSON.stringify(pinned)} ${ok ? 'matched' : clip(result.stdout + result.stderr, 600)}`), record: {name, mutation, pinned, ...result}};
}

export const X6_VARIANTS = pins => [
  ['failed-step', {failStep: true}, pins['failed-step']],
  ['failed-outcome', {outcomes: o => ({...o, criteria: o.criteria.map(c => ({...c, status: 'fail', counts: {total: 1, passed: 0, failed: 1, skipped: 0}}))})}, pins['failed-outcome']],
  ['skipped-outcome', {outcomes: o => ({...o, criteria: o.criteria.map(c => ({...c, status: 'skip', counts: {total: 1, passed: 0, failed: 0, skipped: 1}}))})}, pins['skipped-outcome']],
  ['missing-outcome', {outcomes: o => ({...o, criteria: o.criteria.map(c => ({...c, criterionId: `${c.criterionId}-other`}))})}, pins['missing-outcome']],
  ['empty-outcomes', {outcomes: o => ({...o, criteria: []})}, pins['empty-outcomes']],
];

export function mutateFile(dir, rel, how) {
  const p = sandboxPath(dir, rel), text = fs.readFileSync(p, 'utf8');
  fs.writeFileSync(p, how === 'append' ? `${text}\n` : how === 'image' ? text.replace(/("index": "sha256:[0-9a-f]{63})([0-9a-f])/, (m, a, b) => a + (b === '0' ? '1' : '0'))
    : text.replace(/(--hash=sha256:[0-9a-f]{63})([0-9a-f])/, (m, a, b) => a + (b === '0' ? '1' : '0')));
}
export const X3_FILES = [['tool', `${Q}/d09.py`, 'append'], ['image', `${Q}/inputs.json`, 'image'], ['lock', `${Q}/requirements-linux-cp312.txt`, 'hash']];

// X4 isolates staleness: capturedAt moves 169 h back in both inputs.json and the dispositions file of a sandbox copy
// and every sha binding is recomputed there, so `securityEvidence stale` is the cause the replay must stop on.
export function staleSecurityEvidence(dir, now = Date.now()) {
  const at = new Date(now - (MAX_AGE_HOURS + 1) * 3600e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const bytes = `${JSON.stringify({...JSON.parse(sbRead(dir, DISPOSITIONS)), capturedAt: at}, null, 1)}\n`;
  sbWrite(dir, DISPOSITIONS, bytes);
  const inputs = JSON.parse(sbRead(dir, `${Q}/inputs.json`)), se = inputs.securityEvidence;
  se.capturedAt = at; se.dispositionsSha256 = sha(bytes);
  if (se.ownerAcceptance && typeof se.ownerAcceptance === 'object') se.ownerAcceptance.dispositionsSha256 = se.dispositionsSha256;
  sbWrite(dir, `${Q}/inputs.json`, `${JSON.stringify(inputs, null, 1)}\n`);
  return at;
}

async function challengeFast(rec) {
  const pins = readJson(`${Q}/cases.json`).challenges, recipeRel = `${Q}/recipe-e2e-${MODE}.json`, contractRel = `${Q}/contract-${MODE}.json`, out = [];
  const fresh = id => makeSandbox(`fast-${id}`);
  let dir = fresh('x1g'); forgeSingle(dir, recipeRel, contractRel);
  out.push({group: 'X1G', ...variant('X1G coherent forged receipt denied (fresh replay required)', gate(dir, [], contractRel), pins.X1.green, 'forged receipt, nothing executed')});
  dir = fresh('x2f'); forgeSingle(dir, recipeRel, contractRel); mutateFile(dir, `${Q}/README.md`, 'append');
  out.push({group: 'X2F', ...variant('X2F stale bound source denied', gate(dir, [], contractRel), [...pins.X2, `${Q}/README.md`], 'README.md +1 byte after forged receipt')});
  for (const [label, rel, how] of X3_FILES) {
    dir = fresh(`x3f-${label}`); forgeSingle(dir, recipeRel, contractRel); mutateFile(dir, rel, how);
    out.push({group: 'X3F', ...variant(`X3F stale ${label} denied`, gate(dir, [], contractRel), [...pins.X3, rel], `${rel} ${how}`)});
  }
  for (const [label, opts, pinned] of X6_VARIANTS(pins.X6)) {
    dir = fresh(`x6f-${label}`); forgeSingle(dir, recipeRel, contractRel, opts);
    out.push({group: 'X6F', ...variant(`X6F ${label} denied`, gate(dir, [], contractRel), [pinned], label)});
  }
  for (const v of out) rec.checks.push({...v.check, group: v.group});
  rec.variants = out.map(v => ({group: v.group, ...v.record}));
  fs.rmSync(abs(S, 'challenges'), {recursive: true, force: true});
}

export function deriveFromGenuine(dir, fn) {
  const receiptRel = `${EV}/e2e-local-receipt.json`, ev = JSON.parse(sbRead(dir, receiptRel));
  fn(ev);
  const outBytes = `${JSON.stringify(ev.outcomes, null, 2)}\n`;
  sbWrite(dir, ev.outcomesPath, outBytes);
  ev.outcomesDigest = sha(outBytes);
  ev.artifacts = [...new Set(ev.outcomes.criteria.flatMap(c => c.evidenceRefs))].map(ref => ({ref, digest: sha(sbRead(dir, ref))}));
  sbWrite(dir, receiptRel, `${JSON.stringify(ev, null, 2)}\n`);
}

async function challenge(id, rec) {
  const pins = readJson(`${Q}/cases.json`).challenges, contractRel = `${Q}/contract-local.json`;
  if (id === 'X1') {
    const red = makeSandbox('x1-red', {baseGate: true});
    forgeSingle(red, `${Q}/recipe-e2e-local.json`, contractRel, {replayRequired: false});
    const r = gate(red, [], contractRel);
    const green = makeSandbox('x1-green');
    forgeSingle(green, `${Q}/recipe-e2e-local.json`, contractRel, {replayRequired: true});
    const g = gate(green, [], contractRel);
    rec.red = {...r, verdict: r.stdout.split('\n')[0]}; rec.green = {...g, verdict: g.stdout.split('\n')[0]};
    rec.checks.push(chk(`RED: base gate ${baseRev()} allowed the coherent forgery (gap evidence)`, r.exit === 0 && r.stdout.includes(pins.X1.red), r.stdout.split('\n')[0]));
    rec.checks.push(variant('GREEN: current gate with replayRequired denied the same forgery', g, pins.X1.green, 'forged receipt').check);
    return;
  }
  if (id === 'X2' || id === 'X3') {
    const targets = id === 'X2' ? [['source', `${Q}/README.md`, 'append']] : X3_FILES;
    rec.variants = [];
    for (const [label, rel, how] of targets) {
      const dir = makeSandbox(`${id.toLowerCase()}-${label}`, {evidence: true});
      mutateFile(dir, rel, how);
      const v = variant(`${id} stale ${label} (${rel}) denied`, gate(dir, [], contractRel), [...pins[id], rel], `${rel} ${how}`);
      rec.checks.push(v.check); rec.variants.push(v.record);
    }
    return;
  }
  if (id === 'X4') {
    const dir = makeSandbox('x4');
    reducedContract(dir, contractRel, c => c.recipeRef === `${Q}/recipe-e2e-local.json`);
    rec.staleCapturedAt = staleSecurityEvidence(dir);
    const t0 = Date.now(), g = gate(dir, ['--replay'], contractRel), ms = Date.now() - t0, receipt = JSON.parse(sbRead(dir, `${EV}/e2e-local-receipt.json`));
    const steps = receipt.steps ?? [], want = x4Pins(pins.X4);
    rec.replay = {...g, durationMs: ms, steps: steps.map(s => ({args: s.args, exitCode: s.exitCode, stderr: clip(s.stderr, 2000)}))};
    rec.checks.push(chk('gate --replay denied', g.exit === 1 && g.stdout.includes(pins.X4.gate), g.stdout.split('\n').slice(0, 3).join(' | ')));
    rec.checks.push(chk(`replay stopped at ${pins.X4.failedStep} with ${want.join(' + ')} within the step cap`, steps.length === 2 && steps[0].exitCode === 0 && steps[1].args[1] === pins.X4.failedStep
      && steps[1].exitCode === 1 && want.every(p => steps[1].stderr.includes(p)) && ms < 60000, `${steps.map(s => `${s.args[1]}=${s.exitCode}`).join(',')} ${ms} ms`));
    return;
  }
  if (id === 'X6') {
    rec.variants = [];
    const mutations = {
      'failed-step': ev => { ev.steps[ev.steps.length - 1].exitCode = 1; },
      'failed-outcome': ev => { ev.outcomes.criteria = ev.outcomes.criteria.map(c => (c.criterionId === 'AC-08' ? {...c, status: 'fail', counts: {total: 4, passed: 3, failed: 1, skipped: 0}} : c)); },
      'skipped-outcome': ev => { ev.outcomes.criteria = ev.outcomes.criteria.map(c => (c.criterionId === 'AC-08' ? {...c, status: 'skip', counts: {total: 4, passed: 3, failed: 0, skipped: 1}} : c)); },
      'missing-outcome': ev => { ev.outcomes.criteria = ev.outcomes.criteria.filter(c => c.criterionId !== 'AC-08'); },
      'empty-outcomes': ev => { ev.outcomes.criteria = []; },
    };
    for (const [label, fn] of Object.entries(mutations)) {
      const dir = makeSandbox(`x6-${label}`, {evidence: true});
      deriveFromGenuine(dir, fn);
      const v = variant(`X6 ${label} denied`, gate(dir, [], contractRel), [pins.X6[label]], label);
      rec.checks.push(v.check); rec.variants.push(v.record);
    }
    return;
  }
  throw new Error(`unknown challenge ${id}`);
}

async function cmdChallenge(id) {
  if (SANDBOX) { process.stderr.write('D09-STOP challenge: refusing a challenge inside a challenge sandbox\n'); return 1; }
  if (id === 'fast') {
    const c = current();
    // e2e evidence lives in fast/: the challenges recipe owns (and resets) challenges/.
    return step('fast', async rec => { rec.nonce = c.nonce; await challengeFast(rec); }, {dir: `${EV}/fast`, nonce: c.nonce});
  }
  if (id === 'doctor') {
    const nonce = randomBytes(8).toString('hex');
    fs.rmSync(abs(EV, 'challenges'), {recursive: true, force: true});
    const r = await step('doctor', async rec => {
      rec.nonce = nonce;
      const receiptRel = `${EV}/e2e-local-receipt.json`, have = fs.existsSync(abs(receiptRel));
      const receipt = have ? readJson(receiptRel) : {};
      rec.checks.push(chk('genuine local e2e receipt present and passing', have && receipt.pass === true && receipt.cleanup?.pass === true, have ? receipt.pass : 'missing'));
      const rev = baseRev(), base = run('git', ['-C', ROOT, 'cat-file', '-e', `${rev}^{commit}`]);
      rec.checks.push(chk(`base gate commit ${rev} available`, base.exit === 0, base.stderr.trim()));
    }, {dir: `${EV}/challenges`, nonce});
    await writeJson(`${S}/run/current-challenges.json`, {nonce, startedAt: new Date().toISOString()});
    return r;
  }
  if (id === 'cleanup') { fs.rmSync(abs(S, 'challenges'), {recursive: true, force: true}); process.stdout.write('{"challenge":"cleanup"}\n'); return 0; }
  const c = current('current-challenges.json');
  return step(id, async rec => { rec.nonce = c.nonce; await challenge(id, rec); }, {dir: `${EV}/challenges`, nonce: c.nonce});
}

// ---------------------------------------------------------------- reconcile (D15; read-only gh api GETs on the pinned repository)

export const PREPUB = 'PREPUBLICATION: D09_PR is unset; no published pull request or hosted CI run exists to reconcile (AC-20 NOT-RUN)';
// Pinned denial reasons of the one identity function used by `reconcile run` and by every X5 substitution.
export const DENY = Object.freeze({
  PR: 'PR number is not a positive integer',
  BASE_REPO: 'PR base repository is not the pinned repository',
  HEAD_REPO: 'PR head repository is not the pinned repository',
  BASE_REF: 'PR base ref is not the pinned base ref',
  HEAD_REF: 'PR head ref is not the pinned head ref',
  BASE_SHA: 'PR base sha is not the pinned base sha',
  SHA: 'a commit sha is not 40 lowercase hex characters',
  RUN_REPO: 'workflow run repository is not the pinned repository',
  RUN_HEAD: 'workflow run head_sha or head_branch is not the PR head',
  RUN_EVENT: 'workflow run is not a pull_request run of .github/workflows/ci.yml',
  RUN_PR: 'workflow run is not linked to the PR',
  RUN_DONE: 'workflow run did not complete with success',
  JOBS: 'not every job of the run attempt succeeded',
  JOB: 'job not found or not successful in the run attempt',
  JOB_RUN: 'job does not belong to the run attempt and the PR head',
  JOB_LABEL: 'job did not run on ubuntu-24.04',
  FRESH: 'run not completed within 72 h before reconcile, or receipt made outside the job window',
  ARTIFACT: 'artifact d09-evidence-<run>-<attempt> of this run is missing, expired or ambiguous',
  ZIP: 'downloaded artifact zip sha256 differs from the API digest',
  MERGE: 'tested merge commit parents are not exactly [base, head]',
  TREE: 'tree(merge) differs from tree(head)',
  CHECKOUT: 'this checkout is not the clean PR head',
  RECEIPT: 'CI receipt is not a passing linux contract-ci receipt made with the pinned node',
  BIND: 'CI receipt does not bind the contract, recipe and sources of this checkout',
  OUTCOMES: 'downloaded outcomes differ from the receipt outcomesDigest',
  ARTIFACTS: 'downloaded evidence differs from the receipt artifacts',
  IMAGE: 'runner image identity is not derivable from the job log',
});
export const envDeny = name => `receipt ${name} does not reconcile`;

export function expectedEnvDigests(values) {
  return Object.fromEntries(CI_ENV.map(name => [name, sha(JSON.stringify({present: values[name] !== undefined && values[name] !== null, value: values[name] ?? null}))]));
}

// x: pin, pr, nodeVersion, jobName, nowMs, raw API payloads (prJson, runJson, jobsJson, artifactsJson, mergeJson, headCommitJson),
// zipSha256, image (parsed from the GitHub job log, not from the artifact), checkout, and the downloaded receipt/ident/outcomes.
export function identityRules(x) {
  const p = x.pin, pr = x.prJson ?? {}, run = x.runJson ?? {}, jobs = Array.isArray(x.jobsJson?.jobs) ? x.jobsJson.jobs : [], head = pr.head?.sha, m = x.ident?.ci?.GITHUB_SHA;
  const job = jobs.find(j => j.name === x.jobName), artName = `d09-evidence-${run.id}-${run.run_attempt}`;
  const arts = (Array.isArray(x.artifactsJson?.artifacts) ? x.artifactsJson.artifacts : []).filter(a => a.name === artName), art = arts.length === 1 ? arts[0] : null;
  const rc = x.receipt ?? {}, fp = rc.environmentFingerprint ?? {}, fpInputs = Array.isArray(fp.inputs) ? fp.inputs : [];
  const sources = Array.isArray(rc.sources) ? rc.sources : [], artifacts = Array.isArray(rc.artifacts) ? rc.artifacts : [];
  const got = new Map(fpInputs.map(i => [i.name, i.digest])), t0 = Date.parse(job?.started_at), t1 = Date.parse(job?.completed_at), tr = Date.parse(rc.timestamp), slack = 120e3;
  const values = {GITHUB_REPOSITORY: p.fullName, GITHUB_EVENT_NAME: 'pull_request', GITHUB_WORKFLOW_REF: `${p.fullName}/.github/workflows/ci.yml@refs/pull/${x.pr}/merge`,
    GITHUB_SHA: m, GITHUB_HEAD_REF: p.headRef, GITHUB_RUN_ID: String(run.id), GITHUB_RUN_ATTEMPT: String(run.run_attempt), GITHUB_JOB: x.jobName,
    RUNNER_OS: 'Linux', ImageOS: x.image?.ImageOS, ImageVersion: x.image?.ImageVersion};
  const want = expectedEnvDigests(values), parents = Array.isArray(x.mergeJson?.parents) ? x.mergeJson.parents.map(q => q?.sha) : null;
  return [
    [DENY.PR, /^[1-9][0-9]*$/.test(x.pr ?? ''), x.pr],
    [DENY.BASE_REPO, pr.base?.repo?.full_name === p.fullName, pr.base?.repo?.full_name],
    [DENY.HEAD_REPO, pr.head?.repo?.full_name === p.fullName, pr.head?.repo?.full_name],
    [DENY.BASE_REF, pr.base?.ref === p.baseRef, pr.base?.ref],
    [DENY.HEAD_REF, pr.head?.ref === p.headRef, pr.head?.ref],
    [DENY.BASE_SHA, pr.base?.sha === p.baseSha, pr.base?.sha],
    [DENY.SHA, [p.baseSha, head, m, run.head_sha, job?.head_sha, x.mergeJson?.sha, x.headCommitJson?.sha].every(s => SHA40.test(s ?? '')), `head=${head} merge=${m}`],
    [DENY.RUN_REPO, run.repository?.full_name === p.fullName && run.head_repository?.full_name === p.fullName, `${run.repository?.full_name} ${run.head_repository?.full_name}`],
    [DENY.RUN_HEAD, run.head_sha === head && run.head_branch === p.headRef, `run ${run.id} head_sha=${run.head_sha} head_branch=${run.head_branch}`],
    [DENY.RUN_EVENT, run.event === 'pull_request' && run.path === '.github/workflows/ci.yml', `${run.event} ${run.path}`],
    [DENY.RUN_PR, (Array.isArray(run.pull_requests) ? run.pull_requests : []).some(q => String(q?.number) === x.pr), JSON.stringify((run.pull_requests ?? []).map(q => q?.number))],
    [DENY.RUN_DONE, run.status === 'completed' && run.conclusion === 'success', `${run.status}/${run.conclusion}`],
    [DENY.JOBS, jobs.length > 0 && jobs.length === x.jobsJson?.total_count && jobs.every(j => j.conclusion === 'success'),
      `${jobs.length}/${x.jobsJson?.total_count} ${jobs.filter(j => j.conclusion !== 'success').map(j => `${j.name}=${j.conclusion}`).join(',')}`],
    [DENY.JOB, job?.status === 'completed' && job.conclusion === 'success', `${x.jobName}: ${job ? `${job.status}/${job.conclusion}` : 'absent'}`],
    [DENY.JOB_RUN, Boolean(job) && job.run_id === run.id && job.run_attempt === run.run_attempt && job.head_sha === head, `${job?.run_id}/${job?.run_attempt} ${job?.head_sha}`],
    [DENY.JOB_LABEL, Array.isArray(job?.labels) && job.labels.includes('ubuntu-24.04'), JSON.stringify(job?.labels ?? null)],
    [DENY.FRESH, [t0, t1, tr, x.nowMs].every(Number.isFinite) && t1 <= x.nowMs + slack && x.nowMs - t1 <= FRESH_MS && tr >= t0 - slack && tr <= t1 + slack, `job ${job?.started_at}..${job?.completed_at} receipt ${rc.timestamp}`],
    [DENY.ARTIFACT, Boolean(art) && art.expired === false && art.workflow_run?.id === run.id && art.workflow_run?.head_sha === head && /^sha256:[0-9a-f]{64}$/.test(art.digest ?? ''), `${artName}: ${arts.length} found`],
    [DENY.ZIP, Boolean(art) && SHA64.test(x.zipSha256 ?? '') && art.digest === `sha256:${x.zipSha256}`, `api=${art?.digest} zip=${x.zipSha256}`],
    [DENY.MERGE, x.mergeJson?.sha === m && same(parents, [p.baseSha, head]), JSON.stringify(parents)],
    [DENY.TREE, SHA40.test(x.mergeJson?.tree?.sha ?? '') && x.mergeJson.tree.sha === x.headCommitJson?.tree?.sha && x.headCommitJson?.sha === head, `${x.mergeJson?.tree?.sha} vs ${x.headCommitJson?.tree?.sha}`],
    [DENY.CHECKOUT, x.checkout?.head === head && x.checkout?.clean === true, `${x.checkout?.head} clean=${x.checkout?.clean}`],
    [DENY.RECEIPT, rc.schema === 'verification_recipe_v1' && rc.id === 'd09-e2e-ci' && rc.taskId === 'D09-SOURCE-VERIFICATION-CI' && rc.contractPath === `${Q}/contract-ci.json`
      && rc.recipeRef === `${Q}/recipe-e2e-ci.json` && rc.outcomesPath === `${EV}/e2e-ci-outcomes.json` && rc.pass === true && rc.cleanup?.pass === true && !rc.integrityError
      && !rc.outcomesError && fp.platform === 'linux' && fp.nodeVersion === x.nodeVersion && same(fpInputs.map(i => i.name), CI_ENV), `pass=${rc.pass} platform=${fp.platform} node=${fp.nodeVersion}`],
    [DENY.BIND, rc.contractDigest === x.local?.contract && rc.recipeFileDigest === x.local?.recipe && sources.length > 0 && sources.every(s => x.local?.sources?.get(s?.ref) === s?.digest)
      && (x.local?.required ?? []).every(ref => sources.some(s => s?.ref === ref)), sources.filter(s => x.local?.sources?.get(s?.ref) !== s?.digest).map(s => s?.ref).slice(0, 5).join(', ')],
    [DENY.OUTCOMES, SHA64.test(x.outcomesSha256 ?? '') && rc.outcomesDigest === x.outcomesSha256 && same(rc.outcomes, x.outcomesJson), `receipt=${rc.outcomesDigest} downloaded=${x.outcomesSha256}`],
    [DENY.ARTIFACTS, artifacts.length > 0 && artifacts.every(a => x.downloaded?.get(a?.ref) === a?.digest), artifacts.filter(a => x.downloaded?.get(a?.ref) !== a?.digest).map(a => a?.ref).slice(0, 5).join(', ')],
    [DENY.IMAGE, x.image?.image === 'ubuntu-24.04' && /^[a-z]+[0-9]+$/.test(x.image?.ImageOS ?? '') && /^[0-9]{8}\.[0-9]+\.[0-9]+$/.test(x.image?.ImageVersion ?? ''), JSON.stringify(x.image ?? null)],
    ...CI_ENV.map(k => [envDeny(k), got.has(k) && got.get(k) === want[k], `${k}=${values[k]}`]),
  ];
}
export function reconcileIdentity(x) {
  try { return identityRules(x).filter(([, ok]) => !ok).map(([deny]) => deny); } catch (error) { return [`reconcile input malformed: ${error.message}`]; }
}
// X5 (plan D15): the real other run (read-only GETs at D15), a wrong head, attempt+1 and a wrong (real, other) job.
export function x5Substitutions(x, other) {
  const head = x.prJson?.head?.sha ?? '', wrong = `${head.slice(0, 39)}${head.endsWith('0') ? '1' : '0'}`, attempt = x.runJson?.run_attempt;
  const otherJob = (x.jobsJson?.jobs ?? []).map(j => j?.name).find(n => typeof n === 'string' && n !== x.jobName) ?? `${x.jobName}-x5`;
  return [
    {label: `other run ${other.run?.id}`, pinned: envDeny('GITHUB_RUN_ID'), ctx: {...x, runJson: other.run, jobsJson: other.jobs, artifactsJson: other.artifacts}},
    {label: `wrong head ${wrong}`, pinned: DENY.RUN_HEAD, ctx: {...x, prJson: {...x.prJson, head: {...x.prJson?.head, sha: wrong}}, headCommitJson: {...x.headCommitJson, sha: wrong}}},
    {label: `attempt ${attempt + 1}`, pinned: envDeny('GITHUB_RUN_ATTEMPT'), ctx: {...x, runJson: {...x.runJson, run_attempt: attempt + 1}}},
    {label: `wrong job ${otherJob}`, pinned: envDeny('GITHUB_JOB'), ctx: {...x, jobName: otherJob}},
  ];
}

export function runnerImageFromLog(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.replace(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z ?/, '').trim());
  const start = lines.findIndex(l => l === '##[group]Runner Image' || l === 'Runner Image'), block = [];
  for (let i = start + 1; start >= 0 && i < lines.length && lines[i] !== '##[endgroup]' && block.length < 10; i += 1) block.push(lines[i]);
  const field = k => block.find(l => l.startsWith(`${k}: `))?.slice(k.length + 2).trim() ?? null;
  return {image: field('Image'), ImageVersion: field('Version'), ImageOS: /\/actions\/runner-images\/blob\/([a-z]+[0-9]+)\//.exec(field('Included Software') ?? '')?.[1] ?? null};
}

// Minimal ZIP reader for the downloaded artifact (stored/deflate only, no zip64); every entry is size- and CRC-checked.
export function readZip(buf, {maxEntries = 50000, maxBytes = 1 << 30} = {}) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > buf.length) throw new Error('zip: end of central directory not found');
  const count = buf.readUInt16LE(eocd + 10), size = buf.readUInt32LE(eocd + 12), start = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) throw new Error('zip: zip64 is not supported');
  if (buf.readUInt16LE(eocd + 4) !== 0 || buf.readUInt16LE(eocd + 8) !== count || count > maxEntries || start + size > eocd) throw new Error('zip: central directory invalid');
  const out = [], seen = new Set();
  let p = start, total = 0;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > eocd || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: bad central directory entry');
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), local = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    const segs = name.replace(/\/$/, '').split('/');
    if (!name || name.startsWith('/') || /[\x00-\x1f\\:*?"<>|]/.test(name) || segs.some(s => !s || s === '.' || s === '..' || /[. ]$/.test(s))) throw new Error(`zip: unsafe entry name ${JSON.stringify(name)}`);
    if (seen.has(name.toLowerCase())) throw new Error(`zip: duplicate entry ${name}`);
    seen.add(name.toLowerCase());
    if (flags & 1) throw new Error(`zip: encrypted entry ${name}`);
    if (name.endsWith('/')) continue;
    if (local + 30 > start || buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`);
    const from = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    if (from + csize > start || (total += usize) > maxBytes) throw new Error(`zip: entry out of bounds or archive too large: ${name}`);
    const raw = buf.subarray(from, from + csize);
    if (method !== 0 && method !== 8) throw new Error(`zip: unsupported compression method ${method} for ${name}`);
    const data = method === 0 ? raw : zlib.inflateRawSync(raw, {maxOutputLength: Math.max(1, usize)});
    if (data.length !== usize || zlib.crc32(data) !== crc) throw new Error(`zip: size or CRC mismatch for ${name}`);
    out.push({name, data});
  }
  return out;
}
function extractZip(buf, destRel) {
  const dest = abs(destRel);
  fs.rmSync(dest, {recursive: true, force: true}); fs.mkdirSync(dest, {recursive: true});
  for (const {name, data} of readZip(buf)) {
    const target = path.resolve(dest, ...name.split('/'));
    if (!target.startsWith(dest + path.sep)) throw new Error(`zip entry escapes the extraction directory: ${name}`);
    fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, data, {flag: 'wx'});
  }
}

const GH_ENDPOINT = /^repos\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._/?&=%-]+)?$/;
function ghGet(endpoint, deadline, {binary = false} = {}) {
  if (!GH_ENDPOINT.test(endpoint) || endpoint.includes('..')) throw new Error(`refusing gh endpoint ${endpoint}`);
  const args = ['api', '--hostname', 'github.com', '--method', 'GET', ...(binary ? [] : ['-H', 'Accept: application/vnd.github+json']), endpoint];
  const r = spawnSync('gh', args, {cwd: ROOT, timeout: Math.max(1000, deadline - Date.now()), maxBuffer: 256 * 1024 * 1024, windowsHide: true, ...(binary ? {} : {encoding: 'utf8'})});
  if (r.status !== 0) throw new Error(`gh api GET ${endpoint} failed (exit ${r.status}${r.error ? `, ${r.error.message}` : ''}): ${String(r.stderr ?? '').trim().slice(0, 300)}`);
  return r.stdout;
}

async function fetchReconcile(pr, deadline) {
  const inputs = readJson(`${Q}/inputs.json`), pin = repoPin(inputs), api = t => `repos/${pin.fullName}/${t}`, dir = `${EV}/reconcile/api`;
  if (!/^[1-9][0-9]*$/.test(pr ?? '')) throw new Error(DENY.PR);
  const get = async (label, tail) => { const raw = ghGet(api(tail), deadline); await writeText(`${dir}/${label}.json`, raw); return JSON.parse(raw); };
  const prj = await get('pr', `pulls/${pr}`), head = prj?.head?.sha;
  if (!SHA40.test(head ?? '')) throw new Error(`${DENY.SHA}: PR head ${head}`);
  const runs = (await get('runs', `actions/workflows/ci.yml/runs?event=pull_request&head_sha=${head}&per_page=100`)).workflow_runs ?? [];
  const runId = Math.max(0, ...runs.map(r => r?.id).filter(Number.isSafeInteger));
  if (!runId) throw new Error('no ci.yml pull_request run exists for the PR head');
  const runj = await get('run', `actions/runs/${runId}`);
  if (!Number.isSafeInteger(runj.run_attempt) || runj.run_attempt < 1) throw new Error(`run ${runId} attempt invalid`);
  const jobs = await get('jobs', `actions/runs/${runId}/attempts/${runj.run_attempt}/jobs?per_page=100`), name = `d09-evidence-${runId}-${runj.run_attempt}`;
  const art = ((await get('artifacts', `actions/runs/${runId}/artifacts?per_page=100&name=${name}`)).artifacts ?? []).find(a => a?.name === name);
  if (!Number.isSafeInteger(art?.id)) throw new Error(`artifact ${name} missing`);
  const zip = ghGet(api(`actions/artifacts/${art.id}/zip`), deadline, {binary: true});
  fs.writeFileSync(abs(EV, 'reconcile', 'ci-artifact.zip'), zip);
  await writeJson(`${dir}/zip.json`, {artifactId: art.id, bytes: zip.length, sha256: sha(zip)});
  extractZip(zip, `${EV}/reconcile/ci-artifact`);
  const job = (jobs.jobs ?? []).find(j => j?.name === JOB);
  if (!Number.isSafeInteger(job?.id)) throw new Error(`job ${JOB} missing in run ${runId} attempt ${runj.run_attempt}`);
  const log = ghGet(api(`actions/jobs/${job.id}/logs`), deadline, {binary: true});
  fs.writeFileSync(abs(EV, 'reconcile', 'api', 'job-log.txt'), log);
  await writeJson(`${dir}/job-log.json`, {jobId: job.id, bytes: log.length, sha256: sha(log), image: runnerImageFromLog(log.toString('utf8'))});
  const merge = readJson(`${EV}/reconcile/ci-artifact/evidence/host-identity.json`).ci?.GITHUB_SHA;
  if (!SHA40.test(merge ?? '')) throw new Error(`${DENY.SHA}: artifact GITHUB_SHA ${merge}`);  // validated before it enters an API path
  await get('merge', `git/commits/${merge}`);
  await get('head', `git/commits/${head}`);
  const h = run('git', ['-C', ROOT, 'rev-parse', 'HEAD']), st = run('git', ['-C', ROOT, '--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=no']);
  await writeJson(`${dir}/checkout.json`, {head: h.exit === 0 ? h.stdout.trim() : null, clean: st.exit === 0 && st.stdout.trim() === '', status: clip(st.stdout, 4000)});
}

const SAFE_REL = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._/-]+$/;
function reconcileContext(pr, now = Date.now()) {
  const inputs = readJson(`${Q}/inputs.json`), r = `${EV}/reconcile`, ci = `${r}/ci-artifact`;
  const receipt = readJson(`${ci}/evidence/e2e-ci-receipt.json`), outBytes = fs.readFileSync(abs(ci, 'evidence', 'e2e-ci-outcomes.json'));
  const fileSha = rel => { const p = abs(rel); return SAFE_REL.test(rel) && fs.existsSync(p) && fs.lstatSync(p).isFile() ? shaFile(p) : null; };
  const refs = list => (Array.isArray(list) ? list : []).map(s => s?.ref).filter(ref => typeof ref === 'string');
  const contract = readJson(`${Q}/contract-ci.json`), recipe = readJson(`${Q}/recipe-e2e-ci.json`);
  return {pin: repoPin(inputs), pr, nodeVersion: inputs.host?.nodeVersion, jobName: JOB, nowMs: now,
    prJson: readJson(`${r}/api/pr.json`), runJson: readJson(`${r}/api/run.json`), jobsJson: readJson(`${r}/api/jobs.json`), artifactsJson: readJson(`${r}/api/artifacts.json`),
    zipSha256: readJson(`${r}/api/zip.json`).sha256, mergeJson: readJson(`${r}/api/merge.json`), headCommitJson: readJson(`${r}/api/head.json`),
    image: readJson(`${r}/api/job-log.json`).image, checkout: readJson(`${r}/api/checkout.json`), receipt, ident: readJson(`${ci}/evidence/host-identity.json`),
    outcomesSha256: sha(outBytes), outcomesJson: JSON.parse(outBytes.toString('utf8')),
    local: {contract: shaFile(abs(Q, 'contract-ci.json')), recipe: shaFile(abs(Q, 'recipe-e2e-ci.json')), required: [...new Set([...recipe.sourceRefs, ...contractRefs(contract)])],
      sources: new Map(refs(receipt.sources).map(ref => [ref, fileSha(ref)]))},
    downloaded: new Map(refs(receipt.artifacts).map(ref => [ref, ref.startsWith(`${S}/`) ? fileSha(`${ci}/${ref.slice(S.length + 1)}`) : null]))};
}

function evidenceView(dirRel, outcomesName) {
  const dir = abs(dirRel), read = rel => { try { return JSON.parse(fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8')); } catch { return null; } };
  const each = sub => (fs.existsSync(path.join(dir, sub)) ? fs.readdirSync(path.join(dir, sub)).filter(f => f.endsWith('.json')).sort().map(f => [f.slice(0, -5), read(`${sub}/${f}`)]) : []);
  return {outcomes: read(outcomesName), cases: Object.fromEntries(each('cases').map(([id, c]) => [id, {status: c?.status ?? null, exit: c?.exit ?? null}])),
    manifests: ['a', 'b'].map(k => read(`manifest-${k}.json`)?.entries ?? null),
    probes: Object.fromEntries(each('probes').map(([id, pr]) => [id, (pr?.maps ?? []).map(m => `${m.path} ${m.sha256 ?? m.error}`).sort()]))};
}
const COUNTED = ['AC-08', 'AC-09', 'AC-10', 'AC-12', 'AC-13', 'AC-14'];
// Plan D15 parity: criterion id/status/counts, per-case status and exit, W, capsule manifests and the loaded set.
export function parityChecks(ci, local, w) {
  const ids = o => (o?.criteria ?? []).map(c => c.criterionId).sort(), L = new Map((local.outcomes?.criteria ?? []).map(c => [c.criterionId, c]));
  const union = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort(), cases = union(ci.cases, local.cases), probes = union(ci.probes, local.probes);
  const checks = [chk('parity: CI and local outcomes cover the same criteria', ids(ci.outcomes).length > 0 && same(ids(ci.outcomes), ids(local.outcomes)), `${ids(ci.outcomes).length} vs ${ids(local.outcomes).length}`)];
  for (const o of ci.outcomes?.criteria ?? []) {
    const l = L.get(o.criterionId);
    checks.push(chk(`parity ${o.criterionId}`, Boolean(l) && o.status === 'pass' && l.status === 'pass' && (!COUNTED.includes(o.criterionId) || same(o.counts, l.counts)),
      `ci=${o.status} ${JSON.stringify(o.counts)} local=${l?.status} ${JSON.stringify(l?.counts)}`));
  }
  checks.push(chk('parity: every case has the same status and exit code', cases.length > 0 && cases.every(id => same(ci.cases[id], local.cases[id])), cases.filter(id => !same(ci.cases[id], local.cases[id])).slice(0, 5).join(', ') || `${cases.length} cases`));
  checks.push(chk('parity: capsule manifests a and b are equal', ci.manifests.every(Boolean) && same(ci.manifests, local.manifests), ci.manifests.map(e => e?.length ?? null).join('/')));
  checks.push(chk('parity: loaded set (file-backed maps per probe) is equal', probes.length > 0 && probes.every(id => same(ci.probes[id], local.probes[id])), probes.filter(id => !same(ci.probes[id], local.probes[id])).slice(0, 5).join(', ') || `${probes.length} probes`));
  checks.push(chk('parity: CI build/b1 W equals the pinned W', SHA64.test(w.pin ?? '') && w.ci === w.pin, `ci=${w.ci} pin=${w.pin}`));
  return checks;
}

async function cmdReconcile(sub) {
  if (SANDBOX) { process.stderr.write('D09-STOP reconcile: refusing reconcile inside a challenge sandbox\n'); return 1; }
  if (sub === 'check') {
    const pr = process.env.D09_PR || null, nonce = randomBytes(8).toString('hex');
    fs.rmSync(abs(EV, 'reconcile'), {recursive: true, force: true});
    await writeJson(`${S}/run/current-reconcile.json`, {nonce, pr, prepublication: pr === null, startedAt: new Date().toISOString()});
    return step('check', async (rec, deadline) => {
      rec.nonce = nonce;
      if (pr === null) { rec.checks.push(chk('reconcile mode recorded', true, PREPUB)); process.stdout.write(`${PREPUB}\n`); return; }
      rec.checks.push(chk('D09_PR is a positive integer', /^[1-9][0-9]*$/.test(pr), pr));
      const pin = repoPin(readJson(`${Q}/inputs.json`)), repo = JSON.parse(ghGet(`repos/${pin.fullName}`, deadline));
      rec.checks.push(chk('gh read access to the pinned repository', repo.full_name === pin.fullName, repo.full_name));
    }, {dir: `${EV}/reconcile`, nonce});
  }
  const c = current('current-reconcile.json');
  if (sub === 'run') return step('run', async (rec, deadline) => {
    rec.nonce = c.nonce;
    if (c.prepublication) { rec.observeOnly = true; rec.checks.push(chk(PREPUB, false, 'no pull request, run, artifact or merge commit to reconcile')); return; }
    await fetchReconcile(c.pr, deadline);
    const x = reconcileContext(c.pr), inputs = readJson(`${Q}/inputs.json`), ci = `${EV}/reconcile/ci-artifact`, w = abs(ci, 'build', 'b1', inputs.rebuilt.file);
    for (const [deny, ok, observed] of identityRules(x)) rec.checks.push(chk(`deny if ${deny}`, ok, observed));
    rec.checks.push(...parityChecks(evidenceView(`${ci}/evidence`, 'e2e-ci-outcomes.json'), evidenceView(EV, 'e2e-local-outcomes.json'),
      {ci: fs.existsSync(w) ? shaFile(w) : null, pin: inputs.rebuilt.sha256}));
    const reasons = rec.checks.filter(k => !k.ok).map(k => k.name);
    await writeJson(`${EV}/reconcile/identity.json`, {nonce: c.nonce, pr: c.pr, run: x.runJson?.id, attempt: x.runJson?.run_attempt, head: x.prJson?.head?.sha,
      merge: x.ident?.ci?.GITHUB_SHA, verdict: reasons.length ? 'RECONCILE_DENIED' : 'RECONCILE_ACCEPTED', reasons});
  }, {dir: `${EV}/reconcile`, nonce: c.nonce});
  if (sub === 'x5') return step('x5', async (rec, deadline) => {
    rec.nonce = c.nonce;
    if (c.prepublication) { rec.observeOnly = true; rec.checks.push(chk(`${PREPUB}; X5 substitutes identities of the published run only`, false, 'nothing to substitute')); return; }
    const pin = repoPin(readJson(`${Q}/inputs.json`)), x = reconcileContext(c.pr), control = reconcileIdentity(x), api = t => `repos/${pin.fullName}/${t}`;
    rec.checks.push(chk('X5 control: the genuine identity is accepted by the same reconcile function', !control.length, control.join('; ') || 'RECONCILE_ACCEPTED'));
    if (pin.otherRunId === x.runJson?.id) throw new Error('inputs.repository.otherRunId is the reconciled run itself');
    const otherRun = JSON.parse(ghGet(api(`actions/runs/${pin.otherRunId}`), deadline));
    if (otherRun.id !== pin.otherRunId || !Number.isSafeInteger(otherRun.run_attempt) || otherRun.run_attempt < 1) throw new Error(`other run ${pin.otherRunId} payload unexpected`);
    const other = {run: otherRun, jobs: JSON.parse(ghGet(api(`actions/runs/${otherRun.id}/attempts/${otherRun.run_attempt}/jobs?per_page=100`), deadline)),
      artifacts: JSON.parse(ghGet(api(`actions/runs/${otherRun.id}/artifacts?per_page=100`), deadline))};
    await writeJson(`${EV}/reconcile/api/x5-other-run.json`, other);
    rec.substitutions = [];
    for (const s of x5Substitutions(x, other)) {
      const reasons = reconcileIdentity(s.ctx);
      rec.substitutions.push({label: s.label, pinned: s.pinned, reasons});
      rec.checks.push(chk(`X5 ${s.label}: RECONCILE_DENIED for "${s.pinned}"`, !control.length && reasons.includes(s.pinned), `${reasons.length ? 'RECONCILE_DENIED' : 'RECONCILE_ACCEPTED'}: ${reasons.join('; ')}`));
    }
  }, {dir: `${EV}/reconcile`, nonce: c.nonce});
  throw new Error('reconcile check|run|x5');
}

// ---------------------------------------------------------------- prepare (outside the recipe; slow)

async function cmdPrepare(args) {
  if (SANDBOX) { process.stderr.write('D09-STOP prepare: refusing prepare inside a challenge sandbox\n'); return 1; }
  const B = `${S}/build`;
  mkdir777(B); mkdir777(`${B}/records`);  // first, so a failure at any later point still leaves records for the CI artifact
  try { return await prepare(args, B); } catch (error) { await writeJson(`${B}/records/prepare-error.json`, {error: error.message, at: new Date().toISOString()}); throw error; }
}

async function prepare(args, B) {
  const capture = args.includes('--capture'), ci = args.includes('--ci');
  const builds = ci ? 1 : Number(args[args.indexOf('--builds') + 1] ?? 2) || 2;
  if (![1, 2].includes(builds) || (ci && capture)) throw new Error('prepare [--capture] [--ci] [--builds 2|1]');
  const inputs = readJson(`${Q}/inputs.json`), nonce = `prep${randomBytes(6).toString('hex')}`, records = [];
  for (const d of ['cpython', 'wheels', 'bootstrap', 'tools', 'sdist', 'official', 'debs']) mkdir777(`${S}/inputs/${d}`);
  mkdir777(`${S}/inputs`);
  const rec = {docker: []}, far = () => Date.now() + 50 * 60 * 1000, parse = s => { try { return JSON.parse(s); } catch { return null; } };
  const native = async (label, cmd, cmdArgs, timeout = 600000) => {
    const t0 = new Date().toISOString(), r = run(cmd, cmdArgs, {timeout});
    const entry = {label, argv: [cmd, ...cmdArgs], exit: r.exit, error: r.error, startedAt: t0, finishedAt: new Date().toISOString(), stdout: clip(r.stdout, 1 << 20), stderr: clip(r.stderr, 1 << 20)};
    records.push(`${B}/records/${label}.json`); await writeJson(`${B}/records/${label}.json`, entry);
    return r;
  };
  const container = async (label, spec) => {
    const r = await docker(rec, label, {image: image(inputs), nonce, ...spec}, far(), `${B}/records`);
    records.push(`${B}/records/${label}.out.txt`);
    if (r.exit !== 0) throw new Error(`${label} failed (exit ${r.exit}); see ${B}/records/${label}.err.txt`);
    return r;
  };
  let store = 'unknown';
  try {
    await native('docker-version', 'docker', ['version', '--format', '{{json .}}']);
    store = imageStore(parse((await native('docker-info', 'docker', ['info', '--format', '{{json .}}'])).stdout));
    let inspect = await native('image-inspect', 'docker', ['image', 'inspect', image(inputs)]);
    if (inspect.exit !== 0) { await native('image-pull', 'docker', ['pull', '--platform', 'linux/amd64', image(inputs)], 1800000); inspect = await native('image-inspect-after-pull', 'docker', ['image', 'inspect', image(inputs)]); }
    const ic = imageChecks(parse(inspect.stdout), inputs, store);
    if (!ic.every(c => c.ok)) { process.stderr.write(`${stopLines('prepare', ic).join('\n')}\n`); throw new Error(`image identity mismatch (S5) for the ${store} image store`); }
    const debHosts = await hostsFor(inputs.hosts.debian);
    if (capture) {
      // DAC_OVERRIDE: the image keeps /var/lib/apt/lists/partial as _apt:root 0700, which root without caps cannot open.
      await container('capture', {user: '0:0', readOnly: false, caps: ['DAC_OVERRIDE'], network: 'bridge', hosts: debHosts, mounts: [bind(abs(Q), '/q'), bind(abs(S, 'inputs', 'debs'), '/debs', false), bind(abs(B), '/out', false)],
        argv: [...PY, 'capture', '--debs', '/debs', '--out', '/out/debs.json', ...inputs.build.packages.flatMap(p => ['--pkg', p]), ...inputs.build.extraDebs.flatMap(p => ['--extra', p])]});
    } else if (!Array.isArray(inputs.debs)) throw new Error('inputs.json debs is PENDING; run prepare --capture first (D14)');
    const files = inputFiles(inputs).filter(f => f !== undefined && f.path !== inputs.rebuilt.path && !(capture && f.path.startsWith('debs/')));
    if (files.some(f => f.sha256 === 'PENDING' || f.url === undefined)) throw new Error('fetch manifest has PENDING or URL-less entries');
    await writeJson(`${B}/fetch-manifest.json`, {files: files.map(({path: p, url, fallbackUrls = [], size, sha256}) => ({path: p, url, fallbackUrls, size, sha256}))});
    const fetchHosts = [...inputs.hosts.fetch, ...(capture ? [] : inputs.hosts.debian)];
    await container('fetch', {network: 'bridge', hosts: await hostsFor(fetchHosts), mounts: [bind(abs(Q), '/q'), bind(abs(S, 'inputs'), '/in', false), bind(abs(B), '/out', false)],
      argv: [...PY, 'fetch', '--manifest', '/out/fetch-manifest.json', '--dest', '/in', '--record', '/out/fetch-records.json', ...fetchHosts.flatMap(h => ['--host', h])]});
    const cv = run('docker', ['volume', 'create', '--label', 'd09=1', '--label', `d09.run=${nonce}`, `d09-${nonce}-cargo`]);
    if (cv.exit !== 0) throw new Error(`cargo volume create failed: ${cv.stderr.trim().slice(0, 300)}`);  // never let --mount create it unlabelled
    const buildSpec = (network, extraMounts, hosts = []) => ({user: '0:0', readOnly: false, caps: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETUID', 'SETGID'], network, hosts,
      tmpfs: ['/build:rw,exec,size=4g,mode=1777'], mounts: [bind(abs(Q), '/q'), bind(abs(S, 'inputs'), '/in'), bind(abs(B), '/out', false), ...extraMounts]});
    await container('cargo-fetch', {...buildSpec('bridge', [vol(nonce, 'cargo', '/cargo')], await hostsFor(inputs.hosts.cargo)), argv: [...PY, 'build-env', 'cargo-fetch', '--out', '/out']});
    for (let n = 1; n <= builds; n += 1) await container(`build-b${n}`, {...buildSpec('none', [vol(nonce, 'cargo', '/cargo-ro', true)]), argv: [...PY, 'build-env', 'build', '--n', String(n), '--out', '/out']});
    await container('elf-audit', {...buildSpec('none', []), argv: [...PY, 'build-env', 'elf', '--out', '/out']});
    await container('build-negatives', {...buildSpec('none', [vol(nonce, 'cargo', '/cargo-ro', true)]), argv: [...PY, 'build-env', 'negatives', '--out', '/out']});
  } finally {
    try {
      const vols = dockerList(['volume', 'ls', '-q', '--filter', `label=d09.run=${nonce}`]).split('\n').map(s => s.trim()).filter(Boolean);
      if (vols.length) run('docker', ['volume', 'rm', ...vols]);
    } catch (error) { process.stderr.write(`D09-STOP prepare: cleanup of ${nonce} volumes failed: ${error.message}\n`); }
  }
  const bJson = n => readJson(`${B}/b${n}.json`), elf = readJson(`${B}/elf.json`);
  const list = Array.from({length: builds}, (_, i) => bJson(i + 1).wheel ?? {});
  const W = list[0].sha256 ?? null, equal = list.every(b => b.sha256 === W && W);
  const report = {schema: 'd09_prepare_report_v1', nonce, mode: ci ? 'ci' : 'local', capture, imageStore: store, createdAt: new Date().toISOString(), builds: list, equal, W, size: list[0].size ?? null,
    elf: elf.verdicts, cargoFetch: {ok: readJson(`${B}/cargo-fetch.json`).ok}, buildNegatives: {ok: readJson(`${B}/build-negatives.json`).ok}, records};
  await writeJson(`${B}/report.json`, report);
  const pinnedOk = inputs.rebuilt.sha256 === W;
  if (equal && W && (pinnedOk || !ci)) fs.copyFileSync(abs(B, 'b1', list[0].file), abs(S, 'inputs', inputs.rebuilt.path));
  const ok = equal && elf.ok && report.cargoFetch.ok && report.buildNegatives.ok && (!ci || pinnedOk);
  process.stdout.write(`${JSON.stringify({prepare: ok ? 'PASS' : 'FAIL', W, equal, pinnedW: inputs.rebuilt.sha256, ci, reportSha256: sha(fs.readFileSync(abs(B, 'report.json')))})}\n`);
  if (!ok) process.stderr.write(`D09-STOP prepare: equal=${equal} elf=${elf.ok} cargo=${report.cargoFetch.ok} negatives=${report.buildNegatives.ok} pinned=${pinnedOk}\n`);
  return ok ? 0 : 1;
}

// ---------------------------------------------------------------- summarize / selftest

function cmdSummarize() {
  const dir = abs(EV, 'cases');
  const cases = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
  const steps = fs.existsSync(abs(EV, 'steps')) ? fs.readdirSync(abs(EV, 'steps')).map(f => JSON.parse(fs.readFileSync(abs(EV, 'steps', f), 'utf8'))) : [];
  for (const s of steps) process.stdout.write(`STEP ${s.step} ok=${s.ok} durationMs=${s.durationMs}\n`);
  for (const c of cases.sort((a, b) => a.id.localeCompare(b.id))) process.stdout.write(`CASE ${c.id} ${c.kind} status=${c.status} exit=${c.exit}\n`);
  return 0;
}

export function importClosure(entries) {
  const seen = new Set(), queue = [...entries];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    for (const m of fs.readFileSync(abs(rel), 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
  return [...seen].sort();
}

// Synthetic GitHub API payloads for the reconcile selftest; values are invented, never fetched.
function syntheticReconcile() {
  const pin = {owner: 'aultramen', name: 'super-compound', fullName: 'aultramen/super-compound', baseRef: 'feature/standards-qualification', baseSha: '1'.repeat(40), headRef: 'feature/d09-source-verification', otherRunId: 38017280866};
  const head = '2'.repeat(40), merge = '3'.repeat(40), runId = 41000000001, repo = {full_name: pin.fullName}, image = {image: 'ubuntu-24.04', ImageVersion: '20261004.327.1', ImageOS: 'ubuntu24'};
  const env = expectedEnvDigests({GITHUB_REPOSITORY: pin.fullName, GITHUB_EVENT_NAME: 'pull_request', GITHUB_WORKFLOW_REF: `${pin.fullName}/.github/workflows/ci.yml@refs/pull/23/merge`,
    GITHUB_SHA: merge, GITHUB_HEAD_REF: pin.headRef, GITHUB_RUN_ID: String(runId), GITHUB_RUN_ATTEMPT: '1', GITHUB_JOB: JOB, RUNNER_OS: 'Linux', ImageOS: 'ubuntu24', ImageVersion: '20261004.327.1'});
  const outcomes = {schema: 'verification_outcomes_v1', taskId: 'D09-SOURCE-VERIFICATION-CI', criteria: []}, src = `${Q}/d09.mjs`, art = `${EV}/cases/a-T1-POS.json`;
  const job = {id: 7, name: JOB, status: 'completed', conclusion: 'success', run_id: runId, run_attempt: 1, head_sha: head, labels: ['ubuntu-24.04'], started_at: '2026-10-12T10:00:00Z', completed_at: '2026-10-12T11:00:00Z'};
  return {pin, pr: '23', nodeVersion: 'v24.15.0', jobName: JOB, nowMs: Date.parse('2026-10-12T12:00:00Z'),
    prJson: {number: 23, base: {ref: pin.baseRef, sha: pin.baseSha, repo}, head: {ref: pin.headRef, sha: head, repo}},
    runJson: {id: runId, run_attempt: 1, head_sha: head, head_branch: pin.headRef, event: 'pull_request', path: '.github/workflows/ci.yml', status: 'completed', conclusion: 'success', repository: repo, head_repository: repo, pull_requests: [{number: 23}]},
    jobsJson: {total_count: 2, jobs: [job, {...job, id: 8, name: 'verify (ubuntu-24.04, 22)'}]},
    artifactsJson: {artifacts: [{id: 9, name: `d09-evidence-${runId}-1`, expired: false, digest: `sha256:${'9'.repeat(64)}`, workflow_run: {id: runId, head_sha: head}}]},
    zipSha256: '9'.repeat(64), mergeJson: {sha: merge, parents: [{sha: pin.baseSha}, {sha: head}], tree: {sha: 'a'.repeat(40)}}, headCommitJson: {sha: head, tree: {sha: 'a'.repeat(40)}},
    image, checkout: {head, clean: true}, ident: {ci: {GITHUB_SHA: merge}}, outcomesSha256: '7'.repeat(64), outcomesJson: outcomes,
    receipt: {schema: 'verification_recipe_v1', id: 'd09-e2e-ci', taskId: 'D09-SOURCE-VERIFICATION-CI', contractPath: `${Q}/contract-ci.json`, recipeRef: `${Q}/recipe-e2e-ci.json`,
      outcomesPath: `${EV}/e2e-ci-outcomes.json`, timestamp: '2026-10-12T10:05:00Z', pass: true, cleanup: {pass: true}, contractDigest: '5'.repeat(64), recipeFileDigest: '6'.repeat(64),
      sources: [{ref: src, digest: '4'.repeat(64)}], outcomes, outcomesDigest: '7'.repeat(64), artifacts: [{ref: art, digest: '8'.repeat(64)}],
      environmentFingerprint: {platform: 'linux', nodeVersion: 'v24.15.0', inputs: CI_ENV.map(name => ({name, digest: env[name]}))}},
    local: {contract: '5'.repeat(64), recipe: '6'.repeat(64), required: [src], sources: new Map([[src, '4'.repeat(64)]])}, downloaded: new Map([[art, '8'.repeat(64)]])};
}
function zipOf(entries) {  // tiny writer for the readZip selftest only
  const parts = [], central = []; let off = 0;
  for (const [name, data, method] of entries) {
    const body = method === 8 ? zlib.deflateRawSync(data) : data, n = Buffer.from(name), crc = zlib.crc32(data), lh = Buffer.alloc(30), ch = Buffer.alloc(46);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, n, body); central.push(ch, n); off += 30 + n.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

async function cmdSelftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`selftest: ${msg}`); };
  const throws = (fn, msg) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, msg); };
  const lock = parseLock(fs.readFileSync(abs(Q, 'requirements-linux-cp312.txt'), 'utf8'));
  const w = readJson(`${Q}/inputs.json`).rebuilt.sha256;  // PENDING until the D14 slot fill
  assert(lock.size === 31 && lock.get('rfc3161-client').hashes.join() === (w === 'PENDING' ? 'PENDING_W' : w) && lock.get('pydantic').extras.join() === 'email', 'capsule lock parse');
  for (const bad of ['x==1 \\\n    --hash=md5:abc\n', '    --hash=sha256:' + 'a'.repeat(64) + '\n', 'x==1\n']) throws(() => parseLock(bad), `bad lock accepted ${bad}`);
  // docker argv: hardening flags and the dead resolver (S7) on every network mode
  const dead = x => x[x.indexOf('--dns') + 1] === '127.0.0.1' && x[x.indexOf('--dns-search') + 1] === '.' && x.filter(f => f === '--dns').length === 1;
  const a = dockerArgs({image: 'img@sha256:x', nonce: 'abc', argv: ['true'], mounts: [{source: '/r/q', target: '/q', readonly: true}]});
  for (const flag of ['--rm', '--read-only', '--cap-drop', '--security-opt', '--pids-limit', '--network']) assert(a.includes(flag), `docker flag ${flag}`);
  assert(dead(a) && a[a.indexOf('--network') + 1] === 'none' && a.includes('d09.run=abc') && a.includes('10001:10001') && a.includes('type=bind,source=/r/q,target=/q,readonly'), 'docker none args');
  const b = dockerArgs({image: 'i', nonce: 'n', network: 'bridge', hosts: [{host: 'h', ip: '1.2.3.4'}], argv: ['x']});
  assert(dead(b) && b.includes('h:1.2.3.4') && !b.includes('--network'), 'docker bridge args');
  throws(() => mountSpec({source: 'C:/a,b', target: '/q'}), 'comma mount rejected');
  throws(() => dockerArgs({image: 'i', nonce: 'n', network: 'host', argv: ['x']}), 'host network rejected');
  assert(envFingerprintInputs(['X'], {X: '1'})[0].digest === sha('{"present":true,"value":"1"}') && envFingerprintInputs(['Y'], {})[0].digest === sha('{"present":false,"value":null}'), 'env digest');
  // S5 node identity, step exit and printed STOP form
  assert(nodeCheck('v24.15.0', 'v24.15.0').ok && !nodeCheck('v24.15.0', 'v24.16.0').ok && !nodeCheck(undefined, 'v24.15.0').ok && nodeCheck('v1', 'v1').stop === 'S5', 'node identity is S5');
  assert(stepExit({ok: false, observeOnly: true, checks: [chk(PREPUB, false)]}) === 0 && stepExit({ok: false, observeOnly: true, checks: [chk(PREPUB, false), chk('x', false)]}) === 1
    && stepExit({ok: false, checks: [chk(PREPUB, false)]}) === 1 && PREPUB.startsWith('PREPUBLICATION: '), 'only PREPUBLICATION observations complete with a failing check');
  // I4 check-admission with clearly synthetic records (never an owner answer)
  const t = Date.parse('2026-10-11T00:00:00Z'), dispSha = sha('synthetic dispositions bytes');
  const disp = {schema: 'd09_security_dispositions_v1', capturedAt: '2026-10-10T20:15:16Z', sources: [], items: [{id: 'R-A', residual: true, stop: false, stopIfMapped: null},
    {id: 'R-B', residual: false, stop: false, stopIfMapped: 'S1', component: 'liblzma5'}, {id: 'R-C', residual: true, stop: false, stopIfMapped: null}]};
  const oa = {schema: 'genuine_user_decision/1', decision: 'APPROVE D14', answerVerbatim: 'SYNTHETIC SELFTEST RECORD - not an owner answer', packetSha256: 'a'.repeat(64),
    dispositionsSha256: dispSha, residuals: ['R-A', 'R-C'], label: 'owner self-review', recordedAt: '2026-10-10T21:00:00Z'};
  const se = {capturedAt: '2026-10-10T20:15:16Z', maxAgeHours: 168, dispositionsRef: DISPOSITIONS, dispositionsSha256: dispSha, residuals: ['R-A', 'R-C'], ownerAcceptance: oa};
  const adm = (s = se, d = disp, shaX = dispSha, now = t) => admissionIssues(s, d, {dispositionsSha256: shaX, now});
  const only = (issues, code, prefix) => issues.length === 1 && issues[0].code === code && issues[0].name.startsWith(prefix);
  assert(adm().length === 0, `synthetic structurally valid record admitted: ${JSON.stringify(adm())}`);
  const stale = adm(se, disp, dispSha, Date.parse('2026-10-18T00:00:00Z')), staleLine = stopLines('check-admission', stale.map(i => chk(i.name, false, i.observed, 'admission', i.code)))[0];
  assert(only(stale, 'S6', 'securityEvidence stale') && staleLine.startsWith(X4_STALE), `stale evidence prints ${X4_STALE}: ${staleLine}`);
  assert(only(adm({...se, ownerAcceptance: 'PENDING'}), 'S6', 'ownerAcceptance PENDING'), 'PENDING ownerAcceptance -> S6');
  for (const bad of [{by: 'owner'}, {...oa, schema: 'x'}, {...oa, decision: 'APPROVE D15'}, {...oa, answerVerbatim: ' '}, {...oa, packetSha256: 'A'.repeat(64)}, {...oa, dispositionsSha256: 'b'.repeat(64)},
    {...oa, residuals: ['R-C', 'R-A']}, {...oa, label: 'owner'}, {...oa, recordedAt: '2026-10-12T00:00:00Z'}, {...oa, recordedAt: '2026-10-10 21:00'}, {...oa, extra: 1}, 'APPROVE D14', null, true])
    assert(only(adm({...se, ownerAcceptance: bad}), 'S6', 'ownerAcceptance invalid'), `malformed ownerAcceptance -> S6: ${JSON.stringify(bad)}`);
  assert(adm({...se, residuals: ['R-A']}).some(i => i.code === 'S6' && i.name.startsWith('securityEvidence residuals')), 'residual list mismatch -> S6');
  assert(only(adm(se, {...disp, items: [...disp.items, {id: 'R-D', residual: true, stop: false}]}), 'S6', 'securityEvidence residuals'), 'unlisted dispositions residual -> S6');
  assert(only(adm({...se, maxAgeHours: 336}), 'S6', 'securityEvidence maxAgeHours'), 'maxAgeHours must be exactly 168');
  assert(only(adm(se, disp, 'c'.repeat(64)), 'S6', 'securityEvidence dispositionsSha256'), 'dispositions sha mismatch -> S6');
  assert(only(adm(se, {...disp, capturedAt: '2026-10-10T20:15:17Z'}), 'S6', 'securityEvidence capturedAt differs'), 'capturedAt mismatch -> S6');
  assert(only(adm({...se, dispositionsRef: `${Q}/other.json`}), 'S6', 'securityEvidence dispositionsRef'), 'unbound dispositions file -> S6');
  const stopped = adm(se, {...disp, items: disp.items.map(i => (i.id === 'R-B' ? {...i, stop: true} : i))});
  assert(only(stopped, 'S1', 'R-B declared stop') && only(adm(se, {...disp, items: disp.items.map(i => (i.id === 'R-A' ? {...i, stop: true} : i))}), 'S6', 'R-A declared stop without'), 'declared item STOP code');
  assert(adm(null, null, null).every(i => i.code === 'S6') && adm(null, null, null).length > 3, 'missing securityEvidence fails closed');
  // B10 leftovers: only own nonces are deleted; anything else fails init closed
  const listed = [...parseLabelled('container', 'c1 0123456789abcdef\nc2\n'), ...parseLabelled('volume', 'v-own 0123456789abcdef\nd09-prep0123456789ab-cargo prep0123456789ab\n')];
  const plan = planLeftovers(listed, new Set(['0123456789abcdef']));
  assert(plan.remove.map(r => r.id).join() === 'c1,v-own' && plan.foreign.map(r => r.id).join() === 'c2,d09-prep0123456789ab-cargo' && !plan.check.ok, 'foreign nonce leftover -> fail closed, never deleted');
  assert(planLeftovers([], new Set()).check.ok && planLeftovers(listed.slice(0, 1), new Set(['0123456789abcdef'])).check.ok, 'own leftovers only -> init proceeds');
  // I7 image store: Id is the config digest (classic) or the index digest (containerd), nothing else
  const inputs = readJson(`${Q}/inputs.json`), img = {RepoDigests: [`python@${inputs.image.index}`], RootFS: {Layers: inputs.image.diffIds}, Os: 'linux', Architecture: 'amd64'};
  assert(imageStore({Driver: 'overlay2', DriverStatus: [['Backing Filesystem', 'extfs']]}) === 'classic' && imageStore({Driver: 'overlayfs', DriverStatus: [['driver-type', 'io.containerd.snapshotter.v1']]}) === 'containerd'
    && imageStore({Driver: 'overlayfs'}) === 'unknown' && imageStore(null) === 'unknown', 'image store detection');
  assert(imageChecks([{...img, Id: inputs.image.config}], inputs, 'classic').every(c => c.ok && c.stop === 'S5') && imageChecks([{...img, Id: inputs.image.index}], inputs, 'containerd').every(c => c.ok), 'image checks pass');
  for (const [id, store] of [[inputs.image.index, 'classic'], [inputs.image.config, 'containerd'], [inputs.image.config, 'unknown'], [inputs.image.manifest, 'containerd']])
    assert(!imageChecks([{...img, Id: id}], inputs, store)[1].ok, `Id ${id} rejected for the ${store} store`);
  assert(imageChecks([{Id: inputs.image.index, RepoDigests: [], RootFS: {Layers: []}}], inputs, 'classic').every(c => !c.ok), 'image checks fail');
  // I2 W binding
  const W = {file: 'w.whl', sha256: 'd'.repeat(64), size: 10, reportSha256: 'e'.repeat(64)}, wh = {file: 'w.whl', sha256: 'd'.repeat(64), size: 10}, copy = {sha256: 'd'.repeat(64)};
  assert(rebuiltChecks('local', W, {reportSha256: 'e'.repeat(64), b1: [wh], b2: [wh], copy}).every(c => c.ok) && rebuiltChecks('ci', W, {reportSha256: 'f'.repeat(64), b1: [wh], b2: [], copy}).every(c => c.ok), 'I2 binding accepted');
  for (const [mode, o, pin = W] of [['local', {reportSha256: 'f'.repeat(64), b1: [wh], b2: [wh], copy}], ['local', {reportSha256: 'e'.repeat(64), b1: [wh], b2: [wh, wh], copy}],
    ['local', {reportSha256: 'e'.repeat(64), b1: [wh], b2: [{...wh, sha256: '0'.repeat(64)}], copy}], ['ci', {reportSha256: null, b1: [], b2: [], copy}], ['ci', {reportSha256: null, b1: [{...wh, file: 'x.whl'}], b2: [], copy}],
    ['local', {reportSha256: 'e'.repeat(64), b1: [wh], b2: [wh], copy: {sha256: '1'.repeat(64)}}], ['local', {reportSha256: 'PENDING', b1: [wh], b2: [wh], copy}, {...W, reportSha256: 'PENDING'}]])
    assert(rebuiltChecks(mode, pin, o).some(c => !c.ok && c.stop === 'S5'), `I2 rejects ${mode} ${JSON.stringify(o)}`);
  // B1/B9/D15 reconcile: one identity function; X5 substitutions each denied with their pinned reason (synthetic payloads)
  const rx = syntheticReconcile();
  assert(reconcileIdentity(rx).length === 0, `genuine synthetic identity accepted: ${reconcileIdentity(rx)}`);
  const otherRun = {...rx.runJson, id: rx.pin.otherRunId, head_sha: 'b'.repeat(40), head_branch: 'feature/standards-qualification', pull_requests: [{number: 22}]};
  const subs = x5Substitutions(rx, {run: otherRun, jobs: {total_count: 1, jobs: [{...rx.jobsJson.jobs[1], run_id: otherRun.id, head_sha: otherRun.head_sha}]}, artifacts: {artifacts: []}});
  assert(subs.map(s => s.pinned).join('|') === [envDeny('GITHUB_RUN_ID'), DENY.RUN_HEAD, envDeny('GITHUB_RUN_ATTEMPT'), envDeny('GITHUB_JOB')].join('|'), 'X5 substitutions');
  for (const s of subs) assert(reconcileIdentity(s.ctx).includes(s.pinned), `X5 ${s.label} denied with "${s.pinned}": ${reconcileIdentity(s.ctx)}`);
  const deny = (patch, reason) => assert(reconcileIdentity({...rx, ...patch(rx)}).includes(reason), `reconcile denies: ${reason}`);
  deny(x => ({prJson: {...x.prJson, base: {...x.prJson.base, repo: {full_name: 'fork/super-compound'}}}}), DENY.BASE_REPO);
  deny(x => ({prJson: {...x.prJson, head: {...x.prJson.head, repo: {full_name: 'fork/super-compound'}}}}), DENY.HEAD_REPO);
  deny(x => ({prJson: {...x.prJson, base: {...x.prJson.base, ref: 'main'}}}), DENY.BASE_REF);
  deny(x => ({prJson: {...x.prJson, base: {...x.prJson.base, sha: '0'.repeat(40)}}}), DENY.BASE_SHA);
  deny(() => ({ident: {ci: {GITHUB_SHA: 'Z'.repeat(40)}}}), DENY.SHA);
  deny(x => ({prJson: {...x.prJson, head: {...x.prJson.head, sha: '2'.repeat(39)}}}), DENY.SHA);
  deny(x => ({mergeJson: {...x.mergeJson, parents: [...x.mergeJson.parents].reverse()}}), DENY.MERGE);
  deny(x => ({mergeJson: {...x.mergeJson, tree: {sha: 'c'.repeat(40)}}}), DENY.TREE);
  deny(() => ({zipSha256: 'c'.repeat(64)}), DENY.ZIP);
  deny(x => ({nowMs: x.nowMs + FRESH_MS}), DENY.FRESH);
  deny(() => ({outcomesSha256: 'c'.repeat(64)}), DENY.OUTCOMES);
  deny(x => ({local: {...x.local, sources: new Map([[`${Q}/d09.mjs`, 'c'.repeat(64)]])}}), DENY.BIND);
  deny(() => ({downloaded: new Map()}), DENY.ARTIFACTS);
  deny(() => ({checkout: {head: '2'.repeat(40), clean: false}}), DENY.CHECKOUT);
  deny(x => ({jobsJson: {...x.jobsJson, jobs: [x.jobsJson.jobs[0], {...x.jobsJson.jobs[1], conclusion: 'skipped'}]}}), DENY.JOBS);
  deny(x => ({receipt: {...x.receipt, environmentFingerprint: {...x.receipt.environmentFingerprint, nodeVersion: 'v24.16.0'}}}), DENY.RECEIPT);
  deny(x => ({image: {...x.image, ImageVersion: null}}), DENY.IMAGE);
  deny(x => ({image: {...x.image, ImageVersion: '20261004.328.1'}}), envDeny('ImageVersion'));
  assert(reconcileIdentity({...rx, pin: undefined})[0].startsWith('reconcile input malformed'), 'malformed reconcile input fails closed');
  throws(() => repoPin({repository: {...rx.pin, fullName: 'fork/super-compound'}}), 'repository pin must equal owner/name');
  throws(() => repoPin({repository: {...rx.pin, baseSha: '1ef9c70'}}), 'short BASE_REV rejected');
  const log = ['\uFEFF2026-10-12T10:00:01.0000000Z Current runner version: \'2.330.0\'', '2026-10-12T10:00:01.0000000Z ##[group]Runner Image', '2026-10-12T10:00:01.0000000Z Image: ubuntu-24.04',
    '2026-10-12T10:00:01.0000000Z Version: 20261004.327.1', '2026-10-12T10:00:01.0000000Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20261004.327/images/ubuntu/Ubuntu2404-Readme.md',
    '2026-10-12T10:00:01.0000000Z ##[endgroup]'].join('\r\n'), parsed = runnerImageFromLog(log);
  assert(parsed.image === 'ubuntu-24.04' && parsed.ImageVersion === '20261004.327.1' && parsed.ImageOS === 'ubuntu24' && runnerImageFromLog('Version: 20261004.327.1').ImageVersion === null, 'runner image from the job log');
  const z = zipOf([['evidence/a.json', Buffer.from('{"a":1}'), 0], ['build/b1/w.txt', Buffer.from('x'.repeat(1000)), 8]]), files = readZip(z);
  assert(files.length === 2 && files[0].name === 'evidence/a.json' && files[1].data.toString() === 'x'.repeat(1000), 'zip read');
  const corrupt = Buffer.from(z); corrupt[30 + 'evidence/a.json'.length] ^= 1;
  throws(() => readZip(corrupt), 'zip CRC mismatch rejected');
  for (const bad of ['../x', '/abs', 'a/../b', 'C:/x', 'a\\b', 'a/./b', 'a./b']) throws(() => readZip(zipOf([[bad, Buffer.from('x'), 0]])), `zip entry ${bad} rejected`);
  throws(() => readZip(zipOf([['d.json', Buffer.from('1'), 0], ['D.json', Buffer.from('2'), 0]])), 'duplicate zip entries rejected');
  const view = o => ({outcomes: {criteria: [{criterionId: 'AC-08', status: 'pass', counts: {total: 4, passed: 4, failed: 0, skipped: 0}}]}, cases: {'a-T1-POS': {status: 'pass', exit: 0}},
    manifests: [[{path: 'x'}], [{path: 'x'}]], probes: {'a-T1-POS': ['/usr/bin/x 1']}, ...o});
  assert(parityChecks(view(), view(), {ci: 'd'.repeat(64), pin: 'd'.repeat(64)}).every(c => c.ok), 'parity accepted');
  for (const [o, w] of [[{cases: {'a-T1-POS': {status: 'pass', exit: 1}}}], [{probes: {'a-T1-POS': ['/usr/bin/y 1']}}], [{manifests: [null, null]}], [{}, {ci: 'c'.repeat(64), pin: 'd'.repeat(64)}]])
    assert(parityChecks(view(o), view(), w ?? {ci: 'd'.repeat(64), pin: 'd'.repeat(64)}).some(c => !c.ok), `parity rejects ${JSON.stringify(o)}`);
  // repository data (inputs.json, cases.json, README, recipes, contracts, ci.yml)
  const pending = pendingSlots(inputs), d14 = ['rebuilt.sha256', 'rebuilt.size', 'rebuilt.reportSha256', 'debs', 'debianSuites.snapshot', 'securityEvidence.ownerAcceptance'];
  assert(pending.every(p => d14.includes(p)), `only D14 slots may be PENDING: ${pending}`);
  assert(SHA40.test(repoPin(inputs).baseSha) && /^v\d+\.\d+\.\d+$/.test(inputs.host?.nodeVersion ?? '') && inputs.securityEvidence?.maxAgeHours === MAX_AGE_HOURS, 'inputs repository/host/securityEvidence pins');
  assert(inputFiles(inputs).length === 4 + 30 + 1 + 1 + 1 + 1 + 5 + (Array.isArray(inputs.debs) ? inputs.debs.length : 0) && inputs.wheels.length === 30, 'input file enumeration');
  assert(keepOnWipe('e2e-local-receipt.json') && !keepOnWipe('e2e-local-outcomes.json') && !keepOnWipe('cases'), 'wipe filter');
  const cases = readJson(`${Q}/cases.json`), x4 = x4Pins(cases.challenges.X4);
  assert(x4.length > 1 && x4.every(p => staleLine.includes(p)), `cases.json X4 pins ${JSON.stringify(x4)} match the emitted stale line`);
  const sub = new Set(Object.keys(COMMANDS));
  const recipes = Object.fromEntries(['e2e-local', 'e2e-ci', 'challenges', 'reconcile'].map(n => [n, readJson(`${Q}/recipe-${n}.json`)]));
  for (const [n, r] of Object.entries(recipes)) {
    assert(r.timeoutMs <= 60000 && r.environment === 'REAL' && r.recipeRef === `${Q}/recipe-${n}.json` && r.evidencePath.startsWith(`${EV}/`) && r.outcomesPath.startsWith(`${EV}/`) && same(r.sourceRefs, SOURCE_REFS), `recipe ${n} identity`);
    for (const phase of ['doctor', 'drive', 'cleanup']) {
      assert(r[phase].length <= 20 && (phase === 'cleanup' || r[phase].length > 0), `recipe ${n} ${phase} size`);
      for (const s of r[phase]) assert(s.command === 'node' && s.args[0] === `${Q}/d09.mjs` && sub.has(s.args[1]) && s.args.length <= 100, `recipe ${n} step ${s.args}`);
    }
  }
  assert(['doctor', 'drive', 'cleanup'].every(p => same(recipes['e2e-local'][p], recipes['e2e-ci'][p])), 'local/ci argv identical');
  assert(same(recipes['e2e-local'].doctor.map(s => s.args.slice(1).join(' ')), ['init', 'check-admission', 'check-inputs', 'doctor-image', 'wheel-audit', 'probe-runtime', 'install a', 'install b', 'install tools', 'compare', 'linkage']), 'doctor order (wheel-audit after doctor-image)');
  assert(same(recipes['e2e-ci'].envRefs, CI_ENV) && !recipes['e2e-local'].envRefs && same(recipes.reconcile.envRefs, ['D09_PR']), 'envRefs');
  const closure = importClosure(['.agent/tools/verified-promise.mjs', `${Q}/d09.mjs`]);
  assert(closure.length >= 8 && closure.every(f => SOURCE_REFS.includes(f)), `gate import closure bound: ${closure.filter(f => !SOURCE_REFS.includes(f))}`);
  for (const ref of SOURCE_REFS) { const st = fs.lstatSync(abs(ref)); assert(st.isFile() && !st.isSymbolicLink() && st.size <= MAX, `source ${ref} is a bounded regular file`); }
  const readme = fs.readFileSync(abs(Q, 'README.md'), 'utf8');
  for (const name of ['contract-local.json', 'contract-ci.json']) {
    const contract = readJson(`${Q}/${name}`), seen = new Set();
    assert(contract.replayRequired === true && contract.schema === 'completion_contract_v1' && same(contract.sourceRefs, SOURCE_REFS), `${name} replayRequired and sourceRefs`);
    for (const c of contract.criteria) {
      assert(c.recipeRef && fs.existsSync(abs(c.recipeRef)) && readJson(c.recipeRef).contractPath === `${Q}/${name}` && !seen.has(c.expected), `${name} ${c.id} binding`);
      seen.add(c.expected);
      for (const ref of c.requirementRefs) assert(readme.includes(`<a id="${ref.split('#')[1].toLowerCase()}"></a>`), `${name} ${c.id} anchor ${ref}`);
    }
  }
  assert(cases.groups.length === 9 && cases.groups.every(g => g.length <= 4) && recipes['e2e-local'].drive.filter(s => s.args[1] === 'cases').length === cases.groups.length, 'case groups');
  const ci = fs.readFileSync(abs('.github/workflows/ci.yml'), 'utf8');
  for (const pin of ['actions/checkout@11d5960a326750d5838078e36cf38b85af677262', 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020', 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    'node .github/qualification/d09/d09.mjs prepare --ci', 'node .agent/tools/verified-promise.mjs --contract .github/qualification/d09/contract-ci.json --replay',
    '            .scratch/d09/evidence/\n            .scratch/d09/build/\n']) assert(ci.includes(pin), `ci.yml ${JSON.stringify(pin)}`);
  process.stdout.write('{"selftest":"d09.mjs","ok":true}\n');
  return 0;
}

const COMMANDS = {
  prepare: a => cmdPrepare(a), init: () => cmdInit(), 'check-admission': () => cmdCheckAdmission(), 'check-inputs': () => cmdCheckInputs(), 'doctor-image': () => cmdDoctorImage(),
  'wheel-audit': () => cmdWheelAudit(), 'probe-runtime': () => cmdProbeRuntime(), install: a => cmdInstall(a[0]), compare: () => cmdCompare(), linkage: () => cmdLinkage(), tuf: a => cmdTuf(a[0]),
  cases: a => cmdCases(a[0]), 'tsa-direct': () => cmdTsaDirect(), 'rfc3161-tests': () => cmdRfcTests(), 'admission-negatives': () => cmdAdmissionNegatives(),
  'guard-selftest': () => cmdGuardSelftest(), challenge: a => cmdChallenge(a[0]), outcomes: a => cmdOutcomes(a[0]), cleanup: () => cmdCleanup(),
  reconcile: a => cmdReconcile(a[0]), summarize: () => cmdSummarize(), selftest: () => cmdSelftest(),
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sub, ...rest] = process.argv.slice(2);
  if (!COMMANDS[sub]) { process.stderr.write(`usage: node ${Q}/d09.mjs (${Object.keys(COMMANDS).join('|')}) ...\n`); process.exitCode = 2; }
  else {
    try { process.exitCode = await COMMANDS[sub](rest); } catch (error) { process.stderr.write(`D09-STOP ${sub}: ${error.message}\n`); process.exitCode = 1; }
  }
}
