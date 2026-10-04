---
name: verification-before-completion
description: "Use when about to claim work complete, fixed, passing, or ready, including before moving to the next planned task."
---

# Verification Before Completion

## Overview

Evidence precedes every success claim. Confidence, a changed diff, and another agent's report are not evidence.

## When to Use

Apply this gate before any completion or satisfaction wording, task transition, commit, push, PR claim, or delegation that assumes preceding work succeeded.

- For a test, build, lint, bug-fix, or delegated-work claim, read [Claim Evidence](references/claim-evidence.md).
- For a completed feature, workflow, plan, or gap-closure outcome, also read [Goal-Backward Verification](references/goal-backward.md).
- For work spanning components, services, layers, auth, configuration, events, or background jobs, read [integration-checking](../integration-checking/SKILL.md), run its checks, then return to this gate. Detailed cross-component checks live there, not here.

- For browser/live-service proof, load [Live Verification](references/live-verification.md) for existing sessions, safe credentials, and fresh evidence provenance.

## Completion Gate

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

1. Identify the command or inspection that proves the exact claim.
2. Run it against current state, or inspect reusable evidence with identical source/contract/environment/command fingerprints and complete provenance.
3. Read all relevant output, the exit code, and failure counts.
4. Compare the evidence with the claim and requirements.
5. If it fails or is incomplete, report actual status and gaps. Otherwise cite the evidence with the claim.
6. Park nothing silently: an accepted-but-deferred finding lands in `docs/todos/YYYY-MM-DD-<slug>.md` (`todo-management`) or `docs/STATE.md` Deferred Ideas before the completion claim.

No executable proof available? Use an explicit requirement checklist and direct artifact inspection; disclose residual uncertainty. Never convert missing evidence into success wording.

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

- For repeatable harness launch/drive/cleanup, load [verification recipes](references/verification-recipes.md).
