import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validatePersonaPaths } from "../../src/validators/persona/validator.js";

describe("Story 2.1.6 metronome persona", () => {
  it("validates metronome persona with zero errors and limited warnings", async () => {
    const personaPath = join(process.cwd(), "agents/metronome.md");
    const result = await validatePersonaPaths(personaPath, false);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBeLessThanOrEqual(5);
  });

  it("focuses on context management and compaction guidance", async () => {
    const content = await readFile(join(process.cwd(), "agents/metronome.md"), "utf8");

    expect(content).toContain("persona_mode: subagent");
    expect(content).toContain("context");
    expect(content).toContain("compaction");
    expect(content).toContain("token");
  });
});
