/**
 * Sinfonia Enforcement Plugin
 *
 * Registers enforcement rules that intercept agent tool calls, session events,
 * and shell environment injection to enforce project quality standards.
 *
 * Rules:
 *   ENF-001  TDD Enforcer          — blocks writes without a corresponding test change
 *   ENF-002  Secret Protection     — blocks reads/writes to sensitive credential files
 *   ENF-003  Compaction Preservation — injects workflow state into compaction context
 *   ENF-004  Spec Stop Guard       — warns when workflow has incomplete steps at idle
 *   ENF-005  Shell Env Injection   — injects SINFONIA_* env vars into every shell call
 *   ENF-007  Session-End Completeness — warns on session idle if steps are incomplete
 */

import type { Plugin } from "@opencode/plugin";

import { loadSinfoniaConfig } from "../../src/enforcement/utils.js";
import { createTddEnforcerHandler } from "../../src/enforcement/rules/enf-001-tdd.js";
import { createSecretProtectionHandler } from "../../src/enforcement/rules/enf-002-secrets.js";
import { createCompactionHandler } from "../../src/enforcement/rules/enf-003-compaction.js";
import { createSpecStopGuardHandler } from "../../src/enforcement/rules/enf-004-spec-stop.js";
import { createShellEnvHandler } from "../../src/enforcement/rules/enf-005-shell-env.js";
import { createCompletenessWarningHandler } from "../../src/enforcement/rules/enf-007-completeness.js";

const SinfoniaEnforcement: Plugin = async ({ project, directory }) => {
  const cwd = directory ?? project ?? process.cwd();

  // Load config non-blocking — enforcement degrades gracefully if config missing
  const config = await loadSinfoniaConfig(cwd).catch(() => null);

  return {
    "tool.execute.before": async (params) => {
      // ENF-001: TDD Enforcer
      const tddResult = await createTddEnforcerHandler(cwd)(params).catch(() => null);
      if (tddResult?.block) return tddResult;

      // ENF-002: Secret Protection
      const secretResult = await createSecretProtectionHandler(cwd)(params).catch(() => null);
      if (secretResult?.block) return secretResult;

      return undefined;
    },

    "experimental.session.compacting": async (params) => {
      // ENF-003: Compaction State Preservation
      return createCompactionHandler(cwd)(params).catch(() => undefined);
    },

    "session.idle": async (params) => {
      // ENF-004: Spec Stop Guard
      await createSpecStopGuardHandler(cwd)(params).catch(() => undefined);

      // ENF-007: Session-End Completeness Warning
      await createCompletenessWarningHandler(cwd)(params).catch(() => undefined);
    },

    "shell.env": async () => {
      // ENF-005: Shell Env Injection
      return createShellEnvHandler(cwd)().catch(() => ({}));
    },
  };
};

export default SinfoniaEnforcement;
