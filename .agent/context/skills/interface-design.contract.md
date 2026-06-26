# Interface-Design Skill Contract

Use `interface-design` by retrieval, not preload.

1. Identify product type, platform, page/screen, stack, and style constraints.
2. Run targeted search:

```bash
python .agent/skills/interface-design/scripts/search.py "<query>" --domain web
python .agent/skills/interface-design/scripts/search.py "<query>" --stack react
```

3. Read returned rows only.
4. Load full `interface-design/SKILL.md` when implementing or reviewing UI procedure.

Never paste or preload `.agent/skills/interface-design/data/**/*.csv` into model context.
