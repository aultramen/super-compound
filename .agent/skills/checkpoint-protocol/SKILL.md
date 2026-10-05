---
name: checkpoint-protocol
description: "Use when human information, judgment, approval, testing, credentials, review, or external action is genuinely required before proceeding."
---

# Checkpoint Protocol

## Summary

Use the [human input runtime contract](../../context/checkpoint.contract.md)
before interrupting or reporting blockers. It owns the single answerable format;
this skill routes need types and resolution. Announce the affected scope, and
continue independent authorized work.

## When to Use

Choose exactly one type: `needs_info`, `needs_decision`, `needs_confirmation`, `needs_testing`, `needs_credentials`, `needs_deployment_action`, or `needs_review`. Use it only when safe progress cannot continue through research, repository conventions, reversible judgment, or available automation.

## Route

- Check existing acceptance/authorization, research facts and run available tests
  first. Select the trigger from [checkpoint types](references/checkpoint-types.md)
  and render the runtime contract's package in the user's language.
- After the user responds, follow [resolution and resumption](references/resolution.md).
- Load only the first reference when pausing and only the second when resuming.

## Invariants

- Show every ready input/approval for active work together, grouped by the same owner and scope; keep authority gates separate and show dependent items as pending. Use stable IDs, per-item recommendations, complete review paths and both reply examples from the runtime contract. Continue independent safe work while waiting.
- Provide context, the exact blocker, what was tried, the impact of the response, and a concrete resumption path.
- For choices, present meaningful options and lead with a reasoned recommendation.
- Record each unresolved need under `STATE.md` Blockers through the existing
  state writer; retain partially resolved evidence. Decisions remain in their
  authoritative document with STATE refs. Resume from the exact prior position.
- Never ask the user to paste secrets in chat. Direct credentials to an approved local secret store such as `.env` and name only the variable or location.
- Do not use a checkpoint to transfer routine implementation judgment back to the user.

## Red Flags

- A bare “what do you want?” without evidence or options.
- Stacked questions, excessive micro-approvals, or a checkpoint for variable names, test values, imports, or ordinary file placement.
- Performing a destructive or production-impacting action before confirmation.
- Re-reading completed work after the response instead of resuming cleanly.

## Integration

Used by `executing-plans`, `brainstorming`, and `systematic-debugging`. Pairs with `state-management` for durable blockers, pause/status workflows for handoff, and `verification-before-completion` when manual testing is unavoidable.
