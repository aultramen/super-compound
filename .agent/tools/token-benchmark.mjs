#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
      ".agent/templates/git-workflow/*.md",
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
    name: "startup-installed-skill-metadata",
    description:
      "Repository-owned native skill discovery metadata (name and description only).",
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

export const DEFAULT_SCENARIOS = [
  ...LEGACY_PRELOAD_SCENARIOS,
  ...STARTUP_BUDGET_SCENARIOS,
  ...WORKFLOW_SCENARIOS,
  ...RELATED_HOTSPOT_SCENARIOS,
];

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
    const normalizedPattern = normalizePath(pattern);
    let matched = false;

    if (!hasGlob(normalizedPattern)) {
      const absolute = path.join(root, normalizedPattern);
      const info = await stat(absolute).catch(() => null);

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

export async function countSkillMetadataTokens(root) {
  const files = await expandPatterns(
    root,
    [".agent/skills/**/SKILL.md"],
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
    return countSkillMetadataTokens(root);
  }
  return countScenarioTokens(root, scenario[side], {
    requireEveryPattern: true,
  });
}

export async function createBaseline(root, scenarios = DEFAULT_SCENARIOS) {
  const baseline = {};

  for (const scenario of scenarios) {
    baseline[scenario.name] = await countScenarioSurface(
      root,
      scenario,
      "before",
    );
  }

  return {
    metric: METRIC,
    generatedAt: new Date().toISOString(),
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
  const baselineScenarios = baseline.scenarios ?? baseline;
  const results = [];

  for (const scenario of scenarios) {
    const before =
      baselineScenarios[scenario.name] ??
      (await countScenarioSurface(root, scenario, "before"));
    const after = await countScenarioSurface(root, scenario, "after");
    const isBudget = Number.isFinite(scenario.maxAfterTokens);
    const reductionPercent = isBudget
      ? null
      : before.tokens === 0
        ? 0
        : ((before.tokens - after.tokens) / before.tokens) * 100;

    results.push({
      name: scenario.name,
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
  return {
    schema: "token_benchmark_report_v2",
    metric: runs[0].metric ?? METRIC,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    observedRuntimeTokens: options.observedRuntimeTokens ?? "unknown",
    hostInjectedSurfaceTokens: options.hostInjectedSurfaceTokens ?? "unknown",
    repeat: runs.length,
    deterministic,
    runDigests: [...digestCounts].map(([digest, count]) => ({ digest, count })),
    result: compactRuns[0],
    consecutivePasses,
    pass: deterministic && runs.every((run) => run.summary.pass),
  };
}

function compactBenchmarkResult(result) {
  return {
    threshold: result.threshold,
    scenarios: result.scenarios.map((scenario) => {
      const compact = {
        name: scenario.name,
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

async function readJson(root, relativePath) {
  const content = await readFile(path.resolve(root, relativePath), "utf8");
  return JSON.parse(content);
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
      "REDUCTION TOTAL".padEnd(34),
      String(result.summary.totalBeforeTokens).padStart(8),
      String(result.summary.totalAfterTokens).padStart(8),
      `${result.summary.totalReductionPercent.toFixed(2)}%`.padStart(9),
      (result.summary.pass ? "PASS" : "FAIL").padStart(7),
    ].join("  "),
  );

  return lines.join("\n");
}

function usage() {
  return `Usage:
  node .agent/tools/token-benchmark.mjs --write-baseline .agent/benchmarks/token-baseline.json
  node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.json --require-reduction 90 --repeat 3

Default suite:
  legacy eager-preload reduction, real repository-owned startup budgets for
  Codex/Claude/Antigravity, all 17 public workflows, artifact surfaces, skills,
  templates, interface-design data/scripts, hooks, agents, workflows, and rules.

Options:
  --write-baseline <path>     Capture current before-token baseline.
  --baseline <path>           Compare optimized after surfaces against a baseline.
  --output <path>             Write compare result JSON.
  --require-reduction <n>     Required strict reduction percentage. Default: 90.
  --repeat <n>                Run compare mode repeatedly. Default: 1.
  --transcript <jsonl>        Attach observed main/subagent runtime token totals.
  --json                      Print JSON instead of a table.
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
    const baseline = await createBaseline(root);
    await writeJson(root, options.writeBaseline, baseline);
    const synthetic = await evaluateScenarios(
      root,
      DEFAULT_SCENARIOS.map((scenario) => ({
        ...scenario,
        after: scenario.before,
      })),
      baseline,
      options.threshold,
    );
    console.log(formatTable(synthetic, "baseline snapshot"));
    console.log(`\nWrote baseline: ${options.writeBaseline}`);
    return;
  }

  const baseline = options.baseline
    ? await readJson(root, options.baseline)
    : await createBaseline(root);
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
  const payload = buildBenchmarkReport(runs, { observedRuntimeTokens });

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
