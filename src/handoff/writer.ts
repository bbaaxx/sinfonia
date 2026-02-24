import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { HandoffPayload, WrittenHandoff } from "./types.js";

const toTimestamp = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(
    2,
    "0"
  )}-${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(
    date.getUTCSeconds()
  ).padStart(2, "0")}`;

const words = (text: string): number => text.trim().split(/\s+/).filter((item) => item.length > 0).length;

const list = (entries: string[] | undefined): string => (entries && entries.length > 0 ? entries.map((x) => `- ${x}`).join("\n") : "- none");

export const createSessionId = (date: Date = new Date()): string => `s-${toTimestamp(date)}`;

export const handoffPathFor = (
  cwd: string,
  sessionId: string,
  sequence: number,
  sourcePersona: string,
  targetPersona: string
): string => {
  const filename = `${String(sequence).padStart(3, "0")}-${sourcePersona}-to-${targetPersona}.md`;
  return join(cwd, ".sinfonia/handoffs", sessionId, filename);
};

const nextSequence = async (sessionDir: string): Promise<number> => {
  await mkdir(sessionDir, { recursive: true });
  const entries = await readdir(sessionDir);
  let max = 0;
  for (const entry of entries) {
    const match = entry.match(/^(\d{3})-/);
    if (!match) {
      continue;
    }
    const value = Number.parseInt(match[1], 10);
    if (value > max) {
      max = value;
    }
  }
  return max + 1;
};

const bodyFor = (payload: HandoffPayload): string => {
  if (payload.type === "dispatch") {
    return [
      "## Artifacts",
      list(payload.artifacts),
      "",
      "## Task",
      payload.task ?? "",
      "",
      "## Context",
      payload.context ?? "",
      "",
      "## Constraints",
      list(payload.constraints)
    ].join("\n");
  }

  if (payload.type === "return") {
    return [
      "## Artifacts",
      list(payload.artifacts),
      "",
      "## Summary",
      payload.summary ?? payload.result ?? "",
      "",
      "## Completion Assessment",
      payload.completionAssessment ?? "",
      "",
      "## Blockers",
      list(payload.blockers),
      "",
      "## Recommendations",
      list(payload.recommendations ?? payload.nextSteps)
    ].join("\n");
  }

  if (payload.type === "revision") {
    return [
      "## Artifacts",
      list(payload.artifacts),
      "",
      "## Revision Required",
      payload.revisionRequired ?? "",
      "",
      "## Feedback",
      payload.feedback ?? "",
      "",
      "## Next Steps",
      list(payload.nextSteps)
    ].join("\n");
  }

  return [
    "## Artifacts",
    list(payload.artifacts),
    "",
    "## Message",
    payload.message ?? ""
  ].join("\n");
};

export const writeHandoffEnvelope = async (
  cwd: string,
  payload: HandoffPayload,
  sessionId: string = createSessionId(),
  createdAt: Date = new Date()
): Promise<WrittenHandoff> => {
  const sessionDir = join(cwd, ".sinfonia/handoffs", sessionId);
  const sequence = await nextSequence(sessionDir);
  const filePath = handoffPathFor(cwd, sessionId, sequence, payload.sourcePersona, payload.targetPersona);
  const handoffId = `${sessionId}-${String(sequence).padStart(3, "0")}`;
  const body = bodyFor(payload);

  if (words(body) > 500) {
    throw new Error("Handoff body must be <= 500 words");
  }

  const frontmatter = [
    "---",
    `handoff_id: ${handoffId}`,
    `session_id: ${sessionId}`,
    `sequence: ${sequence}`,
    `source_persona: ${payload.sourcePersona}`,
    `target_persona: ${payload.targetPersona}`,
    `handoff_type: ${payload.type}`,
    `status: ${payload.status}`,
    `created_at: ${createdAt.toISOString()}`,
    `word_count: ${words(body)}`,
    "---",
    ""
  ].join("\n");

  await writeFile(filePath, `${frontmatter}${body}\n`, "utf8");

  return {
    handoffId,
    sessionId,
    sequence,
    filePath
  };
};
