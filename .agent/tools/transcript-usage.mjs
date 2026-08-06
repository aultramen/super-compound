#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { assertPrivacySafeRuntimeValue } from "./loop-telemetry-model.mjs";

const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;

export async function analyzeTranscript(filePath, options = {}) {
  const absolute = path.resolve(filePath);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const info = await stat(absolute);
  if (!info.isFile()) throw new Error(`Transcript is not a file: ${absolute}`);
  if (info.size > maxBytes) {
    throw new Error(`Transcript exceeds ${maxBytes} bytes`);
  }

  const main = emptyUsage();
  const subagentMap = new Map();
  const unattributed = emptyUsage();
  let linesRead = 0;
  let invalidJsonLines = 0;
  let unsupportedLines = 0;
  let usageRecords = 0;
  let unattributedUsageRecords = 0;
  let unaccountedUsageRecords = 0;
  const lines = readline.createInterface({
    input: createReadStream(absolute, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line.trim()) continue;
    linesRead += 1;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      invalidJsonLines += 1;
      continue;
    }

    let supported = false;
    let accountedUsageRecords = 0;
    if (
      entry?.type === "assistant" &&
      isUsageObject(entry.message?.usage)
    ) {
      addUsage(main, entry.message.usage);
      usageRecords += 1;
      accountedUsageRecords += 1;
      supported = true;
    }

    const result = entry?.type === "user" ? entry.toolUseResult : null;
    if (isUsageObject(result?.usage)) {
      if (typeof result.agentId === "string") {
        const contributorRef = opaqueContributorRef(result.agentId);
        const usage = subagentMap.get(contributorRef) ?? emptyUsage();
        addUsage(usage, result.usage);
        subagentMap.set(contributorRef, usage);
      } else {
        addUsage(unattributed, result.usage);
        unattributedUsageRecords += 1;
      }
      usageRecords += 1;
      accountedUsageRecords += 1;
      supported = true;
    }
    const usagePayloads = countUsagePayloads(entry);
    unaccountedUsageRecords += Math.max(
      0,
      usagePayloads.count - accountedUsageRecords,
    );
    if (usagePayloads.truncated) unaccountedUsageRecords += 1;
    if (!supported) {
      unsupportedLines += 1;
    }
  }

  if (usageRecords === 0) {
    throw new Error("Transcript contains no supported token usage records");
  }

  const subagents = Object.fromEntries(
    [...subagentMap.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const finalizedMain = finalizeUsage(main);
  const finalizedSubagents = Object.fromEntries(
    Object.entries(subagents).map(([id, usage]) => [id, finalizeUsage(usage)]),
  );
  const finalizedUnattributed = finalizeUsage(unattributed);
  const totals = emptyUsage();
  mergeUsage(totals, main);
  for (const usage of Object.values(subagents)) mergeUsage(totals, usage);
  mergeUsage(totals, unattributed);
  const finalizedTotals = finalizeUsage(totals, {
    complete:
      invalidJsonLines === 0 &&
      unattributedUsageRecords === 0 &&
      unaccountedUsageRecords === 0,
    includeTotalNames: true,
  });
  const complete =
    invalidJsonLines === 0 &&
    unattributedUsageRecords === 0 &&
    unaccountedUsageRecords === 0 &&
    finalizedMain.measurement === "MEASURED" &&
    Object.values(finalizedSubagents).every(
      (usage) => usage.measurement === "MEASURED",
    );

  return {
    schema: "transcript_token_usage_v2",
    diagnostics: {
      linesRead,
      usageRecords,
      unattributedUsageRecords,
      unaccountedUsageRecords,
      invalidJsonLines,
      unsupportedLines,
      completeness: complete ? "COMPLETE" : "PARTIAL",
    },
    main: finalizedMain,
    subagents: finalizedSubagents,
    unattributed: finalizedUnattributed,
    totals: finalizedTotals,
  };
}

function countUsagePayloads(value) {
  const pending = [{ candidate: value, directUsageValue: false }];
  let visited = 0;
  let count = 0;
  while (pending.length > 0 && visited < 4096) {
    const { candidate, directUsageValue } = pending.pop();
    visited += 1;
    if (candidate === null || typeof candidate !== "object") continue;
    if (Array.isArray(candidate)) {
      for (const nested of candidate) {
        pending.push({ candidate: nested, directUsageValue });
      }
      continue;
    }
    if (directUsageValue || hasUsageTokenField(candidate)) count += 1;
    for (const [key, nested] of Object.entries(candidate)) {
      pending.push({
        candidate: nested,
        directUsageValue: key === "usage",
      });
    }
  }
  return { count, truncated: pending.length > 0 };
}

function hasUsageTokenField(value) {
  return [
    "input_tokens",
    "output_tokens",
    "reasoning_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
  ].some((field) => Object.hasOwn(value, field));
}

function opaqueContributorRef(agentId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(agentId)) {
    throw new TypeError("PRIVACY_STOP: transcript contributor ID is invalid.");
  }
  assertPrivacySafeRuntimeValue(agentId, "transcript contributor ID");
  return `sha256:${createHash("sha256")
    .update(`super-compound:transcript-contributor:v2\0${agentId}`)
    .digest("hex")}`;
}

function emptyUsage() {
  return {
    messages: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
}

function addUsage(target, source) {
  target.messages += 1;
  addToken(target, "inputTokens", source.input_tokens);
  addToken(target, "outputTokens", source.output_tokens);
  addToken(target, "reasoningTokens", source.reasoning_tokens);
  addToken(
    target,
    "cacheCreationTokens",
    source.cache_creation_input_tokens,
  );
  addToken(target, "cacheReadTokens", source.cache_read_input_tokens);
}

function mergeUsage(target, source) {
  target.messages += source.messages;
  for (const key of [
    "inputTokens",
    "outputTokens",
    "reasoningTokens",
    "cacheCreationTokens",
    "cacheReadTokens",
  ]) {
    if (target[key] === null || source[key] === null) {
      target[key] = null;
      continue;
    }
    const next = target[key] + source[key];
    if (!Number.isSafeInteger(next)) {
      throw new Error("Transcript token usage exceeds the safe integer bound");
    }
    target[key] = next;
  }
}

function addToken(target, field, value) {
  const measured = measuredToken(value);
  if (target[field] === null || measured === null) {
    target[field] = null;
    return;
  }
  const next = target[field] + measured;
  if (!Number.isSafeInteger(next)) {
    throw new Error("Transcript token usage exceeds the safe integer bound");
  }
  target[field] = next;
}

function measuredToken(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeSum(values) {
  if (values.some((value) => value === null)) return null;
  return values.reduce((total, value) => {
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new Error("Transcript token usage exceeds the safe integer bound");
    }
    return next;
  }, 0);
}

function finalizeUsage(usage, { complete = true, includeTotalNames = false } = {}) {
  const cachedInputTokens = safeSum([
    usage.cacheCreationTokens,
    usage.cacheReadTokens,
  ]);
  const conservativeTokens = safeSum([
    usage.inputTokens,
    usage.outputTokens,
    usage.reasoningTokens,
    usage.cacheCreationTokens,
    usage.cacheReadTokens,
  ]);
  const measured = complete && conservativeTokens !== null;
  const result = {
    messages: usage.messages,
    measurement: measured ? "MEASURED" : "UNMEASURED",
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cachedInputTokens,
  };
  if (includeTotalNames) {
    result.totalInputTokens = safeSum([
      usage.inputTokens,
      usage.cacheCreationTokens,
      usage.cacheReadTokens,
    ]);
    result.totalTokens = measured ? conservativeTokens : null;
  } else {
    result.conservativeTokens = conservativeTokens;
  }
  return result;
}

function isUsageObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function main() {
  const transcript = process.argv[2];
  if (!transcript || transcript === "--help" || transcript === "-h") {
    console.log(
      "Usage: node .agent/tools/transcript-usage.mjs <session.jsonl>",
    );
    return;
  }
  const report = await analyzeTranscript(transcript);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
