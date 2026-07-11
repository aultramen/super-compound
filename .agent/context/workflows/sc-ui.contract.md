# /sc-ui Runtime Contract

Purpose: review/design UI read-only or provide interface guidance to an approved goal without loading raw data into model context.

Authority: design/review mode is read-only. For implementation intent, fuzzy UI
routes to `/sc-explore`; an approved BRD without a PRD routes to `/sc-prd`; an
approved PRD without an FSD routes to `/sc-plan`; an approved FSD `GOAL-*`
hands off to `/sc-work <approved-goal>`. `/sc-ui` never edits directly; when
used inside active `/sc-work`, mutation authority and verification remain there.

Load first:

- `.agent/context/skills/interface-design.contract.md`.
- `.agent/rules/project-config.md` for stack and design-system paths.
- Existing app components/styles and only the route files in scope.

Data rule: run `python .agent/skills/interface-design/scripts/search.py "<query>"` for guidance. Do not preload CSV files.

Verify responsive layout, accessibility, text overflow, focus/hover states, and loading/empty/error states.
