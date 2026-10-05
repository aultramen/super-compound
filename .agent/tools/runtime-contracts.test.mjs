import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseJsonDocument,
  validateSchemaDefinition,
  validateValue,
} from "./schema-validator.mjs";
import { reserveBackgroundClaim } from "./background-execution-model.mjs";
import {
  computeBackgroundAggregateEpochDigest,
  computeBackgroundRunAggregatePolicyDigest,
  computeEffectiveBackgroundLimitsDigest,
} from "./background-policy.mjs";

const SCHEMA_DIR = new URL("../context/schemas/", import.meta.url);
const DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const THIRD_DIGEST = `sha256:${"c".repeat(64)}`;
const AT = "2026-07-17T04:00:00.000Z";

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function currentBackgroundReservationFixture(base) {
  const input = structuredClone(base);
  input.shared_aggregate_policy = {
    ...structuredClone(input.aggregate_policy),
    max_reserved_runtime_ms: 21_600_000,
  };
  input.aggregate_epoch_digest = computeBackgroundAggregateEpochDigest({
    shared_aggregate_policy: input.shared_aggregate_policy,
    project_config_digest: input.queue_claim.project_config_digest,
    operation_inventory_digest: input.queue_claim.operation_inventory_digest,
  });
  input.aggregate_policy_digest = computeBackgroundRunAggregatePolicyDigest({
    run_id: input.queue_claim.run_id,
    aggregate_policy: input.aggregate_policy,
    policy_digest: input.queue_claim.policy_digest,
    aggregate_epoch_digest: input.aggregate_epoch_digest,
  });
  input.effective_limits_digest =
    computeEffectiveBackgroundLimitsDigest(input.effective_limits);
  Object.assign(input.policy_verification, {
    effective_limits_digest: input.effective_limits_digest,
    aggregate_epoch_digest: input.aggregate_epoch_digest,
    aggregate_policy_digest: input.aggregate_policy_digest,
  });
  const [currentRunHeadDigest, actionRunHeadDigest] = [
    DIGEST,
    OTHER_DIGEST,
    THIRD_DIGEST,
  ].filter((candidate) => candidate !== input.queue_claim.run_head_digest);
  const actionId = "action.goal014.runtime-contract";
  const idempotencyKey = "run.goal014.runtime-contract.action";
  const budgetAuthority = {
    schema: "background_budget_binding_v2",
    run_id: input.queue_claim.run_id,
    confirmation_digest: input.queue_claim.approval_digest,
    approval_phase: input.queue_claim.phase,
    approval_expires_at: input.queue_claim.approval_expires_at,
    run_version: input.queue_claim.expected_run_version + 1,
    current_run_head_digest: currentRunHeadDigest,
    action_run_head_digest: actionRunHeadDigest,
    action_id: actionId,
    idempotency_key: idempotencyKey,
    controller_intent_digest: digestJson({
      run_id: input.queue_claim.run_id,
      action_id: actionId,
      idempotency_key: idempotencyKey,
      run_head_digest: actionRunHeadDigest,
    }),
    effective_limits: structuredClone(input.effective_limits),
    consumed: {
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
    },
    remaining: {
      runtime_ms: input.effective_limits.max_runtime_ms,
      no_progress_iterations:
        input.effective_limits.max_no_progress_iterations,
      tokens: null,
    },
  };
  input.budget_binding = {
    ...budgetAuthority,
    authority_digest: digestJson({
      domain: "super-compound.background-budget-binding.v2",
      ...budgetAuthority,
    }),
  };
  return input;
}

