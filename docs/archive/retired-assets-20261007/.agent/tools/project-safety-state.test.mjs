import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createProjectSafetyState } from "./project-safety-state.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;
const DIGEST_E = `sha256:${"e".repeat(64)}`;
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

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function eventDigest(event) {
  const { event_hash: _eventHash, ...unsigned } = event;
  return digest(canonicalJson(unsigned));
}

async function makeRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "project-safety-state-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function makeController(root, overrides = {}) {
  let eventNumber = 0;
  let timestamp = Date.parse("2026-07-21T00:00:00.000Z");
  return createProjectSafetyState(root, {
    now: () => timestamp++,
    randomId: () => `safety-event-${++eventNumber}`,
    verifyOwnerAttestation: async () => true,
    verifyProjectConfig: async () => true,
    lockOptions: {
      heartbeatMs: 100,
      retryMs: 1,
      staleMs: 1_000,
      timeoutMs: 1_000,
    },
    ...overrides,
  });
}

function haltInput(overrides = {}) {
  return {
    expected_head: null,
    reason_code: "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE",
    evidence_digest: DIGEST_A,
    source_run_id: "LER2-GOAL-010-01",
    source_event_head: DIGEST_B,
    project_config_digest: DIGEST_C,
    ...overrides,
  };
}

function clearInput(expectedHead, overrides = {}) {
  return {
    expected_head: expectedHead,
    recovery_evidence_digest: DIGEST_D,
    validated_project_config_digest: DIGEST_C,
    target_mode: "OBSERVE",
    owner_actor_ref: DIGEST_E,
    owner_attestation_digest: DIGEST_B,
    ...overrides,
  };
}

test("PROJECT_HALTED and PROJECT_HALT_CLEARED form a durable hash-linked ledger", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);

  const initial = await controller.show({ base_mode: "OBSERVE" });
  assert.deepEqual(initial, {
    schema: "project_safety_state_v2",
    contract_version: "2.0.0",
    integrity: "MISSING",
    active: false,
    effective_mode: "OBSERVE",
    reason_code: null,
    incident_digest: null,
    evidence_digest: null,
    project_config_digest: null,
    source_run_id: null,
    source_event_head: null,
    sequence: 0,
    head_digest: null,
  });

  const halted = await controller.halt(haltInput());
  assert.equal(halted.idempotent, false);
  assert.equal(halted.state.active, true);
  assert.equal(halted.state.effective_mode, "HALTED");
  assert.equal(halted.state.reason_code, "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE");
  assert.match(halted.state.incident_digest, /^sha256:[a-f0-9]{64}$/u);

  const cleared = await controller.clear(clearInput(halted.state.head_digest));
  assert.equal(cleared.idempotent, false);
  assert.equal(cleared.state.active, false);
  assert.equal(cleared.state.effective_mode, "OBSERVE");
  assert.equal(cleared.state.sequence, 2);

  const lines = (await readFile(path.join(root, LEDGER_PATH), "utf8"))
    .trimEnd()
    .split("\n")
    .map(JSON.parse);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].type, "PROJECT_HALTED");
  assert.equal(lines[0].previous_hash, null);
  assert.equal(lines[0].event_hash, eventDigest(lines[0]));
  assert.equal(lines[1].type, "PROJECT_HALT_CLEARED");
  assert.equal(lines[1].previous_hash, lines[0].event_hash);
  assert.equal(lines[1].data.halted_event_hash, lines[0].event_hash);
  assert.equal(lines[1].event_hash, eventDigest(lines[1]));
});

test("halt retries are idempotent while distinct incidents require current-head CAS", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);
  const input = haltInput();

  const first = await controller.halt(input);
  const retry = await controller.halt(input);
  assert.equal(retry.idempotent, true);
  assert.equal(retry.state.head_digest, first.state.head_digest);

  await assert.rejects(
    controller.halt(
      haltInput({
        reason_code: "PERSISTED_PRIVACY_VIOLATION",
        evidence_digest: DIGEST_D,
      }),
    ),
    /SAFETY_CAS_CONFLICT/u,
  );

  const second = await controller.halt(
    haltInput({
      expected_head: first.state.head_digest,
      reason_code: "PERSISTED_PRIVACY_VIOLATION",
      evidence_digest: DIGEST_D,
    }),
  );
  assert.equal(second.state.active, true);
  assert.equal(second.state.sequence, 2);
  assert.equal(second.state.reason_code, "PERSISTED_PRIVACY_VIOLATION");
  assert.equal(
    (await readFile(path.join(root, LEDGER_PATH), "utf8")).trimEnd().split("\n").length,
    2,
  );
});

