import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { release, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateValue } from "./schema-validator.mjs";
import { computeProjectModeCapabilityRootDigest } from "./project-config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectConfigModuleUrl = new URL("./project-config.mjs", import.meta.url);
const loopRunModuleUrl = new URL("./loop-run.mjs", import.meta.url);

function sha256(text) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

// Canonical fresh-installation baseline; mirrors defaultConfigCandidate() in
// migrate-loop-v2.mjs so these tests stay deterministic regardless of the
// owner-governed mode of the live .agent/context/project-config.json.
function canonicalDisabledBaselineConfig() {
  return {
    schema: "project_config_v2",
    contract_version: "2.0.0",
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
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
      authority_prefixes: [".agent/evals/", "docs/brd/", "docs/fsd/", "docs/prd/"],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [
        "FINITE_NO_PROGRESS_CAP",
        "FINITE_RUNTIME_CAP",
        "ISOLATED_WORKTREE",
        "LEASE_RECOVERY",
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

async function createModeCapabilityFixture(
  t,
  {
    capabilities = ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
    expiresAt = "2026-07-23T00:00:00.000Z",
    mutateAttestation = () => {},
    mutateConfig = () => {},
  } = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), "project-mode-capability-v2-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const context = path.join(root, ".agent", "context");
  const schemas = path.join(context, "schemas");
  await mkdir(schemas, { recursive: true });

  const config = JSON.parse(
    await readFile(path.join(ROOT, ".agent/context/project-config.json"), "utf8"),
  );
  config.mode = "ENFORCE";
  mutateConfig(config);
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  const configDigest = sha256(configText);
  const [projectSchemaText, capabilitySchemaText, artifactSchemaText] =
    await Promise.all([
      readFile(
        path.join(ROOT, ".agent/context/schemas/project-config-v2.schema.json"),
        "utf8",
      ),
      readFile(
        path.join(
          ROOT,
          ".agent/context/schemas/project-mode-capability-v2.schema.json",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          ROOT,
          ".agent/context/schemas/authority-artifact-v2.schema.json",
        ),
        "utf8",
      ),
    ]);
  await Promise.all([
    writeFile(path.join(context, "project-config.json"), configText, "utf8"),
    writeFile(
      path.join(schemas, "project-config-v2.schema.json"),
      projectSchemaText,
      "utf8",
    ),
    writeFile(
      path.join(schemas, "project-mode-capability-v2.schema.json"),
      capabilitySchemaText,
      "utf8",
    ),
    writeFile(
      path.join(schemas, "authority-artifact-v2.schema.json"),
      artifactSchemaText,
      "utf8",
    ),
  ]);

  const attestation = {
    schema: "project_mode_capability_v2",
    contract_version: "2.0.0",
    attestation_id: "project-mode-goal-014",
    purpose: "PROJECT_MODE_ENFORCE",
    project_root_digest: computeProjectModeCapabilityRootDigest(root),
    workspace_root_digest: sha256(`workspace:${root}`),
    project_config_digest: configDigest,
    config_version: config.config_version,
    mode_version: config.mode_version,
    host_ref: "codex-local-reference-host",
    host_identity_digest: sha256("project-mode-host-identity"),
    host_verifier_digest: sha256("project-mode-host-verifier"),
    write_interceptor_digest: sha256("project-mode-write-interceptor"),
    filesystem_type: "ext4",
    external_write_policy: "DENY",
    capabilities,
    issued_at: "2026-07-22T00:00:00.000Z",
    expires_at: expiresAt,
    evidence_digest: sha256("project-mode-capability-evidence"),
  };
  mutateAttestation(attestation);
  const attestationPath = path.join(context, "project-mode-capability.json");
  await writeFile(
    attestationPath,
    `${JSON.stringify(attestation, null, 2)}\n`,
    "utf8",
  );
  return {
    root,
    config,
    configText,
    configDigest,
    configPath: path.join(context, "project-config.json"),
    attestation,
    attestationPath,
  };
}

async function loadConfigVariant(t, loadCanonicalProjectConfig, base, mutate) {
  const scratchRoot = path.join(ROOT, ".scratch", "test-fixtures");
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(
    path.join(scratchRoot, "project-config-variant-"),
  );
  t.after(() => rm(directory, { force: true, recursive: true }));
  const candidate = structuredClone(base);
  mutate(candidate);
  const configPath = path.join(directory, "project-config.json");
  await writeFile(configPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  return loadCanonicalProjectConfig(ROOT, {
    configFile: path.relative(ROOT, configPath).replaceAll("\\", "/"),
  });
}

test("fresh installation exposes one strict canonical DISABLED project config", async (t) => {
  const { loadCanonicalProjectConfig } = await import(projectConfigModuleUrl);
  const result = await loadConfigVariant(
    t,
    loadCanonicalProjectConfig,
    canonicalDisabledBaselineConfig(),
    () => {},
  );

  assert.equal(result.valid, true);
  assert.equal(result.effective_mode, "DISABLED");
  assert.match(result.config_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(result.errors, []);
  assert.equal(result.config.schema, "project_config_v2");
  assert.equal(result.config.contract_version, "2.0.0");
  assert.equal(result.config.mode, "DISABLED");
  assert.equal(result.config.policy.max_iterations > 0, true);
  assert.equal(result.config.policy.max_runtime_minutes > 0, true);
  assert.equal(result.config.policy.max_no_progress_iterations > 0, true);
  assert.equal(result.config.policy.max_tokens, null);
  assert.equal(result.config.policy.max_cost_micro, null);
  assert.equal(result.config.telemetry.enabled, false);
  assert.equal(result.config.retention.run_metadata_days > 0, true);
  assert.equal(result.config.risk.external_write_policy, "DENY");
  assert.equal(result.config.write_classification.unknown_path_class, "implementation_write");
  assert.deepEqual(result.config.artifact_authority, {
    required_contract_version: "2.0.0",
    execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
    legacy_action: "REPLAN_REQUIRED",
  });
  assert.equal(result.config.capability_requirements.enforce.length > 0, true);

  // The live config's mode is owner-governed and may legitimately change;
  // assert only mode-independent invariants against it.
  const live = await loadCanonicalProjectConfig(ROOT);
  assert.equal(live.valid, true);
  assert.deepEqual(live.errors, []);
  assert.equal(live.config.risk.external_write_policy, "DENY");
  assert.equal(
    live.config.write_classification.unknown_path_class,
    "implementation_write",
  );
});

test("default WSL verifier binds host, workspace, config versions, and interceptor", async (t) => {
  if (!/microsoft-standard-WSL2/iu.test(release())) {
    t.skip("WSL2 integration verifier");
    return;
  }
  const {
    createWslProjectModeCapabilityAttestation,
    loadCanonicalProjectConfig,
  } = await import(projectConfigModuleUrl);
  const root = await mkdtemp(path.join(tmpdir(), "wsl-host-verifier-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const context = path.join(root, ".agent", "context");
  const schemas = path.join(context, "schemas");
  await mkdir(schemas, { recursive: true });
  const config = JSON.parse(
    await readFile(path.join(ROOT, ".agent/context/project-config.json"), "utf8"),
  );
  config.mode = "ENFORCE";
  config.config_version += 1;
  config.mode_version += 1;
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  assert.throws(
    () =>
      createWslProjectModeCapabilityAttestation(root, configText, {
        attestationId: "wsl-host-verifier-overlong",
        issuedAt: "2026-07-29T00:00:00.000Z",
        expiresAt: "2026-07-29T02:00:00.000Z",
      }),
    /WSL_HOST_ATTESTATION_TIME_WINDOW_INVALID/u,
  );
  const attestation = createWslProjectModeCapabilityAttestation(
    root,
    configText,
    {
      attestationId: "wsl-host-verifier-test",
      issuedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 50 * 60_000).toISOString(),
    },
  );
  await Promise.all([
    writeFile(path.join(context, "project-config.json"), configText),
    writeFile(
      path.join(context, "project-mode-capability.json"),
      `${JSON.stringify(attestation, null, 2)}\n`,
    ),
    writeFile(
      path.join(schemas, "project-config-v2.schema.json"),
      await readFile(
        path.join(ROOT, ".agent/context/schemas/project-config-v2.schema.json"),
      ),
    ),
    writeFile(
      path.join(schemas, "project-mode-capability-v2.schema.json"),
      await readFile(
        path.join(
          ROOT,
          ".agent/context/schemas/project-mode-capability-v2.schema.json",
        ),
      ),
    ),
  ]);

  const loaded = await loadCanonicalProjectConfig(root);
  assert.equal(loaded.valid, true, loaded.errors.join("\n"));
  assert.equal(loaded.effective_mode, "ENFORCE");
  assert.equal(attestation.config_version, config.config_version);
  assert.equal(attestation.mode_version, config.mode_version);
  assert.equal(attestation.filesystem_type, "ext4");
  assert.equal(attestation.external_write_policy, "DENY");
  for (const field of [
    "host_identity_digest",
    "host_verifier_digest",
    "workspace_root_digest",
    "write_interceptor_digest",
  ]) {
    assert.match(attestation[field], /^sha256:[a-f0-9]{64}$/u, field);
  }

  config.config_version += 1;
  await writeFile(
    path.join(context, "project-config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  const stale = await loadCanonicalProjectConfig(root);
  assert.equal(stale.valid, false);
  assert.equal(stale.effective_mode, "HALTED");
  assert.match(stale.errors.join("\n"), /CONFIG_DIGEST_MISMATCH/u);
});

test("TEST-010 telemetry remains off unless every privacy, ACL, rotation, and pricing gate is configured", async (t) => {
  const { loadCanonicalProjectConfig } = await import(projectConfigModuleUrl);
  const base = JSON.parse(
    await readFile(path.join(ROOT, ".agent", "context", "project-config.json"), "utf8"),
  );
  const completeTelemetry = {
    enabled: true,
    persistence_required: true,
    redaction_revision: "redaction-2026-07",
    retention_days: 30,
    max_file_bytes: 65536,
    purpose: "LOOP_RUNTIME_OPERATIONAL_ASSURANCE",
    classification: "INTERNAL_OPERATIONAL_NO_RAW_CONTENT",
    acl: {
      read_roles: ["runtime-auditor"],
      write_roles: ["loop-controller"],
      export_roles: ["runtime-auditor"],
    },
    rotation: {
      strategy: "PER_RUN_SEGMENTED_JSONL",
      max_segments: 16,
    },
    disposition: "DELETE_DERIVED_TELEMETRY",
    pricing_revision: "pricing-2026-07-01",
    pricing_digest: `sha256:${"d".repeat(64)}`,
  };

  const complete = await loadConfigVariant(
    t,
    loadCanonicalProjectConfig,
    base,
    (candidate) => {
      candidate.mode = "OBSERVE";
      candidate.telemetry = structuredClone(completeTelemetry);
    },
  );
  assert.equal(complete.valid, true);
  assert.equal(complete.effective_mode, "OBSERVE");

  for (const field of [
    "purpose",
    "classification",
    "acl",
    "retention_days",
    "max_file_bytes",
    "rotation",
    "redaction_revision",
    "disposition",
    "pricing_revision",
    "pricing_digest",
  ]) {
    const missing = await loadConfigVariant(
      t,
      loadCanonicalProjectConfig,
      base,
      (candidate) => {
        candidate.mode = "OBSERVE";
        candidate.telemetry = structuredClone(completeTelemetry);
        delete candidate.telemetry[field];
      },
    );
    assert.equal(missing.valid, false, `${field} must be required when enabled`);
    assert.equal(missing.effective_mode, "HALTED");
    assert.match(missing.errors.join("\n"), /telemetry/i);
  }
});

test("canonical config adapters reject mutation and foreign loader handles", async () => {
  const {
    classifyWriteIntent,
    loadCanonicalProjectConfig,
    resolveProjectExecutionPolicy,
  } = await import(projectConfigModuleUrl);
  const loaded = await loadCanonicalProjectConfig(ROOT);

  assert.throws(() => {
    loaded.config.risk.external_write_policy = "ALLOWLIST_ONLY";
  }, /read only|cannot assign/i);

  const forged = structuredClone(loaded);
  forged.effective_mode = "ENFORCE";
  forged.config.mode = "ENFORCE";
  forged.config.risk.maximum_autonomy = "BACKGROUND";
  forged.config.risk.external_write_policy = "ALLOWLIST_ONLY";
  assert.throws(
    () =>
      resolveProjectExecutionPolicy(forged, {
        fsd: {
          max_iterations: 10,
          max_runtime_minutes: 60,
          max_no_progress_iterations: 3,
          max_tokens: null,
          max_cost_micro: null,
        },
        operation: {
          max_iterations: 10,
          max_runtime_minutes: 60,
          max_no_progress_iterations: 3,
          max_tokens: null,
          max_cost_micro: null,
        },
        human: {
          max_iterations: 10,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost_micro: null,
        },
        executionMode: "ENFORCE",
        autonomyProfile: "BACKGROUND",
        writeClass: "implementation_write",
      }),
    /POLICY_STOP.*loader provenance/i,
  );

  forged.config.write_classification.authority_exact_paths.push(
    ".agent/tools/project-config.mjs",
  );
  assert.throws(
    () =>
      classifyWriteIntent(forged, {
        path: ".agent/tools/project-config.mjs",
      }),
    /POLICY_STOP.*loader provenance/i,
  );
});

test("project mode transitions fail closed and require owner-governed HALTED recovery", async () => {
  const { evaluateProjectModeTransition } = await import(projectConfigModuleUrl);

  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "DISABLED",
      targetMode: "OBSERVE",
      ownerAction: true,
      configurationValid: true,
    }),
    { allowed: true, effective_mode: "OBSERVE", reason: null },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "DISABLED",
      targetMode: "ENFORCE",
      ownerAction: true,
      configurationValid: true,
      capabilityAttestationVerified: true,
    }),
    {
      allowed: false,
      effective_mode: "DISABLED",
      reason: "OBSERVE_PROMOTION_REQUIRED",
    },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "ENFORCE",
      targetMode: "ENFORCE",
      ownerAction: true,
      configurationValid: true,
      capabilityAttestationVerified: true,
    }),
    { allowed: true, effective_mode: "ENFORCE", reason: null },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "OBSERVE",
      targetMode: "HALTED",
      ownerAction: false,
      configurationValid: true,
    }),
    { allowed: true, effective_mode: "HALTED", reason: "SAFETY_HALT" },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "HALTED",
      targetMode: "OBSERVE",
      ownerAction: false,
      configurationValid: true,
    }),
    { allowed: false, effective_mode: "HALTED", reason: "OWNER_ACTION_REQUIRED" },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "HALTED",
      targetMode: "DISABLED",
      ownerAction: true,
      configurationValid: false,
    }),
    { allowed: false, effective_mode: "HALTED", reason: "CONFIG_VALIDATION_REQUIRED" },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "HALTED",
      targetMode: "OBSERVE",
      ownerAction: true,
      configurationValid: true,
    }),
    { allowed: true, effective_mode: "OBSERVE", reason: null },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "HALTED",
      targetMode: "ENFORCE",
      ownerAction: true,
      configurationValid: true,
    }),
    {
      allowed: false,
      effective_mode: "HALTED",
      reason: "HALTED_RECOVERY_TARGET_REQUIRED",
    },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "OBSERVE",
      targetMode: "ENFORCE",
      ownerAction: true,
      configurationValid: true,
    }),
    {
      allowed: false,
      effective_mode: "OBSERVE",
      reason: "CAPABILITY_ATTESTATION_REQUIRED",
    },
  );
  assert.deepEqual(
    evaluateProjectModeTransition({
      currentMode: "OBSERVE",
      targetMode: "ENFORCE",
      ownerAction: true,
      configurationValid: true,
      capabilityAttestationVerified: true,
    }),
    {
      allowed: true,
      effective_mode: "ENFORCE",
      reason: null,
    },
  );
  assert.throws(
    () =>
      evaluateProjectModeTransition({
        currentMode: "UNKNOWN",
        targetMode: "DISABLED",
        ownerAction: true,
        configurationValid: true,
      }),
    /current mode.*supported/i,
  );
});

