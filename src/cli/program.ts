import { Command } from "commander";

export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("sinfonia")
    .description("Sinfonia CLI")
    .version("0.0.0");

  return program;
};
