import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  createLoopV2Migrator,
  parseMigrationArgs,
} from './migrate-loop-v2.mjs';
import { withOwnerLock } from './file-state.mjs';
import { assertValidValue } from './schema-validator.mjs';

const FIXED_NOW = '2026-07-19T10:00:00.000Z';
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATION_CLI = fileURLToPath(new URL('./migrate-loop-v2.mjs', import.meta.url));
const execFileAsync = promisify(execFile);

const PROJECT_CONFIG = {
  schema: 'project_config_v2',
  contract_version: '2.0.0',
  config_version: 1,
  mode_version: 0,
  mode: 'DISABLED',
  policy: {
    max_iterations: 100,
    max_runtime_minutes: 180,
    max_no_progress_iterations: 5,
    max_tokens: null,
    max_cost_micro: null,
    approval_ttl_minutes: 60,
    allowlisted_operations: ['source-write', 'work'],
    credential_scopes: [],
    required_gates: ['fresh-verifier', 'human-budget-confirmation'],
    risk: 'MEDIUM',
    isolation: 'WORKTREE',
    expires_at: '9999-12-31T23:59:59.999999999Z',
  },
  background_aggregate_policy: {
    max_workers: 2,
    max_reserved_tokens: null,
    max_reserved_runtime_ms: 21_600_000,
    max_remote_calls: 0,
    max_reviewers: 2,
  },
  billing_currency: 'USD',
  retention: {
    run_metadata_days: 30,
    audit_evidence_days: 90,
    legal_hold_behavior: 'PRESERVE',
  },
  telemetry: {
    enabled: false,
    persistence_required: false,
    redaction_revision: null,
    retention_days: null,
    max_file_bytes: null,
  },
  risk: {
    default_profile: 'MEDIUM',
    maximum_autonomy: 'INTERACTIVE',
    external_write_policy: 'DENY',
  },
  write_classification: {
    runtime_audit_prefixes: ['.scratch/loop-runs/', '.scratch/work-packages/'],
    authority_prefixes: ['docs/fsd/', 'docs/prd/'],
    authority_exact_paths: [],
    unknown_path_class: 'implementation_write',
  },
  capability_requirements: {
    enforce: ['DURABLE_LOCAL_STATE', 'HARD_WRITE_INTERCEPTION'],
    background: ['FINITE_NO_PROGRESS_CAP', 'FINITE_RUNTIME_CAP'],
    external_write: ['DURABLE_INTENT', 'IDEMPOTENCY'],
  },
  artifact_authority: {
    required_contract_version: '2.0.0',
    execution_authority_types: ['PRD', 'FSD', 'ISSUE', 'EVAL'],
    legacy_action: 'REPLAN_REQUIRED',
  },
};

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value, 'utf8');
}

async function createFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'loop-v2-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeJson(path.join(root, '.agent/context/project-config.json'), PROJECT_CONFIG);
  for (const schemaName of [
    'project-config-v2.schema.json',
    'work-package-ledger-v2.schema.json',
  ]) {
    await writeText(
      path.join(root, '.agent/context/schemas', schemaName),
      await readFile(path.join(REPOSITORY_ROOT, '.agent/context/schemas', schemaName), 'utf8'),
    );
  }
  await writeText(
    path.join(root, 'docs/prd/prd.md'),
    '# PRD\n\n- Artifact contract version: `2.0.0`\n',
  );
  await writeText(
    path.join(root, 'docs/fsd/fsd.md'),
    '# FSD\n\n- Artifact contract version: `2.0.0`\n',
  );
  await writeText(
    path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    '# Legacy issue pointer\n',
  );

  const ledgerPath = path.join(root, '.scratch/work-packages/RUN-001/ledger.json');
  const legacyLedger = {
    schema: 'work_package_ledger_v1',
    runId: 'RUN-001',
    goals: {
      'GOAL-READY': {
        status: 'ready',
        briefPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-READY/brief.md'),
        reportPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-READY/report.md'),
        pathsPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-READY/paths.txt'),
        reviewPackagePath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-READY/review.json'),
        scopeDigest: '1'.repeat(64),
        baselineDirty: false,
        verification: 'pending',
      },
      'GOAL-VERIFIED': {
        status: 'verified',
        briefPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-VERIFIED/brief.md'),
        reportPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-VERIFIED/report.md'),
        pathsPath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-VERIFIED/paths.txt'),
        reviewPackagePath: path.join(root, '.scratch/work-packages/RUN-001/GOAL-VERIFIED/review.json'),
        scopeDigest: '2'.repeat(64),
        baselineDirty: false,
        verification: 'legacy pass',
      },
    },
  };
  await writeJson(ledgerPath, legacyLedger);
  return { root, ledgerPath, legacyLedger };
}

function migrator(root, overrides = {}) {
  return createLoopV2Migrator(root, {
    now: () => FIXED_NOW,
    planId: () => 'migration-plan-fixed',
    ...overrides,
  });
}

async function treeDigest(root) {
  const entries = [];
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const full = path.join(directory, name);
      const relative = path.relative(root, full).replaceAll('\\', '/');
      const metadata = await stat(full);
      if (metadata.isDirectory()) {
        await visit(full);
      } else {
        entries.push(`${relative}:${createHash('sha256').update(await readFile(full)).digest('hex')}`);
      }
    }
  }
  await visit(root);
  return entries.join('\n');
}

