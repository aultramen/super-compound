---
name: verification-before-completion
description: "Use when about to claim work complete, fixed, passing, or ready, including before moving to the next planned task."
---

# Verification Before Completion

## Summary

**No Evidence = Not Done.** Evidence precedes every success claim for every task,
including trivial and light-tier work. Confidence, a changed diff, and another
agent's report are not evidence.

## When to Use

Apply before completion wording, task transition, commit/push/PR claims, or
delegation assuming previous success.

- For a test, build, lint, bug-fix, or delegated-work claim, read [Claim Evidence](references/claim-evidence.md).
- For a completed feature, workflow, plan, or gap-closure outcome, also read [Goal-Backward Verification](references/goal-backward.md).
- For work spanning components, services, layers, auth, configuration, events, or background jobs, read [integration-checking](../integration-checking/SKILL.md), run its checks, then return to this gate. Detailed cross-component checks live there, not here.

- For browser/live-service proof, load [Live Verification](references/live-verification.md) for existing sessions, safe credentials, and fresh evidence provenance.

## Completion Gate

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

1. Read the authoritative goal, requirements and every acceptance criterion;
   establish the full checklist before producing results.
2. Identify the command or inspection that proves each required outcome.
3. Run it against current state, or inspect reusable deterministic evidence with
   identical source/contract/environment/command fingerprints and provenance.
   Recheck live outcomes when external state can change.
4. Read all relevant output, the exit code, and fail/skip counts; compare actual
   results with expected outcomes. Verify artifacts by opening and inspecting them.
5. Only all required outcomes verified permits `Done`, `Completed`, `Resolved`,
   `Success`, or equivalent claims. Otherwise use the incomplete status and gaps
   from [Claim Evidence](references/claim-evidence.md).
6. Include **Evidence of Completion**: what, how, actual result/artifact locator,
   and requirement/AC mapping. A small task may use one concise paragraph.
7. Park nothing silently: an accepted-but-deferred finding lands in `docs/todos/YYYY-MM-DD-<slug>.md` (`todo-management`) or `docs/STATE.md` Deferred Ideas before the completion claim.

No executable proof available? Perform repeatable direct artifact inspection
against the full checklist. Missing required evidence or unresolved uncertainty
about an acceptance criterion prevents completion. Verification may be performed
by the implementing agent through a separate actual check; the coordinator
independently inspects delegated evidence before accepting it.

## Red Flags

| Thought | Required response |
|---|---|
| "It should work" / "I'm confident" | Run the proving check. |
| "A partial suite is enough" | Run the full relevant check or narrow the claim. |
| "The subagent said it passed" | Inspect diff and evidence provenance; rerun for changed state, gaps, merge, nondeterminism, or material risk. |
| "The linter passed, so the build/tests pass" | Each claim needs its own evidence. |
| "Different wording avoids the rule" | Implication of success is still a claim. |

## Integration

- `executing-plans` invokes this before task completion.
- `test-driven-development` supplies red-green evidence.
- `systematic-debugging` supplies symptom and regression evidence.
- `code-review` verifies findings before reporting them.
- `gap-closure` re-runs the original verification.
- `state-management` records verified status only after this gate.

- For harness launch/drive/cleanup, load [verification recipes](references/verification-recipes.md).
