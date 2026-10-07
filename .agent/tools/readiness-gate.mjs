#!/usr/bin/env node
/**
 * readiness-gate - deterministic READY_FOR_SLICE predicate for UI-bearing scope.
 *
 * Every hard gate from ui-contract-readiness.md is a binary pass/fail; there is
 * no score. The verdict is READY_FOR_SLICE only when every non-skipped gate
 * passes. Unreadable inputs and a missing manifest fail closed (exit 2).
 *
 * Gates: enums, not-applicable, baseline, state-coverage, uimap, revisions,
 * derived-assets, verification-refs, high-interaction-evidence, open-blockers,
 * first-slice, scale-out, hardening, enablers.
 *
 * Usage:
 *   node .agent/tools/readiness-gate.mjs --fsd <path> --prd <path> --issues-dir <dir> [--root <path>] [--json]
 * Exit 0 = READY_FOR_SLICE or justified NOT_APPLICABLE; 1 = BLOCKED; 2 = usage/unreadable/no manifest.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { readBoundedFile, resolveRepositoryPath } from "./file-state.mjs";
import { computeWaves, parseIssueDependencies } from "./goal-waves.mjs";

const PROFILES = new Set(["NOT_APPLICABLE", "STANDARD", "HIGH_INTERACTION"]);
const READINESS = new Set(["NOT_APPLICABLE", "DRAFT", "BLOCKED", "READY_FOR_SLICE"]);
const BASELINES = new Set(["VALIDATED", "EXCEPTION_APPROVED"]);
const ACTIVE_STATUSES = new Set(["ready-for-agent", "in-progress"]);
const CRITICAL_STATES = [
  "loading", "empty", "success", "validation", "error", "forbidden",
  "stale/conflict", "partial/degraded", "offline", "async",
].map((state) => [state, new RegExp(`\\b(?:${state.split("/").join("|")})\\b`, "i")]);
const VERIFICATION_KEYS = [
  "schema_lint_refs", "fixture_validation_refs", "provider_contract_refs",
  "consumer_contract_refs", "responsive_accessibility_qa_refs",
];
const SKIPPABLE_GATES = [
  "baseline", "state-coverage", "uimap", "revisions", "derived-assets", "verification-refs",
  "high-interaction-evidence", "open-blockers", "first-slice", "scale-out", "hardening", "enablers",
];
const MANIFEST_RE = /```yaml[ \t]*\r?\n(ui_api_contract:[ \t]*\r?\n[\s\S]*?)```/;
const KEY_LINE = /^\s*(?:-\s+)?([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/;
const RUNNABLE_EVIDENCE = /runnable[^\n]*(?:https?:\/\/|sha256:|digest|revision)/i;
const USAGE = "usage: readiness-gate.mjs --fsd <path> --prd <path> --issues-dir <dir> [--root <path>] [--json]";

const unquote = (value) => value.trim().replace(/^["']|["']$/g, "");
const isPlaceholder = (value) => !value || value.includes("{{") || /^n\/a$/i.test(value);
const lines = (text) => text.split(/\r?\n/);

function activeOpenBlockers(text) {
  let historyLevel = 0;
  let headers = [];
  const source = lines(text.replace(/```[\s\S]*?```/g, ''));
  const blockers = [];
  const normalized = value => String(value ?? '').replace(/`/g,'').trim().toUpperCase();
  const closed = ['RESOLVED','CLOSED','ARCHIVED','NONBLOCKING','NON_BLOCKING','NON-BLOCKING'];
  const activeStatuses = ['OPEN','PENDING','BLOCKED','UNRESOLVED'];
  const cells = line => line.trim().replace(/^\||\|$/g,'').split('|').map(normalized);
  for (const [index,line] of source.entries()) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (historyLevel && heading[1].length <= historyLevel) historyLevel = 0;
      if (/\b(?:resolved|closed|history|historical|archive|archived)\b/i.test(heading[2])) historyLevel = heading[1].length;
      headers = [];
    }
    const row = /^\s*\|/.test(line) ? cells(line) : [];
    if (row.includes('STATUS')) { headers = row; continue; }
    const id = line.match(/\bOPEN-\d+\b/);
    if (!id) continue;
    if (row.length && !/^OPEN-\d+$/.test(row[0])) continue;
    let record = line;
    if (!row.length) {
      for (let next=index+1;next<source.length;next++) {
        if (/^#{1,6}\s|\bOPEN-\d+\b|^\s*\|/.test(source[next])) break;
        if (source[next].trim() && !/^\s*(?:-\s*)?(?:Status|Blocking|Class|Type|Owner|Reason|Description)\s*:/i.test(source[next])) break;
        record += `\n${source[next]}`;
      }
    }
    const statusColumn = headers.indexOf('STATUS');
    const status = normalized((row.length && statusColumn >= 0 ? row[statusColumn] : undefined)
      ?? record.match(/\bStatus\s*:\s*`?([A-Z_-]+)/i)?.[1]
      ?? row.find(cell=>[...closed,...activeStatuses].includes(cell))
      ?? line.slice(id.index + id[0].length).match(/^\s*:\s*`?([A-Z_-]+)\b/i)?.[1]);
    const typeColumn = headers.findIndex(cell=>['CLASS','TYPE','BLOCKING'].includes(cell));
    const classification = normalized(row.length && typeColumn >= 0 ? row[typeColumn] : record.match(/\b(?:Class|Type)\s*:\s*`?([A-Z_-]+)/i)?.[1]);
    if (closed.includes(status) || ['NON_BLOCKER','NON-BLOCKER','NONBLOCKER','FALSE'].includes(classification)
      || /\bBlocking\s*:\s*false\b/i.test(record)) continue;
    const active = activeStatuses.includes(status);
    if ((active || !historyLevel) && (active || row.length || /\bStatus\s*:|\b(?:blocking|blocker)\b/i.test(record))) blockers.push(line);
  }
  return blockers;
}

function leaf(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
  return match ? unquote(match[1]) : "";
}

// ponytail: leaf-key regex reader over the fenced manifest; swap for an indentation-aware reader if two leaves ever share a name
export function readManifest(text) {
  const block = text.match(MANIFEST_RE);
  if (!block) return null;
  const leaves = {};
  const scan = (line) => {
    const match = line.match(KEY_LINE);
    if (!match) return;
    const [, key, raw] = match;
    const value = raw.trim();
    if (value.startsWith("{")) {
      for (const part of value.slice(1, value.lastIndexOf("}")).split(",")) scan(part);
      return;
    }
    if (!value) return;
    const items = value.startsWith("[")
      ? value.slice(1, value.lastIndexOf("]")).split(",").map(unquote).filter(Boolean)
      : [unquote(value)];
    leaves[key] = [...(leaves[key] ?? []), ...items];
  };
  for (const line of lines(block[1])) scan(line);
  return leaves;
}

export function parseIssuePointer(text) {
  const blocked = leaf(text, "Blocked by");
  return {
    status: leaf(text, "Status"),
    role: leaf(text, "UI delivery role"),
    contractRefs: leaf(text, "Contract refs"),
    gate: leaf(text, "Contract gate"),
    blockedBy: /^none$/i.test(blocked)
      ? []
      : blocked.split(",").map((token) => path.basename(token.trim())).filter(Boolean),
  };
}

export async function evaluateReadiness({ root = process.cwd(), fsdPath, prdPath, issuesDir }) {
  const read = (candidate, label) => readBoundedFile(root, candidate, { encoding: "utf8", label });
  const fsdText = await read(fsdPath, "FSD");
  const prdText = await read(prdPath, "PRD");
  const manifest = readManifest(fsdText);
  const fsdBody = fsdText.replace(MANIFEST_RE, "");
  const profile = leaf(fsdBody, "ui_delivery_profile");
  const readiness = leaf(fsdBody, "ui_contract_readiness");
  const baseline = leaf(prdText, "experience_baseline_status");
  const m = (key) => manifest?.[key] ?? [];

  const gates = [];
  const gate = (id, ok, detail) => gates.push({ id, status: ok ? "pass" : "fail", detail });
  const skip = (id, detail) => gates.push({ id, status: "skip", detail });
  const finish = (verdict) => {
    const failures = gates.filter((entry) => entry.status === "fail").map((entry) => entry.id);
    return {
      schema: "readiness_gate_v1",
      verdict: verdict ?? (failures.length ? "BLOCKED" : "READY_FOR_SLICE"),
      profile: profile || null,
      baseline: baseline || null,
      gates,
      failures,
    };
  };

  // S0
  const manifestProfile = m("ui_delivery_profile")[0] ?? m("profile")[0];
  const manifestReadiness = m("ui_contract_readiness")[0];
  gate(
    "enums",
    PROFILES.has(profile) && READINESS.has(readiness)
      && (manifestProfile === undefined || manifestProfile === profile)
      && (manifestReadiness === undefined || manifestReadiness === readiness),
    `profile=${profile || "?"} readiness=${readiness || "?"}`
      + (manifest ? ` manifest=${manifestProfile ?? "?"}/${manifestReadiness ?? "?"}` : ""),
  );

  // S1
  if (profile === "NOT_APPLICABLE") {
    const reason = m("reason")[0] ?? leaf(fsdBody, "reason");
    gate("not-applicable", !isPlaceholder(reason), `reason=${reason || "?"}`);
    for (const id of SKIPPABLE_GATES) skip(id, "profile NOT_APPLICABLE");
    return finish("NOT_APPLICABLE");
  }
  if (!manifest) {
    throw new Error(`no ui_api_contract manifest in ${fsdPath} for profile ${profile || "?"}`);
  }
  skip("not-applicable", `profile ${profile}`);
  const topology = m("topology")[0] ?? "NETWORKED";
  const localOnly = topology === "LOCAL_ONLY";
  if (topology !== "NETWORKED") {
    gate("topology", localOnly && manifest.network_actions !== undefined
      && m("network_actions").length === 0 && m("schema_ref").length === 0
      && m("revision").length === 0 && m("generated_from").length === 0,
    `topology=${topology}; LOCAL_ONLY requires no network/wire/derived declarations`);
  }

  // G1
  gate("baseline", BASELINES.has(baseline), `experience_baseline_status=${baseline || "?"}`);

  // G2
  const prdLines = lines(prdText);
  const covered = (line) => /COVERED/.test(line) || /N\/A\s*-\s*\S/.test(line);
  const missingStates = CRITICAL_STATES
    .filter(([, pattern]) => !prdLines.some((line) => pattern.test(line) && covered(line)))
    .map(([state]) => state);
  gate("state-coverage", missingStates.length === 0,
    missingStates.length ? `missing: ${missingStates.join(", ")}` : `${CRITICAL_STATES.length} states covered`);

  // G3
  const rows = lines(fsdBody).map((line) => line.trim()).filter((line) => /^\|\s*UIMAP-/.test(line));
  const badRows = rows.filter((row) => {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    return cells.some((cell) => !cell || cell.includes("{{")) || !(localOnly ? /LOCAL-|UI-STATE-|TEST-/ : /SCHEMA-|CONTRACT-/).test(row);
  }).map((row) => row.split("|")[1].trim());
  gate("uimap", rows.length > 0 && badRows.length === 0,
    !rows.length ? "no UIMAP rows" : badRows.length ? `incomplete rows: ${badRows.join(", ")}` : `${rows.length} UIMAP rows`);

  if (localOnly) {
    skip("revisions", "LOCAL_ONLY: no wire contract");
    skip("derived-assets", "LOCAL_ONLY: no provider or generated consumer");
  } else {
  // G4
  const revisions = m("revision");
  const schemaRevision = m("schema_revision");
  const revisionsMatch = revisions.length > 0 && schemaRevision.length === 1
    && revisions.every((revision) => revision === schemaRevision[0]);
  gate("revisions",
    revisionsMatch && m("schema_lint_refs").length > 0 && m("fixture_validation_refs").length > 0,
    `wire=[${revisions}] fixtures=[${schemaRevision}] lint=${m("schema_lint_refs").length} validation=${m("fixture_validation_refs").length}`);

  // G5
  const derived = m("generated_from");
  const derivedOk = derived.length >= 2 && derived.every((value) => {
    const hit = value.match(/^SCHEMA-\d+@(.+)$/);
    return hit !== null && revisions.includes(hit[1]);
  });
  gate("derived-assets", derivedOk, `generated_from=[${derived}] wire=[${revisions}]`);

  }

  // G6
  const badRefs = [];
  const applicableVerification = localOnly ? ["responsive_accessibility_qa_refs"] : VERIFICATION_KEYS;
  for (const key of applicableVerification) {
    const refs = m(key);
    if (refs.length === 0) badRefs.push(`${key}: empty`);
    for (const ref of refs) {
      const hit = ref.match(/^FSD-[A-Z0-9-]+#(TEST-\d+)$/);
      if (!hit) badRefs.push(`${key}: ${ref} malformed`);
      else if (!new RegExp(`\\b${hit[1]}\\b`).test(fsdBody)) badRefs.push(`${key}: ${hit[1]} not in FSD body`);
    }
  }
  gate("verification-refs", badRefs.length === 0,
    badRefs.length ? badRefs.join("; ") : `${applicableVerification.length} verification arrays resolved`);

  // G7
  if (profile === "HIGH_INTERACTION") {
    const found = RUNNABLE_EVIDENCE.test(prdText) || RUNNABLE_EVIDENCE.test(fsdText);
    gate("high-interaction-evidence", found, `runnable evidence line ${found ? "found" : "missing"}`);
  } else {
    skip("high-interaction-evidence", `profile ${profile}`);
  }

  // G8
  const openRefs = m("blocking_open_refs");
  const blockerLines = [...activeOpenBlockers(prdText), ...activeOpenBlockers(fsdText)];
  gate("open-blockers",
    manifest.blocking_open_refs !== undefined && openRefs.length === 0 && blockerLines.length === 0,
    manifest.blocking_open_refs === undefined
      ? "blocking_open_refs missing"
      : `blocking_open_refs=[${openRefs}] blocking OPEN-* lines=${blockerLines.length}`);

  // Issues
  const issuesAbs = await resolveRepositoryPath(root, issuesDir, { label: "Issues dir" });
  const issues = [];
  for (const file of fs.readdirSync(issuesAbs).filter((name) => name.endsWith(".md")).sort()) {
    issues.push({ file, ...parseIssuePointer(await read(path.join(issuesAbs, file), "Issue")) });
  }
  const byRole = (role) => issues.filter((issue) => issue.role === role);
  if (localOnly) {
    let graphError = "";
    try { computeWaves(parseIssueDependencies(issuesAbs)); }
    catch (error) { graphError = error.message; }
    const providerRoles = new Set(["CONTRACT_ENABLER", "FIRST_VERTICAL_SLICE", "SCALE_OUT_SLICE"]);
    gate("local-goals", issues.length > 0 && !graphError
      && issues.every(issue => !providerRoles.has(issue.role) && issue.gate === "NOT_APPLICABLE"),
    graphError || "local goals use applicable behavior verification without provider barriers");
    for (const id of ["first-slice", "scale-out", "hardening", "enablers"]) skip(id, "LOCAL_ONLY topology");
    return finish();
  }

  // B1
  const version = m("version")[0];
  const firstSlices = byRole("FIRST_VERTICAL_SLICE");
  const current = firstSlices.filter((issue) => version && issue.contractRefs.includes(`@${version}#`));
  let first = current.length === 1 ? current[0] : null;
  let reused = false;
  // Compatible revision identity is not enough: require an explicit impact
  // assessment and mapped provider/consumer checks before reusing historical proof.
  const compatibilityRefs = m("compatibility_verification_refs");
  const validCompatibility = compatibilityRefs.length >= 2 && compatibilityRefs.every(ref => {
    const hit = ref.match(/^FSD-[A-Z0-9-]+#(TEST-\d+)$/);
    return hit && new RegExp(`\\b${hit[1]}\\b`).test(fsdBody);
  }) && m("provider_contract_refs").some(ref => compatibilityRefs.includes(ref))
    && m("consumer_contract_refs").some(ref => compatibilityRefs.includes(ref));
  const validImpact = manifest.affected_mapping_refs !== undefined && m("affected_mapping_refs").every(ref => {
    const hit = ref.match(/^FSD-[A-Z0-9-]+#(UIMAP-\d+)$/);
    return hit && rows.some(row => row.split("|")[1].trim() === hit[1]);
  });
  if (!first && current.length === 0 && m("change_class")[0] === "WIRE_COMPATIBLE"
    && m("material_flow_change")[0] === "false" && validCompatibility
    && validImpact) {
    const affected = m("affected_mapping_refs").map(ref => ref.split("#").at(-1));
    const proofs = firstSlices.filter(issue => issue.status === "verified"
      && issue.gate === "READY_FOR_SLICE" && /#UIMAP-\d+/.test(issue.contractRefs)
      && m("compatible_first_slice_refs").some(ref => issue.contractRefs.split(",").map(s => s.trim()).includes(ref))
      && !affected.some(id => issue.contractRefs.split(",").some(ref => ref.trim().split("#").at(-1) === id)));
    if (proofs.length === 1) { first = proofs[0]; reused = true; }
  }
  gate("first-slice", first !== null && first.gate === "READY_FOR_SLICE",
    first
      ? `${first.file} gate=${first.gate} @${version}${reused ? " compatible proof retained after affected checks" : ""}`
      : `${current.length} FIRST_VERTICAL_SLICE issues at @${version ?? "?"} (${firstSlices.length} total)`);

  // B2
  const scaleOuts = byRole("SCALE_OUT_SLICE");
  const exception = baseline === "EXCEPTION_APPROVED";
  const badScaleOuts = scaleOuts.filter((issue) =>
    issue.gate !== "FIRST_VERTICAL_SLICE_VERIFIED"
    || first === null || !issue.blockedBy.includes(first.file)
    || (exception && ACTIVE_STATUSES.has(issue.status))).map((issue) => issue.file);
  gate("scale-out", badScaleOuts.length === 0,
    badScaleOuts.length
      ? `violations: ${badScaleOuts.join(", ")}`
      : `${scaleOuts.length} SCALE_OUT_SLICE issues${exception ? " (exception: none active)" : ""}`);

  // B3
  const hardening = byRole("HARDENING");
  const slices = [...firstSlices, ...scaleOuts].map((issue) => issue.file);
  const unlinked = hardening.length === 1
    ? slices.filter((file) => !hardening[0].blockedBy.includes(file))
    : slices;
  gate("hardening", hardening.length === 1 && unlinked.length === 0,
    hardening.length !== 1
      ? `${hardening.length} HARDENING issues`
      : unlinked.length
        ? `${hardening[0].file} missing: ${unlinked.join(", ")}`
        : `${hardening[0].file} depends on ${slices.length} slices`);

  // B4
  const badEnablers = byRole("CONTRACT_ENABLER")
    .filter((issue) => issue.gate !== "NOT_APPLICABLE").map((issue) => issue.file);
  let graphError = "";
  try {
    computeWaves(parseIssueDependencies(issuesAbs));
  } catch (error) {
    graphError = error.message;
  }
  gate("enablers", badEnablers.length === 0 && !graphError,
    [badEnablers.length ? `gate violations: ${badEnablers.join(", ")}` : "", graphError]
      .filter(Boolean).join("; ") || "enabler gates NOT_APPLICABLE, graph acyclic");

  return finish();
}

function usage() {
  process.stderr.write(`${USAGE}\n`);
  return 2;
}

// Human-facing guidance only. Gate facts, JSON schema and exit codes stay authoritative.
function nextActions(result, opts) {
  const actions = {
    enums: `Agent /sc-plan: reconcile profile/readiness declarations in ${opts.fsdPath}.`,
    "not-applicable": `Agent /sc-plan: document factual UI applicability in ${opts.fsdPath}.`,
    topology: `Agent /sc-plan: reconcile local/network declarations in ${opts.fsdPath}.`,
    baseline: `Agent /sc-prd: inspect ${opts.prdPath} acceptance and existing evidence; preserve approved decisions. Request only unresolved experience judgment from its product owner with a concrete review package.`,
    "state-coverage": `Agent /sc-prd: research and map missing states in ${opts.prdPath}; ask the product owner only for an unresolved behavior decision.`,
    uimap: `Agent /sc-plan: complete affected screen/data/action mappings in ${opts.fsdPath}.`,
    revisions: `Agent: check schema/fixture identity and validation evidence referenced by ${opts.fsdPath}; missing assets belong to a bounded authorized enabler.`,
    "derived-assets": `Agent: regenerate and verify mock/consumer assets through the authorized enabler; /sc-plan reconciles ${opts.fsdPath}.`,
    "verification-refs": `Agent /sc-plan: repair mapped test references in ${opts.fsdPath}; a reference is not a passing test result.`,
    "high-interaction-evidence": `Agent: produce or inspect runnable evidence for the interaction risk; a HIGH_INTERACTION label alone does not require another human gate.`,
    "open-blockers": `Agent: split each OPEN-* in ${opts.fsdPath} and ${opts.prdPath} into its actual owner and need (decision, action authorization, research, automated/manual test, or external access). Resolve available facts/checks first; request only the human or external remainder.`,
    "local-goals": `Agent /sc-plan: reconcile local goal gates/dependencies in ${opts.issuesDir}.`,
    "first-slice": `Agent /sc-plan: reconcile the pinned first-slice pointer in ${opts.issuesDir}; the first slice produces real integration proof, which is required before scale-out, not before starting that slice.`,
    "scale-out": `Agent /sc-plan: keep affected scale-out pointers blocked until first-slice proof and baseline gates are satisfied.`,
    hardening: `Agent /sc-plan: link hardening to applicable delivery slices in ${opts.issuesDir}.`,
    enablers: `Agent /sc-plan: repair enabler gates/dependency cycles in ${opts.issuesDir}; never require a goal's own output to start it.`,
  };
  return [
    "Readiness blocked for the affected UI delivery scope.",
    "Existing approval remains valid within unchanged scope; approval does not turn missing technical evidence into a pass.",
    "Next actions:",
    ...result.gates.filter(entry => entry.status === "fail").map(entry =>
      `- ${actions[entry.id] ?? `Agent: inspect ${entry.id} in ${opts.fsdPath}.`}`),
    "Continue independent authorized work. This gate does not grant execution authority or change issue status.",
    ...(result.gates.some(entry => entry.id === "first-slice" && entry.status !== "skip")
      ? ["Check prerequisites separately from completion proof: the first slice produces real integration proof; scale-out waits for it. Qualification requiring executable assets must use a bounded approved enabler, not bypass a blocked product goal."] : []),
    "Technical details:",
  ].join("\n") + "\n";
}

async function main(argv) {
  const flags = { "--fsd": "fsdPath", "--prd": "prdPath", "--issues-dir": "issuesDir", "--root": "root" };
  const opts = { root: process.cwd(), json: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--json") opts.json = true;
    else if (flags[args[i]] && i + 1 < args.length) opts[flags[args[i]]] = args[++i];
    else return usage();
  }
  if (!opts.fsdPath || !opts.prdPath || !opts.issuesDir) return usage();

  let result;
  try {
    result = await evaluateReadiness(opts);
  } catch (error) {
    process.stderr.write(`readiness-gate: ${error.message}\n`);
    return 2;
  }
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    if (result.failures.length) process.stdout.write(nextActions(result, opts));
    for (const entry of result.gates) {
      process.stdout.write(`${entry.status.toUpperCase()} ${entry.id} ${entry.detail}\n`);
    }
    process.stdout.write(`verdict: ${result.verdict}\n`);
  }
  return result.failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv).then((code) => {
    process.exitCode = code;
  });
}
