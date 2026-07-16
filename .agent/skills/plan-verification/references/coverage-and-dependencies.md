## The 10 Verification Dimensions

### 1. Requirement Coverage

For each BRD/PRD requirement or acceptance criterion:

- Is there at least one FSD requirement, test, and goal issue pointer that addresses it?
- If missing, flag: `Requirement <X> has no corresponding FSD goal`.

### 2. Task Completeness

For each FSD goal or issue pointer:

- Does it have a clear action?
- Does it have a verification step?
- Does it have done criteria?
- If missing, flag: `Goal <X> missing action/verify/done`.

### 3. Dependency Correctness

For each goal or issue with dependencies:

- Do dependencies actually exist in the FSD, ledger, or issue board?
- Do dependencies come before dependents?
- Are there circular dependencies?
- If using issue files, do `Blocked by` paths exist and form a DAG?
- If invalid, flag: `Goal <X> depends on <Y> which does not exist, comes after, or creates a cycle`.
