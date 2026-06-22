---
name: domain-modeling
description: "Use when work needs shared domain language, CONTEXT.md updates, conditional ADR decisions, glossary cleanup, or terminology checks during BRD, PRD, FSD, triage, architecture, or goal shaping."
---

# Domain Modeling

## Purpose

Keep domain language precise and durable so agents use the same words as the project.

Announce: "I'm using the domain-modeling skill to align domain language."

## Files

Use the simplest layout that fits the project:

```text
CONTEXT.md
docs/solutions/adr-####-<slug>.md
```

For monorepos or multiple bounded contexts, use:

```text
CONTEXT-MAP.md
<context>/CONTEXT.md
docs/solutions/adr-####-<context>-<slug>.md
```

Create files only when there is something real to record.

## Process

### 1. Read Existing Language

Before changing language, read the relevant `CONTEXT.md`, `CONTEXT-MAP.md`, FSD Technical Decision Register entries, and linked accepted ADRs.

If no domain docs exist, infer terms from code, tests, BRDs, PRDs, FSDs, goal issues, and user language.

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

Keep `CONTEXT.md` free of implementation details. It is a glossary, not a BRD, PRD, FSD, scratchpad, or design document.

### 4. Record Technical Decisions Sparingly

Default to an FSD `TDEC-*` record for project-local technical decisions. Offer an ADR only when the decision is:

- Hard to reverse
- Surprising without context
- A real tradeoff between plausible options
- Cross-system, platform-level, high-risk, security/privacy-sensitive, materially costly, vendor-locking, or policy-required

Store linked ADRs under `docs/solutions/adr-####-<slug>.md`, use the agentic ADR template, and do not treat them as executable authority until their status is `ACCEPTED`.

For smaller decisions, feed this shape into the FSD Technical Decision Register instead:

```markdown
# TDEC-001: <Decision>

## Status
Approved

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
- `/sc-plan` and `issue-workflow` for FSD goals and issue pointer titles
- `triage-workflow` for incoming requests
- `codebase-design` for naming seams and deep modules
