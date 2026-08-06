import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildHardWriteSandboxCommand,
  createHardWriteInterceptor,
  hardWriteInterceptorDigest,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import { createLoopRunController } from "./loop-run.mjs";
import {
  classifyWriteIntent,
  loadCanonicalProjectConfig,
} from "./project-config.mjs";
import { rfc3339UtcSortKey } from "./schema-validator.mjs";

const RUN_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA_256_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const RISK_PROFILES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const AUTONOMY_PROFILES = new Set(["READ_ONLY", "INTERACTIVE", "BACKGROUND"]);
const STATE_POINTER_PATHS = Object.freeze([
  ".continue-here.md",
  "docs/STATE.md",
  "docs/progress.md",
]);
const SOURCE_WRITE_CLASSES = new Set([
  "authority_write",
  "implementation_write",
]);
const SOURCE_WRITE_CAPABILITY_TTL_MS = 5 * 60 * 1000;
const sourceWriteAdmissions = new WeakMap();
const PROJECT_CONFIG_LOCK = path.join(
  ".scratch",
  "loop-runtime",
  "project-config.lock",
);
const SOURCE_WRITE_LOCK_ROOT = path.join(
  ".scratch",
  "loop-runtime",
  "source-write-locks",
);

const CORE_ROUTE_RULES = Object.freeze({
  "sc-plan": Object.freeze({
    authority: true,
    authorityPathPrefixes: [".agent/evals/", "docs/fsd/", "docs/solutions/"],
    authorityPathPatterns: [/^\.scratch\/[^/]+\/issues\/[^/]+\.md$/u],
    gated: [],
    operations: [],
  }),
  "sc-eval": Object.freeze({
    authority: true,
    authorityPathPrefixes: [".agent/evals/"],
    gated: [],
    operations: [],
  }),
  "sc-work": Object.freeze({
    authority: true,
    authorityPathPatterns: [/^\.scratch\/[^/]+\/issues\/[^/]+\.md$/u],
    gated: ["implementation_write"],
    operations: ["source-write"],
  }),
  "sc-debug": Object.freeze({
    authority: false,
    gated: ["implementation_write"],
    operations: ["source-write"],
  }),
  "sc-explore": Object.freeze({
    authority: true,
    authorityPathPrefixes: ["docs/brd/"],
    gated: ["implementation_write"],
    operations: ["source-write"],
    pathPrefixes: [".scratch/prototypes/"],
  }),
  "sc-review": Object.freeze({
    authority: false,
    gated: ["implementation_write"],
    operations: ["source-write"],
    pathPrefixes: ["docs/reviews/"],
  }),
  "sc-launch": Object.freeze({
    authority: false,
    gated: ["implementation_write"],
    operations: ["source-write"],
    exactPaths: STATE_POINTER_PATHS,
  }),
  "sc-pause": Object.freeze({
    authority: false,
    gated: ["implementation_write"],
    operations: ["source-write"],
    exactPaths: STATE_POINTER_PATHS,
  }),
  "sc-go": Object.freeze({
    authority: false,
    gated: ["implementation_write", "external_write"],
    operations: ["commit", "push", "pr"],
  }),
});

function denied(route, writeClass, reason, approvalRequired = false) {
  return {
    allowed: false,
    mutation_authorized: false,
    approval_required: approvalRequired,
    reason,
    route,
    write_class: writeClass,
  };
}

function admitted(
  route,
  writeClass,
  approvalRequired,
  gateEvidence = null,
  sourceWriteBinding = null,
) {
  const admission = deepFreeze({
    allowed: true,
    mutation_authorized: true,
    approval_required: approvalRequired,
    reason: null,
    route,
    write_class: writeClass,
    gate_evidence: gateEvidence,
  });
  if (sourceWriteBinding !== null) {
    sourceWriteAdmissions.set(admission, {
      ...sourceWriteBinding,
      consumed: false,
      expiresAtMs: Date.now() + SOURCE_WRITE_CAPABILITY_TTL_MS,
    });
  }
  return admission;
}