const fixtures = {
  "runtime-common-v2.schema.json": {
    schema: "runtime_common_v2",
    contract_version: "2.0.0",
    resource_id: "LER2-GOAL-003",
    digest: DIGEST,
    created_at: AT,
  },
  "project-config-v2.schema.json": {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
    policy: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
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
  },
  "project-mode-capability-v2.schema.json": {
    schema: "project_mode_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "project-mode-goal-014",
    purpose: "PROJECT_MODE_ENFORCE",
    project_root_digest: DIGEST,
    workspace_root_digest: OTHER_DIGEST,
    project_config_digest: OTHER_DIGEST,
    config_version: 1,
    mode_version: 0,
    host_ref: "codex-local-reference-host",
    host_identity_digest: THIRD_DIGEST,
    host_verifier_digest: DIGEST,
    write_interceptor_digest: OTHER_DIGEST,
    filesystem_type: "ext4",
    external_write_policy: "DENY",
    capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    issued_at: AT,
    expires_at: "2026-07-17T16:00:00.000Z",
    evidence_digest: THIRD_DIGEST,
  },
  "loop-run-contract-v2.schema.json": {
    schema: "loop_run_contract_v2",
    contract_version: "2.0.0",
    run_id: "LER2-GOAL-003",
    goal: {
      ref: "FSD-LER2@1.0.0#GOAL-003",
      digest: DIGEST,
      summary: "Validate strict Loop Runtime v2 machine contracts.",
      acceptance_criteria: ["TEST-003 accepts exact v2 and rejects legacy authority."],
    },
    authority: {
      brd_digest: DIGEST,
      prd_digest: DIGEST,
      fsd_digest: DIGEST,
      adr_digests: [DIGEST],
      operation_inventory_digest: OTHER_DIGEST,
      sources: [
        { role: "GOAL", source_path: "issues/goal-003.md", content_digest: DIGEST },
        { role: "BRD", source_path: "docs/brd/brd-loop-runtime-v2.md", content_digest: DIGEST },
        { role: "PRD", source_path: "docs/prd/prd-loop-runtime-v2.md", content_digest: DIGEST },
        { role: "FSD", source_path: "docs/fsd/fsd-loop-runtime-v2.md", content_digest: DIGEST },
        { role: "ADR", source_path: "docs/solutions/adr-loop-runtime-v2.md", content_digest: DIGEST },
        { role: "VERIFIER", source_path: "verifiers/test-003.md", content_digest: DIGEST },
        { role: "EVAL", source_path: ".agent/evals/loop-runtime-v2.md", content_digest: OTHER_DIGEST },
        { role: "OPERATION_INVENTORY", source_path: ".agent/context/operation-inventory.json", content_digest: OTHER_DIGEST }
      ],
      base_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
    },
    verifier: {
      ref: "FSD-LER2@1.0.0#TEST-003",
      digest: DIGEST,
      eval_definition_digest: OTHER_DIGEST,
      regression_verifier_digest: null,
      eval_class: "CAPABILITY",
      success_threshold: {
        metric: "PASS_AT_K",
        k: 3,
        minimum_basis_points: 9000,
      },
    },
    policy: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 720,
      allowlisted_operations: ["read", "write"],
      credential_scopes: ["audit:read", "repo:write"],
      required_gates: ["deterministic-verifier", "security-review"],
      risk: "HIGH",
      isolation: "PROCESS",
      expires_at: "2026-07-17T16:00:00.000Z",
    },
    lineage: { parent_run_id: null, root_run_id: "LER2-GOAL-003" },
    autonomy_profile: "INTERACTIVE",
    risk_profile: "HIGH",
    project_config_digest: DIGEST,
    created_at: AT,
  },
  "budget-proposal-v2.schema.json": {
    schema: "budget_proposal_v2",
    contract_version: "2.0.0",
    proposal_id: "proposal-goal-003-start",
    run_id: "LER2-GOAL-003",
    phase: "START",
    expected_run_version: 0,
    execution_mode: "OBSERVE",
    goal_ref: "FSD-LER2@1.0.0#GOAL-003",
    goal_digest: DIGEST,
    authority_digest: OTHER_DIGEST,
    project_config_digest: DIGEST,
    verifier_ref: "FSD-LER2@1.0.0#TEST-003",
    verifier_digest: DIGEST,
    regression_verifier_digest: null,
    eval_definition_digest: OTHER_DIGEST,
    policy_digest: DIGEST,
    queue_item_id: null,
    autonomy_profile: "INTERACTIVE",
    risk_profile: "HIGH",
    billing_currency: "USD",
    pricing_revision: null,
    pricing_digest: null,
    display_context: {
      authority: "ADVISORY_DISPLAY_ONLY",
      source: "CONTRACT_DERIVED",
      source_digest: DIGEST,
      goal_summary: "Validate strict Loop Runtime v2 machine contracts.",
      acceptance_criteria: ["TEST-003 accepts exact v2 and rejects legacy authority."],
    },
    recommendation_source: "MODEL_ADVISORY",
    recommended: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost_micro: null,
    },
    recommended_limits: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost: null,
    },
    policy_ceiling: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    effective_preview: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    consumed: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      cost_micro: null,
    },
    remaining: {
      iterations: 10,
      active_runtime_ms: 10800000,
      no_progress_iterations: 3,
      tokens: null,
      cost_micro: null,
    },
    lineage: {
      parent_run_id: null,
      root_run_id: "LER2-GOAL-003",
      run_count: 1,
    },
    lineage_totals: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      cost_micro: null,
    },
    recommendation_reason: "Several strict contracts require bounded edge-case cycles.",
    null_warnings: [
      "max_runtime_minutes is null: no additional user-level cap; effective policy limit is 180 minutes.",
      "max_no_progress_iterations is null: no additional user-level cap; effective policy limit is 3 iterations.",
      "max_tokens is null: no additional user-level cap; no finite effective policy limit is configured.",
      "max_cost is null: no additional user-level cap; no finite effective policy limit is configured.",
    ],
    approval_ttl_minutes: 720,
    approval_expires_at: "2026-07-17T16:00:00.000Z",
    generated_at: AT,
  },
  "budget-confirmation-v2.schema.json": {
    schema: "budget_confirmation_v2",
    contract_version: "2.0.0",
    confirmation_id: "confirmation-goal-003-start",
    proposal_digest: DIGEST,
    run_id: "LER2-GOAL-003",
    phase: "START",
    queue_item_id: null,
    expected_run_version: 0,
    goal_ref: "FSD-LER2@1.0.0#GOAL-003",
    goal_digest: DIGEST,
    authority_digest: DIGEST,
    project_config_digest: DIGEST,
    verifier_ref: "FSD-LER2@1.0.0#TEST-003",
    verifier_digest: DIGEST,
    regression_verifier_digest: null,
    eval_definition_digest: OTHER_DIGEST,
    policy_digest: DIGEST,
    billing_currency: "USD",
    confirmed_limits: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost: null,
    },
    confirmed_budget: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost_micro: null,
    },
    effective_budget: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    autonomy_profile: "INTERACTIVE",
    risk_profile: "HIGH",
    approver: {
      actor_id: "human-project-owner",
      actor_type: "HUMAN",
      attestation: "HOST_ATTESTED_HUMAN",
    },
    confirmed_at: AT,
    expires_at: "2026-07-17T16:00:00.000Z",
  },
  "loop-run-event-v2.schema.json": {
    schema: "loop_run_event_v2",
    contract_version: "2.0.0",
    event_id: "event-0001",
    run_id: "LER2-GOAL-003",
    sequence: 1,
    version: 1,
    type: "BUDGET_CONFIRMED",
    recorded_at: AT,
    previous_hash: null,
    event_hash: DIGEST,
    data: { confirmation_digest: OTHER_DIGEST },
  },
  "loop-run-state-v2.schema.json": {
    schema: "loop_run_state_v2",
    contract_version: "2.0.0",
    run_id: "LER2-GOAL-003",
    mode: "DISABLED",
    status: "READY",
    version: 0,
    sequence: 0,
    authority_digest: DIGEST,
    policy_digest: DIGEST,
    effective_budget: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    counters: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      token_measurement: "UNMEASURED",
      cost_micro: null,
      cost_measurement: "UNMEASURED",
      usage_iteration: 0,
      usage_receipt_count: 0,
      usage_complete: true,
      usage_completion_digest: null,
    },
    approval: null,
    verification: {
      status: "NOT_RUN",
      fresh: false,
      gates_satisfied: false,
      fingerprint: null,
    },
    active_action: null,
    paused_from: null,
    terminal_reason: null,
    last_progress_fingerprint: null,
    last_approach_id: null,
    last_event_hash: null,
  },
  "usage-receipt-v2.schema.json": {
    schema: "usage_receipt_v2",
    contract_version: "2.0.0",
    receipt_id: "usage-receipt-003",
    run_id: "LER2-GOAL-003",
    bound_run_head_digest: DIGEST,
    workflow_route: "sc-work",
    iteration: 1,
    attempt: 1,
    autonomy_profile: "INTERACTIVE",
    risk_profile: "HIGH",
    contributor: { kind: "MAIN_AGENT", ref: OTHER_DIGEST },
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
      pricing_digest: OTHER_DIGEST,
    },
    reservation: { status: "VERIFIED", attestation_digest: DIGEST },
    coverage: {
      status: "COMPLETE",
      receipt_count: 1,
      attestation_digest: DIGEST,
    },
    recorded_at: AT,
  },
  "operation-inventory-v2.schema.json": {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.local.reference",
    project_config_digest: DIGEST,
    issued_at: AT,
    expires_at: "2026-07-17T16:00:00.000Z",
    operations: [],
  },
  "host-capability-v2.schema.json": {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.local.reference",
    host_ref: "host.local.reference",
    run_id: "LER2-GOAL-011",
    run_head_digest: DIGEST,
    authority_digest: OTHER_DIGEST,
    verifier_digest: THIRD_DIGEST,
    project_config_digest: DIGEST,
    operation_inventory_digest: OTHER_DIGEST,
    policy_digest: THIRD_DIGEST,
    approval_digest: DIGEST,
    capabilities: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    credential_scopes: { read: [], write: [] },
    egress_ids: [],
    isolation: "WORKTREE",
    issued_at: AT,
    expires_at: "2026-07-17T16:00:00.000Z",
    evidence_digest: OTHER_DIGEST,
  },
  "automation-trigger-v2.schema.json": {
    schema: "automation_trigger_v2",
    contract_version: "2.0.0",
    queue_item_id: "queue-item-012",
    version: 0,
    state: "PREPARED",
    run_binding: {
      run_id: "LER2-GOAL-012",
      phase: "START",
      expected_run_version: 0,
      goal_digest: DIGEST,
      authority_digest: OTHER_DIGEST,
      verifier_digest: THIRD_DIGEST,
      eval_definition_digest: DIGEST,
      project_config_digest: OTHER_DIGEST,
      policy_digest: THIRD_DIGEST,
      operation_inventory_digest: DIGEST,
      risk_profile: "HIGH",
      autonomy_profile: "BACKGROUND",
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
      run_head_digest: null,
      approval_digest: null,
      approval_expires_at: null,
    },
    provenance: {
      trigger_id: "trigger-goal-012",
      actor_ref: "actor-project-owner",
      source_ref: "source-local-one-shot",
    },
    dedupe_identity_digest: DIGEST,
    payload_digest: OTHER_DIGEST,
    prepared_at: AT,
    available_at: AT,
    expires_at: "2026-07-17T16:00:00.000Z",
    missed_run_policy: "CANCEL",
    lease_policy: { duration_ms: 60000, heartbeat_interval_ms: 10000 },
    retry_policy: { max_attempts: 2, backoff_ms: 5000 },
    concurrency: { key: "project-goal-012", limit: 1 },
    rate_limit: { key: "project-goal-012", max_claims: 2, window_ms: 60000 },
    result_sink_ref: "sink-local-audit",
    policy_ref: "policy-loop-runtime-v2",
    attempts: 0,
    claim_history: [],
    retry_not_before: null,
    lease: null,
    dispatch_commit: null,
    cancellation_requested: false,
    cancellation: null,
    result: null,
    reconciliation: null,
    recovery: {
      reason: null,
      previous_lease_id: null,
      requires_new_approval: false,
      reconciled_at: null,
    },
    updated_at: AT,
  },
};

