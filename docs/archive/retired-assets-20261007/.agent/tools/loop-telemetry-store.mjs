import { createHash } from "node:crypto";
import { lstat, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import {
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import {
  assertPrivacySafeRuntimeValue,
  assertSanitizedTelemetryRecord,
  buildWholeRunRetentionPlan,
} from "./loop-telemetry-model.mjs";

const MAX_INDEX_BYTES = 512 * 1024;
const TELEMETRY_FIELDS = Object.freeze([
  "enabled",
  "persistence_required",
  "redaction_revision",
  "retention_days",
  "max_file_bytes",
  "purpose",
  "classification",
  "acl",
  "rotation",
  "disposition",
  "pricing_revision",
  "pricing_digest",
]);
const RETENTION_AUTHORITY_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "run_id",
  "event_head_digest",
  "terminal_status",
  "terminal_at",
  "retention",
  "legal_hold",
  "quarantined",
  "reconciliation_outcome",
]);
const RETENTION_PLAN_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "run_id",
  "event_head_digest",
  "telemetry_index_digest",
  "authority_digest",
  "terminal_status",
  "terminal_at",
  "evaluated_at",
  "retention_days",
  "eligible_at",
  "legal_hold",
  "quarantined",
  "reconciliation_outcome",
  "disposition",
  "apply_allowed",
  "reason",
]);
const TERMINAL_STATES = new Set([
  "SUCCESS",
  "BLOCKED",
  "NO_PROGRESS",
  "BUDGET_EXHAUSTED",
  "TIMEOUT",
  "POLICY_STOP",
  "FATAL",
  "UNKNOWN_OUTCOME",
  "CANCELLED",
]);
const RECONCILIATION_OUTCOMES = new Set([
  null,
  "APPLIED",
  "NOT_APPLIED",
  "PARTIALLY_APPLIED",
  "INDETERMINATE",
]);
const SEGMENT_FILE_PATTERN = /^segment-\d{4}\.jsonl$/u;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactFields(value, fields) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function validIdentifier(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)
  );
}

function validDigest(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function validUtcDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value
  );
}

function digestBytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function freezeDeep(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

function validateTelemetryPolicy(telemetry) {
  if (
    !hasExactFields(telemetry, TELEMETRY_FIELDS) ||
    telemetry.enabled !== true ||
    telemetry.persistence_required !== true ||
    telemetry.purpose !== "LOOP_RUNTIME_OPERATIONAL_ASSURANCE" ||
    telemetry.classification !== "INTERNAL_OPERATIONAL_NO_RAW_CONTENT" ||
    telemetry.disposition !== "DELETE_DERIVED_TELEMETRY" ||
    !validIdentifier(telemetry.redaction_revision) ||
    !Number.isSafeInteger(telemetry.retention_days) ||
    telemetry.retention_days < 1 ||
    !Number.isSafeInteger(telemetry.max_file_bytes) ||
    telemetry.max_file_bytes < 1024 ||
    !validIdentifier(telemetry.pricing_revision) ||
    !validDigest(telemetry.pricing_digest) ||
    !hasExactFields(telemetry.acl, [
      "read_roles",
      "write_roles",
      "export_roles",
    ]) ||
    !hasExactFields(telemetry.rotation, ["strategy", "max_segments"]) ||
    telemetry.rotation.strategy !== "PER_RUN_SEGMENTED_JSONL" ||
    !Number.isSafeInteger(telemetry.rotation.max_segments) ||
    telemetry.rotation.max_segments < 1 ||
    telemetry.rotation.max_segments > 256
  ) {
    throw new TypeError("POLICY_STOP: telemetry configuration is incomplete or invalid.");
  }
  for (const roles of Object.values(telemetry.acl)) {
    if (
      !Array.isArray(roles) ||
      roles.length > 256 ||
      roles.some((role) => !validIdentifier(role)) ||
      new Set(roles).size !== roles.length
    ) {
      throw new TypeError("POLICY_STOP: telemetry ACL is invalid.");
    }
  }
}

async function authorize(telemetry, operation, role, verifyAccess) {
  validateTelemetryPolicy(telemetry);
  const aclField = {
    READ: "read_roles",
    WRITE: "write_roles",
    EXPORT: "export_roles",
    PRUNE: "write_roles",
  }[operation];
  if (aclField === undefined) {
    throw new Error(`POLICY_STOP: unsupported telemetry operation ${operation}.`);
  }
  if (!validIdentifier(role) || !telemetry.acl[aclField].includes(role)) {
    throw new Error(`POLICY_STOP: telemetry ACL denies ${operation}.`);
  }
  if (
    typeof verifyAccess !== "function" ||
    (await verifyAccess(
      freezeDeep({
        operation,
        role,
        purpose: telemetry.purpose,
        classification: telemetry.classification,
      }),
    )) !== true
  ) {
    throw new Error(`POLICY_STOP: telemetry host access attestation denies ${operation}.`);
  }
}

function telemetryPaths(runId) {
  if (!validIdentifier(runId)) {
    throw new TypeError("Telemetry run ID is invalid.");
  }
  const directory = path.join(".scratch", "loop-runs", runId, "telemetry");
  return {
    directory,
    index: path.join(directory, "index.json"),
    lock: path.join(".scratch", "loop-runs", runId, "telemetry.owner.lock"),
  };
}

function segmentFileName(number) {
  return `segment-${String(number).padStart(4, "0")}.jsonl`;
}

function expectedProjectionFiles(segments) {
  return new Set(["index.json", ...segments.map(({ number }) => segmentFileName(number))]);
}

async function listProjectionEntries(root, paths) {
  const directory = await resolveRepositoryPath(root, paths.directory, {
    label: "telemetry projection directory",
  });
  return readdir(directory, { withFileTypes: true });
}

async function assertExactProjectionFiles(root, paths, segments) {
  const expected = expectedProjectionFiles(segments);
  const entries = await listProjectionEntries(root, paths);
  const actual = new Set(entries.map(({ name }) => name));
  if (
    entries.some((entry) =>
      !expected.has(entry.name) || !entry.isFile() || entry.isSymbolicLink(),
    ) ||
    actual.size !== expected.size ||
    [...expected].some((name) => !actual.has(name))
  ) {
    throw new Error("Telemetry projection contains a missing, unexpected, or unindexed file.");
  }
}

async function removeObsoleteSegments(root, paths, segments, assertOwnership) {
  const expected = expectedProjectionFiles(segments);
  const entries = await listProjectionEntries(root, paths);
  for (const entry of entries) {
    if (expected.has(entry.name) || !SEGMENT_FILE_PATTERN.test(entry.name)) continue;
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error("Telemetry obsolete segment is not a safe regular file.");
    }
    const candidate = path.join(paths.directory, entry.name);
    const absolute = await resolveRepositoryPath(root, candidate, {
      label: "obsolete telemetry segment",
    });
    await assertOwnership();
    await rm(absolute, { force: false });
  }
  await assertExactProjectionFiles(root, paths, segments);
}

function validateRecord(record, runId, expectedSequence, previousEventHead = null) {
  assertSanitizedTelemetryRecord(record, {
    run_id: runId,
    expected_sequence: expectedSequence,
  });
  if (record.operational_metric !== null) {
    const expectedEventType =
      record.operational_metric.kind === "EVAL_RELEASE"
        ? "VERIFICATION_PASSED"
        : "OPERATIONAL_METRIC_RECORDED";
    if (
      expectedSequence === 1 ||
      record.operational_metric.bound_run_head_digest !== previousEventHead ||
      record.event_type !== expectedEventType
    ) {
      throw new Error(
        "Telemetry operational metric does not bind the previous projected event head and event type.",
      );
    }
  }
}

