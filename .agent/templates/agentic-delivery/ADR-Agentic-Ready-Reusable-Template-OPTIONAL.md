---
template_name: "Optional Architecture Decision Record — Agentic AI Ready"
template_version: "2.0.0"
artifact_contract_version: "1.0.0"
document_type: "ADR"
optional_artifact: true
canonical_delivery_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
project_name: "{{PROJECT_NAME}}"
project_code: "{{PROJECT_CODE}}"
adr_id: "ADR-{{NNNN}}"
title: "{{DECISION_TITLE}}"
status: "DRAFT" # DRAFT | PROPOSED | IN_REVIEW | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED
applicability_status: "OPTIONAL_USED" # OPTIONAL_USED | REQUIRED_BY_PROJECT_POLICY
creation_trigger: "{{CROSS_SYSTEM | HARD_TO_REVERSE | SECURITY_PRIVACY | VENDOR_LOCK_IN | STANDARD_EXCEPTION | DURABLE_RATIONALE | OTHER}}"
decision_type: "{{ARCHITECTURE_PATTERN | TECHNOLOGY_SELECTION | DATA | INTEGRATION | SECURITY | PRIVACY | RELIABILITY | DEPLOYMENT | AI_ML | TOOLING | MIGRATION | DEPRECATION | STANDARD}}"
architecture_scope: "{{LOCAL | MODULE | SYSTEM | PLATFORM | ORGANIZATION}}"
risk_class: "{{LOW | MEDIUM | HIGH | CRITICAL}}"
reversibility: "{{REVERSIBLE | COSTLY_REVERSAL | EFFECTIVELY_IRREVERSIBLE}}"
proposed_date: "{{YYYY-MM-DD}}"
decision_date: "{{YYYY-MM-DD_OR_EMPTY}}"
review_by: "{{YYYY-MM-DD_OR_EVENT_TRIGGER}}"
target_release: "{{RELEASE_OR_MILESTONE}}"
repository: "{{REPOSITORY_URL_OR_PATH}}"
author: "{{NAME_OR_ROLE}}"
decision_owner: "{{NAME_OR_ROLE}}"
deciders:
  - "{{NAME_OR_ROLE}}"
consulted:
  - "{{NAME_OR_ROLE}}"
informed:
  - "{{NAME_OR_ROLE}}"
related_brd:
  - "BRD-{{PROJECT_CODE}}"
related_prd:
  - "PRD-{{PROJECT_CODE}}"
related_fsd:
  - "FSD-{{PROJECT_CODE}}"
replaces_fsd_tdec: "{{TDEC_ID_OR_NONE}}"
related_adrs: []
supersedes: []
superseded_by: []
affected_systems:
  - "{{SYSTEM_OR_COMPONENT}}"
tags:
  - "{{TAG}}"
---

# {{ADR_ID}} — {{DECISION_TITLE}}

> **Petunjuk penggunaan:** ADR adalah artefak **opsional dan kondisional**. Jangan membuat ADR hanya untuk melengkapi rangkaian BRD/PRD/FSD. Gunakan template ini ketika durable architecture rationale memang bernilai atau project policy secara eksplisit mewajibkannya. Satu file ADR hanya boleh menetapkan **satu keputusan arsitektur yang koheren**. Ganti seluruh `{{PLACEHOLDER}}`; bagian yang tidak relevan ditulis `N/A — {{ALASAN}}`. `TBD`, `later`, `best practice`, `sesuai kebutuhan`, atau kata sifat tanpa ukuran tidak diperbolehkan pada ADR berstatus `ACCEPTED`.

---

# 0. Kontrak Operasional ADR

## 0.1 Tujuan Dokumen

ADR ini adalah sidecar opsional yang merekam satu keputusan arsitektur untuk `{{PROJECT_NAME}}` secara:

- dapat dipahami tanpa bergantung pada percakapan atau memori pembuatnya;
- dapat ditelusuri ke business/product requirement dan constraint yang melandasinya;
- dapat diuji melalui acceptance evidence atau architecture fitness functions;
- cukup preskriptif agar FSD, developer, dan coding agent tidak menciptakan keputusan arsitektur baru secara diam-diam ketika ADR ini digunakan;
- tetap jujur mengenai trade-off, dampak negatif, ketidakpastian, dan risiko residual;
- dapat ditinjau ulang, dikecualikan secara terkendali, didepresiasi, atau disupersede tanpa menghapus sejarah.

Ketika ADR dipilih untuk digunakan, dokumen ini dianggap lengkap apabila pembaca dapat menjawab dengan tegas:

1. keputusan apa yang dibuat;
2. masalah apa yang memerlukan keputusan tersebut;
3. batas kewenangan dan scope keputusan;
4. opsi layak apa yang dievaluasi;
5. evidence dan kriteria apa yang digunakan;
6. mengapa opsi terpilih lebih tepat dalam konteks ini;
7. konsekuensi positif, negatif, biaya, dan risiko apa yang diterima;
8. perubahan apa yang wajib dilakukan pada FSD, kode, data, deployment, security, operations, dan testing;
9. bagaimana mendeteksi implementation drift;
10. kondisi apa yang memicu review, rollback, deprecation, atau supersession.

## 0.2 Kapan ADR Layak Digunakan — Opsional dan Kondisional

Baseline artifact lifecycle adalah:

```text
BRD → PRD → FSD → GOAL → IMPLEMENTATION → VERIFICATION
                 ↘ ADR (opsional)
```

ADR **tidak wajib secara default**. FSD harus tetap lengkap dan executable tanpa ADR melalui `TDEC-*` (embedded technical decisions). Buat ADR hanya ketika nilai durable decision record lebih besar daripada overhead pemeliharaannya, misalnya keputusan:

- memengaruhi lebih dari satu module, service, repository, team, atau release;
- mahal, berisiko, atau sulit dibalik;
- mengubah trust boundary, data classification, data residency, authentication, authorization, auditability, atau threat model;
- memilih atau mengganti database, queue, protocol, cloud/provider, AI provider, framework utama, runtime, deployment topology, atau integration mechanism;
- menciptakan vendor lock-in, recurring cost, operational burden, atau availability dependency material;
- menetapkan source of truth, consistency model, transaction boundary, event-delivery semantic, canonicalization, encryption, retention, atau migration strategy;
- menyimpang dari architecture principle, approved standard, security baseline, atau ADR sebelumnya;
- membutuhkan exception/waiver terhadap policy atau standard;
- wajar diperdebatkan kembali karena rationale tidak terlihat dari kode/FSD dan perlu dipertahankan lintas release.

ADR biasanya tidak bernilai untuk:

- refactor lokal yang tidak mengubah external behavior atau architecture boundary;
- pemilihan nama variable atau detail implementasi yang mengikuti repository convention;
- dependency patch/minor update yang kompatibel dan tidak mengubah risk profile;
- keputusan yang cukup dicatat sebagai `TDEC-*` di FSD;
- keputusan yang sudah ditetapkan secara eksplisit dan lengkap oleh ADR aktif lain.

Decision path:

1. FSD melakukan ADR applicability assessment.
2. Bila `NOT_REQUIRED`, gunakan `TDEC-*`; jangan buat file ADR kosong.
3. Bila `LINKED`, buat/reuse ADR dan tunggu status `ACCEPTED` sebelum goal terkait `READY`.
4. Bila project policy secara eksplisit mewajibkan ADR, set `applicability_status=REQUIRED_BY_PROJECT_POLICY` dan cite policy tersebut.
5. Bila ragu, gunakan **Minimal Architecture Decision Brief** pada Appendix F atau `TDEC-*` terlebih dahulu; promote ke ADR penuh hanya bila blast radius/uncertainty membenarkannya.

## 0.3 Prinsip Satu Keputusan per ADR

Satu ADR harus memiliki satu decision statement utama. Beberapa aturan boleh berada dalam satu ADR hanya bila semuanya:

- diperlukan untuk membuat keputusan utama dapat diimplementasikan;
- memiliki lifecycle, reviewer, dan rollback boundary yang sama;
- tidak dapat diadopsi atau dibatalkan secara independen tanpa membuat keputusan utama tidak koheren.

Pisahkan menjadi ADR lain ketika dua pilihan dapat disetujui, ditolak, direview, atau disupersede secara independen.

## 0.4 Batas Otoritas BRD, PRD, ADR Opsional, dan FSD

| Jenis Keputusan | BRD | PRD | ADR opsional | FSD |
|---|---:|---:|---:|---:|
| Business problem, outcome, benefit, risk appetite | **Authoritative** | Menerjemahkan | Tidak mengubah | Tidak mengubah |
| Business scope, policy, rule, authority, compliance intent | **Authoritative** | Memperjelas product behavior | Tidak mengubah | Mengimplementasikan |
| Product scope, user outcome, functional policy, UX intent | Constraint | **Authoritative** | Tidak mengubah | Mengimplementasikan |
| Architecture pattern, topology, technology, cross-cutting mechanism | Constraint | Constraint | **Authoritative dalam delegated scope bila `ACCEPTED` dan linked** | **Authoritative sebagai `TDEC-*` bila ADR tidak digunakan; selalu merinci implementasi** |
| API/schema/job/event detail dan implementation behavior | Constraint | Constraint | Menetapkan pattern/boundary bila material | **Authoritative** |
| Test, migration, rollout, rollback, dan goal packet | Business/product gate | Acceptance intent | Menetapkan constraints/fitness functions bila linked | **Authoritative** |
| Code-level design lokal | Tidak menetapkan | Tidak menetapkan | Biasanya tidak menetapkan | Dapat menetapkan atau menyerahkan ke repository convention |

Aturan precedence:

1. hukum, kontrak, regulator, dan policy/security baseline yang berlaku;
2. BRD yang disetujui untuk business intent dan business boundary;
3. PRD yang disetujui untuk product intent dan product boundary;
4. ADR `ACCEPTED`, **bila ada dan linked**, untuk delegated architecture scope;
5. FSD yang disetujui untuk implementation contract; `TDEC-*` berlaku bila ADR tidak digunakan;
6. repository convention dan existing implementation untuk pilihan lokal;
7. task, prompt, atau `/goal` individual.

ADR tidak sah sebagai mekanisme untuk diam-diam menurunkan requirement BRD/PRD. ADR juga tidak menggantikan FSD: setiap goal tetap harus merujuk FSD, sedangkan ADR hanya menjadi additional authority untuk decision clauses yang ditautkan. Konflik dengan artifact berotoritas lebih tinggi harus memicu change request atau revisi upstream.

## 0.5 Bahasa Normatif

- **MUST / WAJIB**: harus dipenuhi oleh seluruh implementasi yang berada dalam scope ADR.
- **MUST NOT / DILARANG**: tidak boleh dilakukan.
- **SHOULD / SEHARUSNYA**: default yang diharapkan; penyimpangan memerlukan exception terdokumentasi.
- **MAY / BOLEH**: opsional dan tidak boleh mengubah outcome wajib.
- **Constraint**: batas keras yang tidak boleh dikalahkan oleh weighted score.
- **Preference**: nilai yang diinginkan tetapi dapat dikompromikan.
- **Decision driver**: faktor yang membedakan opsi dan memengaruhi pilihan.
- **Fitness function**: pemeriksaan otomatis atau periodik yang membuktikan architecture property tetap terpenuhi.
- **Residual risk**: risiko yang tetap ada setelah mitigasi dan secara eksplisit diterima oleh authority.
- **Blast radius**: area sistem, data, pengguna, atau operasi yang dapat terdampak bila keputusan gagal.

## 0.6 Taksonomi Pernyataan dan Evidence

| Tipe | Definisi | Bukti Minimum | Boleh Menjadi Dasar Keputusan? |
|---|---|---|---|
| `FACT` | Kondisi yang dapat diverifikasi saat ini | Source primer, repository evidence, atau telemetry | Ya |
| `CONSTRAINT` | Batas keras dari policy, platform, budget, waktu, atau compatibility | Source + consequence bila dilanggar | Ya; dapat menjadi veto |
| `ASSUMPTION` | Pernyataan belum terbukti yang digunakan sementara | Owner + validation method + expiry | Hanya bila risikonya diterima |
| `HYPOTHESIS` | Prediksi hubungan sebab-akibat | Spike/experiment plan | Tidak sebagai fakta |
| `EVIDENCE` | Hasil benchmark, test, audit, PoC, incident, atau data | Reproducible method + date + environment | Ya |
| `PREFERENCE` | Pilihan yang diinginkan | Owner + rationale | Ya, tetapi bukan hard constraint |
| `DECISION` | Pilihan yang telah disetujui | Authority + date + rationale | Authoritative dalam scope |
| `OPEN` | Informasi/keputusan belum tersedia | Owner + deadline + safe fallback | Bergantung blocker class |

Evidence quality:

| Level | Deskripsi | Contoh |
|---|---|---|
| E0 | Opinion tanpa verifikasi | “Library ini populer” |
| E1 | Dokumentasi/vendor claim | Official documentation, pricing page |
| E2 | Reproducible local spike | PoC pada sample representatif |
| E3 | Environment-relevant test | Load/security/compatibility test pada staging-like setup |
| E4 | Production evidence | Telemetry, incident data, audited operating record |

