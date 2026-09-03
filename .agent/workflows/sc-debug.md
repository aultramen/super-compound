---
description: "Reproduce, diagnose root cause, fix, and verify bugs or unexpected behavior."
---

# Debug Workflow

Use this for errors, failing tests, regressions, performance surprises, or behavior that differs from expectations.

## Loop Runtime v2 Boundary

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Diagnosis is read-only and needs no wizard. Writing `docs/debug/`, a regression
test, or a fix is a classified project mutation. Without an active
FSD-authorized run, return `OPEN-LOOP-AUTHORITY` before changing a test or fix
and perform no write. With valid authority, run the Budget & Stop Wizard at
`START` or `RESUME`, persist `ACTION_INTENDED`, and pass the `source-write` gate
before the first mutation. Diagnosis never silently upgrades itself into fix
authority.

## Steps

1. Load `skills/systematic-debugging/SKILL.md`.
2. State expected behavior, actual behavior, and the smallest reproducible case.
3. Capture the exact failing command, logs, stack trace, request, or UI path.
4. Search durable knowledge first with `node .agent/tools/knowledge-search.mjs "<symptom or component>"`; a matching `ERR-*`/`LRN-*` prevention rule is binding until superseded. Then form ranked hypotheses from evidence.
5. Test the most likely hypothesis with the smallest feedback loop.
6. If `gitWorkflow.enabled` is true and edits are needed, load `skills/git-workflow-operation/SKILL.md` and preview `/sc-go start fix/<slug>` or `/sc-go start hotfix/<slug>` after reproduction and before fixing.
7. Fix the root cause, preferably with a regression test.
8. Run verification and report evidence.
9. If a non-trivial investigation would exceed the chat envelope, save the complete investigation to `docs/debug/YYYY-MM-DD-<slug>.md` and return its path. Shape it as: reproduction as exact commands; every hypothesis, including failed ones, as one line each (`H1: cause -> test -> disproving evidence`); root cause as one paragraph; fix as the changed-path list; verification as command plus result. Never drop failed hypotheses or evidence. Then run `node .agent/tools/doc-lint.mjs <artifact>` and adjudicate its findings (advisory).
10. After a verified non-trivial root cause, route to `/sc-compound`. When the bug originated from an agent mistake, appending the `ERR-*` entry is mandatory.
11. Close by writing the `docs/STATE.md` Next action through the active
    source-write gate; without an active run, hand off with `/sc-pause`.

## Output

- Reproduction evidence.
- Root cause.
- Fix summary.
- Verification evidence.
- `docs/debug/YYYY-MM-DD-<slug>.md` when the complete investigation needs a durable sink.
