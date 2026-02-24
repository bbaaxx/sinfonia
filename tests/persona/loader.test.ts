import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PERSONA_PROFILES,
  generatePersonaArtifacts,
  loadPersona
} from "../../src/persona/loader.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-persona-loader-test-"));
  tempDirs.push(dir);
  return dir;
};

const validPersona = (id: string): string => `---
persona_id: ${id}
name: ${id}
role: Role
description: Description
persona_mode: ${id === "maestro" ? "interactive" : "subagent"}
---

## Identity
Identity paragraph.

## Comm Style
- concise

## Role Def
### Responsibilities
- one
- two
- three

### Boundaries
- b1 -> x
- b2 -> y

## Principles
1. **One.** Text
2. **Two.** Text
3. **Three.** Text

## Critical Actions
1. **ALWAYS** do one thing.

## Task Protocol
### Accepts
- Input

### Produces
- Output

### Completion Criteria
- Done one
- Done two
${
  id === "maestro"
    ? `
## Activation Sequence
1. Start
2. Check
3. Plan
4. Execute
5. Verify
6. Summarize
7. Exit

## Menu
1. [MH] Main
2. [CH] Continue
3. [DA] Done
`
    : ""
}
`;

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("persona loader and artifact generation", () => {
  it("loads persona from override first and falls back to framework", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(join(cwd, ".sinfonia/agents"), { recursive: true });
    await mkdir(frameworkDir, { recursive: true });

    await writeFile(join(frameworkDir, "maestro.md"), validPersona("maestro"), "utf8");
    await writeFile(join(cwd, ".sinfonia/agents/maestro.md"), validPersona("maestro").replace("name: maestro", "name: override"), "utf8");

    const loadedOverride = await loadPersona({ cwd, personaId: "maestro", frameworkAgentsDir: frameworkDir });
    expect(loadedOverride.sourceType).toBe("override");

    await rm(join(cwd, ".sinfonia/agents/maestro.md"));
    const loadedFallback = await loadPersona({ cwd, personaId: "maestro", frameworkAgentsDir: frameworkDir });
    expect(loadedFallback.sourceType).toBe("framework");
  });

  it("rejects invalid personas via validator", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(frameworkDir, { recursive: true });
    await writeFile(join(frameworkDir, "maestro.md"), "not-valid", "utf8");

    await expect(loadPersona({ cwd, personaId: "maestro", frameworkAgentsDir: frameworkDir })).rejects.toThrow(
      "Persona validation failed"
    );
  });

  it("all 6 real framework persona files load successfully with 0 validation errors", async () => {
    const cwd = await makeTempDir();
    // The real framework agents directory relative to this test file
    const frameworkDir = join(new URL(import.meta.url).pathname, "../../../agents");

    for (const profile of PERSONA_PROFILES) {
      const loaded = await loadPersona({
        cwd,
        personaId: profile.id,
        frameworkAgentsDir: frameworkDir
      });
      expect(loaded).toBeDefined();
      expect(loaded.id).toBe(profile.id);
      expect(loaded.sourceType).toBe("framework");
      expect(loaded.frontmatter).toBeDefined();
      expect(loaded.body).toBeTruthy();
    }
  });

  it("generates stubs and opencode config entries for all personas", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersona(profile.id), "utf8");
    }

    const personas = await generatePersonaArtifacts({
      cwd,
      frameworkAgentsDir: frameworkDir,
      sidecarMemoryEnabled: true
    });

    expect(personas).toHaveLength(6);
    for (const profile of PERSONA_PROFILES) {
      await expect(access(join(cwd, ".opencode/agent", `sinfonia-${profile.id}.md`))).resolves.toBeUndefined();
    }

    const config = JSON.parse(await readFile(join(cwd, "opencode.json"), "utf8")) as {
      agents: Record<string, { mode: string; permissions: string[] }>;
    };
    expect(Object.keys(config.agents).filter((key) => key.startsWith("sinfonia-")).length).toBe(6);
    expect(config.agents["sinfonia-maestro"].mode).toBe("primary");
    expect(config.agents["sinfonia-coda"].permissions).toContain("bash");
    expect(config.agents["sinfonia-rondo"].permissions).toEqual(["read", "bash"]);
    expect(config.agents["sinfonia-metronome"].permissions).toEqual(["read"]);
  });
});
