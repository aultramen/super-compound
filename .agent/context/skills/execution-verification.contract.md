# Execution Verification Skill Contract

Apply covered checks; authority is under `.agent/skills/`. Load source detail
only for an uncovered requirement, material risk, conflict or editing the source.

- For full-tier work, load one goal pointer and referenced FSD/BRD/PRD/ADR
  sections; light-tier work uses the concrete request/issue acceptance and checks.
- `executing-plans/references/authority-and-workspace.md`: acceptance, flow,
  nearby pattern, affected boundaries and proving checks; preserve user work.
- `context-engineering/SKILL.md`: reuse resident unchanged rules; name the
  missing fact before expanding; retrieve the answering section/symbol.
- Write failing behavior tests before code when behavior changes.
- Verify after each meaningful change.
- Run final mapped verification before any completion claim.
- Sources: `test-driven-development/SKILL.md` and
  `verification-before-completion/SKILL.md`. Select checks by acceptance/impact;
  reuse only matching fingerprinted evidence. Full suite when CI/acceptance or
  cross-component impact requires it; retain mandatory gates below.
- UI-integrated work validates the pinned contract version and integration
  topology. LOCAL_ONLY uses mapped local behavior/accessibility checks without
  synthetic provider assets or separate hardening unless merged/cross-slice
  checks need it. UAT is conditional on acceptance/policy or material human
  judgment. A networked first slice proves real-provider
  auth/permission, success, and representative failure before scale-out;
  mock-only evidence cannot open that gate.
  Authority: `integration-checking/SKILL.md` and the active workflow contract.
