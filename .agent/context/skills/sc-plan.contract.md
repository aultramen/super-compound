# /sc-plan Skill Contract

Use compact contracts until a step needs the full procedure.

| Need | Skill to full-load |
|---|---|
| delivery authority, traceability, OPEN stops | `agentic-delivery` |
| FSD structure and goal slicing | `writing-plans` |
| issue pointer creation | `issue-workflow` |
| raw issue triage | `triage-workflow` |
| plan quality gate | `plan-verification` |
| UI profile/readiness/first-slice gate | `agentic-delivery` UI readiness reference |
| vocabulary/seams still unclear | `domain-modeling`, `codebase-design` |

Always preserve: qualified refs, ADR applicability, exact `TDEC/ADR -> GOAL -> TEST`
coverage, OPEN blockers, verification refs, and zero-context-bloat issue pointers.
For UI-bearing work also preserve the PRD baseline, FSD Section 8 mappings,
pinned contract refs, readiness hard gates, and first-slice dependency.
