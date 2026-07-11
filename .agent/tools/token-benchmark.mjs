#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWorkflowEvidenceMatrix,
  createUnattachedWorkflowEvidence,
  validateWorkflowEvidence,
} from "./evidence-matrix.mjs";
import { analyzeTranscript } from "./transcript-usage.mjs";

export const METRIC = "deterministic_estimated_tokens_v1";

const LEGACY_PRELOAD_SCENARIOS = [
  {
    name: "legacy-eager-preload",
    description:
      "Historical anti-pattern that eagerly preloaded every framework surface; not a harness startup claim.",
    before: [
      ".agent/rules/*.md",
      ".agent/workflows/*.md",
      ".agent/skills/**/SKILL.md",
      ".agent/templates/agentic-delivery/*.md",
      ".agent/hooks/**/*.js",
      ".agent/hooks/*.json",
      ".agent/agents/*.md",
      ".agent/skills/interface-design/data/**/*.csv",
    ],
    after: [
      ".agent/context/rule-index.md",
      ".agent/context/workflow-dispatch.md",
      ".agent/context/routing-index.md",
      ".agent/context/skill-index.md",
      ".agent/context/template-index.md",
      ".agent/context/token-budget-gates.md",
    ],
  },
];

const STARTUP_BUDGET_SCENARIOS = [
  {
    name: "startup-codex-repository",
    description: "Repository-owned Codex startup instructions.",
    before: ["AGENTS.md"],
    after: ["AGENTS.md"],
    maxAfterTokens: 2000,
  },
  {
    name: "startup-claude-repository",
    description:
      "Worst-case repository-owned Claude startup context while editing framework/docs paths.",
    before: ["CLAUDE.md", "AGENTS.md", ".claude/rules/*.md"],
    after: ["CLAUDE.md", "AGENTS.md", ".claude/rules/*.md"],
    maxAfterTokens: 3000,
  },
  {
    name: "startup-antigravity-rules",
    description: "Antigravity always-on .agent/rules context.",
    before: [".agent/rules/*.md"],
    after: [".agent/rules/*.md"],
    maxAfterTokens: 2750,
  },
  {
    name: "startup-codex-adapter-metadata",
    description: "Native Codex adapter discovery metadata.",
    before: [".codex/SKILL.md"],
    after: [".codex/SKILL.md"],
    measure: "skill-metadata",
    maxAfterTokens: 200,
  },
  {
    name: "startup-installed-skill-metadata",
    description:
      "Worst-case bundled framework skill metadata (name and description only).",
    before: [".agent/skills/**/SKILL.md"],
    after: [".agent/skills/**/SKILL.md"],
    measure: "skill-metadata",
    maxAfterTokens: 2500,
  },
];

