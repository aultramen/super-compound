# Parallel, Revision, and Handoff

Load only for the matching execution branch.

## Parallel Execution

Parallel agents are allowed only when 2+ streams have independent file and
semantic ownership, no dependency on unmerged output, all `Blocked by` entries
are verified or absent, verification runs per goal, and time saving exceeds
coordination cost. UI scale-out additionally requires the first real vertical
slice verified, the same pinned contract version, a `VALIDATED` baseline, and a
single writer for schemas/generated artifacts/migrations/lockfiles.

Assign each agent one goal or cohesive group, exact paths, contract and fixture
refs, pinned revision, single-writer boundary, expected output, verification
command, conflict boundaries, and handoff format. Use isolated Git worktrees.
Merge deliberately and run real merged-system verification afterward; mock-only
evidence is not integration proof.

## Revision Mode

When verification fails:

1. Identify the exact failing check.
2. Fix only that behavior.
3. Re-run the failed check.
4. Repeat for at most three focused iterations.
5. If still failing, stop and report evidence and blocker.

Allowed: failing-test, lint/type, wiring, boundary-validation, and behavior-doc corrections. Avoid new features, broad refactors, scope expansion, and unrelated cosmetic churn.

## Durable State

Use existing project conventions:

- `docs/STATE.md` for current position and next action;
- `docs/progress.md` for chronology;
- `docs/tasks/tasks-*.json` only when already used or required;
- `docs/fsd/fsd-*.md` only for execution evidence or approved corrections;
- `.scratch/<feature>/issues/*.md` for issue-driven status;
- `.continue-here.md` only through `/sc-pause` handoff.

The next session must be able to run `/sc-status` and continue safely.

## Finish Line

- Goals are complete or explicitly deferred.
- Source issues and durable state are current.
- Verification ran and failures are disclosed.
- Behavior/setup/architecture documentation matches implementation.
- No stale workflow or skill names were introduced.
- `git status` was inspected for intended and unintended changes.
- Requested delivery operations went through `/sc-go`.
- Final response names changes, evidence, and residual gaps concisely.
