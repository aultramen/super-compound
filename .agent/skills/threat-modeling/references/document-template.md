## Threat Model Document Template

Save to `docs/security/YYYY-MM-DD-<component>-threat-model.md`:

```markdown
# Threat Model: [Component/Feature Name]

## Summary
[Purpose, scope, current outcome, material risks, and decision needed.]

## Overview
- **Component:** [What is being analyzed]
- **Date:** [YYYY-MM-DD]
- **Risk Rating:** [Critical / High / Medium / Low]

## High-Level Design
[Link the existing architecture/data-flow diagram, or show scoped components,
data flows, and trust-boundary crossings here.]

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
1. **RISK-001: [Remaining risk; related STRIDE finding/requirement]**
   - **Owner:** [Accountable owner]
   - **Treatment:** [Mitigate / accept / transfer / avoid; action and status]
   - **Residual risk:** [Likelihood/impact after verified controls; OPEN / mitigated / accepted]
   - **Decision:** [Authority, dated decision and evidence link; pending if unaccepted]
   - **Review / expiry:** [Next review/date or trigger; expiry or justified N/A]
   - **Verification:** [Check, actual result/status and evidence locator; pending if unverified]

## Security Requirements
1. [Derived from analysis]
```

Reuse risk IDs and existing decision/exception references across artifacts.
Planned mitigation remains OPEN; accepted status requires recorded decision
authority and evidence. An unknown decision or unverified check stays pending.

---
