# Eval Design

## Workflow

1. **DEFINE** — write eval definitions before coding.
2. **IMPLEMENT** — make the smallest change that can satisfy them.
3. **EVALUATE** — run graders and record every PASS or FAIL.
4. **REPORT** — calculate reliability metrics and state the verdict.

## Eval types

Capability evals ask whether the system can perform the intended task. Specify a task, concrete success criteria, and expected output.

Regression evals ask whether protected behavior still works. Name an immutable baseline such as a Git SHA or approved checkpoint and list the tests that previously passed.

## Grader routing

1. Prefer deterministic code-based graders: targeted tests, a build, schema validation, static checks, or an explicit endpoint/output assertion. Commands must be safe, reproducible, and fail nonzero.
2. Use an LLM-as-judge for genuinely open-ended properties. Provide a rubric, 1–5 scale, written reasoning, and a pass threshold of at least 4.
3. Require human review when the decision depends on security acceptance, legal interpretation, or subjective UX judgment. State the change, reason, risk, and decision needed.

## Reliability metrics

| Metric | Meaning | Default target |
| --- | --- | --- |
| `pass@1` | Success on the first attempt | ≥70% for standard features |
| `pass@3` | At least one success within three independent attempts | ≥90% for capability evals |
| `pass^3` | All three independent attempts succeed | 100% for critical and regression paths |

Runs are independent only when inputs and environment are reset consistently. Record failures; do not discard or silently rerun them. Auth flows, payments, and data migrations require `pass^3`.
