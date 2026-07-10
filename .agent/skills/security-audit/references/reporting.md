## Evidence Format

Report findings first, ordered by severity:

```markdown
## Findings

### P1: <title>
File: <path:line>
Risk: <what can happen>
Evidence: <specific code or behavior>
Fix: <minimal corrective action>
Verification: <test or command>

## No-Finding Checks
- <important area checked with no issue>

## Residual Risk
- <risk that remains, owner, and next review>
```

Severity:

- `P0`: Active exposure, trivial exploit, data loss, auth bypass, secret leak
- `P1`: High-impact vulnerability or likely exploit path
- `P2`: Medium-impact bug, defense gap, or missing control
- `P3`: Hardening, documentation, or low-likelihood issue

## Verification

Prefer native project commands:

- Unit/integration tests for security behavior
- Dependency audit or lockfile verification
- Static search for secrets and unsafe APIs
- Manual review of auth/permission paths
- Browser/API checks for headers, cookies, redirects, and error responses

Do not mark a finding fixed until the original exploit path is no longer possible and a regression check exists or is explicitly documented as manual.
