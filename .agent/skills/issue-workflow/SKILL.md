---
name: issue-workflow
description: "Use when /sc-plan needs issue-ready vertical slices, local Markdown Kanban boards, Journey planning, PRD-to-issues breakdown, blocker DAGs, or multi-agent task contracts."
---

# Issue Workflow

## Purpose

Turn a PRD, plan, request, or resolved exploration into local Markdown issues that agents can pick up independently.

Announce: "I'm using the issue-workflow skill to create issue-ready vertical slices."

Default issue tracker:

```text
.scratch/<feature-slug>/
  PRD.md
  issues/
    01-<slug>.md
    02-<slug>.md
```

Use this from `/sc-plan`; do not add a separate public workflow.

## Process

### 1. Gather Source Context

Read the source material completely:

- User request and current conversation
- PRD under `docs/prd/` or `.scratch/<feature>/PRD.md`
- Existing plan under `docs/plans/`
- Relevant `CONTEXT.md`, ADRs, code, tests, and previous `.scratch/` boards

If the source is not already durable and the work needs an issue board, save a concise PRD or source summary as `.scratch/<feature-slug>/PRD.md`.

### 2. Draft Tracer Bullet Issues

Each issue must be a thin vertical slice:

- It delivers one narrow, complete user-visible or system-visible behavior.
- It can be demoed or verified on its own.
- It crosses the layers needed for that behavior, such as schema, API, UI, and tests.
- It is not a horizontal layer task like "build all database tables" or "build the entire frontend".

Use prefactoring issues only when they unlock later slices and are independently verifiable.

### 3. Build The Dependency DAG

For every issue, assign:

- `id`: temporary ID such as `I001`
- `title`: short slice title
- `blocked_by`: temporary IDs or `None`
- `user_stories`: PRD story IDs when available
- `verification`: exact checks or manual proof

Validate before publishing:

- Every blocker ID exists.
- Blockers come before dependents.
- No circular dependencies exist.
- Parallel candidates do not require the same unmerged files unless the conflict is intentional.

If there is a cycle, revise the breakdown before writing files.

### 4. Get Human Review

Before writing issue files, present the proposed board:

```markdown
| ID | Title | Blocked by | User stories | Verification |
|---|---|---|---|---|
| I001 | <title> | None | US-001 | <command/check> |
```

Ask whether the granularity and blocking relationships are correct. Revise until approved or clearly state any assumption if the user asked to proceed without review.

### 5. Publish Local Issues

Create issue files in dependency order so blockers receive lower numbers.

Issue template:

```markdown
# <Vertical Slice Title>
Status: ready-for-agent
Parent: ../PRD.md
Blocked by: None
User stories: US-001, US-002

## What To Build
<End-to-end behavior, not layer-by-layer implementation.>

## Acceptance Criteria
- [ ] <Observable criterion>

## Verification
- <Exact command or manual check>

## Notes
<Relevant constraints, decisions, or links.>

## Comments
```

For blocked issues, use relative issue paths in `Blocked by`, such as:

```text
Blocked by: 01-foundation-login-path.md, 02-account-permission-check.md
```

## Status Roles

Use these statuses in issue files:

- `needs-triage`: needs maintainer evaluation
- `needs-info`: waiting on more information
- `ready-for-agent`: fully specified and agent-ready
- `ready-for-human`: needs human judgment or access
- `wontfix`: will not be actioned
- `in-progress`: active work
- `done`: completed and verified

## Done Conditions

The output is complete when:

- `.scratch/<feature-slug>/PRD.md` exists or the parent source is linked.
- Every issue has `Status`, `Parent`, `Blocked by`, `User stories`, acceptance criteria, and verification.
- The dependency graph is acyclic.
- At least one issue has `Blocked by: None` unless the whole board is intentionally blocked.
- The user can pass one issue file to `/sc-work`.

## Related Skills

- `prd-generator` creates source requirements
- `writing-plans` routes Journey and issue-ready planning here
- `triage-workflow` handles incoming or stale issues
- `executing-plans` consumes one issue at a time
- `domain-modeling` and `codebase-design` improve terminology and seams
