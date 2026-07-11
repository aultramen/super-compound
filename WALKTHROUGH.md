# Super Compound Walkthrough

This walkthrough shows the current Super Compound flow after the 2026-06-20 cleanup. It uses the small public workflow surface and avoids legacy aliases.

Every command starts with `/sc-*` so it stays separate from native Claude Code slash commands.

## Scenario

You want to add a usage analytics dashboard to an existing SaaS app.

The ideal path:

```text
/sc-init
/sc-explore analytics dashboard for account admins
/sc-research Can the current event store support tenant-safe daily metrics with 15-minute freshness?  # conditional
/sc-prd
/sc-plan --issues
/sc-go start feature/analytics-dashboard
/sc-work .scratch/analytics-dashboard/issues/01-account-usage-summary.md
/sc-review
/sc-audit
/sc-go commit "Implement analytics dashboard"
/sc-go push
/sc-go pr
/sc-compound
```

For UI-heavy work, start with read-only design/review:

```text
/sc-ui review analytics dashboard for a B2B SaaS admin team
```

## 1. Initialize

Run:

```text
/sc-init
```

What happens:

- Reads project README, package metadata, and framework rules
- Detects stack and verification commands where possible
- Checks existing docs and state files
- Routes the next step

Use `/sc-init reload` when framework files changed and the session needs to refresh its mental model.

## 2. Genius Loop

Run manually when you want proactive improvement ideas:

```text
/sc-geniusloop analytics dashboard
```

`/sc-status` can also recommend `/sc-geniusloop` when `.scratch/*/issues/` has no ready goal issues and there is no active handoff, blocker, or failing verification.

The agent should:

- Benchmark the current system against the user's stated intent
- Generate at least 10 numbered `GL-*` improvement ideas
- Dispatch read-only Brain evaluation through Beta, Alpha, Theta, and Delta filters
- Keep only 1-2 Delta ideas
- Route selected ideas back through `/sc-explore`, `/sc-prd`, `/sc-plan`, `/sc-ui`, `/sc-research`, or `/sc-audit`

`/sc-geniusloop` does not implement code or bypass `BRD -> PRD -> FSD -> GOAL`.

## 3. Explore

Run:

```text
/sc-explore analytics dashboard for account admins
```

Use `/sc-explore` when the idea is still fuzzy, strategic, domain-heavy, or needs a lightweight prototype decision. Its durable output is a BRD under `docs/brd/`.

The agent should:

- Read nearby project context
- Ask one concise question at a time
- Offer 2-3 practical approaches
- Name objectives, constraints, policies, non-goals, and business acceptance
- Capture decisions in `docs/brainstorms/` when useful
- Save a BRD when the work needs durable business authority

Example output shape:

```markdown
# Analytics Dashboard BRD Summary

## Business Direction
Build a focused account-admin dashboard around activation, usage, and risk signals.

## Decisions
- Start with account-level metrics, not user-level drilldowns.
- Reuse existing chart components if present.
- Defer export and alerting.

## Recommended Next Step
Run `/sc-prd` to turn the approved BRD into product requirements.
```

Save the BRD to:

```text
docs/brd/brd-analytics-dashboard.md
```

## 3A. Research (Conditional)

`/sc-research` is not a required ceremony between Explore and PRD. Run it only when one named factual or technical gap could materially change a decision, the available evidence is stale or conflicting, or downstream work needs a durable source trail.

For the analytics dashboard, Explore owns questions such as who the dashboard serves, which outcomes matter, and what freshness promise is acceptable. Research can test whether that promise is feasible:

```text
/sc-research Can the current event store produce tenant-safe daily account metrics with 15-minute freshness at the observed volume?
```

The agent should:

- Name the decision consumer, owner/gate, return workflow, scope, timebox, and freshness requirement.
- Inspect local schemas, queries, retention settings, volume evidence, tests, and prior solution notes first.
- Use current primary documentation only for unresolved vendor, library, API, or version claims.
- Record facts separately from inferences, contradictions, and unknowns.
- Compare only decision-relevant options and state confidence, rejected options, and a refresh trigger.
- Keep the note advisory; do not implement code, install a dependency, or silently change BRD/PRD/FSD authority.

