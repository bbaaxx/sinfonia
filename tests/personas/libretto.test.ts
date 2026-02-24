import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validatePersonaPaths } from "../../src/validators/persona/validator.js";

describe("Story 2.1.2 libretto persona", () => {
  it("validates libretto persona with zero errors and limited warnings", async () => {
    const personaPath = join(process.cwd(), "agents/libretto.md");
    const result = await validatePersonaPaths(personaPath, false);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBeLessThanOrEqual(5);
  });

  it("declares subagent mode and planning scope", async () => {
    const content = await readFile(join(process.cwd(), "agents/libretto.md"), "utf8");

    expect(content).toContain("persona_mode: subagent");
    expect(content).toContain("PRD");
    expect(content).toContain("acceptance criteria");
  });
});
