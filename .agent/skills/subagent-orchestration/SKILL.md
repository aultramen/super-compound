---
name: subagent-orchestration
description: "Use when executing FSD goals with independent work packages. Dispatches fresh subagent per goal with 2-stage review (spec compliance then code quality). Prevents context pollution across goals."
---

# Subagent-Driven Development

## Overview

Dispatch a fresh subagent for each independent FSD goal. Each subagent gets clean context with only the issue pointer, referenced FSD sections, qualified upstream refs, linked accepted ADRs when needed, and files it must inspect. After implementation, run a 2-stage review: spec compliance first, then code quality.

**Announce:** "I'm using the subagent-orchestration skill to dispatch agents per FSD goal."

**Core principle:** Fresh context per goal prevents accumulated confusion. Review spec compliance before code quality to avoid wasted effort.

## When to Use

- Executing an FSD with 3+ independent goals
- Goals modify different files/modules
- Goals have `Blocked by: None` or completed blockers
- You want isolation between implementation steps

## The Process

### Phase 1: Prepare Goal Package

For each goal, create a focused context package:

```text
Goal Package:
  - Goal ID and objective from the FSD
  - Parent FSD path and qualified refs
  - Relevant file paths, only files this goal touches
  - Acceptance and verification refs
  - Architecture constraints from FSD TDEC-* or accepted ADR
  - Test requirements
```

Rules:

- Include only files relevant to this goal.
- Never dump entire codebase context.
- Reference existing patterns by file path.
- Do not copy BRD, PRD, FSD, or ADR prose into the prompt when qualified refs are enough.
- Do not assign goals with unresolved `OPEN-*` blockers.

### Phase 2: Dispatch Implementer

Send the goal package to a fresh agent with this prompt structure:

```markdown
## Your Goal
[Exact FSD goal ID and objective]

## Source Of Truth
- FSD: [path and FSD-<PROJECT>#GOAL-xxx]
- Upstream refs: [qualified BRD/PRD refs]
- Technical refs: [FSD-<PROJECT>#TDEC-xxx or accepted ADR refs]

## Files to Modify
- [exact/path/to/file.ext] - [what to change]

## Files to Create
- [exact/path/to/new-file.ext] - [purpose]

## Acceptance References
- [FSD-<PROJECT>#TEST-xxx]
- [PRD-<PROJECT>#AC-xxx]

## Architecture Rules
- [Relevant FSD TDEC, accepted ADR, or project-config rule]

## Test Requirements
- Write failing test FIRST when behavior changes
- Test file: [exact/path/to/test.ext]

## Process
1. Read all referenced files.
2. Stop with OPEN-* if FSD authority is missing or contradictory.
3. Write failing test when behavior changes.
4. Implement minimal code to pass.
5. Self-review against acceptance refs.
6. Report what you built and any concerns.
```

Key rules for implementers:

- Ask questions or report `OPEN-*` before building the wrong thing.
- Follow existing patterns exactly.
- Do not invent schema, APIs, authorization, workflows, roles, state transitions, or UI behavior outside the FSD.
- Self-review before reporting completion.
- Flag anything that deviates from the FSD.

### Phase 3: 2-Stage Review

#### Stage 1 - Spec Compliance Review

Ask: "Did the implementer build exactly what the FSD goal requested?"

```markdown
## Spec Compliance Checklist

- [ ] All acceptance refs satisfied
- [ ] All specified files created/modified
- [ ] No missing functionality
- [ ] No extra functionality or scope creep
- [ ] Tests exist for new behavior
- [ ] Tests pass
- [ ] No unapproved deviation from FSD/TDEC/accepted ADR
```

If spec compliance fails, stop. Fix gaps before moving to code quality.

#### Stage 2 - Code Quality Review

Only after spec compliance passes. Check:

- [ ] Code follows existing patterns
- [ ] Clean implementation with no unnecessary complexity
- [ ] Error handling present
- [ ] No security issues from `code-review`
- [ ] Architecture rules followed
- [ ] No dead code or debug artifacts

### Phase 4: Accept or Revise

| Stage 1 Result | Stage 2 Result | Action |
|---|---|---|
| Pass | Pass | Accept and move to next goal |
| Fail | N/A | Fix spec gaps, re-review Stage 1 |
| Pass | Fail | Fix quality issues, re-review Stage 2 |

Max 2 revision cycles per goal. If still failing, escalate to the user.

## Goal Isolation Rules

| Rule | Why |
|---|---|
| Fresh context per goal | Prevents accumulated confusion |
| Only relevant files | Keeps context focused |
| Do not carry over debug state | Each goal starts clean |
| Commit after each accepted goal, when commits are requested | Creates rollback points |

## Red Flags

| Thought | Reality |
|---|---|
| "Skip spec review, code looks fine" | Spec compliance first. Always. |
| "One agent for all goals" | Context pollution causes cascading errors |
| "Review both stages at once" | Spec fails, so quality review is wasted effort |
| "Skip review for simple goals" | Simple goals still need spec verification |

## Integration

This skill is used by:

- `executing-plans` for per-goal dispatch during FSD execution

This skill uses:

- `context-engineering` for focused reference loading
- `test-driven-development` for behavior changes
- `code-review` for Stage 2 quality review
- `verification-before-completion` before accepting a goal
