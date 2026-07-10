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
- Missing or contradictory acceptance, FSD authority, `TDEC-*`, or accepted ADR: report `OPEN-*` rather than coding.
- A convention may fill a detail only when the FSD explicitly delegates it; document the inference.
- Never invent schema, APIs, authorization, workflow, role, state, business, or UI decisions.

## Workspace and Git

- Inspect `git status` before broad edits and preserve all user work.
- Do not work directly on the configured protected base branch.
- Create branches/worktrees only when requested or project `gitWorkflow` requires them.
- Route preview-first branch, worktree, stage, commit, push, and PR operations through `/sc-go` and `git-workflow-operation`.
- Stage only related files when a commit is explicitly requested.
- Never use destructive Git commands without explicit user authority.
