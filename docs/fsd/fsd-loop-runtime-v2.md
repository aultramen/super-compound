# Loop Engineering Runtime v2 - Functional Specification Document

## Metadata

- ID: `FSD-LER2`
- Version: `1.1.0`
- Artifact contract version: `2.0.0`
- Loop contract version: `2.0.0`
- Status: `APPROVED`
- Approved by: Project Owner (user)
- Approval basis: explicit request on 2026-07-17 to implement this exact plan; Project Owner-directed application of `AMD-LER2-GOAL-015-001` on 2026-07-22
- Upstream: `PRD-LER2@2.0.0#FR-001` through `PRD-LER2@2.0.0#FR-010`; `BRD-LER2@1.0.0#BREQ-001` through `BRD-LER2@1.0.0#BREQ-007`
- ADR applicability: `LINKED`
- ADR: `ADR-0001#DEC-001` through `ADR-0001#DEC-006`
- UI delivery profile: `NOT_APPLICABLE`
- UI contract readiness: `NOT_APPLICABLE`
- UI N/A reason/approver: no frontend/browser/mobile UI; the wizard is a host-rendered conversational protocol tested with structured fixtures and CLI; approved by Project Owner
- Baseline Git SHA: `454089a543afa03785b8ce55064e7a6305097e3d`
- Amendment scope: version `1.1.0` supersedes only the GOAL-015, TEST-015, adaptive-learning invariant, decision, eval, and traceability authority from version `1.0.0`. Completed GOAL-001 through GOAL-014 evidence remains historically bound to FSD digest `sha256:f99adb9fcac471a2cb1dd44ddb9c8cd8af83696b69dc7688692310a887641e50` and is not rewritten.

## 1. Product-to-implementation alignment

The implementation closes audit gaps `LE-01` through `LE-15` using one internal shared control plane. It preserves the exact 17 public workflows. `/sc-work` remains the primary implementation executor; `/sc-debug`, `/sc-launch`, `/sc-go`, and isolated `/sc-explore` prototypes consume the same admission authority when they mutate implementation or external state.

No implementation goal may start until `GATE-001` is satisfied: durable audit source, approved BRD/PRD/FSD, accepted ADR, frozen eval definition, issue DAG, and plan-verification `PASS`.

## 2. Domain model and invariants

### 2.1 Modes

- `DISABLED`: status, validation, and migration only.
- `OBSERVE`: deterministic replay/golden simulation; no project/external mutation or worker dispatch.
- `ENFORCE`: v2 is the sole valid runtime.
- `HALTED`: no new start/resume/claim/dispatch; bounded show/list/validate/migrate/repair/reconcile remain available.

Fresh install provides valid `DISABLED` config. Missing, invalid, unsupported, or v1 config evaluates to `HALTED`. Recovery from `HALTED` requires owner action plus successful validation and returns only to `DISABLED` or `OBSERVE` before re-promotion.

### 2.2 Run states

Nonterminal: `READY`, `RUNNING`, `OBSERVED`, `VERIFYING`, `PAUSED`, `RESUMING`.

Terminal: `SUCCESS`, `BLOCKED`, `NO_PROGRESS`, `BUDGET_EXHAUSTED`, `TIMEOUT`, `POLICY_STOP`, `FATAL`, `UNKNOWN_OUTCOME`, `CANCELLED`.

Verifier status is separate: `NOT_RUN`, `PASS`, `FAIL`, `ERROR`, `STALE`. `goal_met=true` is derived only from fresh `PASS` after every applicable eval, reviewer, original-return, human, and release gate.

### 2.3 Core invariants

- `INV-001`: A human confirmation must be valid before `READY -> RUNNING`, `PAUSED -> RESUMING`, any `ACTION_INTENDED`, implementation/external mutation, or worker dispatch.
- `INV-002`: A model proposal is never approval authority.
- `INV-003`: `max_iterations` is a mandatory positive safe integer. Nullable user caps never remove stricter effective policy.
- `INV-004`: Counters and event sequence/version are monotonic. Resume cannot reset or increase same-run caps.
- `INV-005`: The event log owns lifecycle. Snapshot is derived; work-package ledger is execution evidence.
- `INV-006`: The controller never executes shell, Git, network, model, or provider actions.
- `INV-007`: Unknown external outcomes never auto-retry; reconciliation evidence is mandatory.
- `INV-008`: No v1 schema, artifact, ledger, or runtime fallback can authorize v2 execution.
- `INV-009`: Raw prompts, chain-of-thought, secrets, PII, and raw untrusted payloads are forbidden in persisted state.
- `INV-010`: The public route set remains exactly 17 and contains no `/loop`.
- `INV-011`: Every GOAL-015 run and every later run whose immutable contract requires `ADAPTIVE_LEARNING_V2` binds a schema-valid, bounded learning intent with a hypothesis, `approach_id`, and predicted delta before `ACTION_INTENDED`. Historical v2 contracts/events without that opt-in remain replay-valid but cannot be continued under amended authority without replan. The record is non-authoritative and cannot weaken or replace run approval.
- `INV-012`: Actual delta, novelty, and `PROGRESS | WEAK_PROGRESS | NO_PROGRESS` are derived deterministically from attested observation/verifier evidence. A caller or model-supplied verdict is rejected.
- `INV-013`: Learning cannot mutate the goal, acceptance criteria, verifier, policy, budget, authority digest, risk, write scope, release gate, model weights, prompts, framework, or operating rules. Verified patterns remain advisory inputs only.
- `INV-014`: Active run memory is bounded to eight records, retrieval returns at most three compatible verified patterns, corrupt/unknown learning state fails closed without resetting no-progress, and compounding requires fresh verifier, independent review, closed findings, and host-attested human approval.

