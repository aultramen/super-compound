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
- **RISK-001: <remaining risk; related finding/control ID>**
  - Owner: <accountable owner>
  - Treatment: <mitigate / accept / transfer / avoid; action and status>
  - Residual risk: <likelihood/impact after verified controls; OPEN / mitigated / accepted>
  - Decision: <authority, dated decision and evidence link; pending if unaccepted>
  - Review / expiry: <next review/date or trigger; expiry or justified N/A>
  - Verification: <check, actual result/status and evidence locator; pending if unverified>
```

Reuse existing risk IDs and decision/exception evidence. Planned treatment stays
OPEN; accepted status requires recorded decision authority and evidence.

For requested compliance scope, map applicable control IDs to applicability
rationale, observed implementation status, evidence/date, owner and residual
risk. Reuse evidence across controls; planned or documented controls alone do
not prove effectiveness or certification. For requested risk/exception lifecycle
reviews, disclose overdue reviews separately from vulnerabilities and passing
checks, using recorded dates rather than inventing review schedules.

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
