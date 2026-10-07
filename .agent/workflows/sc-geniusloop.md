---
description: "Generate bounded, evidence-backed improvement ideas only for explicit improvement intent."
---

# Genius Loop Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when the user invokes `/sc-geniusloop [scope]` or explicitly requests
improvement ideas. An empty queue or completed goal alone never triggers it.

Benchmark the current state against the user's stated intent. Default to at most
three actionable ideas, including useful incremental fixes. An explicitly
requested broad inventory uses ten or more ideas and the full Brain matrix;
otherwise use a concise evidence/value/effort/risk comparison and select at most 1-2.


## Example

Input: `/sc-geniusloop onboarding`.
Prerequisite: Explicit improvement intent, existing system and no more urgent work/blocker.
Result and next action: Up to three GL-* ideas by default, evidence and 1-2 selections; return advice or internally route already-authorized work.

## Steps

1. Load `skills/brainstorming/SKILL.md`, `skills/codebase-design/SKILL.md`, and `skills/domain-modeling/SKILL.md` when following the full ideation procedure. Use the skills' advisory read-only mode: do not create brainstorm or glossary sidecars.
2. Use a concise Brain evaluation in-thread by default. For a broad inventory or
   a material decision that benefits from independent evaluation, load
   `.agent/agents/brain.md` and dispatch Brain directly through the host's read-only
   facility when available. Do not load `subagent-orchestration`; it is reserved
   for approved FSD goal execution.
3. Inspect current state without mutating files:
   - `.continue-here.md`, `docs/STATE.md`, and `docs/progress.md` when present;
   - `.scratch/*/issues/*.md` for ready, blocked, in-progress, and done goals;
   - relevant BRD, PRD, FSD, accepted ADR, solution notes, README, tests, and code for the requested scope.
4. If ready goal issues exist, stop and route to `/sc-work` instead of inventing new work.
5. If a handoff, blocker, failing verification, or unresolved `OPEN-*` is more urgent than ideation, stop and route to `/sc-status`, `/sc-debug`, `/sc-plan`, or `/sc-pause`.
6. Build a current-state benchmark from evidence:
   - user intent or product objective;
   - current behavior and architecture;
   - known tests and verification signals;
   - gaps, friction, duplicated complexity, hidden edge cases, and unused leverage.
7. Generate at most three actionable ideas by default using stable `GL-*` IDs;
   explicitly requested broad exploration retains at least ten.
   - Include refactors that make existing features more valuable, simpler, or more maintainable.
   - Include new feature ideas that are unique, relevant, and aimed at hidden pain points.
   - Keep each idea concrete enough to route, but do not invent schema, APIs, authorization, workflows, roles, states, or UI behavior beyond existing authority.
8. Evaluate the candidates read-only in-thread, or dispatch Brain directly when
   the broader/independent evaluation is justified.
9. For broad exploration, Brain filters ideas through:
    - Beta: feasibility, logic, non-duplication, including useful incremental fixes;
    - Alpha: creative value, uniqueness, strategic coherence;
    - Theta: hidden pain points and edge cases such as empty states, permission boundaries, data anomalies, concurrency, scale, accessibility, degraded networks, abuse/security, and operational failure;
    - Delta: evidenced value relative to effort/risk, including incremental gains.
10. Select the 1-2 surviving Delta ideas. Explain elimination reasons and supporting evidence with enough detail to review the decision; cite idea IDs.
11. Route each selected idea:
    - bounded low-risk feature, page, refactor or fix with clear acceptance -> `/sc-work` or `/sc-debug` under existing authorization;
    - new business direction or unclear user value -> `/sc-explore`;
    - approved BRD but missing product requirements -> `/sc-prd`;
    - approved PRD/FSD boundary with enough authority -> `/sc-plan`;
    - UI or interaction quality -> `/sc-ui`;
    - unfamiliar technical/domain fact, candidate dependency support, or current-doc uncertainty -> `/sc-research`;
    - security, privacy, compatibility, compliance, release, or agent-surface risk -> `/sc-audit`.

## Output

- Current-state benchmark summary.
- At most three actionable numbered `GL-*` ideas by default; ten or more only for explicit broad exploration.
- Concise evidence/value/effort/risk comparison; broad mode retains the Brain Beta/Alpha/Theta/Delta elimination matrix.
- Selected 1-2 Delta ideas with rationale.
- Recommended next workflow for each selected idea.
- Advisory prior-outcome references used for dedupe (`docs/geniusloop/` and `knowledge-search` hits).
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
- Apply the shared light/full policy. Material full scope retains `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`; bounded light improvements do not manufacture new authority artifacts.
- For material full-tier UI ideas, apply the relevant `/sc-ui` validation before
  implementation planning; bounded light changes use UI guidance inside their owner.
- Route a specific unknown fact, current-doc claim, or option-feasibility question through `/sc-research`. Route security, privacy, current-stack compatibility posture, compliance, or release readiness through `/sc-audit`.
