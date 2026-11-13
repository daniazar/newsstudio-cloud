import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    maxWorkers: 4,
    teardownTimeout: 5000,
    setupFiles: [],
    include: ["**/*.test.ts", "**/*.test.tsx", "__tests__/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      ".next/**",
      "remotion/**",
      "public/**",
      "prisma/**",
      "vendor/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "remotion/",
        "public/",
        "prisma/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
