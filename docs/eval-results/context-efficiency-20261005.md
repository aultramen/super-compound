# Context Efficiency Delivery Evidence

## Summary

Context loading, measurement, depth selection and session-model guidance are
implemented. The runtime target is **UNPROVEN**, with zero eligible pairs:
two Sol pilots connected but the CLI execution policy rejected fixture reads
before execution. Neither pilot completed real work. Astra and the full AB/BA
batch were not run after the shared fixture-access precondition failed.

126 related tests pass, hook security checks pass and three deterministic
benchmark runs pass. These results establish local contracts and measurement
behavior; they do not establish runtime savings or host reliability.

The subsequent canonical audit closure removes all six recorded findings:
13 contracts now point to the unchanged shared checkpoint authority, and the
canonical benchmark/audit snapshots are regenerated and verified. The dated
six-finding audit remains historical evidence. Runtime reduction remains
**UNPROVEN**; no additional host experiment was performed.

## Baseline and measurements

The current dirty worktree was frozen before edits: 612 tracked/nonignored
source files, HEAD `50650d89e3724dbbae05ac205ce30d1ab48b7c17`, manifest digest
`d1f3f025b6a034d31f459d11142bd5f2ee04647c097928f2d22ea9edb8eef026`.
Local `.scratch/context-efficiency/baseline.json` records status and individual
file SHA-256/byte sizes; `baseline.zip` preserves original bytes, including local
changes. Private/runtime scratch and debug state were excluded. The historical
Git baseline remains unchanged. Pre-existing canonical benchmark/audit bytes
were subsequently archived before the authorized regeneration described below.

| Frozen potential source load | Deterministic estimate |
| --- | ---: |
| Broad README/startup/rule preflight | 16,142 |
| Six execution skill bodies | 4,700 |
| Checkpoint plus integration policy | 3,138 |
| Work entry contracts | 816 |

These inventory-specific values supersede estimates for this snapshot, not the
plan's audit provenance. They are potential reads, never observed activation.
The work entry contracts now total 901 estimated tokens: the entry grew by 85
to carry mandatory checks and authority; the intended saving comes from avoiding
downstream broad reads and cascades. The historical scenario passes at 92.10%
reduction, without preloading the issue-authoring skeleton during execution.
Historical weighted reduction remains approximately 98.70%; it is not the
current-snapshot runtime result.

The six modeled conditional profiles cover cold entry, warm reuse, execution,
checkpoint and resume. They range from 1,264 to 2,024 estimated framework tokens;
warm reuse contributes zero new payload when fingerprints match. Checkpoint and
resume are explicit conditional probes, not mandatory phases of every task.
Neither these estimates nor the successful synthetic paired-gate tests count
as runtime pairs. Host instructions and tool schemas remain separately unknown.

Pilot Sol usage (input includes cached input; output includes reasoning):

| Attempt | Input | Output | Cache read | Reasoning | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Review route | 94,339 | 316 | 79,616 | 15 | 94,655 |
| RTK read retry | 41,016 | 155 | 32,768 | 11 | 41,171 |

Elapsed pilot durations were 33.31s and 19.88s. There is no before/after duration
comparison. Cost, total-token savings, median overhead reduction and the 80-90%
hotspot target remain unknown. CLI exit 0 did not establish task correctness;
actual responses and stderr showed rejected reads and no source inspection.

## Implemented scope

| Plan requirement | Result and source |
| --- | --- |
| Reuse resident instructions; narrow discovery | executing-plans authority/workspace and context-engineering read-depth |
| Covered mandatory checks, source authority, no universal full-load | skill-index and execution/work skill contracts |
| Conditional policy and simple/complex checkpoint | policy-loading, checkpoint.contract and answerable-package reference |
| Proportionate depth; preserve full delivery | brainstorming and explore depth; existing light/full T1-T5 gates retained |
| Mapped verification and reusable evidence | execution-verification contracts/reference; existing SPEC/QUALITY review retained |
| Bounded tool results and isolated handoffs | read-depth and work contract; dispatch remains authorization-dependent |
| Inherit with retained overrides | agent-models v1, projections, installer preservation and integration test |
| Effort and optional API guidance | model-guidance and orchestration-loop; no API adapter or automatic model switch |
| Unknown usage and verified Codex shapes | transcript-usage and session-end; log report v2 with subtotal/coverage |
| Cumulative path/range/payload replay | context-load tool, modeled load manifest and six fixture seeds |
| Balanced AB/BA and median/MAD gate | context-load pairs evaluator; static data is ineligible |

