# Execution and Verification

Apply to each ready goal; reuse unchanged procedure context. Load the sections
needed to resolve an uncovered execution detail.

## Goal Loop

1. Mark the issue, ledger, or conversation checklist in progress.
2. Read referenced sources and nearby patterns.
3. Confirm applicable authority: FSD/GOAL for full-tier work, concrete request/issue acceptance for light-tier work; inspect affected dependencies/contracts and existing UI conventions. Use `TDEC-*`/accepted ADRs only when applicable. Pin the derived completion contract covering the goal, requirements, and every acceptance criterion before recording results.
4. Invoke `architecture-enforcement` when placement or direction is uncertain.
5. Use `test-driven-development` for every new behavior or regression.
6. Make the smallest cohesive edit satisfying the goal.
7. Run the narrowest useful verification.
8. Diagnose and fix failures before moving on.
9. Apply `verification-before-completion`; promote complete/verified only after
   actual checks prove every criterion and outcome against current relevant state.
   Light/single tasks use `.scratch/completion/<task-id>/` with
   `verified-promise.mjs --contract <path>`; multi-goal runs use `--run <id>` for
   goal proof plus final combined outcome. Failed, skipped, stale, partial, or
   absent required proof stays incomplete and cannot release dependencies.
   Record notable decisions and `Evidence of Completion`: what/how, actual
   results/evidence locators, and acceptance mapping.
10. Update durable state when work spans sessions.

Capture unrelated improvements as follow-up notes instead of refactoring them now.

## Verification Levels

| Level | Trigger | Examples |
|---|---|---|
| Narrow | After a meaningful edit | Focused unit test, package typecheck, script check |
| Local integration | After a vertical slice | Related tests, API smoke, browser flow |
| Completion | Before final response/next goal | Relevant lint, typecheck, build, tests, manual checks, stale-reference scan |

Use `integration-checking` after multi-component work and `verification-before-completion` before status claims. For release-bound, security-sensitive, dependency-heavy, or agent-surface work, run `/sc-audit` or the relevant audit skill.

Select verification by acceptance and affected boundaries. Full suite runs when
CI/acceptance mandates it or cross-component impact needs it. Preserve single-read
SPEC/QUALITY review and reuse fingerprinted evidence; rerun after relevant change,
integration, missing identity or nondeterminism per workflow-integration.md#evidence-identity.
