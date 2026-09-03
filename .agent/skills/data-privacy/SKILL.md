---
name: data-privacy
description: "Use when processing personal data (PII), implementing consent mechanisms, or handling data subject requests. Covers GDPR, UU PDP Indonesia, and privacy-by-design principles."
---

# Data Privacy

## Overview

Ensure applications comply with data privacy regulations when processing personal data. Apply privacy by design across jurisdictions including GDPR, UU PDP Indonesia, CCPA, LGPD, and PDPA, and load only the reference branch needed for the active decision.

**Announce:** "I'm using the data-privacy skill to verify privacy compliance for personal data handling."

## Modes

| Mode | Trigger | Scope | Output |
|---|---|---|---|
| Pre-flight | During `/sc-plan` when features involve PII or user data | Feature-specific | Privacy section in plan document |
| Review | During code review when PII handling changes | Changed files | Privacy findings in review report |
| Audit | Via `/sc-audit privacy` or `security-audit` | Codebase-wide | Privacy compliance findings |

## Reference Router

Load only applicable branches:

- Defaults, minimization, transparency, and lifecycle design: [privacy by design](references/privacy-by-design.md)
- Jurisdiction, lawful basis, rights, breach timing, or cross-border transfer: [regulatory reference](references/regulatory-reference.md)
- Classification, consent, retention, anonymization, or data-subject requests: [implementation patterns](references/implementation-patterns.md)
- High-risk processing assessment: [DPIA template](references/dpia-template.md)
- Changed-code, new-feature, or third-party review: [review checklists](references/review-checklists.md)
- Shortcut or scope rationalizations: [red flags](references/red-flags.md)

For mixed work, load the minimum matching set. Treat regulatory values as a starting reference and verify current jurisdiction-specific requirements before relying on them.

## Mandatory Gates

- **STOP gate:** Do not approve processing while legal basis, purpose, data minimization, retention, consent or other lawful authority, sharing, or cross-border safeguards are unresolved.
- **DPIA gate:** Complete and approve a DPIA before high-risk processing proceeds; record mitigations and residual risk.
- **Consent gate:** Consent must be freely given, specific, informed, unambiguous, recorded, and as easy to withdraw as to give. Pre-ticked, silent, or bundled consent is invalid.
- **Rights gate:** Verify identity before disclosing or changing PII; log the request and support applicable access, correction, erasure, restriction, portability, objection, and withdrawal duties.
- **Lifecycle gate:** Classify PII, protect it in storage and transit, restrict and audit access, keep it out of URLs, logs, and errors, and enforce deletion or anonymization.
- **Evidence gate:** Report the data flow, classification, jurisdiction, legal basis, consent record, retention rule, rights controls, third parties, verification evidence, and residual risk. Distinguish missing evidence from a verified no-finding.

## Integration

Used by `security-audit`, `code-review`, `writing-plans`, and `/sc-audit security`. Pair with `secure-code-patterns` for encryption and masking, `threat-modeling` for disclosure threats, and `knowledge-compounding` for reusable privacy solutions under `docs/solutions/security/`.
