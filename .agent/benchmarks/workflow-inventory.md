# Workflow Token Inventory

## Evidence Authority

- Historical legacy eager-preload measurements: `token-baseline.before.json`.
- Current contract-first measurements: `token-benchmark.after.json`.
- Measurement and gate logic: `.agent/tools/token-benchmark.mjs`.

The v3 result stores one canonical scenario set, the full suite-definition
digest, input/process/output stage summaries, the verified baseline digest, and
recomputed run digests. It also stores a 17-route x 3-cell static workflow
matrix with source and matrix digests. It does
not copy the same full result for every repeat. `.agent/tools/framework-audit.mjs`
fails when the report is stale, non-deterministic, incomplete, or has fewer than
three consecutive passing runs.

## Coverage

The suite covers real repository-owned startup budgets for Codex, Claude, and
Antigravity; the native Codex adapter metadata; all 17 public `/sc-*` workflows
including the selected adapter body; and these cross-cutting surfaces:
legacy eager preload, artifact output, all skills, delivery/planning,
execution/verification, risk/audit, templates, Git, interface data and scripts,
hooks, agents, workflows, and rules.

The matrix covers all 51 cells: route input context reduction, process
adapter/contract/authority/mutation wiring, and output sink/budget/next-owner
contracts. Runtime reasoning and generated output remain explicitly unevaluated.

## Interpretation

- `deterministic_estimated_tokens_v1` is a reproducible estimate, not a vendor
  billing tokenizer.
- Input, process, and output are modeled static first-hop surfaces, not
  host-observed runtime stages.
- Matrix process/output cells are contract and wiring evidence, not tokenized
  model reasoning or generated-response measurements.
- The baseline is immutable historical evidence. Its file sets and measurements
  are revalidated from the recorded Git blobs; do not regenerate it after an
  optimization.
- The aggregate total is a scenario workload and may count a file more than
  once. It is labeled scenario-weighted; use per-scenario and stage-minimum
  reductions for decisions.
- A pass requires every reduction scenario to improve by more than 90%, every
  startup profile to stay within its absolute budget, three repeated runs to
  match exactly, each modeled stage to pass, and all smart-zone checks to remain
  intact.
- Smaller context is not allowed to remove artifact authority, `OPEN-*` stop
  conditions, verification mapping, preview-first Git, or search-backed UI
  guidance.

## Refresh

```bash
node .agent/tools/token-benchmark.mjs \
  --baseline .agent/benchmarks/token-baseline.before.json \
  --require-reduction 90 \
  --repeat 3 \
  --output .agent/benchmarks/token-benchmark.after.json

node .agent/tools/framework-audit.mjs
node .agent/tools/framework-audit.mjs \
  --verify-existing .agent/benchmarks/framework-audit.after.json
```
