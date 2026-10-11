import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');
const owners = ['init', 'plan', 'work', 'debug', 'review', 'audit', 'compound', 'evolve'];

test('every standards owner reaches one scoped contract without adding public workflows', async () => {
  const files = await readdir(fileURLToPath(new URL('.agent/workflows/', root)));
  assert.equal(files.filter(name => /^sc-.*\.md$/.test(name)).length, 19);
  for (const owner of owners) {
    for (const relative of [`.agent/workflows/sc-${owner}.md`, `.agent/context/workflows/sc-${owner}.contract.md`]) {
      assert.ok((await read(relative)).includes('.agent/context/standards.contract.md'), relative);
    }
  }
  const codex = await read('.codex/SKILL.md');
  assert.ok(codex.includes('.agent/context/standards.contract.md'));
  assert.ok(codex.includes('references/context/standards.contract.md'));
});

test('shipped project configuration remains opt-in and keeps one standards block', async () => {
  const source = await read('.agent/rules/project-config.md');
  const blocks = [...source.matchAll(/```json super-compound-standards\r?\n([\s\S]*?)\r?\n```/g)];
  assert.equal(blocks.length, 1);
  assert.deepEqual(JSON.parse(blocks[0][1]), {schema: 'project_standards_v1', enabled: false});
  assert.match(source, /```yaml[\s\S]*gitWorkflow:/);
});

test('optional owner contract is authoritative, inactive and keeps native/default trust distinct', async () => {
  const policy=await read('.agent/standards/solo-owner.md');
  for(const marker of ['SOLO-OWNER/1.0.0','adoption.reviewAuthority','standards_owner_appointment_v1',
    'owner self-review','24','30 days','COMMENTED','CHANGES_REQUESTED','protected trusted base',
    'unprotected','structural only','cannot approve','GitHub approving-review counts','twenty baseline/advisory pairs','forty live'])assert.ok(policy.includes(marker),marker);
  assert.match(policy,/absent[\s\S]*preserves[\s\S]*nonauthor native `APPROVED`/i);
  assert.match(policy,/does not satisfy existing organization G1\/G2 independent approvals/);
  for(const ref of ['.agent/standards/adoption.md','.agent/standards/operations.md'])assert.ok((await read(ref)).includes('(solo-owner.md)'));
  const ci=await read('.agent/templates/standards/application-ci.yml');
  assert.ok(ci.includes('No mode is enabled here'));
  assert.ok(ci.includes('node trusted/.agent/tools/standards-github-review.mjs --verify'));
  assert.ok(ci.includes("some(key=>process.env[key]!=='success')"));
});

test('standards routing preserves explicit configuration, scoped identity and completion authority', async () => {
  const contract = await read('.agent/context/standards.contract.md');
  for (const marker of ['effectiveStandardsDigest', 'standards-checks.mjs', 'standards.mjs', 'snapshotRef', 'receiptRef', 'legacy', 'conflict']) {
    assert.ok(contract.includes(marker), marker);
  }
  assert.match(contract, /never replace.*config.*(?:detect|infer)/is);
  assert.match(contract, /(?:failed|skipped).*stale.*(?:incomplete|completion)/is);
  assert.match(contract, /(?:locators|refs).*digests.*(?:handoff|checkpoint|dispatch)/is);
  const adoption = await read('.agent/standards/adoption.md');
  for (const marker of ['required status checks', 'administrator', '40', 'rollback', 'expiresAt']) assert.ok(adoption.includes(marker), marker);
  assert.match(adoption, /pilot.*(?:not.*executed|planned)/is);
});

test('optional solo evaluation preserves independent qualification and enforcement authority', async () => {
  const operations = await read('.agent/standards/operations.md');
  const pilot = await read('.agent/standards/pilot.md');
  assert.match(operations, /Solo evaluation contract, version G2-SO\/1\.0\.0/);
  assert.match(operations, /result is G2-SO, not G2 or independent review/);
  assert.match(operations, /all[\s\S]*applicable deterministic checks, security checks[\s\S]*identities passing/);
  assert.match(operations, /actual owner inspection[\s\S]*substantive acceptance/);
  assert.match(operations, /Failed, skipped, missing, stale or forged evidence[\s\S]*denial/);
  assert.match(operations, /No security waiver[\s\S]*positive qualification/);
  assert.match(operations, /Existing G1\/G2 independent approvals and G3\/G4 enforcement authority remain[\s\S]*unchanged/);
  assert.match(operations, /owner self-review[\s\S]*never submitted[\s\S]*nonauthor helper[\s\S]*independent approval/);
  assert.match(operations, /AI review is advisory/);
  assert.match(operations, /\| G2 pilot qualified \| Forty valid live records, independently adjudicated defects\/metrics/);
  assert.match(operations, /authorized nonauthor human/);
  assert.match(pilot, /two developers, Claude Code and Codex/);
  assert.match(pilot, /reviewer must not be the developer whose observation is adjudicated/);
  assert.match(pilot, /Optional G2-SO\/1\.0\.0 execution/);
  assert.match(pilot, /Only after actual owner approval/);
  assert.match(pilot, /templateOperatorSlot`?, not a second person/);
  assert.match(pilot, /qualificationMode:[\s\S]*G2-SO\/1\.0\.0[\s\S]*not a new application configuration system/);
  assert.match(pilot, /approval of this procedure is not inspection or a passing observation/);
  assert.match(pilot, /NOT-RUN\/RUNNING, actual FAIL or BLOCKED; never claim PASS/);
  assert.match(pilot, /No simulated review, fixtures or[\s\S]*repeated deterministic test invocations count as live observations/);
  assert.match(pilot, /No[\s\S]*inference about inter-developer reproducibility or independent error adjudication/);
  assert.match(pilot, /Remote CI measurement and security prerequisites still apply/);
  for (const threshold of [
    'Zero false passing completion/aggregate decisions', 'No cross-profile leakage',
    'at most 5%', 'must not increase against paired baseline',
    'at most 1.15 times p95 baseline', 'max(0.20 * p95(baseline), 120)',
    'forty valid\nobservations',
  ]) assert.ok(pilot.includes(threshold), threshold);
});

