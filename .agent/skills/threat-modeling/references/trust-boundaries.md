## Trust Boundary Analysis

Identify where data crosses trust boundaries:

```
[Untrusted] User Browser / Mobile App
    │
    ├─→ BOUNDARY: Internet → Application
    │       │
    │       ├─→ API Gateway / Load Balancer (rate limiting, WAF)
    │       └─→ Application Server
    │               │
    │               ├─→ Auth Middleware (verify identity)
    │               ├─→ Authorization Layer (verify permissions)
    │               └─→ Input Validation (sanitize all input)
    │
    ├─→ BOUNDARY: Application → Data Store
    │       │
    │       ├─→ Database (encrypted connections, parameterized queries)
    │       ├─→ Cache (session store, encrypted)
    │       └─→ File Storage (access controls, no direct execution)
    │
    └─→ BOUNDARY: Application → External Services
            │
            ├─→ Third-party APIs (HTTPS only, validate responses)
            ├─→ Email/SMS services (sanitize content)
            └─→ Payment gateways (PCI compliance, tokenization)
```

**At every boundary, ask:**
1. Is data validated before crossing?
2. Is the connection encrypted?
3. Is the caller authenticated and authorized?
4. Are responses validated before use?

---
