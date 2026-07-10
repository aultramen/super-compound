---
name: architecture-enforcement
description: "Use when file placement, dependency direction, framework conventions, or project architecture presets must be verified before writing code."
---

# Architecture Enforcement

## Overview

Enforce clean architecture aligned with each framework's best practices. Detect the project branch, load only its detailed reference, then verify placement and dependencies before writing code.

**Announce:** "I'm using the architecture-enforcement skill to verify code placement and dependencies."

**Scope:** This skill checks placement, dependency direction, and framework conventions. Use `/sc-explore` or `/sc-plan` when the deeper question is whether a module, interface, seam, or adapter is shaped well enough to build.

## When to Use

- Before creating any new file — verify it goes in the correct directory
- Before adding imports — verify dependency direction is allowed
- During code review — check for architectural violations (P1 Critical)
- When setting up a new project — load the matching preset

## Process

1. Inspect `.agent/rules/project-config.md`, manifests, framework config, and nearby folders. Match `architecture` plus `backend.framework` / `frontend.framework`.
2. Load only the detected framework reference below. Load multiple guides only when the change crosses those branches. Do not preload unrelated references.
3. For project setup only, copy the matching [preset](references/presets.md) into `.agent/rules/project-config.md`.
4. Apply every gate before writing or approving the change.

If unmatched, retain the nearest project conventions; do not invent a layout. If ambiguous, inspect only candidate references needed to decide.

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

- **Placement gate:** The target belongs in the detected guide's folder and layer.
- **Dependency gate:** Every new import follows that guide's arrows and `NEVER` rules.
- **Security gate:** Every framework MUST implement the patterns in [HTTP/security](references/http-security.md). Load it for HTTP, middleware, auth, CORS, headers, rate limits, public endpoints, or architecture review; placement follows the detected guide.
- **Review gate:** Report architecture violations as P1 Critical.

## Integration

Pair with `writing-plans` and `code-review` when placement is valid but module shape, interface, adapter strategy, leverage, or locality needs review. `executing-plans` checks placement before writing code; `code-review` verifies compliance. Project-config rules use presets, quality-gates rules use framework specifics, and `context7-docs` supplies current conventions beyond these references.
