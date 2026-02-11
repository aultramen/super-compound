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

### Red Flags — STOP and Check for Skills

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "The skill is overkill" | Simple things become complex. Use it. |

---

## 3. Workflow Pipeline

```
Brainstorm → Plan → Work → Review → Compound
     ↑                                    ↓
     └────── Knowledge feeds back ────────┘
```

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `brainstorm.md` | New feature idea, unclear requirements | Explore WHAT to build |
| `plan.md` | Clear requirements, approved design | Define HOW to build it |
| `work.md` | Approved plan | Execute the plan |
| `debug.md` | Bug, error, test failure, unexpected behavior | Diagnose → fix → verify |
| `review.md` | Completed implementation | Multi-perspective quality review |
| `compound.md` | Problem solved, issue fixed | Document knowledge for future |
| `launch.md` | Want full autonomous pipeline | Run all stages sequentially |
| `reload.md` | Updated rules mid-conversation | Re-read all rule files immediately |

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

### Execution Mode

- **Default:** Sequential, solo developer, simple branching
- **Swarm (on request):** Ask before enabling, git worktrees, coordinated task queue

---

## 6. Skills Reference

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before any creative work |
| `writing-plans` | When you need an implementation plan |
| `executing-plans` | When you have a plan to execute |
| `test-driven-development` | When implementing any feature or bugfix |
| `systematic-debugging` | When encountering any bug or unexpected behavior |
| `verification-before-completion` | Before claiming work is complete |
| `knowledge-compounding` | After solving a non-trivial problem |
| `code-review` | When reviewing code changes |
| `architecture-enforcement` | Before writing code — verify correct folder and imports |
