# PRD Authoring

## Gather evidence

Read the approved `docs/brd/` artifact, relevant `docs/brainstorms/`, existing `docs/prd/`, and current conversation. Search `docs/progress.md`, `docs/STATE.md`, accepted ADRs or solution records, and domain notes when present. For UI work, reuse `interface-design` findings and the existing design system.

Use `domain-modeling` when actors, roles, or glossary terms are ambiguous. Use `codebase-design` only when public seams or module boundaries must be understood for testable product requirements.

For unresolved decisions use the whole-frontier protocol in `brainstorming/references/questions-and-options.md`; preserve approved BRD decisions and route any change upstream. If asked to synthesize known context, draft it and place remaining uncertainty under Open Questions.

## Required coverage

A full agentic PRD covers metadata, source IDs, approver, problem, objective, outcome, metric, scope, non-goals, actors, permission intent, canonical rules, state semantics, features, requirements, acceptance criteria, failure/degraded behavior, security, privacy, compliance, AI, dependencies, risks, UAT, release gate, traceability, and FSD handoff.

For a small feature, a compact PRD may use:

```markdown
# <Feature> PRD

## Metadata and Source BRD
## Overview
## Goals and Success Metrics
## Non-Goals
## Actors and User Stories
### US-001: <title>
As a <user>, I want <capability> so that <benefit>.
- [ ] <specific acceptance behavior>
## Functional Requirements
## UX and Content Notes
## Known Product Constraints
## Testing Decisions
## Security, Privacy, and Compliance
## Risks and Dependencies
## Open Questions
## Traceability and FSD Handoff
```

Mark omitted full-template sections explicitly `N/A` or out of scope. Testing decisions name the highest practical public behavior or seam; they do not prescribe internal design.

For product AI runtime, load [AI context and output](ai-context-and-output.md) for selected-context product decisions and acceptance.
