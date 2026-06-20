---
name: executing-plans
description: "Use when a written implementation plan is ready to execute. Supports sequential execution by default and parallel execution only for independent, low-conflict tasks."
---

# Executing Plans

## Purpose

Execute an approved plan with durable progress, focused edits, continuous verification, and a clear finish line.

Announce: "I'm using the executing-plans skill to implement this plan."

## Before Editing

Read the plan completely, then gather only the context needed for the next task:

- Files and tests named in the plan
- Nearby code with similar behavior
- Project README, package metadata, and local agent instructions
- `SUPER-COMPOUND.md` and `.agent/rules/super-compound.md`
- `docs/STATE.md`, `docs/progress.md`, or a task ledger when present
- Relevant ADRs, domain notes, or design-system artifacts referenced by the plan

If acceptance criteria are missing or contradictory, ask one concise question before coding. If the answer can be inferred safely from existing tests and code, proceed and document the assumption.

## Git And Workspace

Respect the project's current state.

- Check `git status` before broad edits.
- Do not overwrite user changes.
- Create a branch or worktree only when the user or project config calls for it.
- Stage related files only when committing is explicitly requested.
- Never use destructive git commands unless the user asked for them.

## Task Execution Loop

For each task:

1. Mark the task in progress in the plan, task ledger, or conversation checklist.
2. Read referenced files and nearby patterns.
3. Confirm boundaries: ownership, dependency direction, public API contracts, data contracts, and UI conventions.
4. Use `architecture-enforcement` when placement or dependency direction is uncertain.
5. Use `test-driven-development` for new behavior and regressions.
6. Make the smallest cohesive edit that satisfies the task.
7. Run the narrowest useful verification.
8. Fix failures before moving on.
9. Mark the task complete and record notable decisions.
10. Update durable state for multi-session work.

Do not turn task execution into opportunistic refactoring. Capture unrelated improvements as follow-up notes.

## Parallel Execution

Use parallel agents only when all are true:

- The plan has independent tasks with clear file ownership.
- Tasks do not depend on each other's unmerged output.
- Verification can be run per task.
- The user accepts the extra coordination cost.

When parallelizing, assign each agent:

- One task or tightly related task group
- Exact files or directories to inspect
- Expected output and verification command
- Conflict boundaries and handoff format

Merge results deliberately, then run shared verification.

## Verification

Run verification at three levels:

| Level | When | Examples |
|---|---|---|
| Narrow | After each meaningful edit | Single unit test, typecheck for one package, script check |
| Local integration | After a vertical slice | Related test file, browser check, API smoke test |
| Completion | Before final response | Relevant lint/typecheck/build/tests, manual checks, stale-reference scans when docs changed |

Before claiming completion, use `verification-before-completion`.

For release-bound, security-sensitive, dependency-heavy, or agent-surface work, run `/sc-audit` or the relevant audit skill before shipping.

## Revision Mode

When verification fails:

1. Identify the exact failing check.
2. Fix only the failing behavior.
3. Re-run the failed check.
4. Repeat at most three focused iterations.
5. If still failing, stop and report the blocker with evidence.

Allowed revisions:

- Fix failing tests
- Fix lint/type errors
- Correct broken wiring
- Add missing boundary validation
- Adjust docs to match implemented behavior

Avoid during revision:

- New features
- Broad refactors
- Scope expansion
- Cosmetic churn unrelated to the failure

## Durable State

Use durable files when work spans sessions:

- `docs/STATE.md` for current position and next action
- `docs/progress.md` for chronological progress
- `docs/tasks/tasks-*.json` only if a task ledger already exists or the plan requires one
- `.continue-here.md` only for pause/status handoff created by `/sc-pause`

The next session should be able to run `/sc-status` and understand where to continue.

## Finish Line

Before the final response:

- Planned tasks are complete or explicitly deferred
- Verification was run, with failures disclosed
- Docs are updated when behavior, setup, commands, architecture, or user workflows changed
- No old workflow/skill names were reintroduced
- `git status` is reviewed for intended and unintended changes
- The user gets a concise summary of changed files and checks

## Related Skills

- `writing-plans` creates the input plan
- `test-driven-development` shapes behavior changes
- `architecture-enforcement` protects module boundaries
- `systematic-debugging` handles failures
- `state-management` keeps long work durable
- `integration-checking` verifies cross-component behavior
- `code-review` and `verification-before-completion` close the loop
