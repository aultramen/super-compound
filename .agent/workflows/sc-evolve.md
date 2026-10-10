---
description: "Cluster high-confidence learnings into draft framework proposals for human approval."
---

# Evolve Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, or `docs/solutions/` accumulate repeated high-confidence entries worth promoting into framework guidance.


## Example

Input: `/sc-evolve`.
Prerequisite: Repeated evidenced lessons; promotion needs 3+ independent origins.
Result and next action: DRAFT proposals with evidence and proposed diff; human approval/application happens outside this route.

## Steps

1. Run `node .agent/tools/memory-maintenance.mjs report` for promotion candidates across `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, and `docs/solutions/`; run `node .agent/tools/knowledge-search.mjs "<area>" --require-complete` with known scope flags for the target area. Review relevant failed/rejected feedback against its knowledge revision, digest and observation evidence before proposing adoption. Usage and outcomes do not count as independent recurrence; legacy-unbound feedback remains unknown.
2. Cluster entries from the report's candidates: the same category or prevention rule supported by 3+ independent origins with confidence Observed or Confirmed and evidence. Also cluster by the retro axes captured in `LRN-*` entries: no-op steering (delete to save tokens), tool economy, and information access (propose a hook, tool, or doc). When a candidate contradicts a `docs/solutions/` or `LRN-*` record, run `knowledge-refresh` (Keep/Update/Consolidate/Replace/Delete) first and record the action in the proposal.
3. Prefer linking an existing lint/test/check that prevents recurrence before proposing another prompt rule. Check prior APPLIED effectiveness with outcome evidence; usage alone is not truth. For each cluster, write one DRAFT proposal at `docs/proposals/<YYYY-MM-DD>-<slug>.md` following `.agent/context/output-style.md`, with frontmatter candidate_key, evidence_digest (from the report), status: DRAFT, owner, and source refs: current behavior, evidence as a list of entry IDs and paths, the proposed diff to the target rule, skill, or workflow as one unified snippet, expected effect, and a rollback note. Do not restate entry bodies.
4. Validate every proposal with `node .agent/tools/validate-doc-claims.mjs <proposal>`, then run `node .agent/tools/doc-lint.mjs <proposal> --advisory` and repair documentation within the same authorized stage.
5. Present the proposal list. This route writes drafts only; when the user
   explicitly authorizes application, hand off internally to the owning workflow
   in the same session after checking scope and evidence. Otherwise deliver and stop.

Standards proposals follow `.agent/context/standards.contract.md`: identify the
rule/profile owner, affected versions/scopes, measured check evidence, migration
and rollback. Mandatory standards changes require rule-owner review through the
existing authorized owner; a DRAFT or captured lesson never changes global policy.

## Skip

- Single observations, unverified hypotheses, or style preferences.

## Guardrails

- `/sc-evolve` writes DRAFT proposals only; it must not modify prompts, model weights, goals, policy, budgets, verifier definitions, framework source, operating rules, or the public workflow inventory.
- A proposal grants no implementation, Git, or release authority. Application
  requires explicit scoped authorization through the owner, with no forced later session.

For check-backed lessons, consume the prevention report and negative/deferred
dispositions before proposing another change. Existing checks precede new prompt
rules. Use `eval-harness/references/paired-experiments.md` for a single measured
hypothesis; skills/workflows/policy remain proposals until authorized.
