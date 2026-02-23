# Quality Gates

## Process Gates

### Skill Invocation Gate

**Skills are MANDATORY, not suggestions.** Check for applicable skills BEFORE responding.

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "The skill is overkill" | Simple things become complex. Use it. |

---

### Verification Gate

**The Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Before claiming ANY work is complete:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the FULL command (fresh, complete)
3. **READ** — Full output, check exit code, count failures
4. **VERIFY** — Does output confirm the claim?
5. **CLAIM** — Only then make the claim WITH evidence

### Goal-Backward Verification (for feature completion)

When completing a full feature or plan (not just a single task), apply goal-backward verification:

1. **State the goal** — User-visible outcome, not task description
2. **Derive observable truths** — What must be true from user's perspective (3-7)
3. **Derive required artifacts** — Specific files that must exist
4. **Derive required wiring** — Connections that must work
5. **Trace back** — Every truth must trace to verified task output
6. **Gaps → gap-closure skill** — Don't restart; fix specifically

### Plan Verification Gate

Before executing ANY plan, validate 8 dimensions:

| Dimension | Check |
|-----------|-------|
| Requirement coverage | Every requirement has a task |
| Task completeness | Each task has action + verify + done |
| Dependency correctness | No broken/circular dependencies |
| Key links | Critical connections are planned |
| Scope sanity | Plan is achievable |
| Must-haves | Essential outputs are included |
| Complexity | Tasks aren't too broad/narrow |
| Test coverage | Critical paths have verification |

### Integration Verification Gate

After multi-component work, verify cross-component wiring:

- API contracts: callers exist and send correct format
- Data flows: CRUD works through all layers
- Event wiring: emitters have handlers
- Auth wiring: protected routes enforce auth
- Config wiring: env vars are defined and loaded

**Core principle:** Existence ≠ Integration

### State Management Gate

Track project state persistently:

- Update `docs/STATE.md` at session boundaries
- Record decisions as they're made (locked constraints)
- Track blockers and deferred ideas
- Use checkpoints for human-in-the-loop gates (`checkpoint-protocol` skill)
- Append to `docs/progress.md` before pausing (session progress log)
- Read Codebase Patterns from `docs/progress.md` before starting new work

### Task Sizing Gate

Before executing a plan, validate task sizes:

- Each task must be describable in 2-3 sentences
- Each task should modify ONE layer (DB, backend, or frontend)
- Each task must be independently verifiable
- Split tasks that span >2 hours of estimated work

### Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Done!")
- About to commit without running tests
- Trusting subagent success reports without independent verification
- Claiming integration works without checking both sides
- Skipping plan verification before execution
- PRD acceptance criteria saying "works correctly" (must be specific)
- Creating tasks that can't be described in 2-3 sentences (too big)

---

## Standards

### Secrets & Environment Security

**The Environment Law: NEVER commit secrets. NEVER log secrets. NEVER hardcode secrets.**

| Rule | Enforcement |
|------|------------|
| `.env` in `.gitignore` | **Mandatory** — verify on every project setup |
| `.env.example` exists | **Mandatory** — template with all keys, no real values |
| No secrets in source code | P1 Critical in code review |
| No secrets in logs | P1 Critical in code review |
| Different secrets per environment | dev ≠ staging ≠ production |

**Verification checklist:**
```
□ .env is in .gitignore?
□ .env.example exists with all required keys?
□ No secrets in committed code? (grep for hardcoded passwords/tokens)
□ No secrets in log output?
□ Production secrets in vault/secure config?
```

> Full golden rules, detection tools (Gitleaks, TruffleHog), storage patterns, and incident response → `security-audit` skill (Secrets Management section).

---

### Architecture Rules

**Every file MUST follow dependency direction + complexity limits.**

Architectural violations during code review = **P1 Critical**.

#### Complexity Limits

| Rule | Limit | Action |
|------|-------|--------|
| Max lines per file | 1000 | Split into modules |
| Max lines per function | 50 | Extract sub-functions |
| Max nesting depth | 3 | Guard clauses, early returns |
| Max function params | 4 | Use options object |
| Max module deps | 7 | Module too broad → split |
| God class | 10+ public methods | Split by responsibility |

#### Dependency Direction

```
ALLOWED:  presentation → application → domain
          infrastructure → application → domain

FORBIDDEN: domain → infrastructure (business logic ≠ DB)
           domain → presentation  (business logic ≠ UI)
           application → presentation
```

**Enforcement checklist:**
```
□ File in correct directory per architecture guide?
□ Imports respect dependency direction?
□ File under 1000 lines? Functions under 50?
□ Nesting ≤ 3? No circular deps?
□ Business logic in service/domain layer only?
```

> Per-framework folder structures, naming conventions, and anti-spaghetti patterns → `architecture-enforcement` skill.

---

### Knowledge Compounding

When a non-trivial problem is solved, document it.

**Triggers:** "that worked", "it's fixed", "working now", "problem solved"

**Target:**
```
docs/solutions/<category>/<filename>.md
```

**Categories:** `build-errors/`, `test-failures/`, `runtime-errors/`, `performance-issues/`, `database-issues/`, `security-issues/`, `ui-bugs/`, `integration-issues/`, `logic-errors/`
