# Progress Memory

Use this branch for cumulative project knowledge in `docs/progress.md`.

## Read and write order

1. Read `## Codebase Patterns` before starting work so known conventions are reused.
2. Search existing patterns before adding one; consolidate rather than duplicate.
3. Append a session entry. Never replace earlier session history.

```markdown
## Codebase Patterns
- **<Pattern>:** <General, reusable guidance>

---

## YYYY-MM-DD HH:MM - <Task or feature>
- **What was done:** <Summary>
- **Files changed:** <Key paths>
- **Learnings for future sessions:**
  - <Pattern, gotcha, or durable context>
---
```

Append after a completed work session, solved debugging session, significant feature, or discovery of a non-obvious convention. Include a useful learning in every entry.

When the same lesson appears in two or more session entries, add one generalized version to `## Codebase Patterns`. Keep the source entries as history. Good patterns prescribe durable project behavior; do not promote task-specific chronology, guesses, or secrets.
