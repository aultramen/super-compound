## OPEN-* Stop Conditions

Stop and report `OPEN-xxx` instead of inventing a solution when:

- approved BRD, PRD, FSD, or ADR requirements conflict without precedence
- required FSD authority is missing
- a required ADR is absent, not accepted, deprecated, superseded, or out of scope
- a goal needs schema/API/auth/workflow/role/state behavior not in the FSD
- a critical UI state, visible/editable datum, network action, response, or error lacks a qualified mapping
- contract, schema, fixture, mock, typed consumer, or generated-client revisions drift
- a contract version is unpinned or the FSD and delegated machine contract conflict
- mock-only evidence is claimed as real integration or as permission for scale-out
- repository architecture materially contradicts the FSD
- required secret, account, environment, license, or sandbox is unavailable and no approved fallback exists
- security, privacy, compliance, audit, or data-integrity obligations cannot be met in allowed scope

An `OPEN-xxx` report must include:

```text
OPEN-001
Missing decision: <question>
Impacted refs: <qualified IDs>
Reason: <why implementation cannot proceed safely>
Owner/gate: <role/date/gate if known>
Approved fallback: <fallback or None>
Status: OPEN
```
