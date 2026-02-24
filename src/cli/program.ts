import { Command } from "commander";

import { runInitCommand } from "./init.js";
import { runValidateCommand } from "./validate.js";

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

  program
    .command("validate")
    .description("Validate persona markdown files")
    .argument("<path>", "Path to persona file or directory")
    .option("--all", "Validate all markdown files recursively")
    .action(async (pathArg: string, options: { all?: boolean }) => {
      const exitCode = await runValidateCommand(pathArg, { all: Boolean(options.all) });
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return program;
};
