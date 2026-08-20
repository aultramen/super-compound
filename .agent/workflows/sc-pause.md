---
description: "Save a compact handoff so work can resume in a later session."
---

# Pause Workflow

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Use this before stopping a session or compacting context.

## Steps

1. Load `skills/state-management/SKILL.md` for non-trivial work.
2. Read `docs/STATE.md` and current task context, recent decisions, blockers, and verification status.
   If it contains a `run_id`, refresh it with `node .agent/tools/loop-run.mjs
   show --run <run_id>` before trusting the snapshot.
3. Check `git status --short`, active branch, and worktree path when inside a Git repo; do not mutate Git state.
4. Before writing the handoff, capture any unlogged agent mistake (`ERR-*` in
   `docs/ERROR_LOG.md`) or confirmed convention (`LRN-*` in
   `docs/LEARNED_KNOWLEDGE.md`) from this session.
   Then create or update `docs/STATE.md` as the canonical durable state: current position, exact next action, active blockers and owners, decisions, completed outcomes, verification, branch/workspace, and links to authoritative artifacts. Update only the STATE fields that changed; never re-serialize unchanged sections.
   Store only a non-authoritative Loop Run pointer: `run_id`, run head digest,
   status, last evidence, pause/terminal reason, and next transition. Never copy
   events, counters, an approval envelope, or a confirmation digest. The STATE
   file write needs the active source-write gate.
5. Write `.continue-here.md` as a short pointer to `docs/STATE.md`, the active goal/artifact, and the suggested next workflow (usually `sc-status.md`). Do not duplicate state or specification prose.
6. Update `docs/progress.md` only for chronological session history or durable project patterns.
7. A later `START` or `RESUME` requires fresh human confirmation; the saved
   pointer is never approval.

## Output

- Updated `docs/STATE.md` canonical state.
- `.continue-here.md` short pointer to that state.
- Clear next action.
