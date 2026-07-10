import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { analyzeTranscript } from "./transcript-usage.mjs";

test("analyzeTranscript separates main and subagent token usage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "session.jsonl");

  try {
    await writeFile(
      transcript,
      [
        JSON.stringify({
          type: "assistant",
          message: {
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_creation_input_tokens: 2,
              cache_read_input_tokens: 3,
            },
          },
        }),
        "not-json",
        JSON.stringify({
          type: "user",
          toolUseResult: {
            agentId: "agent-1",
            prompt: "must not appear in report",
            usage: {
              input_tokens: 7,
              output_tokens: 4,
              cache_creation_input_tokens: 1,
              cache_read_input_tokens: 2,
            },
          },
        }),
        "",
      ].join("\n"),
    );

    const report = await analyzeTranscript(transcript);

    assert.deepEqual(report.main, {
      messages: 1,
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationTokens: 2,
      cacheReadTokens: 3,
    });
    assert.equal(report.subagents["agent-1"].inputTokens, 7);
    assert.deepEqual(report.totals, {
      messages: 2,
      inputTokens: 17,
      outputTokens: 9,
      cacheCreationTokens: 3,
      cacheReadTokens: 5,
      totalInputTokens: 25,
      totalTokens: 34,
    });
    assert.equal(JSON.stringify(report).includes("must not appear"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analyzeTranscript enforces a file-size cap", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "large.jsonl");

  try {
    await writeFile(transcript, "x".repeat(101));
    await assert.rejects(
      analyzeTranscript(transcript, { maxBytes: 100 }),
      /exceeds 100 bytes/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analyzeTranscript rejects transcripts without supported usage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "unsupported.jsonl");

  try {
    await writeFile(transcript, 'not-json\n{"type":"assistant","message":{}}\n');
    await assert.rejects(
      analyzeTranscript(transcript),
      /no supported token usage records/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
