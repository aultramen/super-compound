# Reviewer Brief - {{RUN_ID}} / GOAL-{{NNN}}

Goal ID: FSD-{{PROJECT}}#GOAL-{{NNN}}
Brief path: {{BRIEF_PATH}}
Report path: {{REPORT_PATH}}
Review package: {{REVIEW_PACKAGE_PATH}}
Model tier: generation

## Read Once, Spec First

Read the brief, report, and patch once. Judge acceptance and verification
refs before style; write separate `SPEC` and `QUALITY` verdicts using
`.agent/skills/subagent-orchestration/references/review-contract.md`.

## Findings Format

- `<file:line>` - evidence - required fix
- Every finding cites evidence from the patch, report, or a command result;
  no speculation.
- Flag extra scope, unapproved deviation, or invented contract as SPEC
  failures; do not request improvements outside the goal's scope.
- Emit findings, suggestions, and verification sections only when non-empty.

## Output

Write the review to {{REVIEW_PATH}} using the review-contract output block;
return the review path plus a bounded finding summary.
