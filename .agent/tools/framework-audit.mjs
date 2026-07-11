#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SCENARIOS,
  digestBenchmarkSuite,
  evaluateScenarios,
  resolveBenchmarkOutputPath,
  validateBaselineProvenance,
} from "./token-benchmark.mjs";
import {
  buildWorkflowEvidenceMatrix,
  validateWorkflowEvidence,
} from "./evidence-matrix.mjs";

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
  const exclusionReasons = new Map([
    [GENERATED_AUDIT_PATH, "generated audit output"],
    ...(options.excludePaths ?? []).map((value) => [
      normalizePath(value),
      "requested output path",
    ]),
  ]);
  const manifestEvidence = await listRepositoryManifest(root);
  const manifest = manifestEvidence.files;
  const physicalInventory = await readPhysicalInventory(root, manifest);
  const auditClassification = classifyAuditManifest(manifest);
  const excludedFiles = manifest
    .filter((file) => exclusionReasons.has(file))
    .map((file) => ({ path: file, reason: exclusionReasons.get(file) }));
  const files = manifest.filter((file) => !exclusionReasons.has(file));
  const accountedEntries = files.length + excludedFiles.length;
  const coverage = {
    activeManifestEntries: manifest.length,
    byteContentAuditedEntries: files.length,
    specialVerificationEntries: excludedFiles.length,
    accountedEntries,
    unaccountedEntries: manifest.length - accountedEntries,
    accountedPercent:
      manifest.length === 0
        ? 100
        : Number(((accountedEntries / manifest.length) * 100).toFixed(4)),
    byteContentAuditPercent:
      manifest.length === 0
        ? 100
        : Number(((files.length / manifest.length) * 100).toFixed(4)),
    classifiedEntries: auditClassification.classifiedEntries,
    unclassifiedEntries: auditClassification.unclassified.length,
    classCoveragePercent: auditClassification.classCoveragePercent,
    auditClassCounts: auditClassification.counts,
    auditClassDigest: auditClassification.digest,
    contentDigestScope: "byte-content-audited",
    specialVerificationRequired: excludedFiles.length > 0,
    specialEntries: excludedFiles.map(({ path: file }) => ({
      path: file,
      validator: "stored-audit-evidence-v1",
    })),
  };
  const fileSet = new Set(files);
  const findings = [];
  for (const file of auditClassification.unclassified) {
    findings.push(
      finding(
        "P1",
        "AUDIT_CLASS_MISSING",
        file,
        "Active manifest entry has no declared audit class.",
      ),
    );
  }
  if (
    options.requireGitManifest === true &&
    manifestEvidence.source !== "git-active-manifest"
  ) {
    findings.push(
      finding(
        "P1",
        "MANIFEST_SOURCE_DEGRADED",
        ".",
        "Authoritative audit requires the active Git manifest.",
      ),
    );
  }
  const contents = new Map();
  const contentHashes = new Map();
  const paragraphs = new Map();
  const digest = createHash("sha256");
  let bytesRead = 0;
  let textFiles = 0;
  let binaryFiles = 0;
  let linesRead = 0;
  let filesRead = 0;

  for (const file of files) {
    const absolute = path.join(root, file);
    const info = await lstat(absolute).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) {
      findings.push(
        finding(
          "P1",
          "UNSAFE_MANIFEST_ENTRY",
          file,
          "Manifest entry must be a regular, non-symlink file.",
        ),
      );
      continue;
    }
    const buffer = await readFile(absolute);
    filesRead += 1;
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
  validateWorkflowInvariants(contents, findings);
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

  const report = {
    schema: "super_compound_framework_audit_v2",
    generatedAt: new Date().toISOString(),
    repositoryHead: manifestEvidence.head,
    pass: findings.length === 0,
    summary: {
      manifestSource: manifestEvidence.source,
      manifestFiles: manifest.length,
      auditedFiles: files.length,
      excludedFiles,
      filesRead,
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
    coverage,
    physicalInventory,
    findings,
  };
  report.evidenceDigest = auditEvidenceFingerprint(report);
  return report;
}

