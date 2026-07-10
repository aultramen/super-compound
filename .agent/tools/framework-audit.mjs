#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SCENARIOS,
  evaluateScenarios,
  resolveBenchmarkOutputPath,
} from "./token-benchmark.mjs";

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".debug",
  "node_modules",
  "__pycache__",
]);
const SKIP_RUNTIME_DIRECTORIES = new Set([
  ".agent/.compact-state",
  ".scratch/work-packages",
]);
const GENERATED_AUDIT_PATH = ".agent/benchmarks/framework-audit.after.json";
const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("unterminated quoted CSV field");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

export async function auditRepository(root, options = {}) {
  const duplicateParagraphMinChars =
    options.duplicateParagraphMinChars ?? 120;
  const excludedPaths = new Set([
    GENERATED_AUDIT_PATH,
    ...(options.excludePaths ?? []).map(normalizePath),
  ]);
  const files = (await listFiles(root)).filter(
    (file) => !excludedPaths.has(file),
  );
  const fileSet = new Set(files);
  const findings = [];
  const contents = new Map();
  const contentHashes = new Map();
  const paragraphs = new Map();
  const digest = createHash("sha256");
  let bytesRead = 0;
  let textFiles = 0;
  let binaryFiles = 0;
  let linesRead = 0;

  for (const file of files) {
    const absolute = path.join(root, file);
    const buffer = await readFile(absolute);
    bytesRead += buffer.length;

    digest.update(file);
    digest.update("\0");
    digest.update(buffer);
    digest.update("\0");

    const hash = createHash("sha256").update(buffer).digest("hex");
    const hashGroup = contentHashes.get(hash) ?? [];
    hashGroup.push(file);
    contentHashes.set(hash, hashGroup);

    if (buffer.includes(0)) {
      binaryFiles += 1;
      continue;
    }

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      binaryFiles += 1;
      findings.push(
        finding("P1", "INVALID_UTF8", file, "Text file is not valid UTF-8."),
      );
      continue;
    }

    textFiles += 1;
    linesRead += countLines(text);
    contents.set(file, text);

    if (file.endsWith(".json")) {
      validateJson(file, text, findings);
    }

    if (file.endsWith(".csv")) {
      validateCsv(file, text, findings);
    }

    if (file.endsWith(".md")) {
      collectDuplicateParagraphs(
        file,
        text,
        duplicateParagraphMinChars,
        paragraphs,
      );
      await validateMarkdownLinks(root, file, text, fileSet, findings);
    }
  }

  validateExactDuplicates(contentHashes, findings);
  validateDuplicateParagraphs(paragraphs, findings);
  validateWorkflowContracts(contents, findings);
  const skillSummary = validateSkills(
    contents,
    findings,
    options.maxSkillEntrypointWords ?? 500,
  );
  validateIndexes(contents, findings);
  validateOutputBudgets(contents, findings);
  validateOutputBudgetManifest(contents, findings);
  await validateBenchmarkEvidence(root, contents, findings);

  findings.sort(compareFindings);
  const severityCounts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const item of findings) {
    severityCounts[item.severity] += 1;
  }

  return {
    schema: "super_compound_framework_audit_v1",
    pass: findings.length === 0,
    summary: {
      filesRead: files.length,
      textFiles,
      binaryFiles,
      bytesRead,
      linesRead,
      contentDigest: digest.digest("hex"),
      skillEntrypoints: skillSummary.count,
      skillEntrypointWords: skillSummary.words,
      maxSkillEntrypointWords: skillSummary.maxWords,
      skillEntrypointWordLimit: skillSummary.limit,
      findings: findings.length,
      severityCounts,
    },
    findings,
  };
}

async function listFiles(root, current = "") {
  const absolute = path.join(root, current);
  const entries = (await readdir(absolute, { withFileTypes: true })).sort(
    (left, right) => left.name.localeCompare(right.name),
  );
  const files = [];

  for (const entry of entries) {
    const relative = normalizePath(
      current ? path.join(current, entry.name) : entry.name,
    );
    if (
      entry.isDirectory() &&
      (SKIP_DIRECTORIES.has(entry.name) ||
        SKIP_RUNTIME_DIRECTORIES.has(relative))
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, relative)));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }

  return files;
}

function validateJson(file, text, findings) {
  try {
    JSON.parse(text);
  } catch (error) {
    const location = String(error?.message ?? "").match(
      /(?:position \d+|line \d+ column \d+)/i,
    )?.[0];
    findings.push(
      finding(
        "P1",
        "JSON_PARSE_ERROR",
        file,
        `Invalid JSON${location ? ` at ${location}` : ""}.`,
      ),
    );
  }
}

