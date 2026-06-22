---
template_name: "Product Requirements Document — BRD→PRD→FSD Agentic Delivery Ready"
template_version: "2.0.0"
artifact_contract_version: "1.0.0"
document_type: "PRD"
project_name: "{{PROJECT_NAME}}"
project_code: "{{PROJECT_CODE}}"
document_id: "PRD-{{PROJECT_CODE}}"
version: "{{PRD_VERSION}}"
status: "DRAFT" # DRAFT | IN_REVIEW | APPROVED | SUPERSEDED
product_owner: "{{NAME_OR_ROLE}}"
business_owner: "{{NAME_OR_ROLE}}"
security_compliance_owner: "{{NAME_OR_ROLE_OR_NA}}"
data_privacy_owner: "{{NAME_OR_ROLE_OR_NA}}"
target_release: "{{RELEASE_OR_MILESTONE}}"
default_locale: "{{LOCALE_EG_id-ID}}"
default_timezone: "{{IANA_TIMEZONE_EG_Asia/Jakarta}}"
document_classification: "{{PUBLIC_INTERNAL_CONFIDENTIAL_RESTRICTED}}"
last_updated: "{{YYYY-MM-DD}}"
canonical_delivery_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
adr_policy: "OPTIONAL_CONDITIONAL"
upstream_artifacts:
  required:
    - "BRD-{{PROJECT_CODE}}"
  supporting:
    - "{{BUSINESS_CASE_RESEARCH_POLICY_OR_EVIDENCE_SOURCE}}"
downstream_artifacts:
  required:
    - "FSD-{{PROJECT_CODE}}"
  optional: [] # Add ADR IDs only when an optional ADR is actually used
---

# {{PROJECT_NAME}} — Product Requirements Document

> **Cara menggunakan template**
>
> 1. Ganti seluruh `{{PLACEHOLDER}}` dengan keputusan atau data nyata.
> 2. Jangan meninggalkan `TBD`, `nanti`, `sesuai kebutuhan`, `cepat`, `aman`, `optimal`, `user-friendly`, atau istilah ambigu lain tanpa ukuran dan pemilik keputusan.
> 3. Bagian yang tidak relevan harus ditulis `N/A — {{ALASAN}}`; jangan dihapus diam-diam.
> 4. Setiap requirement yang disetujui harus memiliki ID stabil. Jangan mengubah ID hanya karena urutan dokumen berubah.
> 5. PRD menetapkan **mengapa**, **apa**, **untuk siapa**, **batas**, dan **hasil yang harus terlihat**. Detail implementasi seperti schema fisik, endpoint, library, queue, locking, dan deployment ditetapkan di FSD.
> 6. ADR adalah sidecar **opsional** untuk keputusan arsitektur material; PRD tidak boleh bergantung pada keberadaan ADR agar dapat diteruskan ke FSD.
> 7. PRD tidak boleh disetujui apabila masih ada keputusan produk berstatus `BLOCKER` yang dibutuhkan oleh release.

---

# 0. Kontrak Operasional PRD

## 0.1 Tujuan Dokumen

PRD ini adalah sumber kebenaran untuk intent produk `{{PROJECT_NAME}}`. Dokumen ini mendefinisikan masalah, pengguna, outcome, ruang lingkup, kebijakan bisnis, perilaku produk yang dapat diamati, acceptance criteria, guardrail, dan ukuran keberhasilan.

PRD ini dianggap cukup lengkap ketika tim product, design, engineering, QA, security/compliance, operations, serta agent penyusun FSD dapat melanjutkan pekerjaan tanpa menciptakan sendiri:

- masalah atau tujuan baru;
- aktor, role, hak akses, atau authority boundary baru;
- business rule, enum, status, atau state transition baru;
- asumsi data, tanggal, unit, klasifikasi, atau ownership baru;
- perilaku pada error, data kosong, duplicate, stale data, dan partial failure;
- definisi sukses yang tidak tertulis.

## 0.2 Batas Otoritas dan Relasi BRD, PRD, FSD, serta ADR Opsional

### 0.2.1 Jalur Artifact Canonical

```text
BRD → PRD → FSD → GOAL → IMPLEMENTATION → VERIFICATION
                 ↘ ADR (opsional, sidecar keputusan arsitektur)
```

PRD harus dapat di-handoff langsung ke FSD. ADR tidak boleh menjadi dependency tersembunyi. FSD melakukan applicability assessment dan memilih salah satu:

- `NOT_REQUIRED`: tidak ada ADR; keputusan teknis material dicatat sebagai `TDEC-*` di FSD;
- `LINKED`: satu atau lebih ADR `ACCEPTED` ditautkan untuk delegated architecture decisions;
- `BLOCKED_BY_POLICY`: policy proyek secara eksplisit mewajibkan ADR tertentu dan ADR tersebut belum `ACCEPTED`.

### 0.2.2 Authority Matrix

| Jenis Keputusan | BRD | PRD | FSD | ADR opsional |
|---|---:|---:|---:|---:|
| Business problem, outcome, benefit, dan business boundary | **Authoritative** | Menerjemahkan | Referensi | Tidak mengubah |
| Product problem framing, user, dan outcome produk | Constraint | **Authoritative** | Referensi | Tidak mengubah |
| Scope, non-goal, priority, dan release slice | Business boundary | **Authoritative** | Menerjemahkan | Tidak mengubah |
| Business rule dan product policy | Business authority | **Authoritative untuk observable behavior** | Mengimplementasikan | Tidak mengubah |
| Role, permission intent, dan approval authority | Business authority | **Authoritative** | Merinci enforcement | Tidak mengubah |
| Logical domain terms, enum intent, dan product state | Constraint | **Authoritative** | Merinci persistence | Tidak mengubah |
| Physical schema, API, event, job, concurrency | Tidak menetapkan | Constraint saja | **Authoritative** | Menetapkan pattern/boundary bila digunakan |
| Architecture, framework, library, dan topology | Constraint bisnis | Constraint produk | **Authoritative melalui `TDEC-*` bila tanpa ADR** | **Authoritative dalam delegated scope bila `ACCEPTED` dan linked** |
| Test implementation dan verification commands | Business acceptance | Acceptance intent | **Authoritative** | Menetapkan fitness function bila linked |
| Deployment, migration, dan rollback teknis | Business gate | Product gate | **Authoritative** | Dapat menetapkan constraint/pattern bila linked |

### 0.2.3 Precedence

1. Hukum, kontrak, regulator, dan approved policy/security baseline.
2. BRD `APPROVED` untuk business intent dan business boundary.
3. PRD `APPROVED` untuk product intent dan product boundary.
4. ADR `ACCEPTED`, **bila ada dan linked**, untuk delegated architecture decision.
5. FSD `APPROVED` untuk implementation contract; `TDEC-*` berlaku saat ADR tidak digunakan.
6. Repository convention untuk pilihan lokal yang belum ditetapkan.
7. Task, prompt, atau `/goal`.

FSD atau ADR tidak boleh mengubah outcome, scope, business rule, role authority, atau acceptance criteria BRD/PRD tanpa approved change request. Konflik antarbagian tidak boleh diselesaikan diam-diam; catat pada **Conflict and Resolution Ledger**.

## 0.3 Audiens

| Audiens | Penggunaan Utama |
|---|---|
| Sponsor / Business Owner | Menyetujui nilai bisnis, risiko, dan outcome |
| Product Owner | Menjaga scope, priority, dan product policy |
| Product Designer | Menurunkan journey dan interaction requirements |
| Technical Lead / Architect | Menyusun FSD dan menilai apakah ADR opsional diperlukan tanpa mengarang rule produk |
| Developer / Coding Agent | Memahami intent dan constraint melalui FSD terverifikasi |
| QA / Test Agent | Menurunkan scenario, oracle, dan release evidence |
| Security / Compliance / Privacy | Memverifikasi control intent dan data boundary |
| Operations / Support | Menyiapkan rollout, support, dan failure communication |

## 0.4 Bahasa Normatif

- **MUST / WAJIB**: mandatory untuk release yang didefinisikan.
- **MUST NOT / DILARANG**: perilaku yang tidak boleh terjadi.
- **SHOULD / SEHARUSNYA**: ekspektasi kuat; pengecualian membutuhkan keputusan tertulis.
- **MAY / BOLEH**: opsional dan tidak boleh mengubah outcome wajib.
- **Source of truth**: satu pemilik otoritatif atas suatu data atau keputusan.
- **Business invariant**: kondisi produk/bisnis yang harus selalu benar.
- **Observable behavior**: hasil yang dapat dilihat atau diverifikasi oleh user, sistem eksternal, audit, atau test.
- **Release slice**: bagian scope yang benar-benar dikirim pada release ini.

## 0.5 Kebijakan Placeholder dan Open Item

`TBD` tanpa struktur dilarang. Gunakan format berikut:

| ID | Pertanyaan / Keputusan yang Belum Ada | Kelas | Dampak | Requirement / Feature Terdampak | Owner | Fallback Aman yang Disetujui | Deadline Keputusan | Status |
|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | BLOCKER / NON_BLOCKER | {{IMPACT}} | {{IDS}} | {{OWNER}} | {{FALLBACK_OR_NONE}} | {{YYYY-MM-DD_OR_GATE}} | OPEN |

Aturan:

- `BLOCKER`: release atau feature tidak dapat dinyatakan ready sebelum keputusan selesai.
- `NON_BLOCKER`: hanya boleh memakai fallback yang ditulis eksplisit.
- Agent, developer, designer, atau QA tidak boleh menciptakan fallback baru.
- Item `RESOLVED` harus mencatat keputusan final, approver, tanggal, dan requirement yang berubah.

## 0.6 Konvensi ID Stabil

| Prefix | Arti | Contoh |
|---|---|---|
| SRC | Source artifact / evidence | SRC-001 |
| PROB | Problem statement | PROB-001 |
| EVD | Bukti / baseline | EVD-001 |
| OBJ | Objective | OBJ-001 |
| OUT | Target outcome | OUT-001 |
| PRINC | Product principle | PRINC-001 |
| SCOPE | Batas scope | SCOPE-001 |
| SCOPE-NG | Explicit non-goal | SCOPE-NG-001 |
| ACT | Actor / role | ACT-001 |
| JTBD | Job to be done | JTBD-001 |
| JOURNEY | End-to-end user journey | JOURNEY-001 |
| FEAT | Feature / capability | FEAT-001 |
| US | User story | US-001 |
| BR | Business rule | BR-001 |
| INV | Business invariant | INV-001 |
| FR | Functional product requirement | FR-001 |
| AC | Acceptance criterion | AC-001 |
| NFR | Non-functional requirement | NFR-001 |
| SEC | Security requirement | SEC-001 |
| PRIV | Privacy requirement | PRIV-001 |
| COMP | Compliance requirement | COMP-001 |
| AI | AI / automation requirement | AI-001 |
| NOTIF | Notification requirement | NOTIF-001 |
| REPORT | Report / export requirement | REPORT-001 |
| METRIC | Metric definition | METRIC-001 |
| EVENT | Product analytics event | EVENT-001 |
| DEP | Dependency | DEP-001 |
| ASSUMP | Assumption | ASSUMP-001 |
| CONSTR | Constraint | CONSTR-001 |
| DEC | Product decision | DEC-001 |
| CONFLICT | Konflik requirement | CONFLICT-001 |
| RISK | Product / delivery risk | RISK-001 |
| OPEN | Open decision | OPEN-001 |
| UAT | User acceptance scenario | UAT-001 |

