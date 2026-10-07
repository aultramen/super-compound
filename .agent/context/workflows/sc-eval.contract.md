`.agent/evals/<feature>.md` is the only write; it must be durable before another
gate consumes it for commit/push/PR. Eval is read-only toward the implementation
it grades: repeatable pass/fail verdict; no approval, counters, or self-close.
Checkpoint automatically and continue; /sc-pause is only for actual stops.

Human input/approval: .agent/context/checkpoint.contract.md

Actual eval proves exercised criteria only; `verification-before-completion`
requires goal/all-AC coverage. Missing/skipped/failed proof stays incomplete.
Completion: `Evidence of Completion`, what/how, actual result/locator, AC mapping.
