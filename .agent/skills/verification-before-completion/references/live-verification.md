# Live Verification and Evidence

## Summary

Load only when browser-visible behavior or a real service/session must be proven. Use the project's mapped harness/configuration, fixtures, selectors, and authenticated session; do not invent a new E2E command or replace assertions with screenshots.

## Prepare

- Resolve required critical flows, permissions, representative failure, recovery, and retry checks from approved acceptance/risk. Use development, UAT, or testing environment appropriate to the task.
- Reuse configured browser tooling and isolated synthetic fixtures. Locate environment variable names and documented setup; never print their values, credentials, tokens, cookies, or private session contents. Use an existing authorized authenticated session rather than asking for secrets in chat. Redact sensitive screenshot/trace content before attaching it.
- If browser, service, credential, or session is unavailable, record exactly which checks cannot run and why. Continue independent checks, but report the affected scope as unverified. An old screenshot cannot fill this gap.

## Execute after the change

1. Run the mapped command against the current revision and environment after the change. Observe exit status and pass/fail/skip counts; investigate failures rather than hiding them with weaker assertions.
2. Capture actual evidence at relevant success checkpoints as well as failures: resulting screen, recovered draft/selection, permission result, or critical workflow completion. Use screenshots, traces, videos, and reports supported by the existing harness; do not require every artifact for every task.
3. Assert data mutations, permissions, integration effects, and retry deduplication through the appropriate API/domain/provider checks. A screenshot proves only the visible state; a mock is not real service proof.
4. Bind each evidence location to the exercised acceptance/check, revision, environment (including MOCK/REAL), exact command, timestamp, actual result/counts, and fixture/session reference (no secret values). If the worktree is dirty, include a digest of tested changes/assets so revision alone does not misidentify the tested state.
5. After further edits affecting the flow, rerun the affected checks and recapture evidence. Stale or unrelated screenshots are not success evidence.

## Record and report

Use the existing verification/eval/issue artifact rather than a new authority document:

| Check / requirement | Revision + change digest | Environment | Command / steps | Time | Actual result | Evidence path |
|---|---|---|---|---|---|---|
| <ref> | <revision/digest> | <dev/UAT/testing; MOCK/REAL> | <exact command> | <UTC time> | <pass/fail/skip + counts> | <artifact locator> |

The chat report stays concise: outcome, main changes, root cause for a bug, actual
tests/results and regression coverage, evidence locator, and remaining unverified
checks. Include **Evidence of Completion** with what/how/result and AC mapping
only when all criteria are proven. Open screenshots and compare the intended
screen/visual AC; their existence alone is not proof. Keep detailed commands and
evidence in the existing artifact. Missing credentials, malformed AI output, or
stale screenshots never justify a successful flow claim.
