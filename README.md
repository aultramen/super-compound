# Super Compound

Super Compound is a compact AI-assisted development framework for Antigravity IDE, Claude Code, and compatible coding agents.

It keeps the public command surface small, pushes detailed procedures into skills, and treats verification as part of the work rather than a final ritual.

## What It Provides

- 17 public workflows for common development operations
- Canonical product delivery path: `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`
- Modular skills for agentic delivery, planning, execution, debugging, review, audit, UI, state, and verification
- Full BRD/PRD/FSD/optional ADR templates under `.agent/templates/agentic-delivery/`
- Local Markdown goal issue pointers under `.scratch/<feature>/issues/`
- Concise always-on rules under `.agent/rules/`
- Compact runtime contracts under `.agent/context/` for routing, skill selection, template skeletons, and context budget gates
- Deterministic local hooks under `.agent/hooks/`
- Deterministic token benchmark harness under `.agent/tools/`
- Native Codex adapter with staged, hash-verified, rollback-safe bundled fallback under `.codex/`
- Preview-first Git Workflow Operation through `/sc-go`
- Data-backed interface design search through `interface-design`
- Durable project memory through `docs/STATE.md`, `.continue-here.md`, and `docs/solutions/`

An approved BRD or PRD is always a durable artifact under `docs/brd/` or
`docs/prd/`; chat drafts cannot authorize the next delivery stage. Eval evidence
must likewise be stored under `.agent/evals/` whenever another gate consumes it.

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

Optional Codex skill installation (PowerShell):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex\install-super-compound.ps1
```

The installed adapter still prefers a live project's compact `.agent/context/`
contracts. See `.codex/README.md` for isolated install and verification commands.

For Antigravity IDE, keep `.agent/rules/super-compound.md` lowercase. The root `SUPER-COMPOUND.md` is the concise human/Claude operating contract; `.agent/rules/super-compound.md` is the canonical Antigravity rule.

## Quick Start

All public commands use the `/sc-*` prefix to avoid collisions with native Claude Code planning and review slash commands.

```text
/sc-init
/sc-geniusloop <scope>
/sc-explore <idea>
/sc-research "<specific evidence question>"  # optional
/sc-prd <feature>
/sc-plan <approved PRD>
/sc-go start feature/<name>
/sc-work <goal issue or FSD goal>
/sc-review
/sc-audit
/sc-go commit "Describe the change"
/sc-go push
/sc-go pr
/sc-compound
```

For read-only UI design/review, then implementation from approved authority:

```text
/sc-ui review analytics dashboard for a fintech SaaS  # design-only
/sc-work <approved-goal>
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
| `/sc-geniusloop` | Generate and filter proactive improvement ideas when goal queues are empty |
| `/sc-explore` | Shape fuzzy ideas into a BRD with business objectives, constraints, policies, and acceptance |
| `/sc-research` | Resolve a named factual or technical gap with an advisory research note, then return to the decision owner |
| `/sc-prd` | Write PRD product requirements from an approved BRD |
| `/sc-plan` | Produce the FSD, ADR applicability decision, goal issue pointers, risk checks, and verification |
| `/sc-eval` | Define and run evaluation criteria before or after implementation |
| `/sc-go` | Preview branch, worktree, commit, push, and Pull Request operations |
| `/sc-work` | Execute an approved FSD goal or goal issue pointer sequentially or with safe parallel slices |
| `/sc-debug` | Reproduce, isolate, and fix root causes |
| `/sc-review` | Review changes for correctness, maintainability, and missing tests |
| `/sc-audit` | Check security, compatibility, compliance, agent surface, and release readiness |
| `/sc-compound` | Capture reusable solutions and lessons |
| `/sc-pause` | Save durable handoff state |
| `/sc-launch` | Start a focused project or feature lifecycle |
| `/sc-ui` | Design or review UI read-only; route approved implementation to `/sc-work` |

Non-trivial debug evidence that would not fit the chat return is stored at
`docs/debug/YYYY-MM-DD-<slug>.md`; `/sc-compound` remains reserved for verified,
reusable lessons.

## Explore vs Research

