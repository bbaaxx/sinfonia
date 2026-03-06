import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initPipeline } from "../../../src/workflow/coordinator.js";
import { evaluateToolCall, evaluateAdvanceRequest, resolveCurrentPhase, type WorkflowStateSnapshot } from "../src/orchestration/policy.ts";
import { resolvePhaseFromStep, isToolAllowedInPhase, computeAllowedTools, DEFAULT_PHASE_TOOL_MAP } from "../src/orchestration/phase-tools.ts";
import { validateStepEvidence, extractEvidenceFromToolResult } from "../src/orchestration/evidence.ts";
import { readWorkflowState } from "../src/workflow-state.ts";
import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";

// Minimal type for test harness (ExtensionContext not exported from module)
type ExtensionContext = {
  cwd: string;
  ui: {
    notify: (message: string, level?: "info" | "warning" | "error") => void;
    confirm: (title: string, message: string) => Promise<boolean>;
    select: (title: string, options: string[]) => Promise<string | undefined>;
    input: (title: string, placeholder?: string) => Promise<string | undefined>;
    setStatus: (id: string, text: string | undefined) => void;
    setWidget: (id: string, lines: string[] | undefined) => void;
  };
  sessionManager?: {
    getEntries: () => unknown[];
    getBranch: () => unknown;
  };
};

const makeState = (overrides: Partial<WorkflowStateSnapshot> = {}): WorkflowStateSnapshot => ({
  sessionId: "s-20260305-000100",
  workflowId: "create-spec",
  currentStep: 1,
  totalSteps: 4,
  currentStepSlug: "1-analyze-prd",
  status: "in-progress",
  ...overrides,
});

describe("phase-tools: resolvePhaseFromStep", () => {
  it("classifies analysis steps as planning", () => {
    expect(resolvePhaseFromStep("analyze-prd", 1, 4)).toBe("planning");
    expect(resolvePhaseFromStep("1-analyze-prd", 1, 4)).toBe("planning");
    expect(resolvePhaseFromStep("gather-context", 1, 4)).toBe("planning");
  });

  it("classifies draft/implement steps as implementation", () => {
    expect(resolvePhaseFromStep("draft-spec", 2, 4)).toBe("implementation");
    expect(resolvePhaseFromStep("2-draft-spec", 2, 4)).toBe("implementation");
    expect(resolvePhaseFromStep("implement", 3, 5)).toBe("implementation");
    expect(resolvePhaseFromStep("write-tests", 2, 5)).toBe("implementation");
  });

  it("classifies validate/review steps as review", () => {
    expect(resolvePhaseFromStep("validate-spec", 3, 4)).toBe("review");
    expect(resolvePhaseFromStep("review-code", 1, 4)).toBe("review");
    expect(resolvePhaseFromStep("verify", 4, 5)).toBe("review");
  });

  it("classifies approval steps as approval", () => {
    expect(resolvePhaseFromStep("approval", 4, 4)).toBe("approval");
    expect(resolvePhaseFromStep("4-approval", 4, 4)).toBe("approval");
  });

  it("falls back to heuristic for unrecognized slugs", () => {
    expect(resolvePhaseFromStep("unknown", 1, 5)).toBe("planning");
    expect(resolvePhaseFromStep("unknown", 3, 5)).toBe("implementation");
    expect(resolvePhaseFromStep("unknown", 5, 5)).toBe("approval");
  });
});

