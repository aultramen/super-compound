---
date: 2026-07-10
last_verified: 2026-07-12
category: performance-issues
severity: high
tags: [framework-sync, progressive-disclosure, token-budget, hooks, provenance, verification]
---

# Framework Synchronization and Context-Evidence Integrity

## Symptoms

Nine framework folders were not represented by one consistently verifiable
upstream state, and Super Compound's runtime evidence mixed a historical eager
preload workload with real startup surfaces. The original all-file audit found
44 issues: 43 P1 findings and one P2 finding covering stale benchmark evidence,
missing output budgets, oversized skill entrypoints, and duplicated content.

Other concrete failures found during review included:

- hook input could leak or use unsupported output shapes;
- duplicate hook configuration drifted;
- implementers could choose their own review allowlist and omit unrelated edits;
- two-character search tokens skewed multi-term UI queries;
- formatted motion snippets were truncated;
- Ralph's in-session documentation claimed bounds that exceed Claude Code's
  eight-consecutive-Stop-continuation host limit;
- benchmark outputs lacked semantic surface digests and honest unknown-runtime
  fields.

## Root Cause

The repository had progressive-disclosure intent but no complete enforcement
loop. Large `SKILL.md` bodies remained first-hop surfaces, output caps were prose
only, benchmark evidence could go stale without semantic detection, and no
single auditor read every repository file. Cross-source imports also lacked a
uniform provenance and regression contract.

The Ralph and work-package gaps had the same deeper cause: state ownership was
implicit. A shell hook, concurrent process, or implementer could mutate state
without a transaction or scheduler-owned scope.

## Solution

### Upstream synchronization

| Folder | Before/reference | Verified upstream state |
|---|---|---|
| `superpowers` | `896224c4` | `d884ae04edebef577e82ff7c4e143debd0bbec99` |
| `compound-engineering` | `c759a260` | `72c2d16337b253d33b86b20972cbe7372de6dd25` |
| `everything-claude-code` | `34faa39b` | `40927950c49f6e742d341e20ff7b9b7e1e7bfff5` |
| `ui-ux-pro-max-skill` | `b7e3af80` | `3da52ff1cab1be91848072ec1be5f493d730fd5f` |
| `gsd-core-next` (`next`) | `38e9b831` | `3283ce5ae7cb40213c2c55bce19c6006cf9511d3` |
| `isms-public` | `3ae3b5a0` | `e69b9ac3dbf1526bcf25fcbde3551bd84d1a36af` |
| `gao-agent` | `4c874665` | already current at `4c87466549782f27fe795f962a90e90dc84a7c4a` |
| `mattpocock-skills-main` | snapshot `6eeb81b5` | real Git checkout `391a2701dd948f94f56a39f7533f8eea9a859c87` |
| `ralph` | fresh authoritative clone | `6c53cb0b831ebe8739c6a003e22af14902d8b0b5` plus locally verified integrations |

The replaced Matt Pocock snapshot remains recoverable at
`../.sync-backups/mattpocock-skills-main-6eeb81b5`. Ralph additionally derives
its in-session loop from Anthropic's `ralph-wiggum` implementation at
`15a21e1b4e240e2da6a4953d5f148a806c9c9bb2` and the stable-prompt/fresh-context
technique documented by Geoffrey Huntley.

### Super Compound runtime and evidence

| Measure | Before | After | Result |
|---|---:|---:|---:|
| All-file audit findings | 44 | 0 | eliminated |
| `SKILL.md` entrypoint words | 32,244 | 13,424 | -58.37% |
| Largest skill entrypoint | 2,288 words | 498 words | below 500-word gate |
| All `SKILL.md` deterministic tokens | 53,489 | 22,190 | -58.51% |
| Historical eager-preload workload | 516,436 tokens | 2,365 tokens | -99.54% |
| All reduction-gate scenarios | 1,837,250 tokens | 15,491 tokens | -99.16% |

All 35 entrypoints now route detail into on-demand references while preserving
behavioral gates. Repository startup surfaces are measured separately: Codex
1,535/2,000, Claude 2,405/3,000, Antigravity 2,324/2,750, native Codex adapter
metadata 13/200, and bundled skill metadata 1,025/2,500 deterministic estimated
tokens. Each workflow process scenario also includes the selected 104-token
Codex adapter body.

The 2026-07-11 evidence-hardening pass separates modeled stages and requires
both the scenario-weighted aggregate and the weakest scenario in every stage to
exceed 90%:

| Modeled static stage | Before | After | Weighted reduction | Minimum scenario |
|---|---:|---:|---:|---:|
| Input/context entry | 923,783 | 3,204 | 99.6532% | 95.1169% |
| Process/procedure entry | 719,974 | 9,455 | 98.6868% | 90.1458% |
| Output-authoring context | 193,493 | 2,832 | 98.5364% | 98.5105% |

The full benchmark suite definition, immutable baseline source content, and
each repeated run now have independent SHA-256 evidence. Baseline sources must
be ancestor commits, per-scenario overrides require rationale, and authoritative
comparison cannot fall back to a mutable working-tree baseline.

