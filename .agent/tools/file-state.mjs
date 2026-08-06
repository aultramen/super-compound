import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_MAX_BYTES = 1024 * 1024;
const TRANSIENT_LOCK_CODES = new Set(["EBUSY", "EPERM"]);
const DURABILITY_FAILURE_STAGES = new Set([
  "BEFORE_TEMP_OPEN",
  "BEFORE_FILE_SYNC",
  "BEFORE_ATOMIC_REPLACE",
  "BEFORE_DIRECTORY_SYNC",
  "BEFORE_APPEND_FILE_SYNC",
]);
const hardWriteInterceptors = new WeakMap();
const HARD_WRITE_SANDBOX_POLICY = Object.freeze({
  schema: "hard_source_write_interceptor_v1",
  namespaces: Object.freeze(["user", "pid", "uts", "ipc"]),
  repository_mount: "READ_ONLY",
  system_mount: "READ_ONLY",
  temp_mount: "PRIVATE_TMPFS",
  environment: "CLEARED",
});

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

async function injectDurabilityFailure(options, stage, target) {
  if (options.durabilityFault === undefined) return;
  if (typeof options.durabilityFault !== "function") {
    throw new TypeError("durabilityFault must be a function");
  }
  await options.durabilityFault(stage, Object.freeze({ target }));
}

export function createDurabilityFailureInjector(failingStage) {
  if (!DURABILITY_FAILURE_STAGES.has(failingStage)) {
    throw new TypeError(`Unsupported durability failure stage: ${String(failingStage)}`);
  }
  return Object.freeze(async (stage) => {
    if (stage !== failingStage) return;
    const error = new Error(`DURABILITY_FAILURE_INJECTED: ${stage}`);
    error.code = "EDURABILITYINJECTED";
    throw error;
  });
}

export function createHardWriteInterceptor(root, options = {}) {
  assertPlainObject(options, "Hard write interceptor options");
  if (Object.keys(options).some((field) => field !== "bwrapPath")) {
    throw new TypeError("Hard write interceptor options contain an unsupported field");
  }
  const safeRoot = path.resolve(root);
  const bwrapPath = options.bwrapPath ?? "/usr/bin/bwrap";
  if (!path.isAbsolute(bwrapPath) || /[\0\r\n]/u.test(bwrapPath)) {
    throw new TypeError("Hard write interceptor bwrapPath must be an absolute safe path");
  }
  const interceptorDigest = digestJson({
    domain: "super-compound.hard-source-write-interceptor.v1",
    root: safeRoot,
    bwrap_path: bwrapPath,
    policy: HARD_WRITE_SANDBOX_POLICY,
  });
  const handle = Object.freeze({
    schema: "hard_source_write_interceptor_authority_v1",
    interceptor_digest: interceptorDigest,
  });
  hardWriteInterceptors.set(handle, {
    bwrapPath,
    interceptorDigest,
    root: safeRoot,
  });
  return handle;
}

export function assertHardWriteInterceptor(interceptor, root) {
  const trusted =
    interceptor !== null && typeof interceptor === "object"
      ? hardWriteInterceptors.get(interceptor)
      : undefined;
  if (trusted === undefined) {
    throw new TypeError("HARD_WRITE_INTERCEPTOR_UNTRUSTED");
  }
  if (path.resolve(root) !== trusted.root) {
    throw new TypeError("HARD_WRITE_INTERCEPTOR_ROOT_MISMATCH");
  }
  return true;
}

export function hardWriteInterceptorDigest(interceptor, root) {
  assertHardWriteInterceptor(interceptor, root);
  return hardWriteInterceptors.get(interceptor).interceptorDigest;
}

