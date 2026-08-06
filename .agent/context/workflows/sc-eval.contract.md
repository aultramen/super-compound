Writes: `.agent/tools/workflow-admission.mjs`.
`.agent/evals/<feature>.md` is `authority_write`; no wizard. It must be durable
before consumed run evidence can gate commit/push/PR. Eval is read-only;
`implementation_write` is blocked. Repeatable pass/fail verdict; no approval,
counters, or self-close.