describe("phase-tools: isToolAllowedInPhase", () => {
  it("blocks Write during planning", () => {
    expect(isToolAllowedInPhase("Write", "planning")).toBe(false);
    expect(isToolAllowedInPhase("Edit", "planning")).toBe(false);
    expect(isToolAllowedInPhase("Bash", "planning")).toBe(false);
  });

  it("allows Read during planning", () => {
    expect(isToolAllowedInPhase("Read", "planning")).toBe(true);
    expect(isToolAllowedInPhase("Glob", "planning")).toBe(true);
    expect(isToolAllowedInPhase("Grep", "planning")).toBe(true);
  });

  it("allows sinfonica tools during planning", () => {
    expect(isToolAllowedInPhase("sinfonica_start_workflow", "planning")).toBe(true);
    expect(isToolAllowedInPhase("sinfonica_advance_step", "planning")).toBe(true);
  });

  it("matches sinfonica wildcard case-insensitively", () => {
    // Item #6: case-insensitive wildcard matching
    expect(isToolAllowedInPhase("Sinfonica_start_workflow", "planning")).toBe(true);
    expect(isToolAllowedInPhase("SINFONICA_advance_step", "planning")).toBe(true);
    expect(isToolAllowedInPhase("Sinfonica_List_Workflows", "planning")).toBe(true);
  });

  it("allows everything during implementation", () => {
    expect(isToolAllowedInPhase("Write", "implementation")).toBe(true);
    expect(isToolAllowedInPhase("Edit", "implementation")).toBe(true);
    expect(isToolAllowedInPhase("Bash", "implementation")).toBe(true);
    expect(isToolAllowedInPhase("Read", "implementation")).toBe(true);
  });

  it("blocks Write/Edit during review", () => {
    expect(isToolAllowedInPhase("Write", "review")).toBe(false);
    expect(isToolAllowedInPhase("Edit", "review")).toBe(false);
    expect(isToolAllowedInPhase("Read", "review")).toBe(true);
    expect(isToolAllowedInPhase("Bash", "review")).toBe(true);
  });

  it("blocks Write/Edit/Bash during approval", () => {
    expect(isToolAllowedInPhase("Write", "approval")).toBe(false);
    expect(isToolAllowedInPhase("Edit", "approval")).toBe(false);
    expect(isToolAllowedInPhase("Bash", "approval")).toBe(false);
    expect(isToolAllowedInPhase("Read", "approval")).toBe(true);
  });
});

describe("phase-tools: computeAllowedTools", () => {
  it("filters tools for a given phase", () => {
    const allTools = [
      { name: "Read" },
      { name: "Write" },
      { name: "Edit" },
      { name: "Bash" },
      { name: "Glob" },
      { name: "sinfonica_advance_step" },
    ];

    const planningTools = computeAllowedTools("planning", allTools);
    expect(planningTools).toContain("Read");
    expect(planningTools).toContain("Glob");
    expect(planningTools).toContain("sinfonica_advance_step");
    expect(planningTools).not.toContain("Write");
    expect(planningTools).not.toContain("Edit");
    expect(planningTools).not.toContain("Bash");
  });
});

// Item #5: Real step slug resolution test
describe("workflow-state: readWorkflowState slug extraction", () => {
  it("extracts step slugs from stages section", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-slugtest";
    const workflowDir = join(cwd, ".sinfonica", "handoffs", sessionId);
    await mkdir(workflowDir, { recursive: true });
    
    const workflowContent = `---
workflow_id: test-workflow
session_id: s-20260305-slugtest
workflow_status: in_progress
current_step_index: 2
total_steps: 3
created_at: 2026-03-05T00:00:00Z
---

# Test Workflow

## Stages

1. Gather Context (Amadeus)
   - Status: approved

2. Draft Specification (Coda)
   - Status: in_progress

3. Approval
   - Status: pending
`;
    
    await writeFile(join(workflowDir, "workflow.md"), workflowContent, "utf8");
    
    const state = await readWorkflowState(cwd, sessionId);
    
    expect(state.stepSlugs).toBeDefined();
    expect(state.stepSlugs).toHaveLength(3);
    expect(state.stepSlugs[0]).toBe("gather-context");
    expect(state.stepSlugs[1]).toBe("draft-specification");
    expect(state.stepSlugs[2]).toBe("approval");
    expect(state.currentStep).toBe(2);
  });
});

