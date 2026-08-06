# Hook boundary

Hooks are advisory, deterministic, local-first helpers. They may warn, validate, or record bounded audit evidence, but they cannot create or consume human approval.

The Loop Runtime controller and hard source-write interceptor provide hard enforcement. Operation adapters enforce allowlists, approval bindings, counters, and reconciliation at each action boundary.

See `docs/loop-runtime-v2.md` for the authoritative operating guide.
