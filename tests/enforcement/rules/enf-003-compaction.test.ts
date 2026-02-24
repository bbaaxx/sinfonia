import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createCompactionHandler } from "../../../src/enforcement/rules/enf-003-compaction.js";

describe("ENF-003 Compaction State Preservation", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createCompactionHandler>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-003-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createCompactionHandler(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns undefined when no workflow index exists", async () => {
    const result = await handler({});
    expect(result).toBeUndefined();
  });

  it("returns a context block when workflow index exists", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Step 2",
      "current_step_index: 2",
      "total_steps: 3",
      "session_id: sess-001",
      "created_at: 2026-01-01T00:00:00.000Z",
      "updated_at: 2026-01-01T00:00:00.000Z",
      "---",
      "",
      "## Goal",
      "Build something important",
      "",
      "## Steps",
      "| Step | Persona | Status | Started At | Completed At | Notes |",
      "| --- | --- | --- | --- | --- | --- |",
      "| Step 1 | architect | completed | 2026-01-01 | 2026-01-01 |  |",
      "| Step 2 | developer | in-progress |  |  |  |",
      "| Step 3 | reviewer | pending |  |  |  |",
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
      "Some important context",
    ].join("\n");
    await writeFile(join(sessionDir, "workflow.md"), content);

    const result = await handler({});
    expect(result).toBeDefined();
    expect(result?.context).toBeDefined();
  });

  it("context block contains workflow ID", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-test-123",
      "workflow_status: in-progress",
      "current_step: Step 1",
      "current_step_index: 1",
      "total_steps: 2",
      "session_id: sess-001",
      "created_at: 2026-01-01T00:00:00.000Z",
      "updated_at: 2026-01-01T00:00:00.000Z",
      "---",
      "",
      "## Goal",
      "Test goal",
      "",
      "## Steps",
      "| Step | Persona | Status | Started At | Completed At | Notes |",
      "| --- | --- | --- | --- | --- | --- |",
      "| Step 1 | architect | in-progress |  |  |  |",
      "| Step 2 | developer | pending |  |  |  |",
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

    const result = await handler({});
    expect(result?.context).toContain("wf-test-123");
  });

  it("context block contains current step info", async () => {
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

    const result = await handler({});
    expect(result?.context).toContain("Implementation Phase");
  });

  it("context block is ≤200 words", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
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

    const result = await handler({});
    const wordCount = result?.context?.split(/\s+/).filter(Boolean).length ?? 0;
    expect(wordCount).toBeLessThanOrEqual(200);
  });

  it("does not throw when workflow file is malformed", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "workflow.md"), "malformed");

    await expect(handler({})).resolves.not.toThrow();
  });
});
