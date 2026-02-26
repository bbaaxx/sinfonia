import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

/** Check whether a file exists at the given path. */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/** Ensure the parent directory of a file path exists, creating it recursively if needed. */
export const ensureParentDir = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};
