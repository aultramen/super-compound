#!/usr/bin/env node
// Wave 4 measurement harness: seed a throwaway project, run three headless
// Claude Code sessions against it, and record token, read-back, and durable
// state metrics per session. Deterministic apart from the sessions themselves.
//
//   node .agent/tools/session-baseline.mjs seed [--dir <dir>] [--force]
//   node .agent/tools/session-baseline.mjs run --label <label> [--dir <dir>] [--only status,debug,work]
//   node .agent/tools/session-baseline.mjs report [--dir <dir>] [--out <markdown>]
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeTranscript } from "./transcript-usage.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_DIR = ".scratch/baseline-2026-09-03";
const DEFAULT_REPORT = "docs/eval-results/2026-09-03-wave4-baseline.md";
const FRAMEWORK_FILES = [".agent", ".claude", "CLAUDE.md", "AGENTS.md", "SUPER-COMPOUND.md"];
const DURABLE_FILES = [
  "docs/STATE.md",
  ".continue-here.md",
  "docs/progress.md",
  "docs/ERROR_LOG.md",
  "docs/LEARNED_KNOWLEDGE.md",
];
const SESSION_TIMEOUT_MS = 45 * 60 * 1000;
// Headless `-p` sessions cannot answer permission prompts: a denied Bash call
// hides exactly the behavior being measured (knowledge-search, memory
// maintenance, npm test). The project is a throwaway copy, so permissions are
// bypassed for every session; read-only intent stays a property of the route.
const PERMISSION = ["--dangerously-skip-permissions"];

export const SESSIONS = Object.freeze([
  {
    route: "status",
    prompt: "/sc-status",
    model: "claude-sonnet-5",
    permission: PERMISSION,
    maxTurns: 25,
    budgetUsd: 2,
  },
  {
    route: "debug",
    prompt: "/sc-debug npm test fails: test/sum.test.js expects sum(2, 3) to equal 5",
    model: "claude-opus-5",
    permission: PERMISSION,
    maxTurns: 40,
    budgetUsd: 8,
  },
  {
    route: "work",
    prompt: "/sc-work .scratch/dummy/issues/01-sum-returns-sum.md",
    model: "claude-fable-5-1",
    permission: PERMISSION,
    maxTurns: 60,
    budgetUsd: 12,
  },
]);

// ---------------------------------------------------------------- seed