function validateCsv(file, text, findings) {
  let rows;
  try {
    rows = parseCsvRows(text);
  } catch (error) {
    findings.push(
      finding("P1", "CSV_PARSE_ERROR", file, compactError(error)),
    );
    return;
  }

  if (rows.length === 0) {
    return;
  }

  const width = rows[0].length;
  const mismatches = [];
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].length !== width) {
      mismatches.push(`${index + 1}:${rows[index].length}`);
    }
  }

  if (mismatches.length > 0) {
    findings.push(
      finding(
        "P1",
        "CSV_WIDTH_MISMATCH",
        file,
        `Expected ${width} columns; mismatched rows ${mismatches.slice(0, 10).join(", ")}.`,
      ),
    );
  }
}

async function validateMarkdownLinks(root, file, text, fileSet, findings) {
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(text))) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    let target = rawTarget.split(/\s+/)[0];

    if (!target || /^(?:https?:|mailto:|data:|#)/i.test(target)) {
      continue;
    }

    try {
      target = decodeURIComponent(target.split("#")[0]);
    } catch {
      findings.push(
        finding(
          "P2",
          "MARKDOWN_LINK_INVALID",
          file,
          `Cannot decode link target: ${rawTarget}`,
        ),
      );
      continue;
    }

    if (!target) {
      continue;
    }

    const resolved = normalizePath(
      path.relative(root, path.resolve(root, path.dirname(file), target)),
    );
    if (resolved.startsWith("../")) {
      continue;
    }

    if (!fileSet.has(resolved) && !(await isDirectory(path.join(root, resolved)))) {
      findings.push(
        finding(
          "P2",
          "MARKDOWN_LINK_MISSING",
          file,
          `Missing target: ${rawTarget}`,
        ),
      );
    }
  }
}

