import {spawnSync} from 'node:child_process';
import {rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBoundedFile, resolveRepositoryPath, writeFileAtomic} from './file-state.mjs';
import {assertFreshStandards, standardsHash, standardsPath} from './standards.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0;
const json = async (root, ref) => JSON.parse(await readBoundedFile(root, ref, {encoding: 'utf8', maxBytes: 4 * 1024 * 1024}));
const generated = ref => {
  const normalized = standardsPath(ref);
  if (!normalized.startsWith('.scratch/')) throw new Error('Gate output/observation paths must be under .scratch');
  return normalized;
};
const timestamp = value => Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now() + 1000;
function outcome(value, {countsRequired = false} = {}) {
  if (value?.schema !== 'standards_check_outcome_v1' || !['pass', 'fail', 'skip'].includes(value.status) || !text(value.observed)) throw new Error('Actual normalized check outcome required');
  const counts = value.counts;
  if (countsRequired && !counts) throw new Error('Test gate requires actual assertion counts');
  if (counts && (!['total', 'passed', 'failed', 'skipped'].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0) || counts.total !== counts.passed + counts.failed + counts.skipped)) throw new Error('Invalid check assertion counts');
  return value.status === 'pass' && (!counts || (counts.total > 0 && counts.failed === 0 && counts.skipped === 0));
}
function inspection(value, snapshot, check) {
  if (value?.schema !== 'standards_review_v1' || value.checkKey !== check.key || value.standardsDigest !== snapshot.effectiveStandardsDigest || value.sourceDigest !== snapshot.sourceDigest || value.status !== 'pass' || !text(value.observer) || !text(value.observed) || !Array.isArray(value.steps) || !value.steps.length || value.steps.length > 100 || value.steps.some(step => !text(step)) || !timestamp(value.timestamp)) throw new Error('Fresh scoped human review observation required');
  if (snapshot.reviewAuthority) {
    const authority = snapshot.reviewAuthority, proof = value.provenance;
    const age = Date.now() - Date.parse(value.timestamp);
    if (!proof || proof.provider !== 'github' || proof.reviewAuthority !== 'owner-self-review' || proof.contractVersion !== authority.contractVersion
      || proof.policyDigest !== authority.policyDigest || proof.appointmentDigest !== authority.approvalDigest || typeof proof.repository !== 'string' || proof.repository.toLowerCase() !== authority.repository.toLowerCase()
      || value.observer.toLowerCase() !== `github:${authority.ownerLogin}`.toLowerCase() || proof.nativeState !== 'COMMENTED'
      || !Number.isSafeInteger(proof.number) || proof.number < 1 || !Number.isSafeInteger(proof.reviewId) || proof.reviewId < 1
      || !['headSha', 'baseSha', 'testedSha'].every(key => /^[a-f0-9]{40}$/.test(proof[key] ?? '')) || proof.testedSha !== snapshot.gitHead
      || !/^[a-f0-9]{64}$/.test(proof.reviewBodyDigest ?? '') || Date.parse(value.timestamp) < Date.parse(authority.approvedAt)
      || age > authority.maxAgeHours * 3600000 || Date.parse(authority.expiresAt) <= Date.now()) throw new Error('Fresh bound owner-self-review provenance required; local JSON is not CI authentication');
  }
}
function execute(step, cwd, timeoutMs) {
  const start = Date.now();
  const result = spawnSync(step.command, step.args, {cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024, windowsHide: true});
  // Store output fingerprints; scanner output can contain sensitive source text.
  return {command: step.command, args: step.args, exitCode: result.status, error: result.error?.code ?? null,
    stdoutDigest: standardsHash(result.stdout ?? ''), stderrDigest: standardsHash(result.stderr ?? ''),
    durationMs: Date.now() - start, version: (result.stdout || result.stderr || '').trim()};
}
async function artifact(root, ref) {
  const bytes = await readBoundedFile(root, ref, {maxBytes: 4 * 1024 * 1024});
  return {ref, digest: standardsHash(bytes)};
}
async function assertArtifact(root, record) {
  if (!record?.ref || !/^[a-f0-9]{64}$/.test(record.digest ?? '') || (await artifact(root, record.ref)).digest !== record.digest) throw new Error('Missing/stale gate result artifact');
}

