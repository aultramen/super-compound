#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, opendir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendFileDurable,
  assertExpectedVersion,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import {
  createInitialRunState,
  evaluateProjectModeTransition,
  loadProjectConfig,
  LOOP_RUN_STATES,
  reduceRunState,
  resolveEffectivePolicy,
  TERMINAL_RUN_STATES,
} from "./loop-run-model.mjs";
import {
  assertProjectModeCapabilityAuthority,
  createDefaultProjectModeCapabilityAuthority,
  loadCanonicalProjectConfig,
  verifyProjectModeCapabilityAuthority,
} from "./project-config.mjs";
import { createProjectSafetyState } from "./project-safety-state.mjs";
import {
  assertValidValue,
  parseJsonDocument,
  rfc3339UtcSortKey,
} from "./schema-validator.mjs";
import {
  assertHumanConfirmationAuthority,
  assertRecommendationAuthorityForMode,
  computeEffectiveBudget,
  deriveNullWarnings,
  isSanitizedRecommendationReason,
  normalizeConfirmedLimits,
  renderBudgetStopWizard,
} from "./budget-wizard.mjs";
import {
  deriveEvalAttemptDigest,
  evaluateReleaseGate,
} from "./eval-gate-model.mjs";
import {
  assertPrivacySafeRuntimeValue,
  buildSanitizedTelemetryRecord,
  normalizeOperationalMetric,
  normalizeUsageReceipt,
  operationalMetricDigest,
  usageReceiptDigest,
} from "./loop-telemetry-model.mjs";
import {
  appendTelemetryRecord,
  rebuildTelemetryProjection,
} from "./loop-telemetry-store.mjs";
import {
  assertNovelApproach,
  compactLearningRecords,
  deriveLearningCompletion,
  normalizeGeniusLoopOutcome,
  normalizeLearningIntent,
  promoteVerifiedPattern,
  retrieveVerifiedPatterns,
  upsertGeniusLoopOutcome,
} from "./loop-learning-model.mjs";
import { createLoopLearningStore } from "./loop-learning-store.mjs";

const MAX_CONTRACT_BYTES = 512 * 1024;
const MAX_CONFIG_BYTES = 512 * 1024;
const MAX_EVENT_LOG_BYTES = 8 * 1024 * 1024;
const MAX_STATE_BYTES = 512 * 1024;
const MAX_CONFIRMATION_BYTES = 512 * 1024;
const MAX_PROPOSAL_BYTES = 512 * 1024;
const MAX_EVAL_RESULT_BYTES = 1024 * 1024;
const MAX_WORK_PACKAGE_LEDGER_BYTES = 2 * 1024 * 1024;
const MAX_RELEASE_EVIDENCE_BYTES = 2 * 1024 * 1024;
const MAX_AUTHORITY_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_AUTHORITY_SOURCE_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_LIST_ENTRIES = 256;
const MAX_LIST_BYTE_IO = 64 * 1024 * 1024;
const MAX_LINEAGE_RUNS = 64;
const RISK_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 });
const AUTONOMY_ORDER = Object.freeze({ READ_ONLY: 0, INTERACTIVE: 1, BACKGROUND: 2 });
const PUBLIC_WORKFLOW_ROUTES = new Set([
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
]);
const RUNS_DIRECTORY = path.join(".scratch", "loop-runs");
const PROJECT_CONFIG_LOCK = path.join(".scratch", "loop-runtime", "project-config.lock");
const WORK_PACKAGE_CONTROL_PATH_PATTERN =
  /^\.scratch\/work-packages\/[^/]+\/ledger\.json(?:$|\.lock(?:\/|$))/u;
const controllerAuthorities = new WeakMap();
const SCHEMAS_DIRECTORY = fileURLToPath(
  new URL("../context/schemas/", import.meta.url),
);
const FRESHNESS_FIELDS = Object.freeze([
  "authority_digest",
  "project_config_digest",
  "verifier_digest",
  "eval_definition_digest",
]);
const APPLY_FIELDS = Object.freeze({
  START: ["confirmation_digest", "freshness"],
  BEGIN_ACTION: [
    "confirmation_digest",
    "action_id",
    "idempotency_key",
    "freshness",
  ],
  OBSERVE_ACTION: [
    "action_id",
    "idempotency_key",
    "external_action_record_digest",
    "external_outcome",
    "target_audit_digest",
    "duration_ms",
    "freshness",
  ],
  RECORD_USAGE: ["receipt", "freshness"],
  RECORD_OPERATIONAL_METRIC: ["metric", "freshness"],
  RECORD_LEARNING_OUTCOME: ["outcome", "freshness"],
  PROMOTE_VERIFIED_PATTERN: ["pattern", "promotion_evidence", "freshness"],
  RECORD_OBSERVATION_DURATION: ["duration_ms", "freshness"],
  RECORD_VERIFICATION_DURATION: ["duration_ms", "freshness"],
  RECORD_BACKOFF_DURATION: ["duration_ms", "freshness"],
  BEGIN_VERIFICATION: ["freshness"],
  VERIFICATION_PASSED: [
    "eval_result_path",
    "work_package_ledger_path",
    "work_package_goal_id",
    "workspace_head_git_sha",
    "freshness",
  ],
  VERIFICATION_FAILED: [
    "verification_status",
    "fingerprint",
    "requirement_delta",
    "coverage_delta",
    "meaningful_diff_count",
    "approach_id",
    "freshness",
  ],
  PAUSE: ["freshness"],
  RESUME: ["confirmation_digest", "duration_ms", "freshness"],
  STOP: ["terminal_status", "reason", "freshness"],
  CANCEL: ["freshness"],
  RECONCILE: ["outcome", "evidence_digest", "freshness"],
});
const OPTIONAL_APPLY_FIELDS = Object.freeze({
  BEGIN_ACTION: ["learning_intent"],
  VERIFICATION_PASSED: ["learning_evidence"],
  VERIFICATION_FAILED: ["learning_evidence"],
});
const LEARNING_COMPLETION_EVIDENCE_FIELDS = Object.freeze([
  "actual_delta",
  "attestation_digest",
  "attribution_status",
]);
const PATTERN_PROMOTION_EVIDENCE_FIELDS = Object.freeze([
  "maker_actor_digest",
  "checker_actor_digest",
  "human_approver_digest",
  "finding_inventory_digest",
  "host_attestation_digest",
]);
const ADAPTIVE_MEMORY_QUERY_FIELDS = Object.freeze([
  "runId",
  "dedupeKey",
  "riskProfile",
  "workflowRoute",
  "problemFingerprint",
  "contextFingerprint",
  "observedAt",
]);

