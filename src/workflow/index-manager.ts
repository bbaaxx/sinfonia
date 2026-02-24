import { open, readFile, rename, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  CreateWorkflowIndexOptions,
  UpdateWorkflowIndexPatch,
  WorkflowArtifact,
  WorkflowDecision,
  WorkflowFrontmatter,
  WorkflowIndex,
  WorkflowSession,
  WorkflowStatus,
  WorkflowStep
} from "./types.js";

const WORKFLOW_FILENAME = "workflow.md";
const TEMP_FILENAME = ".workflow.md.tmp";

const nowIso = (): string => new Date().toISOString();

const transitionMap: Record<WorkflowStatus, WorkflowStatus[]> = {
  created: ["created", "in-progress", "blocked", "failed"],
  "in-progress": ["in-progress", "complete", "blocked", "failed"],
  complete: ["complete"],
  blocked: ["blocked", "in-progress", "failed"],
  failed: ["failed", "in-progress"]
};

const toFrontmatter = (frontmatter: WorkflowFrontmatter): string =>
  [
    "---",
    `workflow_id: ${frontmatter.workflowId}`,
    `workflow_status: ${frontmatter.workflowStatus}`,
    `current_step: ${frontmatter.currentStep}`,
    `current_step_index: ${frontmatter.currentStepIndex}`,
    `total_steps: ${frontmatter.totalSteps}`,
    `session_id: ${frontmatter.sessionId}`,
    `created_at: ${frontmatter.createdAt}`,
    `updated_at: ${frontmatter.updatedAt}`,
    "---",
    ""
  ].join("\n");

const toRows = (rows: string[][]): string => rows.map((columns) => `| ${columns.join(" | ")} |`).join("\n");

const renderBody = (
  goal: string,
  steps: WorkflowStep[],
  artifacts: WorkflowArtifact[],
  decisions: WorkflowDecision[],
  sessions: WorkflowSession[],
  context: string
): string => {
  const stepRows = toRows([
    ["Step", "Persona", "Status", "Started At", "Completed At", "Notes"],
    ["---", "---", "---", "---", "---", "---"],
    ...steps.map((step) => [step.step, step.persona, step.status, step.startedAt, step.completedAt, step.notes])
  ]);

  const artifactRows = toRows([
    ["Name", "Type", "Status", "Updated At", "Notes"],
    ["---", "---", "---", "---", "---"],
    ...artifacts.map((item) => [item.name, item.type, item.status, item.updatedAt, item.notes])
  ]);

  const decisionRows = toRows([
    ["Timestamp", "Handoff ID", "Decision", "Reviewer", "Note"],
    ["---", "---", "---", "---", "---"],
    ...decisions.map((item) => [item.timestamp, item.handoffId, item.decision, item.reviewer, item.note])
  ]);

  const sessionRows = toRows([
    ["Session ID", "Started At", "Last Active At", "Status"],
    ["---", "---", "---", "---"],
    ...sessions.map((item) => [item.sessionId, item.startedAt, item.lastActiveAt, item.status])
  ]);

  return [
    "## Goal",
    goal,
    "",
    "## Steps",
    stepRows,
    "",
    "## Artifacts",
    artifactRows,
    "",
    "## Decisions",
    decisionRows,
    "",
    "## Sessions",
    sessionRows,
    "",
    "## Context",
    context
  ].join("\n");
};

const parseScalar = (value: string): string | number => {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return trimmed;
};

const parseFrontmatter = (content: string): { frontmatter: WorkflowFrontmatter; body: string } => {
  if (!content.startsWith("---\n")) {
    throw new Error("workflow frontmatter missing");
  }
  const closing = content.indexOf("\n---", 4);
  if (closing === -1) {
    throw new Error("workflow frontmatter malformed");
  }

  const data: Record<string, string | number> = {};
  for (const line of content.slice(4, closing).split(/\r?\n/)) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) {
      continue;
    }
    data[match[1]] = parseScalar(match[2]);
  }

  const frontmatter: WorkflowFrontmatter = {
    workflowId: String(data.workflow_id ?? ""),
    workflowStatus: String(data.workflow_status ?? "created") as WorkflowStatus,
    currentStep: String(data.current_step ?? ""),
    currentStepIndex: Number(data.current_step_index ?? 1),
    totalSteps: Number(data.total_steps ?? 0),
    sessionId: String(data.session_id ?? ""),
    createdAt: String(data.created_at ?? ""),
    updatedAt: String(data.updated_at ?? "")
  };

  return {
    frontmatter,
    body: content.slice(closing + 4).replace(/^\s+/, "")
  };
};

const extractSection = (body: string, title: string): string => {
  const marker = `## ${title}`;
  const start = body.indexOf(marker);
  if (start === -1) {
    return "";
  }
  const rest = body.slice(start + marker.length).replace(/^\s+/, "");
  const next = rest.search(/\n##\s+/);
  return (next === -1 ? rest : rest.slice(0, next)).trimEnd();
};

const parseTable = (section: string): string[][] =>
  section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((part) => part.trim()));