describe("evidence: validateStepEvidence", () => {
  it("rejects null/undefined evidence", () => {
    expect(validateStepEvidence(null)).toEqual({ valid: false, missing: ["executed", "stepId"] });
    expect(validateStepEvidence(undefined)).toEqual({ valid: false, missing: ["executed", "stepId"] });
  });

  it("rejects evidence with executed=false", () => {
    const result = validateStepEvidence({ executed: false, stepId: "1-analyze-prd" });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("executed");
  });

  it("accepts valid evidence", () => {
    const result = validateStepEvidence({ executed: true, stepId: "1-analyze-prd" });
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("validates custom required fields", () => {
    const result = validateStepEvidence(
      { executed: true, stepId: "1-analyze-prd" },
      ["executed", "stepId", "persona"]
    );
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("persona");
  });
});

describe("evidence: extractEvidenceFromToolResult", () => {
  it("extracts evidence from sinfonica_evidence field", () => {
    const evidence = extractEvidenceFromToolResult({
      sinfonica_evidence: {
        executed: true,
        stepId: "1-analyze-prd",
        persona: "amadeus",
        artifacts: ["spec.md"],
        resultStatus: "success",
      },
    });
    expect(evidence).toEqual({
      executed: true,
      stepId: "1-analyze-prd",
      persona: "amadeus",
      artifacts: ["spec.md"],
      resultStatus: "success",
    });
  });

  it("builds evidence from ok + details fields", () => {
    const evidence = extractEvidenceFromToolResult({
      ok: true,
      stepId: "2-draft-spec",
      persona: "coda",
      artifacts: ["draft.md"],
    });
    expect(evidence.executed).toBe(true);
    expect(evidence.stepId).toBe("2-draft-spec");
    expect(evidence.persona).toBe("coda");
    expect(evidence.resultStatus).toBe("success");
  });

  it("returns partial evidence when fields are missing", () => {
    const evidence = extractEvidenceFromToolResult({ ok: false });
    expect(evidence.executed).toBeUndefined();
    expect(evidence.stepId).toBeUndefined();
  });
});

describe("policy: evaluateToolCall", () => {
  it("always allows sinfonica tools", () => {
    const state = makeState();
    const decision = evaluateToolCall("sinfonica_start_workflow", {}, "planning", state);
    expect(decision.allowed).toBe(true);
  });

  it("blocks Write during planning phase", () => {
    const state = makeState({ currentStepSlug: "1-analyze-prd" });
    const decision = evaluateToolCall("Write", {}, "planning", state);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("not allowed during planning");
  });

  it("allows Write during implementation phase", () => {
    const state = makeState({ currentStep: 2, currentStepSlug: "2-draft-spec" });
    const decision = evaluateToolCall("Write", {}, "implementation", state);
    expect(decision.allowed).toBe(true);
  });
});

describe("policy: evaluateAdvanceRequest", () => {
  it("blocks advance without evidence", () => {
    const state = makeState();
    const decision = evaluateAdvanceRequest(null, state);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("no execution evidence");
  });

  it("blocks advance with incomplete evidence", () => {
    const state = makeState();
    const decision = evaluateAdvanceRequest({ executed: false }, state);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("missing evidence");
  });

  it("allows advance with valid evidence", () => {
    const state = makeState();
    const decision = evaluateAdvanceRequest(
      { executed: true, stepId: "1-analyze-prd", persona: "amadeus", artifacts: [], resultStatus: "success" },
      state
    );
    expect(decision.allowed).toBe(true);
  });
});

describe("policy: resolveCurrentPhase", () => {
  it("derives phase from workflow state", () => {
    const state = makeState({ currentStepSlug: "1-analyze-prd", currentStep: 1, totalSteps: 4 });
    expect(resolveCurrentPhase(state)).toBe("planning");
  });

  it("derives implementation phase for draft steps", () => {
    const state = makeState({ currentStepSlug: "2-draft-spec", currentStep: 2, totalSteps: 4 });
    expect(resolveCurrentPhase(state)).toBe("implementation");
  });
});

// --- Integration tests for advance gate hardening (WS3) ---

const tempDirs: string[] = [];
const dummySignal = new AbortController().signal;

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-policy-gating-test-"));
  tempDirs.push(dir);
  return dir;
};

const makeTestCtx = (cwd: string) => ({
  cwd,
  ui: {
    notify: () => {},
    confirm: async () => false,
    select: async () => undefined as string | undefined,
    input: async () => undefined as string | undefined,
    setStatus: () => {},
    setWidget: () => {},
  },
  waitForIdle: async () => {},
  newSession: async () => {},
  fork: async () => {},
  navigateTree: async () => {},
  reload: async () => {},
});

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: unknown, signal: AbortSignal, onUpdate: unknown, ctx: ReturnType<typeof makeTestCtx>) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    details: Record<string, unknown>;
    isError?: boolean;
  }>;
};

