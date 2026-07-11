---
name: security-audit
description: "Use when auditing code for security vulnerabilities, reviewing auth flows, checking OWASP Top 10 risks, validating secrets handling, or assessing dependency and agent-surface security."
---

# Security Audit

## Purpose

Find security risks with evidence, prioritize exploitability and impact, and recommend the smallest fix that closes the issue.

Announce: "I'm using the security-audit skill to check security risks."

Use directly for security work or through `/sc-audit security` for a broader audit. Audit mode is read-only. Caller boundary: inside `/sc-audit` or `/sc-review`, even explicit approval to fix requires a transition to `/sc-debug`, `/sc-plan`, `/sc-work`, or `/sc-go`; do not mutate inside the review route.

## Modes

| Mode | Trigger | Scope | Output |
|---|---|---|---|
| Pre-flight | During `/sc-plan` for auth, data, crypto, payments, uploads, webhooks, or external services | Proposed design | Security requirements and tests |
| Review | During code review | Changed files | Findings with file and line references |
| Full audit | `/sc-audit security` or explicit user request | Relevant codebase surface | Prioritized audit report |
| Incident response | Suspected secret or data exposure | Specific exposure path | Containment, rotation, and follow-up plan |

## Routing

Load only applicable branches:

- Routes, services, UI, storage, jobs, and integrations: [OWASP](references/owasp.md)
- Credential, token, key, log, history, or prompt exposure: [secrets](references/secrets.md)
- Dependency provenance, CVEs, lockfiles, or install behavior: [supply chain](references/supply-chain.md)
- Prompts, hooks, skills, workflows, MCP, plugins, or tools: [agent surface](references/agent-surface.md)
- Severity, finding structure, residual risk, and completion checks: [reporting](references/reporting.md)

Run `threat-modeling` first for new auth, PII, permission, payment, webhook, or upload features; use `secure-code-patterns` for implementation, `data-privacy` for PII, and `compatibility-check` for stack support. For compliance evidence, record control intent, evidence path, owner, date, and residual risk. Do not preload unrelated audit checklists.

## Mandatory Gates

- **Scope gate:** Define trusted and untrusted surfaces, assets, actors, entry points, authorization boundaries, and the files or configurations actually checked.
- **Finding gate:** Every finding needs severity, `file:line` evidence, exploit or failure path, impact, minimal fix, and verification. Report no-finding checks separately from uninspected areas.
- **Secret gate:** Never print a discovered secret. Identify only the location and exposure channel; containment, revocation, or rotation requires appropriate authority, and history rewriting always requires explicit approval.
- **STOP gate:** Surface P0 active exposure, trivial exploit, data loss, auth bypass, or secret leakage immediately; do not bury it behind lower-severity review.
- **Fix gate:** Do not mark a finding fixed until the original exploit path is impossible and a regression check exists or is explicitly documented as manual.
- **Evidence gate:** Findings come first in severity order. Preserve command output safely, redact sensitive values, document important no-findings, and state residual risk, owner, and next review.

## Related Skills

Use `threat-modeling`, `secure-code-patterns`, `data-privacy`, `compatibility-check`, `code-review`, and `verification-before-completion` for their respective branches and final completion gate.