ADR berisiko `HIGH` atau `CRITICAL` tidak boleh bergantung hanya pada E0/E1 untuk driver terpenting kecuali decision authority menerima uncertainty tersebut secara eksplisit.

## 0.7 Kebijakan Placeholder dan Open Item

Gunakan format berikut untuk setiap unresolved item:

| ID | Pertanyaan / Missing Evidence | Class | Dampak | Affected IDs | Owner | Safe Fallback | Resolution Gate | Due Date | Status |
|---|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | ACCEPTANCE_BLOCKER / IMPLEMENTATION_BLOCKER / NON_BLOCKER | {{IMPACT}} | {{IDS}} | {{OWNER}} | {{FALLBACK_OR_NONE}} | {{GATE}} | {{DATE}} | OPEN |

Aturan:

- `ACCEPTANCE_BLOCKER`: ADR tidak boleh berstatus `ACCEPTED`.
- `IMPLEMENTATION_BLOCKER`: ADR boleh diterima bila keputusan sudah jelas, tetapi goal terkait tidak boleh berstatus `READY`.
- `NON_BLOCKER`: implementasi hanya boleh memakai safe fallback yang telah ditulis.
- Coding agent dilarang mengisi atau menebak keputusan yang belum tersedia.
- Item `RESOLVED` harus mencatat evidence, decider, tanggal, dan bagian ADR/FSD yang diperbarui.

## 0.8 Konvensi ID Stabil

| Prefix | Arti | Contoh |
|---|---|---|
| ADR | Architecture Decision Record | ADR-0042 |
| SRC | Source artifact/evidence | SRC-001 |
| CTX | Context fact | CTX-001 |
| DRV | Decision driver | DRV-001 |
| CONSTR | Hard constraint | CONSTR-001 |
| ASSUMP | Assumption | ASSUMP-001 |
| INV | Architecture invariant | INV-001 |
| OPT | Option | OPT-001 |
| CRIT | Evaluation criterion | CRIT-001 |
| EVD | Evidence item | EVD-001 |
| SPIKE | Spike/PoC | SPIKE-001 |
| BENCH | Benchmark | BENCH-001 |
| DEC | Decision clause | DEC-001 |
| RULE | Implementation rule | RULE-001 |
| PROHIB | Prohibited pattern | PROHIB-001 |
| CONS-POS | Positive consequence | CONS-POS-001 |
| CONS-NEG | Negative consequence | CONS-NEG-001 |
| RISK | Risk | RISK-001 |
| MIT | Mitigation | MIT-001 |
| FF | Architecture fitness function | FF-001 |
| EXC | Exception/waiver | EXC-001 |
| OPEN | Open item | OPEN-001 |
| REVTRIG | Review trigger | REVTRIG-001 |
| IMPL | Implementation obligation | IMPL-001 |
| VAL | Validation gate | VAL-001 |
| ROLLBACK | Rollback action | ROLLBACK-001 |
| GOAL | Agent-executable work package | GOAL-001 |

ID yang telah dipublikasikan tidak boleh digunakan ulang untuk arti lain. Item yang dibatalkan diberi status `RETIRED` beserta rationale, bukan dihapus.

### 0.8.1 Referensi Lintas Artifact

Gunakan qualified reference untuk setiap ID dari BRD, PRD, FSD, atau ADR lain:

```text
{{DOCUMENT_ID}}#{{LOCAL_ID}}
{{DOCUMENT_ID}}@{{VERSION}}#{{LOCAL_ID}}   # untuk snapshot yang dipin
```

Contoh: `BRD-CCC#BREQ-001`, `PRD-CCC#FR-014`, `FSD-CCC#TDEC-003`, `ADR-0042#DEC-001`. Goal tetap harus menunjuk FSD secara qualified; ADR hanya ditambahkan bila goal berada dalam scope keputusan ini.

## 0.9 Lifecycle dan Immutability ADR

Canonical status:

```text
DRAFT → PROPOSED → IN_REVIEW → ACCEPTED
                    ├──────────→ REJECTED
ACCEPTED → DEPRECATED → SUPERSEDED
ACCEPTED ───────────────────────→ SUPERSEDED
```

| Status | Arti | Boleh Menjadi Dasar Implementasi? |
|---|---|---:|
| `DRAFT` | Sedang disusun; belum siap dinilai | Tidak |
| `PROPOSED` | Decision request lengkap untuk direview | Tidak, kecuali spike eksplisit |
| `IN_REVIEW` | Sedang dinilai oleh required approvers | Tidak, kecuali spike eksplisit |
| `ACCEPTED` | Keputusan aktif dan mengikat dalam scope | Ya |
| `REJECTED` | Opsi/keputusan tidak diterima; disimpan sebagai sejarah | Tidak |
| `DEPRECATED` | Masih mungkin ada di sistem, tetapi tidak boleh dipakai untuk implementasi baru | Hanya maintenance yang disetujui |
| `SUPERSEDED` | Digantikan oleh ADR lain | Tidak untuk perubahan baru |

Setelah `ACCEPTED`:

- decision statement, rationale, option assessment, dan accepted consequences diperlakukan sebagai historical record;
- koreksi editorial boleh dilakukan melalui revision history;
- perubahan material harus dibuat melalui ADR baru yang mencantumkan `supersedes`;
- ADR lama diperbarui hanya pada field lifecycle, link supersession, dan catatan post-implementation outcome;
- jangan mengedit sejarah agar keputusan lama terlihat lebih benar dari kondisi saat diputuskan.

## 0.10 Decision Authority dan Quorum

| Decision Class | Minimum Decider | Required Reviewers | Optional Reviewers |
|---|---|---|---|
| Local/module, low risk | Technical owner | Affected module owner | QA |
| Cross-system/platform | Architect/technical lead | All affected service owners, operations | Product |
| Security/privacy | Security/privacy owner + technical owner | Data owner, compliance | Legal |
| Data model/migration | Data owner + technical owner | Operations, QA | Product |
| Vendor/provider/recurring cost | Budget owner + technical owner | Security, procurement/finance | Legal |
| AI/ML decision boundary or data egress | Product owner + technical owner + security/privacy | Compliance, data owner, QA | Legal |
| Critical/irreversible | Steering or delegated authority | All mandatory disciplines | Independent reviewer |

Tuliskan quorum aktual pada Section 1.5. Tidak ada self-approval untuk ADR `HIGH`/`CRITICAL` kecuali governance organisasi secara eksplisit memperbolehkannya.

## 0.11 Guardrail untuk Agentic Coding

Coding agent yang menerima ADR ini **WAJIB**:

1. hanya menggunakan ADR berstatus `ACCEPTED` sebagai architectural authority;
2. membaca decision clauses, mandatory constraints, prohibited patterns, exception register, dan fitness functions sebelum mengubah kode;
3. membatasi perubahan pada requirement/goal yang secara eksplisit men-trace ADR ini;
4. mempertahankan source-of-truth, trust boundary, data classification, state semantics, transaction boundary, dan failure behavior yang telah diputuskan;
5. menjalankan validation commands dan menghasilkan evidence yang diminta;
6. melaporkan deviasi, unmet gate, residual risk, dan repository fact yang berbeda dari asumsi ADR;
7. berhenti pada declared stop condition, bukan mengarang workaround arsitektural.

Coding agent **DILARANG**:

- mengganti technology/provider/pattern yang dipilih dengan alternatif “setara” tanpa ADR baru atau exception aktif;
- memperluas scope, refactor lintas module, atau upgrade major dependency hanya karena lebih mudah;
- membuat wrapper/abstraction palsu yang tidak benar-benar mempertahankan swap boundary yang diputuskan;
- menganggap mock, unit test, atau compilation success sebagai bukti integration compatibility;
- melemahkan security, validation, audit, consistency, idempotency, observability, atau test untuk menyelesaikan task;
- memasukkan fallback diam-diam, silent catch, unbounded retry, default-open authorization, atau destructive migration;
- menyatakan keputusan selesai ketika implementation obligation, fitness function, rollout, atau runbook belum tersedia.

## 0.12 Gate Persetujuan ADR

ADR opsional ini dapat berstatus `ACCEPTED` hanya bila:
- [ ] applicability assessment di FSD menyatakan `LINKED` atau project policy yang dicite menyatakan ADR diperlukan;
- [ ] keputusan tidak lebih tepat diperlakukan sebagai local implementation detail atau `TDEC-*` sederhana;

- [ ] hanya ada satu coherent decision utama;
- [ ] problem, context, scope, non-scope, dan urgency jelas;
- [ ] BRD, PRD, FSD, dan setiap ADR existing yang relevan telah direkonsiliasi;
- [ ] hard constraints dibedakan dari preference;
- [ ] status quo dan minimal dua opsi layak dipertimbangkan, atau alasan sah mengapa hanya satu opsi tersedia dicatat;
- [ ] tidak ada strawman option yang sengaja dibuat lemah;
- [ ] evaluation criteria memiliki definisi, weight/priority, dan measurement method;
- [ ] decisive claims didukung evidence dengan tanggal dan environment;
- [ ] decision statement menggunakan bahasa normatif dan tidak ambigu;
- [ ] positive, negative, neutral, cost, lock-in, operational, dan organizational consequences dicatat;
- [ ] security, privacy, compliance, data, reliability, observability, dan rollback impact dinilai;
- [ ] implementation obligations dan prohibited patterns eksplisit;
- [ ] minimum satu fitness function atau review mechanism mendeteksi architecture drift;
- [ ] rollout, migration, rollback, dan degraded-mode implications ditentukan atau `N/A — reason`;
- [ ] residual risk memiliki owner dan acceptance authority;
- [ ] tidak ada `ACCEPTANCE_BLOCKER` terbuka;
- [ ] handoff ke FSD dan goal dapat dilakukan tanpa invention;
- [ ] FSD tetap menjadi primary implementation source of truth dan mencantumkan ADR ini sebagai linked authority;
- [ ] review/supersession trigger memiliki owner dan tanggal/event.

---

# 1. Kontrol Dokumen, Governance, dan Traceability

## 1.1 Metadata ADR

| Field | Value |
|---|---|
| Project | `{{PROJECT_NAME}}` |
| ADR ID | `{{ADR_ID}}` |
| Title | `{{DECISION_TITLE}}` |
| Status | `{{DRAFT / PROPOSED / IN_REVIEW / ACCEPTED / REJECTED / DEPRECATED / SUPERSEDED}}` |
| Decision type | `{{TYPE}}` |
| Architecture scope | `{{LOCAL / MODULE / SYSTEM / PLATFORM / ORGANIZATION}}` |
| Risk class | `{{LOW / MEDIUM / HIGH / CRITICAL}}` |
| Reversibility | `{{REVERSIBLE / COSTLY_REVERSAL / EFFECTIVELY_IRREVERSIBLE}}` |
| Decision owner | `{{NAME_OR_ROLE}}` |
| Author | `{{NAME_OR_ROLE}}` |
| Proposed date | `{{YYYY-MM-DD}}` |
| Decision date | `{{YYYY-MM-DD_OR_N/A}}` |
| Target release | `{{RELEASE}}` |
| Review by | `{{DATE_OR_EVENT}}` |
| Repository | `{{PATH_OR_URL}}` |
| Default timezone | `{{IANA_TIMEZONE}}` |
| Data residency | `{{REGION_OR_N/A}}` |

## 1.2 Source Artifacts dan Evidence Register

| Source ID | Artifact / Evidence | Version / Date | Authority / Quality | Relevant Claim | Location | Status |
|---|---|---|---|---|---|---|
| SRC-001 | `{{BRD_OR_POLICY}}` | `{{VERSION}}` | Business authority | `{{CLAIM}}` | `{{SECTION}}` | VALID |
| SRC-002 | `{{PRD}}` | `{{VERSION}}` | Product authority | `{{CLAIM}}` | `{{SECTION}}` | VALID |
| SRC-003 | `{{FSD_OR_REPOSITORY_EVIDENCE}}` | `{{VERSION_OR_COMMIT}}` | Implementation fact | `{{CLAIM}}` | `{{PATH_OR_SECTION}}` | VALID |
| EVD-001 | `{{SPIKE_BENCHMARK_INCIDENT_DOC}}` | `{{DATE}}` | `{{E0-E4}}` | `{{CLAIM_SUPPORTED}}` | `{{LINK_OR_PATH}}` | VALID |

Rules:

- Gunakan source primer bila tersedia.
- Dokumentasi vendor tidak membuktikan compatibility dengan environment proyek; gunakan spike bila compatibility material.
- Evidence yang kedaluwarsa harus diberi status `STALE` dan tidak dipakai tanpa justification.
- Setiap angka performa/biaya harus mencantumkan workload, environment, period, dan unit.

## 1.3 Revision History

| Version | Date | Author | Change Summary | Material? | Approval Impact |
|---|---|---|---|---:|---|
| 0.1 | {{YYYY-MM-DD}} | {{AUTHOR}} | Initial draft | Yes | Full review required |

