import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { writeHandoffEnvelope } from '../../src/handoff/writer.js';
import { dispatchStep, initPipeline, processReturnEnvelope } from '../../src/workflow/coordinator.js';

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `coordinator-create-spec-${prefix}-`));
}

describe('create-spec approval gates', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('marks dispatch stage as approval-required for create-spec', async () => {
    const cwd = await makeTempDir('dispatch');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, ['create-spec'], 'Create a deterministic spec flow');
    const result = await dispatchStep(
      cwd,
      session.sessionId,
      0,
      'create-spec',
      'Execute create-spec stage sequence',
      'Use deterministic stage report fields.',
    );

    expect(result.orchestrationCue).toContain('approval_requirement: required');
  });

  it('marks final reporting cue as approval-required after final approval', async () => {
    const cwd = await makeTempDir('final');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, ['create-spec'], 'Create a deterministic spec flow');
    const returnEnvelope = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: 'amadeus',
        targetPersona: 'maestro',
        type: 'return',
        status: 'completed',
        artifacts: ['spec-01-amadeus.md'],
        summary: 'Implemented approved specification updates.',
        completionAssessment: 'Pass',
        blockers: [],
        recommendations: ['Approve and continue to review.'],
      },
      session.sessionId,
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      returnEnvelope.filePath,
      'approve',
      'reviewer',
    );

    expect(result.workflowIndex.frontmatter.workflowStatus).toBe('complete');
    expect(result.orchestrationCue).toContain('approval_requirement: required');
  });
});
