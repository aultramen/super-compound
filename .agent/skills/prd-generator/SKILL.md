---
name: prd-generator
description: "Generate a structured Product Requirements Document (PRD) from a rough idea, prior exploration, or current conversation before implementation planning."
---

# PRD Generator

## Purpose

Define what to build, why it matters, who it serves, and how completion will be judged. A PRD sits between `/sc-explore` and `/sc-plan`.

Announce: "I'm using the prd-generator skill to create a structured PRD."

Save to `docs/prd/prd-<feature-name>.md`.

## Inputs

Before writing:

- Read relevant `docs/brainstorms/`, existing `docs/prd/`, and current conversation context.
- Check `docs/progress.md`, `docs/STATE.md`, ADRs, and domain notes when present.
- For UI work, reuse `interface-design` findings or existing design-system artifacts.
- If an existing PRD covers the topic, ask whether to revise or create a new PRD.

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

If the user asks to synthesize the current thread, write from known context and place remaining uncertainty under `Open Questions`.

## Required PRD Sections

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
<Known dependencies, integration points, data contracts, or constraints.>

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
- Open questions are real blockers, not vague reminders

## Handoff

After saving the PRD:

1. Review and refine the PRD
2. Convert to an implementation plan with `/sc-plan`
3. Route UI-focused work through `/sc-ui`
4. Stop with the PRD saved

Current specification pipeline: `/sc-explore` -> `/sc-prd` -> `/sc-plan` -> `/sc-work`.

## Related Skills

- `brainstorming` provides upstream exploration
- `interface-design` provides UI and design-system guidance
- `writing-plans` converts the PRD into implementation tasks
- `plan-verification` checks plan coverage against the PRD
