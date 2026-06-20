---
description: "Define and run eval-driven success criteria before or after implementation."
---

# Eval Workflow

Use this when a feature needs measurable pass/fail behavior, reliability checks, or repeatable quality measurement.

## Usage

```text
/eval define <feature>
/eval check <feature>
/eval report <feature>
```

## Steps

1. Load `skills/eval-harness/SKILL.md`.
2. Define observable success criteria before implementation when possible.
3. Choose code, human, or model-graded evals based on the behavior.
4. Run evals after implementation using the same criteria.
5. Report pass/fail, flaky cases, and next fixes.
