#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

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
  let linesRead = 0;
  let invalidJsonLines = 0;
  let unsupportedLines = 0;
  let usageRecords = 0;
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
    if (
      entry?.type === "assistant" &&
      isUsageObject(entry.message?.usage)
    ) {
      addUsage(main, entry.message.usage);
      usageRecords += 1;
      supported = true;
    }

    const result = entry?.type === "user" ? entry.toolUseResult : null;
    if (
      isUsageObject(result?.usage) &&
      typeof result.agentId === "string"
    ) {
      const id = result.agentId.slice(0, 160);
      const usage = subagentMap.get(id) ?? emptyUsage();
      addUsage(usage, result.usage);
      subagentMap.set(id, usage);
      usageRecords += 1;
      supported = true;
    }
    if (!supported) unsupportedLines += 1;
  }

  if (usageRecords === 0) {
    throw new Error("Transcript contains no supported token usage records");
  }

  const subagents = Object.fromEntries(
    [...subagentMap.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const totals = emptyUsage();
  mergeUsage(totals, main);
  for (const usage of Object.values(subagents)) mergeUsage(totals, usage);

  return {
    schema: "transcript_token_usage_v1",
    diagnostics: {
      linesRead,
      usageRecords,
      invalidJsonLines,
      unsupportedLines,
    },
    main,
    subagents,
    totals: {
      ...totals,
      totalInputTokens:
        totals.inputTokens +
        totals.cacheCreationTokens +
        totals.cacheReadTokens,
      totalTokens:
        totals.inputTokens +
        totals.cacheCreationTokens +
        totals.cacheReadTokens +
        totals.outputTokens,
    },
  };
}

function emptyUsage() {
  return {
    messages: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
}

function addUsage(target, source) {
  target.messages += 1;
  target.inputTokens += finiteToken(source.input_tokens);
  target.outputTokens += finiteToken(source.output_tokens);
  target.cacheCreationTokens += finiteToken(
    source.cache_creation_input_tokens,
  );
  target.cacheReadTokens += finiteToken(source.cache_read_input_tokens);
}

function mergeUsage(target, source) {
  for (const key of Object.keys(target)) target[key] += source[key];
}

function finiteToken(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
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