test("opaque project-mode capability authority admits exact fresh ENFORCE config only", async (t) => {
  const {
    assertProjectModeCapabilityAuthority,
    createProjectModeCapabilityAuthority,
    loadCanonicalProjectConfig,
    verifyProjectModeCapabilityAuthority,
  } = await import(projectConfigModuleUrl);
  const fixture = await createModeCapabilityFixture(t);
  let verificationContext = null;
  const authority = createProjectModeCapabilityAuthority(fixture.root, {
    now: () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation: async (context) => {
      verificationContext = context;
      return true;
    },
  });

  assert.equal(Object.isFrozen(authority), true);
  assert.equal(assertProjectModeCapabilityAuthority(authority, fixture.root), true);
  assert.equal(
    await verifyProjectModeCapabilityAuthority(authority, fixture.root, {
      config: fixture.config,
      config_digest: fixture.configDigest,
    }),
    true,
  );
  assert.equal(Object.isFrozen(verificationContext), true);
  assert.equal(Object.isFrozen(verificationContext.attestation), true);
  assert.equal(
    verificationContext.project_root_digest,
    computeProjectModeCapabilityRootDigest(fixture.root),
  );
  assert.equal(verificationContext.project_config_digest, fixture.configDigest);
  assert.deepEqual(verificationContext.required_capabilities, [
    "DURABLE_LOCAL_STATE",
    "HARD_WRITE_INTERCEPTION",
  ]);

  const loaded = await loadCanonicalProjectConfig(fixture.root, {
    modeCapabilityAuthority: authority,
  });
  assert.equal(loaded.valid, true);
  assert.equal(loaded.effective_mode, "ENFORCE");
  assert.equal(Object.isFrozen(loaded), true);

  const bypass = await loadCanonicalProjectConfig(fixture.root, {
    capabilityAttestationVerified: true,
    verifyHostAttestation: async () => true,
  });
  assert.equal(bypass.valid, false);
  assert.equal(bypass.effective_mode, "HALTED");

  assert.throws(
    () => assertProjectModeCapabilityAuthority(structuredClone(authority), fixture.root),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_UNTRUSTED/,
  );
  assert.throws(
    () => assertProjectModeCapabilityAuthority({}, fixture.root),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_UNTRUSTED/,
  );
  assert.throws(
    () => assertProjectModeCapabilityAuthority(authority, `${fixture.root}-other`),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_ROOT_MISMATCH/,
  );
});

