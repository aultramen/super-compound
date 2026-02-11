---
description: "Multi-perspective code review with severity classification. Use after completing an implementation."
---

# Review Workflow

This workflow reviews completed code changes from multiple perspectives and classifies findings by severity.

## Steps

1. **Read code-review skill** — Load `skills/code-review/SKILL.md` and follow its process.

2. **Determine review scope** — What needs review?
   - Specific files changed
   - Full feature branch diff
   - Specific component

3. **Phase 1: Spec compliance** — Does the code match the plan/spec?
   - Check all acceptance criteria
   - Verify all tasks completed
   - Confirm expected behavior works

4. **Phase 2: Code quality** — Multi-perspective analysis:
   - ✅ **Correctness** — Logic, error handling, edge cases
   - 🏗️ **Design** — Patterns, SRP, YAGNI, DRY
   - 🔒 **Security** — Input validation, secrets, injection
   - ⚡ **Performance** — N+1, memory, complexity
   - 📖 **Readability** — Naming, comments, formatting
   - 🧪 **Testing** — Coverage, edge cases, reliability

5. **Classify findings** —
   - 🔴 **P1 Critical** — Must fix before merge (bugs, security, data loss)
   - 🟡 **P2 Important** — Should fix (design issues, missing edge cases)
   - 🟢 **P3 Suggestion** — Nice to have (style, naming, minor improvements)

6. **Present review** — Structured report with strengths first, then findings by severity.

7. **Action items** — If P1/P2 issues found:
   - Create fix tasks
   - Re-run relevant tests after fixes
   - Re-review fixed areas

8. **Approval** — When no P1 issues remain:
   - ✅ APPROVE — Ready to merge/ship
   - 🟡 APPROVE WITH NOTES — P2 items noted for follow-up

## When to Use
- After completing an implementation (work workflow)
- Before merging feature branches
- When reviewing existing code for improvement

## When to Skip
- Trivial changes (typos, comments)
- Prototyping / sandbox mode
