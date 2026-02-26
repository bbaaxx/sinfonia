import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  GeneratePersonaArtifactsOptions,
  LoadedPersona,
  PersonaProfile,
  StubGeneratorOptions
} from "./types.js";

import { loadPersona } from "./loader.js";
import { ensureParentDir, fileExists } from "./fs-utils.js";

/** All 6 Sinfonia persona profiles with their opencode mode and permission grants. */
export const PERSONA_PROFILES: PersonaProfile[] = [
  {
    id: "maestro",
    mode: "primary",
    permissions: ["read", "write", "edit", "bash"],
    description:
      "Sinfonia orchestrator. Coordinates multi-agent development workflows: receives user stories, writes dispatch envelopes, spawns subagents (Coda, Rondo, Libretto, Amadeus), collects return envelopes, and manages approval gates. Always the user's primary point of contact."
  },
  {
    id: "libretto",
    mode: "subagent",
    permissions: ["read", "write"],
    description:
      "Sinfonia requirements agent. Invoke for PRD creation and requirements analysis. Reads a dispatch envelope with project context, produces a structured PRD following the Sinfonia template, and writes a return envelope with the PRD artifact path and a completeness assessment."
  },
  {
    id: "amadeus",
    mode: "subagent",
    permissions: ["read", "write"],
    description:
      "Sinfonia specification agent. Invoke for technical specification authoring. Reads a dispatch envelope referencing a PRD, produces a detailed technical spec with schema definitions, validation rules, and data flow descriptions, and writes a return envelope with the spec artifact path."
  },
  {
    id: "coda",
    mode: "subagent",
    permissions: ["write", "edit", "bash"],
    description:
      "Sinfonia implementation agent. Invoke for all code writing, editing, and execution tasks. Reads a dispatch envelope from .sinfonia/handoffs/, implements the specified task with TDD discipline, and writes a return envelope with completion status and artifact list."
  },
  {
    id: "rondo",
    mode: "subagent",
    permissions: ["read", "bash"],
    description:
      "Sinfonia code review agent. Invoke for all code review tasks. Reads a dispatch envelope referencing implementation artifacts, performs a structured review against quality criteria, and writes a return envelope with findings, severity ratings, and an approve/revise verdict."
  },
  {
    id: "metronome",
    mode: "subagent",
    permissions: ["read"],
    description:
      "Sinfonia QA agent. Invoke for test planning and quality assurance. Reads a dispatch envelope referencing implementation and spec artifacts, produces a test plan with coverage matrix, and writes a return envelope with test results and a pass/fail verdict."
  }
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a self-contained opencode agent file for a persona.
 * The full persona body is inlined — no external file indirection.
 * Returns the agent Markdown string — does NOT write to disk.
 */
export const generateStub = (options: StubGeneratorOptions): string => {
  const { persona } = options;
  const profile = PERSONA_PROFILES.find((p) => p.id === persona.id);
  if (!profile) {
    throw new Error(`No PERSONA_PROFILES entry found for persona "${persona.id}"`);
  }

  const description = profile.description;
  const mode = profile.mode;

  return `---
name: sinfonia-${persona.id}
description: "${description.replace(/"/g, '\\"')}"
mode: ${mode}
customized: false
---

${persona.body}
`;
};

const isCustomized = async (filePath: string): Promise<boolean> => {
  if (!(await fileExists(filePath))) return false;

  const content = await readFile(filePath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return false;

  return /^customized:\s*true\s*$/m.test(match[1]);
};


/**
 * Generate all persona artifacts for a project:
 * - Copies framework persona files to `.sinfonia/agents/` (idempotent — skips if exists)
 * - Writes `.opencode/agent/sinfonia-{id}.md` with full inline persona content
 *   (skips files marked `customized: true` to preserve user edits)
 * Note: opencode.json is written by init.ts, not here.
 */
export const generateAllArtifacts = async (
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

    // Idempotent: only copy persona file if not already present (preserve user customisations)
    const targetPersonaPath = join(options.cwd, ".sinfonia/agents", `${profile.id}.md`);
    if (!(await fileExists(targetPersonaPath))) {
      await ensureParentDir(targetPersonaPath);
      const source = await readFile(loaded.sourcePath, "utf8");
      await writeFile(targetPersonaPath, source, "utf8");
    }

    // Write inline agent file — skip if user has marked it customized
    const stubPath = join(options.cwd, ".opencode/agent", `sinfonia-${profile.id}.md`);
    if (await isCustomized(stubPath)) continue;

    await ensureParentDir(stubPath);
    await writeFile(stubPath, generateStub({ persona: loaded }), "utf8");
  }

  return personas;
};
