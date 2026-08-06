# Project State
Last updated: YYYY-MM-DD HH:mm

## Current Position
- Workflow: <route>
- Active task: <task or none>
- Next action: <specific executable step>
- Branch/workspace: <branch or n/a>

## Active Loop Run
- run_id: <identifier or none>
- run head digest: <sha256 digest or none>
- non-authoritative status snapshot: <status or none>
- last evidence: <repository-relative ref or none>
- pause/terminal reason: <typed reason or none>
- next transition: <exact controller transition or none>

## Decisions
- YYYY-MM-DD: <decision, scope, and why>

## Blockers
- <blocker, owner, and needed input>

## Completed Work
- YYYY-MM-DD: <outcome and important artifact links>

## Deferred Ideas
- <idea and reason out of scope>

<!--
Contract: .agent/skills/state-management/references/file-contracts.md
Keep under 300 lines; archive when Completed Work > 20 or Decisions > 30 entries.
Update on every interruption, including rate-limit or quota cutoffs, so a fresh
session can resume from Next Action without asking.
Never copy lifecycle events, counters, approval envelopes, or confirmation digests.
-->
