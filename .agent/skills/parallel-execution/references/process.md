## The Process

### Phase 1: Independence Analysis

For each pair of tasks or issue files, check:

```
Task A files ∩ Task B files = ∅  →  Independent ✅
Task A files ∩ Task B files ≠ ∅  →  Sequential ❌
```

**Build dependency graph:**
```
Task 1: src/auth/* → Independent group A
Task 2: src/auth/* → Sequential with Task 1 (shared files)
Task 3: src/api/*  → Independent group B
Task 4: src/ui/*   → Independent group C
Task 5: src/api/*  → Sequential with Task 3 (shared files)
```

**Result:** Parallel groups = {[1,2], [3,5], [4]} → Run 3 parallel streams.

For issue boards, schedule only issues whose `Blocked by` entries are `None` or
whose dependencies are already `verified`; `done` is not sufficient.

File separation alone is insufficient. Also compare pinned contract version,
producer/consumer ordering, schema and fixture ownership, generated artifacts,
migrations, lockfiles, and registries. UI scale-out starts only after the first vertical slice issue is `verified`; each shared surface has a single writer.

### Phase 2: Preview Worktrees

For each parallel group, preview an isolated worktree:

```bash
git fetch origin
git worktree add -b feature/group-a ../project-group-a origin/main
git worktree add -b feature/group-b ../project-group-b origin/main
git worktree add -b feature/group-c ../project-group-c origin/main
```

**Rules:**
- Each worktree gets its own branch
- Every parallel stream uses its own isolated worktree
- Install dependencies in each worktree if needed
- Never modify the main worktree during parallel work
- Do not remove worktrees without validating the target path and asking for approval

### Phase 3: Dispatch Agents

Send each group to a separate agent:

```markdown
## Workspace: ../project-group-a
## Tasks: [1, 2] (sequential within group)
## Branch: feature/group-a
## Contract version: <pinned version>
## Contract/fixture/integration refs: <qualified IDs>
## Single-writer boundaries: <paths or None>

Execute tasks 1 and 2 sequentially in this workspace.
Follow subagent-orchestration for each task.
Route commit, push, and PR preparation through /sc-go after each accepted task when commits are requested.
```

### Phase 4: Integrate Back

After all agents complete:

```bash
git status
git diff
git push -u origin feature/group-a
git push -u origin feature/group-b
git push -u origin feature/group-c
```

Open PRs for completed branches unless the FSD states a different integration strategy. If local merge, rebase, or worktree cleanup is required, preview commands first and run full verification after resolution.

**If merge conflicts:**
1. Resolve conflicts manually
2. Run full test suite after resolution
3. Never auto-resolve — conflicts mean independence analysis was wrong

### Phase 5: Integration Verification

After merging all groups:
- Run full test suite
- Use `verification-before-completion` integration checking
- Verify cross-component wiring
- Run contract diff and fixture/schema validation
- Run provider and consumer contract tests against the pinned revision
- Run real merged-system integration verification; mock-only is insufficient