## 1.4 Related dan Supersession Map

| Relation | ADR ID | Title | Status | Relevance |
|---|---|---|---|---|
| Depends on | {{ADR-ID}} | {{TITLE}} | {{STATUS}} | {{WHY}} |
| Related | {{ADR-ID}} | {{TITLE}} | {{STATUS}} | {{WHY}} |
| Supersedes | {{ADR-ID_OR_NONE}} | {{TITLE}} | SUPERSEDED | {{WHAT_CHANGED}} |
| Superseded by | {{ADR-ID_OR_NONE}} | {{TITLE}} | {{STATUS}} | {{WHAT_CHANGED}} |

```mermaid
graph LR
    A[{{UPSTREAM_ADR_OR_REQUIREMENT}}] --> B[{{THIS_ADR_ID}}]
    B --> C[{{DOWNSTREAM_FSD_OR_ADR}}]
```

## 1.5 Decision Authority, Review, dan Approval

| Role | Name | Authority | Decision | Date | Conditions / Notes |
|---|---|---|---|---|---|
| Decision owner |  | Accountable for decision outcome | Pending |  |  |
| Technical decider |  | Architecture | Pending |  |  |
| Product/business owner |  | Product/business boundary | Pending |  |  |
| Security/privacy |  | Security/data handling | Pending |  |  |
| Operations |  | Operability/SRE | Pending |  |  |
| Data owner |  | Data lifecycle/quality | Pending |  |  |
| Finance/procurement |  | Cost/vendor commitment | Pending |  |  |

Approval values: `APPROVE`, `APPROVE_WITH_RECORDED_CONDITIONS`, `REJECT`, `ABSTAIN`, `NOT_REQUIRED — reason`.

## 1.6 Stakeholder Impact dan Communication

| Stakeholder / Team | Impact | Required Action | Communication Owner | Deadline | Acknowledged? |
|---|---|---|---|---|---:|
| {{TEAM}} | {{IMPACT}} | {{ACTION}} | {{OWNER}} | {{DATE}} | No |

## 1.7 Conflict and Resolution Ledger

| Conflict ID | Conflicting Statements | Sources | Decision Impact | Resolution | Approved By | Resulting Change |
|---|---|---|---|---|---|---|
| CONFLICT-001 | {{CONFLICT}} | {{SOURCES}} | {{IMPACT}} | {{RESOLUTION}} | {{APPROVER}} | {{UPDATED_IDS}} |

## 1.8 Change-Control Triggers

Perubahan berikut memerlukan ADR baru atau supersession, bukan edit material pada ADR ini:

| Trigger ID | Trigger | Required Action | Owner |
|---|---|---|---|
| CHG-001 | {{EXAMPLE: provider no longer meets residency requirement}} | New ADR + migration plan | {{OWNER}} |
| CHG-002 | {{EXAMPLE: target load exceeds tested envelope by 2x}} | Re-benchmark and review | {{OWNER}} |
| CHG-003 | {{EXAMPLE: security classification changes}} | Security review + possible supersession | {{OWNER}} |

---

# 2. Executive Decision Brief

## 2.1 Decision Statement — Satu Kalimat

> **DEC-001:** Sistem **WAJIB** menggunakan `{{CHOSEN_OPTION_OR_PATTERN}}` untuk `{{SCOPE}}`, dengan `{{KEY_BOUNDARY_OR_CONDITION}}`; sistem **DILARANG** menggunakan `{{PROHIBITED_ALTERNATIVE_OR_BEHAVIOR}}` dalam scope ini tanpa exception aktif atau ADR pengganti.

Decision statement harus dapat dibaca terpisah tanpa menghasilkan dua interpretasi yang sama-sama masuk akal.

## 2.2 Decision Request

| Item | Summary |
|---|---|
| Keputusan yang diminta | {{WHAT_MUST_BE_APPROVED}} |
| Masalah yang diselesaikan | {{PROBLEM}} |
| Opsi terpilih | {{OPT-ID_AND_NAME}} |
| Scope | {{IN_SCOPE}} |
| Di luar scope | {{OUT_OF_SCOPE}} |
| Why now | {{URGENCY_OR_DEPENDENCY}} |
| Reversibility | {{LEVEL_AND_ESTIMATED_REVERSAL_COST}} |
| Blast radius | {{USERS_SYSTEMS_DATA_OPERATIONS}} |
| Risk residual | {{SUMMARY}} |
| Required go-live gate | {{GATE}} |

## 2.3 Rationale Ringkas

`{{CHOSEN_OPTION}}` dipilih karena `{{TOP_2_TO_4_DECISIVE_REASONS}}`. Keputusan ini menerima trade-off `{{MAIN_NEGATIVE_CONSEQUENCES}}` dan hanya berlaku dalam envelope `{{LOAD_DATA_SECURITY_TIME_ORGANIZATION_BOUNDARY}}`.

## 2.4 Outcome yang Diharapkan

| Outcome ID | Expected Effect | Metric / Evidence | Target | Evaluation Date |
|---|---|---|---|---|
| OUT-001 | {{OUTCOME}} | {{METRIC}} | {{TARGET}} | {{DATE_OR_GATE}} |

## 2.5 Conditions of Acceptance

| Condition ID | Condition | Owner | Evidence Required | Deadline / Gate |
|---|---|---|---|---|
| COND-001 | {{CONDITION_OR_N/A}} | {{OWNER}} | {{EVIDENCE}} | {{GATE}} |

Kondisi yang belum terpenuhi tidak boleh disembunyikan dalam catatan. Tandai sebagai implementation blocker bila relevan.

---

# 3. Context, Problem, dan Architecture Forces

## 3.1 Problem Statement

Format:

> Karena `{{CURRENT_CONDITION}}`, sistem/tim mengalami `{{MEASURABLE_TECHNICAL_OR_OPERATIONAL_PROBLEM}}`, yang berdampak pada `{{USER_BUSINESS_SECURITY_OR_DELIVERY_IMPACT}}`. Keputusan diperlukan untuk memilih `{{DECISION_CATEGORY}}` sebelum `{{TRIGGER_OR_DEADLINE}}`.

## 3.2 Current-State Architecture

Jelaskan hanya context yang diperlukan untuk keputusan ini.

| Component / Boundary | Current Responsibility | Current Technology / Mechanism | Pain / Limitation | Evidence |
|---|---|---|---|---|
| {{COMPONENT}} | {{RESPONSIBILITY}} | {{TECH}} | {{LIMITATION}} | {{SRC/EVD-ID}} |

```mermaid
flowchart LR
    U[{{ACTOR_OR_SYSTEM}}] --> A[{{CURRENT_COMPONENT}}]
    A --> D[{{DATA_STORE_OR_PROVIDER}}]
    A --> X[{{EXTERNAL_DEPENDENCY}}]
```

## 3.3 Target Boundary yang Sedang Diputuskan

| In Scope | Out of Scope | Must Remain Unchanged |
|---|---|---|
| {{BOUNDARY}} | {{NON_DECISION}} | {{UPSTREAM_PRODUCT_OR_BUSINESS_INVARIANT}} |

## 3.4 Architecture Invariants

| Invariant ID | Invariant | Rationale | Enforcement / Evidence |
|---|---|---|---|
| INV-001 | {{CONDITION_THAT_MUST_ALWAYS_BE_TRUE}} | {{WHY}} | {{TEST_CONSTRAINT_MONITOR}} |

Contoh kategori invariant:

- exactly one source of truth untuk datum tertentu;
- no unauthorized cross-tenant access;
- no acknowledged event lost;
- no classified data sent outside approved boundary;
- no duplicate side effect untuk idempotency key yang sama;
- service tetap read-only ketika dependency tertentu degraded;
- backward compatibility selama migration window.

## 3.5 Hard Constraints

| Constraint ID | Constraint | Source | Consequence if Violated | Veto? |
|---|---|---|---|---:|
| CONSTR-001 | {{CONSTRAINT}} | {{SRC-ID}} | {{CONSEQUENCE}} | Yes |

Hard constraint tidak boleh “dikalahkan” oleh total weighted score.

## 3.6 Preferences

| Preference ID | Preference | Owner | Why Valuable | Tradeable Against |
|---|---|---|---|---|
| PREF-001 | {{PREFERENCE}} | {{OWNER}} | {{RATIONALE}} | {{OTHER_CRITERIA}} |

## 3.7 Assumptions dan Validation

| Assumption ID | Assumption | Impact if False | Validation Method | Owner | Expiry / Gate | Status |
|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | {{IMPACT}} | {{METHOD}} | {{OWNER}} | {{DATE_OR_GATE}} | UNVALIDATED |

## 3.8 Decision Drivers

| Driver ID | Driver | Priority | Why It Matters | Measurement |
|---|---|---:|---|---|
| DRV-001 | {{DRIVER}} | 1 | {{RATIONALE}} | {{HOW_MEASURED}} |

Priority `1` adalah paling penting. Driver yang hanya terdengar baik tetapi tidak membedakan opsi harus dihapus.

## 3.9 Workload, Data, dan Operating Envelope

| Dimension | Current | Target | Peak / Worst Case | Growth Horizon | Source |
|---|---:|---:|---:|---|---|
| Requests/second | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Concurrent users/jobs | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Data volume | {{VALUE_UNIT}} | {{VALUE_UNIT}} | {{VALUE_UNIT}} | {{PERIOD}} | {{SRC/EVD}} |
| Event/message rate | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Availability window | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Recovery objective | {{RTO/RPO}} | {{RTO/RPO}} | {{RTO/RPO}} | {{PERIOD}} | {{SRC/EVD}} |
| Data classification | {{CLASS}} | {{CLASS}} | {{CLASS}} | N/A | {{SRC}} |

Architecture claim di luar envelope ini tidak boleh dianggap terbukti.

## 3.10 Why Now dan Cost of Delay

| Trigger | Deadline / Event | Consequence of Delay | Temporary Mitigation |
|---|---|---|---|
| {{TRIGGER}} | {{DATE_OR_EVENT}} | {{IMPACT}} | {{MITIGATION_OR_NONE}} |

## 3.11 Non-Decision dan Explicit Non-Goals

- **ND-001:** ADR ini tidak memutuskan `{{ITEM}}` karena `{{REASON}}`.
- **ND-002:** ADR ini tidak mengubah `{{BRD_PRD_POLICY_OR_API}}`.
- **ND-003:** ADR ini tidak memberi izin untuk `{{PROHIBITED_SCOPE_EXPANSION}}`.

---

# 4. Evaluation Framework

## 4.1 Evaluation Criteria Dictionary

| Criterion ID | Criterion | Definition | Weight % | Measurement / Scoring Evidence | Minimum Threshold | Veto? |
|---|---|---|---:|---|---|---:|
| CRIT-001 | {{CRITERION}} | {{UNAMBIGUOUS_DEFINITION}} | {{0-100}} | {{METHOD}} | {{THRESHOLD}} | No |

Rules:

- Total weight harus `100%`.
- Kriteria yang overlap harus digabung atau boundary-nya dijelaskan.
- Kriteria keamanan, legal, residency, atau mandatory compatibility biasanya lebih tepat sebagai hard constraint/veto daripada weight kecil.
- Weight ditetapkan sebelum hasil opsi diketahui untuk mengurangi outcome bias.

## 4.2 Scoring Scale

Gunakan anchor berikut atau definisikan scale lain yang sama eksplisit:

| Score | Meaning |
|---:|---|
| 0 | Tidak memenuhi; tidak ada path realistis |
| 1 | Sangat buruk; gap besar/risiko tinggi |
| 2 | Di bawah kebutuhan; memerlukan mitigation material |
| 3 | Memenuhi minimum dengan trade-off yang dapat diterima |
| 4 | Kuat; memenuhi kebutuhan dengan trade-off kecil |
| 5 | Sangat kuat; evidence tinggi dan margin aman |

Setiap score harus memiliki rationale dan evidence ID. Angka tanpa bukti bukan analisis.

## 4.3 Decision Rules

- Opsi yang melanggar hard constraint diberi status `DISQUALIFIED`, terlepas dari score total.
- Opsi dengan evidence gap pada criterion kritis tidak boleh diberi score optimistis; gunakan range atau confidence rendah.
- Selisih score kecil tidak otomatis menentukan pemenang; pertimbangkan reversibility, downside asymmetry, dan uncertainty.
- Weighted score adalah alat bantu, bukan pengganti engineering judgment dan accountability.
- Bila keputusan sangat reversible, prefer small experiment dapat mengalahkan analisis panjang.
- Bila keputusan effectively irreversible, burden of proof harus lebih tinggi.

## 4.4 Risk Appetite dan Tolerance

| Dimension | Tolerance | Maximum Acceptable Exposure | Authority for Exception |
|---|---|---|---|
| Availability | {{LOW/MEDIUM/HIGH}} | {{THRESHOLD}} | {{ROLE}} |
| Data loss | {{TOLERANCE}} | {{RPO_OR_ZERO_LOSS}} | {{ROLE}} |
| Confidentiality | {{TOLERANCE}} | {{BOUNDARY}} | {{ROLE}} |
| Vendor lock-in | {{TOLERANCE}} | {{MAX_COMMITMENT}} | {{ROLE}} |
| Delivery delay | {{TOLERANCE}} | {{MAX_DELAY}} | {{ROLE}} |
| Cost variance | {{TOLERANCE}} | {{MAX_PERCENT_OR_AMOUNT}} | {{ROLE}} |

