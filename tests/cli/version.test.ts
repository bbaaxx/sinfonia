import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { createProgram } from "../../src/cli/program.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

describe("sinfonia --version", () => {
  it("reports version in sinfonia/<version> format", () => {
    const program = createProgram();
    expect(program.version()).toBe(`sinfonia/${pkg.version}`);
  });

  it("registers -V as the version flag alias", () => {
    const program = createProgram();
    const versionOpt = program.options.find((o) => o.short === "-V");
    expect(versionOpt).toBeDefined();
  });
});
