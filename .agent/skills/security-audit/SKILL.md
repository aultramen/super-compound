---
name: security-audit
description: "Use when auditing code for security vulnerabilities, reviewing auth flows, or checking OWASP Top 10 compliance. Provides comprehensive security checklists per framework. Includes secrets management golden rules, scanning tools, and incident response."
---

# Security Audit

## Overview

Systematically audit code for security vulnerabilities, enforce secure coding practices, and verify compliance with OWASP Top 10 and framework-specific security patterns.

**Announce:** "I'm using the security-audit skill to check for security vulnerabilities."

**Core principle:** Security is not optional. Every feature touches security — authentication, data handling, error responses, logging, and dependencies.

## Decision Tree: Route to Specialized Skills

```
Security concern identified
│
├─ Designing new feature with auth/data?
│  └─→ Invoke **threat-modeling** skill (STRIDE analysis)
│
├─ Handling credentials, API keys, or secrets?
│  └─→ See **Secrets Management** section in this skill
│
├─ Implementing input validation or cryptography?
│  └─→ Invoke **secure-code-patterns** skill
│
└─ General security audit / code review?
   └─→ Continue with this skill's OWASP checklist below
```

## Modes

| Mode | Trigger | Scope | Output |
|------|---------|-------|--------|
| **Pre-flight** | Automatically during `/plan` when auth/data features are involved | Specific feature security implications | Security section in plan document |
| **Review** | During code review (invoked by `code-review` skill) | Changed files only | Security findings in review report |
| **Full Audit** | On-demand via `/security` workflow | Entire codebase | Standalone security audit report |

---

## OWASP Top 10 Checklist

Use this as the primary audit framework. Check each item against the codebase:

| # | Category | What to Check |
|---|----------|---------------|
| A01 | **Broken Access Control** | Missing auth checks on routes, IDOR (direct object reference), privilege escalation, CORS misconfiguration |
| A02 | **Cryptographic Failures** | Plaintext passwords, weak hashing (MD5/SHA1), missing HTTPS, exposed secrets in code/logs |
| A03 | **Injection** | SQL injection, NoSQL injection, XSS (reflected/stored/DOM), command injection, LDAP injection |
| A04 | **Insecure Design** | Missing rate limiting, no account lockout, no CAPTCHA on public forms, trust boundary violations |
| A05 | **Security Misconfiguration** | Debug mode in production, default credentials, unnecessary features enabled, missing security headers |
| A06 | **Vulnerable Components** | Known CVEs in dependencies, outdated frameworks, unpatched libraries |
| A07 | **Auth & Session Failures** | Weak passwords allowed, no MFA, session fixation, JWT without expiry, missing token rotation |
| A08 | **Data Integrity Failures** | No integrity checks on updates, unsigned JWTs, insecure deserialization, no CI/CD pipeline security |
| A09 | **Logging & Monitoring Failures** | No audit trail, no failed login logging, sensitive data in logs, no alerting |
| A10 | **SSRF** | Unvalidated URL inputs, internal service exposure, DNS rebinding |

---

## Security Checklists by Category

### 🔐 Input Validation

- [ ] All user input validated (type, length, format, range)
- [ ] Server-side validation (never trust client-side only)
- [ ] Parameterized queries / ORM for all database operations
- [ ] HTML output encoded/escaped (XSS prevention)
- [ ] File paths validated (no path traversal `../`)
- [ ] URL inputs validated (no SSRF)
- [ ] Content-Type validated on request bodies
- [ ] Validation library used (Zod, Joi, Pydantic, Laravel Validation)

### 🔑 Authentication

- [ ] Passwords hashed with strong algorithm (bcrypt, argon2, scrypt)
- [ ] Password minimum complexity enforced
- [ ] Account lockout after N failed attempts
- [ ] Multi-factor authentication available (if applicable)
- [ ] Secure password reset flow (time-limited tokens)
- [ ] Session invalidation on password change
- [ ] Login rate limiting in place

### 🛡️ Authorization

