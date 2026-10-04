# Knowledge Loop Gap Analysis and Delivery

Date: 2026-10-03. Baseline revision: `337630cdd25883a907e2bc7501626828fffc0b40`.
Authority: user-approved Enhancement Super-Compound Berbasis Gap Analysis.
Scope: existing skills, workflows, tools, hooks, adapters; 36 skills and 18 public routes remain.
The prior plan supplies the ten-corpus comparison; this delivery rechecks the
relevant local evidence and license notices. It does not certify every claim
made by comparator README files or reproduce their implementation.

## Comparison and decisions

All source locators below are relative to the workspace containing super-compound.
Adaptations are independently written; no GAO or ISMS source/text is copied.

| Corpus | Source evidence | License observed locally | Verdict / priority |
| --- | --- | --- | --- |
| compound-engineering | skills/ce-bakeoff/references/judging.md; skills/ce-bakeoff/references/verification.md | MIT, LICENSE | ADAPT P0 worth gate; P1 quality/cost comparison |
| everything-claude-code | hooks/memory-persistence/README.md; examples/unified-memory/evidence.cjs | MIT, LICENSE | ADAPT P0 idempotent capture; P1 bounded usage feedback |
| gao-agent | docs/adr/adr-002-self-learning-memory.md; README.md license section | Proprietary; all rights reserved | ADAPT P0 concept independently; REJECT copying and full-memory preload |
| gsd-core-next | commands/gsd/extract-learnings.md; examples/dynamic-context-management/README.md | MIT, LICENSE | ADAPT P0 independent origins/disposition; P1 bounded payloads |
| bmad-method | skills/bmad-retrospective/references/evidence-gathering.md | MIT, LICENSE | ADAPT P1 contract provenance and effectiveness review |
| superpowers | skills/verification-before-completion/SKILL.md; skills/systematic-debugging/test-pressure-1.md | MIT, LICENSE | ADAPT P0 evidence before claims; P1 action-trace grader |
| ralph | tests/ralph-state-concurrency.py; README.md | MIT, LICENSE | ADAPT P0 resume/retry tests; REJECT second execution loop |
| mattpocock-skills-main | docs/engineering/retro.md; docs/productivity/handoff.md | MIT, LICENSE | ADAPT P1 existing checks before new prose |
| ui-ux-pro-max-skill | src/ui-ux-pro-max/scripts/core.py; LICENSE | MIT | ADAPT P2 bounded in-process signature cache; pinned selective provenance |
| isms-public | LICENSE.txt; README.md licensing at line 627 | Apache 2.0 file; CC BY 4.0 documentation notice conflicts | ADAPT independent evidence lifecycle concept; REJECT substantive copying under unresolved scope |

## Implemented

- Wave 0: removed retired controller/evaluator/lock instructions, corrected ratio
  budgets, added active executable-reference audit excluding historical reports.
  The baseline revision and immutable historical token baseline are preserved;
  an isolated checkout runs the previous suites independently of working edits.
- Wave 1: JSON capture/upsert, evidence file hashes, worth gate, stable origins,
  Quick Reference consistency, strict atomic replacement, one writer queue,
  three-origin promotion without PATTERN bypass, proposal disposition suppression,
  reviewed refresh, bounded feedback, managed Markdown checkpoint and read-only
  resume with contract digests and validated/fresh work-package ledgers.
- Wave 2: stale/superseded filtering plus diagnostic mode, applicability metadata,
  calibration/held-out fixtures, mandatory-preserving payload composer, comparable
  KEEP/REJECT/INCONCLUSIVE evaluation, action order grader, check-first evolve advice.
- Wave 3: explicit applicability for the existing Next.js 15+ cache row,
  signature-based 16-index in-process cache, paired result-digest benchmark,
  selective refresh procedure retaining pinned upstream and local transforms.

No new upstream revision was selected: dataset content remains pinned rather
than guessed. Version applicability without evidence remains unknown. New
runtime cost/model-tier changes remain proposals until comparable evidence exists.

## Acceptance and practical limits

Executable acceptance lives in `.agent/evals/knowledge-loop-acceptance.md` and
`.agent/evals/knowledge-relevance.json`. Test commands, RED/GREEN evidence, final
suite counts, benchmark, and adapter parity are recorded in
`docs/eval-results/knowledge-loop-20261003.md` after verification.

Origin identity and independent provenance are supplied by the owning workflow;
the tool validates file existence, hashes, bounds, format, and status, not the
truth of arbitrary prose or independence of fabricated origin labels. Changes
that conflict with human decisions/invariants require review. Writers serialize
inside one orchestrator; this is not cross-process exclusion. Busy rename fails
without replacing memory; callers retry capture using already-saved evidence.

Synthetic trace grading proves the grader rejects missing actions and incorrect
order. Actual Claude Code/Codex/Antigravity reliability, fewer repeated mistakes,
and host runtime token/cache/latency/retry savings are **unmeasured** until paired
host attempts exist. Static benchmark totals are estimated text context only.
The UI benchmark measures repeated local search with identical result digests;
one-shot CLI latency and whole-agent performance are not inferred.