ID yang telah disetujui tidak boleh digunakan ulang untuk arti lain. Requirement yang dibatalkan diberi status `RETIRED`, bukan dihapus dari history.

### 0.6.1 Referensi Lintas Artifact

ID lokal boleh digunakan di dalam PRD. Referensi ke BRD, FSD, atau ADR opsional **WAJIB** menggunakan:

```text
{{DOCUMENT_ID}}#{{LOCAL_ID}}
{{DOCUMENT_ID}}@{{VERSION}}#{{LOCAL_ID}}   # untuk snapshot yang dipin
```

Contoh: `BRD-CCC#BREQ-001`, `PRD-CCC#FR-014`, `FSD-CCC#TDEC-003`, `ADR-0042#DEC-001`. Jangan menulis `FR-001` lintas dokumen tanpa document namespace.

## 0.7 Aturan Kualitas untuk Mencegah AI Slop

PRD yang disetujui harus mematuhi aturan berikut:

1. Setiap feature memetakan ke minimal satu `PROB`, `OBJ`, dan `OUT`.
2. Setiap requirement menyatakan satu perilaku yang dapat diamati; hindari menggabungkan banyak perilaku dengan kata “dan” apabila masing-masing dapat gagal sendiri.
3. Kata sifat seperti cepat, aman, mudah, real-time, akurat, scalable, dan robust harus memiliki target, kondisi pengukuran, serta sumber bukti.
4. Requirement tidak boleh menggunakan “dan lain-lain”, “etc.”, “sebagaimana mestinya”, atau daftar terbuka untuk perilaku mandatory.
5. Setiap rule ditulis satu kali sebagai canonical rule dan direferensikan dari feature lain; jangan duplikasi rule dengan wording berbeda.
6. Enum, status, role, dan state transition harus memakai nama canonical yang sama di seluruh dokumen.
7. Acceptance criteria harus mencakup happy path serta negative/edge path yang material.
8. Hak akses harus ditulis sebagai aksi yang diizinkan dan dilarang, bukan hanya daftar role.
9. Automation atau AI tidak boleh memiliki authority implisit. Jelaskan keputusan mana yang bersifat advisory, deterministic, human-approved, atau autonomous.
10. “Berhasil” harus disertai output, state akhir, side effect, dan evidence yang diharapkan.
11. “Gagal” harus disertai perilaku user-facing, preservation of prior state, retry/recovery expectation, dan audit/notification bila relevan.
12. Asumsi harus dapat diverifikasi dan memiliki owner; asumsi kritis yang belum terbukti menjadi `OPEN` atau `RISK`.
13. Contoh tidak boleh menggantikan rule. Contoh harus konsisten dengan rule canonical.
14. Setiap non-goal harus eksplisit agar agent tidak “melengkapi” fitur di luar scope.
15. FSD tidak boleh dipaksa menebak product semantics dari mockup, nama tabel, atau perilaku sistem lama.

## 0.8 Gate Persetujuan PRD

PRD hanya dapat berstatus `APPROVED` jika:

- [ ] Problem dan impact didukung bukti atau diberi label hipotesis yang akan divalidasi.
- [ ] User, actor, role, ownership, dan approval authority jelas.
- [ ] Objective, outcome, baseline, target, dan measurement source tersedia.
- [ ] In-scope, out-of-scope, non-goal, serta release slice eksplisit.
- [ ] Semua feature memiliki stable ID dan priority.
- [ ] Business rule, canonical state, enum, date/unit semantics, dan precedence tidak bertentangan.
- [ ] Acceptance criteria mencakup happy, negative, authorization, empty, duplicate, stale, dan failure path yang relevan.
- [ ] Security, privacy, compliance, audit, classification, retention, dan AI authority boundary telah dinilai.
- [ ] NFR memiliki target terukur dan konteks beban/penggunaan.
- [ ] Dependency, constraint, assumption, risk, dan degraded behavior tercatat.
- [ ] Tidak ada `BLOCKER` yang dibutuhkan release masih `OPEN`.
- [ ] UAT dan release acceptance dapat ditelusuri ke requirement.
- [ ] Handoff manifest ke FSD lengkap dan tidak memuat konflik.
- [ ] Seluruh placeholder telah diganti atau diberi `N/A — alasan`.

---

# 1. Kontrol Dokumen dan Traceability

## 1.1 Metadata Dokumen

| Field | Nilai |
|---|---|
| Project | `{{PROJECT_NAME}}` |
| Project code | `{{PROJECT_CODE}}` |
| PRD ID | `PRD-{{PROJECT_CODE}}` |
| Version | `{{PRD_VERSION}}` |
| Status | `{{DRAFT / IN_REVIEW / APPROVED / SUPERSEDED}}` |
| Product Owner | `{{NAME_OR_ROLE}}` |
| Business Owner / Sponsor | `{{NAME_OR_ROLE}}` |
| Security / Compliance Owner | `{{NAME_OR_ROLE_OR_NA}}` |
| Privacy / Data Owner | `{{NAME_OR_ROLE_OR_NA}}` |
| Target release | `{{RELEASE_OR_MILESTONE}}` |
| Default locale | `{{LOCALE}}` |
| Default timezone | `{{IANA_TIMEZONE}}` |
| Classification | `{{CLASSIFICATION}}` |
| Last updated | `{{YYYY-MM-DD}}` |

## 1.2 Source Artifacts dan Evidence

| Source ID | Artifact / Evidence | Version / Tanggal | Owner | Otoritas / Tujuan | Bagian Relevan | Status |
|---|---|---|---|---|---|---|
| SRC-001 | `BRD-{{PROJECT_CODE}}` | {{VERSION_DATE}} | {{BUSINESS_OWNER}} | **Authoritative business intent, scope, rule, dan acceptance** | {{SECTION}} | APPROVED |
| SRC-002 | `{{RESEARCH_BASELINE_OR_BUSINESS_CASE}}` | {{VERSION_DATE}} | {{OWNER}} | Problem/evidence | {{SECTION}} | VERIFIED |
| SRC-003 | `{{POLICY_STANDARD_CONTRACT}}` | {{VERSION_DATE}} | {{OWNER}} | Policy/compliance | {{SECTION}} | VERIFIED |
| SRC-004 | `{{CURRENT_SYSTEM_OR_PROCESS_DOC}}` | {{VERSION_DATE}} | {{OWNER}} | Current-state reference | {{SECTION}} | REFERENCE |
| SRC-005 | `{{ADR_ID_OR_NONE}}` | {{VERSION_DATE_OR_NA}} | {{DECISION_OWNER_OR_NA}} | Optional architecture decision; not required for PRD approval | {{SECTION_OR_NA}} | N/A / ACCEPTED |

Klasifikasi status source:

- `APPROVED`: artifact otoritatif telah disetujui.
- `VERIFIED`: sumber telah diperiksa dan dapat menjadi dasar requirement.
- `REFERENCE`: memberi konteks tetapi bukan authority final.
- `HYPOTHESIS`: belum tervalidasi; harus terkait eksperimen atau open item.
- `SUPERSEDED`: tidak lagi berlaku dan tidak boleh dipakai untuk keputusan baru.
- `N/A`: artifact opsional tidak digunakan; bukan blocker.

## 1.3 Riwayat Revisi

| Version | Tanggal | Author | Ringkasan Perubahan | ID Terdampak | Approver |
|---|---|---|---|---|---|
| 0.1 | {{YYYY-MM-DD}} | {{AUTHOR}} | Initial draft | All | Pending |

## 1.4 Approval

| Role | Nama | Keputusan | Tanggal | Catatan |
|---|---|---|---|---|
| Business Owner / Sponsor |  | PENDING |  |  |
| Product Owner |  | PENDING |  |  |
| Technical Lead |  | PENDING |  | Validasi implementability, bukan mengubah intent |
| QA Lead |  | PENDING |  | Validasi testability |
| Security / Compliance |  | PENDING / N/A |  |  |
| Privacy / Data Owner |  | PENDING / N/A |  |  |
| Operations / Support |  | PENDING / N/A |  |  |

## 1.5 Decision Log

| Decision ID | Keputusan Produk | Opsi yang Dipertimbangkan | Rationale | ID Terdampak | Approver | Tanggal | Status |
|---|---|---|---|---|---|---|---|
| DEC-001 | {{DECISION}} | {{OPTIONS}} | {{RATIONALE}} | {{IDS}} | {{APPROVER}} | {{YYYY-MM-DD}} | APPROVED |

## 1.6 Conflict and Resolution Ledger

| Conflict ID | Pernyataan yang Bertentangan | Source / ID | Dampak | Keputusan Canonical | Teks / ID yang Disupersede | Approver | Tanggal |
|---|---|---|---|---|---|---|---|
| CONFLICT-001 | {{CONFLICT}} | {{SOURCE_IDS}} | {{IMPACT}} | {{RESOLUTION}} | {{SUPERSEDED_IDS}} | {{APPROVER}} | {{YYYY-MM-DD}} |

## 1.7 Requirement Inventory

Gunakan tabel ini sebagai indeks canonical. Detail requirement tetap berada di feature atau bagian cross-cutting.

| Requirement ID | Judul Singkat | Type | Feature / Section | Priority | Release | Status | Owner |
|---|---|---|---|---|---|---|---|
| FR-001 | {{TITLE}} | Functional | FEAT-001 | MUST | {{RELEASE}} | DRAFT | {{OWNER}} |
| NFR-001 | {{TITLE}} | Performance | Cross-cutting | MUST | {{RELEASE}} | DRAFT | {{OWNER}} |

Status requirement: `DRAFT`, `IN_REVIEW`, `APPROVED`, `DEFERRED`, `RETIRED`.

---

# 2. Ringkasan Eksekutif

## 2.1 Ringkasan Satu Paragraf

`{{DALAM 4–7 KALIMAT: SIAPA YANG MENGALAMI MASALAH, MASALAH APA, DAMPAKNYA, CAPABILITY YANG DIUSULKAN, RELEASE SLICE, DAN OUTCOME UTAMA. HINDARI DETAIL IMPLEMENTASI.}}`

## 2.2 Snapshot Produk

| Aspek | Ringkasan |
|---|---|
| Primary users | {{USERS}} |
| Problem utama | {{PROBLEM}} |
| Proposed capability | {{CAPABILITY}} |
| Business value | {{VALUE}} |
| Release slice | {{MVP_OR_RELEASE_SCOPE}} |
| Critical guardrail | {{GUARDRAIL}} |
| Keputusan blocker | {{NONE_OR_OPEN_IDS}} |

## 2.3 Product Pitch

