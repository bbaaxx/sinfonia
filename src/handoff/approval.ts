import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { addDecision } from "../workflow/index-manager.js";
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

export const applyApprovalDecision = async (
  options: ApplyApprovalOptions
): Promise<{ revisionPath?: string }> => {
  const now = new Date().toISOString();
  const envelopeRaw = await readFile(options.envelopePath, "utf8");
  const parsed = parseEnvelope(envelopeRaw);
  const handoffId = parsed.frontmatter.handoff_id ?? "unknown";
  const sessionId = parsed.frontmatter.session_id ?? "";

  parsed.frontmatter.approval = options.decision;
  parsed.frontmatter.approved_by = options.reviewer;
  parsed.frontmatter.approved_at = now;

  const updatedEnvelope = `${frontmatterToString(parsed.frontmatter)}${parsed.body}`;
  await writeFile(options.envelopePath, updatedEnvelope, "utf8");

  try {
    await addDecision(options.cwd, sessionId, {
      timestamp: now,
      handoffId,
      decision: options.decision,
      reviewer: options.reviewer,
      note: options.note ?? ""
    });
  } catch (err) {
    console.warn(`[approval] workflow index decision recording failed for ${handoffId}:`, err);
  }

  if (options.decision === "reject") {
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
