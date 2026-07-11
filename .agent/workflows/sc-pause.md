---
description: "Save a compact handoff so work can resume in a later session."
---

# Pause Workflow

Use this before stopping a session or compacting context.

## Steps

1. Load `skills/state-management/SKILL.md` for non-trivial work.
2. Read `docs/STATE.md` and current task context, recent decisions, blockers, and verification status.
3. Check `git status --short`, active branch, and worktree path when inside a Git repo; do not mutate Git state.
4. Create or update `docs/STATE.md` as the canonical durable state: current position, exact next action, active blockers and owners, decisions, completed outcomes, verification, branch/workspace, and links to authoritative artifacts.
5. Write `.continue-here.md` as a short pointer to `docs/STATE.md`, the active goal/artifact, and the suggested next workflow (usually `sc-status.md`). Do not duplicate state or specification prose.
6. Update `docs/progress.md` only for chronological session history or durable project patterns.

## Output

- Updated `docs/STATE.md` canonical state.
- `.continue-here.md` short pointer to that state.
- Clear next action.
