import { defineConfig } from "eslint/config";
import config from "./eslint.config.mjs";

export default defineConfig([
  ...config,
  {
    files: ["src/lib/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/app/**",
                "**/components/**",
                "@/app/**",
                "@/components/**",
              ],
              message: "Services must not import UI or transport modules.",
            },
          ],
        },
      ],
    },
  },
]);