async function persistPlan(root, plan, name = 'plan.json') {
  const file = path.join(root, name);
  await writeJson(file, plan);
  return file;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function resignPlan(plan) {
  plan.payload_digest = `sha256:${createHash('sha256').update(canonicalJson(plan.payload)).digest('hex')}`;
  return plan;
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

async function prepareReviewedConfigPlan(root) {
  await rm(path.join(root, '.agent/context/project-config.json'));
  await writeText(
    path.join(root, '.agent/rules/project-config.md'),
    '# Legacy project config\n\nmode: disabled\n',
  );
  const proposed = await migrator(root).scan();
  const candidate = structuredClone(proposed.payload.config.candidate);
  candidate.policy.max_iterations = 42;
  const candidateDigest = `sha256:${createHash('sha256')
    .update(`${canonicalJson(candidate)}\n`)
    .digest('hex')}`;
  await writeJson(path.join(root, '.scratch/loop-runtime-v2/migration-config-review.json'), {
    schema: 'project_config_migration_review_v2',
    contract_version: '2.0.0',
    source_state_digest: proposed.payload.config.source_state_digest,
    candidate,
    candidate_digest: candidateDigest,
    reviewed_by: 'human:test-owner',
    reviewed_at: FIXED_NOW,
  });
  return migrator(root).scan();
}

test('scan is read-only and deterministic', async (t) => {
  const { root } = await createFixture(t);
  const before = await treeDigest(root);

  const first = await migrator(root).scan();
  const second = await migrator(root).scan();

  assert.deepEqual(second, first);
  assert.equal(await treeDigest(root), before);
  assert.equal(first.schema, 'loop_runtime_migration_plan_v2');
  assert.match(first.payload_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(first.payload.config.action, 'PRESERVE');
});

test('scan maps legacy verified to implemented with fresh-verification marker', async (t) => {
  const { root } = await createFixture(t);
  const plan = await migrator(root).scan();
  const candidate = plan.payload.ledgers[0].candidate;

  assert.equal(candidate.schema, 'work_package_ledger_v2');
  assert.equal(candidate.goals['GOAL-READY'].status, 'ready');
  assert.equal(candidate.goals['GOAL-VERIFIED'].status, 'implemented');
  assert.equal(candidate.goals['GOAL-VERIFIED'].requiresFreshVerification, true);
  assert.match(candidate.goals['GOAL-VERIFIED'].verification, /fresh verification required/iu);
  assert.equal(candidate.goals['GOAL-VERIFIED'].briefPath.includes('\\'), false);
  const schema = JSON.parse(await readFile(
    path.join(root, '.agent/context/schemas/work-package-ledger-v2.schema.json'),
    'utf8',
  ));
  assert.doesNotThrow(() => assertValidValue(candidate, schema, 'migration candidate'));
});

test('scan reports legacy authority artifacts for replan without rewriting them', async (t) => {
  const { root } = await createFixture(t);
  const issue = path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md');
  const before = await readFile(issue, 'utf8');

  const plan = await migrator(root).scan();

  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);
  assert.equal(await readFile(issue, 'utf8'), before);
});

test('generic scratch issue boards are bounded migration authority', async (t) => {
  const { root } = await createFixture(t);
  const builtInIssue = path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md');
  const legacyIssue = path.join(root, '.scratch/legacy-feature/issues/01-old.md');
  const currentIssue = path.join(root, '.scratch/current-feature/issues/nested/02-new.md');
  await writeText(builtInIssue, '# Issue\n\n- Artifact contract version: `2.0.0`\n');
  await writeText(legacyIssue, '# Legacy generic issue\n');
  await writeText(currentIssue, '# Current issue\n\n- Artifact contract version: `2.0.0`\n');

  const plan = await migrator(root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/legacy-feature/issues/01-old.md',
  }]);
  for (const authorityPath of [
    '.scratch/current-feature/issues/nested/02-new.md',
    '.scratch/legacy-feature/issues/01-old.md',
  ]) {
    assert.equal(
      plan.payload.source_manifest.some(({ kind, path: candidate }) => (
        kind === 'AUTHORITY' && candidate === authorityPath
      )),
      true,
    );
  }

  await migrator(root).apply({ planFile: await persistPlan(root, plan) });
  let verification = await migrator(root).verify();
  assert.equal(verification.ready_for_enforce, false);
  assert.equal(verification.blockers.some(({ code, path: candidate }) => (
    code === 'REPLAN_REQUIRED' && candidate === '.scratch/legacy-feature/issues/01-old.md'
  )), true);

  await writeText(legacyIssue, '# Replanned issue\n\n- Artifact contract version: `2.0.0`\n');
  verification = await migrator(root).verify();
  assert.equal(verification.ready_for_enforce, true);
  assert.deepEqual(verification.blockers, []);

  const driftFixture = await createFixture(t);
  const driftPlan = await migrator(driftFixture.root).scan();
  const driftPlanFile = await persistPlan(driftFixture.root, driftPlan, 'drift-plan.json');
  await writeText(
    path.join(driftFixture.root, '.scratch/late-feature/issues/01-late.md'),
    '# Late issue\n\n- Artifact contract version: `2.0.0`\n',
  );
  await assert.rejects(
    () => migrator(driftFixture.root).apply({ planFile: driftPlanFile }),
    /SOURCE_MEMBERSHIP_DRIFT/u,
  );
});

test('authority contract metadata is canonical, unique, and header-scoped', async (t) => {
  const invalidHeaders = [
    {
      name: 'trailing-junk',
      content: '# Issue\n\n- Artifact contract version: `2.0.0`junk\n',
    },
    {
      name: 'conflicting-header-with-body-example',
      content: [
        '# Issue',
        '',
        '- Artifact contract version: `1.0.0`',
        '',
        '## Example',
        '',
        '```markdown',
        '- Artifact contract version: `2.0.0`',
        '```',
        '',
      ].join('\n'),
    },
    {
      name: 'duplicate',
      content: [
        '# Issue',
        '',
        '- Artifact contract version: `2.0.0`',
        '- Artifact contract version: `2.0.0`',
        '',
      ].join('\n'),
    },
    {
      name: 'canonical-with-malformed-duplicate',
      content: [
        '# Issue',
        '',
        '- Artifact contract version: `2.0.0`',
        '- artifact  contract version: `1.0.0`',
        '',
      ].join('\n'),
    },
    {
      name: 'canonical-with-punctuation-malformed-duplicate',
      content: [
        '# Issue',
        '',
        '- Artifact contract version: `2.0.0`',
        '- Artifact-contract-version: `1.0.0`',
        '',
      ].join('\n'),
    },
    {
      name: 'malformed',
      content: '# Issue\n\n- Artifact contract version = `2.0.0`\n',
    },
  ];

  for (const scenario of invalidHeaders) {
    const { root } = await createFixture(t);
    const issuePath = path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md');
    await writeText(issuePath, scenario.content);
    const plan = await migrator(root).scan();
    assert.deepEqual(plan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: '.scratch/loop-runtime-v2/issues/issue-001.md',
    }], scenario.name);
  }

  const { root } = await createFixture(t);
  await writeText(
    path.join(root, 'docs/prd/prd.md'),
    await readFile(path.join(REPOSITORY_ROOT, 'docs/prd/prd-loop-runtime-v2.md'), 'utf8'),
  );
  await writeText(
    path.join(root, 'docs/fsd/fsd.md'),
    await readFile(path.join(REPOSITORY_ROOT, 'docs/fsd/fsd-loop-runtime-v2.md'), 'utf8'),
  );
  await writeText(
    path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '',
      'Artifact contract version: `2.0.0`',
      '',
      '## Body example',
      '',
      '- Artifact contract version: `2.0.0`',
      '',
    ].join('\n'),
  );
  const positive = await migrator(root).scan();
  assert.deepEqual(positive.payload.authority_findings, []);
});