- [ ] Every route/endpoint has auth check
- [ ] Role-based or attribute-based access control (RBAC/ABAC)
- [ ] No IDOR — users can only access their own resources
- [ ] Admin routes protected with additional checks
- [ ] API keys have scoped permissions
- [ ] Middleware enforces auth before reaching controller

### 🔒 Secrets Management

- [ ] No secrets in source code (hardcoded passwords, API keys, tokens)
- [ ] `.env` files in `.gitignore`
- [ ] `.env.example` template exists (without real values)
- [ ] Secrets accessed via environment variables only
- [ ] Different secrets per environment (dev/staging/prod)
- [ ] Secret rotation strategy documented
- [ ] No secrets in logs, error messages, or stack traces
- [ ] Production secrets in vault or secure config service

### 🌐 Security Headers

- [ ] `Content-Security-Policy` (CSP) configured
- [ ] `Strict-Transport-Security` (HSTS) enabled
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `X-XSS-Protection: 0` (CSP replaces this)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` configured (camera, microphone, geolocation)
- [ ] CORS properly configured (not `*` in production)

### 🚦 Rate Limiting & DDoS

- [ ] Rate limiting on authentication endpoints
- [ ] Rate limiting on API endpoints
- [ ] Rate limiting on password reset
- [ ] Rate limiting on file upload
- [ ] Appropriate error response (429 Too Many Requests)
- [ ] Progressive delays on repeated failures

### 📁 File Upload Security

- [ ] File type validation (MIME type + extension + magic bytes)
- [ ] File size limits enforced
- [ ] Files stored outside webroot
- [ ] Generated filenames (no user-provided names)
- [ ] Antivirus/malware scan (if applicable)
- [ ] No direct execution of uploaded files
- [ ] Image files re-processed (strip EXIF, resize)

### 🛑 Error Handling

- [ ] Generic error messages to users (no stack traces in production)
- [ ] Detailed errors only in development mode
- [ ] No database/query details in error responses
- [ ] No system path disclosure
- [ ] Custom error pages (404, 500)
- [ ] All errors logged server-side with context

### 🔐 Data Protection

- [ ] Sensitive data encrypted at rest (PII, financial data)
- [ ] HTTPS enforced for all connections (TLS 1.2+)
- [ ] Sensitive data not stored in localStorage/sessionStorage
- [ ] Database connections use TLS
- [ ] PII handling compliant with regulations (GDPR, etc.)
- [ ] Data retention/deletion policies implemented
- [ ] Backup data encrypted

### 📊 Logging & Monitoring

- [ ] Failed authentication attempts logged
- [ ] Authorization failures logged
- [ ] Input validation failures logged (without the input data)
- [ ] Administrative actions logged with actor
- [ ] Sensitive data NEVER appears in logs
- [ ] Log injection prevention (sanitize log inputs)
- [ ] Alerting on suspicious patterns (brute force, unusual access)
- [ ] Log retention policy defined

### 📦 Dependency Security

- [ ] No known CVEs in current dependencies
- [ ] Lock files committed (`package-lock.json`, `poetry.lock`, etc.)
- [ ] Automated vulnerability scanning in CI/CD
- [ ] Dependencies from trusted registries only
- [ ] Supply chain verification (checksums, signatures)

---

## Vulnerability Scan Commands

Run the appropriate command(s) based on the project's tech stack:

### Node.js / JavaScript

```bash
# npm
npm audit
npm audit --audit-level=high

# pnpm
pnpm audit
pnpm audit --audit-level=high

# yarn
yarn audit
yarn audit --level high
```

### Python

```bash
# pip-audit (recommended)
pip install pip-audit
pip-audit

# safety (alternative)
pip install safety
safety check

# bandit (static analysis)
pip install bandit
bandit -r . -ll
```

### Go

```bash
# govulncheck (official)
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# gosec (static analysis)
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...
```

### PHP

```bash
# composer audit
composer audit

