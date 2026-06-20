# Super Compound Gap Analysis - 2026-06-20

## Scope

This analysis compares the current `super-compound` framework against the updated local framework folders in `D:\BATI\Development\framework`:

- `compound-engineering`
- `everything-claude-code`
- `gao-agent`
- `gsd-core-next`
- `isms-public`
- `mattpocock-skills-main`
- `ralph`
- `superpowers`
- `ui-ux-pro-max-skill`

The goal is to keep Super Compound as the unified framework while adopting the strongest reusable patterns from each source without copying unrelated project-specific bulk.

## Method

- Read root instructions, README files, agent guidance, workflows, skills, rules, and package metadata where present.
- Inspected source frameworks for reusable operating patterns, security/compliance controls, loop mechanics, state management, and UI/UX data.
- Compared those findings against existing Super Compound workflows, skills, rules, and docs.
- Updated Super Compound only where the gap improves day-to-day agent engineering, governance, verification, or product quality.
- Inventory counts below exclude `.git` internals and represent workspace files visible to normal framework analysis.

## Source Inventory

| Source | Files | Approx Size |
|--------|------:|------------:|
| `compound-engineering` | 569 | 6.66 MB |
| `everything-claude-code` | 3250 | 42.63 MB |
| `gao-agent` | 539 | 3.56 MB |
| `gsd-core-next` | 2365 | 22.81 MB |
| `isms-public` | 43 | 2.32 MB |
| `mattpocock-skills-main` | 84 | 0.28 MB |
| `ralph` | 39 | 4.95 MB |
| `super-compound` after Matt Pocock update snapshot | 144 | 2.25 MB |
| `superpowers` | 173 | 1.32 MB |
| `ui-ux-pro-max-skill` | 326 | 10.64 MB |

## Source Findings And Adopted Gaps

| Source | Important Findings | Adopted Into Super Compound |
|--------|--------------------|-----------------------------|
| `compound-engineering` | Strategy-first work, product pulse, knowledge refresh, optimization loops, compound engineering philosophy | Added `strategy-governance`, `product-pulse`, `knowledge-refresh`, `optimization-loop`; added `/strategy`, `/pulse`, `/refresh`, `/optimize` |
| `everything-claude-code` | Harness OS patterns, hook profiles, agent-surface security, production audit, continuous loops, skill stocktake | Added agent/tool surface checks, MCP governance, production readiness, loop controls, quality gate expansion |
| `gao-agent` | Persistent task/error/learning memory, deploy workflow, MCP health checks, Indonesia compliance and payment context | Expanded `state-management`; added deploy and MCP-check workflow; added UU PDP/SNAP/QRIS/payment context in compliance-oriented skills |
| `gsd-core-next` | Spec-driven planning, package legitimacy gate, prompt-injection defenses, `.planning` style continuity, verification before ship | Added `supply-chain-risk`; strengthened planning/execution/quality gates; added production readiness and prompt/tool boundary checks |
| `isms-public` | Public ISMS model, ISO 27001/NIST/CIS/GDPR/NIS2/EU CRA/OWASP LLM evidence, AI governance, supplier/risk registers | Replaced old Hack23 CIA origin with Hack23/ISMS-PUBLIC; added `isms-compliance`; expanded security audit and rules |
| `mattpocock-skills-main` | Small composable real-engineering skills: grilling, domain modeling, deep modules, issue triage, vertical slices, throwaway prototypes, handoffs, skill invocation taxonomy | Added `grilling`, `domain-modeling`, `codebase-design`, `issue-workflow`, `prototyping`, `handoff-protocol`, `decision-mapping`, `merge-conflict-resolution`, `git-safety-guardrails`, `learning-workspace`; added `/grill`, `/domain`, `/architecture`, `/prototype`, `/triage`, `/issues`, `/decision-map`, `/handoff` |
| `ralph` | PRD-to-story loop, one story per iteration, progress ledger, completion promise, iteration cap | Added `agentic-loop` and `/loop` with bounded autonomous iteration and durable progress rules |
| `superpowers` | Strict skill invocation, subagent file handoff, skill TDD, harness portability, progress ledger | Reinforced skill routing, file-based state, execution ledger, and portability/security guidance |
| `ui-ux-pro-max-skill` | Curated UI data and design-system generator: 84 styles, 161 colors, 73 typography rules, 99 UX rules, 161 reasoning rules, 25 chart types, 16 stacks | Synced UI data/scripts; updated `ui-ux-pro-max` docs, stack routing, and walkthrough statistics |

