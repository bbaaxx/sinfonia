import { Type, Static } from "@sinclair/typebox";

export const VALID_WORKFLOW_TYPES = ["create-prd", "create-spec", "dev-story", "code-review"] as const;
export type ValidWorkflowType = typeof VALID_WORKFLOW_TYPES[number];

export const VALID_DECISIONS = ["approve", "request-revision"] as const;
export type ValidDecision = typeof VALID_DECISIONS[number];

export const StartWorkflowParams = Type.Object({
  workflowType: Type.String({
    description: `Workflow type to start. Must be exactly one of: create-prd, create-spec, dev-story, code-review. Do not include any other text or punctuation.`
  }),
  context: Type.Optional(Type.String({
    description: "Optional context to include when starting the workflow."
  }))
});

export const AdvanceStepParams = Type.Object({
  decision: Type.String({
    description: "Decision for the active step. Must be exactly 'approve' or 'request-revision'. Do not include any other text."
  }),
  feedback: Type.Optional(Type.String({
    description: "Optional reviewer feedback."
  }))
});

export const ListWorkflowsParams = Type.Object({});

export type StartWorkflowParamsType = Static<typeof StartWorkflowParams>;
export type AdvanceStepParamsType = Static<typeof AdvanceStepParams>;
export type ListWorkflowsParamsType = Static<typeof ListWorkflowsParams>;
