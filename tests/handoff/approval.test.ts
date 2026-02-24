import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyApprovalDecision, canProgressPipeline } from "../../src/handoff/approval.js";
import { writeHandoffEnvelope } from "../../src/handoff/writer.js";

// Mock WorkflowIndexManager so approval.ts uses the mock, not the real filesystem writer
vi.mock("../../src/workflow/index-manager.js", () => ({
  addDecision: vi.fn().mockResolvedValue(undefined),
  addArtifact: vi.fn().mockResolvedValue(undefined),
  workflowIndexPath: vi.fn((cwd: string, sessionId: string) =>
    join(cwd, ".sinfonia/handoffs", sessionId, "workflow.md")
  )
}));

import { addDecision } from "../../src/workflow/index-manager.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-approval-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("approval gate", () => {
  it("approves envelope and calls addDecision with correct arguments", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231530";
    await mkdir(join(cwd, ".sinfonia/handoffs", sessionId), { recursive: true });

    const envelope = await writeHandoffEnvelope(
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
        recommendations: ["approve"]
      },
      sessionId,
      new Date("2026-02-23T23:15:40Z")
    );

    await applyApprovalDecision({
      cwd,
      envelopePath: envelope.filePath,
      workflowPath: join(cwd, ".sinfonia/handoffs", sessionId, "workflow.md"),
      decision: "approve",
      reviewer: "maestro",
      note: "Looks good"
    });

    const envelopeAfter = await readFile(envelope.filePath, "utf8");
    expect(envelopeAfter).toContain("approval: approve");
    expect(envelopeAfter).toContain("approved_by: maestro");

    expect(addDecision).toHaveBeenCalledOnce();
    expect(addDecision).toHaveBeenCalledWith(
      cwd,
      sessionId,
      expect.objectContaining({
        handoffId: envelope.handoffId,
        decision: "approve",
        reviewer: "maestro",
        note: "Looks good"
      })
    );

    await expect(canProgressPipeline(envelope.filePath)).resolves.toBe(true);
  });

  it("creates revision handoff on reject and calls addDecision with reject decision", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231530";
    await mkdir(join(cwd, ".sinfonia/handoffs", sessionId), { recursive: true });

    const envelope = await writeHandoffEnvelope(
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
        recommendations: ["approve"]
      },
      sessionId,
      new Date("2026-02-23T23:15:41Z")
    );

    const result = await applyApprovalDecision({
      cwd,
      envelopePath: envelope.filePath,
      workflowPath: join(cwd, ".sinfonia/handoffs", sessionId, "workflow.md"),
      decision: "reject",
      reviewer: "maestro",
      note: "Add missing edge-case tests"
    });

    expect(result.revisionPath).toBeDefined();
    const revision = await readFile(result.revisionPath ?? "", "utf8");
    expect(revision).toContain("handoff_type: revision");
    expect(revision).toContain("## Revision Required");
    expect(revision).toContain("Add missing edge-case tests");

    expect(addDecision).toHaveBeenCalledOnce();
    expect(addDecision).toHaveBeenCalledWith(
      cwd,
      sessionId,
      expect.objectContaining({
        handoffId: envelope.handoffId,
        decision: "reject",
        reviewer: "maestro",
        note: "Add missing edge-case tests"
      })
    );

    await expect(canProgressPipeline(envelope.filePath)).resolves.toBe(false);
  });

  it("blocks progression when approval is missing", async () => {
    const cwd = await makeTempDir();
    const envelope = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "libretto",
        targetPersona: "maestro",
        type: "dispatch",
        status: "pending",
        artifacts: ["prd.md"],
        task: "Draft PRD",
        context: "New feature",
        constraints: ["Use template"]
      },
      "s-20260223-231530",
      new Date("2026-02-23T23:15:42Z")
    );

    await expect(canProgressPipeline(envelope.filePath)).resolves.toBe(false);
  });
});
