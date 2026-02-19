---
name: data-privacy
description: "Use when processing personal data (PII), implementing consent mechanisms, or handling data subject requests. Covers GDPR, UU PDP Indonesia, and privacy-by-design principles."
---

# Data Privacy

## Overview

Ensure applications comply with data privacy regulations when processing personal data. Implements privacy-by-design principles applicable across jurisdictions (GDPR, UU PDP Indonesia, CCPA, LGPD, PDPA).

**Announce:** "I'm using the data-privacy skill to verify privacy compliance for personal data handling."

**Core principle:** Privacy is a fundamental right, not a feature. Design for privacy from the start — collect only what you need, protect what you collect, delete what you no longer need.

## Modes

| Mode | Trigger | Scope | Output |
|------|---------|-------|--------|
| **Pre-flight** | During `/plan` when features involve PII or user data | Feature-specific | Privacy section in plan document |
| **Review** | During code review when PII handling changes | Changed files | Privacy findings in review report |
| **Audit** | Via `/security` workflow | Codebase-wide | Privacy compliance findings |

---

## Privacy-by-Design Principles

### 1. Proactive, Not Reactive

Anticipate and prevent privacy issues before they occur, not after.

- [ ] Privacy Impact Assessment (PIA/DPIA) conducted for new features handling PII
- [ ] Privacy requirements defined alongside functional requirements
- [ ] Data flow mapped before implementation

### 2. Privacy as Default Setting

The strictest privacy settings apply by default — users shouldn't have to take action to protect their privacy.

- [ ] Data collection disabled by default (opt-in, not opt-out)
- [ ] Minimum permissions requested
- [ ] Analytics/tracking off by default
- [ ] Sharing features require explicit activation

### 3. Privacy Embedded into Design

Privacy controls are part of the system architecture, not bolted on after.

- [ ] PII identified at data model level
- [ ] Access controls on PII fields
- [ ] Encryption for sensitive data at rest and in transit
- [ ] Audit logging on PII access

### 4. Full Functionality — Positive-Sum

Privacy measures should not degrade user experience.

- [ ] Consent flow is clear and non-blocking
- [ ] Privacy features are user-friendly
- [ ] Anonymous/pseudonymous options provided where possible

### 5. End-to-End Security — Full Lifecycle Protection

Personal data is protected throughout its entire lifecycle.

- [ ] Collection: Only necessary data collected
- [ ] Storage: Encrypted, access-controlled
- [ ] Processing: Purpose-limited, logged
- [ ] Sharing: Consent-based, documented
- [ ] Retention: Time-limited, auto-expiry
- [ ] Deletion: Complete erasure, including backups

### 6. Visibility and Transparency

Users know what data is collected and how it's used.

- [ ] Privacy policy exists and is accessible
- [ ] Data processing purposes clearly stated
- [ ] Third-party sharing disclosed
- [ ] Cookie/tracking consent implemented

### 7. Respect for User Privacy

Keep the user at the center of all privacy decisions.

- [ ] Easy-to-use privacy controls
- [ ] Data portability supported
- [ ] Deletion requests honored
- [ ] Consent withdrawal is simple

---

## Regulatory Quick Reference

### Comparison: GDPR vs UU PDP Indonesia

| Aspek | GDPR (EU) | UU PDP Indonesia (UU 27/2022) |
|-------|-----------|-------------------------------|
| **Berlaku** | 25 Mei 2018 | 17 Oktober 2022 (transisi 2 tahun → Oktober 2024) |
| **Cakupan** | Semua pemroses data EU residents | Semua pemroses data WNI/di Indonesia |
| **Dasar Hukum Pemrosesan** | 6 dasar (Art. 6) | Persetujuan eksplisit + kepentingan hukum |
| **Hak Subjek Data** | 8 hak (Art. 15-22) | 9 hak (Pasal 5-13) |
| **DPO Wajib** | Kondisional | Wajib untuk pemroses berskala besar |
| **Notifikasi Breach** | 72 jam ke otoritas | 3×24 jam ke subjek data + lembaga |
| **Sanksi Maksimal** | €20 juta / 4% revenue | Rp 60 miliar + pidana 6 tahun |
| **Transfer Data Lintas Batas** | Adequacy / SCCs / BCRs | Harus setara atau lebih tinggi |

### Prinsip UU PDP Indonesia (Pasal 16)

