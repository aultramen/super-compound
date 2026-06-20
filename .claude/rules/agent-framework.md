---
paths:
  - ".agent/**/*"
  - "SUPER-COMPOUND.md"
  - "README.md"
  - "WALKTHROUGH.md"
  - "AGENTS.md"
  - "CLAUDE.md"
---

# Super Compound Agent Framework Rules

- Preserve the `.agent/` layout: rules, workflows, skills, agents, and hooks each have distinct responsibilities.
- Keep `.agent/rules/*.md` concise and high-signal because they are always-on Antigravity rules.
- Put detailed procedures in `.agent/skills/*/SKILL.md` or `.agent/workflows/*.md`, not in root startup files.
- Keep documented workflow aliases working unless the user explicitly requests a breaking change.
- Update `README.md`, `SUPER-COMPOUND.md`, and `WALKTHROUGH.md` together when a public workflow, skill, installation step, or compatibility note changes.
- Treat `.agent/hooks/*.js` changes as security-sensitive and verify they remain deterministic and local-first.
