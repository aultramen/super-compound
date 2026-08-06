---
name: state-management
description: "Use when non-trivial work needs durable, bounded project memory across checkpoints or sessions."
---

# State Management

Keep continuation state concise enough to load quickly and precise enough that `/sc-status` can resume without guessing. Announce use before changing durable memory.

## Quick Reference

1. Search before load: read `docs/STATE.md` and `.continue-here.md`, then load only artifacts explicitly needed by Next Action.
2. Update Current Position, Next Action, active Blockers, Decisions, and Completed Work.
3. Dedupe before appending. Mark replaced guidance `SUPERSEDED by <reference>` instead of preserving competing truths.
4. Apply the archive gate: compact when Completed Work exceeds 20 entries, Decisions exceeds 30 entries, or `STATE.md` exceeds 300 lines; never archive active blockers or the next action.
5. For an active Loop Run, refresh `run_id` with `node .agent/tools/loop-run.mjs show --run <run_id>` and store only a non-authoritative pointer plus run head digest, status snapshot, last evidence, stop reason, and next transition.

## When to Use

Use when starting, pausing, or completing non-trivial workflow work; recording a durable decision, blocker, deferral, or handoff; or finishing a feature, review, audit, or debugging session. Skip one-off questions, tiny edits, and throwaway experiments.

## Route

- For file selection, state templates, errors, and learned conventions, load [file contracts](references/file-contracts.md).
- For selective restoration, dedupe, superseded entries, quantitative archiving, and session-end compaction, load [memory hygiene](references/memory-hygiene.md).
- Load only the branch needed for the current read or write.

## Invariants

- Read before writing; keep entries short, dated, scoped, and linked to authoritative artifacts.
- Create only files the work needs. Do not copy BRD, PRD, FSD, issue, or solution contents into state.
- Decisions remain constraints until explicitly reopened. Blockers name owner and required input.
- `.continue-here.md` is a short pointer, not a second state database.
- Loop lifecycle authority remains in `events.jsonl`. Never copy events,
  counters, an approval envelope, or a confirmation digest into `STATE.md`.
- A `docs/STATE.md` write is classified project mutation and needs the active
  source-write gate. Reading or refreshing the pointer stays read-only. A
  `START` or `RESUME` recommendation always requires fresh human confirmation.
- Never store secrets, credentials, private data, or full sensitive payloads.
- Preserve useful history through archive links, not unbounded hot memory.

## Red Flags

- “I’ll remember,” an ambiguous next action, duplicate entries, contradictory active decisions, or a handoff containing every detail.
- Loading all historical documents before identifying the current route.
- Archiving by intuition while active blockers or unresolved decisions are mixed with closed history.
- Append-only growth without search, consolidation, or provenance.

## Integration

Pairs with `context-engineering` for selective loading, `checkpoint-protocol` for blockers, `executing-plans` and `issue-workflow` for progress, `agentic-delivery` for BRD→PRD→FSD→GOAL authority, `todo-management` for deferrals, and pause/status workflows for continuation.
