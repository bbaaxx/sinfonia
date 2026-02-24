import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { formatDelegationContext, updateWorkflowCurrentStep } from "../../src/persona/delegation.js";
import { generatePersonaArtifacts } from "../../src/persona/loader.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-delegation-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("delegation helpers", () => {
  it("formats dispatch envelope as delegation context", () => {
    const context = formatDelegationContext({
      sessionId: "s-20260223-230000",
      sequence: 7,
      sourcePersona: "maestro",
      targetPersona: "coda",
      task: "Implement story 2.2.2",
      context: "Story acceptance requires delegation roundtrip",
      constraints: ["Follow TDD", "Do not modify unrelated files"]
    });

    expect(context).toContain("Dispatch Envelope: s-20260223-230000#007");
    expect(context).toContain("Source: @sinfonia-maestro");
    expect(context).toContain("Target: @sinfonia-coda");
    expect(context).toContain("- Follow TDD");
  });

  it("updates workflow index active persona and current step", async () => {
    const cwd = await makeTempDir();
    const workflowPath = join(cwd, "workflow.md");
    await writeFile(workflowPath, "current_step: planning\n# Workflow\n", "utf8");

    await updateWorkflowCurrentStep(workflowPath, "coda", "implementation");

    const updated = await readFile(workflowPath, "utf8");
    expect(updated).toContain("active_persona: coda");
    expect(updated).toContain("current_step: implementation");
  });

  it("generates routing-capable opencode config entries", async () => {
    const cwd = await makeTempDir();
    await generatePersonaArtifacts({ cwd });

    const config = JSON.parse(await readFile(join(cwd, "opencode.json"), "utf8")) as {
      agents: Record<string, { routing: string }>;
    };

    expect(config.agents["sinfonia-maestro"].routing).toBe("@sinfonia-maestro");
    expect(config.agents["sinfonia-libretto"].routing).toBe("@sinfonia-libretto");
    expect(config.agents["sinfonia-coda"].routing).toBe("@sinfonia-coda");
  });
});
