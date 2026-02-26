/**
 * Fortune-MCP Demo Tests
 *
 * Validates the fortune-mcp.js MCP server produced by the Story 5.2 pipeline run.
 * Tests the exported FORTUNES array and getRandomFortune function directly
 * (server startup is guarded by fileURLToPath check, so import is safe).
 */

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Import the fortune module directly (ESM, plain JS)
const fortuneModulePath = join(
  fileURLToPath(import.meta.url),
  "../../../src/mcp/fortune-demo/fortune-mcp.js"
);

// Dynamic import to handle ESM plain JS module
const { FORTUNES, getRandomFortune } = await import(fortuneModulePath);

describe("Fortune-MCP: FORTUNES array", () => {
  it("contains exactly 10 fortunes", () => {
    expect(FORTUNES).toHaveLength(10);
  });

  it("all entries are non-empty strings", () => {
    for (const fortune of FORTUNES) {
      expect(typeof fortune).toBe("string");
      expect(fortune.length).toBeGreaterThan(0);
    }
  });
});

describe("Fortune-MCP: getRandomFortune()", () => {
  it("returns a string", () => {
    const result = getRandomFortune();
    expect(typeof result).toBe("string");
  });

  it("returns a value from the known FORTUNES list", () => {
    const result = getRandomFortune();
    expect(FORTUNES).toContain(result);
  });

  it("produces at least 2 distinct values across 20 calls (randomness check)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(getRandomFortune());
    }
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});
