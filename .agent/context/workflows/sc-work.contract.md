Start from active user intent; when resuming, reconcile docs/STATE.md Next action.
Checkpoint only for human input/blockers/replies: `.agent/context/checkpoint.contract.md`.
Tier first (agentic-delivery/references/workflow-integration.md): `Tier:
light|full; trigger: T<n>|none`. `light`: a request/pointer; trivial edits execute directly.
`full`: one approved FSD goal or its pointer. Stop with `OPEN-*` for missing authority. Material escalation: `ESCALATE: T<n>`
to its owner; continue independent authorized work.

Load:

- Issue/FSD `GOAL-*`, authority refs, target files/tests.
- `.agent/context/skills/sc-work.contract.md`.
- `node .agent/tools/knowledge-search.mjs "<goal>" --require-complete`; known scope flags; ERR-*/LRN-* advise, accepted decisions bind.
- `.agent/context/skills/git-workflow-operation.contract.md` only when needed.

In `full`, before edit/execution require `ready-for-agent` and every `Blocked by`
dependency `verified`. Check the pinned contract version and `ui_delivery_role`
against its `required_gate`; `HARDENING` requires every delivery slice verified.
Invalid evidence blocks affected goals with `OPEN-*`.

Networked `FIRST_VERTICAL_SLICE`: real provider, auth/permission, success and
representative failure via `integration-checking`; mock-only proof cannot release
scale-out. Once verified, the active controller uses planning-owned deterministic
promotion for eligible `SCALE_OUT_SLICE` pointers without planning re-entry solely
for metadata; `FIRST_VERTICAL_SLICE_VERIFIED` remains mandatory. Material changes
return to `/sc-plan`/owner. Parallel scale-out: independent goals,
baseline VALIDATED, applicable pinned contract, one shared writer, isolation.
LOCAL_ONLY uses mapped local checks without provider barriers.

Both tiers: current flow, reusable pattern, affected boundaries/callers, proving checks.
Full: FSD refs; light: acceptance/regression note. Alternatives: approach -> alternative
-> benefit/trade-off -> impact -> recommendation. Changed acceptance/contracts
return to owner; reversible details proceed. UI/integration: safe recovery, no duplicate retry effects.
Live proof: verification-before-completion/references/live-verification.md.
Block protected-base edits. Test-first per `tdd_mode`; run mapped verification
before completion; bounded `HARDENING` covers required integration/UI evidence
and applicable human judgment/UAT per approved acceptance.
Verified outcomes: `/sc-compound`; checkpoint captured/skip/pending closeout; retry capture, never verified work. Tiny skips need no checkpoint.
Close: docs/STATE.md Next action when non-trivial; /sc-pause only for actual stops.

Resume: memory-maintenance.mjs resume; reconcile constraints/inbox and affected drift; skip verified goals.

Stage: FSD approval + execution authorization persist.

`No Evidence = Not Done`: canonical gate `verification-before-completion`.
Pin all-AC completion contract before results; actual assertions prove the goal.
Light/single: `.scratch/completion/<task-id>/`, `verified-promise.mjs --contract <path>`;
multi-goal: `--run <id>` also proves final combined outcome. Required incomplete,
failed/skipped/stale proof cannot promote verified/done or release dependencies.
Completion report: `Evidence of Completion` with what/how, actual result/locator,
and all-AC mapping; otherwise accurate incomplete status.
