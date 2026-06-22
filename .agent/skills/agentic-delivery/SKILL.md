---
name: agentic-delivery
description: "Use for the Super Compound BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION delivery path, artifact traceability, FSD authority, optional ADR handling, zero context bloat issue slicing, and OPEN-* stop conditions."
---

# Agentic Delivery

## Purpose

Keep product delivery artifact-driven, traceable, and light on agent context. This skill is the central authority for the canonical Super Compound delivery path:

```text
BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION
```

Announce: "I'm using the agentic-delivery skill to follow the BRD -> PRD -> FSD -> GOAL delivery path."

## Reference Templates

Use the full templates only when creating or reviewing their artifact. Do not paste template content into workflow files, startup files, or goal issues.

```text
.agent/templates/agentic-delivery/BRD-Agentic-Ready-Reusable-Template.md
.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md
.agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md
.agent/templates/agentic-delivery/ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md
```

## Artifact Outputs

| Workflow | Primary Output | Location | Must Consume |
|---|---|---|---|
| `/sc-explore` | BRD | `docs/brd/brd-<feature>.md` | user request, evidence, business context |
| `/sc-prd` | PRD | `docs/prd/prd-<feature>.md` | approved BRD |
| `/sc-plan` | FSD plus goal issues | `docs/fsd/fsd-<feature>.md` and `.scratch/<feature>/issues/*.md` | approved PRD |
| `/sc-work` | implementation and verification evidence | source tree plus updated issue status | approved FSD goal issue |

`/sc-plan` may still produce a short companion execution note only when useful, but the FSD is the implementation authority.

## Authority And Precedence

1. User/system/developer instructions.
2. Approved BRD for business objectives, policies, and business acceptance.
3. Approved PRD for user experience, observable product behavior, product rules, and acceptance criteria.
4. Approved FSD for technical implementation contracts, data/API/UI/job/security details, tests, goals, and execution boundaries.
5. Linked `ACCEPTED` ADRs only for delegated architecture decisions.
6. Repository conventions for ordinary choices not specified by the FSD.

A coding agent must not invent schema, APIs, authorization, state transitions, workflows, product behavior, roles, or architecture outside the approved FSD and linked accepted ADRs.

## ADR Policy

ADR is optional and conditional. Prefer embedded FSD `TDEC-*` records for project-local technical decisions.

Create or link an ADR only when the decision is cross-system, high-risk, costly to reverse, security/privacy-sensitive, platform-level, vendor-locking, recurring-cost material, or explicitly required by policy.

Linked ADR rules:

- Store linked ADRs under `docs/solutions/adr-####-<slug>.md`.
- Use the optional ADR template.
- The ADR must be `ACCEPTED`, not deprecated or superseded, before a dependent goal can be `ready-for-agent`.
- The FSD must set `adr_applicability: LINKED`, reference the ADR, and translate implementation obligations into FSD contracts.

When ADR is not required:

- Set `adr_applicability: NOT_REQUIRED` in the FSD.
- Capture material technical decisions in the FSD Technical Decision Register as approved `TDEC-*`.

## Qualified References

Cross-artifact references must be qualified:

```text
BRD-CCC#BREQ-001
PRD-CCC#FR-014
PRD-CCC#AC-002
FSD-CCC#TDEC-003
FSD-CCC#GOAL-001
ADR-0042#DEC-001
```

Do not use bare `FR-001`, `BR-001`, or `GOAL-001` across artifact boundaries when ambiguity is possible.

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

Use this shape for `.scratch/<feature>/issues/<NN>-<slug>.md`:

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
- Report blockers as `OPEN-xxx` with missing decision, impacted refs, reason, owner or gate when known, and approved fallback if one exists.

## Comments
```

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

## OPEN-* Stop Conditions

Stop and report `OPEN-xxx` instead of inventing a solution when:

- approved BRD, PRD, FSD, or ADR requirements conflict without precedence
- required FSD authority is missing
- a required ADR is absent, not accepted, deprecated, superseded, or out of scope
- a goal needs schema/API/auth/workflow/role/state behavior not in the FSD
- repository architecture materially contradicts the FSD
- required secret, account, environment, license, or sandbox is unavailable and no approved fallback exists
- security, privacy, compliance, audit, or data-integrity obligations cannot be met in allowed scope

An `OPEN-xxx` report must include:

```text
OPEN-001
Missing decision: <question>
Impacted refs: <qualified IDs>
Reason: <why implementation cannot proceed safely>
Owner/gate: <role/date/gate if known>
Approved fallback: <fallback or None>
Status: OPEN
```

## Workflow Integration

- `/sc-explore`: use `brainstorming` and this skill; output BRD or BRD summary, then route to `/sc-prd`.
- `/sc-prd`: use `prd-generator` and this skill; consume BRD, output PRD, then route to `/sc-plan`.
- `/sc-plan`: use `writing-plans`, `issue-workflow`, `plan-verification`, and this skill; consume PRD, output FSD plus goal issue pointers.
- `/sc-work`: use `executing-plans`, `context-engineering`, `test-driven-development`, and `verification-before-completion`; execute only referenced approved FSD goals.

## Related Skills

- `brainstorming` for BRD exploration
- `prd-generator` for PRD creation
- `writing-plans` for FSD planning and delivery sequencing
- `issue-workflow` for goal issue pointers
- `context-engineering` for dynamic reference loading
- `executing-plans` for implementation
- `plan-verification` and `verification-before-completion` for gates