test('official PRD and FSD YAML authority metadata is an exact canonical alternative', async (t) => {
  const canonicalYaml = 'artifact_contract_version: "2.0.0"';
  const prdTemplate = await readFile(
    path.join(
      REPOSITORY_ROOT,
      '.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md',
    ),
    'utf8',
  );
  const fsdTemplate = await readFile(
    path.join(
      REPOSITORY_ROOT,
      '.agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md',
    ),
    'utf8',
  );

  const positiveFixture = await createFixture(t);
  await writeText(path.join(positiveFixture.root, 'docs/prd/prd.md'), prdTemplate);
  await writeText(path.join(positiveFixture.root, 'docs/fsd/fsd.md'), fsdTemplate);
  await writeText(
    path.join(positiveFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    '# Issue\n\n- Artifact contract version: `2.0.0`\n',
  );
  let plan = await migrator(positiveFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, []);

  const yamlIssueFixture = await createFixture(t);
  await writeText(
    path.join(yamlIssueFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    `# Issue\n\n${canonicalYaml}\n`,
  );
  plan = await migrator(yamlIssueFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const invalidYaml = [
    {
      name: 'v1',
      content: prdTemplate.replace(canonicalYaml, 'artifact_contract_version: "1.0.0"'),
    },
    {
      name: 'trailing-junk',
      content: prdTemplate.replace(canonicalYaml, `${canonicalYaml}junk`),
    },
    {
      name: 'mixed-format-duplicate',
      content: prdTemplate.replace(
        canonicalYaml,
        `${canonicalYaml}\n- Artifact contract version: \`2.0.0\``,
      ),
    },
    {
      name: 'truncated-before-conflict',
      content: `${[
        '# PRD',
        canonicalYaml,
        ...Array.from({ length: 62 }, (_, index) => `header_${index + 1}: filler`),
        'artifact_contract_version: "1.0.0"',
      ].join('\n')}\n`,
    },
  ];
  for (const scenario of invalidYaml) {
    const fixture = await createFixture(t);
    await writeText(path.join(fixture.root, 'docs/prd/prd.md'), scenario.content);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      '# Issue\n\n- Artifact contract version: `2.0.0`\n',
    );
    plan = await migrator(fixture.root).scan();
    assert.deepEqual(plan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: 'docs/prd/prd.md',
    }], scenario.name);
  }
});

test('fenced and commented examples cannot spoof authority declarations', async (t) => {
  const scenarios = [
    {
      name: 'fenced-yaml-prd',
      target: 'docs/prd/prd.md',
      content: [
        '# PRD',
        '',
        '```yaml',
        'artifact_contract_version: "2.0.0"',
        '```',
        '',
      ].join('\n'),
    },
    {
      name: 'fenced-human-issue',
      target: '.scratch/loop-runtime-v2/issues/issue-001.md',
      content: [
        '# Issue',
        '',
        '```markdown',
        '- Artifact contract version: `2.0.0`',
        '```',
        '',
      ].join('\n'),
    },
    {
      name: 'html-comment-human-issue',
      target: '.scratch/loop-runtime-v2/issues/issue-001.md',
      content: [
        '# Issue',
        '',
        '<!--',
        '- Artifact contract version: `2.0.0`',
        '-->',
        '',
      ].join('\n'),
    },
    {
      name: 'yaml-without-frontmatter',
      target: 'docs/prd/prd.md',
      content: '# PRD\n\nartifact_contract_version: "2.0.0"\n',
    },
    {
      name: 'yaml-frontmatter-not-initial',
      target: 'docs/prd/prd.md',
      content: '# PRD\n---\nartifact_contract_version: "2.0.0"\n---\n',
    },
    {
      name: 'yaml-frontmatter-unclosed',
      target: 'docs/prd/prd.md',
      content: '---\nartifact_contract_version: "2.0.0"\n',
    },
  ];

  for (const scenario of scenarios) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      '# Issue\n\n- Artifact contract version: `2.0.0`\n',
    );
    await writeText(path.join(fixture.root, scenario.target), scenario.content);
    const plan = await migrator(fixture.root).scan();
    assert.deepEqual(plan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: scenario.target,
    }], scenario.name);
  }

  const literalCommentFixture = await createFixture(t);
  await writeText(
    path.join(literalCommentFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '',
      '- Artifact contract version: `2.0.0`',
      '',
      '```markdown',
      '<!-- literal example, not an HTML comment in a code fence',
      '- Artifact contract version: `1.0.0`',
      '```',
      '',
    ].join('\n'),
  );
  const positive = await migrator(literalCommentFixture.root).scan();
  assert.deepEqual(positive.payload.authority_findings, []);
});

