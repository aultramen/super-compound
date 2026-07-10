---
name: interface-design
description: "Use when building, redesigning, or reviewing frontend UI: pages, components, dashboards, landing pages, mobile screens, charts, and interaction states."
---

# Interface Design

## Overview

Ground UI work in targeted retrieval from the curated interface database, then implement with the project's existing design system and verify the complete interaction surface.

**Announce:** "I'm using the interface-design skill to ground this UI work in the design guidance database."

## Reference Router

- Generate/persist a design system and run targeted domain or stack queries: [retrieval workflow](references/retrieval-workflow.md)
- Select supported domains, including explicit `gsap`, and supported web/mobile/desktop stacks: [catalog](references/catalog.md)
- Apply layout, icon, accessibility, state, chart, and pre-delivery rules: [implementation and checklist](references/implementation-and-checklist.md)

Load the retrieval workflow first. Load the catalog only to choose a domain/stack, then load implementation guidance for the surface being built or reviewed.

## Mandatory Gates

- **Retrieval gate:** Run `.agent/skills/interface-design/scripts/search.py` and read returned rows. Do not paste or preload `.agent/skills/interface-design/data/**/*.csv` into model context; raw CSV is only for editing or validating the data itself.
- **Search-before-missing gate:** Before declaring a design pattern, domain, stack, or guidance absent, run the relevant design-system, `--domain`, and/or `--stack` search with concrete product, industry, page, and framework terms. Distinguish no retrieval result from an unsupported capability.
- **Provenance gate:** `UPSTREAM.json` is the authority for selective upstream provenance. Preserve its pinned commit, normalized hashes, mirrored/transformed status, local transforms, local-only files, and intentionally excluded assets. Files not listed must not be claimed to mirror upstream.
- **Context gate:** Identify product type, audience, platform, page/screen, stack, project configuration, and style constraints. Use the configured stack; default to `html-tailwind` only for generic web UI.
- **Design-system gate:** Reuse existing components, tokens, styling conventions, and icon libraries before adding primitives. Persist retrieved guidance only when multiple UI tasks need it and respect overwrite/path protections.
- **Implementation gate:** Build the requested product experience, not a decorative concept. Cover responsive behavior, stable layout, text overflow, keyboard/focus behavior, accessible names, touch/safe-area needs, chart alternatives, and loading, empty, error, disabled, success, hover, focus, and pressed states.
- **Evidence gate:** Record which design-system/domain/stack searches informed the result and verify mobile/desktop layout, accessibility, interaction states, and stack-specific risks before delivery.
