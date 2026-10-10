---
name: architecture-enforcement
description: "Use when file placement, dependency direction, framework conventions, or project architecture presets must be verified before writing code."
---

# Architecture Enforcement

## Summary

Check placement, dependency direction and relevant framework conventions.
Resolve `.agent/context/standards.contract.md` for the target scope first.

**Scope:** Module/interface design decisions belong to `/sc-explore` or `/sc-plan`.

## When to Use

- New files: verify placement.
- New imports: verify dependency direction.
- Review: demonstrate architectural impact.
- Setup: inspect the selected preset.

## Process

1. Read explicit scoped profiles in `.agent/rules/project-config.md`; compare
   manifests/versions and nearby code as evidence. Report conflicts, never infer
   configuration replacement.
2. Load only selected rules and the relevant tested example/reference below.
   Cross-scope changes need each applicable profile; unrelated guides stay unloaded.
3. Presets are advisory. Copy a [preset](references/presets.md) only during
   authorized setup, preserving user configuration.
4. Apply applicable adopted gates before writing/review. Repository conventions
   override reference defaults, not mandatory organization controls.

Unknown frameworks use core and repository conventions; disclose limited coverage.

### Preset Router

- [Preset 1: Next.js Fullstack](references/presets.md#preset-1-nextjs-fullstack)
- [Preset 2: React + Express](references/presets.md#preset-2-react--express)
- [Preset 3: Vue / Nuxt Fullstack](references/presets.md#preset-3-vue--nuxt-fullstack)
- [Preset 4: Python FastAPI](references/presets.md#preset-4-python-fastapi)
- [Preset 5: Python Django](references/presets.md#preset-5-python-django)
- [Preset 6: Go Gin](references/presets.md#preset-6-go-gin)
- [Preset 7: PHP Laravel](references/presets.md#preset-7-php-laravel)
- [Preset 8: SvelteKit Fullstack](references/presets.md#preset-8-sveltekit-fullstack)
- [Preset 9: React Native (Mobile)](references/presets.md#preset-9-react-native-mobile)
- [Preset 10: General (Blank)](references/presets.md#preset-10-general-blank)

### Framework Router

| Signal | Load |
|---|---|
| `nextjs` / `next.config.*` | [Next.js](references/nextjs.md) |
| `express` | No legacy folder guide; retain project conventions and load [HTTP/security](references/http-security.md) |
| `react` + `vite` | [React + Vite](references/react-vite.md) |
| `nuxtjs` / `nuxt.config.*` | [Nuxt](references/nuxt.md) |
| FastAPI | [FastAPI](references/fastapi.md) |
| Django | [Django](references/django.md) |
| Go Gin | [Go Gin](references/go-gin.md) |
| Laravel | [Laravel](references/laravel.md) |
| `svelte` / `svelte.config.*` | [SvelteKit](references/sveltekit.md) |
| `react` + Metro / Expo | [React Native](references/react-native.md) |

## Gates

- **Placement gate:** Follow the adopted scope's layout; reference folders are defaults.
- **Dependency gate:** Enforce adopted boundaries using configured checks and review.
- **Security gate:** Core controls apply; [HTTP/security](references/http-security.md)
  supplies on-demand HTTP/auth guidance, not universal layout or middleware policy.
- **Review gate:** Severity follows demonstrated runtime/security/data/coupling impact. Placement drift alone is minor; P1 requires a material defect. Cite evidence and a proportional fix.

## Integration

Pair with `writing-plans`, `executing-plans`, and `code-review`; version-sensitive
documentation uses `context7-docs`. Effective standards and completion evidence
remain shared across stacks and hosts.