test('raw HTML header contexts cannot spoof authority declarations', async (t) => {
  const negativeContexts = [
    {
      name: 'pre-with-fake-heading',
      content: [
        '# Issue',
        '<pre>',
        '- Artifact contract version: `2.0.0`',
        '## Fake body heading',
        '</pre>',
        '',
      ].join('\n'),
    },
    ...['SCRIPT', 'style', 'TextArea'].map((tag) => ({
      name: `${tag.toLowerCase()}-literal`,
      content: [
        '# Issue',
        `<${tag}>`,
        '- Artifact contract version: `2.0.0`',
        `</${tag.toLowerCase()}>`,
        '',
      ].join('\n'),
    })),
    {
      name: 'nested-div-only-marker',
      content: [
        '# Issue',
        '<div class="outer">',
        '<div>',
        '- Artifact contract version: `2.0.0`',
        '</div>',
        '</div>',
        '',
      ].join('\n'),
    },
    {
      name: 'raw-fake-heading-cannot-hide-later-conflict',
      content: [
        '# Issue',
        '',
        '- Artifact contract version: `2.0.0`',
        '<div>',
        '## Fake body heading',
        '</div>',
        '',
        '- Artifact contract version: `1.0.0`',
        '## Real body heading',
        '',
      ].join('\n'),
    },
    {
      name: 'close-line-suffix-conflict',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<div>',
        'raw',
        '</div>',
        '',
        '- Artifact contract version: `1.0.0`',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'mismatched-nesting',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<div>',
        '<span>',
        '</div>',
        '</span>',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'comment-shields-close-looking-text',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<div>',
        '<!-- </div> -->',
        '## Fake body heading',
        '</div>',
        '',
        '- Artifact contract version: `1.0.0`',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'unmatched-close',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '</div>',
        '## Body',
        '',
      ].join('\n'),
    },
    ...['< / pre >', '</ pre>', '< /pre>'].map((malformedClose) => ({
      name: `malformed-literal-close-${malformedClose.replaceAll(' ', '-')}`,
      content: [
        '# Issue',
        '<pre>',
        malformedClose,
        '- Artifact contract version: `2.0.0`',
        '',
      ].join('\n'),
    })),
    {
      name: 'spaced-literal-close-is-not-an-end-condition',
      content: [
        '# Issue',
        '<pre>',
        '</pre >',
        '- Artifact contract version: `2.0.0`',
        '',
      ].join('\n'),
    },
    {
      name: 'literal-closing-line-suffix-remains-raw',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<pre>',
        '</pre>## Fake body',
        '- Artifact contract version: `1.0.0`',
        '## Real body',
        '',
      ].join('\n'),
    },
    ...[
      { name: 'comment', opener: '<!-- raw block', closer: '-->' },
      { name: 'processing-instruction', opener: '<?raw', closer: '?>' },
      { name: 'declaration', opener: '<!A', closer: '>' },
      { name: 'cdata', opener: '<![CDATA[', closer: ']]>' },
    ].map(({ name, opener, closer }) => ({
      name: `${name}-closing-line-suffix-remains-raw`,
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        opener,
        `${closer}## Fake body`,
        '- Artifact contract version: `1.0.0`',
        '## Real body',
        '',
      ].join('\n'),
    })),
    {
      name: 'malformed-generic-close',
      content: [
        '# Issue',
        '<div>',
        '< / div >',
        '- Artifact contract version: `2.0.0`',
        '',
      ].join('\n'),
    },
    {
      name: 'unclosed-generic',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<div>',
        '<section>',
        '</section>',
        '',
      ].join('\n'),
    },
    {
      name: 'same-line-pre-marker',
      content: '# Issue\n<PrE class="sample">- Artifact contract version: `2.0.0`</pRe>\n',
    },
    {
      name: 'unclosed-pre',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<pre>',
        'literal body without a closing tag',
        '',
      ].join('\n'),
    },
    {
      name: 'cdata-only-marker',
      content: [
        '# Issue',
        '<![CDATA[',
        '- Artifact contract version: `2.0.0`',
        ']]>',
        '',
      ].join('\n'),
    },
    {
      name: 'processing-instruction-only-marker',
      content: [
        '# Issue',
        '<?authority',
        '- Artifact contract version: `2.0.0`',
        '?>',
        '',
      ].join('\n'),
    },
    {
      name: 'declaration-ends-at-first-greater-than',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<!A ">"',
        '- Artifact contract version: `1.0.0`',
        '>',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'lowercase-declaration-opener-is-not-raw-html',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<!a',
        '- Artifact contract version: `1.0.0`',
        '>',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'lowercase-cdata-opener-is-not-raw-html',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '<![cdata[',
        '- Artifact contract version: `1.0.0`',
        ']]>',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'type-seven-tag-cannot-interrupt-active-paragraph',
      content: [
        '# Issue',
        '',
        'Artifact contract version: `2.0.0`',
        '<span>',
        '- Artifact contract version: `1.0.0`',
        '</span>',
        '',
        '## Body',
        '',
      ].join('\n'),
    },
  ];

  for (const scenario of negativeContexts) {
    const fixture = await createFixture(t);
    const issuePath = path.join(
      fixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    );
    await writeText(issuePath, scenario.content);
    const plan = await migrator(fixture.root).scan();
    assert.deepEqual(plan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: '.scratch/loop-runtime-v2/issues/issue-001.md',
    }], scenario.name);
  }

  for (const scenario of [
    {
      name: 'type-seven-tag-after-blank',
      content: [
        '# Issue',
        '- Artifact contract version: `2.0.0`',
        '',
        '<span>',
        '- Artifact contract version: `1.0.0`',
        '</span>',
        '',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'type-six-tag-interrupts-paragraph',
      content: [
        '# Issue',
        'Artifact contract version: `2.0.0`',
        '<div>',
        '- Artifact contract version: `1.0.0`',
        '</div>',
        '',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'source-is-type-six-in-commonmark-0.31.2',
      content: [
        '# Issue',
        'Artifact contract version: `2.0.0`',
        'ordinary continuation',
        '<source>',
        '- Artifact contract version: `1.0.0`',
        '',
        '## Body',
        '',
      ].join('\n'),
    },
    {
      name: 'type-one-end-tag-need-not-match-opener',
      content: [
        '# Issue',
        '<pre>',
        '- Artifact contract version: `1.0.0`',
        '</script>',
        '- Artifact contract version: `2.0.0`',
        '## Body',
        '',
      ].join('\n'),
    },
  ]) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      scenario.content,
    );
    const plan = await migrator(fixture.root).scan();
    assert.deepEqual(plan.payload.authority_findings, [], scenario.name);
  }

  const resumedFixture = await createFixture(t);
  await writeText(
    path.join(resumedFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '<div>',
      '<div>',
      '- Artifact contract version: `1.0.0`',
      '</div>',
      '- Artifact contract version: `2.0.0`',
      '</div>',
      '',
      '- Artifact contract version: `2.0.0`',
      '',
    ].join('\n'),
  );
  const resumed = await migrator(resumedFixture.root).scan();
  assert.deepEqual(resumed.payload.authority_findings, []);

  const multilineFixture = await createFixture(t);
  await writeText(
    path.join(multilineFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '<DiV',
      ' data-label="a > b">',
      '<section>',
      '<img alt=">">',
      '<br />',
      '<br/>',
      '<div title=">"/>',
      '- Artifact contract version: `1.0.0`',
      '</SECTION>',
      '</dIv>',
      '',
      '- Artifact contract version: `2.0.0`',
      '',
    ].join('\n'),
  );
  const multiline = await migrator(multilineFixture.root).scan();
  assert.deepEqual(multiline.payload.authority_findings, []);

  const legalCloseFixture = await createFixture(t);
  await writeText(
    path.join(legalCloseFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '<pre>',
      '- Artifact contract version: `1.0.0`',
      '</pre>',
      '<div>',
      '- Artifact contract version: `1.0.0`',
      '</div >',
      '',
      '- Artifact contract version: `2.0.0`',
      '',
    ].join('\n'),
  );
  const legalClose = await migrator(legalCloseFixture.root).scan();
  assert.deepEqual(legalClose.payload.authority_findings, []);

  const fenceFixture = await createFixture(t);
  await writeText(
    path.join(fenceFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Issue',
      '- Artifact contract version: `2.0.0`',
      '```markdown',
      '<pre>',
      '- Artifact contract version: `1.0.0`',
      '```',
      '## Body',
      '',
    ].join('\n'),
  );
  const fencePrecedence = await migrator(fenceFixture.root).scan();
  assert.deepEqual(fencePrecedence.payload.authority_findings, []);
});

test('CommonMark level-two headings terminate authority header scope', async (t) => {
  for (const heading of ['  ## Body example', '##', '   ##\tBody example']) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      [
        '# Legacy issue',
        '',
        heading,
        '- Artifact contract version: `2.0.0`',
        '',
      ].join('\n'),
    );
    const plan = await migrator(fixture.root).scan();
    assert.deepEqual(plan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: '.scratch/loop-runtime-v2/issues/issue-001.md',
    }], heading);
  }

  const metadataFixture = await createFixture(t);
  await writeText(
    path.join(metadataFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Current issue',
      '',
      '   ## Metadata',
      '- Artifact contract version: `2.0.0`',
      '',
    ].join('\n'),
  );
  const metadata = await migrator(metadataFixture.root).scan();
  assert.deepEqual(metadata.payload.authority_findings, []);
});

