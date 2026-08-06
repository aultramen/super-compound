const MAX_RUNTIME_MINUTES = Math.floor(Number.MAX_SAFE_INTEGER / 60_000);
const MICRO_UNITS_PER_UNIT = 1_000_000n;
const BUDGET_FIELDS = Object.freeze([
  "max_iterations",
  "max_runtime_minutes",
  "max_no_progress_iterations",
  "max_tokens",
  "max_cost_micro",
]);
const CONFIRMED_LIMIT_FIELDS = Object.freeze([
  "max_iterations",
  "max_runtime_minutes",
  "max_no_progress_iterations",
  "max_tokens",
  "max_cost",
]);
const PROPOSAL_FIELDS = Object.freeze([
  "schema",
  "contract_version",
  "proposal_id",
  "run_id",
  "phase",
  "queue_item_id",
  "expected_run_version",
  "execution_mode",
  "goal_ref",
  "goal_digest",
  "authority_digest",
  "project_config_digest",
  "verifier_ref",
  "verifier_digest",
  "regression_verifier_digest",
  "eval_definition_digest",
  "policy_digest",
  "autonomy_profile",
  "risk_profile",
  "billing_currency",
  "pricing_revision",
  "pricing_digest",
  "display_context",
  "recommendation_source",
  "recommended",
  "recommended_limits",
  "policy_ceiling",
  "effective_preview",
  "consumed",
  "remaining",
  "lineage",
  "lineage_totals",
  "recommendation_reason",
  "null_warnings",
  "approval_ttl_minutes",
  "approval_expires_at",
  "generated_at",
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

function assertPositiveIntegerOrNull(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (
    value !== null &&
    (!Number.isSafeInteger(value) || value <= 0 || value > maximum)
  ) {
    throw new TypeError(`${label} must be null or a positive safe integer.`);
  }
}

function assertMachineBudget(value, label) {
  if (!hasExactFields(value, BUDGET_FIELDS)) {
    throw new TypeError(`${label} must contain the exact machine budget fields.`);
  }
  for (const field of BUDGET_FIELDS) {
    assertPositiveIntegerOrNull(
      value[field],
      `${label} ${field}`,
      field === "max_runtime_minutes" ? MAX_RUNTIME_MINUTES : Number.MAX_SAFE_INTEGER,
    );
  }
  if (value.max_iterations === null) {
    throw new TypeError(`${label} max_iterations must be a positive safe integer.`);
  }
}

function machineBudgetEqual(left, right) {
  return BUDGET_FIELDS.every((field) => left[field] === right[field]);
}

function counterSetEqual(left, right) {
  return [
    "iterations",
    "active_runtime_ms",
    "no_progress_iterations",
    "tokens",
    "cost_micro",
  ].every((field) => left[field] === right[field]);
}

export function isSanitizedRecommendationReason(value) {
  if (
    typeof value !== "string" ||
    value.length < 2 ||
    value.length > 240 ||
    value !== value.trim() ||
    !/^[\p{L}\p{N}][\p{L}\p{N} ,;:'()_+\-]{0,238}[.!?]$/u.test(value) ||
    /[.!?]/u.test(value.slice(0, -1))
  ) {
    return false;
  }
  return !/(?:api[_ -]?key|password|private key|raw prompt|chain[_ -]?of[_ -]?thought|secret|token\s*[:=])/iu.test(
    value,
  );
}

export function assertRecommendationAuthorityForMode(mode, source) {
  if (!new Set(["OBSERVE", "ENFORCE"]).has(mode)) {
    throw new TypeError("Budget recommendation mode is not executable.");
  }
  if (!new Set(["MODEL_ADVISORY", "REFERENCE_ADAPTER_ADVISORY"]).has(source)) {
    throw new TypeError("Budget recommendation source is not supported.");
  }
  if (mode === "ENFORCE" && source !== "MODEL_ADVISORY") {
    throw new Error(
      "POLICY_STOP: ENFORCE budget proposal requires one bound MODEL_ADVISORY input.",
    );
  }
}

export function deriveNullWarnings(recommendedLimits, effectiveBudget) {
  if (!hasExactFields(recommendedLimits, CONFIRMED_LIMIT_FIELDS)) {
    throw new TypeError("Recommended limits must contain the exact wizard input fields.");
  }
  assertMachineBudget(effectiveBudget, "Effective preview");
  return [
    ["max_runtime_minutes", "max_runtime_minutes", " minutes"],
    [
      "max_no_progress_iterations",
      "max_no_progress_iterations",
      " iterations",
    ],
    ["max_tokens", "max_tokens", " tokens"],
    ["max_cost", "max_cost_micro", " micro-units"],
  ]
    .filter(([inputField]) => recommendedLimits[inputField] === null)
    .map(([inputField, machineField, unit]) => {
      const effectiveValue = effectiveBudget[machineField];
      if (effectiveValue === null) {
        return `${inputField} is null: no additional user-level cap; no finite effective policy limit is configured.`;
      }
      return `${inputField} is null: no additional user-level cap; effective policy limit is ${effectiveValue}${unit}.`;
    });
}

function normalizeCostToMicro(value) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new TypeError("max_cost must be null or a decimal string.");
  }
  if (value.length > 32) {
    throw new TypeError("max_cost exceeds the bounded decimal input length.");
  }
  const match = /^(?:0|[1-9]\d*)(?:\.(\d{1,6}))?$/u.exec(value);
  if (match === null || /^0(?:\.0{1,6})?$/u.test(value)) {
    throw new TypeError(
      "max_cost must be a positive locale-independent decimal string with at most 6 fractional digits.",
    );
  }
  const [wholeText, fractionText = ""] = value.split(".");
  const micro =
    BigInt(wholeText) * MICRO_UNITS_PER_UNIT +
    BigInt(fractionText.padEnd(6, "0"));
  if (micro <= 0n || micro > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("max_cost exceeds the safe integer micro-unit range.");
  }
  return Number(micro);
}

export function normalizeConfirmedLimits(confirmedLimits, billingCurrency) {
  if (!hasExactFields(confirmedLimits, CONFIRMED_LIMIT_FIELDS)) {
    throw new TypeError("Confirmed limits must contain the exact wizard input fields.");
  }
  if (!/^[A-Z]{3}$/u.test(billingCurrency ?? "")) {
    throw new TypeError("Billing currency must be an uppercase ISO-style currency code.");
  }
  if (
    !Number.isSafeInteger(confirmedLimits.max_iterations) ||
    confirmedLimits.max_iterations <= 0
  ) {
    throw new TypeError("max_iterations must be a positive safe integer.");
  }
  assertPositiveIntegerOrNull(
    confirmedLimits.max_runtime_minutes,
    "max_runtime_minutes",
    MAX_RUNTIME_MINUTES,
  );
  assertPositiveIntegerOrNull(
    confirmedLimits.max_no_progress_iterations,
    "max_no_progress_iterations",
  );
  assertPositiveIntegerOrNull(confirmedLimits.max_tokens, "max_tokens");
  return {
    max_iterations: confirmedLimits.max_iterations,
    max_runtime_minutes: confirmedLimits.max_runtime_minutes,
    max_no_progress_iterations: confirmedLimits.max_no_progress_iterations,
    max_tokens: confirmedLimits.max_tokens,
    max_cost_micro: normalizeCostToMicro(confirmedLimits.max_cost),
  };
}

export function computeEffectiveBudget(policyCeiling, confirmedBudget) {
  assertMachineBudget(policyCeiling, "Policy ceiling");
  assertMachineBudget(confirmedBudget, "Confirmed budget");
  const effective = {};
  for (const field of BUDGET_FIELDS) {
    const ceiling = policyCeiling[field];
    const confirmed = confirmedBudget[field];
    if (ceiling !== null && confirmed !== null && confirmed > ceiling) {
      throw new TypeError(`Confirmed ${field} cannot exceed the current policy ceiling.`);
    }
    effective[field] = confirmed === null ? ceiling : ceiling === null ? confirmed : confirmed;
  }
  return effective;
}

function cloneFrozen(value) {
  const cloned = structuredClone(value);
  const freeze = (candidate) => {
    if (candidate === null || typeof candidate !== "object" || Object.isFrozen(candidate)) {
      return candidate;
    }
    for (const child of Object.values(candidate)) freeze(child);
    return Object.freeze(candidate);
  };
  return freeze(cloned);
}

function approvalError(message) {
  const error = new Error(`APPROVAL_REQUIRED: ${message}`);
  error.code = "APPROVAL_REQUIRED";
  return error;
}

function validDigest(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function validIdentifier(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)
  );
}

function validUtcDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(value)
  );
}

function assertBoundedText(value, label, maximum) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }
}

function assertCounterSet(value, label, nullableRuntime = false) {
  const fields = [
    "iterations",
    "active_runtime_ms",
    "no_progress_iterations",
    "tokens",
    "cost_micro",
  ];
  if (!hasExactFields(value, fields)) {
    throw new TypeError(`${label} must contain the exact counter fields.`);
  }
  for (const field of fields) {
    const candidate = value[field];
    const nullable =
      field === "tokens" ||
      field === "cost_micro" ||
      (nullableRuntime &&
        new Set(["active_runtime_ms", "no_progress_iterations"]).has(field));
    if (
      (candidate === null && !nullable) ||
      (candidate !== null && (!Number.isSafeInteger(candidate) || candidate < 0))
    ) {
      throw new TypeError(`${label} ${field} must be a bounded non-negative counter.`);
    }
  }
}

export async function assertHumanConfirmationAuthority({
  mode,
  confirmation,
  attestationContext,
  verifyHostAttestation,
} = {}) {
  const approver = confirmation?.approver;
  if (
    !isPlainObject(approver) ||
    approver.actor_type !== "HUMAN" ||
    typeof approver.actor_id !== "string" ||
    approver.actor_id.length === 0
  ) {
    throw approvalError("confirmation must identify a human actor.");
  }
  if (mode === "OBSERVE") {
    if (approver.attestation === "LOCAL_OBSERVE_HUMAN") {
      return { authority_scope: "SIMULATION_ONLY" };
    }
    if (approver.attestation === "HOST_ATTESTED_HUMAN") {
      if (typeof verifyHostAttestation !== "function") {
        throw approvalError("claimed host attestation requires verification.");
      }
    } else {
      throw approvalError("OBSERVE requires a human confirmation attestation.");
    }
    let verified = false;
    try {
      verified =
        (await verifyHostAttestation(cloneFrozen(attestationContext))) === true;
    } catch {
      verified = false;
    }
    if (!verified) {
      throw approvalError("claimed host attestation verification failed.");
    }
    return { authority_scope: "SIMULATION_ONLY" };
  }
  if (mode !== "ENFORCE") {
    throw approvalError("current mode cannot admit execution.");
  }
  if (
    approver.attestation !== "HOST_ATTESTED_HUMAN" ||
    typeof verifyHostAttestation !== "function"
  ) {
    throw approvalError("ENFORCE requires verified host attestation.");
  }
  let verified = false;
  try {
    verified =
      (await verifyHostAttestation(cloneFrozen(attestationContext))) === true;
  } catch {
    verified = false;
  }
  if (!verified) {
    throw approvalError("ENFORCE host attestation verification failed.");
  }
  return { authority_scope: "MUTATION_AUTHORITY" };
}