`.agent/context/output-budgets.json` is the machine-readable authority for all
17 route return envelopes. `.agent/tools/framework-audit.mjs` validates that
manifest, every file's encoding/shape/links/contracts, duplicate content, and
fresh benchmark evidence without echoing invalid payload content.

### Ownership, security, and retrieval

- Hook configuration is a single exec-form `hooks.json`; bounded readers avoid
  stdin, prompt, transcript, and secret echo. Stop hooks use official
  `last_assistant_message` and structured output fields.
- Ralph state create/hook/cancel operations share a cross-process lock and
  atomic JSON replacement. In-session bounds are 1-8; fresh-process `ralph.sh`
  retains explicit `--unlimited`, safe default permissions, selected-prompt
  validation, per-iteration timeout, and combined output limits.
- Work-package scope is supplied and sealed by the scheduler. Review validates
  its digest and rejects working-tree changes outside the allowlist relative to
  the creation snapshot. Ledger updates use an owned lock directory and atomic
  replacement; transient Windows `EPERM`/`EBUSY` acquisition races retry within
  the existing bound, while persistent errors still fail. Parallel work
  requires isolated workspaces.
- Interface-design imports carry upstream/local normalized hashes in
  `UPSTREAM.json`. Multi-term queries down-weight short acronyms without
  breaking isolated `AI`, `UI`, `AR`, `VR`, or `3D` retrieval, and code/snippet
  fields are not destructively truncated.

## Verification

Primary reproducible evidence:

```bash
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3 --output .agent/benchmarks/token-benchmark.after.json
node .agent/tools/framework-audit.mjs --output .agent/benchmarks/framework-audit.after.json
node .agent/tools/framework-audit.mjs --verify-existing .agent/benchmarks/framework-audit.after.json
node --test .agent/tools/agent-contracts.test.mjs .agent/tools/artifact-contracts.test.mjs .agent/tools/codex-install.test.mjs .agent/tools/evidence-matrix.test.mjs .agent/tools/framework-audit.test.mjs .agent/tools/git-workflow.test.mjs .agent/tools/token-benchmark.test.mjs .agent/tools/transcript-usage.test.mjs .agent/tools/work-package.test.mjs .agent/tools/workflow-contracts.test.mjs
node .agent/hooks/test-hooks-security.js
python -m unittest discover -s .agent/skills/interface-design/scripts -p "test_*.py"
```

The three-run benchmark is deterministic and every reduction/budget scenario
passes. The final audit reads the exact active Git manifest except its declared
generated report and records its source, `HEAD`, and evidence digest. Its
verifier binds the recorded `HEAD` as provenance but determines freshness from
content and manifest state, so committing that excluded report remains
verifiable. Ralph's
separate shell suites cover transactional
state races, official Stop schema, plugin manifests, prompt selection, safe
permissions, timeout, output caps, and exact completion handling.

## What Didn't Work

- Renaming an eager-preload scenario without adding real absolute startup
  budgets still produced a misleading claim.
- Token totals alone could not detect same-sized semantic changes; after-surface
  digests were required.
- Letting an implementer populate `review-paths.json` after implementation made
  omission undetectable; scope had to move to the scheduler and be sealed at
  creation.
- Importing the upstream two-character token floor without phrase weighting
  made `minimal ui for saas` rank `Zero Interface` above `Minimal & Direct`.
- A partial Ralph migration left a 20-iteration shell default feeding a state
  validator capped at eight. Regression tests exposed the split-brain contract.

## Prevention

- Re-run the benchmark and active-manifest audit after any routed surface changes.
- Keep observed runtime and host-injected token fields `unknown` until an
  attributable host transcript exists; static estimates must not impersonate
  telemetry.
- Require provenance hashes plus regression tests for selective upstream
  imports.
- Keep state ownership explicit: one transaction boundary for state machines,
  one scheduler-owned allowlist for review, and isolated workspaces for
  parallel edits.
- Preserve full detail in on-demand references; keep entrypoints below the
  500-word enforcement gate.

## Limitations

The token metric is deterministic static estimation, not observed model usage.
Stage totals are scenario-weighted and can count shared files more than once;
output measures authoring context, not generated response tokens. Minimum
per-scenario gates prevent a large scenario from hiding a weak route.
Repository storage grows because references, tests, provenance, and evidence
are retained; the improvement is in active first-hop context, not deletion of
useful knowledge. `gsd-core-next` targets Node 22 while the available runtime was
Node 24. Its full and unit runners produced no partial output before 604-second
and 304-second timeouts. Isolated TypeScript build, 142 skill-dependency checks,
generated-sync checks (38 manifests and 71 generated skills), and npm integrity
all passed, but those narrower checks do not turn the timed-out suites into a
pass.

## Related

- [2026-07-11 token-efficiency and workflow audit](../../audits/2026-07-11-super-compound-token-efficiency.md)
- [Contract-First Runtime Loading](token-runtime-contracts-20260626.md)
- `../../../.agent/benchmarks/token-benchmark.after.json`
- `../../../.agent/benchmarks/framework-audit.after.json`
