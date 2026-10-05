import assert from "node:assert/strict";
import test from "node:test";

import {
  assertHumanConfirmationAuthority,
  assertRecommendationAuthorityForMode,
  computeEffectiveBudget,
  normalizeConfirmedLimits,
  renderBudgetStopWizard,
} from "./budget-wizard.mjs";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;

function proposalFixture(overrides = {}) {
  return {
    schema: "budget_proposal_v2",
    contract_version: "2.0.0",
    proposal_id: "proposal-goal-006-start",
    run_id: "LER2-GOAL-006",
    phase: "START",
    queue_item_id: null,
    expected_run_version: 1,
    execution_mode: "OBSERVE",
    goal_ref: "FSD-LER2@1.0.0#GOAL-006",
    goal_digest: DIGEST_A,
    authority_digest: DIGEST_B,
    project_config_digest: DIGEST_A,
    verifier_ref: "FSD-LER2@1.0.0#TEST-006",
    verifier_digest: DIGEST_A,
    regression_verifier_digest: DIGEST_B,
    eval_definition_digest: DIGEST_B,
    policy_digest: DIGEST_A,
    autonomy_profile: "INTERACTIVE",
    risk_profile: "MEDIUM",
    billing_currency: "USD",
    pricing_revision: "pricing-2026-07-01",
    pricing_digest: DIGEST_B,
    display_context: {
      authority: "ADVISORY_DISPLAY_ONLY",
      source: "CONTRACT_DERIVED",
      source_digest: DIGEST_A,
      goal_summary: "Confirm the Budget & Stop Wizard admission boundary.",
      acceptance_criteria: [
        "A fresh TEST-006 verifier PASS is the only successful stop signal.",
      ],
    },
    recommendation_source: "MODEL_ADVISORY",
    recommended: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost_micro: null,
    },
    recommended_limits: {
      max_iterations: 10,
      max_runtime_minutes: null,
      max_no_progress_iterations: null,
      max_tokens: null,
      max_cost: null,
    },
    policy_ceiling: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    effective_preview: {
      max_iterations: 10,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 3,
      max_tokens: null,
      max_cost_micro: null,
    },
    consumed: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      cost_micro: null,
    },
    remaining: {
      iterations: 10,
      active_runtime_ms: 10_800_000,
      no_progress_iterations: 3,
      tokens: null,
      cost_micro: null,
    },
    lineage: {
      parent_run_id: null,
      root_run_id: "LER2-GOAL-006",
      run_count: 1,
    },
    lineage_totals: {
      iterations: 0,
      active_runtime_ms: 0,
      no_progress_iterations: 0,
      tokens: null,
      cost_micro: null,
    },
    recommendation_reason:
      "Ten bounded cycles cover implementation and independent verification.",
    null_warnings: [
      "max_runtime_minutes is null: no additional user-level cap; effective policy limit is 180 minutes.",
      "max_no_progress_iterations is null: no additional user-level cap; effective policy limit is 3 iterations.",
      "max_tokens is null: no additional user-level cap; no finite effective policy limit is configured.",
      "max_cost is null: no additional user-level cap; no finite effective policy limit is configured.",
    ],
    approval_ttl_minutes: 60,
    approval_expires_at: "2026-07-18T01:00:00.000Z",
    generated_at: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

test("confirmed limits require finite iterations and normalize max_cost to integer micro-units", () => {
  assert.deepEqual(
    normalizeConfirmedLimits(
      {
        max_iterations: 7,
        max_runtime_minutes: null,
        max_no_progress_iterations: 2,
        max_tokens: null,
        max_cost: "12.345678",
      },
      "USD",
    ),
    {
      max_iterations: 7,
      max_runtime_minutes: null,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost_micro: 12_345_678,
    },
  );
  for (const max_iterations of [null, 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () =>
        normalizeConfirmedLimits(
          {
            max_iterations,
            max_runtime_minutes: null,
            max_no_progress_iterations: null,
            max_tokens: null,
            max_cost: null,
          },
          "USD",
        ),
      /max_iterations/i,
    );
  }
  for (const max_cost of [
    "1,25",
    "1e2",
    "01.00",
    "0",
    "0.0000001",
    "9".repeat(100_000),
    1.25,
  ]) {
    assert.throws(
      () =>
        normalizeConfirmedLimits(
          {
            max_iterations: 1,
            max_runtime_minutes: null,
            max_no_progress_iterations: null,
            max_tokens: null,
            max_cost,
          },
          "USD",
        ),
      /max_cost/i,
    );
  }
});

