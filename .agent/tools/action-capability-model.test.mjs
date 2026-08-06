import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSchemaDefinition, validateValue } from "./schema-validator.mjs";
import {
  evaluateActionCapability,
  SUPPORTED_HOST_CAPABILITIES,
} from "./action-capability-model.mjs";

const SCHEMA_DIR = new URL("../context/schemas/", import.meta.url);
const DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const THIRD_DIGEST = `sha256:${"c".repeat(64)}`;
const NOW = "2026-07-21T22:30:00.000Z";
const EXPIRES = "2026-07-21T23:30:00.000Z";

const requiredCapabilities = [
  "DURABLE_LOCAL_STATE",
  "HARD_WRITE_INTERCEPTION",
  "DURABLE_INTENT",
  "IDEMPOTENCY",
  "AUTHORITATIVE_READBACK",
  "COMPENSATION",
  "PROCESS_ISOLATION",
  "NETWORK_EGRESS_ENFORCEMENT",
  "CREDENTIAL_SCOPE_ENFORCEMENT",
  "PERMISSION_BYPASS_PREVENTION",
  "DURABLE_AUDIT",
];

function operation() {
  return {
    operation_id: "fake.issue.update",
    target_ref: "target.fake.issue",
    write_class: "external_write",
    credential_scopes: {
      read: ["issue:read"],
      write: ["issue:write"],
    },
    egress_ids: ["egress.fake-provider"],
    idempotency: { required: true, key_scope: "RUN_OPERATION" },
    authoritative_readback: {
      required: true,
      strategy_ref: "strategy.fake.issue.readback",
    },
    compensation: {
      required: true,
      strategy_ref: "strategy.fake.issue.restore",
    },
    timeout_ms: 30_000,
    expires_at: EXPIRES,
    audit_sink_ref: "audit.local.loop-runtime",
    owner_ref: "owner.project",
    risk: "HIGH",
    human_gate: "REQUIRED",
    required_capabilities: requiredCapabilities,
    required_isolation: "CREDENTIAL",
  };
}

function inventory() {
  return {
    schema: "operation_inventory_v2",
    contract_version: "2.0.0",
    inventory_id: "inventory.local.reference",
    project_config_digest: DIGEST,
    issued_at: NOW,
    expires_at: EXPIRES,
    operations: [operation()],
  };
}

function attestation() {
  return {
    schema: "host_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "attestation.local.test",
    host_ref: "host.local.test",
    run_id: "LER2-GOAL-011-01",
    run_head_digest: DIGEST,
    authority_digest: OTHER_DIGEST,
    verifier_digest: THIRD_DIGEST,
    project_config_digest: DIGEST,
    operation_inventory_digest: OTHER_DIGEST,
    policy_digest: THIRD_DIGEST,
    approval_digest: DIGEST,
    capabilities: [...SUPPORTED_HOST_CAPABILITIES],
    credential_scopes: {
      read: ["issue:read"],
      write: ["issue:write"],
    },
    egress_ids: ["egress.fake-provider"],
    isolation: "HARDENED",
    issued_at: NOW,
    expires_at: EXPIRES,
    evidence_digest: OTHER_DIGEST,
  };
}

function request() {
  return {
    operation_id: "fake.issue.update",
    run_id: "LER2-GOAL-011-01",
    run_head_digest: DIGEST,
    authority_digest: OTHER_DIGEST,
    verifier_digest: THIRD_DIGEST,
    project_config_digest: DIGEST,
    operation_inventory_digest: OTHER_DIGEST,
    policy_digest: THIRD_DIGEST,
    approval_digest: DIGEST,
    write_class: "external_write",
    risk_profile: "HIGH",
    autonomy_profile: "INTERACTIVE",
    required_gates: ["fresh-verifier", "human-approval"],
    requested_credential_scopes: {
      read: ["issue:read"],
      write: ["issue:write"],
    },
    requested_egress_ids: ["egress.fake-provider"],
    requested_isolation: "CREDENTIAL",
  };
}