function packRecords(runId, records, telemetry) {
  const segments = [];
  let current = [];
  let currentBytes = 0;
  const flush = () => {
    if (current.length === 0) return;
    const number = segments.length + 1;
    const text = current.map(({ line }) => line).join("");
    const segmentPath = path
      .join(
        ".scratch",
        "loop-runs",
        runId,
        "telemetry",
        `segment-${String(number).padStart(4, "0")}.jsonl`,
      )
      .replaceAll("\\", "/");
    segments.push({
      number,
      path: segmentPath,
      text,
      bytes: Buffer.byteLength(text),
      digest: digestBytes(text),
      record_count: current.length,
      first_sequence: current[0].record.sequence,
      last_sequence: current.at(-1).record.sequence,
    });
    current = [];
    currentBytes = 0;
  };

  records.forEach((record, index) => {
    validateRecord(
      record,
      runId,
      index + 1,
      index === 0 ? null : records[index - 1].event_head_digest,
    );
    const line = `${JSON.stringify(record)}\n`;
    const bytes = Buffer.byteLength(line);
    if (bytes > telemetry.max_file_bytes) {
      throw new Error("POLICY_STOP: one telemetry record exceeds the segment byte limit.");
    }
    if (currentBytes > 0 && currentBytes + bytes > telemetry.max_file_bytes) {
      flush();
    }
    current.push({ line, record });
    currentBytes += bytes;
  });
  flush();
  if (segments.length > telemetry.rotation.max_segments) {
    throw new Error("POLICY_STOP: telemetry rotation exhausted max_segments.");
  }
  return segments;
}

function publicSegment(segment) {
  const { text: ignored, ...metadata } = segment;
  return metadata;
}

async function persistProjectionLocked(
  root,
  { runId, records, telemetry, paths, assertOwnership },
  dependencies,
) {
  const segments = packRecords(runId, records, telemetry);
  const writeAtomic = dependencies.writeFileAtomic ?? writeFileAtomic;
  for (const segment of segments) {
    await writeAtomic(root, segment.path, segment.text, {
      assertOwnership,
      label: "telemetry segment",
      maxBytes: telemetry.max_file_bytes,
      mode: 0o600,
    });
  }
  const index = {
    schema: "loop_telemetry_index_v2",
    contract_version: "2.0.0",
    run_id: runId,
    purpose: telemetry.purpose,
    classification: telemetry.classification,
    redaction_revision: telemetry.redaction_revision,
    retention_days: telemetry.retention_days,
    disposition: telemetry.disposition,
    acl_digest: digestBytes(JSON.stringify(telemetry.acl)),
    event_head_digest: records.at(-1).event_head_digest,
    record_count: records.length,
    segment_count: segments.length,
    segments: segments.map(publicSegment),
    projected_at: records.at(-1).recorded_at,
  };
  assertPrivacySafeRuntimeValue(index, "telemetry index");
  const indexText = `${JSON.stringify(index, null, 2)}\n`;
  await writeAtomic(root, paths.index, indexText, {
    assertOwnership,
    label: "telemetry index",
    maxBytes: MAX_INDEX_BYTES,
    mode: 0o600,
  });
  await removeObsoleteSegments(root, paths, segments, assertOwnership);
  return freezeDeep({
    index,
    index_digest: digestBytes(indexText),
  });
}

export async function rebuildTelemetryProjection(
  root,
  {
    runId,
    records,
    telemetry,
    writerRole,
    verifyAccess,
  } = {},
  dependencies = {},
) {
  await authorize(telemetry, "WRITE", writerRole, verifyAccess);
  if (!Array.isArray(records) || records.length === 0 || records.length > 10_000) {
    throw new TypeError("Telemetry projection requires a bounded non-empty record set.");
  }
  const paths = telemetryPaths(runId);
  return withOwnerLock(root, paths.lock, ({ assertOwnership }) =>
    persistProjectionLocked(
      root,
      { runId, records, telemetry, paths, assertOwnership },
      dependencies,
    ),
  );
}

