import { readFile } from "node:fs/promises";

import type { ParsedHandoffEnvelope } from "./types.js";

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return value;
};

export const readHandoffEnvelope = async (filePath: string): Promise<ParsedHandoffEnvelope> => {
  const raw = await readFile(filePath, "utf8");
  if (!raw.startsWith("---\n")) {
    throw new Error("HV-02: frontmatter missing or malformed");
  }

  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("HV-02: frontmatter missing or malformed");
  }

  const frontmatterText = raw.slice(4, closingIndex).trimEnd();
  const body = raw.slice(closingIndex + 4).replace(/^\s+/, "");

  const frontmatter: Record<string, unknown> = {};
  for (const line of frontmatterText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) {
      throw new Error("HV-02: frontmatter missing or malformed");
    }
    frontmatter[match[1]] = parseScalar(match[2]);
  }

  const sections: Record<string, string> = {};
  let currentSection: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentSection = heading[1].trim();
      sections[currentSection] = "";
      continue;
    }

    if (currentSection) {
      sections[currentSection] = sections[currentSection].length > 0 ? `${sections[currentSection]}\n${line}` : line;
    }
  }

  return {
    frontmatter,
    sections,
    raw
  };
};
