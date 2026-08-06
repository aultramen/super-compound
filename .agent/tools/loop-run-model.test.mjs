import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelUrl = new URL("./loop-run-model.mjs", import.meta.url);
const projectConfigSchemaUrl = new URL(
  "../context/schemas/project-config-v2.schema.json",
  import.meta.url,
);
const runStateSchemaUrl = new URL(
  "../context/schemas/loop-run-state-v2.schema.json",
  import.meta.url,
);
const runContractSchemaUrl = new URL(
  "../context/schemas/loop-run-contract-v2.schema.json",
  import.meta.url,
);

function makeReleaseEvidence(runHeadDigest) {
  const evidence = {
    run_head_digest: runHeadDigest,
    eval_result_digest: `sha256:${"b".repeat(64)}`,
    work_package_digest: `sha256:${"c".repeat(64)}`,
    work_package_goal_id: "GOAL-009",
    finding_set_digest: `sha256:${"d".repeat(64)}`,
    checker_evidence_digest: null,
    workspace_head_git_sha: "1".repeat(40),
  };
  return {
    fingerprint: `sha256:${createHash("sha256")
      .update(JSON.stringify(evidence))
      .digest("hex")}`,
    ...evidence,
  };
}

const baseBudget = {
  max_iterations: 20,
  max_runtime_minutes: 180,
  max_no_progress_iterations: 5,
  max_tokens: null,
  max_cost_micro: null,
};

const canonicalConfigSurface = {
  retention: {
    run_metadata_days: 30,
    audit_evidence_days: 90,
    legal_hold_behavior: "PRESERVE",
  },
  telemetry: {
    enabled: false,
    persistence_required: false,
    redaction_revision: null,
    retention_days: null,
    max_file_bytes: null,
  },
  risk: {
    default_profile: "MEDIUM",
    maximum_autonomy: "INTERACTIVE",
    external_write_policy: "DENY",
  },
  write_classification: {
    runtime_audit_prefixes: [".scratch/loop-runs/"],
    authority_prefixes: ["docs/fsd/"],
    authority_exact_paths: [],
    unknown_path_class: "implementation_write",
  },
  capability_requirements: {
    enforce: ["HARD_WRITE_INTERCEPTION"],
    background: ["FINITE_RUNTIME_CAP"],
    external_write: ["DURABLE_INTENT"],
  },
  artifact_authority: {
    required_contract_version: "2.0.0",
    execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
    legacy_action: "REPLAN_REQUIRED",
  },
};

test("effective policy applies restrictive deterministic merging and rejects policy drift", async () => {
  const { resolveEffectivePolicy } = await import(modelUrl);
  const result = resolveEffectivePolicy({
    global: {
      ...baseBudget,
      allowlisted_operations: ["read", "write"],
      credential_scopes: ["audit:read", "repo:write"],
      required_gates: ["deterministic-verifier"],
      approval_ttl_minutes: 60,
      risk: "LOW",
      isolation: "WORKTREE",
      expires_at: "2026-07-17T18:00:00.000Z",
    },
    fsd: {
      ...baseBudget,
      max_iterations: 12,
      max_runtime_minutes: 120,
      max_no_progress_iterations: 4,
      max_tokens: 9000,
      allowlisted_operations: ["write", "read"],
      credential_scopes: ["repo:write"],
      required_gates: ["security-review"],
      risk: "HIGH",
      isolation: "PROCESS",
      expires_at: "2026-07-17T16:00:00.000Z",
    },
    operation: {
      ...baseBudget,
      max_iterations: 10,
      max_runtime_minutes: 60,
      max_no_progress_iterations: 3,
      max_tokens: 5000,
      allowlisted_operations: ["write"],
      credential_scopes: ["repo:write"],
      required_gates: ["operation-readback"],
      risk: "MEDIUM",
      isolation: "NETWORK",
      expires_at: "2026-07-17T17:00:00.000Z",
    },
    human: {
      ...baseBudget,
      max_iterations: 8,
      max_no_progress_iterations: 2,
    },
  });

  assert.deepEqual(result, {
    max_iterations: 8,
    max_runtime_minutes: 60,
    max_no_progress_iterations: 2,
    max_tokens: 5000,
    max_cost_micro: null,
    approval_ttl_minutes: 60,
    allowlisted_operations: ["write"],
    credential_scopes: ["repo:write"],
    required_gates: [
      "deterministic-verifier",
      "operation-readback",
      "security-review",
    ],
    risk: "HIGH",
    isolation: "NETWORK",
    expires_at: "2026-07-17T16:00:00.000Z",
  });

  assert.throws(
    () =>
      resolveEffectivePolicy({
        global: baseBudget,
        fsd: baseBudget,
        operation: baseBudget,
        human: { ...baseBudget, max_iterations: null },
      }),
    /human max_iterations.*positive safe integer/i,
  );

  assert.throws(
    () =>
      resolveEffectivePolicy({
        global: { ...baseBudget, permissive_override: true },
        fsd: baseBudget,
        operation: baseBudget,
        human: { ...baseBudget, max_iterations: 8 },
      }),
    /unknown policy field `permissive_override`/i,
  );
});

