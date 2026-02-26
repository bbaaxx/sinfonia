import { createRequire } from "node:module";
import { constants } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version?: string };
const FRAMEWORK_VERSION = pkg.version ?? "0.0.0";

import { generateWorkflowStubs } from "./generate-stubs.js";
import { generatePersonaArtifacts } from "../persona/loader.js";
import { PERSONA_PROFILES } from "../persona/stub-generator.js";
import {
  createConsolePrompt,
  type PromptFn,
  runInitWizard,
  type WizardConfig
} from "./wizard.js";

type PersonaMode = "interactive" | "subagent" | "both";

type FrameworkPersona = {
  id: string;
  title: string;
  mode: PersonaMode;
};

type InitProjectOptions = {
  config?: WizardConfig;
  overwriteConfig?: boolean;
  force?: boolean;
};

export type RunInitCommandOptions = {
  cwd?: string;
  yes?: boolean;
  force?: boolean;
  prompt?: PromptFn;
};

export const FRAMEWORK_PERSONAS: FrameworkPersona[] = [
  { id: "maestro", title: "Maestro", mode: "interactive" },
  { id: "libretto", title: "Libretto", mode: "subagent" },
  { id: "amadeus", title: "Amadeus", mode: "subagent" },
  { id: "coda", title: "Coda", mode: "subagent" },
  { id: "rondo", title: "Rondo", mode: "subagent" },
  { id: "metronome", title: "Metronome", mode: "subagent" }
];

export const INTERACTIVE_PERSONAS = FRAMEWORK_PERSONAS.filter(
  ({ mode }) => mode === "interactive" || mode === "both"
).map(({ id }) => id);

const DEFAULT_CONFIG: WizardConfig = {
  projectName: "",
  userName: "",
  skillLevel: "intermediate",
  enforcementStrictness: "medium"
};

const quoteYaml = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const toConfigYaml = (config: WizardConfig): string => `version: "0.1"
sinfonia_version: "${FRAMEWORK_VERSION}"
default_orchestrator: maestro
project_name: "${quoteYaml(config.projectName)}"
user_name: "${quoteYaml(config.userName)}"
skill_level: ${config.skillLevel}
enforcement_strictness: ${config.enforcementStrictness}
`;

const ENFORCEMENT_PLUGIN = `/**
 * Sinfonia Enforcement Plugin
 *
 * Registers enforcement rules that intercept agent tool calls, session events,
 * and shell environment injection to enforce project quality standards.
 *
 * Rules:
 *   ENF-001  TDD Enforcer          — blocks writes without a corresponding test change
 *   ENF-002  Secret Protection     — blocks reads/writes to sensitive credential files
 *   ENF-003  Compaction Preservation — injects workflow state into compaction context
 *   ENF-004  Spec Stop Guard       — warns when workflow has incomplete steps at idle
 *   ENF-005  Shell Env Injection   — injects SINFONIA_* env vars into every shell call
 *   ENF-007  Session-End Completeness — warns on session idle if steps are incomplete
 */

import type { Plugin } from "@opencode/plugin";

import { loadSinfoniaConfig } from "../../src/enforcement/utils.js";
import { createTddEnforcerHandler } from "../../src/enforcement/rules/enf-001-tdd.js";
import { createSecretProtectionHandler } from "../../src/enforcement/rules/enf-002-secrets.js";
import { createCompactionHandler } from "../../src/enforcement/rules/enf-003-compaction.js";
import { createSpecStopGuardHandler } from "../../src/enforcement/rules/enf-004-spec-stop.js";
import { createShellEnvHandler } from "../../src/enforcement/rules/enf-005-shell-env.js";
import { createCompletenessWarningHandler } from "../../src/enforcement/rules/enf-007-completeness.js";

const SinfoniaEnforcement: Plugin = async ({ project, directory }) => {
  const cwd = directory ?? project ?? process.cwd();

  // Load config non-blocking — enforcement degrades gracefully if config missing
  const config = await loadSinfoniaConfig(cwd).catch(() => null);

  return {
    "tool.execute.before": async (params) => {
      // ENF-001: TDD Enforcer
      const tddResult = await createTddEnforcerHandler(cwd)(params).catch(() => null);
      if (tddResult?.block) return tddResult;

      // ENF-002: Secret Protection
      const secretResult = await createSecretProtectionHandler(cwd)(params).catch(() => null);
      if (secretResult?.block) return secretResult;

      return undefined;
    },

    "experimental.session.compacting": async (params) => {
      // ENF-003: Compaction State Preservation
      return createCompactionHandler(cwd)(params).catch(() => undefined);
    },

    "session.idle": async (params) => {
      // ENF-004: Spec Stop Guard
      await createSpecStopGuardHandler(cwd)(params).catch(() => undefined);

      // ENF-007: Session-End Completeness Warning
      await createCompletenessWarningHandler(cwd)(params).catch(() => undefined);
    },

    "shell.env": async () => {
      // ENF-005: Shell Env Injection
      return createShellEnvHandler(cwd)().catch(() => ({}));
    },
  };
};

export default SinfoniaEnforcement;
`;

