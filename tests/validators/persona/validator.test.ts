import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validatePersonaPaths } from "../../../src/validators/persona/validator.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-validate-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

const validPersona = (id: string): string => `---
persona_id: ${id}
name: ${id}
role: Role
description: Description
persona_mode: interactive
---

## Identity
Identity paragraph.

## Communication Style
- concise

## Role Definition
### Responsibilities
- a
- b
- c

### Boundaries
- x -> y
- x -> z

## Principles
1. **P1.** Text
2. **P2.** Text
3. **P3.** Text

## Critical Actions
1. **ALWAYS** do one thing.

## Task Protocol
### Accepts
- Input

### Produces
- Output

### Completion Criteria
- Done 1
- Done 2

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
`;

describe("validatePersonaPaths", () => {
  it("validates a single file path", async () => {
    const cwd = await makeTempDir();
    const file = join(cwd, "maestro.md");
    await writeFile(file, validPersona("maestro"), "utf8");

    const result = await validatePersonaPaths(file, false);
    expect(result.files).toHaveLength(1);
    expect(result.errorCount).toBe(0);
  });

  it("supports recursive validation with --all", async () => {
    const cwd = await makeTempDir();
    const nested = join(cwd, "nested");
    await mkdir(nested);
    await writeFile(join(cwd, "maestro.md"), validPersona("maestro"), "utf8");
    await writeFile(join(nested, "libretto.md"), validPersona("libretto"), "utf8");

    const result = await validatePersonaPaths(cwd, true);
    expect(result.files).toHaveLength(2);
  });

  it("flags unknown cross-file persona references in Activation Sequence/Menu", async () => {
    const cwd = await makeTempDir();
    const withReference = validPersona("maestro")
      .replace("1. Start", "1. Start with @ghost")
      .replace("2. [CH] Continue", "2. [CH] Continue with @ghost");

    await writeFile(join(cwd, "maestro.md"), withReference, "utf8");
    await writeFile(join(cwd, "libretto.md"), validPersona("libretto"), "utf8");

    const result = await validatePersonaPaths(cwd, true);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.files.some((file) => file.errors.some((issue) => issue.ruleId === "XR-01"))).toBe(true);
  });
});
