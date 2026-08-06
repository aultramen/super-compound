import { createHash } from "node:crypto";
import path from "node:path";

import { evaluateActionCapability } from "./action-capability-model.mjs";
import { readBoundedFile } from "./file-state.mjs";
import {
  parseJsonDocument,
  rfc3339UtcSortKey,
} from "./schema-validator.mjs";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const INVENTORY_FILE = path.join(".agent", "context", "operation-inventory.json");
const INVENTORY_SCHEMA_FILE = path.join(
  ".agent",
  "context",
  "schemas",
  "operation-inventory-v2.schema.json",
);
const MAX_INVENTORY_BYTES = 256 * 1024;
const MAX_SCHEMA_BYTES = 256 * 1024;
const ISOLATION_ORDER = Object.freeze([
  "NONE",
  "WORKTREE",
  "PROCESS",
  "NETWORK",
  "CREDENTIAL",
  "HARDENED",
]);
const BACKGROUND_HOST_BINDING_FIELDS = Object.freeze([
  "attestation_id",
  "host_ref",
  "evidence_digest",
  "expires_at",
  "effective_isolation",
  "required_capabilities",
]);
const WORKFLOW_CAPABILITY_INPUT_FIELDS = Object.freeze([
  "runId",
  "operation",
  "writeClass",
  "gate",
  "attestation",
  "intentBinding",
  "backgroundDispatchId",
]);
const EFFECT_HOOK_FIELDS = new Set([
  "afterIntentPersisted",
  "afterDispatchMarked",
  "afterDispatch",
  "afterResponse",
  "afterResultPersisted",
  "beforeAcknowledge",
]);

function fail(code) {
  throw new TypeError(code);
}

function exactGateBinding(result, request) {
  return (
    result !== null &&
    typeof result === "object" &&
    result.allowed === true &&
    result.mutation_authorized === true &&
    result.run_id === request.run_id &&
    result.operation === request.operation_id &&
    result.confirmation_digest === request.approval_digest &&
    result.authority_digest === request.authority_digest &&
    result.policy_digest === request.policy_digest &&
    result.run_head_digest === request.run_head_digest &&
    result.verifier_digest === request.verifier_digest &&
    result.project_config_digest === request.project_config_digest &&
    result.operation_inventory_digest === request.operation_inventory_digest &&
    result.confirmed_risk_profile === request.risk_profile &&
    result.confirmed_autonomy_profile === request.autonomy_profile &&
    sameStringSet(result.confirmed_required_gates, request.required_gates) &&
    DIGEST.test(result.confirmation_digest) &&
    DIGEST.test(result.authority_digest) &&
    DIGEST.test(result.policy_digest) &&
    DIGEST.test(result.run_head_digest) &&
    DIGEST.test(result.verifier_digest) &&
    DIGEST.test(result.project_config_digest) &&
    DIGEST.test(result.operation_inventory_digest)
  );
}

function sameStringSet(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((entry) => typeof entry === "string" && right.includes(entry)) &&
    left.length === right.length
  );
}

function exactFields(value, fields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function freezePlan(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value) ||
    seen.has(value)
  ) {
    return value;
  }
  seen.add(value);
  for (const entry of Object.values(value)) freezePlan(entry, seen);
  return Object.freeze(value);
}

function snapshotActionInput(input, code = "INVALID_ACTION_INPUT") {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    fail(code);
  }
  try {
    return freezePlan(structuredClone(input));
  } catch {
    fail(code);
  }
}

function digestJson(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function validActionIdentity(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value ?? "");
}

function validBackgroundHostBinding(binding, attestation, request, observedAt) {
  return (
    exactFields(binding, BACKGROUND_HOST_BINDING_FIELDS) &&
    attestation !== null &&
    typeof attestation === "object" &&
    !Array.isArray(attestation) &&
    binding.attestation_id === attestation.attestation_id &&
    binding.host_ref === attestation.host_ref &&
    binding.evidence_digest === attestation.evidence_digest &&
    binding.expires_at === attestation.expires_at &&
    validActionIdentity(binding.attestation_id) &&
    validActionIdentity(binding.host_ref) &&
    DIGEST.test(binding.evidence_digest) &&
    rfc3339UtcSortKey(binding.expires_at) !== null &&
    rfc3339UtcSortKey(observedAt) < rfc3339UtcSortKey(binding.expires_at) &&
    ISOLATION_ORDER.includes(binding.effective_isolation) &&
    ISOLATION_ORDER.includes(attestation.isolation) &&
    ISOLATION_ORDER.includes(request.requested_isolation) &&
    ISOLATION_ORDER.indexOf(attestation.isolation) >=
      ISOLATION_ORDER.indexOf(binding.effective_isolation) &&
    ISOLATION_ORDER.indexOf(binding.effective_isolation) >=
      ISOLATION_ORDER.indexOf(request.requested_isolation) &&
    Array.isArray(attestation.capabilities) &&
    Array.isArray(binding.required_capabilities) &&
    binding.required_capabilities.length > 0 &&
    new Set(binding.required_capabilities).size ===
      binding.required_capabilities.length &&
    binding.required_capabilities.every(
      (entry) =>
        validActionIdentity(entry) && attestation.capabilities?.includes(entry),
    ) &&
    attestation.run_id === request.run_id &&
    attestation.run_head_digest === request.run_head_digest &&
    attestation.authority_digest === request.authority_digest &&
    attestation.verifier_digest === request.verifier_digest &&
    attestation.project_config_digest === request.project_config_digest &&
    attestation.operation_inventory_digest ===
      request.operation_inventory_digest &&
    attestation.policy_digest === request.policy_digest &&
    attestation.approval_digest === request.approval_digest
  );
}

