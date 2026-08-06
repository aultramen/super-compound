# /sc-work Runtime Contract

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Execute one approved FSD goal or `.scratch/<feature>/issues/` pointer. The Budget
& Stop Wizard requires fresh human confirmation at every `START`/`RESUME`.
Output/context token budget is separate from the Loop Run resource budget.
Before mutation persist `ACTION_INTENDED`, then require `.agent/tools/loop-run.mjs
validate-gate --run <run_id> --operation source-write`; validate-gate `work`
before worker dispatch. A denied or stale `work` result permits no dispatch;
failure or OBSERVE permits no source write.

Load only:

- The issue or exact FSD `GOAL-*`, referenced authority, target files, and tests.
- `.agent/context/skills/sc-work.contract.md`.
- `.agent/context/skills/git-workflow-operation.contract.md` only when needed.

Before edit/execution, require `ready-for-agent` and every `Blocked by` dependency
`verified`. Check the pinned contract version and `ui_delivery_role` against its
`required_gate`; `HARDENING` requires every delivery slice verified. Missing,
unsatisfied, stale, or mismatched evidence returns `needs-info`/`blocked` and
stops with `OPEN-*`. Stop with `OPEN-*` on missing authority; never invent it.

A `FIRST_VERTICAL_SLICE` uses a real provider/backend and proves auth/permission,
success, and representative failure through `integration-checking`; mock-only
evidence cannot permit scale-out. Once verified, return to `/sc-plan` to promote
eligible `SCALE_OUT_SLICE` pointers. Parallel scale-out also requires 2+
independent streams, baseline `VALIDATED`, unchanged contract, one shared-file
writer, and isolated worktrees.

Block protected-base edits. Run mapped verification before completion; bounded
`HARDENING` covers required integration/UI evidence and UAT approval.
