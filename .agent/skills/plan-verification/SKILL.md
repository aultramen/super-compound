---
name: plan-verification
description: "After creating an FSD and goal issue board, validates requirement coverage, goal quality, dependencies, issue-board DAGs, sizing, and verification before execution."
---

# Plan Verification

## Overview

FSDs are implementation contracts. Verify the FSD and goal issue board before execution so expensive gaps are caught while they are cheap to fix.

Announce: "I'm using the plan-verification skill to validate this plan before execution."

## The 8 Verification Dimensions

### 1. Requirement Coverage

For each BRD/PRD requirement or acceptance criterion:

- Is there at least one FSD requirement, test, and goal issue pointer that addresses it?
- If missing, flag: `Requirement <X> has no corresponding FSD goal`.

### 2. Task Completeness

For each FSD goal or issue pointer:

- Does it have a clear action?
- Does it have a verification step?
- Does it have done criteria?
- If missing, flag: `Goal <X> missing action/verify/done`.

### 3. Dependency Correctness

For each goal or issue with dependencies:

- Do dependencies actually exist in the FSD, ledger, or issue board?
- Do dependencies come before dependents?
- Are there circular dependencies?
- If using issue files, do `Blocked by` paths exist and form a DAG?
- If invalid, flag: `Goal <X> depends on <Y> which does not exist, comes after, or creates a cycle`.

### 4. Key Links

For key component connections:

- Are API endpoints that frontend calls specified in the FSD?
- Are database changes specified before code that uses them?
- Are shared types or interfaces specified before modules that import them?
- If missing, flag: `Key link missing: <A> depends on <B> which is not in the plan`.

### 5. Scope Sanity

Evaluate overall scope:

- Is the plan achievable in the likely timeframe?
- Are there more than 20 tasks that need phase splitting?
- Are there tasks that are separate features?
- If concerning, flag: `Scope concern: <description>`.

### 6. Must-Haves Derivation

From the goal, derive what must exist:

- Working endpoint, page, workflow, or capability
- Error handling for critical paths
- User-facing validation when relevant
- If missing, flag: `Must-have missing: <description>`.

### 7. Complexity And Sizing

For each goal or issue:

- Is it too broad? A focused task should fit one session.
- Is it too narrow? Tiny mechanical changes should be merged.
- Does it mix unrelated domains or user outcomes?
- Can it be described in two or three sentences?
- Is it completable in one context window?
- If it crosses database, API, UI, and tests, is it a coherent tracer bullet for one behavior?
- If it is layer-only, is that layer task independently verifiable and necessary?

Flag oversized, incoherent, or horizontal work. Do not flag a task merely because a valid vertical slice crosses multiple layers.

| Right-Sized | Too Big Or Wrongly Sliced |
|---|---|
| Add a DB column and rollback check | Build the entire dashboard |
| Add one UI state and browser verification | Add authentication |
| Update one server action with tests | Refactor the API |
| Add one usage metric path from query to chart with tests | Build all analytics backend, then all analytics UI |

### 8. Test Coverage

For each critical path:

- Is there a verification step that covers it?
- Are edge cases identified?
- Is error handling tested?
- If missing, flag: `Critical path <X> has no verification`.

## Verification Process

1. Run all 8 dimensions against the plan, ledger, and issue files.
2. Classify findings:
   - Critical: missing requirements, broken dependencies, cycles, missing must-haves
   - Important: incomplete tasks, missing tests, scope concerns
   - Suggestion: minor sizing or ordering improvements
3. Produce a report:

```markdown
## FSD Verification Report

**FSD:** <fsd or issue board>
**Verdict:** PASS | PASS WITH NOTES | NEEDS REVISION

### Findings

| # | Dimension | Severity | Finding |
|---|---|---|---|
| 1 | Dependency Correctness | Critical | <finding> |
```

4. If revision is needed, apply targeted fixes only, then re-run the failed dimensions. Stop after three failed revision loops and mark `needs_review`.

## Revision Rules

Do:

- Add missing tasks, issues, tests, criteria, or blocker links
- Reorder dependencies
- Split overly broad tasks
- Merge tasks that are too narrow

Do not:

- Rewrite the whole plan without cause
- Change scope
- Add features not in the original requirements
- Remove tasks without justification

## Integration

This skill is the final check in `/sc-plan`.

Use it with:

- `writing-plans` for FSDs
- `issue-workflow` for `.scratch/<feature>/issues/*.md` boards
- `gap-closure` when execution reveals missing work
- `verification-before-completion` after implementation
