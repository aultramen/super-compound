---
description: "Execute an approved FSD goal or lightweight issue pointer with focused context, tests, and verification."
---

# Work Workflow

## Summary


Use this to implement a bounded change. Classify the delivery tier at intake per
`skills/agentic-delivery/references/workflow-integration.md` and state it in one
line: `Tier: light|full; trigger: T<n>|none`. A `light` request is a plain
instruction or a `.scratch/<feature>/issues/` pointer; a `full` goal is an
approved FSD goal or its issue pointer. A single trivial change: just do it
directly, with tests and verification.

Before edits in either tier, identify current flow, reusable pattern, affected boundaries and callers/consumers, and proving checks for acceptance/regression. Full scope cites its FSD; light scope uses a brief existing note. Compare material alternatives through `executing-plans/references/authority-and-workspace.md`; changed requirements/acceptance/contracts return to their owner, while reversible details within authority proceed.


## Example

Input: `/sc-work Ubah teks tombol Simpan menjadi Simpan perubahan`.
Prerequisite: Exact light change and expected result; full scope needs approved FSD plus execution authorization.
Result and next action: Scoped implementation, changed files and actual checks; /sc-review assesses the diff.

## Steps

1. Apply the compact execution checks; load `skills/agentic-delivery/SKILL.md`,
   `skills/context-engineering/SKILL.md`, and `skills/executing-plans/SKILL.md`
   only for uncovered procedure detail. Before editing, reuse resident standards
   or load only the applicable sections of `docs/engineering-standards.md` or
   project `CODING_STANDARDS.md`; independent review checks conformance afterward.
2. Start from active user intent; reconcile the `docs/STATE.md` Next action when resuming. Read the `.scratch/<feature>/issues/<NN>-<slug>.md` issue or direct FSD goal when one exists, then dynamically load only the referenced FSD sections, upstream BRD/PRD IDs, linked accepted ADRs, blockers, verification refs, and relevant code/tests. In `full`, an issue pointer must be `ready-for-agent` before any edit or execution.
   Search durable knowledge first with `node .agent/tools/knowledge-search.mjs "<goal area>"`; validate matching lessons against current evidence; accepted decisions bind only through their authoritative source.
3. In `full`, before any edit or execution, confirm every `Blocked by` dependency is
   satisfied at `verified`, not merely `done`; `HARDENING` requires every
   applicable UI delivery slice to be `verified`.
4. In `full`, confirm the FSD is approved, every referenced `TDEC-*` is approved, every linked ADR is `ACCEPTED`, and no `OPEN-* BLOCKER` affects the goal. For UI work under trigger T3, validate that `ui_delivery_role` and `required_gate` are present and that the role-specific gate in the pinned authority is satisfied.
5. In `full`, confirm the pinned contract version and referenced schema/fixture/mock/typed
   consumer revisions match the approved FSD and issue pointer.
6. If pointer state, dependency, role gate, authority, or contract evidence is
   missing, unsatisfied, stale, or mismatched, leave/return the pointer to
   `needs-info` or `blocked`, stop only affected execution and explain each need
   using `.agent/context/checkpoint.contract.md`. Research available facts and
   run safe checks; retain prior acceptance/authorization, continue independent
   ready authorized goals, and perform authorized handoffs internally. Route scope to
   `/sc-explore`, observable behavior/AC to `/sc-prd`, and data/API/technical
   contract changes to `/sc-plan`. Do not repair authority drift silently in
   implementation. In `light`, a material scope/product/contract/access/data/
   side-effect/flow change discovered mid-work is written as `ESCALATE: T<n>`
   and routed using the canonical T1-T5 precedence; bounded feature/page novelty
   alone does not escalate. Never widen authorized scope silently.
7. If `gitWorkflow.enabled` is true, load `skills/git-workflow-operation/SKILL.md`, block direct work on protected base branches, and preview `/sc-go start <branch>` commands before edits when the task is feature, refactor, docs, or chore work.
8. Execute one goal at a time by default. A `CONTRACT_ENABLER` materializes
   the pinned schema, deterministic/edge fixtures, mock, typed consumer, and
   provider/consumer contract tests.
