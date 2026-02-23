---
description: Define and run eval-driven development (EDD) evals. Creates formal pass/fail criteria for features before implementation, then measures reliability with pass@k metrics.
---

# /eval — Eval-Driven Development

Run **before implementing** to define success criteria, or **after implementing** to measure reliability.

## Usage

```
/eval          → Interactive: define or run evals for current task
/eval define   → Create eval definition for a feature
/eval check    → Run eval suite and report pass/fail
/eval report   → Generate full eval report with pass@k metrics
```

## What This Does

Implements **Eval-Driven Development (EDD)** from the `eval-harness` skill:

1. **Define** — Write measurable success criteria BEFORE coding
2. **Implement** — Code to pass the defined evals  
3. **Evaluate** — Run graders (code-based, LLM, human review)
4. **Report** — Document results with pass@k metrics

## Steps

### /eval define [feature-name]

1. Ask: "What feature are we evaluating?"
2. Read `.agent/skills/eval-harness/SKILL.md` for format
3. Identify 3–5 capability evals for the feature
4. Identify regression evals from existing tests
5. Write eval definition to `.agent/evals/<feature-name>.md`
6. Output: "Evals defined. Proceed with implementation targeting these criteria."

### /eval check [feature-name]

1. Read `.agent/evals/<feature-name>.md`
2. Run all code-based graders (shell commands)
3. For LLM graders: evaluate against criteria
4. Flag human review items
5. Record results in `.agent/evals/<feature-name>.log`
6. Output: PASS/FAIL per eval + current pass@k

### /eval report [feature-name]

1. Aggregate all run history from `.agent/evals/<feature-name>.log`
2. Calculate pass@1, pass@3, pass^3 metrics
3. Compare to success definition in eval file
4. Generate markdown report saved to `docs/eval-results/`
5. Output: Full report with verdict (APPROVED / NEEDS WORK / BLOCKED)

## Skill Reference

Read `.agent/skills/eval-harness/SKILL.md` for:
- Eval types (capability vs regression)
- Grader types (code-based, LLM-as-judge, human review)
- pass@k metric definitions and targets
- Report format
- Storage structure

## Integration

| Workflow | Eval Integration |
|----------|-----------------|
| `/plan` | Add eval definition step after planning |
| `/work` | Run `/eval check` before marking tasks complete |
| `/review` | Include eval report in review context |
| `/compound` | Document eval patterns for future reference |
| `/launch` | Run full eval suite as launch gate |

## Success Thresholds (Default)

| Path | Threshold |
|------|-----------|
| Standard feature | pass@3 ≥ 90% |
| Critical path (auth, payment, data) | pass^3 = 100% |
| Regression suite | pass^3 = 100% |
