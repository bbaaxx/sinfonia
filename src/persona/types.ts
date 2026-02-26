/** Persona execution mode — primary runs always-on, subagent is spawned on demand. */
export type PersonaMode = "primary" | "subagent";

/** Flat list of permission tokens granted to a persona (e.g. "read", "write", "bash"). */
export type PersonaPermissions = string[];

/**
 * Static profile for a Sinfonia persona — defines identity, mode, and permissions.
 * Used by stub-generator to produce opencode.json entries and agent stubs.
 */
export type PersonaProfile = {
  id: string;
  mode: PersonaMode;
  permissions: PersonaPermissions;
  description: string;
};

/**
 * Parsed YAML frontmatter from a persona .md file.
 * Mirrors the required fields validated by the Epic 1.2 persona validator.
 */
export type PersonaConfig = {
  id: string;
  name: string;
  role: string;
  mode: PersonaMode;
  version?: string;
  tools?: string[];
  description?: string;
  [key: string]: unknown;
};

/** Named sections parsed from the Markdown body of a persona file (e.g. "Identity", "Task Protocol"). */
export type PersonaSections = Record<string, string>;

/**
 * A fully loaded persona — combines the static profile, parsed frontmatter config,
 * parsed body sections, and source metadata.
 */
export type LoadedPersona = {
  id: string;
  sourcePath: string;
  sourceType: "override" | "framework";
  frontmatter: Record<string, unknown>;
  body: string;
  sidecarMemoryPath?: string;
};

/** Options for loading a single persona by ID. */
export type LoadPersonaOptions = {
  cwd: string;
  personaId: string;
  frameworkAgentsDir?: string;
  sidecarMemoryEnabled?: boolean;
  /** When true, always load from the framework source (ignore .sinfonia/agents/ override). */
  forceFramework?: boolean;
};

/** Options for generating all persona artifacts (stubs + opencode.json). */
export type GeneratePersonaArtifactsOptions = {
  cwd: string;
  frameworkAgentsDir?: string;
  sidecarMemoryEnabled?: boolean;
  force?: boolean;
};

/** Options passed to generateStub() for a single persona. */
export type StubGeneratorOptions = {
  persona: LoadedPersona;
};

/** A single agent entry written into opencode.json under the `agents` key. */
export type OpencodeAgentEntry = {
  mode: PersonaMode;
  permissions: PersonaPermissions;
  description: string;
  routing: string;
  customized?: boolean;
};