function validateIndex(index, runId, telemetry) {
  const fields = [
    "schema",
    "contract_version",
    "run_id",
    "purpose",
    "classification",
    "redaction_revision",
    "retention_days",
    "disposition",
    "acl_digest",
    "event_head_digest",
    "record_count",
    "segment_count",
    "segments",
    "projected_at",
  ];
  if (
    !hasExactFields(index, fields) ||
    index.schema !== "loop_telemetry_index_v2" ||
    index.contract_version !== "2.0.0" ||
    index.run_id !== runId ||
    index.purpose !== telemetry.purpose ||
    index.classification !== telemetry.classification ||
    index.redaction_revision !== telemetry.redaction_revision ||
    index.retention_days !== telemetry.retention_days ||
    index.disposition !== telemetry.disposition ||
    index.acl_digest !== digestBytes(JSON.stringify(telemetry.acl)) ||
    !validDigest(index.event_head_digest) ||
    !Number.isSafeInteger(index.record_count) ||
    index.record_count < 1 ||
    !Number.isSafeInteger(index.segment_count) ||
    index.segment_count < 1 ||
    index.segment_count > telemetry.rotation.max_segments ||
    !Array.isArray(index.segments) ||
    index.segments.length !== index.segment_count ||
    !validUtcDateTime(index.projected_at)
  ) {
    throw new Error("Telemetry index is stale, corrupt, or policy-mismatched.");
  }
  assertPrivacySafeRuntimeValue(index, "telemetry index");
}

async function readProjection(root, runId, telemetry, dependencies = {}) {
  const paths = telemetryPaths(runId);
  const readFile = dependencies.readBoundedFile ?? readBoundedFile;
  const indexText = await readFile(root, paths.index, {
    encoding: "utf8",
    label: "telemetry index",
    maxBytes: MAX_INDEX_BYTES,
  });
  let index;
  try {
    index = JSON.parse(indexText);
  } catch {
    throw new Error("Telemetry index is not valid JSON.");
  }
  validateIndex(index, runId, telemetry);
  await assertExactProjectionFiles(root, paths, index.segments);
  const records = [];
  for (let offset = 0; offset < index.segments.length; offset += 1) {
    const segment = index.segments[offset];
    const expectedPath = path
      .join(
        ".scratch",
        "loop-runs",
        runId,
        "telemetry",
        `segment-${String(offset + 1).padStart(4, "0")}.jsonl`,
      )
      .replaceAll("\\", "/");
    if (
      !hasExactFields(segment, [
        "number",
        "path",
        "bytes",
        "digest",
        "record_count",
        "first_sequence",
        "last_sequence",
      ]) ||
      segment.number !== offset + 1 ||
      segment.path !== expectedPath ||
      !Number.isSafeInteger(segment.bytes) ||
      segment.bytes < 1 ||
      segment.bytes > telemetry.max_file_bytes ||
      !validDigest(segment.digest) ||
      !Number.isSafeInteger(segment.record_count) ||
      segment.record_count < 1 ||
      !Number.isSafeInteger(segment.first_sequence) ||
      !Number.isSafeInteger(segment.last_sequence) ||
      segment.first_sequence !== records.length + 1 ||
      segment.last_sequence !==
        segment.first_sequence + segment.record_count - 1
    ) {
      throw new Error("Telemetry segment metadata is corrupt.");
    }
    const text = await readFile(root, segment.path, {
      encoding: "utf8",
      label: "telemetry segment",
      maxBytes: telemetry.max_file_bytes,
    });
    if (
      Buffer.byteLength(text) !== segment.bytes ||
      digestBytes(text) !== segment.digest ||
      !text.endsWith("\n")
    ) {
      throw new Error("Telemetry segment content is corrupt.");
    }
    const lines = text.slice(0, -1).split("\n");
    if (lines.length !== segment.record_count) {
      throw new Error("Telemetry segment record count is corrupt.");
    }
    for (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        throw new Error("Telemetry segment contains invalid JSON.");
      }
      validateRecord(
        record,
        runId,
        records.length + 1,
        records.at(-1)?.event_head_digest ?? null,
      );
      records.push(record);
    }
    if (
      records.at(-(segment.record_count)).sequence !== segment.first_sequence ||
      records.at(-1).sequence !== segment.last_sequence
    ) {
      throw new Error("Telemetry segment sequence metadata is corrupt.");
    }
  }
  if (
    records.length !== index.record_count ||
    records.at(-1).event_head_digest !== index.event_head_digest ||
    records.at(-1).recorded_at !== index.projected_at
  ) {
    throw new Error("Telemetry projection is incomplete or divergent.");
  }
  return { index, index_digest: digestBytes(indexText), records };
}

