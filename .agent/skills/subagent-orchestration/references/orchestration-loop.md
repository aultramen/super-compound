# Orchestration Loop: Fix Rounds, Ledger, Model Tiers

## Fix rounds (cap 5, model escalation)

- Rounds 1-3: resume the original implementer; its context is intact and
  cheapest to reuse.
- Rounds 4-5: dispatch a fresh implementer on a more capable model with the
  framing "a prior implementer attempted this N times; you own it now".
- Round 5 is a circuit breaker: adjudicate every open finding into exactly one
  of `parked - <ruling>`, `deferred (real, out of scope)`, or `BLOCKED - stop`.
  Silent discards are forbidden; record each ruling in the ledger.
- Scoped re-reviews verify only the fix diff; new out-of-scope findings go to
  the ledger and never extend the loop.

## Ledger grammar and recovery

The run ledger (`.scratch/work-packages/<run>/ledger.json`) plus these
progress lines are the orchestrator's memory. Use exactly:

```
Goal <id>: complete (commits <a7>..<b7>, review clean)
Goal <id>: fix round <R>/5 (<X> addressed, <Y> open; commits <a7>..<b7>)
Goal <id>: parked - <finding> - ruling: <why>
Goal <id>: BLOCKED - <reason>
```

Conversation memory does not survive compaction. After any compaction or
resume, trust the ledger and `git log` over your own recollection before
dispatching anything; re-dispatching completed goals is the single most
expensive failure. A dispatch prompt describes one goal, never the session's
history. Between tool calls, narrate at most one short line; the ledger and
tool results carry the record.

## Model tiers

Declare per dispatch: `extraction` (cheapest; transcription, mechanical
application of complete plan text), `generation` (mid; prose-driven
implementation and review - turn count beats token price), `ceiling`
(inherited session model; final whole-branch review and adjudication only).
Always name the model tier explicitly; omission inherits the most expensive
session model. Escalate one tier on soft failure; `ceiling` is the cap.