const WORKFLOW_SCENARIOS = [
  {
    name: "sc-init",
    description: "/sc-init project scan and config orientation.",
    before: [
      ".agent/rules/project-config.md",
      ".agent/workflows/sc-init.md",
      "README.md",
      "AGENTS.md",
    ],
    after: [".agent/context/workflows/sc-init.contract.md"],
  },
  {
    name: "sc-status",
    description: "/sc-status handoff, state, issue dashboard, and route selection.",
    before: [
      ".agent/workflows/sc-status.md",
      ".agent/skills/state-management/SKILL.md",
      ".agent/skills/context-engineering/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-status.contract.md"],
  },
  {
    name: "sc-geniusloop",
    description: "/sc-geniusloop proactive improvement ideation and Brain filtering.",
    before: [
      ".agent/workflows/sc-geniusloop.md",
      ".agent/skills/brainstorming/SKILL.md",
      ".agent/skills/codebase-design/SKILL.md",
      ".agent/skills/domain-modeling/SKILL.md",
      ".agent/skills/subagent-orchestration/SKILL.md",
      ".agent/agents/brain.md",
    ],
    after: [
      ".agent/context/workflows/sc-geniusloop.contract.md",
      ".agent/context/agent-index.md",
    ],
  },
  {
    name: "sc-explore",
    description: "/sc-explore BRD exploration and open-decision capture.",
    before: [
      ".agent/workflows/sc-explore.md",
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/brainstorming/SKILL.md",
      ".agent/skills/domain-modeling/SKILL.md",
      ".agent/skills/codebase-design/SKILL.md",
      ".agent/skills/prototyping/SKILL.md",
      ".agent/templates/agentic-delivery/BRD-Agentic-Ready-Reusable-Template.md",
    ],
    after: [
      ".agent/context/workflows/sc-explore.contract.md",
      ".agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md",
    ],
  },
  {
    name: "sc-research",
    description: "/sc-research local and official-doc evidence gathering.",
    before: [
      ".agent/workflows/sc-research.md",
      ".agent/skills/context7-docs/SKILL.md",
      ".agent/skills/compatibility-check/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-research.contract.md"],
  },
  {
    name: "sc-prd",
    description: "/sc-prd PRD generation from approved BRD.",
    before: [
      ".agent/workflows/sc-prd.md",
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/prd-generator/SKILL.md",
      ".agent/skills/domain-modeling/SKILL.md",
      ".agent/skills/codebase-design/SKILL.md",
      ".agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md",
    ],
    after: [
      ".agent/context/workflows/sc-prd.contract.md",
      ".agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md",
    ],
  },
  {
    name: "sc-plan",
    description: "/sc-plan FSD planning and issue pointer routing.",
    before: [
      ".agent/rules/super-compound.md",
      ".agent/rules/quality-gates.md",
      ".agent/workflows/sc-plan.md",
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/writing-plans/SKILL.md",
      ".agent/skills/issue-workflow/SKILL.md",
      ".agent/skills/triage-workflow/SKILL.md",
      ".agent/skills/plan-verification/SKILL.md",
      ".agent/skills/domain-modeling/SKILL.md",
      ".agent/skills/codebase-design/SKILL.md",
      ".agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md",
      ".agent/templates/agentic-delivery/ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md",
    ],
    after: [
      ".agent/workflows/sc-plan.md",
      ".agent/context/workflows/sc-plan.contract.md",
      ".agent/context/skills/sc-plan.contract.md",
      ".agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/ADR-Skeleton-OPTIONAL.md",
      ".agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md",
    ],
  },
  {
    name: "sc-eval",
    description: "/sc-eval measurable pass/fail criteria and eval runs.",
    before: [
      ".agent/workflows/sc-eval.md",
      ".agent/skills/eval-harness/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-eval.contract.md"],
  },
  {
    name: "sc-go",
    description: "/sc-go preview-first Git branch, worktree, commit, push, and PR operations.",
    before: [
      ".agent/workflows/sc-go.md",
      ".agent/skills/git-workflow-operation/SKILL.md",
      ".agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md",
      ".agent/tools/git-workflow.mjs",
    ],
    after: [
      ".agent/context/workflows/sc-go.contract.md",
      ".agent/context/skills/git-workflow-operation.contract.md",
    ],
  },
  {
    name: "sc-work",
    description: "/sc-work goal execution with focused context.",
    before: [
      ".agent/rules/super-compound.md",
      ".agent/rules/quality-gates.md",
      ".agent/workflows/sc-work.md",
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/context-engineering/SKILL.md",
      ".agent/skills/executing-plans/SKILL.md",
      ".agent/skills/test-driven-development/SKILL.md",
      ".agent/skills/verification-before-completion/SKILL.md",
      ".agent/skills/parallel-execution/SKILL.md",
      ".agent/skills/integration-checking/SKILL.md",
    ],
    after: [
      ".agent/context/workflows/sc-work.contract.md",
      ".agent/context/skills/sc-work.contract.md",
      ".agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md",
    ],
  },
  {
    name: "sc-debug",
    description: "/sc-debug reproduce, root cause, fix, and verify.",
    before: [
      ".agent/workflows/sc-debug.md",
      ".agent/skills/systematic-debugging/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-debug.contract.md"],
  },
  {
    name: "sc-review",
    description: "/sc-review findings-first review.",
    before: [
      ".agent/workflows/sc-review.md",
      ".agent/skills/code-review/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-review.contract.md"],
  },
  {
    name: "sc-audit",
    description: "/sc-audit security, compatibility, compliance, and readiness audit.",
    before: [
      ".agent/workflows/sc-audit.md",
      ".agent/skills/security-audit/SKILL.md",
      ".agent/skills/compatibility-check/SKILL.md",
      ".agent/skills/threat-modeling/SKILL.md",
      ".agent/skills/data-privacy/SKILL.md",
      ".agent/skills/secure-code-patterns/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-audit.contract.md"],
  },
  {
    name: "sc-compound",
    description: "/sc-compound reusable knowledge capture.",
    before: [
      ".agent/workflows/sc-compound.md",
      ".agent/skills/knowledge-compounding/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-compound.contract.md"],
  },
  {
    name: "sc-pause",
    description: "/sc-pause durable handoff before stopping.",
    before: [
      ".agent/workflows/sc-pause.md",
      ".agent/skills/state-management/SKILL.md",
      ".agent/skills/context-engineering/SKILL.md",
    ],
    after: [".agent/context/workflows/sc-pause.contract.md"],
  },
  {
    name: "sc-launch",
    description: "/sc-launch complete lifecycle routing.",
    before: [
      ".agent/workflows/*.md",
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/brainstorming/SKILL.md",
      ".agent/skills/prd-generator/SKILL.md",
      ".agent/skills/writing-plans/SKILL.md",
      ".agent/skills/issue-workflow/SKILL.md",
      ".agent/skills/executing-plans/SKILL.md",
      ".agent/skills/code-review/SKILL.md",
      ".agent/skills/security-audit/SKILL.md",
      ".agent/skills/knowledge-compounding/SKILL.md",
      ".agent/templates/agentic-delivery/*.md",
    ],
    after: [
      ".agent/context/workflows/sc-launch.contract.md",
      ".agent/context/workflow-dispatch.md",
      ".agent/context/template-index.md",
    ],
  },
  {
    name: "sc-ui",
    description: "/sc-ui interface-design search-only guidance.",
    before: [
      ".agent/rules/super-compound.md",
      ".agent/workflows/sc-ui.md",
      ".agent/skills/interface-design/SKILL.md",
      ".agent/skills/interface-design/scripts/*.py",
      ".agent/skills/interface-design/data/**/*.csv",
    ],
    after: [
      ".agent/workflows/sc-ui.md",
      ".agent/context/workflows/sc-ui.contract.md",
      ".agent/context/skills/interface-design.contract.md",
      ".agent/skills/interface-design/SKILL.md",
    ],
  },
];

const RELATED_HOTSPOT_SCENARIOS = [
  {
    name: "artifact-output-brd-prd-fsd-issue",
    description: "Generated BRD/PRD/FSD/ADR artifact and goal issue surfaces.",
    before: [
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/issue-workflow/SKILL.md",
      ".agent/templates/agentic-delivery/BRD-Agentic-Ready-Reusable-Template.md",
      ".agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md",
      ".agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md",
      ".agent/templates/agentic-delivery/ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md",
    ],
    after: [
      ".agent/context/template-index.md",
      ".agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/ADR-Skeleton-OPTIONAL.md",
      ".agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md",
    ],
  },
  {
    name: "related-all-skills",
    description: "All skill procedures as a single preload hotspot.",
    before: [".agent/skills/**/SKILL.md"],
    after: [".agent/context/skill-index.md"],
  },
  {
    name: "related-delivery-planning-skills",
    description: "Agentic delivery, PRD/FSD planning, issue, and verification skills.",
    before: [
      ".agent/skills/agentic-delivery/SKILL.md",
      ".agent/skills/writing-plans/SKILL.md",
      ".agent/skills/issue-workflow/SKILL.md",
      ".agent/skills/plan-verification/SKILL.md",
      ".agent/skills/prd-generator/SKILL.md",
    ],
    after: [".agent/context/skills/delivery-planning.contract.md"],
  },
  {
    name: "related-execution-verification-skills",
    description: "Execution, context, TDD, verification, and integration skills.",
    before: [
      ".agent/skills/executing-plans/SKILL.md",
      ".agent/skills/test-driven-development/SKILL.md",
      ".agent/skills/verification-before-completion/SKILL.md",
      ".agent/skills/context-engineering/SKILL.md",
      ".agent/skills/integration-checking/SKILL.md",
    ],
    after: [".agent/context/skills/execution-verification.contract.md"],
  },
  {
    name: "related-risk-audit-skills",
    description: "Security, compatibility, threat, privacy, and secure-code skills.",
    before: [
      ".agent/skills/security-audit/SKILL.md",
      ".agent/skills/compatibility-check/SKILL.md",
      ".agent/skills/threat-modeling/SKILL.md",
      ".agent/skills/data-privacy/SKILL.md",
      ".agent/skills/secure-code-patterns/SKILL.md",
    ],
    after: [".agent/context/skills/risk-audit.contract.md"],
  },
  {
    name: "related-agentic-templates",
    description: "Full BRD/PRD/FSD/ADR templates as a preload hotspot.",
    before: [".agent/templates/agentic-delivery/*.md"],
    after: [
      ".agent/context/template-index.md",
      ".agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md",
      ".agent/templates/agentic-delivery/skeletons/ADR-Skeleton-OPTIONAL.md",
      ".agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md",
    ],
  },
  {
    name: "related-git-workflow",
    description: "Git workflow skill, template, and helper as a preload hotspot.",
    before: [
      ".agent/skills/git-workflow-operation/SKILL.md",
      ".agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md",
      ".agent/tools/git-workflow.mjs",
    ],
    after: [
      ".agent/context/workflows/sc-go.contract.md",
      ".agent/context/skills/git-workflow-operation.contract.md",
    ],
  },
  {
    name: "related-interface-data",
    description: "Interface-design CSV data preload hotspot.",
    before: [".agent/skills/interface-design/data/**/*.csv"],
    after: [".agent/context/skills/interface-design.contract.md"],
  },
  {
    name: "related-interface-scripts",
    description: "Interface-design script preload hotspot.",
    before: [".agent/skills/interface-design/scripts/*.py"],
    after: [".agent/context/skills/interface-design.contract.md"],
  },
  {
    name: "related-hooks",
    description: "Hook script/config preload hotspot.",
    before: [".agent/hooks/**/*.js", ".agent/hooks/*.json"],
    after: [".agent/context/hook-index.md"],
  },
  {
    name: "related-agents",
    description: "Specialized agent prompt preload hotspot.",
    before: [".agent/agents/*.md"],
    after: [".agent/context/agent-index.md"],
  },
  {
    name: "related-all-workflows",
    description: "All public workflow files as a preload hotspot.",
    before: [".agent/workflows/*.md"],
    after: [".agent/context/workflow-dispatch.md"],
  },
  {
    name: "related-rules",
    description: "All always-on rules as a preload hotspot.",
    before: [".agent/rules/*.md"],
    after: [".agent/context/rule-index.md"],
  },
];

