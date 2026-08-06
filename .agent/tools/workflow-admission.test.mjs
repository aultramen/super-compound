import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCanonicalProjectConfig } from "./project-config.mjs";
import {
  buildHardWriteInterceptedCommand,
  validateWorkflowAdmission,
  writeInterceptedSourceFile,
} from "./workflow-admission.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEST_DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;

function sourceCapabilityProjectConfig({
  configVersion = 1,
  modeVersion = 0,
} = {}) {
  return {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: configVersion,
    mode_version: modeVersion,
    mode: "OBSERVE",
    policy: {
      max_iterations: 100,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 5,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 60,
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [],
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
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
      runtime_audit_prefixes: [
        ".scratch/loop-runs/",
        ".scratch/loop-queue/",
        ".scratch/loop-runtime/",
        ".scratch/work-packages/",
      ],
      authority_prefixes: [
        ".agent/evals/",
        "docs/brd/",
        "docs/fsd/",
        "docs/prd/",
      ],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [
        "CREDENTIAL_SCOPE_ENFORCEMENT",
        "DURABLE_AUDIT",
        "DURABLE_LOCAL_STATE",
        "FINITE_NO_PROGRESS_CAP",
        "FINITE_RUNTIME_CAP",
        "HARD_WRITE_INTERCEPTION",
        "ISOLATED_WORKTREE",
        "LEASE_RECOVERY",
        "NETWORK_EGRESS_ENFORCEMENT",
        "PERMISSION_BYPASS_PREVENTION",
        "PROCESS_ISOLATION",
      ],
      external_write: [
        "AUTHORITATIVE_READBACK",
        "COMPENSATION",
        "DURABLE_INTENT",
        "IDEMPOTENCY",
      ],
    },
    artifact_authority: {
      required_contract_version: "2.0.0",
      execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
      legacy_action: "REPLAN_REQUIRED",
    },
  };
}

async function writeProjectConfigFixture(root, versions = {}) {
  const context = path.join(root, ".agent", "context");
  const schemas = path.join(context, "schemas");
  await mkdir(schemas, { recursive: true });
  await mkdir(path.join(root, "docs", "fsd"), { recursive: true });
  const config = sourceCapabilityProjectConfig(versions);
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  await Promise.all([
    writeFile(path.join(context, "project-config.json"), configText),
    writeFile(
      path.join(schemas, "project-config-v2.schema.json"),
      await readFile(
        path.join(
          ROOT,
          ".agent",
          "context",
          "schemas",
          "project-config-v2.schema.json",
        ),
      ),
    ),
  ]);
  const loadedConfig = await loadCanonicalProjectConfig(root);
  assert.equal(loadedConfig.valid, true);
  assert.equal(loadedConfig.config.config_version, config.config_version);
  assert.equal(loadedConfig.config.mode_version, config.mode_version);
  assert.equal(loadedConfig.config.mode, "OBSERVE");
  assert.equal(loadedConfig.config.risk.external_write_policy, "DENY");
  return { config, configText, context, loadedConfig, root };
}

async function sourceCapabilityFixture(t, versions = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "workflow-source-capability-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  return writeProjectConfigFixture(root, versions);
}

