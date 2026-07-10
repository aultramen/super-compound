# Execution and Verification

Load for each ready goal.

## Goal Loop

1. Mark the issue, ledger, or conversation checklist in progress.
2. Read referenced sources and nearby patterns.
3. Confirm FSD ownership, dependency direction, API/data contracts, UI conventions, `TDEC-*`, and accepted ADRs.
4. Invoke `architecture-enforcement` when placement or direction is uncertain.
5. Use `test-driven-development` for every new behavior or regression.
6. Make the smallest cohesive edit satisfying the goal.
7. Run the narrowest useful verification.
8. Diagnose and fix failures before moving on.
9. Mark the goal complete only with evidence; record notable decisions.
10. Update durable state when work spans sessions.

Capture unrelated improvements as follow-up notes instead of refactoring them now.

## Verification Levels

| Level | Trigger | Examples |
|---|---|---|
| Narrow | After a meaningful edit | Focused unit test, package typecheck, script check |
| Local integration | After a vertical slice | Related tests, API smoke, browser flow |
| Completion | Before final response/next goal | Relevant lint, typecheck, build, tests, manual checks, stale-reference scan |

Use `integration-checking` after multi-component work and `verification-before-completion` before status claims. For release-bound, security-sensitive, dependency-heavy, or agent-surface work, run `/sc-audit` or the relevant audit skill.
