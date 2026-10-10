# Live Standards Pilot Operator Packet

## Summary

Execute twenty baseline/advisory task pairs, **40 live observations**, using
existing maintained Next.js/TypeScript and FastAPI/Python applications, one
representative multi-framework monorepo, two developers, Claude Code and Codex.
The [register](pilot-observations.csv) ships entirely `not-run`. Deterministic
fixtures, synthetic approvals and repeated test commands are not live observations.
Use the existing [adoption procedure](adoption.md) and
[release controls](operations.md); do not create a second configuration system.

**Optional G2-SO/1.0.0 execution.** Only after actual owner approval, copy the
existing 20-pair/40-row register into the evaluation evidence store. Retain the
A-D tasks, host assignments, BA/AB order, x/y variants and thresholds. Replace
D1/D2 assignment values in that copy with the single actual operator Aulia Rahman;
retain the original assignment as `templateOperatorSlot`, not a second person.
Both hosts still perform their actual assigned tasks. Record `qualificationMode:
G2-SO/1.0.0` in the evaluation record, not a new application configuration system.

Aulia must actually inspect the original attempts, corrections, final diffs and
evidence. Retain substantive steps/findings/resolution and genuine decision time.
A single inspected batch may cover multiple observations with exact locators;
approval of this procedure is not inspection or a passing observation. Until
inspection, retain NOT-RUN/RUNNING, actual FAIL or BLOCKED; never claim PASS. AI findings and
operator adjudication remain distinguishable. No simulated review, fixtures or
repeated deterministic test invocations count as live observations.

Preserve all existing metric definitions and thresholds. Report a maximum
single-operator/two-host claim for the actually qualified scopes/platforms. No
inference about inter-developer reproducibility or independent error adjudication
is supported. Remote CI measurement and security prerequisites still apply.

## Preflight and assignments

The pilot lead records actual application repositories, isolated nonproduction
branches, D1/D2 identities, host owners, independent reviewer, security owner and
rule owner before execution. Missing appointments keep the pilot pending.
The reviewer must not be the developer whose observation is adjudicated.

Freeze these items before the first counted observation:

- Reviewed candidate identity, core/profile versions and byte hashes; application
  scope, lockfiles, commands, tool versions and approved runtime/platform matrix.
- Task acceptance criteria, equivalent variants, seeded defects and their expected
  check/rule IDs; confirm each seed actually fails the configured checker.
- Host application/model versions, available settings, prompts and tool access.
  Record any host update during the pilot and adjudicate its comparability.
- Baseline controls, evidence retention/access, metric definitions below and genuine
  adoption approval. Advisory changes require reviewed configuration but do not
  activate required merge protection or weaken existing completion/authorization.

Each pair uses the same developer/host and equivalent tasks on independent copies
of the same starting revision. `B` is baseline and `A` is advisory. The register's
`BA`/`AB` order alternates to balance learning effects; its variant `x` always belongs
to baseline and `y` to advisory. Preflight reviews equivalent difficulty and baseline
checker exposure. Do not give either run the other run's code, transcript or repairs.

