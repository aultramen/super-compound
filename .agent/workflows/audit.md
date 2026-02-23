---
description: "Run a full project health audit. Checks security vulnerabilities (OWASP Top 10) and dependency compatibility (versions, EOL, conflicts). Read-only — never modifies files without approval."
---

# Audit Workflow

This workflow runs a comprehensive project health audit. It is **strictly read-only** — it reports findings and suggestions, but **never modifies any files** without your explicit approval.

> **Use when you want a full health check.** Run security-only or compatibility-only audits with subcommands.

## Usage

```
/audit              → Run BOTH security + compatibility (full health check)
/audit security     → Security only (OWASP, secrets, STRIDE, data privacy)
/audit compat       → Compatibility only (deps, versions, EOL conflicts)
```

---

## Section A: Security Audit

*Skipped when using `/audit compat`*

### A1. Read security-audit skill
Load `skills/security-audit/SKILL.md` and follow its Full Audit mode process.

### A2. Scan for secrets exposure
Load `skills/secrets-management/SKILL.md` and run Scan mode:
// turbo
- Hardcoded API keys, tokens, passwords (regex patterns)
- `.env` files tracked in git
- Secrets in config files, comments, or logs
- Private keys committed to repository
- Check `.gitignore` contains `.env` and secret file patterns

### A3. Check security configuration
// turbo
- `.env` in `.gitignore`
- `.env.example` exists with placeholder values
- Debug mode disabled in production configs
- Security headers configured (CSP, HSTS, X-Frame-Options)
- CORS properly restricted
- CSRF protection enabled (per framework)

### A4. Run OWASP Top 10 checklist
// turbo
Apply the full OWASP checklist from security-audit skill:
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Authentication Failures
- A08: Data Integrity Failures
- A09: Logging Failures
- A10: SSRF

### A5. Check secure code patterns
// turbo
Load `skills/secure-code-patterns/SKILL.md` and verify:
- Input validation on all user-facing inputs (server-side)
- Output encoding in templates (context-specific)
- Cryptography uses approved algorithms (AES-256-GCM, bcrypt/Argon2)
- JWT configured securely (algorithm, expiry, storage)
- Parameterized queries for all database access

### A6. Review authentication implementation
// turbo
Based on project config:
- JWT: Verify signing algorithm, token expiry, refresh rotation, storage
- Session: Verify httpOnly, Secure, SameSite, regeneration
- OAuth2: Verify PKCE, state parameter, callback validation

### A7. Quick STRIDE threat assessment
// turbo
If auth/data features exist, run STRIDE scan from `skills/threat-modeling/SKILL.md`:
- Identify major trust boundaries
- Check for missing auth/authz on entry points
- Verify audit logging for sensitive operations
- Check for DoS vectors (rate limiting, pagination)

### A8. Run vulnerability scan (per stack)
// turbo
- **Node.js:** `npm audit --json`
- **Python:** `pip-audit --format json` or `safety check`
- **Go:** `govulncheck ./...`
- **PHP:** `composer audit`
- **Ruby:** `bundle-audit check --update`

### A9. Data privacy check
// turbo
If project processes PII, invoke `skills/data-privacy/SKILL.md`:
- Verify consent mechanism exists
- Check PII encrypted at rest
- Verify PII not logged in plain text
- Check data subject rights (access, delete, export)

---

## Section B: Compatibility Audit

*Skipped when using `/audit security`*

### B1. Read compatibility-check skill
Load `skills/compatibility-check/SKILL.md` and follow its Audit mode process.

### B2. Scan dependency files
// turbo
Read all package manifests:
- `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- `requirements.txt`, `pyproject.toml`, `Pipfile`, `Pipfile.lock`
- `go.mod`, `go.sum`
- `composer.json`, `composer.lock`
- `Cargo.toml`, `Cargo.lock`
- `Gemfile`, `Gemfile.lock`

### B3. Detect runtime versions
// turbo
- `.node-version`, `.nvmrc`, `engines` field in `package.json`
- `.python-version`, `requires-python` in `pyproject.toml`
- `.tool-versions` (asdf)
- `Dockerfile` base images

### B4. Run compatibility analysis
- Build dependency map (all deps + versions)
- Cross-reference key combinations
- Check for deprecated/EOL dependencies
- Check peer dependency conflicts
- Verify framework ↔ runtime compatibility

### B5. Web search for flagged issues
For each flagged combination:
- Known incompatibilities and breaking changes
- End-of-life and deprecation notices
- Security advisories
- Recommended version combinations

---

## Shared: Report & Approval Gate

### Generate report

Produce structured audit report with severity levels:

| Severity | Meaning |
|----------|---------|
| 🔴 **Critical / P1** | Will break at runtime or poses critical security risk |
| 🟡 **Warning / P2** | Risky, deprecated, approaching EOL, or important security gap |
| 🟢 **Info / P3** | Suggestions, newer versions, best-practice improvements |

### ⛔ STOP — Ask for approval

> "Would you like me to apply any of these suggestions? Select by number, or say 'none'."

- **NEVER modify any file before this step**
- Only act on items the user explicitly approves
- For approved items, create a plan before executing changes

---

## When to Use
- Before major dependency upgrades
- After cloning/importing a new project (pairs well with `/init`)
- Before deployment to production
- When encountering unexplained build or test failures
- Periodic health checks on long-running projects
- When onboarding to an unfamiliar codebase

## When to Skip
- Brand new project with no dependencies yet
- Single-file scripts or trivial projects
- You just ran this workflow and nothing changed
