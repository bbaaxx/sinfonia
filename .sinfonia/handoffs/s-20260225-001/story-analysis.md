# Story Analysis — s-20260225-001

**Workflow**: dev-story | **Step**: 01 — Analyze Story | **Status**: complete

---

## Story Summary

**Title**: Build a fortune-telling MCP server
**Session**: s-20260225-001

Build a self-contained, single-file MCP server (`fortune-mcp.js`) that registers one tool (`get_fortune`) over stdio transport. The tool returns a random string from a hardcoded array of exactly 10 fortunes. No database, no external runtime dependencies beyond the MCP SDK. The file must be directly executable with `node fortune-mcp.js`.

**Note on test framework**: The story specifies `fortune-mcp.test.js` (plain `.js`), which is outside the project's default Vitest `.ts` include pattern (`tests/**/*.test.ts`). The test file will be placed co-located in `src/mcp/fortune-demo/` and run with `node --test` (Node.js built-in test runner) to satisfy the "no external dependencies beyond `@modelcontextprotocol/sdk`" constraint while keeping it executable without TypeScript compilation.

---

## Implementation Task List

```
Task 1: Install @modelcontextprotocol/sdk as a dependency (required before any code)
Task 2: Create src/mcp/fortune-demo/ directory
Task 3: Write fortune-mcp.js — define FORTUNES array (10 strings), implement getRandomFortune(), register MCP Server with StdioServerTransport, register get_fortune tool handler, start the server
Task 4: Ensure the file has correct ESM structure and is directly runnable with `node fortune-mcp.js`
```

---

## Test Case List

Derived from acceptance criteria. Test file: `src/mcp/fortune-demo/fortune-mcp.test.js`

```
Test 1 [AC2]: get_fortune returns a string
  → result is typeof 'string'

Test 2 [AC2]: get_fortune returns a value from the known FORTUNES list
  → result is contained in the exported FORTUNES array

Test 3 [AC2]: get_fortune returns different values over multiple calls (randomness check)
  → calling getRandomFortune() 20 times produces at least 2 distinct values

Test 4 [AC1]: FORTUNES array contains exactly 10 entries
  → FORTUNES.length === 10

Test 5 [AC1]: All entries in FORTUNES are non-empty strings
  → every item passes typeof === 'string' && item.length > 0
```

---

## Blockers

None. Story is self-contained with no upstream dependencies.

**Pre-condition**: `@modelcontextprotocol/sdk` must be installed before step 02. Coda must run `npm install @modelcontextprotocol/sdk` as Task 1.

---

## Completion Signal

✅ Analysis complete. Blockers list is empty. Ready to proceed to step 02 (write-tests).