For a non-trivial result, save:

```text
docs/research/2026-07-11-analytics-dashboard-feasibility.md
```

The note follows `.agent/templates/research/Research-Note-Skeleton.md` and contains an evidence register, recommendation, confidence, `OPEN-RESEARCH-*` gaps, and a caller-aware handoff.

Return routing matters:

| Finding | Return route |
|---|---|
| The requested freshness or scope is not feasible and the product promise must change | `/sc-explore`, update and re-approve the BRD |
| The BRD remains valid and evidence constrains observable behavior | `/sc-prd` |
| The PRD is approved and an implementation option needs formal selection | `/sc-plan`; record the accepted choice as FSD `TDEC-*` or an accepted ADR |
| The question is current-stack compatibility, security, compliance, or release severity | `/sc-audit` |
| A concrete query, build, or runtime failure exists | `/sc-debug` |

Other real examples:

- Before a framework upgrade, compare official migration guidance, runtime support, peer constraints, and rollback evidence; return to `/sc-plan` for the authoritative migration sequence.
- Before a payment integration, verify provider webhook retry and idempotency semantics; return to `/sc-prd` for observable failure behavior and `/sc-audit` for replay, secret, PII, and compliance risk.
- After `/sc-geniusloop` proposes replacing a custom queue, research vendor/runtime feasibility only if the user value is already clear; otherwise return to `/sc-explore` first.

## 4. Write A PRD

Run:

```text
/sc-prd analytics dashboard
```

The PRD consumes the approved BRD and defines observable product behavior:

- Problem and target users
- Goals and non-goals
- User stories
- Functional requirements
- UX notes
- Security/privacy considerations
- Success metrics
- Open questions
- Qualified BRD references

Save it to:

```text
docs/prd/prd-analytics-dashboard.md
```

Good acceptance criteria are observable:

```markdown
- [ ] Admins can view account-level active users for the selected date range.
- [ ] Empty states appear when no usage data exists.
- [ ] Chart data is not visible to users outside the account.
- [ ] Dashboard works at desktop and mobile breakpoints.
```

## 5. Plan

Run:

```text
/sc-plan docs/prd/prd-analytics-dashboard.md
```

`/sc-plan` creates the FSD and slices FSD goals into lightweight issue pointers. The FSD should:

- Inspect existing code and tests
- Run compatibility/security/privacy pre-flight checks when relevant
- Use `interface-design` for frontend work
- Decide ADR applicability
- Capture local technical decisions as FSD `TDEC-*`
- Link only accepted ADRs under `docs/solutions/adr-####-<slug>.md` when ADR criteria are met
- Split work into verifiable `GOAL-*` packets
- Use `issue-workflow` for Journey/Kanban/goal issue pointer requests
- Include exact verification commands
- Document rollback when data or deployment risk exists

Frontend design search example:

```bash
python .agent/skills/interface-design/scripts/search.py "analytics dashboard B2B SaaS" --design-system -p "Analytics Dashboard"
python .agent/skills/interface-design/scripts/search.py "performance trackBy" --stack angular
python .agent/skills/interface-design/scripts/search.py "mobile touch target" --domain app
```

Example FSD goal:

```markdown
### GOAL-003 - Render Account Usage Summary

Objective: Admins can see account usage summary for the selected date range.
Requirement refs: PRD-ANALYTICS#FR-003, PRD-ANALYTICS#AC-004
Technical refs: FSD-ANALYTICS#TDEC-001
Verification refs: FSD-ANALYTICS#TEST-003
```

For a local Journey board, run:

```text
/sc-plan --issues docs/prd/prd-analytics-dashboard.md
```

This should review the proposed FSD goals with you, then create:

```text
.scratch/analytics-dashboard/
  FSD.md
  issues/
    01-account-usage-summary.md
    02-dashboard-empty-state.md
```

