/**
 * ENF-001: TDD Enforcer
 *
 * Blocks write/edit/create tool calls when no corresponding test file
 * appears in the current git diff (staged or unstaged).
 *
 * Severity: BLOCKING (tool.execute.before)
 * Layer: dual-layer (persona + plugin)
 */

import { checkGitDiff, resolveTestPath, formatBlockMessage } from "../utils.js";

const WRITE_TOOLS = new Set(["write_file", "edit_file", "create_file", "str_replace_editor"]);

export interface EnforcementResult {
  block: boolean;
  message: string;
}

type ToolParams = Record<string, unknown>;

interface ToolCallContext {
  tool: string;
  params: ToolParams;
}

/**
 * Extracts the file path from tool params.
 * Handles both `path` and `file_path` param keys.
 */
function extractFilePath(params: ToolParams): string | null {
  const path = params["path"] ?? params["file_path"];
  return typeof path === "string" ? path : null;
}

/**
 * Creates the ENF-001 handler bound to a project directory.
 * Returns undefined to allow the tool call, or an EnforcementResult to block it.
 */
export function createTddEnforcerHandler(
  cwd: string
): (ctx: ToolCallContext) => Promise<EnforcementResult | undefined> {
  return async (ctx: ToolCallContext): Promise<EnforcementResult | undefined> => {
    // Only intercept write-type tools
    if (!WRITE_TOOLS.has(ctx.tool)) return undefined;

    const filePath = extractFilePath(ctx.params);
    if (!filePath) return undefined;

    // Resolve candidate test paths — empty means skip this file
    const testCandidates = resolveTestPath(filePath);
    if (testCandidates.length === 0) return undefined;

    // Get modified files from git diff — if git fails, pass through (non-blocking)
    let modifiedFiles: string[];
    try {
      modifiedFiles = await checkGitDiff(cwd);
    } catch {
      return undefined;
    }

    const modifiedSet = new Set(modifiedFiles);

    // Also include .spec.ts variants of each candidate
    const allCandidates = testCandidates.flatMap((c) => [
      c,
      c.replace(/\.test\.([tj]sx?)$/, ".spec.$1"),
    ]);

    // Check if any candidate test path appears in the diff
    const hasTestInDiff = allCandidates.some((candidate) => modifiedSet.has(candidate));
    if (hasTestInDiff) return undefined;

    // Block: no test file found in diff
    const candidateList = testCandidates.map((p) => `  • ${p}`).join("\n");
    const message = formatBlockMessage(
      "ENF-001",
      `No test file found in git diff for: ${filePath}\n\nExpected one of:\n${candidateList}\n\nWrite or modify a test file first, then retry.`,
      filePath
    );

    return { block: true, message };
  };
}
