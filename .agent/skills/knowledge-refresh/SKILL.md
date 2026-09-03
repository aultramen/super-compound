---
name: knowledge-refresh
description: "Use when the knowledge store may have drifted from the codebase, after a learning contradicts an older record, or on periodic maintenance. Not for capturing a new learning or solution; that is knowledge-compounding."
---

# Knowledge Refresh

Audit `docs/solutions/**` against the current repository so stored knowledge
stays true. Announce use before changing any record.

## When to Use

Use when a new learning contradicts an existing record, when `/sc-compound`
flags moderate-overlap consolidation debt, or when the store has not been
audited for a long period. Not for writing new learnings - that is
`knowledge-compounding`.

## Procedure

1. Enumerate records: `node .agent/tools/knowledge-search.mjs "<area>" --dir docs/solutions --limit 10 --json`, or list the category directory directly for a full audit.
2. For each record, verify its claims against the current tree with `node .agent/tools/validate-doc-claims.mjs <record>`.
3. Assign exactly one action per record:

| Action | When |
| --- | --- |
| Keep | Claims still grounded; guidance still correct |
| Update | Core insight correct; details drifted (paths, versions, commands) |
| Consolidate | 2+ records share one root cause; merge into the strongest and cross-link |
| Replace | Root cause reassessed; write the corrected record, mark old `SUPERSEDED by <ref>` |
| Delete | Actively harmful or duplicated with zero retrieval value; check inbound links first |

## Judgment Rules

- Match records to reality, never reality to records.
- Age alone is not staleness; unverifiable is not false.
- Ambiguity gets `status: stale` plus `stale_reason:` and `stale_date:` in frontmatter, not a guessed action.
- Consolidation must pass the retrieval test: would one merged record surface for every query the originals served?
- Never delete a record another record links to substantively; downgrade to Update or Replace.

## Red Flags

- Bulk-deleting by age.
- Rewriting a record to match a hypothesis instead of verified current behavior.
- Consolidating records with different root causes because their symptoms rhyme.

## Integration

Fed by `knowledge-compounding` (contradiction discovered while writing a new
record), `/sc-evolve` (a promotion candidate contradicts a record), and `/sc-audit`. Report actions taken per record, then return to the
active workflow.
