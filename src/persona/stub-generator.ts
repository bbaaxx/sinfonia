import { mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  GeneratePersonaArtifactsOptions,
  LoadedPersona,
  OpencodeAgentEntry,
  PersonaProfile,
  StubGeneratorOptions
} from "./types.js";

import { loadPersona } from "./loader.js";

/** All 6 Sinfonia persona profiles with their opencode mode and permission grants. */
export const PERSONA_PROFILES: PersonaProfile[] = [
  {
    id: "maestro",
    mode: "primary",
    permissions: ["read", "write", "edit", "bash"],
    description:
      "Primary orchestration persona — coordinates all other personas, manages workflow state, routes tasks via @sinfonia-* delegation"
  },
  {
    id: "libretto",
    mode: "subagent",
    permissions: ["read", "write"],
    description:
      "Product planning persona — authors PRDs, requirements documents, and user stories; delegate requirements and product definition work here"
  },
  {
    id: "amadeus",
    mode: "subagent",
    permissions: ["read", "write"],
    description:
      "Architecture and design persona — produces technical specs, system design documents, and implementation plans; delegate architecture decisions here"
  },
  {
    id: "coda",
    mode: "subagent",
    permissions: ["write", "edit", "bash"],
    description:
      "Implementation persona — writes, edits, and executes code; delegate all development and coding tasks here"
  },
  {
    id: "rondo",
    mode: "subagent",
    permissions: ["read", "bash"],
    description:
      "Review and QA persona — performs code review, runs tests, and validates quality; delegate review and testing tasks here"
  },
  {
    id: "metronome",
    mode: "subagent",
    permissions: ["read"],
    description:
      "Context and memory management persona — handles compaction, context recovery, and workflow state summarisation; delegate context management here"
  }
];

// ─── Internal helpers ────────────────────────────────────────────────────────

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

const mergeOpencodeConfig = async (
  configPath: string,
  newEntries: Record<string, OpencodeAgentEntry>,
  personas: LoadedPersona[]
): Promise<void> => {
  const current = await readJsonObject(configPath);

  const agentsRecord =
    current.agents && typeof current.agents === "object" && !Array.isArray(current.agents)
      ? (current.agents as Record<string, unknown>)
      : {};

  const merged = {
    ...current,
    agents: {
      ...agentsRecord,
      ...newEntries
    },
    sinfonia: {
      personas: personas.map((persona) => ({
        id: persona.id,
        source: persona.sourceType,
        file: `.sinfonia/agents/${persona.id}.md`
      }))
    }
  };

  await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate the content of a thin opencode agent stub for a persona.
 * The stub delegates to the persona's source file via `prompt: {file: ...}`.
 * Returns the stub Markdown string — does NOT write to disk.
 */
export const generateStub = (options: StubGeneratorOptions): string => {
  const { persona } = options;
  return `---
name: sinfonia-${persona.id}
description: Thin persona stub for ${persona.id}
prompt:
  file: .sinfonia/agents/${persona.id}.md
---

Route operations through the ${persona.id} persona prompt file.
`;
};

/**
 * Generate a single opencode.json agent config entry for a persona profile.
 * The description is intentionally verbose to support Maestro's auto-routing.
 */
export const generateOpencodeEntry = (
  profile: PersonaProfile,
  _personaFilePath: string
): OpencodeAgentEntry => ({
  mode: profile.mode,
  permissions: profile.permissions,
  description: profile.description,
  routing: `@sinfonia-${profile.id}`,
  prompt: {
    file: `.sinfonia/agents/${profile.id}.md`
  }
});

/**
 * Generate all persona artifacts for a project:
 * - Copies framework persona files to `.sinfonia/agents/` (idempotent — skips if exists)
 * - Writes `.opencode/agent/sinfonia-{id}.md` stubs (always regenerated)
 * - Merges opencode.json with agent entries (always updated)
 */
export const generateAllArtifacts = async (
  options: GeneratePersonaArtifactsOptions
): Promise<LoadedPersona[]> => {
  const personas: LoadedPersona[] = [];
  const opencodeEntries: Record<string, OpencodeAgentEntry> = {};

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

    // Idempotent: only copy persona file if not already present (preserve user customisations)
    const targetPersonaPath = join(options.cwd, ".sinfonia/agents", `${profile.id}.md`);
    if (!(await fileExists(targetPersonaPath))) {
      await ensureParentDir(targetPersonaPath);
      const source = await readFile(loaded.sourcePath, "utf8");
      await writeFile(targetPersonaPath, source, "utf8");
    }

    // Always regenerate stubs (stubs are thin wrappers, not user-customisable)
    const stubPath = join(options.cwd, ".opencode/agent", `sinfonia-${profile.id}.md`);
    await ensureParentDir(stubPath);
    await writeFile(stubPath, generateStub({ persona: loaded, opencodeDir: options.cwd }), "utf8");

    opencodeEntries[`sinfonia-${profile.id}`] = generateOpencodeEntry(profile, loaded.sourcePath);
  }

  const opencodePath = join(options.cwd, "opencode.json");
  await mergeOpencodeConfig(opencodePath, opencodeEntries, personas);

  return personas;
};
