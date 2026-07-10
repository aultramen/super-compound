## Threat Model Document Template

Save to `docs/security/YYYY-MM-DD-<component>-threat-model.md`:

```markdown
# Threat Model: [Component/Feature Name]

## Overview
- **Component:** [What is being analyzed]
- **Date:** [YYYY-MM-DD]
- **Risk Rating:** [Critical / High / Medium / Low]

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
1. [Risk without mitigation — needs treatment]

## Security Requirements
1. [Derived from analysis]
```

---
