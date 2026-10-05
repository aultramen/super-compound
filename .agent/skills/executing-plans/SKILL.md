---
name: executing-plans
description: "Use when an approved FSD goal or lightweight issue pointer is ready for implementation."
---

# Executing Plans

## Overview

Announce: "I'm using the executing-plans skill to implement this FSD goal."

Execute approved scope through focused edits, durable progress, and evidence. Sequential execution is the default.

## When to Use

Use an approved FSD goal/pointer for full-tier work; a concrete user request with acceptance and verification suffices for light-tier work. Read the authority/workspace preflight for either tier; a discovered full-tier trigger returns to its owner.

- Before editing, apply covered authority/workspace checks from the active contract; load [Authority and Workspace](references/authority-and-workspace.md) only for an uncovered detail, conflict, material risk or editing this procedure.
- For each ready goal, inspect its acceptance and mapped checks; reuse unchanged procedure context. Load [Execution and Verification](references/execution-and-verification.md) for a named uncovered execution detail.
- Load [Parallel, Revision, and Handoff](references/parallel-revision-and-handoff.md) only when considering parallel agents, responding to failed verification, spanning sessions, or closing the plan.

## Authority Gate

Search symbols, paths, tests, and nearby implementations before creating or declaring anything missing. A narrow search miss is not proof of absence.

Stop only the affected scope with `OPEN-*` on missing/contradictory acceptance or behavior; full-tier work also requires FSD authority, approved `TDEC-*`, and accepted ADRs. Continue independent dependency-ready authorized work without requiring the user to reorder it. Apply the human input runtime contract for unresolved needs; technical gaps require research/checks, not an "approve blocker" question. Never invent schema, APIs, authorization, roles, workflows, state transitions, business rules, or UI behavior outside approved authority.

For full-tier UI issues, check the pinned contract, integration topology and role gate; require `ready-for-agent` and `Blocked by` dependencies at `verified`. Missing/stale evidence returns `needs-info`/`blocked` with `OPEN-*`. `HARDENING` requires all applicable slices verified. LOCAL_ONLY uses mapped local checks without synthetic providers. A networked first slice proves real-provider auth/permission, success, and representative failure through `integration-checking`; mock-only evidence cannot open scale-out.

Before product code, verify placement and dependency direction with `architecture-enforcement`; implement behavior through `test-driven-development`.

## Execution Gate

For one goal at a time:

1. Mark it in progress and load only referenced context plus nearby patterns.
2. Confirm current flow, reusable pattern, affected boundaries/callers, proving checks, contracts, blockers, and ownership.
3. Write the failing behavioral test, then make the smallest cohesive edit.
4. Run narrow verification after meaningful edits and local integration checks after a vertical slice.
5. Fix failures before advancing; capture unrelated ideas separately.
6. Update source issue and durable state when applicable.
7. Run completion checks and `verification-before-completion` before any done claim.

Do not opportunistically refactor or overwrite user changes. Route branch, worktree, commit, push, and PR operations through `/sc-go` and `git-workflow-operation`; never perform them merely because implementation finished.

## Red Flags

| Thought | Required response |
|---|---|
| "The FSD probably means..." | Check acceptance/contract authority; use default judgment for reversible internal details. |
| "I'll create what search did not find" | Broaden search and verify absence. |
| "Parallel will be faster" | Prove independence and file ownership first. |
| "I'll clean this nearby code" | Record follow-up; stay in goal scope. |
| "The agent/check said done" | Verify independently before transition. |

## Integration

Inputs come from `agentic-delivery`, `writing-plans`, and `issue-workflow`. Execution uses `architecture-enforcement`, `test-driven-development`, `systematic-debugging`, and `state-management`; `integration-checking`, `code-review`, and `verification-before-completion` close the loop. All Git delivery uses `/sc-go` and `git-workflow-operation`.
