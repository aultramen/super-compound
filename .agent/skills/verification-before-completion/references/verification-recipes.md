# Maintained Verification Recipes

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
optional timeoutMs (each step <=60 seconds). Each command is `{command,args}`;
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
