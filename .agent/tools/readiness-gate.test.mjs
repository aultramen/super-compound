import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateReadiness, parseIssuePointer, readManifest } from "./readiness-gate.mjs";

const TOOL = fileURLToPath(new URL("./readiness-gate.mjs", import.meta.url));
const FENCE = "```";
const ARGS = ["--fsd", "docs/fsd.md", "--prd", "docs/prd.md", "--issues-dir", "issues"];

const PRD = `# X - Product Requirements Document

## Metadata

ID: PRD-X
ui_delivery_profile: STANDARD
experience_baseline_status: VALIDATED

## UI Experience Gate

- loading: COVERED
- empty: COVERED
- success: COVERED
- validation: COVERED
- error: COVERED
- forbidden: COVERED
- stale/conflict: COVERED
- partial/degraded: COVERED
- offline: N/A - no offline mode; approved by PM
- async: COVERED
`;

const MANIFEST = `${FENCE}yaml
ui_api_contract:
  id: "CONTRACT-001"
  profile: "STANDARD"
  applicability:
    reason: "N/A"
    approved_by: "N/A"
  ui_contract_readiness: "READY_FOR_SLICE"
  version: "1.2.0"
  wire_contracts:
    - schema_ref: "FSD-X#SCHEMA-001"
      path: "contracts/x.yaml"
      revision: "r1"
  fixtures:
    paths: ["fixtures/x.json"]
    schema_revision: "r1"
  derived_assets:
    mock: { path: "mocks/x.js", generated_from: "SCHEMA-001@r1" }
    typed_consumer: { path: "src/x.ts", generated_from: "SCHEMA-001@r1" }
  verification:
    schema_lint_refs: ["FSD-X#TEST-001"]
    fixture_validation_refs: ["FSD-X#TEST-002"]
    provider_contract_refs: ["FSD-X#TEST-003"]
    consumer_contract_refs: ["FSD-X#TEST-004"]
    responsive_accessibility_qa_refs: ["FSD-X#TEST-005"]
  readiness:
    hard_gates_passed: ["G1", "G2"]
    blocking_open_refs: []
${FENCE}
`;

const FSD = `# X - Functional Specification Document

## Metadata

ID: FSD-X
ui_delivery_profile: STANDARD
ui_contract_readiness: READY_FOR_SLICE

## Contract Manifest

${MANIFEST}
## Screen & Interaction Contract

| UIMAP ID | Journey/AC refs | UI ref | Schema refs | Test refs |
|---|---|---|---|---|
| UIMAP-001 | AC-001 | UI-001 | SCHEMA-001 | TEST-001 |
| UIMAP-002 | AC-002 | UI-001 | SCHEMA-001 | TEST-002 |

## Tests

- TEST-001 schema lint
- TEST-002 fixture validation
- TEST-003 provider contract
- TEST-004 consumer contract
- TEST-005 responsive and accessibility QA
`;

const NA_FSD = `# X - Functional Specification Document

## Metadata

ID: FSD-X
ui_delivery_profile: NOT_APPLICABLE
ui_contract_readiness: NOT_APPLICABLE

## Screen & Interaction Contract

reason: batch job, no UI surface
approved_by: Technical Manager
`;

const issue = (status, blockedBy, role, refs, gate) =>
  `# GOAL - ${role}\n\nStatus: ${status}\nBlocked by: ${blockedBy}\nUI delivery role: ${role}\nContract refs: ${refs}\nContract gate: ${gate}\n`;

const ISSUES = {
  "issues/issue-001-enabler.md": issue("verified", "None", "CONTRACT_ENABLER", "FSD-X@1.2.0#SCHEMA-001", "NOT_APPLICABLE"),
  "issues/issue-002-first-slice.md": issue("ready-for-agent", "issue-001-enabler.md", "FIRST_VERTICAL_SLICE", "FSD-X@1.2.0#CONTRACT-001, FSD-X@1.2.0#UIMAP-001", "READY_FOR_SLICE"),
  "issues/issue-003-scale-out.md": issue("blocked", "issue-002-first-slice.md", "SCALE_OUT_SLICE", "FSD-X@1.2.0#CONTRACT-001, FSD-X@1.2.0#UIMAP-002", "FIRST_VERTICAL_SLICE_VERIFIED"),
  "issues/issue-004-hardening.md": issue("blocked", "issue-002-first-slice.md, issue-003-scale-out.md", "HARDENING", "FSD-X@1.2.0#CONTRACT-001", "FIRST_VERTICAL_SLICE_VERIFIED"),
};

const roots = [];
after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

