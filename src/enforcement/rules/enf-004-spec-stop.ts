/**
 * ENF-004: Spec Stop Guard
 *
 * Emits a console.warn advisory when the session goes idle and the active
 * workflow index has incomplete steps. Non-blocking — advisory only.
 *
 * Severity: ADVISORY (session.idle)
 * Layer: dual-layer (persona + plugin)
 */

import { findLatestWorkflowIndex, parseWorkflowIndexFile } from "../utils.js";

const INCOMPLETE_STATUSES = new Set(["pending", "in-progress", "blocked"]);

/**
 * Creates the ENF-004 handler bound to a project directory.
 */
export function createSpecStopGuardHandler(
  cwd: string
): (params: Record<string, unknown>) => Promise<void> {
  return async (_params: Record<string, unknown>): Promise<void> => {
    // Find the latest workflow index — non-blocking if not found
    const indexPath = await findLatestWorkflowIndex(cwd).catch(() => null);
    if (!indexPath) return;

    const index = await parseWorkflowIndexFile(indexPath).catch(() => null);
    if (!index) return;

    const incompleteSteps = index.steps.filter((s) => INCOMPLETE_STATUSES.has(s.status));
    if (incompleteSteps.length === 0) return;

    const stepList = incompleteSteps
      .map((s) => `  • [${s.status}] ${s.step} (${s.persona})`)
      .join("\n");

    console.warn(
      `⚠️  [ENF-004] Spec Stop Guard: Session idle with ${incompleteSteps.length} incomplete workflow step(s):\n${stepList}\n\nComplete all steps before ending the session.`
    );
  };
}
