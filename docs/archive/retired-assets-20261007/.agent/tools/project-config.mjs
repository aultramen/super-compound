import { createHash } from "node:crypto";
import {
  accessSync,
  closeSync,
  constants as fsConstants,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { release as kernelRelease } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createHardWriteInterceptor,
  hardWriteInterceptorDigest,
  readBoundedFile,
  verifyDirectoryDurability,
} from "./file-state.mjs";
import {
  classifyRepositoryWrite,
  evaluateProjectModeTransition,
  loadProjectConfig,
  resolveEffectivePolicy,
} from "./loop-run-model.mjs";
import {
  parseJsonDocument,
  rfc3339UtcSortKey,
  validateValue,
} from "./schema-validator.mjs";

const DEFAULT_CONFIG_FILE = path.join(".agent", "context", "project-config.json");
const DEFAULT_SCHEMA_FILE = path.join(
  ".agent",
  "context",
  "schemas",
  "project-config-v2.schema.json",
);
const DEFAULT_ARTIFACT_SCHEMA_FILE = path.join(
  ".agent",
  "context",
  "schemas",
  "authority-artifact-v2.schema.json",
);
const DEFAULT_MODE_CAPABILITY_FILE = path.join(
  ".agent",
  "context",
  "project-mode-capability.json",
);
const DEFAULT_MODE_CAPABILITY_SCHEMA_FILE = path.join(
  ".agent",
  "context",
  "schemas",
  "project-mode-capability-v2.schema.json",
);
const MAX_CONFIG_BYTES = 256 * 1024;
const MAX_SCHEMA_BYTES = 256 * 1024;
const trustedConfigSnapshots = new WeakMap();
const projectModeCapabilityAuthorities = new WeakMap();
const wslHostVerifiers = new WeakMap();
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const WSL2_KERNEL = /microsoft-standard-WSL2/iu;
const DEFAULT_BWRAP_PATH = "/usr/bin/bwrap";
const MAX_DEFAULT_HOST_ATTESTATION_TTL_MS = 60 * 60 * 1000;
const REQUIRED_ENFORCE_CAPABILITIES = Object.freeze([
  "DURABLE_LOCAL_STATE",
  "HARD_WRITE_INTERCEPTION",
]);
const BACKGROUND_AGGREGATE_FIELDS = Object.freeze([
  "max_workers",
  "max_reserved_tokens",
  "max_reserved_runtime_ms",
  "max_remote_calls",
  "max_reviewers",
]);

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }
  for (const entry of Object.values(value)) {
    deepFreeze(entry);
  }
  return Object.freeze(value);
}

function requireTrustedConfigSnapshot(handle) {
  if (handle === null || typeof handle !== "object") {
    throw new TypeError(
      "POLICY_STOP: canonical project config loader provenance is required.",
    );
  }
  const snapshot = trustedConfigSnapshots.get(handle);
  if (snapshot === undefined) {
    throw new TypeError(
      "POLICY_STOP: canonical project config loader provenance is required.",
    );
  }
  return snapshot;
}

function halted(error) {
  return {
    valid: false,
    config: null,
    effective_mode: "HALTED",
    errors: [error instanceof Error ? error.message : String(error)],
  };
}

