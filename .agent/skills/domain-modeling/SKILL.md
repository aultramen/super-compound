---
name: domain-modeling
description: "Use when work needs shared domain language, CONTEXT.md or GLOSSARY.md updates, conditional ADR decisions, glossary cleanup, or terminology checks during BRD, PRD, FSD, triage, architecture, or goal shaping."
---

# Domain Modeling

## Purpose

Keep domain language precise and durable so agents use the same words as the project.

## Files

Preserve the project's existing glossary name and location. Follow explicit
project routing and the relevant bounded-context map: `CONTEXT.md` /
`CONTEXT-MAP.md` and `GLOSSARY.md` / `GLOSSARY-MAP.md` are supported conventions.
Inspect purpose first; task/runtime context is not a domain glossary merely
because it is named `CONTEXT.md`.

When both conventions exist, follow documented authority. If authority or
definitions conflict, report the conflict and withhold only the ambiguous
glossary write; continue independent analysis. Preserve both sources until the
owning workflow resolves them. Never create a competing glossary or rename
existing documents as a side effect.

When no glossary convention exists, use the simplest default layout:

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

## Advisory Read-only Mode

When a read-only caller uses domain modeling only to evaluate ideas, reviews, or
risks, identify terminology conflicts and return proposed glossary changes, but
do not update or create a glossary/map under either convention, an FSD, or an ADR. The
owning write-authorized workflow decides whether to persist them.

## Process

### 1. Read Existing Language

Before changing language, resolve and read the relevant glossary/map using the Files policy above, FSD Technical Decision Register entries, and linked accepted ADRs.

If no domain docs exist, infer terms from code, tests, BRDs, PRDs, FSDs, goal issues, and user language.

### 2. Challenge Fuzzy Terms

Call out overloaded or conflicting terms immediately:

- "Does account mean customer account or login identity?"
- "The glossary says cancellation is order-level, but this story mentions item-level cancellation. Which is true?"

Use concrete scenarios to force clarity. Check terminology and factual claims against code and tests; expose conflicts with evidence. Current implementation does not silently replace approved policy. Use brainstorming rounds for unresolved user decisions.

### 3. Update The Glossary Inline

Outside advisory read-only mode, when a term is resolved, update the selected glossary immediately within the owning workflow's write authority.

Use this shape:

```markdown
## <Term>

<Concise definition.>

_Avoid_: <synonyms or misleading terms>
```

Keep the selected glossary free of implementation details. It is vocabulary, not a BRD, PRD, FSD, scratchpad, or design document.

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
