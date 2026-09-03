# Learned Knowledge

Confirmed reusable preferences, conventions, and patterns.
Contract: `.agent/skills/state-management/references/file-contracts.md`.
Read the Quick Reference table before starting a task; open a full entry only
when its rule matches the task at hand.

Confidence ladder: 1 observation = `inferred`; 3+ consistent observations =
`observed`; explicit user statement = `confirmed`. Never delete a learning -
mark it `SUPERSEDED by <ref>`. The same correction must never be needed twice.

Caps: 30 entries or ~30 KB. On overflow, move superseded and lowest-confidence
entries to `docs/archive/KNOWLEDGE_ARCHIVE.md`. Archive, never delete.

Promotion: when one category or prevention rule recurs 3+ times at `observed`
or `confirmed`, flag `PATTERN` and route it to `/sc-evolve` for a draft
framework proposal (human-approved).

## Quick Reference

| ID | Scope | Confidence | Action rule (IF-THEN) |
| --- | --- | --- | --- |
<!-- newest first; one row per entry below -->
| LRN-2026-09-03-001 | framework | confirmed | IF a route contract needs tokens THEN add them and re-adopt that route's absolute budget in `token-benchmark.mjs` (measured after + 40); the 90% ratio is reported, not a gate |
| LRN-2026-09-02-002 | framework | confirmed (SUPERSEDED by LRN-2026-09-03-001) | IF a route contract needs tokens THEN trim `.codex/SKILL.md` or rewrite token-neutral |
| LRN-2026-09-02-001 | framework | confirmed | IF wiring a behavior into an sc-* workflow THEN add its spine to the paired contract in the same change and extend the spine test |

---

## LRN-2026-09-02-001 - contract shadowing
- Learning: the contract-first route (`.claude/commands/` then `.agent/context/workflows/`) never loads the full workflow body, so behavior wired only into a workflow never fires.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF wiring a behavior into an sc-* workflow THEN add its spine to the paired contract in the same change and extend the spine test.
- Source: verified experiment (Wave 2 wired six workflows; 0 entries in 13 days; 16 of 18 contracts silent)

## LRN-2026-09-02-002 - shared contract headroom
- Learning: `.codex/SKILL.md` sits in every route's benchmark after-set; each token trimmed there frees one token in all 18 routes.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF a route contract needs tokens THEN trim `.codex/SKILL.md` or rewrite token-neutral; never raise the 90% gate.
- Source: verified experiment (104 to 92 tokens; sc-review margin 1 to 13)
- Status: SUPERSEDED by LRN-2026-09-03-001 (2026-09-03); the ratio gate no longer exists for routes.

## LRN-2026-09-03-001 - absolute route budgets
- Learning: the route gate is an absolute after-token budget (measured after + 40, re-adopted on every deliberate contract change); the 90% reduction against the frozen baseline is reported only. Under the old ratio gate six routes had 0-6 tokens of headroom and no contract could gain a sentence.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF a route contract needs tokens THEN add them and re-adopt that route's absolute budget in `token-benchmark.mjs` (measured after + 40); the 90% ratio is reported, not a gate.
- Source: verified experiment (Wave 4 A: sc-status 224/264, sc-compound 215/255, sc-pause 200/240 after the contract fixes the ratio gate had blocked)

<!-- Entry format (append below, newest last):

## LRN-YYYY-MM-DD-NNN - <learning topic>
- Learning: <confirmed pattern>
- Confidence: confirmed | observed | inferred
- Applies to: <scope: global | project | framework>
- Action rule: IF <condition> THEN <action>
- Source: <user statement | repeated observation | verified experiment>
-->
