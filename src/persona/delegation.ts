import { readFile, writeFile } from "node:fs/promises";

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
