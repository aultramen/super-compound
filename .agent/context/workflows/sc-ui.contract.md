# /sc-ui Runtime Contract

Purpose: review/design UI read-only or provide interface guidance to an approved goal without loading raw data into model context.

Authority: design/review mode is read-only. For implementation intent, fuzzy UI
routes to `/sc-explore`; an approved BRD without a PRD routes to `/sc-prd`; an
approved PRD without an FSD routes to `/sc-plan`; an approved FSD `GOAL-*`
hands off to `/sc-work <approved-goal>`. `/sc-ui` never edits directly; when
used inside active `/sc-work`, mutation authority and verification remain there.

Load first:

- knowledge-search.mjs "<scope>" first; ERR-*/LRN-* hits bind.
- `.agent/skills/agentic-delivery/references/ui-contract-readiness.md` for a
  UI-bearing PRD/FSD validation gate.
- `.agent/context/skills/interface-design.contract.md`.
- `.agent/rules/project-config.md` for stack and design-system paths.
- Existing app components/styles and only the route files in scope.

Data rule: run `python .agent/skills/interface-design/scripts/search.py "<query>"` for guidance. Do not preload CSV files.

Verify the canonical profile, complete state applicability, evidence, and
approver gates. Runnable evidence is required for timing, runtime responsive,
keyboard/focus, realtime, or offline risk. Also verify accessibility and text overflow.

Return exactly one read-only classification: `EVIDENCE`: PRD -> `/sc-prd`;
FSD -> `/sc-plan`; verification-only evidence routes to the
owning `/sc-work` goal or read-only caller; `PRD_CHANGE_REQUIRED` for observable/user-visible behavior (scope
routes to `/sc-explore`, otherwise `/sc-prd`); `FSD_CHANGE_REQUIRED` when data,
API, or technical interaction routes to `/sc-plan`; or `VERIFICATION_FINDING`
when implementation diverges and routes to owning `/sc-work`. A new preference
after acceptance becomes backlog/change request, not an authority mutation.
If work remains, end with /sc-pause.
