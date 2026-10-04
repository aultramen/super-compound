# UI Delivery Gates for Goal Dispatch

- For networked UI scope, the pointer includes `ui_delivery_role`, `required_gate`, and
  qualified pinned contract refs. `CONTRACT_ENABLER` is the only bounded
  DRAFT/BLOCKED exception; `FIRST_VERTICAL_SLICE` requires `READY_FOR_SLICE`;
  `SCALE_OUT_SLICE` requires a `VALIDATED` baseline and the pinned first-slice
  issue at `FIRST_VERTICAL_SLICE_VERIFIED`.
- `HARDENING` requires every applicable UI delivery slice dependency to be
  `verified`, final verification refs, and a named Business Owner when acceptance or material judgment requires UAT.
- Recheck `ui_delivery_role`, `required_gate`, and the pinned contract revision
  immediately before recording any UI result.

LOCAL_ONLY topology skips provider roles/assets. Apply mechanical promotion and
affected proof invalidation from `agentic-delivery/references/ui-contract-readiness.md`.
