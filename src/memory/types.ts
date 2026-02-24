// ---------------------------------------------------------------------------
// Sidecar Memory — Shared Types
// ---------------------------------------------------------------------------

/** Options controlling sidecar memory behaviour for a persona. */
export interface SidecarMemoryOptions {
  /** When false, all memory operations are no-ops. Mirrors `sidecar_memory` frontmatter field. */
  sidecarEnabled?: boolean;
}

/** A single timestamped entry appended to a memory file. */
export interface MemoryEntry {
  timestamp: string;
  content: string;
}

/** Result returned by readMemory. */
export interface MemoryReadResult {
  personaId: string;
  filePath: string;
  content: string;
  sizeBytes: number;
}
