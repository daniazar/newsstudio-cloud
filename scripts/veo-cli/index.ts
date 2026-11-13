#!/usr/bin/env tsx
/**
 * scripts/veo-cli/index.ts
 *
 * Primary entry point and module exports for Google Veo 3.1 & Flow Action Beat Video CLI.
 * Allows running `npx tsx scripts/veo-cli [options]` or importing modular generators.
 */

import { main } from "../veo-cli";

export * from "./types";
export * from "./actionStateCatalog";
export * from "./flowCharacterRegistry";
export * from "./promptCompiler";
export * from "./wizard";
export * from "./engines/veoDispatcher";
export * from "./engines/chromeBootstrapper";
export * from "./generators/actionMatrixGenerator";
export { main };

// Execute CLI when invoked directly or via `npx tsx scripts/veo-cli`
const isInvokedAsCli =
  process.argv[1]?.includes("veo-cli") ||
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("index");

if (isInvokedAsCli) {
  main().catch((err) => {
    console.error("❌ Veo CLI Error:", err);
    process.exit(1);
  });
}