## 3. Architecture and dependency direction

Canonical modules:

```text
.agent/context/schemas/*.schema.json
          |
          v
.agent/tools/schema-validator.mjs
          |
          +--> loop-run-model.mjs       (pure state/policy functions)
          +--> loop-learning-model.mjs  (pure novelty/progress/memory functions)
          |
.agent/tools/file-state.mjs        (safe filesystem primitives)
          |                         |
          +----------+--------------+
                     v
              loop-run.mjs          (controller/CLI adapter)
                     |
                     +--> loop-learning-store.mjs (bounded operational projection)
                     |
                     v
        workflow/action/automation adapters
```

Dependency rules:

- Schemas contain structural authority only.
- `loop-run-model.mjs` has no filesystem, process, network, or ambient-clock dependency; clock/elapsed values are injected.
- `loop-learning-model.mjs` is a pure deep module. It validates bounded learning values, derives novelty/progress, compacts active memory, ranks compatible verified patterns, and never accepts an authoritative verdict from its caller.
- `file-state.mjs` contains path, bounded I/O, lock, CAS, append, atomic replace, platform-independent durability fault injection, and the root-bound hard source-write interceptor/broker; it imports no model/workflow module.
- `loop-learning-store.mjs` uses `file-state.mjs` for confined operational outcome/pattern persistence under `.scratch/loop-runtime/`; it does not own lifecycle or implementation authority.
- `loop-run.mjs` composes run/learning models and file state but performs no effect beyond local operational state.
- Action/queue/host adapters depend on controller contracts; the controller never depends on them.
- Hooks are advisory and cannot be treated as hard enforcement.

## 4. Machine contracts

Store strict schemas under `.agent/context/schemas/`:

- `runtime-common-v2.schema.json`
- `project-config-v2.schema.json`
- `loop-run-contract-v2.schema.json`
- `loop-run-state-v2.schema.json`
- `loop-run-event-v2.schema.json`
- `budget-proposal-v2.schema.json`
- `budget-confirmation-v2.schema.json`
- `work-package-ledger-v2.schema.json`
- `eval-result-v2.schema.json`
- `automation-trigger-v2.schema.json`
- `operation-inventory-v2.schema.json`
- `host-capability-v2.schema.json`
- `project-mode-capability-v2.schema.json`
- `iteration-learning-v2.schema.json`
- `geniusloop-outcome-v2.schema.json`
- `verified-pattern-v2.schema.json`

Each contract uses an exact discriminator such as `"schema": "loop_run_contract_v2"`, closes unknown properties, rejects unsupported keywords recursively, rejects nonlocal `$ref`, rejects unsafe integers and direct-API non-finite values, and never silently upgrades v1.

`project-config-v2` structural schema, loader, and digest calculation are delivered with GOAL-003 because GOAL-004 admission must bind a real policy digest. GOAL-005 expands authoring/workflow policy and makes the config canonical.

## 5. Effective policy and Budget & Stop Wizard

`effectivePolicy = global AND FSD AND operation AND human-confirmed limits`.

- Numeric maximum/timeout/budget: minimum non-null value.
- Allowlists/scopes: intersection.
- Required gates/evidence: union.
- Risk: highest value.
- Isolation: strongest value.
- Credential/approval expiry: earliest value.
- Missing/unknown mandatory value: deny.

Human-facing fields:

| Field | User rule | Runtime rule |
|---|---|---|
| Goal/verifier target | Read-only confirmation | Fresh verifier `PASS` is the only success source |
| `max_iterations` | Required positive integer | Total cap; increment at `ACTION_INTENDED` including crash/failure |
| `max_no_progress_iterations` | Nullable | Effective finite value required for background ENFORCE |
| `max_tokens` | Nullable | Aggregate attributed main/child usage; unknown never becomes zero |
| `max_cost` | Nullable | Configured billing currency, pinned pricing revision, integer micro-units |
| `max_runtime_minutes` | Nullable | Effective finite value required for write-capable ENFORCE |

Proposal flow:

1. `create` allocates immutable `run_id` and persists only operational metadata.
2. `budget propose` produces an advisory recommendation, policy maxima, nullable warnings, consumed/remaining values, verifier digest, and approval TTL.
3. A host renders the wizard. Only a host-attested human may confirm.
4. `budget confirm` validates and records an envelope; local CLI confirmation is reference/OBSERVE evidence until hard host attestation exists.
5. `START`/`RESUME` consumes the confirmation digest. Every action boundary revalidates all bindings.

Confirmation binds run ID, phase, optional queue item, goal/authority/verifier/eval/policy digests, effective values, autonomy/risk, approver identity, confirmation/expiry timestamps, and expected run version. Mismatch returns `APPROVAL_REQUIRED` without changing `READY`/`PAUSED`.

Resume preserves monotonic counters and may only keep or tighten remaining caps. Larger budget requires a new child run and cannot reopen terminal history. Background submit uses a preallocated draft queue item; claim is impossible until confirmation is valid. Lease-loss continuation requires new approval.

## 6. Accounting and stop semantics

