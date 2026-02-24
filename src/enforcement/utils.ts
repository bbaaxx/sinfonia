/**
 * Shared utilities for the Sinfonia enforcement plugin.
 * All functions are pure or async-pure — no side effects beyond filesystem reads.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import type { WorkflowIndex } from "../workflow/types.js";

const execAsync = promisify(exec);

// ─── Skip patterns for ENF-001 TDD enforcer ──────────────────────────────────

const SKIP_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".md",
  ".txt",
  ".rst",
]);

const SKIP_PATH_PREFIXES = ["dist/", "build/", "node_modules/", ".sinfonia/", ".opencode/"];

const TEST_FILE_PATTERNS = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /^test_.*\.py$/,
  /.*_test\.go$/,
  /__tests__\//,
];

// ─── matchesPattern ───────────────────────────────────────────────────────────

/**
 * Tests whether a file path matches a glob-style pattern.
 * Supports: exact match, *.ext, .prefix.*, double-star/dir/double-star, prefix/double-star
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex special chars (except * and ?)
    .replace(/\\\./g, "\\.") // re-escape dots that were already escaped
    .replace(/\*\*/g, "§DOUBLESTAR§") // placeholder for **
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/§DOUBLESTAR§/g, ".*") // ** matches anything including /
    .replace(/\?/g, "[^/]"); // ? matches single non-slash char

  const regex = new RegExp(`^${escaped}$`);
  return regex.test(filePath) || regex.test(basename(filePath));
}

// ─── resolveTestPath ─────────────────────────────────────────────────────────

/**
 * Given a source file path, returns candidate test file paths.
 * Returns empty array if the file should be skipped (config, docs, test files, build artifacts).
 */
export function resolveTestPath(filePath: string): string[] {
  const ext = extname(filePath);
  const base = basename(filePath);

  // Skip non-source extensions
  if (SKIP_EXTENSIONS.has(ext)) return [];

  // Skip build artifacts and special dirs
  for (const prefix of SKIP_PATH_PREFIXES) {
    if (filePath.startsWith(prefix) || filePath.includes(`/${prefix.replace(/\/$/, "")}/`)) {
      return [];
    }
  }

  // Skip test files themselves
  for (const pattern of TEST_FILE_PATTERNS) {
    if (pattern.test(filePath) || pattern.test(base)) return [];
  }

  // Derive test candidates
  const withoutExt = filePath.replace(/\.[^.]+$/, "");
  const candidates: string[] = [];

  // Sibling test: src/foo.ts → src/foo.test.ts
  candidates.push(`${withoutExt}.test${ext}`);

  // tests/ mirror: src/foo/bar.ts → tests/foo/bar.test.ts
  const withoutSrcPrefix = withoutExt.replace(/^src\//, "");
  if (withoutSrcPrefix !== withoutExt) {
    candidates.push(`tests/${withoutSrcPrefix}.test${ext}`);
  }

  return candidates;
}

// ─── formatBlockMessage ───────────────────────────────────────────────────────

/**
 * Formats a standardised enforcement block message for display in the agent UI.
 */
export function formatBlockMessage(ruleId: string, reason: string, filePath?: string): string {
  const fileInfo = filePath ? `\nFile: ${filePath}` : "";
  return [
    `🚫 [${ruleId}] Enforcement Block`,
    `Reason: ${reason}${fileInfo}`,
    `To bypass: address the violation and retry.`,
  ].join("\n");
}

// ─── findLatestWorkflowIndex ──────────────────────────────────────────────────

/**
 * Scans .sinfonia/handoffs/ for session directories and returns the path to
 * the most recently modified workflow.md, or null if none exists.
 */
export async function findLatestWorkflowIndex(cwd: string): Promise<string | null> {
  const handoffsDir = join(cwd, ".sinfonia", "handoffs");

  let sessionDirs: string[];
  try {
    const entries = await readdir(handoffsDir, { withFileTypes: true });
    sessionDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => join(handoffsDir, e.name));
  } catch {
    return null;
  }

  if (sessionDirs.length === 0) return null;

  // Find the workflow.md with the latest mtime across all session dirs
  let latestPath: string | null = null;
  let latestMtime = 0;

  for (const sessionDir of sessionDirs) {
    const candidatePath = join(sessionDir, "workflow.md");
    try {
      const stats = await stat(candidatePath);
      if (stats.mtimeMs > latestMtime) {
        latestMtime = stats.mtimeMs;
        latestPath = candidatePath;
      }
    } catch {
      // workflow.md doesn't exist in this session dir — skip
    }
  }

  return latestPath;
}

// ─── parseWorkflowIndexFile ───────────────────────────────────────────────────

/**
 * Reads and parses a workflow.md file into a WorkflowIndex structure.
 * Returns null if the file doesn't exist or cannot be parsed.
 */
