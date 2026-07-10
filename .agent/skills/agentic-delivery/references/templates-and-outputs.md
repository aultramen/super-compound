## Reference Templates

Use the full templates only when creating or reviewing their artifact. Do not paste template content into workflow files, startup files, or goal issues.

```text
.agent/templates/agentic-delivery/BRD-Agentic-Ready-Reusable-Template.md
.agent/templates/agentic-delivery/PRD-Agentic-Ready-Reusable-Template.md
.agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md
.agent/templates/agentic-delivery/ADR-Agentic-Ready-Reusable-Template-OPTIONAL.md
```

## Artifact Outputs

| Workflow | Primary Output | Location | Must Consume |
|---|---|---|---|
| `/sc-explore` | BRD | `docs/brd/brd-<feature>.md` | user request, evidence, business context |
| `/sc-prd` | PRD | `docs/prd/prd-<feature>.md` | approved BRD |
| `/sc-plan` | FSD plus goal issues | `docs/fsd/fsd-<feature>.md` and `.scratch/<feature>/issues/*.md` | approved PRD |
| `/sc-work` | implementation and verification evidence | source tree plus updated issue status | approved FSD goal issue |

`/sc-plan` may still produce a short companion execution note only when useful, but the FSD is the implementation authority.
