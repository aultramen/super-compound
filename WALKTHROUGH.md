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
/sc-plan
/sc-work
/sc-review
/sc-audit
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

## 2. Explore

Run:

```text
/sc-explore analytics dashboard for account admins
```

Use `/sc-explore` when the idea is still fuzzy, strategic, domain-heavy, or needs a lightweight prototype decision.

The agent should:

- Read nearby project context
- Ask one concise question at a time
- Offer 2-3 practical approaches
- Name non-goals
- Capture decisions in `docs/brainstorms/` when useful

Example output shape:

```markdown
# Analytics Dashboard Exploration

## Direction
Build a focused account-admin dashboard around activation, usage, and risk signals.

## Decisions
- Start with account-level metrics, not user-level drilldowns.
- Reuse existing chart components if present.
- Defer export and alerting.

## Recommended Next Step
Run `/sc-prd` to turn this into requirements.
```

## 3. Write A PRD

Run:

```text
/sc-prd analytics dashboard
```

The PRD defines what will be built:

- Problem and target users
- Goals and non-goals
- User stories
- Functional requirements
- UX notes
- Security/privacy considerations
- Success metrics
- Open questions

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

## 4. Plan

Run:

```text
/sc-plan docs/prd/prd-analytics-dashboard.md
```

The plan should:

- Inspect existing code and tests
- Run compatibility/security/privacy pre-flight checks when relevant
- Use `interface-design` for frontend work
- Split work into verifiable vertical slices
- Include exact verification commands
- Document rollback when data or deployment risk exists

Frontend design search example:

```bash
python .agent/skills/interface-design/scripts/search.py "analytics dashboard B2B SaaS" --design-system -p "Analytics Dashboard"
python .agent/skills/interface-design/scripts/search.py "performance trackBy" --stack angular
python .agent/skills/interface-design/scripts/search.py "mobile touch target" --domain app
```

Example task:

```markdown
### Task 3: Render Account Usage Summary

Files:
- Modify: `src/features/accounts/usage-summary.tsx`
- Test: `src/features/accounts/usage-summary.test.tsx`

Steps:
1. Add a failing test for the empty state.
2. Implement the empty state using the existing panel component.
3. Run the targeted test.
4. Verify responsive layout in browser.
```

## 5. Work

Run:

```text
/sc-work docs/plans/2026-06-20-analytics-dashboard-plan.md
```

The agent should execute sequentially by default:

- Mark one task in progress
- Read only relevant files
- Write failing tests for behavior changes
- Implement the smallest cohesive change
- Run targeted verification
- Update durable state for long work

Parallel execution is reserved for independent tasks with non-overlapping files and clear verification.

## 6. Debug

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

## 7. Review

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

## 8. Audit

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

## 9. UI

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

## 10. Pause And Continue

When stopping mid-work:

```text
/sc-pause
```

This creates or updates:

- `docs/STATE.md`
- `.continue-here.md`
- Any active plan/task progress

Next session:

```text
/sc-status
```

The agent should read durable state and route to the next action.

## 11. Compound

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
| Shape fuzzy ideas | `/sc-explore` |
| Gather evidence | `/sc-research` |
| Write requirements | `/sc-prd` |
| Plan implementation | `/sc-plan` |
| Define or run evals | `/sc-eval` |
| Execute plan | `/sc-work` |
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
| issue shaping, triage, task breakdown | `/sc-plan` |
| loop execution, handoff, swarm work | `/sc-work` |
| security, compatibility, MCP, compliance, release readiness | `/sc-audit` |
| progress or resume | `/sc-status` |
| reload | `/sc-init reload` |
| UI design/build | `/sc-ui` |

## Quality Checklist

Before finishing any meaningful work:

- The requested outcome is implemented or the blocker is named.
- Tests or equivalent verification ran.
- Docs changed when user behavior, commands, setup, or architecture changed.
- Stale workflow/skill names were not reintroduced.
- No secrets, cache files, or malformed data were introduced.
- The final response reports changed areas and verification.
