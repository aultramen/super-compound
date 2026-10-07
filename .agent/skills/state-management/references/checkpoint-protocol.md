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
Optional `learningCloseouts` (at most 20) records origin, revision, disposition,
reason, evidenceRefs and a tool-computed evidenceDigest. Dispositions are
`captured`, `skipped-trivial`, `pending`, or `legacy-unknown`. Captured requires
knowledgeRef; pending requires saved validated captureInputRef. A trivial skip
or legacy-unknown record may have no evidence and a null digest. The tool hashes
sorted `{ref,digest}` evidence rows. Optional completionRef uses
`ledger.json#goalId#receiptId` and validates the existing receipt without changing
its identity. Captured and pending refs must match origin, revision and evidence.
Unresolved pending records must survive subsequent checkpoints; terminal records
can leave the hot checkpoint after their reference is durable. Missing legacy
metadata is advisory, never a failure or reason to replay verified work.
The 20-record limit applies to one input and the hot checkpoint. Valid pending
overflow stays as `learningCloseout` metadata in its existing validated
`.scratch/pending-captures/*.json` job; `pendingLearningQueue` identifies that
same directory. Resume merges hot and queued identities without duplicate
counts. A progress checkpoint must not stop solely because the backlog exceeds
20. Queue inspection reads at most 100 jobs; a larger queue is advisory incomplete
and retains every job. Malformed metadata remains on disk and appears
in `pendingLearningQueueIssues` for reconciliation without echoing its payload.
Capture retries retain closeout metadata. Bounded maintenance flush records the
captured closeout durably before removing its job, preserving the checkpoint's
next action and pinned contract hashes. Interrupted cleanup cannot resurrect a
captured identity, and dry-run does not change checkpoints or queued jobs.
Each maintenance flush attempts at most three jobs, oldest modified first.
Failed attempts move their retry timestamp behind retained jobs without changing
payload bytes; `retryDeferred: false` reports a timestamp-update failure. A bad
job must not permanently starve valid queued work.
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
Resume reports changed evidence in `staleEvidence`, blocking its owning goal and
dependency consumers. Ledger structure corruption remains a global error.
Dispatch and promotion validate selected proof and dependencies derived from the
pinned package's `Blocked by` declaration and original `sourceBriefPath` issue
locator; unresolved references and cycles fail closed. Administrative recovery
and receipt acknowledgement can proceed when unrelated proof is stale. The
final `verified-promise.mjs` CLI checks the whole ledger and all proof before
allowing completion (exit 0); unverified or empty runs exit 1, corrupt or stale
proof exits 2.

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
