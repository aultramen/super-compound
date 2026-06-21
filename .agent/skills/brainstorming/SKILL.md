---
name: brainstorming
description: "Use before creative product, feature, UI, or behavior work. Explores user intent, requirements, constraints, and design before implementation."
---

# Brainstorming

## Purpose

Turn a rough idea into a clear direction before writing a PRD, plan, or code.

Announce: "I'm using the brainstorming skill to explore and refine this idea."

## When To Use

Use this skill when:

- The user has an idea but not acceptance criteria
- Product direction, users, constraints, or tradeoffs are unclear
- UI or workflow shape needs exploration
- Several implementation paths seem plausible
- The request risks becoming overbuilt without scope choices

Skip it when the user already provided a concrete spec, exact files, and acceptance criteria. In that case, move to `/sc-plan`.

## Process

### 1. Gather Local Context

Before asking questions:

- Read similar code or docs when easy to find
- Check recent `docs/brainstorms/` for the same topic
- Check `docs/solutions/` and `docs/LEARNED_KNOWLEDGE.md` when present
- For UI work, run `interface-design` search or reuse an existing design-system artifact

Frontend design search:

```bash
python .agent/skills/interface-design/scripts/search.py "<product type> <industry>" --design-system -p "<Project>"
```

### 2. Ask One Useful Question At A Time

Use one concise question per turn. Prefer lettered options when natural choices exist:

```text
What is the primary outcome?
A. Increase conversion
B. Reduce support work
C. Add a missing workflow
D. Explore options first
```

Start broad, then narrow:

- Target user and job-to-be-done
- Success criteria
- Constraints and non-goals
- Existing patterns to respect
- Risks, edge cases, and reversibility

### 3. Offer 2-3 Approaches

For each approach include:

- Short description
- Pros
- Cons
- When it fits

Lead with a recommendation. Prefer the simplest approach that satisfies the goal and keeps future change possible.

### 4. Capture Decisions

Save useful exploration to:

```text
docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md
```

Include:

- What we are building
- Why this approach
- Alternatives considered
- Key decisions
- Open questions
- Recommended next workflow

## UI Exploration

For pages, dashboards, components, or landing pages:

- Use `interface-design` for domain, style, typography, stack, and accessibility guidance
- Include concrete interface decisions, not generic inspiration
- Add accessibility and responsive requirements early
- Avoid decorative-only design direction unless the product context supports it

## Visual Exploration

Use Mermaid or simple ASCII diagrams when it clarifies:

- Architecture choices
- User flows
- State transitions
- Data relationships
- Component ownership

Skip diagrams for small bugs or straightforward copy/config changes.

## Red Flags

| Thought | Better Response |
|---|---|
| "The user knows what they want" | Confirm the highest-risk assumption |
| "I'll ask every question now" | Ask one question, then adapt |
| "Let's start coding" | Capture the direction, then plan |
| "All ideas should be kept" | Name non-goals and cut scope |

## Next Steps

After brainstorming, route to:

- `/sc-prd` for product requirements
- `/sc-plan` for implementation planning
- `/sc-ui` for interface-focused work
- `/sc-work` only if requirements are already concrete enough

## Related Skills

- `prd-generator` turns decisions into requirements
- `writing-plans` turns decisions into implementation tasks
- `interface-design` supports frontend exploration
- `knowledge-compounding` preserves reusable lessons
