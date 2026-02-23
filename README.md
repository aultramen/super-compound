# Super Compound ⚛️

> **"Discipline compounds. Each unit of work makes the next one easier."**

Super Compound is a complete AI-assisted development framework for **Antigravity IDE** and **Claude Code**. It combines the systematic discipline of [Superpowers](https://github.com/obra/superpowers) with the compounding intelligence of [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) into a unified, tech-stack agnostic framework.

---

## Features

| Feature | Description |
|---------|-------------|
| 🎯 **Adaptive TDD** | Strict / balanced / relaxed modes — test-first for production, relaxed for prototypes |
| 🏗️ **Architecture Enforcement** | Per-framework folder structure + dependency rules to prevent spaghetti code |
| 🤖 **Auto-Detect Smart Suggestion** | Empty config? Super Compound suggests optimal stack with reasoning and waits for confirmation |
| 📋 **10 Presets** | Ready-to-use templates for popular stacks — all local-first, no cloud required |
| 🧠 **Knowledge Compounding** | Every solved problem becomes searchable documentation in `docs/solutions/` + session progress log |
| 🌿 **Adaptive Git** | Branch (default), Worktree (parallel dev), or No-Git (prototyping) |
| 🔄 **Optional Swarm Mode** | Sequential by default, parallel multi-agent when tasks are independent |
| 🔍 **Multi-Perspective Review** | 2-stage code review (spec + quality) with P1/P2/P3 severity classification |
| 🐛 **Systematic Debugging** | 4-phase root cause diagnosis — never guess, always diagnose first |
| ✅ **Verification Gate** | Evidence-based completion — no claims without fresh verification output |
| 🎨 **UI/UX Pro Max** | AI-powered design intelligence with 67 styles, 96 palettes, 57 fonts across 13 stacks |
| 🛡️ **Security-by-Design** | OWASP Top 10, STRIDE threat modeling, GDPR/UU PDP compliance, secrets management |
| 📝 **PRD Generator** | Structured Product Requirements Documents with lettered Q&A, user stories, and sizing |
| 💾 **State & Session Management** | Persistent state tracking, session handoff, progress logs, checkpoints |
| 📊 **Structured Tasks** | Machine-parseable `tasks.json` generation built into `writing-plans` skill |
| 🔬 **Plan Verification** | 8-dimension plan validation with task-sizing discipline before execution |
| 🧪 **Eval Harness (EDD)** | Define pass/fail criteria before coding, measure pass@k reliability after — Eval-Driven Development |
| 🤖 **Dedicated Subagents** | 5 isolated agents (architect, code-reviewer, e2e-runner, doc-updater, build-fixer) with model specialization |
| ⚡ **Hook System** | Event-driven automation — SessionEnd, PreCompact, and suggest-compact hooks run deterministically |

---

## Installation

Super Compound follows the official Antigravity IDE convention: **all rules, workflows, and skills live inside the `.agent/` directory.**

### Option A: Git Clone (Recommended)

```bash
# Clone the repository
git clone https://github.com/aultramen/super-compound.git

# Navigate to your project root
cd /path/to/your-project

# Copy the .agent folder from the cloned repo
cp -r /path/to/super-compound/.agent ./.agent
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/aultramen/super-compound.git
cd C:\path\to\your-project
Copy-Item -Recurse "path\to\super-compound\.agent" -Destination ".\.agent" -Force
```

> [!TIP]
> By cloning the repo, you can easily pull updates with `git pull` and re-copy the `.agent/` folder to stay current.

### Option B: Manual Copy

If you already have the Super Compound files locally:

#### Windows (PowerShell)

```powershell
cd C:\path\to\your-project
Copy-Item -Recurse "path\to\super-compound\.agent" -Destination ".\.agent" -Force
```

#### Linux / macOS (Bash)

```bash
cd /path/to/your-project
cp -r /path/to/super-compound/.agent ./.agent
```

### Claude Code (Additional Step)

For Claude Code, after copying `.agent/` using either option above, also copy `SUPER-COMPOUND.md` to your project root so Claude Code reads it as the main rules file:

```bash
cp /path/to/super-compound/SUPER-COMPOUND.md ./SUPER-COMPOUND.md
```

**Windows (PowerShell):**

```powershell
Copy-Item "path\to\super-compound\SUPER-COMPOUND.md" -Destination ".\SUPER-COMPOUND.md"
```

### Project Structure After Installation

```
your-project/
├── .agent/                              ← All Super Compound files live here
│   ├── rules/                           ← Workspace rules (3 files, each <12K chars)
│   │   ├── super-compound.md            ← Core philosophy, skills, workflows, git
│   │   ├── project-config.md            ← Tech stack config + presets + auto-detect
│   │   └── quality-gates.md             ← Verification, knowledge, architecture rules
│   ├── workflows/                       ← 15 core workflows (+ 7 backward-compat aliases)
│   │   ├── explore.md                   ← Idea exploration + gray-area resolution (merged)
│   │   ├── research.md                  ← Structured domain research
│   │   ├── prd.md                       ← Generate Product Requirements Document
│   │   ├── plan.md                      ← Create implementation plan
│   │   ├── eval.md                      ← Eval-Driven Development (define + run pass@k)
│   │   ├── work.md                      ← Execute plan with TDD
│   │   ├── debug.md                     ← Systematic debugging
│   │   ├── review.md                    ← Multi-perspective code review
│   │   ├── compound.md                  ← Document solutions
│   │   ├── launch.md                    ← Full autonomous pipeline
│   │   ├── pause.md                     ← Session handoff with archiving
│   │   ├── status.md                    ← Project dashboard + resume (merged)
│   │   ├── audit.md                     ← Full health audit: security + compat (merged)
│   │   ├── init.md                      ← Scan codebase; /init reload re-reads rules
│   │   ├── ui-ux-pro-max.md             ← Design system + professional UI
│   │   │   ── Aliases (redirect to merged workflows) ──
│   │   ├── brainstorm.md  → explore     ← /brainstorm still works
│   │   ├── discuss.md     → explore     ← /discuss still works
│   │   ├── progress.md    → status      ← /progress still works
│   │   ├── resume.md      → status      ← /resume still works
│   │   ├── security.md    → audit       ← /security still works
│   │   ├── compatibility.md → audit     ← /compatibility still works
│   │   └── reload.md      → init reload ← /reload still works
│   ├── agents/                          ← 5 dedicated subagents (isolated context)
│   │   ├── architect.md                 ← System design, ADRs (opus model)
│   │   ├── code-reviewer.md             ← P1/P2/P3 severity review (sonnet)
│   │   ├── e2e-runner.md                ← Playwright E2E tests (sonnet)
│   │   ├── doc-updater.md               ← Documentation sync (sonnet)
│   │   └── build-fixer.md               ← Build error resolution (sonnet)
│   ├── hooks/                           ← Event-driven automation scripts
│   │   ├── hooks.json                   ← Hook event configuration
│   │   ├── session-end.js               ← Remind to /compound at session end
│   │   ├── pre-compact.js               ← Save STATE.md before compaction
│   │   └── suggest-compact.js           ← Suggest /pause after N tool calls
│   └── skills/                          ← 23 development skills
│       ├── architecture-enforcement/    ← Per-framework guides + preset definitions
│       ├── brainstorming/               ← Idea exploration with lettered Q&A
│       ├── writing-plans/               ← Implementation plans with task-sizing + optional tasks.json
│       ├── executing-plans/             ← Execute plans with revision mode
│       ├── prd-generator/               ← Structured PRD with user stories
│       ├── eval-harness/                ← EDD framework with pass@k metrics
│       ├── test-driven-development/     ← Adaptive RED-GREEN-REFACTOR
│       ├── systematic-debugging/        ← 4-phase root cause diagnosis
│       ├── verification-before-completion/ ← Evidence-based completion + wiring checks
│       ├── knowledge-compounding/       ← Solution docs + session progress log
│       ├── code-review/                 ← Multi-perspective P1/P2/P3 review
│       ├── compatibility-check/         ← Version & dependency validation
│       ├── ui-ux-pro-max/               ← Design intelligence with BM25 engine
│       ├── state-management/            ← Persistent STATE.md tracking
│       ├── checkpoint-protocol/         ← 7 human-in-the-loop gate types
│       ├── plan-verification/           ← 8-dimension plan validation
│       ├── gap-closure/                 ← Targeted fix plans from gaps
│       ├── todo-management/             ← Capture ideas without losing focus
│       ├── context-engineering/         ← AI context budget management
│       ├── security-audit/              ← OWASP Top 10, secrets, compliance mapping
│       ├── secure-code-patterns/        ← Input validation, crypto, encryption
│       ├── threat-modeling/             ← STRIDE, attack trees, trust boundaries
│       └── data-privacy/                ← GDPR, UU PDP Indonesia, privacy-by-design
├── SUPER-COMPOUND.md                    ← (Optional) Root copy for Claude Code
└── README.md
```

> **Note:** Rules are split into 3 files to stay under Antigravity's 12K character limit per rule file. Skills have no size limit and load progressively.

> [!IMPORTANT]
> **Known Behavior: Rules Not Showing in Antigravity IDE UI**
>
> Files in `.agent/rules/` may not appear in the **Customizations → Rules** list within Antigravity IDE. This is a limitation of the IDE itself, **not** a Super Compound issue. The IDE's Rules UI enforces a strict naming convention: **only lowercase letters, numbers, and hyphens are allowed** (e.g., `super-compound`, not `SUPER-COMPOUND`).
>
> **However, rules still work correctly regardless of whether they appear in the UI.** The AI agent reads and applies all rule files from `.agent/rules/` at the start of every conversation — the UI list is only a visual management layer.
>
> If you want your rules to appear in the UI list, ensure filenames use only lowercase letters, numbers, and hyphens and do little changes like add/remove space then save it, after that hit the 3 dots on the top right corner of the IDE, choose "Customizations" then hit "Refresh" after that you will see the rules in the UI list (e.g., `super-compound.md`, `project-config.md`).

### IDE Compatibility

| Feature | Antigravity IDE | Claude Code |
|---------|:--------------:|:-----------:|
| **Skills** (`.agent/skills/`) | ✅ Native | ✅ Native |
| **Workflows** (`.agent/workflows/`) | ✅ Native | ✅ Native |
| **Rules** (`.agent/rules/`) | ✅ Native | ✅ Via `SUPER-COMPOUND.md` |
| **Agents** (`.agent/agents/`) | ⚠️ Manual invocation | ✅ Native subagents (copy to `.claude/agents/`) |
| **Hooks** (`.agent/hooks/`) | ❌ Not supported | ✅ Merge into `~/.claude/settings.json` |

**Antigravity IDE — Agents:** Call them by name ("Use the architect agent") — the AI reads the agent file and follows its instructions within the current context.

**Antigravity IDE — Hooks:** Use `/pause`, `/compound`, and the `context-engineering` skill as manual equivalents.

**Claude Code — Agents:** Copy `.agent/agents/` to `.claude/agents/` for native isolated subagent execution.

**Claude Code — Hooks:** See `.agent/hooks/README.md` for installation.

---

### Global vs Workspace Scope

| Scope | Location | Use Case |
|-------|----------|----------|
| **Global** (all projects) | `~/.gemini/GEMINI.md` (rules) | Personal coding preferences |
| | `~/.gemini/antigravity/global_workflows/` (workflows) | Workflows shared across projects |
| | `~/.gemini/antigravity/skills/` (skills) | Skills shared across projects |
| **Workspace** (this project) | `.agent/rules/` | Project-specific rules |
| | `.agent/workflows/` | Project-specific workflows |
| | `.agent/skills/` | Project-specific skills |

Super Compound installs at the **workspace scope** — each project gets its own copy so you can customize per-project.

---

## Quick Start

### Step 1: Configure Your Project

Open `.agent/rules/project-config.md` and choose one of three options:

| Option | How | Best For |
|--------|-----|----------|
| **A. Use a Preset** | Uncomment one of 10 preset blocks | Quick start with popular stacks |
| **B. Auto-Detect** | Leave fields empty — AI suggests stack | New projects, unsure about stack |
| **C. Manual** | Fill in each field yourself | Custom or unusual setups |

### Step 2: Available Presets (Local-First)

All presets run locally without cloud/internet dependencies:

| # | Preset | Frontend | Backend | Database |
|---|--------|----------|---------|----------|
| 1 | **Next.js Fullstack** | Next.js + TS + Tailwind + Shadcn | Next.js API Routes + Prisma | PostgreSQL |
| 2 | **React + Express** | React + Vite + TS + Shadcn | Express + Prisma + Swagger | PostgreSQL + Redis |
| 3 | **Vue / Nuxt** | Nuxt 3 + TS + Tailwind | Nitro Server + Prisma | PostgreSQL |
| 4 | **Python FastAPI** | — | FastAPI + SQLAlchemy + Swagger | PostgreSQL + Redis |
| 5 | **Python Django** | — | Django + DRF + Django ORM | PostgreSQL + Redis |
| 6 | **Go Gin** | — | Gin + GORM + Swagger | PostgreSQL + Redis |
| 7 | **PHP Laravel** | Blade + Livewire | Laravel + Eloquent | MySQL + Redis |
| 8 | **SvelteKit** | SvelteKit + TS + Tailwind | SvelteKit Server + Drizzle | SQLite |
| 9 | **React Native** | React Native + Expo + TS | — | SQLite |
| 10 | **General (Blank)** | — | — | — |

### Step 3: Start Working

Use the workflow commands in your IDE:

```
/brainstorm    → Explore an idea collaboratively
/discuss       → Pre-planning context gathering via structured Q&A
/research      → Structured domain research before planning
/prd           → Generate structured Product Requirements Document
/plan          → Create an implementation plan with auto-verification
/work          → Execute the plan with TDD
/debug         → Diagnose and fix bugs systematically
/review        → Multi-perspective code review
/compound      → Document solved problems
/launch        → Full pipeline (brainstorm → plan → work → review → compound)
/pause         → Save session state for later resumption
/resume        → Restore state and continue from where you left off
/progress      → Show project status overview and next actions
/reload        → Re-read rules mid-conversation after edits
/init          → Scan codebase, auto-fill config, generate codebase map
/compatibility → Audit tech stack compatibility, report conflicts
/ui-ux-pro-max → Generate design system, build professional UI
/security      → Full security audit (OWASP, secrets, deps, privacy)
```

---

## Core Workflow

```
                    ┌─── Pause ──→ .continue-here.md ──→ Resume ───┐
                    │                                               │
💡 Brainstorm → 📝 PRD → 📋 Plan → ⚡ Work → 🔍 Review → 📚 Compound
      ↑                                                          ↓
      └──────────────── Knowledge feeds back ────────────────────┘
```

| Phase | Workflow | What Happens |
|-------|----------|--------------|
| 💡 **Brainstorm** | `/brainstorm` | Explore ideas, ask questions with lettered options (A/B/C/D) |
| 💬 **Discuss** | `/discuss` | Pre-planning context gathering via structured gray-area exploration |
| 🔬 **Research** | `/research` | Structured domain research — standard stack, patterns, pitfalls |
| 📝 **PRD** | `/prd` | Generate structured PRD with user stories and acceptance criteria |
| 📋 **Plan** | `/plan` | Create implementation plan with auto-verification (8 dimensions) |
| ⚡ **Work** | `/work` | Execute tasks with TDD, incremental commits, architecture checks |
| 🐛 **Debug** | `/debug` | Reproduce → investigate → diagnose → fix with TDD → verify |
| 🔍 **Review** | `/review` | Spec compliance → code quality → architecture → severity classification |
| 📚 **Compound** | `/compound` | Capture solutions in `docs/solutions/` + session progress log |
| 🚀 **Launch** | `/launch` | Full autonomous pipeline with user approval at each gate |
| ⏸️ **Pause** | `/pause` | Save session state, progress log, and optional archiving |
| ▶️ **Resume** | `/resume` | Restore state from `.continue-here.md` and route to next action |
| 📊 **Progress** | `/progress` | Show project state overview and route to next action |
| 🔄 **Reload** | `/reload` | Re-read all rule files, apply changes immediately |
| 🔰 **Init** | `/init` | Scan codebase, auto-fill config, generate `docs/codebase-map.md` |
| 🔍 **Compatibility** | `/compatibility` | Audit dependency versions, report conflicts, suggest fixes |
| 🎨 **UI/UX Pro Max** | `/ui-ux-pro-max` | Generate design system, implement professional UI with design intelligence |
| 🛡️ **Security** | `/security` | Full OWASP audit, secrets scan, dependency CVEs, privacy check |

---

## Skills

| Skill | Purpose | Key Feature |
|-------|---------|-------------|
| **brainstorming** | Idea exploration before coding | Lettered options (A/B/C/D), YAGNI |
| **writing-plans** | Create implementation plans | Quick / Standard / Comprehensive + task-sizing discipline |
| **executing-plans** | Execute plans task by task | Sequential + optional swarm + revision mode |
| **prd-generator** | Structured PRD creation | User stories, acceptance criteria, lettered Q&A |
| **structured-tasks** | Machine-parseable task tracking | `tasks.json` with priority and status |
| **test-driven-development** | Adaptive RED-GREEN-REFACTOR | Strict / balanced / relaxed |
| **systematic-debugging** | Root cause diagnosis | 4-phase: investigate → analyze → hypothesize → fix |
| **verification-before-completion** | Evidence-based completion | Iron Law: no claims without proof |
| **knowledge-compounding** | Document solutions + session log | `docs/solutions/` + append-only `docs/progress.md` |
| **code-review** | Multi-perspective review | Spec + quality + architecture with P1/P2/P3 |
| **compatibility-check** | Tech stack validation | Pre-flight during planning + on-demand audit |
| **ui-ux-pro-max** | Design intelligence for frontend UI | 67 styles, 96 palettes, 57 fonts, 13 stacks |
| **state-management** | Persistent project state | STATE.md tracking, decisions, blockers |
| **checkpoint-protocol** | Human-in-the-loop gates | 7 checkpoint types for structured decisions |
| **plan-verification** | Plan validation before execution | 8 dimensions including task-sizing |
| **gap-closure** | Targeted fixes from verification | Fix specific gaps without rewriting |
| **todo-management** | Capture ideas without losing focus | Area inference, deferred tracking |
| **context-engineering** | AI context budget management | Selective loading, history digest |
| **integration-checking** | Cross-component wiring | Existence ≠ Integration |
| **security-audit** | Security vulnerability assessment | OWASP Top 10, compliance mapping (ISO 27001, NIST) |
| **secure-code-patterns** | Secure coding implementation | Input validation, cryptography, encryption at rest/transit |
| **threat-modeling** | Proactive threat identification | STRIDE framework, attack trees, trust boundaries |
| **data-privacy** | Privacy compliance | GDPR, UU PDP Indonesia, privacy-by-design, DPIA |
| **secrets-management** | Credential security | Zero hardcoded secrets, vault patterns, incident response |

---

## Architecture Enforcement

Super Compound prevents spaghetti code through **universal rules** + **per-framework guides**.

### Universal Anti-Spaghetti Rules

| Rule | Limit |
|------|-------|
| Max lines per file | 1000 |
| Max lines per function | 50 |
| Max nesting depth | 3 levels |
| Max function parameters | 4 |
| Max module dependencies | 7 |
| God class detection | 10+ public methods → split |

### Per-Framework Architecture Guides

Each preset includes a framework-aligned folder structure with dependency direction rules:

| Framework | Architecture | Key Rule |
|-----------|-------------|----------|
| **Next.js** | Modular | `lib/services/` → never import from `app/` or `components/` |
| **React + Vite** | Layered | `services/` → no UI imports; `stores/` → never import `components/` |
| **Nuxt 3** | Modular | `services/` → never import from `pages/` or `components/` |
| **FastAPI** | Clean Architecture | `domain/` → zero external imports; DI wires infra at startup |
| **Django** | MVC + Service Layer | ALL business logic in `services.py`, never in views |
| **Go Gin** | Standard Go Layout | `handler/` → never import `repository/` directly |
| **Laravel** | MVC + Service Layer | Thin controllers → `Services/` has all business logic |
| **SvelteKit** | Modular | `lib/server/` → never import from `routes/` |
| **React Native** | Modular | `services/` → no UI imports; `components/` → never import `app/` |

Violations are classified as **P1 Critical** during code review.

---

## Auto-Detect Smart Suggestion

When project config fields are empty, Super Compound automatically:

1. **Analyzes** your requirements and project description
2. **Evaluates** across 7 criteria: performance, security, DX, type safety, ecosystem, scalability, deployment
3. **Recommends** the optimal stack with clear reasoning
4. **Confirms** with you before proceeding — never starts without approval

```
📋 Project config is empty. Based on your requirements, I recommend:

┌─────────────────────────────────────────────┐
│  Suggested Stack: Next.js Fullstack         │
├─────────────────────────────────────────────┤
│  Frontend  : Next.js + TypeScript           │
│  Backend   : API Routes + Prisma            │
│  Database  : PostgreSQL                     │
│  Auth      : JWT via better-auth            │
├─────────────────────────────────────────────┤
│  Why: Best DX + type safety + performance   │
└─────────────────────────────────────────────┘

1. ✅ Use this stack
2. 🔄 Suggest alternative
3. ✏️  I'll configure manually
4. 📋 Show all presets
```

---

## Philosophy

| Principle | Description |
|-----------|-------------|
| **Evidence > Claims** | Run verification, then claim success |
| **Root Cause > Quick Fix** | Diagnose before fixing |
| **Test First > Test After** | Failing test proves your test works |
| **YAGNI + DRY** | Build only what's needed, never duplicate |
| **Plan > Code** | Think before implementing |
| **Knowledge Compounds** | Document solutions for the future |
| **Architecture First** | Follow framework conventions, enforce dependency direction |

---

## Compatibility

| Platform | OS | Status |
|----------|----|--------|
| **Antigravity IDE** | Windows, Linux | ✅ Fully supported |
| **Claude Code** | Windows, Linux, macOS | ✅ Fully supported |

### Requirements

- Git (for branch/worktree workflows)
- Docker (optional, for containerized presets)
- Framework-specific tooling (Node.js, Python, Go, PHP, etc.)

---

## Origin

Super Compound synthesizes the best ideas from excellent frameworks:

- **[Superpowers](https://github.com/obra/superpowers)** by Jesse Vincent — TDD discipline, systematic debugging, verification rigor.
- **[Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin)** by Kieran Klaassen — Knowledge compounding, multi-depth planning, swarm orchestration.
- **[CIA](https://github.com/Hack23/cia)** by Hack23 — Citizen Intelligence Agency. Open-source intelligence platform analyzing Swedish political activities using AI and data visualization. Tracks politicians, government institutions, and parliamentary data, offering detailed insights, performance metrics, and advanced analytics.
- **[GET SHIT DONE](https://github.com/gsd-build/get-shit-done)** by glittercowboy TÂCHES — A light-weight and powerful meta-prompting, context engineering and spec-driven development system for Claude Code and OpenCode.
- **[RALPH](https://github.com/snarktank/ralph)** by snarktank — Ralph is an autonomous AI agent loop that runs repeatedly until all PRD items are complete.
- **[Everything Claude Code](https://github.com/affaan-m/everything-claude-code)** by Affaan Mustafa — Production-ready agents, skills, hooks, commands, rules, and MCP configurations evolved over 10+ months of intensive daily use building real products.

Super Compound is the principle that systematic discipline, applied consistently through AI assistance, doesn't just accumulate — it multiplies, turning every solved problem and every rigorous process into compounding returns on future work.

---

## License

MIT
