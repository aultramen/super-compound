# Execute and Re-Verify

## Summary

Repair the accepted gaps and rerun the checks that found them. Repeated failures
trigger reassessment; keep progressing within authorization while safe alternatives exist.

Load after the gap closure plan is accepted.

## Minimal Execution

Gap closure skips brainstorming, broad research, full replanning, and settled architecture decisions because the source evidence already defines the problem. It retains:

- `test-driven-development` for missing or broken behavior;
- `systematic-debugging` when the cause is unproven;
- focused verification after each repair;
- durable state updates for multi-session work.

Execute each cluster through `executing-plans`. Preserve already-verified behavior and avoid opportunistic cleanup.

## Re-Verification

1. Re-run the exact original command, scenario, review trace, or integration check that found each gap.
2. Confirm every source gap is closed with fresh evidence.
3. Run relevant regression checks to prove repairs did not break working behavior.
4. Update the source report and durable state with evidence.
5. If evidence reveals new gaps, create a bounded follow-up closure iteration.

After repeated failures (normally 2-3 attempts), reassess evidence and change
strategy or tool: use debugging for an unproven cause, architecture review for
boundary problems, and renewed planning for changed acceptance. Counts trigger
reassessment, not an automatic stop. Stop only the affected stream for missing
authority/access, hard limits, or demonstrated stagnation after safe alternatives.
Record remaining gaps and the next recovery; continue independent authorized work.

Completion requires the original verification to pass, regressions to remain green, and `verification-before-completion` to approve the final claim.
