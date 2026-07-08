/**
 * Security: No Sensitive Data Logged
 *
 * Auth operations must never write passwords, tokens, or OTPs to any console
 * channel. These static analysis tests are the primary enforcement layer:
 * they fail immediately if a console call is added to any auth file, and they
 * never break due to rendering or mocking complexity.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const CONSOLE_PATTERNS = [
  'console.log',
  'console.warn',
  'console.error',
  'console.info',
  'console.debug',
  'console.dir',
  'console.trace',
];

function hasConsole(src: string): string[] {
  return CONSOLE_PATTERNS.filter(p => src.includes(p));
}

// ── AuthContext.tsx ───────────────────────────────────────────────────────────

describe('AuthContext.tsx — no console calls', () => {
  const src = read('context/AuthContext.tsx');

  it('does not contain console.log (would leak credentials)', () => {
    expect(src).not.toContain('console.log');
  });

  it('does not contain console.warn', () => {
    expect(src).not.toContain('console.warn');
  });

  it('does not contain console.error', () => {
    expect(src).not.toContain('console.error');
  });

  it('does not contain any console.* call', () => {
    const found = hasConsole(src);
    expect(found).toEqual([]);
  });
});

// ── lib/supabase.ts ───────────────────────────────────────────────────────────

describe('lib/supabase.ts — no console calls', () => {
  const src = read('lib/supabase.ts');

  it('does not contain any console.* call', () => {
    const found = hasConsole(src);
    expect(found).toEqual([]);
  });
});

// ── auth/storage.ts ───────────────────────────────────────────────────────────

describe('auth/storage.ts — no console calls', () => {
  const src = read('auth/storage.ts');

  it('does not contain any console.* call', () => {
    const found = hasConsole(src);
    expect(found).toEqual([]);
  });
});

// ── lib/queryClient.ts ───────────────────────────────────────────────────────

describe('lib/queryClient.ts — no console calls', () => {
  const src = read('lib/queryClient.ts');

  it('does not contain any console.* call', () => {
    const found = hasConsole(src);
    expect(found).toEqual([]);
  });
});

// ── No hardcoded credentials ──────────────────────────────────────────────────

describe('Auth source files — no hardcoded secrets', () => {
  const filesToCheck = [
    'context/AuthContext.tsx',
    'lib/supabase.ts',
    'auth/storage.ts',
  ];

  it('no file contains a hardcoded API key or JWT', () => {
    const JWT_PATTERN = /eyJ[A-Za-z0-9+/]{40,}/;
    const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]{20,}/;

    filesToCheck.forEach(f => {
      const src = read(f);
      expect(src).not.toMatch(JWT_PATTERN);
      expect(src).not.toMatch(BEARER_PATTERN);
    });
  });

  it('supabase URL and anon key come from env vars, not string literals', () => {
    const src = read('lib/supabase.ts');
    expect(src).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(src).toContain('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('no source file stores a plaintext password constant', () => {
    const PASSWORD_LITERAL = /(password|pwd|passwd)\s*=\s*['"][^'"]{4,}/i;
    filesToCheck.forEach(f => {
      expect(read(f)).not.toMatch(PASSWORD_LITERAL);
    });
  });
});
