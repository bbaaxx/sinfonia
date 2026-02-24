import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generateCompactionInjection, compactionWordLimit } from "../../src/workflow/compaction.js";
import { createWorkflowIndex, workflowIndexPath } from "../../src/workflow/index-manager.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-compaction-test-"));
  tempDirs.push(dir);
  return dir;
};

const wordCount = (text: string): number => text.trim().split(/\s+/).filter((item) => item.length > 0).length;

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("compaction injection generator", () => {
  it("generates in-progress injection under 200 words", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231600";

    await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "dev-story",
      goal: "Deliver user profile editor feature end-to-end",
      steps: [
        { step: "analyze", persona: "coda" },
        { step: "implement", persona: "coda" }
      ],
      context: "Working through acceptance criteria"
    });

    const injection = await generateCompactionInjection(workflowIndexPath(cwd, sessionId));

    expect(injection).toContain("## Compaction Injection");
    expect(injection).toContain("- Goal:");
    expect(injection).toContain("- Current Step:");
    expect(injection).toContain("- Status:");
    expect(injection).toContain("- Key Decisions:");
    expect(injection).toContain("- Recent Artifacts:");
    expect(wordCount(injection)).toBeLessThanOrEqual(compactionWordLimit());
  });

  it("works for blocked workflow states", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231601";

    await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "code-review",
      goal: "Review implementation quality",
      steps: [{ step: "assess", persona: "rondo" }]
    });

    const path = workflowIndexPath(cwd, sessionId);
    const current = await generateCompactionInjection(path);
    expect(current).toContain("- Status: created");
  });

  it("handles missing workflow file gracefully", async () => {
    const cwd = await makeTempDir();
    const injection = await generateCompactionInjection(join(cwd, "missing.md"));
    expect(injection).toContain("workflow file not found");
    expect(wordCount(injection)).toBeLessThanOrEqual(compactionWordLimit());
  });

  it("handles corrupt workflow file gracefully", async () => {
    const cwd = await makeTempDir();
    const file = join(cwd, "workflow.md");
    await writeFile(file, "corrupt-content", "utf8");

    const injection = await generateCompactionInjection(file);
    expect(injection).toContain("parse failed");
    expect(wordCount(injection)).toBeLessThanOrEqual(compactionWordLimit());
  });
});
