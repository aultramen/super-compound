## Runtime Data Loading

Use this skill by retrieval. Run `scripts/search.py` and read the returned rows; do not paste or preload `.agent/skills/interface-design/data/**/*.csv` into model context. Load raw CSV files only when editing or validating the data itself.

## Workflow

1. Identify the product type, audience, platform, page/screen, stack, and any style constraints from the request and project config.
2. Generate or read the design system before implementation:

```bash
python .agent/skills/interface-design/scripts/search.py "<product type> <industry> <keywords>" --design-system -p "<Project Name>"
```

3. Persist reusable guidance when the project has multiple UI tasks:

```bash
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --persist -p "<Project Name>"
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --persist -p "<Project Name>" --page "dashboard"
```

4. Add targeted searches only where needed:

```bash
python .agent/skills/interface-design/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
python .agent/skills/interface-design/scripts/search.py "<keyword>" --stack <stack> [-n <max_results>]
```

5. Implement with existing project components and styling conventions.
6. Verify responsive layout, accessibility, text overflow, hover/focus states, empty/loading/error states, and stack-specific risks.
