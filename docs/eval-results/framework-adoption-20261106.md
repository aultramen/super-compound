# Framework Adoption Verification - 2026-11-06

## Summary

Verification covers the 12 requested upstream refreshes, Ralph's local fixes,
five documentation/procedure adaptations, connected callers, and public docs.
The branch is `feature/framework-gap-adoption-20261106`; no commit or push was
requested. This report distinguishes source identity, static/contract checks,
decision exercises, and unmeasured live-host behavior.

The results below record the initial adoption stage. R-01 through R-08 were
implemented in separate follow-ups, each retaining its own evidence and limits:

- [R-01 catalog refresh](interface-catalog-refresh-20261106.md)
- [R-02 design comparison](design-comparison-20261106.md)
- [R-03 real-artifact gates](real-artifact-gates-20261106.md)
- [R-04 MCP diagnostics](mcp-diagnostics-20261106.md)
- [R-05 skill maintenance](skill-maintenance-20261106.md)
- [R-06 business evidence](business-evidence-20261107.md)
- [R-07 bounded checking](bounded-formal-checking-20261107.md)
- [R-08 execution provenance](model-receipts-20261107.md)

For combined verification and subsequent fixes, use the
[final R-01 through R-08 review](../reviews/2026-11-07-r01-r08-final-review.md).
Initial-stage counts below remain historical results.

Verified phases: 588/588 tool tests, 28/28 skill tests, hook security checks,
36/36 Python tests and the Python skill-router contract. The benchmark passed
three repeats; all-file audit reported zero findings. These are local Windows
results, not measured live-agent effectiveness.

The initial local run had 584/588 tool tests pass; its four failures identified
stale benchmark evidence, two current compatibility pins, and a compact-review
budget overrun. These are retained as failed observations, not hidden retries.

## Evidence of Completion

| AC | Required result | Evidence and actual scope |
|---|---|---|
| AC-01 | Each requested folder reflects latest observed default-branch source while preserving local work | [Source lock](../research/upstream-sources-20261106.json): coordinator independently queried remote HEADs and compared 13.984 exported entries with actual files; 13.974 normalized matches, 10 documented Ralph overlays. No unresolved source deviation |
| AC-02 | Ralph includes current Anthropic/original-technique findings without losing bounded local behavior | Official retired path/migration/replacement pinned in source lock; setup session ownership RED reproduced before fix; final loop, concurrency, runner and manifest/Python parse checks passed on Windows |
| AC-03 | Broad feature comparison and actionable recommendations | [Gap analysis](../audits/2026-11-06-cross-framework-gap-analysis.md): all 12 sources, target owners, parity, five adopted changes and eight conditional recommendations; ancillary root content included |
| AC-04 | Use and switch to a relevant new branch; preserve authority and public surface | `git branch --show-current` reports branch above. Existing 19 workflow names, no new skill/runtime/dependency. Spec/quality reviewers inspected changed guidance and connected callers |
| AC-05 | Document and verify implemented Super Compound changes | README, SUPER-COMPOUND, WALKTHROUGH, CHANGELOG, owning references/contracts, source lock and this report updated. Tool/skill/hooks/Python phases, document inspection and zero-finding audit verified below |

## Decision and artifact checks

The blind baseline used original debugging, eval and risk references before
edits, with deadline, sunk-cost and senior-pressure prompts. Four actual
decisions were recorded: investigate DNS before another timeout tweak; report
two tiny latency differences as inconclusive; classify mutable MCP launchers
without executing them; withhold new-verifier acceptance until real-artifact
and invalid-case checks. All four decisions were sound. There was **no observed
RED decision failure**, so no claim that the new prose improved measured
reliability, and no duplicate debugging/eval procedure was added.

Repeatable direct inspections and independent review covered:

- MCP selector examples for npm/Python/Git/Docker, ambiguous wrappers, no-exec
  scope and the difference between a direct pin and full reproducibility.
- Threat template/report fields before and after; an unaccepted worked risk
  remains OPEN, and proposed control work cannot become verified effectiveness.
- Eight glossary decisions: CONTEXT-only, GLOSSARY-only, bounded map, declared
  authority with both families, conflicting dual sources, runtime-only CONTEXT,
  advisory read-only, and no-existing-glossary default. All select/preserve the
  intended authority; callers link the same policy.
- Required failed/missing/empty review coverage cannot approve; explicit
  completed zero-findings can approve only with the other gates. Optional N/A
  does not require a reviewer fanout. Each finding is checked before grouping.
- RTL/mixed-script checklist, correct 4.5:1/3:1 contrast and large-text units,
  content provenance and purpose-based visual choices. Existing recovery text
  was preserved. No rendered application was changed or browser-tested.

