import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
]);
