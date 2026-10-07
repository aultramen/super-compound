---
description: "Resolve fuzzy ideas into a BRD with business objectives, constraints, policies, and business acceptance before PRD."
---

# Explore Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when the work is not ready for product requirements or technical planning. The canonical output is a BRD.


## Example

Input: `/sc-explore Dashboard penggunaan untuk admin akun`.
Prerequisite: User problem and desired outcome; unresolved business choices are allowed.
Result and next action: BRD with scope, non-goals and acceptance; preserve inherited user authority in exception mode, or obtain BRD approval before /sc-prd in stage mode.

## Modes

- Idea exploration: clarify user, problem, alternatives, non-goals, and success signal.
- Decision alignment: ask focused questions when code/docs cannot answer them.
- Domain alignment: normalize terms and surprising trade-offs before specs.
- Architecture exploration: compare module/interface options before committing.
- Prototype exploration: build throwaway evidence only when a runnable answer is cheaper than debate.

Prototypes stay isolated, non-production, and disposable; they do not become
implementation without production authority through the owning goal. By default
only decisions are promoted; prototype code stays disposable. Code reuse requires
an explicit scoped user/project-policy exception and required tests/security/
accessibility checks under the production owner.
Each prototype answers one decision question, records an evidence ref, and ends
with disposition `discard`, `revise`, or `promote decision`. A promoted decision
must be absorbed into its BRD, PRD, or FSD authority; prototype evidence alone
never grants production code reuse. For brownfield scope, current behavior is evidence rather than
product authority.

The supporting evidence ref is an external URL plus revision, or a
repository-relative throwaway path plus digest. Record the decision question,
reviewer, review date, and disposition with that locator. It is evidence only,
not a new authority artifact.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/brainstorming/SKILL.md` in advisory mode while the BRD is the canonical capture; create a separate brainstorm sidecar only when the user explicitly requests it. Include summary, decisions and reasons, relevant alternatives, unresolved questions, and next action under Documentation Output Standard.
3. Inspect existing code, docs, issues, accepted ADRs in `docs/solutions/`, and related solutions before asking questions.
4. Load `skills/domain-modeling/SKILL.md` in advisory read-only mode when terms, roles, or domain boundaries are fuzzy; persist glossary changes only through an explicitly authorized owner.
5. Load `skills/codebase-design/SKILL.md` when a business decision depends on a major seam, module shape, or testability tradeoff.
6. Load `skills/prototyping/SKILL.md` only when runnable evidence is cheaper than debate.
   When `/sc-ui` requests `HIGH_INTERACTION` evidence, use a throwaway
   interactive prototype for the named decision; make it runnable when timing,
   runtime responsive, keyboard/focus, realtime, or offline behavior is the risk.
   Return the evidence to `/sc-ui` or `/sc-prd`.
7. If a named factual or current-doc gap blocks the BRD, record `OPEN-RESEARCH-*`, route that question through `sc-research.md`, then return here. Do not use research to decide a user preference, policy, or business trade-off.
8. Use `brainstorming/references/questions-and-options.md`: prioritize a concise
   batch of at most three consequential ready human decisions with stable IDs and a recommendation.
   Summarize all material blockers; retain the complete ready/pending registry
   with prerequisites and review detail expandable on demand. Discover facts first.
   Wait for actual answers, retain unanswered IDs, and reopen only affected
   descendants after corrections. Concrete authorized scope skips interviewing
   and new approval ceremonies; configured stage gates still apply.
9. Capture objectives, scope, non-goals, business rules, policies, constraints, acceptance gates, and `OPEN-*` blockers.
10. Capture Git workflow constraints only when they affect delivery scope; do not mutate Git state.
11. A chat draft is allowed during exploration. Before approval and `/sc-prd`, save the BRD to `docs/brd/brd-<feature>.md` using `.agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md` first and the full template only as a reference.
12. Route to `sc-prd.md` only after the durable BRD records valid acceptance and
    authorization provenance. Exception mode retains explicit user scope/decisions;
    unresolved material assumptions require answers. Stage mode requires BRD approval.
13. Checkpoint automatically and continue authorized work; use `/sc-pause` only when actually stopping.

## Output

- BRD or BRD summary.
- Business acceptance criteria.
- `OPEN-*` blockers and owner/gate when known.
- Recommended next workflow: `/sc-research` only for a blocking evidence
  question; UI validation evidence returns to `/sc-ui`; otherwise `/sc-prd`.

Stage approvals and execution authority: agentic-delivery/references/workflow-integration.md.

Stage mode: Present the BRD for its own approval before PRD authoring. Preserve existing project approval preferences on update.

## Exploration depth

Apply brainstorming/SKILL.md#exploration-depth: three candidates at most for
initial ideation; explicit broad exploration retains ten or more ideas and Brain
evaluation. This selects depth within the existing approval gates.