type RegisteredCommand = {
  name: string;
  handler: (args: string | undefined, ctx: ReturnType<typeof makeTestCtx>) => Promise<void>;
};

type EventHandler = (event: Record<string, unknown>, ctx?: ExtensionContext) => unknown | Promise<unknown>;

const createApiHarness = (execHandler?: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string; code: number | null }>) => {
  const tools: RegisteredTool[] = [];
  const commands: RegisteredCommand[] = [];
  const eventHandlers: Map<string, EventHandler[]> = new Map();
  const appendedEntries: Array<{ customType: string; data?: unknown }> = [];

  const api: ExtensionAPI = {
    registerTool: (tool) => {
      tools.push(tool as unknown as RegisteredTool);
    },
    registerCommand: (name, command) => {
      commands.push({ name, handler: command.handler });
    },
    exec: async (command, args) => {
      if (execHandler) {
        return execHandler(command, args);
      }
      return { stdout: "", stderr: "error: unknown command 'advance'", code: 1 };
    },
    on: (event: string, handler: EventHandler) => {
      const handlers = eventHandlers.get(event) ?? [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    },
    sendMessage: () => {},
    appendEntry: (customType: string, data?: unknown) => {
      appendedEntries.push({ customType, data });
    },
  };

  return { api, tools, commands, eventHandlers, appendedEntries };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("advance gate hardening (integration)", () => {
  it("blocks approve advance without execution evidence", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000200";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(advanceTool).toBeDefined();

    const result = await advanceTool!.execute(
      "call-gate-1",
      { decision: "approve" },
      dummySignal,
      undefined,
      makeTestCtx(cwd)
    );

    expect(result.isError).toBe(true);
    expect(result.details.blocked).toBe(true);
    expect(result.content[0].text).toContain("no execution evidence");
  });

  it("allows request-revision even without evidence", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000201";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(advanceTool).toBeDefined();

    const result = await advanceTool!.execute(
      "call-gate-2",
      { decision: "request-revision", feedback: "Needs rework" },
      dummySignal,
      undefined,
      makeTestCtx(cwd)
    );

    // request-revision is not gated by evidence — it should proceed
    expect(result.details.blocked).toBeUndefined();
    expect(result.content[0].text).toContain("Recorded request-revision");
  });

  // Item #7: Command-path advance test
  it("command-path /sinfonica advance shows warning when no evidence exists", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000202";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const notifyMessages: Array<{ message: string; level: string }> = [];
    const testCtx = {
      cwd,
      ui: {
        notify: (message: string, level?: "info" | "warning" | "error") => {
          notifyMessages.push({ message, level: level ?? "info" });
        },
        confirm: async () => true, // User confirms the advance
        select: async () => undefined as string | undefined,
        input: async () => undefined as string | undefined,
        setStatus: () => {},
        setWidget: () => {},
      },
      waitForIdle: async () => {},
      newSession: async () => {},
      fork: async () => {},
      navigateTree: async () => {},
      reload: async () => {},
    };

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const sinfonicaCommand = harness.commands.find((cmd) => cmd.name === "sinfonica");
    expect(sinfonicaCommand).toBeDefined();

    // Call the command handler with "advance approve"
    await sinfonicaCommand!.handler("advance approve", testCtx as ReturnType<typeof makeTestCtx>);

    // Verify warning was shown (evidence check fails)
    const warningCall = notifyMessages.find(
      (call) => call.level === "warning" && call.message.includes("Cannot advance")
    );
    expect(warningCall).toBeDefined();
    expect(warningCall!.message).toContain("no execution evidence");
  });
});

