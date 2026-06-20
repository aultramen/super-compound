---
description: "Save a compact handoff so work can resume in a later session."
---

# Pause Workflow

Use this before stopping a session or compacting context.

## Steps

1. Read current task context, recent decisions, blockers, and verification status.
2. Check `git status --short` when inside a Git repo.
3. Write `.continue-here.md` with:
   - Current goal.
   - Completed work.
   - Remaining work.
   - Key decisions and assumptions.
   - Blockers.
   - Verification already run.
   - Suggested next workflow, usually `sc-status.md`.
4. Update `docs/progress.md` only for durable project patterns or important session history.

## Output

- `.continue-here.md` handoff.
- Clear next action.