async function isolatedLoadedProjectConfig() {
  const root = await mkdtemp(path.join(tmpdir(), "workflow-loaded-config-"));
  try {
    return (await writeProjectConfigFixture(root)).loadedConfig;
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function allowedGateResult(input, overrides = {}) {
  return {
    allowed: true,
    would_allow: true,
    mutation_authorized: true,
    simulation_only: false,
    confirmation_digest: TEST_DIGEST,
    authority_digest: TEST_DIGEST,
    policy_digest: TEST_DIGEST,
    run_head_digest: TEST_DIGEST,
    verifier_digest: TEST_DIGEST,
    project_config_digest: input.projectConfigDigest ?? TEST_DIGEST,
    operation_inventory_digest: OTHER_DIGEST,
    confirmed_risk_profile: "HIGH",
    confirmed_autonomy_profile: "INTERACTIVE",
    confirmed_required_gates: ["human-approval"],
    run_id: input.runId,
    run_version: 7,
    operation: input.operation,
    ...overrides,
  };
}

function allowedCapabilityResult(input, overrides = {}) {
  return {
    allowed: true,
    run_id: input.runId,
    operation: input.operation,
    confirmation_digest: input.gate.confirmation_digest,
    authority_digest: input.gate.authority_digest,
    policy_digest: input.gate.policy_digest,
    run_head_digest: TEST_DIGEST,
    verifier_digest: input.gate.verifier_digest,
    project_config_digest: input.gate.project_config_digest,
    operation_inventory_digest: OTHER_DIGEST,
    host_capability_digest: TEST_DIGEST,
    confirmed_risk_profile: input.gate.confirmed_risk_profile,
    confirmed_autonomy_profile: input.gate.confirmed_autonomy_profile,
    confirmed_required_gates: [...input.gate.confirmed_required_gates],
    intent_path: input.intentBinding.intent_path,
    intent_digest: input.intentBinding.intent_digest,
    background_dispatch: null,
    ...overrides,
  };
}

function backgroundAuthorization(input, overrides = {}) {
  return {
    schema: "background_action_authorization_v2",
    contract_version: "2.0.0",
    dispatch_id: input.backgroundDispatchId,
    operation: input.operation,
    run_id: input.runId,
    queue_item_id: "queue.goal014.item001",
    lease_id: "lease.goal014.001",
    worker_ref: "worker.goal014.001",
    worktree_ref: "worktree.goal014.001",
    action_id: "action.goal014.source001",
    idempotency_key: "run.goal014.source001",
    controller_intent_digest: OTHER_DIGEST,
    action_run_head_digest: input.gate.run_head_digest,
    policy_digest: input.gate.policy_digest,
    confirmation_digest: input.gate.confirmation_digest,
    expires_at: "2026-07-22T06:00:00.000Z",
    ...overrides,
  };
}

async function fixture(validateGate = async () => {
  throw new Error("unexpected gate call");
}) {
  const loadedConfig = await isolatedLoadedProjectConfig();
  return {
    dependencies: {
      loadedConfig,
      validateGate: async (input) => {
        const result = await validateGate(input);
        return result?.project_config_digest === TEST_DIGEST
          ? {
              ...result,
              project_config_digest: loadedConfig.config_digest,
            }
          : result;
      },
      validateActionCapability: async (input) => allowedCapabilityResult(input),
    },
  };
}

test("runtime-audit and owning authority writes do not consume human approval", async () => {
  const { dependencies } = await fixture();

  const audit = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-review",
      intent: { path: ".scratch/loop-runtime/GOAL-008/observation.json" },
    },
    dependencies,
  );
  assert.deepEqual(
    {
      allowed: audit.allowed,
      mutation_authorized: audit.mutation_authorized,
      approval_required: audit.approval_required,
      write_class: audit.write_class,
    },
    {
      allowed: true,
      mutation_authorized: true,
      approval_required: false,
      write_class: "runtime_audit_write",
    },
  );

  for (const [route, path] of [
    ["sc-plan", "docs/fsd/fsd-example.md"],
    ["sc-eval", ".agent/evals/example.md"],
    ["sc-explore", "docs/brd/brd-example.md"],
    ["sc-work", ".scratch/example/issues/01-example.md"],
  ]) {
    const result = await validateWorkflowAdmission(
      ROOT,
      { route, intent: { path } },
      dependencies,
    );
    assert.equal(result.allowed, true, route);
    assert.equal(result.approval_required, false, route);
    assert.equal(result.write_class, "authority_write", route);
  }

  const denied = await validateWorkflowAdmission(
    ROOT,
    { route: "sc-plan", intent: { path: ".agent/tools/example.mjs" } },
    dependencies,
  );
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "WRITE_CLASS_NOT_ALLOWED");
});

