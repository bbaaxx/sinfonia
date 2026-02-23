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
    .action(async () => {
      await runInitCommand();
    });

  return program;
};
