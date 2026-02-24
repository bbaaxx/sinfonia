import { describe, expect, it } from "vitest";

import { runInitWizard } from "../../src/cli/wizard.js";

describe("runInitWizard", () => {
  it("uses non-interactive defaults with --yes", async () => {
    const result = await runInitWizard({ yes: true, hasPreviousInit: false });

    expect(result.action).toBe("reinit");
    expect(result.config.projectName).toBe("");
    expect(result.config.userName).toBe("");
    expect(result.config.skillLevel).toBe("intermediate");
    expect(result.config.enforcementStrictness).toBe("medium");
  });

  it("returns resume action on previous init with --yes", async () => {
    const result = await runInitWizard({ yes: true, hasPreviousInit: true });

    expect(result.action).toBe("resume");
  });

  it("supports cancel when previous init exists", async () => {
    const answers = ["cancel"];
    const result = await runInitWizard({
      yes: false,
      hasPreviousInit: true,
      prompt: async () => answers.shift() ?? ""
    });

    expect(result.action).toBe("cancel");
  });

  it("maps beginner skill to high enforcement", async () => {
    const answers = ["My Project", "Alice", "beginner"];
    const result = await runInitWizard({
      yes: false,
      hasPreviousInit: false,
      prompt: async () => answers.shift() ?? ""
    });

    expect(result.config.skillLevel).toBe("beginner");
    expect(result.config.enforcementStrictness).toBe("high");
  });

  it("maps intermediate skill to medium enforcement", async () => {
    const answers = ["My Project", "Alice", "intermediate"];
    const result = await runInitWizard({
      yes: false,
      hasPreviousInit: false,
      prompt: async () => answers.shift() ?? ""
    });

    expect(result.config.skillLevel).toBe("intermediate");
    expect(result.config.enforcementStrictness).toBe("medium");
  });

  it("maps expert skill to low enforcement", async () => {
    const answers = ["My Project", "Alice", "expert"];
    const result = await runInitWizard({
      yes: false,
      hasPreviousInit: false,
      prompt: async () => answers.shift() ?? ""
    });

    expect(result.config.skillLevel).toBe("expert");
    expect(result.config.enforcementStrictness).toBe("low");
  });
});