function context(overrides = {}) {
  return {
    inventory: inventory(),
    attestation: attestation(),
    request: request(),
    host_verification: { verified: true, evidence_digest: OTHER_DIGEST },
    effective_policy: {
      allowlisted_operations: ["fake.issue.update"],
      credential_scopes: ["issue:read", "issue:write"],
      required_gates: ["fresh-verifier", "human-approval"],
      isolation: "CREDENTIAL",
      risk: "HIGH",
      expires_at: EXPIRES,
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [],
      external_write: [
        "DURABLE_INTENT",
        "IDEMPOTENCY",
        "AUTHORITATIVE_READBACK",
        "COMPENSATION",
      ],
    },
    execution_mode: "ENFORCE",
    autonomy_profile: "INTERACTIVE",
    external_write_policy: "ALLOWLIST_ONLY",
    project_egress_ids: ["egress.fake-provider"],
    now: NOW,
    ...overrides,
  };
}

test("GOAL-011 schemas are strict v2 contracts with every operation declaration", async () => {
  const inventorySchema = JSON.parse(
    await readFile(new URL("operation-inventory-v2.schema.json", SCHEMA_DIR), "utf8"),
  );
  const capabilitySchema = JSON.parse(
    await readFile(new URL("host-capability-v2.schema.json", SCHEMA_DIR), "utf8"),
  );

  for (const [label, schema, fixture] of [
    ["inventory", inventorySchema, inventory()],
    ["capability", capabilitySchema, attestation()],
  ]) {
    assert.deepEqual(validateSchemaDefinition(schema), { valid: true, errors: [] }, label);
    assert.deepEqual(validateValue(fixture, schema), { valid: true, errors: [] }, label);
    assert.equal(validateValue({ ...fixture, unknown: true }, schema).valid, false, label);
    assert.equal(
      validateValue({ ...fixture, schema: fixture.schema.replace("_v2", "_v1") }, schema).valid,
      false,
      label,
    );
  }

  for (const forbidden of ["command", "shell", "url", "endpoint", "credential", "payload"]) {
    const invalid = inventory();
    invalid.operations[0][forbidden] = forbidden === "url" ? "https://example.invalid" : "raw";
    assert.equal(validateValue(invalid, inventorySchema).valid, false, forbidden);
  }
  for (const mandatory of [
    "target_ref",
    "credential_scopes",
    "egress_ids",
    "idempotency",
    "authoritative_readback",
    "compensation",
    "timeout_ms",
    "expires_at",
    "audit_sink_ref",
    "owner_ref",
    "risk",
    "human_gate",
  ]) {
    const invalid = inventory();
    delete invalid.operations[0][mandatory];
    assert.equal(validateValue(invalid, inventorySchema).valid, false, mandatory);
  }
});

test("TEST-014 background capability baseline cannot be weakened by project config", () => {
  const background = context({
    autonomy_profile: "BACKGROUND",
    request: { ...request(), autonomy_profile: "BACKGROUND" },
    capability_requirements: {
      enforce: [],
      background: [],
      external_write: [],
    },
  });
  background.attestation.capabilities = background.attestation.capabilities.filter(
    (entry) => entry !== "LEASE_RECOVERY",
  );
  const result = evaluateActionCapability(background);
  assert.equal(result.allowed, false);
  assert.equal(result.code, "CAPABILITY_REQUIRED");
  assert.ok(result.detail.includes("LEASE_RECOVERY"));
  assert.ok(result.detail.includes("PROCESS_ISOLATION"));
  assert.ok(result.detail.includes("NETWORK_EGRESS_ENFORCEMENT"));
  assert.ok(result.detail.includes("CREDENTIAL_SCOPE_ENFORCEMENT"));
  assert.ok(result.detail.includes("PERMISSION_BYPASS_PREVENTION"));
  assert.ok(result.detail.includes("DURABLE_AUDIT"));
});

test("exact operation, scope, egress, isolation, and capability intersections authorize a plan", () => {
  const decision = evaluateActionCapability(context());
  assert.equal(decision.allowed, true);
  assert.equal(decision.code, "ACTION_CAPABILITY_VERIFIED");
  assert.equal(decision.operation.operation_id, "fake.issue.update");
  assert.deepEqual(decision.effective_credential_scopes, {
    read: ["issue:read"],
    write: ["issue:write"],
  });
  assert.deepEqual(decision.effective_egress_ids, ["egress.fake-provider"]);
  assert.equal(decision.effective_isolation, "CREDENTIAL");
});