function assertProposalForRendering(proposal, proposalDigest) {
  if (
    !hasExactFields(proposal, PROPOSAL_FIELDS) ||
    proposal.schema !== "budget_proposal_v2" ||
    proposal.contract_version !== "2.0.0" ||
    !validDigest(proposalDigest) ||
    !validIdentifier(proposal.proposal_id) ||
    !validIdentifier(proposal.run_id) ||
    !new Set(["START", "RESUME"]).has(proposal.phase) ||
    (proposal.queue_item_id !== null && !validIdentifier(proposal.queue_item_id)) ||
    !Number.isSafeInteger(proposal.expected_run_version) ||
    proposal.expected_run_version < 0 ||
    !new Set(["OBSERVE", "ENFORCE"]).has(
      proposal.execution_mode,
    ) ||
    !validDigest(proposal.goal_digest) ||
    !validDigest(proposal.authority_digest) ||
    !validDigest(proposal.project_config_digest) ||
    !validDigest(proposal.verifier_digest) ||
    (proposal.regression_verifier_digest !== null &&
      !validDigest(proposal.regression_verifier_digest)) ||
    !validDigest(proposal.eval_definition_digest) ||
    !validDigest(proposal.policy_digest) ||
    !new Set(["INTERACTIVE", "BACKGROUND"]).has(proposal.autonomy_profile) ||
    !new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).has(proposal.risk_profile) ||
    !/^[A-Z]{3}$/u.test(proposal.billing_currency ?? "") ||
    !new Set(["MODEL_ADVISORY", "REFERENCE_ADAPTER_ADVISORY"]).has(
      proposal.recommendation_source,
    ) ||
    !hasExactFields(proposal.display_context, [
      "authority",
      "source",
      "source_digest",
      "goal_summary",
      "acceptance_criteria",
    ]) ||
    proposal.display_context?.authority !== "ADVISORY_DISPLAY_ONLY" ||
    proposal.display_context?.source !== "CONTRACT_DERIVED" ||
    !validDigest(proposal.display_context?.source_digest) ||
    !Array.isArray(proposal.display_context?.acceptance_criteria) ||
    proposal.display_context.acceptance_criteria.length === 0 ||
    proposal.display_context.acceptance_criteria.length > 10 ||
    new Set(proposal.display_context.acceptance_criteria).size !==
      proposal.display_context.acceptance_criteria.length ||
    !Array.isArray(proposal.null_warnings) ||
    proposal.null_warnings.length > 4 ||
    new Set(proposal.null_warnings).size !== proposal.null_warnings.length ||
    !Number.isSafeInteger(proposal.approval_ttl_minutes) ||
    proposal.approval_ttl_minutes <= 0 ||
    proposal.approval_ttl_minutes > 525_600 ||
    !validUtcDateTime(proposal.generated_at) ||
    !validUtcDateTime(proposal.approval_expires_at) ||
    (proposal.pricing_revision !== null &&
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(proposal.pricing_revision)) ||
    (proposal.pricing_digest !== null && !validDigest(proposal.pricing_digest)) ||
    (proposal.pricing_revision === null) !== (proposal.pricing_digest === null) ||
    (proposal.effective_preview?.max_cost_micro !== null &&
      proposal.pricing_revision === null)
  ) {
    throw new TypeError("Budget proposal is not valid for strict wizard rendering.");
  }
  assertRecommendationAuthorityForMode(
    proposal.execution_mode,
    proposal.recommendation_source,
  );
  assertBoundedText(proposal.goal_ref, "goal_ref", 256);
  assertBoundedText(proposal.verifier_ref, "verifier_ref", 256);
  assertBoundedText(proposal.display_context.goal_summary, "goal summary", 1000);
  if (!isSanitizedRecommendationReason(proposal.recommendation_reason)) {
    throw new TypeError("Recommendation reason must be one sanitized bounded sentence.");
  }
  for (const criterion of proposal.display_context.acceptance_criteria) {
    assertBoundedText(criterion, "acceptance criterion", 500);
  }
  for (const warning of proposal.null_warnings) {
    assertBoundedText(warning, "null warning", 500);
  }
  assertMachineBudget(proposal.recommended, "Recommended budget");
  assertMachineBudget(proposal.policy_ceiling, "Policy ceiling");
  assertMachineBudget(proposal.effective_preview, "Effective preview");
  const normalizedRecommended = normalizeConfirmedLimits(
    proposal.recommended_limits,
    proposal.billing_currency,
  );
  if (!machineBudgetEqual(normalizedRecommended, proposal.recommended)) {
    throw new TypeError("Recommended display limits do not match their machine budget.");
  }
  if (
    !machineBudgetEqual(
      computeEffectiveBudget(proposal.policy_ceiling, proposal.recommended),
      proposal.effective_preview,
    )
  ) {
    throw new TypeError("Effective preview does not match restrictive policy recomputation.");
  }
  assertCounterSet(proposal.consumed, "consumed counters");
  assertCounterSet(proposal.remaining, "remaining counters", true);
  assertCounterSet(proposal.lineage_totals, "lineage totals");
  if (
    (proposal.autonomy_profile === "INTERACTIVE" && proposal.queue_item_id !== null) ||
    (proposal.autonomy_profile === "BACKGROUND" && proposal.queue_item_id === null)
  ) {
    throw new TypeError("Proposal queue item does not match its autonomy profile.");
  }
  const expectedRemaining = {
    iterations: Math.max(
      0,
      proposal.effective_preview.max_iterations - proposal.consumed.iterations,
    ),
    active_runtime_ms:
      proposal.effective_preview.max_runtime_minutes === null
        ? null
        : Math.max(
            0,
            proposal.effective_preview.max_runtime_minutes * 60_000 -
              proposal.consumed.active_runtime_ms,
          ),
    no_progress_iterations:
      proposal.effective_preview.max_no_progress_iterations === null
        ? null
        : Math.max(
            0,
            proposal.effective_preview.max_no_progress_iterations -
              proposal.consumed.no_progress_iterations,
          ),
    tokens:
      proposal.effective_preview.max_tokens === null ||
      proposal.consumed.tokens === null
        ? null
        : Math.max(
            0,
            proposal.effective_preview.max_tokens - proposal.consumed.tokens,
          ),
    cost_micro:
      proposal.effective_preview.max_cost_micro === null ||
      proposal.consumed.cost_micro === null
        ? null
        : Math.max(
            0,
            proposal.effective_preview.max_cost_micro -
              proposal.consumed.cost_micro,
          ),
  };
  if (!counterSetEqual(expectedRemaining, proposal.remaining)) {
    throw new TypeError("Proposal remaining counters do not match consumed totals.");
  }
  const expectedWarnings = deriveNullWarnings(
    proposal.recommended_limits,
    proposal.effective_preview,
  );
  if (
    proposal.null_warnings.length !== expectedWarnings.length ||
    !proposal.null_warnings.every(
      (warning, index) => warning === expectedWarnings[index],
    )
  ) {
    throw new TypeError(
      "Proposal null warnings must exactly match the effective nullable caps.",
    );
  }
  if (
    !hasExactFields(proposal.lineage, [
      "parent_run_id",
      "root_run_id",
      "run_count",
    ]) ||
    (proposal.lineage.parent_run_id !== null &&
      !validIdentifier(proposal.lineage.parent_run_id)) ||
    !validIdentifier(proposal.lineage.root_run_id) ||
    !Number.isSafeInteger(proposal.lineage.run_count) ||
    proposal.lineage.run_count <= 0 ||
    proposal.lineage.run_count > 64
  ) {
    throw new TypeError("Proposal lineage is invalid or unbounded.");
  }
  if (
    (proposal.lineage.parent_run_id === null && proposal.lineage.run_count !== 1) ||
    (proposal.lineage.parent_run_id !== null && proposal.lineage.run_count < 2)
  ) {
    throw new TypeError("Proposal lineage count does not match its parent binding.");
  }
  if (
    proposal.lineage.parent_run_id === null &&
    (proposal.lineage.root_run_id !== proposal.run_id ||
      !counterSetEqual(proposal.lineage_totals, proposal.consumed))
  ) {
    throw new TypeError("Root-run lineage totals must equal current consumed counters.");
  }
  for (const field of [
    "iterations",
    "active_runtime_ms",
    "no_progress_iterations",
    "tokens",
    "cost_micro",
  ]) {
    const consumed = proposal.consumed[field];
    const total = proposal.lineage_totals[field];
    if (consumed === null && total !== null) {
      throw new TypeError(`Lineage ${field} must preserve unknown usage.`);
    }
    if (consumed !== null && total !== null && total < consumed) {
      throw new TypeError(`Lineage ${field} cannot be less than current consumed usage.`);
    }
  }
}

