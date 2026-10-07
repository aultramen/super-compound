# Framework enhancement delivery evidence

## Summary

The [approved FSD](../fsd/fsd-framework-enhancement-20261006.md) is implemented through existing tools, contracts, skills and hooks. Delivery began October 6 and finished October 7, 2026, Asia/Jakarta. The [gap inventory](../audits/2026-10-06-framework-gap-analysis.md) covers eleven frameworks and workspace docs. Retrieval, durable knowledge, recovery, feedback, review and research improvements are verified locally. Runtime token reduction, latency improvement and model resistance to poisoned lessons remain UNPROVEN.

Automatic improvement means verified capture, bounded recall, recorded feedback and evidence-backed proposals. Framework policy, human decisions and model configuration do not modify themselves. All nineteen public workflows and thirty-seven skill entrypoints remain; no new dependency or public skill/workflow was introduced.

## Baseline and authority

The user's explicit instruction "Implement the plan" authorizes the conversational plan. No separate BRD/PRD approval is asserted. Original local work is retained on refactor/blueprint-document, HEAD d042706f7bac292127d0649dd088654aa206113f. Workspace .scratch/sc-enhancement-20261006-232111/ contains the 631-file original byte snapshot, baseline.json hashes/status, isolated workers, integration digests, raw experiments and verification logs. The separate 634-file enhanced/ measured candidate snapshot remains unchanged by later harness hardening and final documentation.

Three investigators produced the gap analysis. Disjoint implementation workers and independent reviewers verified retrieval, memory, evaluation, research and review changes. Integration checks target bytes against their recorded pre-edit version before copying only owned files. Original user changes, dated historical reports and the immutable benchmark baseline are preserved. No commit, push, deployment or global installation was performed.

## Delivery status

| Goal / gaps | Disposition | Implemented behavior |
| --- | --- | --- |
| GOAL-001 / GAP-002, 003, 004 | VERIFIED_LOCAL | Bounded coverage diagnostics, strict incomplete-scan exit, active ERR/LRN archive recall, stable-ID deduplication and explicit stack/version applicability; legacy search-array API retained |
| GOAL-002 / GAP-001, 005, 007 | VERIFIED_LOCAL | Privacy validation before new durable writes, optional bounded learning closeouts, recoverable validated pending capture, worth-based capture and read-only pending hook hints; verified goals never replay |
| GOAL-003 / GAP-006, 008 | VERIFIED_LOCAL; runtime UNPROVEN | Same-source KEEP prevention, six-pair A/A noise gate, selected-build/test/write-capability preflight and first-invalid-control stop; failed evidence retained |
| GOAL-004 | VERIFIED_LOCAL | Contract/document integration, adapter parity, regression checks, deterministic benchmark and canonical audit |
| GOAL-005 / GAP-009, 010, 011 | IMPLEMENTED_LOCAL; experiment INCONCLUSIVE | Reviewer economics and stable finding adjudication, revision-bound lossless feedback, research premise/evidence separation and poisoned-lesson grader sensitivity |
| GAP-012 | HELD_OUT | Lexical variants, additional scoped historical rationale and selective UI upstream refresh need held-out or upstream-delta evidence before adoption |

Phase two started after phase-one local acceptance and four successful protocol-v2 access/test preflight attempts. Those checks established fixture readiness at that point; subsequent control workflows exposed that write capability had not been proved. The phase-two changes above remain locally verified, with no measured performance claim. Protocol v3 closes this harness gap and prevents further counted experiments until an actual bounded write probe passes.

## Implementation details

[Knowledge search](../../.agent/tools/knowledge-search.mjs) adds searchWithCoverage without changing legacy search() output. Optional default stores can be absent; failed explicit scope or reads cannot establish absence. --require-complete exits 2 on incomplete coverage. Archived active ERR/LRN records share status, applicability and top-three limits; active canonical records win stable-ID deduplication. Feedback archives stay outside normal topic recall. General/global lessons waive project restriction only, never explicit stack/version filters.

