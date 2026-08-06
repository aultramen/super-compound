# Project Configuration

This Markdown file is human guidance for project hints. The machine authority for Loop Runtime policy is `.agent/context/project-config.json`; values here cannot authorize execution or loosen its ceilings.

Customize this guide per project. Leave discovery hints empty only when auto-detection is acceptable; an empty hint is not an unlimited runtime value. See `docs/loop-runtime-v2.md`.

```yaml
project_name: ""
project_type: ""              # fullstack | backend | frontend | cli | library | mobile
monorepo: false
api_style: ""                 # rest | graphql | grpc | trpc

frontend:
  framework: ""               # react | nextjs | vue | nuxtjs | svelte | angular | none
  language: ""                # typescript | javascript
  styling: ""                 # tailwind | css-modules | styled-components | vanilla-css
  bundler: ""                 # vite | turbopack | metro | framework-default | none
  component_library: ""       # shadcn | radix | mui | antd | none

backend:
  framework: ""               # fastapi | django | express | nestjs | laravel | gin | none
  language: ""                # python | typescript | go | php | rust | java
  orm: ""                     # prisma | sqlalchemy | typeorm | eloquent | drizzle | gorm
  api_docs: ""                # swagger | openapi | none

database:
  primary: ""                 # postgresql | mysql | sqlite | mongodb
  cache: ""                   # redis | none
  migration_tool: ""          # prisma-migrate | alembic | knex | artisan | goose | none

auth:
  method: ""                  # session | jwt | oauth | passkey | none
  provider: ""                # project-selected provider | custom | none

runtime:
  package_manager: ""         # npm | pnpm | yarn | pip | poetry | uv | cargo | go-mod
  container: ""               # docker | podman | none
  deployment: ""              # docker-compose | kubernetes | vercel | none

commands:
  dev: ""
  test: ""
  lint: ""
  format: ""
  build: ""
  migrate: ""
  seed: ""
  container_up: ""

conventions:
  architecture: ""            # clean | mvc | hexagonal | layered | modular
  branch_prefix: "feat"
  default_branch: "main"
  commit_convention: "conventional"
  tdd_mode: "balanced"        # strict | balanced | relaxed
  default_execution: "sequential"

gitWorkflow:
  enabled: true
  defaultBaseBranch: "main"
  remote: "origin"
  requireCleanWorkingTree: true
  useFastForwardOnly: true
  allowWorktree: true
  branchPrefixes:
    - feature
    - fix
    - hotfix
    - refactor
    - docs
    - chore
  protectMainBranch: true
  warnBeforeGitAddAll: true
  previewFirst: true

design_system:
  master_path: "design-system/<project-slug>/MASTER.md"
  page_overrides_path: "design-system/<project-slug>/pages/"
```

## Presets

Use presets as starting points, then adapt to the actual project.

| # | Preset | Stack | Architecture |
|---|--------|-------|--------------|
| 1 | Next.js Fullstack | TypeScript + Tailwind + Prisma + PostgreSQL | Modular |
| 2 | React + Express | TypeScript + Vite + Prisma + PostgreSQL | Layered |
| 3 | Vue / Nuxt | TypeScript + Tailwind + PostgreSQL | Modular |
| 4 | Python FastAPI | SQLAlchemy + PostgreSQL | Clean |
| 5 | Python Django | Django ORM + PostgreSQL | MVC + Service |
| 6 | Go Gin | GORM + PostgreSQL | Standard Go |
| 7 | PHP Laravel | Eloquent + MySQL | MVC + Service |
| 8 | SvelteKit | Drizzle + SQLite | Modular |
| 9 | React Native | Expo + SQLite | Modular |
| 10 | General Blank | Empty template | Project-defined |

See `.agent/skills/architecture-enforcement/SKILL.md` for folder guidance.