function validBackgroundAuthorization(
  value,
  dispatchId,
  request,
  gate,
  attestation,
  observedAt,
) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.schema === "background_action_authorization_v2" &&
    value.contract_version === "2.0.0" &&
    value.dispatch_id === dispatchId &&
    value.operation === request.operation_id &&
    value.operation === gate.operation &&
    value.run_id === request.run_id &&
    validActionIdentity(value.queue_item_id) &&
    validActionIdentity(value.lease_id) &&
    validActionIdentity(value.worker_ref) &&
    validActionIdentity(value.worktree_ref) &&
    value.action_id === gate.action_id &&
    value.idempotency_key === gate.idempotency_key &&
    value.controller_intent_digest === gate.controller_intent_digest &&
    value.action_run_head_digest === gate.run_head_digest &&
    value.action_run_head_digest === request.run_head_digest &&
    value.policy_digest === request.policy_digest &&
    value.confirmation_digest === request.approval_digest &&
    validBackgroundHostBinding(
      value.host_binding,
      attestation,
      request,
      observedAt,
    ) &&
    rfc3339UtcSortKey(value.expires_at) !== null &&
    rfc3339UtcSortKey(observedAt) < rfc3339UtcSortKey(value.expires_at)
  );
}

function effectReceipt(record, acknowledged = false) {
  return freezePlan({
    schema: "external_action_receipt_v2",
    contract_version: "2.0.0",
    record_id: record.record_id,
    storage_key: record.storage_key,
    run_id: record.run_id,
    operation_id: record.operation_id,
    action_id: record.action_id,
    idempotency_key: record.idempotency_key,
    kind: record.kind,
    parent_action_digest: record.parent_action_digest,
    plan_digest: record.plan_digest,
    state: record.state,
    provider_receipt_digest: record.provider_receipt_digest,
    outcome: record.outcome,
    target_audit_digest: record.target_audit_digest,
    record_digest: digestJson(record),
    acknowledged,
  });
}

function validEffectReceipt(value) {
  const fields = [
    "schema",
    "contract_version",
    "record_id",
    "storage_key",
    "run_id",
    "operation_id",
    "action_id",
    "idempotency_key",
    "kind",
    "parent_action_digest",
    "plan_digest",
    "state",
    "provider_receipt_digest",
    "outcome",
    "target_audit_digest",
    "record_digest",
    "acknowledged",
  ];
  return (
    exactFields(value, fields) &&
    value.schema === "external_action_receipt_v2" &&
    value.contract_version === "2.0.0" &&
    [
      value.record_id,
      value.run_id,
      value.operation_id,
      value.action_id,
      value.idempotency_key,
    ].every(validActionIdentity) &&
    /^[a-f0-9]{64}$/u.test(value.storage_key) &&
    new Set(["EXECUTE", "COMPENSATE"]).has(value.kind) &&
    (value.parent_action_digest === null || DIGEST.test(value.parent_action_digest)) &&
    DIGEST.test(value.plan_digest) &&
    DIGEST.test(value.record_digest) &&
    typeof value.acknowledged === "boolean"
  );
}