1. **Pengumpulan secara terbatas dan spesifik** — hanya data yang diperlukan
2. **Pemrosesan sesuai tujuan** — sesuai persetujuan subjek data
3. **Menjamin hak subjek data** — akses, koreksi, hapus, tarik persetujuan
4. **Akurasi dan kelengkapan** — data harus akurat dan diperbarui
5. **Perlindungan keamanan** — langkah teknis dan organisatoris
6. **Pemberitahuan tujuan** — transparan tentang penggunaan data
7. **Pemusnahan setelah tujuan tercapai** — tidak disimpan melebihi kebutuhan
8. **Akuntabilitas** — dapat membuktikan kepatuhan

### Hak Subjek Data (Universal)

Berlaku di hampir semua regulasi privasi:

| Hak | GDPR | UU PDP | Implementasi |
|-----|------|--------|-------------|
| **Hak Informasi** | Art. 13-14 | Pasal 5 | Privacy policy, consent notice |
| **Hak Akses** | Art. 15 | Pasal 6 | Data export endpoint |
| **Hak Koreksi** | Art. 16 | Pasal 7 | Profile edit feature |
| **Hak Hapus** | Art. 17 | Pasal 8 | Account deletion endpoint |
| **Hak Batasi Pemrosesan** | Art. 18 | Pasal 9 | Processing controls |
| **Hak Portabilitas** | Art. 20 | Pasal 10 | Data export (JSON/CSV) |
| **Hak Keberatan** | Art. 21 | Pasal 11 | Opt-out mechanism |
| **Hak Tarik Persetujuan** | Art. 7(3) | Pasal 12 | Consent withdrawal |
| **Hak Gugatan** | Art. 79-82 | Pasal 13 | N/A (legal, not technical) |

---

## Implementation Patterns

### Data Classification

Tag all data fields with privacy classification:

```
PII Categories:
├─ Direct Identifiers (encrypt + access control)
│  ├─ Nama lengkap
│  ├─ NIK / KTP / Passport
│  ├─ Email
│  ├─ Nomor telepon
│  └─ Alamat
├─ Indirect Identifiers (access control)
│  ├─ Tanggal lahir
│  ├─ Gender
│  ├─ Kode pos
│  └─ IP address
├─ Sensitive Data (encrypt + strict access + audit)
│  ├─ Data kesehatan
│  ├─ Data biometrik
│  ├─ Data keuangan
│  ├─ Data agama / keyakinan
│  ├─ Data orientasi seksual
│  └─ Data catatan kriminal
└─ Non-PII (standard protection)
   ├─ Preferences
   ├─ Activity logs (anonymized)
   └─ Aggregated statistics
```

### Consent Management Pattern

```
Consent Record must contain:
├─ User ID (who gave consent)
├─ Purpose (what they consented to)
├─ Scope (which data)
├─ Consent text (exact wording shown)
├─ Timestamp (when given)
├─ Method (how: checkbox, button, etc.)
├─ Version (consent policy version)
├─ Withdrawal date (null if active)
└─ IP address (evidence)

Rules:
- Consent must be freely given, specific, informed, unambiguous
- Pre-ticked boxes are NOT valid consent
- Silence or inactivity is NOT consent
- Bundled consent (all-or-nothing) is NOT valid
- Must be as easy to withdraw as to give
- Record must be kept for audit
```

### Data Retention Pattern

```
For each data category, define:
├─ Retention period (e.g., 2 years after last activity)
├─ Clock start (e.g., account creation, last login)
├─ Action on expiry (delete / anonymize / archive)
├─ Legal hold exception (litigation, regulatory)
└─ Automated enforcement (cron job / scheduled task)

Common retention periods:
├─ Active user accounts: While active + 30 days
├─ Inactive accounts: 2 years after last login
├─ Transaction records: 7 years (tax/legal)
├─ Audit logs: 1-3 years
├─ Marketing consent: Until withdrawn
├─ Support tickets: 3 years after resolution
└─ Cookies: Max 13 months (ePrivacy)
```

### Anonymization & Pseudonymization

```
Anonymization (irreversible — no longer PII):
- Remove all direct identifiers
- Generalize indirect identifiers (exact age → age range)
- Suppress outliers
- Result: Cannot re-identify individual

Pseudonymization (reversible — still PII):
- Replace identifiers with tokens/hashes
- Keep mapping table separate and secured
- Result: Can re-identify with mapping key
- UU PDP: Pseudonymized data is still personal data

Techniques:
├─ Hashing (with salt) — for pseudonymization
├─ Tokenization — replace with random token
├─ Data masking — show partial (e.g., ****1234)
├─ Generalization — reduce precision (city → province)
├─ Suppression — remove field entirely
└─ Noise addition — for statistical data
```

### Data Subject Request Handling

