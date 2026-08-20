# Work-Package Review Contract

Load this reference only when dispatching or reviewing a file-backed goal.

## Implementer Contract

- Read `briefPath` and every qualified reference before editing.
- Follow existing patterns and exact target paths.
- Stop with `OPEN-*` when authority is missing or contradictory.
- Write a failing test first for behavior/regression changes.
- Implement only the named goal and run its mapped verification.
- Write the full report to `reportPath` with outcome, changed files,
  verification, deviations, and blockers.
- Return no more than 15 lines: outcome, report path, verification status, and
  blockers. Do not return the diff or report body.

## Single-Read Reviewer Contract

Read `briefPath`, `reportPath`, and `reviewPackagePath` once. Write separate
verdicts so spec and quality remain independently actionable.

### SPEC Verdict

- All acceptance and verification refs are satisfied.
- Required files/behavior exist; no required functionality is missing.
- No extra scope, unapproved deviation, or invented contract exists.
- Tests cover new behavior and reported verification is supported by evidence.

### QUALITY Verdict

- Existing architecture and local patterns are preserved.
- Implementation is readable and no more complex than necessary.
- Boundary validation, error handling, security, and integration are adequate.
- No dead code, debug artifacts, unrelated edits, or sensitive output exists.

## Review Output

```markdown
# <goal-id> Review

SPEC: PASS | FAIL
QUALITY: PASS | FAIL

## Critical / Important Findings
- <file:line, evidence, required fix>

## Suggestions
- <optional improvement>

## Verification Checked
- <command/result or missing evidence>
```

Emit the Findings, Suggestions, and Verification Checked sections only when
non-empty.

If either verdict fails, return the review path plus a bounded finding summary.
Batch fixes once, regenerate the patch, and re-review. Escalate after two failed
revision cycles.
