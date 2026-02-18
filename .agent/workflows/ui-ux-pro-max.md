---
description: "Generate professional UI/UX with design intelligence. Use for any frontend work — landing pages, dashboards, components, or full applications."
---

# UI/UX Pro Max Workflow

This workflow generates a complete design system and implements professional UI using the ui-ux-pro-max skill's design intelligence database.

> **Use this when you need to build any frontend UI.** The skill will also auto-activate when other workflows (brainstorm, plan, work) detect frontend work.

## Steps

1. **Read the skill** — Load `skills/ui-ux-pro-max/SKILL.md` and follow its process.

2. **Validate Python** — Ensure Python 3.x is available:
   // turbo
   ```bash
   python3 --version || python --version
   ```
   If not installed, guide user to install.

3. **Analyze requirements** — Extract from user request:
   - Product type (SaaS, e-commerce, portfolio, etc.)
   - Style keywords (minimal, playful, professional, etc.)
   - Industry (healthcare, fintech, gaming, etc.)
   - Stack (from `project-config.md` or user preference)

4. **Generate design system** — Run the design system generator:
   // turbo
   ```bash
   python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system -p "<Project Name>"
   ```

5. **Persist design system (recommended)** — Save for cross-session reuse:
   ```bash
   python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "<Project Name>"
   ```

6. **Supplement searches** — Get additional details as needed:
   // turbo
   ```bash
   python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>
   python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
   ```

7. **Check architecture** — Use architecture-enforcement skill to verify file placement for the frontend framework.

8. **Implement** — Build the UI following the design system:
   - Apply recommended pattern, style, colors, typography
   - Follow stack-specific guidelines
   - Use framework best practices

9. **Pre-delivery checklist** — Run through the checklist in SKILL.md:
   - Visual quality (no emoji icons, consistent icon set)
   - Interaction (cursor-pointer, hover states, transitions)
   - Light/dark mode contrast
   - Layout (responsive, no horizontal scroll)
   - Accessibility (alt text, labels, focus states)

10. **Handoff** — Suggest next steps:
    - Run `/review` for code review
    - Run `/compound` if design patterns were discovered
    - Done

## When to Use
- Building landing pages or marketing sites
- Creating dashboards or admin panels
- Designing new UI components or pages
- Redesigning existing frontend
- Any request involving frontend/UI work

## When to Skip
- Backend-only work with no UI
- CLI tools or API-only services
- Minor text or copy changes