9. For networked UI, a `FIRST_VERTICAL_SLICE` must use a real provider or real backend and prove
   auth/permission, success, and at least one representative failure. Run
   `integration-checking` after the integrated slice. Mock-only evidence does not
   permit scale-out or `FIRST_VERTICAL_SLICE_VERIFIED`.
   A first slice may use a `VALIDATED` or `EXCEPTION_APPROVED` baseline. Once its
   issue is `verified`, the active controller applies planning-owned deterministic
   promotion to the dependency graph and eligible `SCALE_OUT_SLICE` pointers,
   without planning re-entry solely for metadata. Material semantics/risk changes
   return to `/sc-plan` or the relevant decision owner.
10. Use `skills/parallel-execution/SKILL.md` only for 2+ independent execution
   streams whose time saving exceeds coordination overhead, after the first vertical slice is verified, with the same contract version, no unresolved
   dependency/shared files, a single writer for contract/schema/generated
   artifacts/migrations/lockfiles, an experience baseline of `VALIDATED`, and an
   isolated Git worktree per stream. `EXCEPTION_APPROVED` never opens scale-out.
   Validate the DAG using `goal-waves.mjs --issues-dir <dir>`; dispatch
   dependency-ready goals with `--ready --state <state.json>` and host/resource
   slot limits. Waves are reporting boundaries, never global barriers. One
   scheduler serializes shared state with atomic replacement/version checks;
   quarantine only affected workers and preserve independent progress.
11. For UI tasks, follow `skills/interface-design/SKILL.md`.
12. Use `skills/test-driven-development/SKILL.md` for behavior changes and regressions, at the strictness `tdd_mode` sets.
13. Run task-level verification after each meaningful change. A `HARDENING` goal
    executes and records mapped integration, responsive, accessibility, E2E, and
    visual-regression checks where applicable; Business Owner UAT is required only
    for explicit acceptance or unresolved material human judgment.
14. Run final verification with `skills/verification-before-completion/SKILL.md`.
    For multi-goal runs, completion additionally requires the machine-checked
    predicate `node .agent/tools/verified-promise.mjs --run <run-id>` to print
    `COMPLETE_ALLOWED`; a prose completion claim without it is void.
15. Summarize changed files, mapped requirement IDs, deviations, and verification evidence.
    If the goal surfaced a non-obvious fix, a costly mistake, or a new convention,
    route to `/sc-compound` before closing.
16. Write the `docs/STATE.md` Next action and continue authorized ready work.
    Use `/sc-pause` only when actually stopping.

## Output

- Implemented goal or change, with its tier line.
- Updated issue status when work came from `.scratch/`.
- Verification results.
- After a verified first slice, internal deterministic promotion of only eligible
  dependent scale-out pointers; do not mutate unrelated pointers or semantics.
- `OPEN-*` blockers, `ESCALATE: T<n>` notes, residual risks, or follow-up goals.

## Automatic knowledge closeout

After verification, the owning writer runs capture from
`knowledge-compounding/references/deterministic-loop.md` before closing. Skip
trivial solution records at the worth gate; retain ERR/LRN corrections and
conventions. Save evidence and checkpoint first so retry repeats only capture.
Before resumed dispatch, run memory-maintenance.mjs resume and reconcile STATE,
affected contract drift, and ledger; never re-run verified goals merely for hygiene.

LOCAL_ONLY UI follows the canonical topology applicability: mapped local behavior
checks, no artificial provider assets/roles. Unchanged enabler semantics
auto-promote through planning-owned checks in the active controller; compatible
proof reuse follows affected mappings.
Independent authorized goals continue while an affected stream is blocked.

## Prevention and Recovery

After verified capture, load `knowledge-compounding/references/prevention-checks.md`:
reuse existing checks first; add only an evidenced scoped regression. Save the
receipt and negative/deferred outcomes; acceptance and verifier authority remain.
At closeout or owning resume, run `memory-maintenance.mjs flush` once (max three
pending jobs). Retry only unfinished maintenance. Before fresh/resumed dispatch,
load `context-engineering/references/active-context.md`, reconcile constraints
and pending completion receipts, and skip valid verified goals.

Stage mode: For full-tier implementation require approved FSD plus separate execution authorization. Retain prior authorization across recovery and unchanged derived artifacts. Preserve existing project approval preferences on update.
