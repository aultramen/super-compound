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
- Isolate them under `.scratch/prototypes/`; reference the relevant module or
  route in their brief rather than placing disposable code in production source.
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
   For optional comparison of consequential, uncertain design alternatives,
   load [design comparison](references/design-comparison.md). Skip that branch
   for routine implementation choices or settled requirements.
2. Let the user or verification evidence pick the answer.
3. Capture the answer and evidence with the existing authority. Light-tier work
   uses the authorized request, issue, or conversation; do not require a new
   artifact solely for the comparison. Full-tier work retains the owning BRD,
   PRD, FSD `TDEC-*`, or qualified accepted ADR under existing policy; issues
   hold qualified pointers when those artifacts exist.
4. Promote validated decisions, not code, into planned work. Delete the throwaway
   code after retaining evidence required by the next gate; any explicit reuse exception
   must name its scope and production checks.

## UI Variant Guidance

For UI prototypes, use the existing stack and route conventions. Provide variants through a search param or obvious local control. Focus on layout, interaction, information hierarchy, and state visibility rather than production styling.

Use `interface-design` when the prototype needs design-system or accessibility guidance.

## Related Skills

- `brainstorming` identifies unclear decisions
- `domain-modeling` records clarified concepts
- `codebase-design` evaluates architecture options
- `issue-workflow` references prototype decisions in issues
