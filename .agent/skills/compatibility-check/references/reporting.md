## Severity

| Level | Meaning |
|---|---|
| P0 | Known exploitable vulnerability, active breakage, or unsupported production runtime |
| P1 | Likely build/runtime break, incompatible peer dependency, or high CVE |
| P2 | Deprecated or near-EOL dependency, medium CVE, risky but workable mismatch |
| P3 | Upgrade opportunity, cleanup, or low-risk warning |

## Report Format

```markdown
# Compatibility Audit

## Summary
- P0: 0
- P1: 1
- P2: 2
- P3: 3

## Findings

### P1: <title>
Item: <dependency/runtime>
Evidence: <manifest, lockfile, docs, command output>
Impact: <what can break>
Recommendation: <specific action>
Verification: <command>

## Suggested Order
1. <highest value fix>
```
