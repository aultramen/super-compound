# Quality Gates

## Summary

Procedures: skills.

## Before Work

- Classify tier: light|full (`skills/agentic-delivery/references/workflow-integration.md`); state one line. Mid-work triggers escalate, never block intake.
- Compact contract before editing; full detail for uncovered checks, material risk,
  conflicts or procedure edits only.
- `.agent/rules/project-config.md`: conventions/pins. Resolve affected standards
  conflicts through `.agent/context/standards.contract.md`.
- UI: `interface-design` before implementation.
- `EXCEPTION_APPROVED` may release only a first vertical slice; a `VALIDATED`
  baseline may also release it when the FSD is `READY_FOR_SLICE`. Parallel
  scale-out requires the baseline to be `VALIDATED` plus verified real
  first-slice proof; `EXCEPTION_APPROVED` cannot release scale-out.
- Dependency/security/release/MCP/compliance/agent-surface risk: `sc-audit.md`, security skills.
- Unclear intent: `sc-explore.md` before planning.
- Branch, commit, push, worktree or PR: `sc-go.md`; preview before execution.

## Before Executing A Plan

- Every requirement maps to a task with action, verification and done condition.
- Explicit dependencies.
- Verification covers critical user-visible paths.
- Requested scope; no opportunistic refactoring.

## During Work

- Small reversible changes.
- Business logic outside UI/transport/persistence.
- Validate inputs at boundaries; preserve dependency direction.
- Capture deferred ideas; never expand scope mid-task.
- Destructive or publishing Git commands require explicit authorization.
- Never work on a protected base branch; use a configured branch or optional worktree.

## Before Completion

Every task: verification-before-completion (No Evidence = Not Done;
goal/requirements/all AC; Evidence of Completion). Small tasks: real inspection.

- Smallest meaningful verification first.
- Broaden checks for shared behavior, security, data or UI workflow changes.
- Check integration, not just file existence.
- Report commands/results/residual risk.
- Active standards: pinned snapshot/mandatory receipt in the completion contract.
  Failed/skipped/missing/stale cannot pass; local/CI share entrypoint; human review needs evidence.
- Before commit/push/PR: mapped verification; review `git status` and `git diff`.

## Red Flags

- Completion claims without fresh evidence.
- Trusting generated output/subagent reports without independent verification.
- Dependencies without identity/compatibility/security checks.
- UI without responsive/accessibility/text-overflow checks.
- Stale docs, broken paths or renamed workflows.
