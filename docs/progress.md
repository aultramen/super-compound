# Progress Log

## Codebase Patterns
- `.agent/context/` contracts are the first runtime layer; load full assets only for a named uncovered detail.
- Every new repository file must be classified in `framework-audit` audit classes or the audit fails.
- New contracts must respect `.agent/context/token-budget-gates.md` startup budgets.

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
