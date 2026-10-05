import { createHash, randomUUID } from "node:crypto";
import { lstat } from "node:fs/promises";
import path from "node:path";

import {
  appendFileDurable,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";

const CONTRACT_VERSION = "2.0.0";
const EVENT_SCHEMA = "project_safety_event_v2";
const STATE_SCHEMA = "project_safety_state_v2";
const DEFAULT_MAX_BYTES = 1024 * 1024;
const LEDGER_PATH = path.join(
  ".scratch",
  "loop-runtime",
  "project-safety-events.jsonl",
);
const LEDGER_MARKER_PATH = path.join(
  ".scratch",
  "loop-runtime",
  "project-safety-ledger.created",
);
const LEDGER_MARKER_TEXT = `${JSON.stringify({
  schema: "project_safety_ledger_marker_v2",
  contract_version: CONTRACT_VERSION,
})}\n`;
const LEDGER_CORRUPTION_MARKER_TEXT = `${JSON.stringify({
  schema: "project_safety_ledger_corruption_v2",
  contract_version: CONTRACT_VERSION,
})}\n`;
const OWNER_LOCK_PATH = path.join(
  ".scratch",
  "loop-runtime",
  "project-safety.owner.lock",
);
const EVENT_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "event_id",
  "sequence",
  "type",
  "recorded_at",
  "previous_hash",
  "data",
  "event_hash",
]);
const HALT_INPUT_FIELDS = Object.freeze([
  "expected_head",
  "reason_code",
  "evidence_digest",
  "source_run_id",
  "source_event_head",
  "project_config_digest",
]);
const HALT_DATA_FIELDS = Object.freeze([
  "incident_digest",
  "reason_code",
  "evidence_digest",
  "source_run_id",
  "source_event_head",
  "project_config_digest",
]);
const CLEAR_INPUT_FIELDS = Object.freeze([
  "expected_head",
  "recovery_evidence_digest",
  "validated_project_config_digest",
  "target_mode",
  "owner_actor_ref",
  "owner_attestation_digest",
]);
const CLEAR_DATA_FIELDS = Object.freeze([
  "clearance_digest",
  "halted_event_hash",
  "recovery_evidence_digest",
  "validated_project_config_digest",
  "target_mode",
  "owner_actor_ref",
  "owner_attestation_digest",
]);
const BASE_MODES = new Set(["DISABLED", "OBSERVE", "ENFORCE", "HALTED"]);
const RECOVERY_MODES = new Set(["DISABLED", "OBSERVE"]);
const REASON_CODES = new Set([
  "APPROVAL_BYPASS",
  "UNAPPROVED_WRITE",
  "COUNTER_CORRUPTION",
  "COUNTER_REGRESSION",
  "STALE_AUTHORITY_DISPATCH",
  "UNVERIFIED_SUCCESS",
  "SECRET_LEAK",
  "PII_LEAK",
  "UNAUTHORIZED_EGRESS",
  "DUPLICATE_EXTERNAL_EFFECT",
  "UNKNOWN_AUTO_RETRY",
  "EVENT_CHAIN_CORRUPTION",
  "TELEMETRY_PROJECTION_CORRUPTION",
  "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE",
  "PERSISTED_PRIVACY_VIOLATION",
  "REDACTION_FAILURE",
]);

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

function assertExactFields(value, fields, label) {
  if (!hasExactFields(value, fields)) {
    throw new TypeError(`${label} must contain exact fields.`);
  }
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

function validNullableDigest(value) {
  return value === null || validDigest(value);
}

function validUtcDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value
  );
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestCanonical(value) {
  return `sha256:${createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex")}`;
}

