# Implementer Brief - {{RUN_ID}} / GOAL-{{NNN}}

## Summary

<State purpose, scope, key information, and decision/outcome for this document.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Goal ID: FSD-{{PROJECT}}#GOAL-{{NNN}}
Issue pointer: {{ISSUE_PATH}}
Contract refs: None / FSD-{{PROJECT}}@{{VERSION}}#CONTRACT-{{NNN}}
Model tier: extraction / generation
Report path: {{REPORT_PATH}}
Completion contract: {{COMPLETION_CONTRACT_PATH}} / {{SHA256_DIGEST}}
Scope allowlist (read-only): {{PATHS_PATH}}
Base SHA: {{BASE_SHA}}
Exploration notes: None / {{EXPLORATION_PATH}}

## Scope

- Before editing, run `git rev-parse HEAD`; if it differs from Base SHA, stop
  and report a blocker instead of editing a diverged copy.
- Read the exploration notes first when present; do not repeat their work.
- Implement this one goal only; use TDD when behavior changes.
- Allowed target paths: {{TARGET_PATHS}}
- Never edit the scheduler-owned scope file; report a blocker instead of
  expanding scope.

## Verification

Read the pinned full goal/requirement/AC checklist before results. Run mapped
checks and compare actual outcomes with every criterion before claiming done:

```bash
{{VERIFICATION_COMMANDS}}
```

Apply `.agent/skills/verification-before-completion/SKILL.md`; command exit 0,
changed files and a screenshot's existence do not by themselves prove the goal.
Store real results/artifact locators with provenance; coordinator reviews them.

## Handoff

Write full evidence to {{REPORT_PATH}}; return only:

- Outcome: Done only after all criteria proven; otherwise Implemented — Pending
  Verification / Partially Verified / Verification Failed / Needs Validation / Blocked
- Report path and changed paths
- Verification status: command + pass/fail
- Blockers: None / OPEN-{{ID}}

The full report contains **Evidence of Completion** with requirement/AC refs,
what was verified, actual command/inspection, result and evidence locator.
Missing or failed evidence stays explicit; a handoff is not completion authority.
