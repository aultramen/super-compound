# Interface Design Retrieval

## Summary

Retrieve recommendations, review the master, and add page guidance without replacing
user edits. Use separate stack searches for implementation examples.

## Runtime Data Loading

Use this skill by retrieval. Run `scripts/search.py` and read the returned rows; do not paste or preload `.agent/skills/interface-design/data/**/*.csv` into model context. Load raw CSV files only when editing or validating the data itself.

## Workflow

1. Identify the product type, audience, platform, page/screen, stack, and any style constraints from the request and project config.
2. Choose the smallest search mode: use a design system for new pages or product-wide direction, an explicit domain for a targeted concern, or a stack search for implementation details. Keep each query to one dominant intent with product/platform constraints. For a new design system:

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
generation does not support `--json`, `--stack`, `--domain`, or `--rtl`; run those searches
separately. Search JSON and the default ASCII design-system output stay compatible.

4. Add targeted searches only where needed:

```bash
python .agent/skills/interface-design/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
python .agent/skills/interface-design/scripts/search.py "<keyword>" --stack <stack> [-n <max_results>]
python .agent/skills/interface-design/scripts/search.py "Apple Native" --domain style --rtl=full
python .agent/skills/interface-design/scripts/search.py "healthcare patient portal" --domain product --rtl
```

For Arabic, Hebrew, Persian, Urdu, or an explicit RTL requirement, retrieve style
and product guidance with `--rtl` and interpret the returned compatibility level
through the [catalog](catalog.md). RTL filtering requires an explicit style/product
domain; auto-routing, other domains, stack searches, and persistence reject it.

5. Check the returned domain, identity, and product/platform fit. If empty or off-topic, retry once with narrower intent or an explicit domain/stack. If still unmatched, state the retrieval gap and label any general guidance; persist only verified recommendations. Generated reasoning/confidence fields are catalog guidance, not measured evidence for the project.
6. Implement with existing project components and styling conventions.
7. Verify responsive layout, accessibility, text overflow, hover/focus states, empty/loading/error states, applicable rendered RTL/mixed-script behavior, and stack-specific risks.