function freezeDeep(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

function normalizeShowInput(input) {
  const candidate = input ?? { base_mode: "DISABLED" };
  assertExactFields(candidate, ["base_mode"], "Project safety show input");
  if (!BASE_MODES.has(candidate.base_mode)) {
    throw new TypeError("base_mode is invalid.");
  }
  return { base_mode: candidate.base_mode };
}

function normalizeHaltInput(input) {
  assertExactFields(input, HALT_INPUT_FIELDS, "Project halt input");
  if (!validNullableDigest(input.expected_head)) {
    throw new TypeError("expected_head must be null or a sha256 digest.");
  }
  if (!REASON_CODES.has(input.reason_code)) {
    throw new TypeError("reason_code is not allowlisted.");
  }
  if (!validDigest(input.evidence_digest)) {
    throw new TypeError("evidence_digest must be a sha256 digest.");
  }
  if (input.source_run_id !== null && !validIdentifier(input.source_run_id)) {
    throw new TypeError("source_run_id must be null or an opaque identifier.");
  }
  if (!validNullableDigest(input.source_event_head)) {
    throw new TypeError("source_event_head must be null or a sha256 digest.");
  }
  if (!validDigest(input.project_config_digest)) {
    throw new TypeError("project_config_digest must be a sha256 digest.");
  }
  return {
    expected_head: input.expected_head,
    reason_code: input.reason_code,
    evidence_digest: input.evidence_digest,
    source_run_id: input.source_run_id,
    source_event_head: input.source_event_head,
    project_config_digest: input.project_config_digest,
  };
}

function normalizeClearInput(input) {
  assertExactFields(input, CLEAR_INPUT_FIELDS, "Project halt clear input");
  if (!validDigest(input.expected_head)) {
    throw new TypeError("expected_head must be a sha256 digest.");
  }
  if (!validDigest(input.recovery_evidence_digest)) {
    throw new TypeError("recovery_evidence_digest must be a sha256 digest.");
  }
  if (!validDigest(input.validated_project_config_digest)) {
    throw new TypeError(
      "validated_project_config_digest must be a sha256 digest.",
    );
  }
  if (!RECOVERY_MODES.has(input.target_mode)) {
    throw new TypeError("target_mode must be DISABLED or OBSERVE.");
  }
  if (!validDigest(input.owner_actor_ref)) {
    throw new TypeError("owner_actor_ref must be an opaque sha256 digest.");
  }
  if (!validDigest(input.owner_attestation_digest)) {
    throw new TypeError("owner_attestation_digest must be a sha256 digest.");
  }
  return {
    expected_head: input.expected_head,
    recovery_evidence_digest: input.recovery_evidence_digest,
    validated_project_config_digest: input.validated_project_config_digest,
    target_mode: input.target_mode,
    owner_actor_ref: input.owner_actor_ref,
    owner_attestation_digest: input.owner_attestation_digest,
  };
}

function normalizeVirginRecoveryInput(input) {
  assertExactFields(input, CLEAR_INPUT_FIELDS, "Virgin project safety recovery input");
  if (input.expected_head !== null) {
    throw new TypeError("Virgin recovery expected_head must be null.");
  }
  if (!validDigest(input.recovery_evidence_digest)) {
    throw new TypeError("recovery_evidence_digest must be a sha256 digest.");
  }
  if (!validDigest(input.validated_project_config_digest)) {
    throw new TypeError(
      "validated_project_config_digest must be a sha256 digest.",
    );
  }
  if (!RECOVERY_MODES.has(input.target_mode)) {
    throw new TypeError("target_mode must be DISABLED or OBSERVE.");
  }
  if (!validDigest(input.owner_actor_ref)) {
    throw new TypeError("owner_actor_ref must be an opaque sha256 digest.");
  }
  if (!validDigest(input.owner_attestation_digest)) {
    throw new TypeError("owner_attestation_digest must be a sha256 digest.");
  }
  return {
    expected_head: null,
    recovery_evidence_digest: input.recovery_evidence_digest,
    validated_project_config_digest: input.validated_project_config_digest,
    target_mode: input.target_mode,
    owner_actor_ref: input.owner_actor_ref,
    owner_attestation_digest: input.owner_attestation_digest,
  };
}

function haltDigestPayload(input) {
  return {
    schema: "project_safety_incident_v2",
    contract_version: CONTRACT_VERSION,
    reason_code: input.reason_code,
    evidence_digest: input.evidence_digest,
    source_run_id: input.source_run_id,
    source_event_head: input.source_event_head,
    project_config_digest: input.project_config_digest,
  };
}

function clearDigestPayload(data) {
  return {
    schema: "project_safety_clearance_v2",
    contract_version: CONTRACT_VERSION,
    halted_event_hash: data.halted_event_hash,
    recovery_evidence_digest: data.recovery_evidence_digest,
    validated_project_config_digest: data.validated_project_config_digest,
    target_mode: data.target_mode,
    owner_actor_ref: data.owner_actor_ref,
    owner_attestation_digest: data.owner_attestation_digest,
  };
}

function validateHaltData(data) {
  if (
    !hasExactFields(data, HALT_DATA_FIELDS) ||
    !validDigest(data.incident_digest) ||
    !REASON_CODES.has(data.reason_code) ||
    !validDigest(data.evidence_digest) ||
    (data.source_run_id !== null && !validIdentifier(data.source_run_id)) ||
    !validNullableDigest(data.source_event_head) ||
    !validDigest(data.project_config_digest)
  ) {
    throw new Error("Safety halt event data is invalid.");
  }
  if (data.incident_digest !== digestCanonical(haltDigestPayload(data))) {
    throw new Error("Safety halt incident digest is invalid.");
  }
}

function validateClearData(data, previousHash, active) {
  if (
    !hasExactFields(data, CLEAR_DATA_FIELDS) ||
    !validDigest(data.clearance_digest) ||
    !validDigest(data.halted_event_hash) ||
    !validDigest(data.recovery_evidence_digest) ||
    !validDigest(data.validated_project_config_digest) ||
    !RECOVERY_MODES.has(data.target_mode) ||
    !validDigest(data.owner_actor_ref) ||
    !validDigest(data.owner_attestation_digest)
  ) {
    throw new Error("Safety clear event data is invalid.");
  }
  if (!active || data.halted_event_hash !== previousHash) {
    throw new Error("Safety clear event is not bound to an active halt.");
  }
  if (data.clearance_digest !== digestCanonical(clearDigestPayload(data))) {
    throw new Error("Safety clearance digest is invalid.");
  }
}

function replayEvents(text) {
  if (text.length === 0 || !text.endsWith("\n")) {
    throw new Error("Safety ledger is empty or truncated.");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length === 0 || lines.some((line) => line.length === 0)) {
    throw new Error("Safety ledger contains an empty event.");
  }

  const events = [];
  const eventIds = new Set();
  let previousHash = null;
  let previousTime = -1;
  let active = false;
  let currentHalt = null;

  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error("Safety ledger contains invalid JSON.");
    }
    if (
      !hasExactFields(event, EVENT_FIELDS) ||
      event.schema !== EVENT_SCHEMA ||
      event.contract_version !== CONTRACT_VERSION ||
      !validIdentifier(event.event_id) ||
      event.sequence !== index + 1 ||
      !["PROJECT_HALTED", "PROJECT_HALT_CLEARED"].includes(event.type) ||
      !validUtcDateTime(event.recorded_at) ||
      event.previous_hash !== previousHash ||
      !validDigest(event.event_hash) ||
      eventIds.has(event.event_id)
    ) {
      throw new Error("Safety ledger event contract is invalid.");
    }
    const eventTime = Date.parse(event.recorded_at);
    if (eventTime < previousTime) {
      throw new Error("Safety ledger timestamps regress.");
    }
    const { event_hash: _eventHash, ...unsigned } = event;
    if (event.event_hash !== digestCanonical(unsigned)) {
      throw new Error("Safety ledger event hash is invalid.");
    }

    if (event.type === "PROJECT_HALTED") {
      validateHaltData(event.data);
      active = true;
      currentHalt = event.data;
    } else {
      validateClearData(event.data, previousHash, active);
      active = false;
      currentHalt = null;
    }

    eventIds.add(event.event_id);
    events.push(event);
    previousHash = event.event_hash;
    previousTime = eventTime;
  }

  return {
    integrity: "VALID",
    events,
    active,
    currentHalt,
    sequence: events.length,
    headDigest: previousHash,
  };
}

