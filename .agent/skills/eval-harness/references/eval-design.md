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
2. Use an LLM-as-judge for genuinely open-ended properties. Provide a rubric with an explicit pass bar and require the judge to cite the evidence for its verdict.
3. Require human review when the decision depends on security acceptance, legal interpretation, or subjective UX judgment. State the change, reason, risk, and decision needed.

## Reliability metrics

| Metric | Meaning | Default target |
| --- | --- | --- |
| `pass@1` | Success on the first attempt | ≥70% for standard features |
| `pass@3` | At least one success within three independent attempts | ≥90% for capability evals |
| `pass^3` | All three independent attempts succeed | When nondeterminism or explicit acceptance requires repeated reliability evidence |

Runs are independent only when inputs and environment are reset consistently. Record failures; do not discard or silently rerun them. Choose repeat count from nondeterminism, material risk, and explicit acceptance. One proving run plus regression sensitivity suffices for deterministic unchanged scope. Independent reliability attempts never substitute for safety/contract checks.
