import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeHandoffEnvelope } from "../../src/handoff/writer.js";
import { generateCompactionInjection } from "../../src/workflow/compaction.js";
import { createWorkflowIndex, workflowIndexPath } from "../../src/workflow/index-manager.js";
import { recoverFromCrash, resumeFromCompaction, resumeLatestActiveSession } from "../../src/workflow/resume.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-resume-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("workflow resume and recovery", () => {
  it("supports compaction injection -> resume cycle", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231700";

    await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "dev-story",
      goal: "Build feature",
      steps: [{ step: "implement", persona: "coda" }]
    });

    const injection = await generateCompactionInjection(workflowIndexPath(cwd, sessionId));
    const report = await resumeFromCompaction(cwd, injection);
    expect(report.status).toBe("ok");
    expect(report.sessionId).toBe(sessionId);
  });

  it("recovers from crash by rebuilding workflow index from envelopes", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231701";
    const sessionDir = join(cwd, ".sinfonia/handoffs", sessionId);
    await mkdir(sessionDir, { recursive: true });

    await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "dispatch",
        status: "pending",
        artifacts: ["spec.md"],
        task: "Implement",
        context: "Story scope",
        constraints: ["TDD"]
      },
      sessionId,
      new Date("2026-02-23T23:17:01Z")
    );
    await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "coda",
        targetPersona: "maestro",
        type: "return",
        status: "completed",
        artifacts: ["src/a.ts"],
        summary: "Done",
        completionAssessment: "ready",
        blockers: ["none"],
        recommendations: ["review"]
      },
      sessionId,
      new Date("2026-02-23T23:17:02Z")
    );

    await writeFile(workflowIndexPath(cwd, sessionId), "corrupt-index", "utf8");

    const report = await recoverFromCrash(cwd, sessionId);
    expect(report.status).toBe("recovered");
    expect(report.inconsistencies.length).toBeGreaterThan(0);

    const restored = await readFile(workflowIndexPath(cwd, sessionId), "utf8");
    expect(restored).toContain("workflow_id:");
  });

  it("resumes latest active session across multiple session directories", async () => {
    const cwd = await makeTempDir();

    await createWorkflowIndex({
      cwd,
      sessionId: "s-20260223-231702",
      workflowId: "create-prd",
      goal: "PRD",
      steps: [{ step: "draft", persona: "libretto" }]
    });

    await createWorkflowIndex({
      cwd,
      sessionId: "s-20260223-231703",
      workflowId: "dev-story",
      goal: "Implement",
      steps: [{ step: "implement", persona: "coda" }]
    });

    const resumed = await resumeLatestActiveSession(cwd);
    expect(resumed).not.toBeNull();
    expect(resumed?.sessionId).toBe("s-20260223-231703");
    expect(resumed?.status).toBe("ok");
  });
});
