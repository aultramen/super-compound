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

> All enforcement red flags and gate checklists live in `.agent/rules/quality-gates.md`.

---

## 3. Workflow Pipeline

```
                    ┌─── Pause ──→ .continue-here.md ──→ Status (resume) ───┐
                    │                                                    │
Explore → Research → PRD → Plan → Eval → Work → Review → Compound
   ↑                                                          ↓
   └───────────────── Knowledge feeds back ────────────────────┘
```

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `explore.md` | Rough idea, unclear direction, gray areas to resolve | Brainstorm ideas + resolve decisions (replaces `/brainstorm` & `/discuss`) |
| `research.md` | Need domain research before planning | Investigate standard stack, patterns, pitfalls |
| `prd.md` | Need formal specification before planning | Generate structured PRD with stories |
| `plan.md` | Clear requirements, approved design | Define HOW to build it (with auto-verification) |
| `eval.md` | Before implementing — define pass/fail criteria; after — measure pass@k | Eval-Driven Development (EDD) |
| `work.md` | Approved plan | Execute the plan |
| `debug.md` | Bug, error, test failure, unexpected behavior | Diagnose → fix → verify |
| `review.md` | Completed implementation | Multi-perspective quality review |
| `compound.md` | Problem solved, issue fixed | Document knowledge for future |
| `launch.md` | Want full autonomous pipeline | Run all stages sequentially |
| `pause.md` | Session handoff, save progress | Archive state + progress log |
| `status.md` | Start of session, check status, or resume after `/pause` | Dashboard + smart routing (replaces `/progress` & `/resume`) |
| `audit.md` | Security audit, dependency health check, pre-deploy review | OWASP + compat audit (replaces `/security` & `/compatibility`) |
| `init.md` | New/imported project; or `/init reload` to re-apply rules | Scan codebase, auto-fill config (absorbs `/reload`) |
| `ui-ux-pro-max.md` | Any frontend/UI work | Generate design system, implement professional UI |

**Aliases still work:** `/brainstorm` → explore, `/discuss` → explore, `/progress` → status, `/resume` → status, `/security` → audit, `/compatibility` → audit, `/reload` → init reload

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
| "PRD", "requirements", "specification", "user stories" | PRD workflow, generate structured PRD |
| "continue", "resume", "where was I" | Resume workflow, load state |
| "pause", "stop", "save progress" | Pause workflow, create handoff |
| "status", "progress", "what's next" | Progress workflow, show state |
| "tasks.json", "structured tasks", "machine-readable" | writing-plans skill (Optional tasks.json section) |
| "eval", "pass@k", "reliability", "success criteria" | Eval harness skill, define/run evals |
| "build error", "build failing", "dependency conflict" | **Read** `.agent/agents/build-fixer.md` → follow its diagnostic process |
| "e2e test", "end-to-end", "Playwright" | **Read** `.agent/agents/e2e-runner.md` → follow its Page Object Model pattern |
| "architecture decision", "ADR", "system design" | **Read** `.agent/agents/architect.md` → follow its ADR format |
| "review my code", "code review" | **Read** `.agent/agents/code-reviewer.md` → apply P1/P2/P3 review process |
| "docs are outdated", "update documentation" | **Read** `.agent/agents/doc-updater.md` → follow its drift detection process |

### Execution Mode

- **Default:** Sequential, solo developer, simple branching
- **Swarm (on request):** Ask before enabling, git worktrees, coordinated task queue

---