**Untuk** `{{TARGET_USER}}`  
**yang** `{{HAS_THIS_PROBLEM_OR_JOB}}`,  
**produk ini** `{{PRODUCT_CATEGORY_OR_CAPABILITY}}`  
**yang memungkinkan** `{{PRIMARY_OUTCOME}}`.  
**Berbeda dari** `{{CURRENT_WORKAROUND_OR_ALTERNATIVE}}`,  
**produk ini** `{{DIFFERENTIATOR_WITHOUT_MARKETING_HYPE}}`.

---

# 3. Konteks, Problem, dan Evidence

## 3.1 Konteks Bisnis / Operasional

`{{JELASKAN KONTEKS ORGANISASI, PROSES, REGULASI, PASAR, ATAU SISTEM YANG MEMBUAT MASALAH RELEVAN.}}`

## 3.2 Problem Statements

Tulis masalah, bukan solusi.

| Problem ID | Actor Terdampak | Kondisi / Trigger | Masalah | Dampak Terukur | Frekuensi | Evidence IDs | Confidence |
|---|---|---|---|---|---|---|---|
| PROB-001 | {{ACTOR}} | {{WHEN}} | {{PROBLEM}} | {{COST_DELAY_RISK_ERROR}} | {{FREQUENCY}} | EVD-001 | HIGH / MEDIUM / LOW |

Format yang disarankan:

> Ketika `{{CONTEXT}}`, `{{ACTOR}}` tidak dapat `{{JOB}}` karena `{{ROOT_CAUSE_OR_CONSTRAINT}}`, sehingga `{{MEASURABLE_IMPACT}}`.

## 3.3 Evidence dan Baseline

| Evidence ID | Mendukung Problem | Jenis Evidence | Baseline / Temuan | Sample / Periode | Source | Keterbatasan |
|---|---|---|---|---|---|---|
| EVD-001 | PROB-001 | Analytics / Interview / Audit / Incident / Cost | {{FINDING}} | {{SAMPLE_WINDOW}} | SRC-001 | {{LIMITATION}} |

Jangan mengubah korelasi menjadi kausalitas tanpa bukti. Temuan yang belum tervalidasi harus diberi label hipotesis.

## 3.4 Root Cause vs Symptom

| ID | Pernyataan | Kategori | Bukti | Implikasi Produk |
|---|---|---|---|---|
| RC-001 | {{STATEMENT}} | ROOT_CAUSE / CONTRIBUTOR / SYMPTOM | {{EVIDENCE}} | {{IMPLICATION}} |

## 3.5 Current Workflow dan Workaround

| Langkah | Actor | Aktivitas Saat Ini | Tool / Channel | Pain / Risiko | Waktu / Biaya |
|---|---|---|---|---|---|
| 1 | {{ACTOR}} | {{ACTIVITY}} | {{TOOL}} | {{PAIN}} | {{TIME_COST}} |

## 3.6 Alternatif yang Ada

| Alternatif | Kelebihan | Kekurangan | Mengapa Belum Cukup | Dipertahankan / Diganti |
|---|---|---|---|---|
| Manual process | {{PROS}} | {{CONS}} | {{GAP}} | {{DECISION}} |
| Existing system | {{PROS}} | {{CONS}} | {{GAP}} | {{DECISION}} |
| Do nothing | {{PROS}} | {{CONS}} | {{RISK}} | {{DECISION}} |

## 3.7 Why Now

`{{JELASKAN PEMICU WAKTU: RISIKO, DEADLINE REGULASI, COST CURVE, CUSTOMER COMMITMENT, PLATFORM CHANGE, ATAU CAPABILITY BARU.}}`

## 3.8 Opportunity Statement

`{{JELASKAN NILAI YANG MUNGKIN TERCIPTA JIKA PROBLEM DISELESAIKAN, TANPA MENJAMIN HASIL YANG BELUM TERBUKTI.}}`

---

# 4. Visi, Objective, Outcome, dan Product Principles

## 4.1 Product Vision

`{{SATU ATAU DUA KALIMAT TENTANG KONDISI MASA DEPAN YANG INGIN DICAPAI.}}`

## 4.2 Objectives dan Measurable Outcomes

| Objective ID | Objective | Baseline | Target Outcome | Measurement Source | Window | Owner |
|---|---|---:|---:|---|---|---|
| OBJ-001 | {{OBJECTIVE}} | {{BASELINE}} | {{TARGET}} | {{SOURCE}} | {{WINDOW}} | {{OWNER}} |

Pisahkan output dari outcome:

| Outcome ID | Objective | Outcome yang Diharapkan | Leading Indicator | Lagging Indicator | Target | Guardrail |
|---|---|---|---|---|---|---|
| OUT-001 | OBJ-001 | {{OUTCOME}} | {{LEADING}} | {{LAGGING}} | {{TARGET}} | {{MUST_NOT_WORSEN}} |

## 4.3 Product Principles

| Principle ID | Prinsip | Implikasi pada Keputusan Produk | Non-Example |
|---|---|---|---|
| PRINC-001 | {{PRINCIPLE}} | {{IMPLICATION}} | {{WHAT_VIOLATES_IT}} |

Contoh prinsip yang boleh dipakai bila relevan:

- Human authority untuk keputusan berisiko tinggi.
- Fail-closed untuk data rahasia.
- Satu source of truth untuk derived state.
- Tidak ada silent failure.
- Progressive disclosure, bukan menyembunyikan evidence.
- Graceful degradation untuk dependency non-kritis.

## 4.4 Guardrail Metrics

| Metric ID | Guardrail | Baseline | Batas Maksimum / Minimum | Measurement | Aksi Jika Terlanggar |
|---|---|---:|---:|---|---|
| METRIC-001 | {{METRIC}} | {{BASELINE}} | {{THRESHOLD}} | {{SOURCE}} | {{ACTION}} |

---

# 5. Scope, Non-Goals, dan Release Slice

## 5.1 Scope Boundary Matrix

| Dimensi | In Scope | Out of Scope | Future Consideration |
|---|---|---|---|
| Users / roles | {{IN}} | {{OUT}} | {{FUTURE}} |
| Business unit / tenant | {{IN}} | {{OUT}} | {{FUTURE}} |
| Geography / jurisdiction | {{IN}} | {{OUT}} | {{FUTURE}} |
| Channels / platforms | {{IN}} | {{OUT}} | {{FUTURE}} |
| Data types | {{IN}} | {{OUT}} | {{FUTURE}} |
| Workflow stages | {{IN}} | {{OUT}} | {{FUTURE}} |
| Integrations | {{IN}} | {{OUT}} | {{FUTURE}} |
| Reporting | {{IN}} | {{OUT}} | {{FUTURE}} |
| Historical data | {{IN}} | {{OUT}} | {{FUTURE}} |

## 5.2 In-Scope Capabilities

| Scope ID | Capability | Outcome | Feature IDs | Priority | Release |
|---|---|---|---|---|---|
| SCOPE-001 | {{CAPABILITY}} | OUT-001 | FEAT-001 | MUST | {{RELEASE}} |

## 5.3 Explicit Non-Goals

| Scope ID | Non-Goal | Alasan | Risiko Salah Persepsi | Future Trigger |
|---|---|---|---|---|
| SCOPE-NG-001 | {{NOT_DELIVERED}} | {{REASON}} | {{WHAT_AGENT_TEAM_MIGHT_ASSUME}} | {{WHEN_REVISIT}} |

Non-goal harus cukup spesifik untuk mencegah tim atau coding agent mengimplementasikan “fitur pelengkap” yang tidak diminta.

## 5.4 Release Slice

| Release / Phase | Feature IDs | User Segment | Data Scope | Entry Criteria | Exit Criteria |
|---|---|---|---|---|---|
| {{MVP}} | {{FEAT_IDS}} | {{SEGMENT}} | {{DATA_SCOPE}} | {{ENTRY}} | {{EXIT}} |

## 5.5 Prioritization

Gunakan satu skema yang konsisten.

| Feature ID | Priority | Rationale | Cost / Complexity Signal | Dependency | Deferral Consequence |
|---|---|---|---|---|---|
| FEAT-001 | MUST / SHOULD / COULD / WONT | {{RATIONALE}} | S / M / L / XL | {{DEP_IDS}} | {{IMPACT}} |

## 5.6 Constraints

| Constraint ID | Constraint | Jenis | Source | Dampak ke Produk | Dapat Dinegosiasikan? |
|---|---|---|---|---|---|
| CONSTR-001 | {{CONSTRAINT}} | Legal / Contract / Budget / Timeline / Platform / Policy | SRC-002 | {{IMPACT}} | YES / NO |

## 5.7 Assumptions

| Assumption ID | Assumption | Evidence Saat Ini | Owner Verifikasi | Validasi / Deadline | Dampak Jika Salah | Status |
|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | {{EVIDENCE}} | {{OWNER}} | {{METHOD_DATE}} | {{IMPACT}} | UNVERIFIED |

Assumption dengan dampak tinggi dan bukti rendah harus dikonversi menjadi `OPEN` atau `RISK`.

## 5.8 Dependencies

| Dependency ID | Dependency | Owner Eksternal | Dibutuhkan Oleh | Contract / Expected Outcome | Needed By | Failure / Degraded Behavior | Status |
|---|---|---|---|---|---|---|---|
| DEP-001 | {{DEPENDENCY}} | {{OWNER}} | {{FEATURE_IDS}} | {{OUTCOME}} | {{DATE_GATE}} | {{BEHAVIOR}} | UNCONFIRMED |

---

# 6. Users, Actors, Roles, dan Authority

## 6.1 Actor Catalog

| Actor ID | Actor / Role | Tujuan Utama | Tanggung Jawab | Data Scope | Authority Boundary | Volume / Frequency |
|---|---|---|---|---|---|---|
| ACT-001 | {{ROLE}} | {{GOAL}} | {{RESPONSIBILITY}} | {{SCOPE}} | {{CAN_AND_CANNOT_APPROVE}} | {{FREQUENCY}} |

Bedakan:

- **Persona**: pola kebutuhan/perilaku user.
- **Role**: kumpulan permission.
- **Actor**: manusia, sistem, scheduler, atau pihak eksternal yang berinteraksi.
- **Owner**: pihak accountable atas entity atau proses.
- **Approver**: pihak yang berwenang mengubah state tertentu.

## 6.2 Jobs to Be Done

| JTBD ID | Actor | Situasi | Job | Outcome yang Diinginkan | Current Alternative | Success Signal |
|---|---|---|---|---|---|---|
| JTBD-001 | ACT-001 | Ketika {{SITUATION}} | Saya ingin {{JOB}} | Agar {{OUTCOME}} | {{ALTERNATIVE}} | {{SIGNAL}} |

## 6.3 Role and Permission Intent Matrix

Tulis aksi, object scope, dan larangan. FSD akan merinci enforcement teknis.

| Capability / Action | ACT-001 | ACT-002 | System Actor | Catatan Scope / Condition |
|---|---:|---:|---:|---|
| View {{ENTITY}} | ALLOW | OWNED_ONLY | N/A | {{CONDITION}} |
| Create {{ENTITY}} | ALLOW | DENY | N/A | {{CONDITION}} |
| Approve / finalize {{STATE}} | ALLOW | DENY | DENY | Human-only |
| Export classified data | CLEARANCE_ONLY | DENY | DENY | Logged |

