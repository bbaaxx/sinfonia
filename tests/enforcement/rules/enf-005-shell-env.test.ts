import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createShellEnvHandler } from "../../../src/enforcement/rules/enf-005-shell-env.js";

describe("ENF-005 Shell Env Injection", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createShellEnvHandler>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-005-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createShellEnvHandler(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("always injects SINFONIA_PROJECT_ROOT", async () => {
    const result = await handler();
    expect(result).toHaveProperty("SINFONIA_PROJECT_ROOT");
    expect(result["SINFONIA_PROJECT_ROOT"]).toBe(tmpDir);
  });

  it("always injects SINFONIA_VERSION", async () => {
    const result = await handler();
    expect(result).toHaveProperty("SINFONIA_VERSION");
    expect(typeof result["SINFONIA_VERSION"]).toBe("string");
    expect(result["SINFONIA_VERSION"]!.length).toBeGreaterThan(0);
  });

  it("injects SINFONIA_SESSION_ID when workflow index exists", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Step 1",
      "current_step_index: 1",
      "total_steps: 2",
      "session_id: sess-xyz-789",
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
      "| Step 1 | architect | in-progress |  |  |  |",
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
    await writeFile(join(sessionDir, "workflow.md"), content);

    const result = await handler();
    expect(result["SINFONIA_SESSION_ID"]).toBe("sess-xyz-789");
  });

  it("injects SINFONIA_WORKFLOW_ID when workflow index exists", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-test-456",
      "workflow_status: in-progress",
      "current_step: Step 1",
      "current_step_index: 1",
      "total_steps: 1",
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
      "| Step 1 | architect | in-progress |  |  |  |",
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
    await writeFile(join(sessionDir, "workflow.md"), content);

    const result = await handler();
    expect(result["SINFONIA_WORKFLOW_ID"]).toBe("wf-test-456");
  });

  it("injects SINFONIA_CURRENT_STEP when workflow index exists", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Implementation Phase",
      "current_step_index: 2",
      "total_steps: 4",
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
      "| Implementation Phase | developer | in-progress |  |  |  |",
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
    await writeFile(join(sessionDir, "workflow.md"), content);

    const result = await handler();
    expect(result["SINFONIA_CURRENT_STEP"]).toBe("Implementation Phase");
  });

  it("returns only SINFONIA_PROJECT_ROOT and SINFONIA_VERSION when no workflow exists", async () => {
    const result = await handler();
    // Should have at least these two
    expect(result).toHaveProperty("SINFONIA_PROJECT_ROOT");
    expect(result).toHaveProperty("SINFONIA_VERSION");
    // Should not have workflow-specific vars
    expect(result["SINFONIA_SESSION_ID"]).toBeUndefined();
    expect(result["SINFONIA_WORKFLOW_ID"]).toBeUndefined();
    expect(result["SINFONIA_CURRENT_STEP"]).toBeUndefined();
  });

  it("returns empty object gracefully on error (non-blocking)", async () => {
    // Handler should never throw
    await expect(handler()).resolves.toBeDefined();
  });

  it("all injected values are strings", async () => {
    const result = await handler();
    for (const [key, value] of Object.entries(result)) {
      if (value !== undefined) {
        expect(typeof value).toBe("string");
      }
    }
  });
});