| Pair | Task and expected behavior | Developer / host | Run order |
|---|---|---|---|
| A1 | Next.js boundary/error behavior; validate input and safe errors. | D1 / Claude Code | BA |
| A2 | Next.js service change; preserve contracts and relevant tests. | D1 / Codex | AB |
| A3 | Next.js regression repair with deterministic behavior evidence. | D2 / Claude Code | BA |
| A4 | Next.js seeded format/lint/type defects; detect all configured faults. | D2 / Codex | AB |
| A5 | Replay a matched Next.js task from A1 or A2 across hosts; same rules and versions. | D1 / Claude Code | BA |
| B1 | FastAPI boundary/error task corresponding to A1; shared core, Python conventions. | D1 / Claude Code | AB |
| B2 | FastAPI service task corresponding to A2; no web-profile contamination. | D1 / Codex | BA |
| B3 | FastAPI regression corresponding to A3; relevant test/security proof. | D2 / Claude Code | AB |
| B4 | FastAPI seeded format/lint/type defects; detect all configured faults. | D2 / Codex | BA |
| B5 | FastAPI matched replay across hosts; same core as A and Python profile. | D1 / Codex | AB |
| C1 | Monorepo web-only change; select web profile, preserve unrelated API evidence. | D1 / Claude Code | BA |
| C2 | Monorepo API-only change; select API profile, preserve unrelated web evidence. | D1 / Codex | AB |
| C3 | Monorepo forbidden dependency edge; architecture checker detects it. | D2 / Claude Code | BA |
| C4 | Shared dependency/config change; re-resolve all declared consumers. | D2 / Codex | AB |
| C5 | Sibling edit versus shared policy edit; correct preservation/invalidation without leakage. | D2 / Claude Code | BA |
| D1 | Unknown framework; core-only scope and truthful incomplete framework coverage. | D1 / Claude Code | AB |
| D2 | Explicit configuration versus manifest/pin conflict; reject instead of guessing. | D1 / Codex | BA |
| D3 | Legacy/disabled and unsupported schema cases; compatible legacy behavior, no compliance claim. | D2 / Claude Code | AB |
| D4 | Genuinely approved sandbox exception, then expiry/revocation; visible waiver, then denial. | D2 / Codex | BA |
| D5 | Failed/skipped/missing/stale proof; completion and aggregate remain denied. | D2 / Codex | AB |

Each developer and host receives twenty observations. Each developer-host
combination receives five pairs. For A5/B5, select matched tasks assigned to a
different host earlier in that group and freeze the correspondence before runs.
The monorepo may be one of the selected applications if it represents both stacks.
Unknown-framework and exception trials remain isolated sandbox scopes.

## Execution and evidence

1. Reset the pair's independent workspaces to recorded starting inputs. Confirm
   baseline/advisory order, application controls and frozen installs. Capture
   dirty/source identity when a commit alone does not identify input bytes.
2. Give the actual developer/AI host the frozen task and allowed instructions.
   Record delivered context, prompts, tool use, developer interventions and elapsed
   work. Preserve the first result and every repair; no silent retry until green.
3. Resolve and run the existing scoped entrypoints from the adoption guide on the
   actual result. Keep expected-denial states visible. Baseline outcomes are measured
   against applicable rule IDs retrospectively; do not count baseline as adoption.
4. Obtain genuine independent review of behavior, applicable design/security limits
   and native check outcomes. Record authorized human approval separately from AI
   advisory findings and deterministic evidence. Refresh review after relevant edits.
5. Reverify the snapshot/receipt in CI for its actual tested revision and installed
   tools. Capture CI run/attempt, head/base/tested identity and actual job timings.
6. Reviewer adjudicates findings and confounders, updates the copied register and
   publishes the paired report. Invalid observations retain evidence and receive
   an explicitly linked replacement; they do not count toward forty valid rows.

Copy the register into the application's evidence store; do not write live results
into the shipped template. For each observation retain this record:

| Record field | Required content |
|---|---|
| Identity | Observation/pair/task/variant/mode; UTC timestamps; actual developer and host/model/version; environment and task AC. |
| Starting/final input | Repository/revision/dirty inventory; head/base/tested CI revision; runtime/lock/tool/config identities. |
| Standards | Core/profile pins, effective snapshot, scope/rule IDs, `effectiveStandardsDigest`, `sourceDigest`, limitations and exception references. |
| Check proof | Native outcomes and exit status, normalized test report, complete receipt/evidence tree, verification result and meaningful scan scope. |
| Human/AI review | Independent reviewer identity and inspected steps/findings/resolutions; actual authorization reference; AI findings identified as advisory. |
| Metrics | Eligible/evaluated rules, introduced/detected defects, adjudicated false positives, review rounds/style rework, context loads and measured CI durations. |
| Disposition | `pass`, `fail`, `invalid` or `not-run`; reason, unresolved items, repair/replacement links and independent adjudicator. |

