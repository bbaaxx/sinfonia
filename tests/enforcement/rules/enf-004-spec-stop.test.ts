import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createSpecStopGuardHandler } from "../../../src/enforcement/rules/enf-004-spec-stop.js";

describe("ENF-004 Spec Stop Guard", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createSpecStopGuardHandler>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-004-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createSpecStopGuardHandler(tmpDir);
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
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Step 2",
      "current_step_index: 2",
      "total_steps: 2",
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
      "| Step 1 | architect | completed | 2026-01-01 | 2026-01-01 |  |",
      "| Step 2 | developer | completed | 2026-01-01 | 2026-01-01 |  |",
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

    await handler({});
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("emits console.warn when workflow has incomplete steps", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Step 1",
      "current_step_index: 1",
      "total_steps: 3",
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
      "",
    ].join("\n");
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnArg = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnArg).toContain("ENF-004");
  });

  it("warning includes count of incomplete steps", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    const content = [
      "---",
      "workflow_id: wf-001",
      "workflow_status: in-progress",
      "current_step: Step 1",
      "current_step_index: 1",
      "total_steps: 3",
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
      "| Step 1 | architect | pending |  |  |  |",
      "| Step 2 | developer | pending |  |  |  |",
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
      "",
    ].join("\n");
    await writeFile(join(sessionDir, "workflow.md"), content);

    await handler({});
    const warnArg = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(warnArg).toContain("3");
  });

  it("does not throw when workflow file is malformed", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "workflow.md"), "malformed content");

    await expect(handler({})).resolves.not.toThrow();
  });
});
