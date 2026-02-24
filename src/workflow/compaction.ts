import { readFile } from "node:fs/promises";

import { readWorkflowIndex } from "./index-manager.js";

const MAX_WORDS = 200;

const countWords = (text: string): number => text.trim().split(/\s+/).filter((item) => item.length > 0).length;

const truncateWords = (text: string, maxWords: number): string => {
  const words = text.trim().split(/\s+/).filter((item) => item.length > 0);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")} ...`;
};

const listOrNone = (items: string[]): string => (items.length > 0 ? items.join("; ") : "none");

const buildTemplate = (
  goal: string,
  currentStep: string,
  status: string,
  sessionId: string,
  workflowId: string,
  keyDecisions: string[],
  recentArtifacts: string[],
  note?: string
): string =>
  [
    "## Compaction Injection",
    `- Session: ${sessionId}`,
    `- Workflow: ${workflowId}`,
    `- Goal: ${goal}`,
    `- Current Step: ${currentStep}`,
    `- Status: ${status}`,
    `- Key Decisions: ${listOrNone(keyDecisions)}`,
    `- Recent Artifacts: ${listOrNone(recentArtifacts)}`,
    ...(note ? [`- Note: ${note}`] : [])
  ].join("\n");

export const generateCompactionInjection = async (workflowPath: string): Promise<string> => {
  try {
    const index = await readWorkflowIndex(workflowPath);
    const decisions = index.decisions.slice(-3).map((item) => `${item.decision} by ${item.reviewer}`);
    const artifacts = index.artifacts.slice(-3).map((item) => `${item.name}(${item.status})`);

    const base = buildTemplate(
      truncateWords(index.goal, 35),
      index.frontmatter.currentStep,
      index.frontmatter.workflowStatus,
      index.frontmatter.sessionId,
      index.frontmatter.workflowId,
      decisions,
      artifacts
    );

    if (countWords(base) <= MAX_WORDS) {
      return base;
    }

    const compact = buildTemplate(
      truncateWords(index.goal, 20),
      index.frontmatter.currentStep,
      index.frontmatter.workflowStatus,
      index.frontmatter.sessionId,
      index.frontmatter.workflowId,
      decisions.slice(0, 2),
      artifacts.slice(0, 2)
    );

    return truncateWords(compact, MAX_WORDS);
  } catch (error) {
    try {
      await readFile(workflowPath, "utf8");
      return buildTemplate(
        "Unavailable (workflow index parse failed)",
        "unknown",
        "blocked",
        "unknown",
        "unknown",
        [],
        [],
        error instanceof Error ? error.message : "corrupt workflow state"
      );
    } catch {
      return buildTemplate(
        "Unavailable (workflow file missing)",
        "unknown",
        "blocked",
        "unknown",
        "unknown",
        [],
        [],
        "workflow file not found"
      );
    }
  }
};

export const compactionWordLimit = (): number => MAX_WORDS;
