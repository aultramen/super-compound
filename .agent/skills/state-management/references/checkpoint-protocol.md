# Checkpoint and Resume

Save verification evidence before capture, review, or interruption. Keep canonical
STATE fields updated through the owning route; preserve unrelated owner prose.
The checkpoint tool appends/replaces only its managed block in .continue-here.md.
It never treats the pre-compact timestamp as evidence of complete state.

```bash
node .agent/tools/memory-maintenance.mjs checkpoint --input-file .scratch/checkpoint.json
node .agent/tools/memory-maintenance.mjs resume --json
```

Input is an object with nextAction (one bounded executable step), verifiedOutcomes,
blockers, artifactRefs, contractRefs, and ledgerRefs (arrays, at most 20 each).
Use existing evidence locators and .scratch/work-packages/<run>/ledger.json.
Contract file hashes are pinned and compared during resume; missing/changed
contracts require reconciliation for affected consumers. Verified goals are
skipped; independent ready goals remain dispatchable when affected scope is
known. The scheduler derives optional `goalScopes` from the approved DAG:
`dependencies`, `blockers`, and `contracts` map to `<ledger-path>#<goal-id>`
locators. Dependencies cover every ledger goal; blocker messages and contract
paths bind to affected goals. Resume blocks those goals and descendants. Unknown
or incomplete scope fails closed; never guess that a blocker is unrelated. Missing or corrupt
checkpoints require read-only inspection of STATE and ledger, never guessed dispatch.

Checkpoint automatically through the owning route before planned compaction;
use `/sc-pause` when actually stopping. The deterministic pre-compact hook
checks checkpoint availability and preserves its existing timestamp marker; it
cannot invent next actions or recover unrecorded verification from conversation.
On interrupted capture, set nextAction to retry capture using saved evidence.
No implementation is repeated merely because capture failed. `/sc-status` remains
read-only; the active owning route repairs missing checkpoints without a
maintenance detour for independent authorized work.

Optional active instructions and completion recovery follow
[active context](../../context-engineering/references/active-context.md). Keep
all instruction provenance/supersession and ledgerRefs in the checkpoint.
