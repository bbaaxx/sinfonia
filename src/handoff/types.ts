export type HandoffType = "delegation" | "return" | "error";

export type HandoffStatus = "pending" | "completed" | "blocked";

export type HandoffPayload = {
  sourcePersona: string;
  targetPersona: string;
  type: HandoffType;
  status: HandoffStatus;
  task: string;
  context: string;
  constraints?: string[];
  result?: string;
  evidence?: string[];
  nextSteps?: string[];
  errorSummary?: string;
  impact?: string;
  recovery?: string;
};

export type WrittenHandoff = {
  handoffId: string;
  sessionId: string;
  sequence: number;
  filePath: string;
};