test("project config loading is pure and evaluates absent, v1, or unsafe ENFORCE config as HALTED", async () => {
  const { loadProjectConfig } = await import(modelUrl);
  const schema = JSON.parse(await readFile(projectConfigSchemaUrl, "utf8"));
  const valid = {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
    policy: {
      ...baseBudget,
      max_iterations: 10,
      max_no_progress_iterations: 3,
      approval_ttl_minutes: 720,
      allowlisted_operations: [],
      credential_scopes: [],
      required_gates: ["fresh-verifier"],
      risk: "MEDIUM",
      isolation: "WORKTREE",
      expires_at: "9999-12-31T23:59:59.999999999Z",
    },
    background_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 21_600_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    billing_currency: "USD",
    ...canonicalConfigSurface,
  };

  const loaded = loadProjectConfig(JSON.stringify(valid), schema);
  assert.deepEqual(loaded.config, valid);
  assert.match(loaded.config_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(loaded.effective_mode, "DISABLED");
  assert.deepEqual(loaded.errors, []);

  const missing = loadProjectConfig(null, schema);
  assert.equal(missing.effective_mode, "HALTED");
  assert.match(missing.errors.join("\n"), /missing/i);

  const v1 = loadProjectConfig(
    JSON.stringify({ ...valid, schema: "project_config_v1" }),
    schema,
  );
  assert.equal(v1.effective_mode, "HALTED");
  assert.match(v1.errors.join("\n"), /schema validation/i);

  const unsafeEnforce = loadProjectConfig(
    JSON.stringify({
      ...valid,
      mode: "ENFORCE",
      policy: {
        ...valid.policy,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
      },
    }),
    schema,
  );
  assert.equal(unsafeEnforce.effective_mode, "HALTED");
  assert.match(unsafeEnforce.errors.join("\n"), /finite max_runtime_minutes/i);
  assert.match(unsafeEnforce.errors.join("\n"), /finite max_no_progress_iterations/i);

  const finiteButUnattestedEnforce = loadProjectConfig(
    JSON.stringify({ ...valid, mode: "ENFORCE" }),
    schema,
  );
  assert.equal(finiteButUnattestedEnforce.effective_mode, "HALTED");
  assert.match(finiteButUnattestedEnforce.errors.join("\n"), /capability attestation/i);

  const verifiedEnforce = loadProjectConfig(
    JSON.stringify({ ...valid, mode: "ENFORCE" }),
    schema,
    { capabilityAttestationVerified: true },
  );
  assert.equal(verifiedEnforce.effective_mode, "ENFORCE");
  assert.deepEqual(verifiedEnforce.errors, []);

  const unsafeEvenWhenAttested = loadProjectConfig(
    JSON.stringify({
      ...valid,
      mode: "ENFORCE",
      policy: {
        ...valid.policy,
        max_runtime_minutes: null,
        max_no_progress_iterations: null,
      },
    }),
    schema,
    { capabilityAttestationVerified: true },
  );
  assert.equal(unsafeEvenWhenAttested.effective_mode, "HALTED");
  assert.match(
    unsafeEvenWhenAttested.errors.join("\n"),
    /finite max_runtime_minutes/i,
  );
  assert.throws(
    () =>
      loadProjectConfig(JSON.stringify({ ...valid, mode: "ENFORCE" }), schema, {
        capabilityAttestationVerified: "true",
      }),
    /capabilityAttestationVerified.*boolean/i,
  );
  assert.throws(
    () =>
      loadProjectConfig(JSON.stringify({ ...valid, mode: "ENFORCE" }), schema, {
        capabilityAttestationVerified: true,
        verifyHostAttestation: () => true,
      }),
    /unknown project config load option/i,
  );
});

test("project config digest and full policy surface compose without dropping fields", async () => {
  const { loadProjectConfig, resolveEffectivePolicy } = await import(modelUrl);
  const schema = JSON.parse(await readFile(projectConfigSchemaUrl, "utf8"));
  const config = {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
    policy: {
      ...baseBudget,
      max_iterations: 10,
      max_no_progress_iterations: 3,
      approval_ttl_minutes: 720,
      allowlisted_operations: ["read", "write"],
      credential_scopes: ["audit:read", "repo:write"],
      required_gates: ["config-gate"],
      risk: "LOW",
      isolation: "WORKTREE",
      expires_at: "2026-07-17T18:00:00.000Z",
    },
    background_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 21_600_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    billing_currency: "USD",
    ...canonicalConfigSurface,
  };
  const compact = loadProjectConfig(JSON.stringify(config), schema);
  const pretty = loadProjectConfig(JSON.stringify(config, null, 2), schema);
  assert.equal(compact.effective_mode, "DISABLED");
  assert.match(compact.config_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(pretty.config_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.notEqual(compact.config_digest, pretty.config_digest);
  assert.deepEqual(compact.config, config);

  const effective = resolveEffectivePolicy({
    global: compact.config.policy,
    fsd: {
      ...baseBudget,
      max_iterations: 9,
      approval_ttl_minutes: 600,
      allowlisted_operations: ["write"],
      credential_scopes: ["repo:write"],
      required_gates: ["fsd-gate"],
      risk: "HIGH",
      isolation: "PROCESS",
      expires_at: "2026-07-17T17:00:00.000Z",
    },
    operation: {
      ...baseBudget,
      max_iterations: 8,
      approval_ttl_minutes: 300,
      allowlisted_operations: ["write"],
      credential_scopes: ["repo:write"],
      required_gates: ["operation-gate"],
      risk: "MEDIUM",
      isolation: "NETWORK",
      expires_at: "2026-07-17T16:00:00.000Z",
    },
    human: { ...baseBudget, max_iterations: 7, approval_ttl_minutes: 480 },
  });
  assert.deepEqual(effective, {
    max_iterations: 7,
    max_runtime_minutes: 180,
    max_no_progress_iterations: 3,
    max_tokens: null,
    max_cost_micro: null,
    approval_ttl_minutes: 300,
    allowlisted_operations: ["write"],
    credential_scopes: ["repo:write"],
    required_gates: ["config-gate", "fsd-gate", "operation-gate"],
    risk: "HIGH",
    isolation: "NETWORK",
    expires_at: "2026-07-17T16:00:00.000Z",
  });
});

test("effective policy either denies missing mandatory fields or matches the persisted contract", async () => {
  const { resolveEffectivePolicy } = await import(modelUrl);
  const { validateValue } = await import(new URL("./schema-validator.mjs", import.meta.url));
  const contractSchema = JSON.parse(await readFile(runContractSchemaUrl, "utf8"));

  assert.throws(
    () =>
      resolveEffectivePolicy({
        global: { ...baseBudget, approval_ttl_minutes: 60 },
        fsd: baseBudget,
        operation: baseBudget,
        human: baseBudget,
      }),
    /missing mandatory effective policy field/i,
  );

  const completeGlobal = {
    ...baseBudget,
    approval_ttl_minutes: 60,
    allowlisted_operations: ["read"],
    credential_scopes: ["repo:read"],
    required_gates: ["verification"],
    risk: "LOW",
    isolation: "WORKTREE",
    expires_at: "2026-07-17T18:00:00.000Z",
  };
  assert.throws(
    () =>
      resolveEffectivePolicy({
        global: { ...completeGlobal, allowlisted_operations: ["read operation"] },
        fsd: baseBudget,
        operation: baseBudget,
        human: baseBudget,
      }),
    /bounded identifiers/i,
  );

  const effective = resolveEffectivePolicy({
    global: completeGlobal,
    fsd: baseBudget,
    operation: baseBudget,
    human: baseBudget,
  });
  const policySchema = {
    $schema: contractSchema.$schema,
    $defs: contractSchema.$defs,
    $ref: "#/$defs/policy",
  };
  assert.deepEqual(validateValue(effective, policySchema), {
    valid: true,
    errors: [],
  });
});

test("effective policy preserves sub-millisecond earliest expiry ordering", async () => {
  const { resolveEffectivePolicy } = await import(modelUrl);
  const completeGlobal = {
    ...baseBudget,
    approval_ttl_minutes: 60,
    allowlisted_operations: ["read"],
    credential_scopes: ["repo:read"],
    required_gates: ["verification"],
    risk: "LOW",
    isolation: "WORKTREE",
    expires_at: "2026-07-17T18:00:00.000000009Z",
  };
  const effective = resolveEffectivePolicy({
    global: completeGlobal,
    fsd: { ...baseBudget, expires_at: "2026-07-17T18:00:00.000000001Z" },
    operation: baseBudget,
    human: baseBudget,
  });
  assert.equal(effective.expires_at, "2026-07-17T18:00:00.000000001Z");
});

test("pure run transitions derive success only from bound release evidence", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"a".repeat(64)}`;
  const confirmationDigest = `sha256:${"c".repeat(64)}`;
  const state0 = createInitialRunState({
    run_id: "LER2-GOAL-003",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: {
      max_iterations: 2,
      max_runtime_minutes: 10,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost_micro: null,
    },
  });

  const deniedStart = reduceRunState(state0, {
    type: "START",
    confirmation_digest: confirmationDigest,
    at: "2026-07-17T04:00:00.000Z",
  });
  assert.deepEqual(deniedStart, {
    accepted: false,
    state: state0,
    reason: "APPROVAL_REQUIRED",
  });

  const confirmed = reduceRunState(state0, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: confirmationDigest,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-17T05:00:00.000Z",
    effective_budget: state0.effective_budget,
  });
  assert.equal(confirmed.accepted, true);
  assert.equal(confirmed.state.version, 1);
  assert.equal(state0.approval, null, "input state must not be mutated");

  const started = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: confirmationDigest,
    at: "2026-07-17T04:01:00.000Z",
  });
  assert.equal(started.accepted, true);
  assert.equal(started.state.status, "RUNNING");

  const outcomeRecorded = reduceRunState(started.state, {
    type: "RECORD_LEARNING_OUTCOME",
  });
  assert.equal(outcomeRecorded.accepted, true);
  assert.equal(outcomeRecorded.state.status, "RUNNING");
  assert.equal(outcomeRecorded.state.version, started.state.version + 1);
  const prematurePromotion = reduceRunState(outcomeRecorded.state, {
    type: "PROMOTE_VERIFIED_PATTERN",
  });
  assert.equal(prematurePromotion.accepted, false);
  assert.equal(prematurePromotion.reason, "FRESH_VERIFIER_PASS_REQUIRED");

  const intended = reduceRunState(outcomeRecorded.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: confirmationDigest,
    at: "2026-07-17T04:02:00.000Z",
    action_id: "action-001",
    idempotency_key: "run-003-action-001",
  });
  assert.equal(intended.accepted, true);
  assert.equal(intended.state.counters.iterations, 1);
  assert.deepEqual(intended.state.active_action, {
    action_id: "action-001",
    idempotency_key: "run-003-action-001",
  });

  const duplicateIntent = reduceRunState(intended.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: confirmationDigest,
    at: "2026-07-17T04:03:00.000Z",
    action_id: "action-002",
    idempotency_key: "run-003-action-002",
  });
  assert.equal(duplicateIntent.accepted, false);
  assert.equal(duplicateIntent.reason, "ACTION_ALREADY_ACTIVE");
  assert.equal(duplicateIntent.state.counters.iterations, 1);

  const observed = reduceRunState(intended.state, {
    type: "OBSERVE_ACTION",
    duration_ms: 500,
  });
  assert.equal(observed.state.status, "OBSERVED");
  assert.equal(observed.state.counters.active_runtime_ms, 500);
  assert.equal(observed.state.active_action, null);

  const verifying = reduceRunState(observed.state, {
    type: "BEGIN_VERIFICATION",
  });
  const verifyingAtHead = { ...verifying.state, last_event_hash: digest };
  const callerClaim = reduceRunState(verifyingAtHead, {
    type: "VERIFICATION_PASSED",
    fingerprint: `sha256:${"b".repeat(64)}`,
    fresh: true,
    gates_satisfied: true,
  });
  assert.equal(callerClaim.accepted, false);
  assert.equal(callerClaim.state.status, "VERIFYING");

  const releaseEvidence = makeReleaseEvidence(digest);
  const passed = reduceRunState(verifyingAtHead, {
    type: "VERIFICATION_PASSED",
    release_evidence: releaseEvidence,
  });
  assert.equal(passed.accepted, true);
  assert.equal(passed.state.status, "SUCCESS");
  assert.equal(passed.state.terminal_reason, "GOAL_VERIFIED");
  assert.deepEqual(passed.state.verification, {
    status: "PASS",
    fresh: true,
    gates_satisfied: true,
    fingerprint: releaseEvidence.fingerprint,
  });
  const promoted = reduceRunState(passed.state, {
    type: "PROMOTE_VERIFIED_PATTERN",
  });
  assert.equal(promoted.accepted, true);
  assert.equal(promoted.state.status, "SUCCESS");
  assert.equal(promoted.state.version, passed.state.version + 1);

  const forged = structuredClone(releaseEvidence);
  forged.finding_set_digest = `sha256:${"e".repeat(64)}`;
  const forgedPass = reduceRunState(verifyingAtHead, {
    type: "VERIFICATION_PASSED",
    release_evidence: forged,
  });
  assert.equal(forgedPass.accepted, false);
  assert.match(forgedPass.reason, /RELEASE_EVIDENCE/i);
});

test("resume approval cannot increase same-run caps and expired approval cannot admit work", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"d".repeat(64)}`;
  const state = {
    ...createInitialRunState({
      run_id: "resume-run",
      mode: "ENFORCE",
      authority_digest: digest,
      policy_digest: digest,
      effective_budget: {
        max_iterations: 5,
        max_runtime_minutes: 30,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost_micro: null,
      },
    }),
    status: "PAUSED",
    version: 4,
    sequence: 4,
  };

  const loosened = reduceRunState(state, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digest,
    phase: "RESUME",
    expected_run_version: 4,
    expires_at: "2026-07-17T05:00:00.000Z",
    effective_budget: { ...state.effective_budget, max_iterations: 6 },
  });
  assert.equal(loosened.accepted, false);
  assert.equal(loosened.reason, "BUDGET_LOOSENING_FORBIDDEN");

  const confirmed = reduceRunState(state, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digest,
    phase: "RESUME",
    expected_run_version: 4,
    expires_at: "2026-07-17T05:00:00.000Z",
    effective_budget: { ...state.effective_budget, max_iterations: 4 },
  });
  assert.equal(confirmed.accepted, true);

  const expired = reduceRunState(confirmed.state, {
    type: "RESUME",
    confirmation_digest: digest,
    at: "2026-07-17T05:00:00.001Z",
  });
  assert.equal(expired.accepted, false);
  assert.equal(expired.reason, "APPROVAL_EXPIRED");
  assert.equal(expired.state.status, "PAUSED");
});

