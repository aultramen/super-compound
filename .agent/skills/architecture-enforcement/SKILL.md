---
name: architecture-enforcement
description: "Use BEFORE writing any code to verify correct folder placement, dependency direction, and framework conventions. Contains per-framework architecture guides and preset definitions."
---

# Architecture Enforcement

## Overview

Enforce clean architecture aligned with each framework's best practices. This skill contains the full folder structure guides and preset definitions referenced by the project config rules.

**Announce:** "I'm using the architecture-enforcement skill to verify code placement and dependencies."

## When to Use

- Before creating any new file — verify it goes in the correct directory
- Before adding imports — verify dependency direction is allowed
- During code review — check for architectural violations (P1 Critical)
- When setting up a new project — load the matching preset

---

## Preset Definitions

Copy the matching preset into `.agent/rules/project-config.md` to quick-start.

### Preset 1: Next.js Fullstack

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "nextjs", language: "typescript", styling: "tailwind", bundler: "turbopack", component_library: "shadcn" }
backend: { framework: "nextjs", language: "typescript", orm: "prisma", api_docs: "none" }
database: { primary: "postgresql", cache: "none", migration_tool: "prisma-migrate" }
auth: { method: "jwt", provider: "better-auth" }
container: "docker"
package_manager: "pnpm"
dev_command: "pnpm dev"
test_command: "pnpm vitest run"
lint_command: "pnpm eslint . && pnpm tsc --noEmit"
format_command: "pnpm prettier --write ."
build_command: "pnpm build"
migrate_command: "pnpm prisma migrate dev"
seed_command: "pnpm prisma db seed"
docker_command: "docker compose up -d"
architecture: "modular"
```

### Preset 2: React + Express

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "react", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "shadcn" }
backend: { framework: "express", language: "typescript", orm: "prisma", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "prisma-migrate" }
auth: { method: "jwt", provider: "passport" }
container: "docker"
package_manager: "pnpm"
dev_command: "pnpm dev"
test_command: "pnpm vitest run && pnpm jest --passWithNoTests"
lint_command: "pnpm eslint ."
format_command: "pnpm prettier --write ."
build_command: "pnpm build"
migrate_command: "pnpm prisma migrate dev"
seed_command: "pnpm prisma db seed"
docker_command: "docker compose up -d"
architecture: "layered"
```

### Preset 3: Vue / Nuxt Fullstack

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "nuxtjs", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "none" }
backend: { framework: "nuxtjs", language: "typescript", orm: "prisma", api_docs: "none" }
database: { primary: "postgresql", cache: "none", migration_tool: "prisma-migrate" }
auth: { method: "session", provider: "lucia" }
container: "docker"
package_manager: "pnpm"
dev_command: "pnpm dev"
test_command: "pnpm vitest run"
lint_command: "pnpm eslint . && pnpm nuxi typecheck"
format_command: "pnpm prettier --write ."
build_command: "pnpm build"
migrate_command: "pnpm prisma migrate dev"
seed_command: "pnpm prisma db seed"
docker_command: "docker compose up -d"
architecture: "modular"
```

### Preset 4: Python FastAPI

```yaml
project_type: "backend"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "fastapi", language: "python", orm: "sqlalchemy", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "alembic" }
auth: { method: "jwt", provider: "custom" }
container: "docker"
package_manager: "uv"
dev_command: "uvicorn app.main:app --reload"
test_command: "pytest -v --cov"
lint_command: "ruff check . && mypy ."
format_command: "ruff format ."
build_command: "docker build -t app ."
migrate_command: "alembic upgrade head"
seed_command: "python -m app.seeds"
docker_command: "docker compose up -d"
architecture: "clean"
```

### Preset 5: Python Django

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "django", language: "python", orm: "django-orm", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "django-migrate" }
auth: { method: "session", provider: "custom" }
container: "docker"
package_manager: "uv"
dev_command: "python manage.py runserver"
test_command: "pytest -v --cov"
lint_command: "ruff check . && mypy ."
format_command: "ruff format ."
build_command: "docker build -t app ."
migrate_command: "python manage.py migrate"
seed_command: "python manage.py loaddata fixtures/*.json"
docker_command: "docker compose up -d"
architecture: "mvc"
```

