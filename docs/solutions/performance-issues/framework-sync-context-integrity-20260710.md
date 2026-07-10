---
date: 2026-07-10
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
| `SKILL.md` entrypoint words | 32,244 | 13,275 | -58.82% |
| Largest skill entrypoint | 2,288 words | 498 words | below 500-word gate |
| All `SKILL.md` deterministic tokens | 53,489 | 21,927 | -59.01% |
| Historical eager-preload workload | 516,436 tokens | 2,489 tokens | -99.52% |
| All reduction-gate scenarios | 1,837,205 tokens | 12,184 tokens | -99.34% |
| Benchmark artifact | 122,078 bytes / 29,481 tokens | 9,936 bytes / 1,837 tokens | -91.86% / -93.77% |

All 35 entrypoints now route detail into on-demand references while preserving
behavioral gates. Real repository startup surfaces are measured separately:
Codex 1,529/2,000, Claude 2,399/3,000, Antigravity 2,197/2,750, and installed
skill metadata 1,025/2,500 deterministic estimated tokens.

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
  the creation snapshot. Parallel work requires isolated workspaces.
- Interface-design imports carry upstream/local normalized hashes in
  `UPSTREAM.json`. Multi-term queries down-weight short acronyms without
  breaking isolated `AI`, `UI`, `AR`, `VR`, or `3D` retrieval, and code/snippet
  fields are not destructively truncated.

## Verification

Primary reproducible evidence:

```bash
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3 --output .agent/benchmarks/token-benchmark.after.json
node .agent/tools/framework-audit.mjs --output .agent/benchmarks/framework-audit.after.json
node --test .agent/tools/framework-audit.test.mjs .agent/tools/git-workflow.test.mjs .agent/tools/token-benchmark.test.mjs .agent/tools/transcript-usage.test.mjs .agent/tools/work-package.test.mjs
node .agent/hooks/test-hooks-security.js
python -m unittest discover -s .agent/skills/interface-design/scripts -p "test_*.py"
```

The three-run benchmark is deterministic and every reduction/budget scenario
passes. The final all-file audit reads the complete active repository surface
and reports zero findings. Ralph's separate shell suites cover transactional
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

- Re-run the benchmark and all-file audit after any routed surface changes.
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
Repository storage grows because references, tests, provenance, and evidence
are retained; the improvement is in active first-hop context, not deletion of
useful knowledge. `gsd-core-next` targets Node 22 while the available runtime was
Node 24. Its full and unit runners produced no partial output before 604-second
and 304-second timeouts. Isolated TypeScript build, 142 skill-dependency checks,
generated-sync checks (38 manifests and 71 generated skills), and npm integrity
all passed, but those narrower checks do not turn the timed-out suites into a
pass.

## Related

- [Contract-First Runtime Loading](token-runtime-contracts-20260626.md)
- `../../../.agent/benchmarks/token-benchmark.after.json`
- `../../../.agent/benchmarks/framework-audit.after.json`