test("approval denies admission exactly at expiry and rejects timezone-less observed time", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"5".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "expiry-boundary-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  });
  const confirmed = reduceRunState(initial, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digest,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-17T08:00:00.000Z",
    effective_budget: baseBudget,
  });
  assert.equal(confirmed.accepted, true);

  const exactExpiry = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: digest,
    at: "2026-07-17T08:00:00.000Z",
  });
  assert.equal(exactExpiry.accepted, false);
  assert.equal(exactExpiry.reason, "APPROVAL_EXPIRED");

  const timezoneLess = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: digest,
    at: "2026-07-17T07:00:00.000",
  });
  assert.equal(timezoneLess.accepted, false);
  assert.equal(timezoneLess.reason, "INVALID_OBSERVED_TIME");
});

test("approval admission preserves canonical nanosecond ordering", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"8".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "nanosecond-admission-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  });
  const confirmed = reduceRunState(initial, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digest,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-17T08:00:00.000000009Z",
    effective_budget: baseBudget,
  });

  const started = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: digest,
    at: "2026-07-17T08:00:00.000000001Z",
  });
  assert.equal(started.accepted, true);

  const intended = reduceRunState(started.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: digest,
    at: "2026-07-17T08:00:00.000000008Z",
    action_id: "last-nanosecond-action",
    idempotency_key: "last-nanosecond-action-key",
  });
  assert.equal(intended.accepted, true);

  const expired = reduceRunState(started.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: digest,
    at: "2026-07-17T08:00:00.000000009Z",
    action_id: "expired-action",
    idempotency_key: "expired-action-key",
  });
  assert.equal(expired.accepted, false);
  assert.equal(expired.reason, "APPROVAL_EXPIRED");
});

