import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createSecretProtectionHandler } from "../../../src/enforcement/rules/enf-002-secrets.js";

describe("ENF-002 Secret Protection", () => {
  let tmpDir: string;
  let handler: ReturnType<typeof createSecretProtectionHandler>;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `enf-002-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    handler = createSecretProtectionHandler(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ─── Blocked paths ───────────────────────────────────────────────────────────

  it("blocks read of .env", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env" } });
    expect(result?.block).toBe(true);
    expect(result?.message).toContain("ENF-002");
  });

  it("blocks read of .env.local", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env.local" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of .env.production", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env.production" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of secrets.key", async () => {
    const result = await handler({ tool: "read_file", params: { path: "secrets.key" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of private.pem", async () => {
    const result = await handler({ tool: "read_file", params: { path: "private.pem" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of credentials.json", async () => {
    const result = await handler({ tool: "read_file", params: { path: "credentials.json" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of nested credentials file", async () => {
    const result = await handler({ tool: "read_file", params: { path: "config/credentials.yaml" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of file in secrets/ directory", async () => {
    const result = await handler({ tool: "read_file", params: { path: "config/secrets/db.json" } });
    expect(result?.block).toBe(true);
  });

  it("blocks read of .opencode/plugins/ file", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".opencode/plugins/my-plugin.ts" } });
    expect(result?.block).toBe(true);
  });

  it("blocks write of .env", async () => {
    const result = await handler({ tool: "write_file", params: { path: ".env" } });
    expect(result?.block).toBe(true);
  });

  it("blocks edit of credentials.json", async () => {
    const result = await handler({ tool: "edit_file", params: { path: "credentials.json" } });
    expect(result?.block).toBe(true);
  });

  // ─── Allowed paths ───────────────────────────────────────────────────────────

  it("allows read of src/index.ts", async () => {
    const result = await handler({ tool: "read_file", params: { path: "src/index.ts" } });
    expect(result).toBeUndefined();
  });

  it("allows read of package.json", async () => {
    const result = await handler({ tool: "read_file", params: { path: "package.json" } });
    expect(result).toBeUndefined();
  });

  it("allows read of .env.example (not a real secret)", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env.example" } });
    expect(result).toBeUndefined();
  });

  it("allows read of .env.template", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env.template" } });
    expect(result).toBeUndefined();
  });

  it("allows non-file tools (bash, etc.)", async () => {
    const result = await handler({ tool: "run_bash", params: { command: "ls" } });
    expect(result).toBeUndefined();
  });

  // ─── Message quality ─────────────────────────────────────────────────────────

  it("block message includes the file path", async () => {
    const result = await handler({ tool: "read_file", params: { path: ".env.production" } });
    expect(result?.message).toContain(".env.production");
  });

  it("block message includes ENF-002 rule ID", async () => {
    const result = await handler({ tool: "read_file", params: { path: "secrets.key" } });
    expect(result?.message).toContain("ENF-002");
  });

  // ─── file_path param key ─────────────────────────────────────────────────────

  it("handles file_path param key", async () => {
    const result = await handler({ tool: "read_file", params: { file_path: ".env" } });
    expect(result?.block).toBe(true);
  });
});
