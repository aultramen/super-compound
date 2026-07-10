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
