---
name: todo-management
description: "Use when ideas or tasks surface during work and must be captured, tracked, and routed without losing current-task focus."
---

# Todo Management

## Overview

Capture out-of-scope ideas immediately, then return to the active task. Review and route them later without turning capture into an unauthorized context switch.

**Announce:** "I'm using the todo-management skill to capture this for later."

## Reference Router

- Choose when to capture, infer area, and create the full todo file: [capture](references/capture.md)
- List, prioritize, and route pending todos: [review and routing](references/review-and-routing.md)
- Link todos into durable state and future plans: [cross-reference](references/cross-reference.md)
- Record a minimal interruption during active work: [quick capture](references/quick-capture.md)
- Apply focus principles and counter rationalizations: [principles and red flags](references/principles-and-red-flags.md)

During active execution, load quick capture only. Load the full structure for a durable todo and review/routing only during explicit todo review or planning.

## Mandatory Gates

- **Scope gate:** Capture a newly surfaced item only when it is outside the current approved plan or requested outcome. In-scope defects remain part of current work unless authority or planning is missing.
- **Focus gate:** Capture, not act. Spend at most 30 seconds during active work: create the minimal record, add its path to `STATE.md` Deferred Ideas, and continue the current task immediately.
- **Artifact gate:** Durable todos live at `docs/todos/YYYY-MM-DD-<slug>.md` with area, priority, source, created date, status, title, description, context, and related paths. Infer ordinary metadata from current context; do not invent product requirements.
- **Cross-reference gate:** Keep `STATE.md` and the todo path aligned. During planning, inspect relevant pending todos and ask which, if any, belong in the new plan.
- **Action gate:** Listing or capturing a todo does not authorize implementation, deletion, or a plan change. Route approved work to `/sc-work`, exploration to `/sc-explore`, planning to `/sc-plan`, deferral to status update, and deletion only when explicitly chosen.
- **Hygiene gate:** Review by priority and area; mark completed work, defer intentionally, and prune irrelevant items rather than allowing an unbounded backlog.

## Integration

Used during `executing-plans`, `brainstorming`, `code-review`, and `systematic-debugging`. Pair with `state-management` for deferred ideas and `writing-plans` for future plan review.
