# Claim Evidence

## Summary

Load this reference when selecting evidence for a concrete status claim, validating a regression test, or checking delegated work.

## Gate Function

Before expressing success:

1. **Identify** all goal, requirement and acceptance refs from the authoritative
   request/FSD; lock the checklist before collecting results. Identify the exact
   command or inspection that proves each required outcome.
2. **Run** the complete command in current state or validate identical fingerprints and provenance of reusable evidence per `agentic-delivery/references/workflow-integration.md#evidence-identity`.
3. **Read** its relevant output, exit status, warnings, and failure count.
4. **Verify** that actual outcome assertions cover the whole requested scope.
   Command success proves execution, not that the goal was achieved.
5. **Claim** completion only after all required outcomes pass; include the
   **Evidence of Completion** report below. Failed or skipped required checks
   prevent completion even if the overall command exits zero.

Skipping a step is not verification.

## Evidence Matrix

Choose task-relevant evidence; do not substitute an implementation step for the
intended outcome. All tasks use this rule; small changes may need only a
repeatable direct inspection of the real artifact.

| Task | Minimum outcome proof |
|---|---|
| UI task | Open screenshot/resulting screen and compare against visual AC; test interaction behavior where required |
| API task | Execute request and compare actual status/payload with expected response |
| Code task | Execute relevant tests or functional assertions of requested behavior |
| Deployment task | Deployment result plus health/access check of deployed application |
| Infrastructure task | Command/service result plus required connectivity or health check |
| Automation/workflow task | End-to-end execution reaches the expected output and side effects |
| File/artifact generation | File exists and is opened, inspected or validated against expected content |
| Bug fix | Reproduce-before plus verify-after, or regression RED/GREEN proving the symptom is removed |

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
- Manual evidence must use repeatable steps, expected outcomes, and observed
  results. Open and compare referenced artifacts; file existence alone is not
  visual/content verification.
- The implementing agent may perform a separate real verification. For delegated
  work the coordinator inspects actual evidence and coverage independently;
  agent reports, reasoning, or an untyped review assertion never replace proof.

## Completion Contract and Local Gate

Store one `completion_contract_v1` snapshot of the authoritative request/FSD:
`taskId`, `goal`, `authorityRefs`, `sourceRefs`, and `criteria` with stable IDs,
requirement/AC refs, expected outcomes, task-relevant evidence methods and
recipe/observation refs. It is derived coverage, not new requirement authority.
Compare its complete checklist with the source before accepting evidence; a
report may not choose a convenient subset after results are known.

For a light/single task, use `.scratch/completion/<task-id>/` for the contract and
evidence without creating BRD/PRD/FSD or a swarm ledger. Gate through
`node .agent/tools/verified-promise.mjs --contract <path>`; ledger work uses
`--run <run>`. The gate reads saved evidence and never reruns commands implicitly.
Pin the contract path/digest before collecting completion results. Evidence records
retain expected/observed outcomes, actual pass/fail/skip results, command/steps,
timestamp, environment, source/contract/recipe fingerprints and artifact locators.
One artifact may support several AC; every AC still requires a matching assertion.

Manual observations also identify observer, inspected artifact/digest, current
state, repeatable procedure, expected/observed outcome and inspection result.
The verifier opens the artifact; a structural validator cannot judge its visual
correctness. External live outcomes require a fresh observation when state changes.
Use [verification recipes](verification-recipes.md) for maintained local execution.
No empty, prose-only, failed, required-skipped, partial, wrong-scope or stale proof
permits a new `verified` transition or dependency release. Historical metadata
remains inspectable and does not establish current completion authority.

## Status and Completion Report

`Done` / `Completed` / `Resolved` / `Success`, including equivalent wording,
requires all requested goal, requirement and acceptance outcomes to be verified.
Preserve existing machine/issue enums; use these human labels for incomplete work:

| Actual state | Report status |
|---|---|
| Implementation exists; checks outstanding | Implemented — Pending Verification |
| Some criteria verified; others outstanding | Partially Verified |
| An outcome check fails | Verification Failed |
| Required evidence unavailable, invalid or stale | Needs Validation |
| A genuine missing input/access/authority prevents progress | Blocked |

Every completed task includes this exact heading, with concise prose instead of a
table permitted for a small task:

```markdown
## Evidence of Completion

| Requirement / AC | What was verified | How | Actual result and evidence |
|---|---|---|---|
| <ref> | <outcome> | <executed command/inspection> | <result + artifact locator> |
```

Report incomplete criteria and next action when the gate fails. Configuration
updated, code written, deployment command successful and workflow created are
steps; verify working behavior, application access and workflow output before
claiming the corresponding goal achieved.

## Rationalization Counters

| Excuse | Counter |
|---|---|
| "Just this once" | The gate has no deadline exception. |
| "It is obvious" | Obvious failures still fail commands. |
| "The check is slow" | Run it, narrow the claim, or report unverified status. |
| "No time remains" | Report what was and was not verified. |
| "The agent already tested" | Inspect provenance independently; reuse only identical deterministic evidence. |

Do not write "done", "fixed", "passing", "ready", "great", or equivalent satisfaction language before the evidence exists.
