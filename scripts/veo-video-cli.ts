#!/usr/bin/env tsx
/**
 * scripts/veo-video-cli.ts
 *
 * Backward-Compatibility Delegate for the Unified Google Veo & Flow Video CLI.
 * Delegates all commands, options, and execution directly to scripts/veo-cli.ts.
 *
 * Usage:
 *   npx tsx scripts/veo-video-cli.ts [options]
 *   npm run veo:video
 */

import { main } from "./veo-cli";

export { main };

// Execute CLI when invoked directly
const isDirectExecution =
  process.argv[1]?.endsWith("veo-video-cli.ts") ||
  process.argv[1]?.endsWith("veo-video-cli");

if (isDirectExecution) {
  main().catch((err) => {
    console.error("❌ Veo Video CLI Error:", err);
    process.exit(1);
  });
}