`/sc-explore` resolves normative uncertainty: user value, scope, roles, policy, constraints, and acceptance. Its durable output is a BRD. `/sc-research` resolves empirical uncertainty: what local evidence and current primary sources show about one named fact, API/version, feasibility constraint, or option comparison. Its note informs a decision but never approves one.

| Dominant question | Route | Durable output | Return |
|---|---|---|---|
| What should we build, why, for whom, and under which policy? | `/sc-explore` | `docs/brd/brd-<feature>.md` | `/sc-prd` after BRD approval |
| What is true, current, supported, or feasible for this decision? | `/sc-research` | `docs/research/YYYY-MM-DD-<slug>.md` when non-trivial | Caller: explore, PRD, plan, audit, or debug |
| How should approved behavior be implemented? | `/sc-plan` | FSD plus goal pointers | `/sc-work` after approval |
| What security, compatibility, compliance, or release risks exist? | `/sc-audit` | Findings by severity | Owning remediation workflow; never fix inside audit |

Run research only when the named evidence gap could materially change a decision, sources conflict, or the result needs review/revalidation. Keep a one-line API lookup inside the active workflow. If intent is still fuzzy, use explore; if a concrete failure exists, use debug; if the job is risk severity or readiness, use audit.

Example:

```text
/sc-explore Add tenant usage analytics for account admins
/sc-research Can the current event store produce tenant-safe daily metrics with 15-minute freshness at the observed volume?
/sc-prd
```

If research changes the promised freshness or product scope, return to `/sc-explore`. If the BRD remains valid, feed the note into `/sc-prd`. A later technical recommendation becomes authoritative only after `/sc-plan` records it in the FSD as a `TDEC-*` or linked accepted ADR.

Removed workflows are intentionally not aliases. Route them this way:

| Old Intent | Current Route |
|---|---|
| brainstorm, discuss, domain, strategy, prototype | `/sc-explore` |
| issues, triage, Kanban, Journey, task shaping | `/sc-plan` |
| loop, handoff, parallel execution | `/sc-work` |
| branch, commit, push, PR, worktree | `/sc-go` |
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
- `git-workflow-operation`

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

## Git Workflow Operation

Use `/sc-go` when starting a branch, using an optional worktree, committing, pushing, or preparing a Pull Request. The default mode is preview-first: Super Compound shows safety checks and exact commands before mutating Git state.

Standard branch preview:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/login
```

Optional worktree preview:

```bash
git fetch origin
git worktree add -b feature/login ../project-feature origin/main
cd ../project-feature
```

Finish preview:

```bash
git status
git diff
git add .
git commit -m "Implement login workflow"
git push -u origin feature/login
```

Branch names should use `feature/`, `fix/`, `hotfix/`, `refactor/`, `docs/`, or `chore/`. Do not work directly on `main` or the configured base branch. Review sensitive paths such as `.env`, credentials, logs, cache, and build output before `git add .`. Pull Requests use `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md`.

## Interface Design

The legacy UI skill was renamed to `interface-design`.

Use:

```bash
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
python .agent/skills/interface-design/scripts/search.py "mobile touch target" --domain app
python .agent/skills/interface-design/scripts/search.py "performance trackBy" --stack angular
python .agent/skills/interface-design/scripts/search.py "SaaS dashboard" --design-system --persist -p "Acme CRM" --page dashboard --overwrite
```

Domains include `product`, `style`, `color`, `typography`, `landing`, `chart`, `ux`, `web`, `app`, `icons`, `gsap`, `react`, and `google-fonts`.

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
  templates/    BRD, PRD, FSD, optional ADR, research-note, and PR templates
  tools/        deterministic local framework utilities
  workflows/    17 public workflows
.claude/        Claude Code path-scoped rules
.codex/         Codex skill adapter and hash-verified installer
docs/           engineering standards, archives, and runtime project docs
SUPER-COMPOUND.md
AGENTS.md
CLAUDE.md
WALKTHROUGH.md
```

Runtime/cache files such as `.debug/`, `.continue-here.md`, `.agent/.compact-state/`, `__pycache__/`, and `*.pyc` are ignored. `docs/` is not ignored; durable documentation should be tracked when it is part of the framework or project history.

Local goal issue boards live under `.scratch/<feature>/`. They are not ignored by default because teams may choose to track goal pointers as durable work contracts. Issue files should link to BRD/PRD/FSD/ADR IDs instead of copying their text.