function normalizedIntentPath(intent) {
  return typeof intent.path === "string" ? intent.path.replaceAll("\\", "/") : null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value) ||
    seen.has(value)
  ) {
    return value;
  }
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}

function snapshotRequest(request) {
  try {
    return deepFreeze(structuredClone(request));
  } catch {
    throw new TypeError("Workflow admission request must be plain JSON data.");
  }
}

function bindIntent(intent, writeClass) {
  const normalized = {
    external: intent.external === true,
    operation: typeof intent.operation === "string" ? intent.operation : null,
    path: normalizedIntentPath(intent),
    write_class: writeClass,
  };
  return Object.freeze({
    intent_path: normalized.path,
    intent_digest: `sha256:${createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex")}`,
  });
}

function sourceWriteDigest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function asSourceWriteBuffer(content, encoding = "utf8") {
  if (Buffer.isBuffer(content)) return content;
  if (ArrayBuffer.isView(content)) {
    return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  }
  return Buffer.from(String(content), encoding);
}

function requireSourceWriteAdmission(admission, candidate = null) {
  const trusted =
    admission !== null && typeof admission === "object"
      ? sourceWriteAdmissions.get(admission)
      : undefined;
  if (trusted === undefined) {
    throw new TypeError("HARD_WRITE_INTERCEPTION_ADMISSION_UNTRUSTED");
  }
  if (trusted.consumed) {
    throw new TypeError("HARD_WRITE_INTERCEPTION_ADMISSION_CONSUMED");
  }
  if (Date.now() >= trusted.expiresAtMs) {
    throw new TypeError("HARD_WRITE_INTERCEPTION_ADMISSION_EXPIRED");
  }
  if (
    admission.allowed !== true ||
    admission.mutation_authorized !== true ||
    !SOURCE_WRITE_CLASSES.has(admission.write_class) ||
    admission.gate_evidence?.hard_write_interceptor_digest !==
      trusted.interceptorDigest ||
    admission.gate_evidence?.intent_path !== trusted.intentPath ||
    admission.gate_evidence?.intent_digest !== trusted.intentDigest ||
    admission.gate_evidence?.project_config_digest !== trusted.configDigest ||
    admission.gate_evidence?.config_version !== trusted.configVersion ||
    admission.gate_evidence?.mode_version !== trusted.modeVersion
  ) {
    throw new TypeError("HARD_WRITE_INTERCEPTION_ADMISSION_TAMPERED");
  }
  if (candidate !== null && candidate !== trusted.intentPath) {
    throw new TypeError("HARD_WRITE_INTERCEPTION_PATH_BINDING_MISMATCH");
  }
  return trusted;
}

export function buildHardWriteInterceptedCommand(admission, input = {}) {
  const trusted = requireSourceWriteAdmission(admission);
  return buildHardWriteSandboxCommand(trusted.interceptor, input);
}

