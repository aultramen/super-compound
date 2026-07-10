# /sc-init Runtime Contract

Purpose: initialize or refresh project context.

Load project config, README/package metadata, test/build commands, and source layout summaries. Suggest config updates instead of guessing. Report enabled MCP/tool-schema and installed-skill metadata cost when the host exposes it; otherwise mark it `unknown` and never auto-disable capabilities. For reload, read only changed rules/workflows/skills and summarize the delta.
