---
description: "Get practical, evidence-backed guidance for a question or the current work without starting execution."
---

# Hints Workflow

## Summary

Give focused guidance in the user's language. Standalone consultation is strictly
read-only: no STATE, report, branch, implementation, or automatic remediation.
Use `skills/hints/SKILL.md` when a routing detail or example is needed.

## Inputs

`/sc-hints` uses active work context. `/sc-hints <question or condition>` focuses
on that need. If both are empty, show examples and ask what the user needs;
do not invent project state or scan the entire repository.

## Example

Input: `/sc-hints Saya punya PRD approved, langkah berikutnya apa?`
Prerequisite: Inspect the named PRD approval and relevant FSD/goal readiness.
Result and next action: Recommend `/sc-plan` when FSD authority is absent,
with its prerequisite and expected FSD/GOAL output; do not start planning.

## Steps

1. Frame one concrete question from user input or the active conversation.
   Inspect only its relevant artifact sections, code/tests and knowledge. Use
   `node .agent/tools/knowledge-search.mjs "<question>"` for repeat problems.
   Existing state can be read when relevant, but consultation creates no state.
2. Distinguish verified facts (with openable sources and inspected sections),
   assumptions and unknowns. Do not claim a missing artifact from one search
   miss; inspect bounded plausible locations. Do not run commands that write
   files during standalone consultation, including tests with output artifacts.
3. Classify the smallest proportionate next step using existing light/full
   delivery policy. For full scope check BRD -> PRD -> FSD -> GOAL readiness,
   revisions, acceptance, dependencies and execution authorization. Missing
   authority returns to its owner; advice cannot change approved FSD semantics.
4. Choose the owner by the need, not by a generic project progress ladder:
   `/sc-status` owns orientation/resume; `/sc-geniusloop` owns broad improvement
   inventory and Brain filtering; `/sc-explore` owns business scope; `/sc-prd`
   owns product requirements; `/sc-plan` owns technical authority and goal
   readiness; `/sc-research` owns a bounded factual spike. Concrete failure
   execution uses `/sc-debug`, review uses `/sc-review`, and approved goal or
   small concrete change execution uses `/sc-work`. Explicit execution, review,
   debugging and resume requests go directly to those owners.
5. For phase/context questions load `skills/context-engineering/SKILL.md` and
   its selected branch for continue, handoff, subagent or compact. Reuse its
   policy; create neither fixed token thresholds nor a second handoff procedure.
6. Answer with current condition, main recommendation, evidence-backed reason
   and consequences, openable sources, one exact next command, prerequisites
   and expected result. Include alternatives only when they change a meaningful
   decision. For insufficient facts give the smallest evidence action and its
   owner rather than an unsupported diagnosis. Never silently override FSD.
7. Before human input or owner handoff load
   `.agent/context/checkpoint.contract.md`. Prioritize a concise actionable batch
   with stable IDs and a recommendation; summarize material blocked scopes and
   retain the complete ready/pending registry expandable on demand. Detailed
   verified review links and bulk replies appear when needed. In read-only
   consultation unresolved needs stay in chat; recording them belongs to owners.
8. “Setuju rekomendasinya” accepts advice only; it is not execution authorization.
   An explicit execution request transfers to the owning workflow; inspect
   existing authorization, scope, revision and gates. Reuse valid approval;
   request only missing material decisions under the checkpoint contract.
   The owner, not hints, performs authorized writes.

## Output

A useful recommendation in chat, with sources, uncertainty and an exact owner
command. No file is created for the consultation. It neither approves artifacts
nor marks tests, access, release readiness or goals verified.

## Attribution

Route selection and phase-boundary framing adapt
[ask-matt](https://github.com/mattpocock/skills/blob/c5b98691982c4f0d3a5e40ab09566b3b84721e00/skills/engineering/ask-matt/SKILL.md)
by Matt Pocock at commit `c5b98691982c4f0d3a5e40ab09566b3b84721e00`.
Super Compound uses its own commands, artifacts and authorization policy; no
Matt persona, new agent, fixed context threshold or upstream setup is required.
See `skills/hints/references/attribution.md` and the retained MIT license.
