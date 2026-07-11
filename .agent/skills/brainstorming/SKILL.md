---
name: brainstorming
description: "Use when creative product, feature, UI, or behavior work needs intent, requirements, constraints, or design explored before implementation."
---

# Brainstorming

## Purpose

Turn a rough idea into a clear business direction before writing a BRD, PRD, FSD, or code.

Announce: "I'm using the brainstorming skill to explore and refine this idea."

## When To Use

Use when acceptance criteria, product direction, users, constraints, tradeoffs, UI/workflow shape, or the choice among plausible approaches is unclear. Skip when the user already supplied a concrete specification, exact files, and acceptance criteria; route that work to `/sc-plan`.

## Advisory Read-only Mode

When a read-only caller such as `/sc-geniusloop`, review, or audit uses this
skill as an analysis lens, inspect context and compare options but do not write
or create a brainstorm artifact. Skip the capture mutation and return proposed
decisions, uncertainties, and the owning workflow to the caller.

## Reference Router

- Inspect nearby implementation, prior ideas, learned solutions, and UI retrieval before questioning: [local context](references/local-context.md)
- Narrow intent and compare candidate directions: [questions and options](references/questions-and-options.md)
- Save the chosen direction and open questions: [capture](references/capture.md)
- Explore UI, responsive/accessibility needs, flows, states, and useful diagrams: [UI and visual exploration](references/ui-and-visual.md)
- Counter premature coding or scope retention and choose the next workflow: [red flags and next steps](references/red-flags-and-next.md)

Load local context first, questions/options while deciding, and capture only once decisions are useful enough to persist.

## Mandatory Gates

- **Context-before-questions gate:** Inspect easy-to-find similar code/docs, recent `docs/brainstorms/`, `docs/solutions/`, learned knowledge, and relevant `interface-design` search results before asking what the repository can already answer.
- **Question gate:** Ask one concise question per turn. Start with user/job/outcome, then success, constraints, non-goals, existing patterns, risk, edge cases, and reversibility. Prefer lettered choices when natural.
- **Options gate:** Offer 2-3 approaches with description, pros, cons, and fit. Lead with a recommendation; prefer the simplest option that meets the goal while preserving future change.
- **UI gate:** Ground interface exploration in `interface-design`, concrete decisions, accessibility, responsiveness, and existing components. Use diagrams only when they clarify architecture, flows, states, data, or ownership.
- **Capture gate:** Outside advisory read-only mode, save useful decisions to `docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md` with purpose, rationale, alternatives, decisions, open questions, and recommended next workflow. Name non-goals explicitly.
- **Plan gate:** Brainstorming does not authorize implementation. Route to `/sc-prd` after a BRD, `/sc-plan` after PRD approval, `/sc-ui` for interface work, or `/sc-work` only when requirements are already concrete and approved.

## Related Skills

Use `prd-generator`, `writing-plans`, `interface-design`, and `knowledge-compounding` for requirements, FSD goals, frontend grounding, and reusable lessons.
