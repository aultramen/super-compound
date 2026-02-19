---
name: secure-code-patterns
description: "Use when implementing input validation, cryptography, data encryption, or secure data handling. Covers allowlist validation, context encoding, password hashing, encryption at rest/transit, and JWT security."
---

# Secure Code Patterns

## Overview

Implement secure coding patterns for input validation, data sanitization, cryptography, and secure data handling. This skill provides the HOW — concrete patterns and code guidance for building security into your application.

**Announce:** "I'm using the secure-code-patterns skill for secure implementation guidance."

**Core principles:**
- **Validate input, encode output** — Never trust data from outside your trust boundary
- **Use established crypto libraries** — Never roll your own encryption or hashing
- **Defense in depth** — Validate at every layer, not just the edge

---

## Part 1: Input Validation

### Multi-Layer Validation

Validate at every layer — not just one:

```
Client Side (Browser/App)  → UX feedback (not security)
    ↓
API Gateway / Middleware    → Format, size limits, rate limiting
    ↓
Controller / Route Handler → Type, format, required fields
    ↓
Service / Business Layer   → Business rules, relationships, permissions
    ↓
Database Layer             → Constraints, unique checks, foreign keys
```

> **Rule:** Client-side validation is for UX. Server-side validation is for security. Always do both.

### Principle: Allowlist Over Blocklist

❌ **Blocklist (insecure):** Try to block known bad patterns → always incomplete, always bypassable.

✅ **Allowlist (secure):** Define exactly what IS valid → reject everything else.

```
# Blocklist thinking: "Block <script> tags"
# Problem: What about <SCRIPT>, <scr\nipt>, <img onerror=...>, etc.

# Allowlist thinking: "Allow only [a-zA-Z0-9 '-] for names"
# Result: Everything else is automatically rejected
```

### Validation Patterns by Data Type

| Data Type | Validation | Max Length |
|-----------|------------|-----------|
| **Name** | `^[A-Za-zÀ-ÿ\s'-]+$` | 50-100 |
| **Email** | Use library validator (not regex) | 254 |
| **Phone** | `^\+?[0-9\s-()]+$` | 20 |
| **URL** | Parse and validate protocol + domain | 2048 |
| **Integer** | Parse + range check (min/max) | N/A |
| **Date** | Parse to date object + range check | N/A |
| **UUID** | `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` | 36 |
| **Enum** | Check against allowed values set | N/A |
| **Free text** | Sanitize HTML, enforce max length | 1000-10000 |
| **File name** | Strip path chars, generate UUID name | 255 |

### Validation Libraries by Stack

| Stack | Library | Usage |
|-------|---------|-------|
| **Node.js** | Zod, Joi, Yup | Schema validation |
| **Python** | Pydantic, Marshmallow, Cerberus | Model validation |
| **Java** | Bean Validation (JSR-380), Hibernate Validator | Annotation-based |
| **Go** | go-playground/validator | Struct tag validation |
| **PHP** | Laravel Validation, Symfony Validator | Rule-based |
| **Ruby** | ActiveModel Validations, dry-validation | Model/schema |
| **Rust** | validator crate | Derive macro |
| **C#** | DataAnnotations, FluentValidation | Attribute/fluent |

### Fail Securely

