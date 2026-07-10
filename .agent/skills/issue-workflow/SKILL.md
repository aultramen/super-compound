---
name: issue-workflow
description: "Use when /sc-plan needs FSD GOAL-* packets turned into lightweight issue pointers, local Markdown Kanban boards, blocker DAGs, or multi-agent task contracts."
---

# Issue Workflow

## Purpose

Turn approved FSD `GOAL-*` packets into local Markdown issue pointers that agents can execute independently without copying upstream prose.

Announce: "I'm using the issue-workflow skill to create lightweight goal issue pointers."

The default board is `.scratch/<feature-slug>/issues/*.md`; an optional `.scratch/<feature-slug>/FSD.md` is only a short pointer to the approved FSD. Use this from `/sc-plan`, not a separate public workflow.

## Reference Router

- Allowed pointer content and prohibited duplication: [zero-context contract](references/zero-context.md)
- Source gathering, goal slicing, DAG construction, human review, and publishing: [process](references/process.md)
- Status meanings and board completion checks: [status and done](references/status-and-done.md)

Load the process while creating or revising a board. Load status details only when assigning or reviewing state.

## Mandatory Gates

- **Pointer gate:** Issue files are references, not specifications. Keep only status/goal metadata, parent FSD path, qualified refs, dependency paths, verification refs or commands, and concise stop notes. Never copy BRD, PRD, FSD, or ADR paragraphs, tables, rationale, requirements, or acceptance criteria.
- **Authority gate:** Each issue points to one approved `FSD-<PROJECT>#GOAL-xxx` with explicit upstream, technical, ADR, scope, impact, and verification authority. Missing authority creates an `OPEN-*` blocker, not inferred behavior.
- **Sizing gate:** One issue produces one coherent, independently verifiable outcome. Foundational goals are allowed only when independently testable and necessary.
- **DAG gate:** Every blocker path must exist or be created earlier; blockers precede dependents; cycles are forbidden; parallel candidates must not share unmerged files without an FSD integration strategy. Every ADR ref must be linked and `ACCEPTED`.
- **Review gate:** Present the proposed board and blocking relationships before writing files. Revise with the user, or state assumptions only when explicitly asked to proceed without review.
- **Skeleton gate:** Create each pointer from `.agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md`. Do not restate the template. Populate qualified references, dependency paths, and concise goal-specific boundaries only.
- **Ready gate:** `ready-for-agent` requires no unresolved blocker. Missing decisions use `Status: blocked` plus an `OPEN-*` record under stop conditions.
- **Done gate:** The board must be acyclic, expose at least one unblocked issue unless intentionally blocked, link every required field, avoid duplicated prose, and allow one issue path to be handed to `/sc-work`.

## Related Skills

Use `agentic-delivery` for authority, `writing-plans` for FSD goals, `triage-workflow` for incoming issues, `executing-plans` for one pointer, and `context-engineering` for selective source loading.
