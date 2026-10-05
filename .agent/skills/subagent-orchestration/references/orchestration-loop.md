# Orchestration Loop: Recovery, Ledger, Scheduling, Model Tiers

## Fix attempts and escalation

An attempt is one hypothesis plus its proving check; a fix round is a batch of
review findings addressed and rechecked. After a failed attempt, record the
failure and reassess the hypothesis before retrying. Repeated failure with no
new evidence or progress triggers a revised strategy or an authorized fresh
worker. Recommend effort changes for complex diagnosis; preserve explicit user
settings and the session model. A count of two, three, or five attempts is an escalation signal, never
an automatic shutdown. This rule governs orchestration, debugging, and review.

Stop the affected goal only when authority/access is missing, a hard user/host
limit is reached, or documented stagnation leaves no safe recovery. Record a
truthful `blocked` or `failed` status and continue independent goals. Mandatory
acceptance failures cannot be parked, deferred, or relabeled as success.
Optional out-of-scope findings may be deferred with a recorded owner and reason.
Scoped re-reviews cover the fix and its affected dependencies; collect other
applicable findings together without expanding approved scope.

## Ledger grammar and recovery

The run ledger (`.scratch/work-packages/<run>/ledger.json`) plus these progress
lines are the scheduler's memory:

```
Goal <id>: complete (evidence <ref>, review clean)
Goal <id>: fix round <R> (<X> addressed, <Y> open; evidence <ref>)
Goal <id>: deferred - <optional finding> - ruling: <why>
Goal <id>: BLOCKED - <reason>
```

After compaction/resume, reconcile the ledger, pinned authority and evidence,
and repository state before dispatch. Never replay verified goals whose
relevant source/contract/environment evidence remains valid. A dispatch prompt
describes one goal, never the session's history.

## Dependency-ready scheduling and reporting waves

- Compute the validated DAG with `goal-waves.mjs`. Waves group reporting and
  context reset; they are not dispatch barriers. As soon as a goal's own
  dependencies are verified and a safe slot is free, dispatch it.
- The scheduler supplies `--ready --state <state.json>` with `verified`,
  `inProgress`, and `blocked` goal-id arrays. `verified` includes only goals
  with fresh ledger evidence (`verified-promise.mjs`), never merely `done`.
  `blocked` includes failed/quarantined/unavailable goals. Descendants wait for
  their dependencies, while independent streams continue.
- Supply `hostSlots` (total worker allowance for this run) and, when relevant,
  `resourceSlots` (isolated build/test capacity). Active workers consume slots.
  `--max-workers` is bounded by those capacities; absent host information the
  conservative fallback is two. CPU count does not imply available agents.
- One scheduler serializes shared-state/ledger mutations and writes compact
  summaries to `docs/STATE.md` with atomic replacement. Use fresh ledger
  `expectedVersion` checks; there are no filesystem lock helpers to acquire.
- Check each workspace against its recorded base and ownership before dispatch
  and integration. Quarantine a diverged or failed worker, preserve its report
  and edits, and repair/recreate only that workspace. Other safe streams keep
  running; use sequential execution only for streams without safe isolation.

## Bounded scope repair

The implementer never edits the scheduler-owned allowlist. The scheduler may
add a necessary test/helper path within approved goal semantics after checking
file ownership, overlapping workers, contract effects, and existing user edits.
Use no new product, access-policy, or acceptance decision without its owner.

The runtime pins package scope and has no amend operation. Preserve the old
package and evidence, record its blocked reason, and create a replacement
package under a new run id with the revised scheduler scope and fresh pinned
digests. Record the supersession and changed paths in the report/recovery
record; resume from preserved work and reverify affected evidence. Never edit
pinned ledger fields or invent an unsupported transition.

Resolve conflicts automatically only when deterministic regeneration or an
identical change proves the result preserves both intended edits. Preserve both
sides, record the proof, and verify the integrated result. Semantic conflicts
require investigation and an owner decision only when authority is ambiguous.

## Session model and effort

Use `.agent/context/agent-models.json`; bundled roles inherit the session model.
Preserve explicit installation overrides. Recommend low effort for mechanical
tasks, medium for normal implementation and high for complex reasoning or
stalled diagnosis. User settings win; unsupported controls are advice only.
No automatic Sol/Astra switching. See `.agent/context/model-guidance.md` for
model-specific controls and optional API caching/tool-calling guidance.
