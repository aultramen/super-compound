---
description: "Reproduce, diagnose root cause, fix, and verify bugs or unexpected behavior."
---

# Debug Workflow

Use this for errors, failing tests, regressions, performance surprises, or behavior that differs from expectations.

## Steps

1. Load `skills/systematic-debugging/SKILL.md`.
2. State expected behavior, actual behavior, and the smallest reproducible case.
3. Capture the exact failing command, logs, stack trace, request, or UI path.
4. Form ranked hypotheses from evidence.
5. Test the most likely hypothesis with the smallest feedback loop.
6. Fix the root cause, preferably with a regression test.
7. Run verification and report evidence.
8. Use `compound.md` if the root cause or fix is reusable knowledge.

## Output

- Reproduction evidence.
- Root cause.
- Fix summary.
- Verification evidence.