function missingLedger() {
  return {
    integrity: "MISSING",
    events: [],
    active: false,
    currentHalt: null,
    sequence: 0,
    headDigest: null,
  };
}

function corruptLedger() {
  return {
    integrity: "CORRUPT",
    events: [],
    active: true,
    currentHalt: null,
    sequence: 0,
    headDigest: null,
  };
}

async function readLedger(root, maxBytes) {
  try {
    const absolute = await resolveRepositoryPath(root, LEDGER_PATH, {
      label: "Project safety ledger path",
    });
    let info;
    try {
      info = await lstat(absolute);
    } catch (error) {
      if (error?.code === "ENOENT") {
        const marker = await readLedgerMarker(root);
        return marker === "MISSING" ? missingLedger() : corruptLedger();
      }
      return corruptLedger();
    }
    if (!info.isFile() || info.isSymbolicLink()) return corruptLedger();
    const marker = await readLedgerMarker(root);
    if (marker !== "VALID") {
      if (marker === "MISSING") {
        await writeFileAtomic(
          root,
          LEDGER_MARKER_PATH,
          LEDGER_CORRUPTION_MARKER_TEXT,
          {
            label: "Project safety ledger corruption marker path",
            maxBytes: 1024,
            mode: 0o600,
          },
        );
      }
      return corruptLedger();
    }
    const text = await readBoundedFile(root, LEDGER_PATH, {
      encoding: "utf8",
      label: "Project safety ledger path",
      maxBytes,
    });
    return replayEvents(text);
  } catch {
    return corruptLedger();
  }
}

