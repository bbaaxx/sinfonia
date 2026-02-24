import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createWorkflowIndex,
  readWorkflowIndex,
  updateWorkflowIndex,
  workflowIndexPath,
  writeWorkflowIndexAtomically
} from "../../src/workflow/index-manager.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-workflow-index-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("workflow index manager", () => {
  it("creates, reads, and updates workflow lifecycle", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231530";

    const created = await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "dev-story",
      goal: "Deliver story",
      steps: [
        { step: "analyze", persona: "coda" },
        { step: "implement", persona: "coda" }
      ],
      context: "Initial context"
    });

    expect(created.frontmatter.workflowStatus).toBe("created");
    expect(created.frontmatter.totalSteps).toBe(2);

    const filePath = workflowIndexPath(cwd, sessionId);
    const read = await readWorkflowIndex(filePath);
    expect(read.frontmatter.workflowId).toBe("dev-story");
    expect(read.goal).toContain("Deliver story");

    const updated = await updateWorkflowIndex(filePath, {
      workflowStatus: "in-progress",
      currentStep: "implement",
      currentStepIndex: 2
    });
    expect(updated.frontmatter.workflowStatus).toBe("in-progress");
    expect(updated.frontmatter.currentStep).toBe("implement");
    expect(updated.frontmatter.currentStepIndex).toBe(2);
  });

  it("enforces workflow status transitions", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231531";
    const filePath = workflowIndexPath(cwd, sessionId);

    await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "create-prd",
      goal: "Create PRD",
      steps: [{ step: "draft", persona: "libretto" }]
    });

    await updateWorkflowIndex(filePath, { workflowStatus: "in-progress" });
    await updateWorkflowIndex(filePath, { workflowStatus: "complete" });
    await expect(updateWorkflowIndex(filePath, { workflowStatus: "in-progress" })).rejects.toThrow(
      "Invalid workflow status transition"
    );
  });

  it("uses atomic write protocol and preserves original on simulated crash", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231532";
    const filePath = workflowIndexPath(cwd, sessionId);
    const original = "original-content\n";
    await mkdir(join(cwd, ".sinfonia/handoffs", sessionId), { recursive: true });
    await writeFile(filePath, original, "utf8");

    await expect(
      writeWorkflowIndexAtomically(filePath, "new-content\n", { simulateCrashBeforeRename: true })
    ).rejects.toThrow("Simulated crash before rename");

    await expect(readFile(filePath, "utf8")).resolves.toBe(original);
    await expect(access(join(cwd, ".sinfonia/handoffs", sessionId, ".workflow.md.tmp"))).resolves.toBeUndefined();
  });

  it("round-trips required frontmatter fields", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231533";

    await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "code-review",
      goal: "Review code",
      steps: [{ step: "assess", persona: "rondo" }]
    });

    const filePath = workflowIndexPath(cwd, sessionId);
    const content = await readFile(filePath, "utf8");
    expect(content).toContain("workflow_id:");
    expect(content).toContain("workflow_status:");
    expect(content).toContain("current_step:");
    expect(content).toContain("current_step_index:");
    expect(content).toContain("total_steps:");
    expect(content).toContain("session_id:");
    expect(content).toContain("created_at:");
    expect(content).toContain("updated_at:");

    const parsed = await readWorkflowIndex(filePath);
    expect(parsed.frontmatter.sessionId).toBe(sessionId);
    expect(parsed.frontmatter.workflowId).toBe("code-review");
  });
});
