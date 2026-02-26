#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createProgram } from "./program.js";

async function checkBuildFreshness(): Promise<void> {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const pkgRoot = join(dirname(thisFile), "..", "..");
    const srcEntry = join(pkgRoot, "src", "cli", "index.ts");
    const distEntry = thisFile;

    const [srcStat, distStat] = await Promise.all([
      stat(srcEntry),
      stat(distEntry),
    ]);

    if (srcStat.mtimeMs > distStat.mtimeMs) {
      console.error(
        "\x1b[33m⚠ Sinfonia build may be stale. Run 'npm run build' to recompile.\x1b[0m"
      );
    }
  } catch {
    // Silently ignore — src/ may not exist in published packages
  }
}

await checkBuildFreshness();

const program = createProgram();

try {
  await program.parseAsync();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