Gunakan nilai canonical: `ALLOW`, `DENY`, `OWNED_ONLY`, `ASSIGNED_ONLY`, `CLEARANCE_ONLY`, `SYSTEM_ONLY`, `N/A`.

## 6.4 Segregation of Duties dan Conflict of Interest

| Rule ID | Aksi Awal | Aksi Verifikasi / Approval | Boleh Actor Sama? | Exception | Audit Evidence |
|---|---|---|---:|---|---|
| BR-001 | {{CREATE_OR_SUBMIT}} | {{VERIFY_OR_CLOSE}} | YES / NO / RECOMMENDED_NO | {{EXCEPTION}} | {{EVIDENCE}} |

## 6.5 User Context dan Accessibility Needs

| Actor | Device / Environment | Connectivity | Frequency | Domain Expertise | Accessibility / Language Need |
|---|---|---|---|---|---|
| ACT-001 | {{DEVICE}} | {{NETWORK}} | {{FREQUENCY}} | {{LEVEL}} | {{NEEDS}} |

---

# 7. Domain Semantics dan Product Policies

## 7.1 Glossary Canonical

| Term | Definisi Canonical | Bukan Berarti | Source / Owner |
|---|---|---|---|
| {{TERM}} | {{DEFINITION}} | {{COMMON_MISINTERPRETATION}} | {{SOURCE_OWNER}} |

Setiap istilah domain yang dapat memengaruhi state, permission, metric, billing, compliance, atau audit harus didefinisikan.

## 7.2 Conceptual Entity Catalog

Ini adalah model konseptual, bukan schema database.

| Entity | Definisi Bisnis | Identifier Bisnis | Owner | Lifecycle Ringkas | Data Sensitivity |
|---|---|---|---|---|---|
| {{ENTITY}} | {{DEFINITION}} | {{BUSINESS_KEY}} | {{OWNER}} | {{LIFECYCLE}} | {{CLASSIFICATION}} |

## 7.3 Source-of-Truth Matrix

| Data / Decision | Source of Truth | Producer | Consumer | Update Authority | Derived or Stored | Conflict Policy |
|---|---|---|---|---|---|---|
| {{DATUM}} | {{SYSTEM_ROLE_DOCUMENT}} | {{PRODUCER}} | {{CONSUMERS}} | {{AUTHORITY}} | DERIVED / STORED | {{POLICY}} |

Satu datum tidak boleh memiliki dua source of truth. Mirror/cache harus diberi label non-authoritative.

## 7.4 Canonical Enum Catalog

| Enum / Field | Allowed Values | Definisi Tiap Nilai | Default | Unknown Handling | Owner |
|---|---|---|---|---|---|
| `{{FIELD}}` | `VALUE_A`, `VALUE_B` | {{DEFINITIONS}} | {{DEFAULT_OR_NONE}} | {{REJECT_FAIL_CLOSED_FLAG}} | {{OWNER}} |

Aturan:

- Jangan menambah sinonim seperti `CANCELLED` dan `CANCELED` untuk arti yang sama.
- Jelaskan apakah nilai bersifat terminal, temporary, system-derived, atau user-set.
- Default harus memiliki alasan dan tidak boleh membuka akses/data secara tidak sengaja.

## 7.5 Business State Machines

### 7.5.1 `{{ENTITY_OR_PROCESS}}`

```text
{{INITIAL_STATE}}
  ├─ {{ACTION / CONDITION}} → {{NEXT_STATE}}
  └─ {{ACTION / CONDITION}} → {{ALTERNATE_STATE}}

{{NEXT_STATE}}
  └─ {{ACTION / CONDITION}} → {{TERMINAL_STATE}}
```

### 7.5.2 Transition Contract

| From | Action / Trigger | Actor | Preconditions | To | Side Effect yang Terlihat | Prohibited When | Audit Required |
|---|---|---|---|---|---|---|---:|
| {{FROM}} | {{ACTION}} | ACT-001 | {{PRECONDITIONS}} | {{TO}} | {{SIDE_EFFECT}} | {{PROHIBITION}} | YES |

## 7.6 Business Rules

| Rule ID | Rule Canonical | Applies To | Priority / Precedence | Example | Non-Example | Source |
|---|---|---|---|---|---|---|
| BR-001 | {{UNAMBIGUOUS_RULE}} | {{FEATURE_ENTITY}} | {{PRECEDENCE}} | {{EXAMPLE}} | {{NON_EXAMPLE}} | {{SOURCE}} |

Business rule harus menjawab condition, decision, outcome, dan exception.

## 7.7 Business Invariants

| Invariant ID | Kondisi yang Selalu Benar | Scope | Bagaimana Dilanggar | Expected Product Response | Evidence |
|---|---|---|---|---|---|
| INV-001 | {{INVARIANT}} | {{SCOPE}} | {{VIOLATION}} | {{REJECT_ALERT_RECONCILE}} | {{EVIDENCE}} |

## 7.8 Precedence Rules

Gunakan ketika beberapa sumber atau rule dapat memberikan nilai berbeda.

| Policy ID | Data / Decision | Precedence Tertinggi → Terendah | Tie-Breaker | Fail-Safe Default | Audit / Flag |
|---|---|---|---|---|---|
| BR-101 | {{FIELD}} | {{SOURCE_A}} → {{SOURCE_B}} → {{SOURCE_C}} | {{TIE_BREAKER}} | {{DEFAULT}} | {{FLAG}} |

## 7.9 Time, Date, Locale, Number, dan Unit Semantics

| Concern | Product Rule |
|---|---|
| Default timezone | `{{IANA_TIMEZONE}}` |
| Storage/display distinction | {{PRODUCT_EXPECTATION; FSD MENETAPKAN IMPLEMENTASI}} |
| “Today” boundary | {{LOCAL_TIME_BOUNDARY}} |
| Inclusive/exclusive date | {{RULE}} |
| Business days | {{CALENDAR_SOURCE_OR_NONE}} |
| Month addition | {{END_OF_MONTH_RULE}} |
| Currency | {{ISO_CODE_AND_ROUNDING_POLICY}} |
| Decimal / percentage | {{PRECISION_AND_ROUNDING}} |
| Duration canonical unit | {{UNIT}} |
| Locale and formatting | `{{LOCALE}}` |
| Sorting/collation expectation | {{RULE}} |

## 7.10 Data Classification, Clearance, dan Retention Intent

| Classification | Definisi | Siapa Boleh Melihat | Excerpt / Export Policy | Sharing Boundary | Retention Intent | Default Jika Tidak Diketahui |
|---|---|---|---|---|---|---|
| {{CLASS}} | {{DEFINITION}} | {{ROLES_CLEARANCE}} | {{POLICY}} | {{BOUNDARY}} | {{RETENTION}} | {{FAIL_SAFE}} |

---

# 8. User Journey dan End-to-End Scenarios

## 8.1 Journey Inventory

| Journey ID | Nama Journey | Primary Actor | Trigger | Outcome | Feature IDs | Priority |
|---|---|---|---|---|---|---|
| JOURNEY-001 | {{NAME}} | ACT-001 | {{TRIGGER}} | {{OUTCOME}} | FEAT-001 | MUST |

## 8.2 Journey Specification Template

### JOURNEY-{{NNN}} — {{JOURNEY_NAME}}

#### Objective

`{{USER_OUTCOME}}`

#### Trigger

`{{EVENT_OR_USER_INTENT}}`

#### Preconditions

- {{PRECONDITION_1}}
- {{PRECONDITION_2}}

#### Main Journey

| Step | Actor / System | Action | Observable Result | Requirement IDs |
|---:|---|---|---|---|
| 1 | ACT-001 | {{ACTION}} | {{RESULT}} | FR-001 |

#### Alternative / Negative Journeys

| Scenario | Trigger / Condition | Expected Product Behavior | State Preserved / Changed | Recovery / Next Action | IDs |
|---|---|---|---|---|---|
| Unauthorized | {{CONDITION}} | Deny with clear message | No mutation | Request access | SEC-001 |
| Empty state | No data | Show actionable empty state | No mutation | {{ACTION}} | AC-002 |
| Duplicate action | Same request repeated | {{DEDUPE_OR_CONFLICT_BEHAVIOR}} | {{STATE}} | {{ACTION}} | BR-002 |
| Stale data | Source changed | {{WARN_BLOCK_REFRESH}} | {{STATE}} | {{ACTION}} | FR-003 |
| Dependency unavailable | {{DEPENDENCY}} | {{DEGRADED_BEHAVIOR}} | Preserve prior valid state | Retry / manual path | DEP-001 |

#### Postconditions

- {{POSTCONDITION_1}}
- {{POSTCONDITION_2}}

#### Evidence of Completion

- {{UI_STATE_RECORD_AUDIT_NOTIFICATION_EXPORT_OR_METRIC}}

---

# 9. Feature Specifications

> Salin seluruh paket feature ini untuk setiap capability. Satu feature harus cukup kohesif untuk dipahami, namun tidak harus sama dengan satu implementation task. Pemecahan teknis dilakukan di FSD.

## 9.1 FEAT-{{NNN}} — {{FEATURE_NAME}}

### 9.1.1 Feature Metadata

| Field | Value |
|---|---|
| Feature ID | `FEAT-{{NNN}}` |
| Priority | MUST / SHOULD / COULD / WONT |
| Release | `{{RELEASE}}` |
| Status | DRAFT / IN_REVIEW / APPROVED / DEFERRED |
| Product owner | `{{OWNER}}` |
| Related problems | `{{PROB_IDS}}` |
| Related objectives/outcomes | `{{OBJ_IDS}}`, `{{OUT_IDS}}` |
| Related journeys | `{{JOURNEY_IDS}}` |
| Primary actors | `{{ACTOR_IDS}}` |
| Dependencies | `{{DEP_IDS_OR_NONE}}` |
| Open blockers | `{{OPEN_IDS_OR_NONE}}` |

### 9.1.2 Feature Objective

`{{SATU OUTCOME YANG DICAPAI USER ATAU BISNIS.}}`

### 9.1.3 Feature Boundary

**Termasuk:**

- {{IN_SCOPE_BEHAVIOR}}

**Tidak termasuk:**

- {{OUT_OF_SCOPE_BEHAVIOR}}

**Tidak boleh diasumsikan:**

- {{COMMON_BUT_UNAPPROVED_ASSUMPTION}}

### 9.1.4 User Stories

| User Story ID | Story | Priority | Related Rule / Journey |
|---|---|---|---|
| US-{{NNN}} | Sebagai `{{ACTOR}}`, saya ingin `{{CAPABILITY}}`, agar `{{OUTCOME}}`. | MUST | BR-001 / JOURNEY-001 |

User story tidak menggantikan requirement. Gunakan story untuk intent; gunakan FR/AC untuk behavior yang testable.

### 9.1.5 Trigger, Preconditions, dan Postconditions

