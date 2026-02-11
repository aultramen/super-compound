---
name: systematic-debugging
description: "Use when encountering any bug, test failure, unexpected behavior, or error. Enforces root-cause investigation before fixes."
---

# Systematic Debugging

## Overview

Find the root cause BEFORE implementing fixes. Systematic debugging replaces guessing with evidence-based diagnosis.

**Announce:** "I'm using the systematic-debugging skill to diagnose this issue."

**Core principle:** If you haven't found the root cause, any fix is a guess.

## The Non-Negotiable Rule

```
DO NOT attempt fixes until you complete Phase 1.
Skipping diagnosis causes cascading failures.
```

## Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

### 1. Read Error Messages Carefully

- Don't skip past errors or warnings
- They often contain the exact solution
- Read stack traces completely
- Note line numbers, file paths, error codes

### 2. Reproduce Consistently

- Can you trigger it reliably?
- What are the exact steps?
- Does it happen every time?
- If not reproducible → gather more data, don't guess

### 3. Check Recent Changes

- What changed since it last worked?
- Review recent commits
- Check configuration changes
- Look for environment differences
- `git diff` and `git log --oneline -20`

### 4. Isolate the Layer

Where does the problem live?

```
Input → [Validation] → [Processing] → [Output] → [UI/Response]
         ^               ^              ^           ^
         Which layer has the bug?
```

- Add logging/breakpoints at layer boundaries
- Find where correct data becomes incorrect

### 5. Trace the Data Flow

Follow the data from source to symptom:
- What enters the function? (Log actual values)
- What transforms happen?
- Where does the unexpected behavior start?

## Phase 2: Pattern Analysis

### Environment Check

| Factor | Check |
|--------|-------|
| Works locally, fails in CI? | Environment difference |
| Works on one browser, fails another? | Compatibility issue |
| Works with small data, fails with large? | Resource/scale issue |
| Intermittent failures? | Race condition or timing |

### Multi-Component Investigation

For bugs spanning multiple components:

```
Component A → API → Component B → Database
     ↓
Verify output at each boundary
```

- Log inputs/outputs at each integration point
- Find where the contract is broken

### Examine Assumptions

| Assumption | Verify |
|------------|--------|
| "This function returns X" | Log actual return value |
| "This config is loaded" | Print config at runtime |
| "This path is followed" | Add logging to confirm |
| "This variable has value Y" | Assert or log it |

## Phase 3: Hypothesis and Testing

### Form Hypothesis

Based on evidence from Phase 1 and 2:
- "The bug is caused by [root cause] because [evidence]"
- If you can't state a specific hypothesis, return to Phase 1

### Test Hypothesis

1. **Predict** — "If my hypothesis is correct, then [observable outcome]"
2. **Test** — Make the smallest change that would confirm/deny
3. **Observe** — Did the prediction match?
4. **Iterate** — If wrong, revise hypothesis and test again

**Max 3 hypotheses.** If 3 fail → question your assumptions from Phase 1.

## Phase 4: Implementation

### Write Failing Test First

Before fixing the bug, write a test that reproduces it:

```
1. Write test → Run → FAIL (reproduces bug)
2. Fix code  → Run → PASS (confirms fix)
3. Revert fix → Run → FAIL (proves test catches it)
4. Restore fix → Run → PASS (regression proof)
```

### Fix the Root Cause

- Fix the actual root cause, not symptoms
- Don't add workarounds
- If the fix is larger than expected, create a plan

### Architecture Questions

If you've made 3+ fix attempts without success:

**STOP. Ask these questions:**
- Is the architecture fundamentally wrong?
- Is there a missing abstraction?
- Is there accidental complexity?
- Should this be redesigned rather than patched?

## Red Flags

| Thought | Reality |
|---------|---------|
| "Let me just try this quick fix" | Diagnose first. Quick fixes hide bugs. |
| "I think I know what's wrong" | Prove it before fixing. |
| "Can't reproduce, but I'll fix it anyway" | Reproduce first, always. |
| "The error message is misleading" | Read it again. It's usually right. |
| "I'll add a try/catch" | Catching errors ≠ fixing them. |

## Supporting Techniques

### Binary Search

When you have a large code change that broke something:
1. Find a known-good state (commit, stash)
2. Bisect to find the exact change that broke it

### Defense in Depth

After fixing, add:
- Input validation at boundaries
- Assertions for assumptions
- Logging for future diagnostics

## Integration

**This skill is used by:**
- **executing-plans** — When implementation encounters bugs
- **test-driven-development** — Phase 4 feeds into TDD cycle

**This skill feeds into:**
- **knowledge-compounding** — Document the solution after fixing
