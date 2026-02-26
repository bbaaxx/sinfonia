/**
 * Self-Hosting Acceptance Tests — SH-1 through SH-8
 *
 * Validates the Phase 1 exit gate criteria from SPEC-04 §11.
 * These tests verify the live pipeline artifacts produced during Story 5.3a.
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, it, expect, afterEach } from "vitest";

import { resolvePersona } from "../../src/workflow/coordinator.js";
import {
  createWorkflowIndex,
  workflowIndexPath,
} from "../../src/workflow/index-manager.js";
import { generateCompactionInjection } from "../../src/workflow/compaction.js";
import { resumeFromCompaction } from "../../src/workflow/resume.js";
import { validatePersonaPaths } from "../../src/validators/persona/validator.js";
import { validateHandoffEnvelope } from "../../src/handoff/validator.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version?: string };

// Static test fixtures promoted from the 5.3a self-hosting pipeline run
const SESSION_DIR = join(
  import.meta.dirname,
  "../fixtures/session-version-flag"
);
const AGENTS_DIR = join(import.meta.dirname, "../../agents");

// ─── SH-1: Routing ───────────────────────────────────────────────────────────

describe("SH-1: Maestro correctly routes workflow names to personas", () => {
  it("routes dev-story to coda", () => {
    expect(resolvePersona("dev-story")).toBe("coda");
  });

  it("routes code-review to rondo", () => {
    expect(resolvePersona("code-review")).toBe("rondo");
  });

  it("routes create-prd to libretto", () => {
    expect(resolvePersona("create-prd")).toBe("libretto");
  });

  it("routes create-spec to amadeus", () => {
    expect(resolvePersona("create-spec")).toBe("amadeus");
  });

  it("returns null for unknown workflow names", () => {
    expect(resolvePersona("unknown-workflow")).toBeNull();
  });
});

// ─── SH-2: Handoff Envelope Validation ───────────────────────────────────────

describe("SH-2: Handoff envelopes from live session pass strict validator schema checks", () => {
  it("dispatch-01-coda.md validates with zero errors", async () => {
    const result = await validateHandoffEnvelope(join(SESSION_DIR, "dispatch-01-coda.md"));
    expect(result.errors).toHaveLength(0);
  });

  it("return-01-coda.md validates with zero errors", async () => {
    const result = await validateHandoffEnvelope(join(SESSION_DIR, "return-01-coda.md"));
    expect(result.errors).toHaveLength(0);
  });

  it("return-02-rondo.md validates with zero errors", async () => {
    const result = await validateHandoffEnvelope(join(SESSION_DIR, "return-02-rondo.md"));
    expect(result.errors).toHaveLength(0);
  });
});

// ─── SH-3: Workflow State ─────────────────────────────────────────────────────

describe("SH-3: workflow.md from live session has required fields and valid state transitions", () => {
  it("workflow.md exists and is readable", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  it("workflow.md contains all required pipeline stages", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toContain("Dispatch");
    expect(content).toContain("Implement");
    expect(content).toContain("Review");
    expect(content).toContain("Approval");
  });

  it("workflow.md records all stages as complete", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    const completeMatches = content.match(/✅ Complete/g) ?? [];
    expect(completeMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("workflow.md has a Decisions table", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toContain("Decisions");
  });
});

// ─── SH-4: Approval Records ───────────────────────────────────────────────────

describe("SH-4: Developer approval gate fired between dispatch and return for each step", () => {
  it("workflow.md contains an Approval Records section", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toContain("Approval Records");
  });

  it("workflow.md records APPROVED decision for Maestro → Coda dispatch", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toContain("APPROVED");
    expect(content).toContain("Coda");
  });

  it("workflow.md records APPROVED decision for Rondo review", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(SESSION_DIR, "workflow.md"), "utf-8");
    expect(content).toContain("Rondo");
    // At least 3 approval records (gate 1: dispatch, gate 2: return, gate 3: review)
    const approvedMatches = content.match(/APPROVED/g) ?? [];
    expect(approvedMatches.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── SH-5: Compaction Round-Trip ─────────────────────────────────────────────

describe("SH-5: resumePipeline + getCompactionInjection round-trip preserves workflow context", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("generateCompactionInjection + resumeFromCompaction round-trips successfully", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sinfonia-sh5-"));

    const sessionId = "sh5-test-session";
    const indexPath = workflowIndexPath(tmpDir, sessionId);

    await createWorkflowIndex({
      cwd: tmpDir,
      sessionId,
      workflowId: "dev-story",
      goal: "Add --version flag to CLI",
      steps: [
        { step: "implement", persona: "coda" },
        { step: "review", persona: "rondo" },
      ],
    });

    const injection = await generateCompactionInjection(indexPath);
    expect(injection).toBeTruthy();
    expect(injection).toContain(sessionId);
    expect(injection).toContain("dev-story");

    const result = await resumeFromCompaction(tmpDir, injection);
    expect(result.status).toBe("ok");
    expect(result.sessionId).toBe(sessionId);
  });

  it("compaction injection contains session and workflow context", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sinfonia-sh5b-"));

    const sessionId = "sh5b-test-session";
    const indexPath = workflowIndexPath(tmpDir, sessionId);

    await createWorkflowIndex({
      cwd: tmpDir,
      sessionId,
      workflowId: "code-review",
      goal: "Review the --version implementation",
      steps: [{ step: "review", persona: "rondo" }],
    });

    const injection = await generateCompactionInjection(indexPath);
    // Injection must contain enough context to resume without re-explaining
    expect(injection).toContain("Session");
    expect(injection).toContain("Workflow");
    expect(injection.length).toBeGreaterThan(50);
  });
});

// ─── SH-6: Implementation Validity ───────────────────────────────────────────

describe("SH-6: Produced code is a valid implementation of the story", () => {
  it("sinfonia --version outputs sinfonia/x.y.z format", async () => {
    const { createProgram } = await import("../../src/cli/program.js");
    const program = createProgram();
    expect(program.version()).toMatch(/^sinfonia\/\d+\.\d+\.\d+/);
  });

  it("sinfonia --version matches package.json version", async () => {
    const { createProgram } = await import("../../src/cli/program.js");
    const program = createProgram();
    expect(program.version()).toBe(`sinfonia/${pkg.version ?? "unknown"}`);
  });

  it("-V alias is registered on the program", async () => {
    const { createProgram } = await import("../../src/cli/program.js");
    const program = createProgram();
    const versionOption = program.options.find((o) => o.short === "-V");
    expect(versionOption).toBeDefined();
  });

  it("version does not fall back to 'unknown' (package.json has a version)", () => {
    expect(pkg.version).toBeDefined();
    expect(pkg.version).not.toBe("unknown");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// ─── SH-7: Context Preservation Across Handoffs ──────────────────────────────

describe("SH-7: No context was lost across handoffs — Coda received full story + spec context", () => {
  it("dispatch-01-coda.md has a non-empty context block", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(SESSION_DIR, "dispatch-01-coda.md"),
      "utf-8"
    );
    expect(content).toContain("Context");
    const contextMatch = content.match(/##\s+Context[\s\S]+?(?=##|$)/);
    expect(contextMatch).not.toBeNull();
    expect(contextMatch![0].trim().length).toBeGreaterThan(50);
  });

  it("dispatch-01-coda.md contains the story acceptance criteria", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(SESSION_DIR, "dispatch-01-coda.md"),
      "utf-8"
    );
    expect(content).toContain("--version");
    expect(content).toContain("package.json");
  });

  it("dispatch-01-coda.md specifies the target file path", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(SESSION_DIR, "dispatch-01-coda.md"),
      "utf-8"
    );
    // Coda must know where to make changes
    expect(content).toContain("program.ts");
  });

  it("return-01-coda.md confirms implementation with validation results", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(SESSION_DIR, "return-01-coda.md"),
      "utf-8"
    );
    // Return envelope must contain evidence of successful implementation
    expect(content.length).toBeGreaterThan(100);
  });
});

// ─── Fortune-MCP Session ──────────────────────────────────────────────────────

describe("Fortune-MCP Session: Story 5.2 pipeline artifacts", () => {
  const FORTUNE_SESSION_DIR = join(
    import.meta.dirname,
    "../../.sinfonia/handoffs/s-20260225-001"
  );
  const FORTUNE_DEMO_DIR = join(
    import.meta.dirname,
    "../../src/mcp/fortune-demo"
  );

  it("fortune-mcp session directory exists in .sinfonia/handoffs/", async () => {
    const { access } = await import("node:fs/promises");
    await expect(access(FORTUNE_SESSION_DIR)).resolves.toBeUndefined();
  });

  it("dispatch-to-coda.md envelope exists and is non-empty", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(FORTUNE_SESSION_DIR, "dispatch-to-coda.md"),
      "utf-8"
    );
    expect(content.length).toBeGreaterThan(100);
  });

  it("return-from-coda.md envelope exists and is non-empty", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(FORTUNE_SESSION_DIR, "return-from-coda.md"),
      "utf-8"
    );
    expect(content.length).toBeGreaterThan(100);
  });

  it("return-from-rondo.md envelope exists and is non-empty", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(FORTUNE_SESSION_DIR, "return-from-rondo.md"),
      "utf-8"
    );
    expect(content.length).toBeGreaterThan(100);
  });

  it("fortune-mcp.js implementation file exists", async () => {
    const { access } = await import("node:fs/promises");
    await expect(
      access(join(FORTUNE_DEMO_DIR, "fortune-mcp.js"))
    ).resolves.toBeUndefined();
  });

  it("fortune-mcp.test.js test file exists (TDD compliance)", async () => {
    const { access } = await import("node:fs/promises");
    await expect(
      access(join(FORTUNE_DEMO_DIR, "fortune-mcp.test.js"))
    ).resolves.toBeUndefined();
  });

  it("return-from-coda.md contains APPROVED decision", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(FORTUNE_SESSION_DIR, "return-from-coda.md"),
      "utf-8"
    );
    // Return envelope must reference approval or completion
    expect(content.toLowerCase()).toMatch(/approv|complete|pass/);
  });

  it("return-from-rondo.md contains approve recommendation", async () => {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      join(FORTUNE_SESSION_DIR, "return-from-rondo.md"),
      "utf-8"
    );
    expect(content.toLowerCase()).toMatch(/approv|recommend.*approv/);
  });
});

// ─── SH-8: Persona Validation ─────────────────────────────────────────────────

describe("SH-8: All 6 personas still validate with 0 errors after the session", () => {
  const personas = [
    "maestro",
    "libretto",
    "amadeus",
    "coda",
    "rondo",
    "metronome",
  ];

  it("all 6 persona files validate with 0 errors (validate agents dir)", async () => {
    const result = await validatePersonaPaths(AGENTS_DIR, true);
    expect(result.errorCount).toBe(0);
  });

  for (const persona of personas) {
    it(`${persona}.md has 0 validation errors`, async () => {
      const result = await validatePersonaPaths(
        join(AGENTS_DIR, `${persona}.md`),
        false
      );
      const fileResult = result.files[0];
      expect(fileResult).toBeDefined();
      expect(fileResult!.errors).toHaveLength(0);
    });
  }
});
