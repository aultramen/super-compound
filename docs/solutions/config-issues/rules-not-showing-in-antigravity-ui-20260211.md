---
date: 2026-02-11
category: config-issues
severity: medium
tags: [antigravity-ide, rules, ui, naming-convention, customizations]
---

# Rules Files Not Showing in Antigravity IDE Customizations UI

## Symptoms

- Files placed in `.agent/rules/` do not appear in the **Customizations → Rules** list in Antigravity IDE
- The **Workflows** tab shows all files from `.agent/workflows/` correctly, but the **Rules** tab is empty
- Attempting to manually add a rule with uppercase letters (e.g., `SUPER-COMPOUND`) shows the error:
  > "Invalid rule name. Only lowercase letters, numbers, and hyphens are allowed."

## Root Cause

Antigravity IDE's **Rules UI** enforces a strict naming convention that differs from the **Workflows UI**:

| Aspect | Rules UI | Workflows UI |
|--------|----------|--------------|
| **Naming** | Only lowercase letters, numbers, and hyphens | Accepts any valid filename |
| **Auto-discovery** | Requires naming compliance + manual refresh | Automatic from `.agent/workflows/` |
| **Registration** | Must comply with naming rules to appear | Auto-registered on detection |

Files with uppercase characters (e.g., `SUPER-COMPOUND.md`) violate the naming convention and are silently excluded from the UI list. However, the AI agent's rule-loading mechanism operates independently of the UI — it reads **all** files from `.agent/rules/` regardless of naming.

## Solution

1. **Rename rule files** to use only lowercase letters, numbers, and hyphens:
   - `SUPER-COMPOUND.md` → `super-compound.md`
   - `project-config.md` → ✅ already compliant
   - `quality-gates.md` → ✅ already compliant

2. **Trigger UI refresh** after renaming:
   - Make a small edit to the file (e.g., add/remove a space) and save
   - Click the **three dots menu** (⋯) in the top-right corner of the IDE
   - Choose **Customizations**
   - Click the **Refresh** button (🔄) next to "Rules"

3. **Added documentation** to `README.md` under "Project Structure After Installation" with an `[!IMPORTANT]` alert explaining this behavior.

## What Didn't Work

- Simply placing files in `.agent/rules/` with any naming convention — uppercase files are silently ignored by the UI
- Expecting the Rules UI to auto-discover files like the Workflows UI does — Rules requires both naming compliance and manual refresh

## Prevention

- Always use **lowercase letters, numbers, and hyphens only** when naming rule files
- After creating or renaming rule files, always perform a manual refresh in the Customizations panel
- Document this convention in project README for other contributors

## Related

- `README.md` — Contains the `[!IMPORTANT]` note about this behavior under "Project Structure After Installation"
- Antigravity IDE documentation on Customizations
