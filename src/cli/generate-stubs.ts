import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type WorkflowStub = {
  commandName: string;
  description: string;
  workflowId: string;
  skillName: string;
};

export const WORKFLOW_STUBS: WorkflowStub[] = [
  {
    commandName: "sinfonia-create-prd",
    description: "Create a PRD with the Sinfonia workflow",
    workflowId: "create-prd",
    skillName: "sinfonia-create-prd"
  },
  {
    commandName: "sinfonia-create-spec",
    description: "Create a spec with the Sinfonia workflow",
    workflowId: "create-spec",
    skillName: "sinfonia-create-spec"
  },
  {
    commandName: "sinfonia-dev-story",
    description: "Implement a story with the Sinfonia workflow",
    workflowId: "dev-story",
    skillName: "sinfonia-dev-story"
  },
  {
    commandName: "sinfonia-code-review",
    description: "Run a code review with the Sinfonia workflow",
    workflowId: "code-review",
    skillName: "sinfonia-code-review"
  }
];

const ensureParentDirectory = async (path: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
};

const writeIfMissing = async (path: string, content: string): Promise<void> => {
  try {
    await access(path, constants.F_OK);
  } catch {
    await ensureParentDirectory(path);
    await writeFile(path, content, "utf8");
  }
};

const toCommandStub = (workflow: WorkflowStub): string => `---
name: ${workflow.commandName}
description: ${workflow.description}
---

Route this request to @sinfonia-maestro and run workflow \`${workflow.workflowId}\`.

User input: $ARGUMENTS

Load skill package: \`.opencode/skills/${workflow.skillName}/SKILL.md\`.
`;

const toSkill = (workflow: WorkflowStub): string => `# ${workflow.skillName}

Workflow support skill for workflow \`${workflow.workflowId}\`.

## Steps

1. Parse and normalize the request input.
2. Build a short execution plan for this workflow.
3. Execute the workflow stages through the assigned persona chain.
4. Validate outputs against acceptance criteria.
5. Return a concise result summary and next actions.
`;

export const generateWorkflowStubs = async (cwd: string): Promise<void> => {
  for (const workflow of WORKFLOW_STUBS) {
    const commandPath = join(cwd, ".opencode/command", `${workflow.commandName}.md`);
    await ensureParentDirectory(commandPath);
    await writeFile(commandPath, toCommandStub(workflow), "utf8");

    const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");
    await writeIfMissing(skillPath, toSkill(workflow));
  }
};
