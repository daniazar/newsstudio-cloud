import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
    "public/**",
    "SadTalker-Server/**",
    "coverage/**",
    ".remotion/**",
    "remotion/**",
    "components/**",
    "lib/**",
    "src/workers/piper_phonemize.esm.js",
    "scratch/**",
    "scratch.ts",
    "tooling/discord-voice-bot/**",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    plugins: nextTs[0].plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
  {
    files: [
      "src/**/*.{ts,tsx,mts,cts}",
      "workers/**/*.{ts,tsx,mts,cts}",
      "tooling/mcp/**/*.{ts,tsx,mts,cts}",
    ],
    plugins: nextTs[0].plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-require-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**/*.{ts,tsx,mts,cts}"],
    plugins: nextTs[0].plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
    plugins: nextTs[0].plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