test("owner lock serializes competing CAS transitions", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);

  const results = await Promise.allSettled([
    controller.halt(haltInput()),
    controller.halt(
      haltInput({
        reason_code: "REDACTION_FAILURE",
        evidence_digest: DIGEST_D,
      }),
    ),
  ]);

  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(results.filter(({ status }) => status === "rejected").length, 1);
  assert.match(results.find(({ status }) => status === "rejected").reason.message, /SAFETY_CAS_CONFLICT/u);
  assert.equal(
    (await readFile(path.join(root, LEDGER_PATH), "utf8")).trimEnd().split("\n").length,
    1,
  );
});

test("truncation or hash corruption evaluates to HALTED and is never auto-repaired", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);
  const halted = await controller.halt(haltInput());
  const ledger = path.join(root, LEDGER_PATH);
  const healthyText = await readFile(ledger, "utf8");
  const truncatedText = healthyText.slice(0, -1);
  await writeFile(ledger, truncatedText, "utf8");

  const truncated = await controller.show({ base_mode: "ENFORCE" });
  assert.equal(truncated.integrity, "CORRUPT");
  assert.equal(truncated.active, true);
  assert.equal(truncated.effective_mode, "HALTED");
  assert.equal(truncated.reason_code, "SAFETY_LEDGER_CORRUPTION");
  assert.equal(await readFile(ledger, "utf8"), truncatedText);
  await assert.rejects(
    controller.halt(haltInput({ expected_head: halted.state.head_digest })),
    /SAFETY_LEDGER_CORRUPT/u,
  );
  assert.equal(await readFile(ledger, "utf8"), truncatedText);

  const parsed = JSON.parse(healthyText.trimEnd());
  parsed.event_hash = DIGEST_E;
  const hashCorruptText = `${JSON.stringify(parsed)}\n`;
  await writeFile(ledger, hashCorruptText, "utf8");
  const hashCorrupt = await controller.show({ base_mode: "DISABLED" });
  assert.equal(hashCorrupt.integrity, "CORRUPT");
  assert.equal(hashCorrupt.effective_mode, "HALTED");
  assert.equal(await readFile(ledger, "utf8"), hashCorruptText);
});

test("clear is fail-closed on stale head, invalid config, owner denial, or unsafe target", async (t) => {
  const root = await makeRoot(t);
  let ownerAllowed = false;
  let configAllowed = false;
  const controller = makeController(root, {
    verifyOwnerAttestation: async (context) => {
      assert.equal(Object.isFrozen(context), true);
      return ownerAllowed;
    },
    verifyProjectConfig: async (context) => {
      assert.equal(Object.isFrozen(context), true);
      return configAllowed;
    },
  });
  const halted = await controller.halt(haltInput());
  const currentHead = halted.state.head_digest;

  await assert.rejects(
    controller.clear(clearInput(DIGEST_A)),
    /SAFETY_CAS_CONFLICT/u,
  );
  await assert.rejects(
    controller.clear(clearInput(currentHead, { target_mode: "ENFORCE" })),
    /target_mode/u,
  );
  await assert.rejects(
    controller.clear(clearInput(currentHead)),
    /PROJECT_CONFIG_ATTESTATION_REQUIRED/u,
  );

  configAllowed = true;
  await assert.rejects(
    controller.clear(clearInput(currentHead)),
    /OWNER_ATTESTATION_REQUIRED/u,
  );

  ownerAllowed = true;
  const cleared = await controller.clear(clearInput(currentHead));
  assert.equal(cleared.state.effective_mode, "OBSERVE");
  assert.equal(cleared.state.active, false);
});

