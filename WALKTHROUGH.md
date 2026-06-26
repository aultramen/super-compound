# Super Compound Walkthrough

This walkthrough shows the current Super Compound flow after the 2026-06-20 cleanup. It uses the small public workflow surface and avoids legacy aliases.

Every command starts with `/sc-*` so it stays separate from native Claude Code slash commands.

## Scenario

You want to add a usage analytics dashboard to an existing SaaS app.

The ideal path:

```text
/sc-init
/sc-explore analytics dashboard for account admins
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

For UI-heavy work, add:

```text
/sc-ui analytics dashboard for a B2B SaaS admin team
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
- Stop with `OPEN-*` instead of inventing missing schema, APIs, authorization, workflows, roles, states, or UI behavior
- Write failing tests for behavior changes
- Implement the smallest cohesive change
- Run targeted verification
- Mark issue status when work came from `.scratch/`
- Update durable state for long work

Parallel execution is reserved for independent FSD goals with non-overlapping files and clear verification.

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

Audit mode is read-only unless the user asks for fixes.

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
/sc-ui analytics dashboard for B2B SaaS
```

The UI workflow uses `interface-design`, not the old UI skill name.

It should:

- Reuse an existing design system when present
- Search domain/style/typography/stack guidance
- Build the actual requested UI, not a marketing page
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

This creates or updates:

- `docs/STATE.md`
- `.continue-here.md`
- Any active FSD/goal progress

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
| Gather evidence | `/sc-research` |
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
| Build interface | `/sc-ui` |

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
| UI design/build | `/sc-ui` |

## Quality Checklist

Before finishing any meaningful work:

- The requested outcome is implemented or the blocker is named.
- Tests or equivalent verification ran.
- Branch, commit, push, and PR operations used `/sc-go` when requested.
- Docs changed when user behavior, commands, setup, or architecture changed.
- Stale workflow/skill names were not reintroduced.
- No secrets, cache files, or malformed data were introduced.
- The final response reports changed areas and verification.