One iteration is `ACTION_INTENDED -> observation -> verification`.

- Increment iteration atomically at `ACTION_INTENDED`; never decrement.
- Active runtime includes running, observed, verifying, resuming, in-flight action, and backoff; excludes paused/approval wait/queue wait.
- Approval expiry uses wall clock independently. An in-flight external action is observed/reconciled safely, then the next mutation is blocked.
- No-progress increments only after a completed observation/verifier cycle with unchanged redacted fingerprint and no measurable requirement, coverage, diff, or approach improvement.
- Token/cost finite caps require attributable measurement/reservation capability after effective-policy resolution; otherwise admission blocks. With no effective cap, store `UNMEASURED`.

Stop evaluation order: safety/policy/corruption/unknown; fresh verified success; exhausted iteration/runtime/no-progress/token/cost; otherwise next action.

### 6.1 GOAL-015 adaptive runtime learning contract

GOAL-015 closes the original GeniusLoop outcome-feedback gap and adds bounded per-iteration learning without creating a second lifecycle ledger. The hash-linked Loop Run event log remains the sole per-run learning authority. `iteration_learning_v2` and `geniusloop_outcome_v2` are reconstructible, event-head-bound operational projections; `verified_pattern_v2` is a human-promoted advisory projection of recorded release and promotion evidence. A projection may be durably cached, but cache loss or drift is repaired only from validated events and never turns the cache into peer authority. None is BRD, PRD, FSD, verifier, policy, approval, or implementation authority. The behavior is activated only by immutable run-contract gate `ADAPTIVE_LEARNING_V2`; schema additions are backward-compatible for replay and mandatory only when that gate is present.

Each learning intent is bound into `ACTION_INTENDED` and contains only:

- run/goal/iteration and pre-action run-head digests;
- bounded sanitized hypothesis text plus its digest;
- `approach_id` and a deterministic approach-signature digest;
- normalized problem/failure and context fingerprints;
- predicted requirement, coverage-basis-point, test, and meaningful-diff deltas;
- bounded evidence references and up to three compatible verified-pattern refs.

The controller rejects `ACTION_INTENDED` before incrementing the iteration when the learning intent is missing, malformed, stale, mismatched, corrupt, over the memory/retrieval bound, or attempts to carry actual delta, a progress verdict, authority mutation, raw reasoning, or sensitive/untrusted payload. A persisted learning intent is an audit fact only and never authorizes its associated action.

After observation and verification, the controller derives actual deltas from host-attested evidence and creates the matching completed `iteration_learning_v2` projection. Predicted and actual values remain separate. The deterministic verdict is:

| Verdict | Derivation |
|---|---|
| `PROGRESS` | Fresh verifier `PASS`, or at least one positive attributed actual requirement, coverage, test, or meaningful-diff delta with no safety/policy failure. |
| `NO_PROGRESS` | Same normalized failure fingerprint and same approach signature as the comparable prior record, with no positive actual delta. |
| `WEAK_PROGRESS` | Any other completed non-PASS cycle with no positive actual delta; it cannot decrement/reset no-progress or count as verified learning. |

Approach-attempt accounting is keyed by the normalized failure fingerprint plus the exact `approach_id`. For one normalized failure fingerprint, the same `approach_id` may reach `ACTION_INTENDED` at most twice, even if its signature is rotated. A following attempt is rejected with `NO_NOVEL_APPROACH` unless the `approach_id`, normalized hypothesis digest, and approach-signature digest are all different from the exhausted approach. Cosmetic ID, signature, or wording churn alone is not novelty.

The full event history is retained under existing run retention rules, but the active context projection keeps at most the latest eight learning records. Deterministic compaction records the omitted-history digest and never rewrites events. Verified-pattern retrieval:

1. rejects candidate, failed, stale, open-finding, unknown-attribution, expired, or incompatible records;
2. requires applicability constraints to match the current context;
3. ranks exact problem fingerprint, exact context fingerprint, newest `verified_at`, then lexical dedupe key;
4. returns at most three records and returns the same order on replay.

`geniusloop_outcome_v2` projects the original GOAL-015 closure fields from validated event evidence: `GL-*` ID, source signal, prior-duplicate result, hypothesis, baseline, expected metric, selected route, downstream artifact refs, owner, experiment result, accepted/rejected reason, and compounding-candidate state. One dedupe key identifies one outcome; retries are idempotent and conflicting reuse fails closed. Persisting this projection never creates a second lifecycle ledger.

Promotion to `verified_pattern_v2` requires a fresh verifier `PASS` bound to the current run head, distinct host-attested read-only checker `PASS`, a complete finding inventory with every required finding closed, and host-attested human approval. Promotion is idempotent by dedupe key and preserves authority/verifier/evidence digests, owner, retention, and applicability constraints. `/sc-geniusloop` may read sanitized outcomes/patterns for prior dedupe; `/sc-compound` may consume a verified candidate for human-owned documentation. Neither route may self-modify prompts, rules, policy, verifier, framework source, or public workflow inventory.

Learning is subordinate to the existing Budget & Stop Wizard, approval expiry, write classification, no-progress, iteration, runtime, token, cost, release, and terminal gates. Missing or corrupt state, unknown attribution, replay mismatch, or forbidden content returns a typed fail-closed denial and never resets counters.

## 7. Persistence and authority freshness

Per-run storage under ignored `.scratch/loop-runs/<run-id>/`:

