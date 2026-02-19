---
name: threat-modeling
description: "Use BEFORE designing features that handle sensitive data, authentication, or external integrations. Identifies threats using STRIDE framework, attack trees, and trust boundary analysis."
---

# Threat Modeling

## Overview

Proactively identify security threats before they become vulnerabilities. Use structured frameworks (STRIDE, attack trees) to analyze features, data flows, and trust boundaries — then define mitigations before writing code.

**Announce:** "I'm using the threat-modeling skill to identify security threats in this design."

**Core principle:** Threats found during design cost 10x less to fix than threats found in production. Model first, code second.

## Modes

| Mode | Trigger | Scope | Output |
|------|---------|-------|--------|
| **Pre-flight** | Automatically during `/plan` when auth/data/API features are involved | Single feature | Threat section in plan document |
| **Full Model** | Via `/security` workflow (step 9) or invoked directly by security-audit skill | Component or system | Standalone threat model document |
| **Incident Response** | After security incident | Attack vector analysis | Updated threat model + new mitigations |

---

## STRIDE Framework

Analyze each component against all 6 threat categories:

### S — Spoofing Identity

**Question:** Can an attacker pretend to be someone they're not?

**Check for:**
- [ ] Authentication bypass (missing auth on routes)
- [ ] Session hijacking or fixation
- [ ] Credential stuffing / brute force feasibility
- [ ] API key theft and replay
- [ ] Token impersonation (JWT none algorithm, weak signatures)

**Common Mitigations:**
- Strong authentication (MFA where applicable)
- Rate limiting on auth endpoints
- Secure session management (httpOnly, Secure, SameSite cookies)
- Token expiry and rotation
- Account lockout after N failures

### T — Tampering with Data

**Question:** Can an attacker modify data they shouldn't?

**Check for:**
- [ ] Unvalidated user input reaching database
- [ ] Missing CSRF protection on state-changing operations
- [ ] Parameter tampering (hidden fields, query params, request body)
- [ ] SQL/NoSQL injection vectors
- [ ] Missing data integrity checks (checksums, signatures)

**Common Mitigations:**
- Input validation at every boundary
- Parameterized queries / ORM
- CSRF tokens on all forms and state-changing requests
- Data integrity verification (hashes, digital signatures)
- Audit logging on data modifications

### R — Repudiation

**Question:** Can a user deny performing an action?

**Check for:**
- [ ] Missing audit trail for sensitive operations
- [ ] Insufficient logging detail (who, what, when, where, outcome)
- [ ] Logs stored in mutable storage (can be tampered)
- [ ] Missing transaction records
- [ ] No correlation between related events

**Common Mitigations:**
- Comprehensive audit logging (actor, action, timestamp, IP, outcome)
- Tamper-resistant log storage (write-once, append-only)
- Digital signatures on critical transactions
- Log retention policy (minimum 1 year for security events)
- Centralized logging with integrity checks

### I — Information Disclosure

**Question:** Can an attacker access data they shouldn't see?

**Check for:**
- [ ] Verbose error messages (stack traces, DB details in production)
- [ ] PII/sensitive data in logs, URLs, or error responses
- [ ] Over-fetching data from APIs (returning more fields than needed)
- [ ] Missing field-level access control
- [ ] Exposed debug endpoints or admin panels
- [ ] Sensitive data in browser storage (localStorage, sessionStorage)