export async function loadCanonicalOperationInventory(root, options = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("ACTION_INVENTORY_ROOT_REQUIRED");
  }
  if (!DIGEST.test(options.expectedProjectConfigDigest ?? "")) {
    throw new TypeError("PROJECT_CONFIG_DIGEST_REQUIRED");
  }
  const safeRoot = path.resolve(root);
  let schemaText;
  let inventoryText;
  try {
    [schemaText, inventoryText] = await Promise.all([
      readBoundedFile(safeRoot, options.schemaFile ?? INVENTORY_SCHEMA_FILE, {
        encoding: "utf8",
        label: "operation inventory schema",
        maxBytes: MAX_SCHEMA_BYTES,
      }),
      readBoundedFile(safeRoot, options.inventoryFile ?? INVENTORY_FILE, {
        encoding: "utf8",
        label: "operation inventory",
        maxBytes: MAX_INVENTORY_BYTES,
      }),
    ]);
  } catch (error) {
    throw new TypeError(
      `ACTION_INVENTORY_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let schema;
  try {
    schema = JSON.parse(schemaText);
  } catch {
    throw new TypeError("ACTION_INVENTORY_SCHEMA_INVALID");
  }
  const inventory = parseJsonDocument(inventoryText, schema, "operation inventory");
  if (inventory.project_config_digest !== options.expectedProjectConfigDigest) {
    throw new TypeError("PROJECT_CONFIG_BINDING_MISMATCH");
  }
  const nowKey = rfc3339UtcSortKey(options.now ?? new Date().toISOString());
  const issuedKey = rfc3339UtcSortKey(inventory.issued_at);
  const expiryKey = rfc3339UtcSortKey(inventory.expires_at);
  if (
    nowKey === null ||
    issuedKey === null ||
    expiryKey === null ||
    issuedKey > nowKey ||
    nowKey >= expiryKey
  ) {
    throw new TypeError("ACTION_INVENTORY_EXPIRED_OR_NOT_YET_VALID");
  }
  const operationIds = inventory.operations.map((entry) => entry.operation_id);
  if (new Set(operationIds).size !== operationIds.length) {
    throw new TypeError("ACTION_INVENTORY_DUPLICATE_OPERATION");
  }
  for (const operation of inventory.operations) {
    if (
      operation.write_class === "external_write" &&
      (operation.idempotency.required !== true ||
        operation.authoritative_readback.required !== true ||
        operation.compensation.required !== true ||
        operation.human_gate !== "REQUIRED")
    ) {
      throw new TypeError("UNSAFE_EXTERNAL_OPERATION");
    }
  }
  const frozenInventory = freezePlan(structuredClone(inventory));
  return Object.freeze({
    valid: true,
    inventory: frozenInventory,
    inventory_digest: `sha256:${createHash("sha256").update(inventoryText).digest("hex")}`,
  });
}

export function createActionAdapter(dependencies = {}) {
  const {
    inventory,
    inventoryDigest,
    policyAuthority,
    now,
    verifyHostAttestation,
    validateControllerGate,
    validateBackgroundDispatch,
    validateReconciliationGate,
    externalActionStore,
    effectDriver,
    effectHooks = {},
  } = dependencies;
  if (inventory === null || typeof inventory !== "object" || Array.isArray(inventory)) {
    throw new TypeError("ACTION_INVENTORY_REQUIRED");
  }
  if (typeof inventoryDigest !== "string" || !DIGEST.test(inventoryDigest)) {
    throw new TypeError("ACTION_INVENTORY_DIGEST_REQUIRED");
  }
  const policyFields = [
    "effective_policy",
    "capability_requirements",
    "execution_mode",
    "autonomy_profile",
    "external_write_policy",
    "project_egress_ids",
    "policy_digest",
  ];
  if (
    policyAuthority === null ||
    typeof policyAuthority !== "object" ||
    Array.isArray(policyAuthority) ||
    Object.keys(policyAuthority).length !== policyFields.length ||
    !policyFields.every((field) => Object.hasOwn(policyAuthority, field)) ||
    !DIGEST.test(policyAuthority.policy_digest ?? "")
  ) {
    throw new TypeError("TRUSTED_POLICY_AUTHORITY_REQUIRED");
  }
  if (typeof now !== "function") throw new TypeError("TRUSTED_CLOCK_REQUIRED");
  if (typeof verifyHostAttestation !== "function") {
    throw new TypeError("HOST_ATTESTATION_VERIFIER_REQUIRED");
  }
  if (typeof validateControllerGate !== "function") {
    throw new TypeError("CONTROLLER_GATE_REQUIRED");
  }
  if (
    policyAuthority.autonomy_profile === "BACKGROUND" &&
    typeof validateBackgroundDispatch !== "function"
  ) {
    throw new TypeError("BACKGROUND_DISPATCH_VALIDATOR_REQUIRED");
  }
  const protocolValues = [
    validateReconciliationGate,
    externalActionStore,
    effectDriver,
  ];
  const protocolEnabled = protocolValues.every((value) => value !== undefined);
  if (
    protocolValues.some((value) => value !== undefined) &&
    !protocolEnabled
  ) {
    throw new TypeError("INCOMPLETE_DURABLE_ACTION_PROTOCOL");
  }
  if (protocolEnabled) {
    if (
      typeof validateReconciliationGate !== "function" ||
      externalActionStore === null ||
      typeof externalActionStore !== "object" ||
      ![
        "intent",
        "reserveDispatch",
        "recordReceipt",
        "recordOutcome",
        "recover",
      ].every(
        (method) => typeof externalActionStore[method] === "function",
      ) ||
      effectDriver === null ||
      typeof effectDriver !== "object" ||
      !["executeOnce", "queryOutcome", "compensate"].every(
        (method) => typeof effectDriver[method] === "function",
      )
    ) {
      throw new TypeError("INVALID_DURABLE_ACTION_PROTOCOL");
    }
  }
  if (
    effectHooks === null ||
    typeof effectHooks !== "object" ||
    Array.isArray(effectHooks) ||
    Object.keys(effectHooks).some(
      (key) =>
        !EFFECT_HOOK_FIELDS.has(key) || typeof effectHooks[key] !== "function",
    )
  ) {
    throw new TypeError("INVALID_EFFECT_HOOKS");
  }
  const trustedInventory = freezePlan(structuredClone(inventory));
  const trustedPolicyAuthority = freezePlan(structuredClone(policyAuthority));

  const trustedPlans = new WeakSet();

  async function authorize(input) {
    const captured = snapshotActionInput(input);
    if (captured.request?.operation_inventory_digest !== inventoryDigest) {
      fail("ACTION_INVENTORY_BINDING_MISMATCH");
    }
    if (captured.request?.policy_digest !== trustedPolicyAuthority.policy_digest) {
      fail("POLICY_AUTHORITY_BINDING_MISMATCH");
    }
    const hostVerification = await verifyHostAttestation(captured.attestation, {
      run_id: captured.request?.run_id,
      run_head_digest: captured.request?.run_head_digest,
      inventory_digest: inventoryDigest,
    });
    if (
      hostVerification?.verified !== true ||
      hostVerification.evidence_digest !== captured.attestation?.evidence_digest
    ) {
      fail("HOST_ATTESTATION_UNVERIFIED");
    }
    const gate = await validateControllerGate({
      runId: captured.request?.run_id,
      operation: captured.request?.operation_id,
      confirmationDigest: captured.request?.approval_digest,
      authorityDigest: captured.request?.authority_digest,
      policyDigest: captured.request?.policy_digest,
    });
    if (!exactGateBinding(gate, captured.request)) {
      fail("CONTROLLER_GATE_BINDING_MISMATCH");
    }
    let backgroundAuthorization = null;
    if (captured.request?.autonomy_profile === "BACKGROUND") {
      if (!validActionIdentity(captured.background_dispatch_id)) {
        fail("BACKGROUND_DISPATCH_REQUIRED");
      }
      backgroundAuthorization = await validateBackgroundDispatch({
        dispatchId: captured.background_dispatch_id,
        request: captured.request,
        gate,
        attestation: captured.attestation,
      });
      if (
        !validBackgroundAuthorization(
          backgroundAuthorization,
          captured.background_dispatch_id,
          captured.request,
          gate,
          captured.attestation,
          now(),
        )
      ) {
        fail("BACKGROUND_DISPATCH_INVALID");
      }
      backgroundAuthorization = freezePlan(
        structuredClone(backgroundAuthorization),
      );
    }

    const decision = evaluateActionCapability({
      inventory: trustedInventory,
      attestation: captured.attestation,
      request: captured.request,
      host_verification: hostVerification,
      effective_policy: trustedPolicyAuthority.effective_policy,
      capability_requirements: trustedPolicyAuthority.capability_requirements,
      execution_mode: trustedPolicyAuthority.execution_mode,
      autonomy_profile: trustedPolicyAuthority.autonomy_profile,
      external_write_policy: trustedPolicyAuthority.external_write_policy,
      project_egress_ids: trustedPolicyAuthority.project_egress_ids,
      now: now(),
    });
    if (decision.allowed !== true) fail(decision.code);
    return {
      captured,
      decision,
      gate: freezePlan(structuredClone(gate)),
      backgroundAuthorization,
    };
  }

  function buildPlan(captured, decision, gate, backgroundAuthorization) {
    return freezePlan({
      schema: "action_plan_v2",
      contract_version: "2.0.0",
      authorized: true,
      run_id: captured.request.run_id,
      operation_id: captured.request.operation_id,
      run_head_digest: captured.request.run_head_digest,
      inventory_digest: inventoryDigest,
      authority_digest: captured.request.authority_digest,
      verifier_digest: captured.request.verifier_digest,
      project_config_digest: captured.request.project_config_digest,
      policy_digest: captured.request.policy_digest,
      approval_digest: captured.request.approval_digest,
      host_capability_digest: captured.attestation.evidence_digest,
      confirmed_risk_profile: captured.request.risk_profile,
      confirmed_autonomy_profile: captured.request.autonomy_profile,
      confirmed_required_gates: [...captured.request.required_gates],
      target_ref: decision.operation.target_ref,
      write_class: decision.operation.write_class,
      effective_credential_scopes: structuredClone(decision.effective_credential_scopes),
      effective_egress_ids: [...decision.effective_egress_ids],
      effective_isolation: decision.effective_isolation,
      required_capabilities: [...decision.required_capabilities],
      action_id: validActionIdentity(gate.action_id) ? gate.action_id : null,
      idempotency_key: validActionIdentity(gate.idempotency_key)
        ? gate.idempotency_key
        : null,
      controller_intent_digest: DIGEST.test(
        gate.controller_intent_digest ?? "",
      )
        ? gate.controller_intent_digest
        : null,
      idempotency_key_scope: decision.operation.idempotency.key_scope,
      authoritative_readback_strategy_ref:
        decision.operation.authoritative_readback.strategy_ref,
      compensation_strategy_ref: decision.operation.compensation.strategy_ref,
      audit_sink_ref: decision.operation.audit_sink_ref,
      timeout_ms: decision.operation.timeout_ms,
      ...(backgroundAuthorization === null
        ? {}
        : {
            background_dispatch: {
              schema: backgroundAuthorization.schema,
              contract_version: backgroundAuthorization.contract_version,
              dispatch_id: backgroundAuthorization.dispatch_id,
              operation: backgroundAuthorization.operation,
              run_id: backgroundAuthorization.run_id,
              queue_item_id: backgroundAuthorization.queue_item_id,
              lease_id: backgroundAuthorization.lease_id,
              worker_ref: backgroundAuthorization.worker_ref,
              worktree_ref: backgroundAuthorization.worktree_ref,
              action_id: backgroundAuthorization.action_id,
              idempotency_key: backgroundAuthorization.idempotency_key,
              controller_intent_digest:
                backgroundAuthorization.controller_intent_digest,
              action_run_head_digest:
                backgroundAuthorization.action_run_head_digest,
              policy_digest: backgroundAuthorization.policy_digest,
              confirmation_digest: backgroundAuthorization.confirmation_digest,
              host_binding: structuredClone(backgroundAuthorization.host_binding),
              expires_at: backgroundAuthorization.expires_at,
            },
          }),
    });
  }

  async function plan(input) {
    const { captured, decision, gate, backgroundAuthorization } = await authorize(input);
    const result = buildPlan(captured, decision, gate, backgroundAuthorization);
    trustedPlans.add(result);
    return result;
  }

  async function denyEffect(planValue, input) {
    if (!trustedPlans.has(planValue)) fail("ACTION_PLAN_NOT_TRUSTED");
    await authorize(input);
    fail("DURABLE_ACTION_PROTOCOL_REQUIRED: GOAL-013 has not installed effect execution.");
  }

  async function revalidatePlan(planValue, input) {
    if (planValue === null || typeof planValue !== "object") {
      fail("ACTION_PLAN_NOT_TRUSTED");
    }
    const { captured, decision, gate, backgroundAuthorization } = await authorize(input);
    const current = buildPlan(captured, decision, gate, backgroundAuthorization);
    if (JSON.stringify(current) !== JSON.stringify(planValue)) {
      fail("ACTION_PLAN_NOT_TRUSTED");
    }
    trustedPlans.add(planValue);
    return current;
  }

  function requireExternalPlan(planValue, idempotencyKey) {
    if (
      planValue.write_class !== "external_write" ||
      !validActionIdentity(planValue.action_id) ||
      !validActionIdentity(planValue.idempotency_key) ||
      !DIGEST.test(planValue.controller_intent_digest ?? "") ||
      idempotencyKey !== planValue.idempotency_key
    ) {
      fail("EXTERNAL_ACTION_INTENT_BINDING_MISMATCH");
    }
  }

  function actionReference(value) {
    return {
      record_id: value.record_id,
      storage_key: value.storage_key,
    };
  }

  function exactReadbackGate(gate, record) {
    return (
      gate !== null &&
      typeof gate === "object" &&
      gate.readback_authorized === true &&
      gate.mutation_authorized === false &&
      gate.run_id === record.run_id &&
      gate.operation === record.operation_id &&
      gate.action_id === record.action_id &&
      gate.idempotency_key === record.idempotency_key &&
      gate.controller_intent_digest === record.controller_intent_digest &&
      gate.confirmation_digest === record.confirmation_digest &&
      gate.authority_digest === record.authority_digest &&
      gate.policy_digest === record.policy_digest &&
      gate.run_head_digest === record.run_head_digest
    );
  }

  function receiptMatchesRecord(receipt, record) {
    return (
      validEffectReceipt(receipt) &&
      receipt.record_id === record.record_id &&
      receipt.storage_key === record.storage_key &&
      receipt.run_id === record.run_id &&
      receipt.operation_id === record.operation_id &&
      receipt.action_id === record.action_id &&
      receipt.idempotency_key === record.idempotency_key &&
      receipt.kind === record.kind &&
      receipt.parent_action_digest === record.parent_action_digest &&
      receipt.plan_digest === record.plan_digest
    );
  }

  async function executeOnce(planValue, idempotencyKey, input) {
    if (!protocolEnabled) return denyEffect(planValue, idempotencyKey);
    const currentPlan = await revalidatePlan(planValue, input);
    requireExternalPlan(currentPlan, idempotencyKey);
    const planDigest = digestJson(currentPlan);
    let record = await externalActionStore.intent({
      run_id: currentPlan.run_id,
      operation_id: currentPlan.operation_id,
      action_id: currentPlan.action_id,
      idempotency_key: currentPlan.idempotency_key,
      kind: "EXECUTE",
      parent_action_digest: null,
      queue_item_id: currentPlan.background_dispatch?.queue_item_id ?? null,
      plan_digest: planDigest,
      controller_intent_digest: currentPlan.controller_intent_digest,
      confirmation_digest: currentPlan.approval_digest,
      authority_digest: currentPlan.authority_digest,
      policy_digest: currentPlan.policy_digest,
      run_head_digest: currentPlan.run_head_digest,
      recorded_at: now(),
    });
    await effectHooks.afterIntentPersisted?.(effectReceipt(record));
    if (record.state !== "INTENDED") return effectReceipt(record);

    const reservation = await externalActionStore.reserveDispatch(
      actionReference(record),
      {
      expected_version: record.version,
      recorded_at: now(),
      },
    );
    record = reservation.record;
    await effectHooks.afterDispatchMarked?.(effectReceipt(record));
    if (!reservation.reserved) return effectReceipt(record);
    await revalidatePlan(currentPlan, input);

    const pending = effectDriver.executeOnce(
      freezePlan({
        operation_id: currentPlan.operation_id,
        target_ref: currentPlan.target_ref,
        action_id: currentPlan.action_id,
        idempotency_key: currentPlan.idempotency_key,
        idempotency_key_scope: currentPlan.idempotency_key_scope,
        timeout_ms: currentPlan.timeout_ms,
        audit_sink_ref: currentPlan.audit_sink_ref,
      }),
    );
    await effectHooks.afterDispatch?.(effectReceipt(record));
    const response = await pending;
    if (
      !exactFields(response, ["receipt_digest"]) ||
      !DIGEST.test(response.receipt_digest ?? "")
    ) {
      fail("INVALID_PROVIDER_RECEIPT");
    }
    await effectHooks.afterResponse?.(
      freezePlan({ receipt_digest: response.receipt_digest }),
    );
    record = await externalActionStore.recordReceipt(actionReference(record), {
      expected_version: record.version,
      recorded_at: now(),
      receipt_digest: response.receipt_digest,
    });
    return effectReceipt(record);
  }

  async function queryOutcome(receiptValue, input) {
    if (!protocolEnabled) return denyEffect(receiptValue, input);
    const capturedReceipt = snapshotActionInput(
      receiptValue,
      "INVALID_EXTERNAL_ACTION_RECEIPT",
    );
    if (!validEffectReceipt(capturedReceipt)) {
      fail("INVALID_EXTERNAL_ACTION_RECEIPT");
    }
    let record = await externalActionStore.recover(actionReference(capturedReceipt));
    if (!receiptMatchesRecord(capturedReceipt, record)) {
      fail("EXTERNAL_ACTION_RECEIPT_BINDING_MISMATCH");
    }
    if (record.state === "KNOWN_RESULT") {
      await effectHooks.beforeAcknowledge?.(effectReceipt(record));
      return effectReceipt(record, true);
    }
    if (record.state === "INTENDED") {
      fail("EXTERNAL_ACTION_NOT_DISPATCHED");
    }
    const gate = await validateReconciliationGate({
      runId: record.run_id,
      operation: record.operation_id,
      actionId: record.action_id,
      idempotencyKey: record.idempotency_key,
      recordDigest: digestJson(record),
    });
    if (!exactReadbackGate(gate, record)) {
      fail("RECONCILIATION_GATE_BINDING_MISMATCH");
    }
    const observation = await effectDriver.queryOutcome(
      freezePlan({
        operation_id: record.operation_id,
        action_id: record.action_id,
        idempotency_key: record.idempotency_key,
        provider_receipt_digest: record.provider_receipt_digest,
        authoritative_readback_strategy_ref:
          trustedInventory.operations.find(
            (entry) => entry.operation_id === record.operation_id,
          )?.authoritative_readback.strategy_ref ?? null,
      }),
    );
    if (
      !exactFields(observation, ["outcome", "target_audit_digest"]) ||
      !new Set([
        "APPLIED",
        "NOT_APPLIED",
        "PARTIALLY_APPLIED",
        "INDETERMINATE",
      ]).has(observation.outcome) ||
      !DIGEST.test(observation.target_audit_digest ?? "")
    ) {
      fail("INVALID_AUTHORITATIVE_READBACK");
    }
    record = await externalActionStore.recordOutcome(actionReference(record), {
      expected_version: record.version,
      recorded_at: now(),
      outcome: observation.outcome,
      target_audit_digest: observation.target_audit_digest,
    });
    await effectHooks.afterResultPersisted?.(effectReceipt(record));
    await effectHooks.beforeAcknowledge?.(effectReceipt(record));
    return effectReceipt(record, true);
  }

  async function compensate(receiptValue, input) {
    if (!protocolEnabled) return denyEffect(receiptValue, input);
    const capturedReceipt = snapshotActionInput(
      receiptValue,
      "INVALID_EXTERNAL_ACTION_RECEIPT",
    );
    if (!validEffectReceipt(capturedReceipt)) {
      fail("INVALID_EXTERNAL_ACTION_RECEIPT");
    }
    const original = await externalActionStore.recover(
      actionReference(capturedReceipt),
    );
    if (!receiptMatchesRecord(capturedReceipt, original)) {
      fail("EXTERNAL_ACTION_RECEIPT_BINDING_MISMATCH");
    }
    if (
      original.state !== "KNOWN_RESULT" ||
      !new Set(["APPLIED", "PARTIALLY_APPLIED"]).has(original.outcome)
    ) {
      fail("COMPENSATION_OUTCOME_NOT_ELIGIBLE");
    }

    const authorized = await authorize(input);
    const compensationPlan = buildPlan(
      authorized.captured,
      authorized.decision,
      authorized.gate,
      authorized.backgroundAuthorization,
    );
    requireExternalPlan(compensationPlan, compensationPlan.idempotency_key);
    const originalOperation = trustedInventory.operations.find(
      (entry) => entry.operation_id === original.operation_id,
    );
    if (
      originalOperation === undefined ||
      compensationPlan.operation_id !== original.operation_id ||
      compensationPlan.target_ref !== originalOperation.target_ref ||
      compensationPlan.compensation_strategy_ref !==
        originalOperation.compensation.strategy_ref ||
      compensationPlan.action_id === original.action_id ||
      compensationPlan.idempotency_key === original.idempotency_key
    ) {
      fail("COMPENSATION_OPERATION_BINDING_MISMATCH");
    }
    trustedPlans.add(compensationPlan);
    const parentActionDigest = digestJson(original);
    let record = await externalActionStore.intent({
      run_id: compensationPlan.run_id,
      operation_id: compensationPlan.operation_id,
      action_id: compensationPlan.action_id,
      idempotency_key: compensationPlan.idempotency_key,
      kind: "COMPENSATE",
      parent_action_digest: parentActionDigest,
      queue_item_id: compensationPlan.background_dispatch?.queue_item_id ?? null,
      plan_digest: digestJson(compensationPlan),
      controller_intent_digest: compensationPlan.controller_intent_digest,
      confirmation_digest: compensationPlan.approval_digest,
      authority_digest: compensationPlan.authority_digest,
      policy_digest: compensationPlan.policy_digest,
      run_head_digest: compensationPlan.run_head_digest,
      recorded_at: now(),
    });
    await effectHooks.afterIntentPersisted?.(effectReceipt(record));
    if (record.state !== "INTENDED") return effectReceipt(record);
    const reservation = await externalActionStore.reserveDispatch(
      actionReference(record),
      {
      expected_version: record.version,
      recorded_at: now(),
      },
    );
    record = reservation.record;
    await effectHooks.afterDispatchMarked?.(effectReceipt(record));
    if (!reservation.reserved) return effectReceipt(record);
    await revalidatePlan(compensationPlan, input);
    const pending = effectDriver.compensate(
      freezePlan({
        operation_id: compensationPlan.operation_id,
        target_ref: compensationPlan.target_ref,
        action_id: compensationPlan.action_id,
        idempotency_key: compensationPlan.idempotency_key,
        parent_action_digest: parentActionDigest,
        parent_target_audit_digest: original.target_audit_digest,
        compensation_strategy_ref: compensationPlan.compensation_strategy_ref,
        timeout_ms: compensationPlan.timeout_ms,
        audit_sink_ref: compensationPlan.audit_sink_ref,
      }),
    );
    await effectHooks.afterDispatch?.(effectReceipt(record));
    const response = await pending;
    if (
      !exactFields(response, ["receipt_digest"]) ||
      !DIGEST.test(response.receipt_digest ?? "")
    ) {
      fail("INVALID_PROVIDER_RECEIPT");
    }
    await effectHooks.afterResponse?.(
      freezePlan({ receipt_digest: response.receipt_digest }),
    );
    record = await externalActionStore.recordReceipt(actionReference(record), {
      expected_version: record.version,
      recorded_at: now(),
      receipt_digest: response.receipt_digest,
    });
    return effectReceipt(record);
  }

  return Object.freeze({
    plan,
    executeOnce,
    queryOutcome,
    compensate,
  });
}

export function createWorkflowCapabilityValidator(dependencies = {}) {
  const { inventory, inventoryDigest, policyAuthority } = dependencies;
  const adapter = createActionAdapter(dependencies);
  const trustedInventory = freezePlan(structuredClone(inventory));
  const trustedPolicyAuthority = freezePlan(structuredClone(policyAuthority));

  return async function validateActionCapability(input) {
    if (!exactFields(input, WORKFLOW_CAPABILITY_INPUT_FIELDS)) {
      fail("INVALID_WORKFLOW_CAPABILITY_INPUT");
    }
    const captured = snapshotActionInput(input, "INVALID_WORKFLOW_CAPABILITY_INPUT");
    const { gate, attestation, intentBinding, backgroundDispatchId } = captured;
    if (
      gate === null ||
      typeof gate !== "object" ||
      Array.isArray(gate) ||
      captured.runId !== gate.run_id ||
      captured.operation !== gate.operation ||
      gate.operation_inventory_digest !== inventoryDigest ||
      gate.project_config_digest !== trustedInventory.project_config_digest ||
      gate.policy_digest !== trustedPolicyAuthority.policy_digest ||
      gate.intent_path !== intentBinding?.intent_path ||
      gate.intent_digest !== intentBinding?.intent_digest
    ) {
      fail("WORKFLOW_GATE_BINDING_MISMATCH");
    }
    if (
      !exactFields(intentBinding, ["intent_path", "intent_digest"]) ||
      !DIGEST.test(intentBinding.intent_digest) ||
      !(
        intentBinding.intent_path === null ||
        typeof intentBinding.intent_path === "string"
      )
    ) {
      fail("WORKFLOW_INTENT_BINDING_INVALID");
    }
    const operation = trustedInventory.operations?.find(
      (entry) => entry?.operation_id === captured.operation,
    );
    if (operation === undefined) fail("OPERATION_NOT_IN_INVENTORY");
    if (operation.write_class !== captured.writeClass) fail("WRITE_CLASS_MISMATCH");

    const request = {
      operation_id: captured.operation,
      run_id: captured.runId,
      run_head_digest: gate.run_head_digest,
      authority_digest: gate.authority_digest,
      verifier_digest: gate.verifier_digest,
      project_config_digest: gate.project_config_digest,
      operation_inventory_digest: gate.operation_inventory_digest,
      policy_digest: gate.policy_digest,
      approval_digest: gate.confirmation_digest,
      write_class: captured.writeClass,
      risk_profile: gate.confirmed_risk_profile,
      autonomy_profile: gate.confirmed_autonomy_profile,
      required_gates: [...gate.confirmed_required_gates],
      requested_credential_scopes: structuredClone(operation.credential_scopes),
      requested_egress_ids: [...operation.egress_ids],
      requested_isolation: operation.required_isolation,
    };
    const plan = await adapter.plan({
      request,
      attestation,
      background_dispatch_id: backgroundDispatchId,
    });
    return Object.freeze({
      allowed: plan.authorized === true,
      run_id: plan.run_id,
      operation: plan.operation_id,
      confirmation_digest: plan.approval_digest,
      authority_digest: plan.authority_digest,
      verifier_digest: plan.verifier_digest,
      project_config_digest: plan.project_config_digest,
      policy_digest: plan.policy_digest,
      run_head_digest: plan.run_head_digest,
      operation_inventory_digest: plan.inventory_digest,
      host_capability_digest: plan.host_capability_digest,
      confirmed_risk_profile: plan.confirmed_risk_profile,
      confirmed_autonomy_profile: plan.confirmed_autonomy_profile,
      confirmed_required_gates: [...plan.confirmed_required_gates],
      intent_path: intentBinding.intent_path,
      intent_digest: intentBinding.intent_digest,
      background_dispatch: plan.background_dispatch ?? null,
    });
  };
}

export async function createCanonicalWorkflowCapabilityValidator(
  root,
  dependencies = {},
) {
  if (typeof dependencies.now !== "function") {
    throw new TypeError("TRUSTED_CLOCK_REQUIRED");
  }
  const loaded = await loadCanonicalOperationInventory(root, {
    expectedProjectConfigDigest: dependencies.expectedProjectConfigDigest,
    now: dependencies.now(),
  });
  return createWorkflowCapabilityValidator({
    inventory: loaded.inventory,
    inventoryDigest: loaded.inventory_digest,
    policyAuthority: dependencies.policyAuthority,
    now: dependencies.now,
    verifyHostAttestation: dependencies.verifyHostAttestation,
    validateControllerGate: dependencies.validateControllerGate,
    validateBackgroundDispatch: dependencies.validateBackgroundDispatch,
  });
}
