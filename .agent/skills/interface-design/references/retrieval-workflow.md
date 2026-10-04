# Interface Design Retrieval

## Summary

Retrieve recommendations, review the master, and add page guidance without replacing
user edits. Use separate stack searches for implementation examples.

## Runtime Data Loading

Use this skill by retrieval. Run `scripts/search.py` and read the returned rows; do not paste or preload `.agent/skills/interface-design/data/**/*.csv` into model context. Load raw CSV files only when editing or validating the data itself.

## Workflow

1. Identify the product type, audience, platform, page/screen, stack, and any style constraints from the request and project config.
2. Generate or read the design system before implementation:

```bash
python .agent/skills/interface-design/scripts/search.py "<product type> <industry> <keywords>" --design-system --format markdown -p "<Project Name>"
```

3. Persist reusable guidance when the project has multiple UI tasks:

```bash
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --format markdown --persist -p "<Project Name>"
python .agent/skills/interface-design/scripts/search.py "<query>" --design-system --format markdown --persist -p "<Project Name>" --page "dashboard"
```

Adding a page inherits the existing master, including user edits. `--overwrite`
with `--page` replaces only that page. Update the master separately without
`--page`, using `--overwrite` after reviewing the replacement. Design-system
generation does not support `--json`, `--stack`, or `--domain`; run those searches
separately. Search JSON and the default ASCII design-system output stay compatible.

4. Add targeted searches only where needed:

```bash
python .agent/skills/interface-design/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
python .agent/skills/interface-design/scripts/search.py "<keyword>" --stack <stack> [-n <max_results>]
```

5. Implement with existing project components and styling conventions.
6. Verify responsive layout, accessibility, text overflow, hover/focus states, empty/loading/error states, and stack-specific risks.
