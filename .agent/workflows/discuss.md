---
description: "Pre-planning context gathering via structured exploration of gray areas. Use when requirements have ambiguity that should be resolved before creating a plan."
---

# Discuss Workflow

This workflow identifies and resolves gray areas BEFORE planning. It gathers the context and decisions that prevent planning failures.

## Steps

1. **Analyze the task** — Review requirements, brainstorm docs, and project context to identify gray areas:
   - **Domain gray areas:** Business rules that aren't specified
   - **Technical gray areas:** Architecture choices not yet decided
   - **Integration gray areas:** How this connects to existing systems
   - **UX gray areas:** User interaction patterns not yet defined

2. **Present gray areas** — Show the identified areas:

   ```markdown
   ## Gray Areas Identified

   I've identified [N] gray areas that could affect the plan:

   | # | Area | Type | Why It Matters |
   |---|------|------|---------------|
   | 1 | [description] | domain/technical/integration/ux | [impact on plan] |
   | 2 | [description] | domain/technical/integration/ux | [impact on plan] |

   Which would you like to discuss? (all / select by number / skip)
   ```

3. **Deep-dive each area** — For each selected gray area:
   - Ask up to **4 focused questions** (one at a time)
   - Lead with your recommendation when possible
   - After 4 questions, check: "Resolved, or need more?"
   - Lock the decision when user confirms

4. **Scope guardrail** — If user introduces new features during discussion:
   > "That sounds like a separate feature. Should I capture it as a todo for later? Let's keep focused on the current scope."

5. **Capture decisions** — Save to `docs/context/YYYY-MM-DD-<topic>.md`:

   ```markdown
   # Context: [Topic]

   > Decisions gathered: YYYY-MM-DD
   > These decisions are LOCKED — reference during planning and execution.

   ## Decisions Made

   | # | Question | Decision | Reason |
   |---|----------|----------|--------|
   | 1 | [what was asked] | [what was decided] | [why] |

   ## Implications for Planning

   - [How decision 1 affects the plan]
   - [How decision 2 affects the plan]

   ## Out of Scope (Captured for Later)

   - [Feature/idea mentioned but deferred]
   ```

6. **Update STATE.md** — Add all decisions to the Decisions Made table.

7. **Handoff** — Route to next step:
   - "Gray areas resolved. Ready to plan? (`/plan`)"
   - "Need research on [topic] first? (`/research`)"

## How to Identify Gray Areas

### Domain Gray Areas
- "How should [business rule] work when [edge case]?"
- "What happens when [conflicting rules] apply?"
- "Who has permission to [action]?"

### Technical Gray Areas
- "Should we use [option A] or [option B] for [component]?"
- "How should [data] flow between [systems]?"
- "What's the caching strategy for [feature]?"

### Integration Gray Areas
- "How does this connect to [existing system]?"
- "What data format does [external API] expect?"
- "How should errors from [service] be handled?"

### UX Gray Areas
- "What should the user see when [condition]?"
- "How should [validation error] be presented?"
- "What's the loading/empty/error state?"

## Key Rules

| Rule | Description |
|------|-------------|
| **4 questions max per area** | Prevent analysis paralysis |
| **One question at a time** | Respect cognitive load |
| **Lead with recommendation** | Don't just ask — propose |
| **Lock decisions** | Once decided, it's settled |
| **Scope guardrail** | New features → todo, not scope creep |

## When to Use
- Before planning complex features with many unknowns
- When requirements mention things without specifying how
- When multiple stakeholders have different expectations
- Before large refactoring efforts

## When to Skip
- Requirements are already detailed and specific
- Simple features with obvious implementation
- Bug fixes with clear reproduction steps
- User explicitly says to skip discussion