Ephemeral multi-agent handoffs live under `.scratch/work-packages/`. They are ignored because briefs, diffs, reports, and review ledgers may contain large or sensitive working context; durable outcomes belong in the FSD, issue board, state, or solution docs.

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
node --check .agent/tools/git-workflow.mjs
node --test .agent/tools/agent-contracts.test.mjs .agent/tools/artifact-contracts.test.mjs .agent/tools/codex-install.test.mjs .agent/tools/evidence-matrix.test.mjs .agent/tools/framework-audit.test.mjs .agent/tools/git-workflow.test.mjs .agent/tools/token-benchmark.test.mjs .agent/tools/transcript-usage.test.mjs .agent/tools/work-package.test.mjs .agent/tools/workflow-contracts.test.mjs
node --test .agent/skills/agentic-delivery/tests/progressive-disclosure-wave3.test.mjs .agent/skills/architecture-enforcement/tests/architecture-enforcement.test.mjs .agent/skills/security-audit/tests/risk-skills-progressive-disclosure.test.mjs .agent/skills/skill-authoring/test-progressive-routers.mjs
node .agent/hooks/test-hooks-security.js
python -m unittest discover -s .agent/skills/interface-design/scripts -p "test_*.py"
python .agent/skills/verification-before-completion/tests/test_skill_router_contract.py
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3 --output .agent/benchmarks/token-benchmark.after.json
node .agent/tools/framework-audit.mjs --output .agent/benchmarks/framework-audit.after.json
node .agent/tools/framework-audit.mjs --verify-existing .agent/benchmarks/framework-audit.after.json
```

The benchmark separates immutable historical eager-preload evidence from current repository-owned startup budgets for Codex, Claude Code, Antigravity, the native Codex adapter, and bundled skill metadata. It also emits a 17-route x 3-cell static matrix: input context reduction, process wiring/authority, and output sink/budget/next-owner coverage. Every workflow context-entry reduction must exceed 90%; all 51 static cells must pass. Totals are scenario-weighted and may count shared files more than once. Output-authoring measures context and contracts, not generated prose. Host reasoning, generated-output, injected-context, latency, and billing tokens remain `unknown`; the static matrix is not a runtime end-to-end claim. The baseline is remeasured from recorded ancestor commit blobs on every authoritative run. A runtime claim requires paired attributable before/current traces for every route, not one after-only transcript.

The framework audit enumerates the exact active Git manifest: tracked files plus untracked, non-ignored files. It byte-reads the physical tree outside `.git`, classifies every active path into a declared audit class, and fails on any unclassified entry. The self-generated audit report is necessarily outside its own raw content digest, so `--verify-existing` validates it separately and emits a 100%-accounted verification envelope. The recorded `repositoryHead` is digest-bound provenance; freshness is content/manifest based so committing the excluded report does not invalidate otherwise identical evidence. The envelope reports whether stored and current heads match. The report distinguishes byte/content coverage, audit-class coverage, and specialized self-evidence instead of calling them one uniform semantic audit. It also validates UTF-8, JSON, CSV shape, Markdown links, workflow/skill contracts, duplicate content, output budgets, the 17x3 matrix, and fresh benchmark evidence. Invalid payload content is never echoed into findings.

Also check:

- Every workflow has frontmatter `description` and an H1
- Every skill directory matches its `name`
- Agentic delivery templates exist under `.agent/templates/agentic-delivery/`
- FSD goal issue examples use qualified references and do not duplicate BRD/PRD/FSD/ADR prose
- Active docs use `docs/solutions/adr-####-<slug>.md` for linked ADRs
- Interface CSV rows match header widths
- Interface-design runtime guidance uses search-only retrieval, not CSV preload
- Design-system persistence rejects path traversal and requires `--overwrite` for existing files
- Claude hook settings use exec-form `node` plus `${CLAUDE_PROJECT_DIR}` script args, so cwd changes and spaces do not break paths
- Old workflow and skill names are not referenced in active docs
- The benchmark is deterministic across 3 runs, every reduction gate exceeds 90%, and every absolute startup budget passes
- The exact active-manifest framework audit passes with fresh benchmark evidence
- `docs/engineering-standards.md` and archive docs are not ignored
