---
description: "Systematically diagnose and fix bugs. Use when encountering errors, test failures, or unexpected behavior."
---

# Debug Workflow

This workflow turns bug reports into root-cause fixes with regression tests. It enforces diagnosis before fixing.

## Steps

1. **Read the systematic-debugging skill** — Load `skills/systematic-debugging/SKILL.md` and follow its process.

2. **Describe the bug** — Clarify with user:
   - What is the expected behavior?
   - What is the actual behavior?
   - When did it start happening?
   - Any recent changes?

3. **Reproduce** — Find exact steps to trigger the bug:
   // turbo
   - Run the failing command or scenario
   - Confirm the error is reproducible
   - If not reproducible → gather more data, don't guess

4. **Investigate** — Phase 1 of systematic debugging:
   - Read error messages and stack traces completely
   - Check recent changes (`git diff`, `git log --oneline -10`)
   - Isolate the layer: input → validation → processing → output
   - Trace data flow with logging at boundaries

5. **Analyze patterns** — Phase 2:
   - Environment differences? (local vs CI, OS, browser)
   - Scale-related? (works small, fails large)
   - Intermittent? (race condition, timing)
   - Verify assumptions with actual runtime values

6. **Hypothesize and test** — Phase 3:
   - State hypothesis: "The bug is caused by [X] because [evidence]"
   - Predict observable outcome if hypothesis is correct
   - Make smallest change to confirm/deny
   - Max 3 hypotheses — if all fail, question assumptions from step 4

7. **Fix with TDD** — Phase 4:
   - Write failing test that reproduces the bug
   // turbo
   - Run test → confirm it FAILS (reproduces bug)
   - Implement the fix (root cause, not symptoms)
   // turbo
   - Run test → confirm it PASSES
   - Run full test suite to check for regressions

8. **Verify** — Use verification-before-completion skill:
   // turbo
   - Run test suite
   // turbo
   - Run linter
   - Confirm the original bug is fixed
   - Confirm no new issues introduced

9. **Commit** — With conventional message:
   ```
   fix(scope): description of what was fixed
   
   Root cause: [what caused the bug]
   ```

10. **Compound** — Ask: "This was a non-trivial fix. Want to document it with the compound workflow for future reference?"

## When to Use
- Bug reports from users
- Test failures
- Unexpected behavior
- Runtime errors
- "It was working before"

## When to Skip
- Typo fixes or obvious one-line errors
- Configuration-only changes
- Issues already diagnosed with clear fix
