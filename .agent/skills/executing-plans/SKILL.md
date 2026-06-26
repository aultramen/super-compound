---
name: executing-plans
description: "Use when an approved FSD goal or lightweight issue pointer is ready to execute. Supports sequential execution by default and parallel execution only for independent, low-conflict goals."
---

# Executing Plans

## Purpose

Execute an approved FSD goal or `.scratch/<feature>/issues/` pointer with durable progress, focused edits, continuous verification, and a clear finish line.

Announce: "I'm using the executing-plans skill to implement this FSD goal."

## Before Editing

Read the goal issue pointer or FSD goal completely, then gather only the context needed for the next task:

- Parent FSD sections referenced by the goal
- Upstream BRD and PRD IDs referenced by the FSD goal
- Linked accepted ADRs under `docs/solutions/adr-####-<slug>.md`, if any
- Files and tests named in the FSD or issue pointer
- `.scratch/<feature>/issues/<NN>-<slug>.md` issue files and their `Blocked by` issues when present
- Nearby code with similar behavior
- Project README, package metadata, and local agent instructions
- `SUPER-COMPOUND.md` and `.agent/rules/super-compound.md`
- `docs/STATE.md`, `docs/progress.md`, or a task ledger when present
- Relevant domain notes or design-system artifacts referenced by the FSD

If a blocking issue is not done, stop and report the blocker unless the user explicitly reorders the work. If acceptance criteria, FSD authority, `TDEC-*`, or linked ADR status is missing or contradictory, stop and report `OPEN-*` instead of coding. If the answer can be inferred safely from repository conventions and the FSD explicitly delegates it, proceed and document the assumption.

Do not invent schema, APIs, authorization, workflows, roles, state transitions, business rules, or UI behavior outside the approved FSD and linked accepted ADRs.

## Git And Workspace

Respect the project's current state.

- Check `git status` before broad edits.
- Do not overwrite user changes.
- Use `git-workflow-operation` and `/sc-go` for branch, worktree, commit, push, and PR operations.
- Create a branch or worktree only when the user or `gitWorkflow` config calls for it, and preview commands first.
- Stage related files only when committing is explicitly requested through `/sc-go`.
- Do not work directly on the configured protected base branch.
- Never use destructive git commands unless the user asked for them.

## Task Execution Loop

For each goal:

1. Mark the goal in progress in the issue file, task ledger, or conversation checklist.
2. Read referenced files and nearby patterns.
3. Confirm FSD boundaries: ownership, dependency direction, public API contracts, data contracts, UI conventions, `TDEC-*`, and linked ADRs.
4. Use `architecture-enforcement` when placement or dependency direction is uncertain.
5. Use `test-driven-development` for new behavior and regressions.
6. Make the smallest cohesive edit that satisfies the goal.
7. Run the narrowest useful verification.
8. Fix failures before moving on.
9. Mark the goal or issue complete and record notable decisions.
10. Update durable state for multi-session work.

Do not turn task execution into opportunistic refactoring. Capture unrelated improvements as follow-up notes.

## Parallel Execution

Use parallel agents only when all are true:

- The FSD has independent goals with clear file ownership.
- Goals do not depend on each other's unmerged output.
- For issue boards, each parallel issue has `Blocked by: None` or all blockers are done.
- Verification can be run per goal.
- The user accepts the extra coordination cost.

When parallelizing, assign each agent:

- One goal or tightly related goal group
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
- `docs/tasks/tasks-*.json` only if a task ledger already exists or the FSD requires one
- `docs/fsd/fsd-*.md` only when execution evidence or approved corrections must update the FSD
- `.scratch/<feature>/issues/*.md` when execution is issue-driven
- `.continue-here.md` only for pause/status handoff created by `/sc-pause`

The next session should be able to run `/sc-status` and understand where to continue.

## Finish Line

Before the final response:

- Planned goals are complete or explicitly deferred
- Source issue status is updated when work came from `.scratch/`
- Verification was run, with failures disclosed
- Docs are updated when behavior, setup, commands, architecture, or user workflows changed
- No old workflow/skill names were reintroduced
- `git status` is reviewed for intended and unintended changes
- Commit, push, and PR preparation were routed through `/sc-go` when requested
- The user gets a concise summary of changed files and checks

## Related Skills

- `agentic-delivery` defines artifact authority and stop conditions
- `writing-plans` creates the input FSD
- `issue-workflow` creates lightweight goal issue pointers
- `test-driven-development` shapes behavior changes
- `architecture-enforcement` protects module boundaries
- `systematic-debugging` handles failures
- `state-management` keeps long work durable
- `integration-checking` verifies cross-component behavior
- `code-review` and `verification-before-completion` close the loop
- `git-workflow-operation` handles preview-first branch, worktree, commit, push, and PR operations