function failProjectModeCapability(code) {
  throw new TypeError(`POLICY_STOP: ${code}`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactOptions(value, allowed, code) {
  if (
    !isPlainObject(value) ||
    Object.keys(value).some((field) => !allowed.has(field))
  ) {
    failProjectModeCapability(code);
  }
}

function digestText(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function digestJson(value) {
  return digestText(JSON.stringify(value));
}

function decodeMountInfoPath(value) {
  return value.replace(
    /\\([0-7]{3})/gu,
    (_match, octal) => String.fromCharCode(Number.parseInt(octal, 8)),
  );
}

function findWorkspaceMount(root, mountInfoText) {
  const mounts = [];
  for (const line of mountInfoText.split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(" - ");
    if (separator === -1) continue;
    const before = line.slice(0, separator).split(" ");
    const after = line.slice(separator + 3).split(" ");
    if (before.length < 6 || after.length < 2) continue;
    const mountPoint = decodeMountInfoPath(before[4]);
    const relative = path.relative(mountPoint, root);
    if (relative.startsWith("..") || path.isAbsolute(relative)) continue;
    mounts.push({
      filesystem_type: after[0],
      mount_options: before[5].split(","),
      mount_point: mountPoint,
      mount_source: decodeMountInfoPath(after[1]),
    });
  }
  mounts.sort(
    (left, right) => right.mount_point.length - left.mount_point.length,
  );
  return mounts[0] ?? null;
}

function assertParentTraversal(root) {
  let current = path.parse(root).root;
  for (const part of root.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    accessSync(current, fsConstants.X_OK);
  }
}

function syncDirectoryNow(directory) {
  const flags =
    fsConstants.O_RDONLY |
    (fsConstants.O_DIRECTORY === undefined ? 0 : fsConstants.O_DIRECTORY);
  const descriptor = openSync(directory, flags);
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function defaultWslHostProbe(root) {
  const requestedRoot = path.resolve(root);
  const errors = [];
  let safeRoot = requestedRoot;
  let rootInfo = null;
  let release = "";
  let machineId = "";
  let machineIdInfo = null;
  let bootId = "";
  let mount = null;
  let bwrapPath = DEFAULT_BWRAP_PATH;
  let bwrapInfo = null;
  let bwrapDigest = digestText("unavailable");
  let directorySync = false;
  let verifierDigest = digestText("unavailable");

  try {
    safeRoot = realpathSync(requestedRoot);
    if (safeRoot !== requestedRoot) errors.push("WORKSPACE_ROOT_NOT_CANONICAL");
    rootInfo = statSync(safeRoot);
    if (!rootInfo.isDirectory()) errors.push("WORKSPACE_ROOT_NOT_DIRECTORY");
    assertParentTraversal(safeRoot);
  } catch (error) {
    errors.push(`WORKSPACE_ROOT_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    release = kernelRelease();
    if (!WSL2_KERNEL.test(release)) errors.push("WSL2_KERNEL_REQUIRED");
  } catch (error) {
    errors.push(`KERNEL_IDENTITY_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    const mountInfo = readFileSync("/proc/self/mountinfo", "utf8");
    mount = findWorkspaceMount(safeRoot, mountInfo);
    if (mount === null) errors.push("WORKSPACE_MOUNT_UNAVAILABLE");
    else {
      if (mount.filesystem_type !== "ext4") {
        errors.push(`NATIVE_EXT4_REQUIRED:${mount.filesystem_type}`);
      }
      if (!mount.mount_options.includes("rw")) {
        errors.push("WORKSPACE_MOUNT_NOT_READ_WRITE");
      }
    }
  } catch (error) {
    errors.push(`WORKSPACE_MOUNT_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    machineId = readFileSync("/etc/machine-id", "utf8").trim();
    machineIdInfo = statSync("/etc/machine-id");
    if (
      machineId.length === 0 ||
      machineIdInfo.uid === process.getuid?.() ||
      (machineIdInfo.mode & 0o022) !== 0
    ) {
      errors.push("IMMUTABLE_MACHINE_ID_REQUIRED");
    }
  } catch (error) {
    errors.push(`MACHINE_ID_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    if (!/^[a-f0-9-]{36}$/u.test(bootId)) {
      errors.push("IMMUTABLE_BOOT_ID_REQUIRED");
    }
  } catch (error) {
    errors.push(`BOOT_ID_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    bwrapPath = realpathSync(DEFAULT_BWRAP_PATH);
    bwrapInfo = statSync(bwrapPath);
    if (
      !bwrapInfo.isFile() ||
      bwrapInfo.uid === process.getuid?.() ||
      (bwrapInfo.mode & 0o022) !== 0
    ) {
      errors.push("IMMUTABLE_BWRAP_BINARY_REQUIRED");
    }
    bwrapDigest = digestText(readFileSync(bwrapPath));
  } catch (error) {
    errors.push(`BWRAP_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    syncDirectoryNow(safeRoot);
    directorySync = true;
  } catch (error) {
    errors.push(`DIRECTORY_SYNC_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }
  try {
    verifierDigest = digestText(readFileSync(fileURLToPath(import.meta.url)));
  } catch (error) {
    errors.push(`HOST_VERIFIER_DIGEST_UNAVAILABLE:${error?.code ?? "UNKNOWN"}`);
  }

  const interceptor = createHardWriteInterceptor(safeRoot, { bwrapPath });
  const interceptorDigest = hardWriteInterceptorDigest(interceptor, safeRoot);
  const workspaceRootDigest = digestJson({
    domain: "super-compound.wsl-workspace-root.v1",
    root: safeRoot,
    device: rootInfo?.dev ?? null,
    inode: rootInfo?.ino ?? null,
    filesystem_type: mount?.filesystem_type ?? null,
    mount_point: mount?.mount_point ?? null,
    mount_source: mount?.mount_source ?? null,
  });
  const hostIdentityDigest = digestJson({
    domain: "super-compound.wsl-host-identity.v1",
    kernel_release: release,
    machine_id_digest: digestText(machineId),
    boot_id_digest: digestText(bootId),
    bwrap_digest: bwrapDigest,
  });
  return deepFreeze({
    schema: "wsl_host_identity_v1",
    supported: errors.length === 0,
    errors,
    root: safeRoot,
    kernel_release: release,
    filesystem_type: mount?.filesystem_type ?? "unknown",
    mount_read_write: mount?.mount_options.includes("rw") ?? false,
    directory_sync: directorySync,
    host_ref: `wsl2-${hostIdentityDigest.slice("sha256:".length, 29)}`,
    host_identity_digest: hostIdentityDigest,
    workspace_root_digest: workspaceRootDigest,
    host_verifier_digest: verifierDigest,
    write_interceptor_digest: interceptorDigest,
    bwrap_digest: bwrapDigest,
  });
}

function assertWslHostSnapshot(snapshot, root) {
  if (
    !isPlainObject(snapshot) ||
    snapshot.schema !== "wsl_host_identity_v1" ||
    typeof snapshot.supported !== "boolean" ||
    !Array.isArray(snapshot.errors) ||
    snapshot.errors.some((entry) => typeof entry !== "string") ||
    snapshot.root !== path.resolve(root) ||
    typeof snapshot.kernel_release !== "string" ||
    typeof snapshot.filesystem_type !== "string" ||
    typeof snapshot.mount_read_write !== "boolean" ||
    typeof snapshot.directory_sync !== "boolean" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(snapshot.host_ref ?? "") ||
    !DIGEST.test(snapshot.host_identity_digest ?? "") ||
    !DIGEST.test(snapshot.workspace_root_digest ?? "") ||
    !DIGEST.test(snapshot.host_verifier_digest ?? "") ||
    !DIGEST.test(snapshot.write_interceptor_digest ?? "") ||
    !DIGEST.test(snapshot.bwrap_digest ?? "")
  ) {
    failProjectModeCapability("WSL_HOST_IDENTITY_INVALID");
  }
}

function wslHostCapabilityEvidenceDigest(snapshot, attestation) {
  return digestJson({
    domain: "super-compound.wsl-project-mode-capability-evidence.v1",
    attestation_id: attestation.attestation_id,
    project_root_digest: attestation.project_root_digest,
    workspace_root_digest: attestation.workspace_root_digest,
    project_config_digest: attestation.project_config_digest,
    config_version: attestation.config_version,
    mode_version: attestation.mode_version,
    host_ref: attestation.host_ref,
    host_identity_digest: attestation.host_identity_digest,
    host_verifier_digest: attestation.host_verifier_digest,
    write_interceptor_digest: attestation.write_interceptor_digest,
    bwrap_digest: snapshot.bwrap_digest,
    filesystem_type: attestation.filesystem_type,
    external_write_policy: attestation.external_write_policy,
    capabilities: attestation.capabilities,
    issued_at: attestation.issued_at,
    expires_at: attestation.expires_at,
  });
}

export function createWslHostVerifier(root, options = {}) {
  assertExactOptions(
    options,
    new Set(["probeHost", "verifyDurability"]),
    "WSL_HOST_VERIFIER_OPTIONS_INVALID",
  );
  if (
    (options.probeHost !== undefined &&
      typeof options.probeHost !== "function") ||
    (options.verifyDurability !== undefined &&
      typeof options.verifyDurability !== "function")
  ) {
    failProjectModeCapability("WSL_HOST_VERIFIER_OPTIONS_INVALID");
  }
  const safeRoot = path.resolve(root);
  const probeHost = options.probeHost ?? defaultWslHostProbe;
  const baseline = structuredClone(probeHost(safeRoot));
  assertWslHostSnapshot(baseline, safeRoot);
  const handle = Object.freeze({ schema: "wsl_host_verifier_authority_v1" });
  wslHostVerifiers.set(handle, {
    baseline: deepFreeze(baseline),
    probeHost,
    root: safeRoot,
    verifyDurability:
      options.verifyDurability ??
      ((candidateRoot) => verifyDirectoryDurability(candidateRoot)),
  });
  return handle;
}

export function inspectWslHostVerifier(verifier) {
  const trusted =
    verifier !== null && typeof verifier === "object"
      ? wslHostVerifiers.get(verifier)
      : undefined;
  if (trusted === undefined) {
    failProjectModeCapability("WSL_HOST_VERIFIER_UNTRUSTED");
  }
  return deepFreeze(structuredClone(trusted.baseline));
}

export async function verifyWslHostCapability(verifier, input = {}) {
  const trusted =
    verifier !== null && typeof verifier === "object"
      ? wslHostVerifiers.get(verifier)
      : undefined;
  if (trusted === undefined) {
    failProjectModeCapability("WSL_HOST_VERIFIER_UNTRUSTED");
  }
  const current = structuredClone(trusted.probeHost(trusted.root));
  assertWslHostSnapshot(current, trusted.root);
  if (
    current.supported !== true ||
    JSON.stringify(current) !== JSON.stringify(trusted.baseline)
  ) {
    failProjectModeCapability("WSL_HOST_IDENTITY_CHANGED_OR_UNSUPPORTED");
  }
  if (!isPlainObject(input) || !isPlainObject(input.attestation)) {
    failProjectModeCapability("WSL_HOST_CAPABILITY_INPUT_INVALID");
  }
  const { attestation, config } = input;
  if (
    !isPlainObject(config) ||
    config.risk?.external_write_policy !== "DENY" ||
    attestation.host_ref !== current.host_ref ||
    attestation.host_identity_digest !== current.host_identity_digest ||
    attestation.workspace_root_digest !== current.workspace_root_digest ||
    attestation.host_verifier_digest !== current.host_verifier_digest ||
    attestation.write_interceptor_digest !==
      current.write_interceptor_digest ||
    attestation.filesystem_type !== "ext4" ||
    attestation.external_write_policy !== "DENY" ||
    attestation.config_version !== config.config_version ||
    attestation.mode_version !== config.mode_version ||
    attestation.evidence_digest !==
      wslHostCapabilityEvidenceDigest(current, attestation)
  ) {
    failProjectModeCapability("WSL_HOST_CAPABILITY_BINDING_MISMATCH");
  }
  const issued = Date.parse(attestation.issued_at);
  const expires = Date.parse(attestation.expires_at);
  if (
    !Number.isFinite(issued) ||
    !Number.isFinite(expires) ||
    expires <= issued ||
    expires - issued > MAX_DEFAULT_HOST_ATTESTATION_TTL_MS
  ) {
    failProjectModeCapability("WSL_HOST_CAPABILITY_TTL_INVALID");
  }
  const durability = await trusted.verifyDurability(trusted.root);
  if (
    durability?.directory_sync !== true ||
    current.directory_sync !== true ||
    current.filesystem_type !== "ext4" ||
    current.mount_read_write !== true
  ) {
    failProjectModeCapability("WSL_HOST_DURABILITY_UNVERIFIED");
  }
  return true;
}

export function createWslProjectModeCapabilityAttestation(
  root,
  configText,
  options = {},
) {
  assertExactOptions(
    options,
    new Set(["attestationId", "expiresAt", "issuedAt", "probeHost"]),
    "WSL_HOST_ATTESTATION_OPTIONS_INVALID",
  );
  if (typeof configText !== "string" || configText.length === 0) {
    failProjectModeCapability("WSL_HOST_ATTESTATION_CONFIG_REQUIRED");
  }
  let config;
  try {
    config = JSON.parse(configText);
  } catch {
    failProjectModeCapability("WSL_HOST_ATTESTATION_CONFIG_INVALID");
  }
  const capabilities = requiredEnforceCapabilities(config);
  const issued = Date.parse(options.issuedAt);
  const expires = Date.parse(options.expiresAt);
  if (
    !Number.isSafeInteger(config.config_version) ||
    config.config_version < 1 ||
    !Number.isSafeInteger(config.mode_version) ||
    config.mode_version < 0 ||
    config.risk?.external_write_policy !== "DENY" ||
    typeof options.issuedAt !== "string" ||
    typeof options.expiresAt !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(
      options.attestationId ?? "",
    )
  ) {
    failProjectModeCapability("WSL_HOST_ATTESTATION_CONFIG_INVALID");
  }
  if (
    !Number.isFinite(issued) ||
    !Number.isFinite(expires) ||
    expires <= issued ||
    expires - issued > MAX_DEFAULT_HOST_ATTESTATION_TTL_MS
  ) {
    failProjectModeCapability("WSL_HOST_ATTESTATION_TIME_WINDOW_INVALID");
  }
  const verifier = createWslHostVerifier(root, {
    ...(options.probeHost === undefined
      ? {}
      : { probeHost: options.probeHost }),
  });
  const snapshot = wslHostVerifiers.get(verifier).baseline;
  if (snapshot.supported !== true) {
    failProjectModeCapability("WSL_HOST_IDENTITY_CHANGED_OR_UNSUPPORTED");
  }
  const attestation = {
    schema: "project_mode_capability_v2",
    contract_version: "2.0.0",
    attestation_id: options.attestationId,
    purpose: "PROJECT_MODE_ENFORCE",
    project_root_digest: computeProjectModeCapabilityRootDigest(root),
    workspace_root_digest: snapshot.workspace_root_digest,
    project_config_digest: digestText(configText),
    config_version: config.config_version,
    mode_version: config.mode_version,
    host_ref: snapshot.host_ref,
    host_identity_digest: snapshot.host_identity_digest,
    host_verifier_digest: snapshot.host_verifier_digest,
    write_interceptor_digest: snapshot.write_interceptor_digest,
    filesystem_type: "ext4",
    external_write_policy: "DENY",
    capabilities: [...capabilities],
    issued_at: options.issuedAt,
    expires_at: options.expiresAt,
    evidence_digest: null,
  };
  attestation.evidence_digest = wslHostCapabilityEvidenceDigest(
    snapshot,
    attestation,
  );
  return deepFreeze(attestation);
}

export function computeProjectModeCapabilityRootDigest(root) {
  if (typeof root !== "string" || root.length === 0) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_ROOT_REQUIRED");
  }
  return digestText(
    JSON.stringify({
      domain: "super-compound.project-mode-capability-root.v2",
      root: path.resolve(root),
    }),
  );
}

function assertTimestampWindow(attestation, now) {
  const issuedKey = rfc3339UtcSortKey(attestation.issued_at);
  const expiresKey = rfc3339UtcSortKey(attestation.expires_at);
  const nowKey = rfc3339UtcSortKey(now);
  if (issuedKey === null || expiresKey === null || issuedKey >= expiresKey) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_TIME_WINDOW_INVALID");
  }
  if (nowKey === null) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_CLOCK_INVALID");
  }
  if (nowKey < issuedKey) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_NOT_YET_VALID");
  }
  if (nowKey >= expiresKey) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_EXPIRED");
  }
}

function requiredEnforceCapabilities(config) {
  if (
    !isPlainObject(config) ||
    config.schema !== "project_config_v2" ||
    config.contract_version !== "2.0.0" ||
    config.mode !== "ENFORCE" ||
    !isPlainObject(config.capability_requirements) ||
    !Array.isArray(config.capability_requirements.enforce) ||
    config.capability_requirements.enforce.some(
      (capability) => typeof capability !== "string" || capability.length === 0,
    )
  ) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_CONFIG_INVALID");
  }
  return Object.freeze(
    [...new Set([
      ...config.capability_requirements.enforce,
      ...REQUIRED_ENFORCE_CAPABILITIES,
    ])].sort(),
  );
}

export function createProjectModeCapabilityAuthority(root, options = {}) {
  if (typeof root !== "string" || root.length === 0) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_ROOT_REQUIRED");
  }
  assertExactOptions(
    options,
    new Set(["attestationFile", "schemaFile", "now", "verifyHostAttestation"]),
    "PROJECT_MODE_CAPABILITY_OPTIONS_INVALID",
  );
  if (
    (options.attestationFile !== undefined &&
      (typeof options.attestationFile !== "string" ||
        options.attestationFile.length === 0)) ||
    (options.schemaFile !== undefined &&
      (typeof options.schemaFile !== "string" || options.schemaFile.length === 0)) ||
    (options.now !== undefined && typeof options.now !== "function") ||
    typeof options.verifyHostAttestation !== "function"
  ) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_OPTIONS_INVALID");
  }
  const handle = Object.freeze({
    schema: "project_mode_capability_authority_v2",
  });
  projectModeCapabilityAuthorities.set(handle, {
    root: path.resolve(root),
    attestationFile:
      options.attestationFile ?? DEFAULT_MODE_CAPABILITY_FILE,
    schemaFile: options.schemaFile ?? DEFAULT_MODE_CAPABILITY_SCHEMA_FILE,
    now: options.now ?? (() => new Date().toISOString()),
    verifyHostAttestation: options.verifyHostAttestation,
  });
  return handle;
}

export function createDefaultProjectModeCapabilityAuthority(
  root,
  options = {},
) {
  assertExactOptions(
    options,
    new Set([
      "attestationFile",
      "now",
      "probeHost",
      "schemaFile",
      "verifyDurability",
    ]),
    "DEFAULT_PROJECT_MODE_CAPABILITY_OPTIONS_INVALID",
  );
  const verifier = createWslHostVerifier(root, {
    ...(options.probeHost === undefined
      ? {}
      : { probeHost: options.probeHost }),
    ...(options.verifyDurability === undefined
      ? {}
      : { verifyDurability: options.verifyDurability }),
  });
  return createProjectModeCapabilityAuthority(root, {
    ...(options.attestationFile === undefined
      ? {}
      : { attestationFile: options.attestationFile }),
    ...(options.schemaFile === undefined
      ? {}
      : { schemaFile: options.schemaFile }),
    ...(options.now === undefined ? {} : { now: options.now }),
    verifyHostAttestation: (input) =>
      verifyWslHostCapability(verifier, input),
  });
}

export function assertProjectModeCapabilityAuthority(authority, root) {
  const trusted =
    authority !== null && typeof authority === "object"
      ? projectModeCapabilityAuthorities.get(authority)
      : undefined;
  if (trusted === undefined) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_AUTHORITY_UNTRUSTED");
  }
  if (typeof root !== "string" || trusted.root !== path.resolve(root)) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_AUTHORITY_ROOT_MISMATCH");
  }
  return true;
}

export async function verifyProjectModeCapabilityAuthority(
  authority,
  root,
  input = {},
) {
  assertProjectModeCapabilityAuthority(authority, root);
  assertExactOptions(
    input,
    new Set(["config", "config_digest"]),
    "PROJECT_MODE_CAPABILITY_VERIFICATION_INPUT_INVALID",
  );
  if (
    !Object.hasOwn(input, "config") ||
    !Object.hasOwn(input, "config_digest") ||
    !DIGEST.test(input.config_digest ?? "")
  ) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_VERIFICATION_INPUT_INVALID");
  }
  const trusted = projectModeCapabilityAuthorities.get(authority);
  const requiredCapabilities = requiredEnforceCapabilities(input.config);

  let schemaText;
  let attestationText;
  try {
    [schemaText, attestationText] = await Promise.all([
      readBoundedFile(trusted.root, trusted.schemaFile, {
        encoding: "utf8",
        label: "project mode capability schema",
        maxBytes: MAX_SCHEMA_BYTES,
      }),
      readBoundedFile(trusted.root, trusted.attestationFile, {
        encoding: "utf8",
        label: "project mode capability attestation",
        maxBytes: MAX_CONFIG_BYTES,
      }),
    ]);
  } catch {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_AUTHORITY_UNAVAILABLE");
  }

  let schema;
  try {
    schema = JSON.parse(schemaText);
  } catch {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_SCHEMA_INVALID");
  }
  let attestation;
  try {
    attestation = parseJsonDocument(
      attestationText,
      schema,
      "project mode capability attestation",
    );
  } catch {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_ATTESTATION_INVALID");
  }

  const expectedRootDigest = computeProjectModeCapabilityRootDigest(trusted.root);
  if (attestation.project_root_digest !== expectedRootDigest) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_ROOT_DIGEST_MISMATCH");
  }
  if (attestation.project_config_digest !== input.config_digest) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_CONFIG_DIGEST_MISMATCH");
  }
  if (
    attestation.config_version !== input.config.config_version ||
    attestation.mode_version !== input.config.mode_version ||
    attestation.external_write_policy !==
      input.config.risk?.external_write_policy
  ) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_CONFIG_VERSION_MISMATCH");
  }
  if (
    requiredCapabilities.some(
      (capability) => !attestation.capabilities.includes(capability),
    )
  ) {
    failProjectModeCapability(
      "PROJECT_MODE_CAPABILITY_REQUIRED_CAPABILITY_MISSING",
    );
  }
  assertTimestampWindow(attestation, trusted.now());

  let hostVerified = false;
  try {
    hostVerified =
      (await trusted.verifyHostAttestation(
        deepFreeze({
          attestation: structuredClone(attestation),
          attestation_digest: digestText(attestationText),
          config: structuredClone(input.config),
          project_root_digest: expectedRootDigest,
          project_config_digest: input.config_digest,
          required_capabilities: [...requiredCapabilities],
        }),
      )) === true;
  } catch {
    hostVerified = false;
  }
  if (!hostVerified) {
    failProjectModeCapability(
      "PROJECT_MODE_CAPABILITY_HOST_ATTESTATION_REJECTED",
    );
  }

  let currentSchemaText;
  let currentAttestationText;
  try {
    [currentSchemaText, currentAttestationText] = await Promise.all([
      readBoundedFile(trusted.root, trusted.schemaFile, {
        encoding: "utf8",
        label: "project mode capability schema",
        maxBytes: MAX_SCHEMA_BYTES,
      }),
      readBoundedFile(trusted.root, trusted.attestationFile, {
        encoding: "utf8",
        label: "project mode capability attestation",
        maxBytes: MAX_CONFIG_BYTES,
      }),
    ]);
  } catch {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_AUTHORITY_UNAVAILABLE");
  }
  if (
    currentSchemaText !== schemaText ||
    currentAttestationText !== attestationText
  ) {
    failProjectModeCapability("PROJECT_MODE_CAPABILITY_CHANGED_DURING_VERIFICATION");
  }
  assertTimestampWindow(attestation, trusted.now());
  return true;
}

function validateBackgroundAggregateLayer(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} background aggregate policy must be an object.`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== BACKGROUND_AGGREGATE_FIELDS.length ||
    !BACKGROUND_AGGREGATE_FIELDS.every((field) => Object.hasOwn(value, field))
  ) {
    throw new TypeError(`${name} background aggregate policy fields are invalid.`);
  }
  for (const field of [
    "max_workers",
    "max_reserved_runtime_ms",
    "max_reviewers",
  ]) {
    if (!Number.isSafeInteger(value[field]) || value[field] <= 0) {
      throw new TypeError(`${name} ${field} must be a positive safe integer.`);
    }
  }
  if (
    value.max_reserved_tokens !== null &&
    (!Number.isSafeInteger(value.max_reserved_tokens) ||
      value.max_reserved_tokens <= 0)
  ) {
    throw new TypeError(
      `${name} max_reserved_tokens must be null or a positive safe integer.`,
    );
  }
  if (
    !Number.isSafeInteger(value.max_remote_calls) ||
    value.max_remote_calls < 0
  ) {
    throw new TypeError(`${name} max_remote_calls must be a non-negative safe integer.`);
  }
  return value;
}

export function resolveBackgroundAggregatePolicy({ project, fsd, operation } = {}) {
  const layers = Object.entries({ project, fsd, operation })
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => validateBackgroundAggregateLayer(name, value));
  if (layers.length === 0) {
    throw new TypeError("At least one background aggregate policy layer is required.");
  }
  const minimum = (field) => Math.min(...layers.map((layer) => layer[field]));
  const tokenValues = layers
    .map((layer) => layer.max_reserved_tokens)
    .filter((value) => value !== null);
  return Object.freeze({
    max_workers: minimum("max_workers"),
    max_reserved_tokens:
      tokenValues.length === 0 ? null : Math.min(...tokenValues),
    max_reserved_runtime_ms: minimum("max_reserved_runtime_ms"),
    max_remote_calls: minimum("max_remote_calls"),
    max_reviewers: minimum("max_reviewers"),
  });
}

export async function loadCanonicalProjectConfig(root, options = {}) {
  const safeRoot = path.resolve(root);
  try {
    assertExactOptions(
      options,
      new Set(["configFile", "schemaFile", "modeCapabilityAuthority"]),
      "PROJECT_CONFIG_LOAD_OPTIONS_INVALID",
    );
    if (
      (options.configFile !== undefined &&
        (typeof options.configFile !== "string" || options.configFile.length === 0)) ||
      (options.schemaFile !== undefined &&
        (typeof options.schemaFile !== "string" || options.schemaFile.length === 0))
    ) {
      failProjectModeCapability("PROJECT_CONFIG_LOAD_OPTIONS_INVALID");
    }
  } catch (error) {
    return halted(error);
  }
  const configFile = options.configFile ?? DEFAULT_CONFIG_FILE;
  const schemaFile = options.schemaFile ?? DEFAULT_SCHEMA_FILE;
  let modeCapabilityAuthority = options.modeCapabilityAuthority;
  if (modeCapabilityAuthority === undefined) {
    try {
      modeCapabilityAuthority = createDefaultProjectModeCapabilityAuthority(
        safeRoot,
      );
    } catch (error) {
      return halted(error);
    }
  }

  let schema;
  let schemaText;
  try {
    schemaText = await readBoundedFile(safeRoot, schemaFile, {
      encoding: "utf8",
      label: "project config schema",
      maxBytes: MAX_SCHEMA_BYTES,
    });
    schema = JSON.parse(schemaText);
  } catch (error) {
    return halted(error);
  }

  let configText;
  try {
    configText = await readBoundedFile(safeRoot, configFile, {
      encoding: "utf8",
      label: "project config",
      maxBytes: MAX_CONFIG_BYTES,
    });
  } catch (error) {
    const loaded = loadProjectConfig(null, schema);
    return { valid: false, ...loaded };
  }

  let loaded = loadProjectConfig(configText, schema);
  if (modeCapabilityAuthority !== undefined) {
    try {
      assertProjectModeCapabilityAuthority(
        modeCapabilityAuthority,
        safeRoot,
      );
    } catch (error) {
      return {
        valid: false,
        ...loaded,
        effective_mode: "HALTED",
        errors: [
          ...loaded.errors,
          error instanceof Error ? error.message : String(error),
        ],
      };
    }
  }
  if (
    loaded.config?.mode === "ENFORCE" &&
    loaded.errors.every(
      (error) => error === "ENFORCE requires verified host capability attestation.",
    ) &&
    modeCapabilityAuthority !== undefined
  ) {
    try {
      await verifyProjectModeCapabilityAuthority(
        modeCapabilityAuthority,
        safeRoot,
        {
          config: loaded.config,
          config_digest: loaded.config_digest,
        },
      );
      const [currentSchemaText, currentConfigText] = await Promise.all([
        readBoundedFile(safeRoot, schemaFile, {
          encoding: "utf8",
          label: "project config schema",
          maxBytes: MAX_SCHEMA_BYTES,
        }),
        readBoundedFile(safeRoot, configFile, {
          encoding: "utf8",
          label: "project config",
          maxBytes: MAX_CONFIG_BYTES,
        }),
      ]);
      if (currentSchemaText !== schemaText || currentConfigText !== configText) {
        failProjectModeCapability(
          "PROJECT_MODE_CONFIG_CHANGED_DURING_VERIFICATION",
        );
      }
      loaded = loadProjectConfig(configText, schema, {
        capabilityAttestationVerified: true,
      });
    } catch (error) {
      return {
        valid: false,
        ...loaded,
        effective_mode: "HALTED",
        errors: [
          ...loaded.errors,
          error instanceof Error ? error.message : String(error),
        ],
      };
    }
  }
  const result = {
    valid: loaded.config !== null && loaded.errors.length === 0,
    ...loaded,
  };
  if (result.valid) {
    const snapshot = deepFreeze({
      root: safeRoot,
      config: structuredClone(result.config),
      config_digest: result.config_digest,
      effective_mode: result.effective_mode,
    });
    const handle = deepFreeze({
      ...result,
      config: structuredClone(snapshot.config),
      errors: [...result.errors],
    });
    trustedConfigSnapshots.set(handle, snapshot);
    return handle;
  }
  return result;
}

function resolveProjectExecutionPolicyFromSnapshot(
  snapshot,
  {
    fsd,
    operation,
    human,
    executionMode,
    autonomyProfile,
    writeClass,
  } = {},
  { freshCapabilityVerified = false } = {},
) {
  const canonicalConfig = snapshot.config;
  if (!new Set(["DISABLED", "OBSERVE", "ENFORCE", "HALTED"]).has(executionMode)) {
    throw new TypeError("executionMode is not supported.");
  }
  if (!new Set(["READ_ONLY", "INTERACTIVE", "BACKGROUND"]).has(autonomyProfile)) {
    throw new TypeError("autonomyProfile is not supported.");
  }
  if (
    !new Set([
      "runtime_audit_write",
      "authority_write",
      "implementation_write",
      "external_write",
    ]).has(writeClass)
  ) {
    throw new TypeError("writeClass is not supported.");
  }
  if (executionMode !== snapshot.effective_mode) {
    throw new TypeError(
      "POLICY_STOP: requested mode and canonical effective mode mismatch.",
    );
  }
  if (
    snapshot.effective_mode === "ENFORCE" &&
    !freshCapabilityVerified &&
    (autonomyProfile !== "READ_ONLY" || writeClass !== "runtime_audit_write")
  ) {
    throw new TypeError(
      "POLICY_STOP: fresh project capability verification is required for ENFORCE mutation or dispatch; use resolveFreshProjectExecutionPolicy.",
    );
  }
  const writeCapable = new Set(["implementation_write", "external_write"]).has(
    writeClass,
  );
  if (
    writeClass === "external_write" &&
    canonicalConfig.risk.external_write_policy !== "ALLOWLIST_ONLY"
  ) {
    throw new TypeError(
      "POLICY_STOP: canonical project policy denies external writes.",
    );
  }
  if (executionMode !== "ENFORCE" && writeCapable) {
    throw new TypeError(
      "POLICY_STOP: effective mode does not permit project mutation.",
    );
  }
  if (executionMode !== "ENFORCE" && autonomyProfile === "BACKGROUND") {
    throw new TypeError(
      "POLICY_STOP: effective mode does not permit background dispatch.",
    );
  }
  const autonomyOrder = {
    READ_ONLY: 0,
    INTERACTIVE: 1,
    BACKGROUND: 2,
  };
  if (
    autonomyOrder[autonomyProfile] >
    autonomyOrder[canonicalConfig.risk.maximum_autonomy]
  ) {
    throw new TypeError(
      "POLICY_STOP: requested autonomy exceeds the canonical project maximum.",
    );
  }

  const effective = resolveEffectivePolicy({
    global: canonicalConfig.policy,
    fsd,
    operation,
    human,
  });
  if (
    executionMode === "ENFORCE" &&
    (writeCapable || autonomyProfile === "BACKGROUND") &&
    (!Number.isSafeInteger(effective.max_runtime_minutes) ||
      effective.max_runtime_minutes <= 0)
  ) {
    throw new TypeError(
      "POLICY_STOP: ENFORCE requires finite max_runtime_minutes.",
    );
  }
  if (
    executionMode === "ENFORCE" &&
    autonomyProfile === "BACKGROUND" &&
    (!Number.isSafeInteger(effective.max_no_progress_iterations) ||
      effective.max_no_progress_iterations <= 0)
  ) {
    throw new TypeError(
      "POLICY_STOP: background ENFORCE requires finite max_no_progress_iterations.",
    );
  }
  return effective;
}

async function loadFreshEnforceSnapshot(root, modeCapabilityAuthority) {
  const loaded = await loadCanonicalProjectConfig(root, {
    modeCapabilityAuthority,
  });
  if (loaded.valid !== true || loaded.effective_mode !== "ENFORCE") {
    throw new TypeError(
      `POLICY_STOP: FRESH_PROJECT_CAPABILITY_REQUIRED: ${(
        loaded.errors ?? ["canonical ENFORCE config is unavailable"]
      ).join("; ")}`,
    );
  }
  return requireTrustedConfigSnapshot(loaded);
}

export function resolveProjectExecutionPolicy(loadedConfig, request = {}) {
  return resolveProjectExecutionPolicyFromSnapshot(
    requireTrustedConfigSnapshot(loadedConfig),
    request,
  );
}

export async function resolveFreshProjectExecutionPolicy(root, input = {}) {
  assertExactOptions(
    input,
    new Set([
      "modeCapabilityAuthority",
      "fsd",
      "operation",
      "human",
      "executionMode",
      "autonomyProfile",
      "writeClass",
    ]),
    "FRESH_PROJECT_POLICY_INPUT_INVALID",
  );
  if (!Object.hasOwn(input, "modeCapabilityAuthority")) {
    failProjectModeCapability("FRESH_PROJECT_POLICY_INPUT_INVALID");
  }
  const { modeCapabilityAuthority, ...request } = input;
  const snapshot = await loadFreshEnforceSnapshot(
    root,
    modeCapabilityAuthority,
  );
  return resolveProjectExecutionPolicyFromSnapshot(snapshot, request, {
    freshCapabilityVerified: true,
  });
}

export function classifyWriteIntent(loadedConfig, intent) {
  const snapshot = requireTrustedConfigSnapshot(loadedConfig);
  // Classification is pure routing data; mutation still requires a fresh policy/action gate.
  return classifyRepositoryWrite(
    snapshot.config.write_classification,
    intent,
    { caseSensitive: process.platform !== "win32" },
  );
}

async function assessArtifactExecutionAuthorityFromSnapshot(snapshot, artifact) {
  const safeRoot = snapshot.root;
  if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) {
    return { accepted: false, reason: "REPLAN_REQUIRED" };
  }
  const authority = snapshot.config.artifact_authority;
  if (
    artifact.schema !== "authority_artifact_v2" ||
    artifact.contract_version !== "2.0.0" ||
    artifact.artifact_contract_version !== authority.required_contract_version
  ) {
    return { accepted: false, reason: authority.legacy_action };
  }

  let artifactSchema;
  try {
    const schemaText = await readBoundedFile(
      safeRoot,
      DEFAULT_ARTIFACT_SCHEMA_FILE,
      {
        encoding: "utf8",
        label: "authority artifact schema",
        maxBytes: MAX_SCHEMA_BYTES,
      },
    );
    artifactSchema = JSON.parse(schemaText);
  } catch (error) {
    throw new TypeError(
      `POLICY_STOP: canonical artifact schema is unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const validation = validateValue(artifact, artifactSchema);
  if (
    validation.valid !== true ||
    validation.errors.length !== 0
  ) {
    return { accepted: false, reason: "INVALID_ARTIFACT_AUTHORITY" };
  }
  if (artifact.requires_fresh_verification === true) {
    return { accepted: false, reason: "FRESH_VERIFICATION_REQUIRED" };
  }
  if (!authority.execution_authority_types.includes(artifact.artifact_type)) {
    return { accepted: false, reason: "NOT_EXECUTION_AUTHORITY" };
  }
  const executableStatuses = {
    PRD: new Set(["APPROVED"]),
    FSD: new Set(["APPROVED"]),
    ISSUE: new Set(["READY", "VERIFIED"]),
    EVAL: new Set(["APPROVED", "FROZEN"]),
  };
  if (!executableStatuses[artifact.artifact_type].has(artifact.status)) {
    return { accepted: false, reason: "AUTHORITY_STATUS_REQUIRED" };
  }
  return { accepted: true, reason: null };
}

export async function assessArtifactExecutionAuthority(loadedConfig, artifact) {
  const snapshot = requireTrustedConfigSnapshot(loadedConfig);
  if (snapshot.effective_mode === "ENFORCE") {
    return {
      accepted: false,
      reason: "FRESH_PROJECT_CAPABILITY_REQUIRED",
    };
  }
  return assessArtifactExecutionAuthorityFromSnapshot(snapshot, artifact);
}

export async function assessFreshArtifactExecutionAuthority(root, input = {}) {
  assertExactOptions(
    input,
    new Set(["modeCapabilityAuthority", "artifact"]),
    "FRESH_ARTIFACT_AUTHORITY_INPUT_INVALID",
  );
  if (
    !Object.hasOwn(input, "modeCapabilityAuthority") ||
    !Object.hasOwn(input, "artifact")
  ) {
    failProjectModeCapability("FRESH_ARTIFACT_AUTHORITY_INPUT_INVALID");
  }
  const snapshot = await loadFreshEnforceSnapshot(
    root,
    input.modeCapabilityAuthority,
  );
  return assessArtifactExecutionAuthorityFromSnapshot(snapshot, input.artifact);
}

export const PROJECT_CONFIG_PATH = DEFAULT_CONFIG_FILE.replaceAll("\\", "/");
export { evaluateProjectModeTransition };
