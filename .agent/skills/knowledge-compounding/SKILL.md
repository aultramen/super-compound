---
name: knowledge-compounding
description: "Use when a non-trivial problem is solved or substantial work should make future sessions easier."
---

# Knowledge Compounding

Turn proven solutions and reusable session learnings into searchable project memory. Announce use before writing documentation.

## When to Use

Use after a difficult debugging fix, non-obvious root cause, recurring workaround, significant feature, or newly discovered codebase convention. Confirmation such as “that worked” is a signal, not sufficient evidence: skip typos, obvious corrections, and trivial configuration changes.

## Route

- For a solved problem, search before creating anything, then follow [solution capture](references/solution-capture.md).
- For end-of-session or reusable project learning, follow [progress memory](references/progress-memory.md).
- Use only the relevant branch; do not load both references by default.

## Invariants

- Search before writing in `docs/solutions/`; cross-link related records and create a new record only for a distinct root cause.
- Every solution record explains problem, observable symptoms, root cause, proven solution, and prevention. Preserve exact errors and useful file or version context.
- Store solution records under `docs/solutions/<category>/`; when three or 3+ related issues establish a reusable pattern, add a pattern record.
- Keep `docs/progress.md` append-only for session entries while consolidating reusable patterns at its top.
- Capture only verified knowledge. Never turn a hypothesis or failed attempt into prescribed guidance.

## Red Flags

- Vague “fixed the code” prose, unexplained code dumps, or missing prevention.
- Duplicating an existing solution without searching or cross-referencing it.
- Recording secrets, customer data, transient noise, or session-specific details as general patterns.
- Replacing progress history or allowing repeated patterns to accumulate without consolidation.

## Integration

Triggered after `systematic-debugging`, tricky `executing-plans` work, compound workflows, or before pause handoff. Outputs feed `writing-plans`, `brainstorming`, and resume context restoration. Present the created or updated path, then return to the active workflow.
