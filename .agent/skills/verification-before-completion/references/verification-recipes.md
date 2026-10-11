# Maintained Verification Recipes

## Summary

Reuse the project's actual harness. Maintain one scoped recipe for launch ->
doctor -> drive -> evidence -> cleanup. Do not invent a second test framework.
Launch only when the existing harness needs a process; doctor checks actual
readiness, drive runs acceptance/regression/integration checks, evidence captures
outputs and source/contract/environment/command fingerprints, cleanup removes
temporary resources after evidence is durable. Keep evidence outside resources
that cleanup owns. Fail visibly if cleanup removes evidence.

Use `node .agent/tools/verification-recipe.mjs <recipe.json>` for a deterministic
local harness. Shape: id, environment (`LOCAL`, `MOCK`, `REAL`), evidencePath,
sourceRefs, optional launch command, doctor/drive/cleanup command arrays,
optional timeoutMs (legacy default 30 seconds, maximum 60 seconds per step).
Standards-bound recipes default to 5 minutes and permit at most 30 minutes per
step for stack validation. Each command is `{command,args}`;
execute argv directly, never concatenate shell input. Use project scripts and
existing installed tools. Empty launch means no service is necessary.

Save stdout/stderr, actual exit codes, recipe/source digests and timestamps
before cleanup. Cleanup results append to that evidence. Include any external
service/provider proof separately; mock success does not establish real
integration. A launch failure or interrupted drive is a failed/incomplete recipe,
not success. Never destroy unrelated user processes; the runner terminates only
its own launch child. Reuse live sessions when that is the project's harness.

`integration-checking` maps the required path and failures to the recipe;
`knowledge-refresh` verifies old recipes against the current harness and evidence
before updating guidance. A changed command/contract invalidates old proof.
Retain negative outcomes and artifact locators so cleanup never erases history.

Bind every required criterion from the pinned completion contract to a real
outcome assertion in the maintained recipe. A successful launch/build/deployment
or exit code alone does not establish feature, health or acceptance success.
Capture assertion outcomes and actual fail/skip/counts; preserve failed evidence.
The shared completion validator checks full coverage and freshness before any
`verified` mutation. It reads saved recipe/observation evidence rather than
implicitly executing commands. See [Claim Evidence](claim-evidence.md) for the
contract, manual inspection requirements and mandatory completion report.

The existing harness writes an outcome artifact referenced by the recipe's
`outcomesPath`; the runner captures it with provenance. Pin `recipeRef` and
`contractPath`; the drive command produces outcomes from actual assertions.
Minimal outcome shape:

```json
{
  "schema": "verification_outcomes_v1",
  "taskId": "GOAL-001",
  "criteria": [{
    "criterionId": "AC-001",
    "expected": "Application health is ready",
    "observed": "GET /health returned 200 with ready=true",
    "status": "pass",
    "evidenceRefs": [".scratch/completion/GOAL-001/health-response.json"]
  }]
}
```

Retain optional real test `counts: {total, passed, failed, skipped}`; manual
criteria also require `inspection: {inspected: true, observer, timestamp, steps}`
and opening/comparing the artifact. Regression criteria bind `regression:
{beforeRef, afterRef}` to actual failing and passing evidence. Observation proof
also pins `contractDigest`. Do not manufacture result JSON from confidence;
the maintained harness/assertion or actual recorded inspection produces it.

For active pinned standards, resolve and save the scoped standards snapshot,
execute its applicable gates, and save their receipt before running the acceptance
recipe. Bind both references and the effective digest in the completion contract.
The recipe fingerprints these existing gate inputs and rechecks their freshness
after drive/cleanup. Store gate outputs under `.scratch/standards/`; acceptance
outputs cannot alias the snapshot or receipt. This preserves the existing
completion gate and approval boundaries rather than creating a second status path.