export function buildHardWriteSandboxCommand(
  interceptor,
  input = {},
) {
  const trusted =
    interceptor !== null && typeof interceptor === "object"
      ? hardWriteInterceptors.get(interceptor)
      : undefined;
  if (trusted === undefined) {
    throw new TypeError("HARD_WRITE_INTERCEPTOR_UNTRUSTED");
  }
  assertPlainObject(input, "Intercepted command");
  const allowed = new Set(["args", "command", "cwd"]);
  if (Object.keys(input).some((field) => !allowed.has(field))) {
    throw new TypeError("Intercepted command contains an unsupported field");
  }
  if (
    typeof input.command !== "string" ||
    !path.isAbsolute(input.command) ||
    /[\0\r\n]/u.test(input.command)
  ) {
    throw new TypeError("Intercepted command must be one absolute executable path");
  }
  if (
    !Array.isArray(input.args ?? []) ||
    (input.args ?? []).some(
      (argument) =>
        typeof argument !== "string" || /[\0\r\n]/u.test(argument),
    )
  ) {
    throw new TypeError("Intercepted command args must be safe strings");
  }
  const cwd = path.resolve(input.cwd ?? trusted.root);
  const relativeCwd = path.relative(trusted.root, cwd);
  if (relativeCwd.startsWith("..") || path.isAbsolute(relativeCwd)) {
    throw new TypeError("Intercepted command cwd escapes the repository root");
  }
  return deepFreeze({
    executable: trusted.bwrapPath,
    args: [
      "--die-with-parent",
      "--new-session",
      "--unshare-user",
      "--unshare-pid",
      "--unshare-uts",
      "--unshare-ipc",
      "--ro-bind",
      "/",
      "/",
      "--dev",
      "/dev",
      "--proc",
      "/proc",
      "--tmpfs",
      "/tmp",
      "--ro-bind",
      trusted.root,
      trusted.root,
      "--clearenv",
      "--setenv",
      "HOME",
      "/tmp",
      "--setenv",
      "TMPDIR",
      "/tmp",
      "--setenv",
      "PATH",
      "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      "--chdir",
      cwd,
      "--",
      input.command,
      ...(input.args ?? []),
    ],
    interceptor_digest: trusted.interceptorDigest,
  });
}

function requireSafeByteLimit(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("maxBytes must be a positive safe integer");
  }
  return value;
}

function asBuffer(content, encoding = "utf8") {
  if (Buffer.isBuffer(content)) return content;
  if (ArrayBuffer.isView(content)) {
    return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  }
  return Buffer.from(String(content), encoding);
}

