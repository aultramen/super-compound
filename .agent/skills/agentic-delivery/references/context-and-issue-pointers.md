## Zero Context Bloat Rules

Goal issue files under `.scratch/<feature>/issues/` are pointers, not copied specifications.

Issue files must not duplicate paragraphs from BRD, PRD, FSD, or ADR. They may include:

- status and goal metadata
- parent FSD path
- qualified upstream references
- blocker and dependency paths
- verification command references or command names
- stop-condition notes
- concise implementation boundaries from the FSD by ID, not copied prose

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
