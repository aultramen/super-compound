import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SESSIONS, durableToolUse, snapshotDurableFiles, stopMarkers, tokenTotals } from "./session-baseline.mjs";

test("tokenTotals sums modelUsage across models", () => {
  const result = {
    usage: { input_tokens: 0 },
    modelUsage: {
      "claude-fable-5-1": { inputTokens: 10, outputTokens: 20, cacheReadInputTokens: 300, cacheCreationInputTokens: 40 },
      "claude-sonnet-5": { inputTokens: 1, outputTokens: 2, cacheReadInputTokens: 3, cacheCreationInputTokens: 4 },
    },
  };
  assert.deepEqual(tokenTotals(result), { input: 11, output: 22, cacheRead: 303, cacheCreation: 44 });
  assert.deepEqual(tokenTotals(null), { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
});

test("session specs cover the three routes with the agreed models", () => {
  assert.deepEqual(
    SESSIONS.map((spec) => [spec.route, spec.model]),
    [
      ["status", "claude-sonnet-5"],
      ["debug", "claude-opus-5"],
      ["work", "claude-fable-5-1"],
    ],
  );
  for (const spec of SESSIONS) assert.ok(spec.budgetUsd > 0 && spec.maxTurns > 0);
});

test("stopMarkers extracts OPEN codes and handoff routes once each", () => {
  assert.deepEqual(
    stopMarkers("Stopped with OPEN-LOOP-AUTHORITY; OPEN-LOOP-AUTHORITY again. Run /sc-pause then /sc-compound."),
    ["/sc-compound", "/sc-pause", "OPEN-LOOP-AUTHORITY"],
  );
  assert.deepEqual(stopMarkers(undefined), []);
});

test("durableToolUse counts reads and writes on durable files once per tool_use id", () => {
  const block = (id, name, file_path) => ({ type: "tool_use", id, name, input: { file_path } });
  const lines = [
    JSON.stringify({ type: "assistant", message: { content: [block("a", "Read", "/p/docs/STATE.md"), block("b", "Edit", "/p/docs/STATE.md")] } }),
    JSON.stringify({ type: "assistant", message: { content: [block("b", "Edit", "/p/docs/STATE.md"), block("c", "Write", "/p/.continue-here.md"), block("d", "Read", "/p/src/sum.js")] } }),
    "not json",
  ];
  assert.deepEqual(durableToolUse(lines), {
    "docs/STATE.md": { read: 1, write: 1 },
    ".continue-here.md": { read: 0, write: 1 },
  });
});

test("snapshotDurableFiles records digest, Last updated, Next action, and entry counts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "session-baseline-"));
  try {
    await mkdir(path.join(root, "docs"));
    await writeFile(
      path.join(root, "docs/STATE.md"),
      "# Project State\nLast updated: 2026-09-03 09:00\n\n## Current Position\n- Next action: run `/sc-status`\n",
    );
    await writeFile(path.join(root, "docs/ERROR_LOG.md"), "## ERR-2026-09-01-001 - a\n## ERR-2026-09-01-002 - b\n");
    const snapshot = snapshotDurableFiles(root);
    assert.equal(snapshot["docs/STATE.md"].lastUpdated, "2026-09-03 09:00");
    assert.equal(snapshot["docs/STATE.md"].nextAction, "run `/sc-status`");
    assert.equal(snapshot["docs/ERROR_LOG.md"].errEntries, 2);
    assert.equal(snapshot[".continue-here.md"].exists, false);
    assert.match(snapshot["docs/STATE.md"].sha256, /^[0-9a-f]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
