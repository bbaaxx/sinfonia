export const ORCHESTRATORS = [
  "maestro",
  "libretto",
  "amadeus",
  "coda",
  "rondo",
  "metronome"
] as const;

export const SKILL_LEVELS = ["beginner", "intermediate", "expert"] as const;
export const ENFORCEMENT_LEVELS = ["low", "medium", "high"] as const;

export type Orchestrator = (typeof ORCHESTRATORS)[number];
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export type EnforcementStrictness = (typeof ENFORCEMENT_LEVELS)[number];

export type SinfoniaConfig = {
  version: string;
  sinfoniaVersion?: string;
  defaultOrchestrator: Orchestrator;
  projectName: string;
  userName: string;
  skillLevel: SkillLevel;
  enforcementStrictness: EnforcementStrictness;
};

type ConfigKey =
  | "version"
  | "sinfonia_version"
  | "default_orchestrator"
  | "project_name"
  | "user_name"
  | "skill_level"
  | "enforcement_strictness";

const KNOWN_KEYS: ConfigKey[] = [
  "version",
  "sinfonia_version",
  "default_orchestrator",
  "project_name",
  "user_name",
  "skill_level",
  "enforcement_strictness"
];

export const DEFAULT_CONFIG: SinfoniaConfig = {
  version: "0.1",
  defaultOrchestrator: "maestro",
  projectName: "",
  userName: "",
  skillLevel: "intermediate",
  enforcementStrictness: "medium"
};

const ensureString = (key: ConfigKey, value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error(`Invalid value for "${key}": expected string`);
  }

  return value;
};

const ensureOneOf = <T extends readonly string[]>(
  key: ConfigKey,
  value: unknown,
  allowed: T
): T[number] => {
  if (typeof value !== "string") {
    throw new Error(`Invalid value for "${key}": expected one of ${allowed.join(", ")}`);
  }

  if (!allowed.includes(value)) {
    throw new Error(
      `Invalid value for "${key}": received "${value}", expected one of ${allowed.join(", ")}`
    );
  }

  return value;
};

export const validateConfig = (
  raw: Record<string, unknown>,
  sourceByKey: Partial<Record<string, string>> = {}
): SinfoniaConfig => {
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.includes(key as ConfigKey)) {
      const source = sourceByKey[key] ?? "config input";
      throw new Error(`Unknown config key "${key}" in ${source}`);
    }
  }

  const resolved: Record<ConfigKey, unknown> = {
    version: raw.version ?? DEFAULT_CONFIG.version,
    sinfonia_version: raw.sinfonia_version ?? undefined,
    default_orchestrator: raw.default_orchestrator ?? DEFAULT_CONFIG.defaultOrchestrator,
    project_name: raw.project_name ?? DEFAULT_CONFIG.projectName,
    user_name: raw.user_name ?? DEFAULT_CONFIG.userName,
    skill_level: raw.skill_level ?? DEFAULT_CONFIG.skillLevel,
    enforcement_strictness: raw.enforcement_strictness ?? DEFAULT_CONFIG.enforcementStrictness
  };

  const result: SinfoniaConfig = {
    version: ensureString("version", resolved.version),
    defaultOrchestrator: ensureOneOf("default_orchestrator", resolved.default_orchestrator, ORCHESTRATORS),
    projectName: ensureString("project_name", resolved.project_name),
    userName: ensureString("user_name", resolved.user_name),
    skillLevel: ensureOneOf("skill_level", resolved.skill_level, SKILL_LEVELS),
    enforcementStrictness: ensureOneOf(
      "enforcement_strictness",
      resolved.enforcement_strictness,
      ENFORCEMENT_LEVELS
    )
  };

  if (resolved.sinfonia_version !== undefined) {
    result.sinfoniaVersion = ensureString("sinfonia_version", resolved.sinfonia_version);
  }

  return result;
};
