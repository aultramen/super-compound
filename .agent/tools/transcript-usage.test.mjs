import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { aggregateUsageLog, analyzeTranscript } from "./transcript-usage.mjs";

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
              reasoning_tokens: 4,
              cache_creation_input_tokens: 2,
              cache_read_input_tokens: 3,
            },
          },
        }),
        JSON.stringify({
          type: "user",
          toolUseResult: {
            agentId: "agent-1",
            prompt: "must not appear in report",
            usage: {
              input_tokens: 7,
              output_tokens: 4,
              reasoning_tokens: 1,
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
      measurement: "MEASURED",
      inputTokens: 10,
      outputTokens: 5,
      reasoningTokens: 4,
      cacheCreationTokens: 2,
      cacheReadTokens: 3,
      cachedInputTokens: 5,
      conservativeTokens: 24,
    });
    const contributorRef = `sha256:${createHash("sha256")
      .update("super-compound:transcript-contributor:v2\0agent-1")
      .digest("hex")}`;
    assert.equal(report.subagents[contributorRef].inputTokens, 7);
    assert.deepEqual(report.totals, {
      messages: 2,
      measurement: "MEASURED",
      inputTokens: 17,
      outputTokens: 9,
      reasoningTokens: 5,
      cacheCreationTokens: 3,
      cacheReadTokens: 5,
      cachedInputTokens: 8,
      totalInputTokens: 25,
      totalTokens: 39,
    });
    assert.equal(report.schema, "transcript_token_usage_v2");
    assert.equal(report.diagnostics.completeness, "COMPLETE");
    assert.equal(JSON.stringify(report).includes("must not appear"), false);
    assert.equal(JSON.stringify(report).includes("agent-1"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 usage-bearing child without identity is unattributed and PARTIAL", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "unattributed.jsonl");
  try {
    await writeFile(
      transcript,
      `${JSON.stringify({
        type: "user",
        toolUseResult: {
          usage: {
            input_tokens: 7,
            output_tokens: 4,
            reasoning_tokens: 1,
            cache_creation_input_tokens: 1,
            cache_read_input_tokens: 2,
          },
        },
      })}\n`,
    );
    const report = await analyzeTranscript(transcript);
    assert.equal(report.diagnostics.usageRecords, 1);
    assert.equal(report.diagnostics.unattributedUsageRecords, 1);
    assert.equal(report.diagnostics.completeness, "PARTIAL");
    assert.equal(report.totals.measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
    assert.equal(report.unattributed.inputTokens, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 incomplete child usage preserves unknown aggregate attribution", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "partial-child.jsonl");
  try {
    await writeFile(
      transcript,
      `${JSON.stringify({
        type: "user",
        toolUseResult: {
          agentId: "agent-2",
          usage: {
            input_tokens: 7,
            output_tokens: 4,
            cache_creation_input_tokens: 1,
            cache_read_input_tokens: 2,
          },
        },
      })}\n`,
    );
    const report = await analyzeTranscript(transcript);
    const contributorRef = `sha256:${createHash("sha256")
      .update("super-compound:transcript-contributor:v2\0agent-2")
      .digest("hex")}`;
    assert.equal(report.subagents[contributorRef].reasoningTokens, null);
    assert.equal(report.subagents[contributorRef].conservativeTokens, null);
    assert.equal(report.subagents[contributorRef].measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
    assert.equal(report.diagnostics.completeness, "PARTIAL");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 sensitive contributor identifiers fail closed without echo", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "sensitive-child.jsonl");
  try {
    for (const canary of ["alice@example.com", "sk-abcdefghijklmnopqrs"]) {
      await writeFile(
        transcript,
        `${JSON.stringify({
          type: "user",
          toolUseResult: {
            agentId: canary,
            usage: {
              input_tokens: 1,
              output_tokens: 1,
              reasoning_tokens: 1,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
            },
          },
        })}\n`,
      );
      await assert.rejects(analyzeTranscript(transcript), (error) => {
        assert.match(error.message, /PRIVACY_STOP/i);
        assert.equal(error.message.includes(canary), false);
        return true;
      });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 transcript gaps remain unknown instead of becoming zero", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "partial.jsonl");

  try {
    await writeFile(
      transcript,
      [
        JSON.stringify({
          type: "assistant",
          message: {
            usage: {
              input_tokens: 0,
              output_tokens: 0,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
            },
          },
        }),
        "not-json",
      ].join("\n"),
    );

    const report = await analyzeTranscript(transcript);
    assert.equal(report.main.reasoningTokens, null);
    assert.equal(report.main.conservativeTokens, null);
    assert.equal(report.main.measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
    assert.equal(report.totals.measurement, "UNMEASURED");
    assert.equal(report.diagnostics.completeness, "PARTIAL");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 unsupported usage-bearing records make aggregate attribution partial", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "future-provider.jsonl");
  const usage = {
    input_tokens: 7,
    output_tokens: 3,
    reasoning_tokens: 2,
    cache_creation_input_tokens: 1,
    cache_read_input_tokens: 1,
  };
  try {
    await writeFile(
      transcript,
      `${JSON.stringify({ type: "assistant", message: { usage } })}\n${JSON.stringify({ type: "future-provider", payload: { usage } })}\n`,
    );
    const report = await analyzeTranscript(transcript);
    assert.equal(report.diagnostics.unaccountedUsageRecords, 1);
    assert.equal(report.diagnostics.completeness, "PARTIAL");
    assert.equal(report.totals.measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 mixed supported and unknown usage payloads remain partial", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "mixed-provider.jsonl");
  const usage = {
    input_tokens: 7,
    output_tokens: 3,
    reasoning_tokens: 2,
    cache_creation_input_tokens: 1,
    cache_read_input_tokens: 1,
  };
  try {
    await writeFile(
      transcript,
      `${JSON.stringify({
        type: "assistant",
        message: { usage },
        providerMetadata: { usage },
      })}\n`,
    );
    const report = await analyzeTranscript(transcript);
    assert.equal(report.diagnostics.usageRecords, 1);
    assert.equal(report.diagnostics.unaccountedUsageRecords, 1);
    assert.equal(report.diagnostics.completeness, "PARTIAL");
    assert.equal(report.totals.measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TEST-010 nested usage arrays cannot bypass aggregate attribution", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const transcript = path.join(root, "nested-array-provider.jsonl");
  const usage = {
    input_tokens: 1,
    output_tokens: 1,
    reasoning_tokens: 1,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
  try {
    await writeFile(
      transcript,
      `${JSON.stringify({
        type: "assistant",
        message: { usage },
        future: {
          usage: [
            {
              ...usage,
              input_tokens: 999,
            },
          ],
        },
      })}\n`,
    );
    const report = await analyzeTranscript(transcript);
    assert.equal(report.diagnostics.usageRecords, 1);
    assert.equal(report.diagnostics.unaccountedUsageRecords, 1);
    assert.equal(report.diagnostics.completeness, "PARTIAL");
    assert.equal(report.totals.measurement, "UNMEASURED");
    assert.equal(report.totals.totalTokens, null);
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

test("aggregateUsageLog aggregates runtime usage-log entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const logFile = path.join(root, "usage-log.jsonl");

  try {
    await writeFile(
      logFile,
      [
        JSON.stringify({
          ts: "2026-08-20T00:00:00.000Z",
          session: "a",
          measurement: "MEASURED",
          inputTokens: 100,
          outputTokens: 20,
          cacheCreationTokens: 30,
          cacheReadTokens: 70,
          conservativeTokens: 220,
        }),
        JSON.stringify({
          ts: "2026-08-20T01:00:00.000Z",
          session: "b",
          measurement: "MEASURED",
          inputTokens: 50,
          outputTokens: 10,
          cacheCreationTokens: 0,
          cacheReadTokens: 150,
          conservativeTokens: 210,
        }),
        JSON.stringify({
          ts: "2026-08-20T02:00:00.000Z",
          session: "c",
          measurement: "UNMEASURED",
          inputTokens: null,
          outputTokens: null,
          cacheCreationTokens: null,
          cacheReadTokens: null,
          conservativeTokens: null,
        }),
        "not-json",
        "",
      ].join("\n"),
    );

    const report = await aggregateUsageLog(logFile);

    assert.equal(report.schema, "usage_log_report_v1");
    assert.equal(report.sessions, 3);
    assert.equal(report.measured, 2);
    assert.equal(report.unmeasured, 1);
    assert.equal(report.invalidLines, 1);
    assert.deepEqual(report.totals, {
      inputTokens: 150,
      outputTokens: 30,
      cacheCreationTokens: 30,
      cacheReadTokens: 220,
      conservativeTokens: 430,
    });
    assert.equal(report.cacheHitRatio, 0.55);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("aggregateUsageLog returns an empty report for a missing log", async () => {
  const report = await aggregateUsageLog(
    path.join(tmpdir(), `transcript-usage-absent-${Date.now()}.jsonl`),
  );

  assert.equal(report.sessions, 0);
  assert.equal(report.measured, 0);
  assert.equal(report.unmeasured, 0);
  assert.equal(report.invalidLines, 0);
  assert.equal(report.cacheHitRatio, null);
});

test("aggregateUsageLog enforces a file-size cap", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "transcript-usage-"));
  const logFile = path.join(root, "large-log.jsonl");

  try {
    await writeFile(logFile, "x".repeat(101));
    await assert.rejects(
      aggregateUsageLog(logFile, { maxBytes: 100 }),
      /exceeds 100 bytes/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