async function loadSchema(file) {
  return JSON.parse(await readFile(new URL(file, SCHEMA_DIR), "utf8"));
}

const eventDataByType = {
  CREATED: { contract_digest: DIGEST },
  BUDGET_PROPOSED: { proposal_digest: DIGEST },
  BUDGET_CONFIRMED: { confirmation_digest: OTHER_DIGEST },
  STARTED: { confirmation_digest: OTHER_DIGEST },
  ACTION_INTENDED: {
    action_id: "action-001",
    idempotency_key: "run-003-action-001",
  },
  ACTION_OBSERVED: {
    action_id: "action-001",
    idempotency_key: "run-003-action-001",
    external_action_record_digest: null,
    external_outcome: null,
    target_audit_digest: null,
    duration_ms: 25,
  },
  USAGE_RECORDED: {
    receipt_digest: DIGEST,
    receipt: {
      ...fixtures["usage-receipt-v2.schema.json"],
      token_usage: {
        ...fixtures["usage-receipt-v2.schema.json"].token_usage,
        conservative_total_tokens: 20,
      },
    },
  },
  OPERATIONAL_METRIC_RECORDED: {
    metric_digest: DIGEST,
    metric: {
      schema: "operational_metric_v2",
      contract_version: "2.0.0",
      metric_id: DIGEST,
      run_id: "LER2-TEST-003",
      bound_run_head_digest: OTHER_DIGEST,
      kind: "ROUTE_INVOCATION",
      provenance: "HOST_ATTESTED",
      evidence_digest: DIGEST,
      recorded_at: AT,
      payload: {
        workflow_route: "sc-work",
        surface: "FULL",
        invocation_ref: OTHER_DIGEST,
      },
    },
  },
  ACTIVE_DURATION_RECORDED: { phase: "VERIFICATION", duration_ms: 25 },
  VERIFICATION_STARTED: { verifier_digest: DIGEST },
  VERIFICATION_PASSED: {
    verification_status: "PASS",
    fingerprint: DIGEST,
    run_head_digest: OTHER_DIGEST,
    eval_result_digest: DIGEST,
    work_package_digest: OTHER_DIGEST,
    work_package_goal_id: "GOAL-009",
    finding_set_digest: DIGEST,
    checker_evidence_digest: null,
    workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
    operational_metric: {
      schema: "operational_metric_v2",
      contract_version: "2.0.0",
      metric_id: DIGEST,
      run_id: "LER2-TEST-003",
      bound_run_head_digest: OTHER_DIGEST,
      kind: "EVAL_RELEASE",
      provenance: "HOST_ATTESTED",
      evidence_digest: DIGEST,
      recorded_at: AT,
      payload: {
        accepted_outcome: "ACCEPTED",
        acceptance_source: "FRESH_RELEASE_GATE",
        eval_result_digest: DIGEST,
        release_evidence_digest: OTHER_DIGEST,
        attempts: [1, 2, 3].map((attempt_number) => ({
          attempt_number,
          targeted_verdict: "PASS",
          regression_verdict: null,
          attempt_digest:
            attempt_number === 1 ? DIGEST : attempt_number === 2 ? OTHER_DIGEST : THIRD_DIGEST,
        })),
        targeted: {
          k: 3,
          attempts_total: 3,
          attempts_passed: 3,
          pass_at_k_basis_points: 10000,
          pass_power_k_basis_points: 10000,
        },
        regression: null,
      },
    },
  },
  VERIFICATION_FAILED: {
    verification_status: "FAIL",
    fingerprint: DIGEST,
    requirement_delta: 0,
    coverage_delta: 0,
    meaningful_diff_count: 0,
    approach_id: "schema-validator-a",
  },
  PAUSED: { paused_from: "OBSERVED" },
  RESUMED: {
    resumed_to: "OBSERVED",
    confirmation_digest: OTHER_DIGEST,
    duration_ms: 0,
  },
  STOPPED: { terminal_status: "BLOCKED", reason: "STALE_AUTHORITY" },
  RECONCILED: { reconciliation_outcome: "APPLIED", evidence_digest: DIGEST },
  SNAPSHOT_REPAIRED: { repaired_from_event_hash: DIGEST },
};