| Type | Conditions |
|---|---|
| Trigger | {{TRIGGER}} |
| Preconditions | {{PRECONDITIONS}} |
| Success postconditions | {{SUCCESS_STATE_AND_SIDE_EFFECTS}} |
| Failure postconditions | {{STATE_THAT_MUST_REMAIN_UNCHANGED_OR_FLAGGED}} |

### 9.1.6 Main Flow

| Step | Actor / System | Action | Product Response | Rule / Requirement IDs |
|---:|---|---|---|---|
| 1 | ACT-001 | {{ACTION}} | {{RESPONSE}} | FR-001 |

### 9.1.7 Alternative, Negative, Edge, dan Recovery Flows

| Scenario ID | Scenario | Condition | Expected Behavior | User Message / Visibility | State Impact | Recovery | Requirement IDs |
|---|---|---|---|---|---|---|---|
| ALT-001 | {{SCENARIO}} | {{CONDITION}} | {{BEHAVIOR}} | {{MESSAGE}} | {{IMPACT}} | {{RECOVERY}} | FR-002 |

Pertimbangkan secara eksplisit bila relevan:

- invalid input;
- unauthorized dan insufficient clearance;
- missing prerequisite;
- no data / zero result;
- duplicate submission / repeated click;
- stale version / source changed;
- dependency timeout / rate limit / auth failure;
- partial batch success;
- conflicting update;
- deleted, archived, obsolete, or missing source;
- notification undeliverable;
- export terlalu besar atau data ter-redact;
- AI output invalid, unsupported, low-confidence, atau tanpa evidence;
- user meninggalkan flow di tengah;
- retry setelah failure;
- recovery setelah service kembali normal.

### 9.1.8 Business Rules

| Rule ID | Rule | Condition | Outcome | Exception | Precedence | Example / Non-Example |
|---|---|---|---|---|---|---|
| BR-{{NNN}} | {{RULE}} | {{WHEN}} | {{OUTCOME}} | {{EXCEPTION}} | {{PRECEDENCE}} | {{EXAMPLES}} |

### 9.1.9 Functional Product Requirements

| Requirement ID | Requirement | Priority | Actor / Trigger | Observable Outcome | Failure Behavior |
|---|---|---|---|---|---|
| FR-{{NNN}} | Sistem WAJIB {{BEHAVIOR}} ketika {{CONDITION}}. | MUST | {{ACTOR_TRIGGER}} | {{OUTCOME}} | {{FAILURE_BEHAVIOR}} |

Pola requirement yang baik:

> `FR-001`: Ketika `{{CONDITION}}`, sistem WAJIB `{{BEHAVIOR}}` sehingga `{{OBSERVABLE_OUTCOME}}`. Jika `{{FAILURE_CONDITION}}`, sistem WAJIB `{{SAFE_FAILURE_BEHAVIOR}}` dan DILARANG `{{UNSAFE_BEHAVIOR}}`.

### 9.1.10 Acceptance Criteria

Gunakan ID terpisah agar dapat ditelusuri ke test.

| AC ID | Given | When | Then | Evidence / Oracle | Requirement IDs |
|---|---|---|---|---|---|
| AC-{{NNN}} | {{PRECONDITION}} | {{ACTION}} | {{EXPECTED_RESULT}} | {{HOW_TO_VERIFY}} | FR-001 |

Minimum acceptance coverage per feature, bila relevan:

- [ ] Happy path.
- [ ] Validation boundary.
- [ ] Authorization / ownership / clearance denial.
- [ ] Empty state / zero result.
- [ ] Duplicate / idempotent user action.
- [ ] Stale or changed source.
- [ ] Partial failure dan preservation of prior state.
- [ ] Dependency unavailable / degraded mode.
- [ ] Audit / notification / analytics side effect.
- [ ] Accessibility / localization behavior.
- [ ] Data classification / redaction.
- [ ] Recovery atau retry.

### 9.1.11 Input dan Output Product Contract

Jelaskan informasi bisnis, bukan schema fisik.

| Input / Output | Field / Information | Required? | Source | Validation / Meaning | Classification | Display / Redaction Rule |
|---|---|---:|---|---|---|---|
| Input | {{FIELD}} | YES | {{SOURCE}} | {{RULE}} | {{CLASS}} | {{RULE}} |
| Output | {{FIELD}} | YES | Derived | {{MEANING}} | {{CLASS}} | {{RULE}} |

### 9.1.12 State and Lifecycle Impact

| Entity / Process | Current State | Action | Result State | Who Can Trigger | Reversible? | Evidence |
|---|---|---|---|---|---:|---|
| {{ENTITY}} | {{STATE}} | {{ACTION}} | {{STATE}} | {{ACTOR}} | YES / NO | {{EVIDENCE}} |

### 9.1.13 Permission and Approval Requirements

| Action | Allowed Actors | Object Scope | Approval Needed | Denied Actors | Denial Behavior | Audit Required |
|---|---|---|---|---|---|---:|
| {{ACTION}} | {{ACTORS}} | {{OWNED_ASSIGNED_ALL}} | {{APPROVER_OR_NONE}} | {{ACTORS}} | {{403_REDACTION_MESSAGE}} | YES |

### 9.1.14 Notification Requirements

| Notification ID | Trigger | Recipient | Channel Intent | Timing | Content Minimum | Dedupe / Frequency | Undeliverable Behavior |
|---|---|---|---|---|---|---|---|
| NOTIF-{{NNN}} | {{TRIGGER}} | {{RECIPIENT}} | Email / In-app / Other | {{TIMING}} | {{CONTENT}} | {{RULE}} | {{FLAG_ESCALATE}} |

Channel teknis dapat dirinci di FSD, kecuali channel merupakan requirement bisnis atau kontraktual.

### 9.1.15 Reporting, Search, Filter, dan Export

| Requirement ID | Capability | Scope | Fields / Dimensions | Filters / Sort | Format | Completeness Rule | Classification Rule |
|---|---|---|---|---|---|---|---|
| REPORT-{{NNN}} | {{REPORT_EXPORT_SEARCH}} | {{SCOPE}} | {{FIELDS}} | {{FILTERS}} | {{FORMAT}} | {{NO_TRUNCATION_OR_PAGINATION}} | {{REDACTION}} |

### 9.1.16 Audit and Evidence Requirements

| Action / Event | Actor Attribution | Minimum Evidence | Immutable? | Query / Export Need | Retention Intent |
|---|---|---|---:|---|---|
| {{ACTION}} | Human / System / AI | {{BEFORE_AFTER_REASON_SOURCE_VERSION}} | YES | {{NEED}} | {{RETENTION}} |

### 9.1.17 AI / Automation Behavior

Isi `N/A — alasan` bila feature tidak memakai AI/automation.

| Concern | Product Decision |
|---|---|
| Purpose | {{WHAT_AI_AUTOMATION_DOES}} |
| Authority | ADVISORY / DRAFT_ONLY / DETERMINISTIC_AUTOMATION / HUMAN_APPROVAL_REQUIRED / AUTONOMOUS_WITH_LIMITS |
| Inputs allowed | {{DATA_SCOPE}} |
| Inputs prohibited | {{SENSITIVE_OR_UNTRUSTED_DATA}} |
| Required evidence | {{CITATION_CONFIDENCE_STRUCTURED_OUTPUT}} |
| Human gate | {{WHO_APPROVES_WHAT}} |
| Unsupported output | {{REJECT_FLAG_RETRY}} |
| Low-confidence behavior | {{BEHAVIOR}} |
| Provider unavailable | {{DEGRADED_MODE}} |
| Re-evaluation trigger | {{SOURCE_CHANGE_MODEL_CHANGE_MANUAL}} |
| Auditability | {{RUN_ID_PROMPT_VERSION_SOURCE_VERSION_DECISION}} |
| User disclosure | {{HOW_AI_ASSISTANCE_IS_LABELED}} |

### 9.1.18 Security, Privacy, and Compliance

| ID | Requirement | Protected Asset / Data | Threat / Obligation | Expected Product Behavior | Evidence |
|---|---|---|---|---|---|
| SEC-{{NNN}} | {{REQUIREMENT}} | {{ASSET}} | {{THREAT}} | {{BEHAVIOR}} | {{EVIDENCE}} |

### 9.1.19 Accessibility, Localization, and Content

| Concern | Requirement |
|---|---|
| Language | {{LANGUAGE_AND_DOMAIN_TERMS}} |
| Responsive range | {{SUPPORTED_VIEWPORT_DEVICE}} |
| Keyboard | {{EXPECTATION}} |
| Screen reader | {{LABEL_LIVE_REGION_TABLE_RULE}} |
| Color | Status tidak boleh disampaikan dengan warna saja |
| Error content | {{ACTIONABLE_LOCALIZED_MESSAGE}} |
| Empty state | {{WHAT_USER_CAN_DO_NEXT}} |
| Date/number format | {{LOCALE_RULE}} |

### 9.1.20 Feature Metrics

| Metric ID | Metric | Definition | Numerator | Denominator | Segments | Source | Target | Decision Enabled |
|---|---|---|---|---|---|---|---|---|
| METRIC-{{NNN}} | {{METRIC}} | {{DEFINITION}} | {{NUM}} | {{DENOM}} | {{SEGMENTS}} | {{SOURCE}} | {{TARGET}} | {{DECISION}} |

### 9.1.21 Feature Risks dan Open Items

| ID | Type | Description | Impact | Mitigation / Fallback | Owner | Gate / Deadline | Status |
|---|---|---|---|---|---|---|---|
| RISK-{{NNN}} | Risk | {{RISK}} | {{IMPACT}} | {{MITIGATION}} | {{OWNER}} | {{DATE}} | OPEN |
| OPEN-{{NNN}} | Blocker | {{QUESTION}} | {{IMPACT}} | {{FALLBACK_OR_NONE}} | {{OWNER}} | {{GATE}} | OPEN |

### 9.1.22 Feature Definition of Ready for FSD

- [ ] Problem, objective, outcome, actor, dan scope feature jelas.
- [ ] Semua business rule menggunakan canonical IDs.
- [ ] Main, alternative, negative, dan recovery flow tersedia.
- [ ] State transition serta role authority tidak ambigu.
- [ ] Acceptance criteria memiliki observable oracle.
- [ ] Input/output product semantics dan classification jelas.
- [ ] AI/human authority boundary dinyatakan atau N/A.
- [ ] NFR dan dependency yang relevan telah ditautkan.
- [ ] Tidak ada open blocker yang dibutuhkan feature.
- [ ] Product Owner menyetujui feature untuk diterjemahkan ke FSD.

---

# 10. Cross-Cutting Product Requirements

## 10.1 Security Objectives

| Security ID | Objective / Requirement | Asset | Actor / Threat | Product Behavior | Applicable Features | Acceptance Evidence |
|---|---|---|---|---|---|---|
| SEC-001 | {{REQUIREMENT}} | {{ASSET}} | {{THREAT}} | {{BEHAVIOR}} | {{FEATURES}} | {{EVIDENCE}} |

Minimum area yang harus dinilai:

