---
description: "Design or review UI read-only, or supply interface guidance to an approved goal executed under /sc-work."
---

# UI Workflow

Use this workflow as a UI capability sidecar with two explicit modes:

- Design/review mode is read-only and may run without implementation authority.
- Design/review mode may validate a UI-bearing PRD draft and produce evidence,
  but it never edits the PRD, FSD, prototype, or source code.
- Implementation mode never edits directly: fuzzy intent routes to `/sc-explore`,
  an approved BRD without a PRD routes to `/sc-prd`, an approved PRD without an
  FSD routes to `/sc-plan`, and an approved FSD `GOAL-*` hands off to `/sc-work`.
  UI guidance may be used inside that active work goal, but mutation authority
  remains with `/sc-work`.

## Steps

1. Determine design/review versus implementation intent and apply the authority routing above before loading detailed guidance.
2. For UI-bearing validation, load
   `skills/agentic-delivery/references/ui-contract-readiness.md`; load
   `skills/interface-design/SKILL.md` only when following the full UI procedure.
3. Read `.agent/rules/project-config.md`, existing design-system artifacts, scoped components, and styles. Persist or generate a design system only under the write-authorized owning workflow.
4. Run targeted domain searches only for the UI risks in scope: `web`, `app`, `ux`, `chart`, `typography`, `icons`, or stack-specific guidance.
5. Read search results only; do not preload interface CSV files into model context.
6. For implementation intent, hand off to `/sc-work <approved-goal>`; do not edit source or mutate Git state from `/sc-ui`.
7. When invoked as a capability inside active `/sc-work`, return retrieved guidance and a verification checklist; `/sc-work` owns edits, TDD, integration, and final verification.
8. In either mode, apply the canonical profile, state-applicability, evidence,
   and approver gates. Runnable evidence is required for timing, runtime
   responsive behavior, keyboard/focus, realtime, or offline risk. Also check
   accessibility, text overflow, and every applicable named state.
9. If work remains, end with `/sc-pause` so `docs/STATE.md` carries the exact next action.

## Result Classification And Routing

Return exactly one classification:

- `EVIDENCE`: read-only validation evidence. PRD evidence returns to `/sc-prd`,
  FSD evidence returns to `/sc-plan`, and verification-only evidence returns to
  the owning `/sc-work` goal or read-only caller for recording.
- `PRD_CHANGE_REQUIRED`: observable or user-visible behavior or an acceptance
  criterion must change. A goal/scope/policy change routes to `/sc-explore`;
  otherwise return to `/sc-prd`.
- `FSD_CHANGE_REQUIRED`: data, API, schema, or technical interaction must change;
  route to `/sc-plan`.
- `VERIFICATION_FINDING`: implementation diverges from approved authority;
  route to the owning `/sc-work` goal.

A new preference after acceptance becomes a backlog item or change request. It
does not silently rewrite the accepted baseline.

## Output

- Read-only design/review findings, or a deterministic handoff to the owning workflow.
- Exactly one classification with evidence refs, impacted qualified IDs, and next owner.
- Under `/sc-work`, UI changes and verification evidence grounded in retrieved guidance.