function digestBytes(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function digestJson(value) {
  return digestBytes(JSON.stringify(value));
}

function cloneFrozen(value) {
  const cloned = structuredClone(value);
  const freeze = (candidate) => {
    if (candidate === null || typeof candidate !== "object" || Object.isFrozen(candidate)) {
      return candidate;
    }
    for (const nested of Object.values(candidate)) freeze(nested);
    return Object.freeze(candidate);
  };
  return freeze(cloned);
}

function buildHostReleaseClaims(evalResult, assuranceEvidence) {
  const artifacts = new Map(assuranceEvidence.map((artifact) => [artifact.path, artifact]));
  const artifactFor = (envelope, label) => {
    const artifact = artifacts.get(envelope.evidence_ref);
    if (!artifact || artifact.digest !== envelope.evidence_digest) {
      throw new Error(`${label} is not bound to its verified assurance artifact.`);
    }
    return artifact;
  };
  const claims = evalResult.attempts.map((attempt) => ({
    kind: "CLEAN_RESET",
    subject_id: attempt.reset_id,
    attestation: attempt.reset_attestation,
    evidence_refs: [
      ...new Set([
        ...attempt.evidence_refs,
        ...(attempt.regression?.evidence_refs ?? []),
      ]),
    ],
    attempt_digest: deriveEvalAttemptDigest(attempt),
    envelope: attempt,
  }));

  if (evalResult.checker !== null) {
    claims.push({
      kind: "CHECKER",
      subject_id: evalResult.checker.checker_id,
      attestation: evalResult.checker.attestation,
      artifact: artifactFor(evalResult.checker, "checker claim"),
      envelope: evalResult.checker,
    });
  }

  claims.push({
    kind: "FINDING_INVENTORY",
    subject_id: evalResult.goal_ref,
    attestation: evalResult.finding_inventory.attestation,
    artifact: artifactFor(evalResult.finding_inventory, "finding inventory claim"),
    envelope: evalResult.finding_inventory,
  });

  for (const finding of evalResult.findings) {
    if (finding.return_gate === null) continue;
    claims.push({
      kind: "ORIGINAL_VERIFIER_RETURN",
      subject_id: `${finding.source_run_id}:${finding.source_finding_id}`,
      attestation: finding.return_gate.attestation,
      artifact: artifactFor(finding.return_gate, "original verifier return claim"),
      envelope: finding.return_gate,
    });
  }

  for (const gate of evalResult.human_gates) {
    if (gate.status !== "PASS") continue;
    claims.push({
      kind: "HUMAN_GATE",
      subject_id: `${gate.gate_id}:${gate.approver_id}`,
      attestation: gate.attestation,
      artifact: artifactFor(gate, "human gate claim"),
      envelope: gate,
    });
  }
  return claims;
}

function numericPolicy(policy) {
  return {
    max_iterations: policy.max_iterations,
    max_runtime_minutes: policy.max_runtime_minutes,
    max_no_progress_iterations: policy.max_no_progress_iterations,
    max_tokens: policy.max_tokens,
    max_cost_micro: policy.max_cost_micro,
  };
}

function machineBudgetEqual(left, right) {
  return [
    "max_iterations",
    "max_runtime_minutes",
    "max_no_progress_iterations",
    "max_tokens",
    "max_cost_micro",
  ].every((field) => left[field] === right[field]);
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

function canonicalPolicy(policy) {
  return {
    max_iterations: policy.max_iterations,
    max_runtime_minutes: policy.max_runtime_minutes,
    max_no_progress_iterations: policy.max_no_progress_iterations,
    max_tokens: policy.max_tokens,
    max_cost_micro: policy.max_cost_micro,
    approval_ttl_minutes: policy.approval_ttl_minutes,
    allowlisted_operations: [...policy.allowlisted_operations].sort(),
    credential_scopes: [...policy.credential_scopes].sort(),
    required_gates: [...policy.required_gates].sort(),
    risk: policy.risk,
    isolation: policy.isolation,
    expires_at: policy.expires_at,
  };
}

function assertContractPolicyBound(contractPolicy, globalPolicy) {
  const nullableLayer = {
    max_iterations: null,
    max_runtime_minutes: null,
    max_no_progress_iterations: null,
    max_tokens: null,
    max_cost_micro: null,
  };
  const resolved = resolveEffectivePolicy({
    global: globalPolicy,
    fsd: contractPolicy,
    operation: nullableLayer,
    human: {
      ...nullableLayer,
      max_iterations: contractPolicy.max_iterations,
    },
  });
  if (
    JSON.stringify(canonicalPolicy(resolved)) !==
    JSON.stringify(canonicalPolicy(contractPolicy))
  ) {
    throw new Error(
      "POLICY_STOP: run contract policy is not the restrictive canonical project intersection.",
    );
  }
}

function assertContractProfilesBound(contract, canonicalConfig) {
  const policyRisk = RISK_ORDER[contract.policy.risk];
  const defaultRisk = RISK_ORDER[canonicalConfig.risk.default_profile];
  const declaredRisk = RISK_ORDER[contract.risk_profile];
  const declaredAutonomy = AUTONOMY_ORDER[contract.autonomy_profile];
  const maximumAutonomy = AUTONOMY_ORDER[canonicalConfig.risk.maximum_autonomy];
  if (
    policyRisk === undefined ||
    defaultRisk === undefined ||
    declaredRisk === undefined ||
    declaredAutonomy === undefined ||
    maximumAutonomy === undefined
  ) {
    throw new Error("POLICY_STOP: run contract profile contains an unknown policy value.");
  }
  const effectiveRisk = policyRisk >= defaultRisk
    ? contract.policy.risk
    : canonicalConfig.risk.default_profile;
  if (contract.risk_profile !== effectiveRisk) {
    throw new Error(
      "POLICY_STOP: run risk profile must exactly match the highest effective project risk.",
    );
  }
  if (declaredAutonomy > maximumAutonomy) {
    throw new Error(
      "POLICY_STOP: run autonomy profile exceeds the canonical project maximum.",
    );
  }
  const regressionVerifierDigest = contract.verifier.regression_verifier_digest;
  const threshold = contract.verifier.success_threshold;
  if (contract.risk_profile === "MEDIUM") {
    const validComposite =
      contract.verifier.eval_class === "CAPABILITY" &&
      threshold.metric === "PASS_AT_K" &&
      threshold.k === 3 &&
      threshold.minimum_basis_points === 9000 &&
      regressionVerifierDigest !== null &&
      regressionVerifierDigest !== contract.verifier.digest;
    if (!validComposite) {
      throw new Error(
        "POLICY_STOP: MEDIUM run contract requires a distinct targeted-plus-regression composite verifier profile.",
      );
    }
  } else if (regressionVerifierDigest !== null) {
    throw new Error(
      "POLICY_STOP: non-MEDIUM run contract cannot include a regression verifier digest.",
    );
  }
}

const SINGLETON_AUTHORITY_SOURCE_BINDINGS = Object.freeze({
  GOAL: (contract) => contract.goal.digest,
  BRD: (contract) => contract.authority.brd_digest,
  PRD: (contract) => contract.authority.prd_digest,
  FSD: (contract) => contract.authority.fsd_digest,
  VERIFIER: (contract) => contract.verifier.digest,
  EVAL: (contract) => contract.verifier.eval_definition_digest,
  OPERATION_INVENTORY: (contract) =>
    contract.authority.operation_inventory_digest,
});

function assertAuthoritySourceManifest(contract) {
  const sources = contract.authority?.sources;
  if (!Array.isArray(sources)) {
    throw new Error("POLICY_STOP: authority source manifest is required.");
  }
  for (const [role, expectedDigest] of Object.entries(
    SINGLETON_AUTHORITY_SOURCE_BINDINGS,
  )) {
    const matches = sources.filter((source) => source.role === role);
    if (
      matches.length !== 1 ||
      matches[0].content_digest !== expectedDigest(contract)
    ) {
      throw new Error(
        `POLICY_STOP: authority source manifest ${role} binding mismatch.`,
      );
    }
  }

  const adrSources = sources.filter((source) => source.role === "ADR");
  const adrDigests = contract.authority.adr_digests;
  const adrSourceDigests = adrSources.map((source) => source.content_digest);
  if (
    adrSources.length !== adrDigests.length ||
    new Set(adrSourceDigests).size !== adrSourceDigests.length ||
    adrSourceDigests.some((digest) => !adrDigests.includes(digest)) ||
    adrDigests.some((digest) => !adrSourceDigests.includes(digest))
  ) {
    throw new Error("POLICY_STOP: authority source manifest ADR binding mismatch.");
  }

  const regressionSources = sources.filter(
    (source) => source.role === "REGRESSION_VERIFIER",
  );
  const regressionDigest = contract.verifier.regression_verifier_digest;
  if (
    (regressionDigest === null && regressionSources.length !== 0) ||
    (regressionDigest !== null &&
      (regressionSources.length !== 1 ||
        regressionSources[0].content_digest !== regressionDigest))
  ) {
    throw new Error(
      "POLICY_STOP: authority source manifest REGRESSION_VERIFIER binding mismatch.",
    );
  }
}

async function assertFreshAuthorityBytes(
  root,
  contract,
  context,
  { staleRequiresApproval = false } = {},
) {
  assertAuthoritySourceManifest(contract);
  const reads = new Map();
  let totalBytes = 0;
  for (const source of contract.authority.sources) {
    let bytes = reads.get(source.source_path);
    if (bytes === undefined) {
      try {
        bytes = await readControllerFile(
          root,
          source.source_path,
          {
            label: `authority source ${source.role}`,
            maxBytes: MAX_AUTHORITY_SOURCE_BYTES,
            readKind: "authority-source",
          },
          context,
        );
      } catch (error) {
        throw new Error(
          `POLICY_STOP: authority source ${source.role} is unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      totalBytes += bytes.length;
      if (totalBytes > MAX_AUTHORITY_SOURCE_TOTAL_BYTES) {
        throw new Error("POLICY_STOP: authority source aggregate exceeds its byte bound.");
      }
      reads.set(source.source_path, bytes);
    }
    if (digestBytes(bytes) !== source.content_digest) {
      if (staleRequiresApproval) {
        throw approvalRequired(`AUTHORITY_SOURCE_STALE: ${source.role}`);
      }
      throw new Error(`POLICY_STOP: AUTHORITY_SOURCE_STALE: ${source.role}`);
    }
  }
}

function authorityDigest(contract) {
  return digestJson({
    goal: contract.goal,
    authority: contract.authority,
    verifier: contract.verifier,
    project_config_digest: contract.project_config_digest,
  });
}

function policyDigest(contract) {
  return digestJson(contract.policy);
}

function utcSortKey(value) {
  const key = rfc3339UtcSortKey(value);
  if (key === null) throw new Error("Timestamp must be an RFC 3339 UTC date-time.");
  return key;
}

function withEventHead(state, event) {
  return {
    ...state,
    version: event.version,
    sequence: event.sequence,
    last_event_hash: event.event_hash,
  };
}

function createEvent({ eventId, runId, state, type, recordedAt, data }) {
  const unsigned = {
    schema: "loop_run_event_v2",
    contract_version: "2.0.0",
    event_id: eventId,
    run_id: runId,
    sequence: state.sequence + 1,
    version: state.version + 1,
    type,
    recorded_at: recordedAt,
    previous_hash: state.last_event_hash,
    data,
  };
  return { ...unsigned, event_hash: digestJson(unsigned) };
}

function assertUniqueEventId(events, event) {
  if (events.some((candidate) => candidate.event_id === event.event_id)) {
    throw new Error(`Duplicate event ID is forbidden: ${event.event_id}`);
  }
}

function calculateEventHash(event) {
  const { event_hash: ignored, ...unsigned } = event;
  return digestJson(unsigned);
}

function tightenedPositiveLimit(candidate, ceiling, label) {
  if (candidate === undefined) return ceiling;
  if (!Number.isSafeInteger(candidate) || candidate <= 0 || candidate > ceiling) {
    throw new Error(`${label} must be a positive safe integer no greater than ${ceiling}.`);
  }
  return candidate;
}

function consumeListByteIo(budget, text, label) {
  if (budget === undefined) return;
  const bytes = Buffer.byteLength(text);
  if (bytes > budget.maximum - budget.consumed) {
    throw new Error(`List byte-I/O budget exceeded while reading ${label}.`);
  }
  budget.consumed += bytes;
}

async function chargeCanonicalConfigRead(root, configFile, context) {
  const reads = [];
  for (const [file, label, kind] of [
    [configFile, "project config", "config"],
    [
      path.join(".agent", "context", "schemas", "project-config-v2.schema.json"),
      "project config schema",
      "schema",
    ],
  ]) {
    const absolute = await resolveRepositoryPath(root, file, { label });
    const info = await lstat(absolute).catch(() => null);
    if (info === null || !info.isFile() || info.isSymbolicLink()) {
      throw new Error(`${label} is unavailable for bounded canonical loading.`);
    }
    const budget = context.listByteIoBudget;
    if (budget !== undefined) {
      const remaining = budget.maximum - budget.consumed;
      if (info.size > remaining) {
        throw new Error(
          `List byte-I/O budget exceeded before reading ${label} beyond ${remaining} ${remaining === 1 ? "byte" : "bytes"}.`,
        );
      }
      budget.consumed += info.size;
    }
    reads.push({
      bytes: info.size,
      kind,
      path: absolute,
    });
  }
  return reads;
}

async function readControllerFile(root, file, options, context) {
  const listByteIoBudget = context?.listByteIoBudget;
  let readOptions = options;
  if (listByteIoBudget !== undefined) {
    const remaining = listByteIoBudget.maximum - listByteIoBudget.consumed;
    if (remaining <= 0) {
      throw new Error(`List byte-I/O budget exceeded before reading ${options.label}.`);
    }
    const absolute = await resolveRepositoryPath(root, file, options);
    const info = await lstat(absolute).catch(() => null);
    if (info?.isFile() && info.size > remaining) {
      const unit = remaining === 1 ? "byte" : "bytes";
      throw new Error(
        `List byte-I/O budget exceeded before reading ${options.label} beyond ${remaining} ${unit}.`,
      );
    }
    readOptions = { ...options, maxBytes: Math.min(options.maxBytes, remaining) };
  }
  const text = await readBoundedFile(root, file, readOptions);
  consumeListByteIo(listByteIoBudget, text, options.label);
  if (context !== undefined) {
    const absolute = await resolveRepositoryPath(root, file, options);
    await context.observeRead?.({
      bytes: Buffer.byteLength(text),
      kind: options.readKind ?? "file",
      path: absolute,
    });
  }
  return text;
}

async function loadSchema(file, context) {
  if (context?.schemaCache.has(file)) {
    return context.schemaCache.get(file);
  }
  const text = await readControllerFile(SCHEMAS_DIRECTORY, file, {
    allowRoot: false,
    encoding: "utf8",
    label: `${file} schema`,
    maxBytes: MAX_CONFIG_BYTES,
    readKind: "schema",
  }, context);
  const schema = JSON.parse(text);
  context?.schemaCache.set(file, schema);
  return schema;
}

function runPaths(runId) {
  const directory = path.join(RUNS_DIRECTORY, runId);
  return {
    directory,
    contract: path.join(directory, "contract.json"),
    events: path.join(directory, "events.jsonl"),
    state: path.join(directory, "state.json"),
    lock: path.join(RUNS_DIRECTORY, `${runId}.owner.lock`),
  };
}

function confirmationPath(paths, confirmationDigest) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(confirmationDigest)) {
    throw new Error("Confirmation digest is invalid.");
  }
  return path.join(
    paths.directory,
    "confirmations",
    `${confirmationDigest.slice("sha256:".length)}.json`,
  );
}

function proposalPath(paths, proposalDigest) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(proposalDigest)) {
    throw new Error("Proposal digest is invalid.");
  }
  return path.join(
    paths.directory,
    "proposals",
    `${proposalDigest.slice("sha256:".length)}.json`,
  );
}

function addMinutesFailClosed(value, minutes) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/u.exec(
    value,
  );
  if (match === null || !Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error("Proposal approval TTL cannot be represented safely.");
  }
  const wholeSecondMilliseconds = Date.parse(`${match[1]}Z`);
  if (!Number.isSafeInteger(wholeSecondMilliseconds)) {
    throw new Error("Proposal approval TTL cannot be represented safely.");
  }
  const expiry = BigInt(wholeSecondMilliseconds) + BigInt(minutes) * 60_000n;
  if (expiry > BigInt(Number.MAX_SAFE_INTEGER) || expiry < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("Proposal approval expiry exceeds the safe time range.");
  }
  const expiryDate = new Date(Number(expiry));
  if (Number.isNaN(expiryDate.getTime())) {
    throw new Error("Proposal approval expiry exceeds the supported time range.");
  }
  const wholeSecond = expiryDate.toISOString().slice(0, 19);
  const fraction = match[2] === undefined ? "" : `.${match[2]}`;
  return `${wholeSecond}${fraction}Z`;
}

function earliestUtc(...values) {
  return values.reduce((earliest, value) =>
    utcSortKey(value) < utcSortKey(earliest) ? value : earliest,
  );
}

function hasExactFields(value, fields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function requiresAdaptiveLearning(contract) {
  return contract.policy.required_gates.includes("ADAPTIVE_LEARNING_V2");
}

function outcomeInputFromRecord(record) {
  const {
    schema: ignoredSchema,
    contract_version: ignoredVersion,
    ...input
  } = record;
  return input;
}

function patternInputFromRecord(record) {
  const {
    schema: ignoredSchema,
    contract_version: ignoredVersion,
    status: ignoredStatus,
    ...input
  } = record;
  return input;
}

function assertPromotionEvidence(value) {
  if (
    !hasExactFields(value, PATTERN_PROMOTION_EVIDENCE_FIELDS) ||
    PATTERN_PROMOTION_EVIDENCE_FIELDS.some(
      (field) => !/^sha256:[a-f0-9]{64}$/u.test(value[field] ?? ""),
    ) ||
    value.maker_actor_digest === value.checker_actor_digest
  ) {
    throw new Error("PATTERN_PROMOTION_EVIDENCE_INVALID");
  }
  return cloneFrozen(value);
}

function normalizeOutcomeForEvent(value, contract, previousHead, recordedAt) {
  const outcome = normalizeGeniusLoopOutcome(value);
  if (
    outcome.run_id !== contract.run_id ||
    outcome.run_head_digest !== previousHead ||
    utcSortKey(outcome.recorded_at) > utcSortKey(recordedAt)
  ) {
    throw new Error("OUTCOME_RUN_BINDING_INVALID");
  }
  return outcome;
}

function normalizePatternForEvent(value, contract, previousHead, recordedAt) {
  const pattern = promoteVerifiedPattern(value, { now: recordedAt });
  if (
    pattern.source_run_id !== contract.run_id ||
    pattern.source_run_head_digest !== previousHead ||
    pattern.authority_digest !== authorityDigest(contract) ||
    pattern.verifier_digest !== contract.verifier.digest ||
    utcSortKey(pattern.verified_at) > utcSortKey(recordedAt)
  ) {
    throw new Error("PATTERN_RUN_BINDING_INVALID");
  }
  return pattern;
}

function outcomesFromEvents(events, contract) {
  let records = [];
  const ids = new Map();
  for (const event of events) {
    if (event.type !== "LEARNING_OUTCOME_RECORDED") continue;
    const outcome = normalizeOutcomeForEvent(
      outcomeInputFromRecord(event.data.outcome),
      contract,
      event.previous_hash,
      event.recorded_at,
    );
    if (
      digestJson(outcome) !== event.data.outcome_digest ||
      JSON.stringify(outcome) !== JSON.stringify(event.data.outcome)
    ) {
      throw new Error("OUTCOME_EVENT_CORRUPT");
    }
    const priorDedupe = ids.get(outcome.outcome_id);
    if (priorDedupe !== undefined && priorDedupe !== outcome.dedupe_key) {
      throw new Error("OUTCOME_ID_CONFLICT");
    }
    ids.set(outcome.outcome_id, outcome.dedupe_key);
    records = upsertGeniusLoopOutcome(records, outcome).records;
  }
  return records;
}

function outcomesAtHead(events, contract, head) {
  if (head === null) return [];
  const index = events.findIndex((event) => event.event_hash === head);
  if (index < 0) throw new Error("OUTCOME_PROJECTION_REPLAY_MISMATCH");
  return outcomesFromEvents(events.slice(0, index + 1), contract);
}

function assertOutcomeProjectionMatchesEvents(
  projection,
  events,
  contract,
  currentHead,
) {
  if (projection === null) return;
  const projectedOutcomes = outcomesAtHead(
    events,
    contract,
    projection.bound_run_head_digest,
  );
  if (JSON.stringify(projectedOutcomes) !== JSON.stringify(projection.outcomes)) {
    throw new Error("OUTCOME_PROJECTION_REPLAY_MISMATCH");
  }
  if (
    !events.some(
      (event) => event.event_hash === projection.bound_run_head_digest,
    ) ||
    !events.some((event) => event.event_hash === currentHead)
  ) {
    throw new Error("OUTCOME_PROJECTION_REPLAY_MISMATCH");
  }
}

function assertPatternPromotionHistory(events, contract) {
  const outcomes = outcomesFromEvents(events, contract);
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.outcome_id, outcome]));
  const promotedDedupeKeys = new Set();
  for (const event of events) {
    if (event.type !== "VERIFIED_PATTERN_PROMOTED") continue;
    const evidence = assertPromotionEvidence(event.data.promotion_evidence);
    const pattern = normalizePatternForEvent(
      patternInputFromRecord(event.data.pattern),
      contract,
      event.previous_hash,
      event.recorded_at,
    );
    const outcome = outcomeById.get(pattern.source_outcome_id);
    if (
      digestJson(pattern) !== event.data.pattern_digest ||
      JSON.stringify(pattern) !== JSON.stringify(event.data.pattern) ||
      outcome === undefined ||
      outcome.dedupe_key !== pattern.dedupe_key ||
      outcome.compounding_candidate_status !== "CANDIDATE" ||
      outcome.evidence_digest !== pattern.evidence_digest ||
      promotedDedupeKeys.has(pattern.dedupe_key) ||
      evidence.maker_actor_digest === evidence.checker_actor_digest
    ) {
      throw new Error("PATTERN_PROMOTION_EVENT_CORRUPT");
    }
    promotedDedupeKeys.add(pattern.dedupe_key);
  }
}

function learningRecordsFromEvents(events) {
  const records = [];
  for (const event of events) {
    if (
      event.type === "ACTION_INTENDED" &&
      event.data.learning_intent !== undefined
    ) {
      if (event.data.learning_intent.status !== "INTENDED") {
        throw new Error("LEARNING_REPLAY_MISMATCH");
      }
      records.push(structuredClone(event.data.learning_intent));
    }
    if (
      new Set(["VERIFICATION_PASSED", "VERIFICATION_FAILED"]).has(event.type) &&
      event.data.learning_completion !== undefined
    ) {
      const completion = structuredClone(event.data.learning_completion);
      if (completion.status !== "COMPLETED") {
        throw new Error("LEARNING_REPLAY_MISMATCH");
      }
      const index = records.findIndex(
        (record) => record.intent_digest === completion.intent_digest,
      );
      if (index < 0 || records[index].status !== "INTENDED") {
        throw new Error("LEARNING_REPLAY_MISMATCH");
      }
      records[index] = completion;
    }
  }
  compactLearningRecords(records);
  return records;
}

function learningRecordsAtHead(events, head) {
  if (head === null) return [];
  const index = events.findIndex((event) => event.event_hash === head);
  if (index < 0) throw new Error("LEARNING_PROJECTION_REPLAY_MISMATCH");
  return learningRecordsFromEvents(events.slice(0, index + 1));
}

function assertLearningProjectionMatchesEvents(projection, events, currentHead) {
  if (projection === null) return;
  const projectedRecords = compactLearningRecords(
    learningRecordsAtHead(events, projection.bound_run_head_digest),
  ).active_records;
  if (JSON.stringify(projectedRecords) !== JSON.stringify(projection.records)) {
    throw new Error("LEARNING_PROJECTION_REPLAY_MISMATCH");
  }
  if (
    events.some((event) => event.event_hash === currentHead) &&
    !events.some(
      (event) => event.event_hash === projection.bound_run_head_digest,
    )
  ) {
    throw new Error("LEARNING_PROJECTION_REPLAY_MISMATCH");
  }
}

function currentLearningIntent(records, iteration) {
  const matches = records.filter(
    (record) => record.iteration === iteration && record.status === "INTENDED",
  );
  if (matches.length !== 1) throw new Error("LEARNING_ACTIVE_INTENT_MISSING");
  return matches[0];
}

export async function attestActiveRuntimeDuration(context, verifyAttestation) {
  const fields = ["mode", "run_id", "run_head_digest", "phase", "duration_ms"];
  if (
    !hasExactFields(context, fields) ||
    !new Set(["OBSERVE", "ENFORCE"]).has(context.mode) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(context.run_id ?? "") ||
    !/^sha256:[a-f0-9]{64}$/u.test(context.run_head_digest ?? "") ||
    !new Set(["ACTION", "OBSERVATION", "VERIFICATION", "RESUME", "BACKOFF"]).has(
      context.phase,
    ) ||
    !Number.isSafeInteger(context.duration_ms) ||
    context.duration_ms < 0
  ) {
    throw new TypeError("Active runtime attestation context is invalid.");
  }
  assertPrivacySafeRuntimeValue(context, "active runtime attestation");
  if (
    context.mode === "ENFORCE" &&
    (typeof verifyAttestation !== "function" ||
      (await verifyAttestation(cloneFrozen(context))) !== true)
  ) {
    throw new Error(
      "POLICY_STOP: active runtime metering attestation is required in ENFORCE mode.",
    );
  }
  return context.duration_ms;
}

function approvalRequired(reason) {
  const message = reason instanceof Error ? reason.message : String(reason);
  const error = new Error(
    message.startsWith("APPROVAL_REQUIRED:")
      ? message
      : `APPROVAL_REQUIRED: ${message}`,
  );
  error.code = "APPROVAL_REQUIRED";
  return error;
}

function safeSubtract(limit, consumed, label) {
  if (limit === null) return null;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 0 ||
    !Number.isSafeInteger(consumed) ||
    consumed < 0
  ) {
    throw new Error(`${label} remaining budget cannot be represented safely.`);
  }
  return Math.max(0, limit - consumed);
}

function remainingBudget(effectiveBudget, counters) {
  return {
    iterations: safeSubtract(
      effectiveBudget.max_iterations,
      counters.iterations,
      "iteration",
    ),
    active_runtime_ms:
      effectiveBudget.max_runtime_minutes === null
        ? null
        : safeSubtract(
            effectiveBudget.max_runtime_minutes * 60_000,
            counters.active_runtime_ms,
            "runtime",
          ),
    no_progress_iterations: safeSubtract(
      effectiveBudget.max_no_progress_iterations,
      counters.no_progress_iterations,
      "no-progress",
    ),
    tokens:
      effectiveBudget.max_tokens === null || counters.tokens === null
        ? null
        : safeSubtract(effectiveBudget.max_tokens, counters.tokens, "token"),
    cost_micro:
      effectiveBudget.max_cost_micro === null || counters.cost_micro === null
        ? null
        : safeSubtract(effectiveBudget.max_cost_micro, counters.cost_micro, "cost"),
  };
}

function backgroundBudgetBinding(state, contract, activeIntentEvent) {
  const effective = state.effective_budget;
  const counters = state.counters;
  const runtimeMs = effective.max_runtime_minutes * 60_000;
  if (
    contract.autonomy_profile !== "BACKGROUND" ||
    state.approval === null ||
    state.active_action === null ||
    activeIntentEvent === null ||
    activeIntentEvent === undefined ||
    !Number.isSafeInteger(runtimeMs) ||
    runtimeMs <= 0 ||
    !Number.isSafeInteger(effective.max_no_progress_iterations) ||
    effective.max_no_progress_iterations <= 0 ||
    !Number.isSafeInteger(counters.active_runtime_ms) ||
    counters.active_runtime_ms < 0 ||
    !Number.isSafeInteger(counters.no_progress_iterations) ||
    counters.no_progress_iterations < 0 ||
    (effective.max_tokens !== null &&
      (!Number.isSafeInteger(counters.tokens) || counters.tokens < 0))
  ) {
    throw new Error("POLICY_STOP: background budget authority is unavailable.");
  }
  const remaining = remainingBudget(effective, counters);
  if (
    remaining.active_runtime_ms === null ||
    remaining.active_runtime_ms <= 0 ||
    remaining.no_progress_iterations === null ||
    remaining.no_progress_iterations <= 0 ||
    (effective.max_tokens !== null &&
      (remaining.tokens === null || remaining.tokens <= 0))
  ) {
    throw new Error("POLICY_STOP: background budget is exhausted.");
  }
  const controllerIntentDigest = digestJson({
    run_id: state.run_id,
    action_id: state.active_action.action_id,
    idempotency_key: state.active_action.idempotency_key,
    run_head_digest: activeIntentEvent.event_hash,
  });
  const authority = {
    schema: "background_budget_binding_v2",
    run_id: state.run_id,
    confirmation_digest: state.approval.confirmation_digest,
    approval_phase: state.approval.phase,
    approval_expires_at: state.approval.expires_at,
    run_version: state.version,
    current_run_head_digest: state.last_event_hash,
    action_run_head_digest: activeIntentEvent.event_hash,
    action_id: state.active_action.action_id,
    idempotency_key: state.active_action.idempotency_key,
    controller_intent_digest: controllerIntentDigest,
    effective_limits: {
      max_runtime_ms: runtimeMs,
      max_no_progress_iterations: effective.max_no_progress_iterations,
      max_tokens: effective.max_tokens,
    },
    consumed: {
      active_runtime_ms: counters.active_runtime_ms,
      no_progress_iterations: counters.no_progress_iterations,
      tokens: counters.tokens,
    },
    remaining: {
      runtime_ms: remaining.active_runtime_ms,
      no_progress_iterations: remaining.no_progress_iterations,
      tokens: remaining.tokens,
    },
  };
  return {
    ...authority,
    authority_digest: digestJson({
      domain: "super-compound.background-budget-binding.v2",
      ...authority,
    }),
  };
}

function sumNonNegative(left, right, label) {
  if (!Number.isSafeInteger(left) || left < 0 || !Number.isSafeInteger(right) || right < 0) {
    throw new Error(`${label} lineage counter is invalid.`);
  }
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error(`${label} lineage counter would overflow.`);
  }
  return total;
}

function addLineageCounters(total, counters) {
  return {
    iterations: sumNonNegative(total.iterations, counters.iterations, "iteration"),
    active_runtime_ms: sumNonNegative(
      total.active_runtime_ms,
      counters.active_runtime_ms,
      "runtime",
    ),
    no_progress_iterations: sumNonNegative(
      total.no_progress_iterations,
      counters.no_progress_iterations,
      "no-progress",
    ),
    tokens:
      total.tokens === null || counters.tokens === null
        ? null
        : sumNonNegative(total.tokens, counters.tokens, "token"),
    cost_micro:
      total.cost_micro === null || counters.cost_micro === null
        ? null
        : sumNonNegative(total.cost_micro, counters.cost_micro, "cost"),
  };
}

export function createLoopRunController(root, dependencies = {}) {
  const safeRoot = path.resolve(root);
  const now = dependencies.now ?? (() => new Date().toISOString());
  const randomId = dependencies.randomId ?? (() => `event-${randomUUID()}`);
  const projectSafety = createProjectSafetyState(safeRoot, {
    ...(dependencies.projectSafetyDependencies ?? {}),
    now:
      dependencies.projectSafetyDependencies?.now ??
      (() => Date.parse(now())),
    randomId:
      dependencies.projectSafetyDependencies?.randomId ??
      (() => `safety-${randomUUID()}`),
  });
  const maxListEntries = tightenedPositiveLimit(
    dependencies.maxListEntries,
    MAX_LIST_ENTRIES,
    "List entry limit",
  );
  const maxListBytes = tightenedPositiveLimit(
    dependencies.maxListBytes,
    MAX_LIST_BYTE_IO,
    "List byte-I/O limit",
  );
  const projectConfigFile =
    dependencies.projectConfigFile ?? path.join(".agent", "context", "project-config.json");
  const modeCapabilityAuthority = Object.hasOwn(
    dependencies,
    "modeCapabilityAuthority",
  )
    ? dependencies.modeCapabilityAuthority
    : createDefaultProjectModeCapabilityAuthority(safeRoot, { now });
  if (modeCapabilityAuthority !== undefined) {
    assertProjectModeCapabilityAuthority(modeCapabilityAuthority, safeRoot);
  }

  const loadFreshCanonicalProjectConfig = () =>
    loadCanonicalProjectConfig(safeRoot, {
      configFile: projectConfigFile,
      ...(modeCapabilityAuthority === undefined
        ? {}
        : { modeCapabilityAuthority }),
    });

  async function assertProjectSafetyAllows(baseMode, operation) {
    const safetyState = await projectSafety.show({ base_mode: baseMode });
    if (safetyState.effective_mode === "HALTED") {
      throw new Error(
        `POLICY_STOP: project safety halt blocks ${operation}; owner recovery is required.`,
      );
    }
    return safetyState;
  }

  async function tripProjectSafety({
    reasonCode,
    runId,
    sourceEventHead,
    projectConfigDigest,
  }) {
    const current = await projectSafety.show({ base_mode: "DISABLED" });
    if (current.integrity === "CORRUPT") return current;
    const result = await projectSafety.halt({
      expected_head: current.head_digest,
      reason_code: reasonCode,
      evidence_digest: digestJson({
        reason_code: reasonCode,
        run_id: runId,
        source_event_head: sourceEventHead,
        project_config_digest: projectConfigDigest,
      }),
      source_run_id: runId,
      source_event_head: sourceEventHead,
      project_config_digest: projectConfigDigest,
    });
    return result.state;
  }

  function createReplayContext({
    listByteIoBudget,
    retainStateHistoryFor = null,
  } = {}) {
    return {
      canonicalConfig: null,
      confirmationCache: new Map(),
      lineageCache: new Map(),
      lineageInFlight: new Set(),
      listByteIoBudget,
      observeRead: dependencies.observeReplayRead,
      proposalCache: new Map(),
      replayCache: new Map(),
      replayInFlight: new Set(),
      retainStateHistoryFor,
      schemaCache: new Map(),
      snapshotCache: new Map(),
    };
  }

  async function loadCanonicalConfigForReplay(context) {
    if (context.canonicalConfig !== null) return context.canonicalConfig;
    const reads = await chargeCanonicalConfigRead(
      safeRoot,
      projectConfigFile,
      context,
    );
    const loadedConfig = await loadFreshCanonicalProjectConfig();
    for (const read of reads) await context.observeRead?.(read);
    if (loadedConfig.config === null) {
      throw new Error(`Project config is invalid: ${loadedConfig.errors.join(" ")}`);
    }
    context.canonicalConfig = loadedConfig;
    return loadedConfig;
  }

  function telemetryBilling(loadedConfig) {
    return {
      currency: loadedConfig.config.billing_currency,
      pricing_revision:
        loadedConfig.config.telemetry.pricing_revision ?? null,
      pricing_digest: loadedConfig.config.telemetry.pricing_digest ?? null,
    };
  }

  function telemetryAccessOptions(loadedConfig) {
    const telemetry = loadedConfig.config.telemetry;
    const writerRole = dependencies.telemetryWriterRole ?? "loop-controller";
    return {
      telemetry,
      writerRole,
      verifyAccess: dependencies.verifyTelemetryAccess,
    };
  }

  async function projectTelemetryEvent({
    event,
    state,
    contract,
    loadedConfig,
  }) {
    if (loadedConfig.config.telemetry.enabled !== true) return null;
    const record = buildSanitizedTelemetryRecord({
      event,
      state,
      contract,
      billing: telemetryBilling(loadedConfig),
    });
    return appendTelemetryRecord(
      safeRoot,
      {
        runId: contract.run_id,
        record,
        ...telemetryAccessOptions(loadedConfig),
      },
      dependencies.telemetryStoreDependencies,
    );
  }

  async function projectTelemetryEventFailClosed(
    input,
    persistTelemetry = projectTelemetryEvent,
  ) {
    try {
      return await persistTelemetry(input);
    } catch (error) {
      if (input.loadedConfig.config.telemetry.persistence_required === true) {
        const reasonCode = /PRIVACY_STOP/u.test(
          error instanceof Error ? error.message : "",
        )
          ? "PERSISTED_PRIVACY_VIOLATION"
          : "REQUIRED_TELEMETRY_PERSISTENCE_FAILURE";
        await tripProjectSafety({
          reasonCode,
          runId: input.contract.run_id,
          sourceEventHead: input.event.event_hash,
          projectConfigDigest: input.loadedConfig.config_digest,
        });
      }
      throw error;
    }
  }

  async function rebuildRunTelemetry({
    events,
    states,
    contract,
    loadedConfig,
  }) {
    if (loadedConfig.config.telemetry.enabled !== true) return null;
    if (events.length !== states.length || events.length === 0) {
      throw new Error("Telemetry rebuild requires one derived state per event.");
    }
    const billing = telemetryBilling(loadedConfig);
    const records = events.map((event, index) =>
      buildSanitizedTelemetryRecord({
        event,
        state: states[index],
        contract,
        billing,
      }),
    );
    return rebuildTelemetryProjection(
      safeRoot,
      {
        runId: contract.run_id,
        records,
        ...telemetryAccessOptions(loadedConfig),
      },
      dependencies.telemetryStoreDependencies,
    );
  }

  async function readAuthority(runId, context) {
    const contractSchema = await loadSchema(
      "loop-run-contract-v2.schema.json",
      context,
    );
    const paths = runPaths(runId);
    const contractText = await readControllerFile(safeRoot, paths.contract, {
      encoding: "utf8",
      label: "immutable run contract",
      maxBytes: MAX_CONTRACT_BYTES,
      readKind: "contract",
    }, context);
    const contract = parseJsonDocument(contractText, contractSchema, "run contract");
    assertPrivacySafeRuntimeValue(contract, "run contract");
    assertAuthoritySourceManifest(contract);
    if (contract.run_id !== runId) {
      throw new Error("Run contract identity does not match its storage path.");
    }
    const loadedConfig = await loadCanonicalConfigForReplay(context);
    if (loadedConfig.config_digest !== contract.project_config_digest) {
      throw new Error("Project config digest is stale for this run contract.");
    }
    assertContractPolicyBound(contract.policy, loadedConfig.config.policy);
    assertContractProfilesBound(contract, loadedConfig.config);
    return { contract, contractText, loadedConfig, paths };
  }

  async function assertConfirmationBindings({
    confirmation,
    confirmationDigest,
    context,
    contract,
    proposal,
    state,
    observedAt,
    billingCurrency,
    pricingRevision,
    pricingDigest,
  }) {
    try {
      const expected = [
        [confirmation.run_id, contract.run_id, "run ID"],
        [confirmation.goal_ref, contract.goal.ref, "goal reference"],
        [confirmation.goal_digest, contract.goal.digest, "goal digest"],
        [confirmation.authority_digest, authorityDigest(contract), "authority digest"],
        [
          confirmation.project_config_digest,
          contract.project_config_digest,
          "project config digest",
        ],
        [confirmation.verifier_ref, contract.verifier.ref, "verifier reference"],
        [confirmation.verifier_digest, contract.verifier.digest, "verifier digest"],
        [
          confirmation.regression_verifier_digest,
          contract.verifier.regression_verifier_digest,
          "regression verifier digest",
        ],
        [
          confirmation.eval_definition_digest,
          contract.verifier.eval_definition_digest,
          "eval definition digest",
        ],
        [confirmation.policy_digest, policyDigest(contract), "policy digest"],
        [confirmation.autonomy_profile, contract.autonomy_profile, "autonomy profile"],
        [confirmation.risk_profile, contract.risk_profile, "risk profile"],
        [confirmation.billing_currency, billingCurrency, "billing currency"],
        [confirmation.queue_item_id, proposal.queue_item_id, "queue item"],
      ];
      for (const [actual, wanted, label] of expected) {
        if (actual !== wanted) throw new Error(`Confirmation ${label} binding mismatch.`);
      }
      const proposalExpected = [
        [proposal.run_id, contract.run_id, "proposal run ID"],
        [proposal.phase, confirmation.phase, "proposal phase"],
        [proposal.expected_run_version, confirmation.expected_run_version, "proposal version"],
        [proposal.execution_mode, state.mode, "proposal execution mode"],
        [proposal.goal_ref, contract.goal.ref, "proposal goal reference"],
        [proposal.goal_digest, contract.goal.digest, "proposal goal digest"],
        [proposal.authority_digest, authorityDigest(contract), "proposal authority digest"],
        [
          proposal.project_config_digest,
          contract.project_config_digest,
          "proposal project config digest",
        ],
        [proposal.verifier_ref, contract.verifier.ref, "proposal verifier reference"],
        [proposal.verifier_digest, contract.verifier.digest, "proposal verifier digest"],
        [
          proposal.regression_verifier_digest,
          contract.verifier.regression_verifier_digest,
          "proposal regression verifier digest",
        ],
        [
          proposal.eval_definition_digest,
          contract.verifier.eval_definition_digest,
          "proposal eval definition digest",
        ],
        [proposal.policy_digest, policyDigest(contract), "proposal policy digest"],
        [proposal.autonomy_profile, contract.autonomy_profile, "proposal autonomy profile"],
        [proposal.risk_profile, contract.risk_profile, "proposal risk profile"],
        [proposal.billing_currency, billingCurrency, "proposal billing currency"],
        [proposal.pricing_revision, pricingRevision, "proposal pricing revision"],
        [proposal.pricing_digest, pricingDigest, "proposal pricing digest"],
        [
          proposal.approval_ttl_minutes,
          contract.policy.approval_ttl_minutes,
          "proposal approval TTL",
        ],
        [
          proposal.display_context.source_digest,
          digestJson({ run_id: contract.run_id, goal: contract.goal }),
          "proposal display context",
        ],
      ];
      for (const [actual, wanted, label] of proposalExpected) {
        if (actual !== wanted) throw new Error(`Confirmation ${label} binding mismatch.`);
      }
      renderBudgetStopWizard(proposal, confirmation.proposal_digest);
      if (!machineBudgetEqual(proposal.policy_ceiling, state.effective_budget)) {
        throw new Error("Confirmation proposal policy ceiling is stale.");
      }
      if (
        proposal.display_context.goal_summary !== contract.goal.summary ||
        JSON.stringify(proposal.display_context.acceptance_criteria) !==
          JSON.stringify(contract.goal.acceptance_criteria)
      ) {
        throw new Error("Confirmation proposal goal display context is stale.");
      }
      const expectedConsumed = {
        iterations: state.counters.iterations,
        active_runtime_ms: state.counters.active_runtime_ms,
        no_progress_iterations: state.counters.no_progress_iterations,
        tokens: state.counters.tokens,
        cost_micro: state.counters.cost_micro,
      };
      if (!counterSetEqual(proposal.consumed, expectedConsumed)) {
        throw new Error("Confirmation proposal consumed counters are stale.");
      }
      const expectedLineage = await calculateLineageTotals(contract, state, context);
      if (
        proposal.lineage.parent_run_id !== contract.lineage.parent_run_id ||
        proposal.lineage.root_run_id !== contract.lineage.root_run_id ||
        proposal.lineage.run_count !== expectedLineage.runCount ||
        !counterSetEqual(proposal.lineage_totals, expectedLineage.totals)
      ) {
        throw new Error("Confirmation proposal lineage totals are stale.");
      }
      if (confirmation.expected_run_version !== state.version) {
        throw new Error(
          `Confirmation expected run version binding mismatch: expected ${state.version}.`,
        );
      }
      const expectedPhase =
        state.status === "READY" ? "START" : state.status === "PAUSED" ? "RESUME" : null;
      if (confirmation.phase !== expectedPhase) {
        throw new Error("Confirmation phase does not match the current lifecycle boundary.");
      }
      if (
        (contract.autonomy_profile === "INTERACTIVE" && confirmation.queue_item_id !== null) ||
        (contract.autonomy_profile === "BACKGROUND" && confirmation.queue_item_id === null)
      ) {
        throw new Error("Confirmation queue item binding does not match autonomy profile.");
      }

      const normalizedConfirmed = normalizeConfirmedLimits(
        confirmation.confirmed_limits,
        confirmation.billing_currency,
      );
      if (!machineBudgetEqual(normalizedConfirmed, confirmation.confirmed_budget)) {
        throw new Error("Confirmation machine budget does not match normalized user limits.");
      }
      const recomputedEffective = computeEffectiveBudget(
        proposal.policy_ceiling,
        normalizedConfirmed,
      );
      if (
        recomputedEffective.max_cost_micro !== null &&
        (pricingRevision === null || pricingDigest === null)
      ) {
        throw new Error("Finite cost cap requires pinned pricing authority.");
      }
      if (!machineBudgetEqual(recomputedEffective, confirmation.effective_budget)) {
        throw new Error("Confirmation effective budget does not match policy recomputation.");
      }
      if (
        !machineBudgetEqual(
          proposal.effective_preview,
          computeEffectiveBudget(proposal.policy_ceiling, proposal.recommended),
        )
      ) {
        throw new Error("Confirmation effective preview is invalid.");
      }
      if (utcSortKey(confirmation.confirmed_at) > utcSortKey(observedAt)) {
        throw new Error("Confirmation timestamp is in the future.");
      }
      if (utcSortKey(proposal.generated_at) > utcSortKey(confirmation.confirmed_at)) {
        throw new Error("Confirmation predates its budget proposal.");
      }
      const proposalExpiry = addMinutesFailClosed(
        proposal.generated_at,
        proposal.approval_ttl_minutes,
      );
      const effectiveExpiry = earliestUtc(
        confirmation.expires_at,
        proposalExpiry,
        contract.policy.expires_at,
      );
      if (
        proposal.approval_expires_at !==
        earliestUtc(proposalExpiry, contract.policy.expires_at)
      ) {
        throw new Error("Confirmation proposal expiry binding is stale.");
      }
      if (utcSortKey(observedAt) >= utcSortKey(effectiveExpiry)) {
        throw new Error("Confirmation is expired.");
      }

      await assertHumanConfirmationAuthority({
        mode: state.mode,
        confirmation,
        attestationContext: {
          confirmation_digest: confirmationDigest,
          proposal_digest: confirmation.proposal_digest,
          run_id: confirmation.run_id,
          phase: confirmation.phase,
          queue_item_id: confirmation.queue_item_id,
          expected_run_version: confirmation.expected_run_version,
          authority_digest: confirmation.authority_digest,
          project_config_digest: confirmation.project_config_digest,
          verifier_digest: confirmation.verifier_digest,
          regression_verifier_digest: confirmation.regression_verifier_digest,
          policy_digest: confirmation.policy_digest,
          approver: confirmation.approver,
        },
        verifyHostAttestation: dependencies.verifyHostHumanAttestation,
      });
      if (
        (recomputedEffective.max_tokens !== null ||
          recomputedEffective.max_cost_micro !== null) &&
        (typeof dependencies.verifyUsageMetering !== "function" ||
          (await dependencies.verifyUsageMetering({
            run_id: contract.run_id,
            effective_budget: structuredClone(recomputedEffective),
          })) !== true)
      ) {
        throw new Error("Finite token/cost cap requires verified usage metering capability.");
      }
      return { effectiveExpiry, recomputedEffective };
    } catch (error) {
      throw approvalRequired(error);
    }
  }

  async function readConfirmation(paths, confirmationDigest, context) {
    const candidate = confirmationPath(paths, confirmationDigest);
    const cacheKey = `${candidate}\0${confirmationDigest}`;
    if (context.confirmationCache.has(cacheKey)) {
      return context.confirmationCache.get(cacheKey);
    }
    const schema = await loadSchema(
      "budget-confirmation-v2.schema.json",
      context,
    );
    const text = await readControllerFile(safeRoot, candidate, {
      encoding: "utf8",
      label: "budget confirmation evidence",
      maxBytes: MAX_CONFIRMATION_BYTES,
      readKind: "confirmation",
    }, context);
    if (digestBytes(text) !== confirmationDigest) {
      throw new Error("Budget confirmation evidence digest is corrupt.");
    }
    const confirmation = parseJsonDocument(
      text,
      schema,
      "budget confirmation evidence",
    );
    assertPrivacySafeRuntimeValue(confirmation, "budget confirmation evidence");
    const evidence = { confirmation, text };
    context.confirmationCache.set(cacheKey, evidence);
    return evidence;
  }

  async function readProposal(paths, proposalDigest, context) {
    const candidate = proposalPath(paths, proposalDigest);
    const cacheKey = `${candidate}\0${proposalDigest}`;
    if (context.proposalCache.has(cacheKey)) {
      return context.proposalCache.get(cacheKey);
    }
    const schema = await loadSchema("budget-proposal-v2.schema.json", context);
    const text = await readControllerFile(safeRoot, candidate, {
      encoding: "utf8",
      label: "budget proposal evidence",
      maxBytes: MAX_PROPOSAL_BYTES,
      readKind: "proposal",
    }, context);
    if (digestBytes(text) !== proposalDigest) {
      throw new Error("Budget proposal evidence digest is corrupt.");
    }
    const proposal = parseJsonDocument(text, schema, "budget proposal evidence");
    assertPrivacySafeRuntimeValue(proposal, "budget proposal evidence");
    const evidence = { proposal, text };
    context.proposalCache.set(cacheKey, evidence);
    return evidence;
  }

  function assertFreshness(freshness, contract) {
    if (!hasExactFields(freshness, FRESHNESS_FIELDS)) {
      throw new Error("Freshness input must contain the exact required digest fields.");
    }
    const expected = {
      authority_digest: authorityDigest(contract),
      project_config_digest: contract.project_config_digest,
      verifier_digest: contract.verifier.digest,
      eval_definition_digest: contract.verifier.eval_definition_digest,
    };
    for (const field of FRESHNESS_FIELDS) {
      if (freshness[field] !== expected[field]) {
        throw new Error(`${field.replaceAll("_", " ")} is stale; freshness mismatch.`);
      }
    }
  }

  function assertActionObservationBinding(state, data) {
    if (
      state.active_action === null ||
      data.action_id !== state.active_action.action_id ||
      data.idempotency_key !== state.active_action.idempotency_key
    ) {
      throw new Error("Action observation does not match the active action binding.");
    }
    const evidence = [
      data.external_action_record_digest,
      data.external_outcome,
      data.target_audit_digest,
    ];
    const allNull = evidence.every((value) => value === null);
    const allPresent = evidence.every((value) => value !== null);
    if (!allNull && !allPresent) {
      throw new Error("Action observation external evidence must be all null or all present.");
    }
    if (
      allPresent &&
      (!/^sha256:[a-f0-9]{64}$/u.test(data.external_action_record_digest) ||
        !new Set(["APPLIED", "NOT_APPLIED", "PARTIALLY_APPLIED"]).has(
          data.external_outcome,
        ) ||
        !/^sha256:[a-f0-9]{64}$/u.test(data.target_audit_digest))
    ) {
      throw new Error(
        "Action observation requires a known durable external outcome; indeterminate outcomes remain UNKNOWN_OUTCOME.",
      );
    }
  }

  async function attestExternalActionObservation(state, data, contract) {
    assertActionObservationBinding(state, data);
    if (data.external_action_record_digest === null) return;
    if (typeof dependencies.verifyExternalActionObservation !== "function") {
      throw new Error("Durable external action observation verifier is required.");
    }
    const attestation = await dependencies.verifyExternalActionObservation({
      run_id: contract.run_id,
      action_id: data.action_id,
      idempotency_key: data.idempotency_key,
      record_digest: data.external_action_record_digest,
      outcome: data.external_outcome,
      target_audit_digest: data.target_audit_digest,
    });
    const expectedFields = [
      "verified",
      "record_digest",
      "outcome",
      "target_audit_digest",
    ];
    if (
      attestation === null ||
      typeof attestation !== "object" ||
      Array.isArray(attestation) ||
      Object.keys(attestation).length !== expectedFields.length ||
      !expectedFields.every((field) => Object.hasOwn(attestation, field)) ||
      attestation.verified !== true ||
      attestation.record_digest !== data.external_action_record_digest ||
      attestation.outcome !== data.external_outcome ||
      attestation.target_audit_digest !== data.target_audit_digest
    ) {
      throw new Error("Durable external action observation attestation mismatch.");
    }
  }

  function rawUsageReceipt(receipt) {
    const {
      conservative_total_tokens: ignored,
      ...tokenUsage
    } = receipt.token_usage ?? {};
    return {
      ...receipt,
      contributor: structuredClone(receipt.contributor),
      token_usage: tokenUsage,
      cost: structuredClone(receipt.cost),
      reservation: structuredClone(receipt.reservation),
    };
  }

  async function normalizeUsageForState({
    receipt,
    state,
    contract,
    loadedConfig,
    context,
    boundHead = state.last_event_hash,
    iteration = state.counters.iterations,
  }) {
    const raw = rawUsageReceipt(receipt);
    const schema = await loadSchema("usage-receipt-v2.schema.json", context);
    assertValidValue(raw, schema, "usage receipt");
    const telemetry = loadedConfig.config.telemetry;
    const normalized = normalizeUsageReceipt(raw, {
      run_id: contract.run_id,
      run_head_digest: boundHead,
      iteration,
      autonomy_profile: contract.autonomy_profile,
      risk_profile: contract.risk_profile,
      billing_currency: loadedConfig.config.billing_currency,
      pricing_revision: telemetry.pricing_revision ?? null,
      pricing_digest: telemetry.pricing_digest ?? null,
      finite_token_cap: state.effective_budget.max_tokens !== null,
      finite_cost_cap: state.effective_budget.max_cost_micro !== null,
    });
    assertPrivacySafeRuntimeValue(normalized, "normalized usage receipt");
    return normalized;
  }

  async function readApplyInput(command, inputFile) {
    const expected = APPLY_FIELDS[command];
    if (expected === undefined) throw new Error(`Unsupported apply command: ${command}`);
    const text = await readBoundedFile(safeRoot, inputFile, {
      encoding: "utf8",
      label: `${command} input`,
      maxBytes: MAX_CONFIRMATION_BYTES,
    });
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      throw new Error(`${command} input is not valid JSON: ${error.message}`);
    }
    const optional = OPTIONAL_APPLY_FIELDS[command] ?? [];
    const validShape =
      hasExactFields(value, expected) ||
      (optional.length > 0 && hasExactFields(value, [...expected, ...optional]));
    if (!validShape) {
      throw new Error(`${command} input must contain only its exact required fields.`);
    }
    assertPrivacySafeRuntimeValue(value, `${command} input`);
    return value;
  }

  async function loadAdaptiveLearning(replayed) {
    const store = createLoopLearningStore({
      root: safeRoot,
      runId: replayed.contract.run_id,
    });
    const projection = await store.readLearningProjectionOptional();
    const outcomeProjection = await store.readOutcomeProjectionOptional();
    assertLearningProjectionMatchesEvents(
      projection,
      replayed.events,
      replayed.state.last_event_hash,
    );
    assertOutcomeProjectionMatchesEvents(
      outcomeProjection,
      replayed.events,
      replayed.contract,
      replayed.state.last_event_hash,
    );
    return {
      store,
      projection,
      outcomeProjection,
      records: learningRecordsFromEvents(replayed.events),
      outcomes: outcomesFromEvents(replayed.events, replayed.contract),
    };
  }

  async function synchronizeAdaptiveLearning({
    store,
    projection,
    outcomeProjection,
    contract,
    events,
    event,
  }) {
    const nextEvents = [...events, event];
    const compacted = compactLearningRecords(learningRecordsFromEvents(nextEvents));
    const learning = await store.writeLearningProjection({
      expectedVersion: projection?.version ?? 0,
      runHeadDigest: event.event_hash,
      sourceEventDigest: event.event_hash,
      records: compacted.active_records,
    });
    const outcomes = outcomesFromEvents(nextEvents, contract);
    let outcome = null;
    if (outcomeProjection !== null || outcomes.length > 0) {
      outcome = await store.writeOutcomeProjection({
        expectedVersion: outcomeProjection?.version ?? 0,
        runHeadDigest: event.event_hash,
        sourceEventDigest: event.event_hash,
        outcomes,
      });
    }
    return { learning, outcome };
  }

  async function synchronizeOutcomeProjectionAtCurrentHead({
    store,
    outcomeProjection,
    events,
    contract,
    currentHead,
  }) {
    const outcomes = outcomesFromEvents(events, contract);
    if (
      outcomeProjection !== null &&
      outcomeProjection.bound_run_head_digest === currentHead &&
      JSON.stringify(outcomeProjection.outcomes) === JSON.stringify(outcomes)
    ) {
      return outcomeProjection;
    }
    return store.writeOutcomeProjection({
      expectedVersion: outcomeProjection?.version ?? 0,
      runHeadDigest: currentHead,
      sourceEventDigest: currentHead,
      outcomes,
    });
  }

  async function deriveReleaseEvidence({
    replayed,
    state,
    input,
    context,
    recordedAt,
    verifyHostAttestation = true,
  }) {
    const evalResultText = await readBoundedFile(safeRoot, input.eval_result_path, {
      encoding: "utf8",
      label: "eval result evidence",
      maxBytes: MAX_EVAL_RESULT_BYTES,
    });
    const evalResultSchema = await loadSchema("eval-result-v2.schema.json", context);
    const evalResult = parseJsonDocument(
      evalResultText,
      evalResultSchema,
      "eval result evidence",
    );
    const expectedLedgerPath =
      `.scratch/work-packages/${replayed.contract.run_id}/ledger.json`;
    if (
      String(input.work_package_ledger_path ?? "").replaceAll("\\", "/") !==
      expectedLedgerPath
    ) {
      throw new Error("Work-package ledger path is not canonical for the run.");
    }
    const assuranceRefs = new Set([
      evalResult.finding_inventory.evidence_ref,
      ...(evalResult.checker === null ? [] : [evalResult.checker.evidence_ref]),
      ...evalResult.human_gates
        .filter((gate) => gate.status === "PASS")
        .map((gate) => gate.evidence_ref),
      ...evalResult.findings
        .filter((finding) => finding.return_gate !== null)
        .map((finding) => finding.return_gate.evidence_ref),
    ]);
    const ledgerDocument = await withOwnerLock(
      safeRoot,
      `${expectedLedgerPath}.lock`,
      async () => {
        const ledgerText = await readBoundedFile(safeRoot, expectedLedgerPath, {
          encoding: "utf8",
          label: "work-package release ledger",
          maxBytes: MAX_WORK_PACKAGE_LEDGER_BYTES,
        });
        const ledgerSchema = await loadSchema(
          "work-package-ledger-v2.schema.json",
          context,
        );
        const ledger = parseJsonDocument(
          ledgerText,
          ledgerSchema,
          "work-package release ledger",
        );
        const goal = ledger.goals?.[input.work_package_goal_id];
        const assuranceEvidence = [];
        for (const artifact of goal?.evidence?.evidenceArtifacts ?? []) {
          const identity =
            process.platform === "win32" ? artifact.path.toLowerCase() : artifact.path;
          if (WORK_PACKAGE_CONTROL_PATH_PATTERN.test(identity)) {
            throw new Error(
              `Release evidence aliases mutable work-package control state: ${artifact.path}`,
            );
          }
          const content = await readBoundedFile(safeRoot, artifact.path, {
            label: "release evidence artifact",
            maxBytes: MAX_RELEASE_EVIDENCE_BYTES,
          });
          if (digestBytes(content).slice("sha256:".length) !== artifact.digest) {
            throw new Error(
              `Evidence digest mismatch for ${input.work_package_goal_id}: ${artifact.path}`,
            );
          }
          if (assuranceRefs.has(artifact.path)) {
            let parsed;
            try {
              parsed = JSON.parse(content.toString("utf8"));
            } catch (error) {
              throw new Error(
                `Typed assurance evidence is not valid JSON: ${artifact.path}: ${error.message}`,
              );
            }
            assuranceEvidence.push({
              path: artifact.path,
              digest: `sha256:${artifact.digest}`,
              content: parsed,
            });
          }
        }
        return { ledger, text: ledgerText, assuranceEvidence };
      },
    );
    const evalResultDigest = digestBytes(evalResultText);
    const ledgerDigest = digestBytes(ledgerDocument.text);
    const evaluated = evaluateReleaseGate({
      contract: replayed.contract,
      state,
      evalResult,
      ledger: ledgerDocument.ledger,
      goalId: input.work_package_goal_id,
      workspaceHeadGitSha: input.workspace_head_git_sha,
      evalResultDigest,
      ledgerDigest,
      assuranceEvidence: ledgerDocument.assuranceEvidence,
    });
    const claims = buildHostReleaseClaims(evalResult, ledgerDocument.assuranceEvidence);
    if (verifyHostAttestation) {
      if (typeof dependencies.verifyHostReleaseAttestation !== "function") {
        throw new Error("Host release attestation verification is required.");
      }
      let hostVerified = false;
      try {
        hostVerified =
          (await dependencies.verifyHostReleaseAttestation(
            cloneFrozen({
              schema: "release_attestation_context_v2",
              run_id: replayed.contract.run_id,
              goal_ref: replayed.contract.goal.ref,
              goal_digest: replayed.contract.goal.digest,
              mode: state.mode,
              risk_profile: replayed.contract.risk_profile,
              autonomy_profile: replayed.contract.autonomy_profile,
              eval_definition_digest: evalResult.eval_definition_digest,
              verifier_digest: evalResult.verifier_digest,
              eval_result_digest: evalResultDigest,
              work_package_digest: ledgerDigest,
              work_package_goal_id: input.work_package_goal_id,
              run_head_digest: state.last_event_hash,
              workspace_head_git_sha: input.workspace_head_git_sha,
              release_evidence: evaluated,
              claims,
            }),
          )) === true;
      } catch {
        hostVerified = false;
      }
      if (!hostVerified) {
        throw new Error("Host release attestation verification failed.");
      }
    }
    const { verdict, ...releaseEvidence } = evaluated;
    if (verdict !== "PASS") {
      throw new Error("Release evaluator did not derive PASS.");
    }
    const releaseEvidenceDigest = operationalMetricDigest(releaseEvidence);
    const operationalMetric = normalizeOperationalMetric(
      {
        schema: "operational_metric_v2",
        contract_version: "2.0.0",
        metric_id: digestJson({
          kind: "EVAL_RELEASE",
          run_id: replayed.contract.run_id,
          run_head_digest: state.last_event_hash,
          eval_result_digest: evalResultDigest,
          release_evidence_digest: releaseEvidenceDigest,
        }),
        run_id: replayed.contract.run_id,
        bound_run_head_digest: state.last_event_hash,
        kind: "EVAL_RELEASE",
        provenance: "HOST_ATTESTED",
        evidence_digest: evalResultDigest,
        recorded_at: recordedAt,
        payload: {
          accepted_outcome: "ACCEPTED",
          acceptance_source: "FRESH_RELEASE_GATE",
          eval_result_digest: evalResultDigest,
          release_evidence_digest: releaseEvidenceDigest,
          attempts: evalResult.attempts.map((attempt) => ({
            attempt_number: attempt.attempt_number,
            targeted_verdict: attempt.verdict,
            regression_verdict: attempt.regression?.verdict ?? null,
            attempt_digest: deriveEvalAttemptDigest(attempt),
          })),
          targeted: { k: 3, ...evalResult.pass_metrics },
          regression:
            evalResult.regression_pass_metrics === null
              ? null
              : { k: 3, ...evalResult.regression_pass_metrics },
        },
      },
      {
        run_id: replayed.contract.run_id,
        run_head_digest: state.last_event_hash,
        allowed_kinds: ["EVAL_RELEASE"],
      },
    );
    return { releaseEvidence, operationalMetric };
  }

  async function readBudgetRecommendation({
    inputFile,
    contract,
    phase,
    state,
    billingCurrency,
  }) {
    if (inputFile === undefined) {
      return {
        source: "REFERENCE_ADAPTER_ADVISORY",
        limits: {
          max_iterations: state.effective_budget.max_iterations,
          max_runtime_minutes: null,
          max_no_progress_iterations: null,
          max_tokens: null,
          max_cost: null,
        },
        reason:
          "Use the finite iteration ceiling while nullable user fields leave stricter project policy intact.",
      };
    }
    const text = await readBoundedFile(safeRoot, inputFile, {
      encoding: "utf8",
      label: "budget recommendation input",
      maxBytes: MAX_PROPOSAL_BYTES,
    });
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      throw new Error(`Budget recommendation input is not valid JSON: ${error.message}`);
    }
    const fields = [
      "schema",
      "contract_version",
      "recommendation_source",
      "run_id",
      "phase",
      "expected_run_version",
      "goal_ref",
      "goal_digest",
      "verifier_digest",
      "policy_digest",
      "recommended_limits",
      "recommendation_reason",
    ];
    if (
      !hasExactFields(value, fields) ||
      value.schema !== "budget_recommendation_v2" ||
      value.contract_version !== "2.0.0" ||
      value.recommendation_source !== "MODEL_ADVISORY" ||
      value.run_id !== contract.run_id ||
      value.phase !== phase ||
      value.expected_run_version !== state.version ||
      value.goal_ref !== contract.goal.ref ||
      value.goal_digest !== contract.goal.digest ||
      value.verifier_digest !== contract.verifier.digest ||
      value.policy_digest !== policyDigest(contract) ||
      !isSanitizedRecommendationReason(value.recommendation_reason)
    ) {
      throw new Error("Budget recommendation input binding is stale, invalid, or unbounded.");
    }
    const normalized = normalizeConfirmedLimits(
      value.recommended_limits,
      billingCurrency,
    );
    computeEffectiveBudget(state.effective_budget, normalized);
    return {
      source: value.recommendation_source,
      limits: structuredClone(value.recommended_limits),
      reason: value.recommendation_reason,
    };
  }

  function reduceEvent(state, event, contract) {
    let command;
    switch (event.type) {
      case "STARTED":
        command = {
          type: "START",
          confirmation_digest: event.data.confirmation_digest,
          at: event.recorded_at,
        };
        break;
      case "ACTION_INTENDED":
        if (
          requiresAdaptiveLearning(contract) !==
          (event.data.learning_intent !== undefined)
        ) {
          throw new Error("ACTION_INTENDED learning profile binding is invalid.");
        }
        command = {
          type: "BEGIN_ACTION",
          confirmation_digest: state.approval?.confirmation_digest,
          at: event.recorded_at,
          action_id: event.data.action_id,
          idempotency_key: event.data.idempotency_key,
        };
        break;
      case "ACTION_OBSERVED":
        assertActionObservationBinding(state, event.data);
        command = { type: "OBSERVE_ACTION", duration_ms: event.data.duration_ms };
        break;
      case "USAGE_RECORDED":
        command = { type: "RECORD_USAGE", receipt: event.data.receipt };
        break;
      case "OPERATIONAL_METRIC_RECORDED":
        command = { type: "RECORD_OPERATIONAL_METRIC" };
        break;
      case "LEARNING_OUTCOME_RECORDED": {
        if (!requiresAdaptiveLearning(contract)) {
          throw new Error("LEARNING_OUTCOME_RECORDED profile binding is invalid.");
        }
        const outcome = normalizeOutcomeForEvent(
          outcomeInputFromRecord(event.data.outcome),
          contract,
          state.last_event_hash,
          event.recorded_at,
        );
        if (
          digestJson(outcome) !== event.data.outcome_digest ||
          JSON.stringify(outcome) !== JSON.stringify(event.data.outcome)
        ) {
          throw new Error("LEARNING_OUTCOME_RECORDED event is corrupt.");
        }
        command = { type: "RECORD_LEARNING_OUTCOME" };
        break;
      }
      case "VERIFIED_PATTERN_PROMOTED": {
        if (!requiresAdaptiveLearning(contract)) {
          throw new Error("VERIFIED_PATTERN_PROMOTED profile binding is invalid.");
        }
        const pattern = normalizePatternForEvent(
          patternInputFromRecord(event.data.pattern),
          contract,
          state.last_event_hash,
          event.recorded_at,
        );
        assertPromotionEvidence(event.data.promotion_evidence);
        if (
          digestJson(pattern) !== event.data.pattern_digest ||
          JSON.stringify(pattern) !== JSON.stringify(event.data.pattern)
        ) {
          throw new Error("VERIFIED_PATTERN_PROMOTED event is corrupt.");
        }
        command = { type: "PROMOTE_VERIFIED_PATTERN" };
        break;
      }
      case "ACTIVE_DURATION_RECORDED": {
        const commandByPhase = {
          OBSERVATION: "RECORD_OBSERVATION_DURATION",
          VERIFICATION: "RECORD_VERIFICATION_DURATION",
          BACKOFF: "RECORD_BACKOFF_DURATION",
        };
        command = {
          type: commandByPhase[event.data.phase],
          duration_ms: event.data.duration_ms,
        };
        break;
      }
      case "VERIFICATION_STARTED":
        if (event.data.verifier_digest !== contract.verifier.digest) {
          throw new Error("VERIFICATION_STARTED verifier digest is stale.");
        }
        command = { type: "BEGIN_VERIFICATION" };
        break;
      case "VERIFICATION_PASSED": {
        if (
          requiresAdaptiveLearning(contract) !==
          (event.data.learning_completion !== undefined)
        ) {
          throw new Error("VERIFICATION_PASSED learning profile binding is invalid.");
        }
        const {
          verification_status: ignored,
          operational_metric: ignoredMetric,
          learning_completion: ignoredLearningCompletion,
          ...releaseEvidence
        } = event.data;
        command = {
          type: "VERIFICATION_PASSED",
          release_evidence: releaseEvidence,
        };
        break;
      }
      case "VERIFICATION_FAILED": {
        if (
          requiresAdaptiveLearning(contract) !==
          (event.data.learning_completion !== undefined)
        ) {
          throw new Error("VERIFICATION_FAILED learning profile binding is invalid.");
        }
        const {
          learning_completion: ignoredLearningCompletion,
          ...failureEvidence
        } = event.data;
        command = { type: "VERIFICATION_FAILED", ...failureEvidence };
        break;
      }
      case "PAUSED":
        if (event.data.paused_from !== state.status) {
          throw new Error("PAUSED event does not bind its lifecycle origin.");
        }
        command = { type: "PAUSE" };
        break;
      case "RESUMED": {
        if (event.data.resumed_to !== state.paused_from) {
          throw new Error("RESUMED event does not bind its paused lifecycle target.");
        }
        const resuming = reduceRunState(state, {
          type: "RESUME",
          confirmation_digest: event.data.confirmation_digest,
          at: event.recorded_at,
        });
        if (!resuming.accepted) {
          throw new Error(`RESUMED event is invalid: ${resuming.reason}`);
        }
        const duration = reduceRunState(resuming.state, {
          type: "RECORD_RESUME_DURATION",
          duration_ms: event.data.duration_ms,
        });
        if (!duration.accepted) {
          throw new Error(`RESUMED duration is invalid: ${duration.reason}`);
        }
        const completed = reduceRunState(duration.state, { type: "RESUME_COMPLETED" });
        if (!completed.accepted) {
          throw new Error(`RESUMED completion is invalid: ${completed.reason}`);
        }
        return completed.state;
      }
      case "STOPPED":
        command = {
          type: "STOP",
          terminal_status: event.data.terminal_status,
          reason: event.data.reason,
        };
        break;
      case "RECONCILED":
        command = {
          type: "RECONCILE",
          outcome: event.data.reconciliation_outcome,
          evidence_digest: event.data.evidence_digest,
        };
        break;
      default:
        return null;
    }
    const transition = reduceRunState(state, command);
    if (!transition.accepted) {
      throw new Error(`${event.type} event is invalid: ${transition.reason}`);
    }
    return transition.state;
  }

  async function replayRun(runId, context) {
    if (context.replayCache.has(runId)) return context.replayCache.get(runId);
    if (context.replayInFlight.has(runId)) {
      throw new Error(`Run lineage replay is cyclic or re-entrant at ${runId}.`);
    }
    context.replayInFlight.add(runId);
    let replayProjectConfigDigest = null;
    let lastKnownEventHead = null;
    try {
      const { contract, contractText, loadedConfig, paths } = await readAuthority(
        runId,
        context,
      );
      replayProjectConfigDigest = loadedConfig.config_digest;
      const eventSchema = await loadSchema(
        "loop-run-event-v2.schema.json",
        context,
      );
      const eventText = await readControllerFile(safeRoot, paths.events, {
        encoding: "utf8",
        label: "run event log",
        maxBytes: MAX_EVENT_LOG_BYTES,
        readKind: "events",
      }, context);
      if (!eventText.endsWith("\n")) {
        throw new Error("Run event log is truncated or corrupt.");
      }
      const lines = eventText.slice(0, -1).split("\n");
      if (lines.length === 0 || lines.some((line) => line.length === 0)) {
        throw new Error("Run event log is empty or corrupt.");
      }

      let state = createInitialRunState({
        run_id: contract.run_id,
        mode: loadedConfig.effective_mode,
        authority_digest: authorityDigest(contract),
        policy_digest: policyDigest(contract),
        effective_budget: numericPolicy(contract.policy),
      });
      const eventIds = new Set();
      const usageReceiptIds = new Set();
      const operationalMetricIds = new Set();
      const events = [];
      const states = [];
      for (let index = 0; index < lines.length; index += 1) {
        const event = parseJsonDocument(
          lines[index],
          eventSchema,
          `event ${index + 1}`,
        );
        if (
          event.run_id !== runId ||
          event.sequence !== state.sequence + 1 ||
          event.version !== state.version + 1 ||
          event.previous_hash !== state.last_event_hash ||
          eventIds.has(event.event_id)
        ) {
          throw new Error(`Run event chain is corrupt at sequence ${event.sequence}.`);
        }
        if (event.event_hash !== calculateEventHash(event)) {
          throw new Error(`Run event hash is corrupt at sequence ${event.sequence}.`);
        }
        assertPrivacySafeRuntimeValue(event, `event ${event.sequence}`);
        eventIds.add(event.event_id);
        if (index === 0) {
          if (
            event.type !== "CREATED" ||
            event.data.contract_digest !== digestBytes(contractText)
          ) {
            throw new Error("CREATED event contract digest is corrupt.");
          }
        } else if (event.type === "BUDGET_CONFIRMED") {
          const evidence = await readConfirmation(
            paths,
            event.data.confirmation_digest,
            context,
          );
          const proposalEvidence = await readProposal(
            paths,
            evidence.confirmation.proposal_digest,
            context,
          );
          const { effectiveExpiry, recomputedEffective } =
            await assertConfirmationBindings({
              confirmation: evidence.confirmation,
              confirmationDigest: event.data.confirmation_digest,
              context,
              contract,
              proposal: proposalEvidence.proposal,
              state,
              observedAt: event.recorded_at,
              billingCurrency: loadedConfig.config.billing_currency,
              pricingRevision:
                loadedConfig.config.telemetry.pricing_revision ?? null,
              pricingDigest:
                loadedConfig.config.telemetry.pricing_digest ?? null,
            });
          const transition = reduceRunState(state, {
            type: "BUDGET_CONFIRMED",
            confirmation_digest: event.data.confirmation_digest,
            phase: evidence.confirmation.phase,
            expected_run_version: evidence.confirmation.expected_run_version,
            expires_at: effectiveExpiry,
            effective_budget: recomputedEffective,
          });
          if (!transition.accepted) {
            throw new Error(`BUDGET_CONFIRMED event is invalid: ${transition.reason}`);
          }
          state = transition.state;
        } else if (event.type === "SNAPSHOT_REPAIRED") {
          if (event.data.repaired_from_event_hash !== state.last_event_hash) {
            throw new Error("SNAPSHOT_REPAIRED does not bind the repaired event head.");
          }
        } else {
          if (event.type === "USAGE_RECORDED") {
            const normalized = await normalizeUsageForState({
              receipt: event.data.receipt,
              state,
              contract,
              loadedConfig,
              context,
            });
            if (
              JSON.stringify(normalized) !== JSON.stringify(event.data.receipt) ||
              usageReceiptDigest(normalized) !== event.data.receipt_digest ||
              usageReceiptIds.has(normalized.receipt_id)
            ) {
              throw new Error(
                `Usage receipt event is corrupt or duplicated at sequence ${event.sequence}.`,
              );
            }
            usageReceiptIds.add(normalized.receipt_id);
          }
          if (
            event.type === "OPERATIONAL_METRIC_RECORDED" ||
            event.type === "VERIFICATION_PASSED"
          ) {
            const metric =
              event.type === "OPERATIONAL_METRIC_RECORDED"
                ? event.data.metric
                : event.data.operational_metric;
            let normalizedMetric;
            try {
              normalizedMetric = normalizeOperationalMetric(metric, {
                run_id: contract.run_id,
                run_head_digest: state.last_event_hash,
                allowed_kinds:
                  event.type === "VERIFICATION_PASSED"
                    ? ["EVAL_RELEASE"]
                    : ["ROUTE_INVOCATION", "REVIEW_COORDINATION"],
              });
            } catch {
              throw new Error(
                `Operational metric event is corrupt or duplicated at sequence ${event.sequence}.`,
              );
            }
            if (
              JSON.stringify(normalizedMetric) !== JSON.stringify(metric) ||
              operationalMetricIds.has(normalizedMetric.metric_id) ||
              (event.type === "OPERATIONAL_METRIC_RECORDED" &&
                operationalMetricDigest(normalizedMetric) !==
                  event.data.metric_digest)
            ) {
              throw new Error(
                `Operational metric event is corrupt or duplicated at sequence ${event.sequence}.`,
              );
            }
            operationalMetricIds.add(normalizedMetric.metric_id);
          }
          const reduced = reduceEvent(state, event, contract);
          if (reduced === null) {
            throw new Error(`Unsupported run event during replay: ${event.type}`);
          }
          state = reduced;
        }
        state = withEventHead(state, event);
        lastKnownEventHead = event.event_hash;
        events.push(event);
        if (context.retainStateHistoryFor === runId) {
          states.push(structuredClone(state));
        }
      }
      if (requiresAdaptiveLearning(contract)) {
        learningRecordsFromEvents(events);
        outcomesFromEvents(events, contract);
        assertPatternPromotionHistory(events, contract);
      }
      const replayed = { contract, events, loadedConfig, paths, state, states };
      context.replayCache.set(runId, replayed);
      return replayed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      let safetyConfigDigest = replayProjectConfigDigest;
      if (/PRIVACY_STOP/u.test(message)) {
        if (!/^sha256:[a-f0-9]{64}$/u.test(safetyConfigDigest ?? "")) {
          safetyConfigDigest = (await loadFreshCanonicalProjectConfig())
            .config_digest;
        }
        if (/^sha256:[a-f0-9]{64}$/u.test(safetyConfigDigest ?? "")) {
          await tripProjectSafety({
            reasonCode: "PERSISTED_PRIVACY_VIOLATION",
            runId,
            sourceEventHead: lastKnownEventHead,
            projectConfigDigest: safetyConfigDigest,
          });
        }
      } else if (
        /^sha256:[a-f0-9]{64}$/u.test(safetyConfigDigest ?? "") &&
        /Run event log|Run event chain|Run event hash|CREATED event contract digest|Usage receipt event is corrupt|Operational metric event is corrupt|Unsupported run event during replay|event \d+ is invalid|BUDGET_CONFIRMED event is invalid|SNAPSHOT_REPAIRED does not bind/u.test(
          message,
        )
      ) {
        await tripProjectSafety({
          reasonCode: "EVENT_CHAIN_CORRUPTION",
          runId,
          sourceEventHead: lastKnownEventHead,
          projectConfigDigest: safetyConfigDigest,
        });
      }
      throw error;
    } finally {
      context.replayInFlight.delete(runId);
    }
  }

  async function requireCurrentSnapshot(replayed, context) {
    const cacheKey = `${replayed.contract.run_id}\0${replayed.state.last_event_hash}`;
    if (context.snapshotCache.has(cacheKey)) {
      return context.snapshotCache.get(cacheKey);
    }
    const stateSchema = await loadSchema(
      "loop-run-state-v2.schema.json",
      context,
    );
    const stateText = await readControllerFile(safeRoot, replayed.paths.state, {
      encoding: "utf8",
      label: "run state snapshot",
      maxBytes: MAX_STATE_BYTES,
      readKind: "snapshot",
    }, context);
    let snapshot;
    try {
      snapshot = parseJsonDocument(stateText, stateSchema, "run state snapshot");
      assertPrivacySafeRuntimeValue(snapshot, "run state snapshot");
    } catch (error) {
      await tripProjectSafety({
        reasonCode: /PRIVACY_STOP/u.test(error instanceof Error ? error.message : "")
          ? "PERSISTED_PRIVACY_VIOLATION"
          : "COUNTER_CORRUPTION",
        runId: replayed.contract.run_id,
        sourceEventHead: replayed.state.last_event_hash,
        projectConfigDigest: replayed.loadedConfig.config_digest,
      });
      throw error;
    }
    if (
      snapshot.sequence > replayed.state.sequence ||
      snapshot.version > replayed.state.version
    ) {
      await tripProjectSafety({
        reasonCode: "COUNTER_REGRESSION",
        runId: replayed.contract.run_id,
        sourceEventHead: replayed.state.last_event_hash,
        projectConfigDigest: replayed.loadedConfig.config_digest,
      });
      throw new Error("Run snapshot is ahead of event authority and is corrupt.");
    }
    if (
      snapshot.sequence < replayed.state.sequence ||
      snapshot.version < replayed.state.version
    ) {
      throw new Error("Run snapshot is behind event authority; explicit repair is required.");
    }
    if (JSON.stringify(snapshot) !== JSON.stringify(replayed.state)) {
      await tripProjectSafety({
        reasonCode: "COUNTER_CORRUPTION",
        runId: replayed.contract.run_id,
        sourceEventHead: replayed.state.last_event_hash,
        projectConfigDigest: replayed.loadedConfig.config_digest,
      });
      throw new Error("Run snapshot diverges from event authority and is corrupt.");
    }
    context.snapshotCache.set(cacheKey, snapshot);
    return snapshot;
  }

  async function collectAdaptiveOutcomes(context) {
    const runsPath = await resolveRepositoryPath(safeRoot, RUNS_DIRECTORY, {
      label: "loop runs directory",
    });
    const info = await lstat(runsPath).catch(() => null);
    if (info === null) return [];
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error("Loop runs directory is not a safe directory.");
    }
    const entries = [];
    const directory = await opendir(runsPath);
    for await (const entry of directory) {
      if (entries.length >= maxListEntries) {
        throw new Error(
          `Adaptive memory entry limit exceeded: maximum ${maxListEntries}.`,
        );
      }
      entries.push(entry);
    }
    const outcomes = [];
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (entry.isSymbolicLink()) {
        throw new Error(`Loop run entry is a symlink: ${entry.name}`);
      }
      if (!entry.isDirectory() || entry.name.endsWith(".owner.lock")) continue;
      const replayed = await replayRun(entry.name, context);
      await requireCurrentSnapshot(replayed, context);
      if (!requiresAdaptiveLearning(replayed.contract)) continue;
      outcomes.push(...outcomesFromEvents(replayed.events, replayed.contract));
      if (outcomes.length > 4_096) {
        throw new Error("Adaptive outcome inventory exceeds the bounded limit.");
      }
    }
    return outcomes.sort(
      (left, right) =>
        right.recorded_at.localeCompare(left.recorded_at) ||
        left.run_id.localeCompare(right.run_id) ||
        left.outcome_id.localeCompare(right.outcome_id),
    );
  }

  async function calculateLineageTotals(contract, state, context) {
    const cacheKey = JSON.stringify({
      counters: state.counters,
      head: state.last_event_hash,
      run_id: contract.run_id,
      version: state.version,
    });
    if (context.lineageCache.has(cacheKey)) {
      return context.lineageCache.get(cacheKey);
    }
    if (context.lineageInFlight.has(contract.run_id)) {
      throw new Error(`Run lineage is cyclic or re-entrant at ${contract.run_id}.`);
    }
    context.lineageInFlight.add(contract.run_id);
    try {
      const ownTotals = addLineageCounters(
        {
          iterations: 0,
          active_runtime_ms: 0,
          no_progress_iterations: 0,
          tokens: 0,
          cost_micro: 0,
        },
        state.counters,
      );
      const parentRunId = contract.lineage.parent_run_id;
      let result;
      if (parentRunId === null) {
        if (contract.run_id !== contract.lineage.root_run_id) {
          throw new Error("Run lineage does not terminate at its declared root.");
        }
        result = { runCount: 1, totals: ownTotals };
      } else {
        if (
          parentRunId === contract.run_id ||
          context.lineageInFlight.has(parentRunId)
        ) {
          throw new Error(`Run lineage is cyclic or re-entrant at ${parentRunId}.`);
        }
        const replayedParent = await replayRun(parentRunId, context);
        const parentState = await requireCurrentSnapshot(replayedParent, context);
        if (
          replayedParent.contract.lineage.root_run_id !==
          contract.lineage.root_run_id
        ) {
          throw new Error("Run lineage root binding is inconsistent.");
        }
        const parentLineage = await calculateLineageTotals(
          replayedParent.contract,
          parentState,
          context,
        );
        if (!TERMINAL_RUN_STATES.includes(parentState.status)) {
          throw new Error("Child-run lineage requires a terminal parent run.");
        }
        if (parentLineage.runCount >= MAX_LINEAGE_RUNS) {
          throw new Error("Run lineage is cyclic or exceeds its finite bound.");
        }
        result = {
          runCount: parentLineage.runCount + 1,
          totals: addLineageCounters(parentLineage.totals, state.counters),
        };
      }
      context.lineageCache.set(cacheKey, result);
      return result;
    } finally {
      context.lineageInFlight.delete(contract.run_id);
    }
  }

  const controller = {
    async showMode() {
      const loaded = await loadFreshCanonicalProjectConfig();
      const safetyState = await projectSafety.show({
        base_mode: loaded.effective_mode,
      });
      return {
        ...loaded,
        effective_mode: safetyState.effective_mode,
        safety_state: safetyState,
      };
    },
    async validateMode() {
      const loaded = await loadFreshCanonicalProjectConfig();
      const safetyState = await projectSafety.show({
        base_mode: loaded.effective_mode,
      });
      return {
        ...loaded,
        effective_mode: safetyState.effective_mode,
        safety_state: safetyState,
      };
    },
    async transitionMode({
      expectedDigest,
      expectedConfigVersion,
      expectedModeVersion,
      targetMode,
      inputFile,
      ownerActor,
      ownerAttestation,
      safetyHead,
      recoveryEvidenceDigest,
    } = {}) {
      if (
        expectedDigest !== "MISSING" &&
        !/^sha256:[a-f0-9]{64}$/u.test(expectedDigest ?? "")
      ) {
        throw new Error("Mode transition expected digest must be SHA-256 or MISSING.");
      }
      if (
        !Number.isSafeInteger(expectedConfigVersion) ||
        expectedConfigVersion < 1 ||
        !Number.isSafeInteger(expectedModeVersion) ||
        expectedModeVersion < 0
      ) {
        throw new Error(
          "Mode transition requires non-negative safe expected config/mode versions.",
        );
      }
      if (!new Set(["DISABLED", "OBSERVE", "ENFORCE", "HALTED"]).has(targetMode)) {
        throw new Error("Mode transition target is not supported.");
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(ownerActor ?? "")) {
        throw new Error("Mode transition owner actor is invalid.");
      }
      if (ownerAttestation !== "HOST_OWNER_ACTION") {
        throw new Error("Mode transition requires HOST_OWNER_ACTION attestation.");
      }

      const candidateText = await readBoundedFile(safeRoot, inputFile, {
        encoding: "utf8",
        label: "project mode candidate config",
        maxBytes: MAX_CONFIG_BYTES,
      });
      const configSchema = await loadSchema("project-config-v2.schema.json");
      const structuralCandidate = loadProjectConfig(candidateText, configSchema, {
        capabilityAttestationVerified: targetMode === "ENFORCE",
      });
      if (
        structuralCandidate.config === null ||
        structuralCandidate.errors.length > 0
      ) {
        throw new Error(
          `Project mode candidate is invalid: ${structuralCandidate.errors.join(" ")}`,
        );
      }
      if (structuralCandidate.config.mode !== targetMode) {
        throw new Error("Project mode candidate does not match the requested target.");
      }

      return withOwnerLock(
        safeRoot,
        PROJECT_CONFIG_LOCK,
        async ({ assertOwnership }) => {
          const current = await loadFreshCanonicalProjectConfig();
          const currentSafety = await projectSafety.show({
            base_mode: current.effective_mode,
          });
          const actualDigest = current.config_digest ?? "MISSING";
          if (actualDigest !== expectedDigest) {
            throw new Error(
              `Project config digest is stale: expected ${expectedDigest}, actual ${actualDigest}.`,
            );
          }
          assertExpectedVersion(
            current.config?.config_version,
            expectedConfigVersion,
            "project config version",
          );
          assertExpectedVersion(
            current.config?.mode_version,
            expectedModeVersion,
            "project mode version",
          );
          if (
            current.config.config_version === Number.MAX_SAFE_INTEGER ||
            current.config.mode_version === Number.MAX_SAFE_INTEGER
          ) {
            throw new Error("Project config or mode version cannot be incremented safely.");
          }
          const nextConfigVersion = current.config.config_version + 1;
          const nextModeVersion =
            current.config.mode === targetMode
              ? current.config.mode_version
              : current.config.mode_version + 1;
          if (
            structuralCandidate.config.config_version !== nextConfigVersion ||
            structuralCandidate.config.mode_version !== nextModeVersion
          ) {
            throw new Error(
              `Project mode candidate version mismatch: expected config ${nextConfigVersion} and mode ${nextModeVersion}.`,
            );
          }
          const preImageText =
            actualDigest === "MISSING"
              ? null
              : await readBoundedFile(safeRoot, projectConfigFile, {
                  encoding: "utf8",
                  label: "project config pre-image",
                  maxBytes: MAX_CONFIG_BYTES,
                });
          if (
            preImageText !== null &&
            digestBytes(preImageText) !== actualDigest
          ) {
            throw new Error(
              "Project config changed while capturing the transition pre-image.",
            );
          }
          const capabilityAttestationVerified =
            targetMode === "ENFORCE" && modeCapabilityAuthority !== undefined
              ? await verifyProjectModeCapabilityAuthority(
                  modeCapabilityAuthority,
                  safeRoot,
                  {
                    config: structuralCandidate.config,
                    config_digest: structuralCandidate.config_digest,
                  },
                )
              : false;
          const candidate = loadProjectConfig(candidateText, configSchema, {
            capabilityAttestationVerified,
          });
          const decision = evaluateProjectModeTransition({
            currentMode: currentSafety.effective_mode,
            targetMode,
            ownerAction: true,
            configurationValid:
              structuralCandidate.config !== null &&
              structuralCandidate.errors.length === 0,
            capabilityAttestationVerified,
          });
          if (!decision.allowed) {
            throw new Error(`Project mode transition denied: ${decision.reason}.`);
          }
          if (candidate.config === null || candidate.errors.length > 0) {
            throw new Error(
              `Project mode candidate is invalid: ${candidate.errors.join(" ")}`,
            );
          }
          if (currentSafety.active) {
            const virginLedgerRecovery =
              currentSafety.integrity === "CORRUPT" &&
              currentSafety.sequence === 0 &&
              currentSafety.head_digest === null;
            const validSafetyHead = virginLedgerRecovery
              ? safetyHead === "MISSING"
              : /^sha256:[a-f0-9]{64}$/u.test(safetyHead ?? "") &&
                safetyHead === currentSafety.head_digest;
            if (
              !validSafetyHead ||
              !/^sha256:[a-f0-9]{64}$/u.test(recoveryEvidenceDigest ?? "")
            ) {
              throw new Error(
                "Project safety recovery requires the current safety head and recovery evidence digest.",
              );
            }
          }

          await writeFileAtomic(safeRoot, projectConfigFile, candidateText, {
            assertOwnership,
            ...(preImageText === null
              ? {}
              : {
                  assertBeforeReplace: async () => {
                    const observed = await readBoundedFile(
                      safeRoot,
                      projectConfigFile,
                      {
                        encoding: "utf8",
                        label: "project config transition CAS",
                        maxBytes: MAX_CONFIG_BYTES,
                      },
                    );
                    if (observed !== preImageText) {
                      throw new Error(
                        "Project config changed before the transition replace.",
                      );
                    }
                  },
                }),
            label: "project config",
            maxBytes: MAX_CONFIG_BYTES,
            mode: 0o600,
          });
          let loaded = null;
          try {
            loaded = await loadFreshCanonicalProjectConfig();
          } catch {
            loaded = null;
          }
          const postWriteValid =
            loaded?.valid === true &&
            loaded.config !== null &&
            loaded.config_digest === structuralCandidate.config_digest &&
            loaded.config.config_version === nextConfigVersion &&
            loaded.config.mode_version === nextModeVersion &&
            loaded.effective_mode === targetMode;
          const restoreExactPreImage = async () => {
            if (preImageText === null) {
              return false;
            }
            try {
              await writeFileAtomic(
                safeRoot,
                projectConfigFile,
                preImageText,
                {
                  assertOwnership,
                  assertBeforeReplace: async () => {
                    const observed = await readBoundedFile(
                      safeRoot,
                      projectConfigFile,
                      {
                        encoding: "utf8",
                        label: "failed project config transition candidate",
                        maxBytes: MAX_CONFIG_BYTES,
                      },
                    );
                    if (observed !== candidateText) {
                      throw new Error(
                        "Project config changed before pre-image restoration.",
                      );
                    }
                  },
                  label: "project config pre-image restoration",
                  maxBytes: MAX_CONFIG_BYTES,
                  mode: 0o600,
                },
              );
              const restoredText = await readBoundedFile(
                safeRoot,
                projectConfigFile,
                {
                  encoding: "utf8",
                  label: "restored project config pre-image",
                  maxBytes: MAX_CONFIG_BYTES,
                },
              );
              const restoredConfig = await loadFreshCanonicalProjectConfig();
              return (
                restoredText === preImageText &&
                restoredConfig.config_digest === current.config_digest &&
                restoredConfig.effective_mode === current.effective_mode
              );
            } catch {
              return false;
            }
          };
          if (!postWriteValid) {
            const restored = await restoreExactPreImage();
            if (!restored) {
              throw new Error(
                "POLICY_STOP: project mode transition post-write validation failed; exact pre-image restoration could not be verified.",
              );
            }
            throw new Error(
              "POLICY_STOP: project mode transition post-write validation failed; exact pre-image restored.",
            );
          }
          if (currentSafety.active) {
            const virginLedgerRecovery =
              currentSafety.integrity === "CORRUPT" &&
              currentSafety.sequence === 0 &&
              currentSafety.head_digest === null;
            const recoveryInput = {
              expected_head: virginLedgerRecovery ? null : safetyHead,
              recovery_evidence_digest: recoveryEvidenceDigest,
              validated_project_config_digest: loaded.config_digest,
              target_mode: targetMode,
              owner_actor_ref: digestJson({
                schema: "project_safety_owner_ref_v2",
                owner_actor: ownerActor,
              }),
              owner_attestation_digest: digestJson({
                schema: "project_safety_owner_attestation_v2",
                owner_attestation: ownerAttestation,
                safety_head: safetyHead,
                target_mode: targetMode,
              }),
            };
            try {
              if (virginLedgerRecovery) {
                await projectSafety.recoverVirgin(recoveryInput);
              } else {
                await projectSafety.clear(recoveryInput);
              }
            } catch (error) {
              const restored = await restoreExactPreImage();
              if (!restored) {
                throw new Error(
                  `POLICY_STOP: project safety recovery was denied and exact pre-image restoration could not be verified. ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
              }
              throw error;
            }
          }
          const safetyState = await projectSafety.show({
            base_mode: loaded.effective_mode,
          });
          return {
            ...loaded,
            effective_mode: safetyState.effective_mode,
            safety_state: safetyState,
          };
        },
      );
    },
    async create({ contractFile } = {}) {
      const contractSchema = await loadSchema("loop-run-contract-v2.schema.json");
      const stateSchema = await loadSchema("loop-run-state-v2.schema.json");
      const eventSchema = await loadSchema("loop-run-event-v2.schema.json");
      const configSchema = await loadSchema("project-config-v2.schema.json");
      const contractText = await readBoundedFile(safeRoot, contractFile, {
        encoding: "utf8",
        label: "contract file",
        maxBytes: MAX_CONTRACT_BYTES,
      });
      const contract = parseJsonDocument(contractText, contractSchema, "run contract");
      assertPrivacySafeRuntimeValue(contract, "run contract");
      const paths = runPaths(contract.run_id);

      return withOwnerLock(safeRoot, paths.lock, async ({ assertOwnership }) => {
        const runDirectory = await resolveRepositoryPath(safeRoot, paths.directory, {
          label: "run directory",
        });
        const existing = await lstat(runDirectory).catch(() => null);
        let writeContract = true;
        if (existing !== null) {
          if (!existing.isDirectory() || existing.isSymbolicLink()) {
            throw new Error("Existing run path is not a safe provisional directory.");
          }
          const entries = (await readdir(runDirectory)).sort();
          if (entries.length === 0) {
            writeContract = true;
          } else if (entries.length === 1 && entries[0] === "contract.json") {
            const storedContract = await readBoundedFile(safeRoot, paths.contract, {
              encoding: "utf8",
              label: "provisional immutable run contract",
              maxBytes: MAX_CONTRACT_BYTES,
            });
            if (storedContract !== contractText) {
              throw new Error("Provisional immutable run contract differs; drift is denied.");
            }
            writeContract = false;
          } else {
            throw new Error(`Run already exists and its contract is immutable: ${contract.run_id}`);
          }
        }

        const loadedConfig = await loadFreshCanonicalProjectConfig();
        if (loadedConfig.config === null) {
          throw new Error(`Project config is invalid: ${loadedConfig.errors.join(" ")}`);
        }
        if (loadedConfig.config_digest !== contract.project_config_digest) {
          throw new Error("Project config digest is stale for this run contract.");
        }
        assertContractPolicyBound(contract.policy, loadedConfig.config.policy);
        assertContractProfilesBound(contract, loadedConfig.config);
        await assertFreshAuthorityBytes(safeRoot, contract);

        const initial = createInitialRunState({
          run_id: contract.run_id,
          mode: loadedConfig.effective_mode,
          authority_digest: authorityDigest(contract),
          policy_digest: policyDigest(contract),
          effective_budget: numericPolicy(contract.policy),
        });
        if (contract.lineage.parent_run_id !== null) {
          const lineageContext = createReplayContext();
          const replayedParent = await replayRun(
            contract.lineage.parent_run_id,
            lineageContext,
          );
          const parentState = await requireCurrentSnapshot(
            replayedParent,
            lineageContext,
          );
          if (
            parentState.status === "CANCELLED" ||
            parentState.terminal_reason === "CANCEL_AFTER_ACTION_INTENT"
          ) {
            throw new Error("Child-run creation denied: PARENT_CANCELLED");
          }
          await calculateLineageTotals(contract, initial, lineageContext);
        }

        if (existing === null) {
          await mkdir(runDirectory, { recursive: false });
        }
        await resolveRepositoryPath(safeRoot, runDirectory, { label: "run directory" });
        if (writeContract) {
          await writeFileAtomic(safeRoot, paths.contract, contractText, {
            assertOwnership,
            label: "immutable run contract",
            maxBytes: MAX_CONTRACT_BYTES,
            mode: 0o600,
          });
        }
        await dependencies.afterContractWrite?.({
          contract: structuredClone(contract),
          recovered: !writeContract,
        });

        const event = createEvent({
          eventId: randomId(),
          runId: contract.run_id,
          state: initial,
          type: "CREATED",
          recordedAt: now(),
          data: { contract_digest: digestBytes(contractText) },
        });
        assertValidValue(event, eventSchema, "CREATED event");
        const state = withEventHead(initial, event);
        assertValidValue(state, stateSchema, "created run state");
        assertPrivacySafeRuntimeValue(event, "CREATED event");
        assertPrivacySafeRuntimeValue(state, "created run state");

        await assertOwnership();
        await appendFileDurable(
          safeRoot,
          paths.events,
          `${JSON.stringify(event)}\n`,
          { maxBytes: MAX_EVENT_LOG_BYTES },
        );
        await dependencies.afterEventAppend?.({ event, state: structuredClone(state) });
        await projectTelemetryEventFailClosed({
          event,
          state,
          contract,
          loadedConfig,
        });
        await writeFileAtomic(
          safeRoot,
          paths.state,
          `${JSON.stringify(state, null, 2)}\n`,
          {
            assertOwnership,
            label: "run state",
            maxBytes: MAX_STATE_BYTES,
            mode: 0o600,
          },
        );

        return { contract_digest: digestBytes(contractText), state };
      });
    },

    async show({ runId } = {}) {
      const context = createReplayContext();
      const replayed = await replayRun(runId, context);
      const snapshot = await requireCurrentSnapshot(replayed, context);
      return {
        contract: replayed.contract,
        event_count: replayed.events.length,
        head: replayed.events.at(-1).event_hash,
        state: snapshot,
      };
    },

    async confirmBudget({ runId, expectedVersion, inputFile } = {}) {
      const paths = runPaths(runId);
      return withOwnerLock(safeRoot, paths.lock, async ({ assertOwnership }) => {
        const context = createReplayContext();
        const replayed = await replayRun(runId, context);
        await requireCurrentSnapshot(replayed, context);
        try {
          assertExpectedVersion(replayed.state.version, expectedVersion, "run version");
        } catch (error) {
          throw approvalRequired(error);
        }
        const confirmationSchema = await loadSchema(
          "budget-confirmation-v2.schema.json",
          context,
        );
        const eventSchema = await loadSchema("loop-run-event-v2.schema.json", context);
        const stateSchema = await loadSchema("loop-run-state-v2.schema.json", context);
        const confirmationText = await readBoundedFile(safeRoot, inputFile, {
          encoding: "utf8",
          label: "budget confirmation input",
          maxBytes: MAX_CONFIRMATION_BYTES,
        });
        let confirmation;
        try {
          confirmation = parseJsonDocument(
            confirmationText,
            confirmationSchema,
            "budget confirmation input",
          );
          assertPrivacySafeRuntimeValue(
            confirmation,
            "budget confirmation input",
          );
        } catch (error) {
          throw approvalRequired(error);
        }
        const recordedAt = now();
        let proposalEvidence;
        try {
          proposalEvidence = await readProposal(
            paths,
            confirmation.proposal_digest,
            context,
          );
        } catch (error) {
          throw approvalRequired(error);
        }
        const confirmationDigest = digestBytes(confirmationText);
        const { effectiveExpiry, recomputedEffective } = await assertConfirmationBindings({
          confirmation,
          confirmationDigest,
          context,
          contract: replayed.contract,
          proposal: proposalEvidence.proposal,
          state: replayed.state,
          observedAt: recordedAt,
          billingCurrency: replayed.loadedConfig.config.billing_currency,
          pricingRevision:
            replayed.loadedConfig.config.telemetry.pricing_revision ?? null,
          pricingDigest:
            replayed.loadedConfig.config.telemetry.pricing_digest ?? null,
        });
        const evidencePath = confirmationPath(paths, confirmationDigest);
        const transition = reduceRunState(replayed.state, {
          type: "BUDGET_CONFIRMED",
          confirmation_digest: confirmationDigest,
          phase: confirmation.phase,
          expected_run_version: confirmation.expected_run_version,
          expires_at: effectiveExpiry,
          effective_budget: recomputedEffective,
        });
        if (!transition.accepted) {
          throw new Error(`Budget confirmation denied: ${transition.reason}`);
        }
        const event = createEvent({
          eventId: randomId(),
          runId,
          state: replayed.state,
          type: "BUDGET_CONFIRMED",
          recordedAt,
          data: { confirmation_digest: confirmationDigest },
        });
        assertUniqueEventId(replayed.events, event);
        assertValidValue(event, eventSchema, "BUDGET_CONFIRMED event");
        const state = withEventHead(transition.state, event);
        assertValidValue(state, stateSchema, "confirmed run state");
        assertPrivacySafeRuntimeValue(event, "BUDGET_CONFIRMED event");
        assertPrivacySafeRuntimeValue(state, "confirmed run state");

        const existing = await lstat(
          await resolveRepositoryPath(safeRoot, evidencePath, {
            label: "budget confirmation evidence",
          }),
        ).catch(() => null);
        if (existing !== null) {
          const stored = await readBoundedFile(safeRoot, evidencePath, {
            encoding: "utf8",
            label: "budget confirmation evidence",
            maxBytes: MAX_CONFIRMATION_BYTES,
          });
          if (stored !== confirmationText) {
            throw new Error("Immutable budget confirmation evidence already differs.");
          }
        } else {
          await writeFileAtomic(safeRoot, evidencePath, confirmationText, {
            assertOwnership,
            label: "budget confirmation evidence",
            maxBytes: MAX_CONFIRMATION_BYTES,
            mode: 0o600,
          });
        }
        await assertOwnership();
        await appendFileDurable(
          safeRoot,
          paths.events,
          `${JSON.stringify(event)}\n`,
          { maxBytes: MAX_EVENT_LOG_BYTES },
        );
        await dependencies.afterEventAppend?.({ event, state: structuredClone(state) });
        await projectTelemetryEventFailClosed({
          event,
          state,
          contract: replayed.contract,
          loadedConfig: replayed.loadedConfig,
        });
        await writeFileAtomic(safeRoot, paths.state, `${JSON.stringify(state, null, 2)}\n`, {
          assertOwnership,
          label: "run state",
          maxBytes: MAX_STATE_BYTES,
          mode: 0o600,
        });
        return { confirmation_digest: confirmationDigest, state };
      });
    },

    async proposeBudget({ runId, phase, queueItemId, recommendationFile } = {}) {
      const paths = runPaths(runId);
      return withOwnerLock(safeRoot, paths.lock, async ({ assertOwnership }) => {
        const context = createReplayContext();
        const replayed = await replayRun(runId, context);
        const state = await requireCurrentSnapshot(replayed, context);
        const expectedStatus =
          phase === "START" ? "READY" : phase === "RESUME" ? "PAUSED" : null;
        if (expectedStatus === null || state.status !== expectedStatus) {
          throw new Error("Budget proposal phase does not match the current run status.");
        }
        if (!new Set(["OBSERVE", "ENFORCE"]).has(state.mode)) {
          throw new Error("Budget proposal is unavailable outside OBSERVE or ENFORCE mode.");
        }
        if (
          replayed.contract.autonomy_profile === "INTERACTIVE" &&
          queueItemId !== undefined &&
          queueItemId !== null
        ) {
          throw new Error("Interactive budget proposal cannot bind a queue item.");
        }
        if (
          replayed.contract.autonomy_profile === "BACKGROUND" &&
          !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(queueItemId ?? "")
        ) {
          throw new Error("Background budget proposal requires one exact queue item ID.");
        }
        const generatedAt = now();
        const recommendation = await readBudgetRecommendation({
          inputFile: recommendationFile,
          contract: replayed.contract,
          phase,
          state,
          billingCurrency: replayed.loadedConfig.config.billing_currency,
        });
        assertRecommendationAuthorityForMode(state.mode, recommendation.source);
        const recommendedLimits = recommendation.limits;
        const recommended = normalizeConfirmedLimits(
          recommendedLimits,
          replayed.loadedConfig.config.billing_currency,
        );
        const effectivePreview = computeEffectiveBudget(
          state.effective_budget,
          recommended,
        );
        const consumed = {
          iterations: state.counters.iterations,
          active_runtime_ms: state.counters.active_runtime_ms,
          no_progress_iterations: state.counters.no_progress_iterations,
          tokens: state.counters.tokens,
          cost_micro: state.counters.cost_micro,
        };
        const lineage = await calculateLineageTotals(
          replayed.contract,
          state,
          context,
        );
        const proposalExpiry = earliestUtc(
          addMinutesFailClosed(
            generatedAt,
            replayed.contract.policy.approval_ttl_minutes,
          ),
          replayed.contract.policy.expires_at,
        );
        const nullWarnings = deriveNullWarnings(
          recommendedLimits,
          effectivePreview,
        );
        const proposal = {
          schema: "budget_proposal_v2",
          contract_version: "2.0.0",
          proposal_id: randomId(),
          run_id: runId,
          phase,
          queue_item_id: queueItemId ?? null,
          expected_run_version: state.version,
          execution_mode: state.mode,
          goal_ref: replayed.contract.goal.ref,
          goal_digest: replayed.contract.goal.digest,
          authority_digest: authorityDigest(replayed.contract),
          project_config_digest: replayed.contract.project_config_digest,
          verifier_ref: replayed.contract.verifier.ref,
          verifier_digest: replayed.contract.verifier.digest,
          regression_verifier_digest:
            replayed.contract.verifier.regression_verifier_digest,
          eval_definition_digest: replayed.contract.verifier.eval_definition_digest,
          policy_digest: policyDigest(replayed.contract),
          autonomy_profile: replayed.contract.autonomy_profile,
          risk_profile: replayed.contract.risk_profile,
          billing_currency: replayed.loadedConfig.config.billing_currency,
          pricing_revision:
            replayed.loadedConfig.config.telemetry.pricing_revision ?? null,
          pricing_digest:
            replayed.loadedConfig.config.telemetry.pricing_digest ?? null,
          display_context: {
            authority: "ADVISORY_DISPLAY_ONLY",
            source: "CONTRACT_DERIVED",
            source_digest: digestJson({
              run_id: replayed.contract.run_id,
              goal: replayed.contract.goal,
            }),
            goal_summary: replayed.contract.goal.summary,
            acceptance_criteria: [...replayed.contract.goal.acceptance_criteria],
          },
          recommendation_source: recommendation.source,
          recommended,
          recommended_limits: recommendedLimits,
          policy_ceiling: { ...state.effective_budget },
          effective_preview: effectivePreview,
          consumed,
          remaining: remainingBudget(effectivePreview, state.counters),
          lineage: {
            parent_run_id: replayed.contract.lineage.parent_run_id,
            root_run_id: replayed.contract.lineage.root_run_id,
            run_count: lineage.runCount,
          },
          lineage_totals: lineage.totals,
          recommendation_reason: recommendation.reason,
          null_warnings: nullWarnings,
          approval_ttl_minutes: replayed.contract.policy.approval_ttl_minutes,
          approval_expires_at: proposalExpiry,
          generated_at: generatedAt,
        };
        const proposalSchema = await loadSchema("budget-proposal-v2.schema.json", context);
        assertValidValue(proposal, proposalSchema, "budget proposal");
        assertPrivacySafeRuntimeValue(proposal, "budget proposal");
        const proposalText = JSON.stringify(proposal);
        const proposalDigest = digestBytes(proposalText);
        const evidencePath = proposalPath(paths, proposalDigest);
        const existing = await lstat(
          await resolveRepositoryPath(safeRoot, evidencePath, {
            label: "budget proposal evidence",
          }),
        ).catch(() => null);
        if (existing !== null) {
          const stored = await readBoundedFile(safeRoot, evidencePath, {
            encoding: "utf8",
            label: "budget proposal evidence",
            maxBytes: MAX_PROPOSAL_BYTES,
          });
          if (stored !== proposalText) {
            throw new Error("Immutable budget proposal evidence already differs.");
          }
        } else {
          await writeFileAtomic(safeRoot, evidencePath, proposalText, {
            assertOwnership,
            label: "budget proposal evidence",
            maxBytes: MAX_PROPOSAL_BYTES,
            mode: 0o600,
          });
        }
        return {
          proposal,
          proposal_digest: proposalDigest,
          wizard: renderBudgetStopWizard(proposal, proposalDigest),
        };
      });
    },

    async apply({ runId, expectedVersion, command, inputFile } = {}) {
      const paths = runPaths(runId);
      return withOwnerLock(safeRoot, paths.lock, async ({ assertOwnership }) => {
        const context = createReplayContext({
          retainStateHistoryFor: command === "VERIFICATION_PASSED" ? runId : null,
        });
        const replayed = await replayRun(runId, context);
        await requireCurrentSnapshot(replayed, context);
        if (new Set(["START", "BEGIN_ACTION", "RESUME"]).has(command)) {
          await assertProjectSafetyAllows(
            replayed.loadedConfig.effective_mode,
            command,
          );
        }
        const releaseRetry =
          command === "VERIFICATION_PASSED" && replayed.state.status === "SUCCESS";
        if (!releaseRetry) {
          assertExpectedVersion(replayed.state.version, expectedVersion, "run version");
        }
        const input = await readApplyInput(command, inputFile);
        assertFreshness(input.freshness, replayed.contract);
        await assertFreshAuthorityBytes(safeRoot, replayed.contract, context, {
          staleRequiresApproval: true,
        });
        if (releaseRetry) {
          let passIndex = -1;
          for (let index = replayed.events.length - 1; index >= 0; index -= 1) {
            if (replayed.events[index].type === "VERIFICATION_PASSED") {
              passIndex = index;
              break;
            }
          }
          if (
            passIndex <= 0 ||
            replayed.events
              .slice(passIndex + 1)
              .some((event) => event.type !== "SNAPSHOT_REPAIRED")
          ) {
            throw new Error("VERIFICATION_PASSED idempotency history is invalid");
          }
          const stateBeforePass = replayed.states[passIndex - 1];
          if (
            expectedVersion !== stateBeforePass.version &&
            expectedVersion !== replayed.state.version
          ) {
            throw new Error("VERIFICATION_PASSED idempotency version conflict");
          }
          const { releaseEvidence, operationalMetric } = await deriveReleaseEvidence({
            replayed,
            state: stateBeforePass,
            input,
            context,
            recordedAt: replayed.events[passIndex].recorded_at,
            verifyHostAttestation: false,
          });
          const {
            verification_status: ignored,
            operational_metric: storedOperationalMetric,
            learning_completion: ignoredLearningCompletion,
            ...storedEvidence
          } = replayed.events[passIndex].data;
          if (
            JSON.stringify(releaseEvidence) !== JSON.stringify(storedEvidence) ||
            JSON.stringify(operationalMetric) !==
              JSON.stringify(storedOperationalMetric)
          ) {
            throw new Error("VERIFICATION_PASSED idempotency conflict: release evidence differs");
          }
          return { state: replayed.state, idempotent: true };
        }
        const recordedAt = now();
        const adaptiveLearning = requiresAdaptiveLearning(replayed.contract);
        const learningAuthorityCommand = new Set([
          "RECORD_LEARNING_OUTCOME",
          "PROMOTE_VERIFIED_PATTERN",
        ]).has(command);
        if (learningAuthorityCommand && !adaptiveLearning) {
          throw new Error("LEARNING_PROFILE_NOT_ENABLED");
        }
        const learningFieldPresent =
          input.learning_intent !== undefined ||
          input.learning_evidence !== undefined;
        if (!adaptiveLearning && learningFieldPresent) {
          throw new Error("LEARNING_PROFILE_NOT_ENABLED");
        }
        const learningSyncAllowed = !new Set([
          "CANCEL",
          "STOP",
          "RECONCILE",
        ]).has(command);
        const learningContext =
          adaptiveLearning && learningSyncAllowed
            ? await loadAdaptiveLearning(replayed)
            : null;
        let normalizedLearningIntent = null;
        let learningCompletion = null;
        let normalizedOutcome = null;
        let normalizedPattern = null;
        let promotionEvidence = null;
        if (command === "BEGIN_ACTION" && adaptiveLearning) {
          if (input.learning_intent === undefined) {
            throw new Error("LEARNING_INTENT_REQUIRED");
          }
          normalizedLearningIntent = normalizeLearningIntent(
            input.learning_intent,
            {
              run_id: replayed.contract.run_id,
              goal_ref: replayed.contract.goal.ref,
              iteration: replayed.state.counters.iterations + 1,
              pre_action_run_head_digest: replayed.state.last_event_hash,
              recorded_at: recordedAt,
            },
          );
          assertNovelApproach(learningContext.records, normalizedLearningIntent);
        }
        if (
          new Set(["VERIFICATION_PASSED", "VERIFICATION_FAILED"]).has(command) &&
          adaptiveLearning
        ) {
          if (
            !hasExactFields(
              input.learning_evidence,
              LEARNING_COMPLETION_EVIDENCE_FIELDS,
            )
          ) {
            throw new Error("LEARNING_COMPLETION_EVIDENCE_REQUIRED");
          }
          const intent = currentLearningIntent(
            learningContext.records,
            replayed.state.counters.iterations,
          );
          const failureFingerprint =
            command === "VERIFICATION_FAILED"
              ? input.fingerprint
              : intent.failure_fingerprint;
          const comparablePrior =
            [...learningContext.records]
              .reverse()
              .find(
                (record) =>
                  record.intent_digest !== intent.intent_digest &&
                  record.status === "COMPLETED" &&
                  record.failure_fingerprint === failureFingerprint,
              ) ?? null;
          const attestationRequest = cloneFrozen({
            run_id: replayed.contract.run_id,
            run_head_digest: replayed.state.last_event_hash,
            intent_digest: intent.intent_digest,
            verifier_status:
              command === "VERIFICATION_PASSED"
                ? "PASS"
                : input.verification_status,
            failure_fingerprint: failureFingerprint,
            actual_delta: input.learning_evidence.actual_delta,
            attestation_digest: input.learning_evidence.attestation_digest,
            attribution_status: input.learning_evidence.attribution_status,
          });
          if (
            typeof dependencies.verifyLearningCompletionAttestation !==
              "function" ||
            (await dependencies.verifyLearningCompletionAttestation(
              attestationRequest,
            )) !== true
          ) {
            throw new Error("LEARNING_COMPLETION_ATTESTATION_REQUIRED");
          }
          learningCompletion = deriveLearningCompletion(intent, {
            verifier_status: attestationRequest.verifier_status,
            final_run_head_digest: replayed.state.last_event_hash,
            failure_fingerprint: failureFingerprint,
            actual_delta: input.learning_evidence.actual_delta,
            attestation_digest: input.learning_evidence.attestation_digest,
            attribution_status: input.learning_evidence.attribution_status,
            comparable_prior: comparablePrior,
            safety_or_policy_failure: false,
            recorded_at: recordedAt,
          });
        }
        if (command === "RECORD_LEARNING_OUTCOME") {
          normalizedOutcome = normalizeGeniusLoopOutcome(input.outcome);
          if (
            normalizedOutcome.run_id !== replayed.contract.run_id ||
            utcSortKey(normalizedOutcome.recorded_at) > utcSortKey(recordedAt)
          ) {
            throw new Error("OUTCOME_RUN_BINDING_INVALID");
          }
          const existingByDedupe = learningContext.outcomes.find(
            (outcome) => outcome.dedupe_key === normalizedOutcome.dedupe_key,
          );
          const existingById = learningContext.outcomes.find(
            (outcome) => outcome.outcome_id === normalizedOutcome.outcome_id,
          );
          const existing = existingByDedupe ?? existingById;
          if (
            existing !== undefined &&
            JSON.stringify(existing) !== JSON.stringify(normalizedOutcome)
          ) {
            throw new Error(
              existingByDedupe !== undefined
                ? "OUTCOME_DEDUPE_CONFLICT"
                : "OUTCOME_ID_CONFLICT",
            );
          }
          if (existing !== undefined) {
            await synchronizeOutcomeProjectionAtCurrentHead({
              store: learningContext.store,
              outcomeProjection: learningContext.outcomeProjection,
              events: replayed.events,
              contract: replayed.contract,
              currentHead: replayed.state.last_event_hash,
            });
            return { state: replayed.state, idempotent: true };
          }
          context.listByteIoBudget ??= {
            consumed: 0,
            maximum: maxListBytes,
          };
          const priorOutcomes = await collectAdaptiveOutcomes(context);
          if (
            priorOutcomes.some(
              (outcome) =>
                outcome.dedupe_key === normalizedOutcome.dedupe_key ||
                outcome.outcome_id === normalizedOutcome.outcome_id,
            )
          ) {
            throw new Error(
              priorOutcomes.some(
                (outcome) =>
                  outcome.dedupe_key === normalizedOutcome.dedupe_key,
              )
                ? "OUTCOME_DEDUPE_CONFLICT"
                : "OUTCOME_ID_CONFLICT",
            );
          }
          if (
            normalizedOutcome.run_head_digest !== replayed.state.last_event_hash
          ) {
            throw new Error("OUTCOME_RUN_BINDING_INVALID");
          }
        }
        if (command === "PROMOTE_VERIFIED_PATTERN") {
          const existingPromotion = replayed.events.find(
            (event) =>
              event.type === "VERIFIED_PATTERN_PROMOTED" &&
              (event.data.pattern.pattern_id === input.pattern?.pattern_id ||
                event.data.pattern.dedupe_key === input.pattern?.dedupe_key),
          );
          if (existingPromotion !== undefined) {
            const retryPattern = promoteVerifiedPattern(input.pattern, {
              now: existingPromotion.recorded_at,
            });
            if (
              JSON.stringify(existingPromotion.data.pattern) !==
                JSON.stringify(retryPattern) ||
              JSON.stringify(existingPromotion.data.promotion_evidence) !==
                JSON.stringify(input.promotion_evidence)
            ) {
              throw new Error("PATTERN_DEDUPE_CONFLICT");
            }
            await learningContext.store.publishVerifiedPattern({
              pattern: existingPromotion.data.pattern,
              promotionEventDigest: existingPromotion.event_hash,
            });
            return { state: replayed.state, idempotent: true };
          }
          promotionEvidence = assertPromotionEvidence(input.promotion_evidence);
          normalizedPattern = promoteVerifiedPattern(input.pattern, {
            now: recordedAt,
          });
          const outcome = learningContext.outcomes.find(
            (candidate) =>
              candidate.outcome_id === normalizedPattern.source_outcome_id,
          );
          const completedLearning = [...learningContext.records]
            .reverse()
            .find(
              (record) =>
                record.status === "COMPLETED" &&
                record.approach_id === normalizedPattern.approach_id,
            );
          const latestPassEvent = [...replayed.events]
            .reverse()
            .find((event) => event.type === "VERIFICATION_PASSED");
          if (
            normalizedPattern.source_run_id !== replayed.contract.run_id ||
            normalizedPattern.source_run_head_digest !==
              replayed.state.last_event_hash ||
            normalizedPattern.authority_digest !==
              authorityDigest(replayed.contract) ||
            normalizedPattern.verifier_digest !==
              replayed.contract.verifier.digest ||
            utcSortKey(normalizedPattern.verified_at) > utcSortKey(recordedAt) ||
            outcome === undefined ||
            outcome.dedupe_key !== normalizedPattern.dedupe_key ||
            outcome.experiment_result !== "PASS" ||
            outcome.decision !== "ACCEPTED" ||
            outcome.compounding_candidate_status !== "CANDIDATE" ||
            outcome.evidence_digest !== normalizedPattern.evidence_digest ||
            completedLearning === undefined ||
            completedLearning.verifier_status !== "PASS" ||
            completedLearning.progress_verdict !== "PROGRESS" ||
            completedLearning.hypothesis_digest !==
              normalizedPattern.hypothesis_digest ||
            latestPassEvent === undefined ||
            replayed.state.status !== "SUCCESS" ||
            replayed.state.verification.status !== "PASS" ||
            replayed.state.verification.fresh !== true ||
            replayed.state.verification.gates_satisfied !== true
          ) {
            throw new Error("PATTERN_PROMOTION_DENIED");
          }
          const attestationContext = cloneFrozen({
            run_id: replayed.contract.run_id,
            goal_ref: replayed.contract.goal.ref,
            current_run_head_digest: replayed.state.last_event_hash,
            verification_event_digest: latestPassEvent.event_hash,
            pattern: normalizedPattern,
            promotion_evidence: promotionEvidence,
          });
          if (
            typeof dependencies.verifyPatternPromotionAttestation !==
              "function" ||
            (await dependencies.verifyPatternPromotionAttestation(
              attestationContext,
            )) !== true
          ) {
            throw new Error("PATTERN_PROMOTION_ATTESTATION_REQUIRED");
          }
        }
        const durationPhaseByCommand = {
          OBSERVE_ACTION: "ACTION",
          RECORD_OBSERVATION_DURATION: "OBSERVATION",
          RECORD_VERIFICATION_DURATION: "VERIFICATION",
          RECORD_BACKOFF_DURATION: "BACKOFF",
          RESUME: "RESUME",
        };
        let attestedDuration = null;
        if (Object.hasOwn(durationPhaseByCommand, command)) {
          attestedDuration = await attestActiveRuntimeDuration(
            {
              mode: replayed.state.mode,
              run_id: replayed.contract.run_id,
              run_head_digest: replayed.state.last_event_hash,
              phase: durationPhaseByCommand[command],
              duration_ms: input.duration_ms,
            },
            dependencies.verifyActiveRuntimeAttestation ??
              dependencies.verifyActiveRuntimeMetering,
          );
        }
        let normalizedUsage = null;
        if (command === "RECORD_USAGE") {
          const existing = replayed.events.find(
            (event) =>
              event.type === "USAGE_RECORDED" &&
              event.data.receipt.receipt_id === input.receipt.receipt_id,
          );
          normalizedUsage = await normalizeUsageForState({
            receipt: input.receipt,
            state: replayed.state,
            contract: replayed.contract,
            loadedConfig: replayed.loadedConfig,
            context,
            boundHead:
              existing?.data.receipt.bound_run_head_digest ??
              replayed.state.last_event_hash,
            iteration:
              existing?.data.receipt.iteration ??
              replayed.state.counters.iterations,
          });
          const normalizedDigest = usageReceiptDigest(normalizedUsage);
          if (existing !== undefined) {
            if (
              existing.data.receipt_digest === normalizedDigest &&
              JSON.stringify(existing.data.receipt) === JSON.stringify(normalizedUsage)
            ) {
              return { state: replayed.state, idempotent: true };
            }
            throw new Error("Usage receipt idempotency conflict: receipt ID was reused.");
          }
          if (utcSortKey(normalizedUsage.recorded_at) > utcSortKey(recordedAt)) {
            throw new Error("Usage receipt timestamp is in the future.");
          }
          const finiteUsageCap =
            replayed.state.effective_budget.max_tokens !== null ||
            replayed.state.effective_budget.max_cost_micro !== null;
          const verifyUsageReceipt =
            dependencies.verifyUsageReceiptAttestation ??
            dependencies.verifyUsageMetering;
          if (
            finiteUsageCap &&
            (typeof verifyUsageReceipt !== "function" ||
              (await verifyUsageReceipt({
                run_id: replayed.contract.run_id,
                effective_budget: structuredClone(replayed.state.effective_budget),
                receipt: structuredClone(normalizedUsage),
              })) !== true)
          ) {
            throw new Error(
              "Finite token/cost cap requires verified usage receipt attestation.",
            );
          }
          if (finiteUsageCap && normalizedUsage.coverage.status === "COMPLETE") {
            const iterationReceipts = replayed.events
              .filter(
                (event) =>
                  event.type === "USAGE_RECORDED" &&
                  event.data.receipt.iteration === normalizedUsage.iteration,
              )
              .map((event) => event.data.receipt);
            const receipts = [...iterationReceipts, normalizedUsage];
            const usageUnits = receipts.map(
              (receipt) =>
                `${receipt.workflow_route}\u0000${receipt.attempt}\u0000${receipt.contributor.kind}\u0000${receipt.contributor.ref}`,
            );
            const receiptSetDigest = digestJson(
              receipts.map((receipt) => usageReceiptDigest(receipt)).sort(),
            );
            const usageUnitSetDigest = digestJson([...usageUnits].sort());
            if (
              normalizedUsage.coverage.receipt_count !== receipts.length ||
              new Set(usageUnits).size !== usageUnits.length ||
              typeof dependencies.verifyUsageCompletionAttestation !== "function" ||
              (await dependencies.verifyUsageCompletionAttestation(
                cloneFrozen({
                  run_id: replayed.contract.run_id,
                  run_head_digest: replayed.state.last_event_hash,
                  iteration: normalizedUsage.iteration,
                  receipts,
                  receipt_set_digest: receiptSetDigest,
                  usage_unit_set_digest: usageUnitSetDigest,
                  completion: normalizedUsage.coverage,
                }),
              )) !== true
            ) {
              throw new Error(
                "Finite usage cap requires verified complete usage attribution.",
              );
            }
          }
        }
        let normalizedOperationalMetric = null;
        if (command === "RECORD_OPERATIONAL_METRIC") {
          const existing = replayed.events.find(
            (event) =>
              event.type === "OPERATIONAL_METRIC_RECORDED" &&
              event.data.metric.metric_id === input.metric?.metric_id,
          );
          normalizedOperationalMetric = normalizeOperationalMetric(input.metric, {
            run_id: replayed.contract.run_id,
            run_head_digest:
              existing?.data.metric.bound_run_head_digest ??
              replayed.state.last_event_hash,
            allowed_kinds: ["ROUTE_INVOCATION", "REVIEW_COORDINATION"],
          });
          const normalizedDigest = operationalMetricDigest(normalizedOperationalMetric);
          if (existing !== undefined) {
            if (
              existing.data.metric_digest === normalizedDigest &&
              JSON.stringify(existing.data.metric) ===
                JSON.stringify(normalizedOperationalMetric)
            ) {
              return { state: replayed.state, idempotent: true };
            }
            throw new Error(
              "Operational metric idempotency conflict: metric ID was reused.",
            );
          }
          if (
            utcSortKey(normalizedOperationalMetric.recorded_at) >
            utcSortKey(recordedAt)
          ) {
            throw new Error("Operational metric timestamp is in the future.");
          }
          if (
            typeof dependencies.verifyOperationalMetricAttestation !== "function" ||
            (await dependencies.verifyOperationalMetricAttestation(
              cloneFrozen({
                run_id: replayed.contract.run_id,
                mode: replayed.state.mode,
                risk_profile: replayed.contract.risk_profile,
                metric: normalizedOperationalMetric,
              }),
            )) !== true
          ) {
            throw new Error(
              "Operational metric requires a verified host attestation.",
            );
          }
        }
        let modelCommand;
        let eventType;
        let data;
        switch (command) {
          case "START":
            modelCommand = {
              type: "START",
              confirmation_digest: input.confirmation_digest,
              at: recordedAt,
            };
            eventType = "STARTED";
            data = { confirmation_digest: input.confirmation_digest };
            break;
          case "BEGIN_ACTION":
            modelCommand = {
              type: "BEGIN_ACTION",
              confirmation_digest: input.confirmation_digest,
              at: recordedAt,
              action_id: input.action_id,
              idempotency_key: input.idempotency_key,
            };
            eventType = "ACTION_INTENDED";
            data = {
              action_id: input.action_id,
              idempotency_key: input.idempotency_key,
              ...(normalizedLearningIntent === null
                ? {}
                : { learning_intent: normalizedLearningIntent }),
            };
            break;
          case "OBSERVE_ACTION":
            await attestExternalActionObservation(
              replayed.state,
              input,
              replayed.contract,
            );
            modelCommand = { type: "OBSERVE_ACTION", duration_ms: attestedDuration };
            eventType = "ACTION_OBSERVED";
            data = {
              action_id: input.action_id,
              idempotency_key: input.idempotency_key,
              external_action_record_digest: input.external_action_record_digest,
              external_outcome: input.external_outcome,
              target_audit_digest: input.target_audit_digest,
              duration_ms: attestedDuration,
            };
            break;
          case "RECORD_USAGE":
            modelCommand = { type: "RECORD_USAGE", receipt: normalizedUsage };
            eventType = "USAGE_RECORDED";
            data = {
              receipt_digest: usageReceiptDigest(normalizedUsage),
              receipt: normalizedUsage,
            };
            break;
          case "RECORD_OPERATIONAL_METRIC":
            modelCommand = { type: "RECORD_OPERATIONAL_METRIC" };
            eventType = "OPERATIONAL_METRIC_RECORDED";
            data = {
              metric_digest: operationalMetricDigest(normalizedOperationalMetric),
              metric: normalizedOperationalMetric,
            };
            break;
          case "RECORD_LEARNING_OUTCOME":
            modelCommand = { type: "RECORD_LEARNING_OUTCOME" };
            eventType = "LEARNING_OUTCOME_RECORDED";
            data = {
              outcome_digest: digestJson(normalizedOutcome),
              outcome: normalizedOutcome,
            };
            break;
          case "PROMOTE_VERIFIED_PATTERN":
            modelCommand = { type: "PROMOTE_VERIFIED_PATTERN" };
            eventType = "VERIFIED_PATTERN_PROMOTED";
            data = {
              pattern_digest: digestJson(normalizedPattern),
              pattern: normalizedPattern,
              promotion_evidence: promotionEvidence,
            };
            break;
          case "RECORD_OBSERVATION_DURATION":
          case "RECORD_VERIFICATION_DURATION":
          case "RECORD_BACKOFF_DURATION": {
            const phaseByCommand = {
              RECORD_OBSERVATION_DURATION: "OBSERVATION",
              RECORD_VERIFICATION_DURATION: "VERIFICATION",
              RECORD_BACKOFF_DURATION: "BACKOFF",
            };
            modelCommand = { type: command, duration_ms: attestedDuration };
            eventType = "ACTIVE_DURATION_RECORDED";
            data = { phase: phaseByCommand[command], duration_ms: attestedDuration };
            break;
          }
          case "BEGIN_VERIFICATION":
            modelCommand = { type: "BEGIN_VERIFICATION" };
            eventType = "VERIFICATION_STARTED";
            data = { verifier_digest: replayed.contract.verifier.digest };
            break;
          case "VERIFICATION_PASSED": {
            const { releaseEvidence, operationalMetric } = await deriveReleaseEvidence({
              replayed,
              state: replayed.state,
              input,
              context,
              recordedAt,
            });
            modelCommand = {
              type: "VERIFICATION_PASSED",
              release_evidence: releaseEvidence,
            };
            eventType = "VERIFICATION_PASSED";
            data = {
              verification_status: "PASS",
              ...releaseEvidence,
              operational_metric: operationalMetric,
              ...(learningCompletion === null
                ? {}
                : { learning_completion: learningCompletion }),
            };
            break;
          }
          case "VERIFICATION_FAILED":
            modelCommand = {
              type: "VERIFICATION_FAILED",
              verification_status: input.verification_status,
              fingerprint: input.fingerprint,
              requirement_delta: input.requirement_delta,
              coverage_delta: input.coverage_delta,
              meaningful_diff_count: input.meaningful_diff_count,
              approach_id: input.approach_id,
            };
            eventType = "VERIFICATION_FAILED";
            data = {
              verification_status: input.verification_status,
              fingerprint: input.fingerprint,
              requirement_delta: input.requirement_delta,
              coverage_delta: input.coverage_delta,
              meaningful_diff_count: input.meaningful_diff_count,
              approach_id: input.approach_id,
              ...(learningCompletion === null
                ? {}
                : { learning_completion: learningCompletion }),
            };
            break;
          case "PAUSE":
            modelCommand = { type: "PAUSE" };
            eventType = "PAUSED";
            data = { paused_from: replayed.state.status };
            break;
          case "RESUME":
            modelCommand = {
              type: "RESUME",
              confirmation_digest: input.confirmation_digest,
              at: recordedAt,
            };
            eventType = "RESUMED";
            data = {
              resumed_to: replayed.state.paused_from,
              confirmation_digest: input.confirmation_digest,
              duration_ms: attestedDuration,
            };
            break;
          case "STOP":
            modelCommand = {
              type: "STOP",
              terminal_status: input.terminal_status,
              reason: input.reason,
            };
            eventType = "STOPPED";
            data = {
              terminal_status: input.terminal_status,
              reason: input.reason,
            };
            break;
          case "CANCEL": {
            const afterIntent = replayed.state.active_action !== null;
            modelCommand = { type: "CANCEL" };
            eventType = "STOPPED";
            data = {
              terminal_status: afterIntent ? "UNKNOWN_OUTCOME" : "CANCELLED",
              reason: afterIntent
                ? "CANCEL_AFTER_ACTION_INTENT"
                : "CANCELLED_BEFORE_ACTION_INTENT",
            };
            break;
          }
          case "RECONCILE":
            modelCommand = {
              type: "RECONCILE",
              outcome: input.outcome,
              evidence_digest: input.evidence_digest,
            };
            eventType = "RECONCILED";
            data = {
              reconciliation_outcome: input.outcome,
              evidence_digest: input.evidence_digest,
            };
            break;
          default:
            throw new Error(`Unsupported apply command: ${command}`);
        }
        let transition = reduceRunState(replayed.state, modelCommand);
        if (!transition.accepted) {
          if (
            new Set(["APPROVAL_REQUIRED", "APPROVAL_MISMATCH", "APPROVAL_EXPIRED"]).has(
              transition.reason,
            )
          ) {
            throw approvalRequired(transition.reason);
          }
          throw new Error(`${command} denied: ${transition.reason}`);
        }
        if (command === "RESUME") {
          transition = reduceRunState(transition.state, {
            type: "RECORD_RESUME_DURATION",
            duration_ms: attestedDuration,
          });
          if (!transition.accepted) {
            throw new Error(`RESUME duration denied: ${transition.reason}`);
          }
          transition = reduceRunState(transition.state, { type: "RESUME_COMPLETED" });
          if (!transition.accepted) {
            throw new Error(`RESUME completion denied: ${transition.reason}`);
          }
        }
        const eventSchema = await loadSchema("loop-run-event-v2.schema.json", context);
        const stateSchema = await loadSchema("loop-run-state-v2.schema.json", context);
        const event = createEvent({
          eventId: randomId(),
          runId,
          state: replayed.state,
          type: eventType,
          recordedAt,
          data,
        });
        assertUniqueEventId(replayed.events, event);
        assertValidValue(event, eventSchema, `${eventType} event`);
        const state = withEventHead(transition.state, event);
        assertValidValue(state, stateSchema, `${command} run state`);
        assertPrivacySafeRuntimeValue(event, `${eventType} event`);
        assertPrivacySafeRuntimeValue(state, `${command} run state`);
        await assertOwnership();
        await appendFileDurable(safeRoot, paths.events, `${JSON.stringify(event)}\n`, {
          maxBytes: MAX_EVENT_LOG_BYTES,
        });
        await dependencies.afterEventAppend?.({ event, state: structuredClone(state) });
        await projectTelemetryEventFailClosed({
          event,
          state,
          contract: replayed.contract,
          loadedConfig: replayed.loadedConfig,
        });
        await writeFileAtomic(safeRoot, paths.state, `${JSON.stringify(state, null, 2)}\n`, {
          assertOwnership,
          label: "run state",
          maxBytes: MAX_STATE_BYTES,
          mode: 0o600,
        });
        if (learningContext !== null) {
          await synchronizeAdaptiveLearning({
            ...learningContext,
            contract: replayed.contract,
            events: replayed.events,
            event,
          });
        }
        if (command === "PROMOTE_VERIFIED_PATTERN") {
          await learningContext.store.publishVerifiedPattern({
            pattern: normalizedPattern,
            promotionEventDigest: event.event_hash,
          });
        }
        return { state };
      });
    },

    async validateGate({
      runId,
      operation,
      queueItemId,
      reconciliationOnly = false,
      actionId,
      idempotencyKey,
    } = {}) {
      const context = createReplayContext();
      const replayed = await replayRun(runId, context);
      const state = await requireCurrentSnapshot(replayed, context);
      if (typeof reconciliationOnly !== "boolean") {
        throw new Error("Reconciliation gate flag must be boolean.");
      }
      if (reconciliationOnly) {
        if (
          typeof operation !== "string" ||
          !replayed.contract.policy.allowlisted_operations.includes(operation)
        ) {
          throw new Error("Reconciliation operation is not allowlisted by the run policy.");
        }
        if (
          queueItemId !== undefined ||
          state.approval === null ||
          state.active_action === null ||
          !new Set(["RUNNING", "UNKNOWN_OUTCOME"]).has(state.status) ||
          state.active_action.action_id !== actionId ||
          state.active_action.idempotency_key !== idempotencyKey
        ) {
          throw new Error("Reconciliation action binding mismatch.");
        }
        const intentEvent = [...replayed.events]
          .reverse()
          .find(
            (event) =>
              event.type === "ACTION_INTENDED" &&
              event.data.action_id === actionId &&
              event.data.idempotency_key === idempotencyKey,
          );
        if (intentEvent === undefined) {
          throw new Error("Reconciliation action intent is missing.");
        }
        return {
          allowed: true,
          would_allow: true,
          simulation_only: state.mode === "OBSERVE",
          mutation_authorized: false,
          readback_authorized: true,
          operation,
          queue_item_id: null,
          run_id: runId,
          run_version: state.version,
          confirmation_digest: state.approval.confirmation_digest,
          authority_digest: state.authority_digest,
          policy_digest: state.policy_digest,
          run_head_digest: intentEvent.event_hash,
          current_run_head_digest: state.last_event_hash,
          verifier_digest: replayed.contract.verifier.digest,
          project_config_digest: replayed.contract.project_config_digest,
          operation_inventory_digest:
            replayed.contract.authority.operation_inventory_digest,
          confirmed_risk_profile: replayed.contract.risk_profile,
          confirmed_autonomy_profile: replayed.contract.autonomy_profile,
          confirmed_required_gates: [...replayed.contract.policy.required_gates],
          action_id: state.active_action.action_id,
          idempotency_key: state.active_action.idempotency_key,
          controller_intent_digest: digestJson({
            run_id: runId,
            action_id: state.active_action.action_id,
            idempotency_key: state.active_action.idempotency_key,
            run_head_digest: intentEvent.event_hash,
          }),
        };
      }
      await assertProjectSafetyAllows(
        replayed.loadedConfig.effective_mode,
        `operation ${String(operation)}`,
      );
      if (
        typeof operation !== "string" ||
        !replayed.contract.policy.allowlisted_operations.includes(operation)
      ) {
        throw new Error("Operation is not allowlisted by the effective run policy.");
      }
      if (state.approval === null) {
        throw approvalRequired("operation gate requires a valid human approval");
      }
      if (utcSortKey(now()) >= utcSortKey(state.approval.expires_at)) {
        throw approvalRequired("operation gate approval is expired");
      }
      if (!new Set(["OBSERVE", "ENFORCE"]).has(state.mode)) {
        throw new Error("Run mode does not permit an operation gate.");
      }
      let queueConfirmation = null;
      if (operation === "queue-claim") {
        if (
          replayed.contract.autonomy_profile !== "BACKGROUND" ||
          !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(queueItemId ?? "")
        ) {
          throw approvalRequired(
            "queue claim requires a background run and one exact queue item ID",
          );
        }
        const expectedStatus = state.approval.phase === "START" ? "READY" : "PAUSED";
        if (state.status !== expectedStatus) {
          throw approvalRequired(
            "queue claim lifecycle does not match its START/RESUME approval",
          );
        }
        const evidence = await readConfirmation(
          replayed.paths,
          state.approval.confirmation_digest,
          context,
        );
        if (evidence.confirmation.queue_item_id !== queueItemId) {
          throw approvalRequired("queue item binding mismatch");
        }
        queueConfirmation = evidence.confirmation;
      } else if (queueItemId !== undefined) {
        throw new Error("Queue item ID is only valid for queue-claim.");
      } else if (state.status !== "RUNNING") {
        throw new Error("Operation gate requires a nonterminal RUNNING state.");
      } else if (state.active_action === null) {
        throw new Error(
          `${operation} requires an active ACTION_INTENDED iteration.`,
        );
      }
      const activeIntentEvent =
        operation === "queue-claim"
          ? null
          : [...replayed.events]
              .reverse()
              .find(
                (event) =>
                  event.type === "ACTION_INTENDED" &&
                  event.data.action_id === state.active_action.action_id &&
                  event.data.idempotency_key ===
                    state.active_action.idempotency_key,
              );
      if (operation !== "queue-claim" && activeIntentEvent === undefined) {
        throw new Error("Active action intent event is missing.");
      }
      await assertFreshAuthorityBytes(safeRoot, replayed.contract, context, {
        staleRequiresApproval: true,
      });
      const backgroundBinding =
        operation !== "queue-claim" &&
        replayed.contract.autonomy_profile === "BACKGROUND"
          ? backgroundBudgetBinding(
              state,
              replayed.contract,
              activeIntentEvent,
            )
          : null;
      return {
        allowed: state.mode === "ENFORCE",
        would_allow: true,
        simulation_only: state.mode === "OBSERVE",
        mutation_authorized: state.mode === "ENFORCE",
        operation,
        queue_item_id: operation === "queue-claim" ? queueItemId : null,
        run_id: runId,
        run_version: state.version,
        confirmation_digest: state.approval.confirmation_digest,
        authority_digest: state.authority_digest,
        policy_digest: state.policy_digest,
        run_head_digest:
          operation === "queue-claim"
            ? state.last_event_hash
            : activeIntentEvent.event_hash,
        verifier_digest: replayed.contract.verifier.digest,
        project_config_digest: replayed.contract.project_config_digest,
        operation_inventory_digest:
          replayed.contract.authority.operation_inventory_digest,
        confirmed_risk_profile: replayed.contract.risk_profile,
        confirmed_autonomy_profile: replayed.contract.autonomy_profile,
        confirmed_required_gates: [...replayed.contract.policy.required_gates],
        ...(operation === "queue-claim"
          ? {}
          : {
              action_id: state.active_action.action_id,
              idempotency_key: state.active_action.idempotency_key,
              controller_intent_digest: digestJson({
                run_id: runId,
                action_id: state.active_action.action_id,
                idempotency_key: state.active_action.idempotency_key,
                run_head_digest: activeIntentEvent.event_hash,
              }),
              ...(backgroundBinding === null
                ? {}
                : { background_budget_binding: backgroundBinding }),
            }),
        ...(queueConfirmation === null
          ? {}
          : {
              confirmation_expected_run_version:
                queueConfirmation.expected_run_version,
              approval_phase: queueConfirmation.phase,
              approval_expires_at: queueConfirmation.expires_at,
              confirmed_goal_digest: queueConfirmation.goal_digest,
              confirmed_eval_definition_digest:
                queueConfirmation.eval_definition_digest,
              approver_actor_type: queueConfirmation.approver.actor_type,
              approver_attestation: queueConfirmation.approver.attestation,
            }),
      };
    },

    async queryAdaptiveLearningMemory(input = {}) {
      if (
        !hasExactFields(input, ADAPTIVE_MEMORY_QUERY_FIELDS) ||
        !/^sha256:[a-f0-9]{64}$/u.test(input.dedupeKey ?? "") ||
        !Object.hasOwn(RISK_ORDER, input.riskProfile) ||
        !PUBLIC_WORKFLOW_ROUTES.has(input.workflowRoute) ||
        !/^sha256:[a-f0-9]{64}$/u.test(input.problemFingerprint ?? "") ||
        !/^sha256:[a-f0-9]{64}$/u.test(input.contextFingerprint ?? "")
      ) {
        throw new Error("LEARNING_MEMORY_QUERY_INVALID");
      }
      let effectiveObservedAt;
      try {
        utcSortKey(input.observedAt);
        const controllerObservedAt = now();
        utcSortKey(controllerObservedAt);
        effectiveObservedAt =
          utcSortKey(input.observedAt) < utcSortKey(controllerObservedAt)
            ? controllerObservedAt
            : input.observedAt;
      } catch {
        throw new Error("LEARNING_MEMORY_QUERY_INVALID");
      }
      assertPrivacySafeRuntimeValue(input, "adaptive learning memory query");
      const context = createReplayContext({
        listByteIoBudget: { consumed: 0, maximum: maxListBytes },
      });
      const replayed = await replayRun(input.runId, context);
      await requireCurrentSnapshot(replayed, context);
      if (!requiresAdaptiveLearning(replayed.contract)) {
        throw new Error("LEARNING_PROFILE_NOT_ENABLED");
      }
      const allOutcomes = await collectAdaptiveOutcomes(context);
      const priorOutcomes = allOutcomes.filter(
        (outcome) => outcome.dedupe_key === input.dedupeKey,
      );
      if (priorOutcomes.length > 1) {
        throw new Error("OUTCOME_GLOBAL_DEDUPE_CONFLICT");
      }
      const store = createLoopLearningStore({
        root: safeRoot,
        runId: replayed.contract.run_id,
      });
      const allPatterns = await store.listVerifiedPatterns();
      for (const pattern of allPatterns) {
        const source = await replayRun(pattern.source_run_id, context);
        await requireCurrentSnapshot(source, context);
        const promotion = source.events.find(
          (event) =>
            event.type === "VERIFIED_PATTERN_PROMOTED" &&
            JSON.stringify(event.data.pattern) === JSON.stringify(pattern),
        );
        if (promotion === undefined) {
          throw new Error("PATTERN_PROJECTION_REPLAY_MISMATCH");
        }
      }
      const verifiedPatterns = retrieveVerifiedPatterns(allPatterns, {
        now: effectiveObservedAt,
        risk_profile: input.riskProfile,
        workflow_route: input.workflowRoute,
        problem_fingerprint: input.problemFingerprint,
        context_fingerprint: input.contextFingerprint,
      });
      const result = {
        schema: "adaptive_learning_memory_query_v2",
        contract_version: "2.0.0",
        query_digest: digestJson(input),
        run_id: replayed.contract.run_id,
        event_head_digest: replayed.state.last_event_hash,
        prior_outcomes: priorOutcomes.map((outcome) => structuredClone(outcome)),
        verified_patterns: verifiedPatterns,
        authority: "ADVISORY_ONLY",
        observed_at: effectiveObservedAt,
      };
      assertPrivacySafeRuntimeValue(result, "adaptive learning memory result");
      return cloneFrozen(result);
    },

    async list({ status } = {}) {
      if (status !== undefined && !LOOP_RUN_STATES.includes(status)) {
        throw new Error(`List status is unsupported: ${status}`);
      }
      const runsPath = await resolveRepositoryPath(safeRoot, RUNS_DIRECTORY, {
        label: "loop runs directory",
      });
      const info = await lstat(runsPath).catch(() => null);
      if (info === null) return [];
      if (!info.isDirectory() || info.isSymbolicLink()) {
        throw new Error("Loop runs directory is not a safe directory.");
      }
      const entries = [];
      const directory = await opendir(runsPath);
      for await (const entry of directory) {
        if (entries.length >= maxListEntries) {
          throw new Error(`List entry limit exceeded: maximum ${maxListEntries}.`);
        }
        entries.push(entry);
      }
      const listByteIoBudget = { consumed: 0, maximum: maxListBytes };
      const context = createReplayContext({ listByteIoBudget });
      const results = [];
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.isSymbolicLink()) {
          throw new Error(`Loop run entry is a symlink: ${entry.name}`);
        }
        if (!entry.isDirectory() || entry.name.endsWith(".owner.lock")) continue;
        const replayed = await replayRun(entry.name, context);
        const state = await requireCurrentSnapshot(replayed, context);
        if (status === undefined || state.status === status) {
          results.push({
            run_id: entry.name,
            mode: state.mode,
            status: state.status,
            version: state.version,
            sequence: state.sequence,
            head: replayed.events.at(-1).event_hash,
          });
        }
      }
      return results;
    },

    async repair({ runId, expectedVersion } = {}) {
      const paths = runPaths(runId);
      return withOwnerLock(safeRoot, paths.lock, async ({ assertOwnership }) => {
        const context = createReplayContext({ retainStateHistoryFor: runId });
        const replayed = await replayRun(runId, context);
        assertExpectedVersion(replayed.state.version, expectedVersion, "run version");
        const stateSchema = await loadSchema("loop-run-state-v2.schema.json", context);
        const eventSchema = await loadSchema("loop-run-event-v2.schema.json", context);
        let snapshot = null;
        try {
          const stateText = await readBoundedFile(safeRoot, replayed.paths.state, {
            encoding: "utf8",
            label: "run state snapshot",
            maxBytes: MAX_STATE_BYTES,
          });
          snapshot = parseJsonDocument(stateText, stateSchema, "run state snapshot");
          assertPrivacySafeRuntimeValue(snapshot, "run state snapshot");
        } catch (error) {
          if (!/File does not exist:/u.test(error instanceof Error ? error.message : "")) {
            throw error;
          }
        }

        if (snapshot !== null) {
          if (
            snapshot.sequence > replayed.state.sequence ||
            snapshot.version > replayed.state.version
          ) {
            throw new Error("Run snapshot is ahead of event authority and is corrupt.");
          }
          if (
            snapshot.sequence === replayed.state.sequence &&
            snapshot.version === replayed.state.version
          ) {
            if (JSON.stringify(snapshot) !== JSON.stringify(replayed.state)) {
              throw new Error("Run snapshot diverges from event authority and is corrupt.");
            }
            throw new Error("Snapshot repair is not required because it is not behind.");
          }
          const historical = replayed.states.find(
            (candidate) =>
              candidate.sequence === snapshot.sequence &&
              candidate.version === snapshot.version,
          );
          if (historical === undefined || JSON.stringify(historical) !== JSON.stringify(snapshot)) {
            throw new Error("Behind snapshot diverges from its event history and is corrupt.");
          }
        }

        const repairedHead = replayed.state.last_event_hash;
        const event = createEvent({
          eventId: randomId(),
          runId,
          state: replayed.state,
          type: "SNAPSHOT_REPAIRED",
          recordedAt: now(),
          data: { repaired_from_event_hash: repairedHead },
        });
        assertUniqueEventId(replayed.events, event);
        assertValidValue(event, eventSchema, "SNAPSHOT_REPAIRED event");
        const state = withEventHead(replayed.state, event);
        assertValidValue(state, stateSchema, "repaired run state");
        assertPrivacySafeRuntimeValue(event, "SNAPSHOT_REPAIRED event");
        assertPrivacySafeRuntimeValue(state, "repaired run state");

        await assertOwnership();
        await appendFileDurable(
          safeRoot,
          replayed.paths.events,
          `${JSON.stringify(event)}\n`,
          { maxBytes: MAX_EVENT_LOG_BYTES },
        );
        await dependencies.afterEventAppend?.({ event, state: structuredClone(state) });
        await projectTelemetryEventFailClosed(
          {
            event,
            state,
            contract: replayed.contract,
            loadedConfig: replayed.loadedConfig,
          },
          () =>
            rebuildRunTelemetry({
              events: [...replayed.events, event],
              states: [...replayed.states, state],
              contract: replayed.contract,
              loadedConfig: replayed.loadedConfig,
            }),
        );
        await writeFileAtomic(
          safeRoot,
          replayed.paths.state,
          `${JSON.stringify(state, null, 2)}\n`,
          {
            assertOwnership,
            label: "run state",
            maxBytes: MAX_STATE_BYTES,
            mode: 0o600,
          },
        );
        return { state };
      });
    },
  };
  controllerAuthorities.set(controller, {
    root: safeRoot,
    loadCanonicalProjectConfig: loadFreshCanonicalProjectConfig,
  });
  return Object.freeze(controller);
}