export async function runStandardsChecks(root, snapshot, {outputRef, snapshotRef} = {}) {
  await assertFreshStandards(root, snapshot);
  if (outputRef) generated(outputRef);
  const protectedRefs = new Set([...snapshot.inputs, ...snapshot.inventory].map(input => input.ref));
  const identity = async ref => {
    const absolute = await resolveRepositoryPath(root, ref);
    return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
  };
  const protectedIdentities = new Set();
  for (const ref of [...protectedRefs, snapshotRef, ...snapshot.checks.map(check => check.observationRef)].filter(Boolean)) protectedIdentities.add(await identity(ref));
  const destinations = new Set();
  for (const ref of [outputRef, ...snapshot.checks.map(check => check.resultRef)].filter(Boolean)) {
    generated(ref);
    const destination = await identity(ref);
    if (protectedIdentities.has(destination)) throw new Error('Gate outputs must not overwrite input snapshots, sources or review observations');
    if (destinations.has(destination)) throw new Error('Gate outputs must not alias another report or receipt');
    destinations.add(destination);
  }
  const receipt = {schema: 'standards_receipt_v1', standardsDigest: snapshot.effectiveStandardsDigest,
    sourceDigest: snapshot.sourceDigest, limitations: snapshot.limitations, timestamp: new Date().toISOString(), results: [], pass: false};
  for (const check of snapshot.checks) {
    const result = {checkKey: check.key, ruleIds: check.ruleIds, scope: check.scope, status: 'not-run', observed: 'Required check has no executable or observation binding.'};
    receipt.results.push(result);
    if (check.waivedRules.length === check.ruleIds.length) {
      result.status = 'waived'; result.observed = 'Approved, scoped, unexpired rule exceptions; this is not a passing check.';
      continue;
    }
    try {
      if (check.kind === 'manual') {
        if (!check.observationRef) continue;
        generated(check.observationRef);
        const observed = await json(root, check.observationRef);
        inspection(observed, snapshot, check);
        result.artifact = await artifact(root, check.observationRef);
        result.status = 'pass'; result.observed = observed.observed;
      } else if (check.kind === 'command') {
        if (check.id === 'test' && !check.resultRef) {result.observed = 'Test check requires a fresh normalized resultRef with assertion counts.'; continue;}
        const cwd = await resolveRepositoryPath(root, check.cwd ?? check.scope, {allowRoot: true});
        const version = execute(check.tool, cwd, 10000);
        result.tool = {...version}; delete result.tool.version;
        result.tool.observedVersion = version.version;
        if (version.exitCode !== 0 || version.error || version.version !== check.tool.version) throw new Error('Pinned validation tool version mismatch or unavailable');
        if (check.resultRef) await rm(await resolveRepositoryPath(root, check.resultRef), {force: true});
        const execution = execute(check, cwd, check.timeoutMs ?? 300000);
        delete execution.version;
        result.execution = execution;
        if (execution.exitCode !== 0 || execution.error) {
          result.status = 'fail'; result.observed = `Check exited ${execution.exitCode ?? execution.error}; validation was unsuccessful.`;
          continue;
        }
        if (check.resultRef) {
          const report = await json(root, check.resultRef);
          result.artifact = await artifact(root, check.resultRef);
          const passed = outcome(report, {countsRequired: check.id === 'test'});
          result.status = passed ? 'pass' : report.status === 'skip' ? 'skip' : 'fail';
          result.observed = report.observed;
          if (report.counts) result.counts = report.counts;
        } else {
          result.status = 'pass'; result.observed = 'Pinned deterministic check executed successfully.';
        }
      }
    } catch (error) {result.status = 'error'; result.observed = error.message;}
  }
  const verdict = await verifyStandardsReceipt(root, snapshot, receipt);
  receipt.pass = verdict.allowed;
  receipt.issues = verdict.issues;
  if (outputRef) await writeFileAtomic(root, outputRef, JSON.stringify(receipt, null, 2) + '\n', {maxBytes: 4 * 1024 * 1024});
  return receipt;
}

