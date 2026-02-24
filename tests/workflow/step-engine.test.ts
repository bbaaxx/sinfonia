import { mkdir, rm, writeFile } from 'node:fs/promises';
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
// Test helpers
// ---------------------------------------------------------------------------

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `sinfonia-step-engine-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

/** Creates a workflow definition directory with N step files. */
async function scaffoldWorkflow(
  base: string,
  name: string,
  steps: Array<{ slug: string; content?: string }>,
): Promise<string> {
  const workflowDir = join(base, '.sinfonia', 'workflows', name);
  const stepsDir = join(workflowDir, 'steps');
  await mkdir(stepsDir, { recursive: true });

  // Write workflow.md definition
  const defContent = [
    `# Workflow: ${name}`,
    ``,
    `Description: Test workflow for ${name}.`,
    ``,
    `## Steps`,
    ...steps.map((s, i) => `${i + 1}. ${s.slug}`),
  ].join('\n');
  await writeFile(join(workflowDir, 'workflow.md'), defContent, 'utf-8');

  // Write step files
  for (let i = 0; i < steps.length; i++) {
    const { slug, content } = steps[i];
    const fileName = `step-${String(i + 1).padStart(2, '0')}-${slug}.md`;
    const stepContent = content ?? `# Step ${i + 1}: ${slug}\n\nDo the ${slug} thing.\n`;
    await writeFile(join(stepsDir, fileName), stepContent, 'utf-8');
  }

  return workflowDir;
}

/** Creates a workflow index (workflow.md) in the handoffs directory. */
async function scaffoldWorkflowIndex(
  base: string,
  sessionId: string,
  workflowName: string,
  totalSteps: number,
): Promise<void> {
  const steps = Array.from({ length: totalSteps }, (_, i) => ({
    step: `step-${String(i + 1).padStart(2, '0')}`,
    persona: 'maestro',
  }));
  await createWorkflowIndex({
    cwd: base,
    sessionId,
    workflowId: `w-${Date.now()}`,
    goal: `Test goal for ${workflowName}`,
    steps,
  });
}

// ---------------------------------------------------------------------------
// loadWorkflowDef
// ---------------------------------------------------------------------------

describe('loadWorkflowDef', () => {
  it('loads a workflow definition with discovered step files', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
      { slug: 'review-prd' },
    ]);

    const def = await loadWorkflowDef(testDir, 'create-prd');
    expect(def).not.toBeNull();
    expect(def!.name).toBe('create-prd');
    expect(def!.totalSteps).toBe(3);
    expect(def!.steps).toHaveLength(3);
  });

  it('returns steps in ascending index order', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
      { slug: 'review-prd' },
    ]);

    const def = await loadWorkflowDef(testDir, 'create-prd');
    expect(def!.steps[0].index).toBe(1);
    expect(def!.steps[1].index).toBe(2);
    expect(def!.steps[2].index).toBe(3);
  });

  it('populates slug from the step filename', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
    ]);

    const def = await loadWorkflowDef(testDir, 'create-prd');
    expect(def!.steps[0].slug).toBe('gather-requirements');
    expect(def!.steps[1].slug).toBe('draft-prd');
  });

  it('populates filePath for each step', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'gather-requirements' }]);

    const def = await loadWorkflowDef(testDir, 'create-prd');
    expect(def!.steps[0].filePath).toContain('step-01-gather-requirements.md');
  });

  it('returns null when workflow directory does not exist', async () => {
    const def = await loadWorkflowDef(testDir, 'nonexistent-workflow');
    expect(def).toBeNull();
  });

  it('returns null when steps directory is empty', async () => {
    const workflowDir = join(testDir, '.sinfonia', 'workflows', 'empty-workflow');
    await mkdir(join(workflowDir, 'steps'), { recursive: true });
    await writeFile(join(workflowDir, 'workflow.md'), '# Workflow: empty\n', 'utf-8');

    const def = await loadWorkflowDef(testDir, 'empty-workflow');
    expect(def).toBeNull();
  });

  it('extracts description from workflow.md', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'step-one' }]);
    const def = await loadWorkflowDef(testDir, 'create-prd');
    expect(def!.description).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// loadStep
// ---------------------------------------------------------------------------

describe('loadStep', () => {
  it('loads a step file by 1-indexed step number', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements', content: '# Step 1\n\nGather all requirements.\n' },
      { slug: 'draft-prd' },
    ]);

    const result = await loadStep(testDir, 'create-prd', 1);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.content).toContain('Gather all requirements');
  });

  it('returns the correct slug for the loaded step', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
    ]);

    const result = await loadStep(testDir, 'create-prd', 2);
    expect(result!.slug).toBe('draft-prd');
  });

  it('returns totalSteps in the result', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
      { slug: 'step-three' },
    ]);

    const result = await loadStep(testDir, 'create-prd', 1);
    expect(result!.totalSteps).toBe(3);
  });

  it('returns null for a step index that does not exist', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'only-step' }]);
    const result = await loadStep(testDir, 'create-prd', 99);
    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist', async () => {
    const result = await loadStep(testDir, 'nonexistent', 1);
    expect(result).toBeNull();
  });

  it('never loads more than one step at a time (pure load, no side effects)', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
    ]);

    // Loading step 1 should not affect step 2 in any way
    const step1 = await loadStep(testDir, 'create-prd', 1);
    const step2 = await loadStep(testDir, 'create-prd', 2);
    expect(step1!.stepIndex).toBe(1);
    expect(step2!.stepIndex).toBe(2);
    // Each load is independent
    expect(step1!.content).not.toBe(step2!.content);
  });
});

