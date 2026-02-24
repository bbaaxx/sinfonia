import { describe, it, expect, beforeEach } from "vitest";

import {
  registerRule,
  listRules,
  getRuleById,
  clearRegistry,
  type EnforcementRule,
} from "../../src/enforcement/registry.js";

const sampleRule: EnforcementRule = {
  id: "ENF-TEST-001",
  name: "Test Rule",
  description: "A rule used only in tests",
  severity: "blocking",
  hook: "tool.execute.before",
  layer: "plugin",
  enabled: true,
};

describe("Enforcement Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  // ─── registerRule ──────────────────────────────────────────────────────────

  it("registers a rule successfully", () => {
    registerRule(sampleRule);
    expect(listRules()).toHaveLength(1);
  });

  it("is idempotent — registering the same rule ID twice does not duplicate", () => {
    registerRule(sampleRule);
    registerRule(sampleRule);
    expect(listRules()).toHaveLength(1);
  });

  it("registers multiple distinct rules", () => {
    registerRule(sampleRule);
    registerRule({ ...sampleRule, id: "ENF-TEST-002", name: "Test Rule 2" });
    expect(listRules()).toHaveLength(2);
  });

  // ─── listRules ─────────────────────────────────────────────────────────────

  it("returns empty array when no rules registered", () => {
    expect(listRules()).toEqual([]);
  });

  it("returns all registered rules", () => {
    registerRule(sampleRule);
    registerRule({ ...sampleRule, id: "ENF-TEST-002", name: "Test Rule 2" });
    const rules = listRules();
    expect(rules.map((r) => r.id)).toContain("ENF-TEST-001");
    expect(rules.map((r) => r.id)).toContain("ENF-TEST-002");
  });

  it("returns a copy — mutating the result does not affect the registry", () => {
    registerRule(sampleRule);
    const rules = listRules();
    rules.push({ ...sampleRule, id: "ENF-INJECTED" });
    expect(listRules()).toHaveLength(1);
  });

  // ─── getRuleById ───────────────────────────────────────────────────────────

  it("returns the rule when found by ID", () => {
    registerRule(sampleRule);
    const rule = getRuleById("ENF-TEST-001");
    expect(rule).toBeDefined();
    expect(rule?.id).toBe("ENF-TEST-001");
  });

  it("returns undefined for unknown rule ID", () => {
    expect(getRuleById("ENF-UNKNOWN")).toBeUndefined();
  });

  it("is case-sensitive for rule IDs", () => {
    registerRule(sampleRule);
    expect(getRuleById("enf-test-001")).toBeUndefined();
    expect(getRuleById("ENF-TEST-001")).toBeDefined();
  });

  // ─── Rule shape ────────────────────────────────────────────────────────────

  it("registered rule has all required fields", () => {
    registerRule(sampleRule);
    const rule = getRuleById("ENF-TEST-001");
    expect(rule).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      severity: expect.stringMatching(/^(blocking|advisory|injection)$/),
      hook: expect.any(String),
      layer: expect.stringMatching(/^(plugin|persona|dual)$/),
      enabled: expect.any(Boolean),
    });
  });
});