When validation fails:
1. **Log** the violation (without the input data if it could be sensitive)
2. **Return** a generic error message (don't reveal validation logic)
3. **Reject** the request entirely (don't partially process)
4. **Never** try to "fix" malicious input — reject it

---

### Context-Specific Output Encoding

Encode output based on WHERE it will be rendered:

| Context | Encoding | Purpose |
|---------|----------|---------|
| **HTML body** | HTML entity encoding (`&lt;`, `&amp;`) | Prevent XSS |
| **HTML attribute** | HTML attribute encoding | Prevent attribute injection |
| **JavaScript** | JavaScript string encoding | Prevent JS injection |
| **URL parameter** | URL encoding (`%20`, `%3C`) | Prevent URL injection |
| **CSS** | CSS encoding | Prevent CSS injection |
| **JSON** | JSON serializer (not string concat) | Prevent JSON injection |
| **SQL** | Parameterized queries (NOT encoding) | Prevent SQL injection |

> **Rule:** Use your framework's built-in encoding. Modern template engines (React, Vue, Jinja2, Blade, Thymeleaf) auto-encode by default. Only use `dangerouslySetInnerHTML` / `{!! !!}` / `|safe` when you've sanitized the content.

### File Upload Validation

```
1. Check file size (enforce max)
2. Check file extension (allowlist only)
3. Check MIME type from content (not just header)
4. Check magic bytes (file signature)
5. Generate new filename (UUID + extension)
6. Store outside webroot (never in public/)
7. Serve via application with auth check
8. Scan for malware (if applicable)
9. Re-process images (strip EXIF, resize)
```

---

## Part 2: Cryptography

### Golden Rule: Never Roll Your Own Crypto

**Never implement your own:**
- Encryption algorithms
- Hash functions
- Random number generators
- Key derivation functions
- Cryptographic protocols

**Always use established libraries:**

| Stack | Crypto Library |
|-------|---------------|
| **Node.js** | `crypto` (built-in), `bcrypt`, `argon2` |
| **Python** | `cryptography`, `bcrypt`, `hashlib` |
| **Java** | JCA/JCE, Bouncy Castle, Spring Security Crypto |
| **Go** | `crypto/*` (stdlib), `golang.org/x/crypto` |
| **PHP** | `password_hash()`, `openssl_*`, Sodium |
| **Ruby** | `bcrypt`, `openssl`, `rbnacl` |
| **Rust** | `ring`, `rust-crypto`, `argon2` |
| **C#** | `System.Security.Cryptography`, BCrypt.Net |

### Approved Algorithms (2024+)

| Purpose | ✅ Use | ❌ Never Use |
|---------|--------|-------------|
| **Symmetric Encryption** | AES-256-GCM, ChaCha20-Poly1305 | DES, 3DES, RC4, AES-ECB |
| **Asymmetric Encryption** | RSA-4096, ECDSA P-256+ | RSA-1024, DSA |
| **Password Hashing** | Argon2id, bcrypt (cost 12+), scrypt | MD5, SHA-1, SHA-256 (unsalted) |
| **General Hashing** | SHA-256, SHA-384, SHA-512, BLAKE3 | MD5, SHA-1 |
| **Key Derivation** | PBKDF2-SHA256 (100k+ iterations), Argon2 | Single-pass hash |
| **Digital Signatures** | Ed25519, ECDSA P-256, RSA-PSS | RSA PKCS#1 v1.5 (for new code) |
| **TLS** | TLS 1.3, TLS 1.2 | TLS 1.0, TLS 1.1, SSL |
| **JWT Signing** | RS256, ES256, EdDSA | HS256 (with weak secret), none |

### Password Hashing Checklist

- [ ] Passwords hashed with bcrypt (cost ≥ 12) or Argon2id
- [ ] Salt is auto-generated per password (never manual/shared salt)
- [ ] Password never stored in plain text anywhere (including logs)
- [ ] Password strength requirements enforced (12+ chars, complexity)
- [ ] Common password list checked (top 10k banned)
- [ ] Password verified using constant-time comparison
- [ ] Old password hashes upgraded on login (if migrating algorithm)

### Data Encryption Checklist

**At Rest:**
- [ ] Sensitive fields encrypted in database (PII, financial data)
- [ ] Encryption keys not stored alongside data
- [ ] Keys loaded from vault/environment (never hardcoded)
- [ ] Database connections use TLS
- [ ] Backup data encrypted

**In Transit:**
- [ ] TLS 1.2+ enforced for all connections
- [ ] HSTS header configured (includeSubDomains, max-age ≥ 1 year)
- [ ] Certificate pinning for mobile apps (if applicable)
- [ ] Internal service-to-service communication encrypted

### JWT Security Checklist

```
✅ DO:
- Use asymmetric algorithms (RS256, ES256) for multi-service
- Set short expiry (15-30 min for access tokens)
- Use refresh token rotation (single-use refresh tokens)
- Store refresh tokens in httpOnly cookies
- Validate issuer (iss), audience (aud), and expiry (exp)
- Include only necessary claims (minimize payload)

❌ DON'T:
- Use "none" algorithm (always verify signature)
- Store JWT in localStorage (XSS risk)
- Use HS256 with short/guessable secrets
- Set unlimited expiry
- Store sensitive data in JWT payload (it's base64, not encrypted)
- Use JWT for sessions when stateful sessions would work
```

### Secure Random Generation

**Always use cryptographically secure random:**

| Stack | Secure Random |
|-------|--------------|
| **Node.js** | `crypto.randomBytes()`, `crypto.randomUUID()` |
| **Python** | `secrets.token_hex()`, `secrets.token_urlsafe()` |
| **Java** | `java.security.SecureRandom` |
| **Go** | `crypto/rand.Read()` |
| **PHP** | `random_bytes()`, `random_int()` |
| **Ruby** | `SecureRandom.hex()`, `SecureRandom.uuid` |

**Never use** `Math.random()`, `random.random()`, `rand()` for security-sensitive values (tokens, keys, passwords, session IDs).

### Key Management Rules

1. **Generate** keys using cryptographically secure random
2. **Store** keys in vault or environment variables (never in code)
3. **Rotate** keys on schedule (every 90 days) and after incidents
4. **Separate** encryption keys from encrypted data
5. **Version** keys to support rotation without downtime
6. **Destroy** old keys after rotation grace period
7. **Audit** key access (who used which key, when)

---

## Decision Tree: Which Pattern Do I Need?

```
Handling user input?
├─ YES → Validate (allowlist) + Encode output (context-specific)
│   ├─ From form/API? → Use validation library + parameterized queries
│   ├─ Rendering in HTML? → HTML-encode output (use framework templating)
│   ├─ File upload? → Full file validation pipeline
│   └─ Building URL? → URL-encode parameters
└─ NO → Continue

Storing sensitive data?
├─ YES → Encrypt at rest
│   ├─ Password? → Hash with bcrypt/Argon2 (never encrypt passwords)
│   ├─ PII/Financial? → AES-256-GCM + key from vault
│   └─ API key? → Store in vault, not database
└─ NO → Continue

Transmitting data?
├─ YES → Encrypt in transit
│   ├─ HTTP? → Enforce HTTPS (TLS 1.2+)
│   ├─ API tokens? → Send in header (not URL)
│   └─ Cookies? → httpOnly + Secure + SameSite
└─ NO → Continue

Generating tokens/IDs?
├─ YES → Use cryptographically secure random
│   ├─ Session token? → 128+ bits of entropy
│   ├─ CSRF token? → 128+ bits, per-session
│   └─ API key? → 256 bits, store hash only
└─ NO → No security pattern needed for this code
```

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "Client-side validation is enough" | Client-side is for UX. Server-side is for security. Always do both. |
| "I'll sanitize the input to make it safe" | Prefer rejection over sanitization. You can't think of every bypass. |
| "MD5 is fine for non-security hashing" | MD5 has collision attacks. Use SHA-256 for all hashing. |
| "I'll encrypt the password" | Passwords should be HASHED (one-way), not encrypted (two-way). |
| "Our API is internal, no need for input validation" | Internal APIs are attacked via compromised services. Validate everywhere. |
| "I'll implement my own encryption for simplicity" | Rolling your own crypto is the #1 way to create vulnerable systems. |

---

## Integration

**This skill is used by:**
- **security-audit** — Verify secure patterns are implemented
- **code-review** — Check for secure coding practices
- **writing-plans** — Include secure patterns in implementation

**This skill pairs with:**
- **secrets-management** — Key storage and credential handling
- **threat-modeling** — Implement mitigations from threat analysis
- **architecture-enforcement** — Validation middleware placement

**This skill feeds into:**
- **knowledge-compounding** — Document secure patterns in `docs/solutions/security/`
