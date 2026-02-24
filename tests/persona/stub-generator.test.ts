import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PERSONA_PROFILES,
  generateAllArtifacts,
  generateOpencodeEntry,
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

describe("generateOpencodeEntry", () => {
  it("produces correct config for all 6 personas", () => {
    for (const profile of PERSONA_PROFILES) {
      const entry = generateOpencodeEntry(profile, `/fake/agents/${profile.id}.md`);
      expect(entry.mode).toBe(profile.mode);
      expect(entry.description).toBeTruthy();
      expect(entry.routing).toBe(`@sinfonia-${profile.id}`);
      expect(entry.prompt.file).toBe(`.sinfonia/agents/${profile.id}.md`);
    }
  });

  it("maestro entry has mode primary", () => {
    const maestro = PERSONA_PROFILES.find((p) => p.id === "maestro")!;
    const entry = generateOpencodeEntry(maestro, "/fake/agents/maestro.md");
    expect(entry.mode).toBe("primary");
  });

  it("metronome entry has read-only permissions", () => {
    const metronome = PERSONA_PROFILES.find((p) => p.id === "metronome")!;
    const entry = generateOpencodeEntry(metronome, "/fake/agents/metronome.md");
    expect(entry.permissions).toEqual(["read"]);
  });

  it("coda entry has write/edit/bash permissions", () => {
    const coda = PERSONA_PROFILES.find((p) => p.id === "coda")!;
    const entry = generateOpencodeEntry(coda, "/fake/agents/coda.md");
    expect(entry.permissions).toContain("write");
    expect(entry.permissions).toContain("edit");
    expect(entry.permissions).toContain("bash");
  });

  it("rondo entry has read and bash permissions only", () => {
    const rondo = PERSONA_PROFILES.find((p) => p.id === "rondo")!;
    const entry = generateOpencodeEntry(rondo, "/fake/agents/rondo.md");
    expect(entry.permissions).toContain("read");
    expect(entry.permissions).toContain("bash");
    expect(entry.permissions).not.toContain("write");
    expect(entry.permissions).not.toContain("edit");
  });

  it("descriptions are routing-capable (contain role keywords)", () => {
    const checks: Record<string, string[]> = {
      libretto: ["requirements", "PRD", "product", "planning"],
      amadeus: ["architecture", "design", "spec", "technical"],
      coda: ["implementation", "code", "develop", "coding"],
      rondo: ["review", "QA", "test", "quality"],
      metronome: ["compaction", "context", "recovery", "memory"]
    };

    for (const [id, keywords] of Object.entries(checks)) {
      const profile = PERSONA_PROFILES.find((p) => p.id === id)!;
      const entry = generateOpencodeEntry(profile, `/fake/${id}.md`);
      const descLower = entry.description.toLowerCase();
      const hasKeyword = keywords.some((kw) => descLower.includes(kw.toLowerCase()));
      expect(hasKeyword, `${id} description should contain one of: ${keywords.join(", ")}`).toBe(true);
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

  it("writes opencode.json with all 6 agent entries", async () => {
    const cwd = await makeTempDir();
    const frameworkDir = join(cwd, "framework");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(frameworkDir, { recursive: true });

    for (const profile of PERSONA_PROFILES) {
      await writeFile(join(frameworkDir, `${profile.id}.md`), validPersonaMd(profile.id), "utf8");
    }

    await generateAllArtifacts({ cwd, frameworkAgentsDir: frameworkDir });

    const config = JSON.parse(await readFile(join(cwd, "opencode.json"), "utf8")) as {
      agents: Record<string, { mode: string; permissions: string[] }>;
    };

    const sinfoniaKeys = Object.keys(config.agents).filter((k) => k.startsWith("sinfonia-"));
    expect(sinfoniaKeys).toHaveLength(6);
    expect(config.agents["sinfonia-maestro"].mode).toBe("primary");
    expect(config.agents["sinfonia-metronome"].permissions).toEqual(["read"]);
  });
});