function requireLoopRunControllerAuthority(controller, root) {
  const authority =
    controller !== null && typeof controller === "object"
      ? controllerAuthorities.get(controller)
      : undefined;
  if (authority === undefined) {
    throw new TypeError("LOOP_RUN_CONTROLLER_AUTHORITY_UNTRUSTED");
  }
  if (authority.root !== path.resolve(root)) {
    throw new TypeError("LOOP_RUN_CONTROLLER_AUTHORITY_ROOT_MISMATCH");
  }
  return authority;
}

export function assertLoopRunControllerAuthority(controller, root) {
  requireLoopRunControllerAuthority(controller, root);
  return true;
}

export async function loadLoopRunControllerCanonicalProjectConfig(
  controller,
  root,
) {
  const authority = requireLoopRunControllerAuthority(controller, root);
  return authority.loadCanonicalProjectConfig();
}

const CLI_OPTIONS = Object.freeze({
  create: { required: ["contract-file"], optional: [] },
  "budget propose": {
    required: ["run", "phase"],
    optional: ["queue-item-id", "input-file"],
  },
  "budget confirm": {
    required: ["run", "expected-version", "input-file"],
    optional: [],
  },
  apply: {
    required: ["run", "expected-version", "command", "input-file"],
    optional: [],
  },
  show: { required: ["run"], optional: [] },
  list: { required: [], optional: ["status"] },
  "validate-gate": {
    required: ["run", "operation"],
    optional: ["queue-item-id"],
  },
  repair: { required: ["run", "expected-version"], optional: [] },
  "mode show": { required: [], optional: [] },
  "mode validate": { required: [], optional: [] },
  "mode transition": {
    required: [
      "expected-digest",
      "expected-config-version",
      "expected-mode-version",
      "target",
      "input-file",
      "owner-actor",
      "owner-attestation",
    ],
    optional: ["safety-head", "recovery-evidence-digest"],
  },
});

