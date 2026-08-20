---
description: "Execute an approved FSD goal or lightweight issue pointer with focused context, tests, and verification."
---

# Work Workflow

Use this only after there is an approved FSD goal or `.scratch/<feature>/issues/` issue pointer.

## Loop Runtime v2 Admission

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

The Budget & Stop Wizard is mandatory at every `START` and `RESUME`. Persist a
fresh host-attested human confirmation before the run enters `RUNNING`; a model
recommendation is never admission authority. Output/context token budget is
separate from the Loop Run resource budget and cannot satisfy this gate.

Before each implementation mutation, persist `ACTION_INTENDED`, then revalidate
the active run with `.agent/tools/loop-run.mjs validate-gate --run <run_id>
--operation source-write`. Use operation `work` before worker dispatch; a denied,
stale, expired, mismatched, non-`RUNNING`, or simulation-only `work` result
permits no dispatch. Any such `source-write` result permits no source write.
Every project-source write stays inside that active iteration.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`, `skills/context-engineering/SKILL.md`, and `skills/executing-plans/SKILL.md` when following the full execution procedure.
2. Read the `.scratch/<feature>/issues/<NN>-<slug>.md` issue or direct FSD goal, then dynamically load only the referenced FSD sections, upstream BRD/PRD IDs, linked accepted ADRs, blockers, verification refs, and relevant code/tests. An issue pointer must be `ready-for-agent` before any edit or execution.
   Search durable knowledge first with `node .agent/tools/knowledge-search.mjs "<goal area>"`; a matching `ERR-*`/`LRN-*` prevention rule is binding until superseded.
3. Before any edit or execution, confirm every `Blocked by` dependency is
   satisfied at `verified`, not merely `done`; `HARDENING` requires every
   applicable UI delivery slice to be `verified`.
4. Confirm the FSD is approved, every referenced `TDEC-*` is approved, every linked ADR is `ACCEPTED`, and no `OPEN-* BLOCKER` affects the goal. For UI work, validate that `ui_delivery_role` and `required_gate` are present and that the role-specific gate in the pinned authority is satisfied.
5. Confirm the pinned contract version and referenced schema/fixture/mock/typed
   consumer revisions match the approved FSD and issue pointer.
6. If pointer state, dependency, role gate, authority, or contract evidence is
   missing, unsatisfied, stale, or mismatched, leave/return the pointer to
   `needs-info` or `blocked`, stop and report `OPEN-xxx`. Route scope to
   `/sc-explore`, observable behavior/AC to `/sc-prd`, and data/API/technical
   contract changes to `/sc-plan`. Do not repair authority drift silently in
   implementation.
7. If `gitWorkflow.enabled` is true, load `skills/git-workflow-operation/SKILL.md`, block direct work on protected base branches, and preview `/sc-go start <branch>` commands before edits when the task is feature, refactor, docs, or chore work.
8. Execute one FSD goal at a time by default. A `CONTRACT_ENABLER` materializes
   the pinned schema, deterministic/edge fixtures, mock, typed consumer, and
   provider/consumer contract tests.
9. A `FIRST_VERTICAL_SLICE` must use a real provider or real backend and prove
   auth/permission, success, and at least one representative failure. Run
   `integration-checking` after the integrated slice. Mock-only evidence does not
   permit scale-out or `FIRST_VERTICAL_SLICE_VERIFIED`.
   A first slice may use a `VALIDATED` or `EXCEPTION_APPROVED` baseline. Once its
   issue is `verified`, return to `/sc-plan`; issue planning owns recomputing the
   dependency graph and can promote eligible `SCALE_OUT_SLICE` pointers.
10. Use `skills/parallel-execution/SKILL.md` only for 2+ independent execution
   streams whose time saving exceeds coordination overhead, after the first vertical slice is verified, with the same contract version, no unresolved
   dependency/shared files, a single writer for contract/schema/generated
   artifacts/migrations/lockfiles, an experience baseline of `VALIDATED`, and an
   isolated Git worktree per stream. `EXCEPTION_APPROVED` never opens scale-out.
   Plan streams as dependency waves with `node .agent/tools/goal-waves.mjs
   --issues-dir .scratch/<feature>/issues`; run wave N in parallel only after
   wave N-1 is `verified`. Any shared-state write (`docs/STATE.md`) during a
   wave holds the `docs/STATE.md.lock` exclusive lock.
11. For UI tasks, follow `skills/interface-design/SKILL.md`.
12. Use `skills/test-driven-development/SKILL.md` for behavior changes and regressions.
13. Run task-level verification after each meaningful change. A `HARDENING` goal
    executes and records mapped integration, responsive, accessibility, E2E, and
    visual-regression checks; the Business Owner performs or approves UAT.
14. Run final verification with `skills/verification-before-completion/SKILL.md`.
    For multi-goal runs, completion additionally requires the machine-checked
    predicate `node .agent/tools/verified-promise.mjs --run <run-id>` to print
    `COMPLETE_ALLOWED`; a prose completion claim without it is void.
15. Summarize changed files, mapped requirement IDs, deviations, and verification evidence.
    If the goal surfaced a non-obvious fix, a costly mistake, or a new convention,
    route to `/sc-compound` before closing.

## Output

- Implemented FSD goal.
- Updated issue status when work came from `.scratch/`.
- Verification results.
- After a verified first slice, deterministic handoff to `/sc-plan` to promote
  only eligible dependent scale-out pointers; do not mutate unrelated pointers.
- `OPEN-*` blockers, residual risks, or follow-up goals.
