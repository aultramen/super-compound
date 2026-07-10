# Fix and Regression

Load this reference only after investigation confirms the root cause.

## Phase 4: Implementation

1. Write a test that reproduces the exact symptom through the highest useful public seam.
2. Run it and confirm an expected failure, not a setup error.
3. Implement the smallest change at the root-cause level, not at the visible symptom.
4. Run the test and confirm it passes.
5. Prove regression sensitivity: remove or disable the fix safely and confirm the test fails, then restore it and confirm it passes. If this cannot be done safely, retain the original RED evidence and state why.
6. Run nearby and broader relevant checks.

Do not replace diagnosis with workarounds, broad exception handling, retries, or validation only at the symptom layer. If the correct fix exceeds the task's approved scope, stop and create or request a plan.

## Cleanup

- Re-run the original feedback loop and regression test.
- Remove temporary logs, breakpoints, fixtures, trace probes, and throwaway harnesses.
- If probes have a unique prefix, grep for it before completion.
- Record the confirmed hypothesis in the appropriate progress, PR, commit, or solution documentation when authorized.
- If no proper regression seam exists, record the architecture gap and consult `architecture-enforcement`.

Use `verification-before-completion` before saying the bug is fixed. The claim must cite fresh symptom, regression, and relevant suite evidence.
