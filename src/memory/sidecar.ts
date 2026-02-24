import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { SidecarMemoryOptions, MemoryReadResult } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SIZE_WARNING_KB = 50;
const MEMORY_SUBDIR = join('.sinfonia', 'memory');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function memoryFilePath(personaId: string, projectRoot: string): string {
  return join(projectRoot, MEMORY_SUBDIR, `${personaId}.md`);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a new memory file for the given persona at
 * `<projectRoot>/.sinfonia/memory/<personaId>.md`.
 *
 * - Returns the file path on success.
 * - Returns null if sidecarEnabled is false.
 * - Does NOT overwrite an existing file.
 * - Returns null (non-throwing) on I/O error.
 */
export async function createMemoryFile(
  personaId: string,
  projectRoot: string,
  options: SidecarMemoryOptions = {},
): Promise<string | null> {
  if (options.sidecarEnabled === false) return null;

  const filePath = memoryFilePath(personaId, projectRoot);

  try {
    // Idempotent: skip if already exists
    if (await fileExists(filePath)) return filePath;

    await mkdir(dirname(filePath), { recursive: true });

    const header = [
      `# Memory: ${personaId}`,
      ``,
      `Created: ${nowIso()}`,
      ``,
    ].join('\n');

    await writeFile(filePath, header, 'utf-8');
    return filePath;
  } catch (err) {
    console.warn(`[sinfonia:memory] Failed to create memory file for "${personaId}":`, err);
    return null;
  }
}

/**
 * Appends a timestamped entry to the persona's memory file.
 *
 * - Auto-creates the file if it does not exist.
 * - Returns the file path on success.
 * - Returns null if sidecarEnabled is false.
 * - Returns null (non-throwing) on I/O error.
 */
export async function appendMemoryEntry(
  personaId: string,
  content: string,
  projectRoot: string,
  options: SidecarMemoryOptions = {},
): Promise<string | null> {
  if (options.sidecarEnabled === false) return null;

  const filePath = memoryFilePath(personaId, projectRoot);

  try {
    // Auto-create if missing
    if (!(await fileExists(filePath))) {
      const created = await createMemoryFile(personaId, projectRoot, options);
      if (created === null) return null;
    }

    const entry = `\n## ${nowIso()}\n\n${content}\n`;
    const existing = await readFile(filePath, 'utf-8');
    await writeFile(filePath, existing + entry, 'utf-8');
    return filePath;
  } catch (err) {
    console.warn(`[sinfonia:memory] Failed to append entry for "${personaId}":`, err);
    return null;
  }
}

/**
 * Reads the full memory file for the given persona.
 *
 * - Returns a MemoryReadResult on success.
 * - Returns null if the file does not exist or sidecarEnabled is false.
 * - Returns null (non-throwing) on I/O error.
 */
export async function readMemory(
  personaId: string,
  projectRoot: string,
  options: SidecarMemoryOptions = {},
): Promise<MemoryReadResult | null> {
  if (options.sidecarEnabled === false) return null;

  const filePath = memoryFilePath(personaId, projectRoot);

  try {
    const fileStat = await stat(filePath);
    const content = await readFile(filePath, 'utf-8');
    return {
      personaId,
      filePath,
      content,
      sizeBytes: fileStat.size,
    };
  } catch {
    // File does not exist or unreadable — not an error condition
    return null;
  }
}

/**
 * Checks whether the persona's memory file exceeds the size threshold.
 *
 * - Returns true (and emits console.warn) when the threshold is exceeded.
 * - Returns false when below threshold, file missing, or sidecarEnabled is false.
 * - thresholdKb defaults to 50KB.
 */
export async function checkMemorySize(
  personaId: string,
  projectRoot: string,
  thresholdKb: number = DEFAULT_SIZE_WARNING_KB,
): Promise<boolean> {
  const filePath = memoryFilePath(personaId, projectRoot);

  try {
    const fileStat = await stat(filePath);
    const sizeKb = fileStat.size / 1024;

    if (sizeKb > thresholdKb) {
      console.warn(
        `[sinfonia:memory] Memory file for "${personaId}" is ${sizeKb.toFixed(1)}KB` +
          ` (threshold: ${thresholdKb}KB). Consider summarising older entries.`,
      );
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
