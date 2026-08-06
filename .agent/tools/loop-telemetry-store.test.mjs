import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSanitizedTelemetryRecord } from "./loop-telemetry-model.mjs";
import * as telemetryStore from "./loop-telemetry-store.mjs";
import {
  appendTelemetryRecord,
  applyTelemetryPrune,
  planTelemetryPrune,
  readTelemetryExport,
  rebuildTelemetryProjection,
} from "./loop-telemetry-store.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;

function digestJson(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function telemetryDirectory(root, runId = "LER2-TEST-010-STORE") {
  return path.join(root, ".scratch", "loop-runs", runId, "telemetry");
}

function retentionAuthority(overrides = {}) {
  return {
    schema: "telemetry_retention_authority_v2",
    contract_version: "2.0.0",
    run_id: "LER2-TEST-010-STORE",
    event_head_digest: DIGEST_B,
    terminal_status: "SUCCESS",
    terminal_at: "2026-07-01T00:00:00.000Z",
    retention: {
      run_metadata_days: 30,
      audit_evidence_days: 90,
    },
    legal_hold: false,
    quarantined: false,
    reconciliation_outcome: null,
    ...overrides,
  };
}

function telemetryPolicy() {
  return {
    enabled: true,
    persistence_required: true,
    redaction_revision: "redaction-2026-07",
    retention_days: 30,
    max_file_bytes: 1024,
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
    pricing_digest: DIGEST_B,
  };
}

function record(sequence, overrides = {}) {
  return buildSanitizedTelemetryRecord({
    event: {
      schema: "loop_run_event_v2",
      contract_version: "2.0.0",
      event_id: `event-${sequence}`,
      run_id: "LER2-TEST-010-STORE",
      sequence,
      version: sequence,
      type: sequence === 3 ? "ACTION_INTENDED" : "STARTED",
      recorded_at: `2026-07-21T14:${String(sequence).padStart(2, "0")}:00.000Z`,
      previous_hash: sequence === 1 ? null : DIGEST_A,
      event_hash: sequence % 2 === 0 ? DIGEST_A : DIGEST_B,
      data: {
        action_id: "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
      },
    },
    state: {
      status: "RUNNING",
      counters: {
        iterations: sequence >= 3 ? 1 : 0,
        active_runtime_ms: sequence * 10,
        no_progress_iterations: 0,
        tokens: null,
        token_measurement: "UNMEASURED",
        cost_micro: null,
        cost_measurement: "UNMEASURED",
      },
      verification: {
        status: "NOT_RUN",
        fresh: false,
        gates_satisfied: false,
        fingerprint: null,
      },
      terminal_reason: null,
    },
    contract: {
      run_id: "LER2-TEST-010-STORE",
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
    },
    billing: {
      currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
    ...overrides,
  });
}

function terminalRecord(sequence) {
  const value = record(sequence);
  return buildSanitizedTelemetryRecord({
    event: {
      schema: "loop_run_event_v2",
      contract_version: "2.0.0",
      event_id: `terminal-${sequence}`,
      run_id: value.run_id,
      sequence,
      version: sequence,
      type: "VERIFICATION_PASSED",
      recorded_at: "2026-07-01T00:00:00.000Z",
      previous_hash: sequence === 1 ? null : DIGEST_A,
      event_hash: value.event_head_digest,
      data: {},
    },
    state: {
      status: "SUCCESS",
      counters: {
        iterations: 1,
        active_runtime_ms: sequence * 10,
        no_progress_iterations: 0,
        tokens: null,
        token_measurement: "UNMEASURED",
        cost_micro: null,
        cost_measurement: "UNMEASURED",
      },
      verification: {
        status: "PASS",
        fresh: true,
        gates_satisfied: true,
        fingerprint: null,
      },
      terminal_reason: "GOAL_MET",
    },
    contract: {
      run_id: value.run_id,
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
    },
    billing: {
      currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
  });
}

function snapshotRepairedRecord(sequence = 2) {
  return buildSanitizedTelemetryRecord({
    event: {
      schema: "loop_run_event_v2",
      contract_version: "2.0.0",
      event_id: `snapshot-repaired-${sequence}`,
      run_id: "LER2-TEST-010-STORE",
      sequence,
      version: sequence,
      type: "SNAPSHOT_REPAIRED",
      recorded_at: "2026-07-02T00:00:00.000Z",
      previous_hash: DIGEST_B,
      event_hash: DIGEST_C,
      data: { repaired_from_event_hash: DIGEST_B },
    },
    state: {
      status: "SUCCESS",
      counters: {
        iterations: 1,
        active_runtime_ms: 20,
        no_progress_iterations: 0,
        tokens: null,
        token_measurement: "UNMEASURED",
        cost_micro: null,
        cost_measurement: "UNMEASURED",
      },
      verification: {
        status: "PASS",
        fresh: true,
        gates_satisfied: true,
        fingerprint: null,
      },
      terminal_reason: "GOAL_VERIFIED",
    },
    contract: {
      run_id: "LER2-TEST-010-STORE",
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
    },
    billing: {
      currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
  });
}

function routeMetricRecord(sequence = 2, boundRunHead = DIGEST_A) {
  const metric = {
    schema: "operational_metric_v2",
    contract_version: "2.0.0",
    metric_id: DIGEST_C,
    run_id: "LER2-TEST-010-STORE",
    bound_run_head_digest: boundRunHead,
    kind: "ROUTE_INVOCATION",
    provenance: "HOST_ATTESTED",
    evidence_digest: DIGEST_B,
    recorded_at: "2026-07-21T14:20:00.000Z",
    payload: {
      workflow_route: "sc-work",
      surface: "FULL",
      invocation_ref: DIGEST_A,
    },
  };
  return buildSanitizedTelemetryRecord({
    event: {
      run_id: "LER2-TEST-010-STORE",
      event_hash: DIGEST_A,
      previous_hash: boundRunHead,
      sequence,
      version: sequence,
      type: "OPERATIONAL_METRIC_RECORDED",
      recorded_at: metric.recorded_at,
      data: { metric },
    },
    state: {
      status: "READY",
      counters: {
        iterations: 0,
        active_runtime_ms: 0,
        no_progress_iterations: 0,
        tokens: null,
        token_measurement: "UNMEASURED",
        cost_micro: null,
        cost_measurement: "UNMEASURED",
      },
      verification: {
        status: "NOT_RUN",
        fresh: false,
        gates_satisfied: false,
        fingerprint: null,
      },
      terminal_reason: null,
    },
    contract: {
      run_id: "LER2-TEST-010-STORE",
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
    },
    billing: {
      currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
  });
}

test("TEST-010 telemetry projection rotates deterministically and enforces ACL before export", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-store-"));
  const policy = telemetryPolicy();
  let accessChecks = 0;
  const verifyAccess = async ({ operation, role }) => {
    accessChecks += 1;
    return (
      (operation === "WRITE" && role === "loop-controller") ||
      (operation === "EXPORT" && role === "runtime-auditor")
    );
  };

  try {
    const records = [record(1), record(2), record(3)];
    policy.max_file_bytes = Buffer.byteLength(
      `${JSON.stringify(records[0])}\n${JSON.stringify(records[1])}\n`,
    );
    const projected = await rebuildTelemetryProjection(root, {
      runId: "LER2-TEST-010-STORE",
      records,
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    assert.equal(projected.index.record_count, 3);
    assert.equal(projected.index.segments.length, 2);
    assert.equal(projected.index.segments[0].bytes, policy.max_file_bytes);
    for (const segment of projected.index.segments) {
      const info = await stat(path.join(root, ...segment.path.split("/")));
      assert.equal(info.size, segment.bytes);
      assert.equal(info.size <= policy.max_file_bytes, true);
    }
    const persisted = await readFile(
      path.join(
        root,
        ".scratch",
        "loop-runs",
        "LER2-TEST-010-STORE",
        "telemetry",
        "index.json",
      ),
      "utf8",
    );
    assert.equal(persisted.includes("ghp_"), false);

    await assert.rejects(
      readTelemetryExport(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        role: "unlisted-role",
        verifyAccess,
      }),
      /ACL|access/i,
    );
    const exported = await readTelemetryExport(root, {
      runId: "LER2-TEST-010-STORE",
      telemetry: policy,
      role: "runtime-auditor",
      verifyAccess,
    });
    assert.deepEqual(exported.records, records);
    assert.equal(Object.isFrozen(exported), true);
    assert.equal(accessChecks, 2, "unlisted role is denied before host access callback");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 telemetry store binds operational metrics to the prior projected event head", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-metric-chain-"));
  const policy = telemetryPolicy();
  policy.max_file_bytes = 4096;
  try {
    await assert.rejects(
      rebuildTelemetryProjection(root, {
        runId: "LER2-TEST-010-STORE",
        records: [record(1), routeMetricRecord(2, DIGEST_A)],
        telemetry: policy,
        writerRole: "loop-controller",
        verifyAccess: async () => true,
      }),
      /operational metric.*previous|metric.*chain/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 READ and EXPORT require distinct telemetry ACL roles", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-read-acl-"));
  const policy = telemetryPolicy();
  policy.acl = {
    read_roles: ["runtime-reader"],
    write_roles: ["loop-controller"],
    export_roles: ["runtime-exporter"],
  };
  const verifyAccess = async ({ operation, role }) =>
    new Set([
      "WRITE:loop-controller",
      "READ:runtime-reader",
      "EXPORT:runtime-exporter",
    ]).has(`${operation}:${role}`);

  try {
    await rebuildTelemetryProjection(root, {
      runId: "LER2-TEST-010-STORE",
      records: [record(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    assert.equal(
      typeof telemetryStore.readTelemetryProjection,
      "function",
      "telemetry read_roles need a public READ operation distinct from EXPORT",
    );
    const read = await telemetryStore.readTelemetryProjection(root, {
      runId: "LER2-TEST-010-STORE",
      telemetry: policy,
      readerRole: "runtime-reader",
      verifyAccess,
    });
    assert.deepEqual(read.records, [record(1)]);
    await assert.rejects(
      telemetryStore.readTelemetryProjection(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        readerRole: "runtime-exporter",
        verifyAccess,
      }),
      /ACL|access/i,
    );
    await assert.rejects(
      readTelemetryExport(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        role: "runtime-reader",
        verifyAccess,
      }),
      /ACL|access/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 projection rebuild removes obsolete telemetry segments", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-obsolete-"));
  const policy = telemetryPolicy();
  const projectionArgs = {
    runId: "LER2-TEST-010-STORE",
    telemetry: policy,
    writerRole: "loop-controller",
    verifyAccess: async ({ operation, role }) =>
      operation === "WRITE" && role === "loop-controller",
  };

  try {
    const initial = await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [record(1), record(2), record(3)],
    });
    assert.equal(initial.index.segment_count > 1, true);
    await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [record(1)],
    });
    assert.deepEqual(
      (await readdir(telemetryDirectory(root))).sort(),
      ["index.json", "segment-0001.jsonl"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 telemetry read rejects an unindexed segment", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-unindexed-"));
  const policy = telemetryPolicy();
  const verifyAccess = async ({ operation, role }) =>
    (operation === "WRITE" && role === "loop-controller") ||
    (operation === "EXPORT" && role === "runtime-auditor");

  try {
    await rebuildTelemetryProjection(root, {
      runId: "LER2-TEST-010-STORE",
      records: [record(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    await writeFile(
      path.join(telemetryDirectory(root), "segment-0002.jsonl"),
      `${JSON.stringify(record(2))}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    await assert.rejects(
      readTelemetryExport(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        role: "runtime-auditor",
        verifyAccess,
      }),
      /unindexed|unexpected|segment|projection/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 telemetry store rejects malformed nested records", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-nested-"));
  const policy = telemetryPolicy();
  const base = record(1);
  const malformedValue = structuredClone(base);
  malformedValue.metrics.tokens = { status: "MEASURED", value: null };
  const malformedField = structuredClone(base);
  malformedField.metrics.tokens.unexpected = true;
  try {
    for (const candidate of [malformedValue, malformedField]) {
      await assert.rejects(
        rebuildTelemetryProjection(root, {
          runId: "LER2-TEST-010-STORE",
          records: [candidate],
          telemetry: policy,
          writerRole: "loop-controller",
          verifyAccess: async () => true,
        }),
        /telemetry record|token.*counter|nested|invalid/i,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 telemetry read rejects corrupt index and segment sequence metadata", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-index-"));
  const policy = telemetryPolicy();
  const verifyAccess = async () => true;
  try {
    await rebuildTelemetryProjection(root, {
      runId: "LER2-TEST-010-STORE",
      records: [record(1), record(2)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    const indexPath = path.join(telemetryDirectory(root), "index.json");
    const original = JSON.parse(await readFile(indexPath, "utf8"));
    await writeFile(
      indexPath,
      `${JSON.stringify({ ...original, projected_at: "not-a-time" }, null, 2)}\n`,
    );
    await assert.rejects(
      readTelemetryExport(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        role: "runtime-auditor",
        verifyAccess,
      }),
      /index.*corrupt|projected_at/i,
    );

    const corruptSegment = structuredClone(original);
    corruptSegment.segments[0].first_sequence = 2;
    await writeFile(indexPath, `${JSON.stringify(corruptSegment, null, 2)}\n`);
    await assert.rejects(
      readTelemetryExport(root, {
        runId: "LER2-TEST-010-STORE",
        telemetry: policy,
        role: "runtime-auditor",
        verifyAccess,
      }),
      /segment.*metadata|sequence/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 concurrent append serializes projection read-check-write", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-append-race-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const writeAccess = async ({ operation, role }) =>
    operation === "WRITE" && role === "loop-controller";

  try {
    await rebuildTelemetryProjection(root, {
      runId,
      records: [record(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess: writeAccess,
    });
    let arrivals = 0;
    let release;
    const bothAuthorized = new Promise((resolve) => {
      release = resolve;
    });
    const concurrentAccess = async ({ operation, role }) => {
      if (operation !== "WRITE" || role !== "loop-controller") return false;
      arrivals += 1;
      if (arrivals === 2) release();
      await bothAuthorized;
      return true;
    };
    const left = structuredClone(record(2));
    const right = structuredClone(record(2));
    right.event_head_digest = DIGEST_C;
    const settled = await Promise.allSettled([
      appendTelemetryRecord(root, {
        runId,
        record: left,
        telemetry: policy,
        writerRole: "loop-controller",
        verifyAccess: concurrentAccess,
      }),
      appendTelemetryRecord(root, {
        runId,
        record: right,
        telemetry: policy,
        writerRole: "loop-controller",
        verifyAccess: concurrentAccess,
      }),
    ]);
    assert.equal(settled.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(settled.filter(({ status }) => status === "rejected").length, 1);
    assert.match(
      settled.find(({ status }) => status === "rejected").reason.message,
      /conflict|sequence|stale/i,
    );
    const exported = await readTelemetryExport(root, {
      runId,
      telemetry: policy,
      role: "runtime-auditor",
      verifyAccess: async ({ operation, role }) =>
        operation === "EXPORT" && role === "runtime-auditor",
    });
    assert.equal(exported.records.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 whole-run retention is dry-run first and rejects hold, UNKNOWN, and stale plans", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-retention-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const verifyAccess = async ({ operation, role }) =>
    new Set(["WRITE", "PRUNE"]).has(operation) && role === "loop-controller";
  const projectionArgs = {
    runId,
    telemetry: policy,
    writerRole: "loop-controller",
    verifyAccess,
  };
  let authority = retentionAuthority();
  const dependencies = {
    now: () => "2026-10-05T00:00:00.000Z",
    readRetentionAuthority: async () => structuredClone(authority),
  };

  try {
    await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [record(1)],
    });
    await assert.rejects(
      planTelemetryPrune(root, projectionArgs, dependencies),
      /retention authority.*projection|terminal authority.*projection/i,
    );
    await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [terminalRecord(1)],
    });
    authority = retentionAuthority({ legal_hold: true });
    const held = await planTelemetryPrune(root, projectionArgs, dependencies);
    assert.equal(held.plan.apply_allowed, false);
    assert.equal(held.plan.reason, "LEGAL_HOLD");

    authority = retentionAuthority({
      terminal_status: "UNKNOWN_OUTCOME",
      reconciliation_outcome: null,
    });
    const unknown = await planTelemetryPrune(root, projectionArgs, dependencies);
    assert.equal(unknown.plan.apply_allowed, false);
    assert.equal(unknown.plan.reason, "RECONCILIATION_REQUIRED");

    authority = retentionAuthority();
    const plan = await planTelemetryPrune(root, projectionArgs, dependencies);
    assert.equal(plan.dry_run, true);
    assert.equal(plan.plan.apply_allowed, true);
    assert.equal(plan.plan.retention_days, 90);
    await access(
      path.join(root, ".scratch", "loop-runs", runId, "telemetry", "index.json"),
    );

    await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [record(1), terminalRecord(2)],
    });
    authority = retentionAuthority({ event_head_digest: record(2).event_head_digest });
    await assert.rejects(
      applyTelemetryPrune(
        root,
        {
          ...projectionArgs,
          plan: plan.plan,
          planDigest: plan.plan_digest,
        },
        dependencies,
      ),
      /stale|digest|head/i,
    );

    const currentPlan = await planTelemetryPrune(root, projectionArgs, dependencies);
    const applied = await applyTelemetryPrune(
      root,
      {
        ...projectionArgs,
        plan: currentPlan.plan,
        planDigest: currentPlan.plan_digest,
      },
      dependencies,
    );
    assert.equal(applied.disposition, "DELETE_DERIVED_TELEMETRY");
    await assert.rejects(
      access(path.join(root, ".scratch", "loop-runs", runId, "telemetry")),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 retention uses the lifecycle terminal time after a snapshot repair", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-repaired-retention-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const verifyAccess = async ({ operation, role }) =>
    new Set(["WRITE", "PRUNE"]).has(operation) && role === "loop-controller";
  const projectionArgs = {
    runId,
    telemetry: policy,
    writerRole: "loop-controller",
    verifyAccess,
  };
  const dependencies = {
    now: () => "2026-10-05T00:00:00.000Z",
    readRetentionAuthority: async () =>
      retentionAuthority({ event_head_digest: DIGEST_C }),
  };

  try {
    await rebuildTelemetryProjection(root, {
      ...projectionArgs,
      records: [terminalRecord(1), snapshotRepairedRecord(2)],
    });
    let planned;
    await assert.doesNotReject(async () => {
      planned = await planTelemetryPrune(root, projectionArgs, dependencies);
    });
    assert.equal(planned.plan.apply_allowed, true);
    assert.equal(planned.plan.terminal_at, "2026-07-01T00:00:00.000Z");
    assert.equal(planned.plan.eligible_at, "2026-09-29T00:00:00.000Z");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 prune rejects a forged caller plan without authoritative retention state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-forged-prune-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const verifyAccess = async ({ operation, role }) =>
    new Set(["WRITE", "PRUNE"]).has(operation) && role === "loop-controller";
  let authorityReads = 0;

  try {
    const projected = await rebuildTelemetryProjection(root, {
      runId,
      records: [record(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    const forgedPlan = {
      run_id: runId,
      event_head_digest: projected.index.event_head_digest,
      telemetry_index_digest: projected.index_digest,
      legal_hold: false,
      quarantined: false,
      reconciliation_outcome: null,
      apply_allowed: true,
      reason: "ELIGIBLE",
    };
    await assert.rejects(
      applyTelemetryPrune(
        root,
        {
          runId,
          telemetry: policy,
          writerRole: "loop-controller",
          verifyAccess,
          plan: forgedPlan,
          planDigest: digestJson(forgedPlan),
          currentEventHead: projected.index.event_head_digest,
          legalHold: false,
          quarantined: false,
          reconciliationOutcome: null,
        },
        {
          now: () => "2026-10-05T00:00:00.000Z",
          readRetentionAuthority: async () => {
            authorityReads += 1;
            return retentionAuthority({
              terminal_status: "RUNNING",
              terminal_at: null,
              legal_hold: true,
            });
          },
        },
      ),
      /authority|hold|nonterminal|plan|schema/i,
    );
    assert.equal(authorityReads, 1);
    await access(telemetryDirectory(root, runId));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 prune revalidates retention authority between plan and apply", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-prune-authority-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const verifyAccess = async ({ operation, role }) =>
    new Set(["WRITE", "PRUNE"]).has(operation) && role === "loop-controller";
  let authority = retentionAuthority();
  let authorityReads = 0;
  const dependencies = {
    now: () => "2026-10-05T00:00:00.000Z",
    readRetentionAuthority: async () => {
      authorityReads += 1;
      return structuredClone(authority);
    },
  };

  try {
    await rebuildTelemetryProjection(root, {
      runId,
      records: [terminalRecord(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    const plan = await planTelemetryPrune(
      root,
      {
        runId,
        telemetry: policy,
        writerRole: "loop-controller",
        verifyAccess,
        terminalStatus: "SUCCESS",
        terminalAt: "2026-07-01T00:00:00.000Z",
        now: "2026-10-05T00:00:00.000Z",
        retention: { run_metadata_days: 30, audit_evidence_days: 90 },
        legalHold: false,
        quarantined: false,
        reconciliationOutcome: null,
      },
      dependencies,
    );
    authority = retentionAuthority({ legal_hold: true });
    await assert.rejects(
      applyTelemetryPrune(
        root,
        {
          runId,
          telemetry: policy,
          writerRole: "loop-controller",
          verifyAccess,
          plan: plan.plan,
          planDigest: plan.plan_digest,
          currentEventHead: record(1).event_head_digest,
          legalHold: false,
          quarantined: false,
          reconciliationOutcome: null,
        },
        dependencies,
      ),
      /authority|hold|stale|plan/i,
    );
    assert.equal(authorityReads >= 2, true);
    await access(telemetryDirectory(root, runId));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 prune resumes safely after rename-before-remove failure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "loop-telemetry-prune-recovery-"));
  const policy = telemetryPolicy();
  const runId = "LER2-TEST-010-STORE";
  const verifyAccess = async ({ operation, role }) =>
    new Set(["WRITE", "PRUNE"]).has(operation) && role === "loop-controller";
  let removeAttempts = 0;
  const dependencies = {
    now: () => "2026-10-05T00:00:00.000Z",
    readRetentionAuthority: async () => retentionAuthority(),
    removeDirectory: async (target) => {
      removeAttempts += 1;
      if (removeAttempts === 1) throw new Error("FAULT_AFTER_RENAME");
      await rm(target, { recursive: true, force: false });
    },
  };

  try {
    await rebuildTelemetryProjection(root, {
      runId,
      records: [terminalRecord(1)],
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
    });
    const plan = await planTelemetryPrune(
      root,
      {
        runId,
        telemetry: policy,
        writerRole: "loop-controller",
        verifyAccess,
        terminalStatus: "SUCCESS",
        terminalAt: "2026-07-01T00:00:00.000Z",
        now: "2026-10-05T00:00:00.000Z",
        retention: { run_metadata_days: 30, audit_evidence_days: 90 },
        legalHold: false,
        quarantined: false,
        reconciliationOutcome: null,
      },
      dependencies,
    );
    const applyArgs = {
      runId,
      telemetry: policy,
      writerRole: "loop-controller",
      verifyAccess,
      plan: plan.plan,
      planDigest: plan.plan_digest,
      currentEventHead: record(1).event_head_digest,
      legalHold: false,
      quarantined: false,
      reconciliationOutcome: null,
    };
    await assert.rejects(
      applyTelemetryPrune(root, applyArgs, dependencies),
      /FAULT_AFTER_RENAME/,
    );
    const tombstone = `${telemetryDirectory(root, runId)}.pruned.${plan.plan_digest.slice(-16)}`;
    await assert.rejects(access(telemetryDirectory(root, runId)));
    await access(tombstone);

    const recovered = await applyTelemetryPrune(root, applyArgs, dependencies);
    assert.equal(recovered.recovered, true);
    assert.equal(removeAttempts, 2);
    await assert.rejects(access(telemetryDirectory(root, runId)));
    await assert.rejects(access(tombstone));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
