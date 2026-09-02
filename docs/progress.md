# Progress Log

## Codebase Patterns
- `.agent/context/` contracts are the first runtime layer; load full assets only for a named uncovered detail.
- Every new repository file must be classified in `framework-audit` audit classes or the audit fails.
- New contracts must respect `.agent/context/token-budget-gates.md` startup budgets.
- Compact contracts are the runtime path; a behavior wired only into a full workflow never fires. Wire the paired contract in the same change; the spine test in `workflow-contracts.test.mjs` guards it.
- `npm run bench` must rerun after any hook, contract, or `.codex/SKILL.md` edit, or `npm run audit` fails with `BENCHMARK_EVIDENCE_STALE`.

---

## 2026-08-06 00:00 - memory-layer-seed
- Implemented: seeded `docs/STATE.md`, `docs/progress.md`, `.continue-here.md`, sink directories `docs/geniusloop/`, `docs/research/`, `docs/debug/`; templates in `.agent/templates/state/`.
- Files: docs/STATE.md, docs/progress.md, .continue-here.md, .agent/templates/state/
- Verification: files exist; contract test expectations in `.agent/tools/workflow-contracts.test.mjs`.
- Learnings for future sessions:
  - Patterns discovered: none
  - Gotchas encountered: none
  - Useful context: `.continue-here.md` is gitignored by design; it is local session state.

## 2026-08-06 14:30 - gap-enhancement-wave
- Implemented: 13 enhancements from cross-framework gap analysis (see CHANGELOG Unreleased).
- Files: .agent/tools/{knowledge-search,validate-doc-claims,goal-waves,verified-promise}.mjs (+tests), .agent/hooks/context-monitor.js, .agent/workflows/sc-evolve.md, .agent/skills/{knowledge-refresh,subagent-orchestration,context-engineering}, .claude/settings.json, .mcp.json, package.json, docs memory seeds.
- Verification: npm test 529 pass; hooks 20 pass; python 29+1 pass; framework-audit PASS 0 findings; token-benchmark PASS 18/18 routes >=90%.
- Learnings for future sessions:
  - Patterns discovered: `estimateTokens` counts every punctuation mark; contract compression saves most by removing punctuation-dense CLI strings, not words. IF adding text to a route contract THEN re-run the benchmark probe before assuming the 90% gate holds.
  - Gotchas encountered: workflow-contracts.test.mjs greps literal phrases (e.g. "human-owned documentation", "FIRST_VERTICAL_SLICE_VERIFIED") in specific files; moving prose to references can break tests. IF moving tested prose THEN keep the tested tokens in the entrypoint stub.
  - Useful context: route enumerations live in 10+ files (tests, schemas, tools, docs); grep "\"sc-compound\"" to find them all when adding a route.

## 2026-09-02 12:00 - cross-framework-wave3
- Implemented: knowledge-loop spine in six route contracts (token-neutral via `.codex/SKILL.md` trim) plus spine test; `memory-maintenance` freshness block; `transcript-usage` per-`message.id` counting and `assetReads` histogram; shared context-window detection; hook env-surface guard; standards at review; output tier at intake; Base SHA briefs; retro axes; residual sink; doc-claims tiers; opt-in global store; workspace-root hook wiring.
- Files: .agent/context/workflows/, .codex/SKILL.md, .agent/tools/{memory-maintenance,transcript-usage,knowledge-search,validate-doc-claims}.mjs, .agent/hooks/, docs/audits/2026-09-02-cross-framework-gap-analysis-wave3.md, CHANGELOG.md, README.md
- Verification: `npm test` (569 tool tests, 20 skill tests, hook suite), `npm run test:python` 29+1, `npm run bench` 18/18 (min 90.05%), `npm run audit` PASS after evidence refresh.
- Learnings for future sessions:
  - Patterns discovered: LRN-2026-09-02-001 (contract shadowing), LRN-2026-09-02-002 (`.codex/SKILL.md` is shared headroom).
  - Gotchas encountered: ERR-2026-09-02-001 (router word cap 500; `context-engineering` sat at 498). Real Claude Code transcripts lack `reasoning_tokens`, so `transcript-usage` reports UNMEASURED; 211 of 241 usage lines in this session were streamed duplicates.
  - Useful context: hooks resolve their project root from their own location, so a parent-workspace `.claude/settings.json` can register the scripts under `.agent/hooks/` and state still lands here.