- `contract.json`: immutable.
- `events.jsonl`: hash-linked lifecycle authority.
- `state.json`: derived snapshot.
- `learning.json` and `outcome.json`: optional bounded, event-head-bound derived caches for contracts that require `ADAPTIVE_LEARNING_V2`; neither is authoritative.
- owner-token lock and expected-version CAS.

Cross-run `verified_pattern_v2` projections live only under the confined operational namespace `.scratch/loop-runtime/verified-patterns/`. A promotion fact is appended durably to the originating run event log before its advisory projection is published. Projection corruption, a missing originating event, or digest drift fails closed; telemetry is never a learning source of authority.

Mutation order is durable event append then snapshot replace. File and containing directory are flushed, or the host reports an equivalent durability primitive. Unsupported durability blocks external-write ENFORCE. Snapshot-behind is repairable under lock; snapshot-ahead or broken hash/sequence/version is corruption and fails closed. Read-only validation never repairs.

Authority uses SHA-256 over full bytes of BRD, PRD, FSD, ADR, eval/verifier definitions, project config, operation inventory, and attested base Git SHA. Revalidate at create/start/resume/review/record/release/action/claim. Controller accepts base SHA as a host-attested value and never invokes Git.

## 8. Work-package, eval, findings, and release

`work_package_ledger_v2` allows `ready -> in-progress -> implemented -> verified`, plus typed blocked/failed recovery. It rejects v1, direct `ready -> verified`, blank/stale evidence, stale authority/eval/reviewer digests, and CAS conflicts. Stored paths are repository-relative.

Loop Run event log owns lifecycle. A verified package can exist before run success; `SUCCESS` consumes its digest through a separate idempotent run command. No cross-file transaction mirrors states.

`eval_result_v2` records definition/verifier digests, base SHA, attempts, pass metrics, human gates, artifact/workspace revision, verdict, and run-head digest. A medium composite contract additionally pins a `regression_verifier_digest` distinct from the targeted verifier; every clean-reset attempt carries its paired `regression` result and the aggregate is independently recomputed in `regression_pass_metrics`. Findings record source finding/run, evidence refs, owner, original verifier/digest, return gate, max closure cycles, and outcome. Self-report never closes a finding.

Risk ladder:

- Low deterministic: frozen deterministic grader.
- Medium/composite: targeted plus regression, with a fresh checker where subjective/background.
- High/background/external-write: distinct read-only checker plus named Technical and Security/Comprehension human approvals.
- Critical/destructive/production: no autonomous dispatch; two distinct human approvals and recovery drill.

## 9. Action, automation, and background safety

Action adapter interface:

- `plan(operation)`
- `executeOnce(operation, idempotencyKey)`
- `queryOutcome(receipt)`
- `compensate(receipt)`

Only stable allowlisted operation IDs are accepted; arbitrary commands/URLs are forbidden. Inventory declares target, read/write credential scopes, egress, idempotency, authoritative readback, compensation, timeout, expiry, audit sink, owner, risk, and human gate. Framework ships zero real external operations.

Local one-shot queue commands: `prepare`, `submit`, `claim`, `heartbeat`, `complete`, `cancel`, `reconcile`. Trigger state includes provenance, dedupe identity, expiry, missed-run policy, lease/recovery, retry/backoff, max attempts, concurrency/rate cap, result sink, and policy ref. Queue acknowledgement occurs only after known result or durable `UNKNOWN_OUTCOME`.

External mutation requires durable `ACTION_INTENDED` before dispatch. Reconciliation outcomes are exactly `APPLIED`, `NOT_APPLIED`, `PARTIALLY_APPLIED`, `INDETERMINATE`. Compensation is a new idempotent action with its own intent. Pre-dispatch cancel can become `CANCELLED`; post-intent/dispatch cancel with unknown result becomes `UNKNOWN_OUTCOME`.

Background/high-risk execution requires a dedicated worktree, process/network/credential/permission-bypass/audit capability attestation, finite effective runtime/no-progress limits, leases, cancel/quarantine, and global worker/token/time/remote/reviewer caps. The WSL2 host verifier binds an ENFORCE capability to the immutable-in-process host snapshot, native `ext4` workspace identity, exact root/config/version/verifier/interceptor digests, and a maximum 60-minute evidence window. Untrusted source-producing commands receive read-only system/repository mounts. The workflow authority privately mints an opaque, expiring, single-use source-write capability bound to the root, interceptor, path, intent, config digest, and config/mode versions; only that capability can reach the CAS/fsync/atomic-replace/readback broker. These mechanics do not activate ENFORCE; GOAL-019 cutover evidence and an owner transition remain separate gates.

## 10. Telemetry, privacy, and retention

Persist only sanitized structured metrics/evidence refs: terminal/profile/risk/route counts, attempts, active duration, verifier outcomes, no-progress, accepted outcome, pass metrics, reviewer queue/fanout/integration wait, reconciliation, and attributable token/cost usage.

Telemetry/export is off until purpose, classification, retention, ACL, size, rotation, and redaction revision are configured. Raw PII is forbidden. If processing is required, legal basis, DPIA as applicable, access, retention, and deletion obligations become explicit gates. Redaction/persistence failure for high risk fails closed.

Retention operates at whole-run granularity with expiry, disposition, and legal hold. UNKNOWN/quarantined evidence cannot be pruned before reconciliation. Prune is explicit dry-run/apply.

## 11. Migration, compatibility, and rollback