function seedFiles(today) {
  const stamp = `${today} 09:00`;
  return {
    "package.json": `${JSON.stringify({ name: "baseline-dummy", private: true, scripts: { test: "node --test" } }, null, 2)}\n`,
    "src/sum.js": "module.exports = (a, b) => a - b;\n",
    "test/sum.test.js": [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const sum = require("../src/sum.js");',
      "",
      'test("sum adds its arguments", () => {',
      "  assert.equal(sum(2, 3), 5);",
      "});",
      "",
    ].join("\n"),
    ".gitignore": ".agent/.compact-state/\nnode_modules/\n",
    ".continue-here.md": [
      "# Continue Here",
      "- State: docs/STATE.md",
      "- Next action: run `/sc-status` to select the next route",
      "- Authoritative artifacts: .scratch/dummy/issues/",
      "",
    ].join("\n"),
    "docs/STATE.md": [
      "# Project State",
      `Last updated: ${stamp}`,
      "",
      "## Current Position",
      "- Workflow: none",
      "- Active task: none",
      "- Next action: run `/sc-status`",
      "- Branch/workspace: main",
      "",
      "## Active Loop Run",
      "- Run: none",
      "",
      "## Decisions",
      `- ${today}: seeded baseline project; src/sum.js carries a known sign-flip bug for /sc-debug`,
      "",
      "## Completed Work",
      `- ${today}: seed project, knowledge files, and GOAL-001 pointer`,
      "",
    ].join("\n"),
    "docs/progress.md": [
      "# Progress Log",
      "",
      "## Codebase Patterns",
      "- Tests run with `npm test` (node:test); `src/*.js` stay CommonJS",
      "",
      "---",
      "",
      `## ${stamp} - seed`,
      "- Implemented: baseline dummy project",
      "- Files: src/sum.js, test/sum.test.js, docs/",
      "- Verification: `npm test` fails on purpose (1 test)",
      "",
    ].join("\n"),
    "docs/ERROR_LOG.md": [
      "# Error Log",
      "",
      "Costly mistakes with root cause, correction, and an IF-THEN prevention rule.",
      "Contract: `.agent/skills/state-management/references/file-contracts.md`.",
      "",
      "## Quick Reference",
      "",
      "| ID | Category | Prevention rule (IF-THEN) |",
      "| --- | --- | --- |",
      "| ERR-2026-09-01-002 | test runner | IF a test file fails to load THEN run it with `node --test`, not plain node |",
      "| ERR-2026-09-01-001 | arithmetic sign flip | IF a math helper fails a test THEN check the operator in src/sum.js before touching the test |",
      "",
      "---",
      "",
      "## ERR-2026-09-01-001 - arithmetic sign flip",
      "- Symptom: `sum(2, 3)` returned -1 and test/sum.test.js failed.",
      "- Root cause: src/sum.js used `a - b`.",
      "- Correct approach: return `a + b`; keep the test unchanged.",
      "- Prevention: IF a math helper fails a test THEN check the operator in src/sum.js before touching the test.",
      "- Files: src/sum.js",
      "",
      "## ERR-2026-09-01-002 - test runner",
      "- Symptom: `node test/sum.test.js` printed nothing and exited 0.",
      "- Root cause: node:test files need the `--test` runner to report results.",
      "- Correct approach: run `npm test`, which calls `node --test`.",
      "- Prevention: IF a test file fails to load THEN run it with `node --test`, not plain node.",
      "- Files: package.json",
      "",
    ].join("\n"),
    "docs/LEARNED_KNOWLEDGE.md": [
      "# Learned Knowledge",
      "",
      "Confirmed reusable preferences, conventions, and patterns.",
      "Contract: `.agent/skills/state-management/references/file-contracts.md`.",
      "",
      "## Quick Reference",
      "",
      "| ID | Scope | Confidence | Action rule (IF-THEN) |",
      "| --- | --- | --- | --- |",
      "| LRN-2026-09-01-002 | project | confirmed | IF adding a source file THEN keep it CommonJS (`module.exports`) |",
      "| LRN-2026-09-01-001 | project | confirmed | IF verifying behavior THEN run `npm test` (node:test) |",
      "",
      "---",
      "",
      "## LRN-2026-09-01-001 - test command",
      "- Learning: the project runs tests with `npm test`, which maps to `node --test`.",
      "- Confidence: confirmed",
      "- Applies to: project",
      "- Action rule: IF verifying behavior THEN run `npm test` (node:test).",
      "",
      "## LRN-2026-09-01-002 - module style",
      "- Learning: source files are CommonJS; ESM syntax breaks the test runner setup.",
      "- Confidence: confirmed",
      "- Applies to: project",
      "- Action rule: IF adding a source file THEN keep it CommonJS (`module.exports`).",
      "",
    ].join("\n"),
    ".scratch/dummy/issues/01-sum-returns-sum.md": [
      "# GOAL-001 - sum returns the sum of its arguments",
      "",
      "Artifact contract version: `2.0.0`",
      "Status: ready-for-agent",
      "Parent FSD: ../../../docs/fsd/fsd-dummy.md",
      "Goal ID: FSD-DUMMY#GOAL-001",
      "Blocked by: None",
      "Upstream refs: BRD-DUMMY#BREQ-001, PRD-DUMMY#FR-001",
      "Technical refs: FSD-DUMMY#TDEC-001",
      "ADR refs: None",
      "Verification refs: FSD-DUMMY#TEST-001",
      "UI delivery role: NOT_APPLICABLE",
      "Contract refs: None",
      "Contract gate: NOT_APPLICABLE",
      "",
    ].join("\n"),
  };
}

