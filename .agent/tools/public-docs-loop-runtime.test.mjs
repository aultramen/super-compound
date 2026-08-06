import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("TEST-017 public guide documents the exact Loop Runtime v2 operating contract", async () => {
  const guide = await read("docs/loop-runtime-v2.md");
  for (const marker of [
    ".agent/context/project-config.json",
    "DISABLED",
    "OBSERVE",
    "ENFORCE",
    "HALTED",
    "max_iterations",
    "max_runtime_minutes",
    "max_no_progress_iterations",
    "max_tokens",
    "max_cost",
    "START",
    "RESUME",
    "Confirm",
    "Cancel",
    "null",
    "approval",
    "ACTION_INTENDED",
    "APPROVAL_REQUIRED",
    "18",
    "workflow_invariants_v2",
  ]) {
    assert.match(guide, new RegExp(marker, "i"), `guide marker: ${marker}`);
  }
  assert.match(guide, /hooks? (?:are|remain) advisory/iu);
  assert.match(guide, /no (?:public )?`?\/loop`? route/iu);
  assert.match(guide, /does not (?:provide|claim).*(?:daemon|recurring|vendor)/iu);
  assert.match(guide, /null.*does not.*(?:remove|disable).*(?:project|FSD|operation)/isu);
});

test("TEST-017 entrypoints, rules, agents, hooks, walkthrough, and archive stay synchronized", async () => {
  const linked = [
    "README.md",
    "SUPER-COMPOUND.md",
    "WALKTHROUGH.md",
    "AGENTS.md",
    ".agent/rules/super-compound.md",
  ];
  for (const path of linked) {
    assert.match(
      await read(path),
      /docs\/loop-runtime-v2\.md/iu,
      `${path} must link the canonical guide`,
    );
  }

  const projectConfig = await read(".agent/rules/project-config.md");
  assert.match(projectConfig, /\.agent\/context\/project-config\.json/iu);
  assert.match(projectConfig, /machine (?:authority|authoritative)/iu);
  assert.match(projectConfig, /human (?:guide|guidance)/iu);

  const quality = await read(".agent/rules/quality-gates.md");
  assert.match(quality, /Budget & Stop Wizard/iu);
  assert.match(quality, /before.*(?:source|implementation).*write/isu);

  const hooks = await read(".agent/hooks/README.md");
  assert.match(hooks, /advisory/iu);
  assert.match(hooks, /controller.*hard enforcement/isu);

  const archive = await read("docs/archive/2026-06-20-gap-analysis.md");
  assert.match(archive, /^# Archived, Non-Authoritative Evidence/iu);
  assert.match(archive, /\/loop.*(?:removed|not a public route)/isu);
});

test("TEST-017 documentation claims exactly the machine-authoritative 18-route surface", async () => {
  const manifest = JSON.parse(await read(".agent/context/workflow-invariants.json"));
  assert.equal(manifest.schema, "workflow_invariants_v2");
  assert.equal(Object.keys(manifest.routes).length, 18);
  assert.equal(Object.hasOwn(manifest.routes, "loop"), false);

  const workflows = (await readdir(new URL(".agent/workflows/", root)))
    .filter((name) => /^sc-.*\.md$/u.test(name))
    .sort();
  const contracts = (await readdir(new URL(".agent/context/workflows/", root)))
    .filter((name) => /^sc-.*\.contract\.md$/u.test(name))
    .sort();
  assert.equal(workflows.length, 18);
  assert.equal(contracts.length, 18);
});