export async function readTelemetryProjection(
  root,
  { runId, telemetry, readerRole, verifyAccess } = {},
  dependencies = {},
) {
  await authorize(telemetry, "READ", readerRole, verifyAccess);
  return freezeDeep(await readProjection(root, runId, telemetry, dependencies));
}

export async function readTelemetryExport(
  root,
  { runId, telemetry, role, verifyAccess } = {},
  dependencies = {},
) {
  await authorize(telemetry, "EXPORT", role, verifyAccess);
  return freezeDeep(await readProjection(root, runId, telemetry, dependencies));
}

export async function appendTelemetryRecord(
  root,
  {
    runId,
    record,
    telemetry,
    writerRole,
    verifyAccess,
  } = {},
  dependencies = {},
) {
  await authorize(telemetry, "WRITE", writerRole, verifyAccess);
  const paths = telemetryPaths(runId);
  return withOwnerLock(root, paths.lock, async ({ assertOwnership }) => {
    let records = [];
    try {
      records = (await readProjection(root, runId, telemetry, dependencies)).records;
    } catch (error) {
      if (!/File does not exist:/u.test(error instanceof Error ? error.message : "")) {
        throw error;
      }
    }
    const existing = records.find(
      (candidate) => candidate.event_head_digest === record?.event_head_digest,
    );
    if (existing !== undefined) {
      if (JSON.stringify(existing) === JSON.stringify(record)) {
        return freezeDeep({ idempotent: true, record_count: records.length });
      }
      throw new Error("Telemetry event-head idempotency conflict.");
    }
    if (record?.sequence !== records.length + 1) {
      throw new Error("Telemetry projection sequence is stale or incomplete.");
    }
    const projected = await persistProjectionLocked(
      root,
      {
        runId,
        records: [...records, record],
        telemetry,
        paths,
        assertOwnership,
      },
      dependencies,
    );
    return freezeDeep({
      ...projected,
      idempotent: false,
      record_count: records.length + 1,
    });
  });
}

function retentionDays(telemetry, retention) {
  if (
    !hasExactFields(retention, ["run_metadata_days", "audit_evidence_days"]) ||
    !Number.isSafeInteger(retention.run_metadata_days) ||
    retention.run_metadata_days < 1 ||
    !Number.isSafeInteger(retention.audit_evidence_days) ||
    retention.audit_evidence_days < 1
  ) {
    throw new TypeError("Telemetry retention obligations are invalid.");
  }
  return Math.max(
    telemetry.retention_days,
    retention.run_metadata_days,
    retention.audit_evidence_days,
  );
}

function normalizeRetentionAuthority(authority, runId, projection) {
  if (
    !hasExactFields(authority, RETENTION_AUTHORITY_FIELDS) ||
    authority.schema !== "telemetry_retention_authority_v2" ||
    authority.contract_version !== "2.0.0" ||
    authority.run_id !== runId ||
    authority.event_head_digest !== projection.index.event_head_digest ||
    !TERMINAL_STATES.has(authority.terminal_status) ||
    !validUtcDateTime(authority.terminal_at) ||
    !new Set([true, false, null]).has(authority.legal_hold) ||
    !new Set([true, false, null]).has(authority.quarantined) ||
    !RECONCILIATION_OUTCOMES.has(authority.reconciliation_outcome)
  ) {
    throw new Error("POLICY_STOP: telemetry retention authority is stale or invalid.");
  }
  retentionDays({ retention_days: 1 }, authority.retention);
  const normalized = {
    schema: authority.schema,
    contract_version: authority.contract_version,
    run_id: authority.run_id,
    event_head_digest: authority.event_head_digest,
    terminal_status: authority.terminal_status,
    terminal_at: authority.terminal_at,
    retention: {
      run_metadata_days: authority.retention.run_metadata_days,
      audit_evidence_days: authority.retention.audit_evidence_days,
    },
    legal_hold: authority.legal_hold,
    quarantined: authority.quarantined,
    reconciliation_outcome: authority.reconciliation_outcome,
  };
  assertPrivacySafeRuntimeValue(normalized, "telemetry retention authority");
  return freezeDeep(normalized);
}

