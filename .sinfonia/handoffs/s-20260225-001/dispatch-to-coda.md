---
handoff_type: dispatch
session_id: s-20260225-001
sequence: 1
source_persona: maestro
target_persona: coda
workflow: dev-story
stage: 1
created_at: 2026-02-25
status: ready
---

# Dispatch Envelope: s-20260225-001#001

**Source**: @sinfonia-maestro → **Target**: @sinfonia-coda

---

## Task

Implement the fortune-telling MCP server story (session `s-20260225-001`) using strict TDD. Follow the `dev-story` workflow steps 01–05 in order. The story analysis is already complete (step 01); begin at step 02 (write tests).

---

## Context

### Story
Build a minimal MCP server that exposes a `get_fortune` tool. The tool returns a random fortune string from a hardcoded list of 10 fortunes. The server must be runnable with `node fortune-mcp.js` and expose the MCP tool over stdio transport.

### Acceptance Criteria
1. `get_fortune` tool registered and callable via MCP stdio transport
2. Returns one of 10 hardcoded fortune strings at random
3. Server starts cleanly with `node fortune-mcp.js`
4. Unit test: `fortune-mcp.test.js` — tests that `get_fortune` returns a string from the known list
5. All tests pass, no external dependencies beyond `@modelcontextprotocol/sdk`

### Output Location
`packages/sinfonia/src/mcp/fortune-demo/`
- Implementation file: `fortune-mcp.js`
- Test file: `fortune-mcp.test.js`

### Story Analysis (step 01 — complete)
Artifact: `.sinfonia/handoffs/s-20260225-001/story-analysis.md`

**Implementation tasks** (from analysis):
- Task 1: `npm install @modelcontextprotocol/sdk` — must be done first
- Task 2: Create `src/mcp/fortune-demo/` directory
- Task 3: Write `fortune-mcp.js` — ESM module exporting `FORTUNES` array and `getRandomFortune()`, plus MCP server setup with stdio transport and `get_fortune` tool registration
- Task 4: Verify direct execution with `node fortune-mcp.js`

**Test cases** (from analysis — write these first in step 02):
- Test 1: `get_fortune` returns a string
- Test 2: `get_fortune` returns a value from the known FORTUNES list
- Test 3: `getRandomFortune()` produces at least 2 distinct values over 20 calls
- Test 4: `FORTUNES.length === 10`
- Test 5: All FORTUNES entries are non-empty strings

**Test framework decision**: Use Node.js built-in `node:test` runner (`node --test fortune-mcp.test.js`) to avoid any external test dependencies. The MCP server logic (FORTUNES array and getRandomFortune) must be exported from `fortune-mcp.js` so the test file can import and exercise them in isolation, without starting the stdio server process.

### Repository Context
- Package: `sinfonia` — ESM (`"type": "module"` in package.json)
- Node.js version: ≥20 (built-in `node:test` available)
- Existing test framework: Vitest (`tests/**/*.test.ts`) — not used here; this story's test is plain JS
- No `@modelcontextprotocol/sdk` installed yet — Task 1 must install it

---

## Constraints

1. **TDD order is mandatory**: Write and run the failing test file (step 02) completely before writing any implementation (step 03). ENF-001 is active.
2. **No TypeScript**: Both files are plain `.js` (ESM). Do not use `.ts` extensions.
3. **No additional external dependencies**: Only `@modelcontextprotocol/sdk` is allowed beyond Node.js built-ins.
4. **Exports required for testability**: `fortune-mcp.js` must export `FORTUNES` and `getRandomFortune` so the test can import them. The MCP server startup must be guarded (e.g., `if (process.argv[1] === fileURLToPath(import.meta.url))`) so importing the module for testing does not launch the stdio server.
5. **Do not modify unrelated files**: Do not alter existing source, tests, or configuration outside `src/mcp/fortune-demo/` and `package.json` (only for the SDK dependency).
6. **Verification report required**: Produce `verification-report.md` in `.sinfonia/handoffs/s-20260225-001/` after step 04.
7. **Approval gate**: Present implementation summary and await explicit approval before closing the workflow.

---

## Expected Outputs

| Artifact | Path | Required by Step |
|---|---|---|
| `fortune-mcp.test.js` (failing) | `src/mcp/fortune-demo/fortune-mcp.test.js` | Step 02 |
| `fortune-mcp.js` (implementation) | `src/mcp/fortune-demo/fortune-mcp.js` | Step 03 |
| `verification-report.md` | `.sinfonia/handoffs/s-20260225-001/verification-report.md` | Step 04 |
| Approval decision | Inline in step 05 | Step 05 |

---

## Workflow Steps Reference

| Step | Name | Trigger |
|---|---|---|
| 01 | analyze-story | ✅ Complete — see story-analysis.md |
| 02 | write-tests | Begin here |
| 03 | implement | After all tests fail cleanly |
| 04 | verify | After all tests pass |
| 05 | approval | After verification-report.md is written |