const INPUT_STAGE_SCENARIOS = new Set([
  "legacy-eager-preload",
  "startup-codex-repository",
  "startup-codex-adapter-metadata",
  "startup-claude-repository",
  "startup-antigravity-rules",
  "startup-installed-skill-metadata",
  "related-all-skills",
  "related-interface-data",
  "related-rules",
]);
const OUTPUT_STAGE_SCENARIOS = new Set([
  "artifact-output-brd-prd-fsd-issue",
  "related-agentic-templates",
]);

function scenarioStage(name) {
  if (INPUT_STAGE_SCENARIOS.has(name)) return "input";
  if (OUTPUT_STAGE_SCENARIOS.has(name)) return "output";
  return "process";
}

export const DEFAULT_SCENARIOS = [
  ...LEGACY_PRELOAD_SCENARIOS,
  ...STARTUP_BUDGET_SCENARIOS,
  ...WORKFLOW_SCENARIOS.map((scenario) => ({
    ...scenario,
    after: [".codex/SKILL.md", ...scenario.after],
    semanticContract: `workflow-invariants-v1/${scenario.name}`,
  })),
  ...RELATED_HOTSPOT_SCENARIOS,
].map((scenario) => ({ ...scenario, stage: scenarioStage(scenario.name) }));

const DEFAULT_THRESHOLD = 90;

export function estimateTokens(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const pieces = normalized.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g);
  return pieces ? pieces.length : 0;
}

export async function expandPatterns(root, patterns, options = {}) {
  const allFiles = await listFiles(root);
  const selected = new Set();
  const ordered = [];

  for (const pattern of patterns) {
    if (
      typeof pattern !== "string" ||
      !pattern.trim() ||
      path.isAbsolute(pattern) ||
      path.win32.isAbsolute(pattern) ||
      path.posix.isAbsolute(pattern) ||
      pattern.replace(/\\/g, "/").split("/").includes("..")
    ) {
      throw new Error(`Scenario patterns must be repository-relative: ${pattern}`);
    }
    await resolveRepositoryPath(root, pattern);
    const normalizedPattern = normalizePath(pattern);
    let matched = false;

    if (!hasGlob(normalizedPattern)) {
      const absolute = path.join(root, normalizedPattern);
      const info = await lstat(absolute).catch(() => null);

      if (info?.isSymbolicLink()) {
        throw new Error(`Scenario path is a symlink: ${normalizedPattern}`);
      }
      if (info?.isFile()) {
        addSelected(selected, ordered, normalizedPattern);
        matched = true;
      } else if (info?.isDirectory()) {
        for (const file of allFiles) {
          if (file.startsWith(`${normalizedPattern}/`)) {
            addSelected(selected, ordered, file);
            matched = true;
          }
        }
      }
    } else {
      const matcher = globToRegExp(normalizedPattern);
      for (const file of allFiles) {
        if (matcher.test(file)) {
          addSelected(selected, ordered, file);
          matched = true;
        }
      }
    }

    if (options.requireEveryPattern && !matched) {
      throw new Error(`Benchmark pattern matched no files: ${normalizedPattern}`);
    }
  }

  return ordered;
}

function addSelected(selected, ordered, file) {
  if (!selected.has(file)) {
    selected.add(file);
    ordered.push(file);
  }
}

export async function countScenarioTokens(root, patterns, options = {}) {
  const files = await expandPatterns(root, patterns, options);
  let tokens = 0;
  let chars = 0;
  let bytes = 0;
  const digest = createHash("sha256");

  for (const file of files) {
    const absolute = path.join(root, file);
    const buffer = await readFile(absolute);
    const content = buffer.toString("utf8");
    tokens += estimateTokens(content);
    chars += content.length;
    bytes += buffer.length;
    digest.update(file);
    digest.update("\0");
    digest.update(buffer);
    digest.update("\0");
  }

  return {
    tokens,
    chars,
    bytes,
    fileCount: files.length,
    files,
    contentDigest: digest.digest("hex"),
  };
}