export async function resolveRepositoryPath(root, candidate, options = {}) {
  const label = options.label ?? "Path";
  if (typeof candidate !== "string" || !candidate.trim() || /[\0\r\n]/.test(candidate)) {
    throw new Error(`${label} is required and must not contain control characters`);
  }

  const safeRoot = path.resolve(root);
  const absolute = path.resolve(safeRoot, candidate);
  const relative = path.relative(safeRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} resolves outside repository root`);
  }
  if (!relative && options.allowRoot !== true) {
    throw new Error(`${label} must resolve below repository root`);
  }

  let current = safeRoot;
  const rootInfo = await lstat(current).catch(() => null);
  if (!rootInfo?.isDirectory()) {
    throw new Error(`Repository root does not exist: ${safeRoot}`);
  }
  if (rootInfo.isSymbolicLink()) {
    throw new Error(`Repository root is a symlink: ${safeRoot}`);
  }

  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = await lstat(current).catch(() => null);
    if (info?.isSymbolicLink()) {
      throw new Error(`${label} contains a symlink: ${current}`);
    }
  }
  return absolute;
}

export async function readBoundedFile(root, candidate, options = {}) {
  const maxBytes = requireSafeByteLimit(options.maxBytes ?? DEFAULT_MAX_BYTES);
  const absolute = await resolveRepositoryPath(root, candidate, options);
  const openFile = options.openFile ?? ((target) => open(target, "r"));
  let handle;
  try {
    handle = await openFile(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`File does not exist: ${absolute}`);
    }
    throw error;
  }
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      throw new Error(`File does not exist: ${absolute}`);
    }
    const content = Buffer.allocUnsafe(maxBytes + 1);
    let totalBytes = 0;
    while (totalBytes < content.length) {
      const { bytesRead } = await handle.read(
        content,
        totalBytes,
        content.length - totalBytes,
        totalBytes,
      );
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
    if (totalBytes > maxBytes) {
      throw new Error(`File exceeds ${maxBytes} bytes: ${absolute}`);
    }
    const bounded = content.subarray(0, totalBytes);
    return options.encoding ? bounded.toString(options.encoding) : bounded;
  } finally {
    await handle.close();
  }
}

async function syncDirectory(directory, options = {}) {
  let handle;
  try {
    handle = await open(directory, "r");
    await injectDurabilityFailure(
      options,
      "BEFORE_DIRECTORY_SYNC",
      directory,
    );
    await handle.sync();
    return true;
  } catch (error) {
    if (
      process.platform !== "linux" &&
      ["EACCES", "EBADF", "EISDIR", "EINVAL", "ENOTSUP", "EPERM"].includes(
        error?.code,
      )
    ) {
      return false;
    }
    throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}

export async function writeFileAtomic(root, candidate, content, options = {}) {
  if (
    options.assertOwnership !== undefined &&
    typeof options.assertOwnership !== "function"
  ) {
    throw new Error("assertOwnership must be a function");
  }
  if (
    options.assertBeforeReplace !== undefined &&
    typeof options.assertBeforeReplace !== "function"
  ) {
    throw new Error("assertBeforeReplace must be a function");
  }
  const maxBytes = requireSafeByteLimit(options.maxBytes ?? DEFAULT_MAX_BYTES);
  const absolute = await resolveRepositoryPath(root, candidate, options);
  const directory = path.dirname(absolute);
  await mkdir(directory, { recursive: true });
  await resolveRepositoryPath(root, absolute, options);

  const buffer = asBuffer(content, options.encoding);
  if (buffer.length > maxBytes) {
    throw new Error(`Atomic write exceeds ${maxBytes} bytes: ${absolute}`);
  }
  const temp = path.join(
    directory,
    `.${path.basename(absolute)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    await injectDurabilityFailure(options, "BEFORE_TEMP_OPEN", temp);
    handle = await open(temp, "wx", options.mode ?? 0o600);
    await handle.writeFile(buffer);
    await injectDurabilityFailure(options, "BEFORE_FILE_SYNC", temp);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await options.assertOwnership?.();
    await options.assertBeforeReplace?.();
    await injectDurabilityFailure(
      options,
      "BEFORE_ATOMIC_REPLACE",
      absolute,
    );
    await rename(temp, absolute);
    const directorySync = await syncDirectory(directory, options);
    return {
      path: absolute,
      bytes: buffer.length,
      durability: { atomicReplace: true, directorySync, fileSync: true },
    };
  } finally {
    await handle?.close().catch(() => {});
    await rm(temp, { force: true }).catch(() => {});
  }
}

