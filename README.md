# Super Compound

Super Compound is a compact AI-assisted development framework for Antigravity IDE, Claude Code, and compatible coding agents.

It keeps the public command surface small, pushes detailed procedures into skills, and treats verification as part of the work rather than a final ritual.

## What It Provides

- 15 public workflows for common development operations
- Canonical product delivery path: `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`
- Modular skills for agentic delivery, planning, execution, debugging, review, audit, UI, state, and verification
- Full BRD/PRD/FSD/optional ADR templates under `.agent/templates/agentic-delivery/`
- Local Markdown goal issue pointers under `.scratch/<feature>/issues/`
- Concise always-on rules under `.agent/rules/`
- Compact runtime contracts under `.agent/context/` for routing, skill selection, template skeletons, and context budget gates
- Deterministic local hooks under `.agent/hooks/`
- Deterministic token benchmark harness under `.agent/tools/`
- Data-backed interface design search through `interface-design`
- Durable project memory through `docs/STATE.md`, `.continue-here.md`, and `docs/solutions/`

## Install

Copy the framework files into a project root:

```bash
cp -R .agent <target-project>/
cp SUPER-COMPOUND.md <target-project>/
```

Optional Claude Code support:

```bash
cp CLAUDE.md <target-project>/
cp AGENTS.md <target-project>/
cp -R .claude <target-project>/
```

For Antigravity IDE, keep `.agent/rules/super-compound.md` lowercase. The root `SUPER-COMPOUND.md` is the concise human/Claude operating contract; `.agent/rules/super-compound.md` is the canonical Antigravity rule.

## Quick Start

All public commands use the `/sc-*` prefix to avoid collisions with native Claude Code planning and review slash commands.

```text
/sc-init
/sc-explore <idea>
/sc-prd <feature>
/sc-plan <approved PRD>
/sc-work <goal issue or FSD goal>
/sc-review
/sc-audit
/sc-compound
```

For UI work:

```text
/sc-ui Build an analytics dashboard for a fintech SaaS
```

For continuation:

```text
/sc-pause
# next session
/sc-status
```

## Public Workflows

Only these workflow files are public:

| Workflow | Use When |
|---|---|
| `/sc-init` | Set up or reload framework context |
| `/sc-status` | Inspect current state and route the next action |
| `/sc-explore` | Shape fuzzy ideas into a BRD with business objectives, constraints, policies, and acceptance |
| `/sc-research` | Gather evidence before making technical or product decisions |
| `/sc-prd` | Write PRD product requirements from an approved BRD |
| `/sc-plan` | Produce the FSD, ADR applicability decision, goal issue pointers, risk checks, and verification |
| `/sc-eval` | Define and run evaluation criteria before or after implementation |
| `/sc-work` | Execute an approved FSD goal or goal issue pointer sequentially or with safe parallel slices |
| `/sc-debug` | Reproduce, isolate, and fix root causes |
| `/sc-review` | Review changes for correctness, maintainability, and missing tests |
| `/sc-audit` | Check security, compatibility, compliance, agent surface, and release readiness |
| `/sc-compound` | Capture reusable solutions and lessons |
| `/sc-pause` | Save durable handoff state |
| `/sc-launch` | Start a focused project or feature lifecycle |
| `/sc-ui` | Use interface-design guidance for frontend work |

Removed workflows are intentionally not aliases. Route them this way:

| Old Intent | Current Route |
|---|---|
| brainstorm, discuss, domain, strategy, prototype | `/sc-explore` |
| issues, triage, Kanban, Journey, task shaping | `/sc-plan` |
| loop, handoff, parallel execution | `/sc-work` |
| security, compatibility, MCP, compliance, release readiness | `/sc-audit` |
| progress, resume | `/sc-status` |
| reload | `/sc-init reload` |

## Skills

Skills live in `.agent/skills/<name>/SKILL.md`. They are loaded only when relevant.

Core operational skills:

- `agentic-delivery`
- `brainstorming`
- `codebase-design`
- `domain-modeling`
- `prd-generator`
- `issue-workflow`
- `triage-workflow`
- `writing-plans`
- `executing-plans`
- `prototyping`
- `systematic-debugging`
- `test-driven-development`
- `code-review`
- `security-audit`
- `state-management`
- `verification-before-completion`

Supporting skills:

- `architecture-enforcement`
- `checkpoint-protocol`
- `compatibility-check`
- `context7-docs`
- `context-engineering`
- `data-privacy`
- `eval-harness`
- `gap-closure`
- `integration-checking`
- `interface-design`
- `knowledge-compounding`
- `parallel-execution`
- `plan-verification`
- `secure-code-patterns`
- `skill-authoring`
- `subagent-orchestration`
- `threat-modeling`
- `todo-management`

## Interface Design

The legacy UI skill was renamed to `interface-design`.

Use:

```bash
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
python .agent/skills/interface-design/scripts/search.py "mobile touch target" --domain app
python .agent/skills/interface-design/scripts/search.py "performance trackBy" --stack angular
python .agent/skills/interface-design/scripts/search.py "SaaS dashboard" --design-system --persist -p "Acme CRM" --page dashboard --overwrite
```

Domains include `product`, `style`, `color`, `typography`, `landing`, `chart`, `ux`, `web`, `app`, `icons`, `react`, and `google-fonts`.

Use interface-design by retrieval: run targeted searches and read the returned rows. Do not preload `.agent/skills/interface-design/data/**/*.csv` into agent context.

The CSV loader fails fast when a row does not match its header width, so malformed reference data is caught during validation rather than silently producing bad search results.

## Repository Layout

```text
.agent/
  agents/       dedicated agent prompts
  context/      compact runtime routing, skill, template, and budget contracts
  benchmarks/   reproducible token baseline and benchmark evidence
  hooks/        deterministic local hook scripts
  rules/        concise always-on framework rules
  skills/       modular task procedures
  templates/    BRD, PRD, FSD, and optional ADR templates
  tools/        deterministic local framework utilities
  workflows/    15 public workflows
.claude/        Claude Code path-scoped rules
docs/           engineering standards, archives, and runtime project docs
SUPER-COMPOUND.md
AGENTS.md
CLAUDE.md
WALKTHROUGH.md
```

Runtime/cache files such as `.debug/`, `.continue-here.md`, `.agent/.tool-call-count`, `__pycache__/`, and `*.pyc` are ignored. `docs/` is not ignored; durable documentation should be tracked when it is part of the framework or project history.

Local goal issue boards live under `.scratch/<feature>/`. They are not ignored by default because teams may choose to track goal pointers as durable work contracts. Issue files should link to BRD/PRD/FSD/ADR IDs instead of copying their text.

## Compatibility Notes

This version intentionally breaks the imported 2026-06-20 surface area.

- The legacy UI workflow is now `/sc-ui`
- The legacy UI skill directory is now `.agent/skills/interface-design/`
- Alias workflows for exploration, security, continuation, progress, reload, and compatibility were removed
- Thin workflows were folded into `/sc-explore`, `/sc-plan`, `/sc-work`, and `/sc-audit`
- Archived analysis moved to `docs/archive/2026-06-20-gap-analysis.md`

The framework now favors clear operational defaults over preserving every imported idea as a standalone command.

## Verification

Recommended checks after editing the framework:

```bash
python -m py_compile .agent/skills/interface-design/scripts/core.py .agent/skills/interface-design/scripts/search.py .agent/skills/interface-design/scripts/design_system.py
node --check .agent/hooks/pre-compact.js
node --check .agent/hooks/session-end.js
node --check .agent/hooks/suggest-compact.js
node --check .agent/hooks/stop-check.js
node .agent/hooks/test-hooks-security.js
python .agent/skills/interface-design/scripts/test_design_system_security.py
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3
```

The token benchmark covers the full framework load, all 15 public workflows, artifact generation surfaces, and related hotspots such as skills, templates, interface-design data/scripts, hooks, agent prompts, workflows, and rules.

Also check:

- Every workflow has frontmatter `description` and an H1
- Every skill directory matches its `name`
- Agentic delivery templates exist under `.agent/templates/agentic-delivery/`
- FSD goal issue examples use qualified references and do not duplicate BRD/PRD/FSD/ADR prose
- Active docs use `docs/solutions/adr-####-<slug>.md` for linked ADRs
- Interface CSV rows match header widths
- Interface-design runtime guidance uses search-only retrieval, not CSV preload
- Design-system persistence rejects path traversal and requires `--overwrite` for existing files
- Global Claude hook settings use absolute script paths, not project-relative `.agent/hooks/...` commands
- Old workflow and skill names are not referenced in active docs
- Comprehensive token benchmark PASS is observed 3 consecutive times with every scenario above 90% reduction
- `docs/engineering-standards.md` and archive docs are not ignored
