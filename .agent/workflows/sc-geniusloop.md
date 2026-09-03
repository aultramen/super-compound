---
description: "Generate and filter proactive improvement ideas when goal queues are empty or invoked manually."
---

# Genius Loop Workflow

Use this when the user invokes `/sc-geniusloop [scope]`, or when `/sc-status` finds no ready goal issues and no active handoff, blocker, or failing verification that should be handled first.

The goal is continuous improvement and creativity for an existing system. This workflow benchmarks the current state against the user's stated intent, generates at least 10 improvement ideas, asks the read-only Brain evaluator to filter them, then routes the best 1-2 ideas back into the normal Super Compound delivery path.

## Steps

1. Load `skills/brainstorming/SKILL.md`, `skills/codebase-design/SKILL.md`, and `skills/domain-modeling/SKILL.md` when following the full ideation procedure. Use the skills' advisory read-only mode: do not create brainstorm or glossary sidecars.
2. Load `.agent/agents/brain.md` and dispatch Brain directly through the host's read-only agent facility. Do not load `subagent-orchestration`; it is reserved for approved FSD goal execution.
3. Inspect current state without mutating files:
   - `.continue-here.md`, `docs/STATE.md`, and `docs/progress.md` when present;
   - `.scratch/*/issues/*.md` for ready, blocked, in-progress, and done goals;
   - relevant BRD, PRD, FSD, accepted ADR, solution notes, README, tests, and code for the requested scope.
   - When an active immutable Loop Run contract requires `ADAPTIVE_LEARNING_V2`, call the controller's read-only `queryAdaptiveLearningMemory` boundary with a deterministic dedupe key and current risk/context fingerprints. Use only its sanitized, event-derived `prior_outcomes` and host-verified `verified_patterns`; never read or trust projection cache files directly.
4. If ready goal issues exist, stop and route to `/sc-work` instead of inventing new work.
5. If a handoff, blocker, failing verification, or unresolved `OPEN-*` is more urgent than ideation, stop and route to `/sc-status`, `/sc-debug`, `/sc-plan`, or `/sc-pause`.
6. Build a current-state benchmark from evidence:
   - user intent or product objective;
   - current behavior and architecture;
   - known tests and verification signals;
   - gaps, friction, duplicated complexity, hidden edge cases, and unused leverage.
7. Generate at least 10 numbered ideas using IDs `GL-001` through `GL-010+`.
   - Include refactors that make existing features more valuable, simpler, or more maintainable.
   - Include new feature ideas that are unique, relevant, and aimed at hidden pain points.
   - Keep each idea concrete enough to route, but do not invent schema, APIs, authorization, workflows, roles, states, or UI behavior beyond existing authority.
8. Dispatch Brain as a read-only evaluator with the benchmark and idea list.
9. Brain filters ideas through:
    - Beta: feasibility, logic, non-duplication, not just ordinary bugfixes;
    - Alpha: creative value, uniqueness, strategic coherence;
    - Theta: hidden pain points and edge cases such as empty states, permission boundaries, data anomalies, concurrency, scale, accessibility, degraded networks, abuse/security, and operational failure;
    - Delta: fundamental, durable, high-leverage product value.
10. Select only the 1-2 surviving Delta ideas. Record each eliminated idea as one line (`GL-003 - eliminated at Beta: reason`); give full reasoning only for the surviving Delta ideas.
11. Route each selected idea:
    - new business direction or unclear user value -> `/sc-explore`;
    - approved BRD but missing product requirements -> `/sc-prd`;
    - approved PRD/FSD boundary with enough authority -> `/sc-plan`;
    - UI or interaction quality -> `/sc-ui`;
    - unfamiliar technical/domain fact, candidate dependency support, or current-doc uncertainty -> `/sc-research`;
    - security, privacy, compatibility, compliance, release, or agent-surface risk -> `/sc-audit`.
12. When this invocation belongs to an active `ADAPTIVE_LEARNING_V2` run, submit the selected/declined result through controller command `RECORD_LEARNING_OUTCOME`. The controller must append the event-authoritative outcome before rebuilding its derived cache. If no eligible run exists, do not fabricate a runtime outcome or write the cache directly.

## Output

- Current-state benchmark summary.
- Minimum 10 numbered `GL-*` ideas.
- Brain elimination matrix covering Beta, Alpha, Theta, and Delta: one line per eliminated idea.
- Selected 1-2 Delta ideas with rationale.
- Recommended next workflow for each selected idea.
- Advisory prior-outcome/pattern references used for dedupe, plus the resulting `geniusloop_outcome_v2` event reference when the active run supports it.
- `OPEN-*` blockers when authority, evidence, or user intent is missing.
- When the evidence exceeds the chat envelope, save the complete benchmark,
  ideas, matrix, and rationale to `docs/geniusloop/YYYY-MM-DD-<scope>.md` and
  return its path without omitting blockers.

## Guardrails

- Do not implement code, create branches, commit, push, or publish from `/sc-geniusloop`.
- The only permitted mutation is the optional `docs/geniusloop/YYYY-MM-DD-<scope>.md` report; Brain and all supporting analysis remain read-only.
- Controller-owned `RECORD_LEARNING_OUTCOME` operational audit metadata is not a project mutation and never authorizes the optional report or downstream implementation.
- Learning results are advisory only. They must not self-modify prompts, model weights, goals, policy, budgets, verifier definitions, framework source, operating rules, or the public workflow inventory.
- Do not create goal issue pointers directly unless routed through `/sc-plan`.
- Do not bypass `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`.
- For UI ideas, route through `/sc-ui` before implementation planning.
- Route a specific unknown fact, current-doc claim, or option-feasibility question through `/sc-research`. Route security, privacy, current-stack compatibility posture, compliance, or release readiness through `/sc-audit`.