export async function writeInterceptedSourceFile(
  admission,
  candidate,
  content,
  options = {},
) {
  const trusted = requireSourceWriteAdmission(admission, candidate);
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Intercepted source write options must be an object");
  }
  const allowedOptions = new Set([
    "durabilityFault",
    "encoding",
    "expectedDigest",
    "maxBytes",
    "mode",
  ]);
  if (Object.keys(options).some((field) => !allowedOptions.has(field))) {
    throw new TypeError("Intercepted source write options contain an unsupported field");
  }
  if (
    options.expectedDigest !== "MISSING" &&
    !SHA_256_DIGEST.test(options.expectedDigest ?? "")
  ) {
    throw new TypeError("Intercepted source write requires an expected digest or MISSING");
  }

  return withOwnerLock(
    trusted.root,
    PROJECT_CONFIG_LOCK,
    async ({ assertOwnership: assertConfigOwnership }) => {
      const freshConfig = await loadCanonicalProjectConfig(trusted.root);
      if (
        freshConfig.valid !== true ||
        freshConfig.config_digest !== trusted.configDigest ||
        freshConfig.config?.config_version !== trusted.configVersion ||
        freshConfig.config?.mode_version !== trusted.modeVersion
      ) {
        throw new TypeError("HARD_WRITE_INTERCEPTION_CONFIG_BINDING_STALE");
      }
      const sourceLock = path.join(
        SOURCE_WRITE_LOCK_ROOT,
        `${sourceWriteDigest(candidate).slice("sha256:".length)}.lock`,
      );
      return withOwnerLock(
        trusted.root,
        sourceLock,
        async ({ assertOwnership: assertSourceOwnership }) => {
          requireSourceWriteAdmission(admission, candidate);
          await assertConfigOwnership();
          const absolute = await resolveRepositoryPath(
            trusted.root,
            candidate,
            { label: "Intercepted source write" },
          );
          const before = await readFile(absolute).catch((error) => {
            if (error?.code === "ENOENT") return null;
            throw error;
          });
          const actualDigest =
            before === null ? "MISSING" : sourceWriteDigest(before);
          if (actualDigest !== options.expectedDigest) {
            throw new Error(
              `CAS conflict for intercepted source write: expected ${options.expectedDigest}, found ${actualDigest}`,
            );
          }

          trusted.consumed = true;
          const buffer = asSourceWriteBuffer(content, options.encoding);
          const result = await writeFileAtomic(
            trusted.root,
            candidate,
            buffer,
            {
              assertOwnership: async () => {
                await assertConfigOwnership();
                await assertSourceOwnership();
              },
              durabilityFault: options.durabilityFault,
              maxBytes: options.maxBytes,
              mode: options.mode,
              assertBeforeReplace: async () => {
                const [current, currentConfig] = await Promise.all([
                  readFile(absolute).catch((error) => {
                    if (error?.code === "ENOENT") return null;
                    throw error;
                  }),
                  loadCanonicalProjectConfig(trusted.root),
                ]);
                const currentDigest =
                  current === null
                    ? "MISSING"
                    : sourceWriteDigest(current);
                if (currentDigest !== actualDigest) {
                  throw new Error(
                    `CAS conflict for intercepted source write: expected ${actualDigest}, found ${currentDigest}`,
                  );
                }
                if (
                  currentConfig.valid !== true ||
                  currentConfig.config_digest !== trusted.configDigest ||
                  currentConfig.config?.config_version !==
                    trusted.configVersion ||
                  currentConfig.config?.mode_version !== trusted.modeVersion
                ) {
                  throw new TypeError(
                    "HARD_WRITE_INTERCEPTION_CONFIG_BINDING_STALE",
                  );
                }
              },
            },
          );
          if (result.durability.directorySync !== true) {
            throw new Error("DURABILITY_DIRECTORY_SYNC_UNAVAILABLE");
          }
          const readbackDigest = sourceWriteDigest(await readFile(absolute));
          const expectedReadback = sourceWriteDigest(buffer);
          if (readbackDigest !== expectedReadback) {
            throw new Error("INTERCEPTED_SOURCE_WRITE_READBACK_MISMATCH");
          }
          return deepFreeze({
            ...result,
            config_version: trusted.configVersion,
            expected_preimage_digest: actualDigest,
            interceptor_digest: trusted.interceptorDigest,
            mode_version: trusted.modeVersion,
            project_config_digest: trusted.configDigest,
            readback_digest: readbackDigest,
            source_write_capability_consumed: true,
          });
        },
      );
    },
  );
}

function pathAllowed(rule, intent, writeClass) {
  if (
    writeClass !== "authority_write" &&
    writeClass !== "implementation_write"
  ) {
    return true;
  }
  const candidate = normalizedIntentPath(intent);
  if (candidate === null) return false;
  if (writeClass === "authority_write") {
    return (
      (rule.authorityPathPrefixes?.some((prefix) => candidate.startsWith(prefix)) ??
        false) ||
      (rule.authorityPathPatterns?.some((pattern) => pattern.test(candidate)) ??
        false)
    );
  }
  if (rule.exactPaths === undefined && rule.pathPrefixes === undefined) return true;
  return (
    (rule.exactPaths?.includes(candidate) ?? false) ||
    (rule.pathPrefixes?.some((prefix) => candidate.startsWith(prefix)) ?? false)
  );
}

