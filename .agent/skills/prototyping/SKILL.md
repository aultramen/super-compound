---
name: prototyping
description: "Use when /sc-explore needs throwaway runnable evidence for uncertain state models, business logic, architecture options, UI directions, interaction design, or decisions that are cheaper to test than debate."
---

# Prototyping

## Purpose

Build throwaway code to answer one question. Promote validated decisions and
behavior requirements into their owning authority, then discard prototype code.

## Choose The Prototype Type

- Logic prototype: terminal or script harness for state, rules, or business logic.
- UI prototype: temporary route or screen with 2-4 visibly different variants.
- Integration prototype: narrow spike for an external API, data flow, or runtime behavior.

If the question is ambiguous, choose the type closest to the code area and state the assumption.

## Rules

- Mark prototypes clearly as throwaway.
- Place them near the relevant module or route when that improves context.
- Provide one command or URL to run.
- Avoid persistence unless persistence is the question.
- Skip production polish, broad error handling, and abstractions.
- Surface the relevant state after every action or variant change.
- Prototype code is not a production seed. Reuse code only under an explicit
  scoped exception authorized by the user or existing project policy, with
  production authority, required tests, security and accessibility checks;
  prototype acceptance alone does not authorize promotion.

## Process

1. State the question the prototype answers.
2. Let the user or verification evidence pick the answer.
3. Capture the answer in a PRD, ADR, issue, plan, or notes.
4. Promote validated decisions, not code, into planned work. Delete the throwaway
   code; any explicit reuse exception must name its scope and production checks.

## UI Variant Guidance

For UI prototypes, use the existing stack and route conventions. Provide variants through a search param or obvious local control. Focus on layout, interaction, information hierarchy, and state visibility rather than production styling.

Use `interface-design` when the prototype needs design-system or accessibility guidance.

## Related Skills

- `brainstorming` identifies unclear decisions
- `domain-modeling` records clarified concepts
- `codebase-design` evaluates architecture options
- `issue-workflow` references prototype decisions in issues
