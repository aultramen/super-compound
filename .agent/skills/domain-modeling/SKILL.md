---
name: domain-modeling
description: "Use when work needs shared domain language, CONTEXT.md updates, ADR decisions, glossary cleanup, or terminology checks during exploration, PRDs, triage, planning, architecture, or issue shaping."
---

# Domain Modeling

## Purpose

Keep domain language precise and durable so agents use the same words as the project.

Announce: "I'm using the domain-modeling skill to align domain language."

## Files

Use the simplest layout that fits the project:

```text
CONTEXT.md
docs/adr/
```

For monorepos or multiple bounded contexts, use:

```text
CONTEXT-MAP.md
<context>/CONTEXT.md
<context>/docs/adr/
```

Create files only when there is something real to record.

## Process

### 1. Read Existing Language

Before changing language, read the relevant `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs.

If no domain docs exist, infer terms from code, tests, PRDs, issues, and user language.

### 2. Challenge Fuzzy Terms

Call out overloaded or conflicting terms immediately:

- "Does account mean customer account or login identity?"
- "The glossary says cancellation is order-level, but this story mentions item-level cancellation. Which is true?"

Use concrete scenarios to force clarity.

### 3. Update The Glossary Inline

When a term is resolved, update `CONTEXT.md` immediately.

Use this shape:

```markdown
## <Term>

<Concise definition.>

_Avoid_: <synonyms or misleading terms>
```

Keep `CONTEXT.md` free of implementation details. It is a glossary, not a PRD, scratchpad, or design document.

### 4. Record ADRs Sparingly

Offer an ADR only when the decision is:

- Hard to reverse
- Surprising without context
- A real tradeoff between plausible options

Use this shape:

```markdown
# ADR-0001: <Decision>

## Status
Accepted

## Context
<Why this decision exists.>

## Decision
<What was chosen.>

## Consequences
- <Positive or negative consequence>
```

## Integration

Use this skill from:

- `/sc-explore` for domain alignment and strategy
- `/sc-prd` for story and requirement vocabulary
- `/sc-plan` and `issue-workflow` for issue titles and acceptance criteria
- `triage-workflow` for incoming requests
- `codebase-design` for naming seams and deep modules
