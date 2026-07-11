---
description: "Define and run eval-driven success criteria before or after implementation."
---

# Eval Workflow

Use this when a feature needs measurable pass/fail behavior, reliability checks, or repeatable quality measurement.

## Usage

```text
/sc-eval define <feature>
/sc-eval check <feature>
/sc-eval report <feature>
```

## Steps

1. Load `skills/eval-harness/SKILL.md`.
2. Define observable success criteria before implementation when possible.
3. Choose code, human, or model-graded evals based on the behavior.
4. Run evals after implementation using the same criteria.
5. Record whether evals are required before `/sc-go commit`, push, PR, or another workflow gate.
6. Report pass/fail, flaky cases, and next fixes.
7. A non-gating exploratory check may remain in chat. If another workflow or a
   commit/push/PR gate consumes the criteria or result, it must be saved to
   `.agent/evals/<feature>.md`; never make an approval depend on a chat-only eval.