### Preset 6: Go Gin

```yaml
project_type: "backend"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "gin", language: "go", orm: "gorm", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "goose" }
auth: { method: "jwt", provider: "custom" }
container: "docker"
package_manager: "go-mod"
dev_command: "air"
test_command: "go test ./... -v -cover"
lint_command: "golangci-lint run"
format_command: "gofmt -w ."
build_command: "go build -o bin/app ./cmd/server"
migrate_command: "goose -dir migrations postgres $DB_URL up"
seed_command: "go run ./cmd/seed"
docker_command: "docker compose up -d"
architecture: "clean"
```

### Preset 7: PHP Laravel

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "none", language: "javascript", styling: "tailwind", bundler: "vite" }
backend: { framework: "laravel", language: "php", orm: "eloquent", api_docs: "swagger" }
database: { primary: "mysql", cache: "redis", migration_tool: "artisan" }
auth: { method: "session", provider: "custom" }
container: "docker"
package_manager: "npm"
dev_command: "php artisan serve & npm run dev"
test_command: "php artisan test --parallel"
lint_command: "vendor/bin/phpstan analyse && vendor/bin/pint --test"
format_command: "vendor/bin/pint"
build_command: "npm run build"
migrate_command: "php artisan migrate"
seed_command: "php artisan db:seed"
docker_command: "docker compose up -d"
architecture: "mvc"
```

### Preset 8: SvelteKit Fullstack

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "svelte", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "none" }
backend: { framework: "svelte", language: "typescript", orm: "drizzle", api_docs: "none" }
database: { primary: "sqlite", cache: "none", migration_tool: "drizzle-kit" }
auth: { method: "session", provider: "lucia" }
container: "none"
package_manager: "pnpm"
dev_command: "pnpm dev"
test_command: "pnpm vitest run"
lint_command: "pnpm eslint . && pnpm svelte-check"
format_command: "pnpm prettier --write ."
build_command: "pnpm build"
migrate_command: "pnpm drizzle-kit push"
seed_command: "pnpm tsx scripts/seed.ts"
architecture: "modular"
```

### Preset 9: React Native (Mobile)

```yaml
project_type: "mobile"
api_style: "rest"
frontend: { framework: "react", language: "typescript", styling: "styled-components", bundler: "metro" }
backend: { framework: "none" }
database: { primary: "sqlite", cache: "none" }
auth: { method: "jwt", provider: "custom" }
container: "none"
package_manager: "pnpm"
dev_command: "npx expo start"
test_command: "pnpm jest --passWithNoTests"
lint_command: "pnpm eslint . && pnpm tsc --noEmit"
format_command: "pnpm prettier --write ."
build_command: "npx eas build --platform all"
architecture: "modular"
```

### Preset 10: General (Blank)

All fields empty — fill manually or use auto-detect.

---

## Framework Architecture Guides

Match your `architecture` and `backend.framework` / `frontend.framework` to the correct guide below.

---

### Next.js (App Router) — Modular

```
src/
├── app/                     ← Routes & layouts (framework convention)
│   ├── (auth)/              ← Route groups
│   ├── (dashboard)/
│   ├── api/                 ← API route handlers
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  ← Reusable (Button, Input, Modal)
│   └── features/            ← Feature-specific (UserCard)
├── lib/
│   ├── actions/             ← Server Actions
│   ├── services/            ← Business logic (pure functions)
│   ├── db/                  ← Prisma client, queries
│   └── validators/          ← Zod schemas
├── hooks/
├── types/
└── prisma/
```

**Rules:** `app/` → `components/`, `lib/`, `hooks/` · `lib/services/` NEVER imports `app/` or `components/` · `lib/db/` → `prisma/`, `types/` only