Each issue includes `Status`, `Parent FSD`, `Goal ID`, `Blocked by`, qualified upstream refs, technical refs, optional ADR refs, verification refs, stop conditions, and comments. It must not copy BRD, PRD, FSD, or ADR paragraphs. `Blocked by` links form an acyclic dependency graph so ready goals can be picked up in parallel.

## 6. Git Start

Before editing, preview the branch workflow:

```text
/sc-go start feature/analytics-dashboard
```

The standard preview is:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/analytics-dashboard
```

Use worktrees only when parallel agents or multi-branch review need isolated folders:

```text
/sc-go worktree feature/analytics-dashboard --path ../analytics-dashboard
```

## 7. Work

Run:

```text
/sc-work .scratch/analytics-dashboard/issues/01-account-usage-summary.md
```

Or execute a direct FSD goal:

```text
/sc-work docs/fsd/fsd-analytics-dashboard.md#GOAL-001
```

The agent should execute sequentially by default:

- Mark one goal in progress
- Respect `Blocked by` before starting issue files
- Use `context-engineering` to read only the issue pointer, referenced FSD sections, upstream BRD/PRD IDs, linked accepted ADRs, and relevant files
- Search symbols, paths, tests, and nearby implementations before declaring anything missing
- Stop with `OPEN-*` instead of inventing missing schema, APIs, authorization, workflows, roles, states, or UI behavior
- Write failing tests for behavior changes
- Implement the smallest cohesive change
- Run targeted verification
- Mark issue status when work came from `.scratch/`
- Update durable state for long work

Parallel execution is reserved for independent FSD goals with non-overlapping files and clear verification. For multi-agent runs, create file-backed handoffs instead of pasting briefs and diffs through chat:

```bash
node .agent/tools/work-package.mjs create --run analytics --goal GOAL-001 --brief .scratch/analytics-dashboard/issues/01-account-usage-summary.md --paths-file .scratch/analytics-dashboard/issues/GOAL-001-scope.json
```

Before dispatch, the scheduler writes the scope JSON, for example
`["src/usage.ts", "tests/usage.test.ts"]`. `create` seals that allowlist into
`review-paths.json`; the implementer must not edit it. Parallel goals require
isolated worktrees/workspaces, and review rejects scope changes or new edits
outside the scheduler-owned allowlist.

```bash
node .agent/tools/work-package.mjs review --run analytics --goal GOAL-001 --base HEAD
node .agent/tools/work-package.mjs record --run analytics --goal GOAL-001 --status verified --verification "targeted tests pass"
```

Implementers return the package/report paths. A reviewer reads the package once and writes separate spec-compliance and code-quality verdicts; full evidence remains on disk.

## 8. Debug

If something fails, run:

```text
/sc-debug <symptom or failing command>
```

Debugging should:

- Reproduce the failure with a tight loop
- Isolate the layer where correct data becomes incorrect
- Form falsifiable hypotheses
- Fix the root cause, not the symptom
- Add or update a regression test

Do not patch blindly.

## 9. Review

Run:

```text
/sc-review
```

Review focuses on findings first:

- Behavioral bugs
- Missing tests
- Contract breaks
- Security/privacy issues
- Architecture drift
- UI accessibility or responsiveness gaps

Findings should include file and line references when possible.

## 10. Audit

Run:

```text
/sc-audit
```

Use `/sc-audit` for:

- Security review
- Dependency and runtime compatibility
- Privacy and data handling
- MCP/tool/agent configuration
- Compliance evidence
- Release readiness

Specific routes are allowed:

```text
/sc-audit security
/sc-audit compat
/sc-audit privacy
/sc-audit release
```

Audit mode is always read-only. If the user approves remediation, leave audit
and route the finding to its owner: `/sc-debug` for a reproduced defect,
`/sc-plan` for an authority or design change, or `/sc-work` for an approved fix
goal.

## 11. Git Finish

After verification, review the finish workflow:

```text
/sc-go commit "Implement analytics dashboard"
/sc-go push
/sc-go pr
```

The preview includes `git status`, `git diff`, a sensitive-file warning before `git add .`, first push with `git push -u origin <branch>`, and the Pull Request template.

## 12. UI

Run:

```text
/sc-ui review analytics dashboard for B2B SaaS
```

The UI workflow uses `interface-design`, not the old UI skill name. It stays
read-only until an approved FSD goal hands implementation to `/sc-work`.

It should:

- Reuse an existing design system when present
- Search domain/style/typography/stack guidance
- Design/review the actual requested product UI, not a marketing page;
  implementation remains owned by `/sc-work`
- Verify responsive behavior, accessibility, and text fit
- Keep UI copy domain-specific and concise

Useful searches:

```bash
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
python .agent/skills/interface-design/scripts/search.py "neo brutalism mobile" --domain style
python .agent/skills/interface-design/scripts/search.py "bauhaus geometric" --domain typography
```

## 13. Pause And Continue

When stopping mid-work:

```text
/sc-pause
```

For non-trivial work this updates canonical `docs/STATE.md` with the current
position, exact next action, decisions, blockers/owners, completed outcomes,
verification, branch/workspace state, and authoritative artifact links. It
writes `.continue-here.md` only as a short pointer to that state and the next
route. `docs/progress.md` remains chronological; pause never rewrites active
FSD/goal authority.

Next session:

```text
/sc-status
```

The agent should read durable state and route to the next action.

## 14. Compound

Run:

```text
/sc-compound
```

Use this after solving something reusable:

- Non-obvious bug root cause
- Reliable integration pattern
- New architecture convention
- Security/privacy lesson
- Verification recipe

Save concise knowledge under `docs/solutions/` or related project docs.

## Current Workflow Map

| Need | Workflow |
|---|---|
| Initialize or reload | `/sc-init` |
| Resume from disk state | `/sc-status` |
| Generate proactive improvement ideas | `/sc-geniusloop` |
| Shape fuzzy ideas | `/sc-explore` |
| Answer a named factual or technical decision question with advisory evidence | `/sc-research` |
| Write PRD product requirements | `/sc-prd` |
| Create FSD and goal issue pointers | `/sc-plan` |
| Define or run evals | `/sc-eval` |
| Branch, worktree, commit, push, or PR | `/sc-go` |
| Execute FSD goal | `/sc-work` |
| Fix failures | `/sc-debug` |
| Review changes | `/sc-review` |
| Audit risk/readiness | `/sc-audit` |
| Capture learnings | `/sc-compound` |
| Save handoff | `/sc-pause` |
| Start lifecycle | `/sc-launch` |
| Design/review interface | `/sc-ui` |
| Implement approved interface goal | `/sc-work <approved-goal>` |

## Removed Routes

The cleanup intentionally removed alias and thin workflows.

Use these replacements:

| Old Intent | New Route |
|---|---|
| brainstorm, discuss, domain, strategy, prototype | `/sc-explore` |
| issue shaping, triage, Kanban, Journey, task breakdown | `/sc-plan` |
| loop execution, handoff, swarm work | `/sc-work` |
| branch, worktree, commit, push, PR | `/sc-go` |
| security, compatibility, MCP, compliance, release readiness | `/sc-audit` |
| progress or resume | `/sc-status` |
| reload | `/sc-init reload` |
| UI design/review | `/sc-ui` |
| UI implementation | `/sc-work <approved-goal>` |

## Quality Checklist

For framework maintenance, the token benchmark emits 51 static evidence cells:
input context reduction, process contract/authority wiring, and output
sink/budget/next-owner coverage for every public workflow. All route reductions
must exceed 90%. This does not measure hidden reasoning, generated response
tokens, latency, or billing; those remain unknown without paired host traces.

Before finishing any meaningful work:

- The requested outcome is implemented or the blocker is named.
- Tests or equivalent verification ran.
- Branch, commit, push, and PR operations used `/sc-go` when requested.
- Docs changed when user behavior, commands, setup, or architecture changed.
- Stale workflow/skill names were not reintroduced.
- No secrets, cache files, or malformed data were introduced.
- The final response reports changed areas and verification.
