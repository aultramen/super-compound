---
description: "Resolve fuzzy ideas into a BRD with business objectives, constraints, policies, and business acceptance before PRD."
---

# Explore Workflow

## Summary


Use this when the work is not ready for product requirements or technical planning. The canonical output is a BRD.


## Example

Input: `/sc-explore Dashboard penggunaan untuk admin akun`.
Prerequisite: User problem and desired outcome; unresolved business choices are allowed.
Result and next action: BRD with scope, non-goals and acceptance; obtain BRD approval before /sc-prd.

## Modes

- Idea exploration: clarify user, problem, alternatives, non-goals, and success signal.
- Decision alignment: ask focused questions when code/docs cannot answer them.
- Domain alignment: normalize terms and surprising trade-offs before specs.
- Architecture exploration: compare module/interface options before committing.
- Prototype exploration: build throwaway evidence only when a runnable answer is cheaper than debate.

Prototypes stay isolated, non-production, and disposable; they do not become
implementation without approved PRD/FSD authority and a fresh implementation.
Each prototype answers one decision question, records an evidence ref, and ends
with disposition `discard`, `revise`, or `promote decision`. A promoted decision
must be absorbed into its BRD, PRD, or FSD authority; prototype code is never a
production seed. For brownfield scope, current behavior is evidence rather than
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
8. Use `brainstorming/references/questions-and-options.md`: ask small batches of consequential ready decisions with numbered questions, recommendation, reason, and trade-off. Investigate discoverable facts before asking; pending facts defer only dependent decisions. Wait for actual answers, keep partially unanswered IDs open, and reopen affected descendants after corrections. Skip grilling already concrete scope; use the existing artifact approval gate.
9. Capture objectives, scope, non-goals, business rules, policies, constraints, acceptance gates, and `OPEN-*` blockers.
10. Capture Git workflow constraints only when they affect delivery scope; do not mutate Git state.
11. A chat draft is allowed during exploration. Before approval and `/sc-prd`, save the BRD to `docs/brd/brd-<feature>.md` using `.agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md` first and the full template only as a reference.
12. Route to `sc-prd.md` only after the durable BRD is approved or the user explicitly accepts its recorded assumptions.
13. Checkpoint automatically and continue authorized work; use `/sc-pause` only when actually stopping.

## Output

- BRD or BRD summary.
- Business acceptance criteria.
- `OPEN-*` blockers and owner/gate when known.
- Recommended next workflow: `/sc-research` only for a blocking evidence
  question; UI validation evidence returns to `/sc-ui`; otherwise `/sc-prd`.

Stage approvals and execution authority: agentic-delivery/references/workflow-integration.md.

Stage mode: Present the BRD for its own approval before PRD authoring. Preserve existing project approval preferences on update.
