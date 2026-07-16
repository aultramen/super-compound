## Zero Context Bloat Rules

Goal issue files under `.scratch/<feature>/issues/` are pointers, not copied specifications.

Issue files must not duplicate paragraphs from BRD, PRD, FSD, or ADR. They may include:

- status and goal metadata
- parent FSD path
- qualified upstream references
- blocker and dependency paths
- verification command references or command names
- pinned contract refs and the required contract gate
- stop-condition notes
- concise implementation boundaries from the FSD by ID, not copied prose

For UI-integrated goals, `Contract refs` points to qualified versioned
`CONTRACT-*`, `UIMAP-*`, `SCHEMA-*`, and fixture refs as needed. `Contract gate`
is `NOT_APPLICABLE`, `READY_FOR_SLICE`, or
`FIRST_VERTICAL_SLICE_VERIFIED`. Never copy schema, mapping tables, or behavior
prose into the pointer. Promote an issue to `ready-for-agent` only after its
required gate is proven. Scale-out additionally requires a `VALIDATED` PRD
baseline; the final `HARDENING` pointer depends on all applicable UI slices.

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
