# Legacy Plan Gate Inputs

## Summary

Review the legacy pstack plan inputs through their existing owner before relying
on them again. R-03 exposes these failures; it does not rewrite approved artifacts.

- Area: framework planning artifacts
- Priority: P2
- Status: pending
- Created: 2026-11-06
- Source: [R-03 verification](../eval-results/real-artifact-gates-20261106.md)

The real `docs/fsd/fsd-pstack-enhancement.md` declares NOT_APPLICABLE but lacks the
readiness gate's required factual `reason:` field. Its genuine scratch issue board
uses unsupported `FSD-PSTACK#GOAL-*` blockers instead of the required relative
issue paths. The corrected DAG parser rejects those tokens rather than dropping
the dependencies. Preserve intended dependencies and existing authority when
the owner updates these inputs; rerun actual readiness and DAG gates afterward.
The separate framework FSD has no matching PRD authority; do not fabricate one
or use an unrelated PRD to manufacture qualification.
