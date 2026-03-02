import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CREATE_SPEC_REQUIRED_REPORT_FIELDS,
  buildCreateSpecTaskPrompt,
  normalizeCreateSpecRequest,
  validateCreateSpecStageReport,
  validateCreateSpecTaskPrompt,
} from '../../src/workflow/create-spec-contracts.js';

describe('create-spec contracts', () => {
  describe('normalizeCreateSpecRequest', () => {
    it('normalizes a valid request payload', async () => {
      const normalized = await normalizeCreateSpecRequest({
        session_id: 's-20260302-005',
        workflow: 'create-spec',
        target_persona: 'sinfonica-maestro',
        skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
        request_text: 'Create and route create-spec orchestration to maestro.',
        required_report_fields: [...CREATE_SPEC_REQUIRED_REPORT_FIELDS],
      });

      expect(normalized.session_id).toBe('s-20260302-005');
      expect(normalized.workflow).toBe('create-spec');
      expect(normalized.target_persona).toBe('sinfonica-maestro');
      expect(normalized.required_report_fields).toEqual(CREATE_SPEC_REQUIRED_REPORT_FIELDS);
    });

    it('rejects when required_report_fields are not exact and ordered', async () => {
      await expect(
        normalizeCreateSpecRequest({
          session_id: 's-20260302-005',
          workflow: 'create-spec',
          target_persona: 'sinfonica-maestro',
          skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
          request_text: 'Create spec.',
          required_report_fields: ['status', 'next_action', 'blockers', 'approval_requirement', 'artifacts'],
        }),
      ).rejects.toThrow('required_report_fields');
    });

    it('rejects when skill_path does not exist', async () => {
      await expect(
        normalizeCreateSpecRequest({
          session_id: 's-20260302-005',
          workflow: 'create-spec',
          target_persona: 'sinfonica-maestro',
          skill_path: '.opencode/skills/sinfonica-create-spec/MISSING.md',
          request_text: 'Create spec.',
          required_report_fields: [...CREATE_SPEC_REQUIRED_REPORT_FIELDS],
        }),
      ).rejects.toThrow('skill_path');
    });

    it('rejects when canonical skill_path file does not exist in provided cwd', async () => {
      const missingSkillCwd = await mkdtemp(join(tmpdir(), 'create-spec-contracts-'));

      try {
        await expect(
          normalizeCreateSpecRequest(
            {
              session_id: 's-20260302-005',
              workflow: 'create-spec',
              target_persona: 'sinfonica-maestro',
              skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
              request_text: 'Create spec.',
              required_report_fields: [...CREATE_SPEC_REQUIRED_REPORT_FIELDS],
            },
            missingSkillCwd,
          ),
        ).rejects.toThrow('skill_path does not exist');
      } finally {
        await rm(missingSkillCwd, { recursive: true, force: true });
      }
    });
  });

  describe('buildCreateSpecTaskPrompt / validateCreateSpecTaskPrompt', () => {
    it('builds a task prompt matching the deterministic contract', async () => {
      const normalized = await normalizeCreateSpecRequest({
        session_id: 's-20260302-005',
        workflow: 'create-spec',
        target_persona: 'sinfonica-maestro',
        skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
        request_text: 'Create and route create-spec orchestration to maestro.',
      });

      const prompt = buildCreateSpecTaskPrompt(normalized, 'Normalized request summary text.');
      expect(prompt.address_to).toBe('@sinfonica-maestro');
      expect(prompt.workflow).toBe('create-spec');
      expect(() => validateCreateSpecTaskPrompt(prompt, normalized)).not.toThrow();
    });

    it('rejects a prompt with wrong address_to', async () => {
      const normalized = await normalizeCreateSpecRequest({
        session_id: 's-20260302-005',
        workflow: 'create-spec',
        target_persona: 'sinfonica-maestro',
        skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
        request_text: 'Create and route create-spec orchestration to maestro.',
      });

      const prompt = buildCreateSpecTaskPrompt(normalized, 'Normalized request summary text.');
      expect(() =>
        validateCreateSpecTaskPrompt(
          {
            ...prompt,
            address_to: '@sinfonica-amadeus',
          },
          normalized,
        ),
      ).toThrow('address_to');
    });

    it('rejects required_response_format with unexpected value literals', async () => {
      const normalized = await normalizeCreateSpecRequest({
        session_id: 's-20260302-005',
        workflow: 'create-spec',
        target_persona: 'sinfonica-maestro',
        skill_path: '.opencode/skills/sinfonica-create-spec/SKILL.md',
        request_text: 'Create and route create-spec orchestration to maestro.',
      });

      const prompt = buildCreateSpecTaskPrompt(normalized, 'Normalized request summary text.');
      expect(() =>
        validateCreateSpecTaskPrompt(
          {
            ...prompt,
            required_response_format: {
              ...prompt.required_response_format,
              blockers: 'string|null',
            },
          },
          normalized,
        ),
      ).toThrow('required_response_format');
    });
  });

  describe('validateCreateSpecStageReport', () => {
    it('accepts a valid awaiting_approval report', () => {
      expect(() =>
        validateCreateSpecStageReport({
          stage_id: '03-dispatch-and-execute',
          status: 'awaiting_approval',
          blockers: 'None',
          next_action: 'Await explicit approval before dispatching next stage.',
          approval_requirement: 'required',
          artifacts: ['.sinfonica/handoffs/s-20260302-005/dispatch-03-coda.md'],
        }),
      ).not.toThrow();
    });

    it('rejects blocked status when blockers is None', () => {
      expect(() =>
        validateCreateSpecStageReport({
          stage_id: '04-validate',
          status: 'blocked',
          blockers: 'None',
          next_action: 'Fix validation mismatches.',
          approval_requirement: 'not_required',
          artifacts: [],
        }),
      ).toThrow('blockers');
    });
  });
});
