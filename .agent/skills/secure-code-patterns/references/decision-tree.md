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
└─ NO → Done; the branches above still apply to any data this code touches
```

---