---

# 5. Options Considered

## 5.1 Option Inventory

| Option ID | Name | Category | Viable? | Status | Short Description |
|---|---|---|---:|---|---|
| OPT-000 | Status quo / do nothing | Baseline | Yes/No | EVALUATED | {{DESCRIPTION}} |
| OPT-001 | {{OPTION_NAME}} | {{BUILD/BUY/HYBRID/PATTERN}} | Yes | EVALUATED | {{DESCRIPTION}} |
| OPT-002 | {{OPTION_NAME}} | {{CATEGORY}} | Yes | EVALUATED | {{DESCRIPTION}} |

Status values: `EVALUATED`, `DISQUALIFIED`, `SELECTED`, `REJECTED`, `DEFERRED`.

## 5.2 Reusable Option Packet

Salin bagian ini untuk setiap opsi yang benar-benar layak.

### OPT-{{NNN}} — {{OPTION_NAME}}

#### 5.2.1 Summary

`{{DESCRIPTION_OF_OPTION_AND_CORE_MECHANISM}}`

#### 5.2.2 Architecture Sketch

```mermaid
flowchart LR
    A[{{COMPONENT_A}}] -->|{{PROTOCOL}}| B[{{OPTION_COMPONENT}}]
    B --> D[{{DATA_STORE_OR_PROVIDER}}]
```

#### 5.2.3 Scope dan Assumptions

| Item | Detail |
|---|---|
| Applies to | {{SCOPE}} |
| Does not apply to | {{OUT_OF_SCOPE}} |
| Required assumptions | {{ASSUMP-IDS}} |
| Required dependencies | {{DEPENDENCIES}} |

#### 5.2.4 Constraint Compliance

| Constraint ID | Meets? | Evidence / Rationale | Required Mitigation |
|---|---:|---|---|
| CONSTR-001 | Yes/No/Unknown | {{EVIDENCE}} | {{MITIGATION_OR_NONE}} |

#### 5.2.5 Functional dan Domain Fit

- Source-of-truth impact: `{{IMPACT}}`
- Consistency model: `{{MODEL}}`
- Transaction/idempotency behavior: `{{BEHAVIOR}}`
- Compatibility with required workflows: `{{FIT}}`
- Known semantic mismatch: `{{MISMATCH_OR_NONE}}`

#### 5.2.6 Security, Privacy, dan Compliance

| Area | Impact / Control | Evidence | Residual Concern |
|---|---|---|---|
| Authentication/authorization | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Data egress/residency | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Encryption/secrets | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Audit/retention | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Supply chain/vendor | {{IMPACT}} | {{EVD}} | {{CONCERN}} |

#### 5.2.7 Reliability dan Failure Model

| Failure Mode | System Behavior | Detectability | Recovery | Data-Loss/Duplicate Risk |
|---|---|---|---|---|
| {{FAILURE}} | {{BEHAVIOR}} | {{SIGNAL}} | {{RECOVERY}} | {{RISK}} |

#### 5.2.8 Performance dan Scalability

| Dimension | Expected Capability | Evidence Level | Tested Envelope | Limitation |
|---|---|---|---|---|
| Latency | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Throughput | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Storage/growth | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Concurrency | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |

#### 5.2.9 Operability dan Observability

- Deployment model: `{{MODEL}}`
- Runtime ownership: `{{TEAM}}`
- Monitoring/alerting burden: `{{BURDEN}}`
- Backup/restore: `{{MODEL}}`
- On-call/runbook impact: `{{IMPACT}}`
- Degraded-mode capability: `{{CAPABILITY}}`

#### 5.2.10 Delivery, Skills, dan Organizational Fit

| Dimension | Assessment |
|---|---|
| Implementation effort | {{SIZE_OR_RANGE_WITH_ASSUMPTIONS}} |
| Team familiarity | {{LEVEL_AND_EVIDENCE}} |
| Training need | {{NEED}} |
| Cross-team coordination | {{IMPACT}} |
| Delivery dependency | {{DEPENDENCY}} |

#### 5.2.11 Cost dan Commercial Impact

| Cost Type | One-Time | Recurring | Unit / Driver | Confidence | Source |
|---|---:|---:|---|---|---|
| Build/migration | {{AMOUNT_OR_RANGE}} | N/A | {{DRIVER}} | {{LOW/MED/HIGH}} | {{SRC}} |
| License/provider | {{AMOUNT}} | {{AMOUNT_PERIOD}} | {{UNIT}} | {{CONFIDENCE}} | {{SRC}} |
| Operations/support | {{AMOUNT}} | {{AMOUNT_PERIOD}} | {{DRIVER}} | {{CONFIDENCE}} | {{SRC}} |
| Exit/reversal | {{AMOUNT_OR_RANGE}} | N/A | {{DRIVER}} | {{CONFIDENCE}} | {{SRC}} |

#### 5.2.12 Lock-In, Portability, dan Reversibility

| Item | Assessment |
|---|---|
| Lock-in source | {{API/DATA/OPERATIONS/CONTRACT/SKILL}} |
| Exit path | {{PATH}} |
| Data export | {{FORMAT_AND_COMPLETENESS}} |
| Estimated reversal effort | {{RANGE}} |
| Irreversible effects | {{EFFECT_OR_NONE}} |

#### 5.2.13 Migration, Rollout, dan Rollback

- Migration approach: `{{APPROACH}}`
- Parallel run possible: `{{YES_NO_AND_CONDITION}}`
- Feature flag/traffic split: `{{MECHANISM}}`
- Rollback trigger: `{{TRIGGER}}`
- Rollback feasibility: `{{ASSESSMENT}}`
- Data compatibility after rollback: `{{ASSESSMENT}}`

#### 5.2.14 Benefits

- `{{BENEFIT_1}}`
- `{{BENEFIT_2}}`

#### 5.2.15 Drawbacks dan Risks

- `{{DRAWBACK_1}}`
- `{{DRAWBACK_2}}`

#### 5.2.16 Unknowns dan Evidence Gaps

| Open ID | Unknown | Decision Impact | Validation | Blocker? |
|---|---|---|---|---:|
| OPEN-{{NNN}} | {{UNKNOWN}} | {{IMPACT}} | {{METHOD}} | Yes/No |

## 5.3 Disqualified Options

| Option ID | Reason Disqualified | Constraint Violated | Evidence | Could Become Viable If |
|---|---|---|---|---|
| OPT-{{NNN}} | {{REASON}} | {{CONSTR-ID}} | {{EVD-ID}} | {{CONDITION_OR_NEVER}} |

## 5.4 Options Not Evaluated

| Candidate | Why Not Evaluated | Risk of Exclusion | Reviewer Agreement |
|---|---|---|---|
| {{CANDIDATE}} | {{REASON}} | {{RISK}} | {{NAME/ROLE}} |

Mengecualikan opsi karena tidak dikenal oleh penulis bukan alasan yang valid.

---

# 6. Comparative Analysis dan Evidence

## 6.1 Hard-Constraint Matrix

| Constraint | OPT-000 | OPT-001 | OPT-002 | Notes |
|---|---:|---:|---:|---|
| CONSTR-001 | PASS/FAIL/? | PASS/FAIL/? | PASS/FAIL/? | {{RATIONALE}} |

## 6.2 Weighted Scorecard

| Criterion | Weight | OPT-000 Score | OPT-000 Evidence | OPT-001 Score | OPT-001 Evidence | OPT-002 Score | OPT-002 Evidence |
|---|---:|---:|---|---:|---|---:|---|
| CRIT-001 | {{%}} | {{0-5}} | {{EVD}} | {{0-5}} | {{EVD}} | {{0-5}} | {{EVD}} |
| **Weighted total** | **100%** | **{{TOTAL}}** |  | **{{TOTAL}}** |  | **{{TOTAL}}** |  |

## 6.3 Score Confidence

| Option | Score Range | Confidence | Main Uncertainty | Effect if Wrong |
|---|---|---|---|---|
| OPT-001 | {{LOW-HIGH}} | LOW/MEDIUM/HIGH | {{UNCERTAINTY}} | {{IMPACT}} |

## 6.4 Spike / PoC / Benchmark Plan dan Results

### SPIKE-{{NNN}} — {{NAME}}

| Field | Value |
|---|---|
| Hypothesis | {{TESTABLE_HYPOTHESIS}} |
| Environment | {{HARDWARE_SOFTWARE_NETWORK_DATA}} |
| Dataset/workload | {{REPRESENTATIVE_INPUT}} |
| Procedure | {{REPRODUCIBLE_STEPS_OR_SCRIPT}} |
| Success threshold | {{MEASURABLE_THRESHOLD}} |
| Failure threshold | {{MEASURABLE_THRESHOLD}} |
| Result | {{RESULT}} |
| Raw evidence | {{PATH_LINK_LOG_REPORT}} |
| Limitations | {{WHAT_THIS_DOES_NOT_PROVE}} |
| Conclusion | {{SUPPORTED_NOT_SUPPORTED_INCONCLUSIVE}} |

Spike code harus diberi label `throwaway` atau `production-candidate`. Jangan memasukkan spike ke production tanpa quality/security review yang berlaku.

## 6.5 Compatibility Matrix

| Dimension | Required | OPT-001 | OPT-002 | Verification Method |
|---|---|---|---|---|
| Runtime/OS | {{VERSION}} | {{COMPAT}} | {{COMPAT}} | {{TEST}} |
| Database | {{VERSION}} | {{COMPAT}} | {{COMPAT}} | {{TEST}} |
| Existing API/event | {{CONTRACT}} | {{COMPAT}} | {{COMPAT}} | {{CONTRACT_TEST}} |
| Deployment platform | {{PLATFORM}} | {{COMPAT}} | {{COMPAT}} | {{SMOKE}} |
| Security controls | {{CONTROL}} | {{COMPAT}} | {{COMPAT}} | {{REVIEW_TEST}} |
| Data migration | {{NEED}} | {{COMPAT}} | {{COMPAT}} | {{DRY_RUN}} |

## 6.6 Sensitivity Analysis

Uji apakah pilihan berubah bila assumption atau weight utama berubah.

