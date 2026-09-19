import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_BYTES = 1024 * 1024;
// Directory fsync is best-effort everywhere: NTFS, WSL drvfs/9p, and some
// network mounts reject it, and a rejected directory sync must never turn a
// completed atomic replace into a failure.
const DIRECTORY_SYNC_UNAVAILABLE = new Set([
  "EACCES",
  "EBADF",
  "EINVAL",
  "EISDIR",
  "ENOTSUP",
  "EPERM",
]);
// Windows returns these while another process (editor, antivirus, indexer)
// still holds the destination open; a direct write is the safe fallback.
const RENAME_BUSY = new Set(["EACCES", "EBUSY", "EPERM"]);

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

export function normalizeNewlines(text) {
  return String(text).replace(/\r\n?/g, "\n");
}

export async function readText(target) {
  return normalizeNewlines(await readFile(target, "utf8"));
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

export async function syncDirectory(directory, options = {}) {
  const openDirectory = options.openDirectory ?? ((target) => open(target, "r"));
  let handle;
  try {
    handle = await openDirectory(directory);
    await handle.sync();
    return true;
  } catch (error) {
    if (DIRECTORY_SYNC_UNAVAILABLE.has(error?.code)) return false;
    throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}

export async function writeFileAtomic(root, candidate, content, options = {}) {
  for (const hook of ["assertOwnership", "assertBeforeReplace"]) {
    if (options[hook] !== undefined && typeof options[hook] !== "function") {
      throw new Error(`${hook} must be a function`);
    }
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
  let atomicReplace = true;
  try {
    handle = await open(temp, "wx", options.mode ?? 0o600);
    await handle.writeFile(buffer);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await options.assertOwnership?.();
    await options.assertBeforeReplace?.();
    try {
      await rename(temp, absolute);
    } catch (error) {
      if (!RENAME_BUSY.has(error?.code)) throw error;
      atomicReplace = false;
      await writeFile(absolute, buffer, { mode: options.mode ?? 0o600 });
    }
    const directorySync = await syncDirectory(directory, options);
    return {
      path: absolute,
      bytes: buffer.length,
      durability: { atomicReplace, directorySync, fileSync: true },
    };
  } finally {
    await handle?.close().catch(() => {});
    await rm(temp, { force: true }).catch(() => {});
  }
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
