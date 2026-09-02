# File Contracts

Create only the artifacts required by the active workflow.

| File | Contract |
| --- | --- |
| `docs/STATE.md` | Hot current position, decisions, blockers, completed work, and next action |
| `.continue-here.md` | Short pause handoff pointing to state and authoritative artifacts |
| `docs/progress.md` | Chronological sessions plus consolidated codebase patterns |
| `docs/ERROR_LOG.md` | Costly mistakes, root cause, correction, and prevention |
| `docs/LEARNED_KNOWLEDGE.md` | Confirmed reusable preferences and conventions |
| `docs/brd/`, `docs/prd/`, `docs/fsd/` | Authoritative delivery specifications; link, never duplicate |
| `docs/solutions/adr-####-<slug>.md` | Optional accepted architecture rationale |
| `docs/tasks/tasks-*.json` | Optional ledger for long or multi-agent work |
| `.scratch/<feature>/issues/*.md` | Local issue pointers for FSD goals |

## `STATE.md`

The canonical skeleton lives at `.agent/templates/state/STATE-Template.md`
(sections: Current Position, Active Loop Run, Decisions, Blockers, Completed
Work, Deferred Ideas). Copy it verbatim when seeding; do not restate it here.
The Active Loop Run section holds only a refreshable non-authoritative pointer:
run_id, run head digest, status snapshot, last evidence, reason, next transition.
When no loop run is active, that section collapses to the single line
`- Run: none`; Decisions, Blockers, Completed Work, and Deferred Ideas appear
only when non-empty.
The progress-log skeleton lives at `.agent/templates/state/Progress-Template.md`.

Refresh the pointer with `node .agent/tools/loop-run.mjs show --run <run_id>`.
Never copy lifecycle events, counters, an approval envelope, or a confirmation
digest into STATE. Writing `docs/STATE.md` requires the active source-write gate;
reading it does not. `START` or `RESUME` after a pause requires fresh human
confirmation.

## Error and learning records

The entry grammar (`## ERR-YYYY-MM-DD-NNN` / `## LRN-YYYY-MM-DD-NNN` headings,
their field lines, and the Quick Reference row) lives once in
`.agent/skills/knowledge-compounding/references/memory-capture.md` section 2 and
is enforced by `node .agent/tools/memory-maintenance.mjs check`. Do not restate
or fork it here; an entry without an ID is invisible to the tool.

At session end, update exact Next Action, completed outcomes, decisions, blockers, and owner. Suggest knowledge compounding for a reusable solution and pause workflow for later continuation.
