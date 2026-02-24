/**
 * CLI command: sinfonia rules
 *
 * Lists all registered enforcement rules in table or JSON format.
 * Exit code: always 0 (listing is informational, never an error condition).
 */

import { listRules } from "../enforcement/registry.js";

export interface RulesCommandOptions {
  json: boolean;
}

/**
 * Runs the `sinfonia rules` command.
 * Returns 0 on success (always — listing rules is never an error).
 */
export async function runRulesCommand(options: RulesCommandOptions): Promise<number> {
  const rules = listRules();

  if (options.json) {
    console.log(JSON.stringify(rules, null, 2));
    return 0;
  }

  if (rules.length === 0) {
    console.log("No enforcement rules registered.");
    return 0;
  }

  // Table output
  const header = [
    "ID".padEnd(10),
    "Name".padEnd(35),
    "Severity".padEnd(12),
    "Hook".padEnd(35),
    "Layer".padEnd(8),
    "Enabled",
  ].join("  ");

  const separator = "─".repeat(header.length);

  console.log("");
  console.log("Sinfonia Enforcement Rules");
  console.log(separator);
  console.log(header);
  console.log(separator);

  for (const rule of rules) {
    const row = [
      rule.id.padEnd(10),
      rule.name.slice(0, 34).padEnd(35),
      rule.severity.padEnd(12),
      rule.hook.slice(0, 34).padEnd(35),
      rule.layer.padEnd(8),
      rule.enabled ? "✓" : "✗",
    ].join("  ");
    console.log(row);
  }

  console.log(separator);
  console.log(`${rules.length} rule(s) registered`);
  console.log("");

  return 0;
}
