import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { validatePersonaPaths } from "../validators/persona/validator.js";

type PersonaMode = "primary" | "subagent";

export type PersonaProfile = {
  id: string;
  mode: PersonaMode;
  permissions: string[];
  description: string;
};

export const PERSONA_PROFILES: PersonaProfile[] = [
  {
    id: "maestro",
    mode: "primary",
    permissions: ["read", "write", "edit", "bash"],
    description: "Primary orchestration persona"
  },
  {
    id: "libretto",
    mode: "subagent",
    permissions: ["read", "write"],
    description: "Product planning and requirements persona"
  },
  {
    id: "amadeus",
    mode: "subagent",
    permissions: ["read", "write"],
    description: "Technical architecture persona"
  },
  {
    id: "coda",
    mode: "subagent",
    permissions: ["write", "edit", "bash"],
    description: "Implementation delivery persona"
  },
  {
    id: "rondo",
    mode: "subagent",
    permissions: ["read", "bash"],
    description: "Review and quality persona"
  },
  {
    id: "metronome",
    mode: "subagent",
    permissions: ["read"],
    description: "Context and memory management persona"
  }
];

export type LoadedPersona = {
  id: string;
  sourcePath: string;
  sourceType: "override" | "framework";
  frontmatter: Record<string, unknown>;
  body: string;
  sidecarMemoryPath?: string;
};

export type LoadPersonaOptions = {
  cwd: string;
  personaId: string;
  frameworkAgentsDir?: string;
  sidecarMemoryEnabled?: boolean;
};

export type GeneratePersonaArtifactsOptions = {
  cwd: string;
  frameworkAgentsDir?: string;
  sidecarMemoryEnabled?: boolean;
};

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (value === "") {
    return "";
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
};

const parseFrontmatter = (content: string): { frontmatter: Record<string, unknown>; body: string } => {
  if (!content.startsWith("---\n")) {
    throw new Error("Missing frontmatter");
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("Malformed frontmatter");
  }

  const yaml = content.slice(4, closingIndex).trimEnd();
  const body = content.slice(closingIndex + 4).replace(/^\s+/, "");
  const frontmatter: Record<string, unknown> = {};

  let currentArrayKey: string | null = null;
  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (currentArrayKey && trimmed.startsWith("- ")) {
      (frontmatter[currentArrayKey] as unknown[]).push(parseScalar(trimmed.slice(2)));
      continue;
    }
    currentArrayKey = null;

    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      throw new Error("Malformed frontmatter");
    }

    const [, key, rawValue] = match;
    if (rawValue.trim() === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }
    frontmatter[key] = parseScalar(rawValue);
  }

  return { frontmatter, body };
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureParentDir = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};

const frameworkDirFromModule = (): string => {
  const here = dirname(new URL(import.meta.url).pathname);
  return resolve(here, "../../agents");
};

export const loadPersona = async (options: LoadPersonaOptions): Promise<LoadedPersona> => {
  const overridePath = join(options.cwd, ".sinfonia/agents", `${options.personaId}.md`);
  const frameworkDir = options.frameworkAgentsDir ?? frameworkDirFromModule();
  const fallbackPath = join(frameworkDir, `${options.personaId}.md`);

  let sourcePath = overridePath;
  let sourceType: "override" | "framework" = "override";
  if (!(await fileExists(overridePath))) {
    sourcePath = fallbackPath;
    sourceType = "framework";
  }

  if (!(await fileExists(sourcePath))) {
    throw new Error(`Persona file not found for ${options.personaId}`);
  }

  const validation = await validatePersonaPaths(sourcePath, false);
  if (validation.errorCount > 0) {
    throw new Error(`Persona validation failed for ${options.personaId}`);
  }

  const content = await readFile(sourcePath, "utf8");
  const parsed = parseFrontmatter(content);

  let sidecarMemoryPath: string | undefined;
  if (options.sidecarMemoryEnabled) {
    const candidate = join(options.cwd, ".sinfonia/memory", `${options.personaId}.md`);
    if (await fileExists(candidate)) {
      sidecarMemoryPath = candidate;
    }
  }

  return {
    id: options.personaId,
    sourcePath,
    sourceType,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    ...(sidecarMemoryPath ? { sidecarMemoryPath } : {})
  };
};

const toStub = (personaId: string): string => `---
name: sinfonia-${personaId}
description: Thin persona stub for ${personaId}
prompt:
  file: .sinfonia/agents/${personaId}.md
---

Route operations through the ${personaId} persona prompt file.
`;

const mergeOpencodeConfig = (
  current: Record<string, unknown>,
  personas: LoadedPersona[]
): Record<string, unknown> => {
  const agentsRecord =
    current.agents && typeof current.agents === "object" && !Array.isArray(current.agents)
      ? (current.agents as Record<string, unknown>)
      : {};

  const nextAgents: Record<string, unknown> = { ...agentsRecord };
  for (const profile of PERSONA_PROFILES) {
    nextAgents[`sinfonia-${profile.id}`] = {
      mode: profile.mode,
      permissions: profile.permissions,
      description: profile.description,
      routing: `@sinfonia-${profile.id}`,
      prompt: {
        file: `.sinfonia/agents/${profile.id}.md`
      }
    };
  }

  return {
    ...current,
    agents: nextAgents,
    sinfonia: {
      personas: personas.map((persona) => ({
        id: persona.id,
        source: persona.sourceType,
        file: `.sinfonia/agents/${persona.id}.md`
      }))
    }
  };
};

const readJsonObject = async (filePath: string): Promise<Record<string, unknown>> => {
  if (!(await fileExists(filePath))) {
    return {};
  }
  const data = await readFile(filePath, "utf8");
  const parsed = JSON.parse(data) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("opencode.json must contain an object");
  }
  return parsed as Record<string, unknown>;
};

export const generatePersonaArtifacts = async (
  options: GeneratePersonaArtifactsOptions
): Promise<LoadedPersona[]> => {
  const personas: LoadedPersona[] = [];

  for (const profile of PERSONA_PROFILES) {
    const loaded = await loadPersona({
      cwd: options.cwd,
      personaId: profile.id,
      ...(options.frameworkAgentsDir ? { frameworkAgentsDir: options.frameworkAgentsDir } : {}),
      ...(options.sidecarMemoryEnabled !== undefined
        ? { sidecarMemoryEnabled: options.sidecarMemoryEnabled }
        : {})
    });
    personas.push(loaded);

    const targetPersonaPath = join(options.cwd, ".sinfonia/agents", `${profile.id}.md`);
    if (!(await fileExists(targetPersonaPath))) {
      await ensureParentDir(targetPersonaPath);
      const source = await readFile(loaded.sourcePath, "utf8");
      await writeFile(targetPersonaPath, source, "utf8");
    }

    const stubPath = join(options.cwd, ".opencode/agent", `sinfonia-${profile.id}.md`);
    await ensureParentDir(stubPath);
    await writeFile(stubPath, toStub(profile.id), "utf8");
  }

  const opencodePath = join(options.cwd, "opencode.json");
  const currentConfig = await readJsonObject(opencodePath);
  const merged = mergeOpencodeConfig(currentConfig, personas);
  await writeFile(opencodePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  return personas;
};

export const personaFilename = (path: string): string => basename(path);
