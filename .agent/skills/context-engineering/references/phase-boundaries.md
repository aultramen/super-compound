# Phase Boundaries

At a phase boundary (plan approved, goal verified, review closed), pick the
first option whose test passes. Compaction is the default only when nothing
better applies - compacting mid-phase makes the agent lose the thread.

| # | Option | Choose when |
| --- | --- | --- |
| 1 | Continue | The next step needs the details currently in context, and pressure is low |
| 2 | Clear (fresh session) | The next phase needs almost nothing from this one; STATE.md and artifacts carry the handoff |
| 3 | Handoff file | The next phase needs a curated subset; write it via `/sc-pause`, referencing artifacts by path, never duplicating them |
| 4 | Subagent | The work is bounded and separable; dispatch it with a file-backed brief so its noise never enters this context |
| 5 | Compact | None of the above apply and pressure forces a reduction now |

## The lossiness trade

| Move | Information | Noise | Room gained |
| --- | --- | --- | --- |
| Continue | full | high | none |
| Clear + STATE | curated | none | maximum |
| Handoff | curated | low | high |
| Subagent | isolated | none here | high |
| Compact | lossy, uncontrolled | less | high |

Compaction is the only move where what survives is not chosen by you. Prefer
the moves where the surviving set is explicit (STATE, handoff, brief).

## Signals

- `context-monitor` WARNING (<=35% remaining): stop opening new scope; drive to
  the nearest boundary and choose from the table.
- `context-monitor` CRITICAL (<=25% remaining): option 3 immediately - update
  `docs/STATE.md` with exact Next Action, write `.continue-here.md`, stop.
