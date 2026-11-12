# Execution Verification Skill Contract

## Summary

Apply covered checks; authority is under `.agent/skills/`. Load source detail
only for an uncovered requirement, material risk, conflict or editing the source.

- For full-tier work, load one goal pointer and referenced FSD/BRD/PRD/ADR
  sections; light-tier work uses the concrete request/issue acceptance and checks.
- `executing-plans/references/authority-and-workspace.md`: acceptance, flow,
  nearby pattern, affected boundaries and proving checks; preserve user work.
- Before edits, check every required outcome against actual current behavior and
  evidence. If all outcomes are already satisfied and verified, report no-change
  completion through the existing final gate. For partial/unproven outcomes,
  preserve verified work and implement/verify only remaining gaps.
- For skill changes, load `skill-authoring/SKILL.md`.
- For material unresolved ambiguity only, use
  `brainstorming/references/questions-and-options.md#fresh-builder-ambiguity-check`;
  skip settled concrete scope and routine delegated choices.
- `context-engineering/SKILL.md`: reuse resident unchanged rules; name the
  missing fact before expanding; retrieve the answering section/symbol.
- Write failing behavior tests before code when behavior changes.
- Verify after each meaningful change.
- For requested MCP checks or MCP-dependent failures, load
  `integration-checking/references/mcp-diagnostics.md` for transport, protocol,
  authentication, authorization and capability evidence.
- Authored/changed gates: qualify real current inputs and intended invalid rejection
  before reliance; `verification-before-completion/references/claim-evidence.md#authored-or-changed-gates`.
- Only for a named concurrency/retry/state-machine invariant needing extra proof,
  with a real target and available toolchain, consider optional
  verification-before-completion/references/bounded-formal-checking.md.
- selected/recovered authorized external execution or authoritative identity requirements:
  subagent-orchestration/SKILL.md
  Requested differs from observed; unproved UNKNOWN
- No Evidence = Not Done for every tier/task. Pin the complete authoritative
  goal/requirement/AC checklist before results; verify each outcome, not merely
  command success or changed files. Failed/skipped required checks prevent completion.
- Run final mapped verification before any completion claim. Include exact
  **Evidence of Completion**: what, how, actual result/locator and AC mapping.
  Missing/partial/failed proof uses the human statuses in
  `verification-before-completion/references/claim-evidence.md`; preserve ledger enums.
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
