import { constants } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { generateWorkflowStubs } from "./generate-stubs.js";
import { generatePersonaArtifacts } from "../persona/loader.js";
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
};

export type RunInitCommandOptions = {
  cwd?: string;
  yes?: boolean;
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
default_orchestrator: maestro
project_name: "${quoteYaml(config.projectName)}"
user_name: "${quoteYaml(config.userName)}"
skill_level: ${config.skillLevel}
enforcement_strictness: ${config.enforcementStrictness}
`;

const ENFORCEMENT_PLUGIN = `export const pluginName = "sinfonia-enforcement";

export const pluginDescription = "sinfonia enforcement plugin";

export default {
  name: pluginName,
  description: pluginDescription
};
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

const mergeOpenCodeConfig = (current: Record<string, unknown>): Record<string, unknown> => {
  const currentAgents = isRecord(current.agents) ? current.agents : {};
  const currentPlugins = Array.isArray(current.plugins)
    ? current.plugins.filter((value): value is string => typeof value === "string")
    : [];
  const currentSinfonia = isRecord(current.sinfonia) ? current.sinfonia : {};

  const agents: Record<string, unknown> = { ...currentAgents };
  for (const personaId of INTERACTIVE_PERSONAS) {
    const key = `sinfonia-${personaId}`;
    if (!(key in agents)) {
      agents[key] = `.opencode/agent/sinfonia-${personaId}.md`;
    }
  }

  const plugins = Array.from(
    new Set([...currentPlugins, ".opencode/plugins/sinfonia-enforcement.ts"])
  );

  const sinfonia = {
    version: "0.1",
    orchestrator: "maestro",
    ...currentSinfonia
  };

  return {
    ...current,
    agents,
    plugins,
    sinfonia
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
  }

  await writeIfMissing(join(cwd, ".opencode/plugins/sinfonia-enforcement.ts"), ENFORCEMENT_PLUGIN);
  await generatePersonaArtifacts({ cwd });
  await generateWorkflowStubs(cwd);
};

export const runInitCommand = async (options: RunInitCommandOptions = {}): Promise<void> => {
  const cwd = options.cwd ?? process.cwd();
  const yes = Boolean(options.yes);
  const previous = await hasExistingInit(cwd);

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
      await initProject(cwd);
      return;
    }

    await initProject(cwd, {
      config: wizard.config,
      overwriteConfig: previous
    });
  } finally {
    if (closePrompt) {
      closePrompt();
    }
  }
};
