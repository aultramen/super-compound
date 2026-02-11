---
name: code-review
description: "Use when reviewing code changes for quality, correctness, and maintainability. Provides multi-perspective analysis with severity classification."
---

# Code Review

## Overview

Review code from multiple perspectives systematically, classify findings by severity, and provide actionable feedback.

**Announce:** "I'm using the code-review skill to review these changes."

## The Process

### Phase 1: Understand the Change

Before reviewing any code:

1. **Read the plan/spec** — What was this supposed to accomplish?
2. **Understand the context** — What does this code interact with?
3. **Check acceptance criteria** — What defines "done"?

### Phase 2: Spec Compliance Review

**First pass: Does it match the specification?**

- [ ] All acceptance criteria met
- [ ] All plan tasks completed
- [ ] Expected behavior implemented
- [ ] Edge cases from spec handled
- [ ] No missing features

**If spec compliance fails:** Stop here. Fix gaps before code quality review.

### Phase 3: Code Quality Review

**Second pass: Is it well-built?**

#### Correctness
- [ ] Logic is correct for all inputs
- [ ] Error handling covers failure modes
- [ ] Edge cases handled (empty, null, boundary)
- [ ] Concurrency issues addressed (if applicable)
- [ ] No off-by-one errors

#### Design
- [ ] Follows existing codebase patterns
- [ ] Single Responsibility — each function does one thing
- [ ] No unnecessary complexity (YAGNI)
- [ ] No duplication (DRY)
- [ ] Proper abstractions at the right level

#### Architecture Compliance (SUPER-COMPOUND.md Section 10)
- [ ] Files in correct directory per framework architecture guide
- [ ] Imports respect dependency direction rules
- [ ] Business logic in service/domain layer, NOT in controllers/routes
- [ ] No circular dependencies
- [ ] File under 1000 lines, functions under 50 lines
- [ ] Nesting depth ≤ 3 levels
- [ ] Naming conventions followed

#### Security
- [ ] Input validation present
- [ ] No hardcoded secrets or credentials
- [ ] SQL injection / XSS prevention (if applicable)
- [ ] Authentication/authorization checks (if applicable)
- [ ] Sensitive data not logged

#### Performance
- [ ] No N+1 queries
- [ ] No unnecessary database calls in loops
- [ ] No memory leaks (unclosed resources)
- [ ] Reasonable algorithmic complexity

#### Readability
- [ ] Clear naming (variables, functions, classes)
- [ ] Appropriate comments (why, not what)
- [ ] Consistent formatting
- [ ] Self-documenting code

#### Testing
- [ ] Tests exist for new functionality
- [ ] Tests cover edge cases
- [ ] Tests are readable and maintainable
- [ ] No flaky test patterns
- [ ] Test names describe behavior

### Phase 4: Classify Findings

**Severity Classification:**

| Level | Label | Description | Action |
|-------|-------|-------------|--------|
| **P1** | 🔴 Critical | Bugs, security issues, data loss risk | Must fix before merge |
| **P2** | 🟡 Important | Design issues, missing edge cases, performance | Should fix, can negotiate |
| **P3** | 🟢 Suggestion | Style, naming, minor improvements | Nice to have |

### Phase 5: Present Findings

**Format:**

```markdown
## Review Summary

**Scope:** [What was reviewed]
**Verdict:** [APPROVE / CHANGES REQUESTED / NEEDS DISCUSSION]

### 🔴 P1 — Critical (Must Fix)
1. [File:line] — [Issue description and why it's critical]

### 🟡 P2 — Important (Should Fix)
1. [File:line] — [Issue description and suggestion]

### 🟢 P3 — Suggestions
1. [File:line] — [Improvement suggestion]

### ✅ Strengths
- [What was done well]
```

**Rules:**
- Lead with strengths before issues
- Be specific: file, line, what's wrong, how to fix
- Explain WHY something is an issue, not just WHAT
- Group related findings together

## Red Flags in Code

Watch specifically for:

| Red Flag | Why It Matters |
|----------|---------------|
| `catch` with empty body | Silences errors |
| Magic numbers/strings | Unreadable and error-prone |
| God functions (50+ lines) | Unmaintainable — extract sub-functions |
| God files (1000+ lines) | Split into modules |
| Deep nesting (4+ levels) | Refactor with guard clauses |
| Copy-pasted code blocks | DRY violation |
| TODO/FIXME without ticket | Will be forgotten |
| Console.log / print statements | Debug artifacts |
| Disabled tests | Hidden failures |
| Business logic in controllers | Architecture violation — move to services |
| Wrong dependency direction | P1 Critical — breaks architecture |

## Self-Review Protocol

When reviewing your own code (before asking for external review):

1. Wait 2 minutes (or switch context) before reviewing
2. Read every line as if someone else wrote it
3. Run the full test suite
4. Check the diff: `git diff --staged`
5. Ask: "Would I approve this in someone else's PR?"

## Integration

**This skill is used after:**
- **executing-plans** — Review completed implementation
- **review workflow** — Full review pipeline

**This skill pairs with:**
- **verification-before-completion** — Verify findings are accurate
- **knowledge-compounding** — Document recurring review patterns
