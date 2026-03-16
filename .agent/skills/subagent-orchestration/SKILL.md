---
name: subagent-orchestration
description: "Use when executing implementation plans with independent tasks. Dispatches fresh subagent per task with 2-stage review (spec compliance then code quality). Prevents context pollution across tasks."
---

# Subagent-Driven Development

## Overview

Dispatch a fresh subagent for each task in an implementation plan. Each subagent gets clean context with only the files it needs. After implementation, run a 2-stage review: spec compliance first, then code quality.

**Announce:** "I'm using the subagent-orchestration skill to dispatch agents per task."

**Core principle:** Fresh context per task prevents accumulated confusion. Review spec compliance before code quality to avoid wasted effort.

## When to Use

- Executing a plan with 3+ independent tasks
- Tasks modify different files/modules
- You want isolation between implementation steps

## The Process

### Phase 1: Prepare Task Package

For each task, create a focused context package:

```
Task Package:
  - Task description (from plan)
  - Relevant file paths (only files this task touches)
  - Acceptance criteria (specific, verifiable)
  - Architecture constraints (from project-config.md)
  - Test requirements (what tests to write)
```

**Rules:**
- Include ONLY files relevant to this task
- Never dump entire codebase context
- Reference existing patterns by file path

### Phase 2: Dispatch Implementer

Send the task package to a fresh agent with this prompt structure:

```markdown
## Your Task
[Exact task description from plan]

## Files to Modify
- [exact/path/to/file.ext] — [what to change]

## Files to Create
- [exact/path/to/new-file.ext] — [purpose]

## Acceptance Criteria
1. [Specific verifiable criterion]
2. [Another criterion]

## Architecture Rules
- [Relevant rules from project-config.md]
- [Dependency direction constraints]

## Test Requirements
- Write failing test FIRST (TDD)
- Test file: [exact/path/to/test.ext]

## Process
1. Read all referenced files
2. Ask clarifying questions if anything is ambiguous
3. Write failing test
4. Implement minimal code to pass
5. Self-review against acceptance criteria
6. Report what you built and any concerns
```

**Key rules for implementer:**
- Ask questions before building wrong thing
- Follow existing patterns exactly
- Self-review before reporting completion
- Flag anything that deviates from the plan

### Phase 3: 2-Stage Review

#### Stage 1 — Spec Compliance Review

**Ask:** "Did the implementer build exactly what was requested?"

```markdown
## Spec Compliance Checklist

- [ ] All acceptance criteria met
- [ ] All specified files created/modified
- [ ] No missing functionality
- [ ] No extra functionality (scope creep)
- [ ] Tests exist for new behavior
- [ ] Tests pass
```

**If spec compliance fails → STOP.** Fix gaps before moving to code quality.
Reviewing code quality when spec isn't met wastes everyone's time.

#### Stage 2 — Code Quality Review

**Only after spec compliance passes.** Check:

- [ ] Code follows existing patterns
- [ ] Clean implementation (no unnecessary complexity)
- [ ] Error handling present
- [ ] No security issues (P1 from code-review skill)
- [ ] Architecture rules followed (dependency direction)
- [ ] No dead code or debug artifacts

### Phase 4: Accept or Revise

| Stage 1 Result | Stage 2 Result | Action |
|----------------|----------------|--------|
| ✅ Pass | ✅ Pass | Accept and move to next task |
| ❌ Fail | — | Fix spec gaps, re-review Stage 1 |
| ✅ Pass | ❌ Fail | Fix quality issues, re-review Stage 2 |

**Max 2 revision cycles per task.** If still failing → escalate to user.

## Task Isolation Rules

| Rule | Why |
|------|-----|
| Fresh context per task | Prevents accumulated confusion |
| Only relevant files | Keeps context focused |
| Don't carry over debug state | Each task starts clean |
| Commit after each accepted task | Creates rollback points |

## Red Flags

| Thought | Reality |
|---------|---------|
| "Skip spec review, code looks fine" | Spec compliance first. Always. |
| "One agent for all tasks" | Context pollution causes cascading errors |
| "Review both stages at once" | Spec fails → quality review is wasted effort |
| "Skip review for simple tasks" | Simple tasks still need spec verification |

## Integration

**This skill is used by:**
- **executing-plans** — Orchestrates per-task dispatch during plan execution

**This skill uses:**
- **test-driven-development** — Each implementer follows TDD
- **code-review** — Stage 2 uses code-review checklist
- **verification-before-completion** — Verify before accepting