test("accounting guards overflow and includes action verification and backoff runtime", async () => {
  const { createInitialRunState, evaluateStop, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"4".repeat(64)}`;
  assert.throws(
    () =>
      createInitialRunState({
        run_id: "unsafe-runtime-budget",
        mode: "OBSERVE",
        authority_digest: digest,
        policy_digest: digest,
        effective_budget: {
          ...baseBudget,
          max_runtime_minutes: Math.floor(Number.MAX_SAFE_INTEGER / 60_000) + 1,
        },
      }),
    /effective_budget is invalid/i,
  );

  const initial = createInitialRunState({
    run_id: "active-runtime-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  });
  const confirmed = reduceRunState(initial, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digest,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-17T08:00:00.000Z",
    effective_budget: baseBudget,
  });
  const started = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: digest,
    at: "2026-07-17T07:00:00.000Z",
  });
  const intended = reduceRunState(started.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: digest,
    at: "2026-07-17T07:01:00.000Z",
    action_id: "runtime-action",
    idempotency_key: "runtime-action-key",
  });
  const observed = reduceRunState(intended.state, {
    type: "OBSERVE_ACTION",
    duration_ms: 100,
  });
  const observationDuration = reduceRunState(observed.state, {
    type: "RECORD_OBSERVATION_DURATION",
    duration_ms: 50,
  });
  assert.equal(observationDuration.accepted, true);
  assert.equal(observationDuration.state.status, "OBSERVED");
  const verifying = reduceRunState(observationDuration.state, {
    type: "BEGIN_VERIFICATION",
  });
  const verificationDuration = reduceRunState(verifying.state, {
    type: "RECORD_VERIFICATION_DURATION",
    duration_ms: 200,
  });
  assert.equal(verificationDuration.accepted, true);
  assert.equal(verificationDuration.state.status, "VERIFYING");
  const failed = reduceRunState(verificationDuration.state, {
    type: "VERIFICATION_FAILED",
    verification_status: "FAIL",
    fingerprint: digest,
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: "runtime-approach",
  });
  const backoffDuration = reduceRunState(failed.state, {
    type: "RECORD_BACKOFF_DURATION",
    duration_ms: 300,
  });
  assert.equal(backoffDuration.accepted, true);
  assert.equal(backoffDuration.state.counters.active_runtime_ms, 650);

  const resumeDuration = reduceRunState(
    { ...backoffDuration.state, status: "RESUMING" },
    { type: "RECORD_RESUME_DURATION", duration_ms: 400 },
  );
  assert.equal(resumeDuration.accepted, true);
  assert.equal(resumeDuration.state.status, "RESUMING");
  assert.equal(resumeDuration.state.counters.active_runtime_ms, 1050);

  const overflowingCounter = {
    ...backoffDuration.state,
    counters: {
      ...backoffDuration.state.counters,
      active_runtime_ms: Number.MAX_SAFE_INTEGER,
    },
  };
  const durationOverflow = reduceRunState(overflowingCounter, {
    type: "RECORD_BACKOFF_DURATION",
    duration_ms: 1,
  });
  assert.equal(durationOverflow.accepted, false);
  assert.equal(durationOverflow.reason, "ACTIVE_RUNTIME_OVERFLOW");
  assert.equal(durationOverflow.state, overflowingCounter);

  const versionOverflowState = {
    ...backoffDuration.state,
    version: Number.MAX_SAFE_INTEGER,
    sequence: Number.MAX_SAFE_INTEGER,
  };
  const versionOverflow = reduceRunState(versionOverflowState, { type: "CANCEL" });
  assert.equal(versionOverflow.accepted, false);
  assert.equal(versionOverflow.reason, "VERSION_OR_SEQUENCE_OVERFLOW");
  assert.equal(versionOverflow.state, versionOverflowState);

  const unsafeRuntimeState = {
    ...backoffDuration.state,
    effective_budget: {
      ...backoffDuration.state.effective_budget,
      max_runtime_minutes: Number.MAX_SAFE_INTEGER,
    },
  };
  assert.deepEqual(evaluateStop(unsafeRuntimeState), {
    terminal_status: "POLICY_STOP",
    reason: "UNSAFE_RUNTIME_LIMIT",
  });
});

test("pause and resume preserve the exact lifecycle phase without action-cycle bypass", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"9".repeat(64)}`;

  for (const phase of ["RUNNING", "OBSERVED", "VERIFYING"]) {
    const initial = {
      ...createInitialRunState({
        run_id: `pause-${phase.toLowerCase()}`,
        mode: "OBSERVE",
        authority_digest: digest,
        policy_digest: digest,
        effective_budget: baseBudget,
      }),
      status: phase,
    };
    const paused = reduceRunState(initial, { type: "PAUSE" });
    assert.equal(paused.accepted, true, phase);
    assert.equal(paused.state.status, "PAUSED", phase);
    assert.equal(paused.state.paused_from, phase, phase);

    const confirmed = reduceRunState(paused.state, {
      type: "BUDGET_CONFIRMED",
      confirmation_digest: digest,
      phase: "RESUME",
      expected_run_version: paused.state.version,
      expires_at: "2026-07-17T08:00:00.000Z",
      effective_budget: paused.state.effective_budget,
    });
    assert.equal(confirmed.accepted, true, phase);
    const resuming = reduceRunState(confirmed.state, {
      type: "RESUME",
      confirmation_digest: digest,
      at: "2026-07-17T07:00:00.000Z",
    });
    assert.equal(resuming.accepted, true, phase);
    const completed = reduceRunState(resuming.state, { type: "RESUME_COMPLETED" });
    assert.equal(completed.accepted, true, phase);
    assert.equal(completed.state.status, phase, phase);
    assert.equal(completed.state.paused_from, null, phase);

    if (phase !== "RUNNING") {
      const bypass = reduceRunState(completed.state, {
        type: "BEGIN_ACTION",
        confirmation_digest: digest,
        at: "2026-07-17T07:01:00.000Z",
        action_id: "bypass-action",
        idempotency_key: "bypass-action-key",
      });
      assert.equal(bypass.accepted, false, phase);
      assert.equal(bypass.reason, "INVALID_TRANSITION", phase);
    }
  }
});

