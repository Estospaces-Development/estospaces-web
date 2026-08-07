import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "dist-verify*/**",
      ".worktrees/**",
      "node_modules/**",
      "output/**",
      ".playwright-cli/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
