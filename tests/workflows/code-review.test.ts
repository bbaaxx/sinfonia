import { mkdir, rm, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadWorkflowDef,
  loadStep,
  advanceStep,
  completeStep,
  resumeWorkflow,
} from '../../src/workflow/step-engine.js';
import { createWorkflowIndex } from '../../src/workflow/index-manager.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKFLOW_NAME = 'code-review';
const STEP_SLUGS = ['review-code', 'review-tests', 'assess', 'approval'];
const TOTAL_STEPS = STEP_SLUGS.length;

const PKG_ROOT = join(import.meta.dirname, '..', '..');
const SOURCE_WORKFLOW_DIR = join(PKG_ROOT, 'workflows', WORKFLOW_NAME);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `sinfonia-code-review-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function installWorkflow(): Promise<void> {
  const destWorkflowDir = join(testDir, '.sinfonia', 'workflows', WORKFLOW_NAME);
  const destStepsDir = join(destWorkflowDir, 'steps');
  await mkdir(destStepsDir, { recursive: true });

  await copyFile(
    join(SOURCE_WORKFLOW_DIR, 'workflow.md'),
    join(destWorkflowDir, 'workflow.md'),
  );

  for (let i = 0; i < STEP_SLUGS.length; i++) {
    const slug = STEP_SLUGS[i];
    const filename = `step-${String(i + 1).padStart(2, '0')}-${slug}.md`;
    await copyFile(
      join(SOURCE_WORKFLOW_DIR, 'steps', filename),
      join(destStepsDir, filename),
    );
  }
}

async function scaffoldIndex(sessionId: string): Promise<void> {
  const steps = STEP_SLUGS.map((_, i) => ({
    step: `step-${String(i + 1).padStart(2, '0')}`,
    persona: 'rondo',
  }));
  await createWorkflowIndex({
    cwd: testDir,
    sessionId,
    workflowId: `w-code-review-${Date.now()}`,
    goal: 'Review implementation code and tests against the technical spec',
    steps,
  });
}

// ---------------------------------------------------------------------------
// workflow.md is parseable by loadWorkflowDef
// ---------------------------------------------------------------------------

describe('code-review: loadWorkflowDef', () => {
  it('parses the workflow manifest successfully', async () => {
    await installWorkflow();
    const def = await loadWorkflowDef(testDir, WORKFLOW_NAME);
    expect(def).not.toBeNull();
    expect(def!.name).toBe(WORKFLOW_NAME);
  });

  it('reports the correct total step count', async () => {
    await installWorkflow();
    const def = await loadWorkflowDef(testDir, WORKFLOW_NAME);
    expect(def!.totalSteps).toBe(TOTAL_STEPS);
    expect(def!.steps).toHaveLength(TOTAL_STEPS);
  });

  it('returns steps in ascending index order', async () => {
    await installWorkflow();
    const def = await loadWorkflowDef(testDir, WORKFLOW_NAME);
    for (let i = 0; i < TOTAL_STEPS; i++) {
      expect(def!.steps[i].index).toBe(i + 1);
    }
  });

  it('has the correct slugs in order', async () => {
    await installWorkflow();
    const def = await loadWorkflowDef(testDir, WORKFLOW_NAME);
    for (let i = 0; i < TOTAL_STEPS; i++) {
      expect(def!.steps[i].slug).toBe(STEP_SLUGS[i]);
    }
  });

  it('extracts a non-empty description', async () => {
    await installWorkflow();
    const def = await loadWorkflowDef(testDir, WORKFLOW_NAME);
    expect(def!.description).toBeTruthy();
    expect(def!.description.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Each step file is loadable by loadStep
// ---------------------------------------------------------------------------

describe('code-review: loadStep', () => {
  it('loads each step by 1-indexed step number', async () => {
    await installWorkflow();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const result = await loadStep(testDir, WORKFLOW_NAME, i);
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(i);
    }
  });

  it('returns the correct slug for each step', async () => {
    await installWorkflow();
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const result = await loadStep(testDir, WORKFLOW_NAME, i + 1);
      expect(result!.slug).toBe(STEP_SLUGS[i]);
    }
  });

  it('returns totalSteps in every step result', async () => {
    await installWorkflow();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const result = await loadStep(testDir, WORKFLOW_NAME, i);
      expect(result!.totalSteps).toBe(TOTAL_STEPS);
    }
  });

  it('step content is non-empty markdown', async () => {
    await installWorkflow();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const result = await loadStep(testDir, WORKFLOW_NAME, i);
      expect(result!.content.trim().length).toBeGreaterThan(50);
    }
  });

  it('returns null for a step index beyond the total', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS + 1);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sequential loading order
// ---------------------------------------------------------------------------

describe('code-review: sequential loading order', () => {
  it('advanceStep returns step 1 on a fresh workflow', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    const result = await advanceStep(testDir, sessionId, WORKFLOW_NAME);
    expect(result!.stepIndex).toBe(1);
    expect(result!.slug).toBe(STEP_SLUGS[0]);
  });

  it('advanceStep returns step N+1 after completing step N', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    for (let i = 1; i < TOTAL_STEPS; i++) {
      await completeStep(testDir, sessionId, i);
      const next = await advanceStep(testDir, sessionId, WORKFLOW_NAME);
      expect(next!.stepIndex).toBe(i + 1);
    }
  });

  it('advanceStep returns null after all steps are completed', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      await completeStep(testDir, sessionId, i);
    }

    const result = await advanceStep(testDir, sessionId, WORKFLOW_NAME);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Resume from mid-workflow
// ---------------------------------------------------------------------------

describe('code-review: resume from mid-workflow', () => {
  it('resumes from step 3 after completing steps 1 and 2', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    await completeStep(testDir, sessionId, 1);
    await completeStep(testDir, sessionId, 2);

    const result = await resumeWorkflow(testDir, sessionId, WORKFLOW_NAME);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(3);
    expect(result!.slug).toBe('assess');
  });

  it('resumes from step 1 when no steps completed', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    const result = await resumeWorkflow(testDir, sessionId, WORKFLOW_NAME);
    expect(result!.stepIndex).toBe(1);
  });

  it('returns null when all steps are already complete', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      await completeStep(testDir, sessionId, i);
    }

    const result = await resumeWorkflow(testDir, sessionId, WORKFLOW_NAME);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Approval gate at final step — rejection triggers revision handoff to Coda
// ---------------------------------------------------------------------------

describe('code-review: approval gate and rejection routing', () => {
  it('final step (step 4) has slug "approval"', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS);
    expect(result!.slug).toBe('approval');
  });

  it('final step content references approval decision', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS);
    expect(result!.content.toLowerCase()).toMatch(/approv/);
  });

  it('final step content references rejection handling', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS);
    expect(result!.content.toLowerCase()).toMatch(/reject/);
  });

  it('final step content references Coda as the revision target', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS);
    // Rejection must route back to Coda, not just return an error
    expect(result!.content.toLowerCase()).toMatch(/coda/);
  });

  it('final step content references revision handoff (not just an error)', async () => {
    await installWorkflow();
    const result = await loadStep(testDir, WORKFLOW_NAME, TOTAL_STEPS);
    const content = result!.content.toLowerCase();
    // Must describe a structured revision cycle, not just "return error"
    expect(content).toMatch(/revision|handoff|cycle/);
  });

  it('workflow is complete after final step is marked done', async () => {
    await installWorkflow();
    const sessionId = `s-${Date.now()}`;
    await scaffoldIndex(sessionId);

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      await completeStep(testDir, sessionId, i);
    }

    const result = await advanceStep(testDir, sessionId, WORKFLOW_NAME);
    expect(result).toBeNull();
  });
});