// ---------------------------------------------------------------------------
// advanceStep
// ---------------------------------------------------------------------------

describe('advanceStep', () => {
  it('loads the first step when workflow is freshly created', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 2);

    const result = await advanceStep(testDir, sessionId, 'create-prd');
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.slug).toBe('gather-requirements');
  });

  it('loads the next step after current_step_index advances', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements' },
      { slug: 'draft-prd' },
      { slug: 'review-prd' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 3);

    // Complete step 1 first
    await completeStep(testDir, sessionId, 1);

    const result = await advanceStep(testDir, sessionId, 'create-prd');
    expect(result!.stepIndex).toBe(2);
    expect(result!.slug).toBe('draft-prd');
  });

  it('returns null when all steps are completed', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'only-step' }]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 1);

    await completeStep(testDir, sessionId, 1);

    const result = await advanceStep(testDir, sessionId, 'create-prd');
    expect(result).toBeNull();
  });

  it('returns null when workflow index does not exist', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'step-one' }]);
    const result = await advanceStep(testDir, 'nonexistent-session', 'create-prd');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// completeStep
// ---------------------------------------------------------------------------

describe('completeStep', () => {
  it('updates current_step_index in workflow.md after completing a step', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 2);

    await completeStep(testDir, sessionId, 1);

    // advanceStep should now return step 2
    const next = await advanceStep(testDir, sessionId, 'create-prd');
    expect(next!.stepIndex).toBe(2);
  });

  it('marks workflow as complete when last step is completed', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'only-step' }]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 1);

    await completeStep(testDir, sessionId, 1);

    // advanceStep should return null (no more steps)
    const next = await advanceStep(testDir, sessionId, 'create-prd');
    expect(next).toBeNull();
  });

  it('is idempotent: completing the same step twice does not corrupt state', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 2);

    await completeStep(testDir, sessionId, 1);
    await completeStep(testDir, sessionId, 1); // second call — should be safe

    const next = await advanceStep(testDir, sessionId, 'create-prd');
    expect(next!.stepIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// resumeWorkflow
// ---------------------------------------------------------------------------

describe('resumeWorkflow', () => {
  it('resumes from the next step after the last completed step', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
      { slug: 'step-three' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 3);

    // Simulate steps 1 and 2 completed
    await completeStep(testDir, sessionId, 1);
    await completeStep(testDir, sessionId, 2);

    const result = await resumeWorkflow(testDir, sessionId, 'create-prd');
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(3);
    expect(result!.slug).toBe('step-three');
  });

  it('returns step 1 when no steps have been completed yet', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 2);

    const result = await resumeWorkflow(testDir, sessionId, 'create-prd');
    expect(result!.stepIndex).toBe(1);
  });

  it('returns null when all steps are already completed', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'only-step' }]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 1);

    await completeStep(testDir, sessionId, 1);

    const result = await resumeWorkflow(testDir, sessionId, 'create-prd');
    expect(result).toBeNull();
  });

  it('returns null when workflow index does not exist', async () => {
    await scaffoldWorkflow(testDir, 'create-prd', [{ slug: 'step-one' }]);
    const result = await resumeWorkflow(testDir, 'ghost-session', 'create-prd');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// End-to-end: 3-step workflow
// ---------------------------------------------------------------------------

describe('end-to-end: 3-step workflow', () => {
  it('executes a full 3-step workflow in sequence', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'gather-requirements', content: '# Step 1\nGather requirements.\n' },
      { slug: 'draft-prd', content: '# Step 2\nDraft the PRD.\n' },
      { slug: 'review-prd', content: '# Step 3\nReview the PRD.\n' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 3);

    // Step 1
    const step1 = await advanceStep(testDir, sessionId, 'create-prd');
    expect(step1!.stepIndex).toBe(1);
    expect(step1!.content).toContain('Gather requirements');
    await completeStep(testDir, sessionId, 1);

    // Step 2
    const step2 = await advanceStep(testDir, sessionId, 'create-prd');
    expect(step2!.stepIndex).toBe(2);
    expect(step2!.content).toContain('Draft the PRD');
    await completeStep(testDir, sessionId, 2);

    // Step 3
    const step3 = await advanceStep(testDir, sessionId, 'create-prd');
    expect(step3!.stepIndex).toBe(3);
    expect(step3!.content).toContain('Review the PRD');
    await completeStep(testDir, sessionId, 3);

    // Done — no more steps
    const done = await advanceStep(testDir, sessionId, 'create-prd');
    expect(done).toBeNull();
  });

  it('can resume mid-workflow after simulated crash', async () => {
    const sessionId = `s-${Date.now()}`;
    await scaffoldWorkflow(testDir, 'create-prd', [
      { slug: 'step-one' },
      { slug: 'step-two' },
      { slug: 'step-three' },
    ]);
    await scaffoldWorkflowIndex(testDir, sessionId, 'create-prd', 3);

    // Complete step 1 then "crash"
    await completeStep(testDir, sessionId, 1);

    // Resume — should pick up at step 2
    const resumed = await resumeWorkflow(testDir, sessionId, 'create-prd');
    expect(resumed!.stepIndex).toBe(2);
    expect(resumed!.slug).toBe('step-two');
  });
});
