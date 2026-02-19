---
description: "Run a full security audit on your codebase. Checks OWASP Top 10, scans dependencies, and reports vulnerabilities. Read-only — never modifies files without approval."
---

# Security Workflow

This workflow runs a comprehensive security audit on your codebase. It is **strictly read-only** — it reports findings and suggestions, but never modifies any files without your explicit approval.

## Steps

1. **Read the security-audit skill** — Load `skills/security-audit/SKILL.md` and follow its Full Audit mode process. Use the decision tree to route to specialized skills as needed.

2. **Announce** — "Running security audit. Scanning codebase for vulnerabilities..."

3. **Read project config** — Load `.agent/rules/project-config.md` for declared stack, auth method, and framework information.

4. **Scan for secrets exposure** — Load `skills/secrets-management/SKILL.md` and run its Scan mode:
   // turbo
   - Hardcoded API keys, tokens, passwords (regex patterns)
   - `.env` files tracked in git
   - Secrets in config files, comments, or logs
   - Private keys committed to repository
   - Check `.gitignore` contains `.env` and secret file patterns
   - Check `.env.example` exists with placeholder values

5. **Check security configuration** — Verify:
   // turbo
   - `.env` in `.gitignore`
   - `.env.example` exists
   - Debug mode disabled in production configs
   - Security headers configured
   - CORS properly restricted
   - CSRF protection enabled (per framework)

6. **Run OWASP Top 10 checklist** — Apply the full OWASP checklist from security-audit skill:
   // turbo
   - A01: Broken Access Control
   - A02: Cryptographic Failures
   - A03: Injection
   - A04: Insecure Design
   - A05: Security Misconfiguration
   - A06: Vulnerable Components
   - A07: Auth Failures
   - A08: Data Integrity Failures
   - A09: Logging Failures
   - A10: SSRF

7. **Check secure code patterns** — Load `skills/secure-code-patterns/SKILL.md` and verify:
   // turbo
   - Input validation present on all user-facing inputs (server-side)
   - Output encoding used in templates (context-specific)
   - Cryptography uses approved algorithms (AES-256-GCM, bcrypt/Argon2)
   - JWT configured securely (algorithm, expiry, storage)
   - File upload validation implemented (if applicable)
   - Parameterized queries used for all database access

8. **Review authentication implementation** — Based on project config:
   // turbo
   - JWT: Verify signing algorithm, token expiry, refresh rotation, storage
   - Session: Verify httpOnly, Secure, SameSite, regeneration
   - OAuth2: Verify PKCE, state parameter, callback validation

9. **Threat assessment** — If auth/data features exist, do a quick STRIDE scan from `skills/threat-modeling/SKILL.md`:
   // turbo
   - Identify major trust boundaries
   - Check for missing auth/authz on entry points
   - Verify audit logging for sensitive operations
   - Check for denial-of-service vectors (rate limiting, pagination)

10. **Run vulnerability scan** — Execute per stack:
    // turbo
    - **Node.js:** `npm audit --json`
    - **Python:** `pip-audit --format json` or `safety check`
    - **Go:** `govulncheck ./...`
    - **Java:** Check `pom.xml` / `build.gradle` for known CVEs
    - **PHP:** `composer audit`
    - **Ruby:** `bundle-audit check --update`

11. **Data privacy check** — If project processes PII (user accounts, personal data), invoke `skills/data-privacy/SKILL.md`:
    // turbo
    - Verify consent mechanism exists
    - Check PII is encrypted at rest
    - Verify PII not logged in plain text
    - Check data retention policy exists
    - Verify data subject rights are supported (access, delete, export)

12. **Generate report** — Create a structured audit report following the security-audit skill's report format:
    - Summary table with pass/partial/fail per OWASP category
    - Findings classified by severity (P1 Critical / P2 Important / P3 Suggestion)
    - Privacy compliance findings (if PII processing detected)
    - Vulnerability scan results
    - Prioritized recommendations
    - Note: Apply **Security Review Exit Criteria** from security-audit skill

13. **Present to user** — Show the report. Recommend next steps:
    - Fix P1 issues immediately
    - Schedule P2 issues for next sprint
    - Use `threat-modeling` skill for deeper analysis of high-risk areas
    - Run `/review` after fixes are applied