test("effective budget is independently recomputed and nullable user fields preserve policy ceilings", () => {
  const ceiling = proposalFixture().policy_ceiling;
  const confirmed = normalizeConfirmedLimits(
    {
      max_iterations: 8,
      max_runtime_minutes: null,
      max_no_progress_iterations: 2,
      max_tokens: null,
      max_cost: null,
    },
    "USD",
  );
  assert.deepEqual(computeEffectiveBudget(ceiling, confirmed), {
    max_iterations: 8,
    max_runtime_minutes: 180,
    max_no_progress_iterations: 2,
    max_tokens: null,
    max_cost_micro: null,
  });
  assert.throws(
    () => computeEffectiveBudget(ceiling, { ...confirmed, max_iterations: 11 }),
    /policy ceiling|exceed/i,
  );
});

test("reference recommendations are simulation-only and ENFORCE requires model advisory input", () => {
  assert.doesNotThrow(() =>
    assertRecommendationAuthorityForMode("OBSERVE", "REFERENCE_ADAPTER_ADVISORY"),
  );
  assert.doesNotThrow(() =>
    assertRecommendationAuthorityForMode("OBSERVE", "MODEL_ADVISORY"),
  );
  assert.doesNotThrow(() =>
    assertRecommendationAuthorityForMode("ENFORCE", "MODEL_ADVISORY"),
  );
  assert.throws(
    () =>
      assertRecommendationAuthorityForMode(
        "ENFORCE",
        "REFERENCE_ADAPTER_ADVISORY",
      ),
    /POLICY_STOP.*ENFORCE.*MODEL_ADVISORY/i,
  );
});

