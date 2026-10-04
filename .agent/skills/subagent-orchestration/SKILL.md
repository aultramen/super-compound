---
name: subagent-orchestration
description: "Use when executing FSD goals with independent work packages. Dispatches a fresh subagent per goal with file-backed handoff and bounded review."
---

# Subagent Orchestration

Delegate when independence justifies overhead. Keep evidence on disk; messages carry paths/verdicts.

If the host has no subagent capability, execute goals and the same review checks sequentially in-thread. Preserve scope, authority, and evidence; disclose that review lacked independent worker isolation. Host limitations alone do not create an approval checkpoint.

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

2. Scheduler records `ready -> in-progress -> implemented -> verified` in order;
   never jump from `ready` to `verified`. Each transition uses current
   `ledgerVersion` as `expectedVersion`; generate JSON from
   [review contract](references/review-contract.md#scheduler-input-and-transition-contract).
   Send `briefPath`, `reportPath`, read-only `pathsPath`, target paths, TDD
   requirement, and outcome/evidence/blocker return format. Implementers never
   edit scheduler scope. Seed `.agent/templates/orchestration/Implementer-Brief-Skeleton.md`.
3. Run parallel goals only in isolated worktrees/workspaces. Review rejects a
   changed scope digest and any new working-tree edit outside the allowlist.
4. After implementation, freeze one working-tree review package:

   ```bash
   node .agent/tools/work-package.mjs review \
     --run <run-id> --goal <goal-id> --base <review-base>
   ```

   The scheduler-owned allowlist is mandatory. A parallel goal without an
   isolated workspace must fall back to sequential execution.

5. Use scheduler self-review for mechanical, low-risk goals; use a fresh
   independent reviewer for material behavior, security, contracts, or complex
   changes. The reviewer reads the brief, report, and patch, then writes two
   separate verdicts: `SPEC` and `QUALITY`. Use
   `references/review-contract.md` for the detailed checklist. Seed from
   `.agent/templates/orchestration/Reviewer-Brief-Skeleton.md`.
6. Batch critical/important fixes into one correction wave. Rebuild the patch
   and re-review affected evidence. Failed attempts trigger reassessment and
   escalation; mandatory failures stay open until fixed or truthfully blocked:
   [orchestration loop](references/orchestration-loop.md).
7. Record the result:

   Networked `FIRST_VERTICAL_SLICE` requires real provider auth/permission,
   success, and failure proof through `integration-checking`; mock-only proof
   cannot release dependents. Recheck role, applicable gate, and pinned revision.

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

- Composer/recovery checks: [bounded payloads](references/bounded-payloads.md).

- Never paste whole BRD/PRD/FSD/ADR or diff bodies into dispatch messages.
- Never invent schema, API, authorization, workflow, role, state, or UI behavior.
- Shared builds/tests run serially; safe search and isolated edits may fan out.
- Commits remain routed through `/sc-go` and only when requested.
- A spec failure and a quality failure remain distinct even though one reviewer
  reads the package once.

## Related Skills

`context-engineering`, `executing-plans`, `test-driven-development`,
`code-review`, `verification-before-completion`.

- Completion/recovery: [inbox](references/completion-inbox.md); classify before acknowledgement.
