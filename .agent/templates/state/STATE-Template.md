# Project State
Last updated: YYYY-MM-DD HH:mm

## Current Position
- Workflow: <route>
- Active task: <task or none>
- Next action: <specific executable step>
- Branch/workspace: <branch or n/a>

## Active Loop Run
<!-- No active run: collapse this section to the single line "- Run: none". -->
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
When no loop run is active, Active Loop Run is the single line "- Run: none".
Emit Decisions, Blockers, Completed Work, and Deferred Ideas only when non-empty.
Archive when Completed Work > 20 or Decisions > 30 entries; doc-lint owns size.
Update on every interruption, including rate-limit or quota cutoffs, so a fresh
session can resume from Next Action without asking.
Never copy lifecycle events, counters, approval envelopes, or confirmation digests.
-->
