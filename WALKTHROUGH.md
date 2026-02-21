# Super Compound ⚛️ — Complete Tutorial

> **From Basic to Advanced — A guide to using the Super Compound framework for AI-assisted development.**

This tutorial will walk you through installation, basic configuration, and the use of Super Compound's advanced features. Each section comes with real-world case examples for easy understanding.

---

## Table of Contents

- [Part 1: Basic — Installation & Configuration](#part-1-basic--installation--configuration)
  - [1.1 What Is Super Compound?](#11-what-is-super-compound)
  - [1.2 Installation](#12-installation)
  - [1.3 Project Configuration](#13-project-configuration)
  - [1.4 Preset — Quick Start](#14-preset--quick-start)
  - [1.5 Auto-Detect — Smart Suggestion](#15-auto-detect--smart-suggestion)
- [Part 2: Intermediate — Workflow & Skills](#part-2-intermediate--workflow--skills)
  - [2.1 Core Workflow Pipeline](#21-core-workflow-pipeline)
  - [2.2 Workflow: Brainstorm](#22-workflow-brainstorm)
  - [2.3 Workflow: Plan](#23-workflow-plan)
  - [2.4 Workflow: Work](#24-workflow-work)
  - [2.5 Workflow: Review](#25-workflow-review)
  - [2.6 Workflow: Compound](#26-workflow-compound)
  - [2.7 Workflow: Launch (Full Pipeline)](#27-workflow-launch-full-pipeline)
  - [2.8 Workflow: Debug](#28-workflow-debug)
  - [2.9 Workflow: Reload](#29-workflow-reload)
  - [2.10 Workflow: Init](#210-workflow-init)
  - [2.11 Workflow: Compatibility](#211-workflow-compatibility)
  - [2.12 Workflow: UI/UX Pro Max](#212-workflow-uiux-pro-max)
  - [2.13 Workflow: Security](#213-workflow-security)
  - [2.14 Workflow: Discuss, Research & PRD](#214-workflow-discuss-research--prd)
  - [2.15 Workflow: Pause, Resume & Progress](#215-workflow-pause-resume--progress)
- [Part 3: Advanced — Skills Deep Dive](#part-3-advanced--skills-deep-dive)
  - [3.1 Test-Driven Development (TDD)](#31-test-driven-development-tdd)
  - [3.2 Systematic Debugging](#32-systematic-debugging)
  - [3.3 Verification Before Completion](#33-verification-before-completion)
  - [3.4 Architecture Enforcement](#34-architecture-enforcement)
  - [3.5 Knowledge Compounding](#35-knowledge-compounding)
  - [3.6 Code Review](#36-code-review)
  - [3.7 Compatibility Check](#37-compatibility-check)
  - [3.8 UI/UX Pro Max](#38-uiux-pro-max)
  - [3.9 Security-by-Design](#39-security-by-design)
  - [3.10 PRD Generator & Structured Tasks](#310-prd-generator--structured-tasks)
  - [3.11 State & Session Management](#311-state--session-management)
- [Part 4: Real-World Case Studies](#part-4-real-world-case-studies)
  - [Case 1: Building a REST API with FastAPI](#case-1-building-a-rest-api-with-fastapi)
  - [Case 2: Debugging a Production Bug](#case-2-debugging-a-production-bug)
  - [Case 3: Full-Stack Feature with Next.js (Launch Pipeline)](#case-3-full-stack-feature-with-nextjs-launch-pipeline)
- [Part 5: Tips & Best Practices](#part-5-tips--best-practices)

---

## Part 1: Basic — Installation & Configuration

### 1.1 What Is Super Compound?

Super Compound is a framework for **AI-assisted development** in **Antigravity IDE** and **Claude Code**. Super Compound teaches your AI assistant to work with discipline:

- ✅ Write tests before code (TDD)
- ✅ Diagnose root cause before fixing bugs
- ✅ Verify before claiming completion
- ✅ Document solutions for future reference
- ✅ Enforce clean architecture

**Core Philosophy:**

| Principle | Explanation |
|-----------|-------------|
| Evidence > Claims | Run verification, then claim done |
| Root Cause > Quick Fix | Diagnose first, then fix |
| Test First > Test After | A failing test proves your test is correct |
| YAGNI + DRY | Build only what's needed, don't duplicate |
| Plan > Code | Think before implementing |
| Knowledge Compounds | Document solutions for the future |

### 1.2 Installation

Super Compound lives inside the `.agent/` folder at your project root.

#### Option A: Git Clone (Recommended)

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

#### Option B: Manual Copy

If you already have the Super Compound files locally:

```bash
cd /path/to/your-project
cp -r /path/to/super-compound/.agent ./.agent
```

**Windows (PowerShell):**

```powershell
cd C:\path\to\your-project
Copy-Item -Recurse "path\to\super-compound\.agent" -Destination ".\.agent" -Force
```

#### Claude Code

For Claude Code, copy `.agent/` using either option above, and also copy `SUPER-COMPOUND.md` to the project root:

```bash
cp /path/to/super-compound/SUPER-COMPOUND.md ./SUPER-COMPOUND.md
```

#### Structure After Installation

```
your-project/
├── .agent/
│   ├── rules/              ← 3 rule files
│   │   ├── super-compound.md ← Core philosophy, skills, workflows, git
│   │   ├── project-config.md ← Tech stack configuration + presets
│   │   └── quality-gates.md  ← Verification, knowledge, architecture
│   ├── workflows/          ← 18 workflow commands
│   │   ├── brainstorm.md     ├── discuss.md       ├── research.md
│   │   ├── prd.md            ├── plan.md          ├── work.md
│   │   ├── debug.md          ├── review.md        ├── compound.md
│   │   ├── launch.md         ├── pause.md         ├── resume.md
│   │   ├── progress.md       ├── reload.md        ├── init.md
│   │   ├── compatibility.md  ├── ui-ux-pro-max.md └── security.md
│   └── skills/             ← 25 development skills
│       ├── architecture-enforcement/  ├── brainstorming/
│       ├── writing-plans/            ├── executing-plans/
│       ├── prd-generator/            ├── structured-tasks/
│       ├── test-driven-development/   ├── systematic-debugging/
│       ├── verification-before-completion/ ├── knowledge-compounding/
│       ├── code-review/              ├── compatibility-check/
│       ├── ui-ux-pro-max/            ├── state-management/
│       ├── checkpoint-protocol/      ├── plan-verification/
│       ├── gap-closure/              ├── todo-management/
│       ├── context-engineering/      ├── integration-checking/
│       ├── security-audit/           ├── secure-code-patterns/
│       ├── threat-modeling/           ├── data-privacy/
│       └── secrets-management/
└── README.md
```

### 1.3 Project Configuration

Open the file `.agent/rules/project-config.md` and fill it in according to your project.

**There are 3 ways to configure:**

| Option | How | Best For |
|--------|-----|----------|
| **A. Preset** | Choose from 10 presets | Quick start with popular stacks |
| **B. Auto-Detect** | Leave fields empty — AI suggests | New projects, unsure about stack |
| **C. Manual** | Fill in each field yourself | Custom or unique setups |

#### Manual Configuration Example

```yaml
# ═══ IDENTITY ═══
project_name: "online-store"
project_type: "fullstack"
api_style: "rest"

# ═══ FRONTEND ═══
frontend:
  framework: "nextjs"
  language: "typescript"
  styling: "tailwind"
  component_library: "shadcn"

# ═══ BACKEND ═══
backend:
  framework: "nextjs"
  language: "typescript"
  orm: "prisma"

# ═══ DATABASE ═══
database:
  primary: "postgresql"
  cache: "none"
  migration_tool: "prisma-migrate"

# ═══ COMMANDS ═══
dev_command: "pnpm dev"
test_command: "pnpm vitest run"
lint_command: "pnpm eslint ."
build_command: "pnpm build"

# ═══ Super Compound BEHAVIOR ═══
git_workflow: "branch"
tdd_mode: "balanced"
default_execution: "sequential"
```

### 1.4 Preset — Quick Start

Super Compound provides **10 ready-to-use presets**. Simply uncomment/copy the preset that fits:

| # | Preset | Stack | Architecture |
|---|--------|-------|--------------|
| 1 | **Next.js Fullstack** | TS + Tailwind + Shadcn + Prisma + PostgreSQL | Modular |
| 2 | **React + Express** | TS + Vite + Prisma + PostgreSQL + Redis | Layered |
| 3 | **Vue / Nuxt** | TS + Tailwind + Prisma + PostgreSQL | Modular |
| 4 | **Python FastAPI** | SQLAlchemy + PostgreSQL + Redis | Clean |
| 5 | **Python Django** | Django ORM + PostgreSQL + Redis | MVC + Service |
| 6 | **Go Gin** | GORM + PostgreSQL + Redis | Standard Go |
| 7 | **PHP Laravel** | Eloquent + MySQL + Redis | MVC + Service |
| 8 | **SvelteKit** | Drizzle + SQLite + Lucia | Modular |
| 9 | **React Native** | Expo + SQLite | Modular |
| 10 | **General (Blank)** | Empty template | — |

#### Example: Using the FastAPI Preset

Copy preset 4 configuration to `project-config.md`:

```yaml
project_type: "backend"
api_style: "rest"
backend:
  framework: "fastapi"
  language: "python"
  orm: "sqlalchemy"
  api_docs: "swagger"
database:
  primary: "postgresql"
  cache: "redis"
  migration_tool: "alembic"
container: "docker"
package_manager: "uv"
dev_command: "uvicorn app.main:app --reload"
test_command: "pytest -v --cov"
lint_command: "ruff check . && mypy ."
architecture: "clean"
tdd_mode: "balanced"
```

### 1.5 Auto-Detect — Smart Suggestion

If you leave the configuration fields empty, Super Compound will automatically suggest the optimal stack.

**Auto-Detect Process:**

1. **ANALYZE** — Analyze requirements from your request
2. **EVALUATE** — Evaluate based on 7 criteria: performance, security, DX, type safety, ecosystem, scalability, deployment
3. **RECOMMEND** — Recommend the best stack with reasoning
4. **CONFIRM** — Wait for your approval before proceeding

#### Example Case: Auto-Detect in Action

You type: *"Build a real-time sales monitoring analytics dashboard"*

AI will respond:

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
│  Why: Dashboard SaaS → best DX + real-time  │
└─────────────────────────────────────────────┘

1. ✅ Use this stack
2. 🔄 Suggest alternatives
3. ✏️  I'll configure manually
4. 📋 Show all presets
```

---

## Part 2: Intermediate — Workflow & Skills

### 2.1 Core Workflow Pipeline

Super Compound has a structured **development pipeline**:

```
                    ┌─── Pause ──→ .continue-here.md ──→ Resume ───┐
                    │                                               │
💡 Brainstorm → 📝 PRD → 📋 Plan → ⚡ Work → 🔍 Review → 📚 Compound
      ↑                                                          ↓
      └──────────────── Knowledge feeds back ────────────────────┘
```

Each phase can be run independently or as a full pipeline via `/launch`.

| Phase | Command | Purpose |
|-------|---------|---------|
| 💡 Brainstorm | `/brainstorm` | Explore ideas, lettered Q&A (A/B/C/D) |
| 💬 Discuss | `/discuss` | Pre-planning context gathering |
| 🔬 Research | `/research` | Structured domain research |
| 📝 PRD | `/prd` | Generate structured PRD with user stories |
| 📋 Plan | `/plan` | Create implementation plan with auto-verification |
| ⚡ Work | `/work` | Execute tasks with TDD, incremental commits |
| 🐛 Debug | `/debug` | Reproduce → diagnose → fix with TDD |
| 🔍 Review | `/review` | Multi-perspective review, severity classification |
| 📚 Compound | `/compound` | Document solutions + session progress log |
| 🚀 Launch | `/launch` | Full pipeline with approval at each gate |
| ⏸️ Pause | `/pause` | Save session state + archive + progress log |
| ▶️ Resume | `/resume` | Restore from `.continue-here.md` |
| 📊 Progress | `/progress` | Show project state + next actions |
| 🔰 Init | `/init` | Scan codebase, auto-fill config, generate codebase map |
| 🔍 Compatibility | `/compatibility` | Audit dependency versions, report conflicts |
| 🎨 UI/UX Pro Max | `/ui-ux-pro-max` | Generate design system, build professional UI |
| 🛡️ Security | `/security` | Full OWASP audit, secrets scan, dependency CVEs, privacy check |

### 2.2 Workflow: Brainstorm

**When to use:** New feature ideas, unclear requirements, architectural decisions.

**Command:** `/brainstorm [idea description]`

**Process:**

```
Phase 0: Assess    → Is brainstorming necessary?
Phase 1: Understand → Research codebase + ask questions ONE AT A TIME
Phase 2: Explore   → Present 2-3 approaches with trade-offs
Phase 3: Design    → Present design per section (200-300 words)
Phase 4: Capture   → Save to docs/brainstorms/YYYY-MM-DD-<topic>.md
```

#### 📌 Example Case: Brainstorming a Notification Feature

```
You: /brainstorm I want to add a notification system to the app

AI: I'm using the brainstorming skill to explore this idea.

    I found some patterns in your codebase...

    Question 1: What kind of notifications do you need?
    a) In-app notifications only (bell icon)
    b) Email notifications
    c) Push notifications (mobile)
    d) A combination

You: a) In-app notifications only

AI: Question 2: Do notifications need to be real-time (appear instantly)
    or is it fine when the user refreshes?
    a) Real-time (WebSocket/SSE)
    b) Polling (check every N seconds)
    c) On refresh only

You: a) Real-time

AI: Based on your answers, I recommend 2 approaches:

    Approach A: Server-Sent Events (SSE) ✅ Recommended
    + Simple, unidirectional, HTTP native
    + Well-suited for notifications (server → client)
    - Cannot send from client

    Approach B: WebSocket
    + Bidirectional communication
    - More complex, requires connection management
    - Overkill for one-way notifications

    My recommendation: SSE — simpler and sufficient for this use case.
    
    Do you agree, or would you like to explore further?
```

**Output:** File `docs/brainstorms/2026-02-10-notification-system-brainstorm.md`

### 2.3 Workflow: Plan

**When to use:** Requirements are clear, need to define HOW.

**Command:** `/plan`

**Process:**

```
1. Check brainstorm  → Look for related brainstorm documents
2. Research          → Review codebase + docs/solutions/
3. Choose depth      → Quick / Standard / Comprehensive
4. Write plan        → Bite-sized tasks (2-5 minutes per task)
5. Save & handoff    → Save to docs/plans/ + execution options
```

**3 Depth Levels:**

| Level | Best For | Content |
|-------|----------|---------|
| 📄 **Quick** | Small bugs, simple fixes | Task list + acceptance criteria |
| 📋 **Standard** | Medium features, complex bugs | + file paths, code snippets, TDD steps |
| 📚 **Comprehensive** | Large features, architectural changes | + phased plan, risks, alternatives |

#### 📌 Example Case: Planning a User Authentication Feature

```
You: /plan

AI: I found a brainstorm from yesterday about authentication.
    Using it as input.

    Choose plan depth:
    📄 Quick — Simple tasks
    📋 Standard — Most features
    📚 Comprehensive — Major features

You: 📋 Standard

AI: Plan saved to docs/plans/2026-02-10-user-auth-plan.md

    === User Authentication Plan ===

    Goal: Implement JWT authentication with register, login, logout
    Architecture: Middleware-based auth with Prisma user model
    TDD Mode: balanced

    Task 1: Create User Model (3 min)
    Files: prisma/schema.prisma
    - Add User model with fields: id, email, password, createdAt

    Task 2: Write Auth Service Tests (5 min)
    Files: tests/services/auth.test.ts
    Step 1: Write failing test → register user
    Step 2: Run test → Expected: FAIL
    Step 3: Implement minimal auth service
    Step 4: Run test → Expected: PASS

    Task 3: Implement Auth Service (5 min)
    Files: src/lib/services/auth.ts
    ...

    How would you like to proceed?
    1. Execute sequentially
    2. Execute with swarm (parallel)
    3. Review and refine
    4. Done for now
```

### 2.4 Workflow: Work

**When to use:** Plan is approved, time to execute.

**Command:** `/work`

**Process:**

```
1. Load plan        → Read and confirm understanding
2. Setup environment → Branch / Worktree / No-Git
3. Task checklist   → Extract all tasks from the plan
4. Swarm decision   → 5+ independent tasks? Offer parallel execution
5. Execute tasks    → TDD cycle per task + incremental commits
6. Batch checkpoint → Every 3 tasks → progress summary + feedback
7. Quality gate     → Full test + lint + verification
8. Ship it          → Final commit + push
```

#### 📌 Example Case: Executing the Authentication Plan

```
You: /work

AI: I'm using the executing-plans skill.

    📋 Plan loaded: user-auth-plan.md (6 tasks)
    🌿 Git: Creating branch feat/user-authentication

    === Task 1/6: Create User Model ===
    ✅ Added User model to prisma/schema.prisma
    ✅ Run: pnpm prisma migrate dev
    ✅ Committed: "feat(db): add User model with auth fields"

    === Task 2/6: Auth Service Tests ===
    🔴 RED: Test register user → FAIL (expected)
    🟢 GREEN: Implement register → PASS
    ♻️ REFACTOR: Extract password hashing utility
    ✅ Committed: "feat(auth): add register service with tests"

    === Task 3/6: Auth Service Login ===
    🔴 RED: Test login → FAIL (expected)
    🟢 GREEN: Implement login → PASS
    ✅ Committed: "feat(auth): add login service with tests"

    --- Checkpoint (3/6 tasks) ---
    ✅ 3 tasks completed, all tests pass
    Continue to the next batch, or any feedback?

You: Continue

    ... (Tasks 4-6 executed) ...

    === Quality Gate ===
    ✅ Tests: 12/12 pass
    ✅ Linter: 0 errors
    ✅ All acceptance criteria met

    🚀 Shipped! Branch feat/user-authentication ready.
```

### 2.5 Workflow: Review

**When to use:** After implementation is done, before merging.

**Command:** `/review`

**Process:**

```
Phase 1: Spec compliance  → Match against plan/spec
Phase 2: Code quality     → 6 perspectives (correctness, design, security, 
                            performance, readability, testing)
Phase 3: Classify         → P1 Critical / P2 Important / P3 Suggestion
Phase 4: Present          → Structured report + action items
Phase 5: Approval         → APPROVE / CHANGES REQUESTED
```

**Severity Classification:**

| Level | Label | Description | Action |
|-------|-------|-------------|--------|
| 🔴 P1 | Critical | Bug, security, data loss | MUST fix before merge |
| 🟡 P2 | Important | Design issues, missing edge cases | Should fix |
| 🟢 P3 | Suggestion | Style, naming, minor improvements | Nice to have |

#### 📌 Example Case: Reviewing an Implementation

```
You: /review

AI: I'm using the code-review skill.

    ## Review Summary

    Scope: feat/user-authentication (6 files changed)
    Verdict: APPROVE WITH NOTES

    ### ✅ Strengths
    - Clean TDD discipline — all features have tests
    - Good separation of concerns in auth service
    - Proper password hashing with bcrypt

    ### 🟡 P2 — Important (Should Fix)
    1. src/lib/services/auth.ts:45 — JWT secret hardcoded
       → Move to environment variable
    2. src/lib/services/auth.ts:23 — Missing rate limiting on login
       → Add rate limiter to prevent brute force

    ### 🟢 P3 — Suggestions
    1. tests/services/auth.test.ts:12 — Test name could be more descriptive
       → "rejects empty email during registration"

    No P1 critical issues found ✅
    
    Fix P2 items, or approve as-is?
```

### 2.6 Workflow: Compound

**When to use:** After solving a non-trivial problem.

**Command:** `/compound`

**Auto-trigger:** When you say *"it works"*, *"it's fixed"*, *"problem solved"*.

**Process:**

```
1. Detect trigger   → Was a problem just solved?
2. Evaluate         → Is it important enough to document?
3. Gather context   → Problem, symptoms, root cause, solution, prevention
4. Check existing   → Search docs/solutions/ for similar entries
5. Classify         → Choose category (build-errors, runtime-errors, etc.)
6. Create doc       → Write to docs/solutions/<category>/<filename>.md
7. Pattern detect   → 3+ similar issues? Create a pattern doc
```

#### 📌 Example Case: Documenting a Bug Fix Solution

After successfully fixing a complex session management bug:

```
You: Finally fixed it! Turns out the issue was with session timeout.

AI: I'm using the knowledge-compounding skill.

    ✓ Solution documented

    File created:
    • docs/solutions/runtime-errors/session-timeout-jwt-20260210.md

    ---
    date: 2026-02-10
    category: runtime-errors
    severity: high
    tags: [jwt, session, authentication, timeout]
    ---
    # JWT Session Timeout Causes Silent Auth Failure

    ## Symptoms
    Users randomly logged out without error message.
    Console shows: "Error: jwt expired" on API calls.

    ## Root Cause
    JWT token lifetime set to 1 hour but refresh token
    logic only triggered on page reload, not on API calls.

    ## Solution
    Added axios interceptor to refresh token when 401 received.

    ## Prevention
    Always implement token refresh in HTTP client interceptor,
    not in page lifecycle hooks.
    ---

    What next?
    1. Continue working
    2. View the documentation
    3. Link related issues
```

### 2.7 Workflow: Launch (Full Pipeline)

**When to use:** Developing a new feature from start to finish.

**Command:** `/launch [feature description]`

A full pipeline that runs all workflows in sequence:

```
/launch → /brainstorm → /plan → /work → /review → /compound → Ship
```

Each stage waits for your **approval** before proceeding to the next.

#### 📌 Example Case: Launch Pipeline for a New Feature

```
You: /launch Build a shopping cart feature for the online store

AI:   === STAGE 1: BRAINSTORM ===
      Exploring the shopping cart idea...
      [Q&A → Design → Brainstorm document]
      ✅ Brainstorm complete. Proceed to planning?

You: Yes, continue

AI:   === STAGE 2: PLAN ===
      Creating implementation plan...
      [Research → 8 tasks → Save plan]
      ✅ Plan complete. Start execution?

You: Yes, continue

AI:   === STAGE 3: WORK ===
      Executing plan...
      [TDD cycle × 8 tasks → Commits → Quality gate]
      ✅ Implementation complete. Start review?

You: Yes, review

AI:   === STAGE 4: REVIEW ===
      Multi-perspective code review...
      [Result: APPROVE WITH NOTES — 0 P1, 2 P2, 3 P3]
      ✅ Review complete. Document knowledge?

You: Yes

AI:   === STAGE 5: COMPOUND ===
      Documenting solutions...
      [2 solution docs created]
      
      === 🚀 SHIPPED ===
      What was built: Shopping cart (add, update, remove, checkout)
      What was tested: 24 tests, all passing
      What was documented: 2 solutions in docs/solutions/
      Follow-up: Payment integration, inventory management
```

### 2.8 Workflow: Debug

**When to use:** Bug reports, test failures, errors, unexpected behavior.

**Command:** `/debug [problem description]`

**Process:**

```
1. Describe    → Clarify: expected vs actual behavior
2. Reproduce   → Find the exact steps to trigger the bug
3. Investigate → Phase 1: error messages, recent changes, isolate layer
4. Analyze     → Phase 2: environment, scale, timing patterns
5. Hypothesize → Phase 3: max 3 hypotheses, smallest test
6. Fix with TDD → Write failing test → fix root cause → verify
7. Verify      → Full test suite + linter
8. Commit      → fix(scope): description + root cause
9. Compound    → Offer to document the solution
```

#### 📌 Example Case: Debugging a Slow API

```
You: /debug API endpoint /api/orders response time is 10 seconds

AI: I'm using the systematic-debugging skill.

    === Step 2: Reproduce ===
    $ curl -w '%{time_total}' http://localhost:3000/api/orders
    → 10.2s consistently

    === Step 3: Investigate ===
    1. READ logs: No errors, but DB query time 9.8s
    2. RECENT CHANGES: "feat(orders): add customer details" (2 days ago)
    3. ISOLATE: Database layer — SQL log shows 201 queries!
    4. TRACE: orders.findAll() → loop → order.customer (LAZY LOAD!)

    === Step 4: Analyze ===
    → Classic N+1 query: 1 query for orders + 200 queries for customers

    === Step 5: Hypothesize ===
    "N+1 lazy loading on customer relation. Fix: eager loading."
    Evidence: SQL log shows 201 queries vs expected 1-2 queries.

    === Step 6: Fix with TDD ===
    🔴 RED: Test that getOrders only runs ≤ 2 queries
    🟢 GREEN: Add include: { customer: true } in Prisma query
    ✅ Response time: 10s → 80ms

    === Step 7: Verify ===
    ✅ Tests: 24/24 pass
    ✅ Linter: 0 errors
    ✅ API response: 80ms (was 10s)

    === Step 8: Commit ===
    fix(orders): resolve N+1 query on customer relation
    Root cause: Lazy loading on order.customer caused 201 queries

    === Step 9: Compound ===
    This was a non-trivial fix. Document with /compound?
```

### 2.9 Workflow: Reload

**When to use:** After editing rule files in `.agent/rules/` and you want to apply changes without starting a new chat.

**Command:** `/reload`

**Process:**

```
1. Re-read rules → Re-read all files in .agent/rules/
2. Confirm       → Report detected changes
3. Apply         → Rules take effect immediately in the same conversation
```

#### 📌 Example Case: Changing TDD Mode Mid-Conversation

```
# You edit .agent/rules/project-config.md:
# tdd_mode: "balanced" → tdd_mode: "relaxed"

You: /reload

AI: ✅ Rules reloaded. Changes detected in:
    • project-config.md — tdd_mode changed: "balanced" → "relaxed"
    
    All subsequent responses will use relaxed TDD mode.
```

#### When Is `/reload` Needed

| Situation | Need Reload? |
|-----------|--------------|
| Edit rules mid-conversation | ✅ Yes, `/reload` |
| Edit a skill | ❌ Not needed — skills are read on-demand |
| Edit a workflow | ❌ Not needed — workflows are read when triggered |
| Start a new chat | ❌ Not needed — rules are automatically read |

### 2.10 Workflow: Init

**When to use:** First time opening a project in this IDE, after cloning/importing from another IDE, or when AI outputs feel generic.

**Command:** `/init`

**Process:**

```
1. Read config      → Check which project-config.md fields are filled
2. Scan packages    → package.json, composer.json, requirements.txt, etc.
3. Scan configs     → tsconfig.json, docker-compose.yml, .env.example, etc.
4. Scan markers     → artisan, manage.py, next.config.js, etc.
5. Scan tree        → Directory structure (top 3 levels)
6. Sample files     → 2-3 files per category (controllers, models, routes)
7. Auto-fill config → Update empty fields in project-config.md
8. Generate map     → Create docs/codebase-map.md
9. Present          → Show results, ask for corrections
```

**Output:**
- Updated `project-config.md` with detected tech stack
- New `docs/codebase-map.md` with architecture, key files, conventions

#### 📌 Example Case: Importing a Project from Cursor

```
# You just opened a Laravel + React project that was built in Cursor.
# AI has no context about the existing codebase.

You: /init

AI: Running codebase initialization. Scanning project structure...

    📦 Packages detected:
    • composer.json → Laravel 11, PHP 8.2
    • package.json → React 18, TypeScript, Vite, Tailwind
    • requirements.txt → Python 3.11, Flask (agent service)

    🔧 Config files:
    • docker-compose.yml → PostgreSQL, Redis
    • .env.example → 32 environment variables

    📁 Architecture: Monorepo with 3 services
    • omnisocial-api/ → Laravel backend
    • omnisocial-fe/ → React frontend
    • omnisocial-agent/ → Python agent

    📝 project-config.md updated (diff):
    + project_name: "omnisocial"
    + project_type: "fullstack"
    + monorepo: true
    + frontend.framework: "react"
    + backend.framework: "laravel"
    + database.primary: "postgresql"

    📄 docs/codebase-map.md generated (42 key files mapped)

    Does this look correct? Any corrections needed?

You: Looks good!

# Now when you use /plan, AI will reference existing files
# and follow the project's established patterns.
```

#### When to Skip `/init`

| Situation | Skip? |
|-----------|-------|
| Brand new project (nothing to scan) | ✅ Skip |
| Config and codebase map already exist | ✅ Skip |
| Project imported from another IDE | ❌ Run `/init` |
| AI outputs feel generic/miss context | ❌ Run `/init` |

### 2.11 Workflow: Compatibility

**When to use:** Before major dependency upgrades, after cloning a project, periodic health checks, or before deployment.

**Command:** `/compatibility`

**Important:** This workflow is **strictly read-only**. It never modifies any files without your explicit approval.

**Process:**

```
1.  Read skill      → Load compatibility-check skill in Audit mode
2.  Announce         → "Running compatibility audit..."
3.  Read config      → Load project-config.md for declared stack
4.  Scan deps        → Read package.json, requirements.txt, go.mod, etc.
5.  Detect runtime   → Check .node-version, engines, Dockerfile, etc.
6.  Invoke skill     → Build dependency map, cross-reference combinations
7.  Web search       → Search for known incompatibilities, EOL, security
8.  Generate report  → Structured findings with severity levels
9.  Present summary  → Show report with actionable suggestions
10. ⛔ Ask approval   → "Apply any suggestions?" → NEVER modify without consent
```

**Severity Levels:**

| Level | Meaning | Example |
|-------|---------|---------|
| 🔴 Critical | Will break at runtime/build | Incompatible peer deps, missing runtime |
| 🟡 Warning | Risky or approaching EOL | Deprecated library, upcoming end of support |
| 🟢 Info | Suggestion, no immediate risk | Newer version available |

#### 📌 Example Case: Auditing a Next.js Project

```
You: /compatibility

AI: Running compatibility audit. Scanning project dependencies...

    📦 Dependencies scanned: 34 packages
    🔧 Runtime: Node 18.17.0
    
    # Compatibility Audit Report
    
    ## Summary
    - 🔴 Critical: 1
    - 🟡 Warning: 2
    - 🟢 Info: 3
    
    ## 🔴 Critical
    
    1. **react-router-dom v5.3.0 ↔ React 18**
       - Issue: v5 has known issues with React 18 concurrent mode
       - Impact: Unexpected re-renders, navigation bugs
       - Suggestion: Upgrade to react-router-dom v6.x
    
    ## 🟡 Warning
    
    2. **Node 18.17 approaching EOL** (April 2025)
       - Suggestion: Plan upgrade to Node 20 LTS
    
    3. **@types/react v17.0.80 mismatched with React 18**
       - Suggestion: Upgrade to @types/react v18.x
    
    ## 🟢 Info
    
    4-6. Newer stable versions available for 3 packages
    
    ⛔ No changes will be made without your approval.
    Which suggestions would you like me to apply? (list numbers, or "none")

You: Apply 1 and 3

AI: I'll create a plan for those changes before applying...
    [Creates upgrade plan → executes only approved items]
```

#### Automatic Pre-flight (During Planning)

The compatibility check also runs **automatically during `/plan`** when new dependencies are introduced:

```
You: /plan

AI: Creating implementation plan...

    ## Compatibility Check (Pre-flight)
    
    This plan introduces 2 new dependencies:
    
    | Dependency | Version | Status | Notes |
    |------------|---------|--------|-------|
    | better-auth | ^2.0   | 🟢 Compatible | Works with Next.js 14+ |
    | uploadthing | ^6.0   | 🔴 Conflict | Requires Node 20+, project uses 18 |
    
    ⚠️ Blocker found: uploadthing v6 needs Node 20+.
    Alternatives:
    - Use uploadthing v5.x (supports Node 18)
    - Upgrade Node to 20 LTS first
    
    How would you like to proceed?
```

#### When to Skip `/compatibility`

| Situation | Skip? |
|-----------|-------|
| Brand new project with no deps | ✅ Skip |
| Just ran audit, nothing changed | ✅ Skip |
| Before major upgrade | ❌ Run `/compatibility` |
| Unexplained build failures | ❌ Run `/compatibility` |

### 2.12 Workflow: UI/UX Pro Max

**When to use:** Building landing pages, dashboards, admin panels, UI components, or any frontend work.

**Command:** `/ui-ux-pro-max`

**What it does:** Uses a BM25 search engine over curated databases to generate complete design systems with style, color, typography, layout, and UX recommendations tailored to your product type and industry.

**Key stats:** 67 styles, 96 color palettes, 57 font pairings, 99 UX guidelines, 100 reasoning rules, 25 chart types across 13 technology stacks.

**Process:**

```
1.  Read skill       → Load ui-ux-pro-max skill
2.  Validate Python  → Ensure Python 3.x is available
3.  Analyze request  → Extract product type, style, industry, stack
4.  Generate design  → Run design system generator (--design-system)
5.  Persist (opt.)   → Save for cross-session reuse (--persist)
6.  Supplement       → Detailed searches for charts, icons, UX, fonts
7.  Architecture     → Verify file placement with architecture-enforcement
8.  Implement        → Build UI following the design system
9.  Pre-delivery     → Run quality checklist (icons, hover, a11y, layout)
10. Handoff          → Suggest /review or /compound
```

#### 📌 Example Case: Building a SaaS Dashboard

```
You: /ui-ux-pro-max Build an analytics dashboard for our fintech SaaS

AI: I'm using the ui-ux-pro-max skill to generate design intelligence.

    Analyzing requirements:
    • Product type: SaaS dashboard
    • Industry: Fintech
    • Style: Professional, data-driven
    • Stack: Next.js + Tailwind (from project-config)

    Generating design system...

    ┌─ Design System: Fintech Analytics Dashboard ────────┐
    │                                                   │
    │  Pattern  : Dashboard with sidebar navigation     │
    │  Style    : Corporate Modern with glassmorphism     │
    │  Colors   : Deep Navy + Electric Blue + Slate       │
    │  Typography: Inter (headings) + JetBrains Mono (data)│
    │  Effects  : Subtle shadows, glass cards, fade-in    │
    │                                                   │
    │  ⚠️ Anti-patterns to AVOID:                         │
    │  • NO emoji icons (use Lucide React)                │
    │  • NO scale hover effects (use opacity/color)       │
    │  • NO mixed container widths                        │
    └─────────────────────────────────────────────────┘

    Searching for fintech chart recommendations...
    → Trend charts for revenue, area charts for growth
    → Recommended library: Recharts for React

    Building the dashboard now...
```

#### Design System Persistence

The design system can be saved and reused across sessions:

```
design-system/
├── MASTER.md          ← Global source of truth
└── pages/
    ├── dashboard.md   ← Page-specific overrides
    └── checkout.md    ← Page-specific overrides
```

When building a specific page, the page file rules **override** the Master file.

#### When to Skip `/ui-ux-pro-max`

| Situation | Skip? |
|-----------|-------|
| Backend-only work, no UI | ✅ Skip |
| CLI tools or API-only services | ✅ Skip |
| Minor text or copy changes | ✅ Skip |
| Any frontend page or component | ❌ Run `/ui-ux-pro-max` |
| Redesigning existing UI | ❌ Run `/ui-ux-pro-max` |

### 2.13 Workflow: Security

**When to use:** Auditing your codebase for security vulnerabilities, before deployment, after auth changes, or on a regular security review schedule.

**Command:** `/security`

**What it does:** Runs a comprehensive, **read-only** security audit across your entire codebase. Orchestrates 5 specialized security skills: `security-audit`, `secure-code-patterns`, `threat-modeling`, `data-privacy`, and `secrets-management`.

**Process:**

```
1.  Load skill      → Read security-audit SKILL.md
2.  Read config     → Get stack, auth method, framework from project-config
3.  Scan secrets    → Hardcoded keys, tokens, .env in git (secrets-management)
4.  Check config    → Debug mode, security headers, CORS, CSRF
5.  OWASP Top 10    → Full checklist: A01-A10 (security-audit)
6.  Secure patterns → Input validation, crypto, JWT (secure-code-patterns)
7.  Auth review     → JWT/Session/OAuth2 implementation check
8.  Threat assess   → Quick STRIDE scan on trust boundaries (threat-modeling)
9.  Vuln scan       → npm audit / pip-audit / govulncheck per stack
10. Privacy check   → PII handling, consent, GDPR/UU PDP (data-privacy)
11. Generate report → Summary table + P1/P2/P3 findings + recommendations
12. Present         → Fix P1 now, schedule P2, suggest deeper analysis
```

#### 📌 Example Case: Pre-Deployment Security Audit

```
You: /security

AI: Running security audit. Scanning codebase for vulnerabilities...

    ┌─ Security Audit Report ─────────────────────────────┐
    │                                                      │
    │  Stack: Next.js + FastAPI (from project-config)      │
    │  Auth:  JWT with refresh tokens                      │
    │                                                      │
    │  ────────────────────────────────────────────────     │
    │  OWASP       : 8/10 passed                           │
    │  Secrets     : ✅ No hardcoded secrets found          │
    │  Dependencies: ⚠️ 2 moderate CVEs in node_modules     │
    │  Privacy     : ✅ GDPR consent mechanism present      │
    │  ────────────────────────────────────────────────     │
    │                                                      │
    │  P1 Critical:                                        │
    │  • A01 — Missing auth check on /api/admin/users      │
    │                                                      │
    │  P2 Important:                                       │
    │  • A07 — JWT access token expiry set to 24h (→ 15m)  │
    │  • A09 — Admin actions not logged with actor          │
    │                                                      │
    │  P3 Suggestion:                                      │
    │  • A06 — Update lodash 4.17.20 → 4.17.21 (CVE fix)  │
    └──────────────────────────────────────────────────────┘

    Recommendations:
    1. Fix P1 immediately — add auth middleware to admin routes
    2. Schedule P2 for this sprint
    3. Run /review after fixes are applied
```

#### Compliance Framework Mapping

The audit maps findings to major compliance frameworks:

| Security Control | ISO 27001:2022 | NIST CSF 2.0 | CIS v8 |
|-----------------|----------------|--------------|--------|
| Access Control | A.5.15, A.8.2 | PR.AC | Control 5-6 |
| Encryption | A.8.24 | PR.DS | Control 3 |
| Input Validation | A.8.28 | PR.DS | Control 16 |
| Logging & Monitoring | A.8.15-16 | DE.CM | Control 8 |
| Secrets Management | A.5.33 | PR.AC | Control 6.7 |

#### When to Skip `/security`

| Situation | Skip? |
|-----------|-------|
| Static landing page with no backend | ✅ Skip |
| Just ran audit, nothing changed | ✅ Skip |
| Before production deployment | ❌ Run `/security` |
| After implementing auth/payment features | ❌ Run `/security` |
| Quarterly security review | ❌ Run `/security` |

---

### 2.14 Workflow: Discuss, Research & PRD

These three workflows form the **pre-planning pipeline** — use them when requirements need clarification before creating an implementation plan.

| Workflow | When to Use | Output |
|----------|-------------|--------|
| `/discuss` | Gray areas, ambiguous requirements | Structured context gathered |
| `/research` | Need to investigate standard patterns, libraries, pitfalls | Research findings document |
| `/prd` | Need formal specification with user stories | `docs/prds/<feature>.md` |

#### 📌 Example Case: Using the PRD Workflow

```
You: /prd I want to add a multi-tenant billing system

AI: I'm using the prd-generator skill.

    Clarifying questions:

    1. What billing model?
       A. Per-seat pricing
       B. Usage-based pricing
       C. Flat subscription tiers
       D. Other: [please specify]

    2. Payment gateway?
       A. Stripe
       B. Midtrans
       C. PayPal
       D. Other: [please specify]

    3. Invoice generation needed?
       A. PDF invoices with branding
       B. Simple receipt emails
       C. Both
       D. None — handle externally

You: 1C, 2A, 3C

AI: Generating PRD...

    PRD saved to: docs/prds/multi-tenant-billing.md
    
    Includes:
    - 3 user stories with acceptance criteria
    - Non-goals (no crypto payments, no manual invoicing)
    - Technical constraints (Stripe API, webhook security)

    Next: /plan to create implementation plan from this PRD?
```

### 2.15 Workflow: Pause, Resume & Progress

These workflows manage **session continuity** across conversations.

| Workflow | When to Use | What Happens |
|----------|-------------|-------------|
| `/pause` | Stopping work, switching context | Saves state + progress log + optional archive |
| `/resume` | Returning to saved work | Loads `.continue-here.md`, routes to next action |
| `/progress` | Checking project status | Shows overview + what to do next |

#### 📌 Example Case: Pausing and Resuming Work

```
You: /pause

AI: Saving session state...

    ✅ Created .continue-here.md
    ✅ Appended to docs/progress.md:
       ## 2026-02-21 11:30 - Multi-tenant Billing
       - What was done: Completed DB schema + Stripe webhook handler
       - Files changed: schema.prisma, stripe-webhook.ts
       - Learnings: Stripe webhook signature verification required
    ✅ STATE.md updated

    Safe to close. Run /resume in next session to continue.

--- Next session ---

You: /resume

AI: Found .continue-here.md
    
    You were working on: Multi-tenant Billing (Task 3/8)
    Branch: feat/billing
    Remaining: 5 tasks (invoice generation, payment UI...)
    
    Continue with /work?
```

---

## Part 3: Advanced — Skills Deep Dive

### 3.1 Test-Driven Development (TDD)

Super Compound uses **Adaptive TDD** with 3 modes:

| Mode | Behavior | When |
|------|----------|------|
| **strict** | ALWAYS test first, no exceptions | Production features, critical bugfixes |
| **balanced** | Test-first for features, relaxed for prototyping | Default |
| **relaxed** | Tests encouraged but not enforced | Prototyping, throwaway code |

#### Iron Law (strict + balanced)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before a test? **Delete it. Start over.**

#### Red-Green-Refactor Cycle

```
🔴 RED     → Write ONE failing test (showing what should happen)
   Verify  → Run test, ensure it FAILS because the feature doesn't exist yet
🟢 GREEN   → Write MINIMAL code to make the test pass
   Verify  → Run test, ensure it PASSES
♻️ REFACTOR → Clean up code, remove duplication
   Verify  → Tests still green
🔄 REPEAT  → Next failing test for the next feature
```

#### 📌 Example Case: TDD for Email Validation Feature

```python
# 🔴 RED — Step 1: Write a failing test
# tests/test_validators.py
def test_rejects_empty_email():
    with pytest.raises(ValidationError):
        validate_email("")

def test_rejects_invalid_format():
    with pytest.raises(ValidationError):
        validate_email("not-an-email")

def test_accepts_valid_email():
    assert validate_email("user@example.com") == "user@example.com"
```

```bash
# Verify RED: Run the test
$ pytest tests/test_validators.py -v
FAILED test_rejects_empty_email — NameError: validate_email not defined
# ✅ Test failed because the function doesn't exist yet — this is what we want
```

```python
# 🟢 GREEN — Step 2: Write MINIMAL code
# app/validators.py
import re

class ValidationError(Exception):
    pass

def validate_email(email: str) -> str:
    if not email:
        raise ValidationError("Email cannot be empty")
    if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', email):
        raise ValidationError("Invalid email format")
    return email
```

```bash
# Verify GREEN: Run the test
$ pytest tests/test_validators.py -v
PASSED test_rejects_empty_email
PASSED test_rejects_invalid_format
PASSED test_accepts_valid_email
# ✅ All tests pass!
```

```python
# ♻️ REFACTOR — Step 3: Clean up (if needed)
# In this case the code is already clean, move on to the next feature
```

#### Balanced Mode — Allowed Exceptions

In balanced mode, these are allowed WITHOUT test-first:
- Configuration files (JSON, YAML, env)
- Static content (README, docs, comments)
- Throwaway prototypes (user explicitly says "prototype")
- Scaffolding/generated code

### 3.2 Systematic Debugging

Super Compound applies **4-phase debugging** that prohibits guessing:

```
Phase 1: Root Cause Investigation → MANDATORY before any fix
Phase 2: Pattern Analysis          → Analyze environment & data flow
Phase 3: Hypothesis and Testing    → Form & test hypotheses (max 3)
Phase 4: Implementation            → Write failing test → Fix → Verify
```

#### The Non-Negotiable Rule

```
DO NOT attempt a fix before completing Phase 1.
Skipping diagnosis causes cascading failures.
```

#### 📌 Example Case: Debugging an N+1 Query

**Situation:** API endpoint `/api/products` takes 5 seconds to respond.

```
Phase 1: Root Cause Investigation
─────────────────────────────────
1. READ error/logs:
   → No error, but response time 5000ms for 100 products

2. REPRODUCE:
   → Consistently 5s with 100 products, 500ms with 10 products

3. CHECK recent changes:
   → git log: "feat(products): add seller info to response" (2 days ago)

4. ISOLATE the layer:
   → Database query layer — SQL log shows 101 queries!

5. TRACE data flow:
   → Product.find_all() → loop → product.seller (LAZY LOAD per item!)

Phase 2: Pattern Analysis
─────────────────────────
→ Classic N+1 query: 1 query for products + N queries for sellers

Phase 3: Hypothesis
───────────────────
"Bug caused by lazy loading of the seller relation generating 
N+1 queries. Solution: eager loading/join."

Evidence: SQL log shows 101 separate queries.

Phase 4: Implementation
───────────────────────
🔴 RED: Test that get_products only runs ≤ 2 queries
🟢 GREEN: Add eager loading → Product.includes(:seller).all()
✅ Response time: 5000ms → 50ms
```

#### Red Flags — STOP!

| Thought | Reality |
|---------|---------|
| "Let me try a quick fix first" | Diagnose first. Quick fixes hide bugs |
| "I think I know the issue" | Prove it before fixing |
| "Can't reproduce, but let's fix it anyway" | Reproduce first, always |
| "The error message is misleading" | Read it again. It's usually correct |
| "I'll just add a try/catch" | Catching errors ≠ fixing errors |

### 3.3 Verification Before Completion

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

#### The Gate Function

```
BEFORE claiming any status:

1. IDENTIFY → What command proves this claim?
2. RUN      → Run the command COMPLETELY (fresh, complete)
3. READ     → Read full output, check exit code
4. VERIFY   → Does the output confirm the claim?
5. CLAIM    → Only then make the claim
```

#### Correct vs Incorrect Comparison

| Claim | ✅ Correct | ❌ Incorrect |
|-------|-----------|-------------|
| Tests pass | Run tests → see "34/34 pass" | "They should pass now" |
| Build success | Run build → see exit 0 | "Linter passed, so build should too" |
| Bug fixed | Test original symptom → PASS | "Code has been changed, must be fixed" |
| Linter clean | Run linter → 0 errors | "Partial check is enough" |

#### 📌 Example Case: Verification in Action

```
❌ INCORRECT:
AI: "I've added email validation. It should work correctly."
    → Using the word "should" = RED FLAG

✅ CORRECT:
AI: Running verification before claiming...

    $ pytest tests/test_validators.py -v
    tests/test_validators.py::test_rejects_empty_email PASSED
    tests/test_validators.py::test_rejects_invalid_format PASSED
    tests/test_validators.py::test_accepts_valid_email PASSED
    3 passed in 0.12s

    ✅ All 3 tests pass. Email validation works correctly.
```

### 3.4 Architecture Enforcement

Super Compound prevents spaghetti code through **universal rules** + **per-framework guides**.

#### Universal Anti-Spaghetti Rules

| Rule | Limit | Action If Violated |
|------|-------|--------------------|
| Max lines per file | 1000 | Split into modules |
| Max lines per function | 50 | Extract sub-functions |
| Max nesting depth | 3 levels | Guard clauses, early returns |
| Max function parameters | 4 | Use options object |
| Max module dependencies | 7 | Module too large → split |
| God class detection | 10+ public methods | Split by responsibility |

#### Dependency Direction

```
ALLOWED:
  presentation → application → domain
  infrastructure → application → domain

FORBIDDEN:
  domain → infrastructure  (business logic ≠ DB)
  domain → presentation    (business logic ≠ UI)
  application → presentation
```

Architecture violations = **P1 Critical** during code review!

#### 📌 Example Case: Architecture Check on FastAPI

**Correct structure (Clean Architecture):**

```
app/
├── domain/              ← Pure business rules (NO imports from outside)
│   ├── entities/
│   ├── repositories/    ← Abstract interfaces (ABC)
│   └── services/
├── application/         ← Use cases → only imports domain/
│   └── use_cases/
├── infrastructure/      ← Implementations (SQLAlchemy, external APIs)
│   └── database/
├── api/                 ← FastAPI routers → DOES NOT import infrastructure/
│   ├── routes/
│   └── schemas/
└── main.py
```

**❌ VIOLATION — P1 Critical:**

```python
# app/domain/services/user_service.py
from app.infrastructure.database.models import UserModel  # ❌ FORBIDDEN!
# domain/ must not import infrastructure/!
```

**✅ CORRECT — Dependency Injection:**

```python
# app/domain/services/user_service.py
from app.domain.repositories.user_repo import UserRepository  # ✅ ABC interface

class UserService:
    def __init__(self, repo: UserRepository):  # ✅ DI
        self.repo = repo
```

#### Enforcement Checklist

Before writing code, check:

- [ ] Is the file in the correct directory per the architecture guide?
- [ ] Do imports follow the correct dependency direction?
- [ ] Is the file under 1000 lines? Functions under 50?
- [ ] Nesting ≤ 3? No circular deps?
- [ ] Business logic in service/domain layer only?

### 3.5 Knowledge Compounding

Every non-trivial problem solved = **documentation for the future**.

#### When to Document

| Document ✅ | Skip ❌ |
|-------------|---------|
| Multiple investigation attempts were needed | Simple typo or syntax error |
| Root cause was not obvious | Fix was obviously correct right away |
| Future sessions will benefit | Trivial configuration |
| Pattern that could recur | Things that won't help the future |

#### Solution Categories

| Category | Folder | Examples |
|----------|--------|----------|
| Build errors | `build-errors/` | Compilation, bundling, dependencies |
| Test failures | `test-failures/` | Flaky tests, setup issues |
| Runtime errors | `runtime-errors/` | Crashes, exceptions |
| Performance | `performance-issues/` | Slow queries, memory leaks |
| Database | `database-issues/` | Migrations, schema, connections |
| Security | `security-issues/` | Vulnerabilities, auth, CORS |
| UI/Frontend | `ui-bugs/` | Layout, rendering |
| Integration | `integration-issues/` | API, third-party services |
| Logic errors | `logic-errors/` | Wrong behavior, calculations |
| Config | `config-issues/` | Environment, settings |

#### Pattern Detection

When 3+ similar issues are found in `docs/solutions/`, Super Compound will create a **pattern doc**:

```
docs/solutions/patterns/<pattern-name>.md
```

This helps identify systemic issues that need to be solved at the architectural level.

### 3.6 Code Review

Multi-perspective review with **6 dimensions** of quality checks:

| Perspective | What's Checked |
|-------------|----------------|
| ✅ Correctness | Logic, error handling, edge cases |
| 🏗️ Design | Patterns, SRP, YAGNI, DRY |
| 🔒 Security | Input validation, secrets, injection |
| ⚡ Performance | N+1, memory, complexity |
| 📖 Readability | Naming, comments, formatting |
| 🧪 Testing | Coverage, edge cases, reliability |

#### Red Flags to Watch For

| Red Flag | Why It's Dangerous |
|----------|--------------------|
| `catch` with empty body | Hides errors |
| Magic numbers/strings | Unreadable and error-prone |
| God functions (50+ lines) | Unmaintainable |
| God files (1000+ lines) | Must be split into modules |
| Deep nesting (4+ levels) | Refactor with guard clauses |
| Copy-paste code | DRY violation |
| `console.log` / `print` | Leftover debug artifacts |
| Business logic in controllers | Architecture violation = P1 |

### 3.7 Compatibility Check

The compatibility-check skill validates that libraries, frameworks, and runtime versions are compatible with each other.

#### Dual Mode Operation

| Mode | Trigger | Scope |
|------|---------|-------|
| **Pre-flight** | Automatic during `/plan` | New/changed deps only |
| **Audit** | On-demand via `/compatibility` | Full project scan |

#### What Gets Checked

| Category | Examples |
|----------|----------|
| **Library ↔ Library** | React 18 + React Router 5 (needs v6) |
| **Framework ↔ Runtime** | Next.js 14 needs Node 18+ |
| **Peer dependencies** | Package A requires React ^17 but project uses 18 |
| **Deprecated / EOL** | Node 16 EOL, unmaintained libraries |
| **Version range conflicts** | Two packages need conflicting versions of a shared dep |
| **Build tool compatibility** | Vite plugin requires Vite 5 but project uses Vite 4 |
| **Type system** | @types/[lib] version mismatched with lib version |

#### Safety Rule (Audit Mode)

```
AUDIT MODE IS READ-ONLY.
NEVER modify any file without explicit user approval.
Present findings and suggestions ONLY.
```

The audit always ends with an approval gate — you choose which suggestions to apply (or none).

#### Red Flags

| Thought | Reality |
|---------|---------|
| "These versions are probably fine" | Search for actual compatibility data |
| "The latest version should work" | Latest ≠ compatible. Check the combination |
| "Peer dep warnings are just warnings" | Peer dep mismatches cause subtle runtime bugs |
| "I can fix compatibility issues later" | Later = after test failures + wasted time |

### 3.8 UI/UX Pro Max

The ui-ux-pro-max skill provides AI-powered design intelligence for building professional frontend UI.

#### How It Works

Uses a **BM25 search engine** over curated databases to match your project's product type, industry, and style to the best design recommendations:

| Database | Entries | Covers |
|----------|---------|--------|
| Styles | 67 | Glassmorphism, minimalism, dark mode, brutalism, etc. |
| Color palettes | 96 | Curated by product type and industry |
| Font pairings | 57 | Google Fonts combinations for any tone |
| UX guidelines | 99 | Anti-patterns, best practices, accessibility |
| Reasoning rules | 100 | Logic for matching style to product type |
| Chart types | 25 | By data type: trend, comparison, funnel, etc. |
| Tech stacks | 13 | React, Next.js, Vue, Svelte, Flutter, SwiftUI, etc. |

#### Key Phases

```
1. Analyze   → Product type, industry, style keywords, stack
2. Generate  → Complete design system (colors, fonts, effects, layout)
3. Persist   → Save MASTER.md + page overrides for cross-session use
4. Search    → Detailed lookups: charts, icons, UX, typography
5. Implement → Build with stack-specific guidelines
6. Checklist → Visual quality, interaction, a11y, responsive
```

#### Common Rules for Professional UI

| Category | Do | Don't |
|----------|----|-------|
| **Icons** | SVG icons (Heroicons, Lucide) | Emojis as UI icons |
| **Hover** | Color/opacity transitions | Scale transforms that shift layout |
| **Cursor** | `cursor-pointer` on clickable | Default cursor on buttons |
| **Light mode** | `bg-white/80+` for glass cards | `bg-white/10` (invisible) |
| **Typography** | Google Fonts (Inter, Outfit) | Browser default fonts |
| **Layout** | Floating navbar with spacing | Navbar stuck to edges |

#### Pre-Delivery Checklist

- [ ] No emojis used as icons
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states don't cause layout shift
- [ ] Light/dark mode contrast verified
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] All images have alt text
- [ ] `prefers-reduced-motion` respected

#### Red Flags

| Thought | Reality |
|---------|---------|
| "I'll just pick colors myself" | Use the design system. It has 96 curated palettes |
| "Skip the design system for simple UI" | Even simple UI benefits from consistent style |
| "Tailwind is always the answer" | Check project-config first. Respect the project's choice |
| "I know what looks good" | Search the database. Data beats intuition |

### 3.9 Security-by-Design

Super Compound provides a comprehensive security framework through 5 specialized skills that work together to cover the full security lifecycle.

#### 3.9.1 Security Audit

The `security-audit` skill is the primary entry point for security assessment. Used automatically during code review and planning for auth/data features, or on-demand via `/security`.

**Key capabilities:**

- **OWASP Top 10 coverage** — Full A01-A10 checklist with per-category pass/partial/fail
- **Per-framework patterns** — JWT security, CSRF handling, security headers per stack
- **Dependency scanning** — `npm audit`, `pip-audit`, `govulncheck`, `bundle-audit`
- **Compliance mapping** — Maps controls to ISO 27001:2022, NIST CSF 2.0, CIS v8
- **Exit criteria** — No P1 open, all P2 have mitigation plan, secrets scan clean

**Security checklists include:**
- Authentication (password hashing, MFA, rate limiting)
- Authorization (RBAC/ABAC, no IDOR, middleware enforcement)
- Secrets (no hardcoded credentials, `.env` in `.gitignore`)
- Rate limiting (API, password reset, file upload)
- File upload (MIME + extension + magic bytes validation)
- Logging & monitoring (audit trail, no PII in logs)
- Dependency security (CVE scanning, lock files committed)

#### 3.9.2 Secure Code Patterns

The `secure-code-patterns` skill provides concrete implementation guidance for secure coding.

**Core principles:**

| Area | Key Rule |
|------|----------|
| Input validation | Allowlist over blocklist. Server-side is for security, client-side is for UX |
| Output encoding | Context-specific: HTML, URL, CSS, JSON, SQL each need different encoding |
| Cryptography | AES-256-GCM for symmetric, Argon2id/bcrypt for passwords, never MD5/SHA1 |
| Key management | Never hardcode. Load from vault/env. Rotate every 90 days |
| Random values | Always `crypto/rand`, never `Math.random()` for tokens/keys |

**Encryption checklist:**
- At rest: Sensitive fields encrypted, keys separate from data, database connections use TLS
- In transit: TLS 1.2+ enforced, HSTS configured, certificate pinning for mobile

#### 3.9.3 Threat Modeling

The `threat-modeling` skill identifies threats **before** building features using the STRIDE framework.

**STRIDE categories:**

| Category | Question |
|----------|----------|
| **S**poofing | Can an attacker impersonate a user? |
| **T**ampering | Can data be modified in transit or at rest? |
| **R**epudiation | Can actions be denied without audit trail? |
| **I**nformation Disclosure | Can sensitive data leak? |
| **D**enial of Service | Can the system be overwhelmed? |
| **E**levation of Privilege | Can a user gain unauthorized access? |

**Also provides:**
- Attack tree construction (AND/OR goals with mitigation status)
- Trust boundary analysis (browser → API → database → external services)
- Threat model document template saved to `docs/security/`

#### 3.9.4 Data Privacy

The `data-privacy` skill ensures compliance with privacy regulations and privacy-by-design principles.

**Covers:**
- **GDPR** (EU) — Consent, data subject rights, breach notification (72h)
- **UU PDP** (Indonesia) — Pasal 16 principles, breach notification (3×24h)
- **Privacy-by-Design** — 7 foundational principles (proactive, default, embedded, full lifecycle, visibility, respect)

**Implementation patterns:**
- PII classification (direct identifiers → encrypt + access control)
- Granular consent management (per-purpose, not bundled)
- Data retention policies with automated enforcement
- Anonymization techniques (pseudonymization, generalization, suppression)
- Data subject request handling (verify → log → acknowledge → process → respond)

#### 3.9.5 Secrets Management

The `secrets-management` skill enforces zero hardcoded secrets across the codebase.

**5 rules:**

1. **Zero hardcoded secrets** — Passwords, API keys, tokens, private keys forbidden in Git
2. **Environment variables only** — `process.env`, `os.environ`, vault services
3. **`.env.example`** — Template with placeholder values (never real secrets)
4. **Per-environment isolation** — Dev, staging, production each use unique secrets
5. **Rotate regularly** — Every 90 days or immediately on compromise

**Secret scanning tools:**
- `detect-secrets` (pre-commit hook)
- `gitleaks` (CI/CD integration)
- `trufflehog` (Git history scanning)

**Incident response:** Rotate → Revoke → Deploy → Verify → Audit (within 1 hour of detection)

#### Security Red Flags

| Thought | Reality |
|---------|---------|
| "It's an internal API, nobody will attack it" | 60% of breaches involve insider threats or lateral movement |
| "We'll add security later" | Technical debt grows exponentially. Build it in from the start |
| "It's just a development key" | Development keys become production keys. Treat all secrets equally |
| "The framework handles security" | Frameworks provide tools, not guarantees. Verify configuration |
| "This repo is private" | Private repos get cloned, forked, and shared. Secrets spread |

---

### 3.10 PRD Generator & Structured Tasks

Two complementary skills for project specification and tracking:

#### 3.10.1 PRD Generator

The `prd-generator` skill creates structured Product Requirements Documents with:

- **Lettered clarifying questions** (A/B/C/D) for fast user responses
- **User stories** with acceptance criteria (`US-001`, `US-002`...)
- **Story sizing** — Small (1-2h), Medium (2-4h), Large (4-8h), X-Large (needs splitting)
- **Non-goals** and **technical constraints**

**PRD bridge:** Brainstorm (WHAT) → **PRD (SPEC)** → Plan (HOW)

#### 3.10.2 Structured Tasks

The `structured-tasks` skill generates machine-parseable `tasks.json` from plans:

```json
{
  "tasks": [
    {
      "id": "T-001",
      "title": "Create User model",
      "description": "Add User schema with auth fields",
      "status": "done",
      "priority": 1
    },
    {
      "id": "T-002",
      "title": "Auth service tests",
      "description": "Write failing tests for register/login",
      "status": "in-progress",
      "priority": 2,
      "depends_on": ["T-001"]
    }
  ]
}
```

This is **optional** — supplements Markdown plans for projects needing automated progress tracking.

### 3.11 State & Session Management

Multiple skills work together to maintain continuity across sessions:

| Skill | Purpose | Key File |
|-------|---------|----------|
| `state-management` | Track project state | `docs/STATE.md` |
| `knowledge-compounding` | Accumulate learnings | `docs/progress.md` |
| `checkpoint-protocol` | Human-in-the-loop gates | In-conversation |
| `todo-management` | Capture deferred ideas | `docs/TODOS.md` |

#### Session Progress Log

The append-only `docs/progress.md` is your project's **long-term memory**:

```markdown
## Codebase Patterns
<!-- Consolidated reusable patterns — kept at the TOP -->
- Always use Zod for runtime validation in API routes
- JWT refresh via axios interceptor, not page lifecycle

---

## 2026-02-21 11:30 - Billing Feature
- **What was done:** Stripe webhook handler + invoice PDF generation
- **Files changed:** stripe-webhook.ts, invoice-service.ts
- **Learnings:**
  - Stripe webhook signature must use raw body, not parsed JSON
  - PDF generation needs headless Chrome for complex layouts
```

Codebase Patterns at the top consolidate reusable insights discovered across sessions.

---

## Part 4: Real-World Case Studies

### Case 1: Building a REST API with FastAPI

**Scenario:** You want to build an inventory management API for a store.

#### Step 1: Setup Super Compound

```bash
# Clone Super Compound (if you haven't already)
git clone https://github.com/aultramen/super-compound.git

# Copy to your project
cp -r /path/to/super-compound/.agent ./.agent

# Edit config: use Preset 4 (FastAPI)
# .agent/rules/project-config.md → paste FastAPI preset
```

#### Step 2: Brainstorm

```
You: /brainstorm Inventory API for tracking product stock, 
      suppliers, and purchase orders

AI will:
1. Ask about scope one at a time (CRUD only? Reporting? Alerts?)
2. Present 2-3 architectural approaches
3. Save decisions to docs/brainstorms/
```

#### Step 3: Plan

```
You: /plan

AI will:
1. Read brainstorm document
2. Research: check docs/solutions/ for past learnings
3. Ask depth level (Quick/Standard/Comprehensive)
4. Create plan with tasks:
   - Task 1: Setup project structure (Clean Architecture)
   - Task 2: Create Product entity + repository interface
   - Task 3: Create Product CRUD use cases (test-first)
   - Task 4: Create FastAPI routes + schemas
   - Task 5: Implement SQLAlchemy repository
   - Task 6: Add Supplier entity + relations
   - Task 7: Integration tests
5. Save to docs/plans/
```

#### Step 4: Work

```
You: /work

AI will:
1. git checkout -b feat/inventory-api
2. Execute each task with TDD:
   🔴 Write failing test
   🟢 Minimal implementation
   ♻️ Refactor
   ✅ Commit
3. Checkpoint every 3 tasks
4. Quality gate: pytest + ruff + mypy
5. Push branch
```

#### Step 5: Review + Compound

```
You: /review → fix P2 issues → /compound
```

**End result:**
- ✅ Clean Architecture FastAPI app
- ✅ Full test coverage
- ✅ API docs via Swagger
- ✅ Documented solutions for future reference

---

### Case 2: Debugging a Production Bug

**Scenario:** A user reports *"Data sometimes appears twice in the dashboard."*

#### Step 1: Systematic Debugging Skill Activated

```
AI: I'm using the systematic-debugging skill.

    Phase 1: Root Cause Investigation
    ═══════════════════════════════════

    1. READ error messages:
       → No errors in console or server logs

    2. REPRODUCE:
       → Reproducible: rapidly refresh the page 
         while data is loading → data appears doubled

    3. CHECK recent changes:
       $ git log --oneline -10
       → 3 days ago: "feat(dashboard): add real-time data refresh"

    4. ISOLATE the layer:
       → Frontend layer — API response data is correct (not duplicated)
       → Data becomes duplicated in React state

    5. TRACE data flow:
       → useEffect fetch data → setState append 
       → useEffect re-runs → fetch again → append again!
       → ROOT CAUSE: Missing cleanup in useEffect!
```

#### Step 2: Fix with TDD

```
    Phase 4: Implementation
    ═══════════════════════

    🔴 RED: Test that component doesn't show duplicate data
            when re-mounted
    🟢 GREEN: Add cleanup function + replace instead of append
    ♻️ REFACTOR: Extract data fetching to custom hook
    ✅ VERIFIED: Test passes, manual verify — no duplicates
```

#### Step 3: Knowledge Compounding

```
    ✓ Solution documented:
    docs/solutions/ui-bugs/duplicate-data-useeffect-20260210.md

    Tags: [react, useEffect, race-condition, state-management]
    Prevention: Always add cleanup function in useEffect 
                that fetches data. Use AbortController.
```

---

### Case 3: Full-Stack Feature with Next.js (Launch Pipeline)

**Scenario:** You want to add a comment feature to an existing Next.js blog.

```
You: /launch Add a comment feature to every blog post. 
      Users can create, edit, and delete their own comments.
```

#### Stage 1: Brainstorm

```
AI: Question 1: Do comments need to be nested/threaded (reply to reply)?
You: No, flat comments only.

AI: Question 2: Do comments need moderation before being shown?
You: No, they appear immediately.

AI: Question 3: Do you need like/dislike on comments?
You: Not for now. YAGNI.

AI: Approach A (Recommended): Server Actions + Prisma
    + Type-safe, simple, no API routes needed
    + Matches the existing Next.js App Router architecture

    Approach B: API Routes + fetch
    + Familiar pattern
    - More boilerplate

    ✅ Choosing Approach A
    📄 Saved: docs/brainstorms/2026-02-10-blog-comments.md
```

#### Stage 2: Plan (Standard Depth)

```
AI: 8 tasks, estimated 30 min total:

    Task 1: Add Comment model to Prisma schema
    Task 2: Write comment service tests (create, edit, delete)
    Task 3: Implement comment service (lib/services/comments.ts)
    Task 4: Write server action tests
    Task 5: Create server actions (lib/actions/comments.ts)
    Task 6: Create CommentList + CommentForm components
    Task 7: Integrate into blog post page
    Task 8: E2E flow verification

    📄 Saved: docs/plans/2026-02-10-blog-comments-plan.md
```

#### Stage 3: Work (TDD Execution)

```
AI: 🌿 Branch: feat/blog-comments

    Task 1: ✅ Comment model added, migration applied
    Task 2: 🔴→🟢 3 service tests written and passing
    Task 3: ✅ Comment service implemented
    --- Checkpoint 1/3: All good ---
    Task 4: 🔴→🟢 Server action tests passing  
    Task 5: ✅ Server actions implemented
    Task 6: ✅ Components created following existing patterns
    --- Checkpoint 2/3: Looking good ---
    Task 7: ✅ Integrated into [slug]/page.tsx
    Task 8: ✅ E2E flow verified manually

    === Quality Gate ===
    ✅ vitest: 18/18 pass
    ✅ eslint: 0 errors
    ✅ tsc: 0 errors
    ✅ Architecture: all files in correct dirs,
       dependency direction respected
```

#### Stage 4: Review

```
AI: Verdict: APPROVE ✅

    Strengths:
    - Follows existing codebase patterns perfectly
    - Clean TDD, all features tested
    - Server Actions properly validated with Zod

    🟢 P3 Suggestions:
    1. Consider optimistic updates for better UX (future)
    2. Add aria-labels for accessibility
```

#### Stage 5: Compound

```
AI: No non-trivial problems encountered during this implementation.
    Skipping knowledge compounding (all straightforward).

    === 🚀 SHIPPED ===
    Branch: feat/blog-comments
    Files: 8 changed (+342, -4)
    Tests: 18 new tests, all passing
    Follow-up: Optimistic updates, accessibility improvements
```

---

## Part 5: Tips & Best Practices

### 💡 Tips for Beginners

1. **Start with a preset** — Don't configure manually at first, use a preset that fits
2. **Use `/brainstorm` for new ideas** — Don't jump straight into coding, explore first
3. **Trust the TDD process** — Feels slow at first, but saves debugging time later
4. **Let the AI verify** — Don't skip the verification gate

### 🔧 Tips for Intermediate Users

1. **Choose the right depth level** — Quick for small fixes, Standard for features, Comprehensive for architecture
2. **Leverage `docs/solutions/`** — The more knowledge accumulates, the faster development gets
3. **Review before merging** — `/review` catches bugs before they reach production
4. **Use batch checkpoints** — During `/work`, use checkpoints every 3 tasks to provide feedback

### 🚀 Tips for Advanced Users

1. **Use `/launch` for large features** — Full pipeline ensures end-to-end quality
2. **Swarm mode for independent tasks** — 5+ tasks that don't depend on each other can be parallelized
3. **Pattern detection in knowledge** — If you see 3+ similar solutions, ask the AI to create a pattern doc
4. **Custom presets** — Modify presets to match your team's exact stack and conventions
5. **Architecture enforcement** — Make the architecture checker the first step before writing any code

### ⚠️ Pitfalls to Avoid

| Pitfall | Solution |
|---------|----------|
| Skip brainstorm, jump straight to coding | Always brainstorm/plan first for new features |
| Writing tests after code | TDD: test first, code later |
| Claiming "it's fixed" without verification | Run verification commands, THEN claim |
| Ignoring P1 findings from review | P1 = MUST fix. No exceptions |
| Not documenting solutions | A 5-minute investment now saves hours later |
| Business logic in controller/route | Move to service/domain layer |
| Forgetting cleanup after debugging | Remove `console.log`, temporary fixes, debug flags |

### 🔄 Git Workflow Quick Reference

| Mode | Command | Best For |
|------|---------|----------|
| **Branch** (default) | `git checkout -b feat/<name>` | Single developer, most cases |
| **Worktree** | `git worktree add ../<dir> -b feat/<name>` | Parallel development, swarm mode |
| **No-Git** | Skip git completely | Prototyping, throwaway code |

**Commit Convention:**

```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, perf, ci

Examples:
  feat(auth): add JWT refresh token logic
  fix(cart): resolve duplicate item count
  test(user): add edge cases for email validation
  docs(api): update endpoint documentation
```

---

## Closing

Super Compound is not just a tool — it's a **development discipline** that makes every unit of work strengthen the next. The more you use it, the more knowledge accumulates in `docs/solutions/`, and the faster your development becomes over time.

> **"Discipline compounds. Each unit of work makes the next one easier."**

Happy using Super Compound! ⚛️
