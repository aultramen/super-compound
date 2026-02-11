---
name: brainstorming
description: "Use BEFORE any creative work — creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Turn rough ideas into fully formed designs through natural collaborative dialogue. Understand the project context, ask focused questions one at a time, then present the design in digestible sections for validation.

**Announce:** "I'm using the brainstorming skill to explore and refine this idea."

## The Process

### Phase 0: Assess Requirements Clarity

Evaluate whether brainstorming is needed:

**Clear requirements indicators:**
- Specific acceptance criteria provided
- Referenced existing patterns to follow
- Described exact expected behavior
- Constrained, well-defined scope

**If requirements are already clear:**
Suggest: "Your requirements are detailed enough to proceed directly to planning. Should I run the plan workflow instead, or explore the idea further?"

### Phase 1: Understand the Idea

**1.1 Local Research (Lightweight)**

Before asking questions, check the project context:
- Review existing codebase for similar patterns
- Check project docs for relevant guidance
- Look for recent brainstorm documents in `docs/brainstorms/`

**If a relevant brainstorm exists (within last 14 days):**
- Announce: "Found brainstorm from [date]: [topic]. Using as context."
- Skip the idea refinement questions
- Use existing decisions as input

**1.2 Collaborative Dialogue**

Ask questions **one at a time** to understand the idea:

- **Prefer multiple choice** when natural options exist (easier to answer)
- Start broad (purpose, users) then narrow (constraints, edge cases)
- Focus on: purpose, constraints, success criteria
- Continue until the idea is clear OR user says "proceed"

**Question Guidelines:**
- ONE question per message — don't overwhelm
- Lead with your hypothesis: "I think you're describing X. Is that right, or is it more like Y?"
- Validate assumptions explicitly

### Phase 2: Explore Approaches

Propose **2-3 concrete approaches** with trade-offs:

For each approach:
- Brief description (2-3 sentences)
- Pros and cons
- When it's best suited

**Lead with your recommendation** and explain why. Apply **YAGNI** — prefer simpler solutions.

### Phase 3: Present the Design

Once you understand what to build, present the design:

- Break into sections of **200-300 words**
- Ask after each section: "Does this look right so far?"
- Cover: architecture, components, data flow, error handling, testing approach
- Be ready to go back and clarify

### Phase 4: Capture & Handoff

**Save brainstorm document:**

```
docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md
```

**Document structure:**
- What We're Building
- Why This Approach (with alternatives considered)
- Key Decisions Made
- Open Questions (if any)

**Present next steps:**
1. **Review and refine** — Improve the document
2. **Proceed to planning** — Run the plan workflow (will auto-detect this brainstorm)
3. **Done for now** — Return later

## Key Principles

- **One question at a time** — Don't overwhelm with question lists
- **Multiple choice preferred** — Easier to answer than open-ended
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design in sections, validate each
- **Stay focused on WHAT, not HOW** — Implementation details belong in the plan
- **NEVER CODE** — Just explore and document decisions

## Red Flags

| Thought | Reality |
|---------|---------|
| "The user knows what they want, skip brainstorming" | Assumptions cause rework. Ask. |
| "This is too simple to brainstorm" | Simple features have hidden complexity. |
| "Let me just start coding" | Plan before code. Always. |
| "I'll ask all my questions at once" | One at a time. Respect cognitive load. |

## Integration

**This skill feeds into:**
- **writing-plans** — Creates the plan from this design
- **knowledge-compounding** — Solutions reference brainstorm decisions
