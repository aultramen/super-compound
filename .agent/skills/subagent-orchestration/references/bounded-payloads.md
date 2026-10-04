# Bounded Payload and Recovery

create-input.json may include composition: {maxTokens, background: [{text, ref}]}.
The complete issue brief is mandatory; requirements, acceptance references,
scope, and blockers remain intact. Omitted maxTokens uses a soft 2,000-token
target that grows to fit mandatory content. An explicit maxTokens is a hard
host/user allowance; never silently raise it. Measurements estimate UTF-8 bytes
divided by four, not runtime billing or a host's exact tokenizer.

Only optional background becomes a repository pointer. If even a pointer does
not fit, omit it from the payload and retain its locator in composition.omissions.
Optional context cannot invalidate a mandatory payload that fits. Inspect
omissions, mandatoryTokens, maxTokens, and estimatedTokens before dispatch.

Successful creation returns dispatchStatus: ready (or not_ready when an existing
goal's ledger status is no longer ready). Check dependencies and the current
ledger before dispatch. Genuine mandatory overflow returns status: over_budget,
dispatchStatus: blocked, and recovery: {action: recompose, minimumTokens, ...}
before any package/ledger write. The CLI emits this JSON and exits 2; validation
errors exit 1. Never treat exit 0 or a returned object alone as dispatch authority.

The owning route recomposes automatically: remove optional context, preserve all
requirements, and retry within available host capacity. An explicit hard cap that
cannot fit mandatory content requires a supported complete handoff or bounded
goal decomposition within existing authority; report the constraint if neither
is safe. Do not drop acceptance criteria or repeatedly retry the same payload.

Before resumed dispatch, run memory-maintenance.mjs resume. Reconcile canonical
STATE, pinned contract digests, and fresh ledger evidence; skip verified goals.
Missing/corrupt ledgers or contract drift require resolution before dispatch.

Instruction constraints are mandatory, including provenance and supersession.
For corrections and ledger reconstruction use
[active context](../../context-engineering/references/active-context.md), then
drain [completion inbox](completion-inbox.md) before redispatch.
