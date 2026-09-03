## STRIDE Framework

Walk all six categories for every component and data flow in scope: Spoofing,
Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of
Privilege. For each finding record the threat, likelihood, impact, current
mitigation, residual risk, and status in the document template.

Components this repository adds that a generic pass misses: agent hooks, MCP
configuration, installer scripts, and the loop-runtime state files under
`.agent/`; treat each as a trust boundary in its own right.

---
