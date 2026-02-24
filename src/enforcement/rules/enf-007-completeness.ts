/**
 * ENF-007: Session-End Completeness Warning
 *
 * Emits a console.warn advisory when the session goes idle and the active
 * workflow index has steps that are not yet completed. Distinct from ENF-004
 * in that it focuses on the overall session completeness rather than spec
 * adherence — it warns about any pending/in-progress/blocked steps.
 *
 * Severity: ADVISORY (session.idle)
 * Layer: plugin-only
 */

import { findLatestWorkflowIndex, parseWorkflowIndexFile } from "../utils.js";

const INCOMPLETE_STATUSES = new Set(["pending", "in-progress", "blocked", "failed"]);

/**
 * Creates the ENF-007 handler bound to a project directory.
 */
export function createCompletenessWarningHandler(
  cwd: string
): (params: Record<string, unknown>) => Promise<void> {
  return async (_params: Record<string, unknown>): Promise<void> => {
    const indexPath = await findLatestWorkflowIndex(cwd).catch(() => null);
    if (!indexPath) return;

    const index = await parseWorkflowIndexFile(indexPath).catch(() => null);
    if (!index) return;

    const incompleteSteps = index.steps.filter((s) => INCOMPLETE_STATUSES.has(s.status));
    if (incompleteSteps.length === 0) return;

    const stepList = incompleteSteps
      .map((s) => `  • [${s.status}] ${s.step} → ${s.persona}`)
      .join("\n");

    const completedCount = index.steps.length - incompleteSteps.length;
    const totalCount = index.steps.length;

    console.warn(
      [
        `⚠️  [ENF-007] Session-End Completeness Warning`,
        `Workflow "${index.frontmatter.workflowId}" has ${incompleteSteps.length} incomplete step(s) (${completedCount}/${totalCount} done):`,
        stepList,
        ``,
        `Ensure all workflow steps are completed before ending the session.`,
      ].join("\n")
    );
  };
}
