---
name: checkpoint-protocol
description: "Use when human information, judgment, approval, testing, credentials, review, or external action is genuinely required before proceeding."
---

# Checkpoint Protocol

Use a structured pause instead of an ad-hoc question. Announce that work requires input before proceeding.

## When to Use

Choose exactly one type: `needs_info`, `needs_decision`, `needs_confirmation`, `needs_testing`, `needs_credentials`, `needs_deployment_action`, or `needs_review`. Use it only when safe progress cannot continue through research, repository conventions, reversible judgment, or available automation.

## Route

- Select the trigger and copy the appropriate format from [checkpoint types](references/checkpoint-types.md).
- After the user responds, follow [resolution and resumption](references/resolution.md).
- Load only the first reference when pausing and only the second when resuming.

## Invariants

- Present one checkpoint at a time; never batch unrelated gates.
- Provide context, the exact blocker, what was tried, the impact of the response, and a concrete resumption path.
- For choices, present meaningful options and lead with a reasoned recommendation.
- Record the checkpoint under `STATE.md` Blockers. After resolution, move durable choices to Decisions Made and continue from the exact prior position.
- Never ask the user to paste secrets in chat. Direct credentials to an approved local secret store such as `.env` and name only the variable or location.
- Do not use a checkpoint to transfer routine implementation judgment back to the user.

## Red Flags

- A bare “what do you want?” without evidence or options.
- Stacked questions, excessive micro-approvals, or a checkpoint for variable names, test values, imports, or ordinary file placement.
- Performing a destructive or production-impacting action before confirmation.
- Re-reading completed work after the response instead of resuming cleanly.

## Integration

Used by `executing-plans`, `brainstorming`, and `systematic-debugging`. Pairs with `state-management` for durable blockers, pause/status workflows for handoff, and `verification-before-completion` when manual testing is unavoidable.