test("a supplied mode capability authority is provenance-checked outside ENFORCE", async (t) => {
  const {
    createProjectModeCapabilityAuthority,
    loadCanonicalProjectConfig,
  } = await import(projectConfigModuleUrl);
  const fixture = await createModeCapabilityFixture(t, {
    mutateConfig: (config) => {
      config.mode = "DISABLED";
    },
  });
  let hostChecks = 0;
  const authority = createProjectModeCapabilityAuthority(fixture.root, {
    now: () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation: async () => {
      hostChecks += 1;
      return true;
    },
  });

  const valid = await loadCanonicalProjectConfig(fixture.root, {
    modeCapabilityAuthority: authority,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.effective_mode, "DISABLED");
  assert.equal(hostChecks, 0);

  for (const [name, candidate] of [
    ["plain", {}],
    ["clone", structuredClone(authority)],
  ]) {
    const rejected = await loadCanonicalProjectConfig(fixture.root, {
      modeCapabilityAuthority: candidate,
    });
    assert.equal(rejected.valid, false, name);
    assert.equal(rejected.effective_mode, "HALTED", name);
    assert.match(
      rejected.errors.join("\n"),
      /PROJECT_MODE_CAPABILITY_AUTHORITY_UNTRUSTED/,
      name,
    );
  }

  const otherFixture = await createModeCapabilityFixture(t, {
    mutateConfig: (config) => {
      config.mode = "DISABLED";
    },
  });
  const wrongRoot = await loadCanonicalProjectConfig(otherFixture.root, {
    modeCapabilityAuthority: authority,
  });
  assert.equal(wrongRoot.valid, false);
  assert.equal(wrongRoot.effective_mode, "HALTED");
  assert.match(
    wrongRoot.errors.join("\n"),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_ROOT_MISMATCH/,
  );
});

test("project-mode capability verification fails closed on host rejection, expiry, and capability drift", async (t) => {
  const {
    createProjectModeCapabilityAuthority,
    loadCanonicalProjectConfig,
    verifyProjectModeCapabilityAuthority,
  } = await import(projectConfigModuleUrl);

  for (const [name, verifyHostAttestation] of [
    ["false", async () => false],
    ["throw", async () => { throw new Error("untrusted host detail"); }],
  ]) {
    const fixture = await createModeCapabilityFixture(t);
    const authority = createProjectModeCapabilityAuthority(fixture.root, {
      now: () => "2026-07-22T12:00:00.000Z",
      verifyHostAttestation,
    });
    await assert.rejects(
      verifyProjectModeCapabilityAuthority(authority, fixture.root, {
        config: fixture.config,
        config_digest: fixture.configDigest,
      }),
      /PROJECT_MODE_CAPABILITY_HOST_ATTESTATION_REJECTED/,
      name,
    );
    const loaded = await loadCanonicalProjectConfig(fixture.root, {
      modeCapabilityAuthority: authority,
    });
    assert.equal(loaded.valid, false, name);
    assert.equal(loaded.effective_mode, "HALTED", name);
  }

  const expired = await createModeCapabilityFixture(t, {
    expiresAt: "2026-07-22T11:59:59.999Z",
  });
  const expiredAuthority = createProjectModeCapabilityAuthority(expired.root, {
    now: () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation: async () => true,
  });
  await assert.rejects(
    verifyProjectModeCapabilityAuthority(expiredAuthority, expired.root, {
      config: expired.config,
      config_digest: expired.configDigest,
    }),
    /PROJECT_MODE_CAPABILITY_EXPIRED/,
  );

  const capabilityDrift = await createModeCapabilityFixture(t, {
    capabilities: ["DURABLE_LOCAL_STATE", "FINITE_RUNTIME_CAP"],
  });
  const driftAuthority = createProjectModeCapabilityAuthority(capabilityDrift.root, {
    now: () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation: async () => true,
  });
  await assert.rejects(
    verifyProjectModeCapabilityAuthority(driftAuthority, capabilityDrift.root, {
      config: capabilityDrift.config,
      config_digest: capabilityDrift.configDigest,
    }),
    /PROJECT_MODE_CAPABILITY_REQUIRED_CAPABILITY_MISSING/,
  );

  const projectRequired = await createModeCapabilityFixture(t, {
    mutateConfig: (config) => {
      config.capability_requirements.enforce.push("FINITE_RUNTIME_CAP");
    },
  });
  const projectRequiredAuthority = createProjectModeCapabilityAuthority(
    projectRequired.root,
    {
      now: () => "2026-07-22T12:00:00.000Z",
      verifyHostAttestation: async () => true,
    },
  );
  await assert.rejects(
    verifyProjectModeCapabilityAuthority(
      projectRequiredAuthority,
      projectRequired.root,
      {
        config: projectRequired.config,
        config_digest: projectRequired.configDigest,
      },
    ),
    /PROJECT_MODE_CAPABILITY_REQUIRED_CAPABILITY_MISSING/,
  );
});

test("canonical ENFORCE load detects project config drift during host verification", async (t) => {
  const {
    createProjectModeCapabilityAuthority,
    loadCanonicalProjectConfig,
  } = await import(projectConfigModuleUrl);
  const fixture = await createModeCapabilityFixture(t);
  const authority = createProjectModeCapabilityAuthority(fixture.root, {
    now: () => "2026-07-22T12:00:00.000Z",
    verifyHostAttestation: async () => {
      await writeFile(fixture.configPath, `${fixture.configText}\n`, "utf8");
      return true;
    },
  });

  const loaded = await loadCanonicalProjectConfig(fixture.root, {
    modeCapabilityAuthority: authority,
  });
  assert.equal(loaded.valid, false);
  assert.equal(loaded.effective_mode, "HALTED");
  assert.match(loaded.errors.join("\n"), /PROJECT_MODE_CONFIG_CHANGED_DURING_VERIFICATION/);
});

test("cached ENFORCE handles are non-authorizing after capability revocation or expiry", async (t) => {
  const {
    assessArtifactExecutionAuthority,
    assessFreshArtifactExecutionAuthority,
    classifyWriteIntent,
    createProjectModeCapabilityAuthority,
    loadCanonicalProjectConfig,
    resolveFreshProjectExecutionPolicy,
    resolveProjectExecutionPolicy,
  } = await import(projectConfigModuleUrl);
  let observedAt = "2026-07-22T12:00:00.000Z";
  let hostCapabilityValid = true;
  const fixture = await createModeCapabilityFixture(t);
  const authority = createProjectModeCapabilityAuthority(fixture.root, {
    now: () => observedAt,
    verifyHostAttestation: async () => hostCapabilityValid,
  });
  const loaded = await loadCanonicalProjectConfig(fixture.root, {
    modeCapabilityAuthority: authority,
  });
  assert.equal(loaded.valid, true);
  assert.equal(loaded.effective_mode, "ENFORCE");

  const nullableBudget = {
    max_iterations: null,
    max_runtime_minutes: null,
    max_no_progress_iterations: null,
    max_tokens: null,
    max_cost_micro: null,
  };
  const mutationRequest = {
    fsd: { ...nullableBudget, max_iterations: 20 },
    operation: { ...nullableBudget, max_iterations: 20 },
    human: { ...nullableBudget, max_iterations: 10 },
    executionMode: "ENFORCE",
    autonomyProfile: "INTERACTIVE",
    writeClass: "implementation_write",
  };
  assert.throws(
    () => resolveProjectExecutionPolicy(loaded, mutationRequest),
    /POLICY_STOP.*fresh.*capability.*required/i,
  );
  for (const [autonomyProfile, writeClass] of [
    ["INTERACTIVE", "authority_write"],
    ["BACKGROUND", "runtime_audit_write"],
  ]) {
    assert.throws(
      () =>
        resolveProjectExecutionPolicy(loaded, {
          ...mutationRequest,
          autonomyProfile,
          writeClass,
        }),
      /POLICY_STOP.*fresh.*capability.*required/i,
    );
  }
  const cachedAuditPolicy = resolveProjectExecutionPolicy(loaded, {
    ...mutationRequest,
    autonomyProfile: "READ_ONLY",
    writeClass: "runtime_audit_write",
  });
  assert.equal(cachedAuditPolicy.max_iterations, 10);
  const effective = await resolveFreshProjectExecutionPolicy(fixture.root, {
    modeCapabilityAuthority: authority,
    ...mutationRequest,
  });
  assert.equal(effective.max_iterations, 10);

  const artifact = {
    schema: "authority_artifact_v2",
    contract_version: "2.0.0",
    artifact_contract_version: "2.0.0",
    artifact_type: "FSD",
    artifact_id: "FSD-LER2",
    artifact_version: "1.0.0",
    status: "APPROVED",
    source_path: "docs/fsd/fsd-loop-runtime-v2.md",
    content_digest: sha256("fresh-artifact-content"),
    authority_digest: sha256("fresh-artifact-authority"),
    requires_fresh_verification: false,
    recorded_at: "2026-07-22T12:00:00.000Z",
  };
  assert.deepEqual(await assessArtifactExecutionAuthority(loaded, artifact), {
    accepted: false,
    reason: "FRESH_PROJECT_CAPABILITY_REQUIRED",
  });
  assert.deepEqual(
    await assessFreshArtifactExecutionAuthority(fixture.root, {
      modeCapabilityAuthority: authority,
      artifact,
    }),
    { accepted: true, reason: null },
  );

  hostCapabilityValid = false;
  await assert.rejects(
    resolveFreshProjectExecutionPolicy(fixture.root, {
      modeCapabilityAuthority: authority,
      ...mutationRequest,
    }),
    /PROJECT_MODE_CAPABILITY_HOST_ATTESTATION_REJECTED/,
  );
  hostCapabilityValid = true;

  await rm(fixture.attestationPath, { force: true });
  await assert.rejects(
    resolveFreshProjectExecutionPolicy(fixture.root, {
      modeCapabilityAuthority: authority,
      ...mutationRequest,
    }),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_UNAVAILABLE/,
  );
  await assert.rejects(
    assessFreshArtifactExecutionAuthority(fixture.root, {
      modeCapabilityAuthority: authority,
      artifact,
    }),
    /PROJECT_MODE_CAPABILITY_AUTHORITY_UNAVAILABLE/,
  );
  assert.throws(
    () => resolveProjectExecutionPolicy(loaded, mutationRequest),
    /POLICY_STOP.*fresh.*capability.*required/i,
  );
  assert.equal(
    classifyWriteIntent(loaded, { path: ".agent/tools/project-config.mjs" }),
    "implementation_write",
    "classification remains pure and does not grant mutation authority",
  );

  const expiringFixture = await createModeCapabilityFixture(t, {
    expiresAt: "2026-07-22T13:00:00.000Z",
  });
  const expiringAuthority = createProjectModeCapabilityAuthority(
    expiringFixture.root,
    {
      now: () => observedAt,
      verifyHostAttestation: async () => true,
    },
  );
  const expiringLoaded = await loadCanonicalProjectConfig(expiringFixture.root, {
    modeCapabilityAuthority: expiringAuthority,
  });
  assert.equal(expiringLoaded.valid, true);
  observedAt = "2026-07-22T13:00:00.000Z";
  await assert.rejects(
    resolveFreshProjectExecutionPolicy(expiringFixture.root, {
      modeCapabilityAuthority: expiringAuthority,
      ...mutationRequest,
    }),
    /PROJECT_MODE_CAPABILITY_EXPIRED/,
  );
  await assert.rejects(
    assessFreshArtifactExecutionAuthority(expiringFixture.root, {
      modeCapabilityAuthority: expiringAuthority,
      artifact,
    }),
    /PROJECT_MODE_CAPABILITY_EXPIRED/,
  );
  assert.throws(
    () => resolveProjectExecutionPolicy(expiringLoaded, mutationRequest),
    /POLICY_STOP.*fresh.*capability.*required/i,
  );
});

test("canonical policy resolution is mode-bound, ordered, and fail closed", async (t) => {
  const {
    loadCanonicalProjectConfig,
    resolveProjectExecutionPolicy,
  } = await import(projectConfigModuleUrl);
  const loaded = await loadConfigVariant(
    t,
    loadCanonicalProjectConfig,
    canonicalDisabledBaselineConfig(),
    () => {},
  );
  const nullableBudget = {
    max_iterations: null,
    max_runtime_minutes: null,
    max_no_progress_iterations: null,
    max_tokens: null,
    max_cost_micro: null,
  };

  const effective = resolveProjectExecutionPolicy(loaded, {
    fsd: { ...nullableBudget, max_iterations: 40, max_runtime_minutes: 120 },
    operation: {
      ...nullableBudget,
      max_iterations: 20,
      max_runtime_minutes: 60,
      max_no_progress_iterations: 3,
    },
    human: { ...nullableBudget, max_iterations: 10 },
    executionMode: "DISABLED",
    autonomyProfile: "READ_ONLY",
    writeClass: "runtime_audit_write",
  });

  assert.equal(effective.max_iterations, 10);
  assert.equal(effective.max_runtime_minutes, 60);
  assert.equal(effective.max_no_progress_iterations, 3);
  assert.equal(effective.max_tokens, null);
  assert.equal(effective.max_cost_micro, null);

  const input = {
    fsd: nullableBudget,
    operation: nullableBudget,
    human: { ...nullableBudget, max_iterations: 10 },
  };
  for (const executionMode of ["DISABLED", "OBSERVE", "HALTED"]) {
    const modeConfig =
      executionMode === "DISABLED"
        ? loaded
        : await loadConfigVariant(
            t,
            loadCanonicalProjectConfig,
            loaded.config,
            (candidate) => {
              candidate.mode = executionMode;
            },
          );
    assert.throws(
      () =>
        resolveProjectExecutionPolicy(modeConfig, {
          ...input,
          executionMode,
          autonomyProfile: "INTERACTIVE",
          writeClass: "implementation_write",
        }),
      /POLICY_STOP.*mode.*mutation/i,
    );
    assert.throws(
      () =>
        resolveProjectExecutionPolicy(modeConfig, {
          ...input,
          executionMode,
          autonomyProfile: "BACKGROUND",
          writeClass: "runtime_audit_write",
        }),
      /POLICY_STOP.*mode.*background/i,
    );
  }

  assert.throws(
    () =>
      resolveProjectExecutionPolicy(loaded, {
        ...input,
        executionMode: "OBSERVE",
        autonomyProfile: "READ_ONLY",
        writeClass: "runtime_audit_write",
      }),
    /POLICY_STOP.*mode.*mismatch/i,
  );

  const readOnlyMaximum = await loadConfigVariant(
    t,
    loadCanonicalProjectConfig,
    loaded.config,
    (candidate) => {
      candidate.risk.maximum_autonomy = "READ_ONLY";
    },
  );
  assert.throws(
    () =>
      resolveProjectExecutionPolicy(readOnlyMaximum, {
        ...input,
        executionMode: "DISABLED",
        autonomyProfile: "INTERACTIVE",
        writeClass: "runtime_audit_write",
      }),
    /POLICY_STOP.*autonomy/i,
  );

  assert.throws(
    () =>
      resolveProjectExecutionPolicy(loaded, {
        ...input,
        executionMode: "DISABLED",
        autonomyProfile: "READ_ONLY",
        writeClass: "external_write",
      }),
    /POLICY_STOP.*external write/i,
  );
});

test("TEST-014 aggregate background caps are canonical, strict, and resolve by minimum", async (t) => {
  const {
    loadCanonicalProjectConfig,
    resolveBackgroundAggregatePolicy,
  } = await import(projectConfigModuleUrl);
  const loaded = await loadCanonicalProjectConfig(ROOT);
  assert.equal(loaded.valid, true);
  assert.deepEqual(loaded.config.background_aggregate_policy, {
    max_workers: 2,
    max_reserved_tokens: null,
    max_reserved_runtime_ms: 21_600_000,
    max_remote_calls: 0,
    max_reviewers: 2,
  });

  const effective = resolveBackgroundAggregatePolicy({
    project: {
      max_workers: 8,
      max_reserved_tokens: 80_000,
      max_reserved_runtime_ms: 80_000,
      max_remote_calls: 8,
      max_reviewers: 8,
    },
    fsd: {
      max_workers: 6,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 60_000,
      max_remote_calls: 6,
      max_reviewers: 2,
    },
    operation: {
      max_workers: 4,
      max_reserved_tokens: 40_000,
      max_reserved_runtime_ms: 70_000,
      max_remote_calls: 0,
      max_reviewers: 4,
    },
  });
  assert.deepEqual(effective, {
    max_workers: 4,
    max_reserved_tokens: 40_000,
    max_reserved_runtime_ms: 60_000,
    max_remote_calls: 0,
    max_reviewers: 2,
  });

  for (const mutate of [
    (candidate) => delete candidate.background_aggregate_policy,
    (candidate) => { candidate.background_aggregate_policy.max_workers = 0; },
    (candidate) => { candidate.background_aggregate_policy.max_reserved_runtime_ms = -1; },
    (candidate) => { candidate.background_aggregate_policy.max_reserved_tokens = 0; },
    (candidate) => { candidate.background_aggregate_policy.max_remote_calls = -1; },
    (candidate) => { candidate.background_aggregate_policy.max_reviewers = Number.MAX_SAFE_INTEGER + 1; },
    (candidate) => { candidate.background_aggregate_policy.unknown = 1; },
  ]) {
    const invalid = await loadConfigVariant(
      t,
      loadCanonicalProjectConfig,
      loaded.config,
      mutate,
    );
    assert.equal(invalid.valid, false);
    assert.equal(invalid.effective_mode, "HALTED");
  }
});

test("write classification is path-confined and defaults every unknown path to implementation", async () => {
  const {
    classifyWriteIntent,
    loadCanonicalProjectConfig,
  } = await import(projectConfigModuleUrl);
  const loaded = await loadCanonicalProjectConfig(ROOT);
  const { classifyRepositoryWrite } = await import(
    new URL("./loop-run-model.mjs", import.meta.url)
  );

  assert.equal(
    classifyWriteIntent(loaded, {
      path: ".scratch/loop-runs/LER2-GOAL-005/events.jsonl",
    }),
    "runtime_audit_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, {
      path: ".scratch/loop-runtime/project-config.lock",
    }),
    "runtime_audit_write",
  );
  for (const path of [
    "docs/STATE.md",
    "docs/debug/2026-07-21-example.md",
    "docs/reviews/2026-07-21-example.md",
  ]) {
    assert.equal(classifyWriteIntent(loaded, { path }), "implementation_write");
  }
  assert.equal(
    classifyWriteIntent(loaded, {
      path: ".scratch\\loop-runtime-v2\\issues\\05-machine-policy-artifacts.md",
    }),
    "authority_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, { path: "docs/fsd/fsd-loop-runtime-v2.md" }),
    "authority_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, { path: "docs/research/2026-09-03-example.md" }),
    "authority_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, {
      path: "docs/solutions/adr-0001-loop-run-controller-v2.md",
    }),
    "authority_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, {
      path: "docs/solutions/performance-issues/incident.md",
    }),
    "implementation_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, { path: ".agent/tools/project-config.mjs" }),
    "implementation_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, { path: "untracked/new/location.txt" }),
    "implementation_write",
  );
  assert.equal(
    classifyWriteIntent(loaded, {
      external: true,
      operation: "provider-record-update",
    }),
    "external_write",
  );
  assert.throws(
    () => classifyWriteIntent(loaded, { path: "../outside.txt" }),
    /repository-relative|traversal/i,
  );
  assert.throws(
    () => classifyWriteIntent(loaded, { path: "C:\\outside.txt" }),
    /repository-relative|absolute/i,
  );
  assert.equal(
    classifyRepositoryWrite(
      loaded.config.write_classification,
      { path: "Docs/fsd/fsd-loop-runtime-v2.md" },
      { caseSensitive: true },
    ),
    "implementation_write",
  );
  assert.equal(
    classifyRepositoryWrite(
      loaded.config.write_classification,
      { path: "Docs/fsd/fsd-loop-runtime-v2.md" },
      { caseSensitive: false },
    ),
    "authority_write",
  );
});

