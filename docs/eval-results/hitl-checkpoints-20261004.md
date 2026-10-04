# Human Input Regression Evaluation

## Summary

The fix makes checkpoints answerable, preserves existing approval and performs
authorized owner handoffs internally. PromptShield was read only; no framework
installation, product edit, Git delivery or external action was performed there.
This report separates executable gate tests from an informed scripted communication
evaluation. It does not certify general agent reliability or product integration.

The new-developer implementation re-reviewed H01-H12 after shortening the simple
checkpoint display, adding workflow examples and clarifying LOCAL_ONLY applicability.
The recorded responses/action choices remain valid; H03 retains extra evidence
because its review is complex. `hitl-checkpoints.responses.json` preserves previous
source digests alongside the new reviewed pins. This is in-thread content review,
not a fresh independent host/model run; see the [implementation report](../audits/2026-10-04-new-developer-improvements.md).

## Confirmed causes and canonical source

Canonical source is `D:/BATI/Development/framework/super-compound/.agent` at
baseline Git `07c852695f91d71e81f83b9b8549b5de63f583bc`. README and `.codex/README.md`
identify it as source. `setup.mjs` resolves its repository root from its own path,
collects `.agent/{context,workflows,skills,templates,rules,agents,evals,hooks,tools}`,
and installs owned copies with `.super-compound/manifest.json` and source digest.
The Codex wrapper calls that engine; its legacy bundle maps `.agent/` into
`references/` with SHA-256 manifest verification. Project `.agent/` can be a
distributed copy; installed runtime preference is not framework-source authority.
No global/project installed adapter was updated during this task.

| Layer | Confirmed issue | Targeted correction |
| --- | --- | --- |
| Policy | Persistent authorization already existed; executing-plans still required user reordering before continuing independent work | Stop only affected scope; preserve acceptance/authorization and work independent ready goals |
| Routing | Contract-first execution did not require an answerable checkpoint package; PRD-only stopping language and command-only next routes could interrupt authorized delivery | Shared conditional contract reachable from dispatch and five affected compact/full routes; receiving owner checks authority |
| Presentation | Seven ad-hoc checkpoint formats; review could be only a file list; gate text started with diagnostic PASS/FAIL/OPEN codes | One complete localized package with review example, question, recommendation, continuation; gate action summary before details |
| Stage placement | Issue DAG checking did not explicitly catch self-produced evidence as entry requirement; qualification path was unclear | Check semantic evidence cycles; read-only research first, bounded approved enabler for executable qualification; provider proof remains first-slice completion |
| State/resumption | Resolution removed the whole blocker and said to finish current gate before presenting another | Resolve only named subneeds; retain technical failures; existing STATE writer and authority refs; resume without repeating valid work |
| Documentation | Walkthrough still requested Technical Manager promotion for unchanged evidence despite canonical auto-promotion | Auto-promote unchanged semantics after deterministic gates; delta approval only for material change |
| Agent behavior | PromptShield's next action was a command for UX review, while GOAL-002 authorization and mixed native gaps were already recorded | Explicit review package and automatic owner return; research facts rather than ask to "approve blockers" |

The PromptShield source records (FSD sections 16–17 and prototype verification)
show GOAL-001 locally verified, GOAL-002 explicitly authorized, PRD/FSD acceptance
retained, and native/auth/OS/dependency plus human/native-placement needs unresolved.
The canonical gate was run read-only against those documents: exit **1**, verdict
**BLOCKED**, failed gates **baseline** and **open-blockers**. Runnable evidence,
schema/derived revisions, test refs and DAG checks passed. No user preference or
simulated acceptance was written into that project.

## Changed surfaces

| Files | Why |
| --- | --- |
| `.agent/context/checkpoint.contract.md` | Single compact preflight, answerable format, partial resumption and bounded handoff contract |
| `.agent/context/workflow-dispatch.md`, `.agent/context/workflows/sc-{prd,ui,plan,work,status}.contract.md` | Make that package reachable at runtime without loading every skill |
| `.agent/skills/checkpoint-protocol/SKILL.md`, `references/checkpoint-types.md`, `references/resolution.md` | Remove competing formats; retain existing types; reconcile only resolved needs through existing state writer |
| `.agent/skills/agentic-delivery/references/workflow-integration.md`, `ui-contract-readiness.md` | Approval/evidence separation, internal owner routing, prototype/qualification/UAT boundaries, anti-circular qualification path |
| `.agent/skills/executing-plans/SKILL.md`, `.agent/skills/prd-generator/SKILL.md` | Remove conflicting stopping/manual routing behavior |
| `.agent/skills/plan-verification/SKILL.md`, `references/coverage-and-dependencies.md` | Reject semantic evidence cycles even when issue paths form a DAG |
| `.agent/workflows/sc-{prd,ui,plan,work,status}.md` | Keep detailed procedures aligned with compact runtime and read-only boundaries |
| `.agent/tools/readiness-gate.mjs`, `readiness-gate.test.mjs` | Actionable BLOCKED text, preserving JSON schema/gates/exit behavior |
| `.agent/context/workflow-invariants.json`, `.agent/skills/agentic-delivery/tests/progressive-disclosure-wave3.test.mjs` | Synchronize affected-scope invariant and three changed reference snapshots without removing gates |
| `.agent/evals/hitl-checkpoints.md`, `hitl-checkpoints.responses.json`, `.agent/tools/hitl-checkpoints.test.mjs` | Twelve recorded responses with action/state grading and negative controls; runtime reachability |
| `README.md`, `SUPER-COMPOUND.md`, `WALKTHROUGH.md`, `CHANGELOG.md` | Synchronize public guidance and correct outdated readiness-promotion wording; always-on rules continue routing via dispatch |

