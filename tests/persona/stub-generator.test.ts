import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  it("produces self-contained opencode agent with inline persona body", () => {
    const persona = makeLoadedPersona("maestro");
    const stub = generateStub({ persona, opencodeDir: "/fake/opencode" });

    expect(stub).toContain("---");
    expect(stub).toContain("name: sinfonia-maestro");
    expect(stub).toContain("mode: primary");
    expect(stub).toContain("customized: false");
    expect(stub).toContain("## Identity");
    expect(stub).toContain("Test persona maestro.");
    expect(stub).not.toContain("prompt:");
    expect(stub).not.toContain("file: agents/");
  });

  it("uses correct mode from PERSONA_PROFILES for each persona", () => {
    for (const profile of PERSONA_PROFILES) {
      const persona = makeLoadedPersona(profile.id);
      const stub = generateStub({ persona, opencodeDir: "/fake" });
      expect(stub).toContain(`name: sinfonia-${profile.id}`);
      expect(stub).toContain(`mode: ${profile.mode}`);
      expect(stub).toContain(`Test persona ${profile.id}.`);
    }
  });

  it("throws when persona has no matching PERSONA_PROFILES entry", () => {
    const unknownPersona = makeLoadedPersona("unknown");
    expect(() => generateStub({ persona: unknownPersona, opencodeDir: "/fake" })).toThrow(
      /No PERSONA_PROFILES entry found/
    );
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

  it("generates inline agent files for all 6 personas", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    for (const profile of PERSONA_PROFILES) {
      const filePath = join(cwd, ".opencode/agent", `sinfonia-${profile.id}.md`);
      await expect(access(filePath)).resolves.toBeUndefined();

      const content = await readFile(filePath, "utf8");
      expect(content).toContain(`name: sinfonia-${profile.id}`);
      expect(content).toContain(`mode: ${profile.mode}`);
      expect(content).toContain("customized: false");
      expect(content).toContain("## Identity");
      expect(content).not.toContain("prompt:");
      expect(content).not.toContain("file: agents/");
    }
  });

  it("is idempotent — does not overwrite existing persona source files", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
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

  it("preserves agent files marked customized: true", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(frameworkDir, { recursive: true });
    await mkdir(join(cwd, ".opencode/agent"), { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    // Pre-write a customized agent file for coda
    const customAgentContent = `---
name: sinfonia-coda
description: "My custom coda"
mode: subagent
customized: true
---

## Custom Identity
This is my custom coda agent.
`;
    await writeFile(
      join(cwd, ".opencode/agent/sinfonia-coda.md"),
      customAgentContent,
      "utf8"
    );

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    // Customized file must be preserved
    const codaContent = await readFile(join(cwd, ".opencode/agent/sinfonia-coda.md"), "utf8");
    expect(codaContent).toContain("customized: true");
    expect(codaContent).toContain("## Custom Identity");
    expect(codaContent).toContain("This is my custom coda agent.");

    // Non-customized files should still be generated normally
    const maestroContent = await readFile(join(cwd, ".opencode/agent/sinfonia-maestro.md"), "utf8");
    expect(maestroContent).toContain("customized: false");
    expect(maestroContent).toContain("## Identity");
  });

  it("does not write opencode.json (init.ts owns that responsibility)", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    // opencode.json must NOT be written by generateAllArtifacts
    await expect(access(join(cwd, "opencode.json"))).rejects.toThrow();
  });
});
