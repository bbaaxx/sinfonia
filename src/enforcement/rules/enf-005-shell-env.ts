/**
 * ENF-005: Shell Env Injection
 *
 * Injects SINFONIA_* environment variables into every shell call so that
 * scripts and tools can access workflow context without reading files.
 *
 * Variables injected:
 *   SINFONIA_PROJECT_ROOT   — absolute path to the project root
 *   SINFONIA_VERSION        — sinfonia package version
 *   SINFONIA_SESSION_ID     — current workflow session ID (if available)
 *   SINFONIA_WORKFLOW_ID    — current workflow ID (if available)
 *   SINFONIA_CURRENT_STEP   — current workflow step name (if available)
 *
 * Severity: INJECTION (shell.env)
 * Layer: plugin-only
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findLatestWorkflowIndex, parseWorkflowIndexFile } from "../utils.js";

export type ShellEnvRecord = Record<string, string | undefined>;

/**
 * Reads the sinfonia package version from its package.json.
 * Falls back to "unknown" if not readable.
 */
async function readSinfoniaVersion(cwd: string): Promise<string> {
  // Try to find the package.json relative to the project root
  const candidates = [
    join(cwd, "package.json"),
    join(cwd, "packages/sinfonia/package.json"),
    // Relative to this file at runtime (dist/enforcement/rules/)
    new URL("../../../package.json", import.meta.url).pathname,
  ];

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf-8");
      const pkg = JSON.parse(raw) as { name?: string; version?: string };
      if (pkg.name?.includes("sinfonia") && pkg.version) {
        return pkg.version;
      }
    } catch {
      // Try next candidate
    }
  }

  return "unknown";
}

/**
 * Creates the ENF-005 handler bound to a project directory.
 */
export function createShellEnvHandler(cwd: string): () => Promise<ShellEnvRecord> {
  return async (): Promise<ShellEnvRecord> => {
    const env: ShellEnvRecord = {
      SINFONIA_PROJECT_ROOT: cwd,
      SINFONIA_VERSION: await readSinfoniaVersion(cwd).catch(() => "unknown"),
    };

    // Attempt to load workflow context — non-blocking
    try {
      const indexPath = await findLatestWorkflowIndex(cwd);
      if (indexPath) {
        const index = await parseWorkflowIndexFile(indexPath);
        if (index) {
          env["SINFONIA_SESSION_ID"] = index.frontmatter.sessionId || undefined;
          env["SINFONIA_WORKFLOW_ID"] = index.frontmatter.workflowId || undefined;
          env["SINFONIA_CURRENT_STEP"] = index.frontmatter.currentStep || undefined;
        }
      }
    } catch {
      // Non-blocking — workflow context is optional
    }

    // Remove undefined values to keep the env record clean
    return Object.fromEntries(
      Object.entries(env).filter(([, v]) => v !== undefined)
    ) as ShellEnvRecord;
  };
}
