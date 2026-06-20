---
description: "Run read-only security, dependency, compatibility, agent-surface, MCP, compliance, and release-readiness checks."
---

# Audit Workflow

Use this when risk matters: auth, secrets, dependencies, MCP/tools, agent prompts/hooks, PII, payments, compliance, releases, or broad health checks.

## Usage

```text
/audit
/audit security
/audit compat
/audit release
/audit agent
```

## Steps

1. Identify audit scope and whether the user requested a submode.
2. Load `skills/security-audit/SKILL.md` for security, auth, secrets, OWASP, dependency, agent-surface, compliance, and readiness concerns.
3. Load `skills/compatibility-check/SKILL.md` for dependency/runtime compatibility.
4. Load `skills/threat-modeling/SKILL.md`, `skills/data-privacy/SKILL.md`, or `skills/secure-code-patterns/SKILL.md` only when the scope needs that depth.
5. Inspect project manifests, env examples, lockfiles, CI/deploy config, hooks, MCP config, and relevant source files.
6. Run available read-only checks: tests, lint, build, dependency audit, secret scan, or targeted grep.
7. Report findings by severity with evidence, affected files, and recommended fixes.
8. Stop for approval before applying changes.

## Output

- Findings first, ordered by severity.
- Evidence for each finding.
- Clear distinction between confirmed issues, risks, and unverified assumptions.