test('CommonMark block termination keeps hidden authority markers out of scope', async (t) => {
  const containerScenarios = [
    {
      name: 'setext-level-two-body',
      lines: [
        '# Legacy issue',
        'Body section',
        '---',
        'Artifact contract version: `2.0.0`',
      ],
    },
    {
      name: 'lazy-blockquote-continuation',
      lines: [
        '# Legacy issue',
        '> quoted example',
        'Artifact contract version: `2.0.0`',
        '## Body',
      ],
    },
    {
      name: 'lazy-list-continuation',
      lines: [
        '# Legacy issue',
        '- listed example',
        'Artifact contract version: `2.0.0`',
        '## Body',
      ],
    },
    {
      name: 'plain-paragraph-continuation',
      lines: [
        '# Legacy issue',
        'ordinary header prose',
        'Artifact contract version: `2.0.0`',
        '## Body',
      ],
    },
  ];
  for (const scenario of containerScenarios) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      [...scenario.lines, ''].join('\n'),
    );
    const containerPlan = await migrator(fixture.root).scan();
    assert.deepEqual(containerPlan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: '.scratch/loop-runtime-v2/issues/issue-001.md',
    }], scenario.name);
  }

  for (const scenario of [
    {
      name: 'authority-line-is-setext-heading',
      lines: [
        '# Legacy issue',
        '',
        'Artifact contract version: `2.0.0`',
        '---',
      ],
    },
    {
      name: 'authority-line-is-in-multiline-setext-heading',
      lines: [
        '# Legacy issue',
        '',
        'Artifact contract version: `2.0.0`',
        'continued heading text',
        '---',
      ],
    },
  ]) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      [...scenario.lines, ''].join('\n'),
    );
    const setextPlan = await migrator(fixture.root).scan();
    assert.deepEqual(setextPlan.payload.authority_findings, [{
      code: 'REPLAN_REQUIRED',
      path: '.scratch/loop-runtime-v2/issues/issue-001.md',
    }], scenario.name);
  }

  for (const scenario of [
    {
      name: 'bullet-marker-before-thematic-break',
      lines: [
        '# Current issue',
        '',
        '- Artifact contract version: `2.0.0`',
        '---',
      ],
    },
    {
      name: 'plain-marker-separated-from-thematic-break',
      lines: [
        '# Current issue',
        '',
        'Artifact contract version: `2.0.0`',
        '',
        '---',
      ],
    },
  ]) {
    const fixture = await createFixture(t);
    await writeText(
      path.join(fixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
      [...scenario.lines, ''].join('\n'),
    );
    const thematicPlan = await migrator(fixture.root).scan();
    assert.deepEqual(thematicPlan.payload.authority_findings, [], scenario.name);
  }

  const containerBlankFixture = await createFixture(t);
  await writeText(
    path.join(
      containerBlankFixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    ),
    [
      '# Current issue',
      '> quoted example',
      '',
      'Artifact contract version: `2.0.0`',
      '## Body',
      '',
    ].join('\n'),
  );
  let plan = await migrator(containerBlankFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, []);

  const multilineCodeSpanFixture = await createFixture(t);
  await writeText(
    path.join(
      multilineCodeSpanFixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    ),
    [
      '# Legacy issue',
      '``',
      'Artifact contract version: `2.0.0`',
      '``',
      '## Body',
      '',
    ].join('\n'),
  );
  plan = await migrator(multilineCodeSpanFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const invalidBacktickInfoFixture = await createFixture(t);
  await writeText(
    path.join(
      invalidBacktickInfoFixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    ),
    [
      '# Legacy issue',
      '- Artifact contract version: `2.0.0`',
      '```bad`info',
      '- Artifact contract version: `1.0.0`',
      '```',
      '## Body',
      '',
    ].join('\n'),
  );
  plan = await migrator(invalidBacktickInfoFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const indentedFenceFixture = await createFixture(t);
  await writeText(
    path.join(
      indentedFenceFixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    ),
    [
      '# Legacy issue',
      '```markdown',
      '    ```',
      '- Artifact contract version: `2.0.0`',
      '## Body',
      '```',
      '',
    ].join('\n'),
  );
  plan = await migrator(indentedFenceFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const rawHtmlFixture = await createFixture(t);
  await writeText(
    path.join(rawHtmlFixture.root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    [
      '# Legacy issue',
      '<div>',
      '</div>',
      '- Artifact contract version: `2.0.0`',
      '## Body',
      '',
    ].join('\n'),
  );
  plan = await migrator(rawHtmlFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const blankTerminatedFixture = await createFixture(t);
  await writeText(
    path.join(
      blankTerminatedFixture.root,
      '.scratch/loop-runtime-v2/issues/issue-001.md',
    ),
    [
      '# Current issue',
      '<div>',
      '</div>',
      '',
      '- Artifact contract version: `2.0.0`',
      '## Body',
      '',
    ].join('\n'),
  );
  plan = await migrator(blankTerminatedFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, []);
});

test('authority header bounds fail closed unless a terminator is observed', async (t) => {
  const lineBoundFixture = await createFixture(t);
  const lineBoundIssue = path.join(
    lineBoundFixture.root,
    '.scratch/loop-runtime-v2/issues/issue-001.md',
  );
  await writeText(lineBoundIssue, `${[
    '# Issue',
    '',
    '- Artifact contract version: `2.0.0`',
    ...Array.from({ length: 61 }, (_, index) => `- Header filler ${index + 1}`),
    '- Artifact contract version: `1.0.0`',
  ].join('\n')}\n`);
  let plan = await migrator(lineBoundFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const byteBoundFixture = await createFixture(t);
  const byteBoundIssue = path.join(
    byteBoundFixture.root,
    '.scratch/loop-runtime-v2/issues/issue-001.md',
  );
  await writeText(byteBoundIssue, [
    '# Issue',
    '',
    '- Artifact contract version: `2.0.0`',
    `- Header filler: ${'x'.repeat(16 * 1024)}`,
    '- Artifact contract version: `1.0.0`',
    '',
  ].join('\n'));
  plan = await migrator(byteBoundFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, [{
    code: 'REPLAN_REQUIRED',
    path: '.scratch/loop-runtime-v2/issues/issue-001.md',
  }]);

  const terminatedFixture = await createFixture(t);
  const terminatedIssue = path.join(
    terminatedFixture.root,
    '.scratch/loop-runtime-v2/issues/issue-001.md',
  );
  await writeText(terminatedIssue, [
    '# Issue',
    '',
    '- Artifact contract version: `2.0.0`',
    '',
    '## Large body',
    ...Array.from(
      { length: 100 },
      (_, index) => `${index}: ${'body'.repeat(128)} Artifact-contract-version: \`1.0.0\``,
    ),
    '',
  ].join('\n'));
  plan = await migrator(terminatedFixture.root).scan();
  assert.deepEqual(plan.payload.authority_findings, []);
});

test('tampered plan is rejected before any migration write', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  const plan = await migrator(root).scan();
  plan.payload.ledgers[0].candidate.runId = 'TAMPERED';
  const planFile = await persistPlan(root, plan, 'tampered-plan.json');
  const before = await readFile(ledgerPath, 'utf8');

  await assert.rejects(() => migrator(root).apply({ planFile }), /PLAN_DIGEST_MISMATCH/u);

  assert.equal(await readFile(ledgerPath, 'utf8'), before);
  await assert.rejects(
    () => stat(path.join(root, '.scratch/loop-runtime-v2/migrations')),
    { code: 'ENOENT' },
  );
});

test('apply resumes safely after a crash between target write and checkpoint', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);
  let injected = false;
  const crashing = migrator(root, {
    afterTargetWrite: async () => {
      if (!injected) {
        injected = true;
        throw new Error('INJECTED_CRASH');
      }
    },
  });

  await assert.rejects(() => crashing.apply({ planFile }), /INJECTED_CRASH/u);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v2');

  const resumed = await migrator(root).apply({ planFile });
  assert.equal(resumed.status, 'APPLIED');
  assert.equal(resumed.completed_operations, 1);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v2');
});

test('reapplying a completed plan is an explicit no-op', async (t) => {
  const { root } = await createFixture(t);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);

  await migrator(root).apply({ planFile });
  const before = await treeDigest(root);
  const repeated = await migrator(root).apply({ planFile });

  assert.equal(repeated.status, 'NOOP_ALREADY_APPLIED');
  assert.equal(await treeDigest(root), before);
});

test('verify blocks legacy authority and unknown outcomes, then passes after replan', async (t) => {
  const { root } = await createFixture(t);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);
  await migrator(root).apply({ planFile });
  await writeJson(path.join(root, '.scratch/loop-runtime-v1/effect.json'), {
    schema: 'loop_action_state_v1',
    outcome: 'UNKNOWN',
  });

  const blocked = await migrator(root).verify();
  assert.equal(blocked.ready_for_enforce, false);
  assert.deepEqual(
    new Set(blocked.blockers.map(({ code }) => code)),
    new Set(['REPLAN_REQUIRED', 'UNKNOWN_LEGACY_OUTCOME']),
  );

  await rm(path.join(root, '.scratch/loop-runtime-v1'), { recursive: true });
  await writeText(
    path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    '# Issue\n\n- Artifact contract version: `2.0.0`\n',
  );
  const clean = await migrator(root).verify();
  assert.equal(clean.ready_for_enforce, true);
  assert.deepEqual(clean.blockers, []);
});

