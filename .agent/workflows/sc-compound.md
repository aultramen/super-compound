---
description: "Capture non-trivial solved problems as searchable documentation."
---

# Compound Workflow

Use this after a non-obvious fix, debugging session, migration, integration repair, or operational lesson.

## Steps

1. Load `skills/knowledge-compounding/SKILL.md`.
2. Confirm the problem was actually solved with evidence.
3. When an active immutable Loop Run contract requires `ADAPTIVE_LEARNING_V2`, use `queryAdaptiveLearningMemory` and consume only a returned `verified_pattern_v2` whose originating promotion event proves fresh verifier PASS, distinct host-attested checker PASS, closed findings, and host-attested human approval. Candidate, stale, expired, incompatible, or cache-only records are ineligible.
4. Treat every verified pattern as advisory input to human-owned documentation. Capture symptoms, root cause, fix, failed attempts, prevention, and related files from the actual evidence; never copy a pattern as authority.
5. Mention branch or PR references only as context; do not mutate Git state.
6. Route each captured outcome to every sink that applies; one outcome may hit several. Entry formats and Quick Reference tables are authoritative in `.agent/skills/state-management/references/file-contracts.md`. Every durable artifact follows `.agent/context/output-style.md`.
   - Verified solved problem: save concise documentation under `docs/solutions/<category>/` in the existing format.
   - Agent mistake (wrong assumption, hallucinated path or API, failed approach, agent-caused breakage) with a prevention rule: append an `ERR-*` entry to `docs/ERROR_LOG.md` and add its row to that file's Quick Reference table.
   - Explicit user correction or confirmed reusable convention or preference: append an `LRN-*` entry to `docs/LEARNED_KNOWLEDGE.md` and add its row to that file's Quick Reference table.
   - Session chronology: update `docs/progress.md` only when the pattern is likely to help future sessions.

## Skip

- Typos, formatting-only edits, one-line obvious fixes, or speculative notes without verification.

## Guardrails

- `/sc-compound` must not self-modify prompts, model weights, goals, policy, budgets, verifier definitions, framework source, operating rules, or the public workflow inventory.
- A `verified_pattern_v2` never grants implementation, source-write, Git, external-write, or release authority.