- authentication expectation;
- authorization, ownership, clearance, dan default-deny;
- sensitive action confirmation;
- session expiry dan privilege revocation intent;
- classified content display/export;
- secret exposure pada UI, logs, exports, atau support channel;
- malicious/untrusted input;
- audit trail integrity;
- abuse, rate, dan bulk-action risk;
- data egress ke third party.

## 10.2 Privacy Requirements

| Privacy ID | Data Subject / Data | Purpose | Lawful / Approved Basis | Minimum Data | Access | Retention / Erasure | Export / Sharing | Evidence |
|---|---|---|---|---|---|---|---|---|
| PRIV-001 | {{DATA}} | {{PURPOSE}} | {{BASIS}} | {{MINIMIZATION}} | {{ACCESS}} | {{RETENTION}} | {{SHARING}} | {{EVIDENCE}} |

## 10.3 Compliance Requirements

| Compliance ID | Regulation / Standard / Contract | Clause / Control | Product Obligation | Evidence Produced | Owner | Release Gate |
|---|---|---|---|---|---|---|
| COMP-001 | {{SOURCE}} | {{REF}} | {{OBLIGATION}} | {{EVIDENCE}} | {{OWNER}} | {{GATE}} |

Jangan mengklaim “compliant” hanya karena feature ada. Nyatakan obligation dan evidence yang harus dapat dibuktikan.

## 10.4 Auditability Requirements

| Requirement ID | Event / Decision | Actor | Source Version / Context | Before/After | Reason Required | Search / Export | Retention |
|---|---|---|---|---|---:|---|---|
| FR-{{NNN}} | {{EVENT}} | {{ACTOR}} | {{CONTEXT}} | YES / NO | YES / NO | {{NEED}} | {{RETENTION}} |

## 10.5 AI and Automation Governance

| AI ID | Use Case | Authority Level | Human Gate | Evidence Required | Prohibited Use | Evaluation Metric | Fallback |
|---|---|---|---|---|---|---|---|
| AI-001 | {{USE_CASE}} | {{LEVEL}} | {{GATE}} | {{EVIDENCE}} | {{PROHIBITED}} | {{METRIC}} | {{FALLBACK}} |

Wajib jelaskan:

1. Apakah output AI berupa suggestion, draft, classification, extraction, ranking, atau autonomous action.
2. Siapa yang memegang keputusan final.
3. Apakah output tanpa citation/evidence boleh disimpan atau ditampilkan.
4. Apa yang terjadi pada malformed output, hallucination, prompt injection, unsupported claim, dan model/provider outage.
5. Dataset/eval set serta threshold release yang digunakan.
6. Kapan hasil lama dianggap stale dan harus dievaluasi ulang.
7. Batas data egress, retention provider, dan klasifikasi yang diizinkan.

## 10.6 Notification and Communication Policy

| Notification ID | Trigger | Audience | Urgency | Channel Requirement | Frequency / Dedupe | Escalation | Opt-out Allowed? | Audit |
|---|---|---|---|---|---|---|---:|---:|
| NOTIF-001 | {{TRIGGER}} | {{AUDIENCE}} | {{URGENCY}} | {{CHANNEL}} | {{RULE}} | {{ESCALATION}} | YES / NO | YES |

## 10.7 Search, Reporting, and Export Policy

| Report ID | Audience | Business Question | Data Scope | Freshness | Format | Completeness | Redaction | Generated Timestamp / Version |
|---|---|---|---|---|---|---|---|---|
| REPORT-001 | {{AUDIENCE}} | {{QUESTION}} | {{SCOPE}} | {{FRESHNESS}} | {{FORMAT}} | {{RULE}} | {{RULE}} | REQUIRED |

## 10.8 Non-Functional Requirements

NFR harus mengandung target, konteks, measurement, dan failure consequence.

| NFR ID | Category | Requirement / SLO | Load / Context | Measurement Method | Target | Failure Consequence | Priority |
|---|---|---|---|---|---|---|---|
| NFR-001 | Performance | {{BEHAVIOR}} | {{DATA_USERS_REQUEST_PROFILE}} | {{METHOD}} | {{TARGET}} | {{CONSEQUENCE}} | MUST |

Area yang harus dinilai:

- performance dan latency;
- availability dan business-hour expectation;
- durability dan data-loss tolerance;
- recovery time / recovery point intent;
- scale dan expected volume;
- concurrency / duplicate-action product effect;
- freshness dan sync latency;
- compatibility (browser, device, file format, locale);
- accessibility;
- graceful degradation;
- observability yang terlihat oleh operator/user;
- supportability dan diagnosability;
- legal/data residency;
- cost ceiling bila merupakan business constraint.

## 10.9 Capacity and Usage Assumptions

| Dimension | Current | Release Target | Peak / Burst | Growth Horizon | Source / Confidence |
|---|---:|---:|---:|---|---|
| Named users | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Concurrent users | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Records / documents | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Actions / jobs per day | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Max item / file size | {{SIZE}} | {{SIZE}} | {{SIZE}} | {{PERIOD}} | {{SOURCE}} |
| Export size | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |

---

# 11. External Systems dan Business Integration Outcomes

PRD mendefinisikan outcome dan boundary integrasi. Endpoint, payload, retry, credential mechanism, dan teknis adapter ditetapkan di FSD.

## 11.1 Integration Inventory

| Dependency ID | System / Party | Purpose | Authoritative Data | Data Sent | Data Received | Business Freshness | Owner | Criticality |
|---|---|---|---|---|---|---|---|---|
| DEP-001 | {{SYSTEM}} | {{PURPOSE}} | {{DATA}} | {{SENT}} | {{RECEIVED}} | {{FRESHNESS}} | {{OWNER}} | CRITICAL / DEGRADABLE |

## 11.2 Integration Product Contract

### DEP-{{NNN}} — {{SYSTEM_NAME}}

| Concern | Product Requirement |
|---|---|
| User/business outcome | {{OUTCOME}} |
| Source of truth | {{SOURCE}} |
| Trigger / cadence expectation | {{TRIGGER_OR_FRESHNESS}} |
| Data scope | {{SCOPE}} |
| Consent / classification / egress | {{BOUNDARY}} |
| Duplicate behavior | {{PRODUCT_EXPECTATION}} |
| Stale data behavior | {{WARN_BLOCK_ALLOW_WITH_LABEL}} |
| Unavailable behavior | {{DEGRADED_MODE}} |
| Manual fallback | {{FALLBACK_OR_NONE}} |
| Recovery expectation | {{RECONCILE_RETRY_REAUTH}} |
| User/operator visibility | {{HEALTH_BANNER_ALERT_STATUS}} |
| Audit evidence | {{EVIDENCE}} |
| Legal / contract dependency | {{SOURCE_OR_NONE}} |

## 11.3 Cross-System Consistency Intent

| Invariant ID | Systems / Records | Authoritative Side | Allowed Lag | Drift Visibility | Repair Authority | User Impact During Drift |
|---|---|---|---|---|---|---|
| INV-{{NNN}} | {{SYSTEMS}} | {{AUTHORITY}} | {{LAG}} | {{VISIBILITY}} | {{WHO_OR_SYSTEM}} | {{IMPACT}} |

---

# 12. Analytics, Metrics, and Product Learning

## 12.1 Metric Dictionary

| Metric ID | Metric | Product Question | Definition | Numerator | Denominator | Exclusions | Segment | Source | Cadence | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| METRIC-001 | {{NAME}} | {{QUESTION}} | {{DEFINITION}} | {{NUM}} | {{DENOM}} | {{EXCLUSIONS}} | {{SEGMENT}} | {{SOURCE}} | {{CADENCE}} | {{OWNER}} |

Definisi metric harus mencegah division-by-zero, double counting, dan perubahan denominator yang tidak terlihat.

## 12.2 Product Analytics Event Intent

FSD akan merinci schema event. PRD menetapkan business meaning dan privacy boundary.

| Event ID | Event Name | Trigger Meaning | Actor | Required Dimensions | Prohibited Data | Metric Consumers |
|---|---|---|---|---|---|---|
| EVENT-001 | `{{event_name}}` | {{MEANING}} | {{ACTOR}} | {{DIMENSIONS}} | {{PII_SECRET_CONTENT}} | METRIC-001 |

## 12.3 Experiment / Validation Plan

Isi bila outcome atau solusi masih berupa hipotesis.

| Experiment ID | Hypothesis | Segment | Method | Success Threshold | Guardrail | Duration / Sample | Decision Rule | Owner |
|---|---|---|---|---|---|---|---|---|
| EXP-001 | {{HYPOTHESIS}} | {{SEGMENT}} | {{METHOD}} | {{THRESHOLD}} | {{GUARDRAIL}} | {{WINDOW}} | {{SHIP_ITERATE_STOP}} | {{OWNER}} |

## 12.4 Success Review Cadence

| Review | Timing | Inputs | Decision Owner | Possible Decisions |
|---|---|---|---|---|
| Launch readiness | {{DATE_GATE}} | UAT, risk, blockers | {{OWNER}} | Go / No-go / Conditional |
| Early-life review | {{DAYS_AFTER}} | Incidents, adoption, guardrails | {{OWNER}} | Continue / Rollback / Patch |
| Outcome review | {{WINDOW}} | Outcome metrics | {{OWNER}} | Scale / Iterate / Retire |

---

# 13. Rollout, Adoption, Support, dan Change Management

## 13.1 Rollout Strategy

| Phase | Audience / Scope | Feature IDs | Entry Criteria | Monitoring | Exit / Expansion Criteria | Rollback Trigger |
|---|---|---|---|---|---|---|
| Pilot | {{SCOPE}} | {{FEATURES}} | {{CRITERIA}} | {{METRICS}} | {{EXIT}} | {{TRIGGER}} |

## 13.2 Existing Data / Process Transition

| Area | Current State | Target State | Migration / Backfill Intent | Validation Owner | Failure / Rollback Expectation |
|---|---|---|---|---|---|
| {{AREA}} | {{CURRENT}} | {{TARGET}} | {{INTENT}} | {{OWNER}} | {{EXPECTATION}} |

## 13.3 Training and Communication

| Audience | Change | Required Material | Delivery Channel | Owner | Completion Evidence |
|---|---|---|---|---|---|
| {{AUDIENCE}} | {{CHANGE}} | {{GUIDE_TRAINING_RUNBOOK}} | {{CHANNEL}} | {{OWNER}} | {{EVIDENCE}} |

## 13.4 Support Model

| Concern | Decision |
|---|---|
| Support owner | {{TEAM_ROLE}} |
| Support hours | {{WINDOW}} |
| Severity taxonomy | {{REFERENCE_OR_DEFINITION}} |
| User-facing issue channel | {{CHANNEL}} |
| Escalation path | {{PATH}} |
| Known limitation communication | {{METHOD}} |
| Data correction authority | {{ROLE}} |
| Incident evidence required | {{EVIDENCE}} |

## 13.5 Product Rollback Criteria

Rollback teknis dirinci di FSD. PRD menetapkan business trigger.

