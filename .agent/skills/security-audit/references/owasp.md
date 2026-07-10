## OWASP Checklist

Check each applicable category against routes, services, UI, storage, jobs, and integrations.

| Category | What To Check |
|---|---|
| Broken access control | Missing auth checks, IDOR, privilege escalation, weak tenancy boundaries |
| Cryptographic failures | Weak hashing, plaintext secrets, missing TLS assumptions, exposed tokens |
| Injection | SQL/NoSQL/LDAP/command injection, unsafe HTML, unsafe template rendering |
| Insecure design | Missing rate limits, weak abuse controls, trust boundary confusion |
| Misconfiguration | Debug mode, default credentials, permissive CORS, missing security headers |
| Vulnerable components | CVEs, abandoned packages, suspicious package names, unsigned artifacts |
| Auth/session failures | Weak password policy, missing MFA where needed, JWT/session expiry mistakes |
| Integrity failures | Unsigned webhooks, unsafe deserialization, weak CI/CD controls |
| Logging/monitoring failures | Missing audit trail, sensitive logs, no alerting for critical events |
| SSRF | Unvalidated URLs, internal metadata access, DNS rebinding, unsafe redirects |