function gateEvidence(result, capability = null, intentBinding = null) {
  return {
    run_id: result.run_id ?? null,
    run_version: result.run_version ?? null,
    confirmation_digest: result.confirmation_digest ?? null,
    authority_digest: result.authority_digest ?? null,
    policy_digest: result.policy_digest ?? null,
    operation: result.operation ?? null,
    run_head_digest: capability?.run_head_digest ?? result.run_head_digest ?? null,
    verifier_digest: result.verifier_digest ?? null,
    project_config_digest: result.project_config_digest ?? null,
    operation_inventory_digest:
      capability?.operation_inventory_digest ??
      result.operation_inventory_digest ??
      null,
    host_capability_digest: capability?.host_capability_digest ?? null,
    confirmed_risk_profile:
      capability?.confirmed_risk_profile ?? result.confirmed_risk_profile ?? null,
    confirmed_autonomy_profile:
      capability?.confirmed_autonomy_profile ??
      result.confirmed_autonomy_profile ??
      null,
    confirmed_required_gates:
      capability?.confirmed_required_gates ??
      result.confirmed_required_gates ??
      null,
    intent_path: capability?.intent_path ?? intentBinding?.intent_path ?? null,
    intent_digest: capability?.intent_digest ?? intentBinding?.intent_digest ?? null,
  };
}

function sameStringSet(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.length === right.length &&
    left.every((entry) => typeof entry === "string" && right.includes(entry))
  );
}

function isAuthorizedGateResult(result, runId, operation) {
  return (
    result !== null &&
    typeof result === "object" &&
    result.allowed === true &&
    result.would_allow === true &&
    result.mutation_authorized === true &&
    result.simulation_only === false &&
    result.run_id === runId &&
    result.operation === operation &&
    Number.isSafeInteger(result.run_version) &&
    result.run_version >= 0 &&
    SHA_256_DIGEST.test(result.confirmation_digest) &&
    SHA_256_DIGEST.test(result.authority_digest) &&
    SHA_256_DIGEST.test(result.policy_digest) &&
    SHA_256_DIGEST.test(result.run_head_digest) &&
    SHA_256_DIGEST.test(result.verifier_digest) &&
    SHA_256_DIGEST.test(result.project_config_digest) &&
    SHA_256_DIGEST.test(result.operation_inventory_digest) &&
    RISK_PROFILES.has(result.confirmed_risk_profile) &&
    AUTONOMY_PROFILES.has(result.confirmed_autonomy_profile) &&
    sameStringSet(
      result.confirmed_required_gates,
      result.confirmed_required_gates,
    )
  );
}

function isAuthorizedCapabilityResult(
  result,
  gate,
  runId,
  operation,
  intentBinding,
  backgroundDispatchId,
) {
  return (
    result !== null &&
    typeof result === "object" &&
    result.allowed === true &&
    result.run_id === runId &&
    result.operation === operation &&
    result.confirmation_digest === gate.confirmation_digest &&
    result.authority_digest === gate.authority_digest &&
    result.verifier_digest === gate.verifier_digest &&
    result.project_config_digest === gate.project_config_digest &&
    result.policy_digest === gate.policy_digest &&
    result.run_head_digest === gate.run_head_digest &&
    result.operation_inventory_digest === gate.operation_inventory_digest &&
    result.confirmed_risk_profile === gate.confirmed_risk_profile &&
    result.confirmed_autonomy_profile === gate.confirmed_autonomy_profile &&
    sameStringSet(
      result.confirmed_required_gates,
      gate.confirmed_required_gates,
    ) &&
    result.intent_path === intentBinding.intent_path &&
    result.intent_digest === intentBinding.intent_digest &&
    SHA_256_DIGEST.test(result.intent_digest) &&
    SHA_256_DIGEST.test(result.host_capability_digest) &&
    (gate.confirmed_autonomy_profile === "BACKGROUND"
      ? result.background_dispatch?.dispatch_id === backgroundDispatchId
      : result.background_dispatch === null)
  );
}

