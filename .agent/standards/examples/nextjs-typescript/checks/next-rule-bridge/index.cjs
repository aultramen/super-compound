module.exports = {
  rules: {
    "google-font-display": require("./published/rules/google-font-display")
      .default,
    "google-font-preconnect":
      require("./published/rules/google-font-preconnect").default,
    "next-script-for-ga": require("./published/rules/next-script-for-ga")
      .default,
    "no-async-client-component":
      require("./published/rules/no-async-client-component").default,
    "no-before-interactive-script-outside-document":
      require("./published/rules/no-before-interactive-script-outside-document")
        .default,
    "no-css-tags": require("./published/rules/no-css-tags").default,
    "no-head-element": require("./published/rules/no-head-element").default,
    "no-html-link-for-pages":
      require("./published/rules/no-html-link-for-pages").default,
    "no-img-element": require("./published/rules/no-img-element").default,
    "no-location-assign-relative-destination":
      require("./published/rules/no-location-assign-relative-destination")
        .default,
    "no-page-custom-font": require("./published/rules/no-page-custom-font")
      .default,
    "no-styled-jsx-in-document":
      require("./published/rules/no-styled-jsx-in-document").default,
    "no-sync-scripts": require("./published/rules/no-sync-scripts").default,
    "no-title-in-document-head":
      require("./published/rules/no-title-in-document-head").default,
    "no-typos": require("./published/rules/no-typos").default,
    "no-unwanted-polyfillio":
      require("./published/rules/no-unwanted-polyfillio").default,
    "inline-script-id": require("./published/rules/inline-script-id").default,
    "no-assign-module-variable":
      require("./published/rules/no-assign-module-variable").default,
    "no-document-import-in-page":
      require("./published/rules/no-document-import-in-page").default,
    "no-duplicate-head": require("./published/rules/no-duplicate-head").default,
    "no-head-import-in-document":
      require("./published/rules/no-head-import-in-document").default,
    "no-script-component-in-head":
      require("./published/rules/no-script-component-in-head").default,
  },
  configs: {
    recommended: {
      rules: {
        "@next/next/google-font-display": "warn",
        "@next/next/google-font-preconnect": "warn",
        "@next/next/next-script-for-ga": "warn",
        "@next/next/no-async-client-component": "warn",
        "@next/next/no-before-interactive-script-outside-document": "warn",
        "@next/next/no-css-tags": "warn",
        "@next/next/no-head-element": "warn",
        "@next/next/no-html-link-for-pages": "warn",
        "@next/next/no-img-element": "warn",
        "@next/next/no-location-assign-relative-destination": "warn",
        "@next/next/no-page-custom-font": "warn",
        "@next/next/no-styled-jsx-in-document": "warn",
        "@next/next/no-sync-scripts": "warn",
        "@next/next/no-title-in-document-head": "warn",
        "@next/next/no-typos": "warn",
        "@next/next/no-unwanted-polyfillio": "warn",
        "@next/next/inline-script-id": "error",
        "@next/next/no-assign-module-variable": "error",
        "@next/next/no-document-import-in-page": "error",
        "@next/next/no-duplicate-head": "error",
        "@next/next/no-head-import-in-document": "error",
        "@next/next/no-script-component-in-head": "error",
      },
    },
  },
};