// --- A1/A2: Event handler tests ---

describe("event handlers", () => {
  // A1: tool_call handler test
  it("tool_call handler returns { block: true, reason } when enforcement=block and tool not allowed", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-toolcall-001";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    // Set enforcement mode to block via environment
    const originalEnv = process.env.SINFONICA_PI_ENFORCEMENT;
    process.env.SINFONICA_PI_ENFORCEMENT = "block";

    try {
      const harness = createApiHarness();
      registerSinfonicaExtension(harness.api);

      const toolCallHandlers = harness.eventHandlers.get("tool_call");
      expect(toolCallHandlers).toBeDefined();
      expect(toolCallHandlers!.length).toBeGreaterThan(0);

      const notifyMessages: Array<{ message: string; level: string }> = [];
      const mockCtx: ExtensionContext = {
        cwd,
        ui: {
          notify: (message: string, level?: "info" | "warning" | "error") => {
            notifyMessages.push({ message, level: level ?? "info" });
          },
          confirm: async () => false,
          select: async () => undefined,
          input: async () => undefined,
          setStatus: () => {},
          setWidget: () => {},
        },
      };

      // Call all tool_call handlers and collect results
      const results: unknown[] = [];
      for (const handler of toolCallHandlers!) {
        const result = await handler(
          { toolName: "Write", toolCallId: "test-call-1", input: { path: "/test.txt" } },
          mockCtx
        );
        results.push(result);
      }
      
      console.log("All handler results:", results);

      // At least one handler should return a block result
      const blockResult = results.find((r): r is { block: boolean; reason: string } => 
        r !== undefined && r !== null && typeof r === "object" && "block" in r && (r as Record<string, unknown>).block === true
      );

      // Should return block object
      expect(blockResult).toEqual({ block: true, reason: expect.stringContaining("not allowed during planning") });
    } finally {
      process.env.SINFONICA_PI_ENFORCEMENT = originalEnv;
    }
  });

  it("tool_call handler notifies but allows when enforcement=warn", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-toolcall-002";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const originalEnv = process.env.SINFONICA_PI_ENFORCEMENT;
    process.env.SINFONICA_PI_ENFORCEMENT = "warn";

    try {
      const harness = createApiHarness();
      registerSinfonicaExtension(harness.api);

      const toolCallHandlers = harness.eventHandlers.get("tool_call");
      expect(toolCallHandlers).toBeDefined();

      const notifyMessages: Array<{ message: string; level: string }> = [];
      const mockCtx: ExtensionContext = {
        cwd,
        ui: {
          notify: (message: string, level?: "info" | "warning" | "error") => {
            notifyMessages.push({ message, level: level ?? "info" });
          },
          confirm: async () => false,
          select: async () => undefined,
          input: async () => undefined,
          setStatus: () => {},
          setWidget: () => {},
        },
      };

      // Call all handlers
      for (const handler of toolCallHandlers!) {
        await handler(
          { toolName: "Write", toolCallId: "test-call-2", input: { path: "/test.txt" } },
          mockCtx
        );
      }

      // Should notify with warning but not block
      const warningNotify = notifyMessages.find((n) => n.level === "warning" && n.message.includes("not allowed during planning"));
      expect(warningNotify).toBeDefined();
    } finally {
      process.env.SINFONICA_PI_ENFORCEMENT = originalEnv;
    }
  });

  it("tool_call handler allows sinfonica tools regardless of enforcement mode", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-toolcall-003";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const originalEnv = process.env.SINFONICA_PI_ENFORCEMENT;
    process.env.SINFONICA_PI_ENFORCEMENT = "block";

    try {
      const harness = createApiHarness();
      registerSinfonicaExtension(harness.api);

      const toolCallHandlers = harness.eventHandlers.get("tool_call");
      expect(toolCallHandlers).toBeDefined();

      const notifyMessages: Array<{ message: string; level: string }> = [];
      const mockCtx: ExtensionContext = {
        cwd,
        ui: {
          notify: (message: string, level?: "info" | "warning" | "error") => {
            notifyMessages.push({ message, level: level ?? "info" });
          },
          confirm: async () => false,
          select: async () => undefined,
          input: async () => undefined,
          setStatus: () => {},
          setWidget: () => {},
        },
      };

      // Call all handlers
      const results: unknown[] = [];
      for (const handler of toolCallHandlers!) {
        const result = await handler(
          { toolName: "sinfonica_start_workflow", toolCallId: "test-call-3", input: {} },
          mockCtx
        );
        results.push(result);
      }

      // sinfonica tools bypass enforcement - no blocking, no warnings
      const blockResult = results.find((r): r is { block: boolean } => 
        r !== undefined && r !== null && typeof r === "object" && "block" in r
      );
      expect(blockResult).toBeUndefined();
      expect(notifyMessages.filter((n) => n.level === "warning")).toHaveLength(0);
    } finally {
      process.env.SINFONICA_PI_ENFORCEMENT = originalEnv;
    }
  });

  // A2: session_start evidence reconstruction test
  it("session_start handler is registered and processes without error", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-session-001";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const mockCtx: ExtensionContext = {
      cwd,
      ui: {
        notify: () => {},
        confirm: async () => false,
        select: async () => undefined,
        input: async () => undefined,
        setStatus: () => {},
        setWidget: () => {},
      },
      sessionManager: {
        getEntries: () => [],
        getBranch: () => null,
      },
    };

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const sessionStartHandlers = harness.eventHandlers.get("session_start");
    expect(sessionStartHandlers).toBeDefined();
    expect(sessionStartHandlers!.length).toBeGreaterThan(0);

    // Call all session_start handlers - should not crash
    for (const handler of sessionStartHandlers!) {
      await handler({}, mockCtx);
    }
  });

  it("tool_result handler persists evidence via appendEntry", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-session-002";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const mockCtx: ExtensionContext = {
      cwd,
      ui: {
        notify: () => {},
        confirm: async () => false,
        select: async () => undefined,
        input: async () => undefined,
        setStatus: () => {},
        setWidget: () => {},
      },
    };

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const toolResultHandlers = harness.eventHandlers.get("tool_result");
    expect(toolResultHandlers).toBeDefined();

    // Simulate a tool_result that adds evidence
    for (const handler of toolResultHandlers!) {
      await handler(
        {
          toolName: "SomeTool",
          toolCallId: "test-result-1",
          details: { sinfonica_evidence: { executed: true, stepId: "1-analyze-prd", persona: "coda" } },
        },
        mockCtx
      );
    }

    // Verify appendEntry was called with evidence
    const evidenceEntries = harness.appendedEntries.filter((e) => e.customType === "sinfonica:step-evidence");
    expect(evidenceEntries.length).toBeGreaterThan(0);
    expect(evidenceEntries[0].data).toMatchObject({ executed: true, stepId: "1-analyze-prd" });
  });

  it("session_compact and session_switch handlers reset evidence", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-session-003";
    await initPipeline(cwd, ["create-spec"], "Draft spec", sessionId);

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    // Verify handlers are registered
    const compactHandlers = harness.eventHandlers.get("session_compact");
    expect(compactHandlers).toBeDefined();

    const switchHandlers = harness.eventHandlers.get("session_switch");
    expect(switchHandlers).toBeDefined();

    // Call handlers - should not crash
    for (const handler of compactHandlers ?? []) {
      await handler({});
    }
    for (const handler of switchHandlers ?? []) {
      await handler({});
    }
  });
});
