# Implementer Brief - {{RUN_ID}} / GOAL-{{NNN}}

Goal ID: FSD-{{PROJECT}}#GOAL-{{NNN}}
Issue pointer: {{ISSUE_PATH}}
Contract refs: None / FSD-{{PROJECT}}@{{VERSION}}#CONTRACT-{{NNN}}
Model tier: extraction / generation
Report path: {{REPORT_PATH}}
Scope allowlist (read-only): {{PATHS_PATH}}

## Scope

- Implement this one goal only; use TDD when behavior changes.
- Allowed target paths: {{TARGET_PATHS}}
- Never edit the scheduler-owned scope file; report a blocker instead of
  expanding scope.

## Verification

Run the goal's mapped commands before claiming done:

```bash
{{VERIFICATION_COMMANDS}}
```

## Handoff

Write full evidence to {{REPORT_PATH}}; return at most 15 lines:

- Outcome: complete / blocked
- Report path and changed paths
- Verification status: command + pass/fail
- Blockers: None / OPEN-{{ID}}
