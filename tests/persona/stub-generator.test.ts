import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PERSONA_PROFILES,
  generateAllArtifacts,
  generateStub
} from "../../src/persona/stub-generator.js";
import type { LoadedPersona } from "../../src/persona/types.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-stub-gen-test-"));
  tempDirs.push(dir);
  return dir;
};

const makeLoadedPersona = (id: string): LoadedPersona => ({
  id,
  sourcePath: `/fake/agents/${id}.md`,
  sourceType: "framework",
  frontmatter: { id, name: id, role: "Role", mode: id === "maestro" ? "primary" : "subagent" },
  body: `## Identity\nTest persona ${id}.`
});

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("PERSONA_PROFILES", () => {
  it("has all 6 personas with correct modes", () => {
    expect(PERSONA_PROFILES).toHaveLength(6);

    const maestro = PERSONA_PROFILES.find((p) => p.id === "maestro");
    expect(maestro).toBeDefined();
    expect(maestro?.mode).toBe("primary");

    const subagents = PERSONA_PROFILES.filter((p) => p.id !== "maestro");
    expect(subagents).toHaveLength(5);
    for (const profile of subagents) {
      expect(profile.mode).toBe("subagent");
    }
  });

  it("includes all expected persona IDs", () => {
    const ids = PERSONA_PROFILES.map((p) => p.id);
    expect(ids).toContain("maestro");
    expect(ids).toContain("libretto");
    expect(ids).toContain("amadeus");
    expect(ids).toContain("coda");
    expect(ids).toContain("rondo");
    expect(ids).toContain("metronome");
  });
});

describe("generateStub", () => {
  it("produces valid opencode agent Markdown structure", () => {
    const persona = makeLoadedPersona("maestro");
    const stub = generateStub({ persona, opencodeDir: "/fake/opencode" });

    expect(stub).toContain("---");
    expect(stub).toContain("name: sinfonia-maestro");
    expect(stub).toContain("prompt:");
    expect(stub).toContain("file: .sinfonia/agents/maestro.md");
  });

  it("references the correct persona ID in the stub", () => {
    for (const profile of PERSONA_PROFILES) {
      const persona = makeLoadedPersona(profile.id);
      const stub = generateStub({ persona, opencodeDir: "/fake" });
      expect(stub).toContain(`sinfonia-${profile.id}`);
      expect(stub).toContain(`.sinfonia/agents/${profile.id}.md`);
    }
  });
});

describe("generateAllArtifacts", () => {
  const validPersonaMd = (id: string): string => `---
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
}`;

  it("generates stub files for all 6 personas", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    for (const profile of PERSONA_PROFILES) {
      await expect(
        access(join(cwd, ".opencode/agent", `sinfonia-${profile.id}.md`))
      ).resolves.toBeUndefined();
    }
  });

  it("is idempotent — does not overwrite existing persona source files", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(frameworkDir, { recursive: true });
    await mkdir(join(cwd, ".sinfonia/agents"), { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    // Write a custom override for maestro
    const customContent = validPersonaMd("maestro").replace("name: maestro", "name: custom-maestro");
    await writeFile(join(cwd, ".sinfonia/agents/maestro.md"), customContent, "utf8");

    // Run twice
    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });
    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    // Custom persona file must be unchanged
    const afterContent = await readFile(join(cwd, ".sinfonia/agents/maestro.md"), "utf8");
    expect(afterContent).toContain("name: custom-maestro");
  });

  it("does not write opencode.json (init.ts owns that responsibility)", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    const { mkdir, access: fsAccess } = await import("node:fs/promises");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    // opencode.json must NOT be written by generateAllArtifacts
    await expect(fsAccess(join(cwd, "opencode.json"))).rejects.toThrow();
  });
});
