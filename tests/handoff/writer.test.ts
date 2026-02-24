import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createSessionId, handoffPathFor, writeHandoffEnvelope } from "../../src/handoff/writer.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-handoff-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("handoff writer", () => {
  it("creates deterministic session id format", () => {
    const id = createSessionId(new Date("2026-02-23T23:15:30Z"));
    expect(id).toBe("s-20260223-231530");
  });

  it("builds expected handoff path pattern", () => {
    const path = handoffPathFor("/tmp/work", "s-20260223-231530", 7, "maestro", "coda");
    expect(path).toContain(".sinfonia/handoffs/s-20260223-231530/007-maestro-to-coda.md");
  });

  it("auto increments sequence per session", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231530";

    const first = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "delegation",
        status: "pending",
        task: "Implement",
        context: "Story details",
        constraints: ["TDD"]
      },
      sessionId,
      new Date("2026-02-23T23:15:31Z")
    );

    const second = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "rondo",
        type: "return",
        status: "completed",
        task: "Review",
        context: "Review details",
        result: "All good",
        evidence: ["tests pass"],
        nextSteps: ["merge"]
      },
      sessionId,
      new Date("2026-02-23T23:15:32Z")
    );

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    await expect(access(first.filePath)).resolves.toBeUndefined();
    await expect(access(second.filePath)).resolves.toBeUndefined();
  });

  it("writes nine frontmatter fields and type-specific sections", async () => {
    const cwd = await makeTempDir();
    const written = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "coda",
        targetPersona: "rondo",
        type: "return",
        status: "completed",
        task: "Review",
        context: "Context",
        result: "Implemented",
        evidence: ["unit tests"],
        nextSteps: ["approve"]
      },
      "s-20260223-231530",
      new Date("2026-02-23T23:15:33Z")
    );

    const content = await readFile(written.filePath, "utf8");
    expect(content).toContain("handoff_id:");
    expect(content).toContain("session_id:");
    expect(content).toContain("sequence:");
    expect(content).toContain("source_persona:");
    expect(content).toContain("target_persona:");
    expect(content).toContain("handoff_type:");
    expect(content).toContain("status:");
    expect(content).toContain("created_at:");
    expect(content).toContain("word_count:");
    expect(content).toContain("## Result");
    expect(content).toContain("## Evidence");
    expect(content).toContain("## Next Steps");
  });

  it("rejects bodies over 500 words", async () => {
    const cwd = await makeTempDir();
    const oversized = Array.from({ length: 501 }, () => "word").join(" ");

    await expect(
      writeHandoffEnvelope(
        cwd,
        {
          sourcePersona: "maestro",
          targetPersona: "libretto",
          type: "delegation",
          status: "pending",
          task: oversized,
          context: oversized,
          constraints: [oversized]
        },
        "s-20260223-231530",
        new Date("2026-02-23T23:15:34Z")
      )
    ).rejects.toThrow("<= 500 words");
  });
});
