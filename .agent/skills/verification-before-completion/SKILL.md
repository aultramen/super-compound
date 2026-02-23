---
name: verification-before-completion
description: "Use BEFORE claiming any work is complete, fixed, or passing. Requires running verification commands and confirming output before making any success claims. Also covers cross-component integration wiring verification after multi-component work."
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN:     Execute the FULL command (fresh, complete)
3. READ:    Full output, check exit code, count failures
4. VERIFY:  Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. CLAIM:   Only then make the claim

Skip any step = lying, not verifying
```

## Verification Requirements

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting subagent or AI success reports
- Relying on partial verification
- Thinking "just this once"
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ test suite |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction about work quality
- Committing, PR creation, task completion
- Moving to next task in a plan
- Delegating to subagents

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

## Goal-Backward Verification

When verifying a completed feature or workflow (not just a single task), apply goal-backward tracing:

### The Process

```
1. STATE THE GOAL
   → What outcome was this work supposed to achieve?
   → Express as a user-visible outcome, not a task description
   → Example: "Users can register and log in" NOT "Implement auth"

2. DERIVE OBSERVABLE TRUTHS (3-7)
   → What must be true FROM THE USER'S PERSPECTIVE?
   → Each truth must be independently verifiable
   → Example: "A new user can create an account with email"
   → Example: "A logged-in user sees their dashboard"

3. DERIVE REQUIRED ARTIFACTS
   → What specific files/outputs must exist?
   → Be precise: file paths, not categories
   → Example: "src/routes/auth/register.ts exists"

4. DERIVE REQUIRED WIRING
   → What connections between components must work?
   → Example: "Register form submits to /api/auth/register"
   → Example: "JWT token stored in httpOnly cookie"

5. TRACE BACK TO COMPLETED TASKS
   → For each observable truth: which tasks make it true?
   → For each required artifact: does it exist and is it correct?
   → For each required wiring: does data flow correctly?

6. IDENTIFY GAPS
   → Any truth that cannot be traced = GAP
   → Any artifact missing = GAP
   → Any wiring broken = GAP
```

### Verification Report Template

```markdown
## Goal-Backward Verification

**Goal:** [outcome statement]

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | [user-visible truth] | ✅ Verified / ❌ Gap | [command output / file reference] |

### Required Artifacts

| File | Exists | Correct |
|------|--------|---------|
| [file path] | ✅/❌ | ✅/❌/⚠️ |

### Required Wiring

| Connection | Works |
|-----------|-------|
| [A → B description] | ✅/❌ |

### Gaps Found

| # | Gap | Type | Severity |
|---|-----|------|----------|
| 1 | [description] | truth/artifact/wiring | critical/important/minor |
```

### When to Apply Goal-Backward

- After completing all tasks in a plan
- Before claiming a feature is "done"
- After gap closure plans
- During code review of a complete feature

### When Standard Verification is Sufficient

- Single task completion (just run the verify command)
- Bug fixes (just confirm the fix works)
- Refactoring (just confirm tests still pass)

---

## Integration Checking

Building components that work individually is not the same as building components that work together. After multi-component implementations, apply cross-component wiring verification.

**Core principle:** **Existence ≠ Integration** — A file existing doesn't mean it's wired. An endpoint existing doesn't mean the frontend calls it.

### When to Apply

| Situation | Trigger |
|-----------|---------|
| Completed a plan with both frontend + backend tasks | Always |
| Built multiple services that communicate | Always |
| Added new API endpoints | Check callers exist |
| Created new database models | Check migrations + usage |
| Built event emitters | Check handlers exist |
| Created shared types/interfaces | Check importers use them |
| Implemented auth flow | Check all protected routes enforce it |

### Integration Checklists

**1. API Contract Verification**
```
For EACH API endpoint created:
  → Is there a caller (frontend, service, test)?
  → Does the caller send the correct request format?
  → Does the caller handle the response format?
  → Does the caller handle error responses?
  → Are auth headers included where required?
```

**2. Data Flow Verification**
```
For EACH data entity:
  → Can it be Created? (form → API → DB)
  → Can it be Read? (DB → API → UI)
  → Can it be Updated? (form → API → DB → confirmation)
  → Can it be Deleted? (action → API → DB → UI update)
  → Are validation rules consistent across layers?
```

**3. Event/Message Wiring**
```
For EACH event emitted:
  → Is there at least one handler listening?
  → Does the handler process the correct event shape?
  → Are error cases in handlers handled?
  → Is the event bus/queue properly configured?
```

**4. Import/Export Wiring**
```
For EACH exported module/type/function:
  → Is it imported where needed?
  → Are import paths correct (no circular, no stale)?
  → Are type definitions consistent across import boundaries?
```

**5. Auth/Permission Wiring**
```
For EACH protected route/endpoint:
  → Is auth middleware applied?
  → Is role/permission checking enforced?
  → Does the frontend handle 401/403 responses?
  → Is token refresh implemented?
```

**6. Configuration Wiring**
```
For EACH environment variable used:
  → Is it defined in .env.example?
  → Is it loaded by the config module?
  → Is it validated at startup?
  → Does it have a sensible default (where appropriate)?
```

### Integration Check Report

```markdown
## Integration Check Report

**Scope:** [what was checked]
**Date:** YYYY-MM-DD

### API Contracts

| Endpoint | Caller | Request ✓ | Response ✓ | Errors ✓ |
|----------|--------|-----------|------------|----------|
| POST /api/users | RegisterForm | ✅ | ✅ | ❌ missing |

### Data Flow

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| User | ✅ | ✅ | ⚠️ no form | ❌ missing |

### Event Wiring

| Event | Emitter | Handler | Status |
|-------|---------|---------|--------|
| user.created | AuthService | WelcomeEmail | ✅ |

### Gaps Found

| # | Gap | Type | Severity |
|---|-----|------|----------|
| 1 | [description] | contract/data/event/auth/config | critical/important/minor |
```

### Quick Integration Check (Small Changes)

For 1-3 file changes, use the minimal check:
```
1. What did I create/modify?
2. Who calls this? (check callers exist and work)
3. What does this call? (check dependencies exist and work)
4. Did I update all layers? (DB ↔ API ↔ UI)
```

---

## Integration

**This skill is used by:**
- **executing-plans** — Before marking any task complete
- **code-review** — Verify review findings are accurate
- **gap-closure** — Verify gaps are actually closed

**Pairs with:**
- **test-driven-development** — TDD verification cycle
- **systematic-debugging** — Verify fix actually works
- **gap-closure** — Fix integration gaps found during wiring check
- **state-management** — Update STATE.md after verification
