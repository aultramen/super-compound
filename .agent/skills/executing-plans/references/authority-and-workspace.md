# Authority and Workspace

## Summary

Load before the first edit for a goal to gather authority, assess current outcomes, and identify remaining work.

## Context to Gather

Read the concrete request/issue for light-tier work or FSD goal for full-tier
work completely, then only context needed for the next goal. Artifact-chain
sources below are conditional on that authority already existing:

- referenced parent FSD sections and upstream BRD/PRD IDs;
- linked accepted ADRs under `docs/solutions/adr-####-<slug>.md`;
- named files, tests, interfaces, design-system artifacts, and domain notes;
- `.scratch/<feature>/issues/<NN>-<slug>.md` and each `Blocked by` issue;
- nearby code implementing similar behavior;
- relevant README sections and package metadata; reuse resident nearest agent instructions, `SUPER-COMPOUND.md`, and applicable host rules. Reload only when unavailable, changed, conflicting, or being edited;
- existing `docs/STATE.md`, `docs/progress.md`, or task ledger when present.

Before expanding discovery, name the missing fact; retrieve the section or symbol that answers it. Search symbols, paths, tests, and nearby implementations before creating or declaring anything missing. Expand only to resolve an outstanding fact; stop once authority, affected boundaries, and proving checks suffice.

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

Compare every requested outcome and acceptance criterion with actual current behavior and evidence before entering the implementation sequence:

- If all are already proved, exit the implementation sequence without implementation edits and apply [existing completion verification](../../verification-before-completion/SKILL.md). Report the already-satisfied outcome with `Evidence of Completion`, then continue independent ready authorized goals.
- For partial satisfaction, preserve proved parts and implement or check only remaining uncovered outcomes. Completion still requires every acceptance criterion.
- Stale, missing, failed, or skipped required proof leaves the affected outcome unverified, not already satisfied. External deliverables require actual current observation. File existence, clean Git state, issue status, or an old GREEN do not prove the requested outcome.

For consequential handoff ambiguity that could change behavior or acceptance, use the [fresh builder ambiguity check](../../brainstorming/references/questions-and-options.md#fresh-builder-ambiguity-check) before affected execution.

Trace relevant callers and consumers at the changed seam; select checks from requirements and risk, not a universal set of test layers. Identify validation, errors, state retention, permissions, and side effects only where affected. New product/schema/API/auth decisions trigger the existing escalation path.

## Better alternative within authority

For consequential unresolved design choices, optionally use
[isolated design comparison](../../prototyping/references/design-comparison.md).
Keep production edits with the current owner; the comparison supplies evidence
and does not change authority or permit prototype code promotion.

When a material alternative is supported by evidence, present:

`current approach -> alternative -> benefit/trade-off -> impact -> recommendation`

Impact names behavior, acceptance, interfaces, dependencies, risk, and verification affected. Requirement, acceptance, or contract changes return to their BRD/PRD/FSD owner before implementation. Reversible implementation details within existing authority need no micro-approval; document the choice briefly and proceed. Do not ask for approval merely to reuse an established pattern.

Product confirmation is an interaction requirement for an end user; it is distinct from permission for the coding agent. Add review/edit/confirm/regenerate controls only when feature requirements and risk justify them.
