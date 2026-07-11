# `/sc-research` Boundary — Brainstorm

> Brainstormed on 2026-07-11

## What We Are Fixing

Restore a clear job, artifact, and lifecycle boundary for `/sc-research` without expanding the public workflow surface. The route should answer one named factual or technical question with reviewable evidence, then return to the workflow that owns the decision.

## Why It Became Ambiguous

The original research workflow included entry/skip criteria, a structured note, `docs/research/`, and explicit handoff. Commit `16f4adc` compressed it to a short local/official-doc checklist while `/sc-explore` later gained strong BRD authority. The route remained public, but its durable output and boundary disappeared. Public docs then mentioned it only as “gather evidence.”

There is no usage telemetry proving the route is rarely used. Removal based on perceived frequency would therefore be speculative.

## Options Considered

| Option | Benefit | Cost | Decision |
|---|---|---|---|
| Remove `/sc-research` | Smallest command list | Loses a discoverable evidence route; breaks launch/geniusloop/docs/contracts; pushes ad hoc research into unrelated workflows | Reject |
| Merge into `/sc-explore` | Fewer commands before BRD | Mixes empirical evidence with normative business authority and cannot serve post-BRD planning/audit/debug questions cleanly | Reject |
| Merge into `/sc-plan` | Keeps technical research near implementation | Too late for evidence that changes business/product scope; overloads planning and cannot serve other callers | Reject |
| Keep and enhance as a conditional evidence gate | Preserves a distinct job while avoiding mandatory ceremony | Requires explicit boundary, artifact, handoff, and documentation | Choose |

## Key Decisions

1. `/sc-explore` answers “what/why/for whom?” and owns the BRD.
2. `/sc-research` answers “what is factually true/current/feasible?” and produces advisory evidence only.
3. `/sc-plan` turns accepted evidence into FSD `TDEC-*`, constraints, or an accepted ADR.
4. `/sc-audit` owns severity, posture, compliance, and readiness judgments.
5. `/sc-debug` owns reproduction, root cause, and fixes for concrete failures.
6. Research is optional and caller-aware. Small lookups remain inline; material, conflicting, reusable, or blocking evidence gets a durable note.
7. Durable notes use `docs/research/YYYY-MM-DD-<slug>.md` and `.agent/templates/research/Research-Note-Skeleton.md`.
8. `OPEN-RESEARCH-*` records insufficient evidence without inventing an answer.
9. Research notes never override BRD, PRD, FSD, accepted ADR, or audit authority.

## Success Checks

- Runtime workflow and compact contract encode use/skip boundaries, safety, authority, artifact, and return routes.
- README, walkthrough, operating contract, routing rule, and launch flow describe research as conditional.
- A regression test fails if the boundary, skeleton, lifecycle example, or contract-first benchmark coverage disappears.
- Framework audit and token benchmark remain green.

## Recommended Next Workflow

Treat this as a framework maintenance change: verify the edited workflow surface, then use `/sc-review`; use `/sc-go` only if commit/push/PR is explicitly requested.