const ensureDirectory = async (path: string): Promise<void> => {
  await mkdir(path, { recursive: true });
};

const ensureParentDirectory = async (path: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
};

const writeIfMissing = async (path: string, content: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return false;
  } catch {
    await ensureParentDirectory(path);
    await writeFile(path, content, "utf8");
    return true;
  }
};

const readJson = async (path: string): Promise<Record<string, unknown> | null> => {
  try {
    const data = await readFile(path, "utf8");
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("opencode.json must contain a JSON object");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

/** Derive opencode tools object from a persona's permissions array. */
const permissionsToTools = (
  permissions: string[]
): Record<string, boolean> => {
  const toolNames = ["read", "write", "edit", "bash"] as const;
  return Object.fromEntries(
    toolNames
      .filter((t) => permissions.includes(t))
      .map((t) => [t, true])
  );
};

const mergeOpenCodeConfig = (current: Record<string, unknown>): Record<string, unknown> => {
  // Read existing `agent` entries (singular key — correct opencode schema)
  const currentAgent = isRecord(current.agent) ? current.agent : {};

  const agent: Record<string, unknown> = {};
  for (const profile of PERSONA_PROFILES) {
    const key = `sinfonia-${profile.id}`;
    const existing = currentAgent[key];
    // Preserve existing entry if it already has the correct shape
    if (isRecord(existing) && "mode" in existing && "tools" in existing) {
      agent[key] = existing;
    } else {
      agent[key] = {
        mode: profile.mode === "primary" ? "primary" : "subagent",
        tools: permissionsToTools(profile.permissions),
        description: profile.description
      };
    }
  }

  return {
    $schema: "https://opencode.ai/config.json",
    agent
  };
};

const writeOpenCodeConfig = async (cwd: string): Promise<void> => {
  const path = join(cwd, "opencode.json");
  const existing = await readJson(path);
  const next = mergeOpenCodeConfig(existing ?? {});
  const nextText = `${JSON.stringify(next, null, 2)}\n`;

  if (existing !== null) {
    const existingText = await readFile(path, "utf8");
    if (existingText === nextText) {
      return;
    }
  }

  await writeFile(path, nextText, "utf8");
};

const readInstalledVersion = async (cwd: string): Promise<string | null> => {
  try {
    const content = await readFile(join(cwd, ".sinfonia/config.yaml"), "utf8");
    const match = content.match(/^sinfonia_version:\s*"?([^"\n]+)"?\s*$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const updateConfigVersion = async (cwd: string): Promise<void> => {
  const configPath = join(cwd, ".sinfonia/config.yaml");
  try {
    let content = await readFile(configPath, "utf8");
    if (/^sinfonia_version:/m.test(content)) {
      content = content.replace(/^sinfonia_version:.*$/m, `sinfonia_version: "${FRAMEWORK_VERSION}"`);
    } else {
      // Insert after the version line
      content = content.replace(/^(version:.*\n)/m, `$1sinfonia_version: "${FRAMEWORK_VERSION}"\n`);
    }
    await writeFile(configPath, content, "utf8");
  } catch {
    // Config doesn't exist yet — will be created by initProject
  }
};

const ensureSinfoniaRootIsDirectory = async (cwd: string): Promise<void> => {
  const path = join(cwd, ".sinfonia");

  try {
    const details = await stat(path);
    if (!details.isDirectory()) {
      throw new Error(".sinfonia exists as a file");
    }
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

const hasExistingInit = async (cwd: string): Promise<boolean> => {
  try {
    const details = await stat(join(cwd, ".sinfonia/config.yaml"));
    return details.isFile();
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const initProject = async (
  cwd: string = process.cwd(),
  options: InitProjectOptions = {}
): Promise<void> => {
  const force = options.force ?? false;

  await ensureSinfoniaRootIsDirectory(cwd);

  await ensureDirectory(join(cwd, ".sinfonia/agents"));
  await ensureDirectory(join(cwd, ".sinfonia/handoffs"));
  await ensureDirectory(join(cwd, ".sinfonia/memory"));

  const configPath = join(cwd, ".sinfonia/config.yaml");
  const configYaml = toConfigYaml(options.config ?? DEFAULT_CONFIG);
  if (options.overwriteConfig) {
    await writeFile(configPath, configYaml, "utf8");
  } else {
    await writeIfMissing(configPath, configYaml);
    // Stamp framework version in existing config without overwriting user preferences
    await updateConfigVersion(cwd);
  }

  const enforcementPluginPath = join(cwd, ".opencode/plugins/sinfonia-enforcement.ts");
  if (force) {
    await ensureParentDirectory(enforcementPluginPath);
    await writeFile(enforcementPluginPath, ENFORCEMENT_PLUGIN, "utf8");
  } else {
    await writeIfMissing(enforcementPluginPath, ENFORCEMENT_PLUGIN);
  }

  await writeOpenCodeConfig(cwd);
  await generatePersonaArtifacts({ cwd, force });
  await generateWorkflowStubs(cwd, force);
};

export const runInitCommand = async (options: RunInitCommandOptions = {}): Promise<void> => {
  const cwd = options.cwd ?? process.cwd();
  const yes = Boolean(options.yes);
  const force = Boolean(options.force);
  const previous = await hasExistingInit(cwd);

  // Version check when re-initializing
  if (previous) {
    const installedVersion = await readInstalledVersion(cwd);
    if (installedVersion && installedVersion !== FRAMEWORK_VERSION) {
      if (force) {
        console.error(`\x1b[36m↻ Force-refreshing all generated files (framework ${installedVersion} → ${FRAMEWORK_VERSION})\x1b[0m`);
      } else {
        console.error(`\x1b[33mℹ Framework version changed: ${installedVersion} → ${FRAMEWORK_VERSION}`);
        console.error(`  Run 'sinfonia init --force' to update all generated files.\x1b[0m`);
      }
    } else if (force) {
      console.error(`\x1b[36m↻ Force-refreshing all generated files\x1b[0m`);
    }
  }

  let closePrompt: (() => void) | undefined;
  let prompt = options.prompt;

  if (!yes && !prompt) {
    const consolePrompt = createConsolePrompt();
    prompt = consolePrompt.prompt;
    closePrompt = consolePrompt.close;
  }

  try {
    const wizard = await runInitWizard({
      yes,
      hasPreviousInit: previous,
      ...(prompt ? { prompt } : {})
    });

    if (wizard.action === "cancel") {
      return;
    }

    if (wizard.action === "resume") {
      await initProject(cwd, { force });
      return;
    }

    await initProject(cwd, {
      config: wizard.config,
      overwriteConfig: previous,
      force
    });
  } finally {
    if (closePrompt) {
      closePrompt();
    }
  }
};