const parseWorkflowIndex = (content: string): WorkflowIndex => {
  const parsed = parseFrontmatter(content);
  const goal = extractSection(parsed.body, "Goal");
  const context = extractSection(parsed.body, "Context");

  const steps = parseTable(extractSection(parsed.body, "Steps"))
    .slice(2)
    .map((row) => ({
      step: row[0] ?? "",
      persona: row[1] ?? "",
      status: (row[2] ?? "pending") as WorkflowStep["status"],
      startedAt: row[3] ?? "",
      completedAt: row[4] ?? "",
      notes: row[5] ?? ""
    }));

  const artifacts = parseTable(extractSection(parsed.body, "Artifacts"))
    .slice(2)
    .map((row) => ({
      name: row[0] ?? "",
      type: row[1] ?? "",
      status: row[2] ?? "",
      updatedAt: row[3] ?? "",
      notes: row[4] ?? ""
    }));

  const decisions = parseTable(extractSection(parsed.body, "Decisions"))
    .slice(2)
    .map((row) => ({
      timestamp: row[0] ?? "",
      handoffId: row[1] ?? "",
      decision: row[2] ?? "",
      reviewer: row[3] ?? "",
      note: row[4] ?? ""
    }));

  const sessions = parseTable(extractSection(parsed.body, "Sessions"))
    .slice(2)
    .map((row) => ({
      sessionId: row[0] ?? "",
      startedAt: row[1] ?? "",
      lastActiveAt: row[2] ?? "",
      status: row[3] ?? ""
    }));

  return {
    frontmatter: parsed.frontmatter,
    goal,
    steps,
    artifacts,
    decisions,
    sessions,
    context,
    rawBody: parsed.body
  };
};

const assertTransition = (from: WorkflowStatus, to: WorkflowStatus): void => {
  if (!transitionMap[from].includes(to)) {
    throw new Error(`Invalid workflow status transition: ${from} -> ${to}`);
  }
};

export const workflowIndexPath = (cwd: string, sessionId: string): string =>
  join(cwd, ".sinfonia/handoffs", sessionId, WORKFLOW_FILENAME);

export const writeWorkflowIndexAtomically = async (
  filePath: string,
  content: string,
  options: { simulateCrashBeforeRename?: boolean } = {}
): Promise<void> => {
  const directory = dirname(filePath);
  const tempPath = join(directory, TEMP_FILENAME);

  await mkdir(directory, { recursive: true });
  await writeFile(tempPath, content, "utf8");

  const handle = await open(tempPath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }

  if (options.simulateCrashBeforeRename) {
    throw new Error("Simulated crash before rename");
  }

  await rename(tempPath, filePath);
};

export const createWorkflowIndex = async (options: CreateWorkflowIndexOptions): Promise<WorkflowIndex> => {
  const timestamp = nowIso();
  const steps: WorkflowStep[] = options.steps.map((step, index) => ({
    step: step.step,
    persona: step.persona,
    status: index === 0 ? "pending" : "pending",
    startedAt: "",
    completedAt: "",
    notes: ""
  }));

  const frontmatter: WorkflowFrontmatter = {
    workflowId: options.workflowId,
    workflowStatus: "created",
    currentStep: options.steps[0]?.step ?? "",
    currentStepIndex: 1,
    totalSteps: options.steps.length,
    sessionId: options.sessionId,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const sessions: WorkflowSession[] = [
    {
      sessionId: options.sessionId,
      startedAt: timestamp,
      lastActiveAt: timestamp,
      status: "active"
    }
  ];

  const body = renderBody(options.goal, steps, [], [], sessions, options.context ?? "");
  const content = `${toFrontmatter(frontmatter)}${body}\n`;

  const filePath = workflowIndexPath(options.cwd, options.sessionId);
  await writeWorkflowIndexAtomically(filePath, content);

  return parseWorkflowIndex(content);
};

export const readWorkflowIndex = async (filePath: string): Promise<WorkflowIndex> => {
  const content = await readFile(filePath, "utf8");
  return parseWorkflowIndex(content);
};

export const updateWorkflowIndex = async (
  filePath: string,
  patch: UpdateWorkflowIndexPatch
): Promise<WorkflowIndex> => {
  const current = await readWorkflowIndex(filePath);
  const nextFrontmatter: WorkflowFrontmatter = {
    ...current.frontmatter,
    ...(patch.workflowStatus ? { workflowStatus: patch.workflowStatus } : {}),
    ...(patch.currentStep ? { currentStep: patch.currentStep } : {}),
    ...(patch.currentStepIndex ? { currentStepIndex: patch.currentStepIndex } : {}),
    updatedAt: nowIso()
  };

  if (patch.workflowStatus) {
    assertTransition(current.frontmatter.workflowStatus, patch.workflowStatus);
  }

  const body = renderBody(
    current.goal,
    current.steps,
    current.artifacts,
    current.decisions,
    current.sessions,
    current.context
  );
  const content = `${toFrontmatter(nextFrontmatter)}${body}\n`;
  await writeWorkflowIndexAtomically(filePath, content);
  return parseWorkflowIndex(content);
};

export const addDecision = async (
  cwd: string,
  sessionId: string,
  decision: WorkflowDecision
): Promise<void> => {
  const filePath = workflowIndexPath(cwd, sessionId);
  const current = await readWorkflowIndex(filePath);
  const nextFrontmatter: WorkflowFrontmatter = {
    ...current.frontmatter,
    updatedAt: nowIso()
  };
  const body = renderBody(
    current.goal,
    current.steps,
    current.artifacts,
    [...current.decisions, decision],
    current.sessions,
    current.context
  );
  const content = `${toFrontmatter(nextFrontmatter)}${body}\n`;
  await writeWorkflowIndexAtomically(filePath, content);
};

export const addArtifact = async (
  cwd: string,
  sessionId: string,
  artifact: WorkflowArtifact
): Promise<void> => {
  const filePath = workflowIndexPath(cwd, sessionId);
  const current = await readWorkflowIndex(filePath);
  const nextFrontmatter: WorkflowFrontmatter = {
    ...current.frontmatter,
    updatedAt: nowIso()
  };
  const body = renderBody(
    current.goal,
    current.steps,
    [...current.artifacts, artifact],
    current.decisions,
    current.sessions,
    current.context
  );
  const content = `${toFrontmatter(nextFrontmatter)}${body}\n`;
  await writeWorkflowIndexAtomically(filePath, content);
};
