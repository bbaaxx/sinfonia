import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { readHandoffEnvelope } from "../handoff/reader.js";
import { createWorkflowIndex, readWorkflowIndex, updateWorkflowIndex, workflowIndexPath } from "./index-manager.js";
import type { WorkflowStatus } from "./types.js";

export type ResumeStatus = "ok" | "recovered" | "missing" | "inconsistent";

export type ResumeReport = {
  scenario: "compaction" | "crash" | "multi-session";
  status: ResumeStatus;
  sessionId: string;
  workflowPath: string;
  workflowId: string;
  currentStep: string;
  currentStepIndex: number;
  inconsistencies: string[];
  message: string;
};

type ParsedInjection = {
  sessionId?: string;
  workflowId?: string;
  currentStep?: string;
  status?: string;
};

const parseInjection = (injection: string): ParsedInjection => {
  const parsed: ParsedInjection = {};
  for (const line of injection.split(/\r?\n/)) {
    const match = line.match(/^-\s+([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "session") {
      parsed.sessionId = value;
    }
    if (key === "workflow") {
      parsed.workflowId = value;
    }
    if (key === "current step") {
      parsed.currentStep = value;
    }
    if (key === "status") {
      parsed.status = value;
    }
  }
  return parsed;
};

const activeStatus = (status: WorkflowStatus): boolean => ["created", "in-progress", "blocked"].includes(status);

const extractEnvelopeSequence = async (filePath: string): Promise<number | null> => {
  try {
    const envelope = await readHandoffEnvelope(filePath);
    const sequence = Number(envelope.frontmatter.sequence);
    return Number.isFinite(sequence) ? sequence : null;
  } catch {
    return null;
  }
};

export const resumeFromCompaction = async (cwd: string, injection: string): Promise<ResumeReport> => {
  const parsed = parseInjection(injection);
  const sessionId = parsed.sessionId ?? "unknown";
  const workflowPath = workflowIndexPath(cwd, sessionId);

  if (!parsed.sessionId || !parsed.workflowId || !parsed.currentStep) {
    return {
      scenario: "compaction",
      status: "missing",
      sessionId,
      workflowPath,
      workflowId: parsed.workflowId ?? "unknown",
      currentStep: parsed.currentStep ?? "unknown",
      currentStepIndex: 0,
      inconsistencies: ["Injection missing required continuity fields"],
      message: "Cannot resume from incomplete compaction injection"
    };
  }

  try {
    const index = await readWorkflowIndex(workflowPath);
    const inconsistencies: string[] = [];
    if (index.frontmatter.workflowId !== parsed.workflowId) {
      inconsistencies.push("Workflow id mismatch between injection and workflow index");
    }
    if (index.frontmatter.currentStep !== parsed.currentStep) {
      inconsistencies.push("Current step mismatch between injection and workflow index");
    }

    return {
      scenario: "compaction",
      status: inconsistencies.length > 0 ? "inconsistent" : "ok",
      sessionId,
      workflowPath,
      workflowId: index.frontmatter.workflowId,
      currentStep: index.frontmatter.currentStep,
      currentStepIndex: index.frontmatter.currentStepIndex,
      inconsistencies,
      message: inconsistencies.length > 0 ? "Compaction resume found inconsistencies" : "Compaction resume validated"
    };
  } catch {
    return {
      scenario: "compaction",
      status: "missing",
      sessionId,
      workflowPath,
      workflowId: parsed.workflowId,
      currentStep: parsed.currentStep,
      currentStepIndex: 0,
      inconsistencies: ["Workflow index not found for injected session"],
      message: "Compaction resume failed: workflow index missing"
    };
  }
};

export const recoverFromCrash = async (cwd: string, sessionId: string): Promise<ResumeReport> => {
  const workflowPath = workflowIndexPath(cwd, sessionId);
  const sessionDir = join(cwd, ".sinfonia/handoffs", sessionId);
  const entries = await readdir(sessionDir);
  const envelopeFiles = entries
    .filter((entry) => entry.endsWith(".md") && entry !== "workflow.md")
    .map((entry) => join(sessionDir, entry));

  const sequences = (
    await Promise.all(envelopeFiles.map(async (file) => ({ file, seq: await extractEnvelopeSequence(file) })))
  )
    .filter((item): item is { file: string; seq: number } => item.seq !== null)
    .sort((a, b) => a.seq - b.seq);

  const inconsistencies: string[] = [];
  let recovered = false;

  let index;
  try {
    index = await readWorkflowIndex(workflowPath);
  } catch {
    const steps = sequences.map((item) => ({ step: `handoff-${String(item.seq).padStart(3, "0")}`, persona: "maestro" }));
    index = await createWorkflowIndex({
      cwd,
      sessionId,
      workflowId: "recovered-workflow",
      goal: "Recovered from envelope history",
      steps: steps.length > 0 ? steps : [{ step: "recovered", persona: "maestro" }],
      context: "Recovered from crash using envelopes"
    });
    recovered = true;
    inconsistencies.push("Workflow index missing/corrupt; rebuilt from envelopes");
  }

  const envelopeCount = sequences.length;
  if (envelopeCount > 0 && index.frontmatter.currentStepIndex > envelopeCount) {
    inconsistencies.push("Workflow index step index exceeds envelope sequence count");
  }

  if (envelopeCount > 0 && index.frontmatter.currentStepIndex < envelopeCount) {
    const lastStep = `handoff-${String(sequences[envelopeCount - 1].seq).padStart(3, "0")}`;
    await updateWorkflowIndex(workflowPath, {
      workflowStatus: "in-progress",
      currentStep: lastStep,
      currentStepIndex: envelopeCount
    });
    index = await readWorkflowIndex(workflowPath);
    inconsistencies.push("Workflow index lagged envelope count; advanced to latest envelope sequence");
    recovered = true;
  }

  return {
    scenario: "crash",
    status: inconsistencies.length > 0 ? (recovered ? "recovered" : "inconsistent") : "ok",
    sessionId,
    workflowPath,
    workflowId: index.frontmatter.workflowId,
    currentStep: index.frontmatter.currentStep,
    currentStepIndex: index.frontmatter.currentStepIndex,
    inconsistencies,
    message:
      inconsistencies.length > 0
        ? "Crash recovery completed with reconciliation notes"
        : "Crash recovery found consistent workflow state"
  };
};

export const resumeLatestActiveSession = async (cwd: string): Promise<ResumeReport | null> => {
  const root = join(cwd, ".sinfonia/handoffs");
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return null;
  }

  const candidates: Array<{ sessionId: string; workflowPath: string; updatedAt: number; workflowId: string; currentStep: string; currentStepIndex: number }> = [];

  for (const sessionId of entries.filter((entry) => /^s-\d{8}-\d{6}$/.test(entry))) {
    const workflowPath = workflowIndexPath(cwd, sessionId);
    try {
      const index = await readWorkflowIndex(workflowPath);
      if (!activeStatus(index.frontmatter.workflowStatus)) {
        continue;
      }
      const updatedAt = Date.parse(index.frontmatter.updatedAt);
      candidates.push({
        sessionId,
        workflowPath,
        updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
        workflowId: index.frontmatter.workflowId,
        currentStep: index.frontmatter.currentStep,
        currentStepIndex: index.frontmatter.currentStepIndex
      });
    } catch {
      continue;
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  const chosen = candidates[0];

  return {
    scenario: "multi-session",
    status: "ok",
    sessionId: chosen.sessionId,
    workflowPath: chosen.workflowPath,
    workflowId: chosen.workflowId,
    currentStep: chosen.currentStep,
    currentStepIndex: chosen.currentStepIndex,
    inconsistencies: [],
    message: `Resumed latest active session from ${new Date(chosen.updatedAt).toISOString()}`
  };
};

export const readInjectionFromFile = async (filePath: string): Promise<string> => readFile(filePath, "utf8");
