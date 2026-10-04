`.agent/evals/<feature>.md` is the only write; it must be durable before another
gate consumes it for commit/push/PR. Eval is read-only toward the implementation
it grades: repeatable pass/fail verdict; no approval, counters, or self-close.
Checkpoint automatically and continue; /sc-pause is only for actual stops.
