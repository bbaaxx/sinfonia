/**
 * ENF-002: Secret Protection
 *
 * Blocks read/write/edit tool calls targeting sensitive credential files.
 * Patterns: .env, .env.*, *.key, *.pem, credentials.*, secrets/ dirs, .opencode/plugins/
 *
 * Severity: BLOCKING (tool.execute.before)
 * Layer: plugin-only
 */

import { matchesPattern, formatBlockMessage } from "../utils.js";

// Files that look like secrets but are safe (templates/examples)
const ALLOWLIST_PATTERNS = [".env.example", ".env.template", ".env.sample", ".env.test"];

// Patterns that indicate a sensitive credential file
const SECRET_PATTERNS = [
  ".env",
  ".env.*",
  "*.key",
  "*.pem",
  "credentials.*",
  "**/secrets/**",
  ".opencode/plugins/**",
];

const FILE_TOOLS = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "create_file",
  "str_replace_editor",
]);

export interface EnforcementResult {
  block: boolean;
  message: string;
}

type ToolParams = Record<string, unknown>;

interface ToolCallContext {
  tool: string;
  params: ToolParams;
}

function extractFilePath(params: ToolParams): string | null {
  const path = params["path"] ?? params["file_path"];
  return typeof path === "string" ? path : null;
}

function isAllowlisted(filePath: string): boolean {
  return ALLOWLIST_PATTERNS.some((pattern) => matchesPattern(filePath, pattern));
}

function isSecretPath(filePath: string): boolean {
  return SECRET_PATTERNS.some((pattern) => matchesPattern(filePath, pattern));
}

/**
 * Creates the ENF-002 handler bound to a project directory.
 */
export function createSecretProtectionHandler(
  _cwd: string
): (ctx: ToolCallContext) => Promise<EnforcementResult | undefined> {
  return async (ctx: ToolCallContext): Promise<EnforcementResult | undefined> => {
    // Only intercept file-access tools
    if (!FILE_TOOLS.has(ctx.tool)) return undefined;

    const filePath = extractFilePath(ctx.params);
    if (!filePath) return undefined;

    // Allowlist takes precedence
    if (isAllowlisted(filePath)) return undefined;

    if (!isSecretPath(filePath)) return undefined;

    const message = formatBlockMessage(
      "ENF-002",
      `Access to sensitive credential file is blocked: ${filePath}`,
      filePath
    );

    return { block: true, message };
  };
}