test('scan classifies every legacy file without an allow-by-default path', async (t) => {
  const { root } = await createFixture(t);
  const legacyRoot = path.join(root, '.scratch/loop-runtime-v1');
  await writeJson(path.join(legacyRoot, 'ready.json'), { status: 'READY' });
  await writeJson(path.join(legacyRoot, 'paused.json'), { status: 'PAUSED' });
  await writeJson(path.join(legacyRoot, 'running.json'), { status: 'running' });
  await writeJson(path.join(legacyRoot, 'paused-stale-outcome.json'), {
    status: 'PAUSED',
    outcome: 'SUCCESS',
  });
  await writeJson(path.join(legacyRoot, 'terminal.json'), { outcome: 'SUCCESS' });
  await writeJson(path.join(legacyRoot, 'absent.json'), { note: 'no outcome' });
  await writeJson(path.join(legacyRoot, 'unsupported.json'), { outcome: 'MAYBE' });
  await writeJson(path.join(legacyRoot, 'terminal-unsupported.json'), {
    status: 'SUCCESS',
    outcome: 'MAYBE',
  });
  await writeText(path.join(legacyRoot, 'opaque.receipt'), 'not-json\n');

  const plan = await migrator(root).scan();
  const byPath = Object.fromEntries(
    plan.payload.blockers.map(({ path: candidate, code }) => [candidate, code]),
  );

  for (const name of [
    'ready.json',
    'paused.json',
    'running.json',
    'paused-stale-outcome.json',
  ]) {
    assert.equal(
      byPath[`.scratch/loop-runtime-v1/${name}`],
      'ACTIVE_V1_REPLAN_REQUIRED',
    );
  }
  assert.equal(
    byPath['.scratch/loop-runtime-v1/terminal.json'],
    'LEGACY_REPLAN_REQUIRED',
  );
  for (const name of [
    'absent.json',
    'unsupported.json',
    'terminal-unsupported.json',
    'opaque.receipt',
  ]) {
    assert.equal(
      byPath[`.scratch/loop-runtime-v1/${name}`],
      'UNKNOWN_LEGACY_OUTCOME',
    );
  }
});

test('CLI parser accepts only the documented strict command shapes', () => {
  assert.deepEqual(parseMigrationArgs(['scan']), { command: 'scan' });
  assert.deepEqual(parseMigrationArgs(['verify']), { command: 'verify' });
  assert.deepEqual(parseMigrationArgs(['apply', '--plan', 'plan.json']), {
    command: 'apply',
    planFile: 'plan.json',
  });
  assert.throws(() => parseMigrationArgs([]), /USAGE/u);
  assert.throws(() => parseMigrationArgs(['scan', '--write']), /USAGE/u);
  assert.throws(() => parseMigrationArgs(['apply']), /USAGE/u);
  assert.throws(() => parseMigrationArgs(['apply', '--plan', 'a', '--force']), /USAGE/u);
});

test('active v1 work blocks apply before migration metadata or target writes', async (t) => {
  const { root, ledgerPath, legacyLedger } = await createFixture(t);
  legacyLedger.goals['GOAL-READY'].status = 'in-progress';
  await writeJson(ledgerPath, legacyLedger);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);

  assert.equal(plan.payload.blockers[0].code, 'ACTIVE_V1_REPLAN_REQUIRED');
  await assert.rejects(() => migrator(root).apply({ planFile }), /MIGRATION_BLOCKED/u);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v1');
  await assert.rejects(
    () => stat(path.join(root, '.scratch/loop-runtime-v2/migrations')),
    { code: 'ENOENT' },
  );
});

test('source membership drift and aggregate scan overflow fail closed', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);
  await writeJson(path.join(root, '.scratch/work-packages/NEW/ledger.json'), {
    schema: 'work_package_ledger_v2',
    runId: 'NEW',
    ledgerVersion: 1,
    goals: {},
  });

  await assert.rejects(() => migrator(root).apply({ planFile }), /SOURCE_MEMBERSHIP_DRIFT/u);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v1');
  await assert.rejects(
    () => migrator(root, {
      limits: { maxAggregateBytes: 100, maxFileBytes: 10_000, maxFiles: 512 },
    }).scan(),
    /SCAN_AGGREGATE_LIMIT/u,
  );
});