function seed(dir, { force = false } = {}) {
  const seedDir = path.join(dir, "seed");
  if (fs.existsSync(seedDir)) {
    if (!force) throw new Error(`${seedDir} exists; pass --force to rebuild`);
    fs.rmSync(seedDir, { recursive: true, force: true });
  }
  fs.mkdirSync(seedDir, { recursive: true });
  for (const name of FRAMEWORK_FILES) {
    fs.cpSync(path.join(REPO_ROOT, name), path.join(seedDir, name), {
      recursive: true,
      dereference: true,
      filter: (source) => !source.includes(`${path.sep}.compact-state`),
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const [relative, content] of Object.entries(seedFiles(today))) {
    const target = path.join(seedDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  const git = (...args) =>
    run("git", ["-c", "user.name=baseline", "-c", "user.email=baseline@example.invalid", ...args], seedDir);
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "seed baseline project");
  const check = run("node", [path.join(REPO_ROOT, ".agent/tools/memory-maintenance.mjs"), "check", "--root", seedDir], REPO_ROOT);
  const report = run("node", [path.join(REPO_ROOT, ".agent/tools/memory-maintenance.mjs"), "report", "--json", "--root", seedDir], REPO_ROOT);
  return { seedDir, today, memoryCheck: check.trim(), freshness: JSON.parse(report).freshness ?? null };
}

// ---------------------------------------------------------------- run

function resetProject(dir) {
  const seedDir = path.join(dir, "seed");
  const projDir = path.join(dir, "proj");
  if (!fs.existsSync(seedDir)) throw new Error(`missing ${seedDir}; run seed first`);
  fs.rmSync(projDir, { recursive: true, force: true });
  fs.cpSync(seedDir, projDir, { recursive: true });
  return projDir;
}

export function snapshotDurableFiles(projDir) {
  const files = {};
  for (const relative of DURABLE_FILES) {
    const target = path.join(projDir, relative);
    if (!fs.existsSync(target)) {
      files[relative] = { exists: false };
      continue;
    }
    const text = fs.readFileSync(target, "utf8");
    files[relative] = {
      exists: true,
      sha256: createHash("sha256").update(text).digest("hex"),
      lastUpdated: text.match(/^Last updated:\s*(.+)$/mu)?.[1] ?? null,
      nextAction: text.match(/^- Next action:\s*(.+)$/mu)?.[1] ?? null,
      errEntries: (text.match(/^## ERR-\d{4}-\d{2}-\d{2}-\d+/gmu) ?? []).length,
      lrnEntries: (text.match(/^## LRN-\d{4}-\d{2}-\d{2}-\d+/gmu) ?? []).length,
    };
  }
  return files;
}

export function stopMarkers(text) {
  if (typeof text !== "string") return [];
  const markers = new Set();
  for (const match of text.matchAll(/\bOPEN-[A-Z0-9][A-Z0-9-]*/gu)) markers.add(match[0]);
  if (/\/sc-pause\b/u.test(text)) markers.add("/sc-pause");
  if (/\/sc-compound\b/u.test(text)) markers.add("/sc-compound");
  return [...markers].sort();
}

const WRITE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export function durableToolUse(lines) {
  const counts = {};
  const seen = new Set();
  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.type !== "assistant" || !Array.isArray(entry.message?.content)) continue;
    for (const block of entry.message.content) {
      if (!block || block.type !== "tool_use") continue;
      if (typeof block.id === "string") {
        if (seen.has(block.id)) continue;
        seen.add(block.id);
      }
      const target = String(block.input?.file_path ?? block.input?.path ?? "").replace(/\\/g, "/");
      const durable = DURABLE_FILES.find((name) => target.endsWith(name));
      if (!durable) continue;
      const op = block.name === "Read" ? "read" : WRITE_TOOLS.has(block.name) ? "write" : null;
      if (!op) continue;
      counts[durable] ??= { read: 0, write: 0 };
      counts[durable][op] += 1;
    }
  }
  return counts;
}

function findTranscript(sessionId) {
  const projects = path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(projects)) return null;
  for (const entry of fs.readdirSync(projects, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(projects, entry.name, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function childEnv(projDir) {
  const env = { ...process.env, SUPER_COMPOUND_PROJECT_ROOT: projDir };
  for (const key of Object.keys(env)) {
    if (key === "CLAUDECODE" || key.startsWith("CLAUDE_CODE_")) delete env[key];
  }
  return env;
}

async function runSession(dir, label, spec) {
  const projDir = resetProject(dir);
  const runsDir = path.join(dir, "runs", label);
  fs.mkdirSync(runsDir, { recursive: true });
  const sessionId = randomUUID();
  const before = snapshotDurableFiles(projDir);
  const args = [
    "-p",
    spec.prompt,
    "--model",
    spec.model,
    "--output-format",
    "json",
    "--session-id",
    sessionId,
    "--max-turns",
    String(spec.maxTurns),
    "--max-budget-usd",
    String(spec.budgetUsd),
    ...spec.permission,
  ];
  const startedAt = Date.now();
  const child = spawnSync("claude", args, {
    cwd: projDir,
    env: childEnv(projDir),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: SESSION_TIMEOUT_MS,
  });
  const wallMs = Date.now() - startedAt;
  fs.writeFileSync(path.join(runsDir, `${spec.route}.stdout.txt`), child.stdout ?? "", "utf8");
  fs.writeFileSync(path.join(runsDir, `${spec.route}.stderr.txt`), child.stderr ?? "", "utf8");
  let result = null;
  try {
    result = JSON.parse(child.stdout);
  } catch {
    result = null;
  }
  const after = snapshotDurableFiles(projDir);

  const transcriptSource = findTranscript(sessionId);
  let transcript = { found: false };
  if (transcriptSource) {
    const copy = path.join(runsDir, `${spec.route}.transcript.jsonl`);
    fs.copyFileSync(transcriptSource, copy);
    const lines = fs.readFileSync(copy, "utf8").split("\n");
    let usage = null;
    try {
      usage = await analyzeTranscript(copy);
    } catch (error) {
      usage = { error: error.message };
    }
    const byAsset = usage?.assetReads?.byAsset ?? {};
    transcript = {
      found: true,
      totals: usage?.totals ?? null,
      contractReads: Object.entries(byAsset)
        .filter(([key]) => key.startsWith(".agent/context/workflows/"))
        .reduce((sum, [, count]) => sum + count, 0),
      knowledgeSearchCalls: byAsset[".agent/tools/knowledge-search.mjs"] ?? 0,
      memoryMaintenanceCalls: byAsset[".agent/tools/memory-maintenance.mjs"] ?? 0,
      durableToolUse: durableToolUse(lines),
      byAsset,
    };
  }

  const changed = {};
  for (const name of DURABLE_FILES) {
    changed[name] = before[name]?.sha256 !== after[name]?.sha256;
  }
  const entriesAppended =
    (after["docs/ERROR_LOG.md"]?.errEntries ?? 0) - (before["docs/ERROR_LOG.md"]?.errEntries ?? 0) +
    (after["docs/LEARNED_KNOWLEDGE.md"]?.lrnEntries ?? 0) - (before["docs/LEARNED_KNOWLEDGE.md"]?.lrnEntries ?? 0);

  const metrics = {
    schema: "session_baseline_metrics_v1",
    label,
    route: spec.route,
    model: spec.model,
    sessionId,
    exitStatus: child.status,
    timedOut: child.error?.code === "ETIMEDOUT",
    wallMs,
    result: result
      ? {
          subtype: result.subtype ?? null,
          isError: result.is_error ?? null,
          numTurns: result.num_turns ?? null,
          totalCostUsd: result.total_cost_usd ?? null,
          durationMs: result.duration_ms ?? null,
          usage: result.usage ?? null,
          modelUsage: result.modelUsage ?? null,
          stoppedWith: stopMarkers(result.result),
        }
      : null,
    transcript,
    files: { before, after, changed, entriesAppended },
  };
  fs.writeFileSync(path.join(runsDir, `${spec.route}.metrics.json`), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  return metrics;
}

// Each label measures the framework as it is now: the framework files in the
// seed are replaced from the repository and committed, while the dummy project,
// knowledge files, and git history stay as seeded.
function syncFrameworkIntoSeed(dir, label) {
  const seedDir = path.join(dir, "seed");
  if (!fs.existsSync(seedDir)) throw new Error(`missing ${seedDir}; run seed first`);
  for (const name of FRAMEWORK_FILES) {
    fs.rmSync(path.join(seedDir, name), { recursive: true, force: true });
    fs.cpSync(path.join(REPO_ROOT, name), path.join(seedDir, name), {
      recursive: true,
      dereference: true,
      filter: (source) => !source.includes(`${path.sep}.compact-state`),
    });
  }
  const git = (...args) =>
    spawnSync("git", ["-c", "user.name=baseline", "-c", "user.email=baseline@example.invalid", ...args], {
      cwd: seedDir,
      encoding: "utf8",
    });
  git("add", "-A");
  const status = git("status", "--porcelain").stdout.trim();
  if (status) git("commit", "-q", "-m", `framework sync for ${label}`);
  return status ? "synced" : "unchanged";
}

async function runAll(dir, label, only) {
  if (!label) throw new Error("run requires --label <label>");
  const frameworkSync = syncFrameworkIntoSeed(dir, label);
  const selected = SESSIONS.filter((spec) => !only || only.includes(spec.route));
  const runsDir = path.join(dir, "runs", label);
  fs.mkdirSync(runsDir, { recursive: true });
  const summary = {
    schema: "session_baseline_summary_v1",
    label,
    startedAt: new Date().toISOString(),
    repoHead: run("git", ["rev-parse", "--short", "HEAD"], REPO_ROOT).trim(),
    dirtyFiles: run("git", ["status", "--short"], REPO_ROOT).split("\n").filter(Boolean).length,
    frameworkSync,
    sessions: [],
  };
  for (const spec of selected) {
    process.stderr.write(`[baseline] ${label}/${spec.route} (${spec.model}) ...\n`);
    const metrics = await runSession(dir, label, spec);
    summary.sessions.push(summarize(metrics));
    process.stderr.write(`[baseline] ${label}/${spec.route} done in ${Math.round(metrics.wallMs / 1000)}s exit=${metrics.exitStatus}\n`);
    fs.writeFileSync(path.join(runsDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}

// The headless result's top-level `usage` can be all zeros; `modelUsage` holds
// the per-model counts, so tokens are summed from there.
export function tokenTotals(result) {
  const totals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  for (const usage of Object.values(result?.modelUsage ?? {})) {
    totals.input += usage.inputTokens ?? 0;
    totals.output += usage.outputTokens ?? 0;
    totals.cacheRead += usage.cacheReadInputTokens ?? 0;
    totals.cacheCreation += usage.cacheCreationInputTokens ?? 0;
  }
  return totals;
}

function summarize(metrics) {
  const tokens = tokenTotals(metrics.result);
  const stateChanged = metrics.files.changed["docs/STATE.md"] || metrics.files.changed[".continue-here.md"];
  return {
    route: metrics.route,
    model: metrics.model,
    models: Object.keys(metrics.result?.modelUsage ?? {}),
    inputTokens: metrics.result ? tokens.input : null,
    outputTokens: metrics.result ? tokens.output : null,
    cacheReadTokens: metrics.result ? tokens.cacheRead : null,
    contractReads: metrics.transcript.contractReads ?? null,
    knowledgeSearchCalls: metrics.transcript.knowledgeSearchCalls ?? null,
    memoryMaintenanceCalls: metrics.transcript.memoryMaintenanceCalls ?? null,
    stateChanged,
    entriesAppended: metrics.files.entriesAppended,
    stoppedWith: metrics.result?.stoppedWith ?? [],
    wallSeconds: Math.round(metrics.wallMs / 1000),
    costUsd: metrics.result?.totalCostUsd ?? null,
    exitStatus: metrics.exitStatus,
  };
}

// ---------------------------------------------------------------- report

// Transcript-derived counts are recomputed from the saved transcripts so an
// attribution fix in transcript-usage.mjs applies to every recorded label.
async function refreshTranscriptCounts(runsDir, label, summary) {
  let changed = false;
  for (const session of summary.sessions) {
    const transcript = path.join(runsDir, label, `${session.route}.transcript.jsonl`);
    if (!fs.existsSync(transcript)) continue;
    let usage;
    try {
      usage = await analyzeTranscript(transcript);
    } catch {
      continue;
    }
    const byAsset = usage.assetReads?.byAsset ?? {};
    const next = {
      contractReads: Object.entries(byAsset)
        .filter(([key]) => key.startsWith(".agent/context/workflows/"))
        .reduce((sum, [, count]) => sum + count, 0),
      knowledgeSearchCalls: byAsset[".agent/tools/knowledge-search.mjs"] ?? 0,
      memoryMaintenanceCalls: byAsset[".agent/tools/memory-maintenance.mjs"] ?? 0,
    };
    for (const [key, value] of Object.entries(next)) {
      if (session[key] !== value) {
        session[key] = value;
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(path.join(runsDir, label, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
}

async function report(dir, outPath) {
  const runsDir = path.join(dir, "runs");
  if (!fs.existsSync(runsDir)) throw new Error(`missing ${runsDir}`);
  const labels = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(runsDir, entry.name, "summary.json")))
    .map((entry) => entry.name)
    .sort((a, b) => labelOrder(a) - labelOrder(b) || a.localeCompare(b));
  const rows = [];
  for (const label of labels) {
    const summary = JSON.parse(fs.readFileSync(path.join(runsDir, label, "summary.json"), "utf8"));
    await refreshTranscriptCounts(runsDir, label, summary);
    for (const session of summary.sessions) {
      rows.push(
        `| ${label} | ${session.route} | ${session.inputTokens ?? "?"} | ${session.outputTokens ?? "?"} | ${session.cacheReadTokens ?? "?"} | ${session.contractReads ?? "?"} | ${session.knowledgeSearchCalls ?? "?"} | ${session.memoryMaintenanceCalls ?? "?"} | ${session.stateChanged ? "yes" : "no"} | ${session.entriesAppended} | ${session.stoppedWith.join(" ") || "-"} | ${session.wallSeconds} |`,
      );
    }
  }
  const markdown = [
    "# Wave 4 Session Baseline",
    "",
    `Headless sessions per label (\`.agent/tools/session-baseline.mjs\`; raw data in ${path.relative(REPO_ROOT, dir)}/runs). ks/mm = knowledge-search/memory-maintenance calls; STATE = STATE.md or .continue-here.md changed; s = wall seconds. n=1 per cell: read deltas as direction, not proof.`,
    "",
    "| Label | Route | In | Out | Cache read | Contract reads | ks | mm | STATE | ERR+LRN | Stop | s |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, "utf8");
  return { outPath, labels, rows: rows.length };
}

function labelOrder(label) {
  const order = ["baseline", "after-A", "after-B", "after-C"];
  const index = order.indexOf(label);
  return index === -1 ? order.length : index;
}

// ---------------------------------------------------------------- cli

function run(command, args, cwd) {
  const child = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (child.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${child.stderr || child.stdout}`);
  }
  return child.stdout;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { dir: DEFAULT_DIR, out: DEFAULT_REPORT, force: false, label: null, only: null };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--dir") options.dir = rest[++index];
    else if (arg === "--out") options.out = rest[++index];
    else if (arg === "--label") options.label = rest[++index];
    else if (arg === "--only") options.only = rest[++index].split(",").map((value) => value.trim());
    else if (arg === "--force") options.force = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return { command, options };
}

export async function main(argv) {
  const { command, options } = parseArgs(argv);
  const dir = path.resolve(REPO_ROOT, options.dir);
  if (command === "seed") {
    console.log(JSON.stringify(seed(dir, { force: options.force }), null, 2));
    return 0;
  }
  if (command === "run") {
    const summary = await runAll(dir, options.label, options.only);
    console.log(JSON.stringify(summary, null, 2));
    return summary.sessions.every((session) => session.exitStatus === 0) ? 0 : 1;
  }
  if (command === "report") {
    console.log(JSON.stringify(await report(dir, path.resolve(REPO_ROOT, options.out)), null, 2));
    return 0;
  }
  console.error("usage: session-baseline.mjs <seed [--force] | run --label <label> [--only a,b] | report [--out <md>]> [--dir <dir>]");
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(2);
    },
  );
}
