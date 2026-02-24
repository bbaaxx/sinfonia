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

// ---------------------------------------------------------------------------
// Step Engine Types (Epic 4.0)
// ---------------------------------------------------------------------------

/** A single step definition discovered from the workflow steps directory. */
export type WorkflowStepDef = {
  /** 1-indexed step number. */
  index: number;
  /** Slug derived from the step filename (e.g. "gather-requirements"). */
  slug: string;
  /** Absolute path to the step Markdown file. */
  filePath: string;
};

/** Parsed workflow definition loaded from a workflow.md definition file. */
export type WorkflowDef = {
  /** Workflow name (directory name under .sinfonia/workflows/). */
  name: string;
  /** Human-readable description from the workflow.md header. */
  description: string;
  /** Total number of steps discovered. */
  totalSteps: number;
  /** Ordered list of step definitions. */
  steps: WorkflowStepDef[];
};

/** Result of loading a single step file on demand. */
export type StepLoadResult = {
  /** 1-indexed step number. */
  stepIndex: number;
  /** Step slug. */
  slug: string;
  /** Absolute path to the step file. */
  filePath: string;
  /** Full Markdown content of the step file. */
  content: string;
  /** Total steps in the workflow (for progress display). */
  totalSteps: number;
};

/** Runtime state of the step engine for a given workflow session. */
export type StepEngineState = {
  workflowName: string;
  sessionId: string;
  currentStepIndex: number;
  totalSteps: number;
  status: WorkflowStatus;
};
