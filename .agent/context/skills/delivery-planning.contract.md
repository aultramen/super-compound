# Delivery Planning Skill Contract

Use for BRD/PRD/FSD/issue planning without loading full skills first.

- Keep BRD -> PRD -> FSD -> GOAL authority.
- UI-bearing delivery validates the PRD experience baseline, then pins FSD
  Screen/Interaction and delegated wire contracts before goal readiness.
- Use FSD `TDEC-*` by default; link only `ACCEPTED` ADRs.
- Create issue pointers with qualified refs and verification refs.
- Stop on `OPEN-*` blockers.
- Plan optional contract enabler -> exactly one first real vertical slice ->
  dependent scale-out; mock-only never opens parallel work.
