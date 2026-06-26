# /sc-ui Runtime Contract

Purpose: build or review UI using interface-design guidance without loading raw data into model context.

Load first:

- `.agent/context/skills/interface-design.contract.md`.
- `.agent/rules/project-config.md` for stack and design-system paths.
- Existing app components/styles and only the route files in scope.

Data rule: run `python .agent/skills/interface-design/scripts/search.py "<query>"` for guidance. Do not preload CSV files.

Verify responsive layout, accessibility, text overflow, focus/hover states, and loading/empty/error states.
