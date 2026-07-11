---
date: 2026-07-11
last_verified: 2026-07-12
scope: super-compound
status: verified
tags: [token-efficiency, progressive-disclosure, workflow-boundaries, evidence]
---

# Super Compound Token-Efficiency And Workflow Audit

## Verdict

Keep `/sc-research` as a conditional, read-only evidence sidecar, and apply the
same authority discipline to all 17 routes. The framework now routes exact
commands through compact contracts, escalates only for a named need, and records
a 17-route x 3-cell static input/process/output evidence matrix.

The authoritative deterministic benchmark passes every scenario above the
strict 90% gate. These are modeled static first-hop and output-authoring
surfaces, not observed model telemetry or generated-response token counts.

## Coverage

- The physical worktree inventory, excluding only `.git/`, enumerated and
  byte-read all 326 files. This includes nine ignored binary cache artifacts;
  they are not framework authority and are intentionally excluded from the
  canonical audit.
- The active Git manifest contains 317 tracked or untracked/non-ignored paths.
  All 317 are accounted and audit-classified. The main digest byte/content
  audits 316; `--verify-existing` separately validates the self-generated
  `.agent/benchmarks/framework-audit.after.json` report.
- All 17 workflows have input, process, and output evidence cells (51/51):
  context-entry reduction, semantic wiring/authority, and sink/budget/next owner.

## `/sc-research`: Purpose And Boundary

Before this change, research was described broadly as work “before planning.”
It had no consistently documented durable output, caller, return route, or
authority boundary, which made it look interchangeable with `/sc-explore`.

After this change:

| Question | Owner | Output | Next step |
|---|---|---|---|
| What should be built, why, for whom, under which policy? | `/sc-explore` | approved BRD | `/sc-prd` |
| What is factually true, current, supported, or feasible for a named decision? | `/sc-research` | advisory evidence note | return to decision owner |
| How should approved behavior be implemented? | `/sc-plan` | FSD `TDEC-*` or linked accepted ADR | `/sc-work` |
| What risk, compatibility, compliance, or readiness severity exists? | `/sc-audit` | findings and gates | owner decision |
| Why is a concrete behavior failing, and how is it repaired? | `/sc-debug` | root cause and verified fix | caller |

Run research only when a named fact could materially change a decision, local
evidence is insufficient/stale/conflicting, or the evidence needs review or
future revalidation. Keep a narrow lookup inline. Emit `OPEN-RESEARCH-*` rather
than inventing a conclusion. Non-trivial evidence uses
`.agent/templates/research/Research-Note-Skeleton.md` and is saved under
`docs/research/`.

### Real Integration Cases

1. **Tenant analytics:** `/sc-explore` defines users, business outcome, and an
   acceptable freshness promise. `/sc-research` tests whether current event
   volume, retention, and query isolation can support it. An infeasible promise
   returns to Explore and BRD approval; feasible constraints flow to `/sc-prd`
   and then `/sc-plan`.
2. **Framework upgrade:** `/sc-plan` names the migration decision.
   `/sc-research` compares official runtime support, peer requirements, changed
   APIs, and rollback evidence. Planning records the accepted sequence as an
   FSD `TDEC-*`; `/sc-audit compat` judges current-stack posture before work.
3. **Payment webhooks:** Research verifies provider retry, ordering, and
   idempotency semantics. `/sc-prd` owns observable failure behavior,
   `/sc-plan` owns the technical idempotency contract, and `/sc-audit` owns
   replay, secret, PII, and compliance findings.
4. **Genius loop:** `/sc-geniusloop` may propose replacing a custom queue. If
   user value is unclear it returns to `/sc-explore`; only a framed vendor or
   runtime feasibility question routes to Research.

## Token-Efficiency Evidence

Every `/sc-*` process scenario includes the selected native Codex adapter body,
so the workflow numbers are not contract-only marginal reductions.

| Modeled static stage | Before | After | Weighted reduction | Weakest scenario |
|---|---:|---:|---:|---:|
| Input/context entry | 923,783 | 3,204 | 99.6532% | 95.1169% |
| Process/procedure entry | 719,974 | 9,455 | 98.6868% | 90.1458% |
| Output-authoring context | 193,493 | 2,832 | 98.5364% | 98.5105% |
| All reduction scenarios | 1,837,250 | 15,491 | 99.1568% | 90.1458% |

Key route and component evidence:

- `/sc-research`: 2,263 -> 223 estimated tokens, including the 104-token Codex
  adapter body (90.1458%).
- Legacy eager preload: 516,436 -> 2,365 (99.5420%).
- BRD/PRD/FSD/issue output-authoring surface: 98,427 -> 1,416 (98.5614%).
- Full agentic template reference surface: 95,066 -> 1,416 (98.5105%).
- Interface-design data: 353,236 -> 151 (99.9573%).
- All-skill preload hotspot: 52,186 -> 594 (98.8617%).
- Specialist agent prompts: 3,157 -> 897 words (71.59% storage reduction),
  while their compact runtime index remains 99 estimated tokens.
- Interface-design persisted chat output: 4,689 -> 393 characters (91.62%).

Totals are scenario-weighted and may count a shared file more than once. The
weakest-scenario gate prevents a large route from hiding a smaller route below
90%.

## Quality Preservation

Compaction is guarded by behavior, not size alone:

- `workflow-invariants.json` maps all 17 routes to authority, mutation policy,
  evidence sink, and required full/compact markers.
