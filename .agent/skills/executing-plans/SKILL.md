---
name: executing-plans
description: "Use when an approved FSD goal or lightweight issue pointer is ready for implementation."
---

# Executing Plans

## Overview

Announce: "I'm using the executing-plans skill to implement this FSD goal."

Execute approved scope through focused edits, durable progress, and evidence. Sequential execution is the default.

## When to Use

Use only after an approved FSD goal or `.scratch/<feature>/issues/` pointer defines authority, acceptance, and dependencies.

- Before editing, load [Authority and Workspace](references/authority-and-workspace.md) to resolve sources, blockers, repository state, and Git boundaries.
- For each ready goal, load [Execution and Verification](references/execution-and-verification.md).
- Load [Parallel, Revision, and Handoff](references/parallel-revision-and-handoff.md) only when considering parallel agents, responding to failed verification, spanning sessions, or closing the plan.

## Authority Gate

Search symbols, paths, tests, and nearby implementations before creating or declaring anything missing. A narrow search miss is not proof of absence.

Stop with `OPEN-*` when acceptance criteria, FSD authority, `TDEC-*`, accepted ADR status, or required behavior is missing or contradictory. Stop on unfinished blockers unless the user explicitly reorders work. Never invent schema, APIs, authorization, roles, workflows, state transitions, business rules, or UI behavior outside approved authority.

For UI-integrated work, validate the issue's pinned contract version and
required gate. Before editing an issue-backed goal, require `ready-for-agent`
and every `Blocked by` dependency at `verified`; missing, stale, or unsatisfied
evidence returns to `needs-info`/`blocked` with `OPEN-*`. `HARDENING` requires
every applicable UI delivery slice verified. A first slice must prove the real
provider with auth/permission, success, and representative failure through
`integration-checking`. Parallel scale-out is forbidden until that issue is
`verified`; mock-only evidence never opens the gate.

Before product code, verify placement and dependency direction with `architecture-enforcement`; implement behavior through `test-driven-development`.

## Execution Gate

For one goal at a time:

1. Mark it in progress and load only referenced context plus nearby patterns.
2. Confirm boundaries, contracts, blockers, and ownership.
3. Write the failing behavioral test, then make the smallest cohesive edit.
4. Run narrow verification after meaningful edits and local integration checks after a vertical slice.
5. Fix failures before advancing; capture unrelated ideas separately.
6. Update source issue and durable state when applicable.
7. Run completion checks and `verification-before-completion` before any done claim.

Do not opportunistically refactor or overwrite user changes. Route branch, worktree, commit, push, and PR operations through `/sc-go` and `git-workflow-operation`; never perform them merely because implementation finished.

## Red Flags

| Thought | Required response |
|---|---|
| "The FSD probably means..." | Stop with `OPEN-*` unless delegation is explicit. |
| "I'll create what search did not find" | Broaden search and verify absence. |
| "Parallel will be faster" | Prove independence and file ownership first. |
| "I'll clean this nearby code" | Record follow-up; stay in goal scope. |
| "The agent/check said done" | Verify independently before transition. |

## Integration

Inputs come from `agentic-delivery`, `writing-plans`, and `issue-workflow`. Execution uses `architecture-enforcement`, `test-driven-development`, `systematic-debugging`, and `state-management`; `integration-checking`, `code-review`, and `verification-before-completion` close the loop. All Git delivery uses `/sc-go` and `git-workflow-operation`.
