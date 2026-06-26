# Agentic Delivery Template Index

Use skeletons first. Load full templates only for the specific section being authored, reviewed, or repaired.

## Full Templates

| Artifact | Full template | Skeleton |
|---|---|---|
| BRD | `.agent/templates/agentic-delivery/BRD-Agentic-Ready-Reusable-Template.md` | `skeletons/BRD-Skeleton.md` |
| PRD | `.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md` | `skeletons/PRD-Skeleton.md` |
| FSD | `.agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md` | `skeletons/FSD-Skeleton.md` |
| ADR | `.agent/templates/agentic-delivery/ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md` | `skeletons/ADR-Skeleton-OPTIONAL.md` |
| Issue pointer | `agentic-delivery` / `issue-workflow` | `skeletons/Issue-Pointer-Skeleton.md` |
| Pull Request | `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md` | n/a |

## Section-On-Demand Rules

- Start from the skeleton and qualified refs.
- Expand only the section needed for the artifact under active edit.
- Keep `OPEN-*` records for unresolved decisions.
- Keep BRD business, PRD product, FSD technical, and ADR decision authority separate.
- Goal issue files must point to IDs and paths; do not copy BRD/PRD/FSD/ADR paragraphs.
- Pull Request text uses the Git workflow template after local verification and push.