## Matt Pocock Skills File And Folder Analysis

| Area | Files Reviewed | Finding | Super Compound Decision |
|------|----------------|---------|-------------------------|
| Root docs/config | `README.md`, `CONTEXT.md`, `CLAUDE.md`, `docs/invocation.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore` | Small composable skills, user-invoked vs model-invoked taxonomy, domain glossary, skill publication rules | Added origin note; upgraded `skill-authoring`; added domain/issue config |
| Package/release | `package.json`, `package-lock.json`, `.changeset/*`, `.github/workflows/release.yml` | Private npm package using Changesets; dependency surface is publishing-only | No package workflow copied; release pattern noted as source hygiene only |
| Plugin/scripts | `.claude-plugin/plugin.json`, `scripts/list-skills.sh`, `scripts/link-skills.sh` | Explicit promoted skill list; deprecated/personal/in-progress excluded from plugin | Adopted curated-skill posture; did not copy symlink installer |
| Engineering router | `skills/engineering/ask-matt/SKILL.md` | Main flow: grill -> PRD/issues -> implement; prototype/handoff branches | Added `/grill`, `/prototype`, `/issues`, `/handoff`; updated `/sc-launch` |
| Grilling | `grill-with-docs`, `productivity/grilling`, `grill-me` | One-question-at-a-time interview, answer from code when possible, pair with domain modeling | Added `grilling` skill and `/grill` workflow |
| Domain modeling | `domain-modeling/SKILL.md`, `CONTEXT-FORMAT.md`, `ADR-FORMAT.md` | `CONTEXT.md` glossary only; ADRs only for hard-to-reverse surprising trade-offs | Added `domain-modeling` skill and `/domain`; updated state/planning/PRD |
| Codebase design | `codebase-design/SKILL.md`, `DEEPENING.md`, `DESIGN-IT-TWICE.md` | Deep modules, interface as test surface, seams/adapters, design-it-twice | Added `codebase-design`, `/architecture`; enhanced TDD/review/architecture |
| Debugging | `diagnosing-bugs/SKILL.md`, `scripts/hitl-loop.template.sh` | Tight red-capable feedback loop before hypotheses; ranked falsifiable hypotheses | Enhanced `systematic-debugging` and `/sc-debug` |
| TDD | `tdd/SKILL.md`, `tests.md`, `mocking.md`, `refactoring.md` | Public-interface tests, no horizontal RED pile, mock only boundaries, refactor/deepen after green | Enhanced `test-driven-development` |
| PRD/issues/triage | `to-prd`, `to-issues`, `triage`, `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`, setup tracker templates | Conversation-to-PRD synthesis, vertical-slice issues, triage states, agent-ready briefs, out-of-scope memory | Added `issue-workflow`, `/triage`, `/issues`; enhanced `prd-generator` |
| Prototype | `prototype/SKILL.md`, `LOGIC.md`, `UI.md` | Throwaway logic/state TUI or UI `?variant=` route; capture answer then delete/absorb | Added `prototyping` and `/prototype` |
| Handoff | `productivity/handoff/SKILL.md` | Compact fresh-session doc in OS temp; reference artifacts instead of duplicating; redact sensitive data | Added `handoff-protocol` and `/handoff`; linked from `/sc-pause` |
| Teaching | `teach/SKILL.md`, `MISSION/RESOURCES/LEARNING/GLOSSARY` formats | Stateful learning workspace, reusable lesson assets, retrieval practice | Added optional `learning-workspace` skill |
| Skill writing | `writing-great-skills/SKILL.md`, `GLOSSARY.md` | Predictability, context load, cognitive load, no-op, sediment, sprawl, leading words | Enhanced `skill-authoring` |
| Misc safety/tooling | `git-guardrails-claude-code`, `setup-pre-commit`, `scaffold-exercises`, `migrate-to-shoehorn` | Git safety hooks, pre-commit automation, course scaffolding, test helper migration | Added `git-safety-guardrails`; kept other tool-specific skills out of core |
| Merge conflicts | `resolving-merge-conflicts/SKILL.md` | Preserve intent from both sides, inspect primary sources, verify checks | Added `merge-conflict-resolution`, adapted no-commit default to Super Compound rules |
| In-progress | `decision-mapping`, `review`, `writing-shape`, `writing-beats`, `writing-fragments` | Decision map and two-axis review are useful; writing drafts are not core engineering | Added bounded `decision-mapping`; enhanced `/sc-review`; deferred writing drafts |
| Deprecated | `deprecated/*` | Useful older patterns superseded by domain modeling, codebase design, issue workflow | Did not copy deprecated skills directly |
| Personal | `personal/*` | Obsidian/article skills are setup-specific | Not adopted except general learning concepts from `teach` |
| Out-of-scope KB | `.out-of-scope/*` | Durable rejected-feature memory prevents repeated triage | Adopted `.out-of-scope/` in `issue-workflow` and config |

