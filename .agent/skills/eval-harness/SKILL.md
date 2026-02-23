---
name: eval-harness
description: Eval-Driven Development (EDD) framework. Use BEFORE implementing features to define pass/fail criteria, and AFTER implementation to measure AI reliability with pass@k metrics. Prevents "it works on my machine" syndrome in AI-assisted development.
---

# Eval Harness

A formal evaluation framework implementing **Eval-Driven Development (EDD)** — the discipline of defining measurable success criteria *before* writing code, then verifying them after.

**Core Idea:** Treat evals as the "unit tests of AI development." If you can't measure whether something works, you can't trust that it does.

**Announce:** "I'm applying the eval-harness skill to define success criteria."

---

## When to Activate

| Trigger | Action |
|---------|--------|
| Starting a non-trivial feature | Define evals FIRST |
| AI delivers a result you can't verify | Create a code-based grader |
| This feature was broken before | Add regression eval |
| Prompts/agents were modified | Benchmark pass@k before and after |
| Before shipping to production | Run full eval suite |

---

## EDD Workflow

```
1. DEFINE  → Write eval definition before coding
2. IMPLEMENT → Write code to pass the evals
3. EVALUATE → Run graders, record PASS/FAIL
4. REPORT  → Document results with pass@k metrics
```

---

## Eval Types

### Capability Evals
*"Can the implementation do this?"*

```markdown
[CAPABILITY EVAL: feature-name]
Task: [What Claude/the code should accomplish]
Success Criteria:
  - [ ] Criterion 1 (specific, measurable)
  - [ ] Criterion 2
  - [ ] Criterion 3
Expected Output: [Description of expected result]
```

### Regression Evals
*"Did we break something that was working?"*

```markdown
[REGRESSION EVAL: feature-name]
Baseline: [git SHA or checkpoint name]
Tests:
  - existing-test-1: PASS/FAIL
  - existing-test-2: PASS/FAIL
Result: X/Y passed (previously Y/Y)
```

---

## Grader Types

### 1. Code-Based Grader (Preferred — Deterministic)

```bash
# Check if function exists
grep -q "export function validateEmail" src/auth/validators.ts && echo "PASS" || echo "FAIL"

# Check if tests pass
npm test -- --testPathPattern="auth" && echo "PASS" || echo "FAIL"

# Check if build succeeds
npm run build && echo "PASS" || echo "FAIL"

# Check endpoint exists and returns correct status
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200" && echo "PASS" || echo "FAIL"
```

### 2. LLM-as-Judge Grader (Open-Ended Evaluation)

```markdown
[LLM GRADER PROMPT]
Evaluate the following implementation:
1. Does it solve the stated problem without side effects?
2. Is the code structure clean and maintainable?
3. Are edge cases handled appropriately?
4. Is error handling complete?

Score: 1–5 (1=failing, 3=acceptable, 5=excellent)
Reasoning: [explanation]
Pass threshold: ≥ 4
```

### 3. Human Review Gate

```markdown
[HUMAN REVIEW REQUIRED]
Change: [Description of change]
Reason: [Why a human must review this — security decision, UX judgment, legal requirement]
Risk Level: LOW | MEDIUM | HIGH
Deadline: [When review is needed by]
```

---

## Pass@k Metrics

| Metric | Meaning | Target |
|--------|---------|--------|
| **pass@1** | First attempt success rate | ≥ 70% for standard features |
| **pass@3** | Success within 3 attempts | ≥ 90% |
| **pass^3** | ALL 3 consecutive attempts pass | 100% for critical paths |

**When to measure:**

- `pass@1` — track for each eval, gives baseline reliability
- `pass@3` — report after 3 independent runs (important for AI-generated code)
- `pass^3` — required for: auth flows, payment, data migrations

---

## Eval Definition Template

Store at `.agent/evals/<feature-name>.md`:

```markdown
# Eval: [feature-name]

**Date Defined:** YYYY-MM-DD
**Feature:** [Brief description]
**Author:** [Who defined this]

## Capability Evals

| # | Eval | Grader Type | Pass Criteria |
|---|------|-------------|---------------|
| 1 | Can create user account | Code (npm test) | Tests pass |
| 2 | Validates email format | Code (grep) | Validator function exists |
| 3 | Rejects weak passwords | Code (npm test) | Rejection tests pass |

## Regression Evals

| # | Eval | Baseline |
|---|------|----------|
| 1 | Login still works | SHA: abc123 |
| 2 | Session management intact | SHA: abc123 |

## Success Definition

pass@3 ≥ 90% for capability evals
pass^3 = 100% for regression evals
```

---

## Eval Report Format

```markdown
## Eval Report: [feature-name]
**Date:** YYYY-MM-DD
**Attempts:** N

### Capability Evals

| Eval | Attempt 1 | Attempt 2 | Attempt 3 | pass@k |
|------|-----------|-----------|-----------|--------|
| Create user | ✅ PASS | ✅ PASS | ✅ PASS | pass@1 |
| Validate email | ❌ FAIL | ✅ PASS | ✅ PASS | pass@3 |
| Reject weak pw | ✅ PASS | ✅ PASS | ✅ PASS | pass@1 |

**Capability pass@1:** 67% (2/3)
**Capability pass@3:** 100% (3/3) ✅

### Regression Evals

| Eval | Status |
|------|--------|
| Login flow | ✅ PASS |
| Session management | ✅ PASS |

**Regression pass^3:** 100% ✅

### Verdict: APPROVED — Ready for review
```

---

## Integration with Super-Compound

| Super-Compound Skill | Eval Harness Role |
|---------------------|------------------|
| `writing-plans` | Define evals during planning phase |
| `verification-before-completion` | Run eval suite before claiming done |
| `test-driven-development` | Evals = high-level TDD for AI outputs |
| `code-review` | Use eval results to inform review |
| `knowledge-compounding` | Record eval failures as learnable patterns |

---

## Quick Reference

```
Before coding:  Define capability + regression evals
During coding:  Run code-based graders continuously
After coding:   Run full eval suite, calculate pass@k
Before merge:   pass@3 ≥ 90% for capability, pass^3 for regressions
```

---

## Storage Structure

```
.agent/
  evals/
    <feature>.md       ← Eval definition
    <feature>.log      ← Run history
    baseline.sha       ← Regression baseline commit
docs/
  eval-results/
    <feature>-YYYYMMDD.md  ← Archived results
```