function parseCli(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new Error("A Loop Runtime command is required.");
  }
  let command = argv[0];
  let offset = 1;
  if (command === "budget") {
    if (!new Set(["propose", "confirm"]).has(argv[1])) {
      throw new Error("Budget command must be `propose` or `confirm`.");
    }
    command = `budget ${argv[1]}`;
    offset = 2;
  } else if (command === "mode") {
    if (!new Set(["show", "validate", "transition"]).has(argv[1])) {
      throw new Error("Mode command must be `show`, `validate`, or `transition`.");
    }
    command = `mode ${argv[1]}`;
    offset = 2;
  }
  const spec = CLI_OPTIONS[command];
  if (spec === undefined) throw new Error(`Unsupported Loop Runtime command: ${command}`);
  const allowed = new Set([...spec.required, ...spec.optional]);
  const options = {};
  for (let index = offset; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (typeof token !== "string" || !token.startsWith("--")) {
      throw new Error(`Invalid CLI argument: ${String(token)}`);
    }
    const name = token.slice(2);
    if (!allowed.has(name)) throw new Error(`${command} contains unsupported option: --${name}`);
    if (Object.hasOwn(options, name)) throw new Error(`Duplicate CLI option: --${name}`);
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${token} requires one value.`);
    }
    options[name] = value;
  }
  for (const required of spec.required) {
    if (!Object.hasOwn(options, required)) {
      throw new Error(`${command} requires --${required}.`);
    }
  }
  return { command, options };
}

function parseExpectedVersion(value) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? "")) {
    throw new Error("--expected-version must be a non-negative safe integer.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("--expected-version must be a non-negative safe integer.");
  }
  return parsed;
}

export async function runLoopRunCli(
  argv,
  { root = process.cwd(), controllerDependencies = {} } = {},
) {
  if (
    controllerDependencies === null ||
    typeof controllerDependencies !== "object" ||
    Array.isArray(controllerDependencies) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(controllerDependencies))
  ) {
    throw new TypeError("CLI controllerDependencies must be a plain object.");
  }
  const { command, options } = parseCli(argv);
  const controller = createLoopRunController(root, controllerDependencies);
  switch (command) {
    case "create":
      return controller.create({ contractFile: options["contract-file"] });
    case "budget propose":
      return controller.proposeBudget({
        runId: options.run,
        phase: options.phase.toUpperCase(),
        queueItemId: options["queue-item-id"],
        recommendationFile: options["input-file"],
      });
    case "budget confirm":
      return controller.confirmBudget({
        runId: options.run,
        expectedVersion: parseExpectedVersion(options["expected-version"]),
        inputFile: options["input-file"],
      });
    case "apply":
      return controller.apply({
        runId: options.run,
        expectedVersion: parseExpectedVersion(options["expected-version"]),
        command: options.command,
        inputFile: options["input-file"],
      });
    case "show":
      return controller.show({ runId: options.run });
    case "list":
      return controller.list({ status: options.status });
    case "validate-gate":
      return controller.validateGate({
        runId: options.run,
        operation: options.operation,
        queueItemId: options["queue-item-id"],
      });
    case "repair":
      return controller.repair({
        runId: options.run,
        expectedVersion: parseExpectedVersion(options["expected-version"]),
      });
    case "mode show":
      return controller.showMode();
    case "mode validate":
      return controller.validateMode();
    case "mode transition":
      return controller.transitionMode({
        expectedDigest: options["expected-digest"],
        expectedConfigVersion: parseExpectedVersion(
          options["expected-config-version"],
        ),
        expectedModeVersion: parseExpectedVersion(
          options["expected-mode-version"],
        ),
        targetMode: options.target,
        inputFile: options["input-file"],
        ownerActor: options["owner-actor"],
        ownerAttestation: options["owner-attestation"],
        safetyHead: options["safety-head"],
        recoveryEvidenceDigest: options["recovery-evidence-digest"],
      });
    default:
      throw new Error(`Unsupported Loop Runtime command: ${command}`);
  }
}

const isCli =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  runLoopRunCli(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message.replace(/[\r\n]+/gu, " ")}\n`);
      process.exitCode = 1;
    });
}