export async function countSkillMetadataTokens(
  root,
  patterns = [".agent/skills/**/SKILL.md"],
) {
  const files = await expandPatterns(
    root,
    patterns,
    { requireEveryPattern: true },
  );
  const metadata = [];
  const digest = createHash("sha256");

  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf8");
    const normalized = content.replace(/\r\n/g, "\n");
    const end = normalized.startsWith("---\n")
      ? normalized.indexOf("\n---\n", 4)
      : -1;
    const frontmatter = end >= 0 ? normalized.slice(4, end) : "";
    const name = readFrontmatterValue(frontmatter, "name");
    const description = readFrontmatterValue(frontmatter, "description");
    const entry = `${name}\n${description}`;
    metadata.push(entry);
    digest.update(file);
    digest.update("\0");
    digest.update(entry);
    digest.update("\0");
  }

  const text = metadata.join("\n");
  return {
    tokens: estimateTokens(text),
    chars: text.length,
    bytes: Buffer.byteLength(text, "utf8"),
    fileCount: files.length,
    files,
    contentDigest: digest.digest("hex"),
  };
}

function readFrontmatterValue(frontmatter, key) {
  const line = frontmatter
    .split("\n")
    .find((candidate) => candidate.startsWith(`${key}:`));
  return line
    ? line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "")
    : "";
}

async function countScenarioSurface(root, scenario, side) {
  if (scenario.measure === "skill-metadata") {
    return countSkillMetadataTokens(root, scenario[side]);
  }
  return countScenarioTokens(root, scenario[side], {
    requireEveryPattern: true,
  });
}

export async function createBaseline(root, scenarios = DEFAULT_SCENARIOS) {
  const baseline = {};

  for (const scenario of scenarios.filter(
    (candidate) => !Number.isFinite(candidate.maxAfterTokens),
  )) {
    baseline[scenario.name] = await countScenarioSurface(
      root,
      scenario,
      "before",
    );
  }

  return {
    schema: "token_benchmark_baseline_v2",
    metric: METRIC,
    assembledAt: new Date().toISOString(),
    provenance: { mode: "working-tree" },
    beforeDefinitionDigest: digestScenarioDefinitions(scenarios),
    scenarios: baseline,
  };
}

export function digestScenarioDefinitions(scenarios) {
  const definitions = scenarios
    .filter((scenario) => !Number.isFinite(scenario.maxAfterTokens))
    .map(({ name, before }) => ({ name, before }));
  return createHash("sha256").update(JSON.stringify(definitions)).digest("hex");
}

export function digestBenchmarkSuite(scenarios) {
  const definitions = scenarios.map((scenario) => ({
    name: scenario.name,
    description: scenario.description ?? "",
    stage: scenario.stage ?? "process",
    before: scenario.before,
    after: scenario.after,
    measure: scenario.measure ?? "full-content",
    maxAfterTokens: Number.isFinite(scenario.maxAfterTokens)
      ? scenario.maxAfterTokens
      : null,
    semanticContract: scenario.semanticContract ?? null,
  }));
  return createHash("sha256").update(JSON.stringify(definitions)).digest("hex");
}

function baselineScenariosOf(baseline) {
  return baseline?.scenarios ?? baseline;
}

function validateBaselineEntries(scenarios, baseline) {
  const expected = scenarios.filter(
    (scenario) => !Number.isFinite(scenario.maxAfterTokens),
  );
  const entries = baselineScenariosOf(baseline);
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    throw new Error("Invalid baseline: scenarios object is required");
  }
  const expectedNames = new Set(expected.map(({ name }) => name));
  const missing = expected.filter(({ name }) => !entries[name]).map(({ name }) => name);
  const extra = Object.keys(entries).filter((name) => !expectedNames.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing baseline scenarios: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    throw new Error(`Unexpected baseline scenarios: ${extra.join(", ")}`);
  }

  const hasGitProvenance = baseline?.provenance?.mode === "git";
  for (const { name } of expected) {
    const entry = entries[name];
    for (const field of ["tokens", "chars", "bytes", "fileCount"]) {
      if (!Number.isSafeInteger(entry[field]) || entry[field] < 0) {
        throw new Error(`Invalid baseline ${name}: ${field}`);
      }
    }
    if (
      !Array.isArray(entry.files) ||
      entry.files.length === 0 ||
      entry.fileCount !== entry.files.length ||
      new Set(entry.files).size !== entry.files.length
    ) {
      throw new Error(`Invalid baseline ${name}: files`);
    }
    if (
      !hasGitProvenance &&
      !/^[a-f0-9]{64}$/.test(String(entry.contentDigest ?? ""))
    ) {
      throw new Error(`Invalid baseline ${name}: content digest`);
    }
    if (hasGitProvenance && "contentDigest" in entry) {
      throw new Error(
        `Invalid baseline ${name}: per-scenario content digest is unsupported; use provenance content digest`,
      );
    }
  }
  return entries;
}

function runGit(root, args) {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Git ${args[0]} failed: ${Buffer.from(stderr ?? "").toString("utf8").trim()}`,
            ),
          );
          return;
        }
        resolve(Buffer.from(stdout));
      },
    );
  });
}

async function assertGitCommitProvenance(root, commit) {
  const type = (await runGit(root, ["cat-file", "-t", commit]))
    .toString("utf8")
    .trim();
  if (type !== "commit") {
    throw new Error(`Invalid baseline provenance: ${commit} is not a commit`);
  }
  try {
    await runGit(root, ["merge-base", "--is-ancestor", commit, "HEAD"]);
  } catch {
    throw new Error(
      `Invalid baseline provenance: ${commit} is not an ancestor of HEAD`,
    );
  }
  const committedAt = (await runGit(root, ["show", "-s", "--format=%cI", commit]))
    .toString("utf8")
    .trim();
  const timestamp = Date.parse(committedAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid baseline provenance timestamp for ${commit}`);
  }
  return timestamp;
}

async function listGitFiles(root, commit) {
  const output = await runGit(root, [
    "ls-tree",
    "-r",
    "--name-only",
    "-z",
    commit,
  ]);
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(normalizePath)
    .sort((left, right) => left.localeCompare(right));
}

function expandPatternsFromList(patterns, allFiles) {
  const selected = new Set();
  const ordered = [];
  for (const rawPattern of patterns) {
    const pattern = normalizePath(rawPattern);
    const matcher = hasGlob(pattern) ? globToRegExp(pattern) : null;
    let matched = false;
    for (const file of allFiles) {
      if ((matcher && matcher.test(file)) || (!matcher && file === pattern)) {
        addSelected(selected, ordered, file);
        matched = true;
      }
    }
    if (!matched) {
      throw new Error(`Baseline pattern matched no Git files: ${pattern}`);
    }
  }
  return ordered;
}

