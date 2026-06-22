---
name: codebase-design
description: "Use when designing or improving module interfaces, test seams, deep modules, adapter boundaries, architecture options, codebase health, or AI-navigable refactors."
---

# Codebase Design

## Purpose

Design deep modules: a lot of behavior behind a small interface, placed at a clean seam, testable through that interface.

Announce: "I'm using the codebase-design skill to design the module seam."

## Vocabulary

Use these terms consistently:

- `Module`: anything with an interface and implementation.
- `Interface`: everything callers must know to use a module correctly.
- `Implementation`: code behind the interface.
- `Seam`: where behavior can vary without editing callers.
- `Adapter`: a concrete implementation at a seam.
- `Depth`: how much useful behavior sits behind a small interface.
- `Leverage`: what callers gain from a deep module.
- `Locality`: how much change and debugging concentrate in one place.

Avoid vague substitutes such as boundary, helper, service, or component when the seam is the topic.

## Principles

- The interface is the test surface.
- Prefer one high seam over many shallow seams.
- A module earns its place when deleting it would spread complexity across callers.
- One adapter is a hypothetical seam; two adapters make the seam real.
- Accept dependencies instead of constructing hard-coded concrete dependencies.
- Mock only system boundaries; use local substitutes when practical.

## Process

### 1. Find The Candidate Seam

Read `CONTEXT.md`, the relevant FSD `TDEC-*` records, linked accepted ADRs in `docs/solutions/`, similar code, tests, and the planned behavior.

Look for:

- Many callers repeating the same rules
- Tests that need excessive setup
- Helpers that simply pass through complexity
- Code paths where bugs require bouncing across many files
- External services or persistence that need adapters

### 2. Compare Options

For significant changes, compare two or three designs:

```markdown
| Option | Interface | What hides behind it | Test seam | Tradeoff |
|---|---|---|---|---|
```

Recommend the smallest interface that preserves behavior and improves locality.

### 3. Feed The Plan

Record in the PRD when behavior needs clarification, in the FSD when implementation authority is needed, or in the goal issue pointer by qualified reference:

- The chosen seam
- Existing interfaces to reuse
- New interface shape only when necessary
- What tests should cross the seam
- What stays out of scope
- Any material technical decision as an FSD `TDEC-*` unless ADR criteria from `agentic-delivery` are met

Do not introduce abstraction for imagined future variation.

## Related Skills

- `domain-modeling` names domain concepts
- `prd-generator` captures testing decisions
- `writing-plans` turns design choices into tasks
- `test-driven-development` validates the seam through behavior
- `architecture-enforcement` checks project placement and dependency direction