`migrate-loop-v2.mjs` provides:

- `scan`: read-only default; produces a digest-bound plan and candidate machine config.
- `apply --plan`: exclusive migration lock, digest/CAS recheck, confined paths, ignored pre-image manifest, atomic/idempotent/resumable writes.
- `verify`: blocks remaining legacy state before ENFORCE.

Only machine config and ledgers migrate. PRD/FSD/issues return `REPLAN_REQUIRED`. Legacy verified entries become `implemented + requiresFreshVerification`. Active v1 with no in-flight effect blocks for replan; uncertain prior effect becomes `UNKNOWN_LEGACY_OUTCOME` and requires reconciliation. After persisted v2 cutover, backup is forensic only and v1 runtime rollback is prohibited.

## 12. Public workflows and write classification

Write classes:

- `runtime_audit_write`: ignored Loop Runtime metadata; allowed before approval.
- `authority_write`: BRD/PRD/FSD/ADR/eval/issue artifacts by their owning workflows.
- `implementation_write`: all other repo-tracked mutation; unknown path defaults here.
- `external_write`: Git remote/PR/provider/API/database/external system mutation.

Wizard/gate applies to `/sc-work`, `/sc-debug` at fix/experiment mutation, `/sc-launch` per implementation handoff, `/sc-go` commit/push/PR, `/sc-explore` code-producing prototypes, every implementation write, and every external write. `/sc-ui` stays read-only and consumes an active `/sc-work` gate when used as guidance.

All 17 full and compact routes declare `loopRuntimeRole`, `writeClasses`, `wizardPolicy`, `requiredOperationGate`, and `loopStateAccess`. Read-only/authority routes cannot bypass classification. `workflow_invariants_v2` is the machine authority. Output/context token budgets remain explicitly separate from Loop Run resource budgets.

## 13. Technical Decision Register

| Decision | Status | Contract | Goal/test ownership |
|---|---|---|---|
| `TDEC-001` Strict documented JSON Schema 2020-12 subset; unsupported/nonlocal behavior fails | APPROVED | Sections 3-4 | GOAL-003 / TEST-003 |
| `TDEC-002` Confined bounded I/O, owner-token lock, CAS, event-first fsync, snapshot repair | APPROVED | Sections 3,7 | GOAL-002,004 / TEST-002,004 |
| `TDEC-003` Strict file-input ESM CLIs with JSON stdout, concise stderr, nonzero failure | APPROVED | Sections 5,7,11 | GOAL-004,006,007 / TEST-004,006,007 |
| `TDEC-004` Minimal project config schema/loader precedes controller; authoring integration follows | APPROVED | Sections 3-5 | GOAL-003,005 / TEST-003,005 |
| `TDEC-005` Human wizard proposal is advisory; confirmation is host-attested logical authority | APPROVED | Section 5 | GOAL-006,008,012 / TEST-006,008,012 |
| `TDEC-006` Work-package ledger is execution evidence, never peer lifecycle authority | APPROVED | Section 8 | GOAL-002,009 / TEST-002,009 |
| `TDEC-007` Eval/finding/original-return/risk gates anchor terminal head digest | APPROVED | Section 8 | GOAL-009 / TEST-009 |
| `TDEC-008` Local one-shot queue representation; no daemon or recurrence engine | APPROVED | Section 9 | GOAL-012 / TEST-012 |
| `TDEC-009` External effect intent/readback/reconciliation/compensation contract | APPROVED | Section 9 | GOAL-011,013 / TEST-011,013 |
| `TDEC-010` Feature-scoped sanitized telemetry and whole-run retention | APPROVED | Section 10 | GOAL-010 / TEST-010 |
| `TDEC-011` Clean-break scan/apply/verify migration with mandatory authority replan | APPROVED | Section 11 | GOAL-007 / TEST-007 |
| `TDEC-012` Exact 17-route invariant, advisory hooks, and installer inclusion | APPROVED | Section 12 | GOAL-016,017,018 / TEST-016,017,018 |
| `TDEC-013` Event-log-derived learning projection with a pure model and confined operational store; no duplicate lifecycle ledger | APPROVED | Sections 3,6.1,7 | GOAL-015 / TEST-015-BASE, TEST-015-AC01..AC12 |
| `TDEC-014` Verified patterns are bounded, deterministically retrieved, human-promoted advisory evidence and never self-modifying authority | APPROVED | Sections 6.1,8,10 | GOAL-015 / TEST-015-AC05..AC12 |

ADR obligations map as follows: `ADR-0001#DEC-001 -> GOAL-003/004 and TEST-003/004`; `ADR-0001#DEC-002 -> GOAL-004/007/015 and TEST-004/007/015`; `ADR-0001#DEC-003 -> GOAL-003/004/015 and TEST-003/004/015`; `ADR-0001#DEC-004 -> GOAL-006/012 and TEST-006/012`; `ADR-0001#DEC-005 -> GOAL-011/013/014 and TEST-011/013/014`; and `ADR-0001#DEC-006 -> GOAL-015/016 and TEST-015/016`. GOAL-015 also consumes `ADR-0001#OBL-001`, `ADR-0001#OBL-002`, `ADR-0001#OBL-003`, and `ADR-0001#OBL-005`; it does not reinterpret completed goal evidence or amend ADR prose.

## 14. Test and verification contract

