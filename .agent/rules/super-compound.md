# Super Compound

Super Compound is a compact agent framework for disciplined software work: understand first, plan before code, verify before claims, and capture useful knowledge after non-trivial fixes.

## Core Rules

- Use evidence before claims. Do not say work is complete without fresh verification.
- Keep the workflow surface small. Public workflows live in `.agent/workflows/` and are limited to the core set below.
- Keep detailed procedures in skills. Rules stay short because they are always-on context.
- Prefer existing project conventions, tools, and architecture over new abstractions.
- Treat hooks, prompts, skills, workflows, MCP config, and dependency changes as security-sensitive.
- Preserve user work. Do not overwrite unrelated local changes.

## Core Workflows

| Workflow | Use For |
|----------|---------|
| `init.md` | New/imported project scan and rule reload via `/init reload` |
| `status.md` | Session orientation and saved handoff resume |
| `explore.md` | Fuzzy ideas, domain alignment, strategy, prototypes, and open decisions |
| `research.md` | Technical or domain research before planning |
| `prd.md` | Product requirements and acceptance criteria |
| `plan.md` | Implementation plan, task shaping, issue-ready slices |
| `eval.md` | Eval-driven success criteria and reliability checks |
| `work.md` | Execute approved plans, including optional parallel execution |
| `debug.md` | Reproduce, diagnose root cause, fix, and verify bugs |
| `review.md` | Spec and standards review of code changes |
| `audit.md` | Security, compatibility, dependency, agent surface, MCP, compliance, and release-readiness audit |
| `compound.md` | Capture non-trivial solved problems as reusable knowledge |
| `pause.md` | Save `.continue-here.md` handoff before stopping |
| `launch.md` | Run the complete lifecycle through the core workflow sequence |
| `ui.md` | Frontend, mobile, chart, and interface design work |

## Routing

- UI/frontend/mobile/chart work -> `ui.md` and `interface-design`.
- Bugs, failures, regressions -> `debug.md` and `systematic-debugging`.
- Security, dependency, release, MCP, compliance, or agent config risk -> `audit.md`.
- Open product/domain/architecture uncertainty -> `explore.md`; convert resolved work through `prd.md` or `plan.md`.
- Implementation with an approved plan -> `work.md`.
- Session boundary -> `pause.md`; new session starts with `status.md`.

## Skill Priority

1. Process skills: `brainstorming`, `systematic-debugging`, `writing-plans`, `executing-plans`.
2. Quality skills: `test-driven-development`, `verification-before-completion`, `code-review`, `architecture-enforcement`.
3. Security and compatibility skills: `security-audit`, `compatibility-check`, `secure-code-patterns`, `threat-modeling`, `data-privacy`.
4. Context and memory skills: `state-management`, `context-engineering`, `knowledge-compounding`.

## Completion Bar

- Identify the command or inspection that proves the claim.
- Run it fresh when available.
- Read the output and report failures honestly.
- If verification finds gaps, fix the specific gap before expanding scope.
