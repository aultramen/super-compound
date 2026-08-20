# Durable Output Style

Applies to every durable file an `/sc-*` route writes. Chat returns follow
`token-budget-gates.md`; this file governs the file sink.

## Single Projection

- State each fact exactly once per document; every later mention cites its ID.
- Omit derived views: dependency graphs, traceability matrices, per-item
  restatements of summaries, and verdicts that re-explain findings. When a
  derived view is needed, a tool generates it (`node .agent/tools/goal-waves.mjs`
  for goal DAGs); never hand-maintain one.
- One line per finding, hypothesis, idea, or decision. Findings live once in
  the severity-ordered list; everything else references IDs.
- No verbatim repetition across sibling files. Shared boilerplate lives once
  in its skeleton or reference; each file carries only its deviations.

## Empty Sections

Emit a section only when it has content, unless a parser requires the heading.
Protected set (always emit, exact literals):

- `docs/STATE.md` headings from `.agent/templates/state/STATE-Template.md`.
- `## Codebase Patterns` in `docs/progress.md`.
- `## ERR-YYYY-MM-DD-NNN` / `## LRN-YYYY-MM-DD-NNN` headings with their field
  grammar: `- Symptom:` / `- Root cause:` / `- Correct approach:` /
  `- Prevention:` and `- Learning:` / `- Confidence:` / `- Applies to:`.
- `## Quick Reference` in `docs/ERROR_LOG.md` and `docs/LEARNED_KNOWLEDGE.md`.
- Top-of-line `Blocked by:`, `Contract refs:`, `Contract gate:`, and `Status:`
  literals in issue pointers.
- Solution frontmatter keys and `## ` section headings under `docs/solutions/`.

## Compression

- Sequential IDs use range notation: TEST-015-AC01..AC12, not twelve rows.
- Collapse uniform tables: when every row shares one status, write one line
  plus exceptions ("13/13 evals PASS x3 attempts; exceptions: none").
- Concrete numbers over narrative. One language per document.
- Status is PASS/FAIL/OPEN text, not emoji.

## Budgets

Advisory word caps per artifact live in `.agent/context/doc-budgets.json`;
lint a file with `node .agent/tools/doc-lint.mjs <file.md>`. Caps never
justify dropping blockers, failed gates, required decisions, or P0/P1
findings.