export async function parseWorkflowIndexFile(filePath: string): Promise<WorkflowIndex | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return null;
  }

  // Extract YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fmRaw = fmMatch[1] ?? "";
  const frontmatter = parseFrontmatter(fmRaw);
  if (!frontmatter) return null;

  // Parse steps table
  const steps = parseStepsTable(raw);

  // Parse artifacts table
  const artifacts = parseArtifactsTable(raw);

  // Parse decisions table
  const decisions = parseDecisionsTable(raw);

  // Parse sessions table
  const sessions = parseSessionsTable(raw);

  // Extract context section
  const contextMatch = raw.match(/## Context\n([\s\S]*?)(?:\n## |\s*$)/);
  const context = contextMatch?.[1]?.trim() ?? "";

  return {
    frontmatter,
    goal: extractSection(raw, "Goal"),
    steps,
    artifacts,
    decisions,
    sessions,
    context,
    rawBody: raw,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseFrontmatter(fmRaw: string): WorkflowIndex["frontmatter"] | null {
  try {
    const lines = fmRaw.split("\n");
    const obj: Record<string, string> = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      obj[key] = value;
    }

    const workflowId = obj["workflow_id"] ?? obj["workflowId"] ?? "";
    const workflowStatus = obj["workflow_status"] ?? obj["workflowStatus"] ?? "created";
    const currentStep = obj["current_step"] ?? obj["currentStep"] ?? "";
    const currentStepIndex = parseInt(obj["current_step_index"] ?? obj["currentStepIndex"] ?? "0", 10);
    const totalSteps = parseInt(obj["total_steps"] ?? obj["totalSteps"] ?? "0", 10);
    const sessionId = obj["session_id"] ?? obj["sessionId"] ?? "";
    const createdAt = obj["created_at"] ?? obj["createdAt"] ?? new Date().toISOString();
    const updatedAt = obj["updated_at"] ?? obj["updatedAt"] ?? new Date().toISOString();

    if (!workflowId) return null;

    return {
      workflowId,
      workflowStatus: workflowStatus as WorkflowIndex["frontmatter"]["workflowStatus"],
      currentStep,
      currentStepIndex,
      totalSteps,
      sessionId,
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function extractSection(raw: string, heading: string): string {
  const match = raw.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |\\s*$)`));
  return match?.[1]?.trim() ?? "";
}

function parseTableRows(raw: string, heading: string): string[][] {
  const section = extractSection(raw, heading);
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  // Skip header and separator rows
  return lines
    .slice(2)
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())
    )
    .filter((row) => row.some((c) => c.length > 0));
}

function parseStepsTable(raw: string): WorkflowIndex["steps"] {
  const rows = parseTableRows(raw, "Steps");
  return rows.map((cols) => ({
    step: cols[0] ?? "",
    persona: cols[1] ?? "",
    status: (cols[2] ?? "pending") as WorkflowIndex["steps"][number]["status"],
    startedAt: cols[3] ?? "",
    completedAt: cols[4] ?? "",
    notes: cols[5] ?? "",
  }));
}

function parseArtifactsTable(raw: string): WorkflowIndex["artifacts"] {
  const rows = parseTableRows(raw, "Artifacts");
  return rows.map((cols) => ({
    name: cols[0] ?? "",
    type: cols[1] ?? "",
    status: cols[2] ?? "",
    updatedAt: cols[3] ?? "",
    notes: cols[4] ?? "",
  }));
}

function parseDecisionsTable(raw: string): WorkflowIndex["decisions"] {
  const rows = parseTableRows(raw, "Decisions");
  return rows.map((cols) => ({
    timestamp: cols[0] ?? "",
    handoffId: cols[1] ?? "",
    decision: cols[2] ?? "",
    reviewer: cols[3] ?? "",
    note: cols[4] ?? "",
  }));
}

function parseSessionsTable(raw: string): WorkflowIndex["sessions"] {
  const rows = parseTableRows(raw, "Sessions");
  return rows.map((cols) => ({
    sessionId: cols[0] ?? "",
    startedAt: cols[1] ?? "",
    lastActiveAt: cols[2] ?? "",
    status: cols[3] ?? "",
  }));
}

// ─── checkGitDiff ─────────────────────────────────────────────────────────────

/**
 * Returns the list of files modified in the current git diff (staged + unstaged).
 * Returns empty array if git is unavailable or the directory is not a git repo.
 */
export async function checkGitDiff(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync("git diff --name-only HEAD", { cwd });
    const staged = stdout.trim().split("\n").filter(Boolean);

    const { stdout: stagedOut } = await execAsync("git diff --cached --name-only", { cwd });
    const cachedFiles = stagedOut.trim().split("\n").filter(Boolean);

    return [...new Set([...staged, ...cachedFiles])];
  } catch {
    return [];
  }
}

// ─── loadSinfoniaConfig ───────────────────────────────────────────────────────

/**
 * Loads the Sinfonia config from the project directory.
 * Returns null if config cannot be loaded (non-blocking).
 */
export async function loadSinfoniaConfig(
  cwd: string
): Promise<{ enforcementStrictness: string } | null> {
  try {
    const { loadConfig } = await import("../config/loader.js");
    const config = await loadConfig({ cwd });
    return { enforcementStrictness: config.enforcementStrictness };
  } catch {
    return null;
  }
}
