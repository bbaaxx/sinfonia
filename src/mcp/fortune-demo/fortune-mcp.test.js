// fortune-mcp.test.js
// TDD: Written BEFORE implementation (ENF-001)
// Runner: node --test fortune-mcp.test.js
// Updated: Enhanced to expect more than 10 fortunes
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FORTUNES, getRandomFortune } from './fortune-mcp.js';

describe('FORTUNES array', () => {
  it('has more than 10 entries (enhanced)', () => {
    assert.ok(FORTUNES.length > 10, `Expected more than 10 fortunes, got ${FORTUNES.length}`);
  });

  it('all entries are non-empty strings', () => {
    for (const f of FORTUNES) {
      assert.equal(typeof f, 'string', `Expected string, got ${typeof f}`);
      assert.ok(f.length > 0, `Fortune entry must not be empty`);
    }
  });
});

describe('getRandomFortune()', () => {
  it('returns a string', () => {
    const result = getRandomFortune();
    assert.equal(typeof result, 'string');
  });

  it('returns a value from the known FORTUNES list', () => {
    const result = getRandomFortune();
    assert.ok(FORTUNES.includes(result), `"${result}" not found in FORTUNES list`);
  });

  it('produces at least 2 distinct values over 20 calls', () => {
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      seen.add(getRandomFortune());
    }
    assert.ok(seen.size >= 2, `Expected >=2 distinct fortunes over 20 calls, got ${seen.size}`);
  });
});