function collectDuplicateParagraphs(file, text, minChars, paragraphs) {
  const body = stripFrontmatter(text);
  for (const raw of body.split(/\n\s*\n/)) {
    const withoutHeadings = raw
      .split("\n")
      .filter((line) => !/^#{1,6}\s+/.test(line.trim()))
      .join("\n");
    const normalized = withoutHeadings.replace(/\s+/g, " ").trim();
    if (
      normalized.length < minChars ||
      raw.trim().startsWith("```") ||
      normalized.startsWith("|")
    ) {
      continue;
    }

    const key = normalized.toLowerCase();
    const value = paragraphs.get(key) ?? { text: normalized, files: new Set() };
    value.files.add(file);
    paragraphs.set(key, value);
  }
}

function validateExactDuplicates(groups, findings) {
  for (const files of groups.values()) {
    if (files.length < 2) {
      continue;
    }
    findings.push(
      finding(
        "P2",
        "EXACT_DUPLICATE_FILE",
        files[0],
        `Identical content: ${files.join(", ")}`,
      ),
    );
  }
}

function validateDuplicateParagraphs(paragraphs, findings) {
  for (const value of paragraphs.values()) {
    const files = [...value.files];
    if (files.length < 2) {
      continue;
    }
    findings.push(
      finding(
        "P2",
        "DUPLICATE_PARAGRAPH",
        files[0],
        `Repeated ${value.text.length}-character paragraph in ${files.join(", ")}.`,
      ),
    );
  }
}

function validateWorkflowContracts(contents, findings) {
  const workflowPrefix = ".agent/workflows/";
  const contractPrefix = ".agent/context/workflows/";
  const workflows = [...contents.keys()].filter(
    (file) => file.startsWith(workflowPrefix) && file.endsWith(".md"),
  );
  const workflowNames = new Set(workflows.map((file) => path.basename(file, ".md")));

  for (const file of workflows) {
    const text = contents.get(file);
    const metadata = parseFrontmatter(text);
    if (!metadata.description) {
      findings.push(
        finding(
          "P1",
          "WORKFLOW_DESCRIPTION_MISSING",
          file,
          "Workflow frontmatter requires description.",
        ),
      );
    }
    if (!/^#\s+\S/m.test(stripFrontmatter(text))) {
      findings.push(
        finding("P1", "WORKFLOW_H1_MISSING", file, "Workflow requires an H1."),
      );
    }

    const name = path.basename(file, ".md");
    const expected = `${contractPrefix}${name}.contract.md`;
    if (!contents.has(expected)) {
      findings.push(
        finding(
          "P1",
          "WORKFLOW_CONTRACT_MISSING",
          file,
          `Expected ${expected}.`,
        ),
      );
    }
  }

  for (const file of contents.keys()) {
    if (!file.startsWith(contractPrefix) || !file.endsWith(".contract.md")) {
      continue;
    }
    const name = path.basename(file, ".contract.md");
    if (!workflowNames.has(name)) {
      findings.push(
        finding(
          "P2",
          "WORKFLOW_CONTRACT_ORPHAN",
          file,
          `No ${workflowPrefix}${name}.md exists.`,
        ),
      );
    }
  }
}

function validateSkills(contents, findings, wordLimit) {
  const skillPattern = /^\.agent\/skills\/([^/]+)\/SKILL\.md$/;
  const summary = { count: 0, words: 0, maxWords: 0, limit: wordLimit };
  for (const [file, text] of contents) {
    const match = file.match(skillPattern);
    if (!match) {
      continue;
    }
    const words = countWords(text);
    summary.count += 1;
    summary.words += words;
    summary.maxWords = Math.max(summary.maxWords, words);
    if (words > wordLimit) {
      findings.push(
        finding(
          "P1",
          "SKILL_ENTRYPOINT_TOO_LARGE",
          file,
          `Entrypoint has ${words} words; maximum is ${wordLimit}. Move conditional detail behind references.`,
        ),
      );
    }
    const metadata = parseFrontmatter(text);
    if (metadata.name !== match[1]) {
      findings.push(
        finding(
          "P1",
          "SKILL_NAME_MISMATCH",
          file,
          `Directory is ${match[1]}; frontmatter name is ${metadata.name ?? "missing"}.`,
        ),
      );
    }
    if (!metadata.description) {
      findings.push(
        finding(
          "P1",
          "SKILL_DESCRIPTION_MISSING",
          file,
          "Skill frontmatter requires description.",
        ),
      );
    }
  }
  return summary;
}

function validateIndexes(contents, findings) {
  const workflows = [...contents.keys()]
    .filter((file) => /^\.agent\/workflows\/sc-[^/]+\.md$/.test(file))
    .map((file) => path.basename(file, ".md"));
  const skills = [...contents.keys()]
    .map((file) => file.match(/^\.agent\/skills\/([^/]+)\/SKILL\.md$/)?.[1])
    .filter(Boolean);
  const workflowIndex = contents.get(".agent/context/workflow-dispatch.md");
  const skillIndex = contents.get(".agent/context/skill-index.md");
  const hasSupportSkillFallback = /\bOther support skills\b/i.test(
    skillIndex ?? "",
  );

  if (workflows.length > 0 && !workflowIndex) {
    findings.push(
      finding(
        "P1",
        "WORKFLOW_INDEX_MISSING",
        ".agent/context/workflow-dispatch.md",
        "Workflow dispatch index is required.",
      ),
    );
  } else {
    for (const name of workflows) {
      if (!workflowIndex.includes(name)) {
        findings.push(
          finding(
            "P1",
            "WORKFLOW_INDEX_GAP",
            ".agent/context/workflow-dispatch.md",
            `Missing workflow ${name}.`,
          ),
        );
      }
    }
  }

  if (skills.length > 0 && !skillIndex) {
    findings.push(
      finding(
        "P1",
        "SKILL_INDEX_MISSING",
        ".agent/context/skill-index.md",
        "Skill index is required.",
      ),
    );
  } else {
    for (const name of skills) {
      if (!skillIndex.includes(name) && !hasSupportSkillFallback) {
        findings.push(
          finding(
            "P1",
            "SKILL_INDEX_GAP",
            ".agent/context/skill-index.md",
            `Missing skill ${name}.`,
          ),
        );
      }
    }
  }
}

function validateOutputBudgets(contents, findings) {
  const budgetPath = ".agent/context/token-budget-gates.md";
  const budget = contents.get(budgetPath);
  if (!budget) return;

  const workflows = [...contents.keys()]
    .filter((file) => /^\.agent\/workflows\/sc-[^/]+\.md$/.test(file))
    .map((file) => path.basename(file, ".md"));
  for (const name of workflows) {
    if (!budget.includes(name)) {
      findings.push(
        finding(
          "P1",
          "OUTPUT_BUDGET_GAP",
          budgetPath,
          `Missing orchestrator return budget for ${name}.`,
        ),
      );
    }
  }
}

function validateOutputBudgetManifest(contents, findings) {
  const manifestPath = ".agent/context/output-budgets.json";
  const workflowNames = [...contents.keys()]
    .filter((file) => /^\.agent\/workflows\/sc-[^/]+\.md$/.test(file))
    .map((file) => path.basename(file, ".md"));
  if (workflowNames.length === 0) return;

  const text = contents.get(manifestPath);
  if (!text) {
    findings.push(
      finding(
        "P1",
        "OUTPUT_BUDGET_MANIFEST_MISSING",
        manifestPath,
        "Public workflows require machine-readable token and character budgets.",
      ),
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    return;
  }
  if (
    manifest.schema !== "output_budgets_v1" ||
    typeof manifest.routes !== "object" ||
    manifest.routes === null ||
    Array.isArray(manifest.routes)
  ) {
    findings.push(
      finding(
        "P1",
        "OUTPUT_BUDGET_MANIFEST_INVALID",
        manifestPath,
        "Expected output_budgets_v1 with a routes object.",
      ),
    );
    return;
  }

  const expected = new Set(workflowNames);
  for (const name of workflowNames) {
    const budget = manifest.routes[name];
    if (
      !budget ||
      !Number.isInteger(budget.maxEstimatedTokens) ||
      budget.maxEstimatedTokens <= 0 ||
      !Number.isInteger(budget.maxCharacters) ||
      budget.maxCharacters <= 0
    ) {
      findings.push(
        finding(
          "P1",
          "OUTPUT_BUDGET_MANIFEST_GAP",
          manifestPath,
          `Missing positive integer token/character budget for ${name}.`,
        ),
      );
    }
  }
  for (const name of Object.keys(manifest.routes)) {
    if (!expected.has(name)) {
      findings.push(
        finding(
          "P2",
          "OUTPUT_BUDGET_MANIFEST_ORPHAN",
          manifestPath,
          `Budget route has no public workflow: ${name}.`,
        ),
      );
    }
  }
}

async function validateBenchmarkEvidence(root, contents, findings) {
  const reportPath = ".agent/benchmarks/token-benchmark.after.json";
  const baselinePath = ".agent/benchmarks/token-baseline.before.json";
  const reportText = contents.get(reportPath);
  if (!reportText) {
    return;
  }

  let report;
  try {
    report = JSON.parse(reportText);
  } catch {
    return;
  }

  const expectedNames = new Set(
    DEFAULT_SCENARIOS.map((scenario) => scenario.name),
  );
  const actualRows = report.result?.scenarios ?? [];
  const actualNames = new Set(actualRows.map((scenario) => scenario.name));
  const missingScenarios = [...expectedNames].filter(
    (name) => !actualNames.has(name),
  );
  const invalidReasons = [];
  const validDigestRows = actualRows.filter((row) =>
    /^[a-f0-9]{64}$/.test(String(row.afterDigest ?? "")),
  ).length;
  const recordedThreshold = report.result?.threshold;
  const validThreshold =
    Number.isFinite(recordedThreshold) &&
    recordedThreshold >= 90 &&
    recordedThreshold < 100;

  if (report.schema !== "token_benchmark_report_v2") {
    invalidReasons.push("schema is not token_benchmark_report_v2");
  }
  if (!("observedRuntimeTokens" in report)) {
    invalidReasons.push("observed runtime token field is missing");
  }
  if (!("hostInjectedSurfaceTokens" in report)) {
    invalidReasons.push("host-injected surface token field is missing");
  }
  if (report.repeat < 3 || report.consecutivePasses < 3) {
    invalidReasons.push("fewer than three consecutive passing runs");
  }
  if (!report.deterministic) {
    invalidReasons.push("repeated runs are not deterministic");
  }
  if (!report.pass || !report.result?.summary?.pass) {
    invalidReasons.push("benchmark gate did not pass");
  }
  if (!validThreshold) {
    invalidReasons.push("reduction threshold must be between 90 and 100");
  }
  if (missingScenarios.length > 0 || actualNames.size !== expectedNames.size) {
    invalidReasons.push(
      `scenario coverage differs (${missingScenarios.slice(0, 5).join(", ") || "unexpected scenario"})`,
    );
  }
  if (validDigestRows !== expectedNames.size) {
    invalidReasons.push("scenario after-surface digests are missing or invalid");
  }

  if (invalidReasons.length > 0) {
    findings.push(
      finding(
        "P1",
        "BENCHMARK_EVIDENCE_INVALID",
        reportPath,
        invalidReasons.join("; "),
      ),
    );
  }

  const baselineText = contents.get(baselinePath);
  if (!baselineText) {
    findings.push(
      finding(
        "P1",
        "BENCHMARK_BASELINE_MISSING",
        baselinePath,
        "Benchmark evidence exists without its historical baseline.",
      ),
    );
    return;
  }

  let baseline;
  try {
    baseline = JSON.parse(baselineText);
  } catch {
    return;
  }

  const current = await evaluateScenarios(
    root,
    DEFAULT_SCENARIOS,
    baseline,
    validThreshold ? recordedThreshold : 90,
  );
  const recorded = new Map(actualRows.map((row) => [row.name, row]));
  const stale = [];

  for (const scenario of current.scenarios) {
    const row = recorded.get(scenario.name);
    const reductionPercent =
      scenario.gateType === "budget"
        ? undefined
        : Number(scenario.reductionPercent.toFixed(4));
    if (
      !row ||
      row.beforeTokens !== scenario.before.tokens ||
      row.afterTokens !== scenario.after.tokens ||
      row.afterDigest !== scenario.after.contentDigest ||
      row.pass !== scenario.pass ||
      row.gateType !==
        (scenario.gateType === "budget" ? "budget" : undefined) ||
      row.maxAfterTokens !== scenario.maxAfterTokens ||
      row.reductionPercent !== reductionPercent
    ) {
      stale.push(scenario.name);
    }
  }

  if (stale.length > 0) {
    findings.push(
      finding(
        "P1",
        "BENCHMARK_EVIDENCE_STALE",
        reportPath,
        `Rerun benchmark; stale scenarios: ${stale.slice(0, 10).join(", ")}.`,
      ),
    );
  }
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return {};
  }
  const normalized = text.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) {
    return {};
  }
  const metadata = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      metadata[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return metadata;
}

function stripFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return normalized;
  }
  const end = normalized.indexOf("\n---\n", 4);
  return end < 0 ? normalized : normalized.slice(end + 5);
}

