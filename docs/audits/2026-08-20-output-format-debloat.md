# Output Format De-Bloat — Before/After

- Date: 2026-08-20
- Scope: authoring format of all 26 produced document types, future outputs only; historical docs stay unchanged (authority docs digest-bound).
- Baseline: 23,334 words measured, ~49% structural waste (~11,400w). Lexical filler negligible (one hit corpus-wide).

## Root causes (measured)

| # | Pattern | Cost | Example |
|---|---|---|---|
| 1 | ID graph re-serialized 4× in FSD (prose, register, DAG, matrices) | ~3,500w | FSD §6.1 + §15.1 both specify GOAL-015 (1,307w overlap) |
| 2 | Audit findings restated up to 6× | ~3,000w | 2026-07-16 gap audit: 6,902w, ~40% substance |
| 3 | Empty template shells | ~1,200w | STATE: "none" ×10 in 144w; 4 zero-content work-package reports |
| 4 | Repeated boilerplate headers | ~1,100w | 39w Scope/Stop verbatim ×19 issue files |
| 5 | Solution fact in 3 voices; verbatim cross-doc copies; all-uniform tables; expanded ID runs | ~1,500w | 39× PASS eval grid; `TEST-015-AC01`…`AC12` written out |
| 6 | Misfiled vendor content (removed this wave) | 1,173w | context7 README in docs/brainstorms |

## What changed (instruction level)

New shared contract `.agent/context/output-style.md`: single projection (each fact once; derived views tool-generated or omitted), non-empty sections only (parser-protected headings listed explicitly), ID range notation, uniform-table collapse, one line per finding/hypothesis/idea, no verbatim repetition across sibling files, one language per document. Advisory caps: `.agent/context/doc-budgets.json` (caps never drop blockers or P0/P1 findings). Mechanical check: `.agent/tools/doc-lint.mjs` (empty shells, duplicate paragraphs, uniform tables, word caps, expanded ID runs), wired into sc-review/sc-audit/sc-debug/sc-evolve and solution capture; `validate-doc-claims.mjs` now flags skeleton-boilerplate residue.

## Before → after per document type

| Doc type | Before (measured) | After (format now mandates) |
|---|---|---|
| FSD | 5,160w; 4 projections; goals specified twice | Goal packets = only hand-authored serialization; DAG via `goal-waves.mjs`; matrices omitted (derived); TDEC once; cap 2,800w |
| BRD / PRD | ~37% waste; AC restates FR 1:1 | Skeleton named in sc-explore/sc-prd (was orphaned); each fact once; states grouped per disposition; cap 500w each |
| Issue pointer | 19 files × 39w identical Scope/Stop (65% waste) | Header verbatim (parser); `## Deviations` only when overriding the default contract; cap 120w |
| Audit | 6,902w worst case, findings ×6 | Finding stated once in reporting block; summaries = counts; ordering references IDs; cap 800w |
| Review | header+verdict up to 38% of file | Header 3 lines; one line per finding; empty tiers omitted; cap 350w |
| Plan-verification | 10-row all-PASS table + restated evidence | `**Dimensions:** 10/10 PASS` one line when uniform; enumerate only findings; cap 150w |
| Eval report | 39 identical PASS cells | Per-attempt columns only when attempts differ; `N/N PASS ×3 attempts` + exceptions; cap 200w |
| Solution record | 3-voice tail; empty sections | What Didn't Work only for real attempts (omit when none); Prevention only when a new IF-THEN rule; cap 300w |
| STATE | 10× "none" / 144w | `- Run: none` single line when idle; empty sections omitted; delta-only writes from sc-launch/sc-pause; cap 150w |
| Progress entry | "Patterns/Gotchas/Useful context: none" scaffold | `Learnings:` one line each, omit when none; cap 120w |
| Geniusloop report | 4-lens × 10+ idea elimination matrix | One elimination line per killed idea; ≤3 lines per Delta survivor; cap 500w |
| Debug doc | "complete … without dropping" invited narrative | Completeness kept, shape fixed: one line per hypothesis (`H1: cause → test → disproving evidence`); cap 400w |
| Work-package report | 4 seeded empty headings (14w, 0% substance ×4 files) | Seed = `Status: in-progress` + append instruction; empty sections omitted |
| Research note / brainstorm / ADR / proposal / OPEN / todo / gap-closure / PR body | scaffold sections emitted empty | Non-empty-only + caps (300/200/250/250/60/80/250/150w) |
| Threat model / DPIA / security & compatibility reporting | fixed N/A rows | Covered by output-style generics (references are hash-pinned; formats unchanged there by design) |

## Projected effect

The mandates remove the dominant waste classes (~40–50% of a typical artifact) while keeping every load-bearing element: parser grammar (ERR/LRN fields, `Blocked by:`, Quick Reference, `## Codebase Patterns`), skeleton gate phrases, workflow markers, non-uniform eval evidence. Deliberately unchanged: hash-pinned skill references except `.agent/skills/plan-verification/references/verification-process.md` (edited, pinned sha updated); route contracts (bench margin); historical documents; per-attempt eval grids when results differ.

## Verification

`npm test` (562 tools tests incl. new doc-lint suite), `npm run test:python`, `npm run bench` (21 scenarios, 98.89% weighted reduction, all stage minimums PASS), `npm run audit` (0 findings post-commit), `validate-doc-claims` on all 36 touched markdown files: zero new findings vs HEAD. Smoke: `doc-lint docs/STATE.md` clean; the 2026-07-16 gap audit correctly flagged (6,902w over the 800w cap, expanded ID runs).
