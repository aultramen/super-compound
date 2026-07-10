# Memory Hygiene

## Restore selectively

1. Search `docs/STATE.md` for Current Position, Next Action, active task, and Blockers before loading linked files.
2. Read `.continue-here.md` when present.
3. Load only the active BRD, PRD, FSD, brainstorm, issue, ledger, or solution referenced by the current route.
4. Scan `.scratch/*/issues/*.md` only for issue-driven continuation.
5. Run `/sc-status` if authority or route remains unclear.

Search by task ID, requirement ID, decision keyword, or path before opening long history. Prefer targeted sections over whole files.

## Dedupe and supersession

Before appending, search for the same decision, blocker, outcome, error, or convention:

- Update an identical active entry in place rather than duplicating it.
- Link complementary evidence.
- If new evidence replaces guidance, mark the old entry `SUPERSEDED by <new path or decision ID>` and keep one current canonical statement.
- Never silently rewrite historical rationale; record the date and reason for supersession.
- Consolidate recurring progress patterns at the top of `docs/progress.md`.

## Quantitative archive gate

Compact hot state when any threshold is crossed:

- `Completed Work` has more than 20 entries;
- `Decisions` has more than 30 entries;
- `docs/STATE.md` has more than 300 lines; or
- closed material from three or more finished workflows occupies over half the file.

Before archiving, resolve duplicates and supersession. Move only closed history to `docs/state-archive/state-YYYYMMDD.md`, preserve dates and headings, and leave a brief summary plus archive link in `STATE.md`. Keep Current Position, exact Next Action, all active Blockers, active-scope Decisions, and the latest relevant completion in hot state.

Re-run the gate at session end. Archive thresholds authorize compaction, not deletion: historical evidence remains searchable in the archive.
