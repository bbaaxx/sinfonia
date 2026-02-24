import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { validatePersonaContent } from "./content.js";
import { validatePersonaFrontmatter } from "./frontmatter.js";
import { validatePersonaSections } from "./sections.js";
import type { ValidationIssue } from "./types.js";

export type FileValidationResult = {
  filePath: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type ValidationRunResult = {
  files: FileValidationResult[];
  errorCount: number;
  warningCount: number;
};

const collectMarkdownFiles = async (basePath: string, recursive: boolean): Promise<string[]> => {
  const details = await stat(basePath);
  if (details.isFile()) {
    return extname(basePath) === ".md" ? [resolve(basePath)] : [];
  }

  const entries = await readdir(basePath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(basePath, entry.name);
    if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(resolve(fullPath));
      continue;
    }

    if (entry.isDirectory() && recursive) {
      files.push(...(await collectMarkdownFiles(fullPath, true)));
    }
  }

  return files;
};

const extractSectionBody = (content: string, sectionName: string): string => {
  const body = content.startsWith("---\n")
    ? content.slice(content.indexOf("\n---", 4) + 4)
    : content;
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(`^##\\s+${escapedName}\\s*$`, "m");
  const match = sectionRegex.exec(body);
  if (!match) {
    return "";
  }

  const start = match.index + match[0].length;
  const remaining = body.slice(start);
  const nextHeading = remaining.search(/\n##\s+/);
  return nextHeading === -1 ? remaining : remaining.slice(0, nextHeading);
};

const validateCrossFileReferences = (
  filePath: string,
  content: string,
  knownPersonaIds: Set<string>
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const activationBody = extractSectionBody(content, "Activation Sequence");
  const menuBody = extractSectionBody(content, "Menu");
  const combined = `${activationBody}\n${menuBody}`;

  const references = [...combined.matchAll(/@([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((match) => match[1]);
  for (const reference of references) {
    if (!knownPersonaIds.has(reference)) {
      issues.push({
        ruleId: "XR-01",
        severity: "ERROR",
        message: `Unknown persona reference @${reference} in ${filePath}`
      });
    }
  }

  return issues;
};

export const validatePersonaPaths = async (
  targetPath: string,
  validateAll: boolean
): Promise<ValidationRunResult> => {
  const files = await collectMarkdownFiles(targetPath, validateAll);
  const rawByFile = new Map<string, string>();
  const personaIdByFile = new Map<string, string>();

  const results: FileValidationResult[] = [];
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    rawByFile.set(filePath, content);

    const frontmatterResult = validatePersonaFrontmatter(filePath, content);
    const personaMode =
      frontmatterResult.frontmatter && typeof frontmatterResult.frontmatter.persona_mode === "string"
        ? frontmatterResult.frontmatter.persona_mode
        : undefined;
    const sectionResult = validatePersonaSections(content, personaMode);
    const contentResult = validatePersonaContent(content);

    if (frontmatterResult.frontmatter && typeof frontmatterResult.frontmatter.persona_id === "string") {
      personaIdByFile.set(filePath, frontmatterResult.frontmatter.persona_id);
    }

    results.push({
      filePath,
      errors: [...frontmatterResult.errors, ...sectionResult.errors, ...contentResult.errors],
      warnings: [...frontmatterResult.warnings, ...sectionResult.warnings, ...contentResult.warnings]
    });
  }

  const knownIds = new Set(personaIdByFile.values());
  for (const result of results) {
    const content = rawByFile.get(result.filePath);
    if (!content) {
      continue;
    }

    const referenceIssues = validateCrossFileReferences(result.filePath, content, knownIds);
    result.errors.push(...referenceIssues);
  }

  return {
    files: results,
    errorCount: results.reduce((count, item) => count + item.errors.length, 0),
    warningCount: results.reduce((count, item) => count + item.warnings.length, 0)
  };
};