async function readAuthoritativeRetentionState(
  runId,
  projection,
  operation,
  dependencies,
) {
  if (typeof dependencies.readRetentionAuthority !== "function") {
    throw new Error("POLICY_STOP: authoritative telemetry retention reader is required.");
  }
  const authority = await dependencies.readRetentionAuthority(
    freezeDeep({
      operation,
      run_id: runId,
      event_head_digest: projection.index.event_head_digest,
      telemetry_index_digest: projection.index_digest,
    }),
  );
  return normalizeRetentionAuthority(authority, runId, projection);
}

async function authoritativeNow(dependencies) {
  if (typeof dependencies.now !== "function") {
    throw new Error("POLICY_STOP: authoritative telemetry retention clock is required.");
  }
  const value = await dependencies.now();
  if (!validUtcDateTime(value)) {
    throw new Error("POLICY_STOP: authoritative telemetry retention clock is invalid.");
  }
  return value;
}

function retentionAuthorityDigest(authority) {
  return digestBytes(JSON.stringify(authority));
}

function buildRetentionPlan({ runId, projection, telemetry, authority, now }) {
  const plan = buildWholeRunRetentionPlan({
    run_id: runId,
    event_head_digest: projection.index.event_head_digest,
    telemetry_index_digest: projection.index_digest,
    authority_digest: retentionAuthorityDigest(authority),
    terminal_status: authority.terminal_status,
    terminal_at: authority.terminal_at,
    now,
    retention_days: retentionDays(telemetry, authority.retention),
    legal_hold: authority.legal_hold,
    quarantined: authority.quarantined,
    reconciliation_outcome: authority.reconciliation_outcome,
    disposition: telemetry.disposition,
  });
  if (plan.apply_allowed === true) {
    const terminalIndex = projection.records.findIndex((record) =>
      TERMINAL_STATES.has(record.outcome.run_status),
    );
    const terminalRecord = projection.records[terminalIndex];
    const terminalStatusRemainsStable = projection.records
      .slice(terminalIndex)
      .every((record) => record.outcome.run_status === authority.terminal_status);
    if (
      terminalIndex < 0 ||
      terminalRecord.outcome.run_status !== authority.terminal_status ||
      terminalRecord.recorded_at !== authority.terminal_at ||
      !terminalStatusRemainsStable
    ) {
      throw new Error(
        "Telemetry retention authority does not match the terminal projection outcome.",
      );
    }
  }
  return plan;
}

function validateSubmittedRetentionPlan(plan, runId) {
  if (!hasExactFields(plan, RETENTION_PLAN_FIELDS) || plan.run_id !== runId) {
    throw new Error("Telemetry prune plan contract is invalid.");
  }
  const reconstructed = buildWholeRunRetentionPlan({
    run_id: plan.run_id,
    event_head_digest: plan.event_head_digest,
    telemetry_index_digest: plan.telemetry_index_digest,
    authority_digest: plan.authority_digest,
    terminal_status: plan.terminal_status,
    terminal_at: plan.terminal_at,
    now: plan.evaluated_at,
    retention_days: plan.retention_days,
    legal_hold: plan.legal_hold,
    quarantined: plan.quarantined,
    reconciliation_outcome: plan.reconciliation_outcome,
    disposition: plan.disposition,
  });
  if (JSON.stringify(reconstructed) !== JSON.stringify(plan)) {
    throw new Error("Telemetry prune plan contract is not canonical.");
  }
}

function assertFreshRetentionPlan(plan, current) {
  const bindings = [
    "run_id",
    "event_head_digest",
    "telemetry_index_digest",
    "authority_digest",
    "terminal_status",
    "terminal_at",
    "retention_days",
    "eligible_at",
    "legal_hold",
    "quarantined",
    "reconciliation_outcome",
    "disposition",
  ];
  if (
    bindings.some((field) => plan[field] !== current[field]) ||
    plan.apply_allowed !== true ||
    plan.reason !== "ELIGIBLE" ||
    current.apply_allowed !== true ||
    current.reason !== "ELIGIBLE"
  ) {
    throw new Error("Telemetry prune plan is stale or denied by fresh authority.");
  }
}

