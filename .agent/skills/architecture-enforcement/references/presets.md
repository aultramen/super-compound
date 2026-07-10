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