test("source writes require one opaque root/config/version/path-bound admission for explicit OBSERVE 1/0", async (t) => {
  const { config, configText, context, root } = await sourceCapabilityFixture(t);

  const admission = await validateWorkflowAdmission(root, {
    route: "sc-plan",
    intent: { path: "docs/fsd/opaque.md" },
  });
  assert.equal(admission.allowed, true);
  const command = buildHardWriteInterceptedCommand(admission, {
    command: "/usr/bin/printf",
    args: ["safe"],
  });
  assert.equal(command.executable, "/usr/bin/bwrap");
  assert.equal(command.args.includes("--clearenv"), true);
  assert.throws(
    () =>
      buildHardWriteInterceptedCommand(
        {
          ...admission,
          gate_evidence: { ...admission.gate_evidence },
        },
        { command: "/usr/bin/true" },
      ),
    /HARD_WRITE_INTERCEPTION_ADMISSION_UNTRUSTED/u,
  );
  await assert.rejects(
    writeInterceptedSourceFile(
      admission,
      "docs/fsd/wrong.md",
      "wrong\n",
      { expectedDigest: "MISSING" },
    ),
    /HARD_WRITE_INTERCEPTION_PATH_BINDING_MISMATCH/u,
  );
  const written = await writeInterceptedSourceFile(
    admission,
    "docs/fsd/opaque.md",
    "bound\n",
    { expectedDigest: "MISSING" },
  );
  assert.equal(
    await readFile(path.join(root, "docs", "fsd", "opaque.md"), "utf8"),
    "bound\n",
  );
  assert.equal(written.source_write_capability_consumed, true);
  assert.equal(written.config_version, config.config_version);
  assert.equal(written.mode_version, config.mode_version);
  assert.equal(config.risk.external_write_policy, "DENY");
  await assert.rejects(
    writeInterceptedSourceFile(
      admission,
      "docs/fsd/opaque.md",
      "replayed\n",
      { expectedDigest: written.readback_digest },
    ),
    /HARD_WRITE_INTERCEPTION_ADMISSION_CONSUMED/u,
  );

  const concurrentAdmissions = await Promise.all(
    [1, 2].map(() =>
      validateWorkflowAdmission(root, {
        route: "sc-plan",
        intent: { path: "docs/fsd/concurrent.md" },
      }),
    ),
  );
  const concurrentResults = await Promise.allSettled(
    concurrentAdmissions.map((entry, index) =>
      writeInterceptedSourceFile(
        entry,
        "docs/fsd/concurrent.md",
        `writer-${index}\n`,
        { expectedDigest: "MISSING" },
      ),
    ),
  );
  assert.equal(
    concurrentResults.filter((entry) => entry.status === "fulfilled").length,
    1,
  );
  assert.equal(
    concurrentResults.filter(
      (entry) =>
        entry.status === "rejected" &&
        /CAS conflict/u.test(entry.reason?.message ?? ""),
    ).length,
    1,
  );

  await writeFile(path.join(root, "docs", "fsd", "existing.md"), "existing\n");
  const stalePreimageAdmission = await validateWorkflowAdmission(root, {
    route: "sc-plan",
    intent: { path: "docs/fsd/existing.md" },
  });
  await assert.rejects(
    writeInterceptedSourceFile(
      stalePreimageAdmission,
      "docs/fsd/existing.md",
      "changed\n",
      { expectedDigest: TEST_DIGEST },
    ),
    /CAS conflict for intercepted source write/u,
  );

  for (const [field, target] of [
    ["config_version", "docs/fsd/stale-config-version.md"],
    ["mode_version", "docs/fsd/stale-mode-version.md"],
  ]) {
    await writeFile(path.join(context, "project-config.json"), configText);
    const staleAdmission = await validateWorkflowAdmission(root, {
      route: "sc-plan",
      intent: { path: target },
    });
    const changedConfig = structuredClone(config);
    changedConfig[field] += 1;
    await writeFile(
      path.join(context, "project-config.json"),
      `${JSON.stringify(changedConfig, null, 2)}\n`,
    );
    await assert.rejects(
      writeInterceptedSourceFile(staleAdmission, target, "stale\n", {
        expectedDigest: "MISSING",
      }),
      /HARD_WRITE_INTERCEPTION_CONFIG_BINDING_STALE/u,
      field,
    );
  }
});

test("source write admission derives advanced OBSERVE 2/1 fixture versions", async (t) => {
  const { config, root } = await sourceCapabilityFixture(t, {
    configVersion: 2,
    modeVersion: 1,
  });
  const target = "docs/fsd/advanced-observe.md";
  const admission = await validateWorkflowAdmission(root, {
    route: "sc-plan",
    intent: { path: target },
  });

  assert.equal(admission.allowed, true);
  assert.equal(admission.gate_evidence.config_version, config.config_version);
  assert.equal(admission.gate_evidence.mode_version, config.mode_version);
  assert.equal(config.risk.external_write_policy, "DENY");

  const written = await writeInterceptedSourceFile(
    admission,
    target,
    "advanced\n",
    { expectedDigest: "MISSING" },
  );
  assert.equal(written.config_version, config.config_version);
  assert.equal(written.mode_version, config.mode_version);
  assert.equal(await readFile(path.join(root, target), "utf8"), "advanced\n");
});