test('solo qualification contract keeps G1-SO distinct and preserves G1 and G2-SO bytes', async t => {
  const operations = await read('.agent/standards/operations.md');
  const g1so = operations.match(/^\*\*Solo qualification contract, version G1-SO\/1\.0\.0\.\*\*.*(?:\n.+)*/m)?.[0] ?? '';
  const prose = g1so.replace(/\s+/g, ' ');
  for (const marker of ['G1-SO/1.0.0', 'not G1', 'owner self-review', 'owner-accepted', 'no narrowing']) assert.ok(prose.includes(marker), marker);
  for (const clause of [
    /result is G1-SO, not G1, independent review or independent security approval/,
    /Every technical requirement of the G1 row applies unchanged to one exact tested identity, including Python 3\.12 and the same supported-platform set G1 requires/,
    /support-scope change is a separate future decision/,
    /owner self-review and must be genuinely performed by the human owner/,
    /cannot prove that no AI acted under the same account.*explicit truthful attestation/,
    /owner-accepted, which is not security-owner approval/,
    /independent reviewer, security owner and independent verifier rows stay pending and are reported separately/,
    /Failed, skipped, missing, stale or forged evidence denies/,
    /No security waiver qualifies a positive result/,
    /externally blocked platforms stay FAIL\/BLOCKED/,
    /grants no G1, G2, G3 or G4 authority and no adoption, nonauthor review, release, merge, protection or enforcement authority/,
    /AI review is advisory/,
  ]) assert.match(prose, clause);
  const g1Row = /^\| G1 candidate qualified \|.*$/m;
  const g2so = /^\*\*Solo evaluation contract, version G2-SO\/1\.0\.0\.\*\*[\s\S]*?AI review is advisory\.$/m;
  const sha256 = text => createHash('sha256').update(text ?? '').digest('hex');
  // Digests of the 1ef9c70 bytes keep the pin enforced in depth-1 CI checkouts that lack that commit.
  assert.equal(sha256(operations.match(g1Row)?.[0]), '2f9ef2f0d834b148c316476962e623e4d5c107e1ee53b4090b0b21c2b274b31c');
  assert.equal(sha256(operations.match(g2so)?.[0]), 'bb7ae5aa5b6cd02014f40b3de1d9afd926e83fe080cc50c24294ace90981ee98');
  assert.ok(operations.includes(`${operations.match(g2so)[0]}\n\n${g1so}\n\nRecord candidate/reference versions`), 'one G1-SO paragraph directly follows G2-SO');
  const cwd = fileURLToPath(root), base = '1ef9c70bce9c763621ff6e1181c773c294725926';
  if (spawnSync('git', ['cat-file', '-e', `${base}^{commit}`], {cwd, windowsHide: true}).status !== 0) return t.diagnostic(`${base} absent (shallow checkout); pinned digests still enforce byte identity`);
  const baseline = execFileSync('git', ['show', `${base}:.agent/standards/operations.md`], {cwd, encoding: 'utf8', windowsHide: true});
  for (const pattern of [g1Row, g2so]) {
    const before = baseline.match(pattern)?.[0];
    assert.ok(before, pattern.source);
    assert.equal(operations.match(pattern)?.[0], before);
  }
});