| Test ID | Required behavior / command family |
|---|---|
| `TEST-001` | Authority, traceability, DAG, exact decision coverage, UI N/A, plan-verification PASS |
| `TEST-002` | `file-state.test.mjs`, `work-package.test.mjs`, `token-benchmark.test.mjs`: confinement, bounds, fsync, lock, CAS, ledger transitions |
| `TEST-003` | `schema-validator.test.mjs`, `loop-run-model.test.mjs`, `runtime-contracts.test.mjs`: strict schemas, policy, transitions, counters, no-progress |
| `TEST-004` | `loop-run.test.mjs` and CLI tests: event-first crash/replay/repair, approval binding, authority freshness, purity |
| `TEST-005` | project-config/artifact tests: mode bootstrap, effective caps, v1 rejection, write classification |
| `TEST-006` | budget-wizard tests: render, human-only confirmation, null warnings, start/resume, expiry, cumulative limits |
| `TEST-007` | migration tests: dry run, drift, interruption, resume, rollback, replan, legacy unknown outcome |
| `TEST-008` | workflow admission tests for work/debug/explore/launch/go plus STATE pointers |
| `TEST-009` | eval/finding/release tests: fresh PASS only, original verifier, maker/checker, human gates, trusted host attestation, and distinct medium targeted-plus-regression evidence in the same three clean resets |
| `TEST-010` | telemetry/privacy tests: attribution, unknown, redaction, retention, persistence failure |
| `TEST-011` | action/capability tests: stable operation IDs, no arbitrary command/URL, scope/egress/isolation denial |
| `TEST-012` | queue tests: prepared approval, dedupe, claim race, dead lease, expiry, cancel, exactly-one claim |
| `TEST-013` | six-point external fault matrix, four reconciliation outcomes, compensation, cancellation oracle |
| `TEST-014` | background worktree/lease/cap/quarantine tests and ten pilot fixtures |
| `TEST-015` | Umbrella for `TEST-015-BASE` and `TEST-015-AC01..AC12`; all targeted checks run from clean reset three times, with safety/privacy/replay/authority invariants requiring `pass^3 = 100%` |
| `TEST-016` | exact 17 full/compact route and `workflow_invariants_v2` conformance; no `/loop`; hook advisory parity |
| `TEST-017` | public docs/example/archive consistency and no overclaim |
| `TEST-018` | isolated Codex install/hash/VerifyOnly/no-op/repair/rollback and durable eval-definition packaging |
| `TEST-019` | full integration, three clean-reset eval attempts, observe/canary/background/external drills, regenerated audit |

Every implementation goal uses RED -> GREEN -> REFACTOR. Targeted tests precede broad `node --test .agent/tools/*.test.mjs` and hook security verification. Security, migration, durability, recovery, and regression paths require `pass^3=100%`; ordinary capability requires `pass@3>=90%`.

GOAL-015 requirement-to-test authority:

| Test ref | Required deterministic behavior |
|---|---|
| `TEST-015-BASE` | Durable, event-reconstructible `geniusloop_outcome_v2` projection records every original outcome/owner/baseline/metric/route/downstream/dedupe/decision/candidate field and idempotently rejects conflicting prior duplicates without becoming a second lifecycle ledger. |
| `TEST-015-AC01` | Missing hypothesis, `approach_id`, approach signature, or predicted delta is rejected before `ACTION_INTENDED`; the iteration counter and event head remain unchanged. |
| `TEST-015-AC02` | Caller/model-supplied actual delta or progress verdict is rejected; the controller derives the verdict only from attested observation/verifier evidence. |
| `TEST-015-AC03` | For the same failure fingerprint, one exact `approach_id` is allowed at attempts one and two and rejected thereafter even when its signature changes; only a new `approach_id` plus a different normalized hypothesis digest and approach-signature digest passes the novelty gate. |
| `TEST-015-AC04` | Predicted and actual deltas remain distinct, digest-bound, and replay to byte-equivalent projections. |
| `TEST-015-AC05` | Active memory never exceeds eight records; retrieval returns at most three deterministically ranked, context-compatible verified patterns. |
| `TEST-015-AC06` | Candidate, rejected, failed, open-finding, stale, unknown-attribution, expired, or self-reported lessons cannot enter verified memory. |
| `TEST-015-AC07` | Fresh verifier `PASS`, independent checker `PASS`, closed findings, and host-attested human approval produce exactly one idempotent verified pattern. |
| `TEST-015-AC08` | Attempts to change goal, criteria, verifier, policy, budget, authority digest, risk, write scope, release gate, prompts, model, or framework are denied. |
| `TEST-015-AC09` | Missing/corrupt state, unknown attribution, or replay mismatch fails closed and never decreases/resets no-progress or other counters. |
| `TEST-015-AC10` | Raw prompt, chain-of-thought, secret, PII, and raw untrusted payload fixtures are rejected and absent from persisted/exported learning artifacts. |
| `TEST-015-AC11` | Clean replay produces the same novelty, progress, compaction, retrieval, dedupe, and promotion decisions. |
| `TEST-015-AC12` | Learning cannot relax or bypass wizard approval, no-progress, iteration, runtime, token, cost, write, capability, or release gates. |

## 15. Goals and dependency DAG

`GATE-001` is completed before production code: approved durable authority package, accepted ADR, frozen eval, issue board, and `TEST-001` PASS.

