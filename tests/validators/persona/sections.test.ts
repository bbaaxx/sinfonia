import { describe, expect, it } from "vitest";

import { validatePersonaSections } from "../../../src/validators/persona/sections.js";

const baseContent = `---
persona_id: maestro
name: Maestro
role: Orchestrator
description: Coordinates work.
persona_mode: interactive
---

## Identity
I am the coordinator.

## Critical Actions
1. Route

## Task Protocol
1. Plan

## Comm Style
Clear.

## Role Def
Defined.

## Principles
1. Keep simple.

## Activation Sequence
1. Start

## Menu
- Option
`;

describe("validatePersonaSections", () => {
  it("passes when required and interactive sections are present", () => {
    const result = validatePersonaSections(baseContent, "interactive");
    expect(result.errors).toHaveLength(0);
  });

  it("errors when required sections are missing", () => {
    const noIdentity = baseContent.replace("## Identity\nI am the coordinator.\n\n", "");
    const result = validatePersonaSections(noIdentity, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-01")).toBe(true);
  });

  it("warns when recommended sections are missing", () => {
    const missing = baseContent
      .replace("## Comm Style\nClear.\n\n", "")
      .replace("## Role Def\nDefined.\n\n", "")
      .replace("## Principles\n1. Keep simple.\n\n", "");
    const result = validatePersonaSections(missing, "interactive");
    expect(result.warnings.some((item) => item.ruleId === "SS-02")).toBe(true);
  });

  it("errors when interactive persona is missing interactive sections", () => {
    const missing = baseContent
      .replace("## Activation Sequence\n1. Start\n\n", "")
      .replace("## Menu\n- Option\n", "");
    const result = validatePersonaSections(missing, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-03")).toBe(true);
  });

  it("warns when subagent contains interactive sections", () => {
    const result = validatePersonaSections(baseContent, "subagent");
    expect(result.warnings.some((item) => item.ruleId === "SS-04")).toBe(true);
  });

  it("errors on out-of-order sections", () => {
    const wrongOrder = baseContent.replace(
      "## Critical Actions\n1. Route\n\n## Task Protocol\n1. Plan\n\n",
      "## Task Protocol\n1. Plan\n\n## Critical Actions\n1. Route\n\n"
    );
    const result = validatePersonaSections(wrongOrder, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-05")).toBe(true);
  });

  it("errors when headings are not H2", () => {
    const invalid = baseContent.replace("## Identity", "### Identity");
    const result = validatePersonaSections(invalid, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-06")).toBe(true);
  });

  it("errors on duplicate sections", () => {
    const duplicate = `${baseContent}\n## Identity\nDuplicate\n`;
    const result = validatePersonaSections(duplicate, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-07")).toBe(true);
  });

  it("errors on empty sections", () => {
    const empty = baseContent.replace("## Comm Style\nClear.", "## Comm Style");
    const result = validatePersonaSections(empty, "interactive");
    expect(result.errors.some((item) => item.ruleId === "SS-08")).toBe(true);
  });

  it("warns on unknown sections", () => {
    const unknown = `${baseContent}\n## Extra Notes\nAdditional\n`;
    const result = validatePersonaSections(unknown, "interactive");
    expect(result.warnings.some((item) => item.ruleId === "SS-09")).toBe(true);
  });
});