# phpstan security rules
vendor/bin/phpstan analyse --level=max
```

### Rust

```bash
# cargo-audit
cargo install cargo-audit
cargo audit
```

### Ruby

```bash
# bundler-audit
gem install bundler-audit
bundle audit check --update
```

---

## Per-Framework Security Patterns

### JWT Security (All Frameworks)

```
✅ DO:
- Set short expiry (15-30 min for access tokens)
- Use refresh token rotation
- Store refresh tokens in httpOnly cookies
- Validate issuer, audience, and expiry
- Use RS256 or ES256 (asymmetric) for multi-service

❌ DON'T:
- Store JWT in localStorage (XSS risk)
- Use "none" algorithm
- Set unlimited expiry
- Store sensitive data in JWT payload
- Use HS256 with weak secrets
```

### Session Security (All Frameworks)

```
✅ DO:
- Regenerate session ID on login
- Set httpOnly flag on session cookies
- Set Secure flag (HTTPS only)
- Set SameSite=Strict or Lax
- Implement session timeout (idle + absolute)
- Invalidate session on logout

❌ DON'T:
- Store sessions in URL parameters
- Use predictable session IDs
- Keep sessions alive indefinitely
- Share sessions across subdomains (unless intentional)
```

### CORS Configuration

```
✅ DO:
- Whitelist specific origins
- Restrict allowed methods
- Restrict allowed headers
- Set Access-Control-Max-Age for preflight caching
- Use credentials: true only when needed

❌ DON'T:
- Use Access-Control-Allow-Origin: *
- Reflect Origin header without validation
- Allow all methods and headers
- Use credentials with wildcard origin
```

### CSRF Protection

| Framework | Built-in CSRF | Implementation |
|-----------|--------------|----------------|
| Next.js | Server Actions have built-in CSRF | Verify for API routes |
| Laravel | `@csrf` in Blade, `VerifyCsrfToken` middleware | Auto-applied |
| Django | `{% csrf_token %}`, `CsrfViewMiddleware` | Auto-applied |
| Express | `csurf` or `csrf-csrf` package | Manual setup required |
| FastAPI | Not built-in | Use `starlette-csrf` or custom |
| Go Gin | Not built-in | Use `gorilla/csrf` or custom middleware |
| Nuxt.js | Not built-in | Use `nuxt-csurf` module |

---

## Severity Classification

| Level | Label | Description | Action |
|-------|-------|-------------|--------|
| **P1** | 🔴 Critical | Active vulnerability exploitable in production | Must fix immediately |
| **P2** | 🟡 Important | Security weakness, lack of defense-in-depth | Should fix before release |
| **P3** | 🟢 Suggestion | Best practice not followed, hardening opportunity | Plan for improvement |

### Severity Examples

| Finding | Severity | Why |
|---------|----------|-----|
| SQL injection in login form | 🔴 P1 | Direct data breach risk |
| No rate limiting on login | 🟡 P2 | Brute force possible but not immediate |
| Missing CSP header | 🟢 P3 | Defense-in-depth, not direct vulnerability |
| Hardcoded API key in source | 🔴 P1 | Secret exposure |
| No HSTS header | 🟡 P2 | Downgrade attack possible |
| Console.log with user data | 🟡 P2 | Data leak in browser console |

---

## Security Review Exit Criteria

Before approving code as secure, verify:

- ✅ No P1 (Critical) findings remain open
- ✅ All P2 (Important) findings have mitigation plan or accepted risk
- ✅ Vulnerability scan shows no new high/critical CVEs
- ✅ Secrets scan found no hardcoded credentials
- ✅ Input validation present on all user-facing inputs
- ✅ Authentication and authorization checks verified
- ✅ Security headers configured
- ✅ Error responses don't leak sensitive information

---

## Audit Report Format

```markdown
# Security Audit Report

**Project:** [name]
**Date:** [YYYY-MM-DD]
**Scope:** [Full audit / Feature review / Pre-flight]
**Auditor:** AI (Super Compound security-audit skill)

## Summary

| Category | Status |
|----------|--------|
| OWASP A01 — Access Control | 🟢 Pass / 🟡 Partial / 🔴 Fail |
| OWASP A02 — Cryptographic Failures | ... |
| OWASP A03 — Injection | ... |
| ... | ... |

