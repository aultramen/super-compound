---
description: "Cluster high-confidence learnings into draft framework proposals for human approval."
---

# Evolve Workflow

Use this when `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, or `docs/solutions/` accumulate repeated high-confidence entries worth promoting into framework guidance.

## Steps

1. Run `node .agent/tools/memory-maintenance.mjs report` for promotion candidates across `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, and `docs/solutions/`; run `node .agent/tools/knowledge-search.mjs "<area>"` for the target area.
2. Cluster entries from the report's candidates: the same category or prevention rule appearing 3+ times with confidence Observed or Confirmed.
3. For each cluster, write one DRAFT proposal at `docs/proposals/<YYYY-MM-DD>-<slug>.md`, at most 250 words and following `.agent/context/output-style.md`: current behavior, evidence as a list of entry IDs and paths, the proposed diff to the target rule, skill, or workflow as one unified snippet, expected effect, and a rollback note. Do not restate entry bodies.
4. Validate every proposal with `node .agent/tools/validate-doc-claims.mjs <proposal>`, then run `node .agent/tools/doc-lint.mjs <proposal>` and adjudicate its findings (advisory).
5. Present the proposal list and stop. Human approval and application happen outside this route.

## Skip

- Single observations, unverified hypotheses, or style preferences.

## Guardrails

- `/sc-evolve` writes DRAFT proposals only; it must not modify prompts, model weights, goals, policy, budgets, verifier definitions, framework source, operating rules, or the public workflow inventory.
- A proposal grants no implementation, source-write, Git, external-write, or release authority. Approval and apply are explicit human actions in a later session.
