# Super Compound

Super Compound is a compact agent framework for disciplined software work: understand first, move through BRD -> PRD -> FSD -> GOAL before code, verify before claims, and capture useful knowledge after non-trivial fixes.

## Core Rules

- Use evidence before claims. Do not say work is complete without fresh verification.
- Keep the workflow surface small. Public workflows live in `.agent/workflows/` and are limited to the core set below.
- Use the `sc-` workflow prefix for all command triggers to avoid collisions with native agent commands.
- Keep detailed procedures in skills. Rules stay short because they are always-on context.
- Use `.agent/context/` for compact runtime routing, skill contracts, template skeletons, and token budget gates before loading full files.
- Prefer existing project conventions, tools, and architecture over new abstractions.
- Treat hooks, prompts, skills, workflows, MCP config, and dependency changes as security-sensitive.
- Preserve user work. Do not overwrite unrelated local changes.
- Route branch, commit, push, worktree, and Pull Request operations through `sc-go.md` and `git-workflow-operation`.

## Core Workflows

| Workflow | Use For |
|----------|---------|
| `sc-init.md` | New/imported project scan and rule reload via `/sc-init reload` |
| `sc-status.md` | Session orientation and saved handoff resume |
| `sc-explore.md` | Fuzzy ideas, business direction, BRD creation, prototypes, and open decisions |
| `sc-research.md` | Technical or domain research before planning |
| `sc-prd.md` | PRD creation from an approved BRD |
| `sc-plan.md` | FSD creation, ADR applicability, goal slicing, and local issue pointers |
| `sc-eval.md` | Eval-driven success criteria and reliability checks |
| `sc-go.md` | Preview-first Git branch, commit, push, worktree, and Pull Request operations |
| `sc-work.md` | Execute approved FSD goals, including optional parallel execution |
| `sc-debug.md` | Reproduce, diagnose root cause, fix, and verify bugs |
| `sc-review.md` | Spec and standards review of code changes |
| `sc-audit.md` | Security, compatibility, dependency, agent surface, MCP, compliance, and release-readiness audit |
| `sc-compound.md` | Capture non-trivial solved problems as reusable knowledge |
| `sc-pause.md` | Save `.continue-here.md` handoff before stopping |
| `sc-launch.md` | Run the complete lifecycle through the core workflow sequence |
| `sc-ui.md` | Frontend, mobile, chart, and interface design work |

## Routing

- UI/frontend/mobile/chart work -> `sc-ui.md` and `interface-design`.
- Low-token routing -> `.agent/context/routing-index.md`, then a route contract when available.
- Bugs, failures, regressions -> `sc-debug.md` and `systematic-debugging`.
- Git branch, worktree, commit, push, or PR request -> `sc-go.md` and `git-workflow-operation`.
- Security, dependency, release, MCP, compliance, or agent config risk -> `sc-audit.md`.
- Open product/domain/architecture uncertainty -> `sc-explore.md`; convert resolved work through BRD, PRD, then FSD.
- Issue shaping, triage, Kanban, Journey, or PRD-to-FSD-goal work -> `sc-plan.md` with `issue-workflow` or `triage-workflow`.
- Implementation with an approved FSD goal -> `sc-work.md`.
- Session boundary -> `sc-pause.md`; new session starts with `sc-status.md`.

## Skill Priority

1. Process skills: `agentic-delivery`, `brainstorming`, `systematic-debugging`, `writing-plans`, `executing-plans`, `issue-workflow`, `triage-workflow`.
2. Product and design skills: `domain-modeling`, `codebase-design`, `prototyping`, `interface-design`.
3. Quality skills: `test-driven-development`, `verification-before-completion`, `code-review`, `architecture-enforcement`.
4. Git operation skills: `git-workflow-operation`.
5. Security and compatibility skills: `security-audit`, `compatibility-check`, `secure-code-patterns`, `threat-modeling`, `data-privacy`.
6. Context and memory skills: `state-management`, `context-engineering`, `knowledge-compounding`.

## Completion Bar

- Identify the command or inspection that proves the claim.
- Run it fresh when available.
- Read the output and report failures honestly.
- If verification finds gaps, fix the specific gap before expanding scope.