async function listRepositoryManifest(root) {
  const gitFiles = await new Promise((resolve) => {
    execFile(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        resolve(
          Buffer.from(stdout)
            .toString("utf8")
            .split("\0")
            .filter(Boolean)
            .map(normalizePath)
            .sort((left, right) => left.localeCompare(right)),
        );
      },
    );
  });
  if (gitFiles) {
    const head = await new Promise((resolve) => {
      execFile(
        "git",
        ["rev-parse", "HEAD"],
        { cwd: root, encoding: "utf8" },
        (error, stdout) =>
          resolve(error ? null : String(stdout).trim()),
      );
    });
    if (/^[a-f0-9]{40}$/.test(String(head ?? ""))) {
      return {
        files: gitFiles,
        source: "git-active-manifest",
        head,
      };
    }
  }
  return {
    files: await listFiles(root),
    source: "filesystem-fallback",
    head: "unknown",
  };
}

export function auditEvidenceFingerprint(report) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema: report.schema,
        repositoryHead: report.repositoryHead,
        pass: report.pass,
        summary: report.summary,
        coverage: report.coverage,
        physicalInventory: report.physicalInventory,
        findings: report.findings,
      }),
    )
    .digest("hex");
}

export async function verifyStoredAuditEvidence(root, reportPath, options = {}) {
  const absolute = await resolveBenchmarkOutputPath(root, reportPath);
  const target = normalizePath(path.relative(root, absolute));
  const stored = JSON.parse(await readFile(absolute, "utf8"));
  if (stored.evidenceDigest !== auditEvidenceFingerprint(stored)) {
    throw new Error("Stored audit evidence digest is invalid");
  }

  const current = await auditRepository(root, {
    excludePaths: [target],
    requireGitManifest: options.requireGitManifest !== false,
  });
  const comparableCurrent = {
    ...current,
    repositoryHead: stored.repositoryHead,
  };
  if (stored.evidenceDigest !== auditEvidenceFingerprint(comparableCurrent)) {
    throw new Error("Stored audit evidence is stale");
  }

  const specialEntries = current.coverage.specialEntries ?? [];
  const speciallyVerifiedEntries = specialEntries.filter(
    (entry) => entry.path === target,
  ).length;
  const specialVerificationPass =
    specialEntries.length === 1 && speciallyVerifiedEntries === 1;
  const byteContentAuditedEntries = current.coverage.byteContentAuditedEntries;
  const accountedEntries = byteContentAuditedEntries + speciallyVerifiedEntries;
  const activeManifestEntries = current.coverage.activeManifestEntries;
  const accountedPercent =
    activeManifestEntries === 0
      ? 100
      : Number(((accountedEntries / activeManifestEntries) * 100).toFixed(4));
  const frameworkAuditPass = stored.pass && current.pass;

  return {
    schema: "framework_audit_verification_v1",
    target,
    targetEvidenceDigest: stored.evidenceDigest,
    storedRepositoryHead: stored.repositoryHead,
    currentRepositoryHead: current.repositoryHead,
    repositoryHeadMatch: stored.repositoryHead === current.repositoryHead,
    repositoryHeadPolicy: "digest-bound provenance; content-based freshness",
    byteContentAuditPass: current.pass,
    specialVerificationPass,
    frameworkAuditPass,
    activeManifestEntries,
    byteContentAuditedEntries,
    speciallyVerifiedEntries,
    accountedEntries,
    unaccountedEntries: activeManifestEntries - accountedEntries,
    accountedPercent,
    pass:
      frameworkAuditPass &&
      specialVerificationPass &&
      accountedEntries === activeManifestEntries,
  };
}

function classifyAuditManifest(files) {
  const rows = [];
  const unclassified = [];
  const counts = {};

  for (const file of files) {
    const auditClass = classifyAuditPath(file);
    if (!auditClass) {
      unclassified.push(file);
      continue;
    }
    rows.push({ path: file, auditClass });
    counts[auditClass] = (counts[auditClass] ?? 0) + 1;
  }

  const orderedCounts = Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
  return {
    classifiedEntries: rows.length,
    unclassified,
    classCoveragePercent:
      files.length === 0
        ? 100
        : Number(((rows.length / files.length) * 100).toFixed(4)),
    counts: orderedCounts,
    digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
  };
}

