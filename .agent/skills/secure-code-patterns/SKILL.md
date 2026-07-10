---
name: secure-code-patterns
description: "Use when implementing input validation, cryptography, data encryption, or secure data handling. Covers allowlist validation, context encoding, password hashing, encryption at rest/transit, and JWT security."
---

# Secure Code Patterns

## Overview

Implement secure input, output, cryptography, and data-handling controls at the trust boundary that owns them. Load only the implementation branch needed for the current code.

**Announce:** "I'm using the secure-code-patterns skill for secure implementation guidance."

**Core principles:** Validate input and encode output; use established cryptographic libraries; apply defense in depth.

## Reference Router

- Untrusted input, output rendering, SQL, URLs, or file uploads: [input validation](references/input-validation.md)
- Passwords, encryption, JWTs, TLS, keys, or security tokens: [cryptography](references/cryptography.md)
- Mixed or uncertain data handling: start with the [decision tree](references/decision-tree.md), then load only its selected branch
- Shortcut rationalizations during implementation or review: [red flags](references/red-flags.md)

Do not preload both large pattern references unless the change genuinely spans both validation and cryptography.

## Mandatory Gates

- **Boundary gate:** Server-side validation is mandatory. Define an allowlist for type, format, length, range, and relationships; client-side validation is UX only.
- **Output gate:** Encode for the exact HTML, attribute, JavaScript, URL, CSS, or JSON context. Use parameterized queries for SQL and framework encoders unless sanitized exceptional rendering is explicitly justified.
- **Fail closed gate:** Fail closed on invalid or malicious input: reject the whole request, return a generic error, and never log sensitive input. Do not partially process or guess a correction.
- **Crypto gate:** Never roll your own crypto. Use maintained libraries and supported algorithms. Hash passwords with a password-hashing algorithm; use cryptographically secure random; keep versioned keys outside code and separate from encrypted data.
- **Token gate:** Verify JWT signature, algorithm, issuer, audience, and expiry; minimize claims and protect refresh tokens. Never accept `none`, unlimited expiry, sensitive payloads, or weak secrets.
- **STOP gate:** Stop implementation when the trust boundary, output context, algorithm support, key custody, rotation path, or authorization requirement is unknown. Resolve it through the threat model, current primary documentation, or security owner.
- **Evidence gate:** Exercise valid, invalid, boundary, and abuse cases; record the library and configuration used, key or secret provenance without values, and the command or test proving rejection and protection behavior.

## Integration

Used by `security-audit`, `code-review`, and `writing-plans`. Pair with `threat-modeling` for mitigations, `architecture-enforcement` for control placement, `data-privacy` for sensitive data, and `knowledge-compounding` for reusable patterns under `docs/solutions/security/`.
