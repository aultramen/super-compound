# Agent Prompt Index

Load full agent prompts only when dispatching that role.

| Agent | Use for |
|---|---|
| `architect` | architecture and FSD decisions |
| `brain` | read-only genius-loop idea evaluation |
| `build-fixer` | build/test startup failures |
| `code-reviewer` | findings-first review |
| `doc-updater` | docs synchronization |
| `e2e-runner` | Playwright E2E flows |

Per-host model per agent: `.agent/context/agent-models.json`; `npm run agents:project` regenerates `.claude/agents/` (Claude Code). Codex has no machine surface for subagent models here; its orchestrator reads the same mapping from the installed `references/context/agent-models.json`.