| Goal | Dependency | Outcome | Primary refs |
|---|---|---|---|
| `GOAL-001` | None | Authority package and plan verification evidence | TEST-001; all TDEC/ADR refs |
| `GOAL-002` | GOAL-001 | Durable file-state and work-package ledger v2 | TDEC-002,006; TEST-002 |
| `GOAL-003` | GOAL-001 | Strict schemas, minimal config loader, and pure Loop Run model | TDEC-001,004; TEST-003 |
| `GOAL-004` | GOAL-002,003 | Persistent controller/CLI, counters, admission, crash recovery | TDEC-002,003; TEST-004 |
| `GOAL-005` | GOAL-004 | Canonical machine policy and artifact contracts v2 | TDEC-004; TEST-005 |
| `GOAL-006` | GOAL-005 | Budget & Stop Wizard protocol and CLI | TDEC-003,005; TEST-006 |
| `GOAL-007` | GOAL-006 | Safe migration and mandatory replan | TDEC-003,011; TEST-007 |
| `GOAL-008` | GOAL-007 | Core workflow and STATE wiring | TDEC-005; TEST-008 |
| `GOAL-009` | GOAL-008 | Eval, finding, original-return, risk, and release gates | TDEC-006,007; TEST-009 |
| `GOAL-010` | GOAL-009 | Attributed privacy-safe telemetry | TDEC-010; TEST-010 |
| `GOAL-011` | GOAL-010 | Action adapter, inventory, and host capability attestation | TDEC-009; TEST-011 |
| `GOAL-012` | GOAL-011 | Local one-shot prepared/approved queue | TDEC-005,008; TEST-012 |
| `GOAL-013` | GOAL-012 | Reversible external-write safety | TDEC-009; TEST-013 |
| `GOAL-014` | GOAL-013 | Background isolation, leases, aggregate caps, quarantine | ADR-0001#DEC-005; TEST-014 |
| `GOAL-015` | GOAL-014 | Adaptive Runtime Learning and GeniusLoop outcome closure | BRD-LER2@1.0.0#BREQ-003,006; PRD-LER2@2.0.0#FR-004,005,009; ADR-0001#DEC-002/003/006; TDEC-013,014; TEST-015 |
| `GOAL-016` | GOAL-015 | Exact 17-route full/compact/hook conformance | TDEC-012; TEST-016 |
| `GOAL-017` | GOAL-016 | Public documentation and archive truthfulness | TDEC-012; TEST-017 |
| `GOAL-018` | GOAL-017 | Codex packaging and isolated install | TDEC-012; TEST-018 |
| `GOAL-019` | GOAL-018 | Integration/eval/rollout/cutover evidence | all decisions; TEST-019 |

Only GOAL-002 and GOAL-003 may execute in parallel, and only in isolated workspaces with disjoint owned files. All later goals are serialized because they update shared contracts/workflows/docs/installer surfaces.

### 15.1 GOAL-015 implementation packet

**Atomic outcome:** implement one deterministic adaptive-learning slice that closes the existing GeniusLoop outcome ledger, gates every implementation action on a bounded learning intent, derives progress from evidence, and promotes only human-approved verified patterns. This remains one GOAL; the ordered items below are work packages, not new goals.

**Dependency:** GOAL-014 issue and TEST-014 terminal evidence must remain verified/fresh. No GOAL-016 work may start until GOAL-015 is terminal `SUCCESS` with `TEST-015` and required reviews passing.

**Run policy ceiling:** GOAL-015 uses `max_iterations: 20`, `max_runtime_minutes: 180`, and `max_no_progress_iterations: 3`; `max_tokens` and `max_cost` remain nullable. Effective values still use the strictest global/FSD/operation/human layer and can never be loosened by a CLI argument or learning record. Risk is `HIGH`, autonomy is `INTERACTIVE`, and the immutable run contract requires `ADAPTIVE_LEARNING_V2`, fresh verifier, human budget confirmation, independent checker, closed finding inventory, and human pattern-promotion approval.

**Expected source scope:**

- schemas: `.agent/context/schemas/iteration-learning-v2.schema.json`, `geniusloop-outcome-v2.schema.json`, `verified-pattern-v2.schema.json`, and bounded additions to Loop Run event/state schemas;
- pure/runtime modules: new `.agent/tools/loop-learning-model.mjs` and `.agent/tools/loop-learning-store.mjs`, plus bounded integration in `loop-run-model.mjs` and `loop-run.mjs`;
- tests: matching learning model/store tests plus targeted Loop Run, schema, runtime-contract, workflow-contract, privacy, and regression tests;
- workflow consumers: bounded updates to full/compact `/sc-geniusloop` and `/sc-compound` contracts without changing the exact 17-route set.

**Ordered TDD work packages:**

1. `WP-015-A Contract RED`: add failing structural/negative tests for all three schemas and additive/profile-gated event/contract bindings; reject unknown fields, unsafe bounds, forbidden content, and v1/missing versions while proving historical GOAL-009..014 replay remains valid.
2. `WP-015-B Pure learning GREEN`: implement progress derivation, novelty gate, approach-attempt accounting, deterministic compaction, top-three retrieval, and dedupe behind `loop-learning-model.mjs`.
3. `WP-015-C Durable outcome/pattern GREEN`: implement confined bounded projection persistence with CAS/atomic durability, event-first outcome idempotency, promotion evidence, retention, corruption denial, and privacy scans by reusing `file-state.mjs`; prove the caches reconstruct from events and never form a second lifecycle ledger.
4. `WP-015-D Controller integration`: require the learning intent before `BEGIN_ACTION`, bind it into `ACTION_INTENDED`, derive completion from attested verification evidence, replay projections, and prove existing counters/stops cannot be bypassed.
5. `WP-015-E Workflow closure`: wire sanitized prior-outcome/pattern reads into `/sc-geniusloop` and verified-candidate consumption into `/sc-compound`; keep both non-implementing/non-self-modifying and preserve exact route invariants.
6. `WP-015-F Verification`: run `TEST-015-BASE` and `TEST-015-AC01..AC12` three clean resets, relevant regression/safety suites, full tool tests, Stage 1 spec review, Stage 2 quality/security/privacy review, and release-gate evidence.