export async function verifyStandardsReceipt(root, snapshot, receipt) {
  const issues = [];
  try {
    await assertFreshStandards(root, snapshot);
    if (receipt?.schema !== 'standards_receipt_v1' || receipt.standardsDigest !== snapshot.effectiveStandardsDigest || receipt.sourceDigest !== snapshot.sourceDigest || JSON.stringify(receipt.limitations) !== JSON.stringify(snapshot.limitations) || !timestamp(receipt.timestamp) || !Array.isArray(receipt.results) || receipt.results.length !== snapshot.checks.length || !snapshot.checks.length) throw new Error('Missing/wrong-scope/incomplete standards receipt');
    const records = new Map();
    for (const result of receipt.results) {
      if (!result || records.has(result.checkKey)) throw new Error('Duplicate/malformed required check result');
      records.set(result.checkKey, result);
    }
    for (const check of snapshot.checks) {
      const result = records.get(check.key);
      try {
        if (!result || result.scope !== check.scope || JSON.stringify(result.ruleIds) !== JSON.stringify(check.ruleIds)) throw new Error('Required check identity/scope mismatch');
        if (check.waivedRules.length === check.ruleIds.length) {
          if (result.status !== 'waived') throw new Error('Approved exception must be reported as waived, not pass');
          continue;
        }
        if (result.status !== 'pass' || !text(result.observed)) throw new Error(`Required check is ${result.status ?? 'not-run'}`);
        if (check.kind === 'manual') {
          if (result.artifact?.ref !== check.observationRef) throw new Error('Wrong human review artifact');
          await assertArtifact(root, result.artifact);
          inspection(await json(root, check.observationRef), snapshot, check);
        } else if (check.kind === 'command') {
          const matches = (step, expected) => step?.command === expected.command && JSON.stringify(step.args) === JSON.stringify(expected.args) && step.exitCode === 0 && step.error === null && /^[a-f0-9]{64}$/.test(step.stdoutDigest ?? '') && /^[a-f0-9]{64}$/.test(step.stderrDigest ?? '') && Number.isSafeInteger(step.durationMs) && step.durationMs >= 0;
          if (!matches(result.tool, check.tool) || result.tool.observedVersion !== check.tool.version || !matches(result.execution, check)) throw new Error('Missing/mismatched actual tool and check execution');
          const cwd = await resolveRepositoryPath(root, check.cwd ?? check.scope, {allowRoot: true});
          const currentTool = execute(check.tool, cwd, 10000);
          if (currentTool.exitCode !== 0 || currentTool.error || currentTool.version !== check.tool.version) throw new Error('Current pinned validation tool version mismatch or unavailable');
          if (check.resultRef) {
            if (result.artifact?.ref !== check.resultRef) throw new Error('Wrong check result artifact');
            await assertArtifact(root, result.artifact);
            const report = await json(root, check.resultRef);
            if (!outcome(report, {countsRequired: check.id === 'test'}) || JSON.stringify(report.counts) !== JSON.stringify(result.counts) || report.observed !== result.observed) throw new Error('Failed/skipped/empty test outcome or receipt mismatch');
          } else if (check.id === 'test') throw new Error('Actual assertion report required for test gate');
        } else throw new Error('Required check was never configured');
      } catch (error) {issues.push(`${check.key}: ${error.message}`);}
    }
  } catch (error) {issues.push(error.message);}
  return {allowed: issues.length === 0, issues};
}

async function main(args) {
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--verify') {if (values[flag]) throw new Error('Duplicate --verify'); values[flag] = true; continue;}
    if (!['--snapshot', '--output', '--receipt', '--root'].includes(flag) || !args[index + 1] || values[flag]) throw new Error('Usage: standards-checks.mjs --snapshot <ref> --output <receipt> | --verify --snapshot <ref> --receipt <ref>');
    values[flag] = args[++index];
  }
  const root = values['--root'] ?? process.cwd();
  if (!values['--snapshot'] || (values['--verify'] ? !values['--receipt'] || values['--output'] : !values['--output'] || values['--receipt'])) throw new Error('Snapshot and the correct receipt/output argument are required before execution');
  const snapshot = await json(root, values['--snapshot']);
  const result = values['--verify']
    ? await verifyStandardsReceipt(root, snapshot, await json(root, values['--receipt']))
    : await runStandardsChecks(root, snapshot, {outputRef: values['--output'], snapshotRef: values['--snapshot']});
  process.stdout.write(JSON.stringify(values['--verify'] ? result : {pass: result.pass, issues: result.issues, limitations: result.limitations, receiptRef: values['--output']}) + '\n');
  if (!(result.allowed ?? result.pass)) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => {process.stderr.write(`standards-checks: ${error.message}\n`); process.exitCode = 2;});