async function readLedgerMarker(root) {
  try {
    const absolute = await resolveRepositoryPath(root, LEDGER_MARKER_PATH, {
      label: "Project safety ledger marker path",
    });
    const info = await lstat(absolute).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (info === null) return "MISSING";
    if (!info.isFile() || info.isSymbolicLink()) return "CORRUPT";
    const text = await readBoundedFile(root, LEDGER_MARKER_PATH, {
      encoding: "utf8",
      label: "Project safety ledger marker path",
      maxBytes: 1024,
    });
    return text === LEDGER_MARKER_TEXT ? "VALID" : "CORRUPT";
  } catch {
    return "CORRUPT";
  }
}

async function ensureLedgerMarker(root) {
  const status = await readLedgerMarker(root);
  if (status === "VALID") return;
  if (status === "CORRUPT") {
    throw new Error("SAFETY_LEDGER_CORRUPT: ledger marker is invalid.");
  }
  await writeFileAtomic(root, LEDGER_MARKER_PATH, LEDGER_MARKER_TEXT, {
    label: "Project safety ledger marker path",
    maxBytes: 1024,
    mode: 0o600,
  });
}

async function isVirginLedgerCrash(root) {
  if ((await readLedgerMarker(root)) !== "VALID") return false;
  try {
    const absolute = await resolveRepositoryPath(root, LEDGER_PATH, {
      label: "Project safety ledger path",
    });
    await lstat(absolute);
    return false;
  } catch (error) {
    return error?.code === "ENOENT" || /File does not exist:/u.test(error?.message ?? "");
  }
}

function stateFromLedger(ledger, baseMode) {
  if (ledger.integrity === "CORRUPT") {
    return freezeDeep({
      schema: STATE_SCHEMA,
      contract_version: CONTRACT_VERSION,
      integrity: "CORRUPT",
      active: true,
      effective_mode: "HALTED",
      reason_code: "SAFETY_LEDGER_CORRUPTION",
      incident_digest: null,
      evidence_digest: null,
      project_config_digest: null,
      source_run_id: null,
      source_event_head: null,
      sequence: 0,
      head_digest: null,
    });
  }
  const halt = ledger.active ? ledger.currentHalt : null;
  return freezeDeep({
    schema: STATE_SCHEMA,
    contract_version: CONTRACT_VERSION,
    integrity: ledger.integrity,
    active: ledger.active,
    effective_mode: ledger.active ? "HALTED" : baseMode,
    reason_code: halt?.reason_code ?? null,
    incident_digest: halt?.incident_digest ?? null,
    evidence_digest: halt?.evidence_digest ?? null,
    project_config_digest: halt?.project_config_digest ?? null,
    source_run_id: halt?.source_run_id ?? null,
    source_event_head: halt?.source_event_head ?? null,
    sequence: ledger.sequence,
    head_digest: ledger.headDigest,
  });
}

