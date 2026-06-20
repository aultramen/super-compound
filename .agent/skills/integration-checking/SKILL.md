---
name: integration-checking
description: "Use after multi-component work to verify cross-component wiring: API contracts, data flow, events, auth, config, UI, background jobs, and tests."
---

# Integration Checking

## Overview

Existence is not integration. A route, component, service, or config file can exist and still be disconnected from the user-visible workflow.

**Announce:** "I'm using the integration-checking skill to verify cross-component wiring."

## Wiring Map

For the changed feature, trace:

```text
User action / external event
  -> UI or API entry point
  -> validation/auth
  -> service/domain logic
  -> persistence/external service
  -> response/event/job
  -> user-visible result or observable side effect
```

## Checks

| Area | Verify |
|------|--------|
| API contract | Callers send the fields the endpoint expects; responses match consumers |
| Data flow | Create/read/update/delete path works through all layers |
| Events/jobs | Emitters have handlers; handlers are registered and idempotent |
| Auth | Protected paths enforce auth and authorization at the boundary |
| Config | Required env vars exist in `.env.example` and are loaded |
| UI | Component is reachable, state updates, loading/error/empty states work |
| Tests | At least one test exercises the integrated path when practical |
| Docs | API/user/setup docs match the wired behavior |

## Output

```markdown
# Integration Check

**Feature:** <name>

## Wiring Trace
<trace>

## Findings
| Severity | Gap | Evidence | Required Fix |
|----------|-----|----------|--------------|

## Verification Commands
| Command | Result |
|---------|--------|
```

## Severity

- P1: user path broken, data loss/corruption, auth bypass, production-blocking config gap.
- P2: partial path broken, missing error/empty state, fragile event/job behavior.
- P3: docs/tests/observability improvements that do not block use.

## Integration

- Called by `executing-plans`, `verification-before-completion`, and `gap-closure`.
- Pair with `e2e-runner` for browser-visible workflows.