test("strict sanitized contracts reject raw errors and never persist actor content", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);

  await assert.rejects(
    controller.halt({
      ...haltInput(),
      raw_error: "secret customer@example.com bearer-token",
    }),
    /exact fields/u,
  );

  const halted = await controller.halt(haltInput());
  await assert.rejects(
    controller.clear({
      ...clearInput(halted.state.head_digest),
      owner_actor_ref: "owner@example.com",
    }),
    /owner_actor_ref/u,
  );

  const text = await readFile(path.join(root, LEDGER_PATH), "utf8");
  assert.doesNotMatch(text, /customer@example\.com|owner@example\.com|bearer-token/u);
  const stored = JSON.parse(text.trimEnd());
  assert.deepEqual(Object.keys(stored.data).sort(), [
    "evidence_digest",
    "incident_digest",
    "project_config_digest",
    "reason_code",
    "source_event_head",
    "source_run_id",
  ]);
});

test("an existing empty safety ledger is corruption, not an implicit clean state", async (t) => {
  const root = await makeRoot(t);
  const ledger = path.join(root, LEDGER_PATH);
  await mkdir(path.dirname(ledger), { recursive: true });
  await writeFile(ledger, "", "utf8");
  const controller = makeController(root);

  const state = await controller.show({ base_mode: "DISABLED" });
  assert.equal(state.integrity, "CORRUPT");
  assert.equal(state.effective_mode, "HALTED");
  assert.equal(await readFile(ledger, "utf8"), "");
});

test("a previously created safety ledger cannot disappear back to a clean mode", async (t) => {
  const root = await makeRoot(t);
  const controller = makeController(root);
  await controller.halt(haltInput());
  await rm(path.join(root, LEDGER_PATH));

  const state = await makeController(root).show({ base_mode: "ENFORCE" });
  assert.equal(state.integrity, "CORRUPT");
  assert.equal(state.effective_mode, "HALTED");
});

test("a missing or corrupt marker latches an existing ledger as HALTED", async (t) => {
  for (const markerFailure of ["missing", "corrupt"]) {
    const root = await makeRoot(t);
    await makeController(root).halt(haltInput());
    const marker = path.join(root, LEDGER_MARKER_PATH);

    if (markerFailure === "missing") {
      await rm(marker);
    } else {
      await writeFile(marker, "corrupt marker\n", "utf8");
    }

    const detected = await makeController(root).show({ base_mode: "ENFORCE" });
    assert.equal(detected.integrity, "CORRUPT", markerFailure);
    assert.equal(detected.effective_mode, "HALTED", markerFailure);

    await rm(path.join(root, LEDGER_PATH));
    const afterLedgerDeletion = await makeController(root).show({
      base_mode: "OBSERVE",
    });
    assert.equal(afterLedgerDeletion.integrity, "CORRUPT", markerFailure);
    assert.equal(afterLedgerDeletion.effective_mode, "HALTED", markerFailure);
  }
});

test("owner-attested recovery repairs only the virgin marker-without-ledger crash state", async (t) => {
  const root = await makeRoot(t);
  const marker = path.join(root, LEDGER_MARKER_PATH);
  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(
    marker,
    `${JSON.stringify({
      schema: "project_safety_ledger_marker_v2",
      contract_version: "2.0.0",
    })}\n`,
    "utf8",
  );
  const controller = makeController(root);

  const corrupt = await controller.show({ base_mode: "OBSERVE" });
  assert.equal(corrupt.integrity, "CORRUPT");
  assert.equal(corrupt.head_digest, null);

  const recovered = await controller.recoverVirgin(clearInput(null));
  assert.equal(recovered.state.integrity, "VALID");
  assert.equal(recovered.state.active, false);
  assert.equal(recovered.state.effective_mode, "OBSERVE");
  assert.equal(recovered.state.sequence, 2);

  const events = (await readFile(path.join(root, LEDGER_PATH), "utf8"))
    .trimEnd()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(events.map(({ type }) => type), [
    "PROJECT_HALTED",
    "PROJECT_HALT_CLEARED",
  ]);
  assert.equal(events[0].data.reason_code, "EVENT_CHAIN_CORRUPTION");
  assert.equal(events[0].previous_hash, null);
  assert.equal(events[1].previous_hash, events[0].event_hash);

  await assert.rejects(
    controller.recoverVirgin(clearInput(null)),
    /VIRGIN_SAFETY_RECOVERY_DENIED/u,
  );
});
