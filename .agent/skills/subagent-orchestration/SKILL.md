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
- UI pointers carry `ui_delivery_role`, `required_gate`, pinned contract refs;
  gates `READY_FOR_SLICE`, `FIRST_VERTICAL_SLICE_VERIFIED`, `HARDENING` (every
  UI slice `verified`, Business Owner UAT): [ui gates](references/ui-gates.md).
- Parallel goals do not share unmerged files or mutable validation resources.
- Search existing code/tests before assuming anything is absent.

## File-Backed Process

1. The scheduler writes a JSON array of allowed repository-relative target
   paths, then creates one package from the issue pointer and that
   scheduler-owned scope:

   ```bash
   node .agent/tools/work-package.mjs create \
     --run <run-id> --goal <goal-id> --brief <issue-path> \
     --paths-file <scheduler-scope.json> --input-file <create-input.json>
   ```

2. Send the implementer only the returned `briefPath`, `reportPath`,
   read-only `pathsPath`, exact target paths, and this constraint: implement one
   goal, use TDD when behavior changes, never edit the scheduler-owned scope,
   keep full evidence in `reportPath`, and return only outcome, paths,
   verification status, and blockers. Seed from
   `.agent/templates/orchestration/Implementer-Brief-Skeleton.md`.
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
   `references/review-contract.md` for the detailed checklist. Seed from
   `.agent/templates/orchestration/Reviewer-Brief-Skeleton.md`.
6. Batch critical/important fixes into one correction wave. Rebuild the patch
   and re-review once. Fix rounds cap at 5 with model escalation and a
   round-5 adjudication circuit breaker:
   [orchestration loop](references/orchestration-loop.md).
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
     --verification "<short command result>" \
     --input-file <transition-input.json>
   ```

## Ledger, Recovery, Model Tiers

Ledger grammar, post-compaction recovery (trust ledger and `git log` over
recollection), anti-history dispatch, and the extraction/generation/ceiling
tier ladder: [orchestration loop](references/orchestration-loop.md).

## Invariants

- Never paste whole BRD/PRD/FSD/ADR or diff bodies into dispatch messages.
- Never invent schema, API, authorization, workflow, role, state, or UI behavior.
- Shared builds/tests run serially; safe search and isolated edits may fan out.
- Commits remain routed through `/sc-go` and only when requested.
- A spec failure and a quality failure remain distinct even though one reviewer
  reads the package once.

## Related Skills

`context-engineering`, `executing-plans`, `test-driven-development`,
`code-review`, `verification-before-completion`.
