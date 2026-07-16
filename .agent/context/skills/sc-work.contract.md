# /sc-work Skill Contract

Use full skills only for the active procedure:

- `context-engineering`: load issue, referenced FSD/BRD/PRD/ADR sections, target files, and tests only.
- `executing-plans`: execute one approved goal at a time unless 2+ streams are
  independent and every contract/first-real-slice gate is proven.
- `git-workflow-operation`: preview branch/worktree setup when configured or requested; block protected-base direct work.
- `test-driven-development`: write failing behavior/regression test before production code.
- `verification-before-completion`: run mapped verification and inspect output before claiming done.
- `integration-checking`: use after multi-component wiring changes.
- `subagent-orchestration`: use `.agent/tools/work-package.mjs`; exchange paths and bounded verdicts, not copied briefs/diffs; scope shared-worktree review with the generated `review-paths.json` allowlist.

Never bypass authority checks or weaken tests to reduce context.
UI scale-out requires a verified first vertical slice, one pinned contract
version, a `VALIDATED` baseline, a single writer for shared/generated artifacts,
and isolated worktrees; `EXCEPTION_APPROVED` or mock-only evidence never opens
the gate. After merge, real merged-system integration is mandatory for
`HARDENING` completion. A verified first slice returns to
`/sc-plan` for pointer promotion rather than mutating unrelated pointers here.
