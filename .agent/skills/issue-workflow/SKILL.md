---
name: issue-workflow
description: "Use when /sc-plan needs FSD GOAL-* packets turned into lightweight issue pointers, local Markdown Kanban boards, blocker DAGs, or multi-agent task contracts."
---

# Issue Workflow

## Purpose

Turn approved FSD `GOAL-*` packets into local Markdown issue pointers that agents can pick up independently without copying BRD, PRD, FSD, or ADR prose.

Announce: "I'm using the issue-workflow skill to create lightweight goal issue pointers."

Default issue tracker:

```text
.scratch/<feature-slug>/
  FSD.md              # optional pointer or short index, not a copied FSD
  issues/
    01-<slug>.md
    02-<slug>.md
```

Use this from `/sc-plan`; do not add a separate public workflow.

## Zero Context Bloat Rule

Issue files are references, not specifications. They must contain only:

- status and goal metadata
- parent FSD path
- qualified BRD/PRD/FSD/ADR references
- dependency and blocker paths
- verification references or exact commands by ID
- concise stop-condition notes

Do not copy paragraphs, tables, decision rationale, requirement text, or acceptance criteria from BRD, PRD, FSD, or ADR into issue files.

## Process

### 1. Gather Source Context

Read the source material needed to slice safely:

- Approved FSD under `docs/fsd/`
- Upstream PRD and BRD IDs referenced by the FSD
- Linked accepted ADRs under `docs/solutions/adr-####-<slug>.md`, if any
- Relevant `CONTEXT.md`, code, tests, and previous `.scratch/` boards

If a local board needs a parent file, create `.scratch/<feature-slug>/FSD.md` as a short pointer to `docs/fsd/fsd-<feature>.md`, not a copy of the FSD.

### 2. Draft Goal Issue Pointers

Each issue must point to one `FSD-<PROJECT>#GOAL-xxx` packet that:

- produces one coherent, independently verifiable outcome
- has explicit requirement and acceptance references
- lists dependencies and no hidden prerequisite
- bounds allowed and prohibited scope in the FSD
- states data/API/UI/job/security impact in the FSD
- includes verification references or exact commands
- has no unresolved blocker

Use foundational goals only for contracts, migrations, adapters, or infrastructure that are independently testable.

### 3. Build The Dependency DAG

For every issue, assign:

- `id`: the FSD goal ID such as `GOAL-001`
- `title`: short atomic outcome title
- `blocked_by`: issue paths or `None`
- `upstream_refs`: qualified BRD/PRD/FSD refs
- `technical_refs`: `FSD-*#TDEC-*` refs when relevant
- `adr_refs`: linked `ADR-*#DEC-*` refs or `None`
- `verification_refs`: FSD test or command IDs

Validate before publishing:

- Every blocker path exists or will be created earlier.
- Blockers come before dependents.
- No circular dependencies exist.
- Parallel candidates do not require the same unmerged files unless the FSD states an integration strategy.
- Every ADR ref points to an accepted linked ADR.

If there is a cycle, missing authority, or unresolved decision, revise the FSD or create an `OPEN-*` blocker before writing ready issues.

### 4. Get Human Review

Before writing issue files, present the proposed board:

```markdown
| Goal | Title | Blocked by | Upstream refs | Technical refs | Verification refs |
|---|---|---|---|---|---|
| GOAL-001 | <title> | None | PRD-CCC#FR-001 | FSD-CCC#TDEC-001 | FSD-CCC#TEST-001 |
```

Ask whether the granularity and blocking relationships are correct. Revise until approved or clearly state any assumption if the user asked to proceed without review.

### 5. Publish Local Issues

Create issue files in dependency order so blockers receive lower numbers.

Issue template:

```markdown
# GOAL-001 - <Atomic Outcome>
Status: ready-for-agent
Parent FSD: ../../../docs/fsd/fsd-<feature>.md
Goal ID: FSD-<PROJECT>#GOAL-001
Blocked by: None
Upstream refs: BRD-<PROJECT>#BREQ-001, PRD-<PROJECT>#FR-001, PRD-<PROJECT>#AC-001
Technical refs: FSD-<PROJECT>#TDEC-001
ADR refs: None
Verification refs: FSD-<PROJECT>#TEST-001

## Outcome
Implement the atomic outcome defined by `FSD-<PROJECT>#GOAL-001`.

## Scope Pointers
- Allowed scope: see `FSD-<PROJECT>#GOAL-001`.
- Prohibited scope: see `FSD-<PROJECT>#GOAL-001`.

## Execution Contract
- Read the parent FSD and every qualified reference before editing.
- Do not create behavior outside the referenced FSD goal.
- Stop on any unresolved blocker or missing authority.

## Verification
- Run the commands listed by `FSD-<PROJECT>#GOAL-001` and `FSD-<PROJECT>#TEST-001`.

## Stop Conditions
- Report blockers as `OPEN-xxx` with missing decision, impacted refs, reason, owner/gate when known, and approved fallback if one exists.

## Comments
```

For blocked issues, use relative issue paths in `Blocked by`, such as:

```text
Blocked by: 01-contract-and-schema.md, 02-domain-behavior.md
```

If a goal is blocked by a missing decision, set `Status: blocked` and include an `OPEN-*` record in `## Stop Conditions`.

## Status Roles

Use these statuses in issue files:

- `needs-triage`: needs maintainer evaluation
- `needs-info`: waiting on more information
- `ready-for-agent`: fully specified and agent-ready
- `ready-for-human`: needs human judgment, access, or approval
- `blocked`: blocked by unresolved `OPEN-*`, missing FSD authority, or unavailable required access
- `in-progress`: active work
- `done`: completed and verified by task-level checks
- `verified`: completion evidence reviewed against the FSD
- `wontfix`: will not be actioned

## Done Conditions

The output is complete when:

- `.scratch/<feature-slug>/FSD.md` exists as a pointer or the issue files link directly to the parent FSD.
- Every issue has `Status`, `Parent FSD`, `Goal ID`, `Blocked by`, qualified refs, verification refs, and stop conditions.
- The dependency graph is acyclic.
- At least one issue has `Blocked by: None` unless the whole board is intentionally blocked.
- Issue files do not duplicate BRD, PRD, FSD, or ADR prose.
- The user can pass one issue file to `/sc-work`.

## Related Skills

- `agentic-delivery` defines artifact authority and zero context bloat rules
- `prd-generator` creates source product requirements
- `writing-plans` creates the FSD and `GOAL-*` packets
- `triage-workflow` handles incoming or stale issues
- `executing-plans` consumes one goal issue pointer at a time
- `context-engineering` loads referenced sources dynamically during execution
