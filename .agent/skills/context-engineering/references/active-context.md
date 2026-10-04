# Active Instructions and Completion Recovery

Load for fresh dispatch, compaction, instruction correction, or resume. An
instruction remains active across agents until its owner explicitly supersedes
it. Preserve the applicable user and repository instructions, authority,
acceptance, scope, required verifier, and budget as mandatory context.

Optional `constraints` metadata in work-package create input and checkpoint
input is an array of `{id, instruction, source, scope, supersedes}`. `source`
is a repository locator or `user:<decision-id>`; `scope` names goal IDs or `*`;
`supersedes` lists prior IDs. Capture actual instructions and decision provenance,
never invented policy. Keep prior entries when adding a correction. Contract
file hashes still belong in checkpoint `contractRefs`. An instruction digest
binds the complete metadata; a digest does not prove prose truth or authority.

`work-package.mjs constraints --run <run> --goal <goal> --input-file <json>`
accepts `constraints` and `expectedVersion`. It appends correction provenance
without erasing history. On resume, `memory-maintenance.mjs resume` returns
`activeConstraints` and `pendingCompletions`, merging checkpoint and current
ledger metadata. Conflicting identities fail closed. Persist the reconciled
constraints in the next checkpoint; explicit supersession determines relevance.

Use `work-package.mjs dispatch --run <run> --goal <goal>` immediately before
dispatch. Its returned `text` reconstructs the brief with current relevant
instructions, source, and scope. Dispatch this complete text rather than a
stale brief file. `skip_verified` never dispatches implementation; `blocked` or
`not_ready` requires owning-route reconciliation. Optional input `maxTokens`
remains a hard cap. Mandatory instruction overflow cannot drop constraints.

Drain received completion receipts through the scheduler before considering
redispatch: [completion inbox](../../subagent-orchestration/references/completion-inbox.md).
Finish classification/acknowledgement for already valid work; do not execute it
again for administrative freshness. Status remains read-only; work/debug/pause
own lifecycle writes. At closeout or owning resume, flush at most three pending
capture/check receipts with `memory-maintenance.mjs flush`; preserve the rest.

If STATE, checkpoint, and scoped knowledge cannot explain a decision, record a
bounded historical-recall proposal. Transcript search is P2, requires explicit
workspace/topic scope, and is not default startup context.