Usage report v2 is an explicit schema change: unknown totals stay null, known
subtotals and per-field coverage are exposed. Old logs remain readable with
missing reasoning unknown. Inclusive Codex and additive Claude semantics are
kept distinct; mixed-provider totals are unknown. Codex rollout cumulative
totals count once; exec totals sum turns. Child transcript files require unique
contributor registration and separate analysis to avoid counting a child twice.

Existing H01-H12 and A01-A11 responses were reviewed for compatibility with the
split checkpoint and replayed through their tests. Original source digests were
retained in source_review_history. This was an informed content review, not a
new independent host communication experiment. Three new context contract
checks fail against the frozen baseline and pass against the change. Codex
parser sensitivity was also demonstrated against the frozen parser; its test
was added after implementation, so the isolated baseline supplies RED evidence.

## Verification and remaining gaps

- 126 tests: context efficiency/load, transcript usage, autonomy, workflow,
  checkpoint/questions, projection, benchmark, setup, evidence matrix and
  progressive disclosure. Zero failures, skips or cancellations.
- `npm run test:skills`: 20 passed; `npm run check`: passed.
- `node .agent/hooks/test-hooks-security.js`: passed after telemetry changes.
- `agent-projection.mjs --check`: all six host projections current.
- Static benchmark: three identical passing runs, all 19 routes / 57 cells.
- Doc lint: no structural findings; `git diff --check`: exit 0.
- Historical dated global audit: **FAIL**, six findings. Five refer to pre-existing
  token-benchmark.after.json now stale after the changed suite/context. The new
  dated benchmark is current; the old locally modified artifact was preserved.
  The remaining duplicate checkpoint-routing paragraph across 13 contracts was
  already present in the frozen worktree. No new duplicate/link findings remain.

## Canonical audit closure

Pre-regeneration canonical snapshots, the unchanged historical baseline and an
exact-byte SHA-256 manifest are archived locally in
`.scratch/global-audit-closure-2026-10-05T08-11-45-316Z/`. The dated audit above
is retained unchanged; the archive preserves locally modified canonical bytes.

The repeated paragraph in 13 workflow contracts is now
`Human input/approval: .agent/context/checkpoint.contract.md`. The shared
authority still requires stable IDs, every ready active-work need, pending
dependencies, both reply examples, displayed target/revision/stage boundaries
and continuation from the previous position. H01-H12, A01-A11 and HINT-01-HINT-10
recorded responses were reviewed for compatibility; previous source digests
remain in review history and relevant fingerprints are current. This is content
review and local replay, not another host experiment.

Closure verification: 100 tests across framework audit, token benchmark, evidence
matrix, workflow contracts, checkpoint, questions/hints and context efficiency/load
pass with no failures, skips or cancellations. Doc lint and `git diff --check`
pass. The final canonical sequence is `npm run bench` (historical baseline,
three identical passing repetitions), `framework-audit.mjs --output
.agent/benchmarks/framework-audit.after.json` (PASS, zero findings), then
`framework-audit.mjs --verify-existing .agent/benchmarks/framework-audit.after.json`
(PASS). No validator, threshold, duplicate exception, schema or API was changed
for this closure. Source and documentation edits precede this final seal.

The next runtime action is to restore permitted fixture reads in the CLI host,
then prove fixture access and actual work before at least five balanced pairs
per fixture/model. Capture delivered payloads at the host boundary, inspect
correctness and mandatory checks, and run the median >=50% and >2*MAD gate.
No host policy was bypassed and no commit, push, publish or deployment occurred.

## Evidence files

- [Evaluation protocol](../../.agent/evals/context-efficiency.md)
- [Static benchmark](../../.agent/benchmarks/context-efficiency-static-20261005.json)
- [Cumulative modeled replay](../../.agent/benchmarks/context-efficiency-cumulative-20261005.json)
- [Runtime status and baseline provenance](../../.agent/benchmarks/context-efficiency-runtime-20261005.json)
- [Global audit findings](../../.agent/benchmarks/context-efficiency-audit-20261005.json)
- [Canonical benchmark](../../.agent/benchmarks/token-benchmark.after.json)
- Canonical audit closure: `.agent/benchmarks/framework-audit.after.json`
