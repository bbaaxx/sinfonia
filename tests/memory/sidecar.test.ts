import { mkdir, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMemoryFile,
  appendMemoryEntry,
  readMemory,
  checkMemorySize,
} from '../../src/memory/sidecar.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `sinfonia-memory-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

const memoryDir = (base: string) => join(base, '.sinfonia', 'memory');

// ---------------------------------------------------------------------------
// createMemoryFile
// ---------------------------------------------------------------------------

describe('createMemoryFile', () => {
  it('creates the memory file at .sinfonia/memory/<persona_id>.md', async () => {
    await createMemoryFile('maestro', testDir);
    const filePath = join(memoryDir(testDir), 'maestro.md');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('# Memory: maestro');
  });

  it('includes a created timestamp in the header', async () => {
    await createMemoryFile('coder', testDir);
    const content = await readFile(join(memoryDir(testDir), 'coder.md'), 'utf-8');
    expect(content).toMatch(/Created:/);
  });

  it('creates parent directories if they do not exist', async () => {
    const nestedBase = join(testDir, 'nested', 'project');
    await createMemoryFile('tester', nestedBase);
    const filePath = join(nestedBase, '.sinfonia', 'memory', 'tester.md');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('# Memory: tester');
  });

  it('does not overwrite an existing memory file', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'first entry', testDir);
    // Call createMemoryFile again — should not overwrite
    await createMemoryFile('maestro', testDir);
    const content = await readFile(join(memoryDir(testDir), 'maestro.md'), 'utf-8');
    expect(content).toContain('first entry');
  });

  it('returns the path to the created file', async () => {
    const result = await createMemoryFile('reviewer', testDir);
    expect(result).toBe(join(memoryDir(testDir), 'reviewer.md'));
  });
});

// ---------------------------------------------------------------------------
// appendMemoryEntry
// ---------------------------------------------------------------------------

describe('appendMemoryEntry', () => {
  it('appends a timestamped entry to the memory file', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Decided to use vitest over jest', testDir);
    const content = await readFile(join(memoryDir(testDir), 'maestro.md'), 'utf-8');
    expect(content).toContain('Decided to use vitest over jest');
  });

  it('includes a timestamp on the appended entry', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Some decision', testDir);
    const content = await readFile(join(memoryDir(testDir), 'maestro.md'), 'utf-8');
    // Timestamp format: ISO-like or date prefix
    expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('appends multiple entries in order', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Entry one', testDir);
    await appendMemoryEntry('maestro', 'Entry two', testDir);
    await appendMemoryEntry('maestro', 'Entry three', testDir);
    const content = await readFile(join(memoryDir(testDir), 'maestro.md'), 'utf-8');
    const idxOne = content.indexOf('Entry one');
    const idxTwo = content.indexOf('Entry two');
    const idxThree = content.indexOf('Entry three');
    expect(idxOne).toBeLessThan(idxTwo);
    expect(idxTwo).toBeLessThan(idxThree);
  });

  it('auto-creates the memory file if it does not exist', async () => {
    // No createMemoryFile call — appendMemoryEntry should handle it
    await appendMemoryEntry('maestro', 'Auto-created entry', testDir);
    const content = await readFile(join(memoryDir(testDir), 'maestro.md'), 'utf-8');
    expect(content).toContain('Auto-created entry');
  });

  it('returns null and does not throw on file system error', async () => {
    // Pass a non-writable path (root-owned dir simulation via invalid path)
    const result = await appendMemoryEntry('maestro', 'entry', '/proc/nonexistent/path');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// readMemory
// ---------------------------------------------------------------------------

describe('readMemory', () => {
  it('returns the full memory file content', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Key decision: use flat files', testDir);
    const result = await readMemory('maestro', testDir);
    expect(result).not.toBeNull();
    expect(result!.content).toContain('Key decision: use flat files');
  });

  it('returns the persona id in the result', async () => {
    await createMemoryFile('maestro', testDir);
    const result = await readMemory('maestro', testDir);
    expect(result!.personaId).toBe('maestro');
  });

  it('returns the file path in the result', async () => {
    await createMemoryFile('maestro', testDir);
    const result = await readMemory('maestro', testDir);
    expect(result!.filePath).toBe(join(memoryDir(testDir), 'maestro.md'));
  });

  it('returns null when memory file does not exist', async () => {
    const result = await readMemory('nonexistent', testDir);
    expect(result).toBeNull();
  });

  it('returns the byte size of the file', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Some content', testDir);
    const result = await readMemory('maestro', testDir);
    expect(result!.sizeBytes).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// checkMemorySize
// ---------------------------------------------------------------------------

describe('checkMemorySize', () => {
  it('returns false (no warning) when file is below threshold', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Small entry', testDir);
    const warned = await checkMemorySize('maestro', testDir, 50); // 50KB threshold
    expect(warned).toBe(false);
  });

  it('returns true (warning) when file exceeds threshold', async () => {
    await createMemoryFile('maestro', testDir);
    // Write a large entry to exceed 1-byte threshold
    const largeContent = 'x'.repeat(2000);
    await appendMemoryEntry('maestro', largeContent, testDir);
    const warned = await checkMemorySize('maestro', testDir, 0.001); // 1-byte threshold in KB
    expect(warned).toBe(true);
  });

  it('returns false when memory file does not exist', async () => {
    const warned = await checkMemorySize('nonexistent', testDir, 50);
    expect(warned).toBe(false);
  });

  it('uses 50KB as the default threshold', async () => {
    await createMemoryFile('maestro', testDir);
    await appendMemoryEntry('maestro', 'Small entry', testDir);
    // Should not warn with default 50KB threshold for a tiny file
    const warned = await checkMemorySize('maestro', testDir);
    expect(warned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sidecar_memory guard (disabled persona)
// ---------------------------------------------------------------------------

describe('sidecar_memory guard', () => {
  it('createMemoryFile returns null when sidecarEnabled is false', async () => {
    const result = await createMemoryFile('maestro', testDir, { sidecarEnabled: false });
    expect(result).toBeNull();
  });

  it('appendMemoryEntry returns null when sidecarEnabled is false', async () => {
    const result = await appendMemoryEntry('maestro', 'entry', testDir, { sidecarEnabled: false });
    expect(result).toBeNull();
  });

  it('readMemory returns null when sidecarEnabled is false', async () => {
    await createMemoryFile('maestro', testDir);
    const result = await readMemory('maestro', testDir, { sidecarEnabled: false });
    expect(result).toBeNull();
  });

  it('no memory file is created for a disabled persona', async () => {
    await createMemoryFile('maestro', testDir, { sidecarEnabled: false });
    const filePath = join(memoryDir(testDir), 'maestro.md');
    let exists = true;
    try {
      await stat(filePath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
