# Goal Slicing Reference

Load only after the FSD contract is stable and goals or an optional task ledger must be created.

## Vertical Slice Default

A goal owns one independently verifiable outcome. It may cross database, API, UI, jobs, and tests when that is the smallest complete user or operational behavior. Keep verification in the same goal rather than postponing it to a later horizontal phase.

Examples:

- One migration with compatibility and rollback proof.
- One endpoint behavior with contract and negative tests.
- One UI state with accessibility and browser verification.
- One audit event with structured-log assertions.
- One end-to-end behavior spanning schema, handler, UI state, and test.

Split when domains are unrelated, the outcome needs more than a focused session, verification depends on later goals, or parallel agents would edit the same files.

For UI-integrated scope, create an optional `CONTRACT_ENABLER`, then exactly one
active `FIRST_VERTICAL_SLICE` per pinned contract revision for the highest-risk
critical flow. After an enabler, `/sc-plan` refreshes the FSD index and obtains
Technical Manager approval before releasing that slice. It must prove the real
provider, auth/permission, success, and representative failure. Every
`SCALE_OUT_SLICE` depends on its verified issue, pins the same contract version,
and requires a `VALIDATED` PRD baseline; mock-only evidence cannot release the
dependency. Create one final `HARDENING` goal blocked by all applicable UI
delivery slices for merged integration, responsive, accessibility, E2E, visual,
and Business Owner UAT evidence.

## Measured Wide-Refactor Exception

A wide or horizontal refactor is allowed only when vertical slicing would duplicate work or leave a shared seam inconsistent. The goal must record:

1. The shared seam or invariant being changed.
2. Every known caller/consumer found through search or dependency analysis.
3. A bounded path/file inventory and explicit exclusions.
4. Compatibility or migration order for callers.
5. Verification for the seam and every affected caller, including broader regression/build checks.
6. Rollback or safe partial-failure behavior.

If callers are unknown, verification is deferred, or the scope is merely “clean up many files,” split or investigate first.

## Optional Task Ledger

Use `docs/tasks/tasks-<feature>.json` only for multi-session or independent multi-agent execution. Keep it synchronized with the FSD. Each entry needs `GOAL-*` ID, title, status, parent FSD, blockers, qualified upstream refs, optional issue path, bounded files, and verification commands.

Issue pointers under `.scratch/<feature>/issues/` stay lightweight: link to FSD/requirement/test/decision IDs instead of copying artifact prose.
