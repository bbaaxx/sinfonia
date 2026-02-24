import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We mock checkGitDiff so we can control what files appear modified
vi.mock("../../../src/enforcement/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/enforcement/utils.js")>();
  return {
    ...actual,
    checkGitDiff: vi.fn(),
  };
});

import { checkGitDiff } from "../../../src/enforcement/utils.js";
import { createTddEnforcerHandler } from "../../../src/enforcement/rules/enf-001-tdd.js";

const mockCheckGitDiff = vi.mocked(checkGitDiff);

describe("ENF-001 TDD Enforcer", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createTddEnforcerHandler>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-001-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createTddEnforcerHandler(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ─── Skip cases ─────────────────────────────────────────────────────────────

  it("returns undefined for non-write tools", async () => {
    mockCheckGitDiff.mockResolvedValue([]);
    const result = await handler({ tool: "read_file", params: { path: "src/foo.ts" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing a .json file (skip extension)", async () => {
    mockCheckGitDiff.mockResolvedValue(["package.json"]);
    const result = await handler({ tool: "write_file", params: { path: "package.json" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing a .md file (skip extension)", async () => {
    mockCheckGitDiff.mockResolvedValue(["README.md"]);
    const result = await handler({ tool: "write_file", params: { path: "README.md" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing a .yaml file (skip extension)", async () => {
    mockCheckGitDiff.mockResolvedValue(["config.yaml"]);
    const result = await handler({ tool: "write_file", params: { path: "config.yaml" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing a test file itself", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.test.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.test.ts" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing a spec file", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.spec.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.spec.ts" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing to dist/", async () => {
    mockCheckGitDiff.mockResolvedValue([]);
    const result = await handler({ tool: "write_file", params: { path: "dist/foo.js" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when writing to .opencode/", async () => {
    mockCheckGitDiff.mockResolvedValue([]);
    const result = await handler({ tool: "write_file", params: { path: ".opencode/plugins/foo.ts" } });
    expect(result).toBeUndefined();
  });

  // ─── Pass cases (test file present in diff) ──────────────────────────────────

  it("returns undefined when sibling test file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.ts", "src/foo.test.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.ts" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when tests/ mirror test file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/bar.ts", "tests/bar.test.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/bar.ts" } });
    expect(result).toBeUndefined();
  });

  it("returns undefined when spec file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/baz.ts", "src/baz.spec.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/baz.ts" } });
    expect(result).toBeUndefined();
  });

  // ─── Block cases (no test file in diff) ──────────────────────────────────────

  it("blocks write_file when no test file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.ts" } });
    expect(result).toBeDefined();
    expect(result?.block).toBe(true);
    expect(result?.message).toContain("ENF-001");
  });

  it("blocks edit_file when no test file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/service.ts"]);
    const result = await handler({ tool: "edit_file", params: { path: "src/service.ts" } });
    expect(result).toBeDefined();
    expect(result?.block).toBe(true);
  });

  it("blocks create_file when no test file is in git diff", async () => {
    mockCheckGitDiff.mockResolvedValue([]);
    const result = await handler({ tool: "create_file", params: { path: "src/new-module.ts" } });
    expect(result).toBeDefined();
    expect(result?.block).toBe(true);
  });

  it("block message includes the source file path", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.ts" } });
    expect(result?.message).toContain("src/foo.ts");
  });

  it("block message includes candidate test paths", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.ts"]);
    const result = await handler({ tool: "write_file", params: { path: "src/foo.ts" } });
    expect(result?.message).toContain("src/foo.test.ts");
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────────

  it("returns undefined gracefully when checkGitDiff throws", async () => {
    mockCheckGitDiff.mockRejectedValue(new Error("git not found"));
    // Should not throw — handler catches errors
    const result = await handler({ tool: "write_file", params: { path: "src/foo.ts" } });
    // When git diff fails, we cannot verify — should pass through (non-blocking)
    expect(result).toBeUndefined();
  });

  it("handles tool params with 'file_path' key instead of 'path'", async () => {
    mockCheckGitDiff.mockResolvedValue(["src/foo.ts"]);
    const result = await handler({ tool: "write_file", params: { file_path: "src/foo.ts" } });
    expect(result?.block).toBe(true);
  });
});
