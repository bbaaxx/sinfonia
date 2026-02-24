import { resolve } from "node:path";

import { validatePersonaPaths } from "../validators/persona/validator.js";

export type ValidateCommandOptions = {
  all?: boolean;
};

const logIssueGroup = (label: string, entries: { ruleId: string; message: string }[]): void => {
  if (entries.length === 0) {
    return;
  }

  console.log(`  ${label}:`);
  for (const entry of entries) {
    console.log(`    - [${entry.ruleId}] ${entry.message}`);
  }
};

export const runValidateCommand = async (
  pathArg: string,
  options: ValidateCommandOptions = {}
): Promise<number> => {
  const targetPath = resolve(pathArg);
  const result = await validatePersonaPaths(targetPath, Boolean(options.all));

  if (result.files.length === 0) {
    console.log("No markdown persona files found.");
    return 0;
  }

  for (const file of result.files) {
    console.log(file.filePath);
    logIssueGroup("ERROR", file.errors);
    logIssueGroup("WARN", file.warnings);
  }

  console.log(`\nValidation summary: ${result.errorCount} error(s), ${result.warningCount} warning(s)`);
  return result.errorCount > 0 ? 1 : 0;
};
