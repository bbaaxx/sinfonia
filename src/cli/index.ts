#!/usr/bin/env node

import { createProgram } from "./program.js";

const program = createProgram();

try {
  await program.parseAsync();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
