import { createHash } from "node:crypto";
import path from "node:path";

import { loadCanonicalOperationInventory } from "./action-adapter.mjs";
import {
  readBoundedFile,
  withOwnerLock,
} from "./file-state.mjs";
import {
  resolveBackgroundAggregatePolicy,
} from "./project-config.mjs";
import {
  assertLoopRunControllerAuthority,
  loadLoopRunControllerCanonicalProjectConfig,
} from "./loop-run.mjs";
import { parseJsonDocument } from "./schema-validator.mjs";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CONFIG_LOCK = path.join(
  ".scratch",
  "loop-runtime",
  "project-config.lock",
);
const RUNS_DIRECTORY = path.join(".scratch", "loop-runs");
const CONTRACT_SCHEMA = path.join(
  ".agent",
  "context",
  "schemas",
  "loop-run-contract-v2.schema.json",
);
const MAX_CONTRACT_BYTES = 512 * 1024;
const MAX_SCHEMA_BYTES = 256 * 1024;
const authorities = new WeakMap();
const AGGREGATE_FIELDS = Object.freeze([
  "max_workers",
  "max_reserved_tokens",
  "max_reserved_runtime_ms",
  "max_remote_calls",
  "max_reviewers",
]);

function fail(code) {
  throw new TypeError(code);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields) {
  return (
    isObject(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function sameAggregatePolicy(left, right) {
  return (
    exactFields(left, AGGREGATE_FIELDS) &&
    exactFields(right, AGGREGATE_FIELDS) &&
    AGGREGATE_FIELDS.every((field) => left[field] === right[field])
  );
}

function sameEffectiveLimits(left, right) {
  return (
    exactFields(left, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) &&
    exactFields(right, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) &&
    left.max_runtime_ms === right.max_runtime_ms &&
    left.max_no_progress_iterations === right.max_no_progress_iterations &&
    left.max_tokens === right.max_tokens
  );
}

function assertDigest(value, code) {
  if (!DIGEST.test(value ?? "")) fail(code);
}

function assertRunId(value) {
  if (!RUN_ID.test(value ?? "")) fail("BACKGROUND_POLICY_RUN_ID_INVALID");
}

function policyDigest(contract) {
  return digestJson(contract.policy);
}

export function computeEffectiveBackgroundLimitsDigest(limits) {
  if (
    !exactFields(limits, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ])
  ) {
    fail("BACKGROUND_EFFECTIVE_LIMITS_INVALID");
  }
  return digestJson(limits);
}

export function computeBackgroundAggregateEpochDigest({
  shared_aggregate_policy: sharedAggregatePolicy,
  project_config_digest: projectConfigDigest,
  operation_inventory_digest: operationInventoryDigest,
} = {}) {
  if (!exactFields(sharedAggregatePolicy, AGGREGATE_FIELDS)) {
    fail("BACKGROUND_AGGREGATE_POLICY_INVALID");
  }
  for (const [value, code] of [
    [projectConfigDigest, "BACKGROUND_PROJECT_CONFIG_DIGEST_INVALID"],
    [operationInventoryDigest, "BACKGROUND_INVENTORY_DIGEST_INVALID"],
  ]) {
    assertDigest(value, code);
  }
  return digestJson({
    domain: "super-compound.background-aggregate-epoch.v2",
    project_config_digest: projectConfigDigest,
    operation_inventory_digest: operationInventoryDigest,
    shared_aggregate_policy: sharedAggregatePolicy,
  });
}

export function computeBackgroundRunAggregatePolicyDigest({
  run_id: runId,
  policy_digest: runPolicyDigest,
  aggregate_epoch_digest: aggregateEpochDigest,
  aggregate_policy: aggregatePolicy,
} = {}) {
  assertRunId(runId);
  assertDigest(runPolicyDigest, "BACKGROUND_RUN_POLICY_DIGEST_INVALID");
  assertDigest(aggregateEpochDigest, "BACKGROUND_AGGREGATE_DIGEST_INVALID");
  if (!exactFields(aggregatePolicy, AGGREGATE_FIELDS)) {
    fail("BACKGROUND_AGGREGATE_POLICY_INVALID");
  }
  return digestJson({
    domain: "super-compound.background-run-aggregate-policy.v2",
    run_id: runId,
    policy_digest: runPolicyDigest,
    aggregate_epoch_digest: aggregateEpochDigest,
    aggregate_policy: aggregatePolicy,
  });
}

export function createCanonicalBackgroundPolicyAuthority(root, options = {}) {
  if (typeof root !== "string" || root.length === 0) {
    fail("BACKGROUND_POLICY_ROOT_REQUIRED");
  }
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) => !new Set(["now", "loopRunController"]).has(key),
    ) ||
    (options.now !== undefined && typeof options.now !== "function")
  ) {
    fail("BACKGROUND_POLICY_OPTIONS_INVALID");
  }
  if (options.loopRunController !== undefined) {
    assertLoopRunControllerAuthority(options.loopRunController, root);
  }
  const handle = Object.freeze({
    schema: "canonical_background_policy_authority_v2",
  });
  authorities.set(handle, {
    root: path.resolve(root),
    now: options.now ?? (() => new Date().toISOString()),
    controller: options.loopRunController ?? null,
  });
  return handle;
}