function makeTimestamp(now) {
  const value = now();
  if (!Number.isFinite(value)) {
    throw new Error("Safety event clock is unavailable.");
  }
  const timestamp = new Date(value).toISOString();
  if (!validUtcDateTime(timestamp)) {
    throw new Error("Safety event clock is invalid.");
  }
  return timestamp;
}

function makeEvent({ type, data, ledger, now, randomId }) {
  const eventId = randomId();
  if (
    !validIdentifier(eventId) ||
    ledger.events.some((event) => event.event_id === eventId)
  ) {
    throw new Error("Safety event ID is invalid or duplicated.");
  }
  const unsigned = {
    schema: EVENT_SCHEMA,
    contract_version: CONTRACT_VERSION,
    event_id: eventId,
    sequence: ledger.sequence + 1,
    type,
    recorded_at: makeTimestamp(now),
    previous_hash: ledger.headDigest,
    data,
  };
  return freezeDeep({
    ...unsigned,
    event_hash: digestCanonical(unsigned),
  });
}

function assertCurrentHead(actual, expected) {
  if (actual !== expected) {
    throw new Error("SAFETY_CAS_CONFLICT: project safety head changed.");
  }
}

function assertWritableLedger(ledger) {
  if (ledger.integrity === "CORRUPT") {
    throw new Error("SAFETY_LEDGER_CORRUPT: owner recovery is required.");
  }
}

async function appendEvent(root, event, maxBytes, lockOptions) {
  await ensureLedgerMarker(root);
  await appendFileDurable(root, LEDGER_PATH, `${JSON.stringify(event)}\n`, {
    maxBytes,
    lockOptions,
  });
}

async function safelyAttest(verifier, context) {
  if (typeof verifier !== "function") return false;
  try {
    return (await verifier(freezeDeep(context))) === true;
  } catch {
    return false;
  }
}