test('dated solo preparation keeps forty genuine observations pending and preserves template assignments', async () => {
  const packetRef = 'docs/eval-results/standards-solo-pilot-20261010.md';
  const packet = await read(packetRef).catch(() => null);
  assert.ok(packet, 'dated solo packet must exist without inventing observations');
  const evaluation = [...packet.matchAll(/```json super-compound-pilot-evaluation\r?\n([\s\S]*?)\r?\n```/g)];
  assert.equal(evaluation.length, 1);
  const record = JSON.parse(evaluation[0][1]);
  assert.equal(record.qualificationMode, 'G2-SO/1.0.0');
  assert.equal(record.assignedOperator, 'Aulia Rahman');
  assert.equal(record.actualObservations, 0);
  assert.equal(record.expectedObservations, 40);
  assert.equal(record.executionStatus, 'NOT-RUN');
  assert.equal(record.ownerInspectionStatus, 'NOT-RUN');
  assert.deepEqual(record.ownerInspectionRecords, []);
  assert.equal(record.independentReviewer, null);
  assert.equal(record.procedureApproved, true);
  assert.match(record.procedureApprovalDigest, /^[a-f0-9]{64}$/);
  assert.match(packet, /procedure approval is not inspection or a passing observation/);
  assert.match(packet, /owner self-review/);
  assert.match(packet, /never supplied to the nonauthor helper/);
  assert.match(packet, /forty valid live observations/);
  assert.match(packet, /G2-SO does not grant G2, G1 approval, production adoption or merge authority/);
  const parseRegister = text => {
    const [header, ...lines] = text.trimEnd().split(/\r?\n/).map(line => line.split(','));
    return lines.map(values => {
      assert.equal(values.length, header.length);
      return Object.fromEntries(header.map((key, index) => [key, values[index]]));
    });
  };
  const template = parseRegister(await read('.agent/standards/pilot-observations.csv'));
  const rows = parseRegister(await read('docs/eval-results/standards-solo-pilot-20261010/observations.csv'));
  assert.equal(rows.length, 40);
  assert.equal(new Set(rows.map(row => row.observationId)).size, 40);
  assert.equal(new Set(rows.map(row => row.pairId)).size, 20);
  for (const mode of ['baseline', 'advisory']) assert.equal(rows.filter(row => row.mode === mode).length, 20);
  for (const host of ['claude-code', 'codex']) assert.equal(rows.filter(row => row.host === host).length, 20);
  for (const group of ['A', 'B', 'C', 'D']) assert.equal(rows.filter(row => row.group === group).length, 10);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index], original = template[index];
    for (const key of ['observationId', 'pairId', 'group', 'order', 'variant', 'mode', 'host', 'taskKey']) assert.equal(row[key], original[key], `${row.observationId}:${key}`);
    assert.equal(row.developer, 'Aulia Rahman');
    assert.equal(row.templateOperatorSlot, original.developer);
    assert.equal(row.qualificationMode, 'G2-SO/1.0.0');
    assert.equal(row.status, 'not-run');
    assert.equal(row.evidenceRef, '');
    assert.equal(row.ownerInspectionStatus, 'not-run');
    assert.equal(row.ownerInspectionRef, '');
    assert.equal(original.status, 'not-run');
    assert.equal(original.evidenceRef, '');
  }
});
