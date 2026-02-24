import { Command } from "commander";

import { runInitCommand } from "./init.js";

export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("sinfonia")
    .description("Sinfonia CLI")
    .version("0.0.0");

  program
    .command("init")
    .description("Initialize Sinfonia project structure")
    .option("-y, --yes", "Run non-interactively with defaults")
    .action(async (options: { yes?: boolean }) => {
      await runInitCommand({ yes: Boolean(options.yes) });
    });

  return program;
};
