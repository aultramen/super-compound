# Python Manifest Fixture Under Parallel Tests

## Summary

Investigate the default parallel runner's manifest-comment fixture failure if
it recurs; the unchanged fixture passes isolated and in the complete 588-test
inventory with concurrency 4.

- Area: framework test tooling
- Priority: P3
- Status: pending
- Created: 2026-11-06
- Source: [R-01 verification](../eval-results/interface-catalog-refresh-20261106.md)
- Related: `.agent/tools/standards.test.mjs`, `.agent/tools/standards.mjs`, `.agent/tools/run-local-tests.mjs`

The default run returned a different validation error than the assertion
expected. Preserve stderr, subprocess status and elapsed time on reproduction
before attributing it to load or timeout; neither cause is established. Do not
weaken the assertion or change the runner merely to hide the failure.

## Investigation update - 2026-11-07

Status remains **pending / Needs Validation**; cause is **UNKNOWN**. Current
traced and bare 58-file default runs both passed 631/631. Sixty-nine focused
native comment cases also passed. These are nonreproduction observations, not
proof that the historical flake is fixed. The partial 50-file reconstruction
passed 595/595 with the retained old critical code, and four observation controls
passed. The cause still needs a native failure receipt or original child metadata.

See the [current investigation](../eval-results/python-manifest-flake-20261107.md)
for the causal boundary, actual observations and outstanding proof. No runtime
fix, timeout increase or permanent concurrency cap is justified yet.
