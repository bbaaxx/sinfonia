/**
 * Enforcement Rule Registry
 *
 * Central registry for all Sinfonia enforcement rules.
 * Registration is idempotent — calling registerRule with the same ID twice
 * is safe and will not create duplicates.
 */

export type EnforcementSeverity = "blocking" | "advisory" | "injection";
export type EnforcementLayer = "plugin" | "persona" | "dual";
export type EnforcementHook =
  | "tool.execute.before"
  | "session.idle"
  | "experimental.session.compacting"
  | "shell.env";

export interface EnforcementRule {
  /** Unique rule identifier, e.g. "ENF-001" */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** What the rule does and why */
  description: string;
  /** How the rule responds to a violation */
  severity: EnforcementSeverity;
  /** The plugin hook this rule attaches to */
  hook: EnforcementHook;
  /** Where the rule is enforced */
  layer: EnforcementLayer;
  /** Whether the rule is currently active */
  enabled: boolean;
}

// Module-level registry — singleton map keyed by rule ID
const _registry = new Map<string, EnforcementRule>();

/**
 * Registers an enforcement rule. Idempotent — duplicate IDs are silently ignored.
 */
export function registerRule(rule: EnforcementRule): void {
  if (_registry.has(rule.id)) return;
  _registry.set(rule.id, rule);
}

/**
 * Returns a snapshot of all registered rules, sorted by ID.
 */
export function listRules(): EnforcementRule[] {
  return [..._registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Returns the rule with the given ID, or undefined if not found.
 */
export function getRuleById(id: string): EnforcementRule | undefined {
  return _registry.get(id);
}

/**
 * Clears all registered rules. Intended for use in tests only.
 */
export function clearRegistry(): void {
  _registry.clear();
}

// ─── Built-in rule registrations ─────────────────────────────────────────────

registerRule({
  id: "ENF-001",
  name: "TDD Enforcer",
  description:
    "Blocks write/edit/create tool calls when no corresponding test file appears in the current git diff. Ensures tests are written before implementation.",
  severity: "blocking",
  hook: "tool.execute.before",
  layer: "dual",
  enabled: true,
});

registerRule({
  id: "ENF-002",
  name: "Secret Protection",
  description:
    "Blocks read/write/edit access to sensitive credential files (.env, *.key, *.pem, credentials.*, secrets/ dirs, .opencode/plugins/).",
  severity: "blocking",
  hook: "tool.execute.before",
  layer: "plugin",
  enabled: true,
});

registerRule({
  id: "ENF-003",
  name: "Compaction State Preservation",
  description:
    "Injects a ≤200-word workflow state block into the compaction context so the agent retains workflow awareness after context pruning.",
  severity: "injection",
  hook: "experimental.session.compacting",
  layer: "plugin",
  enabled: true,
});

registerRule({
  id: "ENF-004",
  name: "Spec Stop Guard",
  description:
    "Emits an advisory warning when the session goes idle and the active workflow has incomplete steps. Reminds the agent to complete all spec steps.",
  severity: "advisory",
  hook: "session.idle",
  layer: "dual",
  enabled: true,
});

registerRule({
  id: "ENF-005",
  name: "Shell Env Injection",
  description:
    "Injects SINFONIA_PROJECT_ROOT, SINFONIA_VERSION, SINFONIA_SESSION_ID, SINFONIA_WORKFLOW_ID, and SINFONIA_CURRENT_STEP into every shell call.",
  severity: "injection",
  hook: "shell.env",
  layer: "plugin",
  enabled: true,
});

registerRule({
  id: "ENF-007",
  name: "Session-End Completeness Warning",
  description:
    "Emits an advisory warning on session idle when any workflow steps remain incomplete (pending/in-progress/blocked/failed). Distinct from ENF-004 in scope.",
  severity: "advisory",
  hook: "session.idle",
  layer: "plugin",
  enabled: true,
});