function finding(severity, code, file, message) {
  return { severity, code, file, message };
}

function compareFindings(left, right) {
  return (
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
    left.code.localeCompare(right.code) ||
    left.file.localeCompare(right.file)
  );
}

function compactError(error) {
  return String(error?.message ?? error).split("\n")[0];
}

function countLines(text) {
  return text.length === 0 ? 0 : text.split(/\r?\n/).length;
}

function countWords(text) {
  return text.match(/\S+/g)?.length ?? 0;
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

async function isDirectory(absolute) {
  const info = await stat(absolute).catch(() => null);
  return info?.isDirectory() ?? false;
}

function formatReport(report) {
  const lines = [
    `Framework audit: ${report.pass ? "PASS" : "FAIL"}`,
    `Files read: ${report.summary.filesRead} (${report.summary.textFiles} text, ${report.summary.binaryFiles} binary)`,
    `Bytes/lines: ${report.summary.bytesRead}/${report.summary.linesRead}`,
    `Skill entrypoints: ${report.summary.skillEntrypoints} files, ${report.summary.skillEntrypointWords} words total, ${report.summary.maxSkillEntrypointWords}/${report.summary.skillEntrypointWordLimit} max`,
    `Digest: ${report.summary.contentDigest}`,
    `Findings: ${report.summary.findings}`,
  ];
  for (const item of report.findings) {
    lines.push(`${item.severity} ${item.code} ${item.file}: ${item.message}`);
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  let output;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") {
      output = args[index + 1];
      index += 1;
    } else if (args[index] === "--json") {
      json = true;
    } else if (args[index] === "--help" || args[index] === "-h") {
      console.log(
        "Usage: node .agent/tools/framework-audit.mjs [--json] [--output <path>]",
      );
      return;
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }

  const root = process.cwd();
  const outputAbsolute = output
    ? await resolveBenchmarkOutputPath(root, output)
    : null;
  const outputRelative = outputAbsolute
    ? normalizePath(path.relative(root, outputAbsolute))
    : null;
  const report = await auditRepository(root, {
    excludePaths: outputRelative ? [outputRelative] : [],
  });
  if (outputAbsolute) {
    await mkdir(path.dirname(outputAbsolute), { recursive: true });
    await writeFile(outputAbsolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(json ? JSON.stringify(report, null, 2) : formatReport(report));
  if (!report.pass) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(compactError(error));
    process.exitCode = 1;
  });
}
