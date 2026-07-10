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
