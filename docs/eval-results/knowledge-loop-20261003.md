# Knowledge Loop Verification

Date: 2026-10-03. Baseline: `337630cdd25883a907e2bc7501626828fffc0b40`.

Baseline was rerun from an isolated, unchanged checkout: 227/227 tools,
20/20 skills, hook security PASS, 29 Python tests PASS, skill router PASS.
An initial run against the moving worktree encountered installer hash races;
it is excluded from baseline evidence. Installer checks require frozen inputs.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Idempotent capture and origin identity | memory-maintenance.test.mjs replay, solution rename, one-origin copies/revisions |
| Provenance and atomic failure | safe evidence locator and failed busy-rename tests; old bytes retained |
| Quick Reference and owner work | format checks and preservation of owner sections |
| Promotion and disposition | three origins; inferred/PATTERN rejection; unchanged dismissed proposal suppression |
| Resume and contract drift | checkpoint restoration, digest drift, corrupted ledger rejection; work-package test skips verified goal with fresh evidence |
| Retrieval | stale/superseded default exclusions, diagnostic inclusion; calibration/held-out hard negatives and consolidation aliases |
| Payload composition | mandatory preservation, optional pointer omissions, overflow before package write |
| Evaluation | comparable KEEP/REJECT/INCONCLUSIVE; action order grader rejects prose-only claims |
| UI | source-change invalidation, independent result dictionaries, explicit version provenance; paired local benchmark |
| Cross-host contract parity | current installer and command/router suites; actual host attempts remain unmeasured |

RED/GREEN cycles were run for promotion, capture, strict replacement, refresh,
checkpoint, disposition, feedback, payload, paired evaluation, action grading,
executable references, UI cache, applicability, and corrupt-ledger recovery.

## Final checks

| Command/check | Observed result |
| --- | --- |
| npm test | 252/252 tools, 20/20 skills, syntax checks, hook security PASS |
| npm run test:python | 31 tests PASS; skill router PASS |
| npm run audit | Static benchmark PASS; framework audit PASS with zero findings; stored audit verification PASS |
| git diff --check | PASS |
| memory-maintenance.mjs check | PASS |
| Codex installer parity | Exact bundled file/hash verification, reinstall/no-op, repair and rollback tests PASS in tool suite |

The final complete suite ran after the last source changes with installer inputs
held constant. Audits are refreshed after durable evidence and solution capture.
No tests were skipped or weakened. The STRIDE reference snapshot hash was updated
only to replace the retired runtime-state locator with the actual durable state paths;
progressive loading checks remain intact.

The paired local cache benchmark returned KEEP: median 0.234230s
without cache and 0.083097s with cache, a 64.52%
reduction over five alternating pairs of 200 searches. Complete-result hashes
match. This result is limited to repeated searches in one Python process.

Self-review regression checks preserve multiline frontmatter, exclude quoted stale
status and feedback tables from default retrieval, retain copied IDs as canonical
aliases, reject malformed checkpoint blockers, reject unknown host/model identities,
use the latest verification/review verdict, and propagate solution applicability.

## Goal and wiring verification

| Observable truth | Result | Evidence |
| --- | --- | --- |
| Retry does not create recurrence or lose owner content | Verified | Replay, stable-origin, copy consolidation, owner-section and strict replacement tests |
| Resume preserves verified work and detects drift | Verified | Real work-package ledger transition/retry test; fresh evidence validation and checkpoint tests |
| Default retrieval avoids obsolete/irrelevant operational records | Verified | Calibration/held-out fixtures, superseded/quoted-stale filtering, general rule and feedback exclusion tests |
| Context stays reviewable within bounded dispatch | Verified | Mandatory payload tests; overflow prevents any package write; static route/startup budget gates |
| Improvement verdicts require comparable observed evidence | Verified | Unknown/incomparable pairs return INCONCLUSIVE; quality/later-verification failures rejected |
| Installed host adapters preserve canonical behavior | Verified for assets | Complete installer parity and route/router contracts; live host execution unmeasured |

The verified-result -> capture -> memory -> retrieval path is exercised through
the CLI and public tool APIs. Checkpoint -> resume -> validated ledger is exercised
against actual work-package evidence artifacts. Workflow closeout and selective
reference wiring pass route contracts and the all-file audit. Real model pressure
attempts remain a distinct, unmeasured evidence class.


## Measurement limits

The cache benchmark compares five alternating cold-index pairs of 200 local
searches, with identical complete-result digests. See
`.agent/benchmarks/ui-search-cache.after.json`. Static token benchmark is
estimated text context with route ratio/startup caps; host input/output/cache,
latency, retries, billing, and behavioral reliability remain unknown.
No real-host reliability or reduction in repeat mistakes is inferred from
synthetic traces, file hashes, usage frequency, or static contract tests.
