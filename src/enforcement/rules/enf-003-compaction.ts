/**
 * ENF-003: Compaction State Preservation
 *
 * When the session compacts, injects a ≤200-word block of workflow state
 * into the compaction context so the agent retains awareness of the
 * current workflow position after context is pruned.
 *
 * Severity: INJECTION (experimental.session.compacting)
 * Layer: plugin-only
 */

import { findLatestWorkflowIndex, parseWorkflowIndexFile } from "../utils.js";

export interface CompactionResult {
  context: string;
}

/**
 * Creates the ENF-003 handler bound to a project directory.
 */
export function createCompactionHandler(
  cwd: string
): (params: Record<string, unknown>) => Promise<CompactionResult | undefined> {
  return async (_params: Record<string, unknown>): Promise<CompactionResult | undefined> => {
    const indexPath = await findLatestWorkflowIndex(cwd).catch(() => null);
    if (!indexPath) return undefined;

    const index = await parseWorkflowIndexFile(indexPath).catch(() => null);
    if (!index) return undefined;

    const { frontmatter, steps } = index;

    // Build a concise state block — must stay ≤200 words
    const completedCount = steps.filter((s) => s.status === "completed").length;
    const pendingSteps = steps
      .filter((s) => s.status !== "completed")
      .map((s) => `  • [${s.status}] ${s.step}`)
      .join("\n");

    const lines = [
      "## Sinfonia Workflow State (preserved across compaction)",
      `Workflow: ${frontmatter.workflowId}`,
      `Status: ${frontmatter.workflowStatus}`,
      `Current Step: ${frontmatter.currentStep} (${frontmatter.currentStepIndex}/${frontmatter.totalSteps})`,
      `Session: ${frontmatter.sessionId}`,
      `Progress: ${completedCount}/${steps.length} steps completed`,
    ];

    if (pendingSteps) {
      lines.push("Remaining steps:", pendingSteps);
    }

    const context = lines.join("\n");

    // Enforce ≤200 word limit by truncating if necessary
    const words = context.split(/\s+/).filter(Boolean);
    const truncated =
      words.length > 200 ? words.slice(0, 200).join(" ") + " [truncated]" : context;

    return { context: truncated };
  };
}
