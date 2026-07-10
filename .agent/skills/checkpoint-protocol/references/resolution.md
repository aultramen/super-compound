# Resolution and Resumption

After receiving the response:

1. Acknowledge the supplied information, choice, confirmation, result, credential readiness, action, or review outcome.
2. Validate that it resolves the active checkpoint. If it does not, keep the same checkpoint active and ask only for the missing part.
3. Update `STATE.md`: remove the resolved Blocker; add a durable choice to Decisions Made with rationale; update Current Position and Next Action.
4. Resume from the exact position before the checkpoint. Do not re-read or re-analyze completed work.
5. If the response exposes a different blocker, finish resolving the current gate before presenting the next checkpoint.

For denied confirmation, failed manual testing, rejected review, or incomplete deployment, preserve evidence and route back to planning, debugging, or gap closure. Never treat silence, ambiguity, or partial execution as approval.