test('verify rejects incomplete or corrupt checkpoint state', async (t) => {
  const { root } = await createFixture(t);
  const plan = await migrator(root).scan();
  const applied = await migrator(root).apply({ planFile: await persistPlan(root, plan) });
  const issue = path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md');
  await writeText(issue, '# Issue\n\n- Artifact contract version: `2.0.0`\n');
  const statePath = path.join(root, applied.state_dir, 'apply-state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  state.status = 'APPLYING';
  await writeJson(statePath, state);

  let result = await migrator(root).verify();
  assert.equal(result.blockers.some(({ code }) => code === 'INCOMPLETE_MIGRATION'), true);

  await writeText(statePath, '{broken');
  result = await migrator(root).verify();
  assert.equal(result.blockers.some(({ code }) => code === 'CORRUPT_MIGRATION_STATE'), true);
});

test('verify detects a forensic manual restore to v1', async (t) => {
  const { root, ledgerPath, legacyLedger } = await createFixture(t);
  const plan = await migrator(root).scan();
  await migrator(root).apply({ planFile: await persistPlan(root, plan) });
  await writeJson(ledgerPath, legacyLedger);

  const result = await migrator(root).verify();
  assert.equal(result.ready_for_enforce, false);
  assert.equal(result.blockers.some(({ code }) => code === 'LEGACY_LEDGER_REMAINS'), true);
});

test('strict plan rejects nested unknown fields, duplicate operations, and unsafe paths before lock', async (t) => {
  for (const mutate of [
    (plan) => { plan.payload.ledgers[0].candidate.goals['GOAL-READY'].unknown = true; },
    (plan) => { plan.payload.ledgers.push(structuredClone(plan.payload.ledgers[0])); },
    (plan) => { plan.payload.ledgers[0].path = '../escape.json'; },
    (plan) => {
      plan.payload.ledgers[0].candidate.runId = 'ALTERED';
      plan.payload.ledgers[0].target_digest = `sha256:${createHash('sha256')
        .update(`${canonicalJson(plan.payload.ledgers[0].candidate)}\n`)
        .digest('hex')}`;
    },
  ]) {
    const { root, ledgerPath } = await createFixture(t);
    const plan = await migrator(root).scan();
    mutate(plan);
    resignPlan(plan);
    const before = await readFile(ledgerPath, 'utf8');
    const mutatedPlanFile = await persistPlan(root, plan);

    await assert.rejects(
      () => migrator(root).apply({ planFile: mutatedPlanFile }),
      /INVALID_PLAN|PATH_CONFINEMENT|PLAN_CANDIDATE_MISMATCH/u,
    );
    assert.equal(await readFile(ledgerPath, 'utf8'), before);
    await assert.rejects(
      () => stat(path.join(root, '.scratch/loop-runtime-v2/migrations')),
      { code: 'ENOENT' },
    );
  }
});

test('canonical plan digest accepts reordered object keys without resigning', async (t) => {
  const { root } = await createFixture(t);
  const original = await migrator(root).scan();
  const reordered = {
    payload_digest: original.payload_digest,
    payload: reverseObjectKeys(original.payload),
    contract_version: original.contract_version,
    schema: original.schema,
  };

  const result = await migrator(root).apply({
    planFile: await persistPlan(root, reordered, 'reordered-plan.json'),
  });
  assert.equal(result.status, 'APPLIED');
});

test('completed or checkpointed targets may not be restored and treated as a no-op', async (t) => {
  const { root, ledgerPath, legacyLedger } = await createFixture(t);
  const plan = await migrator(root).scan();
  const planFile = await persistPlan(root, plan);
  const applied = await migrator(root).apply({ planFile });
  await writeJson(ledgerPath, legacyLedger);

  await assert.rejects(() => migrator(root).apply({ planFile }), /ROLLBACK_FORBIDDEN/u);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v1');

  const statePath = path.join(root, applied.state_dir, 'apply-state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  state.status = 'APPLYING';
  await writeJson(statePath, state);
  await assert.rejects(() => migrator(root).apply({ planFile }), /ROLLBACK_FORBIDDEN/u);
});

test('legacy Markdown config becomes a reviewed finite v2 candidate in the same atomic apply', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  await rm(path.join(root, '.agent/context/project-config.json'));
  await writeText(
    path.join(root, '.agent/rules/project-config.md'),
    '# Legacy project config\n\nmode: disabled\n',
  );

  const proposed = await migrator(root).scan();
  assert.equal(proposed.payload.config.action, 'REVIEW_REQUIRED');
  assert.equal(proposed.payload.config.candidate.mode, 'DISABLED');
  assert.equal(Number.isSafeInteger(proposed.payload.config.candidate.policy.max_iterations), true);
  assert.equal(Number.isSafeInteger(proposed.payload.config.candidate.policy.max_runtime_minutes), true);
  assert.equal(Number.isSafeInteger(
    proposed.payload.config.candidate.policy.max_no_progress_iterations,
  ), true);

  const candidate = structuredClone(proposed.payload.config.candidate);
  candidate.policy.max_iterations = 42;
  const candidateDigest = `sha256:${createHash('sha256')
    .update(`${canonicalJson(candidate)}\n`)
    .digest('hex')}`;
  await writeJson(path.join(root, '.scratch/loop-runtime-v2/migration-config-review.json'), {
    schema: 'project_config_migration_review_v2',
    contract_version: '2.0.0',
    source_state_digest: proposed.payload.config.source_state_digest,
    candidate,
    candidate_digest: candidateDigest,
    reviewed_by: 'human:test-owner',
    reviewed_at: FIXED_NOW,
  });

  const reviewed = await migrator(root).scan();
  assert.equal(reviewed.payload.config.action, 'WRITE');
  assert.equal(reviewed.payload.blockers.some(({ code }) => code === 'CONFIG_REVIEW_REQUIRED'), false);
  const applied = await migrator(root).apply({ planFile: await persistPlan(root, reviewed) });

  const writtenConfig = JSON.parse(await readFile(
    path.join(root, '.agent/context/project-config.json'),
    'utf8',
  ));
  assert.equal(writtenConfig.schema, 'project_config_v2');
  assert.equal(writtenConfig.policy.max_iterations, 42);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v2');
  assert.equal(applied.completed_operations, 2);
});

test('completed migration accepts valid forward v2 ledger and config evolution', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  const plan = await prepareReviewedConfigPlan(root);
  const planFile = await persistPlan(root, plan);
  await migrator(root).apply({ planFile });

  const evolvedLedger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  evolvedLedger.ledgerVersion += 5;
  await writeJson(ledgerPath, evolvedLedger);
  const configPath = path.join(root, '.agent/context/project-config.json');
  const evolvedConfig = JSON.parse(await readFile(configPath, 'utf8'));
  evolvedConfig.mode = 'OBSERVE';
  evolvedConfig.config_version += 1;
  evolvedConfig.mode_version += 1;
  evolvedConfig.policy.max_iterations = 41;
  await writeJson(configPath, evolvedConfig);
  const repeated = await migrator(root).apply({ planFile });
  assert.equal(repeated.status, 'NOOP_ALREADY_APPLIED');
  await writeText(
    path.join(root, '.scratch/loop-runtime-v2/issues/issue-001.md'),
    '# Issue\n\n- Artifact contract version: `2.0.0`\n',
  );
  const verification = await migrator(root).verify();
  assert.equal(verification.ready_for_enforce, true);
  assert.deepEqual(verification.blockers, []);
});

test('completed migration rejects deletion, invalid v2, and different-run replacement', async (t) => {
  const cases = [
    {
      name: 'deleted',
      mutate: async (ledgerPath) => rm(ledgerPath),
    },
    {
      name: 'invalid',
      mutate: async (ledgerPath) => writeJson(ledgerPath, {
        schema: 'work_package_ledger_v2',
        runId: 'RUN-001',
      }),
    },
    {
      name: 'different-run',
      mutate: async (ledgerPath) => {
        const value = JSON.parse(await readFile(ledgerPath, 'utf8'));
        value.runId = 'OTHER-RUN';
        value.ledgerVersion += 1;
        await writeJson(ledgerPath, value);
      },
    },
    {
      name: 'same-version-divergent',
      mutate: async (ledgerPath) => {
        const value = JSON.parse(await readFile(ledgerPath, 'utf8'));
        value.goals['GOAL-READY'].verification = 'divergent bytes without version advance';
        await writeJson(ledgerPath, value);
      },
    },
  ];

  for (const entry of cases) {
    const { root, ledgerPath } = await createFixture(t);
    const plan = await migrator(root).scan();
    const planFile = await persistPlan(root, plan, `${entry.name}-plan.json`);
    await migrator(root).apply({ planFile });
    await entry.mutate(ledgerPath);

    await assert.rejects(
      () => migrator(root).apply({ planFile }),
      /DRIFT|MISMATCH|ROLLBACK_FORBIDDEN/u,
    );
    const verification = await migrator(root).verify();
    assert.equal(
      verification.blockers.some(({ code }) => code === 'MIGRATION_TARGET_DRIFT'),
      true,
      entry.name,
    );
  }
});

