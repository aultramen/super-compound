# Templates and Reporting

## Definition

Store `.agent/evals/<feature-name>.md`:

```markdown
# Eval: <feature-name>

**Date Defined:** YYYY-MM-DD
**Feature:** <description>
**Baseline:** <Git SHA or checkpoint>

## Capability Evals
| # | Task | Grader | Pass criteria |
| - | ---- | ------ | ------------- |

## Regression Evals
| # | Protected behavior | Grader | Baseline |
| - | ------------------ | ------ | -------- |

## Success Definition
<Required pass@k and pass^k thresholds>
```

Each criterion must be observable and binary even when its grader uses a rubric.

## Report

```markdown
## Eval Report: <feature-name>
**Date:** YYYY-MM-DD
**Attempts:** N
**Results:** N/N PASS x3 attempts
**Exceptions:** none, or each failed eval and unresolved human gate by name

**Capability pass@1:** <percent and fraction>
**Capability pass@3:** <percent and fraction>
**Regression pass^3:** <percent and fraction>
**Human gates:** <resolved or OPEN>
**Verdict:** APPROVED | NOT APPROVED
```

Add per-attempt columns (`| Eval | Attempt 1 | Attempt 2 | Attempt 3 | Metric |`) only for evals whose attempts differ; uniform results stay collapsed on the `Results:` line.

Keep raw run history at `.agent/evals/<feature>.log` and the regression anchor at `.agent/evals/baseline.sha`. Archive a dated result at `docs/eval-results/<feature>-YYYYMMDD.md`. A report must still name every failed eval and every unresolved human gate, not just aggregate totals.
