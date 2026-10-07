---
description: "Capture non-trivial solved problems as searchable documentation."
---

# Compound Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this after a non-obvious fix, debugging session, migration, integration repair, or operational lesson.


## Example

Input: `/sc-compound`.
Prerequisite: Verified reusable outcome with source evidence.
Result and next action: Searchable capture in applicable knowledge sinks; return to the active owning workflow.

## Steps

1. Load `skills/knowledge-compounding/SKILL.md`.
2. Confirm the problem was actually solved with evidence.
3. Treat every prior pattern as advisory input to human-owned documentation. Capture symptoms, root cause, fix, failed attempts, prevention, and related files from the actual evidence; never copy a pattern as authority.
4. Mention branch or PR references only as context; do not mutate Git state.
5. Search first with `node .agent/tools/knowledge-search.mjs "<symptom or topic>"` and update the matching record instead of duplicating it. Route each captured outcome to every sink that applies; one outcome may hit several. Entry formats and Quick Reference tables are authoritative in `.agent/skills/knowledge-compounding/references/memory-capture.md`; file selection stays in `.agent/skills/state-management/references/file-contracts.md`. Every durable artifact follows `.agent/context/output-style.md`. Ground each new record with `node .agent/tools/validate-doc-claims.mjs <file>`; a record the current tree contradicts routes to `knowledge-refresh`.
   - Verified solved problem: run structured capture (deterministic-loop.md) for concise documentation under `docs/solutions/<category>/` in the existing format.
   - Agent mistake (wrong assumption, hallucinated path or API, failed approach, agent-caused breakage) with a prevention rule: append an `ERR-*` entry to `docs/ERROR_LOG.md` and add its row to that file's Quick Reference table.
   - Explicit user correction or confirmed reusable convention or preference: append an `LRN-*` entry to `docs/LEARNED_KNOWLEDGE.md` and add its row to that file's Quick Reference table.
   - Session chronology: update `docs/progress.md` only when the pattern is likely to help future sessions.

## Skip

- Typos, formatting-only edits, one-line obvious fixes, or speculative notes without verification.

## Guardrails

- `/sc-compound` must not self-modify prompts, model weights, goals, policy, budgets, verifier definitions, framework source, operating rules, or the public workflow inventory.
- A captured pattern never grants implementation, Git, or release authority.
  Its scoped use within an already-authorized goal needs no new approval;
  material decisions or framework policy changes use their owning approval boundary.

Use capture/upsert JSON and evidence locators from the deterministic loop; do not manually create duplicate Quick Reference rows.

Store verified prevention receipts from the owning work/debug route using
`knowledge-compounding/references/prevention-checks.md`. Capture does not authorize
new checks or skill/workflow/policy mutations. Flush bounded pending maintenance;
retain failure/deferred reasons and effectiveness evidence.
