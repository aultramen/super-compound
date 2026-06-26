# /sc-work Runtime Contract

Purpose: execute one approved FSD goal or `.scratch/<feature>/issues/` pointer.

Load only:

- The goal issue pointer or exact FSD `GOAL-*` section.
- Referenced FSD sections, upstream BRD/PRD IDs, accepted ADR obligations, target files, and tests.
- `.agent/context/skills/sc-work.contract.md`.

Stop with `OPEN-*` when authority is missing, a linked ADR is not accepted, or implementation would invent schema, APIs, auth, workflow, role, state, security, privacy, or data-integrity behavior.

Run mapped verification before claiming completion.