## Implemented Enhancements

### New Skills

- `strategy-governance`
- `product-pulse`
- `knowledge-refresh`
- `agentic-loop`
- `optimization-loop`
- `production-readiness`
- `isms-compliance`
- `supply-chain-risk`
- `agent-surface-security`
- `mcp-governance`
- `integration-checking`
- `secrets-management`
- `structured-tasks`
- `grilling`
- `domain-modeling`
- `codebase-design`
- `issue-workflow`
- `prototyping`
- `handoff-protocol`
- `decision-mapping`
- `merge-conflict-resolution`
- `git-safety-guardrails`
- `learning-workspace`

### New Workflows

- `/strategy`
- `/pulse`
- `/refresh`
- `/loop`
- `/optimize`
- `/deploy`
- `/mcp-check`
- `/grill`
- `/domain`
- `/architecture`
- `/prototype`
- `/triage`
- `/issues`
- `/decision-map`
- `/handoff`

### Updated Rules And Existing Skills

- `project-config` now includes governance, agent runtime, and design-system configuration.
- `quality-gates` now covers supply chain, agent surface, production readiness, strategy/pulse, and design-system checks.
- `state-management` now recognizes `docs/ACTIVE_TASK.md`, `docs/ERROR_LOG.md`, and `docs/LEARNED_KNOWLEDGE.md`.
- `security-audit` now routes to supply-chain, agent-surface, MCP, ISMS, and production readiness checks.
- `writing-plans` and `executing-plans` now use structured tasks, compatibility, supply-chain checks, and durable progress ledgers when relevant.
- `launch` now starts with strategy and ends with deploy/pulse follow-up instead of only implementation closure.
- `test-driven-development` now prefers public-interface tests, tracer bullets, boundary-only mocks, and deep-module feedback.
- `systematic-debugging` now starts with a tight red-capable feedback loop and ranked falsifiable hypotheses.
- `prd-generator` now supports conversation-to-PRD synthesis plus implementation/testing decisions.
- `skill-authoring` now includes invocation mode, context load, cognitive load, no-op, sediment, and sprawl pruning.
- `review` now separates Spec and Standards axes.

### Updated Documentation

- `README.md`
- `SUPER-COMPOUND.md`
- `WALKTHROUGH.md`
- `.agent/rules/super-compound.md`
- `.agent/workflows/sc-launch.md`
- `.agent/workflows/sc-audit.md`

## Deliberately Not Adopted

- Full wholesale ISMS policy import from `isms-public`; Super Compound now maps evidence and controls instead of becoming a policy repository.
- Unsafe permission-bypass defaults from Ralph-style runners; the adopted loop uses caps, ledgers, and explicit completion promises.
- Full `.planning` registry from GSD; Super Compound keeps its existing `STATE.md`, `.continue-here.md`, and `docs/` model while adding lightweight companion files.
- Full hook-profile runtime from Everything Claude Code; this is deferred until Super Compound has a stable cross-harness installer.
- Mass agent expansion from Compound Engineering; new behavior is represented as focused skills/workflows to avoid startup bloat.
- Personal/deprecated Matt Pocock skills were not copied directly. Reusable mature patterns were adopted; personal Obsidian/article workflows and deprecated QA/interface/refactor skills stayed out of core.

## Current Super Compound Posture

Super Compound is now positioned as a stronger unified framework with:

- Strategy and product feedback loops before and after implementation.
- Bounded autonomous execution for PRD-sized work.
- Stronger security coverage for code, dependencies, agent/tool surfaces, and MCP.
- ISMS-oriented evidence mapping based on Hack23/ISMS-PUBLIC rather than Hack23 CIA.
- More complete UI/UX design intelligence synced from the updated UI/UX Pro Max source.
- Lightweight persistent learning and operational readiness signals.
- Real-engineering alignment loops: grilling, domain glossary, deep-module design, issue triage, vertical-slice issues, prototypes, handoffs, and git safety.