export function createProjectSafetyState(root, dependencies = {}) {
  const maxBytes = dependencies.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024) {
    throw new TypeError("Project safety maxBytes must be at least 1024.");
  }
  const now = dependencies.now ?? Date.now;
  const randomId = dependencies.randomId ?? randomUUID;
  if (typeof now !== "function" || typeof randomId !== "function") {
    throw new TypeError("Project safety clock and ID generator must be functions.");
  }
  const lockOptions = dependencies.lockOptions;

  async function show(input) {
    const { base_mode: baseMode } = normalizeShowInput(input);
    return stateFromLedger(await readLedger(root, maxBytes), baseMode);
  }

  async function halt(input) {
    const normalized = normalizeHaltInput(input);
    const incidentDigest = digestCanonical(haltDigestPayload(normalized));

    return withOwnerLock(
      root,
      OWNER_LOCK_PATH,
      async ({ assertOwnership }) => {
        const ledger = await readLedger(root, maxBytes);
        assertWritableLedger(ledger);
        const latest = ledger.events.at(-1);
        if (
          ledger.active &&
          latest?.type === "PROJECT_HALTED" &&
          ledger.currentHalt.incident_digest === incidentDigest &&
          [latest.previous_hash, latest.event_hash].includes(
            normalized.expected_head,
          )
        ) {
          return freezeDeep({
            idempotent: true,
            state: stateFromLedger(ledger, "DISABLED"),
          });
        }
        assertCurrentHead(ledger.headDigest, normalized.expected_head);

        const data = freezeDeep({
          incident_digest: incidentDigest,
          reason_code: normalized.reason_code,
          evidence_digest: normalized.evidence_digest,
          source_run_id: normalized.source_run_id,
          source_event_head: normalized.source_event_head,
          project_config_digest: normalized.project_config_digest,
        });
        const event = makeEvent({
          type: "PROJECT_HALTED",
          data,
          ledger,
          now,
          randomId,
        });
        await assertOwnership();
        await appendEvent(root, event, maxBytes, lockOptions);
        await assertOwnership();

        const persisted = await readLedger(root, maxBytes);
        if (
          persisted.integrity !== "VALID" ||
          persisted.headDigest !== event.event_hash
        ) {
          throw new Error("SAFETY_LEDGER_CORRUPT: halt persistence is invalid.");
        }
        return freezeDeep({
          idempotent: false,
          state: stateFromLedger(persisted, "DISABLED"),
        });
      },
      lockOptions,
    );
  }

  async function clear(input) {
    const normalized = normalizeClearInput(input);

    return withOwnerLock(
      root,
      OWNER_LOCK_PATH,
      async ({ assertOwnership }) => {
        const ledger = await readLedger(root, maxBytes);
        assertWritableLedger(ledger);
        assertCurrentHead(ledger.headDigest, normalized.expected_head);
        if (!ledger.active) {
          throw new Error("PROJECT_HALT_NOT_ACTIVE: no active halt can be cleared.");
        }

        const configAllowed = await safelyAttest(
          dependencies.verifyProjectConfig,
          {
            operation: "PROJECT_HALT_CLEAR",
            current_head: ledger.headDigest,
            validated_project_config_digest:
              normalized.validated_project_config_digest,
            target_mode: normalized.target_mode,
          },
        );
        if (!configAllowed) {
          throw new Error(
            "PROJECT_CONFIG_ATTESTATION_REQUIRED: validated recovery config is required.",
          );
        }

        const ownerAllowed = await safelyAttest(
          dependencies.verifyOwnerAttestation,
          {
            operation: "PROJECT_HALT_CLEAR",
            current_head: ledger.headDigest,
            recovery_evidence_digest: normalized.recovery_evidence_digest,
            validated_project_config_digest:
              normalized.validated_project_config_digest,
            target_mode: normalized.target_mode,
            owner_actor_ref: normalized.owner_actor_ref,
            owner_attestation_digest: normalized.owner_attestation_digest,
          },
        );
        if (!ownerAllowed) {
          throw new Error(
            "OWNER_ATTESTATION_REQUIRED: project owner attestation is required.",
          );
        }

        const unsignedData = {
          halted_event_hash: ledger.headDigest,
          recovery_evidence_digest: normalized.recovery_evidence_digest,
          validated_project_config_digest:
            normalized.validated_project_config_digest,
          target_mode: normalized.target_mode,
          owner_actor_ref: normalized.owner_actor_ref,
          owner_attestation_digest: normalized.owner_attestation_digest,
        };
        const data = freezeDeep({
          clearance_digest: digestCanonical(clearDigestPayload(unsignedData)),
          ...unsignedData,
        });
        const event = makeEvent({
          type: "PROJECT_HALT_CLEARED",
          data,
          ledger,
          now,
          randomId,
        });
        await assertOwnership();
        await appendEvent(root, event, maxBytes, lockOptions);
        await assertOwnership();

        const persisted = await readLedger(root, maxBytes);
        if (
          persisted.integrity !== "VALID" ||
          persisted.headDigest !== event.event_hash
        ) {
          throw new Error("SAFETY_LEDGER_CORRUPT: clear persistence is invalid.");
        }
        return freezeDeep({
          idempotent: false,
          state: stateFromLedger(persisted, normalized.target_mode),
        });
      },
      lockOptions,
    );
  }

  async function recoverVirgin(input) {
    const normalized = normalizeVirginRecoveryInput(input);

    return withOwnerLock(
      root,
      OWNER_LOCK_PATH,
      async ({ assertOwnership }) => {
        if (!(await isVirginLedgerCrash(root))) {
          throw new Error(
            "VIRGIN_SAFETY_RECOVERY_DENIED: recovery is limited to a valid marker with no ledger.",
          );
        }

        const configAllowed = await safelyAttest(
          dependencies.verifyProjectConfig,
          {
            operation: "PROJECT_VIRGIN_LEDGER_RECOVERY",
            current_head: null,
            validated_project_config_digest:
              normalized.validated_project_config_digest,
            target_mode: normalized.target_mode,
          },
        );
        if (!configAllowed) {
          throw new Error(
            "PROJECT_CONFIG_ATTESTATION_REQUIRED: validated recovery config is required.",
          );
        }

        const ownerAllowed = await safelyAttest(
          dependencies.verifyOwnerAttestation,
          {
            operation: "PROJECT_VIRGIN_LEDGER_RECOVERY",
            current_head: null,
            recovery_evidence_digest: normalized.recovery_evidence_digest,
            validated_project_config_digest:
              normalized.validated_project_config_digest,
            target_mode: normalized.target_mode,
            owner_actor_ref: normalized.owner_actor_ref,
            owner_attestation_digest: normalized.owner_attestation_digest,
          },
        );
        if (!ownerAllowed) {
          throw new Error(
            "OWNER_ATTESTATION_REQUIRED: project owner attestation is required.",
          );
        }

        const virginLedger = missingLedger();
        const haltInput = {
          expected_head: null,
          reason_code: "EVENT_CHAIN_CORRUPTION",
          evidence_digest: normalized.recovery_evidence_digest,
          source_run_id: null,
          source_event_head: null,
          project_config_digest: normalized.validated_project_config_digest,
        };
        const haltData = freezeDeep({
          incident_digest: digestCanonical(haltDigestPayload(haltInput)),
          reason_code: haltInput.reason_code,
          evidence_digest: haltInput.evidence_digest,
          source_run_id: haltInput.source_run_id,
          source_event_head: haltInput.source_event_head,
          project_config_digest: haltInput.project_config_digest,
        });
        const haltEvent = makeEvent({
          type: "PROJECT_HALTED",
          data: haltData,
          ledger: virginLedger,
          now,
          randomId,
        });
        await assertOwnership();
        await appendEvent(root, haltEvent, maxBytes, lockOptions);
        await assertOwnership();

        const haltedLedger = await readLedger(root, maxBytes);
        if (
          haltedLedger.integrity !== "VALID" ||
          !haltedLedger.active ||
          haltedLedger.headDigest !== haltEvent.event_hash
        ) {
          throw new Error(
            "SAFETY_LEDGER_CORRUPT: virgin recovery halt persistence is invalid.",
          );
        }
        const unsignedClearData = {
          halted_event_hash: haltedLedger.headDigest,
          recovery_evidence_digest: normalized.recovery_evidence_digest,
          validated_project_config_digest:
            normalized.validated_project_config_digest,
          target_mode: normalized.target_mode,
          owner_actor_ref: normalized.owner_actor_ref,
          owner_attestation_digest: normalized.owner_attestation_digest,
        };
        const clearData = freezeDeep({
          clearance_digest: digestCanonical(clearDigestPayload(unsignedClearData)),
          ...unsignedClearData,
        });
        const clearEvent = makeEvent({
          type: "PROJECT_HALT_CLEARED",
          data: clearData,
          ledger: haltedLedger,
          now,
          randomId,
        });
        await appendEvent(root, clearEvent, maxBytes, lockOptions);
        await assertOwnership();

        const persisted = await readLedger(root, maxBytes);
        if (
          persisted.integrity !== "VALID" ||
          persisted.active ||
          persisted.headDigest !== clearEvent.event_hash
        ) {
          throw new Error(
            "SAFETY_LEDGER_CORRUPT: virgin recovery clearance persistence is invalid.",
          );
        }
        return freezeDeep({
          idempotent: false,
          state: stateFromLedger(persisted, normalized.target_mode),
        });
      },
      lockOptions,
    );
  }

  return freezeDeep({ show, halt, clear, recoverVirgin });
}
