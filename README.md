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
| 🧠 **Knowledge Compounding** | Every solved problem becomes searchable documentation in `docs/solutions/` |
| 🌿 **Adaptive Git** | Branch (default), Worktree (parallel dev), or No-Git (prototyping) |
| 🔄 **Optional Swarm Mode** | Sequential by default, parallel multi-agent when tasks are independent |
| 🔍 **Multi-Perspective Review** | 2-stage code review (spec + quality) with P1/P2/P3 severity classification |
| 🐛 **Systematic Debugging** | 4-phase root cause diagnosis — never guess, always diagnose first |
| ✅ **Verification Gate** | Evidence-based completion — no claims without fresh verification output |

---

## Installation

Super Compound follows the official Antigravity IDE convention: **all rules, workflows, and skills live inside the `.agent/` directory.**

### Antigravity IDE

#### Windows (PowerShell)

```powershell
# Navigate to your project root
cd C:\path\to\your-project

# Copy the entire .agent folder (includes rules, workflows, and skills)
Copy-Item -Recurse "path\to\SUPER-COMPOUND\.agent" -Destination ".\.agent" -Force
```

#### Linux / macOS (Bash)

```bash
# Navigate to your project root
cd /path/to/your-project

# Copy the entire .agent folder (includes rules, workflows, and skills)
cp -r /path/to/SUPER-COMPOUND/.agent ./.agent
```

### Claude Code

For Claude Code, copy the `.agent/` folder the same way. Additionally, you may want to copy `SUPER-COMPOUND.md` to your project root so Claude Code reads it as the main rules file:

#### Windows (PowerShell)

```powershell
Copy-Item -Recurse "path\to\SUPER-COMPOUND\.agent" -Destination ".\.agent" -Force
Copy-Item "path\to\SUPER-COMPOUND\SUPER-COMPOUND.md" -Destination ".\SUPER-COMPOUND.md"
```

#### Linux / macOS (Bash)

```bash
cp -r /path/to/SUPER-COMPOUND/.agent ./.agent
cp /path/to/SUPER-COMPOUND/SUPER-COMPOUND.md ./SUPER-COMPOUND.md
```

### Project Structure After Installation

```
your-project/
├── .agent/                              ← All Super Compound files live here
│   ├── rules/                           ← Workspace rules (3 files, each <12K chars)
│   │   ├── SUPER-COMPOUND.md                  ← Core philosophy, skills, workflows, git
│   │   ├── project-config.md            ← Tech stack config + presets + auto-detect
│   │   └── quality-gates.md             ← Verification, knowledge, architecture rules
│   ├── workflows/                       ← 8 workflow commands  
│   │   ├── brainstorm.md
│   │   ├── plan.md
│   │   ├── work.md
│   │   ├── review.md
│   │   ├── compound.md
│   │   ├── debug.md
│   │   ├── launch.md
│   │   └── reload.md
│   └── skills/                          ← 9 development skills
│       ├── architecture-enforcement/    ← Per-framework guides + preset definitions
│       ├── brainstorming/
│       ├── writing-plans/
│       ├── executing-plans/
│       ├── test-driven-development/
│       ├── systematic-debugging/
│       ├── verification-before-completion/
│       ├── knowledge-compounding/
│       └── code-review/
├── SUPER-COMPOUND.md                          ← (Optional) Root copy for Claude Code
└── README.md
```

> **Note:** Rules are split into 3 files to stay under Antigravity's 12K character limit per rule file. Skills have no size limit and load progressively.

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
/plan          → Create an implementation plan
/work          → Execute the plan with TDD
/debug         → Diagnose and fix bugs systematically
/review        → Multi-perspective code review
/compound      → Document solved problems
/launch        → Full pipeline (brainstorm → plan → work → review → compound)
/reload        → Re-read rules mid-conversation after edits
```

---

## Core Workflow

```
💡 Brainstorm → 📋 Plan → ⚡ Work → 🔍 Review → 📚 Compound
      ↑                                               ↓
      └──────── Knowledge feeds back ──────────────────┘
```

| Phase | Workflow | What Happens |
|-------|----------|--------------|
| 💡 **Brainstorm** | `/brainstorm` | Explore ideas, ask questions one-at-a-time, present 2-3 approaches |
| 📋 **Plan** | `/plan` | Research codebase, choose depth (Quick/Standard/Comprehensive), create tasks |
| ⚡ **Work** | `/work` | Execute tasks with TDD, incremental commits, architecture checks |
| 🐛 **Debug** | `/debug` | Reproduce → investigate → diagnose → fix with TDD → verify |
| 🔍 **Review** | `/review` | Spec compliance → code quality → architecture → severity classification |
| 📚 **Compound** | `/compound` | Capture solutions in `docs/solutions/` for future reference |
| 🚀 **Launch** | `/launch` | Full autonomous pipeline with user approval at each gate |
| 🔄 **Reload** | `/reload` | Re-read all rule files, apply changes immediately |

---

## Skills

| Skill | Purpose | Key Feature |
|-------|---------|-------------|
| **brainstorming** | Idea exploration before coding | One question at a time, YAGNI |
| **writing-plans** | Create implementation plans | Quick / Standard / Comprehensive depth |
| **executing-plans** | Execute plans task by task | Sequential + optional swarm mode |
| **test-driven-development** | Adaptive RED-GREEN-REFACTOR | Strict / balanced / relaxed |
| **systematic-debugging** | Root cause diagnosis | 4-phase: investigate → analyze → hypothesize → fix |
| **verification-before-completion** | Evidence-based completion | Iron Law: no claims without proof |
| **knowledge-compounding** | Document solutions | `docs/solutions/` with categories + patterns |
| **code-review** | Multi-perspective review | Spec + quality + architecture with P1/P2/P3 |

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

Super Compound synthesizes the best ideas from two excellent frameworks:

- **[Superpowers](https://github.com/obra/superpowers)** by Jesse Vincent — TDD discipline, systematic debugging, verification rigor
- **[Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin)** by Kieran Klaassen — Knowledge compounding, multi-depth planning, swarm orchestration

Named after the hypothetical particle that mediates gravity — connecting to the Antigravity IDE name while representing the fundamental building blocks of disciplined AI development.

---

## License

MIT
