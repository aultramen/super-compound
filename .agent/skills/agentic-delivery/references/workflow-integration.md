## Workflow Integration

- `/sc-explore`: use `brainstorming` and this skill; output BRD or isolated throwaway decision evidence, then route to `/sc-prd`.
- `/sc-prd`: use `prd-generator` and this skill; create a PRD draft. UI-bearing drafts route through read-only `/sc-ui` validation before PRD approval and `/sc-plan`.
- `/sc-ui`: return evidence or a classified change route; accepted decisions must be absorbed by the owning PRD or FSD.
- `/sc-plan`: use `writing-plans`, `issue-workflow`, `plan-verification`, and this skill; consume the approved PRD, prove UI/API readiness, and output FSD plus contract-enabler/first-slice/scale-out pointers where applicable.
- `/sc-work`: use `executing-plans`, `context-engineering`, `test-driven-development`, `integration-checking`, and `verification-before-completion`; execute only referenced approved FSD goals and prove a real first slice before scale-out.

## Delivery Tier At Intake

`delivery_mode` in `.agent/rules/project-config.md` is `auto` unless a project
pins `light` or `full`. Under `auto`, classify every request before any read
fan-out and state one line: `Tier: light|full; trigger: T<n>|none`. The tier
only rises; intake decides, it never asks.

| Trigger | `full` when | Owner |
|---|---|---|
| T1 | New product capability or user-visible behavior with no approved PRD/FSD covering it (check `docs/prd/`, `docs/fsd/`, `knowledge-search`) | `/sc-explore` without a BRD, else `/sc-prd` -> `/sc-plan` |
| T2 | Contract surfaces: data model, schema, migrations, public API or wire shape, auth, permissions, roles, billing, payments, PII, external integrations | `/sc-plan` (data/API) or `/sc-prd` (behavior) |
| T3 | New interactive surface: a new screen, page, or user flow, not a change inside an existing screen | `/sc-ui` validation, then `/sc-plan`; the UI contract readiness lifecycle applies |
| T4 | Multi-session or multi-stream work: issue board, parallel worktrees, handoff between sessions | `/sc-plan` goal pointers |
| T5 | The user asks for BRD/PRD/FSD, or the project pins `delivery_mode: full` | full path |

Everything else is `light`: bug fixes, refactors, config, copy or style inside an
existing screen, one-module features with existing tests. A single trivial
change is done directly, with `tdd_mode` and verification still applying. When a
trigger appears mid-work, stop, write `ESCALATE: T<n>`, hand the trigger to its
owner, and continue in the higher tier; never step down mid-work. `/sc-go`
previews and `/sc-review` warn when touched paths match T2 patterns.
