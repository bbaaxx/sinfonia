import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { DEFAULT_CONFIG, type SinfoniaConfig, validateConfig } from "./schema.js";

type ConfigFlags = Partial<{
  version: string;
  defaultOrchestrator: string;
  projectName: string;
  userName: string;
  skillLevel: string;
  enforcementStrictness: string;
}>;

export type LoadConfigOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  flags?: ConfigFlags;
};

const parseYamlValue = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseProjectConfig = (
  content: string,
  sourceByKey: Partial<Record<string, string>>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      throw new Error(`Invalid YAML in .sinfonia/config.yaml at line ${index + 1}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const value = parseYamlValue(trimmed.slice(separator + 1));
    result[key] = value;
    sourceByKey[key] = ".sinfonia/config.yaml";
  }

  return result;
};

const envToRawConfig = (
  env: Record<string, string | undefined>,
  sourceByKey: Partial<Record<string, string>>
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};

  const assign = (envKey: string, configKey: string): void => {
    const value = env[envKey];
    if (typeof value === "string" && value.length > 0) {
      mapped[configKey] = value;
      sourceByKey[configKey] = `env:${envKey}`;
    }
  };

  assign("SINFONIA_VERSION", "version");
  assign("SINFONIA_DEFAULT_ORCHESTRATOR", "default_orchestrator");
  assign("SINFONIA_PROJECT_NAME", "project_name");
  assign("SINFONIA_USER_NAME", "user_name");
  assign("SINFONIA_SKILL_LEVEL", "skill_level");
  assign("SINFONIA_ENFORCEMENT_STRICTNESS", "enforcement_strictness");

  return mapped;
};

const flagsToRawConfig = (
  flags: ConfigFlags,
  sourceByKey: Partial<Record<string, string>>
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};

  const assign = (value: string | undefined, configKey: string): void => {
    if (typeof value === "string" && value.length > 0) {
      mapped[configKey] = value;
      sourceByKey[configKey] = "cli-flags";
    }
  };

  assign(flags.version, "version");
  assign(flags.defaultOrchestrator, "default_orchestrator");
  assign(flags.projectName, "project_name");
  assign(flags.userName, "user_name");
  assign(flags.skillLevel, "skill_level");
  assign(flags.enforcementStrictness, "enforcement_strictness");

  return mapped;
};

const loadProjectConfig = async (
  cwd: string,
  sourceByKey: Partial<Record<string, string>>
): Promise<Record<string, unknown>> => {
  try {
    const configPath = join(cwd, ".sinfonia/config.yaml");
    const content = await readFile(configPath, "utf8");
    return parseProjectConfig(content, sourceByKey);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

export const loadConfig = async (options: LoadConfigOptions = {}): Promise<SinfoniaConfig> => {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const flags = options.flags ?? {};

  const sourceByKey: Partial<Record<string, string>> = {
    version: "defaults",
    default_orchestrator: "defaults",
    project_name: "defaults",
    user_name: "defaults",
    skill_level: "defaults",
    enforcement_strictness: "defaults"
  };

  const defaultsLayer: Record<string, unknown> = {
    version: DEFAULT_CONFIG.version,
    default_orchestrator: DEFAULT_CONFIG.defaultOrchestrator,
    project_name: DEFAULT_CONFIG.projectName,
    user_name: DEFAULT_CONFIG.userName,
    skill_level: DEFAULT_CONFIG.skillLevel,
    enforcement_strictness: DEFAULT_CONFIG.enforcementStrictness
  };

  const projectLayer = await loadProjectConfig(cwd, sourceByKey);
  const envLayer = envToRawConfig(env, sourceByKey);
  const flagsLayer = flagsToRawConfig(flags, sourceByKey);

  const merged = {
    ...defaultsLayer,
    ...projectLayer,
    ...envLayer,
    ...flagsLayer
  };

  return validateConfig(merged, sourceByKey);
};
