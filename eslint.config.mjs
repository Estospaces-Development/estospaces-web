import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "dist-verify*/**",
      "node_modules/**",
      "output/**",
      ".playwright-cli/**",
    ],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
]);