```
When a user exercises their rights:

1. VERIFY identity (prevent unauthorized access to PII)
2. LOG the request (type, date, user)
3. ACKNOWLEDGE within 1×24 hours
4. PROCESS within:
   - GDPR: 30 days (extendable to 90)
   - UU PDP: 3×24 hours for breach notification
5. RESPOND with result
6. DOCUMENT completion

Types of requests to support:
├─ Access: Export all user data (JSON/CSV)
├─ Rectification: Allow data correction
├─ Erasure: Delete account + all PII
├─ Restriction: Pause processing
├─ Portability: Machine-readable export
├─ Objection: Opt-out of specific processing
└─ Withdrawal: Revoke consent
```

---

## Data Protection Impact Assessment (DPIA) Template

Required when processing involves high risk to individuals:

```markdown
# DPIA: [Feature/System Name]

## Processing Description
- **Purpose**: [Why processing personal data]
- **Data types**: [What PII is collected]
- **Data subjects**: [Whose data]
- **Legal basis**: [Consent / Contract / Legitimate interest]
- **Volume**: [How many records]
- **Duration**: [How long stored]

## Necessity & Proportionality
- [ ] Processing is necessary for stated purpose
- [ ] Less intrusive alternative evaluated
- [ ] Data minimization applied

## Risk Assessment
| Risk | Likelihood | Impact | Risk Level | Mitigation |
|------|-----------|--------|------------|------------|
| Data breach | H/M/L | H/M/L | H/M/L | [control] |
| Unauthorized access | H/M/L | H/M/L | H/M/L | [control] |
| Function creep | H/M/L | H/M/L | H/M/L | [control] |
| Re-identification | H/M/L | H/M/L | H/M/L | [control] |

## Compliance Measures
- [ ] Encryption at rest and in transit
- [ ] Access control and authentication
- [ ] Consent mechanism implemented
- [ ] Data retention policy applied
- [ ] Breach notification procedure ready
- [ ] Data subject rights supported

## Decision
- **Risk acceptable?** Yes / No
- **DPO consulted?** Yes / No
- **Approved by:** [Name, Date]
```

---

## Privacy Checklist

### For Code Review

- [ ] PII fields identified and classified
- [ ] PII encrypted at rest (sensitive data)
- [ ] PII not logged (or logged with masking)
- [ ] PII not in URLs (query parameters)
- [ ] PII not in error messages or stack traces
- [ ] PII not stored in browser localStorage/sessionStorage
- [ ] PII access audit-logged (who accessed what, when)
- [ ] Consent verified before processing PII
- [ ] Data retention enforced (auto-delete/anonymize)
- [ ] Data export endpoint available (portability)
- [ ] Account deletion endpoint available (erasure)
- [ ] Third-party sharing documented and consented

### For New Features

- [ ] DPIA conducted if processing sensitive data
- [ ] Privacy policy updated to reflect new processing
- [ ] Consent mechanism covers new processing purpose
- [ ] Data minimization applied (collect only what's needed)
- [ ] Retention period defined for new data
- [ ] Data flow documented

### For Third-Party Integrations

- [ ] Data Processing Agreement (DPA) in place
- [ ] Third party's privacy practices verified
- [ ] Cross-border transfer compliance checked (UU PDP: setara atau lebih tinggi)
- [ ] Data shared is minimized
- [ ] User informed about third-party sharing

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "We don't handle PII" | If you have user accounts, you handle PII. Email + name = PII. |
| "It's just analytics" | Analytics with user IDs or IP addresses = PII processing. |
| "We anonymized it" | If you can re-identify the individual, it's pseudonymization (still PII). |
| "Consent is just a checkbox" | Consent must be freely given, specific, informed, and unambiguous. |
| "Users can delete their account" | Does deletion remove PII from backups, logs, and third-party systems? |
| "We're too small for GDPR/UU PDP" | UU PDP applies to ALL data processors, regardless of size. |
| "Internal tools don't need privacy" | Employee data is PII too. UU PDP protects all personal data. |

---

## Integration

**This skill is used by:**
- **security-audit** — Privacy compliance check during audit
- **code-review** — Privacy perspective of code review
- **writing-plans** — Pre-flight privacy check for PII features
- **security workflow** — Data privacy verification step

**This skill pairs with:**
- **secure-code-patterns** — Encryption and data masking patterns
- **secrets-management** — PII as sensitive data
- **threat-modeling** — Information disclosure threats (STRIDE-I)

**This skill feeds into:**
- **knowledge-compounding** — Document privacy patterns in `docs/solutions/security/`