test("admission snapshots and cryptographically binds intent before asynchronous validation", async () => {
  let releaseGate;
  let gateEntered;
  const entered = new Promise((resolve) => {
    gateEntered = resolve;
  });
  const blocked = new Promise((resolve) => {
    releaseGate = resolve;
  });
  const { dependencies } = await fixture(async (input) => {
    gateEntered();
    await blocked;
    return allowedGateResult(input);
  });
  const request = {
    route: "sc-explore",
    intent: { path: ".scratch/prototypes/demo/app.mjs" },
    runId: "RUN-011",
    operation: "source-write",
  };

  const pending = validateWorkflowAdmission(ROOT, request, dependencies);
  await entered;
  request.intent.path = ".agent/tools/production.mjs";
  releaseGate();
  const result = await pending;
  const expectedDigest = `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        external: false,
        operation: null,
        path: ".scratch/prototypes/demo/app.mjs",
        write_class: "implementation_write",
      }),
      "utf8",
    )
    .digest("hex")}`;

  assert.equal(result.allowed, true);
  assert.equal(result.gate_evidence.intent_path, ".scratch/prototypes/demo/app.mjs");
  assert.equal(result.gate_evidence.intent_digest, expectedDigest);
  assert.equal(result.gate_evidence.intent_path.includes("production"), false);
});

test("authority writes stay inside the owning workflow boundary", async () => {
  const { dependencies } = await fixture();
  for (const [route, path] of [
    ["sc-plan", "docs/brd/foreign.md"],
    ["sc-eval", "docs/fsd/foreign.md"],
    ["sc-explore", ".agent/evals/foreign.md"],
    ["sc-work", "docs/prd/foreign.md"],
  ]) {
    const result = await validateWorkflowAdmission(
      ROOT,
      { route, intent: { path } },
      dependencies,
    );
    assert.equal(result.allowed, false, route);
    assert.equal(result.reason, "WRITE_PATH_NOT_ALLOWED", route);
  }
});

test("implementation mutation requires a run-bound controller gate", async () => {
  const calls = [];
  const { dependencies } = await fixture(async (input) => {
    calls.push(input);
    return allowedGateResult(input);
  });

  const missing = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-work",
      intent: { path: ".agent/tools/example.mjs" },
      operation: "source-write",
    },
    dependencies,
  );
  assert.equal(missing.allowed, false);
  assert.equal(missing.reason, "OPEN-LOOP-AUTHORITY");
  assert.equal(calls.length, 0);

  const admitted = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-work",
      intent: { path: ".agent/tools/example.mjs" },
      runId: "RUN-008",
      operation: "source-write",
    },
    dependencies,
  );
  assert.equal(admitted.allowed, true);
  assert.equal(admitted.mutation_authorized, true);
  assert.equal(admitted.write_class, "implementation_write");
  assert.deepEqual(calls, [
    { runId: "RUN-008", operation: "source-write", queueItemId: undefined },
  ]);
});