test("untrusted fields and every authority expansion fail closed", () => {
  const cases = [
    ["unknown operation", { request: { ...request(), operation_id: "fake.issue.delete" } }, "OPERATION_NOT_IN_INVENTORY"],
    ["arbitrary command", { request: { ...request(), command: "git push" } }, "INVALID_ACTION_REQUEST"],
    ["arbitrary URL", { request: { ...request(), url: "https://example.invalid" } }, "INVALID_ACTION_REQUEST"],
    ["inventory command field", { inventory: { ...inventory(), operations: [{ ...operation(), command: "git push" }] } }, "INVALID_OPERATION_INVENTORY"],
    ["inventory undefined identifier", { inventory: { ...inventory(), operations: [{ ...operation(), target_ref: undefined }] } }, "INVALID_OPERATION_INVENTORY"],
    ["attestation unknown field", { attestation: { ...attestation(), trusted: true } }, "HOST_ATTESTATION_INVALID"],
    ["attestation unknown capability", { attestation: { ...attestation(), capabilities: [...attestation().capabilities, "MAGIC_OVERRIDE"] } }, "HOST_ATTESTATION_INVALID"],
    ["attestation not yet valid", { attestation: { ...attestation(), issued_at: "2026-07-21T23:00:00.000Z" } }, "HOST_ATTESTATION_INVALID"],
    ["scope expansion", { request: { ...request(), requested_credential_scopes: { read: ["issue:read"], write: ["admin:write"] } } }, "CREDENTIAL_SCOPE_DENIED"],
    ["egress expansion", { request: { ...request(), requested_egress_ids: ["egress.attacker"] } }, "EGRESS_DENIED"],
    ["isolation downgrade", { attestation: { ...attestation(), isolation: "PROCESS" } }, "ISOLATION_INSUFFICIENT"],
    ["unverified host", { host_verification: { verified: false, evidence_digest: OTHER_DIGEST } }, "HOST_ATTESTATION_UNVERIFIED"],
    ["expired host", { now: "2026-07-22T00:00:00.000Z" }, "AUTHORITY_EXPIRED"],
    ["wrong run head", { attestation: { ...attestation(), run_head_digest: THIRD_DIGEST } }, "ATTESTATION_BINDING_MISMATCH"],
    ["external policy denied", { external_write_policy: "DENY" }, "EXTERNAL_WRITE_DENIED"],
    ["policy risk downgrade", { effective_policy: { ...context().effective_policy, risk: "CRITICAL" } }, "RISK_DOWNGRADE_DENIED"],
    ["confirmed risk downgrade", { request: { ...request(), risk_profile: "MEDIUM" } }, "RISK_DOWNGRADE_DENIED"],
    ["autonomy mismatch", { request: { ...request(), autonomy_profile: "BACKGROUND" } }, "AUTONOMY_PROFILE_MISMATCH"],
    ["missing required gate", { request: { ...request(), required_gates: ["human-approval"] } }, "REQUIRED_GATE_MISMATCH"],
    ["extra required gate", { request: { ...request(), required_gates: ["fresh-verifier", "human-approval", "self-approved"] } }, "REQUIRED_GATE_MISMATCH"],
  ];
  for (const [label, overrides, code] of cases) {
    const decision = evaluateActionCapability(context(overrides));
    assert.equal(decision.allowed, false, label);
    assert.equal(decision.code, code, label);
  }
});

test("missing declared capability and unsafe external operation declarations are denied", () => {
  const missing = attestation();
  missing.capabilities = missing.capabilities.filter((entry) => entry !== "HARD_WRITE_INTERCEPTION");
  assert.equal(
    evaluateActionCapability(context({ attestation: missing })).code,
    "CAPABILITY_REQUIRED",
  );

  for (const field of ["idempotency", "authoritative_readback", "compensation"]) {
    const unsafe = inventory();
    unsafe.operations[0][field].required = false;
    assert.equal(
      evaluateActionCapability(context({ inventory: unsafe })).code,
      "UNSAFE_EXTERNAL_OPERATION",
      field,
    );
  }
});

