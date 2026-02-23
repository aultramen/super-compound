# Super Compound — AI Development Framework

> **"Discipline compounds. Each unit of work makes the next one easier."**

Super Compound combines systematic engineering discipline with compounding knowledge intelligence for Antigravity IDE and Claude.

---

## 1. Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Discipline Compounds** | Rigorous process today saves exponential time tomorrow |
| **Evidence Before Claims** | Never claim completion without fresh verification output |
| **Test-First by Default** | Write failing test → minimal code → refactor |
| **YAGNI + DRY** | Build only what's needed, never duplicate |
| **Knowledge Compounds** | Every solved problem becomes searchable team knowledge |
| **Plan Before Code** | Brainstorm → Plan → Execute. Don't jump to implementation |

---

## 2. Skill Invocation Rules

**Skills are MANDATORY, not suggestions.**

Before responding to ANY user message:

1. **CHECK** — Could any skill apply? Even 1% chance = invoke it
2. **INVOKE** — Read the skill's `SKILL.md` file
3. **ANNOUNCE** — "I'm using the [skill-name] skill to [purpose]."
4. **FOLLOW** — Execute the skill exactly as documented

### Skill Priority Order

1. **Process skills first** (brainstorming, systematic-debugging) — determine HOW to approach
2. **Quality skills second** (test-driven-development, verification-before-completion) — ensure quality
3. **Knowledge skills third** (knowledge-compounding) — capture learnings

---

## 3. Workflow Pipeline

```
                    ┌─── Pause ──→ .continue-here.md ──→ Status (resume) ───┐
                    │                                                       │
Explore → Research → PRD → Plan → Eval → Work → Review → Compound
   ↑                                                       ↓
   └────────────────── Knowledge feeds back ───────────────┘
```

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `explore.md` | Rough idea, unclear direction, or gray areas to resolve | Brainstorm + discuss in one (`/explore`, `/explore brainstorm`, `/explore discuss`) |
| `research.md` | Need domain research before planning | Investigate standard stack, patterns, pitfalls |
| `prd.md` | Need formal specification before planning | Generate structured PRD with stories |
| `plan.md` | Clear requirements, approved design | Define HOW to build it (with auto-verification) |
| `eval.md` | Before implementing — define criteria; after — measure pass@k | Eval-Driven Development (EDD) |
| `work.md` | Approved plan | Execute the plan |
| `debug.md` | Bug, error, test failure, unexpected behavior | Diagnose → fix → verify |
| `review.md` | Completed implementation | Multi-perspective quality review |
| `compound.md` | Problem solved, issue fixed | Document knowledge for future |
| `launch.md` | Want full autonomous pipeline | Run all stages sequentially |
| `pause.md` | Pausing work mid-session | Save state to `.continue-here.md` |
| `status.md` | Start of session, check status, or resume after `/pause` | Dashboard + smart routing (`/status`, `/resume`, `/progress`) |
| `audit.md` | Security or dependency health check | OWASP + compat audit (`/audit`, `/audit security`, `/audit compat`) |
| `init.md` | New/imported project; or reload rules mid-conversation | Scan codebase + auto-fill config; `/init reload` replaces `/reload` |
| `ui-ux-pro-max.md` | Any frontend/UI work | Generate design system, implement professional UI |

---

## 4. Git Workflow

### Mode: Branch (Default)

```bash
git checkout -b feat/<feature-name>
git add <files>
git commit -m "feat(scope): description"
```

### Mode: Worktree (Parallel Development)

```bash
git worktree add ../project-feat-name -b feat/<feature-name>
```

### Mode: No Git (Prototyping)

No commits, no branches — TDD relaxed automatically.

### Commit Convention

Format: `<type>(<scope>): <description>`
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

---

## 5. Adaptive Behavior

### Context Detection

| Signal | Behavior |
|--------|----------|
| "prototype", "mockup", "quick test" | No-Git mode, relaxed TDD |
| "feature", "implement", "build" | Branch mode, balanced TDD |
| "parallel", "swarm", "multiple agents" | Worktree mode, ask for confirmation |
| "debug", "fix", "broken" | Systematic debugging skill |
| "plan", "design", "architecture" | Brainstorming → Planning pipeline |
| "landing page", "UI", "frontend", "dashboard", "component" | UI/UX Pro Max skill, design system first |
| "security", "vulnerability", "audit", "OWASP", "pentest" | Security audit skill |
| "continue", "resume", "where was I" | Status workflow (auto-resumes from `.continue-here.md`) |
| "pause", "stop", "save progress" | Pause workflow, create handoff |
| "status", "progress", "what's next" | Status workflow, show dashboard |
| "PRD", "requirements", "specification", "user stories" | PRD workflow, generate structured PRD |
| "tasks.json", "structured tasks", "machine-readable" | writing-plans skill (Optional tasks.json section) |
| "explore", "brainstorm", "discuss", "gray areas" | Explore workflow (auto-detect mode) |
| "audit", "health check", "dependency check" | Audit workflow (`/audit`, `/audit security`, `/audit compat`) |

### Execution Mode

- **Default:** Sequential, solo developer, simple branching
- **Swarm (on request):** Ask before enabling, git worktrees, coordinated task queue

---

## 6. Skills Reference

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before any creative work |
| `writing-plans` | When you need an implementation plan (includes optional tasks.json format) |
| `executing-plans` | When you have a plan to execute |
| `test-driven-development` | When implementing any feature or bugfix |
| `systematic-debugging` | When encountering any bug or unexpected behavior |
| `verification-before-completion` | Before claiming work is complete — includes goal-backward verification and cross-component wiring checks |
| `knowledge-compounding` | After solving a non-trivial problem |
| `code-review` | When reviewing code changes |
| `architecture-enforcement` | Before writing code — verify correct folder and imports |
| `compatibility-check` | Before introducing new deps or auditing existing stack |
| `ui-ux-pro-max` | When building any frontend UI — pages, dashboards, landing pages |
| `security-audit` | When auditing code for security, reviewing auth, handling secrets, checking OWASP compliance |
| `secure-code-patterns` | When implementing input validation, cryptography, or secure data handling |
| `threat-modeling` | Before designing features with sensitive data, auth, or external integrations |
| `data-privacy` | When processing PII, implementing consent, or handling data subject requests |
| `state-management` | When starting/ending sessions, making decisions, tracking work progress |
| `checkpoint-protocol` | When human input, decision, or action is required before proceeding |
| `plan-verification` | After creating a plan — validates 8 dimensions before execution |
| `gap-closure` | When verification finds gaps — creates targeted fix plans |
| `todo-management` | When ideas/tasks surface during work — capture and track |
| `context-engineering` | When managing AI context budget — selective loading, history digest |
| `prd-generator` | When planning a feature — generate structured PRD with user stories |
| `eval-harness` | Before/after implementing features — define pass/fail criteria, measure with pass@k |
