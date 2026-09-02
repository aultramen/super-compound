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
  const assistantUsageById = new Map();
  const readCountsByAsset = new Map();
  const seenToolUseIds = new Set();
  let duplicateUsageLines = 0;
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
      // Streaming hosts emit several lines per message that share one
      // message.id; the last line carries the final counts. Summing every
      // line inflates totals ~2.5-3x, so usage is counted once per id.
      const messageId =
        typeof entry.message.id === "string" && entry.message.id
          ? `id:${entry.message.id}`
          : `line:${linesRead}`;
      if (assistantUsageById.has(messageId)) duplicateUsageLines += 1;
      else usageRecords += 1;
      assistantUsageById.set(messageId, entry.message.usage);
      accountedUsageRecords += 1;
      supported = true;
    }
    if (entry?.type === "assistant") {
      recordAssetReads(entry.message?.content, readCountsByAsset, seenToolUseIds);
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

  for (const usage of assistantUsageById.values()) addUsage(main, usage);

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
      duplicateUsageLines,
      completeness: complete ? "COMPLETE" : "PARTIAL",
    },
    main: finalizedMain,
    subagents: finalizedSubagents,
    unattributed: finalizedUnattributed,
    totals: finalizedTotals,
    assetReads: finalizeAssetReads(readCountsByAsset),
  };
}

const ASSET_ROOT = ".agent/";
const MAX_ASSET_KEYS = 200;

/**
 * Count Read tool calls on repository-owned framework assets. This is the
 * activation evidence the static benchmark cannot supply: which contracts,
 * workflows, and skills a session actually loaded. Streamed lines repeat the
 * same tool_use block, so each tool_use id is counted once.
 */
function recordAssetReads(content, counts, seenToolUseIds) {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (!block || block.type !== "tool_use" || block.name !== "Read") continue;
    if (typeof block.id === "string" && block.id) {
      if (seenToolUseIds.has(block.id)) continue;
      seenToolUseIds.add(block.id);
    }
    const key = assetKey(block.input?.file_path);
    if (!key) continue;
    if (!counts.has(key) && counts.size >= MAX_ASSET_KEYS) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}

/**
 * Everything before `.agent/` is dropped so no host path leaves the machine.
 * Route files keep their name (per-route attribution); skills collapse to the
 * skill directory, with `references` as its own bucket.
 */
export function assetKey(filePath) {
  if (typeof filePath !== "string") return null;
  const normalized = filePath.replace(/\\/g, "/");
  let rel = null;
  if (normalized.startsWith(ASSET_ROOT)) rel = normalized;
  else {
    const at = normalized.lastIndexOf(`/${ASSET_ROOT}`);
    if (at !== -1) rel = normalized.slice(at + 1);
  }
  if (!rel) return null;
  const parts = rel.split("/").filter(Boolean);
  if (parts[1] === "skills" && parts.length >= 3) {
    return parts[3] === "references"
      ? parts.slice(0, 4).join("/")
      : parts.slice(0, 3).join("/");
  }
  return parts.length > 4 ? parts.slice(0, 4).join("/") : rel;
}

function finalizeAssetReads(counts) {
  const byAsset = Object.fromEntries(
    [...counts.entries()].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)),
  );
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return { total, byAsset };
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

const USAGE_LOG_TOKEN_FIELDS = [
  "inputTokens",
  "outputTokens",
  "cacheCreationTokens",
  "cacheReadTokens",
  "conservativeTokens",
];

export async function aggregateUsageLog(filePath, options = {}) {
  const absolute = path.resolve(filePath);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let info;
  try {
    info = await stat(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return emptyUsageLogReport();
    throw error;
  }
  if (!info.isFile()) throw new Error(`Usage log is not a file: ${absolute}`);
  if (info.size > maxBytes) {
    throw new Error(`Usage log exceeds ${maxBytes} bytes`);
  }

  const report = emptyUsageLogReport();
  const lines = readline.createInterface({
    input: createReadStream(absolute, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      report.invalidLines += 1;
      continue;
    }
    if (!isUsageObject(entry)) {
      report.invalidLines += 1;
      continue;
    }
    report.sessions += 1;
    if (entry.measurement === "MEASURED") report.measured += 1;
    else report.unmeasured += 1;
    accumulateAssetReads(report.assetReads, entry.assetReads);
    for (const field of USAGE_LOG_TOKEN_FIELDS) {
      const value = entry[field];
      if (!Number.isSafeInteger(value) || value < 0) continue;
      const next = report.totals[field] + value;
      if (!Number.isSafeInteger(next)) {
        throw new Error("Usage log token totals exceed the safe integer bound");
      }
      report.totals[field] = next;
    }
  }

  const cacheDenominator =
    report.totals.inputTokens +
    report.totals.cacheCreationTokens +
    report.totals.cacheReadTokens;
  report.cacheHitRatio =
    cacheDenominator > 0
      ? Math.round((report.totals.cacheReadTokens / cacheDenominator) * 10000) /
        10000
      : null;
  report.assetReads.top = Object.fromEntries(
    Object.entries(report.assetReads.top)
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, MAX_REPORT_ASSETS),
  );
  return report;
}

const MAX_REPORT_ASSETS = 15;

function accumulateAssetReads(target, assetReads) {
  if (!assetReads || typeof assetReads !== "object") return;
  if (Number.isSafeInteger(assetReads.total) && assetReads.total >= 0) {
    target.total += assetReads.total;
  }
  for (const [key, value] of Object.entries(assetReads.top ?? {})) {
    if (!key.startsWith(ASSET_ROOT) || !Number.isSafeInteger(value) || value < 0) continue;
    target.top[key] = (target.top[key] ?? 0) + value;
  }
}

function emptyUsageLogReport() {
  return {
    schema: "usage_log_report_v1",
    sessions: 0,
    measured: 0,
    unmeasured: 0,
    invalidLines: 0,
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      conservativeTokens: 0,
    },
    cacheHitRatio: null,
    assetReads: { total: 0, top: {} },
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args[0] === "--help" || args[0] === "-h") {
    console.log(
      [
        "Usage: node .agent/tools/transcript-usage.mjs <session.jsonl>",
        "       node .agent/tools/transcript-usage.mjs --report <usage-log.jsonl>",
      ].join("\n"),
    );
    return;
  }
  if (args[0] === "--report") {
    if (!args[1]) throw new Error("--report requires a usage-log.jsonl path");
    const report = await aggregateUsageLog(args[1]);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const report = await analyzeTranscript(args[0]);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
