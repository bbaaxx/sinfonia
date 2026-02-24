import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WORKFLOW_STUBS } from "../../src/cli/generate-stubs.js";
import { initProject } from "../../src/cli/init.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-stub-test-"));
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

describe("workflow command stubs and skill packaging", () => {
  it("generates opencode command stubs with valid format and targets", async () => {
    const cwd = await makeTempDir();
    await initProject(cwd);

    for (const workflow of WORKFLOW_STUBS) {
      const commandPath = join(cwd, ".opencode/command", `${workflow.commandName}.md`);
      const content = await readFile(commandPath, "utf8");

      expect(content.startsWith("---\n")).toBe(true);
      expect(content).toContain(`name: ${workflow.commandName}`);
      expect(content).toContain("description:");
      expect(content).toContain("@sinfonia-maestro");
      expect(content).toContain(`workflow \`${workflow.workflowId}\``);
      expect(content).toContain("$ARGUMENTS");
    }
  });

  it("generates workflow skill packages", async () => {
    const cwd = await makeTempDir();
    await initProject(cwd);

    for (const workflow of WORKFLOW_STUBS) {
      const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");
      const content = await readFile(skillPath, "utf8");

      expect(content).toContain(`# ${workflow.skillName}`);
      expect(content).toContain("## Steps");
      expect(content).toContain("1.");
      expect(content).toContain(`workflow \`${workflow.workflowId}\``);
    }
  });

  it("re-generates command stubs but preserves customized skills", async () => {
    const cwd = await makeTempDir();
    await initProject(cwd);

    const workflow = WORKFLOW_STUBS[0];
    const commandPath = join(cwd, ".opencode/command", `${workflow.commandName}.md`);
    const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");

    await writeFile(commandPath, "custom-command\n", "utf8");
    await mkdir(join(cwd, ".opencode/skills", workflow.skillName), { recursive: true });
    await writeFile(skillPath, "custom-skill\n", "utf8");

    await initProject(cwd);

    await expect(readFile(commandPath, "utf8")).resolves.not.toBe("custom-command\n");
    await expect(readFile(skillPath, "utf8")).resolves.toBe("custom-skill\n");
  });
});