| Trigger ID | Condition | Threshold | Decision Owner | Immediate User Communication | Data / Process Expectation |
|---|---|---|---|---|---|
| ROLLBACK-001 | {{CONDITION}} | {{THRESHOLD}} | {{OWNER}} | {{MESSAGE}} | {{PRESERVE_REVERT_RECONCILE}} |

---

# 14. UAT, Acceptance, dan Release Gates

## 14.1 UAT Strategy

`{{JELASKAN SIAPA YANG MELAKUKAN UAT, ENVIRONMENT/DATA YANG DIPAKAI, SCOPE, DAN BUKTI YANG HARUS DISIMPAN.}}`

## 14.2 UAT Scenario Matrix

| UAT ID | Scenario | Actor | Preconditions / Data | Steps Ringkas | Expected Outcome | Negative Check | Requirement / AC IDs | Evidence | Approver |
|---|---|---|---|---|---|---|---|---|---|
| UAT-001 | {{SCENARIO}} | ACT-001 | {{DATA}} | {{STEPS}} | {{OUTCOME}} | {{NEGATIVE}} | FR-001, AC-001 | {{SCREEN_RECORD_AUDIT}} | {{OWNER}} |

## 14.3 Release Acceptance Matrix

| Gate | Kriteria | Evidence | Owner | Status |
|---|---|---|---|---|
| Product scope | Semua MUST feature selesai; non-goal tidak bocor | Traceability matrix | Product Owner | PENDING |
| Functional | Semua MUST AC dan UAT lulus | Test/UAT evidence | QA Lead | PENDING |
| Security/privacy | Semua MUST control dan review selesai | Review report | Security/Privacy | PENDING |
| Data/migration | Reconciliation dan sample validation lulus | Validation report | Data/Engineering | PENDING |
| Operations | Monitoring, support, dan rollback siap | Runbook evidence | Operations | PENDING |
| Outcome instrumentation | Metric/event siap dan tervalidasi | Analytics validation | Product/Data | PENDING |
| Blocker | Tidak ada release blocker terbuka | Open-item register | Product Owner | PENDING |

## 14.4 Acceptance Sign-Off

| Role | Name | Decision | Date | Conditions / Exceptions |
|---|---|---|---|---|
| Business Owner |  |  |  |  |
| Product Owner |  |  |  |  |
| QA Lead |  |  |  |  |
| Technical Lead |  |  |  |  |
| Security / Compliance |  | N/A / APPROVE |  |  |
| Operations |  | N/A / APPROVE |  |  |

---

# 15. Risks, Assumptions, Dependencies, dan Open Decisions

## 15.1 Risk Register

| Risk ID | Risk | Category | Likelihood | Impact | Exposure | Early Signal | Mitigation | Contingency | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | {{RISK}} | Product / User / Legal / Security / AI / Dependency / Delivery | L/M/H | L/M/H | {{RANK}} | {{SIGNAL}} | {{MITIGATION}} | {{CONTINGENCY}} | {{OWNER}} | OPEN |

## 15.2 Assumption Register

| Assumption ID | Assumption | Criticality | Validation Method | Owner | Deadline | Result | Affected IDs |
|---|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | L/M/H | {{METHOD}} | {{OWNER}} | {{DATE}} | PENDING | {{IDS}} |

## 15.3 Dependency Register

| Dependency ID | Dependency | Commitment | Owner | Needed By | Verification Evidence | Failure Mode | Fallback | Status |
|---|---|---|---|---|---|---|---|---|
| DEP-001 | {{DEPENDENCY}} | {{COMMITMENT}} | {{OWNER}} | {{GATE}} | {{EVIDENCE}} | {{FAILURE}} | {{FALLBACK}} | OPEN |

## 15.4 Open Decisions

| Open ID | Question | Options | Recommendation | Blocker? | Owner | Decision Date | Fallback | Status |
|---|---|---|---|---:|---|---|---|---|
| OPEN-001 | {{QUESTION}} | {{OPTIONS}} | {{RECOMMENDATION}} | YES / NO | {{OWNER}} | {{DATE}} | {{FALLBACK}} | OPEN |

## 15.5 Resolved Decisions

| Decision ID | Resolved Open ID | Decision | Rationale | Approved By | Date | IDs Updated | Supersedes |
|---|---|---|---|---|---|---|---|
| DEC-001 | OPEN-001 | {{DECISION}} | {{RATIONALE}} | {{APPROVER}} | {{DATE}} | {{IDS}} | {{OLD_TEXT_IDS}} |

---

# 16. Traceability dan Handoff ke FSD

## 16.1 End-to-End Traceability Matrix

Isi kolom FSD/Test/Goal saat artifact downstream dibuat. PRD tidak boleh dianggap gagal hanya karena kolom downstream masih kosong saat draft, tetapi kolom tersebut wajib terisi sebelum autonomous development dimulai. Kolom keputusan teknis boleh berisi `TDEC-*`, ADR `ACCEPTED`, atau `N/A`.

| BRD Source | Problem | Objective / Outcome | Feature | User Story | Business Rule | Product Requirement | Acceptance Criteria | UAT | FSD IDs | Decision Ref (`TDEC` / ADR opsional) | Test IDs | Goal IDs | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BRD-{{PROJECT_CODE}}#BREQ-001 / BRD-{{PROJECT_CODE}}#BAC-001 | PROB-001 | OBJ-001 / OUT-001 | FEAT-001 | US-001 | BR-001 | FR-001 | AC-001 | UAT-001 |  | N/A |  |  | DRAFT |

Periksa orphan:

- PRD requirement tanpa BRD source atau approved exception.
- Problem tanpa objective/feature.
- Objective tanpa metric.
- Feature tanpa problem/outcome.
- Requirement tanpa AC.
- AC tanpa requirement.
- UAT tanpa requirement.
- Requirement `MUST` tanpa target release.
- FSD/goal yang tidak memetakan ke PRD.
- Keputusan teknis material tanpa `TDEC-*` atau ADR `ACCEPTED`.
- Goal yang hanya menunjuk ADR tetapi tidak menunjuk FSD.

## 16.2 Product Decisions yang Tidak Boleh Diciptakan FSD

| Decision Area | Canonical PRD IDs | Keputusan Final | FSD Boleh Menentukan | FSD Dilarang Menentukan |
|---|---|---|---|---|
| Role authority | ACT-001, BR-001 | {{DECISION}} | Enforcement detail | Role/approval baru |
| State semantics | BR-010, INV-001 | {{DECISION}} | Persistence/transaction | State/transition baru |
| Data classification | SEC-001, PRIV-001 | {{DECISION}} | Technical control | Default lebih permisif |
| AI authority | AI-001 | {{DECISION}} | Provider/prompt contract | Auto-approval tanpa gate |
| Scope | SCOPE-001, SCOPE-NG-001 | {{DECISION}} | Delivery slicing within release | Fitur di luar scope |

## 16.3 FSD Handoff Requirements

FSD downstream minimal harus menghasilkan:

- [ ] Conflict ledger dan source precedence.
- [ ] Canonical domain model, enums, states, dan invariants.
- [ ] Physical data model, keys, constraints, indexes, migration, dan retention.
- [ ] API/interface/event contracts dengan error taxonomy.
- [ ] UI states, validation, accessibility, dan localization details.
- [ ] Background jobs, scheduler, retry, idempotency, concurrency, dan recovery.
- [ ] External integration adapters, timeouts, health, degraded mode, dan reconciliation.
- [ ] Security, privacy, audit, clearance, redaction, serta secret handling.
- [ ] AI prompt/tool/output/evaluation contract bila relevan.
- [ ] NFR load profile, observability, alert, backup, restore, dan runbooks.
- [ ] Test matrix dan repository verification commands.
- [ ] Rollout, migration, cutover, rollback, dan post-deploy validation.
- [ ] Goal dependency graph serta goal packet atomik yang dapat dijalankan agent coding.
- [ ] ADR applicability assessment: `NOT_REQUIRED`, `LINKED`, atau `BLOCKED_BY_POLICY`.
- [ ] Technical Decision Register: setiap keputusan teknis material direkam sebagai `TDEC-*` atau ditautkan ke ADR `ACCEPTED`, tidak keduanya sebagai authority ganda.
- [ ] FSD tetap lengkap dan executable ketika `adr_applicability = NOT_REQUIRED`.
- [ ] Setiap goal menjadikan FSD sebagai source of truth utama; ADR hanya additional authority bila linked.

## 16.4 Handoff Blockers

| Blocker ID | Keputusan Produk yang Hilang | Affected Features | Mengapa FSD Tidak Boleh Menebak | Owner | Resolution Gate |
|---|---|---|---|---|---|
| OPEN-001 | {{MISSING_DECISION}} | {{FEATURES}} | {{REASON}} | {{OWNER}} | {{GATE}} |

## 16.5 Machine-Readable Handoff Manifest

Perbarui manifest ini sebelum FSD dibuat. Nilai kosong pada mandatory field adalah blocker.

```yaml
prd_handoff:
  prd_id: "PRD-{{PROJECT_CODE}}"
  version: "{{PRD_VERSION}}"
  status: "APPROVED"
  target_release: "{{RELEASE}}"
  default_locale: "{{LOCALE}}"
  default_timezone: "{{IANA_TIMEZONE}}"

  upstream:
    brd_ids: ["BRD-{{PROJECT_CODE}}"]
    brd_requirement_refs: ["BRD-{{PROJECT_CODE}}#BREQ-001"]
    brd_acceptance_refs: ["BRD-{{PROJECT_CODE}}#BAC-001", "BRD-{{PROJECT_CODE}}#BAT-001"]

  artifact_governance:
    canonical_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
    fsd_required_for_autonomous_delivery: true
    adr:
      mode: "OPTIONAL_CONDITIONAL"
      applicability_default: "NOT_REQUIRED"
      candidate_decisions: []
      linked_accepted_ids: []
      fallback_authority_when_not_used: "FSD TDEC-*"

  sources:
    - id: "SRC-001"
      authority: "problem_evidence"
      status: "VERIFIED"

  objectives:
    - id: "OBJ-001"
      outcome_ids: ["OUT-001"]
      metric_ids: ["METRIC-001"]

  release_scope:
    in_scope_ids: ["SCOPE-001"]
    non_goal_ids: ["SCOPE-NG-001"]
    feature_ids: ["FEAT-001"]

  actors:
    - id: "ACT-001"
      role: "{{ROLE_NAME}}"
      authority_summary: "{{AUTHORITY}}"

  canonical_semantics:
    business_rule_ids: ["BR-001"]
    invariant_ids: ["INV-001"]
    enum_names: ["{{ENUM_NAME}}"]
    state_machine_names: ["{{STATE_MACHINE}}"]
    source_of_truth_items: ["{{DATUM}}"]

  requirements:
    functional: ["FR-001"]
    security: ["SEC-001"]
    privacy: ["PRIV-001"]
    compliance: ["COMP-001"]
    ai: ["AI-001"]
    non_functional: ["NFR-001"]

  acceptance:
    acceptance_criteria: ["AC-001"]
    uat_scenarios: ["UAT-001"]
    release_metrics: ["METRIC-001"]

  dependencies:
    required: ["DEP-001"]
    degraded_mode_defined: true

  blockers:
    open_blocker_ids: []
    non_blocking_open_ids: []

  approvals:
    product_owner: "{{NAME}}"
    business_owner: "{{NAME}}"
    qa_reviewed: true
    security_reviewed: true

  downstream_guardrails:
    fsd_must_not_invent_product_rules: true
    fsd_must_record_adr_applicability: true
    goals_must_reference_fsd: true
    adr_is_not_required_when_applicability_is_not_required: true
    linked_adrs_must_be_accepted: true
```

