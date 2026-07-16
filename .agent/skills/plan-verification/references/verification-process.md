## Verification Process

1. Run all 10 dimensions against the plan, ledger, and issue files. Dimension 10
   is `NOT_APPLICABLE` only for a non-UI scope with reason and approver.
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

`PASS WITH NOTES - ENABLER_ONLY` is allowed only for the canonical UI contract
enabler exception. It does not mean UI/API readiness passed and cannot release a
first-slice or scale-out issue.
After enabler verification, `/sc-plan` must refresh the index, rerun dimension
10, and obtain Technical Manager approval before returning a normal `PASS`.