**Common Mitigations:**
- Generic error messages in production
- Field-level access control in API responses
- Data minimization (return only what's needed)
- PII redaction in logs
- Strict CSP and security headers
- Encrypt sensitive data at rest and in transit

### D — Denial of Service

**Question:** Can an attacker make the system unavailable?

**Check for:**
- [ ] Missing rate limiting on public endpoints
- [ ] Unbounded queries (no pagination, no timeout)
- [ ] Resource-intensive operations without quotas
- [ ] Missing circuit breakers for external dependencies
- [ ] File upload without size limits
- [ ] Regex denial of service (ReDoS)

**Common Mitigations:**
- Rate limiting per IP / per user / per endpoint
- Pagination on all list endpoints (max page size)
- Query timeouts
- Request size limits
- Circuit breakers for external calls
- Resource quotas per user/tier

### E — Elevation of Privilege

**Question:** Can a user gain permissions they shouldn't have?

**Check for:**
- [ ] Missing authorization checks (routes without middleware/guards)
- [ ] Horizontal privilege escalation (accessing other users' resources — IDOR)
- [ ] Vertical privilege escalation (regular user → admin)
- [ ] Insecure direct object references
- [ ] Role checks only at controller level (not at service level)
- [ ] Default/backdoor admin accounts

**Common Mitigations:**
- Authorization checks at multiple layers (controller + service)
- Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC)
- Principle of least privilege
- Ownership verification on resource access
- Regular access control audits
- No default credentials

---

## Attack Tree Analysis

Use attack trees to model complex multi-step attacks:

### Template

```
ROOT: [Attacker Goal]
├─ AND/OR: [Sub-goal 1]
│  ├─ [Attack Vector A] [Mitigated: control] / [OPEN: needs mitigation]
│  └─ [Attack Vector B] [Mitigated: control] / [OPEN: needs mitigation]
└─ AND/OR: [Sub-goal 2]
   ├─ [Attack Vector C] [Mitigated: control]
   └─ [Attack Vector D] [OPEN: needs mitigation]
```

### Legend
- **AND:** All child nodes must succeed for parent to succeed
- **OR:** Any child node success achieves parent goal
- **[Mitigated]:** Control in place, residual risk accepted
- **[OPEN]:** No control — needs mitigation

### Example

```
ROOT: Steal User Credentials
├─ OR: Obtain Password
│  ├─ Brute force login [Mitigated: rate limiting + lockout]
│  ├─ Credential stuffing [Mitigated: MFA + breach detection]
│  ├─ Phishing [OPEN: needs user training]
│  └─ SQL injection on login [Mitigated: parameterized queries]
└─ OR: Steal Session
   ├─ XSS to steal cookies [Mitigated: httpOnly + CSP]
   ├─ Session fixation [Mitigated: regeneration on login]
   └─ Network sniffing [Mitigated: TLS 1.2+]
```

---

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

## Threat Model Document Template

Save to `docs/security/YYYY-MM-DD-<component>-threat-model.md`:

```markdown
# Threat Model: [Component/Feature Name]

## Overview
- **Component:** [What is being analyzed]
- **Date:** [YYYY-MM-DD]
- **Risk Rating:** [Critical / High / Medium / Low]

## Assets
1. [What data/resources need protection]
2. [What capabilities need protection]

## Trust Boundaries
- [Boundary 1: e.g., Internet → Application]
- [Boundary 2: e.g., Application → Database]

## STRIDE Analysis

| Category | Threat | Likelihood | Impact | Risk | Mitigation | Status |
|----------|--------|-----------|--------|------|------------|--------|
| Spoofing | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |
| Tampering | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |
| Repudiation | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |
| Info Disclosure | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |
| Denial of Service | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |
| Elevation | [desc] | H/M/L | H/M/L | H/M/L | [control] | ✅/❌ |

## Attack Trees
[Insert attack tree diagrams]

## Open Risks
1. [Risk without mitigation — needs treatment]

## Security Requirements
1. [Derived from analysis]
```

---

## The Process

### Phase 1: Scope & Assets

1. **Define what you're modeling** — Single feature? Component? Whole system?
2. **List assets** — What data/resources need protection?
3. **Identify actors** — Who interacts with the system? (users, admins, external APIs, attackers)

### Phase 2: Map Data Flows & Trust Boundaries

1. **Draw data flow** — How does data move through the system?
2. **Mark trust boundaries** — Where does trust level change?
3. **Identify entry points** — Where can external input reach the system?

### Phase 3: STRIDE Analysis

For each component/data flow:
1. Walk through all 6 STRIDE categories
2. Rate likelihood and impact (High/Medium/Low)
3. Calculate risk = likelihood × impact
4. Document existing mitigations
5. Flag open risks

### Phase 4: Attack Trees (Optional)

For high-risk components:
1. Define attacker goal
2. Decompose into sub-goals (AND/OR)
3. Map attack vectors to each sub-goal
4. Mark mitigated vs open vectors

### Phase 5: Document & Handoff

1. Save threat model document
2. Create security requirements from open risks
3. Feed into implementation plan

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "This feature doesn't need threat modeling" | Every feature that handles data or interacts with users has threats. |
| "We'll do threat modeling after launch" | Threats in production are vulnerabilities that cost 10x more to fix. |
| "Our framework handles security" | Frameworks provide tools, not guarantees. Misconfiguration = vulnerability. |
| "It's an internal API, nobody will attack it" | 60% of breaches involve insider threats or lateral movement. |

---

## Integration

**This skill is used by:**
- **writing-plans** — Pre-flight threat check for auth/data features
- **security workflow** — Comprehensive threat assessment (step 9)

**This skill pairs with:**
- **security-audit** — Verify mitigations are implemented
- **secure-code-patterns** — Implement the mitigations
- **secrets-management** — Protect credentials identified in threat model

**This skill feeds into:**
- **knowledge-compounding** — Document threat patterns in `docs/solutions/security/`