function readGitBlobs(root, specs) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["cat-file", "--batch"], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Git cat-file failed: ${Buffer.concat(stderr).toString("utf8").trim()}`));
        return;
      }
      try {
        const output = Buffer.concat(stdout);
        const blobs = new Map();
        let offset = 0;
        for (const spec of specs) {
          const newline = output.indexOf(10, offset);
          if (newline < 0) throw new Error(`Missing Git header for ${spec}`);
          const header = output.subarray(offset, newline).toString("utf8");
          offset = newline + 1;
          const match = header.match(/^[a-f0-9]{40} blob (\d+)$/);
          if (!match) throw new Error(`Invalid Git blob for ${spec}: ${header}`);
          const size = Number(match[1]);
          const content = output.subarray(offset, offset + size);
          offset += size;
          if (output[offset] !== 10) throw new Error(`Invalid Git blob terminator for ${spec}`);
          offset += 1;
          blobs.set(spec, content);
        }
        resolve(blobs);
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(`${specs.join("\n")}\n`);
  });
}

function measureGitSurface(commit, files, blobs) {
  let tokens = 0;
  let chars = 0;
  let bytes = 0;
  const digest = createHash("sha256");
  for (const file of files) {
    const buffer = blobs.get(`${commit}:${file}`);
    if (!buffer) throw new Error(`Missing Git content: ${commit}:${file}`);
    const content = buffer.toString("utf8");
    tokens += estimateTokens(content);
    chars += content.length;
    bytes += buffer.length;
    digest.update(file);
    digest.update("\0");
    digest.update(buffer);
    digest.update("\0");
  }
  return {
    tokens,
    chars,
    bytes,
    fileCount: files.length,
    files,
    contentDigest: digest.digest("hex"),
  };
}

export async function validateBaselineProvenance(
  root,
  scenarios,
  baseline,
  options = {},
) {
  if (
    baseline?.schema !== "token_benchmark_baseline_v2" ||
    baseline?.metric !== METRIC ||
    baseline?.provenance?.mode !== "git"
  ) {
    throw new Error("Invalid baseline provenance: expected token_benchmark_baseline_v2 Git evidence");
  }
  if (baseline.beforeDefinitionDigest !== digestScenarioDefinitions(scenarios)) {
    throw new Error("Invalid baseline provenance: before definition digest mismatch");
  }
  const assembledAt = Date.parse(baseline.assembledAt);
  if (!Number.isFinite(assembledAt)) {
    throw new Error("Invalid baseline provenance: assembledAt is required");
  }
  const entries = validateBaselineEntries(scenarios, baseline);
  const reductionScenarios = scenarios.filter(
    (scenario) => !Number.isFinite(scenario.maxAfterTokens),
  );
  const defaultCommit = baseline.provenance.defaultSourceCommit;
  const overrides = baseline.provenance.scenarioSourceCommits ?? {};
  const overrideRationales = baseline.provenance.scenarioSourceRationales ?? {};
  const reductionNames = new Set(reductionScenarios.map(({ name }) => name));
  for (const name of Object.keys(overrides)) {
    if (!reductionNames.has(name)) {
      throw new Error(`Invalid baseline provenance override: ${name}`);
    }
    if (
      typeof overrideRationales[name] !== "string" ||
      !overrideRationales[name].trim()
    ) {
      throw new Error(`Missing baseline provenance rationale for ${name}`);
    }
  }
  for (const name of Object.keys(overrideRationales)) {
    if (!(name in overrides)) {
      throw new Error(`Orphan baseline provenance rationale: ${name}`);
    }
  }
  const commits = new Map();
  const specs = new Set();

  for (const scenario of reductionScenarios) {
    const commit = overrides[scenario.name] ?? defaultCommit;
    if (!/^[a-f0-9]{40}$/.test(String(commit ?? ""))) {
      throw new Error(`Invalid baseline provenance commit for ${scenario.name}`);
    }
    if (!commits.has(commit)) {
      const committedAt = await assertGitCommitProvenance(root, commit);
      if (committedAt > assembledAt) {
        throw new Error(
          `Invalid baseline provenance: assembledAt predates ${commit}`,
        );
      }
      commits.set(commit, await listGitFiles(root, commit));
    }
    const files = expandPatternsFromList(scenario.before, commits.get(commit));
    if (JSON.stringify(files) !== JSON.stringify(entries[scenario.name].files)) {
      throw new Error(`Invalid baseline ${scenario.name}: Git file set mismatch`);
    }
    for (const file of files) specs.add(`${commit}:${file}`);
  }

  const blobs = await readGitBlobs(root, [...specs]);
  const sourceDigest = createHash("sha256");
  for (const scenario of reductionScenarios) {
    const commit = overrides[scenario.name] ?? defaultCommit;
    const measured = measureGitSurface(commit, entries[scenario.name].files, blobs);
    const entry = entries[scenario.name];
    for (const field of ["tokens", "chars", "bytes", "fileCount"]) {
      if (entry[field] !== measured[field]) {
        throw new Error(`Invalid baseline ${scenario.name}: Git ${field} mismatch`);
      }
    }
    sourceDigest.update(scenario.name);
    sourceDigest.update("\0");
    sourceDigest.update(commit);
    sourceDigest.update("\0");
    sourceDigest.update(measured.contentDigest);
    sourceDigest.update("\0");
  }
  const sourceContentDigest = sourceDigest.digest("hex");
  if (baseline.provenance.contentDigest !== sourceContentDigest) {
    throw new Error(
      `Invalid baseline provenance content digest; expected ${sourceContentDigest}`,
    );
  }

  const rawText = options.rawText ?? `${JSON.stringify(baseline, null, 2)}\n`;
  return {
    pass: true,
    reductionScenarioCount: reductionScenarios.length,
    baselineDigest: createHash("sha256").update(rawText).digest("hex"),
    sourceContentDigest,
  };
}

export async function createGitBaseline(
  root,
  sourceCommit,
  scenarios = DEFAULT_SCENARIOS,
) {
  if (!/^[a-f0-9]{40}$/.test(String(sourceCommit ?? ""))) {
    throw new Error("--source-commit must be a full 40-character Git commit");
  }
  await assertGitCommitProvenance(root, sourceCommit);
  const allFiles = await listGitFiles(root, sourceCommit);
  const reductionScenarios = scenarios.filter(
    (scenario) => !Number.isFinite(scenario.maxAfterTokens),
  );
  const filesByScenario = new Map();
  const specs = new Set();
  for (const scenario of reductionScenarios) {
    const files = expandPatternsFromList(scenario.before, allFiles);
    filesByScenario.set(scenario.name, files);
    for (const file of files) specs.add(`${sourceCommit}:${file}`);
  }
  const blobs = await readGitBlobs(root, [...specs]);
  const baseline = {};
  const sourceDigest = createHash("sha256");
  for (const scenario of reductionScenarios) {
    const measured = measureGitSurface(
      sourceCommit,
      filesByScenario.get(scenario.name),
      blobs,
    );
    const { contentDigest: _contentDigest, ...baselineEntry } = measured;
    baseline[scenario.name] = baselineEntry;
    sourceDigest.update(scenario.name);
    sourceDigest.update("\0");
    sourceDigest.update(sourceCommit);
    sourceDigest.update("\0");
    sourceDigest.update(measured.contentDigest);
    sourceDigest.update("\0");
  }
  return {
    schema: "token_benchmark_baseline_v2",
    metric: METRIC,
    assembledAt: new Date().toISOString(),
    provenance: {
      mode: "git",
      defaultSourceCommit: sourceCommit,
      scenarioSourceCommits: {},
      scenarioSourceRationales: {},
      contentDigest: sourceDigest.digest("hex"),
    },
    beforeDefinitionDigest: digestScenarioDefinitions(scenarios),
    scenarios: baseline,
  };
}

export async function evaluateScenarios(
  root,
  scenarios = DEFAULT_SCENARIOS,
  baseline = {},
  threshold = DEFAULT_THRESHOLD,
) {
  validateThreshold(threshold);
  const baselineScenarios = validateBaselineEntries(scenarios, baseline);
  const results = [];

  for (const scenario of scenarios) {
    const isBudget = Number.isFinite(scenario.maxAfterTokens);
    const before = isBudget
      ? await countScenarioSurface(root, scenario, "before")
      : baselineScenarios[scenario.name];
    const after = await countScenarioSurface(root, scenario, "after");
    const reductionPercent = isBudget
      ? null
      : before.tokens === 0
        ? 0
        : ((before.tokens - after.tokens) / before.tokens) * 100;

    results.push({
      name: scenario.name,
      stage: scenario.stage ?? "process",
      description: scenario.description,
      before,
      after,
      gateType: isBudget ? "budget" : "reduction",
      maxAfterTokens: isBudget ? scenario.maxAfterTokens : undefined,
      reductionPercent,
      pass: isBudget
        ? after.tokens <= scenario.maxAfterTokens
        : reductionPercent > threshold,
    });
  }

  const reductionResults = results.filter(
    (result) => result.gateType === "reduction",
  );
  const budgetResults = results.filter((result) => result.gateType === "budget");
  const totalBeforeTokens = sum(
    reductionResults,
    (result) => result.before.tokens,
  );
  const totalAfterTokens = sum(
    reductionResults,
    (result) => result.after.tokens,
  );

  const stageNames = ["input", "process", "output"];
  const stages = Object.fromEntries(
    stageNames.map((stage) => {
      const stageResults = results.filter((result) => result.stage === stage);
      const stageReductions = stageResults.filter(
        (result) => result.gateType === "reduction",
      );
      const stageBudgets = stageResults.filter(
        (result) => result.gateType === "budget",
      );
      const beforeTokens = sum(stageReductions, (result) => result.before.tokens);
      const afterTokens = sum(stageReductions, (result) => result.after.tokens);
      const minimumReductionPercent =
        stageReductions.length === 0
          ? null
          : Math.min(...stageReductions.map((result) => result.reductionPercent));
      return [
        stage,
        {
          pass: stageResults.length > 0 && stageResults.every((result) => result.pass),
          reductionScenarioCount: stageReductions.length,
          budgetScenarioCount: stageBudgets.length,
          totalBeforeTokens: beforeTokens,
          totalAfterTokens: afterTokens,
          totalReductionPercent: reduction(beforeTokens, afterTokens),
          minimumReductionPercent,
          aggregation: "scenario-weighted",
        },
      ];
    }),
  );

  return {
    metric: baseline.metric ?? METRIC,
    threshold,
    generatedAt: new Date().toISOString(),
    scenarios: results,
    summary: {
      pass: results.every((result) => result.pass),
      reductionScenarioCount: reductionResults.length,
      budgetScenarioCount: budgetResults.length,
      totalBeforeTokens,
      totalAfterTokens,
      totalReductionPercent: reduction(totalBeforeTokens, totalAfterTokens),
      minimumReductionPercent:
        reductionResults.length === 0
          ? null
          : Math.min(...reductionResults.map((result) => result.reductionPercent)),
      aggregation: "scenario-weighted",
      stages,
    },
  };
}

export function buildBenchmarkReport(runs, options = {}) {
  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error("At least one benchmark run is required");
  }

  const compactRuns = runs.map(compactBenchmarkResult);
  const digestCounts = new Map();
  for (const run of compactRuns) {
    const digest = createHash("sha256")
      .update(JSON.stringify(run))
      .digest("hex");
    digestCounts.set(digest, (digestCounts.get(digest) ?? 0) + 1);
  }

  let consecutivePasses = 0;
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    if (!runs[index].summary.pass) {
      break;
    }
    consecutivePasses += 1;
  }

  const deterministic = digestCounts.size === 1;
  const baselineDigest = options.baselineDigest ?? "unknown";
  const validBaselineDigest = /^[a-f0-9]{64}$/.test(baselineDigest);
  const suiteDefinitionDigest =
    options.suiteDefinitionDigest ?? digestBenchmarkSuite(DEFAULT_SCENARIOS);
  const validSuiteDefinitionDigest = /^[a-f0-9]{64}$/.test(
    suiteDefinitionDigest,
  );
  const authoritative = options.authoritative === true;
  const staticEvidence =
    options.staticEvidence ?? createUnattachedWorkflowEvidence();
  if (options.staticEvidence) {
    validateWorkflowEvidence(staticEvidence);
  }
  return {
    schema: "token_benchmark_report_v3",
    metric: runs[0].metric ?? METRIC,
    methodology: {
      kind: "modeled-static-first-hop-surface",
      stages: {
        input: "startup and context-entry surfaces",
        process: "workflow and procedure entry surfaces",
        output: "artifact authoring surfaces",
      },
      limitation:
        "Deterministic repository-owned, scenario-weighted estimates; overlapping scenarios may count files more than once. This is not host-observed runtime usage; attach a transcript for observed model tokens.",
    },
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    observedRuntimeTokens: options.observedRuntimeTokens ?? "unknown",
    hostInjectedSurfaceTokens: options.hostInjectedSurfaceTokens ?? "unknown",
    claimScope: staticEvidence.claimScope,
    coverage: staticEvidence.coverage,
    workflowMatrix: staticEvidence.workflowMatrix,
    gates: staticEvidence.gates,
    evidenceDigests: staticEvidence.evidenceDigests,
    digests: {
      baseline: baselineDigest,
      suiteDefinition: suiteDefinitionDigest,
      workflowInvariants: staticEvidence.evidenceDigests.workflowInvariants,
      outputBudgets: staticEvidence.evidenceDigests.outputBudgets,
      workflowMatrix: staticEvidence.evidenceDigests.workflowMatrix,
    },
    runtimeEvidence: staticEvidence.runtimeEvidence,
    runtimePass: staticEvidence.runtimePass,
    staticPass: staticEvidence.staticPass,
    baselineDigest,
    suiteDefinitionDigest,
    authoritative,
    repeat: runs.length,
    deterministic,
    runDigests: [...digestCounts].map(([digest, count]) => ({ digest, count })),
    result: compactRuns[0],
    consecutivePasses,
    pass:
      authoritative &&
      validBaselineDigest &&
      validSuiteDefinitionDigest &&
      staticEvidence.staticPass &&
      staticEvidence.runtimePass !== false &&
      deterministic &&
      runs.every((run) => run.summary.pass),
  };
}

function compactBenchmarkResult(result) {
  return {
    threshold: result.threshold,
    scenarios: result.scenarios.map((scenario) => {
      const compact = {
        name: scenario.name,
        stage: scenario.stage,
        beforeTokens: scenario.before.tokens,
        afterTokens: scenario.after.tokens,
        pass: scenario.pass,
      };
      if (scenario.after.contentDigest) {
        compact.afterDigest = scenario.after.contentDigest;
      }
      if (scenario.gateType === "budget") {
        compact.gateType = "budget";
        compact.maxAfterTokens = scenario.maxAfterTokens;
      } else {
        compact.reductionPercent = Number(
          scenario.reductionPercent.toFixed(4),
        );
      }
      return compact;
    }),
    summary: {
      pass: result.summary.pass,
      reductionScenarioCount: result.summary.reductionScenarioCount,
      budgetScenarioCount: result.summary.budgetScenarioCount,
      totalBeforeTokens: result.summary.totalBeforeTokens,
      totalAfterTokens: result.summary.totalAfterTokens,
      totalReductionPercent: Number(
        result.summary.totalReductionPercent.toFixed(4),
      ),
      minimumReductionPercent:
        result.summary.minimumReductionPercent === null
          ? null
          : Number(result.summary.minimumReductionPercent.toFixed(4)),
      aggregation: result.summary.aggregation,
      stages: Object.fromEntries(
        Object.entries(result.summary.stages ?? {}).map(([stage, summary]) => [
          stage,
          {
            ...summary,
            totalReductionPercent: Number(
              summary.totalReductionPercent.toFixed(4),
            ),
            minimumReductionPercent:
              summary.minimumReductionPercent === null
                ? null
                : Number(summary.minimumReductionPercent.toFixed(4)),
          },
        ]),
      ),
    },
  };
}

function sum(values, selector) {
  return values.reduce((total, value) => total + selector(value), 0);
}

function reduction(before, after) {
  return before === 0 ? 0 : ((before - after) / before) * 100;
}

async function listFiles(root, current = "") {
  const absolute = path.join(root, current);
  const entries = (await readdir(absolute, { withFileTypes: true })).sort(
    (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
  const files = [];

  for (const entry of entries) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    const normalized = normalizePath(relative);

    if (shouldSkip(normalized)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, normalized)));
    } else if (entry.isFile()) {
      files.push(normalized);
    }
  }

  return files;
}

function shouldSkip(relativePath) {
  return relativePath
    .split("/")
    .some((part) =>
      [".git", ".debug", "node_modules", "__pycache__"].includes(part),
    );
}

function hasGlob(pattern) {
  return pattern.includes("*");
}

function globToRegExp(pattern) {
  let source = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === "*" && next === "*") {
      const following = pattern[index + 2];
      if (following === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += escapeRegExp(char);
    }
  }

  return new RegExp(`^${source}$`);
}

function escapeRegExp(char) {
  return /[\\^$+?.()|[\]{}]/.test(char) ? `\\${char}` : char;
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

async function readJsonEvidence(root, relativePath) {
  const content = await readFile(path.resolve(root, relativePath), "utf8");
  return {
    value: JSON.parse(content),
    digest: createHash("sha256").update(content).digest("hex"),
  };
}

async function writeJson(root, relativePath, value) {
  const absolute = await resolveBenchmarkOutputPath(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
}

export async function resolveRepositoryPath(root, candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) {
    throw new Error("Output path is required");
  }
  const safeRoot = path.resolve(root);
  const absolute = path.resolve(safeRoot, candidate);
  const relative = path.relative(safeRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Output path resolves outside repository root");
  }

  let current = safeRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = await lstat(current).catch(() => null);
    if (info?.isSymbolicLink()) {
      throw new Error(`Output path contains a symlink: ${current}`);
    }
  }
  return absolute;
}

export async function resolveBenchmarkOutputPath(root, candidate) {
  const absolute = await resolveRepositoryPath(root, candidate);
  const relative = path
    .relative(path.resolve(root), absolute)
    .replace(/\\/g, "/");
  if (
    !relative.startsWith(".agent/benchmarks/") ||
    !relative.endsWith(".json")
  ) {
    throw new Error("Output must be a JSON file under .agent/benchmarks/");
  }
  return absolute;
}

function parseArgs(argv) {
  const options = {
    threshold: DEFAULT_THRESHOLD,
    repeat: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--write-baseline") {
      options.writeBaseline = next;
      index += 1;
    } else if (arg === "--source-commit") {
      options.sourceCommit = next;
      index += 1;
    } else if (arg === "--baseline") {
      options.baseline = next;
      index += 1;
    } else if (arg === "--output") {
      options.output = next;
      index += 1;
    } else if (arg === "--require-reduction") {
      options.threshold = Number(next);
      index += 1;
    } else if (arg === "--repeat") {
      options.repeat = Number(next);
      index += 1;
    } else if (arg === "--transcript") {
      if (!next) throw new Error("--transcript requires a JSONL path");
      options.transcript = next;
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  validateThreshold(options.threshold);

  if (!Number.isInteger(options.repeat) || options.repeat < 1) {
    throw new Error("--repeat must be a positive integer");
  }
  if (options.transcript !== undefined && !options.transcript) {
    throw new Error("--transcript requires a JSONL path");
  }
  if (options.writeBaseline && !options.sourceCommit) {
    throw new Error("--write-baseline requires --source-commit for reproducible evidence");
  }

  return options;
}

function validateThreshold(value) {
  if (!Number.isFinite(value) || value < DEFAULT_THRESHOLD || value >= 100) {
    throw new Error("--require-reduction must be between 90 and 100 (exclusive)");
  }
}

export function formatTable(result, runLabel = "") {
  const lines = [];
  const suffix = runLabel ? ` ${runLabel}` : "";
  lines.push(`Token benchmark${suffix}`);
  lines.push(`Metric: ${result.metric}`);
  lines.push(`Reduction gates: >${result.threshold}%`);
  if (result.scenarios.some((scenario) => scenario.gateType === "budget")) {
    lines.push("Budget gates: scenario-specific maximum");
  }
  lines.push("");
  lines.push(
    [
      "Scenario".padEnd(34),
      "Stage".padEnd(7),
      "Before".padStart(8),
      "After".padStart(8),
      "Gate".padStart(9),
      "Result".padStart(7),
    ].join("  "),
  );

  for (const scenario of result.scenarios) {
    const gate =
      scenario.gateType === "budget"
        ? `<=${scenario.maxAfterTokens}`
        : `${scenario.reductionPercent.toFixed(2)}%`;
    lines.push(
      [
        scenario.name.padEnd(34),
        String(scenario.stage ?? "process").padEnd(7),
        String(scenario.before.tokens).padStart(8),
        String(scenario.after.tokens).padStart(8),
        gate.padStart(9),
        (scenario.pass ? "PASS" : "FAIL").padStart(7),
      ].join("  "),
    );
  }

  lines.push("");
  lines.push(
    [
      "REDUCTION TOTAL (WEIGHTED)".padEnd(34),
      String(result.summary.totalBeforeTokens).padStart(8),
      String(result.summary.totalAfterTokens).padStart(8),
      `${result.summary.totalReductionPercent.toFixed(2)}%`.padStart(9),
      (result.summary.pass ? "PASS" : "FAIL").padStart(7),
    ].join("  "),
  );

  for (const [stage, summary] of Object.entries(result.summary.stages ?? {})) {
    const minimum =
      summary.minimumReductionPercent === null
        ? "n/a"
        : `${summary.minimumReductionPercent.toFixed(2)}%`;
    lines.push(
      `${stage.toUpperCase()} STAGE (WEIGHTED): ${summary.totalBeforeTokens} -> ${summary.totalAfterTokens} (${summary.totalReductionPercent.toFixed(2)}%); MIN ${minimum} ${summary.pass ? "PASS" : "FAIL"}`,
    );
  }

  return lines.join("\n");
}

function usage() {
  return `Usage:
  node .agent/tools/token-benchmark.mjs --write-baseline .agent/benchmarks/token-baseline.json --source-commit <full-sha>
  node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.json --require-reduction 90 --repeat 3