- 🔴 Critical: [count]
- 🟡 Important: [count]
- 🟢 Suggestion: [count]

## Findings

### 🔴 P1 — Critical (Must Fix)
1. **[Category]** — [File:line] — [Description + exploit scenario + fix]

### 🟡 P2 — Important (Should Fix)
1. **[Category]** — [File:line] — [Description + risk + fix]

### 🟢 P3 — Suggestions
1. **[Category]** — [Description + recommendation]

## Vulnerability Scan Results
[Output from npm audit / pip-audit / govulncheck / etc.]

## Recommendations
1. [Prioritized action items]
```

---

## Secrets Management

Ensure all credentials, API keys, tokens, and encryption keys are handled securely throughout the development lifecycle. Zero tolerance for hardcoded secrets.

**Core principle:** If a secret touches code, it's already compromised. Secrets belong in the environment, never in the repository.

### Modes

| Mode | Trigger | Output |
|------|---------|--------|
| **Pre-flight** | During `/plan` when adding API integrations, auth, or deployments | Secrets section in plan document |
| **Scan** | During `/security` workflow or code review | Secrets exposure findings |
| **Incident** | When a secret is compromised | Rotation + remediation report |

### Golden Rules

**Rule #1 — Never Commit Secrets to Git.** Forbidden in any git-tracked file: passwords, DB credentials, API keys, access tokens, bearer tokens, private keys (.key, .pem, .p12, .jks), JWT signing secrets, OAuth client secrets, webhook secrets, encryption keys.

**Rule #2 — Environment Variables Only.** All secrets injected via: environment variables, secret management services (vault, cloud), encrypted configuration. Never: hardcoded strings, config files in git, comments with credential values, unchanged default passwords.

**Rule #3 — .env Never Committed.**
```
# .gitignore must include:
.env
.env.local
.env.*.local
.env.production
*.key
*.pem
secrets/
credentials/
```
Always provide `.env.example` with placeholder values (safe to commit).

**Rule #4 — Different Secrets Per Environment.**

| Secret | Dev | Staging | Production |
|--------|-----|---------|------------|
| DB Password | `dev_pass_123` | `stg_<random>` | `<vault-managed>` |
| API Key | `test_key` | `stg_key` | `<vault-managed>` |
| JWT Secret | `dev_jwt_secret` | `<random>` | `<vault-managed>` |

**Rule #5 — Rotate Regularly.** Every 90 days for DB passwords, API keys, JWT signing keys, session secrets. Immediately on any security incident.

### Secret Detection Tools

**Gitleaks (recommended):**
```bash
gitleaks detect --source . --verbose
# As pre-commit hook via .pre-commit-config.yaml
```

**TruffleHog:**
```bash
trufflehog git file://. --since-commit HEAD~10 --only-verified
```

**CI/CD scanning (GitHub Actions):**
```yaml
- name: Gitleaks Scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Secret Storage by Environment

| Environment | Solution |
|-------------|----------|
| Local Development | `.env` file (git-ignored) |
| CI/CD Pipelines | Platform secrets (GitHub/GitLab/etc.) |
| Staging | Cloud secrets manager or vault |
| Production | Vault + auto-rotation |

**Cloud Secrets Managers:**
```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id myapp/production/db
# GCP Secret Manager
gcloud secrets versions access latest --secret=db-password
# Azure Key Vault
az keyvault secret show --vault-name myvault --name db-password
# HashiCorp Vault
vault kv get secret/myapp/database
```

### Secrets Checklist (Code Review)

**Source Code:**
- [ ] No hardcoded passwords, API keys, tokens in any file
- [ ] No secrets in code comments
- [ ] No default/example credentials that could work in production

**Configuration:**
- [ ] `.env` and secret files in `.gitignore`
- [ ] `.env.example` exists with placeholder values
- [ ] Different credentials per environment

**Runtime:**
- [ ] Secrets loaded from environment variables or vault
- [ ] Secrets not logged (masked in log output)
- [ ] Secrets not in error messages or URLs

**Operations:**
- [ ] Secret rotation schedule defined
- [ ] Access to production secrets limited (least privilege)
- [ ] Secret access audited

