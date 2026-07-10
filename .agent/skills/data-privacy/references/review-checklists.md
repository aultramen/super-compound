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
