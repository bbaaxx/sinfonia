import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runValidateCommand } from "../../src/cli/validate.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-cli-validate-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

const validPersona = `---
persona_id: maestro
name: Maestro
role: Orchestrator
description: Coordinates work.
persona_mode: interactive
---

## Identity
Identity paragraph.

## Communication Style
- clear

## Role Definition
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
1. **ALWAYS** read input.

## Task Protocol
### Accepts
- Input

### Produces
- Output

### Completion Criteria
- Done one
- Done two

## Activation Sequence
1. Start
2. Step
3. Step
4. Step
5. Step
6. Step
7. Finish

## Menu
1. [MH] Main
2. [CH] Continue
3. [DA] Done
`;

describe("runValidateCommand", () => {
  it("returns 0 when no validation errors exist", async () => {
    const cwd = await makeTempDir();
    const file = join(cwd, "maestro.md");
    await writeFile(file, validPersona, "utf8");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await runValidateCommand(file, { all: false });

    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
  });

  it("returns 1 when validation errors exist", async () => {
    const cwd = await makeTempDir();
    const file = join(cwd, "maestro.md");
    await writeFile(file, validPersona.replace("persona_id: maestro", "persona_id: Maestro"), "utf8");

    vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await runValidateCommand(file, { all: false });

    expect(code).toBe(1);
  });
});