- Artifact contract tests require skeleton-first authoring, BRD risk gates, PRD
  completeness, current `/sc-work` routing, and canonical ADR paths.
- Full BRD/PRD/FSD/ADR files remain section-on-demand reference libraries;
  compact skeletons are more than 98% smaller without removing approval,
  traceability, negative-case, security, or verification gates.
- Architecture presets conform to the nested project-config schema while
  preserving bundler, API-doc, authentication, seed, and container-start
  context from the legacy presets.
- Interface-design tests cover strict CSV parsing, bounded results, full JSON
  expansion, single-pass product lookup, actionable reasoning errors, compact
  persistence output, and project-scoped links.
- Codex installation is exact, hash-manifested, idempotent, path-confined, and
  stages and verifies a replacement before swap; an injected failure preserves
  the prior verified installation.

## Cross-Workflow Alignment Fixes

- `docs/STATE.md` is canonical durable state; `.continue-here.md` is only a
  short pointer. Pause and launch boundaries now agree with hooks and status.
- Genius Loop dispatches read-only Brain directly, avoids FSD-only execution
  orchestration, and suppresses brainstorm/glossary sidecars; only its report may
  be written.
- `/sc-ui` has explicit read-only design/review and `/sc-work` implementation
  modes. Approved BRD-only work routes through PRD before plan.
- Chat BRD/PRD drafts cannot authorize downstream stages; consumed eval evidence
  must be durable.
- Review and audit stay read-only after approval and route every remediation to
  explore, PRD, plan, debug, work, or Git ownership.
- Non-trivial debug evidence has `docs/debug/YYYY-MM-DD-<slug>.md` as an overflow
  sink; compounding remains reserved for verified reusable lessons.
- Every compact skill contract is runtime-reachable, every active agent prompt
  is covered, and every workflow invariant declares next owners.

## Evidence Integrity

- The before baseline is reconstructed from declared ancestor Git commits, not
  trusted numeric JSON.
- The baseline stores an assembly timestamp, per-override rationale, a
  before-definition digest, and an aggregate source-content digest.
- The after report stores the full suite-definition digest, after-surface
  digests, one recomputed digest for all three identical runs, and explicit
  `authoritative`, methodology, and runtime-unknown fields.
- The workflow matrix stores source digests, a recomputed matrix digest, 51/51
  coverage, 17/17 static gates, and `runtimePass: null` without paired traces.
- The framework audit uses the exact tracked plus untracked/non-ignored Git
  manifest, rejects symlink entries, records `HEAD`, classifies each path, and
  distinguishes byte/content audit from its self-report validator.
- `--verify-existing` recomputes and rejects stale/altered evidence, then reports
  100% accounted only when both normal and special validation pass. The stored
  `HEAD` remains digest-bound provenance, while freshness compares content and
  manifest state; committing the excluded report therefore does not create an
  impossible self-reference.

## Integration Trace

```text
exact /sc-* request
  -> native Codex adapter (or resident host rule)
  -> matching compact workflow contract
  -> full workflow only for named missing procedure
  -> selected skill reference / artifact skeleton only when needed
  -> durable artifact or evidence sink
  -> 17x3 static matrix + benchmark semantic/size gates
  -> exact-manifest class audit + specialized stored-evidence verification
```

## Reproduce

```bash
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3 --output .agent/benchmarks/token-benchmark.after.json
node .agent/tools/framework-audit.mjs --output .agent/benchmarks/framework-audit.after.json
node .agent/tools/framework-audit.mjs --verify-existing .agent/benchmarks/framework-audit.after.json
node --test .agent/tools/agent-contracts.test.mjs .agent/tools/artifact-contracts.test.mjs .agent/tools/codex-install.test.mjs .agent/tools/evidence-matrix.test.mjs .agent/tools/framework-audit.test.mjs .agent/tools/git-workflow.test.mjs .agent/tools/token-benchmark.test.mjs .agent/tools/transcript-usage.test.mjs .agent/tools/work-package.test.mjs .agent/tools/workflow-contracts.test.mjs
node --test .agent/skills/agentic-delivery/tests/progressive-disclosure-wave3.test.mjs .agent/skills/architecture-enforcement/tests/architecture-enforcement.test.mjs .agent/skills/security-audit/tests/risk-skills-progressive-disclosure.test.mjs .agent/skills/skill-authoring/test-progressive-routers.mjs
python -m unittest discover -s .agent/skills/interface-design/scripts -p "test_*.py"
```

## Limitations

`observedRuntimeTokens`, host-injected context, reasoning, and generated output
remain `unknown`. Runtime pass is deliberately `null` until all 17 routes have
paired attributable baseline/current traces under identical fixtures and host
configuration. This audit proves deterministic repository-owned static context
reduction and end-to-end contract wiring, not production cost, latency, billing,
or generated prose reduction.

## Related

- [Research boundary brainstorm](../brainstorms/2026-07-11-sc-research-boundary-brainstorm.md)
- [Contract-first runtime loading](../solutions/performance-issues/token-runtime-contracts-20260626.md)
- [Framework synchronization and evidence integrity](../solutions/performance-issues/framework-sync-context-integrity-20260710.md)
- `.agent/benchmarks/token-baseline.before.json`
- `.agent/benchmarks/token-benchmark.after.json`
- `.agent/benchmarks/framework-audit.after.json`