test("all GOAL-003 contracts accept exact v2 fixtures and reject v1 or unknown fields", async () => {
  for (const [file, fixture] of Object.entries(fixtures)) {
    const schema = await loadSchema(file);
    assert.deepEqual(validateSchemaDefinition(schema), { valid: true, errors: [] }, file);
    assert.deepEqual(validateValue(fixture, schema), { valid: true, errors: [] }, file);
    assert.deepEqual(
      parseJsonDocument(JSON.stringify(fixture), schema, file),
      fixture,
      file,
    );

    const v1 = structuredClone(fixture);
    v1.schema = v1.schema.replace(/_v2$/u, "_v1");
    assert.equal(validateValue(v1, schema).valid, false, `${file}: v1`);

    const unknown = { ...fixture, unknown_field: true };
    const unknownResult = validateValue(unknown, schema);
    assert.equal(unknownResult.valid, false, `${file}: unknown field`);
    assert.match(unknownResult.errors.join("\n"), /unknown property/i, file);
  }
});

test("TEST-014 background dispatch schema validates the durable model and rejects drift", async () => {
  const schema = await loadSchema("background-dispatch-v2.schema.json");
  const pilots = JSON.parse(
    await readFile(
      new URL("../evals/fixtures/background-pilots-v2.json", import.meta.url),
      "utf8",
    ),
  );
  const reservationInput = currentBackgroundReservationFixture(
    pilots.base_reservation_input,
  );
  const record = reserveBackgroundClaim(reservationInput, []);
  assert.deepEqual(validateSchemaDefinition(schema), { valid: true, errors: [] });
  assert.deepEqual(validateValue(record, schema), { valid: true, errors: [] });
  assert.equal(record.budget_binding.schema, "background_budget_binding_v2");
  assert.equal(
    record.budget_binding.confirmation_digest,
    record.run_binding.confirmation_digest,
  );
  assert.deepEqual(
    record.shared_aggregate_policy,
    reservationInput.shared_aggregate_policy,
  );
  assert.notDeepEqual(
    record.shared_aggregate_policy,
    record.aggregate_policy,
  );
  assert.equal(
    record.aggregate_epoch_digest,
    reservationInput.aggregate_epoch_digest,
  );
  assert.equal(
    validateValue({ ...record, contract_version: "1.0.0" }, schema).valid,
    false,
  );
  assert.equal(validateValue({ ...record, unknown_field: true }, schema).valid, false);
  for (const field of [
    "budget_binding",
    "shared_aggregate_policy",
    "aggregate_epoch_digest",
  ]) {
    const missing = structuredClone(record);
    delete missing[field];
    assert.equal(validateValue(missing, schema).valid, false, `missing ${field}`);
  }
  const staleBudget = structuredClone(reservationInput);
  staleBudget.budget_binding.remaining.runtime_ms -= 1;
  assert.throws(
    () => reserveBackgroundClaim(staleBudget, []),
    /BACKGROUND_ADMISSION_DENIED/,
  );
  for (const field of ["result", "cancellation", "quarantine"]) {
    const unsafe = structuredClone(record);
    unsafe[field] = {
      ...(field === "result"
        ? { outcome: "SUCCESS", evidence_digest: pilots.base_reservation_input.effective_limits_digest }
        : field === "cancellation"
          ? { status: "OBSERVATION_REQUIRED", evidence_digest: pilots.base_reservation_input.effective_limits_digest }
          : { reason: "FAILURE", evidence_digest: pilots.base_reservation_input.effective_limits_digest }),
      raw_payload: "SECRET",
    };
    assert.equal(validateValue(unsafe, schema).valid, false, field);
  }
});