function classifyAuditPath(file) {
  if (file === GENERATED_AUDIT_PATH) return "benchmark-self-evidence";
  if (/^\.agent\/workflows\//.test(file)) return "workflow";
  if (/^\.agent\/context\/workflows\//.test(file)) return "workflow-contract";
  if (/^\.agent\/context\/skills\//.test(file)) return "skill-contract";
  if (/^\.agent\/context\//.test(file)) return "runtime-context";
  if (/^\.agent\/skills\/[^/]+\/SKILL\.md$/.test(file)) return "skill-entrypoint";
  if (/^\.agent\/skills\/.*\/(?:tests\/|test_)/.test(file)) return "test";
  if (/^\.agent\/skills\/interface-design\/data\//.test(file)) return "data";
  if (/^\.agent\/skills\/interface-design\/scripts\//.test(file)) return "tool";
  if (/^\.agent\/skills\/.*\/references\//.test(file)) return "skill-reference";
  if (/^\.agent\/skills\//.test(file)) return "skill-support";
  if (/^\.agent\/templates\//.test(file)) return "template";
  if (/^\.agent\/agents\//.test(file)) return "agent";
  if (/^\.agent\/hooks\//.test(file)) return "hook";
  if (/^\.agent\/tools\/.*\.test\.(?:mjs|js|py)$/.test(file)) return "test";
  if (/^\.agent\/tools\//.test(file)) return "tool";
  if (/^\.agent\/benchmarks\//.test(file)) return "benchmark-evidence";
  if (/^\.agent\/rules\//.test(file)) return "rule";
  if (/^\.codex\//.test(file)) return "host-adapter";
  if (/^\.claude\//.test(file)) return "host-rule";
  if (/^docs\//.test(file)) return "documentation";
  if (["AGENTS.md", "CLAUDE.md", "SUPER-COMPOUND.md"].includes(file)) {
    return "startup-contract";
  }
  if (["README.md", "WALKTHROUGH.md"].includes(file)) return "documentation";
  if ([".gitattributes", ".gitignore"].includes(file)) return "repository-config";
  return null;
}

async function readPhysicalInventory(root, activeManifest) {
  const active = new Set(activeManifest);
  const stack = [""];
  let files = 0;
  let filesRead = 0;
  let symlinks = 0;
  let outsideActiveManifestEntries = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    const absolute = path.join(root, current);
    const entries = (await readdir(absolute, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );

    for (const entry of entries) {
      const relative = normalizePath(
        current ? path.join(current, entry.name) : entry.name,
      );
      if (relative === ".git" || relative.startsWith(".git/")) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        symlinks += 1;
        continue;
      }
      if (entry.isDirectory()) {
        stack.push(relative);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      files += 1;
      await readFile(path.join(root, relative));
      filesRead += 1;
      if (!active.has(relative)) {
        outsideActiveManifestEntries += 1;
      }
    }
  }

  return {
    scope: "physical-worktree-excluding-.git",
    files,
    filesRead,
    symlinks,
    activeManifestEntries: activeManifest.length,
    outsideActiveManifestEntries,
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

function validateWorkflowInvariants(contents, findings) {
  const manifestPath = ".agent/context/workflow-invariants.json";
  const workflows = [...contents.keys()]
    .filter((file) => /^\.agent\/workflows\/sc-[^/]+\.md$/.test(file))
    .map((file) => path.basename(file, ".md"));
  if (workflows.length === 0) return;

  const text = contents.get(manifestPath);
  if (!text) {
    findings.push(
      finding(
        "P1",
        "WORKFLOW_INVARIANT_MANIFEST_MISSING",
        manifestPath,
        "Public workflows require a machine-readable quality invariant manifest.",
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
    manifest.schema !== "workflow_invariants_v1" ||
    !manifest.routes ||
    typeof manifest.routes !== "object" ||
    Array.isArray(manifest.routes)
  ) {
    findings.push(
      finding(
        "P1",
        "WORKFLOW_INVARIANT_MANIFEST_INVALID",
        manifestPath,
        "Expected workflow_invariants_v1 with a routes object.",
      ),
    );
    return;
  }

  const expected = new Set(workflows);
  for (const route of workflows) {
    const spec = manifest.routes[route];
    if (!spec) {
      findings.push(
        finding(
          "P1",
          "WORKFLOW_INVARIANT_GAP",
          manifestPath,
          `Missing route ${route}.`,
        ),
      );
      continue;
    }
    for (const field of ["authority", "mutation", "evidenceSink"]) {
      if (typeof spec[field] !== "string" || !spec[field].trim()) {
        findings.push(
          finding(
            "P1",
            "WORKFLOW_INVARIANT_FIELD_MISSING",
            manifestPath,
            `${route} requires ${field}.`,
          ),
        );
      }
    }
    if (!Array.isArray(spec.nextOwners) || spec.nextOwners.length === 0) {
      findings.push(
        finding(
          "P1",
          "WORKFLOW_NEXT_OWNER_MISSING",
          manifestPath,
          `${route} requires at least one next owner.`,
        ),
      );
    } else {
      for (const owner of spec.nextOwners) {
        if (
          !expected.has(owner) &&
          !["caller", "dynamic-public-route", "stage-next-route"].includes(owner)
        ) {
          findings.push(
            finding(
              "P1",
              "WORKFLOW_NEXT_OWNER_INVALID",
              manifestPath,
              `${route} has invalid next owner ${owner}.`,
            ),
          );
        }
      }
    }
    const surfaces = [
      ["workflowMarkers", `.agent/workflows/${route}.md`],
      ["contractMarkers", `.agent/context/workflows/${route}.contract.md`],
    ];
    for (const [field, file] of surfaces) {
      if (!Array.isArray(spec[field]) || spec[field].length === 0) {
        findings.push(
          finding(
            "P1",
            "WORKFLOW_INVARIANT_MARKERS_MISSING",
            manifestPath,
            `${route} requires ${field}.`,
          ),
        );
        continue;
      }
      const surface = contents.get(file) ?? "";
      for (const marker of spec[field]) {
        let expression;
        try {
          expression = new RegExp(marker, "i");
        } catch {
          findings.push(
            finding(
              "P1",
              "WORKFLOW_INVARIANT_REGEX_INVALID",
              manifestPath,
              `${route} has invalid marker in ${field}.`,
            ),
          );
          continue;
        }
        if (!expression.test(surface)) {
          findings.push(
            finding(
              "P1",
              "WORKFLOW_INVARIANT_NOT_PRESERVED",
              file,
              `${route} is missing a required ${field} marker.`,
            ),
          );
        }
      }
    }
  }
  for (const route of Object.keys(manifest.routes)) {
    if (!expected.has(route)) {
      findings.push(
        finding(
          "P2",
          "WORKFLOW_INVARIANT_ORPHAN",
          manifestPath,
          `Invariant route has no public workflow: ${route}.`,
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

  if (report.schema !== "token_benchmark_report_v3") {
    invalidReasons.push("schema is not token_benchmark_report_v3");
  }
  if (report.suiteDefinitionDigest !== digestBenchmarkSuite(DEFAULT_SCENARIOS)) {
    invalidReasons.push("benchmark suite definition digest is missing or stale");
  }
  if (
    report.methodology?.kind !== "modeled-static-first-hop-surface" ||
    !/not host-observed runtime usage/i.test(
      String(report.methodology?.limitation ?? ""),
    )
  ) {
    invalidReasons.push("static benchmark methodology or limitation is missing");
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
  const expectedRunDigest = createHash("sha256")
    .update(JSON.stringify(report.result))
    .digest("hex");
  if (
    !Array.isArray(report.runDigests) ||
    report.runDigests.length !== 1 ||
    report.runDigests[0]?.digest !== expectedRunDigest ||
    report.runDigests[0]?.count !== report.repeat ||
    report.runDigests[0]?.count !== report.consecutivePasses
  ) {
    invalidReasons.push("run digest/count does not prove the recorded repeats");
  }
  if (!report.pass || !report.result?.summary?.pass) {
    invalidReasons.push("benchmark gate did not pass");
  }
  if (report.authoritative !== true) {
    invalidReasons.push("benchmark report is not authoritative");
  }
  if (!validThreshold) {
    invalidReasons.push("reduction threshold must be between 90 and 100");
  }
  const recordedWorkflowEvidence = {
    schema: "workflow_evidence_matrix_v1",
    claimScope: report.claimScope,
    coverage: report.coverage,
    workflowMatrix: report.workflowMatrix,
    gates: report.gates,
    evidenceDigests: report.evidenceDigests,
    runtimeEvidence: report.runtimeEvidence,
    runtimePass: report.runtimePass,
    staticPass: report.staticPass,
  };
  try {
    validateWorkflowEvidence(recordedWorkflowEvidence);
  } catch (error) {
    invalidReasons.push(`workflow evidence matrix is invalid: ${compactError(error)}`);
  }
  if (missingScenarios.length > 0 || actualNames.size !== expectedNames.size) {
    invalidReasons.push(
      `scenario coverage differs (${missingScenarios.slice(0, 5).join(", ") || "unexpected scenario"})`,
    );
  }
  if (validDigestRows !== expectedNames.size) {
    invalidReasons.push("scenario after-surface digests are missing or invalid");
  }
  const stages = report.result?.summary?.stages;
  if (report.result?.summary?.aggregation !== "scenario-weighted") {
    invalidReasons.push("benchmark aggregate is not labeled scenario-weighted");
  }
  for (const stage of ["input", "process", "output"]) {
    const summary = stages?.[stage];
    if (
      !summary?.pass ||
      !Number.isFinite(summary.totalReductionPercent) ||
      !Number.isFinite(summary.minimumReductionPercent) ||
      summary.reductionScenarioCount < 1 ||
      summary.totalReductionPercent <= recordedThreshold ||
      summary.minimumReductionPercent <= recordedThreshold ||
      summary.aggregation !== "scenario-weighted"
    ) {
      invalidReasons.push(`${stage} stage evidence is missing or below threshold`);
    }
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

  let baselineEvidence;
  try {
    baselineEvidence = await validateBaselineProvenance(
      root,
      DEFAULT_SCENARIOS,
      baseline,
      { rawText: baselineText },
    );
  } catch (error) {
    findings.push(
      finding(
        "P1",
        "BENCHMARK_BASELINE_INVALID",
        baselinePath,
        compactError(error),
      ),
    );
    return;
  }
  if (report.baselineDigest !== baselineEvidence.baselineDigest) {
    findings.push(
      finding(
        "P1",
        "BENCHMARK_BASELINE_STALE",
        reportPath,
        "Report baseline digest does not match the verified baseline file.",
      ),
    );
  }

  let current;
  try {
    current = await evaluateScenarios(
      root,
      DEFAULT_SCENARIOS,
      baseline,
      validThreshold ? recordedThreshold : 90,
    );
  } catch (error) {
    findings.push(
      finding("P1", "BENCHMARK_EVALUATION_FAILED", reportPath, compactError(error)),
    );
    return;
  }
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
      row.stage !== scenario.stage ||
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

  const recordedStages = report.result?.summary?.stages ?? {};
  for (const [stage, summary] of Object.entries(current.summary.stages)) {
    const row = recordedStages[stage];
    if (
      !row ||
      row.pass !== summary.pass ||
      row.reductionScenarioCount !== summary.reductionScenarioCount ||
      row.budgetScenarioCount !== summary.budgetScenarioCount ||
      row.totalBeforeTokens !== summary.totalBeforeTokens ||
      row.totalAfterTokens !== summary.totalAfterTokens ||
      row.totalReductionPercent !== Number(summary.totalReductionPercent.toFixed(4)) ||
      row.minimumReductionPercent !==
        Number(summary.minimumReductionPercent.toFixed(4)) ||
      row.aggregation !== summary.aggregation
    ) {
      findings.push(
        finding(
          "P1",
          "BENCHMARK_STAGE_EVIDENCE_STALE",
          reportPath,
          `Rerun benchmark; stale ${stage} stage summary.`,
        ),
      );
    }
  }

  try {
    const workflowInvariantText = contents.get(
      ".agent/context/workflow-invariants.json",
    );
    const outputBudgetText = contents.get(".agent/context/output-budgets.json");
    if (!workflowInvariantText || !outputBudgetText) {
      throw new Error("workflow invariant or output budget source is missing");
    }
    const runtimeEvidence = {
      ...(report.runtimeEvidence ?? {}),
      runtimePass: report.runtimePass,
    };
    const expectedWorkflowEvidence = buildWorkflowEvidenceMatrix({
      scenarios: DEFAULT_SCENARIOS,
      benchmarkResult: current,
      workflowInvariants: JSON.parse(workflowInvariantText),
      outputBudgets: JSON.parse(outputBudgetText),
      sourceDigests: {
        workflowInvariants: createHash("sha256")
          .update(workflowInvariantText)
          .digest("hex"),
        outputBudgets: createHash("sha256")
          .update(outputBudgetText)
          .digest("hex"),
      },
      runtimeEvidence,
    });
    if (
      JSON.stringify(recordedWorkflowEvidence) !==
      JSON.stringify(expectedWorkflowEvidence)
    ) {
      findings.push(
        finding(
          "P1",
          "WORKFLOW_EVIDENCE_MATRIX_STALE",
          reportPath,
          "Rerun benchmark; the 17x3 workflow evidence matrix is stale.",
        ),
      );
    }
  } catch (error) {
    findings.push(
      finding(
        "P1",
        "WORKFLOW_EVIDENCE_MATRIX_INVALID",
        reportPath,
        compactError(error),
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
    `Manifest source/head: ${report.summary.manifestSource}/${report.repositoryHead}`,
    `Manifest/audited/excluded: ${report.summary.manifestFiles}/${report.summary.auditedFiles}/${report.summary.excludedFiles.length}`,
    `Manifest accounted: ${report.coverage.accountedEntries}/${report.coverage.activeManifestEntries} (${report.coverage.accountedPercent}%; byte/content ${report.coverage.byteContentAuditPercent}%; classified ${report.coverage.classCoveragePercent}%)`,
    `Physical files read: ${report.physicalInventory.filesRead}/${report.physicalInventory.files} (${report.physicalInventory.outsideActiveManifestEntries} outside active manifest)`,
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
  let verifyExisting;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") {
      output = args[index + 1];
      index += 1;
    } else if (args[index] === "--verify-existing") {
      verifyExisting = args[index + 1];
      index += 1;
    } else if (args[index] === "--json") {
      json = true;
    } else if (args[index] === "--help" || args[index] === "-h") {
      console.log(
        "Usage: node .agent/tools/framework-audit.mjs [--json] [--output <path> | --verify-existing <path>]",
      );
      return;
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }

  const root = process.cwd();
  if (output && verifyExisting) {
    throw new Error("Use either --output or --verify-existing, not both");
  }
  const outputAbsolute = output
    ? await resolveBenchmarkOutputPath(root, output)
    : null;
  const verifyAbsolute = verifyExisting
    ? await resolveBenchmarkOutputPath(root, verifyExisting)
    : null;
  if (verifyAbsolute) {
    const verification = await verifyStoredAuditEvidence(root, verifyExisting, {
      requireGitManifest: true,
    });
    console.log(
      json
        ? JSON.stringify(verification, null, 2)
        : `Verified stored audit evidence: ${verifyExisting} (${verification.accountedEntries}/${verification.activeManifestEntries} accounted)`,
    );
    if (!verification.pass) {
      process.exitCode = 1;
    }
    return;
  }

  const outputRelative = outputAbsolute
    ? normalizePath(path.relative(root, outputAbsolute))
    : null;
  const report = await auditRepository(root, {
    excludePaths: outputRelative ? [outputRelative] : [],
    requireGitManifest: true,
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
