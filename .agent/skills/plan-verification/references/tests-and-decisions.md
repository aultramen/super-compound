### 8. Test Coverage

For each critical path:

- Is there a verification step that covers it?
- Are edge cases identified?
- Is error handling tested?
- If missing, flag: `Critical path <X> has no verification`.

### 9. Decision Coverage

For every approved `TDEC-*` and every applicable obligation from a linked
`ACCEPTED` ADR:

- Does at least one `GOAL-*` reference the exact decision ID?
- Does at least one `TEST-*` verify the obligation or its observable effect?
- Do blocked or superseded decisions stay out of executable goals?

Missing exact-ID coverage blocks execution. Fuzzy text similarity may warn after
implementation, but it must never create a false blocking match.
