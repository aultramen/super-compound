---
name: subagent-orchestration
description: "Use when executing FSD goals with independent work packages. Dispatches a fresh subagent per goal with file-backed handoff and bounded review."
---

# Subagent Orchestration

Dispatch one fresh agent per independent FSD goal. Keep briefs, reports, diffs,
and review evidence on disk; messages carry paths and verdicts.

Announce: "I'm using subagent-orchestration for file-backed goal dispatch."

## Preconditions

- Goal has approved FSD authority, exact acceptance/test refs, and no unresolved
  `OPEN-*` blocker.
- For UI scope, the pointer includes `ui_delivery_role`, `required_gate`, and
  qualified pinned contract refs. `CONTRACT_ENABLER` is the only bounded
  DRAFT/BLOCKED exception; `FIRST_VERTICAL_SLICE` requires `READY_FOR_SLICE`;
  `SCALE_OUT_SLICE` requires a `VALIDATED` baseline and the pinned first-slice
  issue at `FIRST_VERTICAL_SLICE_VERIFIED`.
- `HARDENING` requires every applicable UI delivery slice dependency to be
  `verified`, final verification refs, and a named Business Owner for UAT.
- Parallel goals do not share unmerged files or mutable validation resources.
- Search existing code/tests before assuming anything is absent.

## File-Backed Process

1. The scheduler writes a JSON array of allowed repository-relative target
   paths, then creates one package from the lightweight issue pointer and that
   scheduler-owned scope:

   ```bash
   node .agent/tools/work-package.mjs create \
     --run <run-id> --goal <goal-id> --brief <issue-path> \
     --paths-file <scheduler-scope.json>
   ```

2. Send the implementer only the returned `briefPath`, `reportPath`,
   read-only `pathsPath`, exact target paths, and this constraint: implement one
   goal, use TDD when behavior changes, never edit the scheduler-owned scope,
   keep full evidence in `reportPath`, and return at most 15 lines containing
   outcome, paths, verification status, and blockers.
3. Run parallel goals only in isolated worktrees/workspaces. Review rejects a
   changed scope digest and any new working-tree edit outside the allowlist.
4. After implementation, freeze one working-tree review package:

   ```bash
   node .agent/tools/work-package.mjs review \
     --run <run-id> --goal <goal-id> --base <review-base>
   ```

   The scheduler-owned allowlist is mandatory. A parallel goal without an
   isolated workspace must fall back to sequential execution.

5. One fresh reviewer reads the brief, report, and patch once, then writes two
   separate verdicts: `SPEC` and `QUALITY`. Use
   `references/review-contract.md` for the detailed checklist.
6. Batch critical/important fixes into one correction wave. Rebuild the patch
   and re-review once. After two failed revision cycles, escalate.
7. Record the result:

   A `FIRST_VERTICAL_SLICE` must use a real provider or backend to prove
   auth/permission, success, and representative failure, with
   `integration-checking` evidence. Only then may its status be recorded
   `verified`; mock-only evidence is insufficient. Recheck `ui_delivery_role`,
   `required_gate`, and pinned contract revision immediately before recording any
   UI result.

   ```bash
   node .agent/tools/work-package.mjs record \
     --run <run-id> --goal <goal-id> --status verified \
     --verification "<short command result>"
   ```

## Invariants

- Never paste whole BRD/PRD/FSD/ADR or diff bodies into dispatch messages.
- Never invent schema, API, authorization, workflow, role, state, or UI behavior.
- Shared builds/tests run serially; safe search and isolated edits may fan out.
- Commits remain routed through `/sc-go` and only when requested.
- A spec failure and a quality failure remain distinct even though one reviewer
  reads the package once.

## Related Skills

Use `context-engineering`, `executing-plans`, `test-driven-development`,
`code-review`, and `verification-before-completion` as their active branches
require.
