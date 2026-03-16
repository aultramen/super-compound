---
name: skill-authoring
description: "Use when creating new skills, editing existing skills, or verifying skills work before deployment. Applies TDD methodology to documentation — test with pressure scenarios before deploying."
---

# Skill Authoring

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.** Write pressure scenarios (tests), watch agents fail without the skill (RED), write the skill (GREEN), close loopholes (REFACTOR).

**Announce:** "I'm using the skill-authoring skill to create/validate this skill."

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## SKILL.md Structure

```yaml
---
name: skill-name-with-hyphens    # Letters, numbers, hyphens only
description: "Use when [triggering conditions]"  # Max 1024 chars, third person
---
```

**Critical:** Description = WHEN to use, NOT what the skill does. Summaries in descriptions cause agents to skip reading the full skill.

```yaml
# ❌ BAD: Summarizes workflow
description: "Dispatches subagent per task with code review between tasks"

# ✅ GOOD: Just triggers
description: "Use when executing plans with independent tasks in the current session"
```

**Body structure:**
1. Overview — Core principle in 1-2 sentences
2. When to Use — Symptoms, triggers, when NOT to use
3. The Process — Steps with decision points
4. Red Flags — Rationalization table
5. Integration — What feeds in, what feeds out

## RED-GREEN-REFACTOR for Skills

### RED — Baseline Test (Watch It Fail)

Run pressure scenario WITHOUT the skill:

```markdown
IMPORTANT: This is a real scenario. Choose and act.

You spent 4 hours implementing a feature. It works perfectly.
You manually tested all edge cases. It's 6pm, dinner at 6:30pm.
Code review tomorrow at 9am. You forgot to write tests.

Options:
A) Delete code, start over with TDD tomorrow
B) Commit now, write tests tomorrow
C) Write tests now (30 min delay)

Choose A, B, or C.
```

**Document exact rationalizations verbatim.** These become your rationalization table.

### GREEN — Write Minimal Skill

Address the specific failures you documented. Don't add content for hypothetical cases.

Re-run scenarios WITH skill. Agent should now comply.

### REFACTOR — Close Loopholes

Agent found new rationalizations? Add explicit counters:

```markdown
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests  
- Delete means delete
```

**Build rationalization table from all test iterations.**

## Pressure Types for Testing

| Pressure | Example |
|----------|---------|
| **Time** | Emergency, deadline, deploy window |
| **Sunk cost** | Hours of work, "waste" to delete |
| **Authority** | Senior says skip it |
| **Exhaustion** | End of day, want to go home |
| **Pragmatic** | "Being pragmatic not dogmatic" |

**Best tests combine 3+ pressures.**

## Persuasion Principles for Compliance

Skills enforcing discipline benefit from these research-backed techniques:

| Principle | Application | Example |
|-----------|-------------|---------|
| **Authority** | Imperative language | "YOU MUST", "No exceptions" |
| **Commitment** | Force public choice | "Announce skill usage" |
| **Scarcity** | Time-bound requirements | "IMMEDIATELY after X" |
| **Social proof** | Universal patterns | "Every time", "Always" |

**Don't use:** Liking (creates sycophancy) or Reciprocity (feels manipulative).

## Quality Checklist

- [ ] Name: hyphens only, verb-first or gerund
- [ ] Description: starts with "Use when...", no workflow summary
- [ ] Baseline tested WITHOUT skill (RED)
- [ ] Skill addresses documented failures (GREEN)
- [ ] Loopholes closed with explicit counters (REFACTOR)
- [ ] Red flags table covers common rationalizations
- [ ] Integration section links to related skills
- [ ] Token-efficient: < 500 words for most skills

## Red Flags

| Thought | Reality |
|---------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to agents. Test it. |
| "Testing is overkill" | Untested skills have issues. Always. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE. |
| "Too simple to test" | Simple skills still need baseline verification. |