---

### React + Vite — Layered

```
src/
├── pages/                   ← Route-level components
├── components/
│   ├── ui/
│   └── features/
├── services/                ← API calls, business logic
│   ├── api/
│   └── auth/
├── hooks/
├── stores/                  ← State management
├── types/
├── utils/
└── config/
```

**Rules:** `pages/` → everything · `components/` NEVER imports `pages/` · `services/` → no UI imports · `stores/` NEVER imports `components/`

---

### Vue / Nuxt 3 — Modular

```
├── server/
│   ├── api/
│   ├── middleware/
│   └── utils/
├── pages/
├── components/ (ui/ + features/)
├── composables/
├── stores/
├── services/
├── types/
└── prisma/
```

**Rules:** `services/` NEVER imports `pages/` or `components/` · `server/api/` → `server/utils/`, `services/`, `prisma/`

---

### Python FastAPI — Clean Architecture

```
app/
├── domain/                  ← Pure business rules (NO framework imports)
│   ├── entities/
│   ├── repositories/        ← Abstract interfaces (ABC)
│   ├── services/
│   └── exceptions.py
├── application/             ← Use cases
│   ├── use_cases/
│   └── interfaces/
├── infrastructure/          ← Implementations
│   ├── database/            ← SQLAlchemy models, concrete repos
│   ├── external/
│   └── security/
├── api/                     ← FastAPI routers, schemas, deps
│   ├── routes/
│   ├── schemas/
│   └── dependencies/
├── core/ (config, exceptions)
└── main.py
```

**Rules:** `domain/` → NOTHING · `application/` → `domain/` only · `api/` NEVER imports `infrastructure/` · DI wires infra at startup

---

### Python Django — MVC + Service Layer

```
project/
├── apps/<app_name>/
│   ├── models.py
│   ├── views.py             ← HTTP only, no business logic
│   ├── serializers.py
│   ├── services.py          ← ALL business logic here
│   ├── urls.py
│   ├── admin.py
│   ├── tests/
│   └── migrations/
├── core/ (settings/, urls.py, wsgi.py)
└── common/ (mixins, permissions)
```

**Rules:** `views.py` → `services.py` → `models.py` · NEVER put business logic in views · Cross-app imports via `services.py`

---

### Go Gin — Standard Go Layout

```
cmd/server/main.go
internal/
├── handler/                 ← HTTP handlers
│   └── middleware/
├── service/                 ← Business logic
├── repository/              ← Data access
├── model/                   ← Domain structs
├── dto/                     ← Request/Response DTOs
├── config/
└── pkg/                     ← Internal utilities
pkg/                         ← Public shared packages
migrations/
```

**Rules:** `handler/` → `service/`, `dto/` (NEVER `repository/`) · `service/` → `repository/`, `model/` · `model/` → NOTHING

---

### PHP Laravel — MVC + Service Layer

```
app/
├── Http/
│   ├── Controllers/         ← Thin! Only call Services
│   ├── Middleware/
│   ├── Requests/            ← Validation
│   └── Resources/           ← Transformers
├── Models/
├── Services/                ← ALL business logic
├── Repositories/ (optional)
├── Events/, Listeners/, Jobs/, Policies/
routes/ (web.php, api.php)
resources/ (views/, js/, css/)
database/ (migrations/, seeders/)
```

**Rules:** `Controllers/` → `Services/` only · `Controllers/` NEVER contain business logic · `Models/` = relationships, scopes only

---

### SvelteKit — Modular

```
src/
├── routes/
│   ├── (auth)/, (app)/
│   ├── api/
│   └── +layout.svelte
├── lib/
│   ├── components/ (ui/ + features/)
│   ├── server/ (db/, services/, auth/)
│   ├── stores/
│   ├── utils/
│   └── types/
└── drizzle/
```

**Rules:** `lib/server/` NEVER imports `routes/` · `lib/components/` NEVER imports `lib/server/`

---

