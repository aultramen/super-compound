# File Contracts

## Summary

Select only needed memory artifacts. The authorized owning route checkpoints
position and evidence; read-only routes return findings to that writer.

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
(sections: Current Position, Decisions, Blockers, Completed Work, Deferred
Ideas). Copy it verbatim when seeding; do not restate it here. Decisions,
Blockers, Completed Work, and Deferred Ideas appear only when non-empty.
The progress-log skeleton lives at `.agent/templates/state/Progress-Template.md`.

The authorized owning route checkpoints the Next action automatically before
compaction or handoff and continues authorized work. Read-only routes return
evidence to that writer. `/sc-pause` is for actual stopping. The next session
verifies STATE against the tree with `/sc-status` before acting on it.

Before writing a new completed/verified outcome, apply
`verification-before-completion/SKILL.md` and the local evidence gate. Record
qualified goal/requirement/AC refs, pinned completion contract/digest and evidence
locators; link the **Evidence of Completion** report instead of copying output.
Missing/partial/failed proof stays in Current Position with an accurate human
status and next action. Historical Completed Work remains history and cannot
establish fresh completion or release a new dependency without valid proof.

## `.continue-here.md`

Keep these pointer lines; a tool-managed sc-checkpoint block may follow:

```markdown
# Continue Here
## Summary
Continue the recorded work from its authoritative state and next action.

- State: docs/STATE.md
- Next action: <one executable step or /sc-status>
- Authoritative artifacts: <paths>
- Completion evidence: <contract/digest and evidence locators, or unavailable>
```

## Error and learning records

The entry grammar (`## ERR-YYYY-MM-DD-NNN` / `## LRN-YYYY-MM-DD-NNN` headings,
their field lines, and the Quick Reference row) lives once in
`.agent/skills/knowledge-compounding/references/memory-capture.md` section 2 and
is enforced by `node .agent/tools/memory-maintenance.mjs check`. Do not restate
or fork it here; an entry without an ID is invisible to the tool.

At session end, update exact Next Action, completed outcomes, decisions, blockers, and owner. Suggest knowledge compounding for a reusable solution and pause workflow for later continuation.
