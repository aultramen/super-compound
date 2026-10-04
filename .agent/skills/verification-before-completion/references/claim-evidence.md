# Claim Evidence

Load this reference when selecting evidence for a concrete status claim, validating a regression test, or checking delegated work.

## Gate Function

Before expressing success:

1. **Identify** the exact command that proves the claim.
2. **Run** the complete command in current state or validate identical fingerprints and provenance of reusable evidence per `agentic-delivery/references/workflow-integration.md#evidence-identity`.
3. **Read** its relevant output, exit status, warnings, and failure count.
4. **Verify** that the result proves the same scope as the claim.
5. **Claim** only what the evidence supports, and name the evidence.

Skipping a step is not verification.

## Evidence Matrix

| Claim | Required evidence | Insufficient substitute |
|---|---|---|
| Tests pass | Relevant test command reports zero failures | Old run or "should pass" |
| Linter clean | Relevant lint command reports zero errors | Partial file check |
| Build succeeds | Build exits successfully | Linter or typecheck alone |
| Bug fixed | Original symptom and regression test pass | Code changed |
| Regression protects behavior | Test fails without fix and passes with fix | One green run |
| Agent completed work | Inspect diff and evidence identity/provenance; rerun when invalidated | Agent success report |
| Requirements met | Requirement-by-requirement evidence | Tests alone |

For a regression test, preserve the original failing test without the fix and passing result with it. That RED/GREEN cycle proves sensitivity once. Use an isolated baseline or safe toggle only when original RED evidence is missing or inadequate; preserve user work. Do not repeat identical deterministic checks as a ritual.

## Scope Rules

- Fresh means evidence identifies the same relevant state: source/dirty digests, contract/fixture revision, environment/configuration, command/arguments, scope, timestamp and actual result counts. Changed inputs, merge, missing provenance, nondeterminism, or material risk require re-verification.
- Full means all checks relevant to the stated scope. A narrow check supports only a narrow claim.
- Read output instead of trusting exit status alone when tools can skip, quarantine, or warn.
- A successful diff inspection proves files changed, not behavior.
- Manual evidence must use repeatable steps, expected outcomes, and observed results.

## Rationalization Counters

| Excuse | Counter |
|---|---|
| "Just this once" | The gate has no deadline exception. |
| "It is obvious" | Obvious failures still fail commands. |
| "The check is slow" | Run it, narrow the claim, or report unverified status. |
| "No time remains" | Report what was and was not verified. |
| "The agent already tested" | Inspect provenance independently; reuse only identical deterministic evidence. |

Do not write "done", "fixed", "passing", "ready", "great", or equivalent satisfaction language before the evidence exists.