export function renderBudgetStopWizard(proposal, proposalDigest) {
  assertProposalForRendering(proposal, proposalDigest);
  return {
    schema: "budget_stop_wizard_v2",
    contract_version: "2.0.0",
    phase: proposal.phase,
    simulation_only: proposal.execution_mode === "OBSERVE",
    goal: {
      ref: proposal.goal_ref,
      digest: proposal.goal_digest,
      summary: proposal.display_context.goal_summary,
      acceptance_criteria: [...proposal.display_context.acceptance_criteria],
    },
    verifier: {
      ref: proposal.verifier_ref,
      digest: proposal.verifier_digest,
      regression_verifier_digest: proposal.regression_verifier_digest,
      eval_definition_digest: proposal.eval_definition_digest,
    },
    recommendation: {
      authority: "ADVISORY_ONLY",
      source: proposal.recommendation_source,
      values: { ...proposal.recommended_limits },
      reason: proposal.recommendation_reason,
    },
    policy_maximum: { ...proposal.policy_ceiling },
    user_values_to_confirm: { ...proposal.recommended_limits },
    effective_values: { ...proposal.effective_preview },
    consumed: { ...proposal.consumed },
    remaining: { ...proposal.remaining },
    lineage: { ...proposal.lineage },
    lineage_totals: { ...proposal.lineage_totals },
    null_warnings: [...proposal.null_warnings],
    cost: {
      currency: proposal.billing_currency,
      pricing_revision: proposal.pricing_revision,
      pricing_digest: proposal.pricing_digest,
      input_field: "max_cost",
      normalized_field: "max_cost_micro",
      input_format: "positive decimal string with at most 6 fractional digits",
      micro_units_per_unit: Number(MICRO_UNITS_PER_UNIT),
    },
    bindings: {
      run_id: proposal.run_id,
      queue_item_id: proposal.queue_item_id,
      expected_run_version: proposal.expected_run_version,
      authority_digest: proposal.authority_digest,
      project_config_digest: proposal.project_config_digest,
      policy_digest: proposal.policy_digest,
      autonomy_profile: proposal.autonomy_profile,
      risk_profile: proposal.risk_profile,
    },
    approval: {
      proposal_digest: proposalDigest,
      expires_at: proposal.approval_expires_at,
      required_actor_type: "HUMAN",
    },
    actions: [
      { id: "Confirm", authority: "HUMAN_ONLY" },
      { id: "Cancel", authority: "HUMAN_ONLY" },
    ],
  };
}

export const WIZARD_BUDGET_FIELDS = BUDGET_FIELDS;