export function assertCanonicalBackgroundPolicyAuthority(authority, root) {
  const trusted =
    authority !== null && typeof authority === "object"
      ? authorities.get(authority)
      : undefined;
  if (trusted === undefined) fail("BACKGROUND_POLICY_AUTHORITY_UNTRUSTED");
  if (trusted.root !== path.resolve(root)) {
    fail("BACKGROUND_POLICY_AUTHORITY_ROOT_MISMATCH");
  }
  return true;
}

async function loadRunContract(root, runId) {
  assertRunId(runId);
  let schemaText;
  let contractText;
  try {
    [schemaText, contractText] = await Promise.all([
      readBoundedFile(root, CONTRACT_SCHEMA, {
        encoding: "utf8",
        label: "loop run contract schema",
        maxBytes: MAX_SCHEMA_BYTES,
      }),
      readBoundedFile(
        root,
        path.join(".scratch", "loop-runs", runId, "contract.json"),
        {
          encoding: "utf8",
          label: "canonical loop run contract",
          maxBytes: MAX_CONTRACT_BYTES,
        },
      ),
    ]);
  } catch (error) {
    fail(
      `BACKGROUND_RUN_AUTHORITY_UNAVAILABLE:${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  let schema;
  try {
    schema = JSON.parse(schemaText);
  } catch {
    fail("BACKGROUND_RUN_SCHEMA_INVALID");
  }
  return parseJsonDocument(contractText, schema, "background run contract");
}

function bindingFromRequest(request) {
  if (request.stage === "RESERVE") {
    const queue = request.input?.queue_claim;
    return {
      queue,
      runId: queue?.run_id,
      projectConfigDigest: queue?.project_config_digest,
      runPolicyDigest: queue?.policy_digest,
      operationInventoryDigest: queue?.operation_inventory_digest,
      aggregatePolicy: request.input?.aggregate_policy,
      aggregatePolicyDigest: request.input?.aggregate_policy_digest,
      sharedAggregatePolicy: request.input?.shared_aggregate_policy,
      aggregateEpochDigest: request.input?.aggregate_epoch_digest,
      effectiveLimits: request.input?.effective_limits,
      effectiveLimitsDigest: request.input?.effective_limits_digest,
      policyVerification: request.input?.policy_verification,
      reservation: request.input?.reservation,
      actionGate: null,
    };
  }
  if (request.stage === "ARM" || request.stage === "AUTHORIZE") {
    const run = request.record?.run_binding;
    return {
      queue: request.queue_claim,
      runId: run?.run_id,
      projectConfigDigest: run?.project_config_digest,
      runPolicyDigest: run?.policy_digest,
      operationInventoryDigest: run?.operation_inventory_digest,
      aggregatePolicy: request.record?.aggregate_policy,
      aggregatePolicyDigest: request.record?.aggregate_policy_digest,
      sharedAggregatePolicy: request.record?.shared_aggregate_policy,
      aggregateEpochDigest: request.record?.aggregate_epoch_digest,
      effectiveLimits: request.record?.effective_limits,
      effectiveLimitsDigest: request.record?.effective_limits_digest,
      policyVerification: null,
      reservation: request.record?.reservation,
      actionGate: request.action_gate,
    };
  }
  fail("BACKGROUND_POLICY_STAGE_INVALID");
}

function assertEffectiveLimitsWithinContract(limits, contractPolicy) {
  if (
    !exactFields(limits, [
      "max_runtime_ms",
      "max_no_progress_iterations",
      "max_tokens",
    ]) ||
    !Number.isSafeInteger(limits.max_runtime_ms) ||
    limits.max_runtime_ms <= 0 ||
    !Number.isSafeInteger(limits.max_no_progress_iterations) ||
    limits.max_no_progress_iterations <= 0 ||
    !Number.isSafeInteger(contractPolicy.max_runtime_minutes) ||
    contractPolicy.max_runtime_minutes <= 0 ||
    !Number.isSafeInteger(contractPolicy.max_no_progress_iterations) ||
    contractPolicy.max_no_progress_iterations <= 0 ||
    limits.max_runtime_ms > contractPolicy.max_runtime_minutes * 60_000 ||
    limits.max_no_progress_iterations >
      contractPolicy.max_no_progress_iterations ||
    (contractPolicy.max_tokens !== null &&
      (limits.max_tokens === null || limits.max_tokens > contractPolicy.max_tokens)) ||
    (limits.max_tokens !== null &&
      (!Number.isSafeInteger(limits.max_tokens) || limits.max_tokens <= 0))
  ) {
    fail("BACKGROUND_EFFECTIVE_LIMITS_WIDENED");
  }
}

async function verifyCanonicalAuthority(trusted, request) {
  const binding = bindingFromRequest(request);
  assertRunId(binding.runId);
  for (const [value, code] of [
    [binding.projectConfigDigest, "BACKGROUND_PROJECT_CONFIG_DIGEST_INVALID"],
    [binding.runPolicyDigest, "BACKGROUND_RUN_POLICY_DIGEST_INVALID"],
    [binding.operationInventoryDigest, "BACKGROUND_INVENTORY_DIGEST_INVALID"],
    [binding.aggregatePolicyDigest, "BACKGROUND_AGGREGATE_DIGEST_INVALID"],
    [binding.aggregateEpochDigest, "BACKGROUND_AGGREGATE_DIGEST_INVALID"],
    [binding.effectiveLimitsDigest, "BACKGROUND_EFFECTIVE_LIMITS_DIGEST_INVALID"],
  ]) {
    assertDigest(value, code);
  }

  if (trusted.controller === null) {
    fail("BACKGROUND_POLICY_CONTROLLER_REQUIRED");
  }
  const loadedConfig = await loadLoopRunControllerCanonicalProjectConfig(
    trusted.controller,
    trusted.root,
  );
  if (!loadedConfig.valid || loadedConfig.config === null) {
    fail("BACKGROUND_PROJECT_CONFIG_INVALID");
  }
  if (loadedConfig.config_digest !== binding.projectConfigDigest) {
    fail("BACKGROUND_PROJECT_CONFIG_STALE");
  }
  const now = trusted.now();
  let loadedInventory;
  try {
    loadedInventory = await loadCanonicalOperationInventory(trusted.root, {
      expectedProjectConfigDigest: loadedConfig.config_digest,
      now,
    });
  } catch {
    fail("BACKGROUND_OPERATION_INVENTORY_INVALID");
  }
  if (loadedInventory.inventory_digest !== binding.operationInventoryDigest) {
    fail("BACKGROUND_OPERATION_INVENTORY_STALE");
  }
  const contract = await loadRunContract(trusted.root, binding.runId);
  if (
    contract.run_id !== binding.runId ||
    contract.project_config_digest !== loadedConfig.config_digest ||
    contract.authority.operation_inventory_digest !==
      loadedInventory.inventory_digest ||
    policyDigest(contract) !== binding.runPolicyDigest ||
    contract.autonomy_profile !== "BACKGROUND"
  ) {
    fail("BACKGROUND_RUN_POLICY_STALE");
  }

  const operation =
    request.stage === "RESERVE" ? "work" : binding.actionGate?.operation;
  if (trusted.controller === null) {
    fail("BACKGROUND_CONTROLLER_AUTHORITY_REQUIRED");
  }
  let gate;
  try {
    gate = await trusted.controller.validateGate({
      runId: binding.runId,
      operation,
    });
  } catch {
    fail("BACKGROUND_CONTROLLER_GATE_DENIED");
  }
  if (
    gate?.allowed !== true ||
    gate?.would_allow !== true ||
    gate?.simulation_only !== false ||
    gate?.mutation_authorized !== true
  ) {
    fail("BACKGROUND_CONTROLLER_GATE_DENIED");
  }
  const budget = gate?.background_budget_binding;
  if (
    gate.run_id !== binding.runId ||
    gate.confirmation_digest !== binding.queue?.approval_digest ||
    gate.authority_digest !== binding.queue?.authority_digest ||
    gate.policy_digest !== binding.runPolicyDigest ||
    gate.project_config_digest !== loadedConfig.config_digest ||
    gate.operation_inventory_digest !== loadedInventory.inventory_digest ||
    !isObject(budget) ||
    budget.schema !== "background_budget_binding_v2" ||
    budget.run_id !== binding.runId ||
    budget.confirmation_digest !== gate.confirmation_digest ||
    budget.run_version !== gate.run_version ||
    budget.action_run_head_digest !== gate.run_head_digest ||
    budget.action_id !== gate.action_id ||
    budget.idempotency_key !== gate.idempotency_key ||
    budget.controller_intent_digest !== gate.controller_intent_digest ||
    !DIGEST.test(budget.current_run_head_digest ?? "") ||
    !DIGEST.test(budget.authority_digest ?? "")
  ) {
    fail("BACKGROUND_CONTROLLER_BUDGET_BINDING_MISMATCH");
  }
  if (
    request.stage !== "RESERVE" &&
    (!isObject(binding.actionGate) ||
      binding.actionGate.operation !== gate.operation ||
      binding.actionGate.run_id !== gate.run_id ||
      binding.actionGate.run_version !== gate.run_version ||
      binding.actionGate.confirmation_digest !== gate.confirmation_digest ||
      binding.actionGate.run_head_digest !== gate.run_head_digest ||
      binding.actionGate.action_id !== gate.action_id ||
      binding.actionGate.idempotency_key !== gate.idempotency_key ||
      binding.actionGate.controller_intent_digest !==
        gate.controller_intent_digest ||
      binding.actionGate.background_budget_binding?.authority_digest !==
        budget.authority_digest)
  ) {
    fail("BACKGROUND_ACTION_GATE_STALE");
  }

  const sharedAggregatePolicy = resolveBackgroundAggregatePolicy({
    project: loadedConfig.config.background_aggregate_policy,
    operation: loadedInventory.inventory.background_aggregate_policy,
  });
  const aggregatePolicy = resolveBackgroundAggregatePolicy({
    project: sharedAggregatePolicy,
    fsd: contract.policy.background_aggregate_policy,
  });
  if (!sameAggregatePolicy(binding.sharedAggregatePolicy, sharedAggregatePolicy)) {
    fail("BACKGROUND_SHARED_AGGREGATE_POLICY_WIDENED");
  }
  if (!sameAggregatePolicy(binding.aggregatePolicy, aggregatePolicy)) {
    fail("BACKGROUND_AGGREGATE_POLICY_WIDENED");
  }
  const aggregateEpochDigest = computeBackgroundAggregateEpochDigest({
    shared_aggregate_policy: sharedAggregatePolicy,
    project_config_digest: loadedConfig.config_digest,
    operation_inventory_digest: loadedInventory.inventory_digest,
  });
  if (binding.aggregateEpochDigest !== aggregateEpochDigest) {
    fail("BACKGROUND_AGGREGATE_EPOCH_DIGEST_MISMATCH");
  }
  const aggregatePolicyDigest = computeBackgroundRunAggregatePolicyDigest({
    run_id: binding.runId,
    aggregate_policy: aggregatePolicy,
    policy_digest: binding.runPolicyDigest,
    aggregate_epoch_digest: aggregateEpochDigest,
  });
  if (binding.aggregatePolicyDigest !== aggregatePolicyDigest) {
    fail("BACKGROUND_AGGREGATE_POLICY_DIGEST_MISMATCH");
  }
  assertEffectiveLimitsWithinContract(binding.effectiveLimits, contract.policy);
  if (!sameEffectiveLimits(binding.effectiveLimits, budget.effective_limits)) {
    fail("BACKGROUND_EFFECTIVE_LIMITS_WIDENED");
  }
  if (
    budget.effective_limits.max_tokens !== null &&
    binding.reservation?.tokens === null
  ) {
    fail("BACKGROUND_TOKEN_ACCOUNTING_UNKNOWN");
  }
  if (
    !isObject(binding.reservation) ||
    !Number.isSafeInteger(binding.reservation.runtime_ms) ||
    binding.reservation.runtime_ms <= 0 ||
    binding.reservation.runtime_ms > budget.remaining.runtime_ms ||
    !Number.isSafeInteger(budget.remaining.no_progress_iterations) ||
    budget.remaining.no_progress_iterations <= 0 ||
    (budget.effective_limits.max_tokens !== null &&
      (!Number.isSafeInteger(binding.reservation.tokens) ||
        binding.reservation.tokens < 0 ||
        !Number.isSafeInteger(budget.remaining.tokens) ||
        binding.reservation.tokens > budget.remaining.tokens))
  ) {
    fail("BACKGROUND_REMAINING_BUDGET_EXHAUSTED");
  }
  if (
    binding.effectiveLimitsDigest !==
    computeEffectiveBackgroundLimitsDigest(binding.effectiveLimits)
  ) {
    fail("BACKGROUND_EFFECTIVE_LIMITS_DIGEST_MISMATCH");
  }
  if (request.stage === "RESERVE") {
    const verification = binding.policyVerification;
    if (
      !isObject(verification) ||
      verification.project_config_digest !== loadedConfig.config_digest ||
      verification.policy_digest !== binding.runPolicyDigest ||
      verification.operation_inventory_digest !==
        loadedInventory.inventory_digest ||
      verification.confirmation_digest !== gate.confirmation_digest ||
      verification.effective_limits_digest !== binding.effectiveLimitsDigest ||
      verification.aggregate_epoch_digest !== aggregateEpochDigest ||
      verification.aggregate_policy_digest !== aggregatePolicyDigest
    ) {
      fail("BACKGROUND_POLICY_VERIFICATION_MISMATCH");
    }
  }
  if (
    binding.queue !== null &&
    binding.queue !== undefined &&
    (binding.queue.run_id !== binding.runId ||
      binding.queue.project_config_digest !== loadedConfig.config_digest ||
      binding.queue.policy_digest !== binding.runPolicyDigest ||
      binding.queue.operation_inventory_digest !==
        loadedInventory.inventory_digest)
  ) {
    fail("BACKGROUND_QUEUE_POLICY_STALE");
  }

  return Object.freeze({
    schema: "background_policy_epoch_v2",
    project_config_digest: loadedConfig.config_digest,
    policy_digest: binding.runPolicyDigest,
    operation_inventory_digest: loadedInventory.inventory_digest,
    aggregate_policy: aggregatePolicy,
    aggregate_policy_digest: aggregatePolicyDigest,
    shared_aggregate_policy: sharedAggregatePolicy,
    aggregate_epoch_digest: aggregateEpochDigest,
    effective_limits_digest: binding.effectiveLimitsDigest,
    background_budget_binding: budget,
    observed_at: now,
    epoch_digest: digestJson({
      project_config_digest: loadedConfig.config_digest,
      policy_digest: binding.runPolicyDigest,
      operation_inventory_digest: loadedInventory.inventory_digest,
      aggregate_policy_digest: aggregatePolicyDigest,
      aggregate_epoch_digest: aggregateEpochDigest,
      effective_limits_digest: binding.effectiveLimitsDigest,
    }),
  });
}

export async function withCanonicalBackgroundPolicyAuthority(
  authority,
  root,
  request,
  operation,
) {
  assertCanonicalBackgroundPolicyAuthority(authority, root);
  if (typeof operation !== "function") {
    fail("BACKGROUND_POLICY_OPERATION_REQUIRED");
  }
  const trusted = authorities.get(authority);
  const binding = bindingFromRequest(request);
  assertRunId(binding.runId);
  return withOwnerLock(
    trusted.root,
    CONFIG_LOCK,
    async () =>
      withOwnerLock(
        trusted.root,
        path.join(RUNS_DIRECTORY, `${binding.runId}.owner.lock`),
        async () => {
          const policyEpoch = await verifyCanonicalAuthority(trusted, request);
          const revalidate = async () =>
            verifyCanonicalAuthority(trusted, request);
          return operation(policyEpoch, revalidate);
        },
        { staleMs: 60_000, heartbeatMs: 10_000 },
      ),
    { staleMs: 60_000, heartbeatMs: 10_000 },
  );
}
