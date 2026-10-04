# New Developer Follow-ups

## Summary

Track the next-phase additions from the approved improvement plan. The priority
file-safety, instruction, onboarding and generated-output changes are implemented;
these additions need their own bounded behavior cases before changing more tools.

| ID | Work | Owner | Acceptance |
|---|---|---|---|
| ND-F01 | Standardize help across the remaining active CLIs | Framework maintainer / authorized work route | Help, typos and incomplete options write nothing; keep valid defaults, JSON and exit contracts; additive `--text` for any new human machine-report view |
| ND-F02 | Knowledge reminder based on successful edits and actual capture | Framework maintainer / authorized work route | Failed edit and knowledge-only edits do not nudge; updating an existing solution suppresses the nudge; later uncaptured successful source edits nudge once; preserve local-first advisory hooks |
| ND-F03 | Run the five onboarding scenarios with new developers | Product owner / eval route | Observe command discovery, result understanding and correct next action for setup, bug, small change, feature and resume; record failures and corrections rather than infer success from static checks |

Next: choose a bounded follow-up through the owning work/eval route. Reference:
[implementation report](../audits/2026-10-04-new-developer-improvements.md).
