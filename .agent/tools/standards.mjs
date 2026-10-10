import {createHash} from 'node:crypto';
import {readdir, readFile, lstat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBoundedFile, resolveRepositoryPath, writeFileAtomic} from './file-state.mjs';

export const standardsHash = value => createHash('sha256').update(value).digest('hex');
export const standardsJsonHash = value => standardsHash(JSON.stringify(value));

const CONFIG = '.agent/rules/project-config.md';
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const ignored = new Set(['.git', '.agent', '.scratch', '.super-compound', '.debug', 'node_modules', '.venv', 'venv', '__pycache__', '.next', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.turbo']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const under = (file, directory) => directory === '.' || file === directory || file.startsWith(directory + '/');
export function standardsPath(value) {
  if (!text(value) || /[\0\r\n:*?]/.test(value) || path.isAbsolute(value) || /^[\\/]/.test(value)) throw new Error('Standards paths must be repository-relative directory prefixes');
  const result = value.replaceAll('\\', '/').replace(/\/$/, '');
  if (result === '.') return result;
  if (result.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Standards path traversal or ambiguous directory prefix');
  return result;
}
export function parseStandardsConfig(markdown) {
  const source = markdown.replace(/\r\n?/g, '\n');
  const starts = [...source.matchAll(/^```json super-compound-standards[ \t]*\n/gm)];
  if (!starts.length) return null;
  if (starts.length !== 1) throw new Error('Exactly one super-compound-standards block is permitted');
  const tail = source.slice(starts[0].index + starts[0][0].length);
  const end = /^```[ \t]*$/m.exec(tail);
  if (!end) throw new Error('Unterminated standards configuration block');
  const config = JSON.parse(tail.slice(0, end.index));
  if (config?.schema !== 'project_standards_v1' || typeof config.enabled !== 'boolean') throw new Error('Unsupported project standards schema or enabled flag');
  return config;
}
function command(value, label) {
  if (!value || !text(value.command) || /[\0\r\n]/.test(value.command) || !Array.isArray(value.args) || value.args.length > 100 || value.args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new Error(`${label} requires executable and argv, never shell code`);
}
function validateChecks(checks = {}) {
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) throw new Error('Scope checks must be an object');
  for (const [id, check] of Object.entries(checks)) {
    if (!ID.test(id)) throw new Error('Invalid check ID');
    if (!check || typeof check !== 'object' || Array.isArray(check) || Object.keys(check).some(key => !['method', 'command', 'args', 'cwd', 'tool', 'configRefs', 'timeoutMs', 'resultRef', 'observationRef'].includes(key))) throw new Error('Unknown/reserved check binding field');
    if (check.configRefs !== undefined && (!Array.isArray(check.configRefs) || check.configRefs.length > 100)) throw new Error('Bounded check configRefs required');
    if (check.configRefs) check.configRefs = check.configRefs.map(standardsPath);
    if (check.method === 'manual') {
      if (id !== 'review') throw new Error('Only the design review check may use manual observations; deterministic controls cannot be downgraded');
      if (check.command) throw new Error('Manual checks cannot execute commands');
      if (check.observationRef !== undefined) standardsPath(check.observationRef);
      continue;
    }
    if (id === 'review') throw new Error('Substantive design review requires a manual observation; command success cannot replace human judgment');
    command(check, `Check ${id}`);
    command(check.tool, `Tool identity ${id}`);
    if (!text(check.tool.version)) throw new Error(`Pinned tool version required: ${id}`);
    if (check.cwd !== undefined) standardsPath(check.cwd);
    if (check.resultRef !== undefined) standardsPath(check.resultRef);
    if (check.timeoutMs !== undefined && (!Number.isSafeInteger(check.timeoutMs) || check.timeoutMs < 1 || check.timeoutMs > 1800000)) throw new Error('Check timeout must be 1..1800000ms');
  }
}
const soloPolicyRef = '.agent/standards/solo-owner.md';
const validLogin = value => typeof value === 'string' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
function reviewAuthoritySettings(value) {
  const fields = ['mode', 'contractVersion', 'policyRef', 'policyDigest', 'provider', 'ownerLogin', 'expiresAt', 'maxAgeHours'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))
    || value.mode !== 'solo-owner' || value.contractVersion !== '1.0.0' || value.provider !== 'github'
    || value.policyRef !== soloPolicyRef || !HASH.test(value.policyDigest ?? '') || !validLogin(value.ownerLogin)) throw new Error('Unsupported or malformed SOLO-OWNER review authority');
  const maxAgeHours = value.maxAgeHours ?? 24;
  if (!Number.isSafeInteger(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 24) throw new Error('Solo review age must be 1..24 hours');
  return {...value, maxAgeHours};
}
function authorityTime(value) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) throw new Error('Canonical UTC owner appointment time required');
  return time;
}
// This validates pinned local evidence; authenticated protected-base verification owns CI authority.
export function resolveOwnerReviewAuthority(config, policyBytes, approvalBytes, {now = new Date()} = {}) {
  const settings = reviewAuthoritySettings(config?.adoption?.reviewAuthority);
  if (config.enabled !== true || !text(config.adoption.owner) || !HASH.test(config.adoption.approvalDigest ?? '')
    || standardsHash(policyBytes) !== settings.policyDigest || standardsHash(approvalBytes) !== config.adoption.approvalDigest) throw new Error('Solo policy or owner appointment digest mismatch');
  const approvalRef = standardsPath(config.adoption.approvalRef);
  let appointment;
  try { appointment = JSON.parse(Buffer.from(approvalBytes).toString('utf8')); } catch { throw new Error('Structured solo owner appointment required'); }
  const fields = ['schema', 'contractVersion', 'status', 'owner', 'ownerLogin', 'repository', 'scopes', 'policyDigest', 'approvedAt', 'expiresAt'];
  if (!appointment || typeof appointment !== 'object' || Array.isArray(appointment) || Object.keys(appointment).some(key => !fields.includes(key))
    || appointment.schema !== 'standards_owner_appointment_v1' || appointment.contractVersion !== '1.0.0' || appointment.status !== 'approved'
    || appointment.owner !== config.adoption.owner || appointment.ownerLogin !== settings.ownerLogin || appointment.policyDigest !== settings.policyDigest
    || !/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(appointment.repository ?? '') || appointment.repository.length > 140
    || appointment.repository.split('/').some(part => part === '.' || part === '..')
    || !Array.isArray(appointment.scopes) || !appointment.scopes.length || appointment.scopes.length > 100) throw new Error('Invalid, revoked or mismatched scoped owner appointment');
  const scopes = appointment.scopes.map(standardsPath).sort();
  const configured = config.scopes?.map(scope => standardsPath(scope.path)).sort();
  if (new Set(scopes).size !== scopes.length || JSON.stringify(scopes) !== JSON.stringify(configured)) throw new Error('Owner appointment must cover exactly the configured directory scopes');
  const approvedAt = authorityTime(appointment.approvedAt), expiresAt = authorityTime(appointment.expiresAt);
  const current = new Date(now).getTime();
  if (!Number.isFinite(current) || approvedAt > current || expiresAt <= current || expiresAt <= approvedAt
    || expiresAt - approvedAt > 30 * 86400000 || settings.expiresAt !== appointment.expiresAt) throw new Error('Expired, future or over-30-day owner appointment');
  return {...settings, owner: appointment.owner, repository: appointment.repository, scopes,
    approvedAt: appointment.approvedAt, approvalRef, approvalDigest: config.adoption.approvalDigest};
}
function validateConfig(config) {
  if (config.adoption?.reviewAuthority !== undefined) reviewAuthoritySettings(config.adoption.reviewAuthority);
  if (!Array.isArray(config.scopes) || !config.scopes.length || config.scopes.length > 100) throw new Error('Active standards require bounded explicit directory scopes');
  const seen = new Set();
  for (const scope of config.scopes) {
    scope.path = standardsPath(scope.path);
    if (seen.has(scope.path)) throw new Error(`Duplicate/conflicting standards scope: ${scope.path}`);
    seen.add(scope.path);
    for (const field of ['configRefs', 'dependsOn']) {
      if (scope[field] !== undefined && (!Array.isArray(scope[field]) || scope[field].length > 100)) throw new Error(`Bounded scope ${field} required`);
      scope[field] = (scope[field] ?? []).map(standardsPath);
    }
    validateChecks(scope.checks);
  }
  if (!Array.isArray(config.exceptions ?? []) || (config.exceptions ?? []).length > 100) throw new Error('Bounded standards exceptions required');
}
async function inventoryFor(root, directories, excluded, targets) {
  const records = new Map();
  let bytes = 0;
  async function walk(ref) {
    const absolute = await resolveRepositoryPath(root, ref, {allowRoot: true});
    for (const entry of (await readdir(absolute, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ignored.has(entry.name)) continue;
      const file = ref === '.' ? entry.name : ref + '/' + entry.name;
      if (excluded.has(file)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Standards source scope contains a symlink: ${file}`);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && !records.has(file)) {
        if (records.size >= 20000) throw new Error('Standards inventory exceeds 20000 files');
        const content = await readBoundedFile(root, file, {maxBytes: 4 * 1024 * 1024});
        bytes += content.length;
        if (bytes > 64 * 1024 * 1024) throw new Error('Standards source scope exceeds 64MiB; narrow configured modules');
        records.set(file, {ref: file, digest: standardsHash(content)});
      }
    }
  }
  for (const directory of [...new Set(directories)].sort()) await walk(directory);
  for (const ref of targets.filter(target => directories.some(directory => under(target, directory)))) {
    if (records.has(ref) || excluded.has(ref)) continue;
    const absolute = await resolveRepositoryPath(root, ref, {allowRoot: true});
    const info = await lstat(absolute).catch(error => {if (error.code !== 'ENOENT') throw error; return null;});
    if (info?.isDirectory()) await walk(ref);
    else if (!info) records.set(ref, {ref, digest: null});
    else if (info.isFile()) {
      const content = await readBoundedFile(root, ref, {maxBytes: 4 * 1024 * 1024});
      bytes += content.length;
      if (records.size >= 20000 || bytes > 64 * 1024 * 1024) throw new Error('Standards explicit source inventory exceeds bounded module size');
      records.set(ref, {ref, digest: standardsHash(content)});
    }
  }
  return [...records.values()].sort((a, b) => a.ref.localeCompare(b.ref));
}

export async function resolveEffectiveStandards(root, paths, {now = new Date()} = {}) {
  const result = {schema: 'effective_standards_v1', status: 'legacy', paths: [],
    scopes: [], rules: [], checks: [], inputs: [], inventory: [], conflicts: [],
    limitations: ['No active pinned standards configuration; organizational compliance is not established.']};
  result.engine = [];
  for (const name of ['standards.mjs', 'standards-checks.mjs', 'file-state.mjs', '../standards/tools/python-manifest.py']) result.engine.push({name, digest: standardsHash(await readFile(new URL(name, import.meta.url)))});
  const inputs = new Map();
  async function capture(ref) {
    ref = standardsPath(ref.split('#')[0]);
    const bytes = await readBoundedFile(root, ref, {maxBytes: 4 * 1024 * 1024});
    inputs.set(ref, {ref, digest: standardsHash(bytes)});
    return bytes;
  }
  async function approval(record, label) {
    if (!text(record?.owner) || !text(record.approvalRef) || !HASH.test(record.approvalDigest ?? '') || standardsHash(await capture(record.approvalRef)) !== record.approvalDigest) throw new Error(`${label} owner approval reference/digest required or stale`);
  }
  async function bundle(pin) {
    if (!text(pin?.ref) || !text(pin.version) || !HASH.test(pin.digest ?? '')) throw new Error('Explicit standards bundle version/hash pin required');
    const bytes = await capture(pin.ref);
    if (standardsHash(bytes) !== pin.digest) throw new Error(`Standards bundle hash drift: ${pin.ref}`);
    const value = JSON.parse(bytes.toString('utf8'));
    if (value.schema !== 'standards_bundle_v1' || !ID.test(value.id ?? '') || value.version !== pin.version || !Array.isArray(value.rules) || value.rules.length > 100) throw new Error(`Unsupported/mismatched standards bundle: ${pin.ref}`);
    const seen = new Set();
    for (const rule of value.rules) {
      if (!ID.test(rule.id ?? '') || seen.has(rule.id) || !['mandatory', 'recommendation'].includes(rule.level) || !text(rule.owner) || !text(rule.source) || (rule.check !== null && !ID.test(rule.check ?? '')) || (rule.level === 'mandatory' && !rule.check)) throw new Error('Invalid/duplicate standards rule or missing owner/source/check');
      seen.add(rule.id);
      await capture(rule.source);
    }
    return {...value, ref: pin.ref, digest: pin.digest};
  }
  try {
    if (!Array.isArray(paths) || !paths.length || paths.length > 20000) throw new Error('Bounded nonempty change paths required');
    result.paths = [...new Set(paths.map(standardsPath))].sort();
    let markdown;
    try { markdown = (await capture(CONFIG)).toString('utf8'); }
    catch (error) { if (!error.message.startsWith('File does not exist:')) throw error; }
    const config = markdown === undefined ? null : parseStandardsConfig(markdown);
    if (!config?.enabled) {
      result.inputs = [...inputs.values()];
      result.effectiveStandardsDigest = standardsJsonHash({status: 'legacy', inputs: result.inputs});
      return result;
    }
    validateConfig(config);
    await approval(config.adoption, 'Standards adoption');
    if (config.adoption.reviewAuthority !== undefined) {
      result.reviewAuthority = resolveOwnerReviewAuthority(config, await capture(config.adoption.reviewAuthority.policyRef), await capture(config.adoption.approvalRef), {now});
      result.engine.push({name: 'standards-github-review.mjs', digest: standardsHash(await readFile(new URL('standards-github-review.mjs', import.meta.url)))});
    }
    const core = await bundle(config.core);
    if (core.id !== 'core') throw new Error('Core policy bundle required');
    result.limitations = [];
    if (result.reviewAuthority) result.limitations.push('Owner self-review only (SOLO-OWNER/1.0.0); local evidence is not authenticated CI authority or independent G1/G2/G3 approval.');
    const policyFile = file => file === CONFIG || under(file, '.agent/standards') || file === config.adoption.approvalRef.split('#')[0];
    const policyChange = result.paths.some(policyFile);
    const inheritedChecks = scope => Object.assign({}, ...config.scopes.filter(ancestor => under(scope.path, ancestor.path)).sort((a, b) => a.path.length - b.path.length).map(ancestor => ancestor.checks ?? {}));
    const sharedInput = (scope, file) => scope.configRefs.includes(file) || scope.dependsOn.some(dependency => under(file, dependency)) || Object.values(inheritedChecks(scope)).some(check => check.configRefs?.includes(file));
    const selected = new Set();
    for (const file of result.paths) {
      const candidate = config.scopes.filter(scope => under(file, scope.path)).sort((a, b) => b.path.length - a.path.length)[0];
      if (candidate) selected.add(candidate.path);
      else if (!policyFile(file) && !config.scopes.some(scope => sharedInput(scope, file))) throw new Error(`No configured standards scope covers change: ${file}`);
      for (const scope of config.scopes) if (policyChange || sharedInput(scope, file)) selected.add(scope.path);
    }
    const exceptions = config.exceptions ?? [];
    for (const exception of exceptions) {
      exception.scope = standardsPath(exception.scope);
      if (!config.scopes.some(scope => scope.path === exception.scope) || !text(exception.owner) || !text(exception.reason) || !Array.isArray(exception.ruleIds) || !exception.ruleIds.length || exception.ruleIds.some(id => !ID.test(id)) || new Set(exception.ruleIds).size !== exception.ruleIds.length || !Number.isFinite(Date.parse(exception.expiresAt))) throw new Error('Invalid standards exception');
      if (selected.has(exception.scope)) {
        if (Date.parse(exception.expiresAt) <= new Date(now).getTime()) throw new Error('Expired standards exception');
        await approval(exception, 'Standards exception');
      }
    }
    for (const scope of config.scopes.filter(scope => selected.has(scope.path)).sort((a, b) => a.path.localeCompare(b.path))) {
      const configuredProfile = scope.profile ? await bundle(scope.profile) : null;
      const profile = configuredProfile && ['nextjs-typescript', 'fastapi-python'].includes(configuredProfile.id) && configuredProfile.framework ? configuredProfile : null;
      if (!profile) result.limitations.push(`${scope.path}: core and repository conventions only; complete framework validation is unavailable.${configuredProfile ? ` Unsupported profile ${configuredProfile.id}.` : ''}`);
      const rules = [...core.rules, ...(profile?.rules ?? [])];
      if (new Set(rules.map(rule => rule.id)).size !== rules.length) throw new Error('A profile cannot override or downgrade a core rule');
      for (const ref of scope.configRefs) await capture(ref);
      if (profile?.framework) {
        const manifestRef = scope.path === '.' ? profile.framework.manifest : scope.path + '/' + profile.framework.manifest;
        const manifest = (await capture(manifestRef)).toString('utf8');
        if (!text(scope.frameworkVersion)) throw new Error(`Explicit framework version required: ${scope.path}`);
        if (profile.framework.manifest === 'package.json') {
          const pkg = JSON.parse(manifest);
          const declared = pkg.dependencies?.[profile.framework.dependency] ?? pkg.devDependencies?.[profile.framework.dependency];
          if (!text(declared)) throw new Error(`Configured framework conflicts with manifest: ${scope.path}`);
          if (/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(declared)) {
            if (declared !== scope.frameworkVersion) throw new Error(`Configured framework/version conflicts with manifest: ${scope.path}`);
          } else result.limitations.push(`${scope.path}: manifest uses ${declared}; frozen dependency installation must corroborate pinned framework version ${scope.frameworkVersion}.`);
        } else {
          const script = fileURLToPath(new URL('../standards/tools/python-manifest.py', import.meta.url));
          let evidence;
          for (const executable of ['python', 'python3']) {
            const parsed = spawnSync(executable, [script, '--input', await resolveRepositoryPath(root, manifestRef)], {cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true});
            if (parsed.error?.code === 'ENOENT') continue;
            if (parsed.status !== 0 || parsed.error) throw new Error('Python manifest evidence requires Python 3.11+ and a valid supported TOML dependency declaration');
            evidence = JSON.parse(parsed.stdout); break;
          }
          const declared = evidence?.dependencies?.[profile.framework.dependency];
          if (!text(declared)) throw new Error(`Configured framework conflicts with Python manifest: ${scope.path}`);
          if (declared.startsWith('==')) {
            if (declared !== `==${scope.frameworkVersion}`) throw new Error(`Configured framework/version conflicts with Python manifest: ${scope.path}`);
          } else result.limitations.push(`${scope.path}: Python manifest uses ${declared}; frozen dependency installation must corroborate pinned framework version ${scope.frameworkVersion}.`);
        }
      }
      result.scopes.push({path: scope.path, profile: profile ? {id: profile.id, version: profile.version, digest: profile.digest} : null, dependsOn: scope.dependsOn});
      result.rules.push(...rules.map(rule => ({...rule, scope: scope.path})));
      for (const exception of exceptions.filter(exception => exception.scope === scope.path)) if (exception.ruleIds.some(id => !rules.some(rule => rule.id === id))) throw new Error('Exception refers to an unknown rule');
      const checks = new Map();
      const inheritedBindings = inheritedChecks(scope);
      for (const rule of rules.filter(rule => rule.level === 'mandatory' && rule.check)) {
        if (!checks.has(rule.check)) checks.set(rule.check, []);
        checks.get(rule.check).push(rule.id);
      }
      for (const id of Object.keys(inheritedBindings).filter(id => !checks.has(id)).sort()) result.limitations.push(`${scope.path}: configured check ${id} is not scheduled because no adopted mandatory rule refers to it; its result is not covered by this standards receipt.`);
      for (const [id, ruleIds] of [...checks].sort(([a], [b]) => a.localeCompare(b))) {
        const binding = inheritedBindings[id];
        const waivedRules = ruleIds.filter(ruleId => exceptions.some(exception => exception.scope === scope.path && exception.ruleIds.includes(ruleId)));
        for (const ref of binding?.configRefs ?? []) await capture(ref);
        result.checks.push({...binding, key: `${scope.path}:${id}`, id, scope: scope.path, ruleIds, kind: binding?.method === 'manual' ? 'manual' : binding ? 'command' : 'missing', waivedRules, exceptions: exceptions.filter(exception => exception.scope === scope.path && exception.ruleIds.some(ruleId => ruleIds.includes(ruleId)))});
      }
    }
    const reportRefs = result.checks.map(check => check.resultRef).filter(Boolean);
    if (new Set(reportRefs).size !== reportRefs.length) throw new Error('Check results must have distinct output paths per scope');
    const excluded = new Set(reportRefs);
    result.inventory = await inventoryFor(root, result.scopes.flatMap(scope => [scope.path, ...scope.dependsOn]), excluded, result.paths);
    result.status = 'ready';
  } catch (error) {
    result.status = 'conflict';
    result.conflicts.push(error.message);
  }
  result.inputs = [...inputs.values()].sort((a, b) => a.ref.localeCompare(b.ref));
  const {inventory, effectiveStandardsDigest, ...effective} = result;
  result.effectiveStandardsDigest = standardsJsonHash(effective);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true});
  result.gitHead = head.status === 0 && /^[a-f0-9]{40,64}$/.test(head.stdout.trim()) ? head.stdout.trim() : null;
  result.sourceDigest = standardsJsonHash({gitHead: result.gitHead, inventory: result.inventory});
  return result;
}

export async function assertFreshStandards(root, snapshot, options = {}) {
  if (snapshot?.schema !== 'effective_standards_v1' || snapshot.status !== 'ready') throw new Error('Ready effective standards snapshot required');
  const current = await resolveEffectiveStandards(root, snapshot.paths, options);
  if (current.status !== 'ready' || current.effectiveStandardsDigest !== snapshot.effectiveStandardsDigest || current.sourceDigest !== snapshot.sourceDigest) throw new Error('Stale/conflicting effective standards, configuration, or source inventory');
  if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new Error('Effective standards snapshot was modified');
  return current;
}

async function main(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--paths-file', '--output', '--root'].includes(args[index]) || !args[index + 1] || values[args[index]]) throw new Error('Usage: standards.mjs --paths-file <JSON> [--output <snapshot>] [--root <project>]');
    values[args[index]] = args[index + 1];
  }
  const root = values['--root'] ?? process.cwd();
  const paths = JSON.parse(await readBoundedFile(root, values['--paths-file'], {encoding: 'utf8'}));
  const snapshot = await resolveEffectiveStandards(root, paths);
  if (values['--output']) {
    if (!under(standardsPath(values['--output']), '.scratch')) throw new Error('Generated standards snapshots must be under .scratch');
    const identity = async ref => {
      const absolute = await resolveRepositoryPath(root, ref);
      return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    };
    const destination = await identity(values['--output']);
    for (const ref of [values['--paths-file'], ...snapshot.inputs.map(input => input.ref), ...snapshot.inventory.map(input => input.ref)]) if (destination === await identity(ref)) throw new Error('Snapshot output must not overwrite the paths input, configuration or source');
    await writeFileAtomic(root, values['--output'], JSON.stringify(snapshot, null, 2) + '\n', {maxBytes: 4 * 1024 * 1024});
  } else process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
  if (snapshot.status !== 'ready') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => {process.stderr.write(`standards: ${error.message}\n`); process.exitCode = 2;});
