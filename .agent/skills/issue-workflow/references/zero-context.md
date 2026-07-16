## Zero Context Bloat Rule

Issue files are references, not specifications. They must contain only:

- status and goal metadata
- parent FSD path
- qualified BRD/PRD/FSD/ADR references
- dependency and blocker paths
- verification references or exact commands by ID
- UI delivery role, pinned contract refs/version, and required contract gate
- concise stop-condition notes

Do not copy paragraphs, tables, schemas, mappings, decision rationale,
requirement text, or acceptance criteria from BRD, PRD, FSD, or ADR into issue
files.
