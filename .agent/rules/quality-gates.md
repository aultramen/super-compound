# Quality Gates

## Verification Rules

**The Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Before claiming ANY work is complete:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the FULL command (fresh, complete)
3. **READ** — Full output, check exit code, count failures
4. **VERIFY** — Does output confirm the claim?
5. **CLAIM** — Only then make the claim WITH evidence

### Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Done!")
- About to commit without running tests
- Trusting subagent success reports without independent verification

---

## Knowledge Compounding

When a non-trivial problem is solved, document it.

### Triggers
- "that worked", "it's fixed", "working now", "problem solved"

### Target
```
docs/solutions/<category>/<filename>.md
```

### Categories
`build-errors/`, `test-failures/`, `runtime-errors/`, `performance-issues/`, `database-issues/`, `security-issues/`, `ui-bugs/`, `integration-issues/`, `logic-errors/`

---

## Secrets & Environment Security

**The Environment Law: NEVER commit secrets. NEVER log secrets. NEVER hardcode secrets.**

### .env Rules

| Rule | Enforcement |
|------|------------|
| `.env` in `.gitignore` | **Mandatory** — verify on every project setup |
| `.env.example` exists | **Mandatory** — template with all keys, no real values |
| No secrets in source code | P1 Critical in code review |
| No secrets in logs | P1 Critical in code review |
| Different secrets per environment | dev ≠ staging ≠ production |

### Secret Patterns to Detect

```
# Red flags — search codebase for these patterns:
password = "..."          # Hardcoded password
api_key = "sk-..."        # API key in source code
SECRET_KEY = "..."        # Django/Flask secret in source
PRIVATE_KEY = "..."       # Private key in source
token = "eyJ..."          # JWT token in source code
connectionString = "..."  # Database connection string in source
```

### Environment Configuration

```
✅ DO:
- Access secrets via process.env / os.environ / os.Getenv
- Use .env files for local development only
- Use vault/secrets manager for production (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate secrets on schedule and after any exposure
- Use separate database credentials per environment

❌ DON'T:
- Commit .env files to git
- Copy production secrets to development
- Share secrets via chat/email
- Use the same secret for multiple services
- Store secrets in frontend code (they are visible to users)
```

### Verification Checklist (add to standard verification)

```
□ .env is in .gitignore?
□ .env.example exists with all required keys?
□ No secrets in committed code? (grep for patterns above)
□ No secrets in log output?
□ Production secrets in vault/secure config?
```

---

## Architecture Rules (Universal)

**Every file MUST follow dependency direction + complexity limits.**

Architectural violations during code review = **P1 Critical**.

### Complexity Limits

| Rule | Limit | Action |
|------|-------|--------|
| Max lines per file | 1000 | Split into modules |
| Max lines per function | 50 | Extract sub-functions |
| Max nesting depth | 3 | Guard clauses, early returns |
| Max function params | 4 | Use options object |
| Max module deps | 7 | Module too broad → split |
| God class | 10+ public methods | Split by responsibility |

### Dependency Direction

```
ALLOWED:  presentation → application → domain
          infrastructure → application → domain

FORBIDDEN: domain → infrastructure (business logic ≠ DB)
           domain → presentation  (business logic ≠ UI)
           application → presentation
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case or snake_case (per framework) | `user-service.ts` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase (JS/TS) or snake_case (Python/PHP) | `getUser()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Booleans | is/has/can prefix | `isActive` |

### Anti-Spaghetti Detection

| Pattern | Fix |
|---------|-----|
| Circular deps | Extract shared interface |
| Feature envy | Move function to owning module |
| Shotgun surgery (5+ file edits) | Missing abstraction |
| Deep nesting (4+) | Guard clauses, extract methods |
| Copy-paste code | Extract shared function |
| Magic numbers/strings | Named constants |

### Framework-Specific Guides

For per-framework folder structure and dependency rules, invoke the `architecture-enforcement` skill. It contains detailed guides for: Next.js, React+Vite, Nuxt, FastAPI, Django, Go Gin, Laravel, SvelteKit, React Native.

### Enforcement Checklist

```
□ File in correct directory per architecture guide?
□ Imports respect dependency direction?
□ File under 1000 lines? Functions under 50?
□ Nesting ≤ 3? No circular deps?
□ Business logic in service/domain layer only?
```
