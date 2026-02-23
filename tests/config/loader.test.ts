import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/loader.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-config-test-"));
  tempDirs.push(dir);
  return dir;
};

const writeProjectConfig = async (cwd: string, content: string): Promise<void> => {
  await mkdir(join(cwd, ".sinfonia"), { recursive: true });
  await writeFile(join(cwd, ".sinfonia/config.yaml"), content, "utf8");
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

describe("loadConfig", () => {
  it("returns defaults when project config is missing", async () => {
    const cwd = await makeTempDir();

    const config = await loadConfig({ cwd });

    expect(config.version).toBe("0.1");
    expect(config.defaultOrchestrator).toBe("maestro");
    expect(config.skillLevel).toBe("intermediate");
    expect(config.enforcementStrictness).toBe("medium");
    expect(config.projectName).toBe("");
    expect(config.userName).toBe("");
  });

  it("loads values from project config", async () => {
    const cwd = await makeTempDir();
    await writeProjectConfig(
      cwd,
      [
        'version: "1.2"',
        "default_orchestrator: amadeus",
        "project_name: Example App",
        "user_name: Alice",
        "skill_level: expert",
        "enforcement_strictness: high"
      ].join("\n")
    );

    const config = await loadConfig({ cwd });

    expect(config.version).toBe("1.2");
    expect(config.defaultOrchestrator).toBe("amadeus");
    expect(config.projectName).toBe("Example App");
    expect(config.userName).toBe("Alice");
    expect(config.skillLevel).toBe("expert");
    expect(config.enforcementStrictness).toBe("high");
  });

  it("applies environment variable overrides", async () => {
    const cwd = await makeTempDir();
    await writeProjectConfig(cwd, "skill_level: beginner\n");

    const config = await loadConfig({
      cwd,
      env: {
        SINFONIA_SKILL_LEVEL: "expert",
        SINFONIA_PROJECT_NAME: "Env Project"
      }
    });

    expect(config.skillLevel).toBe("expert");
    expect(config.projectName).toBe("Env Project");
  });

  it("applies CLI flags with highest precedence", async () => {
    const cwd = await makeTempDir();
    await writeProjectConfig(cwd, "skill_level: beginner\nproject_name: File Project\n");

    const config = await loadConfig({
      cwd,
      env: {
        SINFONIA_SKILL_LEVEL: "intermediate",
        SINFONIA_PROJECT_NAME: "Env Project"
      },
      flags: {
        skillLevel: "expert",
        projectName: "Flag Project"
      }
    });

    expect(config.skillLevel).toBe("expert");
    expect(config.projectName).toBe("Flag Project");
  });

  it("rejects unknown keys with helpful errors", async () => {
    const cwd = await makeTempDir();
    await writeProjectConfig(cwd, "unknown_option: value\n");

    await expect(loadConfig({ cwd })).rejects.toThrow('Unknown config key "unknown_option"');
  });

  it("rejects invalid enum values with source in error", async () => {
    const cwd = await makeTempDir();
    await writeProjectConfig(cwd, "skill_level: master\n");

    await expect(loadConfig({ cwd })).rejects.toThrow("Invalid value for \"skill_level\"");
  });
});