### React Native (Expo) — Modular

```
src/
├── app/                     ← Expo Router
│   ├── (tabs)/
│   ├── (auth)/
│   └── _layout.tsx
├── components/ (ui/ + features/)
├── services/ (api/ + storage/)
├── hooks/
├── stores/
├── types/
├── constants/
└── assets/
```

**Rules:** `components/` NEVER imports `app/` · `services/` → no UI imports

---

## Universal Security Architecture

Every framework MUST implement these security patterns. Placement follows each framework's architecture guide above.

### Security Headers (All Frameworks)

Every HTTP response should include these headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Framework-specific | Prevent XSS, data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leaks |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |

**Where to implement:**

| Framework | Location |
|-----------|----------|
| Next.js | `next.config.js` → `headers()` or middleware |
| Express | `helmet` middleware in `app.ts` |
| FastAPI | `starlette.middleware` or custom middleware in `main.py` |
| Django | `SECURE_*` settings in `settings.py` + `SecurityMiddleware` |
| Laravel | `App\Http\Middleware` or `config/secure-headers.php` |
| Go Gin | Custom middleware in `internal/handler/middleware/` |
| Nuxt.js | `nuxt.config.ts` → `routeRules` or server middleware |
| SvelteKit | `hooks.server.ts` → `handle` function |

### CORS Configuration

```
ALLOWED: Specific origin whitelist per environment
  - Development: http://localhost:3000
  - Staging: https://staging.example.com
  - Production: https://example.com

FORBIDDEN: Access-Control-Allow-Origin: * (with credentials)
```

**Where to implement:** Same location as security headers — middleware layer.

### Rate Limiting

| Endpoint Type | Recommended Limit | Purpose |
|---------------|-------------------|---------|
| Login / Auth | 5-10 req/min per IP | Prevent brute force |
| Password Reset | 3 req/hour per email | Prevent abuse |
| API (general) | 100-1000 req/min per user | Prevent abuse |
| File Upload | 10 req/min per user | Prevent storage abuse |
| Public endpoints | 30 req/min per IP | Prevent scraping |

**Where to implement:**

| Framework | Package / Location |
|-----------|-------------------|
| Express | `express-rate-limit` middleware |
| FastAPI | `slowapi` or custom middleware |
| Django | `django-ratelimit` decorator |
| Laravel | `throttle` middleware in `routes/api.php` |
| Go Gin | Custom middleware in `internal/handler/middleware/` |
| Next.js | Edge middleware or API route middleware |

### Auth Middleware Placement

```
RULE: Authentication middleware MUST run BEFORE any controller/handler.
RULE: Authorization checks MUST run AFTER authentication.

Flow: Request → Auth Middleware → Authz Check → Controller → Service → Response
```

**Where to implement:**

| Framework | Auth Location | Authz Location |
|-----------|--------------|----------------|
| Next.js | `middleware.ts` (root) | Server Actions / API routes |
| Express | `app.use(authMiddleware)` before routes | Route-level middleware |
| FastAPI | `Depends(get_current_user)` in route | Service layer or dependency |
| Django | `LoginRequiredMixin` / `@login_required` | `@permission_required` / Policies |
| Laravel | `auth` middleware in routes | Policies / Gates |
| Go Gin | `authMiddleware` in router group | Handler-level checks |

### Security Enforcement Checklist

```
□ Security headers configured in middleware layer?
□ CORS restricted to specific origins (not wildcard)?
□ Rate limiting on auth + public endpoints?
□ Auth middleware runs before controllers?
□ Authz checks in place for resource access?
□ Error responses don't leak internals?
□ Secrets accessed via environment variables only?
```

---

## Integration

**This skill is used during:**
- **executing-plans** — Check file placement before writing code
- **code-review** — Verify architecture compliance (violations = P1 Critical)

**This skill pairs with:**
- **project-config rules** — Presets reference this skill for full definitions
- **quality-gates rules** — Universal architecture rules reference this skill for framework specifics
