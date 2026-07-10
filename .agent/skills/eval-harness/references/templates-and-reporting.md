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

| Eval | Attempt 1 | Attempt 2 | Attempt 3 | Metric |
| ---- | --------- | --------- | --------- | ------ |

**Capability pass@1:** <percent and fraction>
**Capability pass@3:** <percent and fraction>
**Regression pass^3:** <percent and fraction>
**Human gates:** <resolved or OPEN>
**Verdict:** APPROVED | NOT APPROVED
```

Keep raw run history at `.agent/evals/<feature>.log` and the regression anchor at `.agent/evals/baseline.sha`. Archive a dated result at `docs/eval-results/<feature>-YYYYMMDD.md`. A report must name failed evals and unresolved gates, not just aggregate totals.
