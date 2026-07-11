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
runtime: { package_manager: "pnpm", container: "docker", deployment: "docker-compose" }
commands:
  dev: "pnpm dev"
  test: "pnpm vitest run"
  lint: "pnpm eslint . && pnpm tsc --noEmit"
  format: "pnpm prettier --write ."
  build: "pnpm build"
  migrate: "pnpm prisma migrate dev"
  seed: "pnpm prisma db seed"
  container_up: "docker compose up -d"
conventions: { architecture: "modular" }
```

### Preset 2: React + Express

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "react", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "shadcn" }
backend: { framework: "express", language: "typescript", orm: "prisma", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "prisma-migrate" }
auth: { method: "jwt", provider: "passport" }
runtime: { package_manager: "pnpm", container: "docker", deployment: "docker-compose" }
commands:
  dev: "pnpm dev"
  test: "pnpm vitest run && pnpm jest --passWithNoTests"
  lint: "pnpm eslint ."
  format: "pnpm prettier --write ."
  build: "pnpm build"
  migrate: "pnpm prisma migrate dev"
  seed: "pnpm prisma db seed"
  container_up: "docker compose up -d"
conventions: { architecture: "layered" }
```

### Preset 3: Vue / Nuxt Fullstack

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "nuxtjs", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "none" }
backend: { framework: "nuxtjs", language: "typescript", orm: "prisma", api_docs: "none" }
database: { primary: "postgresql", cache: "none", migration_tool: "prisma-migrate" }
auth: { method: "session", provider: "lucia" }
runtime: { package_manager: "pnpm", container: "docker", deployment: "docker-compose" }
commands:
  dev: "pnpm dev"
  test: "pnpm vitest run"
  lint: "pnpm eslint . && pnpm nuxi typecheck"
  format: "pnpm prettier --write ."
  build: "pnpm build"
  migrate: "pnpm prisma migrate dev"
  seed: "pnpm prisma db seed"
  container_up: "docker compose up -d"
conventions: { architecture: "modular" }
```

### Preset 4: Python FastAPI

```yaml
project_type: "backend"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "fastapi", language: "python", orm: "sqlalchemy", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "alembic" }
auth: { method: "jwt", provider: "custom" }
runtime: { package_manager: "uv", container: "docker", deployment: "docker-compose" }
commands:
  dev: "uvicorn app.main:app --reload"
  test: "pytest -v --cov"
  lint: "ruff check . && mypy ."
  format: "ruff format ."
  build: "docker build -t app ."
  migrate: "alembic upgrade head"
  seed: "python -m app.seeds"
  container_up: "docker compose up -d"
conventions: { architecture: "clean" }
```

### Preset 5: Python Django

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "django", language: "python", orm: "django-orm", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "django-migrate" }
auth: { method: "session", provider: "custom" }
runtime: { package_manager: "uv", container: "docker", deployment: "docker-compose" }
commands:
  dev: "python manage.py runserver"
  test: "pytest -v --cov"
  lint: "ruff check . && mypy ."
  format: "ruff format ."
  build: "docker build -t app ."
  migrate: "python manage.py migrate"
  seed: "python manage.py loaddata fixtures/*.json"
  container_up: "docker compose up -d"
conventions: { architecture: "mvc" }
```

### Preset 6: Go Gin

```yaml
project_type: "backend"
api_style: "rest"
frontend: { framework: "none" }
backend: { framework: "gin", language: "go", orm: "gorm", api_docs: "swagger" }
database: { primary: "postgresql", cache: "redis", migration_tool: "goose" }
auth: { method: "jwt", provider: "custom" }
runtime: { package_manager: "go-mod", container: "docker", deployment: "docker-compose" }
commands:
  dev: "air"
  test: "go test ./... -v -cover"
  lint: "golangci-lint run"
  format: "gofmt -w ."
  build: "go build -o bin/app ./cmd/server"
  migrate: "goose -dir migrations postgres $DB_URL up"
  seed: "go run ./cmd/seed"
  container_up: "docker compose up -d"
conventions: { architecture: "clean" }
```

### Preset 7: PHP Laravel

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "none", language: "javascript", styling: "tailwind", bundler: "vite" }
backend: { framework: "laravel", language: "php", orm: "eloquent", api_docs: "swagger" }
database: { primary: "mysql", cache: "redis", migration_tool: "artisan" }
auth: { method: "session", provider: "custom" }
runtime: { package_manager: "npm", container: "docker", deployment: "docker-compose" }
commands:
  dev: "php artisan serve & npm run dev"
  test: "php artisan test --parallel"
  lint: "vendor/bin/phpstan analyse && vendor/bin/pint --test"
  format: "vendor/bin/pint"
  build: "npm run build"
  migrate: "php artisan migrate"
  seed: "php artisan db:seed"
  container_up: "docker compose up -d"
conventions: { architecture: "mvc" }
```

### Preset 8: SvelteKit Fullstack

```yaml
project_type: "fullstack"
api_style: "rest"
frontend: { framework: "svelte", language: "typescript", styling: "tailwind", bundler: "vite", component_library: "none" }
backend: { framework: "svelte", language: "typescript", orm: "drizzle", api_docs: "none" }
database: { primary: "sqlite", cache: "none", migration_tool: "drizzle-kit" }
auth: { method: "session", provider: "lucia" }
runtime: { package_manager: "pnpm", container: "none", deployment: "none" }
commands:
  dev: "pnpm dev"
  test: "pnpm vitest run"
  lint: "pnpm eslint . && pnpm svelte-check"
  format: "pnpm prettier --write ."
  build: "pnpm build"
  migrate: "pnpm drizzle-kit push"
  seed: "pnpm tsx scripts/seed.ts"
conventions: { architecture: "modular" }
```

### Preset 9: React Native (Mobile)

```yaml
project_type: "mobile"
api_style: "rest"
frontend: { framework: "react", language: "typescript", styling: "styled-components", bundler: "metro" }
backend: { framework: "none" }
database: { primary: "sqlite", cache: "none" }
auth: { method: "jwt", provider: "custom" }
runtime: { package_manager: "pnpm", container: "none", deployment: "none" }
commands:
  dev: "npx expo start"
  test: "pnpm jest --passWithNoTests"
  lint: "pnpm eslint . && pnpm tsc --noEmit"
  format: "pnpm prettier --write ."
  build: "npx eas build --platform all"
conventions: { architecture: "modular" }
```

### Preset 10: General (Blank)

All fields empty — fill manually or use auto-detect.

---