No new command, dependency, database, service, public enum, approval ledger or
decision authority was added. Distribution uses the existing setup/adapter engine;
its tests validate copies and hashes in temporary destinations.

## Before and after

Before, the PromptShield record ended with:

```text
Next action: /sc-ui .../VERIFICATION.md for human baseline/native-placement
review, then /sc-prd reconciliation. Resolve qualification facts; /sc-plan
promotes GOAL-002 after readiness passes. Existing execution authorization persists.
```

That records state but leaves the reviewer to determine what to inspect, decide
and answer. The gate previously began `PASS enums ... FAIL baseline ... FAIL
open-blockers ... verdict: BLOCKED` without owner/action explanation.

The answerable output below illustrates H03; it is regression output, not an
active request to the repository user to approve PromptShield.

```text
PERLU INPUT ANDA — Review pengalaman PromptShield offline
Jenis: review
Menghambat: Acceptance pengalaman prototype untuk kesiapan GOAL-002.

Sudah selesai:
PRD/FSD dan execution GOAL-002 tetap berlaku. GOAL-001 verified untuk mock
lokal: 15 contract tests dan 46 scenario runs. UI direction/label Indonesia
sudah diterima. Hasil tersebut belum membuktikan native integration.

Yang masih diperlukan:
Acceptance apakah penolakan pilihan lama setelah perubahan mode dan
penutupan call setelah Manual cukup jelas pada prototype offline.

Mengapa perlu Anda:
Yang tersisa adalah penilaian pengalaman oleh owner produk sesuai acceptance
yang belum selesai; agent sudah memeriksa walkthrough dan tes lokal.
Sumber: UI Contract Readiness — Authority And Decision Rights. Ini tidak
meminta keputusan produk lama ulang.

Rekomendasi:
Terima pengalaman offline bila kedua walkthrough jelas. Trade-off:
penempatan native, auth, pemeriksaan environment khusus dan integration
tetap belum terbukti.

Bahan review:
Lihat walkthrough ringkas dan tautan langsung di bawah. Pada STALE, lihat
penolakan pilihan lama dan instruksi refresh. Pada Manual, lihat call lama
berakhir dengan CANCELLED/revoked, lalu pekerjaan dilanjutkan di luar reviewer.

Pertanyaan:
Apakah kedua alur offline ini cukup jelas untuk diterima sebagai pengalaman
prototype, dengan penempatan native dan integrasi tetap pending?

Pilihan jawaban:
1. Terima kedua alur prototype (direkomendasikan).
2. Minta revisi: sebutkan alur/pesan yang membingungkan.
3. Butuh walkthrough tambahan: sebutkan skenario.
Jawaban bebas diperbolehkan; jawaban parsial menyelesaikan bagian yang disebut saja.

Setelah jawaban Anda:
Agent merekonsiliasi acceptance melalui /sc-prd lalu evidence/index melalui
/sc-plan tanpa approval ulang jika semantics tetap sama. Native placement dan
subscription/auth/OS qualification tetap terpisah. GOAL-002 hanya dimulai
setelah entry gates PASS, memakai execution authorization yang sudah ada.

Sementara menunggu:
Agent melanjutkan riset subscription/protocol dan checks read-only yang tersedia.
Executable qualification memerlukan bounded approved enabler dan entry checks.
```

### Walkthrough ringkas

1. Perubahan mode menaikkan policy version; pilihan revisi lama menghasilkan
   `STALE: Pilihan lama ditolak. Muat ulang status dan tinjau revisi baru.`
   Refresh memperlihatkan revisi baru. Periksa apakah perbedaan mode request
   aktif dan mode berikutnya jelas.
2. Held tool + Manual menghasilkan `MANUAL_HANDOFF`, pesan bahwa call lama
   berakhir, kemudian status `CANCELLED`, map `revoked`, dan tidak ada pending
   action. Periksa apakah pengguna memahami pekerjaan manual berlangsung
   di luar reviewer dan bukan meneruskan call lama.

Historical source locations, available only on the original Windows workspace:

- Verification and limitations: `D:/BATI/Development/promptshield/.scratch/prototypes/promptshield-ui-v1/VERIFICATION.md`
- Stale walkthrough: `D:/BATI/Development/promptshield/.scratch/prototypes/promptshield-ui-v1/evidence/stale-80.txt`
- Actual held PTY walkthrough: `D:/BATI/Development/promptshield/.scratch/prototypes/promptshield-ui-v1/evidence/held-pty-80.txt`

These external records are not distributed with this repository. The summary
above keeps this historical scenario readable without that external checkout.

After a response accepting those two flows, report: **newly resolved** offline
experience acceptance; **remaining** native-placement judgment (product owner),
subscription/auth/OS/dependency facts (agent/maintainer, or named external access
holder if unavailable); **next** PRD/plan reconciliation and research/qualification;
**blocked** product execution GOAL-002; **available** authorized read-only research
and any independent ready goal. Do not mark the full baseline validated until
all required acceptance for that baseline is actually resolved.

For environment-only manual testing, a package instead supplies setup, steps,
expected result and `scenario; environment; actual result; error/evidence` report.
For example, after agent-runnable 80/120-column transcript checks, a physical
120-column terminal/assistive-technology concern names the actual environment
the agent cannot access and asks for that observation only. Mock transcript
checks cannot certify native keyboard/accessibility usability or release UAT.

## Verification and limits

Recorded responses are in `.agent/evals/hitl-checkpoints.responses.json`; each
case includes exact text and action/state annotations. Content review checked
H01–H12 against the predeclared user criteria: approval preservation, specific
human need, concrete review/continuation, partial resolution, batching, independent
work, scoped delta, ambiguity, prototype boundaries, semantic cycles, receiving
authority and mandatory failures. The executable grader checks those annotations
and the pinned SHA-256 of the instructions reviewed for that attempt,
and rejects one unsafe mutation for each case. It cannot prove prose quality or
general agent compliance by itself; the direct response-content review supplies
that evidence. This is one informed in-thread scripted attempt, not a blinded
independent model run; no `pass@3`, `pass^3` or host reliability claim is made.

Fresh command results are recorded below after verification. The focused gate
test first failed on the legacy diagnostic-only output, then passed with the fix.
Existing JSON `readiness_gate_v1`, gate decisions and exit codes are unchanged.
Startup guidance stays short; detailed format lives in context, detailed delivery
policy in existing skill references. Existing untracked loop-runtime work and
generated local state were not edited.

### Fresh results

| Verification | Observed result |
| --- | --- |
| `node --test .agent/tools/hitl-checkpoints.test.mjs .agent/tools/readiness-gate.test.mjs .agent/tools/workflow-contracts.test.mjs .agent/tools/artifact-contracts.test.mjs .agent/tools/setup.test.mjs .agent/tools/codex-install.test.mjs` | **94/94 PASS**, no skips/failures; includes 12 behavior responses and 12 rejected negative controls, runtime reachability, 21 source fingerprints, gate behavior and temporary installation/hash/rollback checks |
| `npm run test:skills` | **20/20 PASS**, no skips/failures; changed canonical reference hashes synchronized |
| `node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --repeat 1` | **37/37 scenarios PASS**, all 18 public routes and startup budgets; startup AGENTS/CLAUDE/rules unchanged; no threshold increase |
| `node .agent/tools/doc-lint.mjs` against the new checkpoint, affected checkpoint skill/references, eval definition and this report | Exit **0**, no structural findings; linked paths inspected and content reviewed separately |
| `git diff --check` | Exit **0**, no whitespace errors |
| Canonical readiness gate, read-only PromptShield input | Exit **1**, expected BLOCKED on baseline/open-blockers; product execution remains blocked |

Normal route benchmark counts do not include conditional HITL content. The
shared checkpoint adds **841 deterministic estimated tokens when loaded**;
that is diagnostic context cost, not a measured decision-fatigue improvement.
Startup counts remain AGENTS 95 lines, CLAUDE 37, Antigravity rule 73; root
SUPER-COMPOUND is 250 lines with a five-line routing addition, format detail
stays in the 84-line conditional contract. No full-repository/unrelated
loop-runtime test claim is made.

Calibration failures were retained: the initial CLI regression failed on the
old diagnostic-only output; the first combined run had 69/70 passing because
the invariant still pinned obsolete global-stop wording; skill verification had
19/20 passing until three intentionally changed detail-reference hashes were
synchronized. Early budget runs failed startup/status/work additions; conditional
routing and removal of duplicate policy wording restored the existing limits.
One attempted benchmark output path outside the allowed benchmark directory was
rejected without writing an artifact; final benchmarking used stdout. During
output review, two new regressions failed on duplicated raw OPEN diagnostics
and provider-slice guidance for LOCAL_ONLY, then passed after the scoped fix.
Final results above are from the corrected current sources, without discarded
communication attempts or invented independent reliability metrics.
