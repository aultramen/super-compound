---
name: prd-generator
description: "Generate a structured Product Requirements Document (PRD) from an approved BRD before FSD planning."
---

# PRD Generator

## Purpose

Define observable product behavior, users, functional requirements, acceptance criteria, and product rules. A PRD sits between the BRD created by `/sc-explore` and the FSD created by `/sc-plan`.

Announce: "I'm using the prd-generator skill to create a structured PRD."

Save to `docs/prd/prd-<feature-name>.md`. Use `.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md` as the full reference template when a durable PRD is created.

## Inputs

Before writing:

- Read the approved BRD under `docs/brd/`, relevant `docs/brainstorms/`, existing `docs/prd/`, and current conversation context.
- Check `docs/progress.md`, `docs/STATE.md`, accepted ADRs in `docs/solutions/`, and domain notes when present.
- For UI work, reuse `interface-design` findings or existing design-system artifacts.
- If an existing PRD covers the topic, ask whether to revise or create a new PRD.
- Use `domain-modeling` when names, roles, or glossary terms are fuzzy.
- Use `codebase-design` when testing seams or module interfaces must be agreed before the PRD is reliable.
- Use qualified BRD references such as `BRD-CCC#BREQ-001`; do not copy BRD paragraphs into the PRD when an ID reference is enough.

## Clarifying Questions

Ask 3-5 essential questions only when the answer is not already known.

Prefer lettered options:

```text
1. What is the initial scope?
A. Minimal viable version
B. Full workflow
C. Backend/API only
D. Frontend/UI only
E. Other
```

Focus on:

- Problem and target user
- Core user actions
- Success criteria
- Non-goals
- Constraints, risks, and edge cases
- BRD acceptance and policy decisions that must remain unchanged

If the user asks to synthesize the current thread, write from known context and place remaining uncertainty under `Open Questions`.

## Required PRD Sections

For full agentic delivery, follow the PRD template. For small features, include at minimum:

- Metadata, source BRD IDs, and approver
- Problem, objective, outcome, metric, scope, and non-goals
- Actors, permission intent, canonical rules, state semantics, features, requirements, and acceptance criteria
- Negative, failure, degraded, security, privacy, compliance, AI, dependency, risk, and open-item decisions
- UAT, release gate, traceability, and FSD handoff manifest

The compact shape below is acceptable only when the missing template sections are explicitly `N/A` or out of scope:

```markdown
# <Feature> PRD

## Overview
<Problem, target user, and proposed capability.>

## Goals
- <measurable goal>

## Non-Goals
- <explicitly out of scope>

## User Stories
### US-001: <title>
As a <user>, I want <capability> so that <benefit>.

Acceptance Criteria:
- [ ] <specific, verifiable behavior>

## Functional Requirements
- FR-1: <specific system behavior>

## UX And Content Notes
<Only when UI/user interaction is involved.>

## Technical Constraints
<Known product constraints inherited from BRD or repository behavior. Do not define new schema, database, or internal architecture here.>

## Testing Decisions
<Public interfaces, seams, or behavior checks that should verify the feature.>

## Security, Privacy, And Compliance
<Only when relevant.>

## Success Metrics
- <observable metric or outcome>

## Open Questions
- <unresolved question or "None">
```

## Story Sizing

Each story should fit one focused implementation session.

Split stories when:

- They span unrelated user roles
- They require unrelated systems
- They have different release risks
- They need separate verification strategies
- The acceptance criteria cannot be reviewed at once

Prefer vertical user value over horizontal layer work.

## Validation

Before handoff, check:

- Every goal maps to at least one story or requirement
- Every story has concrete acceptance criteria
- Non-goals prevent likely scope creep
- UI stories include accessibility and responsive expectations
- Data/security/privacy stories include negative cases
- Testing decisions name the highest practical public seam
- Open questions are real `OPEN-*` blockers, not vague reminders
- The PRD does not invent business policy beyond the BRD or technical implementation beyond repository constraints

## Handoff

After saving the PRD:

1. Review and refine the PRD
2. Convert to an FSD with `/sc-plan`
3. Convert FSD goals to local issue pointers with `/sc-plan --issues <prd>` when work needs a Journey, Kanban board, or multi-agent slices
4. Route UI-focused work through `/sc-ui`
5. Stop with the PRD saved

Current specification pipeline: `/sc-explore` -> BRD -> `/sc-prd` -> PRD -> `/sc-plan` -> FSD and goals -> `/sc-work`.

## Related Skills

- `brainstorming` provides upstream exploration
- `agentic-delivery` defines BRD -> PRD -> FSD -> GOAL traceability
- `interface-design` provides UI and design-system guidance
- `writing-plans` converts the PRD into an FSD
- `issue-workflow` converts FSD goals into issue-ready pointers
- `domain-modeling` keeps glossary terms precise
- `codebase-design` shapes testing seams
- `plan-verification` checks plan coverage against the PRD
