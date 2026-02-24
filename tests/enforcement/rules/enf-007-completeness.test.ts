import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createCompletenessWarningHandler } from "../../../src/enforcement/rules/enf-007-completeness.js";

describe("ENF-007 Session-End Completeness Warning", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createCompletenessWarningHandler>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-007-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createCompletenessWarningHandler(tmpDir);
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does nothing when no workflow index exists", async () => {
    await handler({});
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("does nothing when all steps are completed", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = buildWorkflowContent([
      { step: "Step 1", persona: "architect", status: "completed" },
      { step: "Step 2", persona: "developer", status: "completed" },
    ]);
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("emits console.warn when workflow has pending steps", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = buildWorkflowContent([
      { step: "Step 1", persona: "architect", status: "completed" },
      { step: "Step 2", persona: "developer", status: "pending" },
    ]);
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("emits console.warn when workflow has in-progress steps", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = buildWorkflowContent([
      { step: "Step 1", persona: "architect", status: "in-progress" },
    ]);
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("warning message contains ENF-007 rule ID", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = buildWorkflowContent([
      { step: "Step 1", persona: "architect", status: "pending" },
    ]);
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    const warnArg = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnArg).toContain("ENF-007");
  });

  it("warning message lists incomplete step names", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = buildWorkflowContent([
      { step: "Design Phase", persona: "architect", status: "pending" },
      { step: "Build Phase", persona: "developer", status: "pending" },
    ]);
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    const warnArg = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnArg).toContain("Design Phase");
    expect(warnArg).toContain("Build Phase");
  });

  it("does not throw when workflow file is malformed", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "workflow.md"), "malformed content");

    await expect(handler({})).resolves.not.toThrow();
  });

  it("does not throw when handoffs directory is missing", async () => {
    await expect(handler({})).resolves.not.toThrow();
  });
});

// ─── Test helpers ─────────────────────────────────────────────────────────────

function buildWorkflowContent(
  steps: Array<{ step: string; persona: string; status: string }>
): string {
  const stepRows = steps
    .map((s) => `| ${s.step} | ${s.persona} | ${s.status} |  |  |  |`)
    .join("\n");

  return [
    "---",
    "workflow_id: wf-001",
    "workflow_status: in-progress",
    "current_step: Step 1",
    "current_step_index: 1",
    `total_steps: ${steps.length}`,
    "session_id: sess-001",
    "created_at: 2026-01-01T00:00:00.000Z",
    "updated_at: 2026-01-01T00:00:00.000Z",
    "---",
    "",
    "## Goal",
    "Build something",
    "",
    "## Steps",
    "| Step | Persona | Status | Started At | Completed At | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    stepRows,
    "",
    "## Artifacts",
    "| Name | Type | Status | Updated At | Notes |",
    "| --- | --- | --- | --- | --- |",
    "",
    "## Decisions",
    "| Timestamp | Handoff ID | Decision | Reviewer | Note |",
    "| --- | --- | --- | --- | --- |",
    "",
    "## Sessions",
    "| Session ID | Started At | Last Active At | Status |",
    "| --- | --- | --- | --- |",
    "",
    "## Context",
    "",
  ].join("\n");
}
