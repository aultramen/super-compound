# /sc-work Runtime Contract

Purpose: execute one approved FSD goal or `.scratch/<feature>/issues/` pointer.

Load only:

- The goal issue pointer or exact FSD `GOAL-*` section.
- Referenced FSD sections, upstream BRD/PRD IDs, accepted ADR obligations, target files, and tests.
- `.agent/context/skills/sc-work.contract.md`.
- `.agent/context/skills/git-workflow-operation.contract.md` only when branch/worktree setup is configured or requested.

Search existing symbols, paths, tests, and nearby implementations before
creating or declaring anything missing; a narrow search miss is not absence.

Before any edit or execution, an issue pointer must be `ready-for-agent`; every
`Blocked by` dependency must be satisfied at `verified`, not merely `done`.
Validate `ui_delivery_role` against its `required_gate` in the pinned authority.
`HARDENING` requires every applicable UI delivery slice to be `verified`.
Missing, unsatisfied, stale, or mismatched state/evidence returns the pointer to
`needs-info` or `blocked` and stops with `OPEN-*`.

Stop with `OPEN-*` when authority is missing, a linked ADR is not accepted, or implementation would invent schema, APIs, auth, workflow, role, state, security, privacy, or data-integrity behavior.

Validate the pinned contract version and derived revisions. A
`FIRST_VERTICAL_SLICE` uses a real backend/provider and proves auth/permission,
success, and representative failure through `integration-checking`; mock-only
evidence does not permit scale-out. When it becomes `verified`, return to
`/sc-plan` so the issue owner can promote eligible `SCALE_OUT_SLICE` pointers.
Parallel scale-out requires 2+ independent execution streams, the first vertical
slice verified, a `VALIDATED` baseline, unchanged contract version, a single
writer for shared artifacts, and isolated Git worktrees; `EXCEPTION_APPROVED`
never releases scale-out.

When Git workflow is enabled, block direct protected-base work and preview branch/worktree setup before edits.

Run mapped verification before claiming completion. Execute integration,
responsive, accessibility, E2E, and visual-regression evidence in a bounded
`HARDENING` goal; Business Owner approval is required for UAT.
