# Super Compound Skill Index

This is the compact skill contract. Each `SKILL.md` keeps YAML `name` and `description`; use this index for routing, then load the full skill only when executing or reviewing its detailed procedure.

## Full-Load Triggers

- The active workflow explicitly says to follow the skill procedure.
- The task is security/privacy/compliance sensitive.
- The agent is editing that skill.
- A compact contract conflicts with the full skill or repo rules.

## Skill Map

| Skill | Use for |
|---|---|
| `agentic-delivery` | BRD -> PRD -> FSD -> GOAL authority, traceability, OPEN stop conditions |
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
| `plan-verification` | FSD/goal quality gate |
| `integration-checking` | cross-component wiring |
| `knowledge-compounding` | durable solved-problem notes |
| `subagent-orchestration` | isolated subagent dispatch, including Brain evaluation for genius loop |
| Other support skills | load only when their description matches the active risk |

## Contract Rule

Compact contracts are routing aids, not replacement authority. When a task reaches implementation, audit, verification, or skill editing, read the full relevant `SKILL.md`.
