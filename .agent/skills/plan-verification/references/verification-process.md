## Verification Process

1. Run all 10 dimensions against the plan, ledger, and issue files. Dimension 10
   is `NOT_APPLICABLE` only for a non-UI scope with factual reason.
2. Classify findings:
   - Critical: missing requirements, broken dependencies, cycles, missing must-haves
   - Important: incomplete tasks, missing tests, scope concerns
   - Suggestion: minor sizing or ordering improvements
3. Produce a report under `.agent/context/output-style.md`: start with a summary,
   retain evidence and coverage tables even when all statuses match, and explain
   findings with impact, evidence, and action. Omit empty optional sections:

```markdown
## FSD Verification Report

### Summary
<Plan scope, coverage, result, and required next action.>

**FSD:** <fsd or issue board>
**Verdict:** PASS | PASS WITH NOTES | NEEDS REVISION
**Dimensions:** 10/10 PASS

### Findings

| # | Dimension | Severity | Finding |
|---|---|---|---|
| 1 | Dependency Correctness | Critical | <finding> |
```

4. If revision is needed, apply targeted fixes only, then re-run the failed dimensions. At repeated failed loops reassess evidence and escalate strategy under the shared recovery policy; unresolved mandatory gaps stay unverified.

`PASS WITH NOTES - ENABLER_ONLY` is allowed only for the canonical UI contract
enabler exception. It does not mean UI/API readiness passed and cannot release a
first-slice or scale-out issue.
After enabler verification, `/sc-plan` must refresh the index, rerun dimension
10, and auto-promote unchanged semantics after deterministic gates; request Technical Manager approval only for material deltas before returning a normal `PASS`.

LOCAL_ONLY applicability and affected proof follow the canonical UI readiness reference.
