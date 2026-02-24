import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  workflowIndexPath,
  readWorkflowIndex,
  updateWorkflowIndex,
} from './index-manager.js';
import type { StepLoadResult, WorkflowDef, WorkflowStepDef } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKFLOWS_SUBDIR = join('.sinfonia', 'workflows');
const STEP_FILE_PATTERN = /^step-(\d+)-(.+)\.md$/;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function workflowDir(projectRoot: string, name: string): string {
  return join(projectRoot, WORKFLOWS_SUBDIR, name);
}

function stepsDir(projectRoot: string, name: string): string {
  return join(workflowDir(projectRoot, name), 'steps');
}

/** Parse step filename into index + slug. Returns null for non-step files. */
function parseStepFilename(filename: string): { index: number; slug: string } | null {
  const match = filename.match(STEP_FILE_PATTERN);
  if (!match) return null;
  return { index: parseInt(match[1], 10), slug: match[2] };
}

/** Discover and sort all step definitions in a workflow's steps directory. */
async function discoverSteps(projectRoot: string, name: string): Promise<WorkflowStepDef[]> {
  const dir = stepsDir(projectRoot, name);
  let entries: string[];

  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const steps: WorkflowStepDef[] = [];
  for (const entry of entries) {
    const parsed = parseStepFilename(entry);
    if (!parsed) continue;
    steps.push({
      index: parsed.index,
      slug: parsed.slug,
      filePath: join(dir, entry),
    });
  }

  return steps.sort((a, b) => a.index - b.index);
}

/** Extract description from workflow.md definition file. */
async function extractDescription(projectRoot: string, name: string): Promise<string> {
  const defPath = join(workflowDir(projectRoot, name), 'workflow.md');
  try {
    const content = await readFile(defPath, 'utf-8');
    // Look for "Description: ..." line
    const match = content.match(/^Description:\s*(.+)$/m);
    if (match) return match[1].trim();
    // Fallback: use first non-heading, non-empty line
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    return lines[0]?.trim() ?? name;
  } catch {
    return name;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads the workflow definition from `.sinfonia/workflows/<name>/workflow.md`
 * and discovers all step files in the `steps/` subdirectory.
 *
 * Returns null if the workflow directory does not exist or has no steps.
 */
export async function loadWorkflowDef(
  projectRoot: string,
  name: string,
): Promise<WorkflowDef | null> {
  const steps = await discoverSteps(projectRoot, name);
  if (steps.length === 0) return null;

  const description = await extractDescription(projectRoot, name);

  return {
    name,
    description,
    totalSteps: steps.length,
    steps,
  };
}

/**
 * Loads a single step file by 1-indexed step number on demand.
 * Never loads more than the requested step — pure read, no side effects.
 *
 * Returns null if the step does not exist or the workflow is not found.
 */
export async function loadStep(
  projectRoot: string,
  name: string,
  stepIndex: number,
): Promise<StepLoadResult | null> {
  const steps = await discoverSteps(projectRoot, name);
  if (steps.length === 0) return null;

  const stepDef = steps.find((s) => s.index === stepIndex);
  if (!stepDef) return null;

  try {
    const content = await readFile(stepDef.filePath, 'utf-8');
    return {
      stepIndex: stepDef.index,
      slug: stepDef.slug,
      filePath: stepDef.filePath,
      content,
      totalSteps: steps.length,
    };
  } catch (err) {
    console.warn(`[sinfonia:step-engine] Failed to read step ${stepIndex} for "${name}":`, err);
    return null;
  }
}

/**
 * Reads the workflow index to find the current step index, then loads
 * the next unstarted step. Returns null when all steps are complete or
 * the workflow index does not exist.
 */
export async function advanceStep(
  projectRoot: string,
  sessionId: string,
  workflowName: string,
): Promise<StepLoadResult | null> {
  const indexPath = workflowIndexPath(projectRoot, sessionId);

  let currentStepIndex: number;
  let workflowStatus: string;
  try {
    const index = await readWorkflowIndex(indexPath);
    currentStepIndex = index.frontmatter.currentStepIndex;
    workflowStatus = index.frontmatter.workflowStatus;
  } catch {
    return null;
  }

  // Workflow is fully complete — no more steps to load
  if (workflowStatus === 'complete') return null;

  const steps = await discoverSteps(projectRoot, workflowName);
  if (steps.length === 0) return null;

  if (currentStepIndex < 1 || currentStepIndex > steps.length) return null;

  return loadStep(projectRoot, workflowName, currentStepIndex);
}

/**
 * Marks a step as completed by updating `current_step_index` in workflow.md
 * to point to the next step (or 0 if this was the last step).
 *
 * Idempotent: if the step is already past, the index is not regressed.
 * Non-throwing: logs and returns on I/O error.
 */
export async function completeStep(
  projectRoot: string,
  sessionId: string,
  stepIndex: number,
): Promise<void> {
  const indexPath = workflowIndexPath(projectRoot, sessionId);

  try {
    const index = await readWorkflowIndex(indexPath);
    const { currentStepIndex, totalSteps, workflowStatus } = index.frontmatter;

    // Idempotent guard: only advance if this step is the current one
    if (stepIndex !== currentStepIndex) return;

    const isLastStep = stepIndex >= totalSteps;
    const nextStepIndex = isLastStep ? stepIndex : stepIndex + 1;

    // Ensure we are in-progress before marking complete (handles 'created' state)
    if (workflowStatus === 'created') {
      await updateWorkflowIndex(indexPath, { workflowStatus: 'in-progress' });
    }

    if (isLastStep) {
      // Transition to complete — currentStepIndex stays at last step (signals done via status)
      await updateWorkflowIndex(indexPath, { workflowStatus: 'complete' });
    } else {
      await updateWorkflowIndex(indexPath, {
        currentStepIndex: nextStepIndex,
        workflowStatus: 'in-progress',
      });
    }
  } catch (err) {
    console.warn(
      `[sinfonia:step-engine] Failed to complete step ${stepIndex} for session "${sessionId}":`,
      err,
    );
  }
}

/**
 * Resumes a workflow by reading the current step index from workflow.md
 * and loading the next pending step.
 *
 * - If no steps completed yet, returns step 1.
 * - If all steps completed, returns null.
 * - Returns null if the workflow index does not exist.
 */
export async function resumeWorkflow(
  projectRoot: string,
  sessionId: string,
  workflowName: string,
): Promise<StepLoadResult | null> {
  // resumeWorkflow and advanceStep share the same logic:
  // both read current_step_index and load that step.
  return advanceStep(projectRoot, sessionId, workflowName);
}
