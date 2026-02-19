---
name: secrets-management
description: "Use when handling credentials, API keys, tokens, or encryption keys. Ensures zero hardcoded secrets, proper vault usage, and incident response procedures."
---

# Secrets Management

## Overview

Ensure all credentials, API keys, tokens, and encryption keys are handled securely throughout the development lifecycle. Zero tolerance for hardcoded secrets — enforce proper storage, rotation, and incident response.

**Announce:** "I'm using the secrets-management skill to verify secure credential handling."

**Core principle:** If a secret touches code, it's already compromised. Secrets belong in the environment, never in the repository.

## Modes

| Mode | Trigger | Scope | Output |
|------|---------|-------|--------|
| **Pre-flight** | Automatically during `/plan` when adding API integrations, auth, or deployments | Feature-specific | Secrets section in plan document |
| **Scan** | During `/security` workflow or code review | Codebase-wide | Secrets exposure findings |
| **Incident** | When a secret is compromised | Specific credential | Rotation + remediation report |

---

## Golden Rules

### Rule #1: Never Commit Secrets to Git

**Absolutely forbidden in any file tracked by Git:**
- Passwords, database credentials
- API keys, access tokens, bearer tokens
- Private keys, certificates (.key, .pem, .p12, .jks)
- JWT signing secrets
- OAuth client secrets
- Webhook secrets
- Encryption keys

### Rule #2: Environment Variables Only

All secrets must be injected via:
- Environment variables (`process.env`, `os.environ`, `System.getenv()`)
- Secret management services (vault, cloud secrets manager)
- Encrypted configuration (Spring Cloud Config, sealed secrets)

**Never** use:
- Hardcoded strings in source code
- Config files committed to git (even "encrypted by hand")
- Comments with credential values
- Default passwords that stay unchanged

### Rule #3: .env Never Committed

**Every project must have:**

```
.gitignore:
  .env
  .env.local
  .env.*.local
  .env.production
  *.key
  *.pem
  *.p12
  *.jks
  secrets/
  credentials/
```

**And provide a template:**

```bash
# .env.example — Safe to commit (no real values)
DATABASE_URL=postgresql://localhost:5432/mydb
DATABASE_USERNAME=dev_user
DATABASE_PASSWORD=CHANGE_ME
API_KEY=your_api_key_here
JWT_SECRET=generate_with_openssl_rand_base64_64
```

### Rule #4: Different Secrets Per Environment

Never share credentials between environments:

| Secret | Development | Staging | Production |
|--------|-------------|---------|------------|
| DB Password | `dev_pass_123` | `stg_<random>` | `<vault-managed>` |
| API Key | `test_key` | `stg_key` | `<vault-managed>` |
| JWT Secret | `dev_jwt_secret` | `<random>` | `<vault-managed>` |

### Rule #5: Rotate Regularly

**Recommended rotation schedule:**

| Secret Type | Frequency | Trigger |
|-------------|-----------|---------|
| Database passwords | Every 90 days | Scheduled |
| API keys | Every 90 days | Scheduled |
| JWT signing keys | Every 90 days | Scheduled |
| Session secrets | Every 90 days | Scheduled |
| ALL secrets | Immediately | Security incident |

---

## Secret Detection & Prevention

### Pre-Commit Hooks

Set up automatic scanning before code reaches the repository:

**Option 1 — git-secrets:**
```bash
# Install
# macOS: brew install git-secrets
# Linux: apt install git-secrets
# Windows: manual install from GitHub

# Setup in repo
git secrets --install
git secrets --add 'password\s*[:=]\s*["\047][^"\047]{8,}["\047]'
git secrets --add 'api_?key\s*[:=]\s*["\047][^"\047]{16,}["\047]'
git secrets --add 'secret\s*[:=]\s*["\047][^"\047]{16,}["\047]'
git secrets --add 'token\s*[:=]\s*["\047][^"\047]{16,}["\047]'
```

**Option 2 — Gitleaks (recommended):**
```bash
# Install: https://github.com/gitleaks/gitleaks
gitleaks detect --source . --verbose

# As pre-commit hook
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

**Option 3 — TruffleHog:**
```bash
# Scan repo history
trufflehog git file://. --since-commit HEAD~10 --only-verified
```

### CI/CD Secret Scanning

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Gitleaks Scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# GitLab CI example
secret_detection:
  stage: test
  script:
    - gitleaks detect --source . --report-format json --report-path gl-secret-detection-report.json
```

---

## Secret Storage Solutions

### By Environment

