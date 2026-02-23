---
description: Generate a structured Product Requirements Document (PRD) for a feature. Use when planning a feature, starting a new project, or when requirements need formal specification. Sits between /brainstorm and /plan.
---

// turbo-all

# PRD Workflow

Generate a structured PRD that bridges brainstorming and planning.

## When to Use

- You have a feature idea but need formal specification
- You want to define scope, stories, and acceptance criteria before planning
- You need a clear handoff document for implementation

## When to Skip

- Requirements are already crystal clear → go directly to `/plan`
- You're exploring ideas without commitment → use `/brainstorm`
- You're executing an existing plan → use `/work`

## Steps

### 1. Check for Context
// turbo
Look for related brainstorm documents:
```
docs/brainstorms/*.md    (within last 14 days, matching topic)
docs/progress.md         (read Codebase Patterns section)
```

### 2. Invoke PRD Generator Skill

Load the `prd-generator` skill and run through its process:
1. Ask 3-5 clarifying questions with lettered options (A/B/C/D)
2. Generate structured PRD with: Introduction, Goals, User Stories, Functional Requirements, Non-Goals, Success Metrics
3. Validate with user

### 3. Save PRD

Save to: `docs/prd/prd-<feature-name>.md`

### 4. Present Next Steps

```
✓ PRD created: docs/prd/prd-<feature-name>.md

What next?
1. Proceed to planning → /plan (will auto-detect this PRD)
2. Review and refine the PRD
3. Done for now — return later
```

## Pipeline Position

```
/brainstorm → /prd → /plan → /work → /review → /compound
              ^^^^
         YOU ARE HERE
```

The `/plan` workflow will automatically detect and use recent PRDs from `docs/prd/`.