// patches: file -> full string | [from, to] | [[from, to], ...] (replaceAll)
function fixture(patches = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "readiness-gate-"));
  roots.push(root);
  const files = { "docs/prd.md": PRD, "docs/fsd.md": FSD, ...ISSUES };
  for (const [file, patch] of Object.entries(patches)) {
    if (typeof patch === "string") {
      files[file] = patch;
      continue;
    }
    for (const [from, to] of Array.isArray(patch[0]) ? patch : [patch]) {
      assert.ok(files[file].includes(from), `fixture anchor missing in ${file}: ${from}`);
      files[file] = files[file].replaceAll(from, to);
    }
  }
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const evaluate = (patches) =>
  evaluateReadiness({ root: fixture(patches), fsdPath: "docs/fsd.md", prdPath: "docs/prd.md", issuesDir: "issues" });

function runCli(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), stderr: "" };
  } catch (error) {
    return { code: error.status, stdout: error.stdout, stderr: error.stderr };
  }
}

function assertBlocked(result, id) {
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(result.failures.includes(id), `expected ${id} in failures, got ${result.failures.join(",")}`);
}

test("readManifest collects leaf keys as string lists", () => {
  const manifest = readManifest(FSD);
  assert.deepEqual(manifest.version, ["1.2.0"]);
  assert.deepEqual(manifest.revision, ["r1"]);
  assert.deepEqual(manifest.schema_revision, ["r1"]);
  assert.deepEqual(manifest.generated_from, ["SCHEMA-001@r1", "SCHEMA-001@r1"]);
  assert.deepEqual(manifest.path, ["contracts/x.yaml", "mocks/x.js", "src/x.ts"]);
  assert.deepEqual(manifest.hard_gates_passed, ["G1", "G2"]);
  assert.deepEqual(manifest.blocking_open_refs, []);
  assert.deepEqual(manifest.responsive_accessibility_qa_refs, ["FSD-X#TEST-005"]);
  assert.equal(readManifest(NA_FSD), null);
});

test("parseIssuePointer reads the five pointer lines", () => {
  const pointer = parseIssuePointer(ISSUES["issues/issue-004-hardening.md"]);
  assert.deepEqual(pointer, {
    status: "blocked",
    role: "HARDENING",
    contractRefs: "FSD-X@1.2.0#CONTRACT-001",
    gate: "FIRST_VERTICAL_SLICE_VERIFIED",
    blockedBy: ["issue-002-first-slice.md", "issue-003-scale-out.md"],
  });
  assert.deepEqual(parseIssuePointer("Blocked by: None\n").blockedBy, []);
  assert.deepEqual(parseIssuePointer("Blocked by: ../a/x.md, y.md\n").blockedBy, ["x.md", "y.md"]);
});

test("green fixture is READY_FOR_SLICE with no failures", async () => {
  const result = await evaluate();
  assert.equal(result.verdict, "READY_FOR_SLICE");
  assert.deepEqual(result.failures, []);
  assert.equal(result.baseline, "VALIDATED");
  assert.equal(result.profile, "STANDARD");
  assert.deepEqual(
    result.gates.filter((gate) => gate.status === "skip").map((gate) => gate.id),
    ["not-applicable", "high-interaction-evidence"],
  );
});

test("CLI exits 0 with readiness_gate_v1 json and text verdict", () => {
  const root = fixture();
  const json = runCli([...ARGS, "--root", root, "--json"]);
  assert.equal(json.code, 0, json.stderr);
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.schema, "readiness_gate_v1");
  assert.equal(parsed.verdict, "READY_FOR_SLICE");
  assert.equal(parsed.gates.length, 14);
  const text = runCli([...ARGS, "--root", root]);
  assert.equal(text.code, 0);
  assert.match(text.stdout, /^PASS baseline experience_baseline_status=VALIDATED$/m);
  assert.match(text.stdout, /^SKIP high-interaction-evidence /m);
  assert.match(text.stdout, /\nverdict: READY_FOR_SLICE\n$/);
});

const MUTATIONS = {
  enums: { "docs/fsd.md": ["ui_delivery_profile: STANDARD", "ui_delivery_profile: WEIRD"] },
  baseline: { "docs/prd.md": ["VALIDATED", "DRAFT"] },
  "state-coverage": { "docs/prd.md": ["- offline: N/A - no offline mode; approved by PM\n", ""] },
  uimap: { "docs/fsd.md": ["| UIMAP-002 | AC-002 |", "| UIMAP-002 | {{AC}} |"] },
  revisions: { "docs/fsd.md": ["schema_revision: \"r1\"", "schema_revision: \"r2\""] },
  "derived-assets": { "docs/fsd.md": ["mocks/x.js\", generated_from: \"SCHEMA-001@r1\"", "mocks/x.js\", generated_from: \"SCHEMA-001@r9\""] },
  "verification-refs": { "docs/fsd.md": ["provider_contract_refs: [\"FSD-X#TEST-003\"]", "provider_contract_refs: []"] },
  "high-interaction-evidence": { "docs/fsd.md": ["STANDARD", "HIGH_INTERACTION"] },
  "open-blockers": { "docs/fsd.md": ["blocking_open_refs: []", "blocking_open_refs: [\"OPEN-001\"]"] },
  "first-slice": { "issues/issue-002-first-slice.md": ["@1.2.0", "@1.1.0"] },
  "scale-out": { "issues/issue-003-scale-out.md": ["FIRST_VERTICAL_SLICE_VERIFIED", "READY_FOR_SLICE"] },
  hardening: { "issues/issue-004-hardening.md": [", issue-003-scale-out.md", ""] },
  enablers: { "issues/issue-001-enabler.md": ["Contract gate: NOT_APPLICABLE", "Contract gate: READY_FOR_SLICE"] },
};

