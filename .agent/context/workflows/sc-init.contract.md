# /sc-init Runtime Contract

Purpose: initialize or refresh project context.

Read-only by default: load project config, metadata, commands, and source layout;
suggest config changes instead of guessing. Write only a requested concise
codebase note, never config or source. Report host MCP/tool/skill cost when
exposed, otherwise `unknown`. Reload only changed framework files and summarize
the delta.
