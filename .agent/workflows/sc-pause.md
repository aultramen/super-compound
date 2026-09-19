---
description: "Save a compact handoff so work can resume in a later session."
---

# Pause Workflow

Use this before stopping a session or compacting context.

## Steps

1. Load `skills/state-management/SKILL.md` for non-trivial work.
2. Read `docs/STATE.md` and current task context, recent decisions, blockers, and verification status.
3. Check `git status --short`, active branch, and worktree path when inside a Git repo; do not mutate Git state.
4. Before writing the handoff, capture any unlogged agent mistake (`ERR-*` in
   `docs/ERROR_LOG.md`) or confirmed convention (`LRN-*` in
   `docs/LEARNED_KNOWLEDGE.md`) from this session.
   Then create or update `docs/STATE.md` as the canonical durable state: current position, exact next action, active blockers and owners, decisions, completed outcomes, verification, branch/workspace, and links to authoritative artifacts. Update only the STATE fields that changed; never re-serialize unchanged sections.
5. Write `.continue-here.md` as a short pointer with exactly the lines `# Continue Here`, `- State: docs/STATE.md`, `- Next action: <one executable step or /sc-status>`, and `- Authoritative artifacts: <paths>`. Do not duplicate state or specification prose.
6. Update `docs/progress.md` only for chronological session history or durable project patterns.
7. The saved pointer is a resume aid; the next session verifies it against the
   tree with `/sc-status` before acting.

## Output

- Updated `docs/STATE.md` canonical state.
- `.continue-here.md` short pointer to that state.
- Clear next action.
