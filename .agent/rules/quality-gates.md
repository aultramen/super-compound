# Quality Gates

Keep gates lightweight and evidence-based. Detailed procedures belong in the referenced skills.

## Before Work

- Read the relevant workflow and skill before editing.
- Check `.agent/rules/project-config.md` and existing project conventions.
- For UI work, use `interface-design` before implementation.
- For dependency, security, release, MCP, compliance, or agent-surface risk, use `audit.md` and the security skills.
- For unclear intent, resolve uncertainty through `explore.md` before planning.

## Before Executing A Plan

- Every requirement has an implementation task.
- Every task has an action, verification, and done condition.
- Dependencies between tasks are explicit.
- Tests or other verification cover the critical user-visible paths.
- Scope is still the requested work, not opportunistic refactoring.

## During Work

- Prefer small, reversible changes.
- Keep business logic out of UI, transport, and persistence layers.
- Validate inputs at boundaries and preserve dependency direction.
- Capture deferred ideas instead of expanding scope mid-task.
- Do not run destructive or publishing Git commands unless explicitly requested.

## Before Completion

Use `verification-before-completion` for non-trivial work.

- Run the smallest meaningful verification first.
- Run broader checks when shared behavior, security, data, or UI workflows changed.
- Check integration, not just file existence.
- Report commands run, important output, and any residual risk.

## Red Flags

- Claiming "done", "fixed", or "passing" without fresh evidence.
- Trusting generated output or subagent reports without independent verification.
- Adding dependencies without identity, compatibility, and security checks.
- Shipping UI without responsive, accessibility, and text-overflow checks.
- Leaving stale docs, broken paths, or renamed workflow references.
