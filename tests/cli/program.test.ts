import { describe, expect, it } from "vitest";

import { createProgram } from "../../src/cli/program.js";

describe("createProgram", () => {
  it("configures the command metadata", () => {
    const program = createProgram();

    expect(program.name()).toBe("sinfonia");
    expect(program.description()).toBe("Sinfonia CLI");
    expect(program.version()).toBe("0.0.0");
  });

  it("registers the init command", () => {
    const program = createProgram();

    const init = program.commands.find((command) => command.name() === "init");
    expect(init).toBeDefined();
    expect(init?.options.some((option) => option.long === "--yes")).toBe(true);
  });
});