function isAuthorizedBackgroundDispatch(result, dispatchId, gate, observedAt) {
  return (
    result !== null &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    result.schema === "background_action_authorization_v2" &&
    result.contract_version === "2.0.0" &&
    result.dispatch_id === dispatchId &&
    result.operation === gate.operation &&
    result.run_id === gate.run_id &&
    [
      result.queue_item_id,
      result.lease_id,
      result.worker_ref,
      result.worktree_ref,
      result.action_id,
      result.idempotency_key,
    ].every((value) => typeof value === "string" && RUN_IDENTIFIER.test(value)) &&
    result.action_id === gate.action_id &&
    result.idempotency_key === gate.idempotency_key &&
    result.controller_intent_digest === gate.controller_intent_digest &&
    result.action_run_head_digest === gate.run_head_digest &&
    result.policy_digest === gate.policy_digest &&
    result.confirmation_digest === gate.confirmation_digest &&
    rfc3339UtcSortKey(observedAt) !== null &&
    rfc3339UtcSortKey(result.expires_at) !== null &&
    rfc3339UtcSortKey(observedAt) < rfc3339UtcSortKey(result.expires_at)
  );
}

export async function validateWorkflowAdmission(
  root,
  request = {},
  dependencies = {},
) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("Workflow admission requires a repository root.");
  }
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Workflow admission request must be an object.");
  }
  const capturedRequest = snapshotRequest(request);
  const { route, intent, runId, operation, queueItemId } = capturedRequest;
  const rule = CORE_ROUTE_RULES[route];
  if (rule === undefined) {
    throw new TypeError(`Unsupported workflow route: ${String(route)}`);
  }
  if (intent === null || typeof intent !== "object" || Array.isArray(intent)) {
    throw new TypeError("Workflow admission requires one write intent.");
  }

  const loadedConfig =
    dependencies.loadedConfig ?? (await loadCanonicalProjectConfig(root));
  if (loadedConfig.valid !== true) {
    return denied(route, null, "POLICY_STOP");
  }
  const writeClass = classifyWriteIntent(loadedConfig, intent);
  const intentBinding = bindIntent(intent, writeClass);

  if (writeClass === "runtime_audit_write") {
    return admitted(route, writeClass, false);
  }
  let interceptor;
  let interceptorDigest;
  try {
    interceptor =
      dependencies.hardWriteInterceptor ?? createHardWriteInterceptor(root);
    interceptorDigest = hardWriteInterceptorDigest(interceptor, root);
  } catch {
    return denied(route, writeClass, "HARD_WRITE_INTERCEPTION_REQUIRED", true);
  }
  const sourceWriteBinding = {
    configDigest: loadedConfig.config_digest,
    configVersion: loadedConfig.config.config_version,
    intentDigest: intentBinding.intent_digest,
    intentPath: intentBinding.intent_path,
    interceptor,
    interceptorDigest,
    modeVersion: loadedConfig.config.mode_version,
    root: path.resolve(root),
  };
  if (writeClass === "authority_write") {
    if (!rule.authority) {
      return denied(route, writeClass, "WRITE_CLASS_NOT_ALLOWED");
    }
    return pathAllowed(rule, intent, writeClass)
      ? admitted(route, writeClass, false, {
          ...intentBinding,
          config_version: loadedConfig.config.config_version,
          hard_write_interceptor_digest: interceptorDigest,
          mode_version: loadedConfig.config.mode_version,
          project_config_digest: loadedConfig.config_digest,
        }, sourceWriteBinding)
      : denied(route, writeClass, "WRITE_PATH_NOT_ALLOWED");
  }
  if (!rule.gated.includes(writeClass)) {
    return denied(route, writeClass, "WRITE_CLASS_NOT_ALLOWED");
  }
  if (!pathAllowed(rule, intent, writeClass)) {
    return denied(route, writeClass, "WRITE_PATH_NOT_ALLOWED");
  }
  if (typeof runId !== "string" || !RUN_IDENTIFIER.test(runId)) {
    return denied(route, writeClass, "OPEN-LOOP-AUTHORITY", true);
  }
  if (typeof operation !== "string" || !rule.operations.includes(operation)) {
    return denied(route, writeClass, "OPERATION_NOT_ALLOWED", true);
  }
  if (typeof intent.operation === "string" && intent.operation !== operation) {
    return denied(route, writeClass, "OPERATION_BINDING_MISMATCH", true);
  }

  const validateGate =
    dependencies.validateGate ??
    ((input) => createLoopRunController(root).validateGate(input));
  let result;
  try {
    result = await validateGate({ runId, operation, queueItemId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return denied(
      route,
      writeClass,
      /APPROVAL_REQUIRED/iu.test(message) ? "APPROVAL_REQUIRED" : "POLICY_STOP",
      true,
    );
  }
  if (!isAuthorizedGateResult(result, runId, operation)) {
    return denied(route, writeClass, "MUTATION_NOT_AUTHORIZED", true);
  }
  if (result.project_config_digest !== loadedConfig.config_digest) {
    return denied(route, writeClass, "PROJECT_CONFIG_BINDING_MISMATCH", true);
  }
  if (typeof dependencies.validateActionCapability !== "function") {
    return denied(route, writeClass, "CAPABILITY_ATTESTATION_REQUIRED", true);
  }
  const backgroundDispatchId =
    result.confirmed_autonomy_profile === "BACKGROUND"
      ? capturedRequest.backgroundDispatchId
      : null;
  if (
    result.confirmed_autonomy_profile === "BACKGROUND" &&
    (typeof backgroundDispatchId !== "string" ||
      !RUN_IDENTIFIER.test(backgroundDispatchId))
  ) {
    return denied(route, writeClass, "BACKGROUND_DISPATCH_REQUIRED", true);
  }
  let capability;
  try {
    capability = await dependencies.validateActionCapability({
      runId,
      operation,
      writeClass,
      gate: gateEvidence(result, null, intentBinding),
      attestation: capturedRequest.capabilityAttestation ?? null,
      intentBinding,
      backgroundDispatchId,
    });
  } catch {
    return denied(route, writeClass, "CAPABILITY_ATTESTATION_INVALID", true);
  }
  if (
    !isAuthorizedCapabilityResult(
      capability,
      result,
      runId,
      operation,
      intentBinding,
      backgroundDispatchId,
    )
  ) {
    return denied(route, writeClass, "CAPABILITY_ATTESTATION_INVALID", true);
  }
  let backgroundDispatch = null;
  if (result.confirmed_autonomy_profile === "BACKGROUND") {
    if (typeof dependencies.now !== "function") {
      return denied(route, writeClass, "BACKGROUND_DISPATCH_INVALID", true);
    }
    backgroundDispatch = capability.background_dispatch;
    if (
      !isAuthorizedBackgroundDispatch(
        backgroundDispatch,
        backgroundDispatchId,
        result,
        dependencies.now(),
      )
    ) {
      return denied(route, writeClass, "BACKGROUND_DISPATCH_INVALID", true);
    }
  }
  const evidence = gateEvidence(result, capability, intentBinding);
  evidence.config_version = loadedConfig.config.config_version;
  evidence.hard_write_interceptor_digest = interceptorDigest;
  evidence.mode_version = loadedConfig.config.mode_version;
  if (backgroundDispatch !== null) {
    evidence.background_dispatch = {
      dispatch_id: backgroundDispatch.dispatch_id,
      operation: backgroundDispatch.operation,
      queue_item_id: backgroundDispatch.queue_item_id,
      lease_id: backgroundDispatch.lease_id,
      worker_ref: backgroundDispatch.worker_ref,
      worktree_ref: backgroundDispatch.worktree_ref,
      action_run_head_digest: backgroundDispatch.action_run_head_digest,
      expires_at: backgroundDispatch.expires_at,
    };
  }
  return admitted(
    route,
    writeClass,
    true,
    evidence,
    sourceWriteBinding,
  );
}
