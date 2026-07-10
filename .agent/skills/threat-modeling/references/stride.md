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
