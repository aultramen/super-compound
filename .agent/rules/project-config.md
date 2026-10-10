# Project Configuration

## Summary

Stack hints, commands and conventions; Git uses `gitWorkflow.branchPrefixes`.
Keep `conventions.branch_prefix` within it. Empty hints allow detection.

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
  approval_mode: "exception"  # exception | stage (opt-in); preserve existing preferences
  architecture: ""            # clean | mvc | hexagonal | layered | modular
  branch_prefix: "feature"
  default_branch: "main"
  commit_convention: "conventional"
  tdd_mode: "balanced"        # strict | balanced | relaxed
  delivery_mode: "auto"       # auto | light | full; auto applies the tier triggers in agentic-delivery/references/workflow-integration.md
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

`SC_GLOBAL_KNOWLEDGE_DIR=<dir>` lets `knowledge-search.mjs` read
`<dir>/LEARNED_KNOWLEDGE.md`; unset: repository-local.

## Adopted Standards

Absent/disabled: legacy conventions, no organization compliance.

```json super-compound-standards
{"schema":"project_standards_v1","enabled":false}
```

Activation/owner review: `.agent/standards/adoption.md`.
Resolution: `.agent/context/standards.contract.md`; preserve user settings.

## Presets

Adapt starting points to the project.

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

Folder guidance: `.agent/skills/architecture-enforcement/SKILL.md`.
