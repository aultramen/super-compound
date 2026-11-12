# Session Model Guidance

## Summary

Bundled roles default to `inherit` in `agent_models_v1`. Preserve explicit user
model settings; no automatic Sol/Astra switching or new routing schema.

Recommend low effort for mechanical tasks, medium for normal implementation,
and high for complex reasoning or stalled diagnosis. Explicit session/user
effort wins. Hosts without effort control receive advice only; a large context
window still uses summary-first discovery and bounded handoffs.

Prompts state objective, authority, action boundaries and completion evidence.
Avoid ritual reads and repeated tests. Audit overrestrictive skills and broad
load triggers as suggested by [Astra guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).
Sol supports low/medium/high/xhigh/max, with none/minimal unavailable; verify
model-specific controls in the [Sol documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

## Requested and Observed Execution

The model mapping, including inherit, native projections and CLI/API model or
effort fields describe requested settings. They do not establish the provider
or exact model that served a run; preserve explicit installation overrides.

When an authorized external route is selected or recovered, or authoritative
acceptance requires identity proof, load
[external execution receipts](../skills/subagent-orchestration/references/completion-inbox.md#external-execution-receipts).
For native execution too, observed provider/model identity remains UNKNOWN
without trustworthy runtime evidence. A provider/family assertion does not prove
the exact served model; an adapter assertion is not backend attestation.
Fixture traces, configured tools and self-report prove neither live identity nor
enforced capabilities. Keep receipt facts in existing report/evidence locators;
ordinary delegation gains no new identity or completion gate.

## API options

This is guidance, not a new API adapter. Keep stable instructions/tool prefixes
ahead of changing task content for [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).
Caching reduces processing cost; cached tokens still occupy context.
Use [programmatic tool calling](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling)
for sequences that need no new model decision; retain decision and permission
boundaries. Load selected schemas lazily where supported. Change effort only
when supported, preserving explicit settings and the stable prefix according to
the [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model).
Report overhead, total usage, cache, cost and duration separately.
