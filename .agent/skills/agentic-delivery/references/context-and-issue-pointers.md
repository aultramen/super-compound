# Context and Issue Pointers

## Summary

Keep goal issues as compact execution pointers to authority and verified evidence.

## Zero Context Bloat Rules

Goal issue files under `.scratch/<feature>/issues/` are pointers, not copied specifications.

Issue files must not duplicate paragraphs from BRD, PRD, FSD, or ADR. They may include:

- status and goal metadata
- parent FSD path
- qualified upstream references
- blocker and dependency paths
- verification command references or command names
- pinned completion contract path/digest and actual evidence locators
- pinned contract refs and the required contract gate
- stop-condition notes
- concise implementation boundaries from the FSD by ID, not copied prose

For UI-integrated goals, `Contract refs` points to qualified versioned
`CONTRACT-*`, `UIMAP-*`, `SCHEMA-*`, and fixture refs as needed. `Contract gate`
is `NOT_APPLICABLE`, `READY_FOR_SLICE`, or
`FIRST_VERTICAL_SLICE_VERIFIED`. Never copy schema, mapping tables, or behavior
prose into the pointer. Promote an issue to `ready-for-agent` only after its
required gate is proven. Networked scale-out additionally requires a `VALIDATED`
PRD baseline; its applicable final `HARDENING` pointer depends on the UI slices.
LOCAL_ONLY records local behavior/accessibility proof within the existing goal;
use a separate hardening pointer only for outstanding merged/cross-slice checks.

Completion snapshots derive the full goal/requirement/AC checklist from the
authoritative request/FSD before results. Issue `done`/`verified` requires actual
outcome evidence for all criteria per `verification-before-completion`; completed
steps and historical status metadata do not prove the current goal. The pointer
links evidence and the contract rather than copying criteria or report prose.

During `/sc-work`, use `context-engineering` to load only the issue, parent FSD sections, referenced PRD/BRD IDs, linked accepted ADRs, and directly relevant repository files.

## Goal Issue Pointer Shape

Use the canonical
`.agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md` for
`.scratch/<feature>/issues/<NN>-<slug>.md`. The skeleton owns field names and
the compact execution contract; this skill owns their meaning.

Allowed statuses:

- `needs-triage`
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `blocked`
- `in-progress`
- `done`
- `verified`
- `wontfix`
