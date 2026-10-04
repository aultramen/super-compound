# Authority and Workspace

Load before the first edit for a goal.

## Context to Gather

Read the goal issue or FSD goal completely, then only context needed for the next goal:

- referenced parent FSD sections and upstream BRD/PRD IDs;
- linked accepted ADRs under `docs/solutions/adr-####-<slug>.md`;
- named files, tests, interfaces, design-system artifacts, and domain notes;
- `.scratch/<feature>/issues/<NN>-<slug>.md` and each `Blocked by` issue;
- nearby code implementing similar behavior;
- project README, package metadata, nearest agent instructions, `SUPER-COMPOUND.md`, and `.agent/rules/super-compound.md`;
- existing `docs/STATE.md`, `docs/progress.md`, or task ledger when present.

Search symbols, paths, tests, and nearby implementations before creating or declaring anything missing. Expand queries, inspect likely directories, and confirm naming conventions.

## Stop Conditions

- Unfinished dependency: stop and identify the blocker unless explicitly reordered.
- Missing/contradictory acceptance or behavior: report `OPEN-*` rather than coding. Full-tier work additionally requires FSD authority, approved `TDEC-*`, and accepted ADR status.
- Reversible internal details following repository conventions are delegated by default within approved scope; document consequential choices. Missing acceptance, public contract, policy, or security decisions still require `OPEN-*`.
- Never invent schema, APIs, authorization, workflow, role, state, business, or UI decisions.

## Workspace and Git

- Inspect `git status` before broad edits and preserve all user work.
- Do not work directly on the configured protected base branch.
- Create branches/worktrees only when requested or project `gitWorkflow` requires them.
- Route preview-first branch, worktree, stage, commit, push, and PR operations through `/sc-go` and `git-workflow-operation`.
- Stage only related files when a commit is explicitly requested.
- Never use destructive Git commands without explicit user authority.

## Execution preflight (both tiers)

Before editing, identify the current flow from trigger to outcome, the reusable pattern in nearby code/tests, affected boundaries plus callers/consumers, and proving checks for acceptance and regression. Investigate repository facts before asking. For full-tier work cite the relevant FSD/GOAL sections instead of copying them. For light-tier work keep a brief note in the existing conversation or issue; no new artifact or approval gate is required. A concrete single trivial edit needs only a proportionate inspection/check.

Trace relevant callers and consumers at the changed seam; select checks from requirements and risk, not a universal set of test layers. Identify validation, errors, state retention, permissions, and side effects only where affected. New product/schema/API/auth decisions trigger the existing escalation path.

## Better alternative within authority

When a material alternative is supported by evidence, present:

`current approach -> alternative -> benefit/trade-off -> impact -> recommendation`

Impact names behavior, acceptance, interfaces, dependencies, risk, and verification affected. Requirement, acceptance, or contract changes return to their BRD/PRD/FSD owner before implementation. Reversible implementation details within existing authority need no micro-approval; document the choice briefly and proceed. Do not ask for approval merely to reuse an established pattern.

Product confirmation is an interaction requirement for an end user; it is distinct from permission for the coding agent. Add review/edit/confirm/regenerate controls only when feature requirements and risk justify them.
