---
description: "Design or review UI read-only, or supply interface guidance to an approved goal executed under /sc-work."
---

# UI Workflow

Use this workflow as a UI capability sidecar with two explicit modes:

- Design/review mode is read-only and may run without implementation authority.
- Implementation mode never edits directly: fuzzy intent routes to `/sc-explore`,
  an approved BRD without a PRD routes to `/sc-prd`, an approved PRD without an
  FSD routes to `/sc-plan`, and an approved FSD `GOAL-*` hands off to `/sc-work`.
  UI guidance may be used inside that active work goal, but mutation authority
  remains with `/sc-work`.

## Steps

1. Determine design/review versus implementation intent and apply the authority routing above before loading detailed guidance.
2. Load `skills/interface-design/SKILL.md` only when following the full UI procedure.
3. Read `.agent/rules/project-config.md`, existing design-system artifacts, scoped components, and styles. Persist or generate a design system only under the write-authorized owning workflow.
4. Run targeted domain searches only for the UI risks in scope: `web`, `app`, `ux`, `chart`, `typography`, `icons`, or stack-specific guidance.
5. Read search results only; do not preload interface CSV files into model context.
6. For implementation intent, hand off to `/sc-work <approved-goal>`; do not edit source or mutate Git state from `/sc-ui`.
7. When invoked as a capability inside active `/sc-work`, return retrieved guidance and a verification checklist; `/sc-work` owns edits, TDD, integration, and final verification.
8. In either mode, check responsive behavior, accessibility, text overflow, interaction states, and loading/empty/error states.

## Output

- Read-only design/review findings, or a deterministic handoff to the owning workflow.
- Under `/sc-work`, UI changes and verification evidence grounded in retrieved guidance.