test("TEST-014 background source write requires a live dispatch ticket", async () => {
  const backgroundGate = (input) =>
    allowedGateResult(input, {
      confirmed_autonomy_profile: "BACKGROUND",
      action_id: "action.goal014.source001",
      idempotency_key: "run.goal014.source001",
      controller_intent_digest: OTHER_DIGEST,
    });
  const { dependencies } = await fixture(async (input) => backgroundGate(input));
  const request = {
    route: "sc-work",
    intent: { path: ".agent/tools/example.mjs" },
    runId: "RUN-014",
    operation: "source-write",
  };
  const missing = await validateWorkflowAdmission(ROOT, request, dependencies);
  assert.equal(missing.allowed, false);
  assert.equal(missing.reason, "BACKGROUND_DISPATCH_REQUIRED");

  const dispatchRequest = {
    ...request,
    backgroundDispatchId: "dispatch.goal014.source001",
  };
  const admitted = await validateWorkflowAdmission(ROOT, dispatchRequest, {
    ...dependencies,
    now: () => "2026-07-22T05:10:00.000Z",
    validateActionCapability: async (input) =>
      allowedCapabilityResult(input, {
        background_dispatch: backgroundAuthorization(input),
      }),
  });
  assert.equal(admitted.allowed, true);
  assert.equal(
    admitted.gate_evidence.background_dispatch.dispatch_id,
    "dispatch.goal014.source001",
  );
  assert.equal(
    admitted.gate_evidence.background_dispatch.queue_item_id,
    "queue.goal014.item001",
  );

  const expired = await validateWorkflowAdmission(ROOT, dispatchRequest, {
    ...dependencies,
    now: () => "2026-07-22T06:00:00.000Z",
    validateActionCapability: async (input) =>
      allowedCapabilityResult(input, {
        background_dispatch: backgroundAuthorization(input),
      }),
  });
  assert.equal(expired.allowed, false);
  assert.equal(expired.reason, "BACKGROUND_DISPATCH_INVALID");
});

test("implementation mutation also requires exact fresh capability evidence", async () => {
  const { dependencies } = await fixture(async (input) => allowedGateResult(input));
  const request = {
    route: "sc-work",
    intent: { path: ".agent/tools/example.mjs" },
    runId: "RUN-008",
    operation: "source-write",
  };

  const missing = { ...dependencies };
  delete missing.validateActionCapability;
  const noHostProof = await validateWorkflowAdmission(ROOT, request, missing);
  assert.equal(noHostProof.allowed, false);
  assert.equal(noHostProof.reason, "CAPABILITY_ATTESTATION_REQUIRED");

  const stale = await validateWorkflowAdmission(ROOT, request, {
    ...dependencies,
    validateActionCapability: async (input) =>
      allowedCapabilityResult(input, { authority_digest: OTHER_DIGEST }),
  });
  assert.equal(stale.allowed, false);
  assert.equal(stale.reason, "CAPABILITY_ATTESTATION_INVALID");

  const staleVerifier = await validateWorkflowAdmission(ROOT, request, {
    ...dependencies,
    validateActionCapability: async (input) =>
      allowedCapabilityResult(input, { verifier_digest: OTHER_DIGEST }),
  });
  assert.equal(staleVerifier.allowed, false);
  assert.equal(staleVerifier.reason, "CAPABILITY_ATTESTATION_INVALID");

  const admitted = await validateWorkflowAdmission(ROOT, request, dependencies);
  assert.equal(admitted.allowed, true);
  assert.equal(admitted.gate_evidence.operation_inventory_digest, OTHER_DIGEST);
  assert.equal(admitted.gate_evidence.host_capability_digest, TEST_DIGEST);
});

test("sc-explore gates only isolated throwaway prototype paths", async () => {
  const calls = [];
  const { dependencies } = await fixture(async (input) => {
    calls.push(input);
    return allowedGateResult(input);
  });

  const prototype = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-explore",
      intent: { path: ".scratch/prototypes/example/app.mjs" },
      runId: "RUN-EXPLORE",
      operation: "source-write",
    },
    dependencies,
  );
  assert.equal(prototype.allowed, true);
  assert.equal(prototype.mutation_authorized, true);

  const production = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-explore",
      intent: { path: ".agent/tools/production.mjs" },
      runId: "RUN-EXPLORE",
      operation: "source-write",
    },
    dependencies,
  );
  assert.equal(production.allowed, false);
  assert.equal(production.mutation_authorized, false);
  assert.equal(production.reason, "WRITE_PATH_NOT_ALLOWED");
  assert.deepEqual(calls, [
    {
      runId: "RUN-EXPLORE",
      operation: "source-write",
      queueItemId: undefined,
    },
  ]);
});

test("worker-dispatch operation cannot authorize a project-source write", async () => {
  const { dependencies } = await fixture();
  const result = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-work",
      intent: { path: ".agent/tools/example.mjs" },
      runId: "RUN-008",
      operation: "work",
    },
    dependencies,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "OPERATION_NOT_ALLOWED");
});

