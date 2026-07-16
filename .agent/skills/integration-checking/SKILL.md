---
name: integration-checking
description: "Use when multi-component work needs cross-component verification of API contracts, data flow, events, auth, config, UI, background jobs, or tests."
---

# Integration Checking

## Overview

Existence is not integration. A route, component, service, or config file can exist and still be disconnected from the user-visible workflow.

**Announce:** "I'm using the integration-checking skill to verify cross-component wiring."

## Wiring Map

For the changed feature, trace:

```text
User action / external event
  -> screen -> action / UI-STATE-* -> UIMAP-*
  -> operation + pinned SCHEMA-* / error contract
  -> validation/auth/permission
  -> service/domain logic
  -> persistence/external service
  -> response/event/job
  -> user-visible result or observable side effect
```

## Checks

| Area | Verify |
|------|--------|
| API contract | Callers send the fields the endpoint expects; responses match consumers |
| Contract revision | FSD index, schema, fixtures, mock, and typed consumer pin the same revision |
| Data flow | Create/read/update/delete path works through all layers |
| Events/jobs | Emitters have handlers; handlers are registered and idempotent |
| Auth | Protected paths enforce auth and authorization at the boundary |
| Config | Required env vars exist in `.env.example` and are loaded |
| UI | Component is reachable, state updates, loading/error/empty states work |
| UI state mapping | Success, validation, forbidden, conflict, degraded, offline, and async outcomes map to named states or approved N/A |
| Fixtures | Synthetic deterministic fixtures validate against the pinned schema and cover representative failure |
| Responsive/a11y | Reflow, overflow, keyboard, focus, semantics, announcements, errors, contrast, zoom, and motion are verified |
| Environment | Record `MOCK` or `REAL`; mock evidence is not real provider integration proof |
| Contract tests | Provider and consumer tests exercise the same operation/schema revision |
| Tests | At least one test exercises the integrated path when practical |
| Docs | API/user/setup docs match the wired behavior |

## Output

```markdown
# Integration Check

**Feature:** <name>
**Contract version:** <qualified CONTRACT-* ref and revision>
**Environment:** MOCK | REAL

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
- P1: contract drift, auth/permission mismatch, or mock-only evidence claimed as real integration.
- P2: partial path broken, missing error/empty state, fragile event/job behavior.
- P2: missing UI recovery state or responsive/accessibility path.
- P3: docs/tests/observability improvements that do not block use.

## Integration

- Called by `executing-plans`, `verification-before-completion`, and `gap-closure`.
- Required after the first integrated vertical slice and after merged parallel streams.
- Pair with the repository's mapped browser/E2E verification harness for
  browser-visible workflows; do not invent a missing skill or command.