export async function appendFileDurable(root, candidate, content, options = {}) {
  const maxBytes = requireSafeByteLimit(options.maxBytes ?? DEFAULT_MAX_BYTES);
  const absolute = await resolveRepositoryPath(root, candidate, options);
  const directory = path.dirname(absolute);
  await mkdir(directory, { recursive: true });
  await resolveRepositoryPath(root, absolute, options);

  const buffer = asBuffer(content, options.encoding);
  if (buffer.length > maxBytes) {
    throw new Error(`Append exceeds ${maxBytes} bytes: ${absolute}`);
  }
  return withOwnerLock(
    root,
    `${absolute}.append.lock`,
    async ({ assertOwnership }) => {
      const handle = await open(absolute, "a+", options.mode ?? 0o600);
      try {
        const current = await handle.stat();
        if (!current.isFile()) {
          throw new Error(`Append target is not a regular file: ${absolute}`);
        }
        if (current.size + buffer.length > maxBytes) {
          throw new Error(`Append exceeds ${maxBytes} bytes: ${absolute}`);
        }
        await assertOwnership();
        await handle.writeFile(buffer);
        await injectDurabilityFailure(
          options,
          "BEFORE_APPEND_FILE_SYNC",
          absolute,
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
      const directorySync = await syncDirectory(directory, options);
      return {
        path: absolute,
        bytes: buffer.length,
        durability: { atomicReplace: false, directorySync, fileSync: true },
      };
    },
    options.lockOptions,
  );
}

export async function verifyDirectoryDurability(root, options = {}) {
  assertPlainObject(options, "Directory durability options");
  if (Object.keys(options).some((field) => field !== "durabilityFault")) {
    throw new TypeError("Directory durability options contain an unsupported field");
  }
  const safeRoot = await resolveRepositoryPath(root, root, {
    allowRoot: true,
    label: "Directory durability root",
  });
  const directorySync = await syncDirectory(safeRoot, options);
  if (directorySync !== true) {
    throw new Error("DURABILITY_DIRECTORY_SYNC_UNAVAILABLE");
  }
  return Object.freeze({
    directory_sync: true,
    platform: process.platform,
    root: safeRoot,
  });
}

export function assertExpectedVersion(actual, expected, label = "version") {
  if (!Number.isSafeInteger(actual) || actual < 0) {
    throw new Error(`${label} is not a valid current version`);
  }
  if (!Number.isSafeInteger(expected) || expected < 0) {
    throw new Error(`expected ${label} must be a non-negative safe integer`);
  }
  if (actual !== expected) {
    throw new Error(`CAS conflict for ${label}: expected ${expected}, found ${actual}`);
  }
  return actual;
}

async function reclaimStaleLock(lockPath, staleMs, now) {
  const info = await lstat(lockPath).catch(() => null);
  if (!info) return true;
  if (info.isSymbolicLink()) {
    throw new Error(`Refusing symlinked owner lock: ${lockPath}`);
  }
  if (!info.isDirectory()) {
    throw new Error(`Owner lock is not a directory: ${lockPath}`);
  }
  const ownerPath = path.join(lockPath, "owner");
  const ownerInfo = await lstat(ownerPath).catch(() => null);
  if (ownerInfo?.isSymbolicLink()) {
    throw new Error(`Refusing symlinked owner token: ${ownerPath}`);
  }
  if (ownerInfo && !ownerInfo.isFile()) {
    throw new Error(`Owner token is not a regular file: ${ownerPath}`);
  }
  if (now() - (ownerInfo?.mtimeMs ?? info.mtimeMs) <= staleMs) return false;

  const stalePath = `${lockPath}.stale.${randomUUID()}`;
  try {
    await rename(lockPath, stalePath);
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    if (["EACCES", "EPERM"].includes(error?.code)) return false;
    throw error;
  }
  await rm(stalePath, { recursive: true, force: true });
  return true;
}

async function renewOwnerLease(ownerPath, ownerToken, now) {
  const handle = await open(ownerPath, "r+");
  try {
    const currentOwner = await handle.readFile("utf8");
    if (currentOwner !== ownerToken) {
      throw new Error(`Owner lock was lost: ${path.dirname(ownerPath)}`);
    }
    const renewedAt = new Date(now());
    await handle.utimes(renewedAt, renewedAt);
  } finally {
    await handle.close();
  }
}

async function assertOwnerLease(ownerPath, ownerToken) {
  const info = await lstat(ownerPath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) {
    throw new Error(`Owner lock was lost: ${path.dirname(ownerPath)}`);
  }
  const handle = await open(ownerPath, "r");
  try {
    const currentOwner = await handle.readFile("utf8");
    if (currentOwner !== ownerToken) {
      throw new Error(`Owner lock was lost: ${path.dirname(ownerPath)}`);
    }
  } finally {
    await handle.close();
  }
}

function scheduleHeartbeatWithTimer(task, intervalMs) {
  const timer = setInterval(() => {
    void task();
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export async function withOwnerLock(root, lockCandidate, operation, options = {}) {
  if (typeof operation !== "function") {
    throw new Error("Owner lock operation must be a function");
  }
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retryMs = options.retryMs ?? 10;
  const staleMs = options.staleMs ?? 60_000;
  const heartbeatMs = options.heartbeatMs ?? Math.max(1, Math.floor(staleMs / 3));
  for (const [label, value, allowZero] of [
    ["timeoutMs", timeoutMs, true],
    ["retryMs", retryMs, true],
    ["staleMs", staleMs, false],
    ["heartbeatMs", heartbeatMs, false],
  ]) {
    if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
      throw new Error(`${label} must be a ${allowZero ? "non-negative" : "positive"} safe integer`);
    }
  }

  const lockPath = await resolveRepositoryPath(root, lockCandidate, {
    label: "Owner lock path",
  });
  await mkdir(path.dirname(lockPath), { recursive: true });
  await resolveRepositoryPath(root, lockPath, { label: "Owner lock path" });

  const mkdirLock = options.mkdirLock ?? ((candidate) => mkdir(candidate));
  const wait = options.wait ?? delay;
  const now = options.now ?? Date.now;
  const scheduleHeartbeat = options.scheduleHeartbeat ?? scheduleHeartbeatWithTimer;
  if (typeof scheduleHeartbeat !== "function") {
    throw new Error("scheduleHeartbeat must be a function");
  }
  const deadline = now() + timeoutMs;
  const ownerToken = randomUUID();
  const ownerPath = path.join(lockPath, "owner");

  while (true) {
    let created = false;
    try {
      await mkdirLock(lockPath);
      created = true;
      const ownerHandle = await open(ownerPath, "wx", 0o600);
      try {
        await ownerHandle.writeFile(ownerToken, "utf8");
        await ownerHandle.sync();
      } finally {
        await ownerHandle.close();
      }
      break;
    } catch (error) {
      if (created) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
      }
      const code = error?.code;
      if (code === "EEXIST") {
        if (await reclaimStaleLock(lockPath, staleMs, now)) continue;
      } else if (!TRANSIENT_LOCK_CODES.has(code)) {
        throw error;
      }
      if (now() >= deadline) {
        if (code !== "EEXIST") throw error;
        throw new Error(`Timed out waiting for owner lock: ${lockPath}`);
      }
      await wait(retryMs);
    }
  }

  let heartbeatFailure;
  let heartbeatPending = Promise.resolve();
  const renewHeartbeat = () => {
    heartbeatPending = heartbeatPending
      .then(() => renewOwnerLease(ownerPath, ownerToken, now))
      .catch((error) => {
        heartbeatFailure ??= error;
      });
    return heartbeatPending;
  };
  let stopHeartbeat;
  const assertOwnership = async () => {
    await heartbeatPending;
    if (heartbeatFailure) {
      throw new Error(`Owner lock was lost: ${lockPath}`, {
        cause: heartbeatFailure,
      });
    }
    await assertOwnerLease(ownerPath, ownerToken);
  };

  let hasPrimaryFailure = false;
  try {
    stopHeartbeat = scheduleHeartbeat(renewHeartbeat, heartbeatMs);
    if (typeof stopHeartbeat !== "function") {
      throw new Error("scheduleHeartbeat must return a stop function");
    }
    const result = await operation({ assertOwnership, lockPath, ownerToken });
    await heartbeatPending;
    if (heartbeatFailure) throw heartbeatFailure;
    return result;
  } catch (error) {
    hasPrimaryFailure = true;
    throw error;
  } finally {
    let completionFailure;
    let hasCompletionFailure = false;
    const recordCompletionFailure = (error) => {
      if (!hasCompletionFailure) {
        completionFailure = error;
        hasCompletionFailure = true;
      }
    };

    try {
      stopHeartbeat?.();
    } catch (error) {
      recordCompletionFailure(error);
    }
    try {
      await heartbeatPending;
      if (heartbeatFailure) recordCompletionFailure(heartbeatFailure);
    } catch (error) {
      recordCompletionFailure(error);
    }
    try {
      const currentOwner = await readFile(ownerPath, "utf8").catch(() => null);
      if (currentOwner === ownerToken) {
        await rm(lockPath, { recursive: true, force: true });
        await syncDirectory(path.dirname(lockPath));
      }
    } catch (error) {
      recordCompletionFailure(error);
    }
    if (!hasPrimaryFailure && hasCompletionFailure) {
      throw completionFailure;
    }
  }
}
