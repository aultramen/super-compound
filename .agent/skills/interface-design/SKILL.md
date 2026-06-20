---
name: interface-design
description: "Use when building, redesigning, or reviewing frontend UI: pages, components, dashboards, landing pages, mobile screens, charts, and interaction states."
---

# Interface Design

## Overview

Use data-backed interface design guidance before implementing UI. This skill searches curated CSV guidance for product patterns, visual style, color, typography, UX, accessibility, web/app interface rules, charts, icons, React performance, and stack-specific implementation details.

**Announce:** "I'm using the interface-design skill to ground this UI work in the design guidance database."

## Workflow

1. Identify the product type, audience, platform, page/screen, stack, and any style constraints from the request and project config.
2. Generate or read the design system before implementation:

```bash
python .agent/skills/interface-design/scripts/search.py "<product type> <industry> <keywords>" --design-system -p "<Project Name>"
```

3. Persist reusable guidance when the project has multiple UI tasks:

```bash
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --persist -p "<Project Name>"
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --persist -p "<Project Name>" --page "dashboard"
```

4. Add targeted searches only where needed:

```bash
python .agent/skills/interface-design/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
python .agent/skills/interface-design/scripts/search.py "<keyword>" --stack <stack> [-n <max_results>]
```

5. Implement with existing project components and styling conventions.
6. Verify responsive layout, accessibility, text overflow, hover/focus states, empty/loading/error states, and stack-specific risks.

## Domains

| Domain | Use For | Example Keywords |
|--------|---------|------------------|
| `product` | Product type recommendations | SaaS, healthcare, portfolio, restaurant |
| `style` | Visual style and effects | minimal, brutalism, glass, editorial |
| `color` | Product-specific palettes | fintech, ecommerce, medical, service |
| `typography` | Font pairings and font mood | professional, playful, luxury |
| `landing` | Section order and CTA patterns | hero, pricing, testimonial |
| `chart` | Chart type and accessibility | trend, comparison, funnel |
| `ux` | General UX and anti-patterns | loading, animation, mobile, accessibility |
| `web` | Web interface/a11y rules | aria, focus, semantic, preconnect |
| `app` | Mobile app interface rules | touch target, safe area, gestures |
| `icons` | Icon choices | navigation, social, ecommerce |
| `react` | React/Next.js performance | suspense, memo, bundle, waterfall |
| `google-fonts` | Google Fonts metadata | variable font, serif, latin |

## Stacks

Use the stack from `.agent/rules/project-config.md` when available. Default to `html-tailwind` for generic web UI.

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `astro`, `angular`, `laravel`, `threejs`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`.

## Implementation Rules

- Use the app's existing design system and component library before adding new primitives.
- Use real icons from the existing icon set; do not use emoji as UI icons.
- Keep layout stable: fixed control dimensions, no hover-induced layout shift, no text overlap.
- Include keyboard focus states and accessible names for interactive controls.
- Treat loading, empty, error, disabled, and success states as part of the UI, not extras.
- For charts, provide readable labels, accessible fallback or data table where appropriate, and color choices that work without color-only meaning.
- For mobile/app UI, verify touch targets, safe areas, gesture conflicts, and dynamic text behavior.

## Pre-Delivery Checklist

- [ ] Design system or relevant domain search was consulted.
- [ ] Stack search was consulted for framework-specific UI risks.
- [ ] Responsive checks cover mobile and desktop where applicable.
- [ ] Text fits containers and does not overlap adjacent content.
- [ ] Interactive controls have visible hover/focus/pressed states.
- [ ] Accessibility labels, semantic elements, and keyboard navigation are covered.
- [ ] Visual choices avoid generic AI-looking gradients, decorative clutter, and ungrounded style mixing.
