export type HandoffType = "dispatch" | "return" | "revision" | "direct";

export type HandoffStatus = "pending" | "completed" | "blocked";

export type HandoffPayload = {
  sourcePersona: string;
  targetPersona: string;
  type: HandoffType;
  status: HandoffStatus;
  artifacts?: string[];
  task?: string;
  context?: string;
  constraints?: string[];
  summary?: string;
  completionAssessment?: string;
  blockers?: string[];
  recommendations?: string[];
  revisionRequired?: string;
  feedback?: string;
  message?: string;
  result?: string;
  evidence?: string[];
  nextSteps?: string[];
};

export type WrittenHandoff = {
  handoffId: string;
  sessionId: string;
  sequence: number;
  filePath: string;
};

export type ParsedHandoffEnvelope = {
  frontmatter: Record<string, unknown>;
  sections: Record<string, string>;
  raw: string;
};
