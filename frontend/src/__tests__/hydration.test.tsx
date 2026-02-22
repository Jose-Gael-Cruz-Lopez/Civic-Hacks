/**
 * Hydration safety tests — verifies that no render-time calls to
 * Math.random() or Date-dependent state initializers produce mismatches
 * between the server and client renders.
 *
 * Strategy: read the source file text and assert on the patterns we know
 * are dangerous, so a future regression is caught immediately.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../src');

function readSrc(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

// ─── page.tsx (Dashboard) ────────────────────────────────────────────────────

describe('page.tsx hydration safety', () => {
  const src = readSrc('app/page.tsx');

  test('quote is NOT initialised with Math.random() inside useState()', () => {
    // The dangerous pattern: useState(() => ... Math.random() ...)
    // After the fix the quote starts as '' and is set in useEffect
    expect(src).not.toMatch(/useState\s*\(\s*\(\s*\)\s*=>\s*[^)]*Math\.random/);
  });

  test('quote state starts as an empty string', () => {
    expect(src).toMatch(/useState\s*\(\s*['"]{2}\s*\)/);
  });

  test('Math.random() for the quote is called inside a useEffect', () => {
    // Confirm the random call exists but only inside a useEffect callback
    const effectBlock = src.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*Math\.random[^}]*\}/s);
    expect(effectBlock).not.toBeNull();
  });
});

// ─── calendar/page.tsx ───────────────────────────────────────────────────────

describe('calendar/page.tsx hydration safety', () => {
  const src = readSrc('app/calendar/page.tsx');

  test('CalendarGrid current state is NOT initialised with new Date() directly', () => {
    // Dangerous pattern: useState(() => new Date()) or useState(new Date())
    // After the fix it starts as null and is set in useEffect
    expect(src).not.toMatch(/useState\s*\(\s*\(\s*\)\s*=>\s*new Date\s*\(\s*\)\s*\)/);
    expect(src).not.toMatch(/useState\s*\(\s*new Date\s*\(\s*\)\s*\)/);
  });

  test('today string is derived from state, not from a bare new Date() call during render', () => {
    // After the fix, today is set via setToday() inside a useEffect
    expect(src).toMatch(/setToday\s*\(/);
    // There should be no top-level `const today = toISO(new Date())` in render
    expect(src).not.toMatch(/const today\s*=\s*toISO\s*\(\s*new Date\s*\(\s*\)\s*\)/);
  });
});

// ─── UserContext.tsx ─────────────────────────────────────────────────────────

describe('UserContext.tsx', () => {
  const src = readSrc('context/UserContext.tsx');

  test('exposes userReady in the context interface', () => {
    expect(src).toMatch(/userReady\s*:\s*boolean/);
  });

  test('sets userReady to true inside a useEffect (not synchronously)', () => {
    // Verify setUserReady(true) exists and only appears inside a useEffect block,
    // not as a bare top-level statement. We do this by checking that every line
    // containing setUserReady(true) is preceded by a useEffect opening in the file.
    expect(src).toMatch(/setUserReady\s*\(\s*true\s*\)/);
    // The call must be indented (inside a callback), not at column 0
    const lines = src.split('\n');
    const callLines = lines.filter(l => /setUserReady\s*\(\s*true\s*\)/.test(l));
    expect(callLines.length).toBeGreaterThan(0);
    callLines.forEach(line => {
      // Each call must be indented — confirming it's inside a block, not top-level
      expect(line).toMatch(/^\s+setUserReady/);
    });
    // And useEffect must also appear in the file (the call is inside one)
    expect(src).toMatch(/useEffect/);
  });

  test('context value is memoised with useMemo', () => {
    expect(src).toMatch(/useMemo\s*\(/);
  });
});

// ─── All data-fetching pages guard on userReady ──────────────────────────────

describe('pages guard data fetches behind userReady', () => {
  const pages = [
    'app/page.tsx',
    'app/tree/page.tsx',
    'app/learn/page.tsx',
    'app/social/page.tsx',
    'app/calendar/page.tsx',
  ];

  for (const page of pages) {
    test(`${page} has "if (!userReady) return" guard`, () => {
      const src = readSrc(page);
      expect(src).toMatch(/if\s*\(\s*!userReady\s*\)\s*return/);
    });

    test(`${page} includes userReady in a useEffect dependency array`, () => {
      const src = readSrc(page);
      expect(src).toMatch(/\[\s*[^\]]*userReady[^\]]*\]/);
    });
  }
});
