# Super Compound

Understand first; full scope follows BRD -> PRD -> FSD -> GOAL. Verify claims and capture knowledge.

## Core Rules

- Claim completion only with fresh verification.
- Public workflows in `.agent/workflows/` stay limited to the core set below.
- Prefix command triggers `sc-` to avoid native-command collisions.
- Detailed procedures belong in skills; always-on rules stay short.
- Load `.agent/context/` contracts before full assets; human input/approval uses `checkpoint.contract.md`.
- Delivery adapts per request: bounded low-risk features/pages with clear acceptance, existing contracts/access/patterns and proving checks stay `light`; material product/contract/security/flow changes take `BRD -> PRD -> FSD -> GOAL`. Exception-based approval is the new-project default; explicit stage preferences persist. A single trivial change is done directly.
- Prefer existing conventions, tools, and architecture.
- Treat hooks, prompts, skills, workflows, MCP config, and dependency changes as security-sensitive.
- Preserve unrelated user changes.
- Route branch, commit, push, worktree, and Pull Request operations through `sc-go.md` and `git-workflow-operation`.
- For UI-bearing work, PRD owns the experience baseline, FSD Section 8 owns the
  Screen & Interaction Contract, and delegated OpenAPI/JSON Schema owns exact
  wire shape. Mock-only is never real integration proof.

## Core Workflows

| Workflow | Use For |
|----------|---------|
| `sc-init.md` | New/imported project scan; `/sc-init reload` |
| `sc-hints.md` | Read-only advice |
| `sc-status.md` | Session orientation and saved handoff resume |
| `sc-geniusloop.md` | Bounded ideation for explicit improvement intent |
| `sc-explore.md` | Fuzzy ideas, business direction, BRD creation, prototypes, and open decisions |
| `sc-research.md` | Conditional evidence spike for a named factual or technical decision gap |
| `sc-prd.md` | PRD creation from an approved BRD |
| `sc-plan.md` | FSD creation, ADR applicability, goal slicing, and local issue pointers |
| `sc-eval.md` | Eval-driven success criteria and reliability checks |
| `sc-go.md` | Preview-first Git branch, commit, push, worktree, and Pull Request operations |
| `sc-work.md` | Execute approved FSD goals; prove a real first slice before controlled parallel scale-out |
| `sc-debug.md` | Reproduce, diagnose root cause, fix, and verify bugs |
| `sc-review.md` | Spec and standards review of code changes |
| `sc-audit.md` | Audit security, compatibility, dependencies, agents, MCP, compliance, releases |
| `sc-compound.md` | Capture non-trivial solved problems as reusable knowledge |
| `sc-evolve.md` | Cluster verified learnings into draft framework proposals for human approval |
| `sc-pause.md` | Save `.continue-here.md` handoff before stopping |
| `sc-launch.md` | Complete delivery lifecycle |
| `sc-ui.md` | Frontend, mobile, chart, and interface design work |

## Routing

- UI/frontend/mobile/chart design/review -> read-only `sc-ui.md`; approved
  implementation -> `sc-work.md`. A UI-bearing PRD draft returns from `/sc-ui`
  validation before FSD planning.
- Goal satisfied with required checks/closeout complete -> deliver and stop. `sc-geniusloop.md` requires explicit improvement intent; never trigger on an empty queue alone.
- Low-token routing -> `.agent/context/routing-index.md`, then a route contract when available.
- Bugs, failures, regressions -> `sc-debug.md` and `systematic-debugging`.
- Git branch, worktree, commit, push, or PR request -> `sc-go.md` and `git-workflow-operation`.
- Security, current-stack dependency posture, release, MCP, compliance, or agent config risk -> `sc-audit.md`.
- Open product/domain/architecture uncertainty -> `sc-explore.md`; convert resolved work through BRD, PRD, then FSD.
- Named factual, current-doc, version-support, or option-feasibility gap -> `sc-research.md`, then return its advisory evidence to the workflow that owns the decision.
- Issue shaping, triage, Kanban, Journey, or PRD-to-FSD-goal work -> `sc-plan.md` with `issue-workflow` or `triage-workflow`.
- Implementation with an approved FSD goal -> `sc-work.md`.
- Session boundary -> `sc-pause.md`; new session starts with `sc-status.md`.

## Skill Priority

1. Process skills: `agentic-delivery`, `brainstorming`, `systematic-debugging`, `writing-plans`, `executing-plans`, `issue-workflow`, `triage-workflow`, `subagent-orchestration`.
2. Product and design skills: `domain-modeling`, `codebase-design`, `prototyping`, `interface-design`.
3. Quality skills: `test-driven-development`, `verification-before-completion`, `code-review`, `architecture-enforcement`.
4. Git operation skills: `git-workflow-operation`.
5. Security and compatibility skills: `security-audit`, `compatibility-check`, `secure-code-patterns`, `threat-modeling`, `data-privacy`.
6. Context and memory skills: `state-management`, `context-engineering`, `knowledge-compounding`.

## Completion Bar

Apply the "Before Completion" gates in `quality-gates.md`: prove the claim with a fresh command or inspection and fix the specific gap before expanding scope.

Documentation: `.agent/context/output-style.md`. Installation: `SETUP.md`, via `/sc-init setup`. Init/reload remain read-only.
