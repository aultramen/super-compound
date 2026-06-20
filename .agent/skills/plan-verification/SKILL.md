---
name: plan-verification
description: "After creating a plan — validates 8 dimensions before execution. Catches errors in planning that would be expensive to discover during implementation."
---

# Plan Verification

## Overview

Plans are hypotheses about how to achieve a goal. Unverified plans waste execution time. This skill validates plans across 8 dimensions before a single line of code is written.

**Announce:** "I'm using the plan-verification skill to validate this plan before execution."

## The 8 Verification Dimensions

### 1. Requirement Coverage

```
For EACH requirement or acceptance criterion:
  → Is there at least one task that addresses it?
  → If a requirement has no task → FLAG: "Requirement [X] has no corresponding task"
```

### 2. Task Completeness

```
For EACH task in the plan:
  → Does it have a clear ACTION (what to do)?
  → Does it have a VERIFY step (how to confirm it works)?
  → Does it have DONE criteria (when is it finished)?
  → If missing any → FLAG: "Task [X] missing [action/verify/done]"
```

### 3. Dependency Correctness

```
For EACH task with dependencies:
  → Do dependencies actually exist in the plan?
  → Is the ordering correct? (deps come before dependents)
  → Are there circular dependencies?
  → If issues → FLAG: "Task [X] depends on [Y] which [doesn't exist / comes after / creates cycle]"
```

### 4. Key Links

```
For key component connections:
  → Are API endpoints that frontend calls actually planned in backend tasks?
  → Are database schema changes planned before code that uses them?
  → Are shared types/interfaces planned before modules that import them?
  → If missing → FLAG: "Key link missing: [A] depends on [B] which isn't in the plan"
```

### 5. Scope Sanity

```
Evaluate overall scope:
  → Is the plan achievable in the estimated timeframe?
  → Are there more than 20 tasks? (may need phase splitting)
  → Are there tasks that seem like separate features?
  → If scope issues → FLAG: "Scope concern: [description]"
```

### 6. Must-Haves Derivation

```
From the goal, derive what MUST exist:
  → Working endpoint/page/feature → is it in the plan?
  → Error handling for critical paths → is it planned?
  → User-facing validation → is it planned?
  → If missing → FLAG: "Must-have missing: [description]"
```

### 7. Complexity & Sizing Check

```
For EACH task:
  → Is it too broad? (>2 hours of work = split it)
  → Is it too narrow? (just changing a variable = merge it)
  → Does it mix concerns? (backend + frontend in one task = split)
  → Can it be described in 2-3 sentences? (if not = too big)
  → Is it completable in one context window? (if not = split)
  → Does it modify more than one layer? (DB + API + UI = split)
  → If issues → FLAG: "Task [X] is [too broad / too narrow / mixed concerns / multi-layer]"
```

**Sizing Heuristics:**

| Right-Sized | Too Big (Split) |
|-------------|----------------|
| "Add a DB column + migration" | "Build the entire dashboard" |
| "Add a UI component to existing page" | "Add authentication" |
| "Update a server action with new logic" | "Refactor the API" |

### 8. Test Coverage

```
For EACH critical path:
  → Is there a verification step that covers it?
  → Are edge cases identified?
  → Is error handling tested?
  → If gaps → FLAG: "Critical path [X] has no verification"
```

## Verification Process

### Step 1: Run All 8 Checks

Run each dimension against the plan. Collect all flags.

### Step 2: Classify Flags

| Severity | Criteria | Action |
|----------|----------|--------|
| 🔴 **Critical** | Missing requirements, broken dependencies, missing must-haves | Must fix before execution |
| 🟡 **Important** | Scope concerns, incomplete tasks, missing tests | Should fix |
| 🟢 **Suggestion** | Complexity tweaks, minor ordering improvements | Can fix later |

### Step 3: Produce Verification Report

```markdown
## Plan Verification Report

**Plan:** [plan name/file]
**Verdict:** ✅ PASS / ⚠️ PASS WITH NOTES / ❌ NEEDS REVISION

### Findings

| # | Dimension | Severity | Finding |
|---|-----------|----------|---------|
| 1 | [dimension] | 🔴/🟡/🟢 | [description] |

### Revision Required (if ❌)

| # | What to Fix | How |
|---|-------------|-----|
| 1 | [finding] | [specific revision] |
```

### Step 4: Revision Loop (if needed)

```
IF verdict is ❌ NEEDS REVISION:
  1. Apply targeted fixes (do NOT rewrite entire plan)
  2. Re-run ONLY failed dimensions
  3. Max 3 revision iterations
  4. If still failing after 3 → checkpoint: needs_review
```

## Revision Mode

When revision is needed, apply **targeted fixes**:

```
DO:
  → Fix specific flagged items
  → Add missing tasks/tests/criteria
  → Reorder dependencies
  → Split overly broad tasks

DO NOT:
  → Rewrite the entire plan
  → Change scope
  → Add features not in original requirements
  → Remove tasks without justification
```

## Integration with Plan Workflow

This skill auto-activates as the final step in the `sc-plan.md` workflow:

```
sc-plan.md workflow:
  1. Read requirements/brainstorm
  2. Create plan (writing-plans skill)
  3. ✅ Verify plan (this skill) ← automatic
  4. Present to user for approval
```

**Skip verification:** Only when user explicitly says `--skip-verify`.

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Verify before execution** | Catch errors when they're cheap to fix |
| **Targeted revision** | Fix specific issues, don't rewrite |
| **Max 3 iterations** | Prevent infinite loops |
| **8 dimensions** | Comprehensive but focused |
| **Evidence-based** | Every flag has a specific finding |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "The plan looks good, skip verification" | Plans always have blind spots |
| "Let me rewrite the entire plan" | Fix specific issues only |
| "This dimension doesn't apply" | Run all 8; skip none |
| "Too many flags, start over" | Classify by severity, fix critical first |

## Integration

**This skill is used by:**
- **writing-plans** — Auto-triggered after plan creation
- **sc-plan.md workflow** — Built-in verification step

**Pairs with:**
- **gap-closure** — When execution reveals more gaps
- **verification-before-completion** — Post-execution verification
- **brainstorming** — Plan should trace back to brainstorm decisions
