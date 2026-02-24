import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { writeHandoffEnvelope } from "./writer.js";

export type ApprovalDecision = "approve" | "reject";

export type ApplyApprovalOptions = {
  cwd: string;
  envelopePath: string;
  workflowPath: string;
  decision: ApprovalDecision;
  reviewer: string;
  note?: string;
};

type EnvelopeFields = Record<string, string>;

const parseEnvelope = (content: string): { frontmatter: EnvelopeFields; body: string } => {
  if (!content.startsWith("---\n")) {
    throw new Error("Envelope frontmatter is required");
  }
  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("Envelope frontmatter is malformed");
  }

  const frontmatterLines = content.slice(4, closingIndex).split(/\r?\n/);
  const frontmatter: EnvelopeFields = {};
  for (const line of frontmatterLines) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) {
      continue;
    }
    frontmatter[match[1]] = match[2].trim();
  }

  const body = content.slice(closingIndex + 4).replace(/^\s+/, "");
  return { frontmatter, body };
};

const frontmatterToString = (fields: EnvelopeFields): string =>
  [
    "---",
    ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`),
    "---",
    ""
  ].join("\n");

const appendDecisionRow = async (
  workflowPath: string,
  handoffId: string,
  decision: ApprovalDecision,
  reviewer: string,
  note: string,
  timestamp: string
): Promise<void> => {
  const row = `| ${timestamp} | ${handoffId} | ${decision} | ${reviewer} | ${note} |`;
  const tableHeader = "| Timestamp | Handoff ID | Decision | Reviewer | Note |";
  const tableDivider = "| --- | --- | --- | --- | --- |";

  let workflow = "";
  try {
    workflow = await readFile(workflowPath, "utf8");
  } catch {
    workflow = "# Workflow\n";
  }

  if (!workflow.includes("## Decisions")) {
    workflow = `${workflow.trimEnd()}\n\n## Decisions\n${tableHeader}\n${tableDivider}\n${row}\n`;
    await writeFile(workflowPath, workflow, "utf8");
    return;
  }

  const marker = "## Decisions";
  const markerIndex = workflow.indexOf(marker);
  const before = workflow.slice(0, markerIndex + marker.length);
  const after = workflow.slice(markerIndex + marker.length);

  if (!after.includes(tableHeader)) {
    const next = `${before}\n${tableHeader}\n${tableDivider}\n${row}${after}`;
    await writeFile(workflowPath, next, "utf8");
    return;
  }

  const next = workflow.replace(tableDivider, `${tableDivider}\n${row}`);
  await writeFile(workflowPath, next, "utf8");
};

export const applyApprovalDecision = async (
  options: ApplyApprovalOptions
): Promise<{ revisionPath?: string }> => {
  const now = new Date().toISOString();
  const envelopeRaw = await readFile(options.envelopePath, "utf8");
  const parsed = parseEnvelope(envelopeRaw);
  const handoffId = parsed.frontmatter.handoff_id ?? "unknown";

  parsed.frontmatter.approval = options.decision;
  parsed.frontmatter.approved_by = options.reviewer;
  parsed.frontmatter.approved_at = now;

  const updatedEnvelope = `${frontmatterToString(parsed.frontmatter)}${parsed.body}`;
  await writeFile(options.envelopePath, updatedEnvelope, "utf8");

  await appendDecisionRow(
    options.workflowPath,
    handoffId,
    options.decision,
    options.reviewer,
    options.note ?? "",
    now
  );

  if (options.decision === "reject") {
    const sessionId = parsed.frontmatter.session_id;
    const source = parsed.frontmatter.source_persona;
    const target = parsed.frontmatter.target_persona;
    if (!sessionId || !source || !target) {
      throw new Error("Cannot create revision handoff without source/target/session metadata");
    }

    const revision = await writeHandoffEnvelope(
      options.cwd,
      {
        sourcePersona: target,
        targetPersona: source,
        type: "revision",
        status: "pending",
        artifacts: [handoffId],
        revisionRequired: options.note ?? "Revision required",
        feedback: options.note ?? "Please revise and resubmit",
        nextSteps: ["Address feedback", "Resubmit handoff"]
      },
      sessionId,
      new Date(now)
    );

    return { revisionPath: revision.filePath };
  }

  return {};
};

export const canProgressPipeline = async (envelopePath: string): Promise<boolean> => {
  const content = await readFile(envelopePath, "utf8");
  const parsed = parseEnvelope(content);
  return parsed.frontmatter.approval === "approve";
};

export const workflowPathForSession = (cwd: string, sessionId: string): string =>
  join(cwd, ".sinfonia/handoffs", sessionId, "workflow.md");

export const envelopeDirectory = (envelopePath: string): string => dirname(envelopePath);