## 6. Skills Reference

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before any creative work — lettered Q&A for fast exploration |
| `writing-plans` | When you need an implementation plan (includes optional tasks.json format) |
| `executing-plans` | When you have a plan to execute |
| `prd-generator` | When planning a feature — generate structured PRD with user stories |
| `eval-harness` | Before implementing — define evals; after — run pass@k reliability checks |
| `test-driven-development` | When implementing any feature or bugfix |
| `systematic-debugging` | When encountering any bug or unexpected behavior |
| `verification-before-completion` | Before claiming work is complete — includes goal-backward verification and cross-component wiring checks |
| `knowledge-compounding` | After solving a non-trivial problem — + session progress log |
| `code-review` | When reviewing code changes |
| `architecture-enforcement` | Before writing code — verify correct folder and imports |
| `compatibility-check` | Before introducing new deps or auditing existing stack |
| `ui-ux-pro-max` | When building any frontend UI — pages, dashboards, landing pages |
| `state-management` | Track project state persistently across sessions |
| `checkpoint-protocol` | When human input or decision is required before proceeding |
| `plan-verification` | After creating a plan — validates 8 dimensions before execution |
| `gap-closure` | When verification finds gaps — targeted fix plans |
| `todo-management` | When ideas/tasks surface during work — capture without losing focus |
| `context-engineering` | When managing AI context budget — selective loading, history digest |
| `security-audit` | When auditing code for security, reviewing auth, handling secrets, checking OWASP compliance |
| `secure-code-patterns` | When implementing input validation, cryptography, or secure data handling |
| `threat-modeling` | Before designing features with sensitive data, auth, or external integrations |
| `data-privacy` | When processing PII, implementing consent, or handling data subject requests |

---

## 7. Agents

Dedicated agent files in `.agent/agents/`. **Compatibility varies by IDE:**

| Agent | Model | Purpose |
|-------|-------|----------|
| `architect` | opus | System design, ADRs, trade-off analysis |
| `code-reviewer` | sonnet | P1/P2/P3 severity review with confidence filter |
| `e2e-runner` | sonnet | Playwright E2E tests with Page Object Model |
| `doc-updater` | sonnet | Detect and fix documentation drift |
| `build-fixer` | sonnet | Systematic build error diagnosis |

### Antigravity IDE — Manual Invocation

Agents are **not automatically isolated** in Antigravity. Invoke them explicitly:

| Say this | What happens |
|----------|-------------|
| "Use the architect agent" | AI reads `.agent/agents/architect.md` as context |
| "Run the code-reviewer agent" | AI reads `.agent/agents/code-reviewer.md` |
| "Use build-fixer to diagnose this" | AI reads `.agent/agents/build-fixer.md` |

> **Tip:** Agents in Antigravity behave like skills — the AI reads the agent file and follows its instructions within the current context window.

### Claude Code — Native Subagents

Place agent files in `.claude/agents/` for Claude Code project scope, or `~/.claude/agents/` for global scope. Claude Code will run them as isolated subagents with the declared `model`.

```bash
# Claude Code: copy agents to project scope
mkdir -p .claude/agents
copy .agent\agents\* .claude\agents\
```

---

## 8. Hook System

Event-driven automation scripts in `.agent/hooks/`. **Claude Code only — not supported in Antigravity IDE.**

| Hook | Script | Trigger |
|------|--------|---------|
| `PreToolUse (Edit/Write)` | `suggest-compact.js` | Suggests `/pause` after N tool calls |
| `PreCompact` | `pre-compact.js` | Saves STATE.md snapshot before compaction |
| `SessionEnd` | `session-end.js` | Reminds to `/compound` + `/pause` at session end |

### Antigravity IDE — Manual Equivalent

Functions that hooks replace in Claude Code can be done manually in Antigravity:

| Hook Behavior | Antigravity Equivalent |
|---------------|------------------------|
| Auto-remind to compound | Run `/compound` after solving problems |
| Auto-save before compact | Run `/pause` before long breaks |
| Suggest context reset | Use `context-engineering` skill, `/pause` → `/resume` |

### Claude Code — Installation

See `.agent/hooks/README.md` for full Claude Code installation steps.

```bash
# Quick start: merge .agent/hooks/hooks.json into ~/.claude/settings.json
# Update script paths to absolute paths in hooks.json first
```