| Environment | Solution | Complexity |
|-------------|----------|------------|
| Local Development | `.env` file (git-ignored) | ⭐ Simple |
| CI/CD Pipelines | Platform secrets (GitHub/GitLab/etc.) | ⭐⭐ Medium |
| Staging | Cloud secrets manager or vault | ⭐⭐ Medium |
| Production | Vault + auto-rotation | ⭐⭐⭐ Advanced |

### Common Patterns

**Pattern 1 — Environment Variables (All stacks):**
```bash
# Load from environment
DB_PASSWORD=${DATABASE_PASSWORD}          # Shell
process.env.DATABASE_PASSWORD             # Node.js
os.environ.get('DATABASE_PASSWORD')       # Python
System.getenv("DATABASE_PASSWORD")        # Java
os.Getenv("DATABASE_PASSWORD")            # Go
env('DATABASE_PASSWORD')                  # PHP/Laravel
ENV['DATABASE_PASSWORD']                  # Ruby
```

**Pattern 2 — Cloud Secrets Manager:**
```
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id myapp/production/db

# GCP Secret Manager
gcloud secrets versions access latest --secret=db-password

# Azure Key Vault
az keyvault secret show --vault-name myvault --name db-password
```

**Pattern 3 — HashiCorp Vault:**
```bash
# Read secret
vault kv get secret/myapp/database

# Dynamic secrets (auto-rotating database credentials)
vault read database/creds/myapp-role
```

---

## Secrets Checklist

Use during code review and security audit:

### Source Code
- [ ] No hardcoded passwords, API keys, tokens, or secrets in any file
- [ ] No secrets in code comments
- [ ] No default/example credentials that could work in production
- [ ] No secrets in test fixtures or seed data that could leak

### Configuration
- [ ] `.env` and secret files in `.gitignore`
- [ ] `.env.example` exists with placeholder values
- [ ] Different credentials per environment (dev/staging/prod)
- [ ] No secrets in checked-in config files (even encrypted)

### Runtime
- [ ] Secrets loaded from environment variables or vault
- [ ] Secrets not logged (mask in log output)
- [ ] Secrets not in error messages or stack traces
- [ ] Secrets not in URLs (query parameters)
- [ ] Secrets not in browser localStorage/sessionStorage

### Operations
- [ ] Secret rotation schedule defined
- [ ] Incident response procedure documented
- [ ] Access to production secrets limited (least privilege)
- [ ] Secret access audited (who accessed what, when)

---

## Secret Compromise Incident Response

### If a Secret is Exposed:

**Immediate (< 1 hour):**
1. ✅ **Rotate** — Generate new secret immediately
2. ✅ **Revoke** — Invalidate the compromised secret
3. ✅ **Deploy** — Update all systems using the secret
4. ✅ **Verify** — Confirm application health with new secret
5. ✅ **Alert** — Notify security team

**Investigation (< 24 hours):**
1. ✅ Determine how the secret was exposed
2. ✅ Check access logs for unauthorized usage
3. ✅ Identify blast radius (what could the secret access?)
4. ✅ Review git history for additional exposures
5. ✅ Document timeline of events

**Remediation (< 1 week):**
1. ✅ Add detection mechanism to prevent recurrence
2. ✅ Update team training/documentation
3. ✅ Complete incident report
4. ✅ Review and improve secrets management process

### If Secret Found in Git History:

```bash
# Option 1: BFG Repo Cleaner (recommended)
bfg --replace-text passwords.txt repo.git

# Option 2: git filter-branch (slower)
git filter-branch --force --tree-filter \
  'find . -name "*.env" -exec rm {} \;' HEAD

# ALWAYS rotate the exposed secret regardless of history cleanup
```

> **Warning:** Cleaning git history does NOT make the secret safe. Anyone who cloned the repo before cleanup still has it. **Always rotate.**

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "It's just a development key, it's fine" | Development keys become production keys. Treat all secrets equally. |
| "I'll remove it before the PR" | Secrets in git history persist forever. Pre-commit hooks prevent this. |
| "This repo is private" | Private repos get cloned, forked, and shared. Secrets in code spread. |
| "The .env file is encrypted" | If the encryption key is also in the repo, it's not encrypted. |
| "We'll rotate it later" | Later never comes until the breach. Automate rotation. |

---

## Integration

**This skill is used by:**
- **security-audit** — Secrets scan phase
- **code-review** — Secrets section of review
- **security workflow** — Step 4 (scan for secrets exposure)
- **writing-plans** — Pre-flight for API/auth features

**This skill pairs with:**
- **secure-code-patterns** — Encryption and key management patterns
- **threat-modeling** — Credential theft scenarios
- **architecture-enforcement** — Secret files in correct locations

**This skill feeds into:**
- **knowledge-compounding** — Document secrets incidents in `docs/solutions/security/`
