---
description: "Reproduce, diagnose root cause, fix, and verify bugs or unexpected behavior."
---

# Debug Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this for errors, failing tests, regressions, performance surprises, or behavior that differs from expectations.

Diagnosis is read-only. The fix phase is `light` by default: once the root cause
is proven, fix it with a regression test. If the fix materially changes contract compatibility, access policy, data,
or side effects (trigger T2) or a new capability (T1), write
`ESCALATE: T<n>` and route to `/sc-plan` or `/sc-prd` instead of widening the fix.


## Example

Input: `/sc-debug Email kosong lolos validasi login`.
Prerequisite: Symptom, reproduction and expected behavior.
Result and next action: Proven root cause, regression-tested fix and evidence; capture reusable lessons and /sc-review.

## Steps

1. Load `skills/systematic-debugging/SKILL.md`.
   Before fixes, resolve `.agent/context/standards.contract.md` for affected
   targets, inspect relevant tested examples/current patterns, and pin standards
   identity with regression evidence; diagnosis stays read-only.
2. State expected behavior, actual behavior, and the smallest reproducible case.
3. Capture the exact failing command, logs, stack trace, request, or UI path.
4. Search durable knowledge first with `node .agent/tools/knowledge-search.mjs "<symptom or component>"`; validate matching lessons against current evidence; accepted decisions bind only through their authoritative source. Then form ranked hypotheses from evidence.
5. Test the most likely hypothesis with the smallest feedback loop.
6. If `gitWorkflow.enabled` is true and edits are needed, load `skills/git-workflow-operation/SKILL.md` and preview `/sc-go start fix/<slug>` or `/sc-go start hotfix/<slug>` after reproduction and before fixing.
7. Fix the root cause, preferably with a regression test.
8. Apply `skills/verification-before-completion/SKILL.md`: verify the original
   symptom, regression, goal, and all acceptance criteria against current state.
   Preserve reproduce-before and verify-after or RED/GREEN evidence. A changed
   configuration or passing unrelated check is insufficient. Use the single/light
   completion contract gate, or the run gate for delegated goals; incomplete proof
   means an incomplete status. Every completion report includes
   `Evidence of Completion` with what/how, actual results/locators, and acceptance mapping.
9. If a non-trivial investigation would exceed the chat envelope, save the complete investigation to `docs/debug/YYYY-MM-DD-<slug>.md` and return its path. Shape it as: reproduction as exact commands; every hypothesis, including failed ones, with sufficient explanation (`H1: cause -> test -> disproving evidence`); root cause as one paragraph; fix as the changed-path list; verification as command plus result. Never drop failed hypotheses or evidence. Then run `node .agent/tools/doc-lint.mjs <artifact> --advisory` and adjudicate its findings (advisory).
10. After a verified non-trivial root cause, route to `/sc-compound`. When the bug originated from an agent mistake, appending the `ERR-*` entry is mandatory.
11. Write the `docs/STATE.md` Next action and continue authorized ready work.
    Use `/sc-pause` only when actually stopping.

## Output

- Reproduction evidence.
- Root cause.
- Fix summary, or `ESCALATE: T<n>` with its owner.
- Verification evidence.
- `docs/debug/YYYY-MM-DD-<slug>.md` when the complete investigation needs a durable sink.

## Automatic knowledge closeout

Use the [capture protocol](../skills/knowledge-compounding/references/deterministic-loop.md)
after verification. Save outcomes before retry; reconcile resume state and ledger
before dispatch so verified fixes are never implemented twice.

## Prevention and Recovery

Use `knowledge-compounding/references/prevention-checks.md` after the verified
fix for reuse/add assessment and durable disposition. Before cold continuation,
use `context-engineering/references/active-context.md` to reconcile instructions
and completion receipts. Flush at most three unfinished maintenance inputs;
retain the verified fix and remaining queue.