| Scenario | Changed Variable | OPT-001 Result | OPT-002 Result | Winner Changes? | Implication |
|---|---|---:|---:|---:|---|
| Base | None | {{SCORE}} | {{SCORE}} | No | {{NOTE}} |
| Cost +50% | {{COST}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |
| Load 2x | {{LOAD}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |
| Provider outage | {{AVAILABILITY}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |

## 6.7 Trade-Off Summary

| Trade-Off | Gain | Accepted Loss | Why Acceptable | Owner |
|---|---|---|---|---|
| {{TRADEOFF}} | {{GAIN}} | {{LOSS}} | {{RATIONALE}} | {{OWNER}} |

## 6.8 Dissenting Opinion

| Reviewer | Position | Strongest Argument | Evidence | Resolution / Why Not Selected |
|---|---|---|---|---|
| {{NAME_OR_ROLE}} | {{POSITION}} | {{ARGUMENT}} | {{EVD}} | {{RESOLUTION}} |

Tidak ada dissenting opinion dapat ditulis `N/A — seluruh reviewer menyetujui setelah review`; jangan menghapus bagian ini.

## 6.9 Decision Confidence

| Item | Value |
|---|---|
| Overall confidence | `{{LOW / MEDIUM / HIGH}}` |
| Evidence ceiling | `{{E0-E4}}` |
| Most fragile assumption | `{{ASSUMP-ID}}` |
| Downside if wrong | `{{IMPACT}}` |
| Fastest validation after adoption | `{{METHOD}}` |

---

# 7. Decision Specification

## 7.1 Selected Option

`OPT-{{NNN}} — {{OPTION_NAME}}` dipilih.

## 7.2 Normative Decision Clauses

Tuliskan setiap rule yang harus diteruskan ke FSD dan implementation goals.

| Decision ID | Normative Clause | Applies To | Verification |
|---|---|---|---|
| DEC-001 | Sistem **WAJIB** `{{BEHAVIOR_OR_PATTERN}}`. | {{SCOPE}} | {{FF/TEST/REVIEW}} |
| DEC-002 | Sistem **DILARANG** `{{FORBIDDEN_BEHAVIOR}}`. | {{SCOPE}} | {{FF/TEST/REVIEW}} |
| DEC-003 | `{{COMPONENT}}` **WAJIB** menjadi source of truth untuk `{{DATA_OR_STATE}}`. | {{SCOPE}} | {{CONSTRAINT/TEST}} |

Hindari kata seperti “gunakan abstraction yang baik” atau “pastikan scalable”. Nyatakan interface, boundary, target, atau check yang konkret.

## 7.3 Decision Scope Matrix

| Area | Included | Excluded / Delegated | Authority Downstream |
|---|---|---|---|
| Components | {{COMPONENTS}} | {{EXCLUDED}} | FSD may detail internals |
| Data | {{DATA}} | {{EXCLUDED}} | FSD defines schema within rules |
| Interfaces | {{INTERFACES}} | {{EXCLUDED}} | FSD defines exact contracts |
| Deployment | {{TOPOLOGY}} | {{EXCLUDED}} | Platform team may tune within limits |
| Operations | {{OPERATING_MODEL}} | {{EXCLUDED}} | Runbook details downstream |

## 7.4 Target Architecture

```mermaid
flowchart LR
    U[{{USER_OR_UPSTREAM}}] --> G[{{ENTRY_COMPONENT}}]
    G --> S[{{SERVICE_OR_MODULE}}]
    S --> D[( {{SOURCE_OF_TRUTH}} )]
    S --> Q[{{QUEUE_OR_ASYNC_BOUNDARY}}]
    Q --> W[{{WORKER}}]
    W --> X[{{EXTERNAL_SYSTEM}}]
```

## 7.5 Component Responsibilities dan Boundaries

| Component | Owns | Must Not Own | Inputs | Outputs | Failure Boundary |
|---|---|---|---|---|---|
| {{COMPONENT}} | {{RESPONSIBILITY}} | {{NON_RESPONSIBILITY}} | {{INPUT}} | {{OUTPUT}} | {{FAILURE_BEHAVIOR}} |

## 7.6 Allowed dan Prohibited Patterns

| ID | Type | Rule | Rationale | Detection |
|---|---|---|---|---|
| RULE-001 | REQUIRED | {{REQUIRED_PATTERN}} | {{WHY}} | {{TEST/REVIEW}} |
| PROHIB-001 | FORBIDDEN | {{PROHIBITED_PATTERN}} | {{WHY}} | {{LINT/TEST/REVIEW}} |

## 7.7 Source-of-Truth dan Consistency Rules

| Datum / State | Authoritative Owner | Replicas/Caches | Consistency Model | Conflict Resolution | Reconciliation |
|---|---|---|---|---|---|
| {{DATA}} | {{OWNER}} | {{REPLICAS}} | {{STRONG/EVENTUAL}} | {{RULE}} | {{JOB_OR_N/A}} |

## 7.8 Data and Persistence Implications

- Data model constraints: `{{CONSTRAINTS}}`
- Schema ownership: `{{OWNER}}`
- Migration compatibility: `{{FORWARD_BACKWARD_RULE}}`
- Retention/deletion: `{{RULE}}`
- Encryption/classification: `{{RULE}}`
- Canonical identifiers/versioning: `{{RULE}}`
- Transaction boundary: `{{BOUNDARY}}`
- Locking/concurrency strategy: `{{STRATEGY}}`

ADR tidak perlu memuat seluruh schema kecuali schema choice adalah inti keputusan. FSD tetap wajib merinci physical model.

## 7.9 Interface, API, Event, dan Integration Implications

| Interface | Decision Boundary | Required Semantic | Compatibility | Owner |
|---|---|---|---|---|
| {{API/EVENT/ADAPTER}} | {{BOUNDARY}} | {{IDEMPOTENCY_ORDERING_VERSIONING}} | {{RULE}} | {{OWNER}} |

## 7.10 Reliability dan Failure Semantics

| Dependency / Failure | Required System Behavior | Degraded Mode | Retry/Timeout/Circuit Rule | Data Integrity Rule |
|---|---|---|---|---|
| {{FAILURE}} | {{BEHAVIOR}} | {{MODE}} | {{RULE}} | {{INVARIANT}} |

## 7.11 Security, Privacy, dan Trust-Boundary Rules

| Rule ID | Requirement | Enforcement | Evidence |
|---|---|---|---|
| SEC-001 | {{SECURITY_RULE}} | {{CONTROL}} | {{TEST_REVIEW}} |
| PRIV-001 | {{PRIVACY_RULE}} | {{CONTROL}} | {{TEST_REVIEW}} |

## 7.12 Operational Model

| Topic | Decision |
|---|---|
| Runtime owner | {{TEAM}} |
| Deployment model | {{MODEL}} |
| Configuration ownership | {{OWNER}} |
| Secret ownership | {{OWNER}} |
| On-call responsibility | {{TEAM_OR_N/A}} |
| Backup/restore responsibility | {{TEAM}} |
| Capacity review | {{CADENCE_OR_TRIGGER}} |
| Vendor escalation | {{PATH_OR_N/A}} |

## 7.13 Exception Policy

Penyimpangan hanya boleh melalui exception record:

| Exception ID | Requested Deviation | Scope | Reason | Risk | Compensating Control | Approver | Expiry | Exit Plan | Status |
|---|---|---|---|---|---|---|---|---|---|
| EXC-001 | {{DEVIATION}} | {{SCOPE}} | {{REASON}} | {{RISK}} | {{CONTROL}} | {{APPROVER}} | {{DATE}} | {{PLAN}} | REQUESTED |

Aturan:

- Exception tidak boleh tanpa expiry.
- Exception tidak boleh memperluas scope secara implisit.
- Expired exception diperlakukan sebagai violation, bukan permanent precedent.
- Repeated exception menunjukkan ADR perlu direview atau implementasi perlu diperbaiki.

---

# 8. Consequences dan Accepted Trade-Offs

## 8.1 Positive Consequences

| ID | Consequence | Beneficiary | Expected Evidence | Realization Owner |
|---|---|---|---|---|
| CONS-POS-001 | {{POSITIVE_EFFECT}} | {{TEAM/SYSTEM/USER}} | {{METRIC}} | {{OWNER}} |

## 8.2 Negative Consequences

| ID | Consequence | Severity | Why Accepted | Mitigation | Owner |
|---|---|---|---|---|---|
| CONS-NEG-001 | {{NEGATIVE_EFFECT}} | {{LOW-HIGH}} | {{RATIONALE}} | {{MITIGATION}} | {{OWNER}} |

Wajib mencantumkan downside yang nyata. “Tidak ada konsekuensi negatif” memerlukan justification luar biasa.

## 8.3 Neutral / Structural Consequences

| ID | Consequence | Affected Area | Required Follow-Up |
|---|---|---|---|
| CONS-NEU-001 | {{STRUCTURAL_CHANGE}} | {{AREA}} | {{ACTION}} |

## 8.4 Technical Debt Deliberately Accepted

| Debt ID | Debt | Why Accepted Now | Cost/Risk | Paydown Trigger | Owner |
|---|---|---|---|---|---|
| DEBT-001 | {{DEBT}} | {{RATIONALE}} | {{IMPACT}} | {{TRIGGER}} | {{OWNER}} |

## 8.5 Cost, Lock-In, dan Exit Consequences

| Area | Accepted Consequence | Maximum Exposure | Exit Mechanism | Review Trigger |
|---|---|---|---|---|
| Recurring cost | {{COST}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Vendor lock-in | {{LOCKIN}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Operational burden | {{BURDEN}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Skills dependency | {{DEPENDENCY}} | {{LIMIT}} | {{TRAINING_OR_EXIT}} | {{TRIGGER}} |

## 8.6 Organizational dan Process Consequences

| Team / Process | Change | Training / Staffing | New Ownership | Evidence of Readiness |
|---|---|---|---|---|
| {{TEAM}} | {{CHANGE}} | {{NEED}} | {{OWNER}} | {{EVIDENCE}} |

## 8.7 Residual Risk Acceptance

| Risk ID | Residual Risk | Likelihood | Impact | Owner | Accepted By | Review Date/Trigger |
|---|---|---:|---:|---|---|---|
| RISK-001 | {{RISK}} | {{1-5}} | {{1-5}} | {{OWNER}} | {{AUTHORITY}} | {{DATE/TRIGGER}} |

---

# 9. Implementation, Migration, dan Rollout Contract

## 9.1 Implementation Obligations

| Obligation ID | Required Change | Affected Artifact / Component | Owner | Depends On | Completion Evidence |
|---|---|---|---|---|---|
| IMPL-001 | {{REQUIRED_CHANGE}} | {{FSD/CODE/DATA/INFRA}} | {{OWNER}} | {{DEPENDENCY}} | {{EVIDENCE}} |

## 9.2 FSD Handoff Requirements

Bila ADR ini digunakan dan berstatus `ACCEPTED`, FSD terkait **WAJIB** memperbarui area berikut atau menulis `N/A — reason`. Tanpa linked FSD, ADR ini tidak boleh menjadi standalone implementation instruction:

| FSD Area | Required Detail | ADR Clauses | Blocker? |
|---|---|---|---:|
| Architecture/context | Target components and boundary | DEC-001 | Yes |
| Domain/source of truth | Ownership and invariants | DEC-003, INV-* | Yes |
| Data design | Schema, constraints, migration, retention | {{DEC-IDS}} | {{YES/NO}} |
| API/events | Exact versioning, idempotency, failure contracts | {{DEC-IDS}} | {{YES/NO}} |
| Security/privacy | Trust boundaries and control enforcement | {{SEC/PRIV-IDS}} | {{YES/NO}} |
| Jobs/integration | Retry, timeout, reconciliation, degraded mode | {{DEC-IDS}} | {{YES/NO}} |
| NFR/capacity | Tested operating envelope and SLO | {{DRV/CRIT-IDS}} | {{YES/NO}} |
| Observability | Fitness functions, metrics, alerts, runbook | {{FF-IDS}} | {{YES/NO}} |
| Delivery | Migration, rollout, rollback | {{IMPL-IDS}} | {{YES/NO}} |
| Goal manifest | Atomic work packages referencing FSD and this ADR when applicable | {{IMPL-IDS}} | Yes |

## 9.3 Dependency dan Sequencing

```mermaid
graph TD
    G1[GOAL-001: {{FOUNDATION}}] --> G2[GOAL-002: {{IMPLEMENTATION}}]
    G2 --> G3[GOAL-003: {{MIGRATION}}]
    G2 --> G4[GOAL-004: {{OBSERVABILITY}}]
    G3 --> G5[GOAL-005: {{ROLLOUT}}]
    G4 --> G5
```

| Sequence | Obligation / Goal | Entry Criteria | Exit Criteria |
|---:|---|---|---|
| 1 | {{IMPL/GOAL-ID}} | {{PRECONDITION}} | {{VERIFIABLE_RESULT}} |

## 9.4 Migration Strategy

| Phase | Scope | Method | Data Compatibility | Verification | Rollback Point |
|---|---|---|---|---|---|
| 0 | Preparation | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 1 | Shadow/dual-read | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 2 | Partial cutover | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 3 | Full cutover | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 4 | Decommission | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |

## 9.5 Backward dan Forward Compatibility

- Old reader with new data: `{{SUPPORTED/NOT_SUPPORTED_AND_RULE}}`
- New reader with old data: `{{SUPPORTED/NOT_SUPPORTED_AND_RULE}}`
- API/event compatibility window: `{{WINDOW}}`
- Mixed-version deployment behavior: `{{BEHAVIOR}}`
- Rollback after schema migration: `{{POSSIBLE/CONDITIONS}}`

## 9.6 Feature Flag / Traffic Control

| Flag / Control | Purpose | Default | Owner | Removal Criteria | Maximum Lifetime |
|---|---|---|---|---|---|
| {{FLAG}} | {{PURPOSE}} | OFF/ON | {{OWNER}} | {{CRITERIA}} | {{DATE}} |

Permanent flags tanpa owner dan removal criteria dilarang.

## 9.7 Rollout Plan

| Stage | Audience/Traffic | Duration / Evidence Window | Success Criteria | Abort Criteria |
|---|---:|---|---|---|
| Internal | {{SCOPE}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Canary | {{PERCENT}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Broad | {{PERCENT}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Full | 100% | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |

## 9.8 Rollback Contract

| Rollback ID | Trigger | Decision Authority | Action | Data Handling | Verification | Maximum Recovery Time |
|---|---|---|---|---|---|---|
| ROLLBACK-001 | {{TRIGGER}} | {{ROLE}} | {{ACTION}} | {{DATA_RULE}} | {{CHECK}} | {{TIME}} |

Rollback plan harus menjelaskan apakah rollback kode juga memerlukan rollback data/config/provider state. “Redeploy versi lama” jarang cukup.

## 9.9 Decommission Plan

| Legacy Component / Pattern | Disable Condition | Data Disposition | Consumer Migration | Removal Verification | Owner |
|---|---|---|---|---|---|
| {{LEGACY}} | {{CONDITION}} | {{RULE}} | {{PLAN}} | {{CHECK}} | {{OWNER}} |

## 9.10 Operational Readiness

- [ ] Owner dan on-call path tersedia.
- [ ] Dashboards dan alerts tersedia sebelum rollout material.
- [ ] Runbook untuk top failure modes tersedia.
- [ ] Backup/restore atau recovery mechanism diuji.
- [ ] Secrets/configuration tersedia di environment target.
- [ ] Capacity limit dan cost guardrail dipasang.
- [ ] Vendor escalation/support path terdokumentasi bila relevan.
- [ ] Rollback rehearsal atau dry run selesai untuk risk `HIGH/CRITICAL`.

---

# 10. Security, Privacy, Compliance, dan AI Impact

## 10.1 Data Flow dan Trust Boundaries

```mermaid
flowchart LR
    subgraph T1[{{TRUST_ZONE_1}}]
      A[{{COMPONENT}}]
    end
    subgraph T2[{{TRUST_ZONE_2}}]
      B[{{COMPONENT_OR_VENDOR}}]
    end
    A -->|{{DATA_CLASS_AND_PROTOCOL}}| B
```

| Flow ID | Source | Destination | Data | Classification | Purpose | Encryption | Authorization | Retention |
|---|---|---|---|---|---|---|---|---|
| FLOW-001 | {{SOURCE}} | {{DEST}} | {{DATA}} | {{CLASS}} | {{PURPOSE}} | {{CONTROL}} | {{CONTROL}} | {{PERIOD}} |

## 10.2 Threat Model Delta

ADR harus menilai **perubahan** threat model, bukan menyalin daftar umum.

| Threat ID | New/Changed Threat | Asset | Attack Path | Likelihood | Impact | Mitigation | Residual Risk |
|---|---|---|---|---:|---:|---|---|
| THREAT-001 | {{THREAT}} | {{ASSET}} | {{PATH}} | {{1-5}} | {{1-5}} | {{MIT-ID}} | {{RISK-ID}} |

## 10.3 Security Control Impact

| Control Area | Current | Decision Impact | Required Control | Verification |
|---|---|---|---|---|
| Identity/session | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Authorization | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Secrets | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Encryption | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Logging/audit | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Supply chain | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |

## 10.4 Privacy dan Data-Lifecycle Impact

| Topic | Decision |
|---|---|
| Personal data introduced/changed | {{DATA_OR_NONE}} |
| Purpose/legal basis | {{PURPOSE_OR_N/A}} |
| Data minimization | {{RULE}} |
| Data subject rights impact | {{IMPACT_OR_N/A}} |
| Residency/transfer | {{RULE}} |
| Retention/deletion | {{RULE}} |
| Processor/subprocessor | {{VENDOR_OR_NONE}} |
| DPIA/assessment required | {{YES_NO_REASON}} |

## 10.5 Compliance dan Policy Mapping

| Obligation / Control | Applicability | How Decision Satisfies It | Evidence | Exception |
|---|---|---|---|---|
| {{POLICY_STANDARD_CONTROL}} | {{YES/NO}} | {{MECHANISM}} | {{EVIDENCE}} | {{EXC-ID_OR_NONE}} |

## 10.6 AI/ML-Specific Decision Boundary

Isi bila ADR menyangkut AI/ML/agentic automation; selain itu `N/A — keputusan tidak menggunakan AI/ML`.

| Topic | Required Decision |
|---|---|
| Model/provider | {{MODEL_OR_ABSTRACTION}} |
| Permitted data | {{DATA_CLASSES}} |
| Prohibited data | {{DATA_CLASSES}} |
| Data egress/residency | {{BOUNDARY}} |
| Human authority | {{WHAT_AI_MAY_AND_MAY_NOT_DECIDE}} |
| Structured output | {{SCHEMA_OR_CONTRACT}} |
| Evidence/citation requirement | {{RULE}} |
| Prompt/tool versioning | {{RULE}} |
| Evaluation gate | {{DATASET_METRIC_THRESHOLD}} |
| Hallucination/invalid output handling | {{FAIL_CLOSED_BEHAVIOR}} |
| Prompt injection boundary | {{CONTROL}} |
| Audit/reproducibility | {{RUN_ID_MODEL_PROMPT_INPUT_HASH}} |
| Degraded fallback | {{BEHAVIOR}} |
| Provider swap boundary | {{INTERFACE_AND_NON_GOALS}} |

AI output dilarang menjadi authoritative state hanya karena confidence tinggi. Human atau deterministic gate harus ditulis bila outcome memiliki dampak material.

## 10.7 Third-Party dan Vendor Risk

| Vendor | Data/Access | Availability Dependency | Contract/SLA | Exit Risk | Security Evidence | Owner |
|---|---|---|---|---|---|---|
| {{VENDOR}} | {{DATA}} | {{DEPENDENCY}} | {{SLA}} | {{RISK}} | {{EVIDENCE}} | {{OWNER}} |

---

# 11. Architecture Fitness Functions dan Verification

## 11.1 Fitness Function Inventory

Setiap architecture property penting harus memiliki pemeriksaan otomatis atau manual yang jelas.

| FF ID | Property Protected | Check | Type | Frequency | Threshold | Failure Action | Owner |
|---|---|---|---|---|---|---|---|
| FF-001 | {{ARCHITECTURE_PROPERTY}} | {{COMMAND_TEST_QUERY_REVIEW}} | CI / runtime / scheduled / manual | {{FREQUENCY}} | {{PASS_CRITERIA}} | {{ACTION}} | {{OWNER}} |

Contoh:

- dependency rule test mencegah domain layer mengimpor infrastructure adapter;
- contract test memverifikasi provider adapter memenuhi interface yang diputuskan;
- query memverifikasi tidak ada row tanpa tenant key;
- policy-as-code memverifikasi storage berada pada region yang disetujui;
- SLO alert mendeteksi p95 latency melebihi envelope;
- reconciliation metric mendeteksi source-of-truth drift;
- CI scan mencegah direct vendor SDK usage di luar adapter package.

## 11.2 Acceptance dan Validation Matrix

| Validation ID | ADR Clause | Scenario | Evidence Required | Environment | Owner | Gate |
|---|---|---|---|---|---|---|
| VAL-001 | DEC-001 | {{SCENARIO}} | {{TEST_LOG_REPORT}} | {{ENV}} | {{OWNER}} | Merge/Release/Post-release |

## 11.3 Repository Verification Commands

```bash
# Replace with verified repository commands; do not invent.
{{INSTALL_COMMAND}}
{{LINT_COMMAND}}
{{TYPECHECK_COMMAND}}
{{UNIT_TEST_COMMAND}}
{{INTEGRATION_TEST_COMMAND}}
{{CONTRACT_TEST_COMMAND}}
{{MIGRATION_DRY_RUN_COMMAND}}
{{SECURITY_SCAN_COMMAND}}
{{ARCHITECTURE_TEST_COMMAND}}
{{BUILD_COMMAND}}
{{SMOKE_TEST_COMMAND}}
```

Setiap command harus pernah dijalankan pada repository/environment yang relevan sebelum goal dinyatakan `READY`.

## 11.4 Performance / Capacity Verification

| Test | Workload | Environment | Warm-up | Duration | Target | Abort Threshold | Result Artifact |
|---|---|---|---|---|---|---|---|
| BENCH-001 | {{WORKLOAD}} | {{ENV}} | {{TIME}} | {{TIME}} | {{TARGET}} | {{ABORT}} | {{PATH}} |

## 11.5 Failure Injection dan Recovery Verification

| Failure | Injection Method | Expected Behavior | Data Integrity Check | Recovery Check | Result |
|---|---|---|---|---|---|
| {{DEPENDENCY_TIMEOUT}} | {{METHOD}} | {{BEHAVIOR}} | {{CHECK}} | {{CHECK}} | {{PASS/FAIL}} |

## 11.6 Security Verification

| Test / Review | Scope | Expected Result | Evidence | Owner |
|---|---|---|---|---|
| Threat-model review | {{SCOPE}} | No unmitigated critical threat | {{REPORT}} | {{OWNER}} |
| Authorization negative test | {{SCOPE}} | Deny + audit | {{TEST}} | {{OWNER}} |
| Secret scan | {{SCOPE}} | Zero exposed secrets | {{REPORT}} | {{OWNER}} |
| Dependency/SBOM review | {{SCOPE}} | Within policy | {{REPORT}} | {{OWNER}} |

## 11.7 Completion Evidence

ADR implementation tidak dianggap selesai sebelum tersedia:

- [ ] FSD update yang men-trace decision clauses;
- [ ] code/config/schema/infra changes sesuai implementation obligations;
- [ ] tests dan fitness functions aktif;
- [ ] migration/rollout/rollback evidence;
- [ ] dashboards/alerts/runbook untuk failure material;
- [ ] security/privacy/compliance approvals bila diperlukan;
- [ ] post-deployment validation result;
- [ ] debt, exception, atau residual risk record yang masih terbuka;
- [ ] completion report dengan commit/release reference.

---

# 12. Observability, Operations, dan Economics

## 12.1 Decision-Specific Telemetry

| Signal | Type | Purpose | Labels/Dimensions | Threshold | Retention |
|---|---|---|---|---|---|
| {{METRIC_LOG_TRACE}} | metric/log/trace/audit | {{PURPOSE}} | {{DIMENSIONS}} | {{THRESHOLD}} | {{PERIOD}} |

Hindari high-cardinality labels yang tidak terkendali atau logging sensitive payload.

## 12.2 Dashboard dan Alerts

| Dashboard / Alert | Audience | Signal | Trigger | Severity | Response Runbook |
|---|---|---|---|---|---|
| {{NAME}} | {{AUDIENCE}} | {{SIGNAL}} | {{TRIGGER}} | {{SEVERITY}} | {{RUNBOOK}} |

## 12.3 Runbook Inventory

| Runbook ID | Scenario | Owner | Trigger | Required Steps | Last Tested |
|---|---|---|---|---|---|
| RB-001 | {{FAILURE_SCENARIO}} | {{OWNER}} | {{TRIGGER}} | {{PATH_OR_SUMMARY}} | {{DATE}} |

## 12.4 Cost Guardrails

| Cost Driver | Unit | Expected | Warning Threshold | Hard Limit / Approval | Owner |
|---|---|---:|---:|---:|---|
| {{DRIVER}} | {{UNIT}} | {{VALUE}} | {{VALUE}} | {{VALUE_OR_APPROVAL}} | {{OWNER}} |

## 12.5 Capacity dan Scaling Trigger

| Resource / Limit | Current Envelope | Warning | Scale Action | Architecture Review Trigger |
|---|---:|---:|---|---|
| {{RESOURCE}} | {{VALUE}} | {{VALUE}} | {{ACTION}} | {{TRIGGER}} |

---

# 13. Agentic Execution Handoff

## 13.1 Machine-Readable Decision Manifest

```yaml
schema_version: "2.0"
artifact_governance:
  optional_artifact: true
  canonical_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
  fsd_is_primary_implementation_authority: true
  adr_must_be_linked_from_fsd: true
adr:
  id: "{{ADR_ID}}"
  title: "{{DECISION_TITLE}}"
  status: "{{ACCEPTED}}"
  applicability_status: "{{OPTIONAL_USED_OR_REQUIRED_BY_PROJECT_POLICY}}"
  linked_fsd_id: "FSD-{{PROJECT_CODE}}"
  replaces_fsd_tdec: "{{TDEC_ID_OR_NONE}}"
  decision_type: "{{TYPE}}"
  risk_class: "{{RISK_CLASS}}"
  reversibility: "{{REVERSIBILITY}}"
  scope:
    include:
      - "{{COMPONENT_OR_BOUNDARY}}"
    exclude:
      - "{{OUT_OF_SCOPE}}"
  upstream_authority:
    brd:
      - "{{BRD_ID}}"
    prd:
      - "{{PRD_ID}}"
    policies:
      - "{{POLICY_ID}}"
  selected_option: "OPT-{{NNN}}"
  mandatory_decisions:
    - id: "DEC-001"
      rule: "{{NORMATIVE_RULE}}"
    - id: "DEC-002"
      rule: "{{NORMATIVE_RULE}}"
  invariants:
    - id: "INV-001"
      rule: "{{INVARIANT}}"
  prohibited_patterns:
    - id: "PROHIB-001"
      rule: "{{PROHIBITED_BEHAVIOR}}"
  implementation_obligations:
    - id: "IMPL-001"
      target: "{{ARTIFACT_OR_COMPONENT}}"
      required_change: "{{CHANGE}}"
  fitness_functions:
    - id: "FF-001"
      command_or_check: "{{VERIFIED_CHECK}}"
      pass_condition: "{{PASS_CONDITION}}"
  rollout:
    strategy: "{{STRATEGY}}"
    abort_conditions:
      - "{{CONDITION}}"
  rollback:
    supported: true
    trigger:
      - "{{TRIGGER}}"
    data_constraint: "{{DATA_RULE}}"
  open_items:
    blockers: []
    non_blockers:
      - id: "OPEN-{{NNN}}"
        fallback: "{{APPROVED_FALLBACK}}"
  stop_conditions:
    - "FSD status is not APPROVED"
    - "FSD does not link this ADR"
    - "ADR status is not ACCEPTED"
    - "An upstream BRD/PRD conflict is discovered"
    - "A mandatory repository fact contradicts the ADR and no approved fallback exists"
    - "Required destructive migration lacks approved backup and rollback evidence"
    - "Security/privacy boundary cannot be implemented as specified"
  review_triggers:
    - id: "REVTRIG-001"
      trigger: "{{EVENT_OR_THRESHOLD}}"
```

## 13.2 Goal-Slicing Rules

- Satu goal harus menghasilkan satu atomic, reviewable outcome.
- Foundation/interface goal mendahului adapter/provider implementation bila abstraction boundary adalah bagian keputusan.
- Data migration dipisahkan dari application cutover bila keduanya memiliki rollback risk berbeda.
- Fitness function dan observability tidak boleh ditunda ke “cleanup”; letakkan sebelum rollout.
- Decommission goal hanya `READY` setelah rollback window dan exit criteria terpenuhi.
- Setiap goal harus mereferensikan FSD dan requirement FSD terkait.
- Bila goal berada dalam scope ADR ini, goal juga harus mereferensikan `ADR-ID`, `DEC-*`, `IMPL-*`, dan `FF-*`.
- Goal di luar scope ADR tidak perlu menambahkan referensi ADR semu.
- Goal tidak boleh membuat keputusan technology, enum, source of truth, consistency, security, atau failure semantics baru.

## 13.3 Reusable Goal Packet

### GOAL-{{NNN}} — {{ATOMIC_OUTCOME}}

**Authority**

- FSD: `{{FSD_ID_AND_SECTION}}` — primary implementation authority
- FSD requirements: `{{FSD-IDS}}`
- ADR: `{{ADR_ID}}` — optional linked authority for this goal
- Decision clauses: `{{DEC-IDS}}`
- Depends on: `{{GOAL-IDS_OR_NONE}}`

**Objective**

`{{ONE_OBSERVABLE_OUTCOME}}`

**Allowed scope**

- `{{PATH_COMPONENT_SCHEMA_CONFIG}}`

**Explicitly prohibited**

- `{{OUT_OF_SCOPE_REFACTOR_OR_SUBSTITUTION}}`
- No new provider/pattern outside `{{SELECTED_OPTION}}`.
- No weakened validation, authorization, audit, tests, or failure handling.

**Implementation contract**

- `{{MANDATORY_RULES}}`

**Acceptance gates**

- [ ] `{{OBSERVABLE_ACCEPTANCE}}`
- [ ] `{{NEGATIVE_OR_FAILURE_ACCEPTANCE}}`
- [ ] `{{FITNESS_FUNCTION_ACTIVE}}`

**Verification commands**

```bash
{{VERIFIED_COMMANDS}}
```

**Required completion report**

- changed files and rationale;
- migrations/config/secrets impact;
- tests and commands with results;
- FSD/ADR deviations: none or explicitly listed;
- residual risks/open items;
- rollback notes;
- commit/reference.

**Stop conditions**

- `{{CONDITION_REQUIRING_HUMAN_DECISION}}`

## 13.4 `/goal` Invocation Template

Use this variant only for a goal whose approved FSD explicitly links this ADR.

```text
/goal GOAL-{{NNN}}

Authority:
- FSD: {{FSD_ID_AND_SECTION}} (status must be APPROVED; primary source)
- FSD requirements: {{FSD-IDS}}
- ADR: {{ADR_ID}} (optional linked authority; status must be ACCEPTED)
- Decision clauses: {{DEC-IDS}}

Execute only the bounded FSD goal packet.
Preserve all FSD invariants and the linked ADR decision/prohibited-pattern rules.
Do not interpret the ADR as permission to expand product scope or bypass FSD contracts.
Use repository facts and approved defaults; do not invent architecture.
Run every listed verification command.
Stop only on a declared stop condition.
Return the required completion report with evidence, not a narrative claim of completion.
```

## 13.5 Agent Stop Conditions

Untuk goal yang menautkan ADR ini, agent harus berhenti dan melaporkan blocker ketika:
- FSD tidak `APPROVED` atau tidak menautkan ADR ini;

- ADR bukan `ACCEPTED`, sudah `DEPRECATED/SUPERSEDED`, atau supersession status ambigu;
- repository state membuktikan decision assumptions salah dan tidak ada fallback;
- upstream requirement bertentangan dengan decision clause;
- external integration compatibility belum terbukti tetapi goal meminta production cutover;
- migration dapat merusak data tanpa backup/restore/rollback gate;
- security/privacy/compliance control tidak dapat dipenuhi;
- required secret, credential, environment, or access tidak tersedia untuk verification;
- test failure menunjukkan perubahan di luar bounded goal diperlukan;
- hanya cara menyelesaikan task adalah melemahkan acceptance gate atau prohibited pattern.

Agent tidak perlu berhenti untuk pilihan lokal yang sudah ditentukan oleh repository convention dan tidak mengubah decision semantics.

---

# 14. Traceability Matrix

## 14.1 End-to-End Traceability

| Upstream ID | Need / Constraint | ADR Driver | Option Evidence | Decision Clause | FSD Requirement | Implementation Goal | Test / FF | Runtime Evidence |
|---|---|---|---|---|---|---|---|---|
| {{BRD_OR_PRD_DOCUMENT_ID}}#{{LOCAL_ID}} | {{NEED}} | DRV-001 | EVD-001 | DEC-001 | FSD-{{PROJECT_CODE}}#{{LOCAL_ID}} | GOAL-001 | FF-001 | {{DASHBOARD/REPORT}} |

Rules:

- Setiap decision clause harus memiliki downstream implementation atau `N/A — rationale`.
- Setiap implementation obligation harus memiliki completion evidence.
- Setiap high-risk consequence harus memiliki mitigation, owner, dan verification.
- Orphan goal tanpa FSD authority harus ditolak. Referensi ADR hanya diwajibkan untuk goal yang memang berada dalam scope ADR ini.

## 14.2 ADR-to-Code Map

| Decision / Rule | Repository Path / Resource | Enforcement Type | Owner |
|---|---|---|---|
| DEC-001 | `{{PATH}}` | Code/config/infra/policy | {{OWNER}} |
| PROHIB-001 | `{{LINT_OR_ARCH_TEST_PATH}}` | Automated guard | {{OWNER}} |
| FF-001 | `{{TEST_MONITOR_PATH}}` | CI/runtime | {{OWNER}} |

## 14.3 ADR Compliance Review Questions

- Apakah kode mengakses provider langsung di luar approved adapter boundary?
- Apakah source-of-truth dan conflict resolution tetap sesuai?
- Apakah new data flow melewati trust boundary yang belum direview?
- Apakah retry/idempotency/order/transaction semantics berubah?
- Apakah schema/API/event change tetap backward compatible sesuai window?
- Apakah architecture fitness functions masih aktif dan passing?
- Apakah exception sudah expired atau digunakan lebih luas dari scope?
- Apakah operational cost atau load melewati envelope?
- Apakah implementation menambahkan hidden fallback atau silent degradation?

---

# 15. Risks, Open Items, dan Exceptions

## 15.1 Risk Register

| Risk ID | Risk | Cause | Likelihood | Impact | Score | Mitigation | Detection | Owner | Status |
|---|---|---|---:|---:|---:|---|---|---|---|
| RISK-001 | {{RISK}} | {{CAUSE}} | {{1-5}} | {{1-5}} | {{LxI}} | {{MIT-ID}} | {{SIGNAL}} | {{OWNER}} | OPEN |

## 15.2 Mitigation Register

| Mitigation ID | Risk | Action | Prevent/Detect/Recover | Owner | Due | Evidence | Residual Risk |
|---|---|---|---|---|---|---|---|
| MIT-001 | RISK-001 | {{ACTION}} | {{TYPE}} | {{OWNER}} | {{DATE}} | {{EVIDENCE}} | {{RISK}} |

## 15.3 Open Decision / Evidence Register

| Open ID | Question | Class | Options | Recommendation | Safe Fallback | Owner | Gate | Status |
|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | {{CLASS}} | {{OPTIONS}} | {{RECOMMENDATION}} | {{FALLBACK}} | {{OWNER}} | {{GATE}} | OPEN |

## 15.4 Exception Register

| Exception ID | ADR Rule | Scope | Compensating Control | Approved By | Start | Expiry | Exit Criteria | Status |
|---|---|---|---|---|---|---|---|---|
| EXC-001 | {{RULE}} | {{SCOPE}} | {{CONTROL}} | {{APPROVER}} | {{DATE}} | {{DATE}} | {{CRITERIA}} | ACTIVE |

## 15.5 Issue and Incident Feedback

| Issue / Incident | Date | Relevance to Decision | Corrective Action | ADR Review Required? | Owner |
|---|---|---|---|---:|---|
| {{ID}} | {{DATE}} | {{LEARNING}} | {{ACTION}} | Yes/No | {{OWNER}} |

---

# 16. Review, Outcome, Deprecation, dan Supersession

## 16.1 Review Triggers

| Trigger ID | Trigger | Evidence to Review | Reviewer | Required Outcome |
|---|---|---|---|---|
| REVTRIG-001 | Target load exceeds `{{THRESHOLD}}` | Capacity metrics | {{OWNER}} | Confirm or supersede |
| REVTRIG-002 | Critical security advisory affects selected option | Security advisory + exposure | {{OWNER}} | Mitigate/deprecate/supersede |
| REVTRIG-003 | Recurring cost exceeds `{{LIMIT}}` | Billing/cost dashboard | {{OWNER}} | Reassess option |
| REVTRIG-004 | `{{DATE}}` periodic review | Fitness and outcome metrics | {{OWNER}} | Continue/deprecate/supersede |
| REVTRIG-005 | Exception count/age exceeds `{{LIMIT}}` | Exception register | {{OWNER}} | Fix implementation or review ADR |

## 16.2 Post-Implementation Outcome Review

| Outcome / Assumption | Expected | Actual | Evidence Period | Variance | Action |
|---|---|---|---|---|---|
| OUT-001 | {{TARGET}} | {{ACTUAL}} | {{PERIOD}} | {{VARIANCE}} | {{ACTION}} |
| ASSUMP-001 | {{EXPECTED}} | {{ACTUAL}} | {{PERIOD}} | {{VARIANCE}} | {{ACTION}} |

## 16.3 Decision Health

| Dimension | Status | Evidence | Action |
|---|---|---|---|
| Fitness functions | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Cost | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Reliability | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Security/compliance | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Developer usability | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Exit/reversibility | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |

## 16.4 Deprecation Plan

ADR dapat menjadi `DEPRECATED` ketika keputusan masih ada di production tetapi tidak boleh digunakan untuk development baru.

| Item | Plan |
|---|---|
| Reason for deprecation | {{REASON}} |
| Replacement direction | {{ADR_OR_PATTERN}} |
| New adoption cutoff | {{DATE}} |
| Existing workload support | {{WINDOW}} |
| Migration owner | {{OWNER}} |
| Security/operations support | {{PLAN}} |
| Final removal criteria | {{CRITERIA}} |

## 16.5 Supersession Record

| Field | Value |
|---|---|
| Superseded by | `{{NEW_ADR_ID}}` |
| Effective date | `{{YYYY-MM-DD}}` |
| What changed | `{{MATERIAL_CHANGE}}` |
| What remains valid | `{{REMAINING_CONTEXT_OR_NONE}}` |
| Migration required | `{{YES_NO_AND_PLAN}}` |
| Existing exceptions disposition | `{{RULE}}` |

---

# 17. Final ADR Readiness Checklist

## 17.1 Decision Quality

- [ ] FSD applicability assessment menyatakan ADR ini digunakan, atau project policy yang mewajibkannya telah dicite.
- [ ] Nilai durable decision record membenarkan pemisahan dari `TDEC-*`.
- [ ] Satu decision statement utama jelas dan normatif.
- [ ] Decision owner dan required deciders jelas.
- [ ] Scope, non-scope, blast radius, reversibility, dan urgency jelas.
- [ ] Tidak ada hidden product/business decision di dalam ADR.
- [ ] Tidak ada acceptance blocker terbuka.

## 17.2 Context dan Evidence

- [ ] Current-state facts memiliki source/evidence.
- [ ] Constraint dibedakan dari preference dan assumption.
- [ ] Workload/data/operating envelope eksplisit.
- [ ] Decisive claims memiliki evidence level yang memadai.
- [ ] Benchmark/spike dapat direproduksi dan limitations dicatat.

## 17.3 Option Analysis

- [ ] Status quo dipertimbangkan.
- [ ] Minimal dua opsi layak dibandingkan atau single-option constraint dibuktikan.
- [ ] Tidak ada strawman option.
- [ ] Hard constraint matrix lengkap.
- [ ] Weighted score memiliki rationale/evidence.
- [ ] Sensitivity dan uncertainty dinilai.
- [ ] Dissenting opinion dicatat.

## 17.4 Decision dan Consequences

- [ ] Selected option, rules, boundaries, source of truth, dan prohibited patterns eksplisit.
- [ ] Positive, negative, neutral, cost, debt, lock-in, dan organization impacts dicatat.
- [ ] Residual risks diterima oleh authority yang tepat.
- [ ] Exception policy memiliki expiry dan compensating control.

## 17.5 Security, Privacy, Compliance, dan AI

- [ ] Trust-boundary/data-flow delta dipetakan.
- [ ] Threat-model delta dinilai.
- [ ] Classification, residency, retention, audit, secrets, dan vendor risk dinilai.
- [ ] AI decision boundary, evaluation, human authority, dan data-egress rules lengkap bila relevan.
- [ ] Required approvals tersedia.

## 17.6 Implementation dan Operations

- [ ] FSD handoff requirements lengkap.
- [ ] FSD berstatus `APPROVED`, menautkan ADR ini, dan tetap menjadi primary implementation authority.
- [ ] Implementation obligations memiliki owner dan evidence.
- [ ] Migration, compatibility, rollout, rollback, dan decommission dinilai.
- [ ] Observability, capacity/cost guardrails, alerts, dan runbooks tersedia.
- [ ] Minimum satu fitness function dapat mendeteksi architecture drift.

## 17.7 Agentic Readiness

- [ ] Machine-readable manifest sesuai keputusan naratif.
- [ ] Goal selalu merujuk FSD; referensi ADR ditambahkan hanya untuk goal dalam scope.
- [ ] Goal boundaries dan dependency dapat ditentukan tanpa invention.
- [ ] Allowed scope, prohibited changes, verification commands, dan stop conditions jelas.
- [ ] Tidak ada placeholder, fake fallback, atau ambiguous adjective.
- [ ] Mock success tidak digunakan sebagai satu-satunya integration evidence.
- [ ] Agent tidak perlu membuat keputusan architecture/product/security baru untuk menyelesaikan goal.

## 17.8 Lifecycle

- [ ] Review date/event dan owner tercatat.
- [ ] Deprecation/supersession mechanism jelas.
- [ ] ADR index dan related ADR links diperbarui, atau `N/A — organisasi tidak memakai central ADR index`.
- [ ] Historical decision content tidak akan ditulis ulang setelah acceptance.

---

# Appendix A — Pola Penulisan ADR yang Baik dan Buruk

## A.1 Decision Statement yang Baik

> **DEC-001:** Semua outbound payment requests **WAJIB** dikirim melalui `PaymentProvider` interface pada package `domain/payments`; application code **DILARANG** mengimpor SDK provider secara langsung. Adapter provider **WAJIB** memenuhi contract tests `{{PATH}}` sebelum diaktifkan.

Mengapa baik: scope, boundary, prohibited behavior, dan verification jelas.

## A.2 Decision Statement yang Buruk

> Gunakan abstraction yang fleksibel dan scalable untuk payment.

Masalah: tidak mendefinisikan abstraction, scope, target, prohibited pattern, atau cara memverifikasi.

## A.3 Rationale yang Baik

> OPT-002 dipilih karena merupakan satu-satunya opsi yang memenuhi data-residency constraint CONSTR-003, lulus contract spike SPIKE-002 pada runtime target, dan mempertahankan rollback tanpa data rewrite. Opsi ini memiliki recurring cost 18% lebih tinggi, yang diterima oleh budget owner sampai volume 2 juta transaksi/bulan.

## A.4 Rationale yang Buruk

> Teknologi ini modern, populer, dan best practice.

Masalah: claim tidak kontekstual, tidak terukur, dan tidak membandingkan opsi.

## A.5 Consequence yang Baik

> Tim operasi harus mengelola broker tambahan dan on-call runbook baru. Risiko ini dimitigasi dengan managed service, alert FF-004, dan game-day sebelum 50% traffic cutover.

## A.6 Consequence yang Buruk

> Tidak ada downside yang berarti.

Masalah: hampir selalu tidak jujur atau belum dianalisis.

## A.7 Fitness Function yang Baik

> CI test `pnpm test:architecture` gagal bila file di luar `src/adapters/provider-x/**` mengimpor package `provider-x-sdk`.

## A.8 Fitness Function yang Buruk

> Code review memastikan architecture tetap bersih.

Masalah: tidak deterministik, tidak memiliki owner/frequency, dan mudah mengalami drift.

---

# Appendix B — Anti-Pattern dan AI-Slop Rejection Checklist

Tolak ADR bila ditemukan satu atau lebih kondisi berikut tanpa koreksi:

- ADR dibuat hanya karena template tersedia, tanpa applicability assessment atau durable decision value;

- decision statement hanya menyebut nama teknologi tanpa boundary dan reason;
- opsi terpilih ditentukan lebih dulu lalu score direkayasa;
- status quo atau viable alternative tidak dipertimbangkan;
- rejected options adalah strawman;
- “best practice”, “industry standard”, “scalable”, “secure”, atau “simple” digunakan tanpa definisi/evidence;
- semua konsekuensi ditulis positif;
- benchmark tidak mencantumkan environment, workload, atau raw result;
- vendor documentation dianggap bukti integration compatibility;
- tidak ada hard constraint atau constraint tercampur dengan preference;
- architecture diagram bertentangan dengan decision clauses;
- source of truth, failure mode, data ownership, atau rollback dibiarkan implisit;
- exception tidak memiliki expiry;
- migration hanya menyebut “migrate data” tanpa compatibility dan rollback;
- observability/runbook ditunda setelah go-live;
- fitness function hanya berupa manual code review tanpa cadence/owner;
- ADR mencoba mengubah product scope atau business rule;
- manifest machine-readable berbeda dari isi naratif;
- `/goal` dapat mengganti provider/pattern tanpa blocker;
- agent dapat “selesai” dengan mock, TODO, disabled test, silent catch, atau weakened validation;
- accepted ADR masih memiliki unresolved acceptance blocker;
- ADR lama diedit material setelah acceptance tanpa supersession.

---

# Appendix C — Option Scoring dan Decision Heuristics

## C.1 Weighted Score Formula

```text
weighted_total(option) = Σ(score_criterion × weight_criterion)
```

Bila score menggunakan skala 0–5 dan weight berupa persentase:

```text
normalized_score = Σ(score × weight) / 5
```

Normalized score berada pada rentang 0–100%. Jangan tampilkan presisi palsu; satu angka desimal biasanya cukup.

## C.2 Risk-Adjusted View

Weighted score dapat dilengkapi, bukan diganti, oleh:

```text
risk_exposure = likelihood × impact × uncertainty_multiplier
```

Gunakan hanya bila scale dan interpretation telah didefinisikan. Jangan mengurangi semua aspek menjadi satu angka bila downside bersifat non-linear atau veto.

## C.3 Reversibility Heuristic

- **Reversible:** perubahan dapat dibalik dalam satu release tanpa data loss atau contract break.
- **Costly reversal:** memerlukan migration, downtime, dual-run, atau consumer coordination material.
- **Effectively irreversible:** menghasilkan external commitment, data transformation tidak dapat balik, widespread contract adoption, atau regulatory exposure.

Semakin sulit reversal, semakin tinggi evidence dan approval burden.

## C.4 Buy vs Build Questions

- Apakah differentiating capability atau commodity?
- Apakah vendor memenuhi data, security, residency, audit, dan exit requirements?
- Berapa total cost termasuk integration, operations, support, dan exit?
- Apakah team memiliki skill dan capacity untuk ownership jangka panjang?
- Apakah API/data export cukup untuk menghindari lock-in yang tidak diterima?
- Apakah provider failure menghilangkan core business capability?

---

# Appendix D — ADR Review Comment Format

```markdown
### REV-{{NNN}} — {{SHORT_TITLE}}

- **Reviewer:** {{NAME_OR_ROLE}}
- **Date:** {{YYYY-MM-DD}}
- **Severity:** BLOCKER | MAJOR | MINOR | QUESTION
- **Affected section / IDs:** {{SECTION_OR_IDS}}
- **Observation:** {{FACTUAL_ISSUE}}
- **Why it matters:** {{DECISION_IMPLEMENTATION_OR_RISK_IMPACT}}
- **Required change:** {{SPECIFIC_CHANGE_OR_DECISION}}
- **Resolution:** OPEN | ACCEPTED | REJECTED_WITH_RATIONALE | RESOLVED
- **Evidence / response:** {{DETAIL}}
```

Review comment harus mengidentifikasi defect atau missing decision secara spesifik, bukan preferensi gaya tanpa consequence.

---

# Appendix E — ADR Index Template

Bila organisasi menggunakan central ADR index, simpan di `{{ADR_DIRECTORY}}/README.md` atau location yang disepakati. Bila tidak, tandai `N/A` dan pastikan linked FSD tetap menjadi entry point.

| ADR | Title | Status | Decision Date | Scope | Owner | Supersedes | Review By |
|---|---|---|---|---|---|---|---|
| ADR-0001 | {{TITLE}} | ACCEPTED | {{DATE}} | {{SCOPE}} | {{OWNER}} | — | {{DATE/EVENT}} |

Recommended directory:

```text
docs/
└── architecture/
    ├── README.md
    ├── ADR-0001-{{slug}}.md
    ├── ADR-0002-{{slug}}.md
    └── evidence/
        ├── ADR-0001/
        │   ├── benchmark.md
        │   ├── spike-results.json
        │   └── diagrams/
        └── ADR-0002/
```

File naming:

```text
ADR-{{4_DIGIT_ID}}-{{lowercase-kebab-case-title}}.md
```

Jangan mengganti nomor ADR lama atau menghapus ADR rejected/superseded dari index.

---

# Appendix F — Minimal Architecture Decision Brief

Gunakan untuk keputusan kecil/reversible ketika catatan terpisah tetap bernilai. Pertimbangkan ADR penuh bila review menemukan cross-system impact, security/data implication, lock-in, migration, atau significant uncertainty; bila tidak, `TDEC-*` di FSD tetap valid.

```markdown
---
adr_id: "ADR-{{NNNN}}"
title: "{{TITLE}}"
status: "PROPOSED"
owner: "{{OWNER}}"
date: "{{YYYY-MM-DD}}"
reversibility: "REVERSIBLE"
---

# ADR-{{NNNN}} — {{TITLE}}

## Context

{{FACTUAL_PROBLEM_AND_SCOPE}}

## Constraints

- {{CONSTRAINT_WITH_SOURCE}}

## Options

1. **OPT-001 — {{NAME}}:** {{SUMMARY_AND_TRADEOFF}}
2. **OPT-002 — {{NAME}}:** {{SUMMARY_AND_TRADEOFF}}
3. **OPT-000 — Status quo:** {{CONSEQUENCE}}

## Decision

> Sistem **WAJIB** {{NORMATIVE_DECISION}} dan **DILARANG** {{PROHIBITED_BEHAVIOR}}.

## Rationale

{{WHY_THIS_OPTION_WINS_IN_THIS_CONTEXT}}

## Consequences

- Positive: {{EFFECT}}
- Negative: {{EFFECT}}
- Risk: {{RISK_AND_MITIGATION}}

## Implementation Obligations

- {{CHANGE_AND_OWNER}}

## Verification

- {{TEST_OR_FITNESS_FUNCTION}}

## Review Trigger

- {{DATE_OR_EVENT}}
```

---

# Appendix G — ADR Discovery Questions

## Context dan Scope

- Keputusan apa yang benar-benar perlu dibuat sekarang?
- Apa yang terjadi bila tidak ada keputusan?
- Batas sistem, data, organisasi, dan waktu apa yang relevan?
- Requirement upstream mana yang tidak boleh berubah?

## Constraints dan Drivers

- Mana yang merupakan hukum/policy/hard constraint dan mana yang hanya preference?
- Workload dan failure envelope apa yang harus ditanggung?
- Apa source of truth dan invariant yang harus dipertahankan?
- Downside mana yang tidak dapat diterima meskipun score total tinggi?

## Options dan Evidence

- Apa status quo?
- Opsi viable apa yang mungkin tidak disukai penulis?
- Evidence apa yang benar-benar membedakan pilihan?
- Klaim mana yang hanya berasal dari vendor atau intuition?
- Spike termurah apa yang dapat mengurangi uncertainty terbesar?

## Consequences dan Operations

- Siapa yang akan mengoperasikan, membayar, merespons incident, dan melakukan migration?
- Failure baru apa yang diperkenalkan?
- Apa exit path bila keputusan salah atau vendor berubah?
- Architecture property apa yang dapat drift dan bagaimana CI/runtime mendeteksinya?

## Agentic Implementation

- Keputusan apa yang masih dapat ditafsirkan berbeda oleh dua coding agent?
- Apakah agent dapat mengganti provider/pattern atas nama simplifikasi?
- Apakah goal dapat diverifikasi tanpa manual intuition?
- Stop condition apa yang mencegah workaround berbahaya?

---

# Appendix H — Final Sign-Off Record

| Role | Name | Decision | Date | Signature / Reference | Conditions Closed? |
|---|---|---|---|---|---:|
| Decision owner |  |  |  |  |  |
| Technical/architecture |  |  |  |  |  |
| Product/business |  |  |  |  |  |
| Security/privacy |  |  |  |  |  |
| Operations |  |  |  |  |  |
| Data owner |  |  |  |  |  |
| Finance/procurement |  |  |  |  |  |

**Final status:** `{{STATUS}}`  
**Effective date:** `{{YYYY-MM-DD}}`  
**Next review:** `{{YYYY-MM-DD_OR_EVENT}}`  
**Supersession link:** `{{ADR_ID_OR_NONE}}`
