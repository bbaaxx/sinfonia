import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { updateWorkflowIndex, workflowIndexPath } from "../workflow/index-manager.js";

export type DispatchEnvelope = {
  sessionId: string;
  sequence: number;
  sourcePersona: string;
  targetPersona: string;
  task: string;
  context: string;
  constraints: string[];
};

export const formatDelegationContext = (envelope: DispatchEnvelope): string => {
  const constraints = envelope.constraints.map((item) => `- ${item}`).join("\n");

  return [
    `Dispatch Envelope: ${envelope.sessionId}#${String(envelope.sequence).padStart(3, "0")}`,
    `Source: @sinfonia-${envelope.sourcePersona}`,
    `Target: @sinfonia-${envelope.targetPersona}`,
    "",
    "Task",
    envelope.task,
    "",
    "Context",
    envelope.context,
    "",
    "Constraints",
    constraints
  ].join("\n");
};

export const updateWorkflowCurrentStep = async (
  workflowPath: string,
  personaId: string,
  nextStep: string
): Promise<void> => {
  const content = await readFile(workflowPath, "utf8");
  const targetLine = `current_step: ${nextStep}`;
  const personaLine = `active_persona: ${personaId}`;

  const withStep = content.match(/^current_step:.*$/m)
    ? content.replace(/^current_step:.*$/m, targetLine)
    : `${targetLine}\n${content}`;

  const withPersona = withStep.match(/^active_persona:.*$/m)
    ? withStep.replace(/^active_persona:.*$/m, personaLine)
    : `${personaLine}\n${withStep}`;

  await writeFile(workflowPath, withPersona, "utf8");
};

/**
 * Record an active delegation in the workflow index.
 * NON-BLOCKING: if WorkflowIndexManager fails, logs a warning and returns normally.
 * Delegation must succeed even if state tracking fails.
 */
export const trackDelegation = async (
  sessionId: string,
  targetPersona: string,
  envelopePath: string,
  cwd: string
): Promise<void> => {
  try {
    const indexPath = workflowIndexPath(join(cwd, ".sinfonia"), sessionId);
    await updateWorkflowIndex(indexPath, {
      currentStep: `delegating-to-${targetPersona}`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[sinfonia] trackDelegation: failed to update workflow index for session ${sessionId} → ${targetPersona} (envelope: ${envelopePath}): ${message}`
    );
  }
};
