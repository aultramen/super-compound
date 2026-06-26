#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const METRIC = "deterministic_estimated_tokens_v1";

const FULL_FRAMEWORK_SCENARIOS = [
  {
    name: "full-framework-load",
    description: "Always-on framework bootstrap without task-specific work.",
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
  ...FULL_FRAMEWORK_SCENARIOS,
  ...WORKFLOW_SCENARIOS,
  ...RELATED_HOTSPOT_SCENARIOS,
];

const DEFAULT_THRESHOLD = 90;

export function estimateTokens(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const pieces = normalized.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g);
  return pieces ? pieces.length : 0;
}

export async function expandPatterns(root, patterns) {
  const allFiles = await listFiles(root);
  const selected = new Set();
  const ordered = [];

  for (const pattern of patterns) {
    const normalizedPattern = normalizePath(pattern);

    if (!hasGlob(normalizedPattern)) {
      const absolute = path.join(root, normalizedPattern);
      const info = await stat(absolute).catch(() => null);

      if (info?.isFile()) {
        addSelected(selected, ordered, normalizedPattern);
      } else if (info?.isDirectory()) {
        for (const file of allFiles) {
          if (file.startsWith(`${normalizedPattern}/`)) {
            addSelected(selected, ordered, file);
          }
        }
      }

      continue;
    }

    const matcher = globToRegExp(normalizedPattern);
    for (const file of allFiles) {
      if (matcher.test(file)) {
        addSelected(selected, ordered, file);
      }
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

export async function countScenarioTokens(root, patterns) {
  const files = await expandPatterns(root, patterns);
  let tokens = 0;
  let chars = 0;
  let bytes = 0;

  for (const file of files) {
    const absolute = path.join(root, file);
    const content = await readFile(absolute, "utf8");
    tokens += estimateTokens(content);
    chars += content.length;
    bytes += Buffer.byteLength(content, "utf8");
  }

  return { tokens, chars, bytes, fileCount: files.length, files };
}

export async function createBaseline(root, scenarios = DEFAULT_SCENARIOS) {
  const baseline = {};

  for (const scenario of scenarios) {
    baseline[scenario.name] = await countScenarioTokens(root, scenario.before);
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
  const baselineScenarios = baseline.scenarios ?? baseline;
  const results = [];

  for (const scenario of scenarios) {
    const before =
      baselineScenarios[scenario.name] ??
      (await countScenarioTokens(root, scenario.before));
    const after = await countScenarioTokens(root, scenario.after);
    const reductionPercent =
      before.tokens === 0
        ? 0
        : ((before.tokens - after.tokens) / before.tokens) * 100;

    results.push({
      name: scenario.name,
      description: scenario.description,
      before,
      after,
      reductionPercent,
      pass: reductionPercent > threshold,
    });
  }

  return {
    metric: baseline.metric ?? METRIC,
    threshold,
    generatedAt: new Date().toISOString(),
    scenarios: results,
    summary: {
      pass: results.every((result) => result.pass),
      totalBeforeTokens: sum(results, (result) => result.before.tokens),
      totalAfterTokens: sum(results, (result) => result.after.tokens),
      totalReductionPercent: reduction(
        sum(results, (result) => result.before.tokens),
        sum(results, (result) => result.after.tokens),
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
  const absolute = path.resolve(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
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
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.threshold)) {
    throw new Error("--require-reduction must be a number");
  }

  if (!Number.isInteger(options.repeat) || options.repeat < 1) {
    throw new Error("--repeat must be a positive integer");
  }

  return options;
}

function formatTable(result, runLabel = "") {
  const lines = [];
  const suffix = runLabel ? ` ${runLabel}` : "";
  lines.push(`Token benchmark${suffix}`);
  lines.push(`Metric: ${result.metric}`);
  lines.push(`Gate: every scenario must reduce by >${result.threshold}%`);
  lines.push("");
  lines.push(
    [
      "Scenario".padEnd(34),
      "Before".padStart(8),
      "After".padStart(8),
      "Reduce".padStart(9),
      "Result".padStart(7),
    ].join("  "),
  );

  for (const scenario of result.scenarios) {
    lines.push(
      [
        scenario.name.padEnd(34),
        String(scenario.before.tokens).padStart(8),
        String(scenario.after.tokens).padStart(8),
        `${scenario.reductionPercent.toFixed(2)}%`.padStart(9),
        (scenario.pass ? "PASS" : "FAIL").padStart(7),
      ].join("  "),
    );
  }

  lines.push("");
  lines.push(
    [
      "TOTAL".padEnd(34),
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
  full framework load, all 15 public workflows, artifact surfaces, skills,
  templates, interface-design data/scripts, hooks, agents, workflows, and rules.

Options:
  --write-baseline <path>     Capture current before-token baseline.
  --baseline <path>           Compare optimized after surfaces against a baseline.
  --output <path>             Write compare result JSON.
  --require-reduction <n>     Required strict reduction percentage. Default: 90.
  --repeat <n>                Run compare mode repeatedly. Default: 1.
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

  const payload = {
    metric: METRIC,
    generatedAt: new Date().toISOString(),
    repeat: options.repeat,
    runs,
    consecutivePasses: runs.filter((run) => run.summary.pass).length,
    pass: runs.every((run) => run.summary.pass),
  };

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
