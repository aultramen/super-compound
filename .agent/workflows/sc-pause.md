---
description: "Save a compact handoff so work can resume in a later session."
---

# Pause Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when actually stopping a session. During ongoing work, the authorized
owning route checkpoints before compaction and continues without invoking pause.


## Example

Input: `/sc-pause`.
Prerequisite: An actual stop with current position, evidence and unfinished work.
Result and next action: STATE plus short handoff pointer; later /sc-status reconciles and resumes.

## Steps

1. Load `skills/state-management/SKILL.md` for non-trivial work.
2. Read `docs/STATE.md` and current task context, recent decisions, blockers, and verification status. Inspect stored proof under `verification-before-completion` before carrying forward any verified outcome; metadata alone is insufficient. Preserve incomplete statuses and evidence gaps. Pause does not silently rerun checks or promote completion; legacy history is not rewritten.
3. Check `git status --short`, active branch, and worktree path when inside a Git repo; do not mutate Git state.
4. Before writing the handoff, capture any unlogged agent mistake (`ERR-*` in
   `docs/ERROR_LOG.md`) or confirmed convention (`LRN-*` in
   `docs/LEARNED_KNOWLEDGE.md`) from this session.
   Then create or update `docs/STATE.md` as the canonical durable state: current position, exact next action, active blockers and owners, decisions, completed outcomes, verification, branch/workspace, and links to authoritative artifacts. Update only the STATE fields that changed; never re-serialize unchanged sections.
5. Write `.continue-here.md` as a short pointer with the pointer lines `# Continue Here`, `- State: docs/STATE.md`, `- Next action: <one executable step or /sc-status>`, and `- Authoritative artifacts: <paths>`. Then persist its managed checkpoint block with nextAction, verifiedOutcomes, blockers, artifactRefs, contractRefs, and ledgerRefs via memory-maintenance.mjs checkpoint. Do not duplicate specification prose.
6. Update `docs/progress.md` only for chronological session history or durable project patterns.
7. The saved pointer is a resume aid; the next session verifies it against the
   tree with `/sc-status` before acting.

## Output

- Updated `docs/STATE.md` canonical state.
- `.continue-here.md` short pointer to that state.
- Clear next action. Any task claimed complete includes `Evidence of Completion`
  with what/how, actual results/locators, and all acceptance criteria mapped.

Checkpoint optional active `constraints` with source, scope, supersession and
digest; preserve pending receipts via ledgerRefs. Follow
`context-engineering/references/active-context.md`; flush at most three pending
maintenance jobs without repeating implementation.
