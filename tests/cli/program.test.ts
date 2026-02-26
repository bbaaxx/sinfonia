import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { createProgram } from "../../src/cli/program.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

describe("createProgram", () => {
  it("configures the command metadata", () => {
    const program = createProgram();

    expect(program.name()).toBe("sinfonia");
    expect(program.description()).toBe("Sinfonia CLI");
    expect(program.version()).toBe(`sinfonia/${pkg.version}`);
  });

  it("registers the init command", () => {
    const program = createProgram();

    const init = program.commands.find((command) => command.name() === "init");
    expect(init).toBeDefined();
    expect(init?.options.some((option) => option.long === "--yes")).toBe(true);
  });

  it("registers validate command with --all option", () => {
    const program = createProgram();

    const validate = program.commands.find((command) => command.name() === "validate");
    expect(validate).toBeDefined();
    expect(validate?.options.some((option) => option.long === "--all")).toBe(true);
  });
});
