---
description: "Run read-only security, dependency, compatibility, agent-surface, MCP, compliance, and release-readiness checks."
---

# Audit Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when risk matters: auth, secrets, dependencies, MCP/tools, agent prompts/hooks, PII, payments, compliance, releases, or broad health checks.

Audit remains strictly read-only. Approval to remediate selects an owning
workflow; it never authorizes changes inside `/sc-audit`.


## Example

Input: `/sc-audit agent`.
Prerequisite: Named risk scope and relevant files/configuration.
Result and next action: Read-only findings by severity and evidence; route each repair to its authorized owner.

## Usage

```text
/sc-audit
/sc-audit security
/sc-audit compat
/sc-audit release
/sc-audit agent
```

## Steps

1. Identify audit scope and select only the requested submode.
2. Load `skills/security-audit/SKILL.md` for security, auth, secrets, OWASP, supply-chain, MCP, or agent-surface risk.
3. Load `skills/compatibility-check/SKILL.md` only for dependency/runtime compatibility.
4. Load `skills/threat-modeling/SKILL.md`, `skills/data-privacy/SKILL.md`, or `skills/secure-code-patterns/SKILL.md` only when that submode needs the depth. A release audit selects relevant branches rather than loading every checklist.
5. Inspect project manifests, env examples, lockfiles, CI/deploy config, hooks, MCP config, and relevant source files.
   Use `.agent/context/standards.contract.md` to inspect scoped policy/profile
   pins, check evidence, drift and approved exceptions. Findings distinguish
   deterministic checks from human review and name rule IDs/owners. Missing
   application required-status protection is administrator work, not workflow success.
6. For release or PR readiness, inspect Git state read-only for direct-main risk, dirty tree, unpushed branch, and secret-looking files.
7. Run available read-only checks: tests, lint, build, dependency audit, secret scan, or targeted grep.
8. Report findings by severity with evidence, affected files, and recommended fixes.
9. Route remediation without applying it here:
   - business scope or policy -> `/sc-explore`;
   - product requirement gap -> `/sc-prd`;
   - FSD, ADR, dependency approval, or goal authority -> `/sc-plan`;
   - reproduced defect -> `/sc-debug`;
   - approved goal implementation -> `/sc-work`;
   - branch, commit, push, or PR action -> `/sc-go`.
10. If complete evidence exceeds the chat envelope, save it to
    `docs/audits/YYYY-MM-DD-<scope>.md` and return the path; never omit a
    finding to satisfy an output cap. Then run
    `node .agent/tools/doc-lint.mjs <artifact> --advisory` and adjudicate its findings
    (advisory).
11. Checkpoint automatically and continue authorized work; use `/sc-pause` only when actually stopping.

## Output

- Findings first, ordered by severity.
- Evidence for each finding.
- Clear distinction between confirmed issues, risks, and unverified assumptions.
- Exact next owner for every remediation.
- Each finding stated exactly once in its reporting block, with evidence, fix, and next owner as fields of that block; summaries carry counts only, and remediation ordering references finding IDs.
