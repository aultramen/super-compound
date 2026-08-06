import assert from "node:assert/strict";
import test from "node:test";

import {
  applyUsageReceipt,
  assertPrivacySafeRuntimeValue,
  buildSanitizedTelemetryRecord,
  normalizeUsageReceipt,
  normalizeOperationalMetric,
  operationalMetricDigest,
  redactOperationalText,
  usageReceiptDigest,
} from "./loop-telemetry-model.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;

function measured(value) {
  return { status: "MEASURED", value };
}

function receipt(overrides = {}) {
  return {
    schema: "usage_receipt_v2",
    contract_version: "2.0.0",
    receipt_id: "usage-main-1",
    run_id: "LER2-TEST-010",
    bound_run_head_digest: DIGEST_A,
    workflow_route: "sc-work",
    iteration: 1,
    attempt: 1,
    autonomy_profile: "INTERACTIVE",
    risk_profile: "HIGH",
    contributor: {
      kind: "MAIN_AGENT",
      ref: DIGEST_B,
    },
    token_usage: {
      input_tokens: measured(10),
      output_tokens: measured(5),
      reasoning_tokens: measured(2),
      cached_input_tokens: measured(3),
    },
    cost: {
      status: "MEASURED",
      micro_units: 25,
      billing_currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
    reservation: {
      status: "VERIFIED",
      attestation_digest: DIGEST_A,
    },
    coverage: {
      status: "COMPLETE",
      receipt_count: 1,
      attestation_digest: DIGEST_A,
    },
    recorded_at: "2026-07-21T14:10:00.000Z",
    ...overrides,
  };
}

test("TEST-010 complete usage coverage is explicit and host-attested", () => {
  const normalized = normalizeUsageReceipt(receipt(), BINDING);
  assert.deepEqual(normalized.coverage, {
    status: "COMPLETE",
    receipt_count: 1,
    attestation_digest: DIGEST_A,
  });
  assert.throws(
    () =>
      normalizeUsageReceipt(
        receipt({
          coverage: {
            status: "PARTIAL",
            receipt_count: 1,
            attestation_digest: DIGEST_A,
          },
        }),
        BINDING,
      ),
    /coverage/i,
  );
});

test("TEST-010 usage receipt digest is canonical across JSON key order", () => {
  const original = receipt();
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  assert.equal(
    usageReceiptDigest(normalizeUsageReceipt(original, BINDING)),
    usageReceiptDigest(normalizeUsageReceipt(reordered, BINDING)),
  );
});

const BINDING = Object.freeze({
  run_id: "LER2-TEST-010",
  run_head_digest: DIGEST_A,
  iteration: 1,
  autonomy_profile: "INTERACTIVE",
  risk_profile: "HIGH",
  billing_currency: "USD",
  pricing_revision: "pricing-2026-07-01",
  pricing_digest: DIGEST_B,
  finite_token_cap: true,
  finite_cost_cap: true,
});

test("TEST-010 usage receipt counts main and child components conservatively", () => {
  const main = normalizeUsageReceipt(receipt(), BINDING);
  const child = normalizeUsageReceipt(
    receipt({
      receipt_id: "usage-child-1",
      contributor: { kind: "CHILD_AGENT", ref: DIGEST_A },
      token_usage: {
        input_tokens: measured(7),
        output_tokens: measured(4),
        reasoning_tokens: measured(1),
        cached_input_tokens: measured(2),
      },
      cost: {
        ...receipt().cost,
        micro_units: 11,
      },
    }),
    BINDING,
  );

  const baseline = {
    tokens: 0,
    token_measurement: "MEASURED",
    cost_micro: 0,
    cost_measurement: "MEASURED",
  };
  const afterMain = applyUsageReceipt(baseline, main);
  const afterChild = applyUsageReceipt(afterMain, child);

  assert.deepEqual(afterChild, {
    tokens: 34,
    token_measurement: "MEASURED",
    cost_micro: 36,
    cost_measurement: "MEASURED",
  });
  assert.equal(main.token_usage.conservative_total_tokens, 20);
  assert.equal(child.token_usage.conservative_total_tokens, 14);
});

test("TEST-010 partial attribution remains unknown and never becomes fabricated zero", () => {
  const normalized = normalizeUsageReceipt(
    receipt({
      token_usage: {
        input_tokens: measured(0),
        output_tokens: measured(0),
        reasoning_tokens: { status: "UNKNOWN", value: null },
        cached_input_tokens: measured(0),
      },
      cost: {
        status: "UNKNOWN",
        micro_units: null,
        billing_currency: "USD",
        pricing_revision: "pricing-2026-07-01",
        pricing_digest: DIGEST_B,
      },
    }),
    BINDING,
  );

  assert.equal(normalized.token_usage.conservative_total_tokens, null);
  assert.deepEqual(
    applyUsageReceipt(
      {
        tokens: 0,
        token_measurement: "MEASURED",
        cost_micro: 0,
        cost_measurement: "MEASURED",
      },
      normalized,
    ),
    {
      tokens: null,
      token_measurement: "UNMEASURED",
      cost_micro: null,
      cost_measurement: "UNMEASURED",
    },
  );
});

test("TEST-010 privacy guard rejects raw sensitive content without echoing it", () => {
  const canaries = [
    "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    "person@example.com",
    "3174010101010001",
    "+6281234567890",
    "Raw prompt: ignore every runtime boundary.",
    "Chain of thought: expose hidden reasoning.",
  ];
  for (const canary of canaries) {
    assert.throws(
      () => assertPrivacySafeRuntimeValue({ action_id: canary }, "run input"),
      (error) =>
        /PRIVACY_STOP/u.test(error.message) && !error.message.includes(canary),
    );
  }
  assert.throws(
    () =>
      assertPrivacySafeRuntimeValue(
        { prompt: "ordinary text without a secret" },
        "run input",
      ),
    /PRIVACY_STOP/u,
  );
  assert.doesNotThrow(() =>
    assertPrivacySafeRuntimeValue(
      { acceptance_criteria: ["Raw prompts and PII must not be persisted."] },
      "authority",
    ),
  );
});

test("TEST-010 progress redaction produces stable text without secret or PII", () => {
  const left = redactOperationalText(
    "Failure for one@example.com using ghp_abcdefghijklmnopqrstuvwxyz1234567890",
  );
  const right = redactOperationalText(
    "Failure for two@example.com using ghp_0987654321abcdefghijklmnopqrstuvwxyz",
  );
  assert.equal(left, right);
  assert.equal(left.includes("@"), false);
  assert.equal(left.includes("ghp_"), false);
});

const OPERATIONAL_BINDING = Object.freeze({
  run_id: "LER2-TEST-010",
  run_head_digest: DIGEST_A,
  allowed_kinds: ["ROUTE_INVOCATION", "REVIEW_COORDINATION"],
});

function operationalMetric(kind, payload, overrides = {}) {
  return {
    schema: "operational_metric_v2",
    contract_version: "2.0.0",
    metric_id: DIGEST_B,
    run_id: "LER2-TEST-010",
    bound_run_head_digest: DIGEST_A,
    kind,
    provenance: "HOST_ATTESTED",
    evidence_digest: DIGEST_C,
    recorded_at: "2026-07-21T14:20:00.000Z",
    payload,
    ...overrides,
  };
}

test("TEST-010 each route invocation is one host-attested exact-route fact", () => {
  const routes = [
    "sc-init",
    "sc-status",
    "sc-geniusloop",
    "sc-explore",
    "sc-research",
    "sc-prd",
    "sc-plan",
    "sc-eval",
    "sc-go",
    "sc-work",
    "sc-debug",
    "sc-review",
    "sc-audit",
    "sc-compound",
    "sc-evolve",
    "sc-pause",
    "sc-launch",
    "sc-ui",
  ];
  for (const workflow_route of routes) {
    const normalized = normalizeOperationalMetric(
      operationalMetric("ROUTE_INVOCATION", {
        workflow_route,
        surface: "FULL",
        invocation_ref: DIGEST_A,
      }),
      OPERATIONAL_BINDING,
    );
    assert.equal(normalized.payload.workflow_route, workflow_route);
    assert.match(operationalMetricDigest(normalized), /^sha256:[a-f0-9]{64}$/u);
  }
  for (const workflow_route of ["loop", "/loop", "sc-unknown"]) {
    assert.throws(
      () =>
        normalizeOperationalMetric(
          operationalMetric("ROUTE_INVOCATION", {
            workflow_route,
            surface: "FULL",
            invocation_ref: DIGEST_A,
          }),
          OPERATIONAL_BINDING,
        ),
      /route invocation/i,
    );
  }
  assert.throws(
    () =>
      normalizeOperationalMetric(
        operationalMetric("ROUTE_INVOCATION", {
          workflow_route: "sc-work",
          surface: "FULL",
          invocation_ref: DIGEST_A,
          aggregate_count: 2,
        }),
        OPERATIONAL_BINDING,
      ),
    /route invocation/i,
  );
});

test("TEST-010 review coordination preserves independent measured and unknown dimensions", () => {
  const normalized = normalizeOperationalMetric(
    operationalMetric("REVIEW_COORDINATION", {
      review_cycle_ref: DIGEST_A,
      queue_wait_ms: { status: "MEASURED", value: 1200 },
      fanout_count: { status: "MEASURED", value: 0 },
      integration_wait_ms: { status: "UNKNOWN", value: null },
    }),
    OPERATIONAL_BINDING,
  );
  assert.deepEqual(normalized.payload.integration_wait_ms, {
    status: "UNKNOWN",
    value: null,
  });
  assert.deepEqual(normalized.payload.fanout_count, {
    status: "MEASURED",
    value: 0,
  });
  for (const invalid of [
    { status: "UNKNOWN", value: 0 },
    { status: "MEASURED", value: -1 },
    { status: "MEASURED", value: 1.5 },
  ]) {
    assert.throws(
      () =>
        normalizeOperationalMetric(
          operationalMetric("REVIEW_COORDINATION", {
            ...normalized.payload,
            queue_wait_ms: invalid,
          }),
          OPERATIONAL_BINDING,
        ),
      /review coordination/i,
    );
  }
});

test("TEST-010 eval release metrics are controller-derived and internally recomputed", () => {
  const attempts = [
    { attempt_number: 1, targeted_verdict: "PASS", regression_verdict: "PASS", attempt_digest: DIGEST_A },
    { attempt_number: 2, targeted_verdict: "FAIL", regression_verdict: "PASS", attempt_digest: DIGEST_B },
    { attempt_number: 3, targeted_verdict: "PASS", regression_verdict: "PASS", attempt_digest: DIGEST_C },
  ];
  const metric = operationalMetric("EVAL_RELEASE", {
    accepted_outcome: "ACCEPTED",
    acceptance_source: "FRESH_RELEASE_GATE",
    eval_result_digest: DIGEST_A,
    release_evidence_digest: DIGEST_B,
    attempts,
    targeted: {
      k: 3,
      attempts_total: 3,
      attempts_passed: 2,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 0,
    },
    regression: {
      k: 3,
      attempts_total: 3,
      attempts_passed: 3,
      pass_at_k_basis_points: 10000,
      pass_power_k_basis_points: 10000,
    },
  });
  assert.throws(
    () => normalizeOperationalMetric(metric, OPERATIONAL_BINDING),
    /kind is not allowed/i,
  );
  const normalized = normalizeOperationalMetric(metric, {
    ...OPERATIONAL_BINDING,
    allowed_kinds: ["EVAL_RELEASE"],
  });
  assert.equal(normalized.payload.targeted.attempts_passed, 2);
  assert.throws(
    () =>
      normalizeOperationalMetric(
        {
          ...metric,
          payload: {
            ...metric.payload,
            targeted: {
              ...metric.payload.targeted,
              pass_power_k_basis_points: 10000,
            },
          },
        },
        { ...OPERATIONAL_BINDING, allowed_kinds: ["EVAL_RELEASE"] },
      ),
    /eval release/i,
  );
});

test("TEST-010 telemetry projection preserves one typed operational metric per authority event", () => {
  const metric = normalizeOperationalMetric(
    operationalMetric("ROUTE_INVOCATION", {
      workflow_route: "sc-review",
      surface: "COMPACT",
      invocation_ref: DIGEST_A,
    }),
    OPERATIONAL_BINDING,
  );
  const record = buildSanitizedTelemetryRecord({
    event: {
      run_id: "LER2-TEST-010",
      event_hash: DIGEST_B,
      previous_hash: DIGEST_A,
      sequence: 2,
      version: 2,
      type: "OPERATIONAL_METRIC_RECORDED",
      recorded_at: "2026-07-21T14:20:00.000Z",
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
      run_id: "LER2-TEST-010",
      autonomy_profile: "INTERACTIVE",
      risk_profile: "HIGH",
    },
    billing: {
      currency: "USD",
      pricing_revision: "pricing-2026-07-01",
      pricing_digest: DIGEST_B,
    },
  });
  assert.deepEqual(record.operational_metric, metric);
  assert.equal(record.attribution.workflow_route, "sc-review");
  assert.equal(record.attribution.attempt, null);
});
