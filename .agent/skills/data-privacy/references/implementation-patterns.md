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

Retention periods: set each category from the applicable regulator's current
guidance and record the source and date next to the value.
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
