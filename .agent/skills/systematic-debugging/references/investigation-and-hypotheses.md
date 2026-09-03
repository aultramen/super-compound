# Investigation and Hypotheses

Load this reference before any production fix.

## Phase 1: Root-Cause Investigation

### Build a tight feedback loop

Choose the smallest repeatable signal that can go red on the user's exact symptom:

1. Failing test at the highest seam reaching the bug
2. Curl or HTTP script against a running server
3. CLI command with fixture input and expected output
4. Headless browser assertion over DOM, console, or network
5. Captured trace replay
6. Throwaway harness around the smallest subsystem
7. Property or fuzz loop for intermittent output
8. Bisection or differential harness for a regression

Make it fast and deterministic. If a person must act, define structured inputs, steps, expected output, and captured evidence.

### Gather evidence

- Read every error, warning, stack frame, path, line, and code.
- Reproduce consistently. If intermittent, record frequency and varying inputs.
- Inspect recent commits, configuration, dependency, and environment changes using the relevant diff/history commands.
- Isolate the failing layer: input, validation, processing, persistence, transport, or presentation.
- Log or inspect actual values at boundaries; do not rely on assumed contracts.
- Trace backward from symptom to the first point where correct data becomes incorrect.

For multi-component failures, verify output and input on each boundary in order. For environment-specific failures, compare runtime versions, configuration, browser/platform, scale, timing, and resource limits.

## Phase 2: Pattern and Assumption Analysis

Test claims such as "config loaded", "path executed", "function returns X", or "value is Y" with runtime evidence. Compare working and failing cases. Look for races, boundary-size changes, stale state, and contract mismatches.

## Phase 3: Hypotheses

Rank the candidate causes the evidence supports, each with the observation that would confirm or refute it. Test the highest-confidence hypothesis with the smallest reversible observation or change. Change one variable, record the result, and revise the ranking. If the top three fail, return to Phase 1 instead of trying low-confidence patches.

Exit investigation only when evidence identifies a cause and the chosen hypothesis predicted the observed result.