test("gate response must bind the exact run operation mode and mandatory evidence", async () => {
  const { dependencies } = await fixture();
  const cases = [
    ["wrong run", { run_id: "RUN-OTHER" }],
    ["wrong operation", { operation: "work" }],
    ["missing mode", { simulation_only: undefined }],
    ["missing confirmation", { confirmation_digest: null }],
    ["invalid authority", { authority_digest: "sha256:short" }],
    ["missing policy", { policy_digest: undefined }],
    ["invalid version", { run_version: -1 }],
  ];
  for (const [label, override] of cases) {
    const result = await validateWorkflowAdmission(
      ROOT,
      {
        route: "sc-work",
        intent: { path: ".agent/tools/example.mjs" },
        runId: "RUN-008",
        operation: "source-write",
      },
      {
        ...dependencies,
        validateGate: async (input) => allowedGateResult(input, override),
      },
    );
    assert.equal(result.allowed, false, label);
    assert.equal(result.reason, "MUTATION_NOT_AUTHORIZED", label);
  }
});

test("OBSERVE or failed controller gates never authorize mutation", async () => {
  const { dependencies } = await fixture(async () => ({
    allowed: false,
    would_allow: true,
    simulation_only: true,
    mutation_authorized: false,
  }));
  const result = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-debug",
      intent: { path: "docs/debug/2026-07-21-example.md" },
      runId: "RUN-DEBUG",
      operation: "source-write",
    },
    dependencies,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.mutation_authorized, false);
  assert.equal(result.reason, "MUTATION_NOT_AUTHORIZED");
});

test("conditional routes fail closed when their FSD-authorized run is absent", async () => {
  const { dependencies } = await fixture();
  for (const [route, path] of [
    ["sc-debug", "docs/debug/2026-07-21-example.md"],
    ["sc-explore", ".scratch/prototypes/example/app.mjs"],
    ["sc-review", "docs/reviews/2026-07-21-example.md"],
    ["sc-launch", "docs/STATE.md"],
    ["sc-pause", "docs/STATE.md"],
  ]) {
    const result = await validateWorkflowAdmission(
      ROOT,
      { route, intent: { path }, operation: "source-write" },
      dependencies,
    );
    assert.equal(result.allowed, false, route);
    assert.equal(result.reason, "OPEN-LOOP-AUTHORITY", route);
  }

  for (const [route, path] of [
    ["sc-review", "src/fix.mjs"],
    ["sc-launch", "src/feature.mjs"],
    ["sc-pause", "src/feature.mjs"],
  ]) {
    const result = await validateWorkflowAdmission(
      ROOT,
      {
        route,
        intent: { path },
        runId: "RUN-FORGED-SCOPE",
        operation: "source-write",
      },
      dependencies,
    );
    assert.equal(result.allowed, false, route);
    assert.equal(result.reason, "WRITE_PATH_NOT_ALLOWED", route);
  }
});

test("delivery mutations consume the controller gate and unsupported operations fail closed", async () => {
  const calls = [];
  const { dependencies } = await fixture(async (input) => {
    calls.push(input);
    throw new Error("Operation is not allowlisted by the effective run policy.");
  });
  const blocked = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-go",
      intent: { external: true, operation: "push" },
      runId: "RUN-DELIVERY",
      operation: "push",
    },
    dependencies,
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "POLICY_STOP");
  assert.deepEqual(calls, [
    { runId: "RUN-DELIVERY", operation: "push", queueItemId: undefined },
  ]);

  const unsupported = await validateWorkflowAdmission(
    ROOT,
    {
      route: "sc-go",
      intent: { external: true, operation: "deploy" },
      runId: "RUN-DELIVERY",
      operation: "deploy",
    },
    dependencies,
  );
  assert.equal(unsupported.allowed, false);
  assert.equal(unsupported.reason, "OPERATION_NOT_ALLOWED");
});

test("unknown routes and malformed requests fail closed before classification", async () => {
  const { dependencies } = await fixture();
  await assert.rejects(
    validateWorkflowAdmission(
      ROOT,
      { route: "loop", intent: { path: "src/example.mjs" } },
      dependencies,
    ),
    /unsupported workflow route/i,
  );
  await assert.rejects(
    validateWorkflowAdmission(ROOT, { route: "sc-work" }, dependencies),
    /write intent/i,
  );
});
