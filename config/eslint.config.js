/**
 * ESLint Configuration
 * This file contains the actual ESLint rules and settings.
 * Dependencies are injected from the root wrapper to avoid module resolution issues.
 */

/**
 * @param {Object} deps - Dependencies injected from root
 * @param {import('typescript-eslint')} deps.tseslint
 * @param {Object} deps.drizzle
 * @param {Object} deps.nextPlugin
 */
export function createEslintConfig({ tseslint, drizzle, nextPlugin }) {
  return tseslint.config(
    {
      ignores: [".next", "config"],
    },
    nextPlugin.configs.recommended,
    nextPlugin.configs["core-web-vitals"],
    {
      files: ["**/*.ts", "**/*.tsx"],
      plugins: {
        drizzle,
      },
      extends: [
        ...tseslint.configs.recommended,
        ...tseslint.configs.recommendedTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      rules: {
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/consistent-type-imports": [
          "warn",
          { prefer: "type-imports", fixStyle: "inline-type-imports" },
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-misused-promises": [
          "error",
          { checksVoidReturn: { attributes: false } },
        ],
        "drizzle/enforce-delete-with-where": [
          "error",
          { drizzleObjectName: ["db", "ctx.db"] },
        ],
        "drizzle/enforce-update-with-where": [
          "error",
          { drizzleObjectName: ["db", "ctx.db"] },
        ],
      },
    },
    {
      linterOptions: {
        reportUnusedDisableDirectives: true,
      },
      languageOptions: {
        parserOptions: {
          projectService: true,
        },
      },
    }
  );
}