**Verification commands and expected evidence:**

1. `node --test .agent/tools/loop-learning-model.test.mjs .agent/tools/loop-learning-store.test.mjs .agent/tools/loop-run-model.test.mjs .agent/tools/loop-run.test.mjs` must report zero failures and explicit coverage of `TEST-015-BASE` plus `TEST-015-AC01..AC12`.
2. `node --test .agent/tools/schema-validator.test.mjs .agent/tools/runtime-contracts.test.mjs .agent/tools/eval-gate-model.test.mjs .agent/tools/loop-telemetry-model.test.mjs .agent/tools/workflow-contracts.test.mjs` must report zero failures, preserve historical v2 replay, and retain exactly 17 public routes with no `/loop`.
3. `node --test .agent/tools/*.test.mjs` and `node .agent/hooks/test-hooks-security.js` must both exit `0` with no skipped or discarded safety failure.
4. The targeted command in item 1 must run from three separately created clean temporary roots. Each attempt retains its own receipt; all safety, privacy, replay, authority, budget, and promotion checks must pass in all three attempts (`pass^3 = 100%`).
5. Independent Stage 1 and Stage 2 reports must bind the amended FSD, eval, issue, run head, and test receipts; both must return `PASS` with no unresolved Critical or Important finding before the release evaluator can derive success.

**Prohibited scope:** new public workflow or `/loop`; daemon/recurrence/vendor operation; model-weight/prompt/policy/verifier/goal/framework self-modification; external write; raw prompt/reasoning/PII/secret persistence; GOAL-016 implementation; or any learning record acting as authority.

**Rollback:** until GOAL-015 reaches verified `SUCCESS`, keep project mode at `DISABLED`/`OBSERVE`. A failed/corrupt learning projection disables learning/action admission fail-closed while preserving the immutable Loop Run event log, prior verified GOAL evidence, and forensic records. Do not fall back to v1 or auto-delete ambiguous state.

**Done evidence:** every TEST-015 subtest passes in all three clean resets; existing Loop Run, eval, telemetry, workflow, artifact, and security regressions pass; no Critical/Important Stage 1 or Stage 2 finding remains; work-package evidence is digest-bound; and a fresh release verifier derives `goal_met=true` without self-report.

## 16. Rollout and rollback

1. `DISABLED`: migrate, replan, approve config, verify no legacy execution state.
2. `OBSERVE`: three comparable low-risk goals x three clean resets; 100% safety/terminal/release parity and >=95% nonblocking parity against the golden oracle.
3. Bounded `ENFORCE`: owner-approved low-risk deterministic no-external-write canary, three goals x three clean resets.
4. Background pilot: ten runs covering claim/lease expiry/resume approval/cancel/crash/quarantine.
5. External sandbox: fake allowlisted operation across claim, intent, dispatch, response, result persist, and ack failure points.
6. Full `ENFORCE`: only after all release gates and paired attributable full/compact traces for every route.

Any approval bypass, stale dispatch, missing-eval success, secret/PII leak, unauthorized egress, duplicate effect, unknown auto-retry, counter regression, or event corruption transitions effective mode to `HALTED`. Revoke writer credentials/leases, retain read/audit reconciliation access, preserve evidence, and never fall back to v1.

## 17. Traceability matrix

| Audit / requirement | FSD contract | Decisions | Tests | Goals |
|---|---|---|---|---|
| LE-01/02/05/06; FR-001..004 | Sections 2-7 | TDEC-001..005; ADR DEC-001..004 | TEST-003..006 | GOAL-003..006 |
| LE-03/04/07/08/15; FR-005 | Section 8 | TDEC-006,007 | TEST-002,009 | GOAL-002,009 |
| LE-09; FR-009 | Section 10 | TDEC-010 | TEST-010 | GOAL-010 |
| LE-10/13; FR-007/008 | Section 9 | TDEC-008,009; ADR DEC-005 | TEST-011..014 | GOAL-011..014 |
| LE-12; BREQ-003,006; FR-004,005,009 | Sections 6.1,8,10,15.1 | ADR-0001#DEC-002/003/006; TDEC-013,014 | TEST-015-BASE, TEST-015-AC01..AC12 | GOAL-015 |
| LE-11/14; FR-010 | Sections 12,16 | TDEC-012; ADR DEC-006 | TEST-016..018 | GOAL-016..018 |
| Rollout/BAC-007/AC-013 | Section 16 | all approved decisions | TEST-019 | GOAL-019 |

## 18. Open items

No unresolved `OPEN-*` blocker exists for implementation. ENFORCE activation remains intentionally blocked by GOAL-011 capability attestation and GOAL-019 release evidence; this is a release gate, not missing authority.
