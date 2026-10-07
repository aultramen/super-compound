# Super Compound Skill Index

This is the compact skill contract. Each `SKILL.md` keeps YAML `name` and `description`; use this index for routing and the matching contract for covered mandatory checks.

## Full-Load Triggers

- A named required detail is not covered by the active contract, or the user explicitly requests the complete procedure.
- The task is security/privacy/compliance sensitive.
- The agent is editing that skill.
- A compact contract conflicts with the full skill or repo rules.

## Cross-Skill Contracts

When the route is known, its workflow contract wins. For an ambiguous natural-
language task spanning several skills, load exactly one matching group before
any full skill:

- Delivery/requirements/planning: `.agent/context/skills/delivery-planning.contract.md`
- Implementation/testing/verification: `.agent/context/skills/execution-verification.contract.md`
- Security/compatibility/privacy/readiness: `.agent/context/skills/risk-audit.contract.md`

## Skill Map

| Skill | Use for |
|---|---|
| `agentic-delivery` | BRD -> PRD -> FSD -> GOAL authority, UI contract readiness, traceability, OPEN stops |
| `hints` | focused consultation and next-step advice; read-only by default |
| `brainstorming` | fuzzy ideas, options, constraints |
| `prd-generator` | PRD from approved BRD |
| `writing-plans` | FSD and technical plan |
| `issue-workflow` | lightweight goal issue pointers |
| `executing-plans` | execute one approved goal |
| `test-driven-development` | behavior changes and regressions |
| `verification-before-completion` | final evidence gate |
| `git-workflow-operation` | preview-first branch, worktree, commit, push, and PR operations |
| `context-engineering` | selective loading and handoff |
| `interface-design` | UI guidance through search-only data retrieval |
| `systematic-debugging` | reproduce, isolate, fix root cause |
| `code-review` | findings-first review |
| `security-audit` | security, secrets, agent-surface, readiness |
| `compatibility-check` | runtime/dependency fit |
| `architecture-enforcement` | placement and dependency direction |
| `domain-modeling` | shared vocabulary and invariants |
| `codebase-design` | module seams and interface shape |
| `plan-verification` | ten-dimension FSD/goal gate including conditional UI/API readiness |
| `integration-checking` | cross-component wiring |
| `parallel-execution` | 2+ independent gated streams in isolated worktrees after required first-slice proof |
| `knowledge-compounding` | durable solved-problem notes |
| `knowledge-refresh` | audit and prune the knowledge store against the current tree |
| `subagent-orchestration` | file-backed approved-goal dispatch and two-stage review |
| Other support skills | load only when their description matches the active risk |

## Contract Rule

Announce the relevant skill group once per work phase. Individual skill routing is internal; name a specific skill again only when its use changes scope, risk, a fallback, or a required user action. Reuse instructions already loaded in the current context.

Compact contracts carry mandatory checks with links to their authority; they do not change that authority. Implementation, audit, or verification alone does not trigger full-load. Use covered checks directly; load the relevant procedure only for an uncovered detail, material risk, a conflict, or editing that skill. If a contract lacks a required check or authority reference, consult the source and repair the omission rather than silently skipping it. Host/user instructions requiring a skill still take precedence.
