import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  matchesPattern,
  resolveTestPath,
  formatBlockMessage,
  findLatestWorkflowIndex,
  parseWorkflowIndexFile,
} from "../../src/enforcement/utils.js";

// ─── matchesPattern ───────────────────────────────────────────────────────────

describe("matchesPattern", () => {
  it("matches exact filename", () => {
    expect(matchesPattern(".env", ".env")).toBe(true);
  });

  it("matches glob with leading *", () => {
    expect(matchesPattern("secrets.key", "*.key")).toBe(true);
  });

  it("matches glob with leading **", () => {
    expect(matchesPattern("a/b/secrets/file.txt", "**/secrets/**")).toBe(true);
  });

  it("does not match unrelated path", () => {
    expect(matchesPattern("src/index.ts", "*.key")).toBe(false);
  });

  it("matches .env.local against .env.*", () => {
    expect(matchesPattern(".env.local", ".env.*")).toBe(true);
  });

  it("matches nested path against **/secrets/**", () => {
    expect(matchesPattern("config/secrets/db.json", "**/secrets/**")).toBe(true);
  });

  it("does not match .env against *.key", () => {
    expect(matchesPattern(".env", "*.key")).toBe(false);
  });
});

// ─── resolveTestPath ─────────────────────────────────────────────────────────

describe("resolveTestPath", () => {
  it("resolves src/foo.ts to src/foo.test.ts", () => {
    const result = resolveTestPath("src/foo.ts");
    expect(result).toContain("src/foo.test.ts");
  });

  it("resolves src/bar/baz.ts to src/bar/baz.test.ts and tests/bar/baz.test.ts", () => {
    const result = resolveTestPath("src/bar/baz.ts");
    expect(result).toContain("src/bar/baz.test.ts");
    expect(result).toContain("tests/bar/baz.test.ts");
  });

  it("returns empty array for .json files (skip pattern)", () => {
    const result = resolveTestPath("config.json");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for .md files (skip pattern)", () => {
    const result = resolveTestPath("README.md");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for .yaml files (skip pattern)", () => {
    const result = resolveTestPath("config.yaml");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for test files themselves", () => {
    expect(resolveTestPath("src/foo.test.ts")).toHaveLength(0);
    expect(resolveTestPath("src/foo.spec.ts")).toHaveLength(0);
    expect(resolveTestPath("tests/foo.test.ts")).toHaveLength(0);
  });

  it("returns empty array for dist/ paths", () => {
    expect(resolveTestPath("dist/foo.js")).toHaveLength(0);
  });

  it("returns empty array for node_modules/ paths", () => {
    expect(resolveTestPath("node_modules/foo/index.js")).toHaveLength(0);
  });

  it("returns empty array for .opencode/ paths", () => {
    expect(resolveTestPath(".opencode/plugins/foo.ts")).toHaveLength(0);
  });
});

// ─── formatBlockMessage ───────────────────────────────────────────────────────

describe("formatBlockMessage", () => {
  it("includes rule ID in output", () => {
    const msg = formatBlockMessage("ENF-001", "Write test first", "src/foo.ts");
    expect(msg).toContain("ENF-001");
  });

  it("includes reason in output", () => {
    const msg = formatBlockMessage("ENF-001", "Write test first", "src/foo.ts");
    expect(msg).toContain("Write test first");
  });

  it("includes file path in output", () => {
    const msg = formatBlockMessage("ENF-001", "Write test first", "src/foo.ts");
    expect(msg).toContain("src/foo.ts");
  });

  it("works without file path", () => {
    const msg = formatBlockMessage("ENF-002", "Secret file detected");
    expect(msg).toContain("ENF-002");
    expect(msg).toContain("Secret file detected");
  });
});

// ─── findLatestWorkflowIndex ──────────────────────────────────────────────────

describe("findLatestWorkflowIndex", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdir(join(tmpdir(), `enf-utils-test-${Date.now()}`), { recursive: true }).then(
      () => join(tmpdir(), `enf-utils-test-${Date.now() - 1}`)
    );
    tmpDir = join(tmpdir(), `enf-utils-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no .sinfonia/handoffs directory exists", async () => {
    const result = await findLatestWorkflowIndex(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null when handoffs directory is empty", async () => {
    await mkdir(join(tmpDir, ".sinfonia/handoffs"), { recursive: true });
    const result = await findLatestWorkflowIndex(tmpDir);
    expect(result).toBeNull();
  });

  it("returns path to workflow.md when one session exists", async () => {
    const sessionDir = join(tmpDir, ".sinfonia/handoffs/session-abc");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "workflow.md"), "---\nworkflow_id: test\n---\n");
    const result = await findLatestWorkflowIndex(tmpDir);
    expect(result).toBe(join(sessionDir, "workflow.md"));
  });

  it("returns the most recently modified workflow.md when multiple sessions exist", async () => {
    const dir1 = join(tmpDir, ".sinfonia/handoffs/session-old");
    const dir2 = join(tmpDir, ".sinfonia/handoffs/session-new");
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir1, "workflow.md"), "old");
    // Small delay to ensure different mtime
    await new Promise((r) => setTimeout(r, 10));
    await writeFile(join(dir2, "workflow.md"), "new");
    const result = await findLatestWorkflowIndex(tmpDir);
    expect(result).toBe(join(dir2, "workflow.md"));
  });
});

// ─── parseWorkflowIndexFile ───────────────────────────────────────────────────

describe("parseWorkflowIndexFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-parse-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null for non-existent file", async () => {
    const result = await parseWorkflowIndexFile(join(tmpDir, "missing.md"));
    expect(result).toBeNull();
  });

  it("returns null for file with invalid frontmatter", async () => {
    const filePath = join(tmpDir, "workflow.md");
    await writeFile(filePath, "no frontmatter here");
    const result = await parseWorkflowIndexFile(filePath);
    expect(result).toBeNull();
  });

  it("parses a valid workflow index file", async () => {
    const filePath = join(tmpDir, "workflow.md");
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
      "Some context",
    ].join("\n");
    await writeFile(filePath, content);
    const result = await parseWorkflowIndexFile(filePath);
    expect(result).not.toBeNull();
    expect(result?.frontmatter.workflowId).toBe("wf-001");
    expect(result?.frontmatter.workflowStatus).toBe("in-progress");
    expect(result?.steps).toHaveLength(2);
    expect(result?.steps[0]?.status).toBe("in-progress");
  });
});