These are artifact/decision inspections, not statistically independent live
agent trials. Detailed worker records and coordinator source verification are
retained at `.scratch/upstream-refresh-20261106/` in the workspace parent.

## Local checks and findings

| Check | Result |
|---|---|
| Coordinator remote/content verification | PASS: 12 primary sources, 13.984 entries; exact set of 10 Ralph deviations and recorded file hashes validated |
| Independent risk review | Found four intentionally stale reference hash fixtures; values refreshed, hash and heading-preservation assertions unchanged |
| Independent glossary/review/UI review | Eight glossary and six coverage scenarios inspected; no substantive issue. Found changed compact review digest in historical compatibility tests |
| Initial `npm run test:local` | FAIL: 588 tools tests, 584 passed/4 failed; later skill/hooks/Python stages did not execute because tool stage failed |
| Intermediate local run | FAIL: 585/588 tools. Compact shorthand omitted the material-sensitive-semantics qualifier and strict read-only marker; install doctor also returned 1 while source/receipts were being revised. This changing-state run is not final evidence |
| Compact correction | `estimateTokens` returns 194 for `sc-review`, preserving existing test ceiling; required coverage spine remains, detailed owner keeps zero-findings semantics |
| Current compatibility fixtures | Six intentionally changed reference hashes and two current compact compatibility pins refreshed; historical response records, baseline pins, negative controls and assertions retained |
| Stable tool phase | PASS: `npm run test:local` reached 588/588 tool tests, 0 failures/skips. It then stopped at a stale Wave 3 reference pin; that skill test was corrected and rerun below |
| Final `npm run test:skills` | PASS: 28/28, 0 failures/skips; includes both Wave 3 reference-pin corrections |
| Final `npm run test:hooks` | PASS: `hook security tests passed`, exit 0 |
| Final `npm run test:python` | PASS: 36 tests, `OK`; `skill router contract: PASS`, exit 0 |
| Focused final-source policy checks | PASS: 69/69 autonomy/review/communication/risk tests; isolated install/reinstall/doctor test also passed 1/1 |
| `npm run audit` | PASS: 3 deterministic benchmark repeats; every configured gate passed, including `sc-review` at 194 tokens. Framework audit: 0 findings; stored receipt verified |
| Documentation/links/diff inspection | PASS: 21 changed/new Markdown files inspected with doc-lint advisory, all execution exits 0; both new reports have no structural findings. Source identities/5 adoptions/8 recommendations/4 public-doc links inspected; `git diff --check` clean |

The complete `test:local` wrapper was not rerun after the final two test-fixture
hash corrections. Its already-passing tool phase is retained; every remaining
required phase was executed separately and passed. Later changes were those
fixture values and this report/CHANGELOG, not runtime procedures. The current
all-file audit was refreshed after closeout documentation. Raw local outputs:
`super-compound-test-local-stable.log`, `super-compound-skills-final.log`,
`super-compound-hooks-final.log`, `super-compound-python-final.log`, and
`super-compound-audit-final.log` under the workspace-parent evidence directory.
Benchmark/audit receipts remain under `.agent/benchmarks/`.

## R-01 follow-up

The active selective catalog source is
`b7d5353e0130feb8c5574ef1251f8a1db1873ccb`: 35 upstream CSVs refreshed plus
the retained local web CSV, 36 catalogs/4,357 rows, and 106 preserved local cell
transforms. The old `3da52ff1cab1be91848072ec1be5f493d730fd5f` default is
historical; per-file revisions identify refreshed assets. The
[merge ledger](../research/interface-catalog-refresh-20261106.json) retains
source/local hashes and transform values; the
[R-01 report](interface-catalog-refresh-20261106.md) records implementation,
regression, relevance and provenance evidence. These follow-up results do not
replace the initial-stage observations above.

The latest default broad run reached 587/588 tool tests; an unchanged Python
manifest fixture failed in that run and passed on isolated retry. The same
588-test inventory passed 588/588 with concurrency 4, without skips. Skill,
hooks and Python phases passed separately. The R-01 follow-up does not claim
that the default broad wrapper passed.

## Upstream verification limits

The source lock records focused commands and limits for each source. Notable
non-passing or unavailable upstream checks remain explicit: Superpowers Windows
path assertion and missing `ws`, ECC missing `js-yaml`, GSD vendor type exports,
compound Windows/local-extra skill guards, Matt strict packaging warnings, and
interrupted full BMad pytest. None was patched merely to make its mirror green.
Upstream source identity/content can be verified without claiming those full
runtime suites passed.

Live Amp/Claude/Cursor/Antigravity sessions, provider auth/cost, cross-OS runtime,
visual application behavior, certification and legal compliance were not
measured. At the initial adoption stage, Super Compound's UI catalog kept its
prior selective provenance pin and schema/ranking migration remained proposed.
The R-01 follow-up above records its later implementation separately.
