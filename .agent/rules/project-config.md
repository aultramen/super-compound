# Project Configuration

Customize for each project. **Leave fields empty to enable auto-detect.**

```yaml
# ═══ IDENTITY ═══
project_name: ""
project_type: ""              # fullstack | backend | frontend | cli | library | mobile
monorepo: false
api_style: ""                 # rest | graphql | grpc | trpc

# ═══ FRONTEND ═══
frontend:
  framework: ""               # react | vue | svelte | nextjs | nuxtjs | angular | none
  language: ""                 # typescript | javascript
  styling: ""                  # tailwind | css-modules | styled-components | vanilla-css
  bundler: ""                  # vite | webpack | turbopack
  component_library: ""       # shadcn | radix | mui | antd | none

# ═══ BACKEND ═══
backend:
  framework: ""               # fastapi | django | express | nestjs | laravel | gin | none
  language: ""                 # python | typescript | go | php | rust | java
  orm: ""                      # prisma | sqlalchemy | typeorm | eloquent | drizzle | gorm
  api_docs: ""                 # swagger | redoc | auto | none

# ═══ DATABASE ═══
database:
  primary: ""                  # postgresql | mysql | sqlite | mongodb
  cache: ""                    # redis | none
  migration_tool: ""           # prisma-migrate | alembic | knex | artisan | goose | none

# ═══ AUTH ═══
auth:
  method: ""                   # jwt | session | oauth2 | none
  provider: ""                 # custom | better-auth | lucia | passport | none

# ═══ INFRASTRUCTURE ═══
container: ""                  # docker | podman | none
package_manager: ""            # npm | pnpm | yarn | pip | poetry | uv | cargo | go-mod
deployment: ""                 # docker-compose | kubernetes | none
ci_cd: ""                      # github-actions | gitlab-ci | jenkins | none

# ═══ COMMANDS ═══
dev_command: ""
test_command: ""
lint_command: ""
format_command: ""
build_command: ""
migrate_command: ""
seed_command: ""
docker_command: ""

# ═══ CONVENTIONS ═══
architecture: ""               # clean | mvc | hexagonal | layered | modular
branch_prefix: "feat"
env_management: ".env"

# ═══ Super Compound BEHAVIOR ═══
git_workflow: "branch"         # "branch" | "worktree" | "none"
default_branch: "main"
commit_convention: "conventional"
tdd_mode: "balanced"           # "strict" | "balanced" | "relaxed"
default_execution: "sequential"
```

## Presets

To quick-start, replace the config above with a preset. See `.agent/skills/architecture-enforcement/SKILL.md` for the full preset definitions plus matching folder structure guides.

| # | Preset | Stack | Architecture |
|---|--------|-------|-------------|
| 1 | Next.js Fullstack | TS + Tailwind + Shadcn + Prisma + PostgreSQL | Modular |
| 2 | React + Express | TS + Vite + Prisma + PostgreSQL + Redis | Layered |
| 3 | Vue / Nuxt | TS + Tailwind + Prisma + PostgreSQL | Modular |
| 4 | Python FastAPI | SQLAlchemy + PostgreSQL + Redis | Clean |
| 5 | Python Django | Django ORM + PostgreSQL + Redis | MVC + Service |
| 6 | Go Gin | GORM + PostgreSQL + Redis | Standard Go |
| 7 | PHP Laravel | Eloquent + MySQL + Redis | MVC + Service |
| 8 | SvelteKit | Drizzle + SQLite + Lucia | Modular |
| 9 | React Native | Expo + SQLite | Modular |
| 10 | General Blank | Empty template | — |

## Auto-Detect

**When config fields are empty, activate smart suggestion mode.**

```
BEFORE starting ANY development work:
1. CHECK   — Are critical fields empty? (project_type, frontend, backend)
2. ANALYZE — Analyze user's request and requirements
3. SUGGEST — Recommend optimal stack based on criteria below
4. CONFIRM — Present suggestion and WAIT for approval
5. APPLY   — Only proceed after user confirms
```

**NEVER start development with empty config. ALWAYS suggest and confirm first.**

### Decision Tree

```
"Build a [description]"
  ├─ Web app with UI?
  │   ├─ Simple/Content     → SvelteKit (Preset 8)
  │   ├─ Dashboard/SaaS     → Next.js (Preset 1)
  │   ├─ E-commerce/Complex → React + Express (Preset 2)
  │   └─ Admin panel        → Django (Preset 5)
  ├─ API/Backend only?
  │   ├─ High performance   → Go Gin (Preset 6)
  │   ├─ Data/ML heavy      → FastAPI (Preset 4)
  │   └─ CRUD/Rapid dev     → Laravel (Preset 7)
  ├─ Mobile? → React Native (Preset 9)
  └─ CLI/Library? → Match ecosystem (Python/Node/Go)
```

### Evaluation Criteria

| Criterion | Weight |
|-----------|--------|
| Performance | High |
| Security | High |
| Developer Experience | High |
| Type Safety | Medium |
| Ecosystem | Medium |
| Scalability | Medium |
| Deployment Simplicity | Low |