test("pure renderer exposes advisory recommendation, human actions, bindings, null warnings, and cost semantics", () => {
  const proposal = proposalFixture();
  const wizard = renderBudgetStopWizard(proposal, DIGEST_B);
  assert.equal(wizard.schema, "budget_stop_wizard_v2");
  assert.equal(wizard.phase, "START");
  assert.equal(wizard.goal.summary, proposal.display_context.goal_summary);
  assert.equal(wizard.verifier.regression_verifier_digest, DIGEST_B);
  assert.deepEqual(wizard.goal.acceptance_criteria, proposal.display_context.acceptance_criteria);
  assert.equal(wizard.recommendation.authority, "ADVISORY_ONLY");
  assert.deepEqual(wizard.actions.map((entry) => entry.id), ["Confirm", "Cancel"]);
  assert.deepEqual(wizard.user_values_to_confirm, proposal.recommended_limits);
  assert.deepEqual(wizard.effective_values, proposal.effective_preview);
  assert.deepEqual(wizard.consumed, proposal.consumed);
  assert.deepEqual(wizard.remaining, proposal.remaining);
  assert.deepEqual(wizard.lineage_totals, proposal.lineage_totals);
  assert.equal(wizard.cost.currency, "USD");
  assert.equal(wizard.cost.pricing_revision, "pricing-2026-07-01");
  assert.equal(wizard.cost.pricing_digest, DIGEST_B);
  assert.equal(wizard.cost.micro_units_per_unit, 1_000_000);
  assert.equal(wizard.approval.expires_at, proposal.approval_expires_at);
  assert.equal(wizard.approval.proposal_digest, DIGEST_B);
  assert.equal(wizard.null_warnings.length, 4);

  wizard.goal.acceptance_criteria[0] = "mutated";
  wizard.remaining.iterations = 0;
  wizard.actions[0].id = "mutated";
  assert.notEqual(proposal.display_context.acceptance_criteria[0], "mutated");
  assert.equal(proposal.remaining.iterations, 10);
  assert.equal(renderBudgetStopWizard(proposal, DIGEST_B).actions[0].id, "Confirm");

  assert.throws(
    () => renderBudgetStopWizard({ ...proposal, execution_mode: "DISABLED" }, DIGEST_B),
    /not valid.*render/i,
  );
  assert.throws(
    () =>
      renderBudgetStopWizard(
        {
          ...proposal,
          execution_mode: "ENFORCE",
          recommendation_source: "REFERENCE_ADAPTER_ADVISORY",
        },
        DIGEST_B,
      ),
    /POLICY_STOP.*ENFORCE.*MODEL_ADVISORY/i,
  );
  assert.throws(
    () =>
      renderBudgetStopWizard(
        {
          ...proposal,
          null_warnings: proposal.null_warnings.map((warning, index) =>
            index === 0
              ? "max_runtime_minutes is null: unlimited globally."
              : warning,
          ),
        },
        DIGEST_B,
      ),
    /null warnings.*exactly match/i,
  );
  assert.throws(
    () =>
      renderBudgetStopWizard(
        { ...proposal, remaining: { ...proposal.remaining, iterations: 999 } },
        DIGEST_B,
      ),
    /remaining.*do not match/i,
  );
  assert.throws(
    () =>
      renderBudgetStopWizard(
        {
          ...proposal,
          display_context: {
            ...proposal.display_context,
            acceptance_criteria: ["x".repeat(501)],
          },
        },
        DIGEST_B,
      ),
    /acceptance criterion.*bounded/i,
  );
  assert.throws(
    () =>
      renderBudgetStopWizard(
        {
          ...proposal,
          recommendation_reason: "Use token=secret-value for the bounded run.",
        },
        DIGEST_B,
      ),
    /recommendation reason.*sanitized/i,
  );
});

test("ENFORCE host-human claims require an injected verifier while OBSERVE remains simulation-only", async () => {
  const confirmation = {
    approver: {
      actor_id: "human-owner",
      actor_type: "HUMAN",
      attestation: "HOST_ATTESTED_HUMAN",
    },
  };
  await assert.rejects(
    assertHumanConfirmationAuthority({
      mode: "ENFORCE",
      confirmation,
      attestationContext: { confirmation_digest: DIGEST_A },
    }),
    /APPROVAL_REQUIRED.*host attestation/i,
  );
  await assert.doesNotReject(
    assertHumanConfirmationAuthority({
      mode: "ENFORCE",
      confirmation,
      attestationContext: { confirmation_digest: DIGEST_A },
      verifyHostAttestation: async (context) =>
        context.confirmation_digest === DIGEST_A,
    }),
  );
  await assert.rejects(
    assertHumanConfirmationAuthority({
      mode: "OBSERVE",
      confirmation,
      attestationContext: { confirmation_digest: DIGEST_A },
    }),
    (error) => error.code === "APPROVAL_REQUIRED" && /host attestation/i.test(error.message),
  );
  await assert.doesNotReject(
    assertHumanConfirmationAuthority({
      mode: "OBSERVE",
      confirmation: {
        approver: {
          actor_id: "local-human",
          actor_type: "HUMAN",
          attestation: "LOCAL_OBSERVE_HUMAN",
        },
      },
      attestationContext: { confirmation_digest: DIGEST_A },
    }),
  );
  await assert.rejects(
    assertHumanConfirmationAuthority({
      mode: "OBSERVE",
      confirmation: {
        approver: {
          actor_id: "model",
          actor_type: "MODEL",
          attestation: "LOCAL_OBSERVE_HUMAN",
        },
      },
      attestationContext: { confirmation_digest: DIGEST_A },
    }),
    /APPROVAL_REQUIRED.*human/i,
  );
});