Keep immutable original attempts, failed evidence and approved repairs. Sensitive
transcripts, secrets and raw logs belong in access-controlled storage; record
digests/locators in the report. Local `.scratch/standards/` is working storage,
not durable retention. Archive reviewed artifacts through existing result/history
mechanisms. All evidence must identify the same source/policy/configuration as its
claim; copying timestamps or changing receipt `pass` is never evidence.

## Metrics and go/no-go

Report counts and raw per-observation data, separately by group, stack, host and
developer. For p95 use nearest rank: sort ascending and take index
`ceil(0.95 * n)` using one-based positions. Report `n`, baseline/advisory p95
and pairwise differences; do not mix different token measures or CI populations.

| Metric | Definition and qualification threshold |
|---|---|
| Rule compliance | Independently satisfied applicable mandatory rule instances / applicable instances. Every positive final advisory change must satisfy all required instances with current checks and genuine review, without waivers. |
| Selection/reproducibility | Expected core/profile/scope/check identity matches observed identity in every relevant observation. Re-running identical input with approved tools gives the same verdict. No cross-profile leakage. |
| Seed detection | Every frozen seeded violation triggers the specified checker/review finding. Zero false passing completion/aggregate decisions; expected-denial observations pass only by denying correctly. |
| Format/lint/type | Identical source, tools and config produce identical verdicts; final positive checks pass and the formatter does not mass-rewrite during adoption. |
| Architecture/security | All seeded boundary/security faults are caught; no unresolved high-severity findings. Report scan scope and uncovered dynamic/design/runtime behavior approved by its owner. |
| False positives | Independently confirmed incorrectly failing deterministic gate evaluations / all valid deterministic gate evaluations; at most 5%. Report finding-level counts separately. If no valid evaluations exist, report denominator zero, not an invented percentage; seeded detection must still qualify. |
| Review rework | Style-attributable revision requests, review rounds and measured repair time per pair. Advisory style-related requests must not increase against paired baseline. Report other rework separately. |
| Task context | p95 advisory delivered task-context tokens must be at most 1.15 times p95 baseline. Measure cold entry, warm reuse, execution, checkpoint and resume; separate framework, host and tool-schema contributions. |
| CI overhead | Added p95 execution seconds `max(0, p95(advisory) - p95(baseline))` must not exceed `max(0.20 * p95(baseline), 120)`. Report dependency installation and queue time separately. |

Use host-reported delivered input tokens when available. Otherwise retain actual
transcripts/payload manifests and use the same existing context-load estimator for
both runs; label estimates and unavailable host injection, never substitute the
static fixture benchmark for live measurements. Token measurement limitations
require rule-owner acceptance before a token-overhead qualification claim.
CI execution includes relevant standards resolve/check/verify jobs, excludes queue
time, and reports cold versus warm installs separately. Compare equivalent runner
classes and check coverage; disclose baseline zero/missing duration instead of
dividing by zero. Budgets apply overall and to each group; investigate any
host/stack population regression even if the overall threshold passes.

The pilot lead and independent reviewer recommend `GO` only after forty valid
observations, all correctness criteria, adjudicated false positives/rework,
measured budgets, approved residual limits and genuine approvals. D4's waiver
tests are negative/sandbox evidence, not compliant positive release changes.
Any false pass, unauthorized review, scope leakage or unexplained drift is `NO-GO`.
Unresolved observations or measurement/approval gaps are `PENDING`, not success.
Qualify only the selected hosts, stacks, teams and environments; the matrix does
not certify every framework or all six adapters. Code-text similarity is excluded.

The result report names each failed/invalid/unrun observation and links original
evidence. Additional independent reliability attempts may use the existing
eval-gate-model; do not derive `pass@3` from repair retries or claim it from this
paired experiment alone. Enforcement requires the separate administrator gates
in the operating packet, regardless of pilot results.