[Memory maintenance](../../.agent/tools/memory-maintenance.mjs) reuses the runtime privacy guard for new capture, refreshed replacement, feedback and pending payloads. Malformed-input diagnostics are generic; sensitive rejected content is not copied to pending storage. Historical records are not rewritten. Optional learningCloseouts binds origin/revision/evidence to captured, skipped-trivial, pending or legacy-unknown outcomes, with at most twenty records. Captured and pending claims require actual valid file-backed evidence. An optional completion locator validates the existing receipt without changing its hash identity. Unresolved pending entries survive omission, overflow fails before writing, and retry saves knowledge without repeating verified implementation. Tiny work need not create a checkpoint solely to record a skip.

Feedback observations bind the target knowledge revision and digest. Exact replay is unchanged; later success cannot erase failed/rejected observations. Overflow archives losslessly before replacing the active file; the documented 2 MiB archive ceiling fails closed. Reports retain bounded revision groups and negative proof pointers first, with legacy-unbound coverage explicit. Feedback does not automatically change confidence, recurrence, promotion or policy.

[Review](../../.agent/skills/code-review/references/findings-and-self-review.md) reuses proof only when source, contract, environment and command identity still match. Stable finding IDs carry current severity, rationale, owner and disposition. Reviewer effort follows task risk and explicit model/effort choices; nested review fanout is bounded. [Research](../../.agent/workflows/sc-research.md) separates binding intent from factual premises, requires current local/primary observations, retains the fetched-content firewall and treats retrieved lessons as advisory. The poisoned-lesson positive and negative controls test grader sensitivity locally; they are not a model-resistance experiment.

## Live pilot evidence

Configuration stayed fixed: local Codex CLI 0.160.0, model gpt-6.1-sol, reasoning effort low, requested workspace-write sandbox, approval policy never, and existing execpolicy rules. No rule, approval or sandbox bypass was added. Debugging deliberately starts with a failing sum test; multi-goal resume starts with a verified addition goal and an unfinished multiplication goal. Acceptance tests and protected verified work remain unchanged.

| Attempt set in the workspace stage | Observed result | Eligibility |
| --- | --- | --- |
| preflight-debugging/, preflight-resume/ | One A attempt each; model turn exit 0, zero command executions; unprefixed adapter read rejected by CLI policy; 39,897 and 39,906 total tokens consumed | Failed access preflight; zero counted sessions |
| preflight-v2-debugging/, preflight-v2-multi-goal-resume/ | Four A/B access/build/test attempts pass with explicit normal rtk powershell and rtk node commands | Read/test readiness only; no write proof; not pooled optimization metrics |
| paired-debugging/ | Internal A/B read/test preflights pass; four completed A/A control attempts fail correctness/closeout, one further attempt interrupted | Zero eligible control pairs and zero A/B trials; verdict INCONCLUSIVE |
| paired-multi-goal-resume/ | Internal A/B read/test preflights pass; five completed A/A control attempts leave multiplication unfinished, one further attempt interrupted | Zero eligible control pairs and zero A/B trials; verdict INCONCLUSIVE |
| preflight-v3-debugging/, preflight-v3-multi-goal-resume/ | One A attempt each; build selected and initial test matches expected outcome (debugging RED, resume GREEN), source/test hashes unchanged, write probe absent; 82,563 and 82,328 total tokens consumed | Failed write-capability preflight; no B, control or A/B sessions launched |

Workers reported a read-only session during controls and v3 preflight. Raw traces contain no write attempt or OS-level write rejection, so effective filesystem permissions are not independently established. CLI flags and a completed model turn do not prove implementation capability. Both invalid v2 batches were stopped; raw JSONL, stderr, grades, trials, interrupted traces, termination records and explicit verdicts remain intact. No failed or partial attempt was dropped, made eligible or silently retried.

[Pilot protocol v3](../../.agent/tools/codex-pilot.mjs) requires an actual regular file .scratch/pilot-write-proof.json, at most 1 KiB, containing the selected build digest and fixture identity, plus an observed successful command. Only this probe may be written during preflight; source and tests must remain unchanged. If effective policy is read-only, the worker stops. The first failed A/A workflow or execution failure now saves evidence and returns INCONCLUSIVE before any A/B session. A controlled local subprocess regression proves this stopping behavior; it is labeled synthetic test evidence.

