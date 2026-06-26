# Super Compound Runtime Routing Index

Use this file as the compact first stop for Super Compound routing. Load a full workflow only when the contract below is insufficient for the current step or the workflow is being edited/reviewed.

## Load Order

1. Read `.agent/rules/super-compound.md` and `.agent/rules/quality-gates.md`.
2. Route by command using this index.
3. Read `.agent/context/workflows/<workflow>.contract.md` when present.
4. Load full `.agent/workflows/<workflow>.md` only for detailed execution, audits, or edits.
5. Load full `skills/<name>/SKILL.md` only when actively following that skill procedure.

## Public Routes

| Command | Compact route | Primary output |
|---|---|---|
| `/sc-init` | `workflows/sc-init.contract.md` | stack summary |
| `/sc-status` | `workflows/sc-status.contract.md` | next workflow |
| `/sc-explore` | `workflows/sc-explore.contract.md` | BRD or summary |
| `/sc-research` | `workflows/sc-research.contract.md` | research note |
| `/sc-prd` | `workflows/sc-prd.contract.md` | PRD |
| `/sc-plan` | `workflows/sc-plan.contract.md` | FSD + issue pointers |
| `/sc-eval` | `workflows/sc-eval.contract.md` | pass/fail report |
| `/sc-work` | `workflows/sc-work.contract.md` | implementation + verification |
| `/sc-debug` | `workflows/sc-debug.contract.md` | fix evidence |
| `/sc-review` | `workflows/sc-review.contract.md` | findings |
| `/sc-audit` | `workflows/sc-audit.contract.md` | audit findings |
| `/sc-compound` | `workflows/sc-compound.contract.md` | solution note |
| `/sc-pause` | `workflows/sc-pause.contract.md` | `.continue-here.md` |
| `/sc-launch` | `workflows/sc-launch.contract.md` | staged artifacts |
| `/sc-ui` | `workflows/sc-ui.contract.md` | UI work grounded in search |

## Smart-Zone Invariants

- BRD -> PRD -> FSD -> GOAL remains the delivery path.
- FSD and accepted ADRs remain implementation authority.
- `OPEN-*` blockers stop unsafe invention.
- Issue files stay pointers; they do not duplicate artifact prose.
- Interface-design data is retrieved by search scripts, not model preload.
- Verification commands remain mapped before completion.