test("strict JSON loading rejects malformed or invalid project configuration", async () => {
  const schema = await loadSchema("project-config-v2.schema.json");

  assert.throws(
    () => parseJsonDocument("{not-json", schema, "project config"),
    /project config is not valid JSON/i,
  );
  assert.throws(
    () =>
      parseJsonDocument(
        JSON.stringify({
          ...fixtures["project-config-v2.schema.json"],
          schema: "project_config_v1",
        }),
        schema,
        "project config",
      ),
    /failed schema validation/i,
  );
});

test("max_iterations is mandatory while optional user-level caps preserve null", async () => {
  const proposalSchema = await loadSchema("budget-proposal-v2.schema.json");
  const confirmationSchema = await loadSchema("budget-confirmation-v2.schema.json");
  const proposal = fixtures["budget-proposal-v2.schema.json"];
  const confirmation = fixtures["budget-confirmation-v2.schema.json"];

  assert.equal(validateValue(proposal, proposalSchema).valid, true);
  assert.equal(validateValue(confirmation, confirmationSchema).valid, true);
  assert.equal(proposal.recommended.max_runtime_minutes, null);
  assert.equal(proposal.recommended.max_tokens, null);
  assert.equal(confirmation.confirmed_limits.max_tokens, null);
  assert.equal(confirmation.effective_budget.max_tokens, null);

  const missingRecommendation = structuredClone(proposal);
  missingRecommendation.recommended.max_iterations = null;
  assert.equal(
    validateValue(missingRecommendation, proposalSchema).valid,
    false,
    "a model proposal must recommend a positive max_iterations",
  );

  for (const value of [null, 0, -1]) {
    const invalid = structuredClone(confirmation);
    invalid.confirmed_limits.max_iterations = value;
    assert.equal(
      validateValue(invalid, confirmationSchema).valid,
      false,
      `confirmation max_iterations=${String(value)}`,
    );
  }
});

