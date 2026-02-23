---
description: "Explore a feature idea collaboratively before planning. Combines brainstorming (explore ideas) and discussion (resolve gray areas) into one seamless pre-planning workflow."
---

# Explore Workflow

This workflow prepares you for planning by exploring ideas and resolving ambiguities. It auto-selects the right mode based on where you are.

> **Use `/explore` when you're not ready to plan yet.** If requirements are clear, skip straight to `/plan`.

## Mode Selection

```
/explore              → Auto-detect mode based on your request
/explore brainstorm   → Force idea exploration (rough idea, unclear direction)
/explore discuss      → Force gray-area resolution (idea known, decisions needed)
```

**Auto-detection:**
- Rough idea / "I'm thinking about..." / "what if..." → **Brainstorm mode**
- Known feature with open questions / "how should we..." → **Discuss mode**

---

## Brainstorm Mode

*Use when: you have a rough idea and need to explore what and how to build.*

1. **Read brainstorming skill** — Load `skills/brainstorming/SKILL.md`.

2. **Phase 0: Assess** — Confirm brainstorming is needed vs requirements already clear.

3. **Phase 1: Understand** — Scan codebase for context, then ask clarifying questions ONE AT A TIME.

4. **Phase 2: Explore** — Present 2–3 approaches with trade-offs. Lead with recommendation.

5. **Phase 3: Design** — Present the design in 200–300 word sections, validating each.
   - Frontend/UI work → auto-invoke `ui-ux-pro-max` for design intelligence.

6. **Phase 4: Capture** — Save to `docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`.

7. **Handoff** — "Ready to resolve any open decisions? I can run discuss mode, or go straight to `/plan`."

---

## Discuss Mode

*Use when: you know what to build, but need to resolve gray areas before planning.*

1. **Analyze the task** — Review requirements, brainstorm docs, and project context. Identify gray areas:
   - **Domain:** Business rules not specified
   - **Technical:** Architecture choices not decided
   - **Integration:** How this connects to existing systems
   - **UX:** User interaction patterns not defined

2. **Present gray areas** —

   ```markdown
   ## Gray Areas Identified

   | # | Area | Type | Why It Matters |
   |---|------|------|---------------|
   | 1 | [description] | domain/technical/integration/ux | [impact on plan] |
   ```
   Ask: "Which would you like to discuss? (all / by number / skip)"

3. **Deep-dive each area** — For each area:
   - Ask up to **4 focused questions** (one at a time)
   - Lead with your recommendation when possible
   - Lock decision when user confirms

4. **Scope guardrail** — If user introduces new features:
   > "That sounds like a separate feature. Capture as todo for later?"

5. **Capture decisions** — Save to `docs/context/YYYY-MM-DD-<topic>.md`:

   ```markdown
   # Context: [Topic]
   > Decisions gathered: YYYY-MM-DD — LOCKED

   ## Decisions Made
   | # | Question | Decision | Reason |
   |-------|----------|----------|--------|

   ## Implications for Planning
   - [How decisions affect the plan]

   ## Out of Scope (Captured for Later)
   - [Deferred items]
   ```

6. **Update STATE.md** — Add decisions to the Decisions Made table.

7. **Handoff** — "Gray areas resolved. Ready to plan? (`/plan`) | Need research first? (`/research`)"

---

## Key Rules (Discuss Mode)

| Rule | Description |
|------|-------------|
| **4 questions max per area** | Prevent analysis paralysis |
| **One question at a time** | Respect cognitive load |
| **Lead with recommendation** | Don't just ask — propose |
| **Lock decisions** | Once decided, it's settled |
| **Scope guardrail** | New features → todo, not scope creep |

---

## When to Use
- New feature ideas (brainstorm mode)
- Before planning complex features with many unknowns (discuss mode)
- Unclear requirements or multiple stakeholder expectations
- Before large refactoring efforts

## When to Skip
- Requirements are already detailed and specific → go to `/plan`
- Simple bug fixes with clear reproduction steps → go to `/debug`
- User explicitly says to skip exploration
