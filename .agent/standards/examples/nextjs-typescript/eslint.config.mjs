import { defineConfig, globalIgnores } from "eslint/config";
import next from "./checks/next-rule-bridge/index.cjs";
import typescript from "typescript-eslint";

export default defineConfig([
  ...typescript.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "@next/next": next },
    rules: next.configs.recommended.rules,
  },
  {
    files: [
      "checks/next-rule-bridge/published/utils/get-root-dirs.js",
      "checks/next-rule-bridge/index.cjs",
    ],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": [
        "error",
        {
          allow: [
            "^node:fs$",
            "^node:path$",
            "^\\./published/rules/(google-font-display|google-font-preconnect|next-script-for-ga|no-async-client-component|no-before-interactive-script-outside-document|no-css-tags|no-head-element|no-html-link-for-pages|no-img-element|no-location-assign-relative-destination|no-page-custom-font|no-styled-jsx-in-document|no-sync-scripts|no-title-in-document-head|no-typos|no-unwanted-polyfillio|inline-script-id|no-assign-module-variable|no-document-import-in-page|no-duplicate-head|no-head-import-in-document|no-script-component-in-head)$",
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    ".vitest-results.json",
    "checks/next-rule-bridge/published/rules/google-font-display.js",
    "checks/next-rule-bridge/published/utils/define-rule.js",
    "checks/next-rule-bridge/published/utils/node-attributes.js",
    "checks/next-rule-bridge/published/rules/google-font-preconnect.js",
    "checks/next-rule-bridge/published/rules/next-script-for-ga.js",
    "checks/next-rule-bridge/published/rules/no-async-client-component.js",
    "checks/next-rule-bridge/published/rules/no-before-interactive-script-outside-document.js",
    "checks/next-rule-bridge/published/rules/no-css-tags.js",
    "checks/next-rule-bridge/published/rules/no-head-element.js",
    "checks/next-rule-bridge/published/rules/no-html-link-for-pages.js",
    "checks/next-rule-bridge/published/utils/url.js",
    "checks/next-rule-bridge/published/rules/no-img-element.js",
    "checks/next-rule-bridge/published/rules/no-location-assign-relative-destination.js",
    "checks/next-rule-bridge/published/rules/no-page-custom-font.js",
    "checks/next-rule-bridge/published/rules/no-styled-jsx-in-document.js",
    "checks/next-rule-bridge/published/rules/no-sync-scripts.js",
    "checks/next-rule-bridge/published/rules/no-title-in-document-head.js",
    "checks/next-rule-bridge/published/rules/no-typos.js",
    "checks/next-rule-bridge/published/rules/no-unwanted-polyfillio.js",
    "checks/next-rule-bridge/published/rules/inline-script-id.js",
    "checks/next-rule-bridge/published/rules/no-assign-module-variable.js",
    "checks/next-rule-bridge/published/rules/no-document-import-in-page.js",
    "checks/next-rule-bridge/published/rules/no-duplicate-head.js",
    "checks/next-rule-bridge/published/rules/no-head-import-in-document.js",
    "checks/next-rule-bridge/published/rules/no-script-component-in-head.js",
    "checks/next-rule-bridge/LICENSE.md",
  ]),
]);
