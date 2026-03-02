import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

export const CREATE_SPEC_WORKFLOW = 'create-spec';
export const CREATE_SPEC_TARGET_PERSONA = 'sinfonica-maestro';
export const CREATE_SPEC_ADDRESS_TO = '@sinfonica-maestro';
export const CREATE_SPEC_SKILL_PATH = '.opencode/skills/sinfonica-create-spec/SKILL.md';

export const CREATE_SPEC_REQUIRED_REPORT_FIELDS = [
  'status',
  'blockers',
  'next_action',
  'approval_requirement',
  'artifacts',
] as const;

type CreateSpecRequiredField = (typeof CREATE_SPEC_REQUIRED_REPORT_FIELDS)[number];

export type NormalizedCreateSpecRequest = {
  session_id: string;
  workflow: typeof CREATE_SPEC_WORKFLOW;
  target_persona: typeof CREATE_SPEC_TARGET_PERSONA;
  skill_path: typeof CREATE_SPEC_SKILL_PATH;
  request_text: string;
  required_report_fields: typeof CREATE_SPEC_REQUIRED_REPORT_FIELDS;
};

export type NormalizedCreateSpecRequestInput = {
  session_id: string;
  workflow: string;
  target_persona: string;
  skill_path: string;
  request_text: string;
  required_report_fields?: string[];
};

export type CreateSpecTaskPromptArtifact = {
  address_to: typeof CREATE_SPEC_ADDRESS_TO;
  workflow: typeof CREATE_SPEC_WORKFLOW;
  skill_context_path: typeof CREATE_SPEC_SKILL_PATH;
  request_context: string;
  required_response_format: Record<CreateSpecRequiredField, string>;
};

export type CreateSpecStageReportStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'complete'
  | 'blocked';

export type CreateSpecStageReport = {
  stage_id: string;
  status: CreateSpecStageReportStatus;
  blockers: string;
  next_action: string;
  approval_requirement: 'required' | 'not_required';
  artifacts: string[];
};

const expectedResponseFormat: Record<CreateSpecRequiredField, string> = {
  status: 'string',
  blockers: 'string|None',
  next_action: 'string',
  approval_requirement: 'string',
  artifacts: 'string[]',
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasExactOrderedRequiredFields = (fields: readonly string[]): boolean =>
  fields.length === CREATE_SPEC_REQUIRED_REPORT_FIELDS.length
  && fields.every((value, index) => value === CREATE_SPEC_REQUIRED_REPORT_FIELDS[index]);

export async function normalizeCreateSpecRequest(
  input: NormalizedCreateSpecRequestInput,
  cwd: string = process.cwd(),
): Promise<NormalizedCreateSpecRequest> {
  if (!isNonEmptyString(input.session_id) || !/^s-\d{8}-\d{3}$/.test(input.session_id)) {
    throw new Error('session_id must follow s-YYYYMMDD-XXX format');
  }

  if (input.workflow !== CREATE_SPEC_WORKFLOW) {
    throw new Error(`workflow must equal ${CREATE_SPEC_WORKFLOW}`);
  }

  if (input.target_persona !== CREATE_SPEC_TARGET_PERSONA) {
    throw new Error(`target_persona must equal ${CREATE_SPEC_TARGET_PERSONA}`);
  }

  if (input.skill_path !== CREATE_SPEC_SKILL_PATH) {
    throw new Error(`skill_path must equal ${CREATE_SPEC_SKILL_PATH}`);
  }

  if (!isNonEmptyString(input.request_text)) {
    throw new Error('request_text must be non-empty');
  }

  const requiredReportFields = input.required_report_fields ?? [...CREATE_SPEC_REQUIRED_REPORT_FIELDS];
  if (!hasExactOrderedRequiredFields(requiredReportFields)) {
    throw new Error('required_report_fields must match deterministic ordered field list');
  }

  try {
    await access(join(cwd, CREATE_SPEC_SKILL_PATH), constants.F_OK);
  } catch {
    throw new Error(`skill_path does not exist: ${CREATE_SPEC_SKILL_PATH}`);
  }

  return {
    session_id: input.session_id,
    workflow: CREATE_SPEC_WORKFLOW,
    target_persona: CREATE_SPEC_TARGET_PERSONA,
    skill_path: CREATE_SPEC_SKILL_PATH,
    request_text: input.request_text.trim(),
    required_report_fields: [...CREATE_SPEC_REQUIRED_REPORT_FIELDS],
  };
}

export function buildCreateSpecTaskPrompt(
  normalized: NormalizedCreateSpecRequest,
  requestContext: string,
): CreateSpecTaskPromptArtifact {
  return {
    address_to: CREATE_SPEC_ADDRESS_TO,
    workflow: normalized.workflow,
    skill_context_path: normalized.skill_path,
    request_context: requestContext,
    required_response_format: { ...expectedResponseFormat },
  };
}

export function validateCreateSpecTaskPrompt(
  prompt: CreateSpecTaskPromptArtifact,
  normalized: NormalizedCreateSpecRequest,
): void {
  if (prompt.address_to !== CREATE_SPEC_ADDRESS_TO) {
    throw new Error(`address_to must be ${CREATE_SPEC_ADDRESS_TO}`);
  }

  if (prompt.workflow !== normalized.workflow) {
    throw new Error('workflow must match normalized request workflow');
  }

  if (prompt.skill_context_path !== normalized.skill_path) {
    throw new Error('skill_context_path must match normalized request skill_path');
  }

  if (!isNonEmptyString(prompt.request_context)) {
    throw new Error('request_context must be non-empty');
  }

  const keys = Object.keys(prompt.required_response_format);
  if (!hasExactOrderedRequiredFields(keys)) {
    throw new Error('required_response_format must include deterministic response fields');
  }

  for (const field of CREATE_SPEC_REQUIRED_REPORT_FIELDS) {
    if (prompt.required_response_format[field] !== expectedResponseFormat[field]) {
      throw new Error(`required_response_format.${field} must equal ${expectedResponseFormat[field]}`);
    }
  }
}

export function validateCreateSpecStageReport(report: CreateSpecStageReport): void {
  if (!isNonEmptyString(report.stage_id)) {
    throw new Error('stage_id must be non-empty');
  }

  if (!isNonEmptyString(report.next_action)) {
    throw new Error('next_action must be non-empty');
  }

  if (!Array.isArray(report.artifacts)) {
    throw new Error('artifacts must be a string array');
  }

  if (report.status === 'blocked' && report.blockers.trim() === 'None') {
    throw new Error('blockers must be non-None when status is blocked');
  }

  if (report.status === 'awaiting_approval' && report.approval_requirement !== 'required') {
    throw new Error('approval_requirement must be required when status is awaiting_approval');
  }
}