for (const [id, patches] of Object.entries(MUTATIONS)) {
  test(`gate ${id} blocks on its mutation`, async () => {
    assertBlocked(await evaluate(patches), id);
  });
}

test("verification ref whose TEST id is absent from the FSD body fails", async () => {
  assertBlocked(await evaluate({ "docs/fsd.md": ["FSD-X#TEST-005", "FSD-X#TEST-009"] }), "verification-refs");
});

test("HIGH_INTERACTION passes with a runnable evidence line", async () => {
  const result = await evaluate({
    "docs/fsd.md": ["STANDARD", "HIGH_INTERACTION"],
    "docs/prd.md": ["## UI Experience Gate", "## UI Experience Gate\n\n- runnable prototype: https://example.test/proto revision r1"],
  });
  assert.equal(result.verdict, "READY_FOR_SLICE");
  assert.equal(result.profile, "HIGH_INTERACTION");
});

test("EXCEPTION_APPROVED baseline forbids active scale-out issues", async () => {
  const green = await evaluate({ "docs/prd.md": ["VALIDATED", "EXCEPTION_APPROVED"] });
  assert.equal(green.verdict, "READY_FOR_SLICE");
  assertBlocked(await evaluate({
    "docs/prd.md": ["VALIDATED", "EXCEPTION_APPROVED"],
    "issues/issue-003-scale-out.md": ["Status: blocked", "Status: ready-for-agent"],
  }), "scale-out");
});

test("dependency cycle fails the enablers gate", async () => {
  const result = await evaluate({ "issues/issue-001-enabler.md": ["Blocked by: None", "Blocked by: issue-004-hardening.md"] });
  assertBlocked(result, "enablers");
  assert.match(result.gates.find((gate) => gate.id === "enablers").detail, /WAVES_CYCLE_DETECTED/);
});

test("stale first-slice version is ignored, blocking-open line fails, second first slice fails", async () => {
  assertBlocked(await evaluate({ "docs/prd.md": ["## UI Experience Gate", "## UI Experience Gate\n\n- blocking OPEN-007 pending"] }), "open-blockers");
  assertBlocked(await evaluate({ "issues/issue-005-second.md": ISSUES["issues/issue-002-first-slice.md"] }), "first-slice");
});

test("NOT_APPLICABLE with reason and approver exits 0; without exits 1", async () => {
  const approved = runCli([...ARGS, "--root", fixture({ "docs/fsd.md": NA_FSD }), "--json"]);
  assert.equal(approved.code, 0, approved.stderr);
  const parsed = JSON.parse(approved.stdout);
  assert.equal(parsed.verdict, "NOT_APPLICABLE");
  assert.deepEqual(parsed.failures, []);
  assert.equal(parsed.gates.filter((gate) => gate.status === "skip").length, 12);

  const unapproved = runCli([...ARGS, "--root", fixture({ "docs/fsd.md": NA_FSD.replace("approved_by: Technical Manager", "approved_by: {{ROLE}}") })]);
  assert.equal(unapproved.code, 1);
  assert.match(unapproved.stdout, /^FAIL not-applicable /m);
  assert.match(unapproved.stdout, /verdict: NOT_APPLICABLE/);
});

test("missing manifest on a UI-bearing profile exits 2", () => {
  const result = runCli([...ARGS, "--root", fixture({ "docs/fsd.md": [MANIFEST, ""] })]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /no ui_api_contract manifest/);
});

test("usage errors and unreadable inputs exit 2", () => {
  assert.equal(runCli([]).code, 2);
  assert.match(runCli([]).stderr, /^usage: readiness-gate\.mjs --fsd/);
  assert.equal(runCli([...ARGS, "--bogus"]).code, 2);
  assert.equal(runCli([...ARGS.slice(0, 4)]).code, 2);
  const root = fixture();
  assert.equal(runCli([...ARGS, "--root", root, "--fsd", "../outside.md"]).code, 2);
  assert.equal(runCli([...ARGS, "--root", root, "--issues-dir", "nope"]).code, 2);
});
