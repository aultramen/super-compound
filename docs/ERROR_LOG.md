# Error Log

Costly mistakes with root cause, correction, and an IF-THEN prevention rule.
Contract: `.agent/skills/state-management/references/file-contracts.md`.
Read the Quick Reference table before starting a task; open a full entry only
when its rule matches the task at hand.

Caps: 50 entries or ~50 KB. On overflow, consolidate duplicate root causes
into one entry (`Consolidated from: ERR-...`), then move the oldest resolved
entries to `docs/archive/ERROR_ARCHIVE.md`. Archive, never delete.

## Quick Reference

| ID | Category | Prevention rule (IF-THEN) |
| --- | --- | --- |
<!-- newest first; one row per entry below -->
| ERR-2026-09-02-001 | skill router word cap | IF editing a SKILL.md router THEN run `wc -w` first and stay under 500 words |

---

## ERR-2026-09-02-001 - skill router word cap
- Symptom: `.agent/skills/context-engineering/SKILL.md` reached 515 words after one added bullet; `framework-audit` caps routers at 500.
- Root cause: assumed headroom without measuring; the router already sat at 498 words.
- Correct approach: merged the rule into an existing bullet and trimmed three lines.
- Prevention: IF editing a SKILL.md router THEN run `wc -w` first and stay under 500 words.
- Files: .agent/skills/context-engineering/SKILL.md

<!-- Entry format (append below, newest last):

## ERR-YYYY-MM-DD-NNN - <error category>
- Symptom: <observed failure, exact error text>
- Root cause: <why>
- Correct approach: <verified correction>
- Prevention: IF <condition> THEN <bounded action>
- Files: <paths involved>
-->
