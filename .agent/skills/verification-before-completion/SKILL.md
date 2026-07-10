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

## Completion Gate

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

1. Identify the command or inspection that proves the exact claim.
2. Run it now, fully and freshly.
3. Read all relevant output, the exit code, and failure counts.
4. Compare the evidence with the claim and requirements.
5. If it fails or is incomplete, report actual status and gaps. Otherwise cite the evidence with the claim.

No executable proof available? Use an explicit requirement checklist and direct artifact inspection; disclose residual uncertainty. Never convert missing evidence into success wording.

## Red Flags

| Thought | Required response |
|---|---|
| "It should work" / "I'm confident" | Run the proving check. |
| "A partial suite is enough" | Run the full relevant check or narrow the claim. |
| "The subagent said it passed" | Verify independently. |
| "The linter passed, so the build/tests pass" | Each claim needs its own evidence. |
| "Different wording avoids the rule" | Implication of success is still a claim. |

## Integration

- `executing-plans` invokes this before task completion.
- `test-driven-development` supplies red-green evidence.
- `systematic-debugging` supplies symptom and regression evidence.
- `code-review` verifies findings before reporting them.
- `gap-closure` re-runs the original verification.
- `state-management` records verified status only after this gate.
