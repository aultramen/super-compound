#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillAuthoringDir = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.dirname(skillAuthoringDir);
const skillNames = [
  "writing-plans",
  "knowledge-compounding",
  "eval-harness",
  "checkpoint-protocol",
  "skill-authoring",
  "prd-generator",
  "state-management",
];

const criticalMarkers = {
  "writing-plans": [
    /vertical slice/i,
    /wide refactor/i,
    /shared seam/i,
    /callers/i,
    /verification/i,
    /OPEN-*/,
  ],
  "knowledge-compounding": [
    /docs\/solutions/i,
    /search before/i,
    /root cause/i,
    /prevention/i,
    /three|3\+/i,
  ],
  "eval-harness": [
    /before implementation/i,
    /deterministic grader/i,
    /pass@k/i,
    /pass\^3/i,
  ],
  "checkpoint-protocol": [
    /needs_info/,
    /needs_decision/,
    /needs_confirmation/,
    /needs_testing/,
    /needs_credentials/,
    /needs_deployment_action/,
    /needs_review/,
    /one checkpoint at a time/i,
  ],
  "skill-authoring": [
    /RED/,
    /GREEN/,
    /REFACTOR/,
    /pressure/i,
    /description.*when/i,
  ],
  "prd-generator": [
    /approved BRD/i,
    /qualified/i,
    /must not invent.*technical|do not define.*technical/i,
    /vertical/i,
    /OPEN-*/,
  ],
  "state-management": [
    /quick reference/i,
    /search before load/i,
    /dedupe/i,
    /superseded/i,
    /archive gate/i,
    /\b(20|30|40|50|100)\b/,
  ],
};

function readSkill(name) {
  return readFileSync(path.join(skillsRoot, name, "SKILL.md"), "utf8");
}

for (const name of skillNames) {
  test(`${name} is a progressive router with valid references`, () => {
    const body = readSkill(name);
    const wordCount = body.match(/\S+/g)?.length ?? 0;
    assert.ok(wordCount <= 500, `${name}: ${wordCount} words exceeds 500`);
    assert.match(body, /^description:\s*["']?Use when/im);

    for (const heading of [
      "## When to Use",
      "## Route",
      "## Invariants",
      "## Red Flags",
      "## Integration",
    ]) {
      assert.ok(body.includes(heading), `${name}: missing ${heading}`);
    }

    const references = [
      ...body.matchAll(/\]\((references\/[^)#]+\.md)(?:#[^)]+)?\)/g),
    ].map((match) => match[1]);
    assert.ok(references.length > 0, `${name}: no progressive references linked`);
    for (const relative of references) {
      assert.ok(
        existsSync(path.join(skillsRoot, name, relative)),
        `${name}: missing ${relative}`,
      );
    }

    for (const marker of criticalMarkers[name]) {
      assert.match(body, marker, `${name}: missing critical marker ${marker}`);
    }
  });
}
