---
name: integration-checking
description: "After multi-component work — verify cross-component wiring. Ensures independently-built pieces actually connect and work together."
---

# Integration Checking

## Overview

Building components that work individually is not the same as building components that work together. This skill verifies that cross-component wiring is correct after multi-step implementations.

**Core principle:** **Existence ≠ Integration**

A file existing doesn't mean it's wired. An endpoint existing doesn't mean the frontend calls it. A model existing doesn't mean it's migrated.

**Announce:** "I'm using the integration-checking skill to verify cross-component wiring."

## When to Apply

| Situation | Trigger |
|-----------|---------|
| Completed a plan with both frontend + backend tasks | Always |
| Built multiple services that communicate | Always |
| Added new API endpoints | Check callers exist |
| Created new database models | Check migrations + usage |
| Built event emitters | Check handlers exist |
| Created shared types/interfaces | Check importers use them |
| Implemented auth flow | Check all protected routes enforce it |

## The Integration Checklist

### 1. API Contract Verification

```
For EACH API endpoint created:
  → Is there a caller (frontend, service, test)?
  → Does the caller send the correct request format?
  → Does the caller handle the response format?
  → Does the caller handle error responses?
  → Are auth headers included where required?
```

### 2. Data Flow Verification

```
For EACH data entity:
  → Can it be Created? (form → API → DB)
  → Can it be Read? (DB → API → UI)
  → Can it be Updated? (form → API → DB → confirmation)
  → Can it be Deleted? (action → API → DB → UI update)
  → Are validation rules consistent across layers?
```

### 3. Event/Message Wiring

```
For EACH event emitted:
  → Is there at least one handler listening?
  → Does the handler process the correct event shape?
  → Are error cases in handlers handled?
  → Is the event bus/queue properly configured?
```

### 4. Import/Export Wiring

```
For EACH exported module/type/function:
  → Is it imported where needed?
  → Are import paths correct (no circular, no stale)?
  → Are type definitions consistent across import boundaries?
```

### 5. Auth/Permission Wiring

```
For EACH protected route/endpoint:
  → Is auth middleware applied?
  → Is role/permission checking enforced?
  → Does the frontend handle 401/403 responses?
  → Is token refresh implemented?
```

### 6. Configuration Wiring

```
For EACH environment variable used:
  → Is it defined in .env.example?
  → Is it loaded by the config module?
  → Is it validated at startup?
  → Does it have a sensible default (where appropriate)?
```

## Integration Report

```markdown
## Integration Check Report

**Scope:** [what was checked]
**Date:** YYYY-MM-DD

### API Contracts

| Endpoint | Caller | Request ✓ | Response ✓ | Errors ✓ |
|----------|--------|-----------|------------|----------|
| POST /api/users | RegisterForm | ✅ | ✅ | ❌ missing |

### Data Flow

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| User | ✅ | ✅ | ⚠️ no form | ❌ missing |

### Event Wiring

| Event | Emitter | Handler | Status |
|-------|---------|---------|--------|
| user.created | AuthService | WelcomeEmail | ✅ |

### Gaps Found

| # | Gap | Type | Severity |
|---|-----|------|----------|
| 1 | [description] | contract/data/event/auth/config | critical/important/minor |
```

## Quick Integration Check

For smaller changes (1-3 files), use the quick check:

```
1. What did I create/modify?
2. Who calls this? (check callers exist and work)
3. What does this call? (check dependencies exist and work)
4. Did I update all layers? (DB ↔ API ↔ UI)
```

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Existence ≠ Integration** | A file existing doesn't mean it's wired |
| **Check both sides** | An endpoint needs both a server and a client |
| **Data flows through layers** | DB → Service → Controller → Client — check each hop |
| **Auth is everywhere** | Every protected resource needs wiring verification |
| **Config must connect** | Every env var needs .env.example + loader + usage |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I created the endpoint, frontend will be fine" | Check that frontend calls it correctly |
| "The model exists, database is set up" | Check migration ran and seeder works |
| "Auth is already configured" | Check the new route is protected |
| "Tests pass, integration is fine" | Unit tests don't test integration |

## Integration

**This skill is triggered by:**
- **executing-plans** — After completing multi-component tasks
- **verification-before-completion** — As part of wiring verification
- **code-review** — To verify integration during review

**Pairs with:**
- **gap-closure** — Fix integration gaps
- **plan-verification** — Validate key links before execution
- **state-management** — Track integration status