test("no-progress fingerprints are sanitized deterministic digests and stop order is fail closed", async () => {
  const {
    createInitialRunState,
    createProgressFingerprint,
    evaluateStop,
    updateNoProgress,
  } = await import(modelUrl);
  const digest = `sha256:${"e".repeat(64)}`;
  const observation = {
    verifier_id: "TEST-003",
    verifier_digest: digest,
    exit_code: 1,
    normalized_failures: ["  schema mismatch  ", "UNKNOWN FIELD"],
    diff_digest: digest,
    coverage_delta: 0,
    requirement_delta: 0,
    approach_id: "strict-schema-a",
  };
  const first = createProgressFingerprint(observation);
  const reordered = createProgressFingerprint({
    ...observation,
    normalized_failures: ["unknown   field", "schema mismatch"],
  });
  assert.match(first, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(first, reordered);
  assert.equal(
    first,
    createProgressFingerprint({ ...observation, approach_id: "strict-schema-b" }),
  );
  assert.equal(first.includes("schema mismatch"), false, "raw failures must not persist");
  const privacyRedacted = createProgressFingerprint({
    ...observation,
    normalized_failures: [
      "Failure for one@example.com using ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    ],
  });
  assert.equal(
    privacyRedacted,
    createProgressFingerprint({
      ...observation,
      normalized_failures: [
        "Failure for two@example.com using ghp_0987654321abcdefghijklmnopqrstuvwxyz",
      ],
    }),
    "secret and PII variants must share one redacted failure identity",
  );

  const established = updateNoProgress(
    { count: 0, fingerprint: null, approach_id: null },
    {
      fingerprint: first,
      requirement_delta: 0,
      coverage_delta: 0,
      meaningful_diff_count: 0,
      approach_id: "strict-schema-a",
    },
  );
  assert.deepEqual(established, {
    count: 0,
    fingerprint: first,
    approach_id: "strict-schema-a",
  });
  assert.deepEqual(
    updateNoProgress(established, {
      fingerprint: first,
      requirement_delta: 0,
      coverage_delta: 0,
      meaningful_diff_count: 0,
      approach_id: "strict-schema-a",
    }),
    { count: 1, fingerprint: first, approach_id: "strict-schema-a" },
  );
  assert.deepEqual(
    updateNoProgress(
      { count: 2, fingerprint: first, approach_id: "strict-schema-a" },
      {
        fingerprint: first,
        requirement_delta: 1,
        coverage_delta: 0,
        meaningful_diff_count: 0,
        approach_id: "strict-schema-a",
      },
    ),
    { count: 0, fingerprint: first, approach_id: "strict-schema-a" },
  );

  const state = createInitialRunState({
    run_id: "stop-order-run",
    mode: "ENFORCE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: {
      max_iterations: 1,
      max_runtime_minutes: 1,
      max_no_progress_iterations: 1,
      max_tokens: null,
      max_cost_micro: null,
    },
  });
  state.counters.iterations = 1;
  state.verification = {
    status: "PASS",
    fresh: true,
    gates_satisfied: true,
    fingerprint: first,
  };

  assert.deepEqual(
    evaluateStop(state, {
      safety_stop: { terminal_status: "POLICY_STOP", reason: "STALE_AUTHORITY" },
    }),
    { terminal_status: "POLICY_STOP", reason: "STALE_AUTHORITY" },
    "safety precedes an otherwise valid success",
  );
  assert.deepEqual(evaluateStop(state), {
    terminal_status: "SUCCESS",
    reason: "GOAL_VERIFIED",
  });

  state.verification.fresh = false;
  assert.deepEqual(evaluateStop(state), {
    terminal_status: "BUDGET_EXHAUSTED",
    reason: "MAX_ITERATIONS",
  });
});

test("TEST-010 finite verifier outcome requires finalized usage accounting", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const { normalizeUsageReceipt } = await import(
    new URL("./loop-telemetry-model.mjs", import.meta.url)
  );
  const digestA = `sha256:${"a".repeat(64)}`;
  const digestB = `sha256:${"b".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "usage-model-run",
    mode: "OBSERVE",
    authority_digest: digestA,
    policy_digest: digestB,
    effective_budget: {
      max_iterations: 5,
      max_runtime_minutes: 30,
      max_no_progress_iterations: 3,
      max_tokens: 100,
      max_cost_micro: 1000,
    },
  });
  const confirmed = reduceRunState(initial, {
    type: "BUDGET_CONFIRMED",
    confirmation_digest: digestA,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-21T16:00:00.000Z",
    effective_budget: initial.effective_budget,
  });
  assert.equal(confirmed.accepted, true);
  assert.equal(confirmed.state.counters.tokens, 0);
  assert.equal(confirmed.state.counters.token_measurement, "MEASURED");
  assert.equal(confirmed.state.counters.cost_micro, 0);
  assert.equal(confirmed.state.counters.cost_measurement, "MEASURED");

  const started = reduceRunState(confirmed.state, {
    type: "START",
    confirmation_digest: digestA,
    at: "2026-07-21T14:00:00.000Z",
  });
  const intended = reduceRunState(started.state, {
    type: "BEGIN_ACTION",
    confirmation_digest: digestA,
    at: "2026-07-21T14:01:00.000Z",
    action_id: "usage-action-1",
    idempotency_key: "usage-action-1",
  });
  intended.state.last_event_hash = digestA;
  assert.equal(intended.state.counters.usage_iteration, 1);
  assert.equal(intended.state.counters.usage_receipt_count, 0);
  assert.equal(intended.state.counters.usage_complete, false);
  const observed = reduceRunState(intended.state, {
    type: "OBSERVE_ACTION",
    duration_ms: 1,
  });
  const verifying = reduceRunState(observed.state, {
    type: "BEGIN_VERIFICATION",
  });
  assert.equal(verifying.accepted, true);
  assert.equal(verifying.state.status, "VERIFYING");
  const failure = {
    type: "VERIFICATION_FAILED",
    verification_status: "FAIL",
    fingerprint: digestB,
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: "usage-accounting",
  };
  for (const outcome of [
    failure,
    {
      type: "VERIFICATION_PASSED",
      release_evidence: makeReleaseEvidence(digestA),
    },
  ]) {
    const incomplete = reduceRunState(verifying.state, outcome);
    assert.equal(incomplete.accepted, false);
    assert.equal(incomplete.reason, "USAGE_ACCOUNTING_INCOMPLETE");
  }
  const usage = normalizeUsageReceipt(
    {
      schema: "usage_receipt_v2",
      contract_version: "2.0.0",
      receipt_id: "usage-receipt-1",
      run_id: "usage-model-run",
      bound_run_head_digest: digestA,
      workflow_route: "sc-work",
      iteration: 1,
      attempt: 1,
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
      contributor: { kind: "MAIN_AGENT", ref: digestB },
      token_usage: {
        input_tokens: { status: "MEASURED", value: 10 },
        output_tokens: { status: "MEASURED", value: 5 },
        reasoning_tokens: { status: "MEASURED", value: 2 },
        cached_input_tokens: { status: "MEASURED", value: 3 },
      },
      cost: {
        status: "MEASURED",
        micro_units: 25,
        billing_currency: "USD",
        pricing_revision: "pricing-2026-07-01",
        pricing_digest: digestB,
      },
      reservation: { status: "VERIFIED", attestation_digest: digestA },
      coverage: {
        status: "COMPLETE",
        receipt_count: 1,
        attestation_digest: digestA,
      },
      recorded_at: "2026-07-21T14:02:00.000Z",
    },
    {
      run_id: "usage-model-run",
      run_head_digest: digestA,
      iteration: 1,
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
      billing_currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: digestB,
      finite_token_cap: true,
      finite_cost_cap: true,
    },
  );
  const recorded = reduceRunState(verifying.state, {
    type: "RECORD_USAGE",
    receipt: usage,
  });
  assert.equal(recorded.accepted, true);
  assert.equal(recorded.state.counters.tokens, 20);
  assert.equal(recorded.state.counters.cost_micro, 25);
  assert.equal(recorded.state.counters.usage_receipt_count, 1);
  assert.equal(recorded.state.counters.usage_complete, true);
  assert.equal(recorded.state.counters.usage_completion_digest, digestA);
  const failed = reduceRunState(recorded.state, failure);
  assert.equal(failed.accepted, true);
  assert.equal(failed.state.verification.status, "FAIL");
});

test("no-progress is derived from independent normalized progress signals", async () => {
  const { createProgressFingerprint, updateNoProgress } = await import(modelUrl);
  const digest = `sha256:${"7".repeat(64)}`;
  const observation = {
    verifier_id: "TEST-003",
    verifier_digest: digest,
    exit_code: 1,
    normalized_failures: ["same failure"],
    diff_digest: digest,
    coverage_delta: 0,
    requirement_delta: 0,
    approach_id: "schema-check-a",
  };
  const failureIdentity = createProgressFingerprint(observation);
  assert.equal(
    createProgressFingerprint({
      ...observation,
      normalized_failures: ["same failure", "same failure"],
    }),
    failureIdentity,
    "duplicate failure entries must not rewrite failure identity",
  );
  assert.equal(
    createProgressFingerprint({
      ...observation,
      diff_digest: `sha256:${"8".repeat(64)}`,
      approach_id: "schema-check-b",
    }),
    failureIdentity,
    "cosmetic digest and approach churn must not rewrite failure identity",
  );

  const baseline = {
    count: 0,
    fingerprint: failureIdentity,
    approach_id: "schema-check-a",
  };
  const unchanged = {
    fingerprint: failureIdentity,
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: "schema-check-a",
  };
  assert.deepEqual(updateNoProgress(baseline, unchanged), {
    count: 1,
    fingerprint: failureIdentity,
    approach_id: "schema-check-a",
  });
  assert.throws(
    () => updateNoProgress(baseline, { ...unchanged, positive_delta: true }),
    /unknown no-progress field `positive_delta`/i,
  );

  for (const positive of [
    { ...unchanged, requirement_delta: 1 },
    { ...unchanged, coverage_delta: 0.1 },
    { ...unchanged, meaningful_diff_count: 1 },
  ]) {
    assert.deepEqual(updateNoProgress({ ...baseline, count: 2 }, positive), {
      count: 0,
      fingerprint: failureIdentity,
      approach_id: positive.approach_id,
    });
  }

  assert.deepEqual(
    updateNoProgress(
      { ...baseline, count: 2 },
      { ...unchanged, approach_id: "schema-check-c" },
    ),
    {
      count: 3,
      fingerprint: failureIdentity,
      approach_id: "schema-check-c",
    },
    "caller-selected approach IDs alone are not measurable progress",
  );
});

test("model commands and effective budgets are exact and every accepted state is schema-valid", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const { validateValue } = await import(new URL("./schema-validator.mjs", import.meta.url));
  const stateSchema = JSON.parse(await readFile(runStateSchemaUrl, "utf8"));
  const digest = `sha256:${"6".repeat(64)}`;
  const initialInput = {
    run_id: "exact-boundary-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  };

  assert.throws(
    () =>
      createInitialRunState({
        ...initialInput,
        effective_budget: { ...baseBudget, unexpected: true },
      }),
    /effective_budget is invalid/i,
  );
  const initial = createInitialRunState(initialInput);
  assert.deepEqual(validateValue(initial, stateSchema), { valid: true, errors: [] });

  const invalidInputState = { ...initial, unexpected_state_field: true };
  assert.equal(validateValue(invalidInputState, stateSchema).valid, false);
  const rejectedInvalidState = reduceRunState(invalidInputState, { type: "CANCEL" });
  assert.equal(rejectedInvalidState.accepted, false);
  assert.equal(rejectedInvalidState.reason, "INVALID_STATE");
  assert.equal(rejectedInvalidState.state, invalidInputState);

  const malformed = [
    {
      ...initial,
      status: "PAUSED",
      paused_from: "RUNNING",
      command: {
        type: "BUDGET_CONFIRMED",
        confirmation_digest: digest,
        phase: "INVALID",
        expected_run_version: 0,
        expires_at: "2026-07-17T08:00:00.000Z",
        effective_budget: baseBudget,
      },
    },
    {
      ...initial,
      command: {
        type: "BUDGET_CONFIRMED",
        confirmation_digest: digest,
        phase: "START",
        expected_run_version: 0,
        expires_at: "2026-07-17T08:00:00",
        effective_budget: baseBudget,
      },
    },
    {
      ...initial,
      command: {
        type: "BUDGET_CONFIRMED",
        confirmation_digest: digest,
        phase: "START",
        expected_run_version: 0,
        expires_at: "2026-07-17T08:00:00.000Z",
        effective_budget: { ...baseBudget, unexpected: true },
      },
    },
    {
      ...initial,
      status: "OBSERVED",
      command: { type: "BEGIN_VERIFICATION", unexpected: true },
    },
    {
      ...initial,
      status: "VERIFYING",
      command: {
        type: "VERIFICATION_PASSED",
        fingerprint: "raw verifier output",
        fresh: true,
        gates_satisfied: true,
      },
    },
    {
      ...initial,
      status: "RUNNING",
      command: {
        type: "STOP",
        terminal_status: "BLOCKED",
        reason: "contains raw payload",
      },
    },
    {
      ...initial,
      status: "RUNNING",
      command: {
        type: "STOP",
        terminal_status: "BLOCKED",
        reason: "R".repeat(501),
      },
    },
  ];
  for (const { command, ...state } of malformed) {
    const result = reduceRunState(state, command);
    assert.equal(result.accepted, false, JSON.stringify(command));
  }

  const stale = reduceRunState(
    { ...initial, status: "RUNNING" },
    { type: "MARK_VERIFICATION_STALE", reason: "AUTHORITY_DRIFT" },
  );
  assert.equal(stale.accepted, true);
  assert.equal(stale.state.status, "POLICY_STOP");
  assert.deepEqual(stale.state.verification, {
    status: "STALE",
    fresh: false,
    gates_satisfied: false,
    fingerprint: null,
  });
  assert.deepEqual(validateValue(stale.state, stateSchema), { valid: true, errors: [] });
  assert.equal(
    reduceRunState(stale.state, { type: "BEGIN_VERIFICATION" }).accepted,
    false,
  );
});

test("verification failure applies monotonic no-progress accounting and typed exhaustion", async () => {
  const {
    createInitialRunState,
    createProgressFingerprint,
    reduceRunState,
  } = await import(modelUrl);
  const digest = `sha256:${"f".repeat(64)}`;
  const fingerprint = createProgressFingerprint({
    verifier_id: "TEST-003",
    verifier_digest: digest,
    exit_code: 1,
    normalized_failures: ["same failure"],
    diff_digest: digest,
    coverage_delta: 0,
    requirement_delta: 0,
    approach_id: "same-approach",
  });
  const state = createInitialRunState({
    run_id: "no-progress-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: {
      max_iterations: 5,
      max_runtime_minutes: 30,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost_micro: null,
    },
  });
  state.status = "VERIFYING";
  state.counters.iterations = 2;
  state.counters.no_progress_iterations = 1;
  state.last_progress_fingerprint = fingerprint;
  state.last_approach_id = "same-approach";

  const result = reduceRunState(state, {
    type: "VERIFICATION_FAILED",
    verification_status: "FAIL",
    fingerprint,
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: "same-approach",
  });
  assert.equal(result.accepted, true);
  assert.equal(result.state.status, "NO_PROGRESS");
  assert.equal(result.state.counters.no_progress_iterations, 2);
  assert.equal(result.state.terminal_reason, "MAX_NO_PROGRESS_ITERATIONS");
  assert.equal(state.counters.no_progress_iterations, 1, "input counter is immutable");

  const maximumCounterState = {
    ...state,
    effective_budget: {
      ...state.effective_budget,
      max_no_progress_iterations: null,
    },
    counters: {
      ...state.counters,
      no_progress_iterations: Number.MAX_SAFE_INTEGER,
    },
  };
  let overflowResult;
  assert.doesNotThrow(() => {
    overflowResult = reduceRunState(maximumCounterState, {
      type: "VERIFICATION_FAILED",
      verification_status: "FAIL",
      fingerprint,
      requirement_delta: 0,
      coverage_delta: 0,
      meaningful_diff_count: 0,
      approach_id: "same-approach",
    });
  });
  assert.equal(overflowResult.accepted, false);
  assert.equal(overflowResult.reason, "NO_PROGRESS_COUNTER_OVERFLOW");
  assert.equal(overflowResult.state, maximumCounterState);
});

test("in-flight actions cannot enter verification or verifier-derived success", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const { validateValue } = await import(new URL("./schema-validator.mjs", import.meta.url));
  const stateSchema = JSON.parse(await readFile(runStateSchemaUrl, "utf8"));
  const digest = `sha256:${"3".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "in-flight-verification-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  });
  const activeAction = {
    action_id: "in-flight-action",
    idempotency_key: "in-flight-key",
  };

  for (const [status, command] of [
    ["OBSERVED", { type: "BEGIN_VERIFICATION" }],
    [
      "VERIFYING",
      {
        type: "VERIFICATION_PASSED",
        release_evidence: makeReleaseEvidence(digest),
      },
    ],
  ]) {
    const state = {
      ...initial,
      status,
      active_action: activeAction,
      last_event_hash: digest,
    };
    assert.equal(validateValue(state, stateSchema).valid, true, status);
    const result = reduceRunState(state, command);
    assert.equal(result.accepted, false, status);
    assert.notEqual(result.state.status, "SUCCESS", status);
  }
});

test("HALTED mode gates the reducer before action or verifier-derived success", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"7".repeat(64)}`;
  const halted = createInitialRunState({
    run_id: "halted-reducer-run",
    mode: "HALTED",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: baseBudget,
  });
  const approval = {
    confirmation_digest: digest,
    phase: "START",
    expected_run_version: 0,
    expires_at: "2026-07-17T18:00:00.000Z",
  };

  const running = { ...halted, status: "RUNNING", approval };
  const intended = reduceRunState(running, {
    type: "BEGIN_ACTION",
    confirmation_digest: digest,
    at: "2026-07-17T17:00:00.000Z",
    action_id: "halted-action",
    idempotency_key: "halted-action-key",
  });
  assert.equal(intended.accepted, false);
  assert.equal(intended.reason, "POLICY_STOP");
  assert.equal(intended.state, running);
  assert.equal(intended.state.counters.iterations, 0);

  const verifying = { ...halted, status: "VERIFYING", last_event_hash: digest };
  const passed = reduceRunState(verifying, {
    type: "VERIFICATION_PASSED",
    release_evidence: makeReleaseEvidence(digest),
  });
  assert.equal(passed.accepted, false);
  assert.equal(passed.reason, "POLICY_STOP");
  assert.equal(passed.state, verifying);
  assert.notEqual(passed.state.status, "SUCCESS");

  const unknown = {
    ...halted,
    status: "UNKNOWN_OUTCOME",
    active_action: {
      action_id: "halted-unknown-action",
      idempotency_key: "halted-unknown-action-key",
    },
    terminal_reason: "ACTION_OUTCOME_UNKNOWN",
  };
  const reconciled = reduceRunState(unknown, {
    type: "RECONCILE",
    outcome: "INDETERMINATE",
    evidence_digest: digest,
  });
  assert.equal(reconciled.accepted, true);
  assert.deepEqual(reconciled.event_data, {
    reconciliation_outcome: "INDETERMINATE",
    evidence_digest: digest,
  });
});

test("a tightened stop cap terminalizes before the next action intent", async () => {
  const { createInitialRunState, evaluateStop, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"5".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "tightened-stop-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: { ...baseBudget, max_no_progress_iterations: 2 },
  });
  const running = {
    ...initial,
    status: "RUNNING",
    counters: { ...initial.counters, no_progress_iterations: 2 },
    approval: {
      confirmation_digest: digest,
      phase: "RESUME",
      expected_run_version: 0,
      expires_at: "2026-07-17T18:00:00.000Z",
    },
  };
  assert.deepEqual(evaluateStop(running), {
    terminal_status: "NO_PROGRESS",
    reason: "MAX_NO_PROGRESS_ITERATIONS",
  });

  const result = reduceRunState(running, {
    type: "BEGIN_ACTION",
    confirmation_digest: digest,
    at: "2026-07-17T17:00:00.000Z",
    action_id: "must-not-start",
    idempotency_key: "must-not-start-key",
  });
  assert.equal(result.accepted, true);
  assert.equal(result.state.status, "NO_PROGRESS");
  assert.equal(result.state.counters.iterations, 0);
  assert.equal(result.state.active_action, null);
});

test("typed stop, cancellation, and reconciliation preserve terminal authority", async () => {
  const { createInitialRunState, reduceRunState } = await import(modelUrl);
  const digest = `sha256:${"1".repeat(64)}`;
  const initial = createInitialRunState({
    run_id: "terminal-run",
    mode: "OBSERVE",
    authority_digest: digest,
    policy_digest: digest,
    effective_budget: {
      max_iterations: 3,
      max_runtime_minutes: 30,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost_micro: null,
    },
  });
  const running = { ...initial, status: "RUNNING" };

  const forgedSuccess = reduceRunState(running, {
    type: "STOP",
    terminal_status: "SUCCESS",
    reason: "MODEL_SAYS_DONE",
  });
  assert.equal(forgedSuccess.accepted, false);
  assert.equal(forgedSuccess.reason, "VERIFIER_SUCCESS_REQUIRED");

  const blocked = reduceRunState(running, {
    type: "STOP",
    terminal_status: "BLOCKED",
    reason: "STALE_AUTHORITY",
  });
  assert.equal(blocked.state.status, "BLOCKED");
  assert.equal(blocked.state.terminal_reason, "STALE_AUTHORITY");

  const cancelledBeforeIntent = reduceRunState(running, { type: "CANCEL" });
  assert.equal(cancelledBeforeIntent.state.status, "CANCELLED");

  const afterIntent = {
    ...running,
    active_action: {
      action_id: "action-001",
      idempotency_key: "action-001-key",
    },
  };
  const cancelledAfterIntent = reduceRunState(afterIntent, { type: "CANCEL" });
  assert.equal(cancelledAfterIntent.state.status, "UNKNOWN_OUTCOME");
  assert.equal(cancelledAfterIntent.state.terminal_reason, "CANCEL_AFTER_ACTION_INTENT");

  for (const cancelled of [
    cancelledBeforeIntent.state,
    cancelledAfterIntent.state,
  ]) {
    for (const command of [
      {
        type: "START",
        confirmation_digest: digest,
        at: "2026-07-17T17:00:00.000Z",
      },
      {
        type: "RESUME",
        confirmation_digest: digest,
        at: "2026-07-17T17:00:00.000Z",
      },
    ]) {
      const denied = reduceRunState(cancelled, command);
      assert.equal(denied.accepted, false, command.type);
      assert.equal(denied.reason, "INVALID_TRANSITION", command.type);
      assert.equal(denied.state, cancelled, command.type);
    }
  }

  for (const outcome of [
    "APPLIED",
    "NOT_APPLIED",
    "PARTIALLY_APPLIED",
    "INDETERMINATE",
  ]) {
    const reconciled = reduceRunState(cancelledAfterIntent.state, {
      type: "RECONCILE",
      outcome,
      evidence_digest: digest,
    });
    assert.equal(reconciled.accepted, true, outcome);
    assert.equal(reconciled.state.status, "UNKNOWN_OUTCOME", outcome);
    assert.deepEqual(reconciled.event_data, {
      reconciliation_outcome: outcome,
      evidence_digest: digest,
    });
  }

  const invalidReconcile = reduceRunState(running, {
    type: "RECONCILE",
    outcome: "APPLIED",
    evidence_digest: digest,
  });
  assert.equal(invalidReconcile.accepted, false);
  assert.equal(invalidReconcile.reason, "RECONCILIATION_NOT_REQUIRED");
});

test("the public model boundary validates authority digests and remains effect-free", async () => {
  const source = await readFile(modelUrl, "utf8");
  const { createInitialRunState } = await import(modelUrl);
  const validDigest = `sha256:${"2".repeat(64)}`;
  const input = {
    run_id: "pure-boundary-run",
    mode: "OBSERVE",
    authority_digest: validDigest,
    policy_digest: validDigest,
    effective_budget: {
      max_iterations: 2,
      max_runtime_minutes: 10,
      max_no_progress_iterations: 1,
      max_tokens: null,
      max_cost_micro: null,
    },
  };

  assert.throws(
    () => createInitialRunState({ ...input, authority_digest: "not-a-digest" }),
    /authority_digest/i,
  );
  assert.throws(
    () => createInitialRunState({ ...input, policy_digest: "sha256:short" }),
    /policy_digest/i,
  );

  for (const forbidden of [
    /node:(?:fs|child_process|http|https|net|dns|worker_threads)/u,
    /\bprocess\s*\./u,
    /\bfetch\s*\(/u,
    /\bDate\s*\.\s*now\s*\(/u,
    /\bnew\s+Date\s*\(/u,
    /\bperformance\s*\.\s*now\s*\(/u,
  ]) {
    assert.doesNotMatch(source, forbidden, String(forbidden));
  }
});
