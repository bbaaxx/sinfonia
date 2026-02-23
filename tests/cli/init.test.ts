import { access, chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FRAMEWORK_PERSONAS, INTERACTIVE_PERSONAS, initProject } from "../../src/cli/init.js";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-init-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

describe("initProject", () => {
  it("creates directory structure, personas, stubs, plugin, and config", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    await expect(stat(join(cwd, ".sinfonia/agents"))).resolves.toBeDefined();
    await expect(stat(join(cwd, ".sinfonia/handoffs"))).resolves.toBeDefined();
    await expect(stat(join(cwd, ".sinfonia/memory"))).resolves.toBeDefined();

    await expect(readFile(join(cwd, ".sinfonia/config.yaml"), "utf8")).resolves.toContain("version:");

    for (const persona of FRAMEWORK_PERSONAS) {
      await expect(readFile(join(cwd, ".sinfonia/agents", `${persona.id}.md`), "utf8")).resolves.toContain(
        `id: ${persona.id}`
      );
    }

    for (const personaId of INTERACTIVE_PERSONAS) {
      await expect(readFile(join(cwd, ".opencode/agent", `sinfonia-${personaId}.md`), "utf8")).resolves.toContain(
        `sinfonia-${personaId}`
      );
    }

    const subagentOnly = FRAMEWORK_PERSONAS.filter(({ id }) => !INTERACTIVE_PERSONAS.includes(id));
    for (const persona of subagentOnly) {
      await expect(exists(join(cwd, ".opencode/agent", `sinfonia-${persona.id}.md`))).resolves.toBe(false);
    }

    await expect(readFile(join(cwd, ".opencode/plugins/sinfonia-enforcement.ts"), "utf8")).resolves.toContain(
      "sinfonia enforcement"
    );
    await expect(readFile(join(cwd, "opencode.json"), "utf8")).resolves.toContain("sinfonia");
  });

  it("is idempotent and preserves customized files", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);
    await writeFile(join(cwd, ".sinfonia/config.yaml"), "custom: true\n", "utf8");
    await writeFile(join(cwd, ".opencode/agent/sinfonia-maestro.md"), "custom-stub\n", "utf8");

    await initProject(cwd);

    await expect(readFile(join(cwd, ".sinfonia/config.yaml"), "utf8")).resolves.toBe("custom: true\n");
    await expect(readFile(join(cwd, ".opencode/agent/sinfonia-maestro.md"), "utf8")).resolves.toBe("custom-stub\n");
  });

  it("fails when .sinfonia exists as a file", async () => {
    const cwd = await makeTempDir();
    await writeFile(join(cwd, ".sinfonia"), "not-a-directory", "utf8");

    await expect(initProject(cwd)).rejects.toThrow(".sinfonia exists as a file");
  });

  it("fails with permission error when project root is not writable", async () => {
    if (process.platform === "win32") {
      return;
    }

    const cwd = await makeTempDir();
    const locked = join(cwd, "locked");
    await mkdir(locked);
    await chmod(locked, 0o500);

    try {
      await expect(initProject(locked)).rejects.toThrow(/permission|EACCES|EPERM/i);
    } finally {
      await chmod(locked, 0o700);
    }
  });
});