test("artifact authority accepts exact v2 metadata and requires replan for legacy contracts", async () => {
  const {
    assessArtifactExecutionAuthority,
    loadCanonicalProjectConfig,
  } = await import(projectConfigModuleUrl);
  const loaded = await loadCanonicalProjectConfig(ROOT);
  const schema = JSON.parse(
    await readFile(
      path.join(ROOT, ".agent/context/schemas/authority-artifact-v2.schema.json"),
      "utf8",
    ),
  );
  const fixture = {
    schema: "authority_artifact_v2",
    contract_version: "2.0.0",
    artifact_contract_version: "2.0.0",
    artifact_type: "FSD",
    artifact_id: "FSD-LER2",
    artifact_version: "1.0.0",
    status: "APPROVED",
    source_path: "docs/fsd/fsd-loop-runtime-v2.md",
    content_digest: `sha256:${"a".repeat(64)}`,
    authority_digest: `sha256:${"b".repeat(64)}`,
    requires_fresh_verification: false,
    recorded_at: "2026-07-18T00:00:00.000Z",
  };

  assert.deepEqual(validateValue(fixture, schema), { valid: true, errors: [] });
  const fixtureValidation = validateValue(fixture, schema);
  assert.deepEqual(fixtureValidation, { valid: true, errors: [] });
  assert.deepEqual(
    await assessArtifactExecutionAuthority(loaded, fixture),
    {
    accepted: true,
    reason: null,
    },
  );

  const malformedV2 = { ...fixture };
  delete malformedV2.authority_digest;
  const malformedValidation = validateValue(malformedV2, schema);
  assert.equal(malformedValidation.valid, false);
  assert.deepEqual(
    await assessArtifactExecutionAuthority(
      loaded,
      malformedV2,
      { valid: true, errors: [] },
    ),
    { accepted: false, reason: "INVALID_ARTIFACT_AUTHORITY" },
  );

  const staleV2 = { ...fixture, requires_fresh_verification: true };
  const staleValidation = validateValue(staleV2, schema);
  assert.deepEqual(staleValidation, { valid: true, errors: [] });
  assert.deepEqual(
    await assessArtifactExecutionAuthority(loaded, staleV2),
    { accepted: false, reason: "FRESH_VERIFICATION_REQUIRED" },
  );

  await assert.rejects(
    () => assessArtifactExecutionAuthority(structuredClone(loaded), fixture),
    /POLICY_STOP.*loader provenance/i,
  );

  for (const legacyVersion of ["1.0.0", "1.1.0", null]) {
    const legacy = { ...fixture, artifact_contract_version: legacyVersion };
    assert.equal(validateValue(legacy, schema).valid, false);
    assert.deepEqual(
      await assessArtifactExecutionAuthority(loaded, legacy),
      {
      accepted: false,
      reason: "REPLAN_REQUIRED",
      },
    );
  }

  for (const relativePath of [
    ".agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md",
    ".agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md",
    ".agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md",
    ".agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md",
    ".agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md",
  ]) {
    const text = await readFile(path.join(ROOT, relativePath), "utf8");
    assert.match(text, /artifact contract version:\s*`?2\.0\.0`?|artifact_contract_version:\s*["']2\.0\.0["']/i);
  }
});

test("eval result v2 binds attempts, gates, revisions, verdict, and run head exactly", async () => {
  const schema = JSON.parse(
    await readFile(
      path.join(ROOT, ".agent/context/schemas/eval-result-v2.schema.json"),
      "utf8",
    ),
  );
  const digestA = `sha256:${"a".repeat(64)}`;
  const digestB = `sha256:${"b".repeat(64)}`;
  const fixture = {
    schema: "eval_result_v2",
    contract_version: "2.0.0",
    eval_result_id: "eval-result-goal-005",
    run_id: "LER2-GOAL-005",
    goal_ref: "FSD-LER2@1.0.0#GOAL-005",
    eval_definition_digest: digestA,
    verifier_digest: digestB,
    base_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
    eval_class: "CAPABILITY",
    success_threshold: {
      metric: "PASS_AT_K",
      k: 3,
      minimum_basis_points: 9000,
    },
    evaluation_mode: "DETERMINISTIC",
    risk_profile: "LOW",
    maker_actor_id: "maker-goal-005",
    checker: {
      checker_id: "checker-goal-005",
      verdict: "PASS",
      read_only: true,
      attestation: "HOST_ATTESTED_INDEPENDENT_READ_ONLY",
      evidence_digest: digestA,
      evidence_ref: ".scratch/evidence/checker-goal-005.json",
      run_id: "LER2-GOAL-005",
      goal_ref: "FSD-LER2@1.0.0#GOAL-005",
      eval_definition_digest: digestA,
      run_head_digest: digestB,
      workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
      final_attempt_number: 3,
      final_attempt_digest: digestA,
      verified_at: "2026-07-18T00:03:00.000Z",
    },
    findings: [
      {
        finding_id: "finding-goal-005-1",
        source_finding_id: "source-finding-1",
        source_run_id: "source-run-1",
        evidence_refs: [".scratch/evidence/finding-goal-005-1.json"],
        owner_id: "maker-goal-005",
        original_verifier: {
          ref: "original-verifier-1",
          digest: digestB,
          actor_id: "original-verifier-actor-1",
        },
        return_gate: {
          closure_cycle: 1,
          verifier_ref: "original-verifier-1",
          verifier_digest: digestB,
          verifier_actor_id: "original-verifier-actor-1",
          verdict: "PASS",
          evidence_refs: [".scratch/evidence/finding-goal-005-return.json"],
          evidence_ref: ".scratch/evidence/finding-goal-005-return.json",
          evidence_digest: `sha256:${"a".repeat(64)}`,
          attestation: "HOST_ATTESTED_ORIGINAL_VERIFIER",
          run_id: "LER2-GOAL-005",
          goal_ref: "FSD-LER2@1.0.0#GOAL-005",
          eval_definition_digest: digestA,
          run_head_digest: digestB,
          workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
          source_finding_id: "source-finding-1",
          source_run_id: "source-run-1",
          final_attempt_number: 3,
          final_attempt_digest: digestA,
          verified_at: "2026-07-18T00:03:00.000Z",
        },
        max_closure_cycles: 3,
        outcome: "CLOSED",
      },
    ],
    finding_inventory: {
      attestation: "HOST_ATTESTED_COMPLETE_FINDING_SET",
      run_id: "LER2-GOAL-005",
      goal_ref: "FSD-LER2@1.0.0#GOAL-005",
      eval_definition_digest: digestA,
      run_head_digest: digestB,
      workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
      final_attempt_number: 3,
      final_attempt_digest: digestA,
      source_records: [
        {
          source_finding_id: "source-finding-1",
          source_run_id: "source-run-1",
          original_verifier_ref: "original-verifier-1",
          original_verifier_digest: digestB,
          original_verifier_actor_id: "original-verifier-actor-1",
        },
      ],
      finding_set_digest: digestA,
      evidence_ref: ".scratch/evidence/finding-inventory-goal-005.json",
      evidence_digest: digestA,
      recorded_at: "2026-07-18T00:03:00.000Z",
    },
    attempts: [
      {
        attempt_number: 1,
        reset_id: "clean-reset-1",
        reset_attestation: "HOST_ATTESTED_CLEAN_RESET",
        run_head_digest: digestB,
        workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
        verifier_digest: digestB,
        verdict: "PASS",
        evidence_refs: [".scratch/evidence/goal-005-attempt-1.json"],
        regression: null,
        started_at: "2026-07-18T00:00:00.000Z",
        completed_at: "2026-07-18T00:01:00.000Z",
      },
      {
        attempt_number: 2,
        reset_id: "clean-reset-2",
        reset_attestation: "HOST_ATTESTED_CLEAN_RESET",
        run_head_digest: digestB,
        workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
        verifier_digest: digestB,
        verdict: "PASS",
        evidence_refs: [".scratch/evidence/goal-005-attempt-2.json"],
        regression: null,
        started_at: "2026-07-18T00:01:00.000Z",
        completed_at: "2026-07-18T00:02:00.000Z",
      },
      {
        attempt_number: 3,
        reset_id: "clean-reset-3",
        reset_attestation: "HOST_ATTESTED_CLEAN_RESET",
        run_head_digest: digestB,
        workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
        verifier_digest: digestB,
        verdict: "PASS",
        evidence_refs: [".scratch/evidence/goal-005-attempt-3.json"],
        regression: null,
        started_at: "2026-07-18T00:02:00.000Z",
        completed_at: "2026-07-18T00:03:00.000Z",
      },
    ],
    pass_metrics: {
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    },
    regression_pass_metrics: null,
    human_gates: [
      {
        gate_id: "project-owner-release",
        status: "PASS",
        approver_id: "codex-thread-user",
        evidence_digest: digestA,
        evidence_ref: ".scratch/evidence/project-owner-release.json",
        attestation: "HOST_ATTESTED_HUMAN",
        run_id: "LER2-GOAL-005",
        goal_ref: "FSD-LER2@1.0.0#GOAL-005",
        eval_definition_digest: digestA,
        run_head_digest: digestB,
        workspace_head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
        risk_profile: "LOW",
        final_attempt_number: 3,
        final_attempt_digest: digestA,
        approved_at: "2026-07-18T00:03:00.000Z",
        expires_at: "2026-07-18T01:00:00.000Z",
      },
    ],
    artifact_revision: {
      artifact_type: "FSD",
      artifact_id: "FSD-LER2",
      artifact_version: "1.0.0",
      artifact_contract_version: "2.0.0",
      digest: digestA,
    },
    workspace_revision: {
      base_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
      head_git_sha: "454089a543afa03785b8ce55064e7a6305097e3d",
    },
    verdict: "PASS",
    fresh: true,
    run_head_digest: digestB,
    recorded_at: "2026-07-18T00:04:00.000Z",
  };

  assert.deepEqual(validateValue(fixture, schema), { valid: true, errors: [] });

  const v1 = { ...fixture, schema: "eval_result_v1" };
  assert.equal(validateValue(v1, schema).valid, false);
  const legacyArtifact = structuredClone(fixture);
  legacyArtifact.artifact_revision.artifact_contract_version = "1.1.0";
  assert.equal(validateValue(legacyArtifact, schema).valid, false);
  const unknown = { ...fixture, self_reported_goal_met: true };
  assert.equal(validateValue(unknown, schema).valid, false);
  const missingRunHead = { ...fixture, run_head_digest: null };
  assert.equal(validateValue(missingRunHead, schema).valid, false);
  for (const requiredField of [
    "evaluation_mode",
    "risk_profile",
    "maker_actor_id",
    "checker",
    "findings",
  ]) {
    const missing = structuredClone(fixture);
    delete missing[requiredField];
    assert.equal(validateValue(missing, schema).valid, false, requiredField);
  }
  const unknownChecker = structuredClone(fixture);
  unknownChecker.checker.self_attested = true;
  assert.equal(validateValue(unknownChecker, schema).valid, false);
  const unknownReturnGate = structuredClone(fixture);
  unknownReturnGate.findings[0].return_gate.replacement_verifier = true;
  assert.equal(validateValue(unknownReturnGate, schema).valid, false);
  const sha256Repository = structuredClone(fixture);
  sha256Repository.base_git_sha = "c".repeat(64);
  sha256Repository.workspace_revision.base_git_sha = "c".repeat(64);
  sha256Repository.workspace_revision.head_git_sha = "d".repeat(64);
  assert.equal(validateValue(sha256Repository, schema).valid, true);
});

test("controller mode CLI reports HALTED config failures and atomically applies owner transitions", async () => {
  const { runLoopRunCli } = await import(loopRunModuleUrl);
  const root = await mkdtemp(path.join(tmpdir(), "loop-mode-v2-"));
  const context = path.join(root, ".agent/context");
  const schemas = path.join(context, "schemas");
  const canonicalConfig = canonicalDisabledBaselineConfig();
  const schemaText = await readFile(
    path.join(ROOT, ".agent/context/schemas/project-config-v2.schema.json"),
    "utf8",
  );

  try {
    await mkdir(schemas, { recursive: true });
    await writeFile(path.join(schemas, "project-config-v2.schema.json"), schemaText);

    const missing = await runLoopRunCli(["mode", "show"], { root });
    assert.equal(missing.valid, false);
    assert.equal(missing.effective_mode, "HALTED");
    assert.match(missing.errors.join("\n"), /missing|does not exist/i);

    const v1Text = `${JSON.stringify({ ...canonicalConfig, schema: "project_config_v1" }, null, 2)}\n`;
    await writeFile(path.join(context, "project-config.json"), v1Text);
    const legacy = await runLoopRunCli(["mode", "validate"], { root });
    assert.equal(legacy.valid, false);
    assert.equal(legacy.effective_mode, "HALTED");
    assert.match(legacy.errors.join("\n"), /schema validation/i);

    const disabledText = `${JSON.stringify(canonicalConfig, null, 2)}\n`;
    await writeFile(path.join(context, "project-config.json"), disabledText);
    const candidate = {
      ...canonicalConfig,
      config_version: canonicalConfig.config_version + 1,
      mode_version: canonicalConfig.mode_version + 1,
      mode: "OBSERVE",
    };
    const candidateText = `${JSON.stringify(candidate, null, 2)}\n`;
    await writeFile(path.join(root, "candidate-config.json"), candidateText);

    const transitionArgs = (inputFile, configVersion, modeVersion) => [
      "mode",
      "transition",
      "--expected-digest",
      sha256(disabledText),
      "--expected-config-version",
      String(configVersion),
      "--expected-mode-version",
      String(modeVersion),
      "--target",
      "OBSERVE",
      "--input-file",
      inputFile,
      "--owner-actor",
      "project-owner",
      "--owner-attestation",
      "HOST_OWNER_ACTION",
    ];
    await assert.rejects(
      runLoopRunCli(
        transitionArgs(
          "candidate-config.json",
          canonicalConfig.config_version + 1,
          canonicalConfig.mode_version,
        ),
        { root },
      ),
      /CAS conflict for project config version/u,
    );
    await assert.rejects(
      runLoopRunCli(
        transitionArgs(
          "candidate-config.json",
          canonicalConfig.config_version,
          canonicalConfig.mode_version + 1,
        ),
        { root },
      ),
      /CAS conflict for project mode version/u,
    );
    const nonMonotonicCandidate = {
      ...canonicalConfig,
      mode: "OBSERVE",
    };
    await writeFile(
      path.join(root, "candidate-non-monotonic.json"),
      `${JSON.stringify(nonMonotonicCandidate, null, 2)}\n`,
    );
    await assert.rejects(
      runLoopRunCli(
        transitionArgs(
          "candidate-non-monotonic.json",
          canonicalConfig.config_version,
          canonicalConfig.mode_version,
        ),
        { root },
      ),
      /candidate version mismatch/u,
    );
    assert.equal(
      await readFile(path.join(context, "project-config.json"), "utf8"),
      disabledText,
    );

    const transitioned = await runLoopRunCli(
      transitionArgs(
        "candidate-config.json",
        canonicalConfig.config_version,
        canonicalConfig.mode_version,
      ),
      { root },
    );
    assert.equal(transitioned.valid, true);
    assert.equal(transitioned.effective_mode, "OBSERVE");
    assert.deepEqual(
      JSON.parse(await readFile(path.join(context, "project-config.json"), "utf8")),
      candidate,
    );

    const enforceCandidate = {
      ...candidate,
      config_version: candidate.config_version + 1,
      mode_version: candidate.mode_version + 1,
      mode: "ENFORCE",
    };
    const enforceText = `${JSON.stringify(enforceCandidate, null, 2)}\n`;
    await writeFile(path.join(root, "candidate-enforce.json"), enforceText);
    const enforceArgs = [
      "mode",
      "transition",
      "--expected-digest",
      sha256(candidateText),
      "--expected-config-version",
      String(candidate.config_version),
      "--expected-mode-version",
      String(candidate.mode_version),
      "--target",
      "ENFORCE",
      "--input-file",
      "candidate-enforce.json",
      "--owner-actor",
      "project-owner",
      "--owner-attestation",
      "HOST_OWNER_ACTION",
    ];
    await assert.rejects(
      runLoopRunCli(enforceArgs, { root }),
      /CAPABILITY(?:_| )(?:ATTESTATION|AUTHORITY)/i,
    );
    await assert.rejects(
      runLoopRunCli(enforceArgs, {
        root,
        controllerDependencies: {
          verifyModeCapability: async (binding) => ({
            verified: true,
            current_config_digest: binding.current_config_digest,
            candidate_config_digest: binding.candidate_config_digest,
            evidence_digest: `sha256:${"a".repeat(64)}`,
          }),
        },
      }),
      /CAPABILITY(?:_| )(?:ATTESTATION|AUTHORITY)/i,
    );

    await assert.rejects(
      runLoopRunCli(
        [
          "mode",
          "transition",
          "--expected-digest",
          sha256(disabledText),
          "--expected-config-version",
          String(canonicalConfig.config_version),
          "--expected-mode-version",
          String(canonicalConfig.mode_version),
          "--target",
          "OBSERVE",
          "--input-file",
          "candidate-config.json",
          "--owner-actor",
          "project-owner",
          "--owner-attestation",
          "HOST_OWNER_ACTION",
        ],
        { root },
      ),
      /config digest.*stale|CAS/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