## 16.6 FSD Review Questions

FSD reviewer wajib memeriksa:

1. Apakah FSD menambah role, enum, state, business rule, atau workflow yang tidak ada di PRD?
2. Apakah ada requirement PRD yang hilang atau diturunkan menjadi opsional?
3. Apakah degraded mode mempertahankan product invariant dan prior valid state?
4. Apakah AI/automation mendapat authority lebih besar daripada yang disetujui?
5. Apakah data classification, redaction, audit, dan retention lebih lemah daripada PRD?
6. Apakah setiap MUST requirement memiliki deterministic test dan goal owner?
7. Apakah detail teknis membatasi outcome produk secara tidak disetujui?
8. Apakah ada konflik yang diselesaikan diam-diam?
9. Apakah FSD telah menentukan `adr_applicability` dan tetap lengkap saat ADR tidak digunakan?
10. Bila ADR linked, apakah statusnya `ACCEPTED`, scope-nya delegated, dan FSD tidak menduplikasi authority secara kontradiktif?
11. Apakah setiap goal menunjuk FSD, bukan ADR sebagai satu-satunya source of truth?

---

# 17. Final PRD Readiness Checklist

## 17.1 Problem and Outcome

- [ ] Problem ditulis tanpa menyamar sebagai solusi.
- [ ] Evidence/baseline tersedia atau hipotesis diberi validation plan.
- [ ] Objective dan outcome dapat diukur.
- [ ] Guardrail mencegah local optimization yang merugikan.
- [ ] Why-now dan consequence of inaction jelas.

## 17.2 Scope and Users

- [ ] In-scope, out-of-scope, non-goal, dan future scope tidak tumpang tindih.
- [ ] Release slice realistis dan tidak menyembunyikan dependency wajib.
- [ ] Actor, persona, role, owner, dan approver dibedakan.
- [ ] Permission matrix mencakup allow dan deny.
- [ ] Segregation of duties ditetapkan bila relevan.

## 17.3 Semantics and Rules

- [ ] Glossary, enum, status, dan state menggunakan istilah canonical.
- [ ] Setiap datum penting memiliki satu source of truth.
- [ ] Business rules tidak duplikatif atau bertentangan.
- [ ] Precedence dan fail-safe default jelas.
- [ ] Date/time, unit, currency, rounding, locale, dan version semantics jelas.
- [ ] Invariants dan forbidden outcomes tertulis.

## 17.4 Feature Quality

- [ ] Setiap feature memetakan ke problem, objective, outcome, dan journey.
- [ ] User story tidak menjadi satu-satunya spesifikasi.
- [ ] Requirement bersifat observable dan atomik.
- [ ] Acceptance criteria memiliki oracle yang objektif.
- [ ] Happy, validation, authorization, empty, duplicate, stale, partial failure, degraded, dan recovery path dinilai.
- [ ] Notification, reporting, audit, accessibility, dan metrics dinilai.
- [ ] Tidak ada “etc.” atau daftar mandatory terbuka.

## 17.5 Security, Privacy, Compliance, and AI

- [ ] Data classification dan clearance intent jelas.
- [ ] Redaction/export policy jelas.
- [ ] Retention dan data minimization ditetapkan.
- [ ] Audit evidence untuk high-risk action ditetapkan.
- [ ] Data egress dan third-party sharing disetujui.
- [ ] AI authority, evidence, human gate, eval, stale/re-evaluation, dan fallback jelas.
- [ ] Unknown/default behavior tidak lebih permisif secara tidak sengaja.

## 17.6 Delivery and Readiness

- [ ] NFR terukur dan memakai load/context nyata.
- [ ] Dependency memiliki owner, commitment, dan degraded behavior.
- [ ] Risk memiliki mitigation, contingency, dan early signal.
- [ ] UAT dapat dijalankan dengan data/evidence yang tersedia.
- [ ] Release gate, rollout, support, dan rollback business criteria jelas.
- [ ] Tidak ada blocker terbuka.
- [ ] Traceability matrix bebas orphan.
- [ ] Handoff manifest valid dan konsisten.
- [ ] BRD source dan `BREQ/BAC` traceability lengkap.
- [ ] ADR dinyatakan opsional; candidate architecture decisions telah diteruskan ke FSD tanpa menjadikannya blocker otomatis.

## 17.7 AI-Slop Rejection

Tolak PRD atau hasil turunan apabila ditemukan:

- [ ] Feature yang tidak menyelesaikan problem/outcome mana pun.
- [ ] Requirement generik yang dapat ditempel ke produk apa pun.
- [ ] Business rule baru tanpa source atau approver.
- [ ] Terminologi yang berubah-ubah untuk entity/state yang sama.
- [ ] Happy path saja tanpa negative/failure behavior.
- [ ] “AI akan menentukan” tanpa evidence, authority boundary, dan fallback.
- [ ] “Sistem otomatis” tanpa trigger, cadence, dedupe, failure, dan visibility.
- [ ] Metric vanity tanpa keputusan yang akan diambil.
- [ ] Security/compliance berupa klaim, bukan observable control/evidence.
- [ ] NFR tanpa angka, context, atau measurement method.
- [ ] Fitur tambahan yang dimasukkan karena “best practice” tetapi tidak disetujui scope.
- [ ] Acceptance criteria yang hanya mengulang user story.
- [ ] Placeholder, fake certainty, atau asumsi tersembunyi.

---

# Appendix A — Pola Penulisan Requirement

## A.1 Functional Requirement yang Baik

> **FR-001:** Ketika owner mengirim review untuk dokumen yang dimilikinya, sistem WAJIB menyimpan submission sebagai `SUBMITTED`, menampilkan submission kepada verifier, dan DILARANG mereset review cycle sebelum verifier menyelesaikan verifikasi.

Mengapa baik: trigger, actor, state, observable behavior, dan forbidden side effect jelas.

## A.2 Negative Requirement yang Baik

> **SEC-001:** User tanpa clearance yang diperlukan DILARANG melihat excerpt atau nilai sensitif pada halaman, API response, notification, dan export. Sistem WAJIB menampilkan placeholder redaction dan mencatat denial tanpa merekam konten yang disembunyikan.

## A.3 Failure Requirement yang Baik

> **FR-002:** Jika dependency gagal setelah sebagian batch diproses, sistem WAJIB mempertahankan prior valid state, menandai run sebagai partial failure, dan menyediakan recovery action. Sistem DILARANG menghapus record yang belum terkonfirmasi.

## A.4 NFR yang Baik

> **NFR-001:** Untuk release dengan maksimal 5.000 record aktif dan 50 concurrent users, halaman daftar WAJIB menampilkan initial content dalam p95 ≤ 2 detik pada koneksi broadband yang ditentukan oleh test profile `{{PROFILE_ID}}`.

## A.5 Requirement yang Buruk

- “Sistem harus cepat dan user-friendly.”
- “Gunakan AI untuk menganalisis data.”
- “Admin dapat mengelola semuanya.”
- “Sistem harus scalable.”
- “Handle error dengan baik.”
- “Kirim notifikasi bila perlu.”
- “Data disimpan secara aman.”
- “Support semua format umum.”

Perbaikan: tentukan actor, object, scope, trigger, behavior, target, failure path, dan evidence.

---

# Appendix B — Acceptance Criteria Patterns

## B.1 Happy Path

```gherkin
Given {{VALID_PRECONDITION}}
When {{AUTHORIZED_ACTOR_PERFORMS_ACTION}}
Then {{EXPECTED_STATE_AND_OUTPUT}}
And {{EXPECTED_SIDE_EFFECT_OR_EVIDENCE}}
```

## B.2 Authorization Denial

```gherkin
Given {{ACTOR_LACKS_PERMISSION_OR_CLEARANCE}}
When {{ACTOR_ATTEMPTS_ACTION}}
Then the action is denied
And no protected state is changed
And the denial is recorded without exposing protected content
```

## B.3 Duplicate Action

```gherkin
Given {{ACTION_HAS_ALREADY_SUCCEEDED}}
When the same logical action is submitted again
Then {{NO_DUPLICATE_SIDE_EFFECT_OR_EXPLICIT_CONFLICT}}
And the user receives {{CLEAR_RESULT}}
```

## B.4 Stale Source

```gherkin
Given {{SOURCE_CHANGED_AFTER_USER_LOADED_OR_AI_ANALYZED_IT}}
When {{DECISION_OR_MUTATION_IS_ATTEMPTED}}
Then {{BLOCK_WARN_REEVALUATE}}
And the prior decision is not silently applied to the new version
```

## B.5 Dependency Failure

```gherkin
Given {{DEPENDENCY_IS_UNAVAILABLE}}
When {{FEATURE_IS_TRIGGERED}}
Then {{DEGRADED_OR_FAILED_BEHAVIOR}}
And the prior valid state is preserved
And the user/operator can see the failure and next action
```

## B.6 AI Evidence Gate

```gherkin
Given an AI output lacks required evidence or violates the output contract
When the system receives the output
Then the output is not promoted to authoritative state
And the run is marked invalid or requires review
And no high-impact action is executed automatically
```

---

# Appendix C — PRD Review Comment Format

Gunakan komentar review yang dapat ditindaklanjuti:

| Field | Isi |
|---|---|
| Review ID | `REV-{{NNN}}` |
| Severity | BLOCKER / MAJOR / MINOR / QUESTION |
| Affected ID | {{REQUIREMENT_OR_SECTION_ID}} |
| Issue | {{WHAT_IS_AMBIGUOUS_INCONSISTENT_MISSING}} |
| Risk | {{WHAT_CAN_GO_WRONG}} |
| Required Decision | {{WHAT_MUST_BE_DECIDED}} |
| Suggested Resolution | {{OPTIONAL_SUGGESTION}} |
| Owner | {{OWNER}} |
| Status | OPEN / RESOLVED / REJECTED_WITH_REASON |

---

# Appendix D — Minimal PRD Variant

Untuk feature kecil, bagian berikut tetap mandatory dan tidak boleh dihilangkan:

1. Metadata dan approver.
2. Problem/evidence.
3. Objective/outcome/metric.
4. Scope/non-goal.
5. Actors/permission intent.
6. Canonical business rules/state.
7. Feature requirement dan acceptance criteria.
8. Negative/failure/degraded behavior.
9. Security/privacy/AI assessment.
10. Dependency/risk/open items.
11. UAT/release gate.
12. Traceability dan FSD handoff manifest.

Bagian lain dapat diberi `N/A — alasan`, bukan dihapus tanpa jejak.
