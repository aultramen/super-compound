---
name: eval-harness
description: "Use when non-trivial or AI-assisted behavior needs measurable success criteria and repeatable reliability evidence."
---

# Eval Harness

Apply Eval-Driven Development (EDD): define measurable success before implementation, then evaluate and report after implementation. Announce use before defining criteria.

## When to Use

Use for a non-trivial feature, an AI-produced result that is hard to trust, a past regression, modified prompts or agents, or a production-readiness decision. Evals complement unit tests by measuring end-to-end capability and repeatability.

## Route

- To choose evals and graders, load [eval design](references/eval-design.md).
- To create definition files, reports, and run history, load [templates and reporting](references/templates-and-reporting.md).
- During planning load the first branch; during reporting load the second. Load both only when creating an eval package end to end.

## Invariants

- Follow `DEFINE → IMPLEMENT → EVALUATE → REPORT`; criteria exist before implementation.
- Include capability evals for intended behavior and regression evals for protected behavior.
- Prefer a deterministic grader based on executable tests, builds, or explicit output checks. Use LLM-as-judge only for open-ended quality and a human gate for security, legal, or subjective UX decisions.
- Record independent attempts rather than retrying until a pass is convenient.
- Compute `pass@k` (`pass@1`, `pass@3`) and `pass^3` with `node .agent/tools/eval-gate-model.mjs` from the attempt records; hand-computed metrics are rejected as `PASS_METRICS_MISMATCH`. Target `pass@3 ≥ 90%` for ordinary capability evals and `pass^3 = 100%` for critical auth, payment, migration, and regression paths.
- Never claim approval when a required grader or human gate is unresolved.

## Red Flags

- Success criteria written after seeing the implementation.
- Vague graders, nondeterministic fixtures, changed baselines, cherry-picked attempts, or one run presented as reliability.
- An LLM judge replacing a deterministic check that can be automated.
- Averaging away a failed critical-path run.

## Integration

`writing-plans` defines evals; `test-driven-development` implements low-level tests; `verification-before-completion` runs the suite; `code-review` consumes results; `knowledge-compounding` records recurring failures. Store active evals under `.agent/evals/` and archived reports under `docs/eval-results/`.
