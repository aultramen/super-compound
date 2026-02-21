---
description: "Structured domain research before planning. Investigates standard stack, patterns, and pitfalls to prevent hand-rolling solved problems."
---

# Research Workflow

This workflow conducts structured domain research before planning. It investigates what's already solved, what patterns to follow, and what pitfalls to avoid — so plans are grounded in reality, not assumptions.

## Steps

1. **Identify research scope** — What do we need to research?
   - What technology/domain is this feature in?
   - What don't we know about the implementation?
   - What assumptions are we making?

2. **Local research** — Check the project first:
   // turbo
   - Existing implementations of similar features
   - Project conventions and patterns already in use
   - `docs/solutions/` for previously solved related problems
   - `docs/codebase/` for architecture context (if init was run)

3. **External research** — Search for:
   - **Standard Stack** — What libraries/tools are commonly used for this?
     - Web search for "[framework] [feature] recommended packages"
     - Check for well-maintained, widely-adopted solutions
   - **Architecture Patterns** — How do others structure this?
     - Web search for "[feature type] architecture pattern"
     - Look for established patterns (repository, service, event-driven, etc.)
   - **Don't Hand-Roll** — What already has a solution?
     - Authentication → use established auth libraries
     - File upload → use established file handling libraries
     - Email → use established mail services
     - Payments → use Stripe/payment provider SDKs
   - **Common Pitfalls** — What goes wrong?
     - Web search for "[technology] [feature] common mistakes"
     - Check for security gotchas, performance traps, edge cases
   - **Code Examples** — Reference implementations
     - Official documentation examples
     - Well-regarded open-source implementations

4. **Synthesize findings** — Create research document:

   ```markdown
   # Research: [Topic]

   > Generated: YYYY-MM-DD

   ## Standard Stack
   | Component | Recommended | Why |
   |-----------|-------------|-----|
   | [component] | [library/tool] | [reason] |

   ## Architecture Patterns
   - **Recommended:** [pattern name] — [brief description]
   - **Alternative:** [pattern name] — [when to use this instead]

   ## Don't Hand-Roll
   | Problem | Existing Solution | Notes |
   |---------|------------------|-------|
   | [problem] | [solution] | [considerations] |

   ## Common Pitfalls
   | Pitfall | Impact | Prevention |
   |---------|--------|------------|
   | [pitfall] | [what goes wrong] | [how to avoid] |

   ## Code Examples
   [Key patterns and reference code from Official documentation]

   ## Implications for Our Plan
   - [How this research affects our implementation approach]
   - [Specific decisions informed by this research]
   ```

5. **Save research** — Write to `docs/research/YYYY-MM-DD-<topic>.md`

6. **Handoff** — Present findings and suggest next steps:
   - "Research complete. Ready to create a plan? (`/plan`)"
   - "Found some decisions needed — run `/discuss` first?"

## When to Use
- Before planning a complex feature with unfamiliar technology
- When the team hasn't built something similar before
- When multiple implementation approaches exist
- Before introducing new dependencies

## When to Skip
- Simple features using familiar patterns
- Bug fixes (use debug workflow instead)
- The project already has similar implementations to follow
- User explicitly says to skip research