test("run contracts persist the complete effective policy surface", async () => {
  const schema = await loadSchema("loop-run-contract-v2.schema.json");
  const complete = structuredClone(fixtures["loop-run-contract-v2.schema.json"]);
  complete.policy = {
    ...complete.policy,
    approval_ttl_minutes: 720,
    allowlisted_operations: ["read", "write"],
    credential_scopes: ["audit:read", "repo:write"],
    required_gates: ["deterministic-verifier", "security-review"],
    risk: "HIGH",
    isolation: "PROCESS",
    expires_at: "2026-07-17T16:00:00.000Z",
  };
  assert.deepEqual(validateValue(complete, schema), { valid: true, errors: [] });

  for (const missingField of [
    "approval_ttl_minutes",
    "allowlisted_operations",
    "credential_scopes",
    "required_gates",
    "risk",
    "isolation",
    "expires_at",
  ]) {
    const incomplete = structuredClone(complete);
    delete incomplete.policy[missingField];
    assert.equal(validateValue(incomplete, schema).valid, false, missingField);
  }
});

test("run contracts require a bounded confined authority source manifest", async () => {
  const schema = await loadSchema("loop-run-contract-v2.schema.json");
  const base = structuredClone(fixtures["loop-run-contract-v2.schema.json"]);
  assert.equal(validateValue(base, schema).valid, true);

  const missing = structuredClone(base);
  delete missing.authority.sources;
  assert.equal(validateValue(missing, schema).valid, false);

  for (const sourcePath of [
    "../outside.md",
    "/absolute.md",
    "docs//double.md",
    "docs/./ambiguous.md",
    "C:/windows.md",
  ]) {
    const invalid = structuredClone(base);
    invalid.authority.sources[0].source_path = sourcePath;
    assert.equal(validateValue(invalid, schema).valid, false, sourcePath);
  }

  const unknown = structuredClone(base);
  unknown.authority.sources[0].trusted = true;
  assert.equal(validateValue(unknown, schema).valid, false);
});

test("event type selects one exact non-empty bounded payload contract", async () => {
  const schema = await loadSchema("loop-run-event-v2.schema.json");
  const base = fixtures["loop-run-event-v2.schema.json"];
  let sequence = 1;
  for (const [type, data] of Object.entries(eventDataByType)) {
    const event = {
      ...base,
      event_id: `event-${String(sequence).padStart(4, "0")}`,
      sequence,
      version: sequence,
      type,
      data,
    };
    assert.deepEqual(validateValue(event, schema), { valid: true, errors: [] }, type);

    assert.equal(
      validateValue({ ...event, data: {} }, schema).valid,
      false,
      `${type}: empty`,
    );
    assert.equal(
      validateValue({ ...event, data: { ...data, unexpected: true } }, schema).valid,
      false,
      `${type}: unknown`,
    );
    sequence += 1;
  }

  assert.equal(
    validateValue(
      { ...base, type: "ACTION_INTENDED", data: { confirmation_digest: DIGEST } },
      schema,
    ).valid,
    false,
    "payload for another event type must not match",
  );
});