Eligible future measurement still requires six compatible A/A pairs and five interleaved A/B pairs per fixture, distinct candidate source, unchanged task/config/grader and correctness. Gain must exceed the conservative max-absolute control floor, the existing 10 percent threshold and twice paired MAD. No valid noise floor, candidate reduction, latency comparison or optimization KEEP exists from this delivery. Input includes cached input; output includes reasoning output. Separate cache-write/reasoning counters are reported when valid and are never added again to totals; absent counters remain unknown. Other host adapters have local contract parity evidence only.

## Verification and retained corrections

Focused root retrieval/memory integration passed 76 checks. Phase-two integrated tools passed 124 checks; the final memory/instruction/prevention subset passed 60 checks and independent feedback checks passed 9. Phase-three evaluator/pilot integration and its independent review passed 16 checks. Hook security, generated agent projections and skill/workflow routing passed.

The final complete local suite passed 409 Node tool tests, 20 skill tests, 36 Python tests, hook security and the skill-router contract (local-suite-delivery.log). The earlier 408-test seal remains retained as local-suite-sealed.log. No test was weakened, deleted or skipped to obtain a pass.

Three identical final deterministic benchmark repetitions passed (delivery-audit.log): scenario-weighted historical eager context 1,842,998 to 26,307 modeled tokens, 98.57 percent reduction across nineteen routes and fifty-seven static cells. This is the existing historical baseline comparison, not incremental runtime savings from this enhancement. Review and compound routes remain within their strict compact budgets. The canonical audit accounts for all 549 manifest paths, with zero findings; final stored-evidence verification follows the final report edit (delivery-final-audit.log). Earlier benchmark/audit seals remain intact.

Independent review reproduced property-order-sensitive pending JSON equality; stdlib semantic equality fixed save and clear. Negative feedback proof pointers were ordered before positive pointers so bounded summaries cannot hide known failures. Full integration caught a removed semantic-diff phrase and modification of a historically hash-pinned security reference; the phrase and original reference bytes were restored. Logs retain these failures and passing corrections. Response-evidence source fingerprints were reviewed for compatibility, with the original source-review history and old hashes preserved; this is not a new host communication experiment.

Final preservation verifies 591 unchanged original files and 40 expected modifications out of 631, with no missing or unexpected change and unchanged HEAD/branch (preservation.json). The fortieth modification captures [LRN-2026-10-06-001](../LEARNED_KNOWLEDGE.md), the observed write-capability lesson: first capture created it, exact replay returned unchanged, strict recall found it with complete coverage, and memory check returned no findings. Entry dates use the tool's UTC date; delivery completion uses Asia/Jakarta. Final preservation and delivery checks use the same recorded original snapshot. Durable knowledge remains evidence-backed and bounded; neither guaranteed context retention nor autonomous model-intelligence improvement is claimed.

| Final check | Result | Evidence in workspace stage |
| --- | --- | --- |
| npm run test:local | PASS; 409 tool + 20 skill + 36 Python tests; hook/router checks pass | local-suite-delivery.log |
| npm run audit | PASS; three identical benchmark repetitions, 19 routes / 57 cells | delivery-audit.log |
| Final canonical audit and stored seal | PASS; 549/549 accounted, zero findings | delivery-final-audit.log |
| Original-source preservation | PASS; 591 unchanged, 40 expected modified, none missing/unexpected | preservation.json |
| Durable capture, replay, recall and check | PASS; one observed lesson, no duplicate, complete recall, no findings | docs/LEARNED_KNOWLEDGE.md; repository-local .scratch/capture-framework-enhancement-20261006.json |
| Live runtime comparison | INCONCLUSIVE / UNPROVEN; zero eligible control pairs, zero A/B trials | retained pilot verdicts, traces and preflight.json files |

## Remaining candidates

Use protocol-v3 preflight in a session whose effective policy permits the bounded probe before spending on new controls. Keep this delivery's failed evidence separate. Evaluate lexical normalization or broader historical recall only with held-out queries and correctness checks; evaluate UI knowledge refresh against a concrete upstream delta. Reuse the existing context, interface, knowledge and evaluation owners if those candidates become justified. No new public workflow or skill is proposed without a demonstrated ownership gap.