test('apply contends on the same per-ledger owner lock used by ledger writers', async (t) => {
  const { root, ledgerPath } = await createFixture(t);
  const planFile = await persistPlan(root, await migrator(root).scan());
  let releaseLock;
  let signalAcquired;
  const acquired = new Promise((resolve) => { signalAcquired = resolve; });
  const release = new Promise((resolve) => { releaseLock = resolve; });
  const holder = withOwnerLock(
    path.dirname(ledgerPath),
    `${ledgerPath}.lock`,
    async () => {
      signalAcquired();
      await release;
    },
  );
  await acquired;

  try {
    await assert.rejects(
      () => migrator(root, {
        targetLockOptions: { timeoutMs: 0, retryMs: 0 },
      }).apply({ planFile }),
      /Timed out waiting for owner lock/u,
    );
    assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).schema, 'work_package_ledger_v1');
  } finally {
    releaseLock();
    await holder;
  }
});

test('apply CAS recheck preserves a racing target write immediately before replace', async (t) => {
  const { root, ledgerPath, legacyLedger } = await createFixture(t);
  const planFile = await persistPlan(root, await migrator(root).scan());
  const racingLedger = { ...legacyLedger, raceMarker: 'preserve-me' };
  let injected = false;

  await assert.rejects(
    () => migrator(root, {
      beforeTargetReplaceCheck: async (operation) => {
        if (!injected && operation.path.endsWith('/ledger.json')) {
          injected = true;
          await writeJson(ledgerPath, racingLedger);
        }
      },
    }).apply({ planFile }),
    /CAS_CONFLICT/u,
  );

  assert.deepEqual(JSON.parse(await readFile(ledgerPath, 'utf8')), racingLedger);
  const directoryEntries = await readdir(path.dirname(ledgerPath));
  assert.equal(directoryEntries.some((name) => name.endsWith('.tmp')), false);
});

test('real CLI process emits JSON stdout and concise stderr for strict commands', async (t) => {
  const { root } = await createFixture(t);
  const scanned = await execFileAsync(process.execPath, [MIGRATION_CLI, 'scan'], { cwd: root });
  assert.equal(scanned.stderr, '');
  const plan = JSON.parse(scanned.stdout);
  assert.equal(plan.schema, 'loop_runtime_migration_plan_v2');

  const planFile = await persistPlan(root, plan, 'cli-plan.json');
  const applied = await execFileAsync(
    process.execPath,
    [MIGRATION_CLI, 'apply', '--plan', path.basename(planFile)],
    { cwd: root },
  );
  assert.equal(applied.stderr, '');
  assert.equal(JSON.parse(applied.stdout).status, 'APPLIED');
  const verified = await execFileAsync(process.execPath, [MIGRATION_CLI, 'verify'], { cwd: root });
  assert.equal(verified.stderr, '');
  assert.equal(JSON.parse(verified.stdout).ready_for_enforce, false);

  await assert.rejects(
    execFileAsync(process.execPath, [MIGRATION_CLI, 'scan', '--write'], { cwd: root }),
    (error) => error.code === 1 && /USAGE/u.test(error.stderr) && error.stdout === '',
  );
});

test('scan rejects symlinks and enforces per-file and entry-count limits', async (t) => {
  {
    const { root } = await createFixture(t);
    const target = path.join(root, 'legacy-target');
    await mkdir(target);
    const link = path.join(root, '.scratch/loop-runtime-v1/link');
    await mkdir(path.dirname(link), { recursive: true });
    await symlink(target, link, 'junction');
    await assert.rejects(() => migrator(root).scan(), /SYMLINK_REJECTED/u);
  }
  {
    const { root } = await createFixture(t);
    await writeText(
      path.join(root, '.scratch/loop-runtime-v1/oversized.receipt'),
      'x'.repeat(12_000),
    );
    await assert.rejects(
      () => migrator(root, {
        limits: { maxFileBytes: 10_000, maxAggregateBytes: 100_000, maxFiles: 512 },
      }).scan(),
      /File exceeds 10000 bytes/u,
    );
  }
  {
    const { root } = await createFixture(t);
    await writeText(
      path.join(root, '.scratch/loop-runtime-v2/issues/issue-002.md'),
      '# Extra issue\n\n- Artifact contract version: `2.0.0`\n',
    );
    await assert.rejects(
      () => migrator(root, {
        limits: { maxFileBytes: 10_000, maxAggregateBytes: 100_000, maxFiles: 7 },
      }).scan(),
      /SCAN_LIMIT_EXCEEDED/u,
    );
  }
});

test('verify rejects preimage manifest digest and path tampering', async (t) => {
  const mutations = [
    {
      name: 'digest',
      apply: (manifest) => { manifest.preimages[0].target_digest = `sha256:${'f'.repeat(64)}`; },
    },
    {
      name: 'path',
      apply: (manifest) => { manifest.preimages[0].backup_path = '../escape.json'; },
    },
  ];

  for (const mutation of mutations) {
    const { root } = await createFixture(t);
    const plan = await migrator(root).scan();
    const applied = await migrator(root).apply({
      planFile: await persistPlan(root, plan, `${mutation.name}-manifest-plan.json`),
    });
    const manifestPath = path.join(root, applied.state_dir, 'preimages/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    mutation.apply(manifest);
    await writeJson(manifestPath, manifest);

    const verification = await migrator(root).verify();
    assert.equal(
      verification.blockers.some(({ code }) => code === 'CORRUPT_MIGRATION_STATE'),
      true,
      mutation.name,
    );
  }
});

test('scan ignores discriminator-marked v2 storage while classifying explicit v1 roots', async (t) => {
  const { root } = await createFixture(t);
  const runRoot = path.join(root, '.scratch/loop-runs/RUN-V2');
  await writeJson(path.join(runRoot, 'contract.json'), {
    schema: 'loop_run_contract_v2',
    contract_version: '2.0.0',
  });
  await writeJson(path.join(runRoot, 'state.json'), {
    schema: 'loop_run_state_v2',
    contract_version: '2.0.0',
    status: 'PAUSED',
  });
  await writeText(
    path.join(runRoot, 'events.jsonl'),
    `${JSON.stringify({ schema: 'loop_run_event_v2', contract_version: '2.0.0' })}\n`,
  );
  await writeJson(path.join(root, '.scratch/loop-runs-v1/paused.json'), {
    schema: 'loop_run_state_v1',
    status: 'PAUSED',
  });

  const plan = await migrator(root).scan();
  assert.equal(
    plan.payload.blockers.some(({ path: candidate }) => candidate?.startsWith('.scratch/loop-runs/RUN-V2/')),
    false,
  );
  assert.equal(
    plan.payload.blockers.some(({ code, path: candidate }) => (
      code === 'ACTIVE_V1_REPLAN_REQUIRED'
      && candidate === '.scratch/loop-runs-v1/paused.json'
    )),
    true,
  );
});
