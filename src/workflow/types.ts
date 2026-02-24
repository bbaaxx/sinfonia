export type WorkflowStatus = "created" | "in-progress" | "complete" | "blocked" | "failed";

export type WorkflowStepStatus = "pending" | "in-progress" | "completed" | "blocked" | "failed";

export type WorkflowFrontmatter = {
  workflowId: string;
  workflowStatus: WorkflowStatus;
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStep = {
  step: string;
  persona: string;
  status: WorkflowStepStatus;
  startedAt: string;
  completedAt: string;
  notes: string;
};

export type WorkflowArtifact = {
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  notes: string;
};

export type WorkflowDecision = {
  timestamp: string;
  handoffId: string;
  decision: string;
  reviewer: string;
  note: string;
};

export type WorkflowSession = {
  sessionId: string;
  startedAt: string;
  lastActiveAt: string;
  status: string;
};

export type WorkflowIndex = {
  frontmatter: WorkflowFrontmatter;
  goal: string;
  steps: WorkflowStep[];
  artifacts: WorkflowArtifact[];
  decisions: WorkflowDecision[];
  sessions: WorkflowSession[];
  context: string;
  rawBody: string;
};

export type CreateWorkflowIndexOptions = {
  cwd: string;
  sessionId: string;
  workflowId: string;
  goal: string;
  steps: Array<{ step: string; persona: string }>;
  context?: string;
};

export type UpdateWorkflowIndexPatch = {
  workflowStatus?: WorkflowStatus;
  currentStep?: string;
  currentStepIndex?: number;
};
