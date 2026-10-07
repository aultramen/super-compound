# Decision Rounds and Options

## Summary

Prioritize decisions that unlock the current goal using the shared checkpoint
format; retain the complete unresolved inventory and actual answers through their owner.

Load when material user decisions remain; skip interviewing a concrete specification with settled scope and acceptance. Do not make a small request undergo full delivery merely to use this protocol.

## Context and design tree

Inspect repository evidence and learned context first. Separate discoverable facts from user decisions. A code/test fact describes current behavior; it does not override approved product policy. Track a lightweight list: question ID, decision, prerequisites, evidence, answer/status, and descendants. No graph engine or new artifact is required.

Investigate facts with relevant existing tools; a pending investigation is an unsettled prerequisite. Continue independent questions while investigating. Do not ask users to rediscover repository facts.

## Prioritized frontier per round

The frontier contains consequential unresolved human/external decisions whose
prerequisites are settled. Resolve repository facts and authorized reversible
preferences internally. Show at most three highest-priority actionable questions
by default, grouped by owner/scope; expand when requested or coupled decisions
must be assessed together. Summarize every material block and unresolved ID;
retain the complete ready/pending inventory in existing authorized state or
expandable detail. A dependent question remains pending with prerequisite IDs,
owner and next action. A concrete specification needs no interview.

Before asking, load the [answerable package](../../../context/checkpoint.contract.md#answerable-package).
It owns stable IDs, review paths, per-item recommendations, prioritized display,
complete inventory, host-dialog fallback and scoped reply examples. The decision
portion below supplements that format; it does not replace its required fields:

```text
Q1 - <Decision>
<Neutral question and relevant choices>

Recommendation: <choice>.
Reason: <context/evidence supporting it>.
Trade-off: <main consequence>.
```

Recommendations prefer the simplest sufficient option and include alternatives when meaningful. A free-text decision still gets a proposed answer and rationale; identify uncertain evidence instead of presenting it as fact. For significant approaches compare 2-3 options with description, pros, cons, and fit.

Wait for user answers before the next round. Recommendations, preselected options, silence, and elapsed time are not answers or approval. With partial answers, settle only answered IDs; retain unanswered questions and do not unlock their descendants. Follow [resolution](../../checkpoint-protocol/references/resolution.md) for explicit bulk agreement, exceptions and ambiguous IDs. Keep IDs stable and map them to existing OPEN-* needs or approval targets. Do independent fact-finding while waiting. Recompute the frontier from actual answers and evidence, rather than from recommended defaults.

If an answer changes, reopen only affected descendants and explain which earlier decisions need reconsideration; keep independent answers settled. Reconfirm changed material decisions through the owning artifact's existing gate.

## Finish and ownership

Finish when all material decisions in scope are settled, not when an arbitrary number of rounds ends. Name assumptions and non-goals. Record blocking unresolved decisions as OPEN-* with owner/next action; use existing prototyping for questions requiring direct experience. A deliberately deferred blocker does not count as a settled prerequisite.

Return decisions to their BRD/PRD/FSD owner. Exploration never authorizes
implementation; preserve existing authorization and the configured exception or
stage policy, with no additional shared-understanding confirmation.
Advisory/read-only callers return proposals without writing a sidecar or glossary.

## Provenance

Adapted from Matt Pocock's `grilling`, local `mattpocock-skills` snapshot 1.2.3, commit `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.
Source: `https://github.com/mattpocock/skills`, `skills/productivity/grilling/SKILL.md`. The local adaptation preserves Super Compound authority and capture ownership. License notice: [MIT](grilling-MIT.txt).