Default suite:
  legacy eager-preload reduction, real repository-owned startup budgets for
  Codex/Claude/Antigravity, all 17 public workflows, artifact surfaces, skills,
  templates, interface-design data/scripts, hooks, agents, workflows, and rules.

Options:
  --write-baseline <path>     Capture reduction surfaces from an immutable commit.
  --source-commit <full-sha>  Anchor a written baseline to immutable Git blobs.
  --baseline <path>           Compare optimized after surfaces against a baseline.
  --output <path>             Write compare result JSON.
  --require-reduction <n>     Required strict reduction percentage. Default: 90.
  --repeat <n>                Run compare mode repeatedly. Default: 1.
  --transcript <jsonl>        Attach observed main/subagent runtime token totals.
  --json                      Print JSON instead of a table.

The input/process/output stages are modeled static first-hop surfaces. They are
not host-observed runtime usage unless a transcript is attached.
`;
}

async function main() {
  const root = process.cwd();
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.writeBaseline) {
    const baseline = await createGitBaseline(
      root,
      options.sourceCommit,
      DEFAULT_SCENARIOS,
    );
    await writeJson(root, options.writeBaseline, baseline);
    console.log(
      `Wrote Git-anchored baseline (${Object.keys(baseline.scenarios).length} reduction scenarios): ${options.writeBaseline}`,
    );
    return;
  }

  if (!options.baseline) {
    throw new Error("--baseline is required for an authoritative comparison");
  }
  const baselinePath = await resolveBenchmarkOutputPath(root, options.baseline);
  const baselineText = await readFile(baselinePath, "utf8");
  const baseline = JSON.parse(baselineText);
  const provenance = await validateBaselineProvenance(
    root,
    DEFAULT_SCENARIOS,
    baseline,
    { rawText: baselineText },
  );
  const baselineDigest = provenance.baselineDigest;
  const runs = [];

  for (let run = 1; run <= options.repeat; run += 1) {
    const result = await evaluateScenarios(
      root,
      DEFAULT_SCENARIOS,
      baseline,
      options.threshold,
    );
    runs.push(result);

    if (!options.json) {
      console.log(formatTable(result, `run ${run}/${options.repeat}`));
      if (run < options.repeat) {
        console.log("");
      }
    }
  }

  const observedRuntimeTokens = options.transcript
    ? (await analyzeTranscript(path.resolve(root, options.transcript))).totals
    : "unknown";
  const [workflowInvariantSource, outputBudgetSource] = await Promise.all([
    readJsonEvidence(root, ".agent/context/workflow-invariants.json"),
    readJsonEvidence(root, ".agent/context/output-budgets.json"),
  ]);
  const staticEvidence = buildWorkflowEvidenceMatrix({
    scenarios: DEFAULT_SCENARIOS,
    benchmarkResult: runs[0],
    workflowInvariants: workflowInvariantSource.value,
    outputBudgets: outputBudgetSource.value,
    sourceDigests: {
      workflowInvariants: workflowInvariantSource.digest,
      outputBudgets: outputBudgetSource.digest,
    },
    runtimeEvidence:
      observedRuntimeTokens === "unknown"
        ? undefined
        : {
            status: "partial-informational",
            pairedTraces: [],
            observedTotals: observedRuntimeTokens,
          },
  });
  const payload = buildBenchmarkReport(runs, {
    observedRuntimeTokens,
    baselineDigest,
    suiteDefinitionDigest: digestBenchmarkSuite(DEFAULT_SCENARIOS),
    authoritative: true,
    staticEvidence,
  });

  if (options.output) {
    await writeJson(root, options.output, payload);
  }

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (!payload.pass) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