### Compromise Incident Response

**Immediate (< 1 hour):**
1. ✅ **Rotate** — Generate new secret immediately
2. ✅ **Revoke** — Invalidate the compromised secret
3. ✅ **Deploy** — Update all systems using the secret
4. ✅ **Verify** — Confirm application health with new secret
5. ✅ **Alert** — Notify security team

**Investigation (< 24 hours):**
1. ✅ Determine how the secret was exposed
2. ✅ Check access logs for unauthorized usage
3. ✅ Identify blast radius
4. ✅ Review git history for additional exposures

**If Secret Found in Git History:**
```bash
# BFG Repo Cleaner (recommended)
bfg --replace-text passwords.txt repo.git
# ALWAYS rotate the exposed secret regardless of history cleanup
```

> **Warning:** Cleaning git history does NOT make the secret safe. Anyone who cloned the repo before cleanup still has it. **Always rotate.**

---

## Compliance Framework Quick-Reference


Maps security controls checked by this skill to major compliance frameworks:

| Security Control | ISO 27001:2022 | NIST CSF 2.0 | CIS v8 |
|-----------------|----------------|--------------|--------|
| Access Control (RBAC, Least Privilege) | A.5.15, A.8.2 | PR.AC | Control 5-6 |
| Authentication (MFA, Strong Passwords) | A.5.17 | PR.AC-7 | Control 5.2 |
| Input Validation | A.8.28 | PR.IP | Control 16 |
| Cryptography (Encryption, Hashing) | A.8.24 | PR.DS | Control 3 |
| Secrets Management | A.8.24, A.5.17 | PR.DS-1 | Control 3.7 |
| Vulnerability Management | A.8.8 | DE.CM-8 | Control 7 |
| Audit Logging | A.8.15 | DE.AE | Control 8 |
| Security Headers (CSP, HSTS, CORS) | A.8.23 | PR.IP | Control 4 |
| Incident Response | A.16.1 | RS.AN, RS.MI | Control 17 |
| Secure Development | A.8.28, A.14.2 | PR.IP-12 | Control 16 |
| Data Protection / Privacy | A.5.10, A.8.11 | PR.DS | Control 3 |

> **Note:** Quick-reference only, not a full compliance assessment.

---

## Security Documentation Checklist

Verify these documents exist and are current:

| Document | Purpose | Update Trigger |
|----------|---------|----------------|
| `SECURITY.md` | Vulnerability reporting policy | CVE published |
| Security architecture doc | Auth, encryption, network | Architecture change |
| Privacy policy | Data processing transparency | PII handling change |
| `.env.example` | Configuration template | New env vars |

- [ ] `SECURITY.md` exists with vulnerability reporting instructions
- [ ] Security docs are < 90 days old
- [ ] Contact information is current
- [ ] Privacy policy reflects current data processing

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is an internal app, security doesn't matter" | Internal apps are breached too. Most breaches are internal. |
| "We'll add security later" | Later = after the breach. Secure by design. |
| "The framework handles security" | Frameworks provide tools, not guarantees. Verify configuration. |
| "We're behind a firewall" | Defense in depth. Firewalls are one layer. |
| "Nobody would try to hack this" | Automated scanners don't discriminate. Every public endpoint is a target. |
| "It's just a prototype" | Prototypes become production. Start secure. |

---

## Integration

**This skill is used by:**
- **code-review** — Security perspective of code review
- **writing-plans** — Pre-flight security check for auth/data features
- **security workflow** — Full on-demand security audit

**This skill invokes (for deeper analysis):**
- **threat-modeling** — STRIDE analysis and attack trees
- **secure-code-patterns** — Input validation and crypto implementation guidance
- **data-privacy** — Privacy compliance check for PII handling

**This skill pairs with:**
- **compatibility-check** — Dependency vulnerability scanning
- **architecture-enforcement** — Security headers and middleware placement
- **systematic-debugging** — When investigating security incidents

**This skill feeds into:**
- **knowledge-compounding** — Document resolved security issues in `docs/solutions/security/`
