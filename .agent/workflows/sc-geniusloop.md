---
description: "Generate and filter proactive improvement ideas when goal queues are empty or invoked manually."
---

# Genius Loop Workflow

Use this when the user invokes `/sc-geniusloop [scope]`, or when `/sc-status` finds no ready goal issues and no active handoff, blocker, or failing verification that should be handled first.

The goal is continuous improvement and creativity for an existing system. This workflow benchmarks the current state against the user's stated intent, generates at least 10 improvement ideas, asks the read-only Brain evaluator to filter them, then routes the best 1-2 ideas back into the normal Super Compound delivery path.

## Steps

1. Read `.agent/context/workflows/sc-geniusloop.contract.md` for the compact runtime path.
2. Load `skills/brainstorming/SKILL.md`, `skills/codebase-design/SKILL.md`, and `skills/domain-modeling/SKILL.md` when following the full ideation procedure.
3. Load `skills/subagent-orchestration/SKILL.md` before dispatching Brain, and load `.agent/agents/brain.md` as the Brain prompt.
4. Inspect current state without mutating files:
   - `.continue-here.md`, `docs/STATE.md`, and `docs/progress.md` when present;
   - `.scratch/*/issues/*.md` for ready, blocked, in-progress, and done goals;
   - relevant BRD, PRD, FSD, accepted ADR, solution notes, README, tests, and code for the requested scope.
5. If ready goal issues exist, stop and route to `/sc-work` instead of inventing new work.
6. If a handoff, blocker, failing verification, or unresolved `OPEN-*` is more urgent than ideation, stop and route to `/sc-status`, `/sc-debug`, `/sc-plan`, or `/sc-pause`.
7. Build a current-state benchmark from evidence:
   - user intent or product objective;
   - current behavior and architecture;
   - known tests and verification signals;
   - gaps, friction, duplicated complexity, hidden edge cases, and unused leverage.
8. Generate at least 10 numbered ideas using IDs `GL-001` through `GL-010+`.
   - Include refactors that make existing features more valuable, simpler, or more maintainable.
   - Include new feature ideas that are unique, relevant, and aimed at hidden pain points.
   - Keep each idea concrete enough to route, but do not invent schema, APIs, authorization, workflows, roles, states, or UI behavior beyond existing authority.
9. Dispatch Brain as a read-only evaluator with the benchmark and idea list.
10. Brain filters ideas through:
    - Beta: feasibility, logic, non-duplication, not just ordinary bugfixes;
    - Alpha: creative value, uniqueness, strategic coherence;
    - Theta: hidden pain points and edge cases such as empty states, permission boundaries, data anomalies, concurrency, scale, accessibility, degraded networks, abuse/security, and operational failure;
    - Delta: fundamental, durable, high-leverage product value.
11. Select only the 1-2 surviving Delta ideas.
12. Route each selected idea:
    - new business direction or unclear user value -> `/sc-explore`;
    - approved BRD but missing product requirements -> `/sc-prd`;
    - approved PRD/FSD boundary with enough authority -> `/sc-plan`;
    - UI or interaction quality -> `/sc-ui`;
    - unfamiliar technical, domain, dependency, or current-doc risk -> `/sc-research`;
    - security, privacy, compatibility, compliance, release, or agent-surface risk -> `/sc-audit`.

## Output

- Current-state benchmark summary.
- Minimum 10 numbered `GL-*` ideas.
- Brain elimination matrix covering Beta, Alpha, Theta, and Delta.
- Selected 1-2 Delta ideas with rationale.
- Recommended next workflow for each selected idea.
- `OPEN-*` blockers when authority, evidence, or user intent is missing.

## Guardrails

- Do not implement code, create branches, commit, push, or publish from `/sc-geniusloop`.
- Do not create goal issue pointers directly unless routed through `/sc-plan`.
- Do not bypass `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`.
- For UI ideas, route through `/sc-ui` before implementation planning.
- For security, dependency, privacy, compliance, or release-sensitive ideas, route through `/sc-audit` or `/sc-research` before planning.
