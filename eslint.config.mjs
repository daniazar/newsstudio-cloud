import { createRequire } from "module";
import { defineConfig, globalIgnores } from "eslint/config";

const require = createRequire(import.meta.url);
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const nextPlugin = require("@next/eslint-plugin-next");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

function fixupPlugin(plugin) {
  if (!plugin || !plugin.rules) return plugin;
  const fixedRules = {};
  for (const [name, rule] of Object.entries(plugin.rules)) {
    fixedRules[name] = {
      ...rule,
      create(context) {
        const sc = context.sourceCode;
        let currentNode = sc.ast;
        const compatContext = Object.create(context, {
          getScope: { value: (node) => sc.getScope(node || currentNode || sc.ast) },
          getAncestors: { value: (node) => sc.getAncestors(node || currentNode || sc.ast) },
          getDeclaredVariables: { value: (node) => sc.getDeclaredVariables(node || currentNode || sc.ast) },
          markVariableAsUsed: { value: (vname, node) => sc.markVariableAsUsed(vname, node || currentNode || sc.ast) },
          getSourceCode: { value: () => sc },
          getSource: { value: (node, b, a) => sc.getText(node, b, a) },
          getSourceLines: { value: () => sc.lines },
          getAllComments: { value: () => sc.getAllComments() },
          getCommentsBefore: { value: (node) => sc.getCommentsBefore(node) },
          getCommentsAfter: { value: (node) => sc.getCommentsAfter(node) },
          getCommentsInside: { value: (node) => sc.getCommentsInside(node) },
          getJSDocComment: { value: (node) => (sc.getJSDocComment ? sc.getJSDocComment(node) : null) },
          getFirstToken: { value: (node, opt) => sc.getFirstToken(node, opt) },
          getFirstTokens: { value: (node, opt) => sc.getFirstTokens(node, opt) },
          getLastToken: { value: (node, opt) => sc.getLastToken(node, opt) },
          getLastTokens: { value: (node, opt) => sc.getLastTokens(node, opt) },
          getTokenBefore: { value: (node, opt) => sc.getTokenBefore(node, opt) },
          getTokenAfter: { value: (node, opt) => sc.getTokenAfter(node, opt) },
          getTokens: { value: (node, b, a) => sc.getTokens(node, b, a) },
          getTokensBetween: { value: (l, r, p) => sc.getTokensBetween(l, r, p) },
          getNodeByRangeIndex: { value: (idx) => sc.getNodeByRangeIndex(idx) },
          getFilename: { value: () => context.filename },
          getPhysicalFilename: { value: () => context.physicalFilename },
          getCwd: { value: () => context.cwd },
        });
        const visitors = rule.create(compatContext);
        const wrappedVisitors = {};
        for (const [selector, fn] of Object.entries(visitors)) {
          if (typeof fn === "function") {
            wrappedVisitors[selector] = function (node, ...args) {
              if (node && typeof node === "object" && "type" in node) {
                currentNode = node;
              }
              return fn.call(this, node, ...args);
            };
          } else {
            wrappedVisitors[selector] = fn;
          }
        }
        return wrappedVisitors;
      },
    };
  }
  return { ...plugin, rules: fixedRules };
}

const tsPlugins = {
  "@typescript-eslint": fixupPlugin(tsPlugin),
};

const nextVitals = [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    plugins: {
      react: fixupPlugin(reactPlugin),
      "react-hooks": fixupPlugin(reactHooksPlugin),
      "@next/next": fixupPlugin(nextPlugin),
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
    },
  },
];

const nextTs = [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    plugins: tsPlugins,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
];

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
    plugins: tsPlugins,
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
      "src/**/*.ts",
      "src/**/*.tsx",
      "src/**/*.mts",
      "src/**/*.cts",
      "workers/**/*.ts",
      "workers/**/*.tsx",
      "workers/**/*.mts",
      "workers/**/*.cts",
      "tooling/mcp/**/*.ts",
      "tooling/mcp/**/*.tsx",
      "tooling/mcp/**/*.mts",
      "tooling/mcp/**/*.cts",
    ],
    plugins: tsPlugins,
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
    files: [
      "scripts/**/*.ts",
      "scripts/**/*.tsx",
      "scripts/**/*.mts",
      "scripts/**/*.cts",
    ],
    plugins: tsPlugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
    plugins: tsPlugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
