# Memory Capture

Use this branch for cheap one-liner capture of costly mistakes (`ERR-*`) and
confirmed conventions (`LRN-*`). A full `docs/solutions/` record is for solved
problems; these are lightweight IF-THEN rules that cost one Quick Reference
row plus a short entry. When the alternative is the full format or nothing,
choose this branch over nothing.

## 1. Detect the trigger

| Trigger | Capture as | File |
| --- | --- | --- |
| Runtime error caused by agent-written code | `ERR-*` | `docs/ERROR_LOG.md` |
| Failed test caused by agent logic | `ERR-*` | `docs/ERROR_LOG.md` |
| Wrong assumption about an API, path, or behavior | `ERR-*` | `docs/ERROR_LOG.md` |
| Hallucinated file or symbol | `ERR-*` | `docs/ERROR_LOG.md` |
| Explicit user correction | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |
| Stated user preference | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |
| Confirmed reusable convention | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |
| Steering instruction that never changed behavior (no-op; deletion saves tokens) | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |
| Tool call or CLI that was expensive or repeated for no gain (tool economy) | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |
| Information the agent needed but could not reach (information access) | `LRN-*` | `docs/LEARNED_KNOWLEDGE.md` |

Skip typos, transient noise, and anything an existing entry already covers;
update the matching entry instead of duplicating it.

## 2. Write the entry

The authoritative contract is
`.agent/skills/state-management/references/file-contracts.md`; do not fork the
format. Append the entry to its file, newest last:

```markdown
## ERR-YYYY-MM-DD-NNN - <error category>
- Symptom: <observed failure, exact error text>
- Root cause: <why>
- Correct approach: <verified correction>
- Prevention: IF <condition> THEN <bounded action>
- Files: <paths involved>
```

```markdown
## LRN-YYYY-MM-DD-NNN - <learning topic>
- Learning: <confirmed pattern>
- Confidence: confirmed | observed | inferred
- Applies to: <scope: global | project | framework>
- Action rule: IF <condition> THEN <action>
- Source: <user statement | repeated observation | verified experiment>
```

Keep each field to one line; no narrative paragraphs.

Global scope: when `SC_GLOBAL_KNOWLEDGE_DIR` is set, an `Applies to: global`
`LRN-*` entry (with its Quick Reference row) is also appended to
`$SC_GLOBAL_KNOWLEDGE_DIR/LEARNED_KNOWLEDGE.md`; seed that file once by copying
the header of `docs/LEARNED_KNOWLEDGE.md`. `knowledge-search.mjs` reads it back
in every repository that sets the variable. A failed global write never blocks
the local capture.

## 3. Update the Quick Reference table

Every entry also gets exactly one row in its file's Quick Reference table,
newest first: ID, category or scope, confidence for `LRN-*`, and the IF-THEN
rule. Future sessions read the table first; an entry without a row is
invisible.

## 4. Promote recurrences

When one category or prevention rule recurs 3+ times at `observed` or
`confirmed` confidence, flag it `PATTERN` and route it to `/sc-evolve` for a
draft framework proposal. Proposals stay drafts; a human approves any
framework change.

## 5. Respect the caps

- `docs/LEARNED_KNOWLEDGE.md`: 30 entries or ~30 KB.
- `docs/ERROR_LOG.md`: 50 entries or ~50 KB.

On overflow, first consolidate duplicate root causes into one entry
(`Consolidated from: ERR-...`), then move superseded, lowest-confidence, or
oldest resolved entries to the knowledge/error archive files under
`docs/archive/` (created on first archive). Archive, never delete.
