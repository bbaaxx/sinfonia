import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validatePersonaPaths } from "../../src/validators/persona/validator.js";

describe("Story 2.1.4 coda persona", () => {
  it("validates coda persona with zero errors and limited warnings", async () => {
    const personaPath = join(process.cwd(), "agents/coda.md");
    const result = await validatePersonaPaths(personaPath, false);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBeLessThanOrEqual(5);
  });

  it("captures TDD and implementation discipline", async () => {
    const content = await readFile(join(process.cwd(), "agents/coda.md"), "utf8");

    expect(content).toContain("persona_mode: subagent");
    expect(content).toContain("Tests first");
    expect(content).toContain("validation");
  });
});