test("external writes require intrinsic safety capabilities and project egress authority", () => {
  const missingIntrinsic = attestation();
  missingIntrinsic.capabilities = missingIntrinsic.capabilities.filter(
    (entry) => entry !== "DURABLE_AUDIT",
  );
  const weakenedDeclarations = context({
    attestation: missingIntrinsic,
    capability_requirements: { enforce: [], background: [], external_write: [] },
    inventory: {
      ...inventory(),
      operations: [{ ...operation(), required_capabilities: [] }],
    },
  });
  assert.equal(evaluateActionCapability(weakenedDeclarations).code, "CAPABILITY_REQUIRED");

  assert.equal(
    evaluateActionCapability(context({ project_egress_ids: [] })).code,
    "EGRESS_DENIED",
  );
  assert.equal(
    evaluateActionCapability(
      context({ project_egress_ids: ["egress.different-provider"] }),
    ).code,
    "EGRESS_DENIED",
  );
});

test("ENFORCE intrinsically requires durable state and hard write interception", () => {
  for (const missing of ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"]) {
    const weakenedHost = attestation();
    weakenedHost.capabilities = weakenedHost.capabilities.filter(
      (entry) => entry !== missing,
    );
    const decision = evaluateActionCapability(
      context({
        attestation: weakenedHost,
        capability_requirements: {
          enforce: [],
          background: [],
          external_write: [],
        },
        inventory: {
          ...inventory(),
          operations: [{ ...operation(), required_capabilities: [] }],
        },
      }),
    );
    assert.equal(decision.code, "CAPABILITY_REQUIRED", missing);
  }
});

test("capability time authority uses the same strict UTC grammar as its schemas", () => {
  const locale = "July 21, 2026 23:30:00 GMT";
  const timezoneLess = "2026-07-21T23:30:00";
  const invalidCalendar = "2026-02-30T23:30:00.000Z";
  const cases = [
    [
      "inventory issued",
      { inventory: { ...inventory(), issued_at: locale } },
      "INVALID_OPERATION_INVENTORY",
    ],
    [
      "inventory expiry",
      { inventory: { ...inventory(), expires_at: timezoneLess } },
      "INVALID_OPERATION_INVENTORY",
    ],
    [
      "operation expiry",
      {
        inventory: {
          ...inventory(),
          operations: [{ ...operation(), expires_at: invalidCalendar }],
        },
      },
      "INVALID_OPERATION_INVENTORY",
    ],
    [
      "attestation issued",
      { attestation: { ...attestation(), issued_at: locale } },
      "HOST_ATTESTATION_INVALID",
    ],
    [
      "attestation expiry",
      { attestation: { ...attestation(), expires_at: timezoneLess } },
      "HOST_ATTESTATION_INVALID",
    ],
    [
      "policy expiry",
      {
        effective_policy: { ...context().effective_policy, expires_at: locale },
      },
      "AUTHORITY_EXPIRED",
    ],
    ["host clock", { now: locale }, "INVALID_OPERATION_INVENTORY"],
  ];
  for (const [label, overrides, code] of cases) {
    const decision = evaluateActionCapability(context(overrides));
    assert.equal(decision.allowed, false, label);
    assert.equal(decision.code, code, label);
  }

  assert.equal(
    evaluateActionCapability(
      context({ now: "2026-07-21T22:30:00.123456789Z" }),
    ).allowed,
    true,
    "one-to-nine fractional UTC digits remain valid",
  );

  const nanosecondExpiry = "2026-07-21T22:30:00.123456789Z";
  const preciseInventory = inventory();
  preciseInventory.expires_at = nanosecondExpiry;
  preciseInventory.operations[0].expires_at = nanosecondExpiry;
  const preciseAttestation = attestation();
  preciseAttestation.expires_at = nanosecondExpiry;
  assert.equal(
    evaluateActionCapability(
      context({
        inventory: preciseInventory,
        attestation: preciseAttestation,
        effective_policy: {
          ...context().effective_policy,
          expires_at: nanosecondExpiry,
        },
        now: "2026-07-21T22:30:00.123456788Z",
      }),
    ).allowed,
    true,
    "nanosecond ordering must not collapse to Date milliseconds",
  );
});
