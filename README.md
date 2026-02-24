# sinfonia

Multi-agent orchestration framework for structured AI workflows.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Local CLI

```bash
npx . --help
```

---

## Architecture

### Handoff System (`src/handoff/`)

Manages structured handoff envelopes between agent personas.

- **`writer.ts`** — Creates handoff envelope files (`.sinfonia/handoffs/<session>/<seq>-<from>-to-<to>.md`). After each successful write, registers the envelope as an artifact in the workflow index (non-blocking).
- **`approval.ts`** — Applies approval decisions (`approve` / `reject`) to envelopes. Records decisions in the workflow index via `addDecision()` (non-blocking). On reject, auto-creates a revision envelope.
- **`reader.ts`** — Parses and validates envelope files.
- **`types.ts`** — Handoff-domain types: `HandoffType`, `HandoffStatus`, `HandoffPayload`, `WrittenHandoff`.

### Workflow State Store (`src/workflow/`)

Canonical source of truth for workflow state, stored in `workflow.md` per session.

- **`index-manager.ts`** — Read/write API for `workflow.md`. Key exports:
  - `createWorkflowIndex(cwd, sessionId, opts)` — Initialise a new workflow index
  - `readWorkflowIndex(filePath)` — Parse a workflow index file
  - `updateWorkflowIndex(filePath, patch)` — Apply a status/step patch
  - `addDecision(cwd, sessionId, decision)` — Append a decision record to the Decisions table
  - `addArtifact(cwd, sessionId, artifact)` — Append an artifact record to the Artifacts table
  - `workflowIndexPath(cwd, sessionId)` — Resolve the canonical path for a session's `workflow.md`
- **`types.ts`** — Workflow-domain types: `WorkflowStatus`, `WorkflowDecision`, `WorkflowArtifact`, `WorkflowIndex`.

### Integration

`approval.ts` and `writer.ts` both integrate with `WorkflowIndexManager` to keep the workflow index in sync with handoff activity. Both integrations are **non-blocking** — handoff operations succeed even if the workflow index write fails (a warning is logged).