export async function planTelemetryPrune(
  root,
  {
    runId,
    telemetry,
    writerRole,
    verifyAccess,
  } = {},
  dependencies = {},
) {
  await authorize(telemetry, "PRUNE", writerRole, verifyAccess);
  const projection = await readProjection(root, runId, telemetry, dependencies);
  const authority = await readAuthoritativeRetentionState(
    runId,
    projection,
    "PLAN_PRUNE",
    dependencies,
  );
  const plan = buildRetentionPlan({
    runId,
    projection,
    telemetry,
    authority,
    now: await authoritativeNow(dependencies),
  });
  return freezeDeep({
    dry_run: true,
    plan,
    plan_digest: digestBytes(JSON.stringify(plan)),
  });
}

export async function applyTelemetryPrune(
  root,
  {
    runId,
    telemetry,
    writerRole,
    verifyAccess,
    plan,
    planDigest,
  } = {},
  dependencies = {},
) {
  await authorize(telemetry, "PRUNE", writerRole, verifyAccess);
  if (
    !isPlainObject(plan) ||
    !validDigest(planDigest) ||
    digestBytes(JSON.stringify(plan)) !== planDigest ||
    plan.run_id !== runId
  ) {
    throw new Error("Telemetry prune plan is stale, denied, or digest-mismatched.");
  }
  const paths = telemetryPaths(runId);
  return withOwnerLock(root, paths.lock, async ({ assertOwnership }) => {
    const directory = await resolveRepositoryPath(root, paths.directory, {
      label: "telemetry prune directory",
    });
    const tombstoneCandidate = `${paths.directory}.pruned.${planDigest.slice(-16)}`;
    const tombstone = await resolveRepositoryPath(root, tombstoneCandidate, {
      label: "telemetry prune tombstone",
    });
    const renameDirectory = dependencies.renameDirectory ?? rename;
    const removeDirectory =
      dependencies.removeDirectory ??
      ((target) => rm(target, { recursive: true, force: false }));
    let directoryInfo = await lstat(directory).catch(() => null);
    let tombstoneInfo = await lstat(tombstone).catch(() => null);
    if (directoryInfo !== null && tombstoneInfo !== null) {
      throw new Error("Telemetry prune source and tombstone both exist.");
    }
    let recovered = false;
    if (directoryInfo === null && tombstoneInfo !== null) {
      if (!tombstoneInfo.isDirectory() || tombstoneInfo.isSymbolicLink()) {
        throw new Error("Telemetry prune tombstone is not a safe directory.");
      }
      await assertOwnership();
      await renameDirectory(tombstone, directory);
      recovered = true;
      directoryInfo = await lstat(directory).catch(() => null);
      tombstoneInfo = null;
    }
    if (!directoryInfo?.isDirectory() || directoryInfo.isSymbolicLink()) {
      throw new Error("Telemetry prune target is not a safe directory.");
    }
    const projection = await readProjection(root, runId, telemetry, dependencies);
    const authority = await readAuthoritativeRetentionState(
      runId,
      projection,
      "APPLY_PRUNE",
      dependencies,
    );
    const currentPlan = buildRetentionPlan({
      runId,
      projection,
      telemetry,
      authority,
      now: await authoritativeNow(dependencies),
    });
    validateSubmittedRetentionPlan(plan, runId);
    assertFreshRetentionPlan(plan, currentPlan);
    await assertOwnership();
    if (tombstoneInfo !== null || (await lstat(tombstone).catch(() => null)) !== null) {
      throw new Error("Telemetry prune tombstone already exists.");
    }
    await renameDirectory(directory, tombstone);
    await assertOwnership();
    await removeDirectory(tombstone);
    return freezeDeep({
      run_id: runId,
      disposition: telemetry.disposition,
      pruned_index_digest: projection.index_digest,
      event_head_digest: projection.index.event_head_digest,
      recovered,
    });
  });
}
